/**
 * LyricEngine — real-time speech recognition that drives visual mood changes.
 *
 * Listens via Web Speech API, matches detected words against a mood dictionary,
 * and emits visual commands: theme changes, formation switches, color palette
 * shifts, and floating lyric text.
 *
 * Mood dictionary maps keywords → visual profiles. Each profile specifies:
 *   - theme: VisualizerBG theme name
 *   - palette: BEAT_COLORS key (matched in visualizer-bg.js)
 *   - formation: particle formation name
 *   - intensity: 0-1 how aggressive the visual shift is
 *   - color: CSS color for the floating lyric text
 */
class LyricEngine {
  constructor() {
    this.active = false;
    this._recognition = null;
    this._onMood = null;      // callback(moodProfile)
    this._onLyric = null;     // callback(word, moodProfile)
    this._onLine = null;      // callback(fullTranscript)
    this._onError = null;     // callback(errorString)
    this._currentMood = null;
    this._moodDecayTimer = null;
    this._wordHistory = [];   // last 10 mood-triggering words (avoid repeats)

    // Persistent lyrics history — all finalized lines stored here
    this.lines = [];          // { text, timestamp, mood }
    this._interimText = '';   // current in-progress text
  }

  // Mood dictionary — keywords grouped by emotional/visual theme
  static MOODS = {
    fire: {
      words: ['fire', 'burn', 'burning', 'flame', 'flames', 'hell', 'blaze', 'inferno', 'hot', 'heat', 'explode', 'explosion', 'boom', 'bang', 'destroy', 'rage', 'fury', 'anger', 'war', 'fight', 'power', 'energy', 'beast', 'monster', 'savage', 'wild', 'hardcore', 'harder', 'louder'],
      theme: 'gamma',
      palette: 'fire',
      formations: ['explosion', 'vortex', 'cube'],
      intensity: 1.0,
      color: '#ff4400',
      genre: 'hardtechno'
    },
    dark: {
      words: ['dark', 'darkness', 'night', 'shadow', 'shadows', 'death', 'dead', 'die', 'ghost', 'haunt', 'fear', 'demon', 'evil', 'wicked', 'black', 'void', 'abyss', 'deep', 'underground', 'cold', 'frozen', 'ice', 'winter', 'lost', 'alone', 'hollow', 'empty'],
      theme: 'beta',
      palette: 'ice',
      formations: ['nebula', 'constellation', 'sphere'],
      intensity: 0.7,
      color: '#4488ff',
      genre: 'minimal'
    },
    love: {
      words: ['love', 'heart', 'feel', 'feeling', 'feelings', 'soul', 'touch', 'hold', 'kiss', 'baby', 'beautiful', 'beauty', 'dream', 'dreams', 'together', 'forever', 'always', 'heaven', 'angel', 'hope', 'believe', 'trust', 'peace', 'gentle', 'soft', 'sweet', 'warm'],
      theme: 'theta',
      palette: 'warm',
      formations: ['flower', 'helix', 'torus'],
      intensity: 0.5,
      color: '#ff66aa',
      genre: 'deephouse'
    },
    euphoria: {
      words: ['fly', 'flying', 'high', 'higher', 'rise', 'rising', 'up', 'sky', 'stars', 'star', 'light', 'lights', 'shine', 'shining', 'bright', 'glow', 'sun', 'sunrise', 'dawn', 'free', 'freedom', 'alive', 'life', 'live', 'world', 'universe', 'cosmic', 'space', 'galaxy', 'infinite', 'euphoria', 'ecstasy', 'happy', 'joy'],
      theme: 'alpha',
      palette: 'psyche',
      formations: ['galaxy', 'spiral', 'comet'],
      intensity: 0.8,
      color: '#aa44ff',
      genre: 'trance'
    },
    speed: {
      words: ['fast', 'faster', 'run', 'running', 'rush', 'drop', 'dropped', 'bass', 'beat', 'beats', 'pump', 'pumping', 'bounce', 'jump', 'go', 'move', 'moving', 'shake', 'break', 'breaking', 'smash', 'crash', 'push', 'pull', 'kick', 'hit', 'roll', 'rolling', 'rave', 'party'],
      theme: 'beta',
      palette: 'neon',
      formations: ['dna', 'ring', 'wave'],
      intensity: 0.9,
      color: '#00ff88',
      genre: 'acid'
    },
    water: {
      words: ['water', 'ocean', 'sea', 'wave', 'waves', 'rain', 'raining', 'river', 'flow', 'flowing', 'float', 'drown', 'drowning', 'swim', 'tide', 'tears', 'cry', 'crying', 'mist', 'fog', 'cloud', 'clouds', 'storm', 'thunder', 'lightning', 'wind', 'breeze'],
      theme: 'alpha',
      palette: 'cool',
      formations: ['wave', 'nebula', 'spiral'],
      intensity: 0.6,
      color: '#00bbff',
      genre: 'dubtechno'
    }
  };

  // Build a flat word→mood lookup for O(1) matching
  static _WORD_MAP = (() => {
    const map = {};
    for (const [moodName, mood] of Object.entries(LyricEngine.MOODS)) {
      for (const word of mood.words) {
        map[word] = moodName;
      }
    }
    return map;
  })();

  /**
   * @param {object} callbacks
   * @param {function} callbacks.onMood - (moodProfile, moodName) when mood changes
   * @param {function} callbacks.onLyric - (word, moodProfile) for each mood-triggering word
   * @param {function} callbacks.onLine - (transcript) for every recognized phrase
   */
  start(callbacks = {}) {
    if (this.active) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[LyricEngine] SpeechRecognition not supported in this browser');
      return false;
    }

    this._onMood = callbacks.onMood || null;
    this._onLyric = callbacks.onLyric || null;
    this._onLine = callbacks.onLine || null;
    this._onError = callbacks.onError || null;

    this._recognition = new SpeechRecognition();
    this._recognition.continuous = true;
    this._recognition.interimResults = true;
    this._recognition.lang = 'en-US';
    this._recognition.maxAlternatives = 1;

    this._recognition.onresult = (e) => this._handleResult(e);
    this._recognition.onerror = (e) => {
      console.warn('[LyricEngine] error:', e.error);
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed') {
        this.active = false;
        if (this._onError) this._onError('Mic access needed for lyrics. Enable mic first.');
      } else if (this._onError) {
        this._onError('Speech recognition error: ' + e.error);
      }
    };
    // Auto-restart if it stops (browser sometimes stops after silence)
    this._recognition.onend = () => {
      if (this.active) {
        try { this._recognition.start(); } catch (_) {}
      }
    };

    try {
      this._recognition.start();
      this.active = true;
      return true;
    } catch (err) {
      console.error('[LyricEngine] Failed to start:', err);
      return false;
    }
  }

  stop() {
    this.active = false;
    clearTimeout(this._moodDecayTimer);
    if (this._recognition) {
      try { this._recognition.stop(); } catch (_) {}
      this._recognition = null;
    }
    this._currentMood = null;
    this._wordHistory = [];
  }

  _handleResult(e) {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      const transcript = result[0].transcript.trim().toLowerCase();

      if (result.isFinal && transcript.length > 0) {
        // Store finalized line
        this.lines.push({
          text: transcript,
          timestamp: Date.now(),
          mood: this._currentMood
        });
        this._interimText = '';
      } else {
        this._interimText = transcript;
      }

      // Emit full line
      if (this._onLine) {
        this._onLine(transcript, result.isFinal);
      }

      // Scan words for mood triggers
      const words = transcript.split(/\s+/);
      for (const word of words) {
        const clean = word.replace(/[^a-z]/g, '');
        if (!clean) continue;

        const moodName = LyricEngine._WORD_MAP[clean];
        if (moodName && moodName !== this._currentMood) {
          // Avoid rapid re-triggering of same word
          if (this._wordHistory.includes(clean)) continue;
          this._wordHistory.push(clean);
          if (this._wordHistory.length > 10) this._wordHistory.shift();

          this._currentMood = moodName;
          const profile = LyricEngine.MOODS[moodName];

          // Pick a random formation from this mood's set
          const formation = profile.formations[
            Math.floor(Math.random() * profile.formations.length)
          ];

          if (this._onMood) {
            this._onMood({ ...profile, formation }, moodName);
          }
          if (this._onLyric) {
            this._onLyric(clean, { ...profile, formation });
          }

          // Decay mood after 8s of no new triggers — return to neutral
          clearTimeout(this._moodDecayTimer);
          this._moodDecayTimer = setTimeout(() => {
            this._currentMood = null;
          }, 8000);
        }
      }
    }
  }

  /** @returns {string|null} current active mood name */
  getCurrentMood() {
    return this._currentMood;
  }

  /** @returns {string} current interim (in-progress) text */
  getInterimText() {
    return this._interimText;
  }

  /** @returns {string} full captured lyrics as a multiline string */
  getFullLyrics() {
    return this.lines.map(l => l.text).join('\n');
  }

  /** Clear stored lyrics */
  clearHistory() {
    this.lines = [];
    this._interimText = '';
  }
}

window.LyricEngine = LyricEngine;
