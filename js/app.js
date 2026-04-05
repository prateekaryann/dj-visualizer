// --- Constants ---

const SCENE_GENRE = {
  TECHNO:  'hardtechno',
  TRANCE:  'trance',
  HOUSE:   'deephouse',
  MINIMAL: 'minimal',
  ACID:    'acid'
};

const SCENE_THEME = {
  TECHNO:  'beta',
  TRANCE:  'alpha',
  HOUSE:   'theta',
  MINIMAL: 'theta',
  ACID:    'gamma'
};

const SCENE_KEYS = ['TECHNO', 'TRANCE', 'HOUSE', 'MINIMAL', 'ACID'];

// --- State ---

let vizBG = null;
let micAnalyser = null;
let lyricEngine = null;
let lyricsActive = false;
let currentScene = 'TECHNO';
let currentBpm = null;

let tapTimes = [];
let tapResetTimer = null;

let uiHideTimer = null;
let micButtonHovered = false;

let mouseNX = 0;
let mouseNY = 0;

// --- Init ---

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('viz-container');

  vizBG = new VisualizerBG(container);
  micAnalyser = new MicAnalyser();
  lyricEngine = new LyricEngine();

  // Create mood flash overlay
  const moodFlash = document.createElement('div');
  moodFlash.id = 'mood-flash';
  document.body.appendChild(moodFlash);

  applyScene('TECHNO');
  startAnimationLoop();
  setupMicButton();
  setupLyricsButton();
  setupLyricsPanel();
  setupSceneTabs();
  setupTapBpm();
  setupUiAutoHide();
  setupMouseInteraction();
  setupFullscreen();
  setupKeyboard();
  setupResize();
  setupObsMode();
});

// --- Animation Loop ---

const startAnimationLoop = () => {
  const EMPTY_FREQ = new Float32Array(64).fill(-100);
  const EMPTY_WAVE = new Float32Array(256);

  const loop = () => {
    requestAnimationFrame(loop);

    if (micAnalyser.active) {
      vizBG.update(micAnalyser.getFrequencyData(), micAnalyser.getWaveformData());
    } else {
      vizBG.update(EMPTY_FREQ, EMPTY_WAVE);
    }
  };

  loop();
};

// --- Scene ---

let sceneToastTimer = null;

const applyScene = (scene) => {
  currentScene = scene;
  vizBG.setGenre(SCENE_GENRE[scene]);
  vizBG.setTheme(SCENE_THEME[scene]);

  document.querySelectorAll('.scene-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.scene === scene);
  });

  // Show scene name toast briefly
  showSceneToast(scene);
};

const showSceneToast = (scene) => {
  let toast = document.getElementById('scene-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'scene-toast';
    document.getElementById('ui').appendChild(toast);
  }
  toast.textContent = scene;
  toast.classList.remove('hide');
  toast.classList.add('show');
  clearTimeout(sceneToastTimer);
  sceneToastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
  }, 1200);
};

// --- Mic ---

const setupMicButton = () => {
  const btn = document.getElementById('btn-mic');

  btn.addEventListener('mouseenter', () => { micButtonHovered = true; });
  btn.addEventListener('mouseleave', () => { micButtonHovered = false; });

  btn.addEventListener('click', toggleMic);
};

const toggleMic = async () => {
  const btn = document.getElementById('btn-mic');
  const dot = document.getElementById('status-dot');

  if (!micAnalyser.active) {
    try {
      await micAnalyser.start();
      btn.classList.add('active');
      btn.querySelector('span').textContent = '● LIVE';
      btn.setAttribute('aria-pressed', 'true');
      vizBG.setMicMode(true);
      dot.classList.add('listening');
    } catch (err) {
      console.error('[VIZORA MIC ERROR]', err);
      const isDenied = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      const isNotFound = err && err.name === 'NotFoundError';
      let msg = 'Mic error: ' + (err ? err.name : 'unknown');
      if (isDenied) {
        msg = 'Mic blocked by browser.\n\n'
          + 'To fix:\n'
          + '1. Click the 🔒 lock icon in the address bar\n'
          + '2. Set Microphone → Allow\n'
          + '3. Reload the page\n\n'
          + 'Or go to: Chrome Settings → Privacy → Site Settings → Microphone → remove this site from the blocked list.';
      } else if (isNotFound) {
        msg = 'No microphone found. Plug in a mic and try again.';
      }
      alert(msg);
    }
  } else {
    micAnalyser.stop();
    btn.classList.remove('active');
    btn.querySelector('span').textContent = 'TAP MIC';
    btn.setAttribute('aria-pressed', 'false');
    vizBG.setMicMode(false);
    dot.classList.remove('listening');
  }
};

// --- Lyrics ---

const setupLyricsButton = () => {
  const btn = document.getElementById('btn-lyrics');
  if (!btn) return;
  btn.addEventListener('click', toggleLyrics);
};

const toggleLyrics = () => {
  const btn = document.getElementById('btn-lyrics');
  if (!lyricsActive) {
    const started = lyricEngine.start({
      onMood: (profile, moodName) => {
        vizBG.setTheme(profile.theme);
        vizBG.setGenre(profile.genre);

        const flash = document.getElementById('mood-flash');
        if (flash) {
          flash.style.background = `radial-gradient(ellipse at center, ${profile.color}44, transparent 70%)`;
          flash.classList.remove('active');
          void flash.offsetWidth;
          flash.classList.add('active');
        }

        showSceneToast(moodName.toUpperCase());
      },
      onLyric: (word, profile) => {
        spawnLyricWord(word, profile.color);
        vizBG.triggerClick((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5);
      },
      onLine: (transcript, isFinal) => {
        // Floating line at bottom of screen
        const line = document.getElementById('lyric-line');
        if (line) {
          line.textContent = transcript;
          line.classList.add('visible');
          line.classList.toggle('interim', !isFinal);
          clearTimeout(line._hideTimer);
          line._hideTimer = setTimeout(() => line.classList.remove('visible'), 4000);
        }

        // Update lyrics panel
        const interim = document.getElementById('lyrics-interim');
        if (interim) interim.textContent = isFinal ? '' : transcript;

        if (isFinal && transcript.length > 0) {
          appendLyricLine(transcript, lyricEngine.getCurrentMood());
        }
      },
      onError: (msg) => {
        console.error('[LyricEngine]', msg);
        alert(msg);
        // Reset button state
        lyricsActive = false;
        btn.classList.remove('active');
        btn.querySelector('span').textContent = 'LYRICS';
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    if (started !== false) {
      lyricsActive = true;
      btn.classList.add('active');
      btn.querySelector('span').textContent = '● LYRICS';
      btn.setAttribute('aria-pressed', 'true');
    }
  } else {
    lyricEngine.stop();
    lyricsActive = false;
    btn.classList.remove('active');
    btn.querySelector('span').textContent = 'LYRICS';
    btn.setAttribute('aria-pressed', 'false');
    document.getElementById('lyric-line').classList.remove('visible');
    document.getElementById('lyrics-interim').textContent = '';
  }
};

const spawnLyricWord = (word, color) => {
  const overlay = document.getElementById('lyric-overlay');
  if (!overlay) return;

  const el = document.createElement('div');
  el.className = 'lyric-word';
  el.textContent = word;
  el.style.color = color;
  // Random font size for variety
  el.style.fontSize = (1.5 + Math.random() * 2.5) + 'rem';
  // Random position — center-biased
  el.style.left = (20 + Math.random() * 60) + '%';
  el.style.top = (25 + Math.random() * 50) + '%';

  overlay.appendChild(el);

  // Remove after animation ends
  setTimeout(() => el.remove(), 3600);
};

// --- Lyrics Panel ---

const appendLyricLine = (text, mood) => {
  const content = document.getElementById('lyrics-content');
  if (!content) return;

  // Remove empty state placeholder
  const empty = content.querySelector('.lyrics-empty');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = 'lyric-captured-line';

  // Timestamp
  const now = new Date();
  const ts = String(now.getHours()).padStart(2, '0') + ':' +
             String(now.getMinutes()).padStart(2, '0') + ':' +
             String(now.getSeconds()).padStart(2, '0');

  let html = `<span class="lyric-timestamp">${ts}</span>${text}`;
  if (mood) {
    html += ` <span class="lyric-mood-tag ${mood}">${mood.toUpperCase()}</span>`;
  }
  el.innerHTML = html;
  content.appendChild(el);

  // Auto-scroll to bottom
  content.scrollTop = content.scrollHeight;
};

const setupLyricsPanel = () => {
  const panel = document.getElementById('lyrics-panel');
  const btnShow = document.getElementById('btn-show-lyrics');
  const btnClose = document.getElementById('btn-lyrics-close');
  const btnCopy = document.getElementById('btn-lyrics-copy');
  const btnClear = document.getElementById('btn-lyrics-clear');

  if (btnShow) {
    btnShow.addEventListener('click', () => {
      panel.classList.toggle('open');
      btnShow.classList.toggle('active', panel.classList.contains('open'));
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      panel.classList.remove('open');
      if (btnShow) btnShow.classList.remove('active');
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const lyrics = lyricEngine.getFullLyrics();
      if (!lyrics) return;
      navigator.clipboard.writeText(lyrics).then(() => {
        btnCopy.textContent = 'COPIED!';
        setTimeout(() => { btnCopy.textContent = 'COPY'; }, 1500);
      });
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      lyricEngine.clearHistory();
      const content = document.getElementById('lyrics-content');
      if (content) content.innerHTML = '<div class="lyrics-empty">Lyrics cleared. Listening...</div>';
    });
  }
};

// --- Scene Tabs ---

const setupSceneTabs = () => {
  const container = document.getElementById('scene-tabs');

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.scene-tab');
    if (!tab) return;

    const scene = tab.dataset.scene;
    if (scene && SCENE_GENRE[scene]) {
      applyScene(scene);
    }
  });
};

// --- Tap BPM ---

const setupTapBpm = () => {
  document.getElementById('btn-tap').addEventListener('click', handleTap);
};

const handleTap = () => {
  const now = Date.now();

  clearTimeout(tapResetTimer);
  tapResetTimer = setTimeout(resetTap, 3000);

  tapTimes.push(now);
  if (tapTimes.length > 4) tapTimes = tapTimes.slice(-4);

  if (tapTimes.length >= 2) {
    let totalInterval = 0;
    for (let i = 1; i < tapTimes.length; i++) {
      totalInterval += tapTimes[i] - tapTimes[i - 1];
    }
    const avgInterval = totalInterval / (tapTimes.length - 1);
    currentBpm = 60000 / avgInterval;
    document.getElementById('bpm-display').textContent = Math.round(currentBpm) + ' BPM';
  }
};

const resetTap = () => {
  tapTimes = [];
  currentBpm = null;
  document.getElementById('bpm-display').textContent = '-- BPM';
};

// --- UI Auto-hide ---

const setupUiAutoHide = () => {
  const ui = document.getElementById('ui');

  const showUi = () => {
    ui.classList.remove('fade-out');
    clearTimeout(uiHideTimer);

    if (!micButtonHovered) {
      uiHideTimer = setTimeout(() => {
        ui.classList.add('fade-out');
      }, 4000);
    }
  };

  window.addEventListener('mousemove', showUi);
  window.addEventListener('touchstart', showUi);
};

// --- Mouse Interaction ---

const setupMouseInteraction = () => {
  window.addEventListener('mousemove', (e) => {
    mouseNX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNY = -((e.clientY / window.innerHeight) * 2 - 1);
    vizBG.setMousePosition(mouseNX, mouseNY);
  });

  document.getElementById('viz-container').addEventListener('click', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    vizBG.triggerClick(nx, ny);
  });
};

// --- Fullscreen ---

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
};

const setupFullscreen = () => {
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
};

// --- Keyboard Shortcuts ---

const setupKeyboard = () => {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        toggleMic();
        break;

      case 'KeyF':
        toggleFullscreen();
        break;

      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5': {
        const index = parseInt(e.code.replace('Digit', ''), 10) - 1;
        if (SCENE_KEYS[index]) applyScene(SCENE_KEYS[index]);
        break;
      }

      case 'KeyT':
        handleTap();
        break;

      case 'KeyL':
        toggleLyrics();
        break;
    }
  });
};

// --- Resize ---

const setupResize = () => {
  window.addEventListener('resize', () => vizBG.resize());
};

// --- OBS Mode ---

const setupObsMode = () => {
  if (new URLSearchParams(location.search).get('obs') === '1') {
    document.body.classList.add('obs-mode');
  }
};
