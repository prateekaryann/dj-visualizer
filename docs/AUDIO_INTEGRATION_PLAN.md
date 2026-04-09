# Audio Integration Plan: Streaming Services → DJ Visualizer

## Executive Summary

Our visualizer currently uses **microphone input only** (`getUserMedia` → `AnalyserNode` → 64 frequency bins + 256 waveform samples → visualizers). To connect with YouTube Music, Spotify, and other streaming services, we need to capture their audio output digitally — not through air via a mic.

There are **4 viable approaches**, ranked by practicality for our web-based architecture:

| # | Approach | Works With | User Friction | Audio Quality | Effort |
|---|----------|-----------|---------------|---------------|--------|
| 1 | **getDisplayMedia (Tab Audio)** | Any browser tab | Medium (sharing dialog) | Lossless digital | Low |
| 2 | **Chrome Extension (tabCapture)** | Any browser tab | Low (one click) | Lossless digital | Medium |
| 3 | **Spotify Web Playback SDK + API** | Spotify only | Low (OAuth login) | Metadata only* | Medium |
| 4 | **Electron Desktop App** | Any system audio | None (auto-capture) | Lossless digital | High |

*Spotify's audio analysis API has been deprecated/restricted as of late 2024.

---

## Current Architecture

```
MicAnalyser.start()
  → navigator.mediaDevices.getUserMedia({ audio: true })
  → MediaStreamSource → GainNode (×6) → AnalyserNode (FFT 2048)
  → getFrequencyData()  → 64 bins normalized [0, 1]
  → getWaveformData()   → 256 samples [-1, 1]
  → Animation Loop → VisualizerBG + Custom Visualizers + AudioMetrics
```

**Key insight**: All visualizers consume the same interface: `getFrequencyData()` and `getWaveformData()`. We just need to swap the audio *source* — the rest of the pipeline stays identical.

---

## Phase 1: getDisplayMedia Tab Audio Capture (Recommended First)

### Why Start Here
- **Zero dependencies** — pure Web API, no extension, no backend
- **Works with ANY streaming service** — YouTube Music, Spotify Web, SoundCloud, Apple Music (beta web), Tidal, etc.
- **Same AnalyserNode pipeline** — just a different MediaStream source
- **Chrome/Edge desktop support** (~65% of users)

### How It Works
```javascript
// Request tab/screen sharing with audio
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,                              // required (API constraint)
  audio: { systemAudio: 'include' },        // capture tab/system audio
  preferCurrentTab: true                     // pre-select current tab (Chrome 94+)
});

// Stop video track immediately (we only need audio)
stream.getVideoTracks().forEach(t => t.stop());

// Pipe to existing Web Audio pipeline
const source = audioCtx.createMediaStreamSource(stream);
source.connect(gainNode);  // → existing AnalyserNode chain
```

### User Flow
1. User clicks "Connect to Tab Audio" button
2. Browser shows sharing dialog → user selects the YouTube Music tab
3. User must check "Share tab audio" checkbox (unchecked by default!)
4. Audio flows digitally from the music tab → our AnalyserNode
5. If user clicks "Stop Sharing" in browser toolbar → fallback to mic

### Implementation Plan

**New file: `js/audio-source-manager.js`**

```javascript
class AudioSourceManager {
  constructor(audioCtx) {
    this.audioCtx = audioCtx;
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.65;
    this.currentSource = null;
    this.sourceType = 'none'; // 'mic' | 'tab' | 'stream'
  }

  // Existing mic path
  async connectMicrophone() { ... }

  // NEW: Tab audio capture
  async connectTabAudio() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { systemAudio: 'include' }
    });
    stream.getVideoTracks().forEach(t => t.stop());

    if (stream.getAudioTracks().length === 0) {
      throw new Error('No audio track — did you check "Share tab audio"?');
    }

    this.disconnectCurrent();
    this.currentSource = this.audioCtx.createMediaStreamSource(stream);
    this.currentSource.connect(this.analyser);
    this.sourceType = 'tab';

    // Detect when user stops sharing
    stream.getAudioTracks()[0].onended = () => {
      this.onSourceLost?.();
    };
  }

  disconnectCurrent() {
    this.currentSource?.disconnect();
    this.currentSource = null;
    this.sourceType = 'none';
  }

  getFrequencyData() { /* same logic as current MicAnalyser */ }
  getWaveformData()  { /* same logic as current MicAnalyser */ }
}
```

**UI changes to `index.html`:**
- Add audio source selector: Microphone | Tab Audio | (future: Spotify, etc.)
- Show connection status indicator
- Show helpful error if user forgets to check "Share tab audio"

### Limitations
- Chrome/Edge desktop only (Firefox/Safari ignore the audio parameter)
- User must interact with a sharing dialog each time
- The "Share tab audio" checkbox is unchecked by default — users will miss it
- No mobile support

### Reference Projects
- [amertx/spotify-visualizer](https://github.com/amertx/spotify-visualizer) — uses this exact approach
- [addpipe getDisplayMedia demo](https://addpipe.com/getdisplaymedia-demo/)

---

## Phase 2: Chrome Extension (tabCapture API)

### Why This Is the Best Long-Term Solution
- **One-click capture** — no sharing dialog, no checkbox to miss
- **Works with ANY tab** — YouTube Music, Spotify, SoundCloud, anything
- **Clean digital audio** — no quality loss
- **Background operation** — captures even when music tab isn't focused
- **Can communicate with our web app** via BroadcastChannel or chrome.runtime messaging

### Architecture (Manifest V3)

```
┌─────────────────────────────────────────────────────┐
│  Chrome Extension                                    │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Popup   │→ │  Background  │→ │   Offscreen    │ │
│  │  (click) │  │  Service     │  │   Document     │ │
│  │          │  │  Worker      │  │                │ │
│  │ "Capture │  │ tabCapture.  │  │ getUserMedia   │ │
│  │  this    │  │ getMedia     │  │ + AnalyserNode │ │
│  │  tab"    │  │ StreamId()   │  │ + FFT → data   │ │
│  └──────────┘  └──────────────┘  └───────┬────────┘ │
│                                          │          │
│                          BroadcastChannel│          │
│                                          ↓          │
│  ┌──────────────────────────────────────────────┐   │
│  │  DJ Visualizer Web App (our app)             │   │
│  │  Receives: { freqData[], waveData[] }        │   │
│  │  Feeds into: existing visualizer pipeline     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Extension manifest.json
```json
{
  "manifest_version": 3,
  "name": "DJ Visualizer Audio Bridge",
  "permissions": ["tabCapture", "activeTab", "offscreen"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" }
}
```

### Key Code: Offscreen Document (audio processing)
```javascript
// Redeem stream ID into MediaStream
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    mandatory: {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: streamId
    }
  }
});

const ctx = new AudioContext();
const source = ctx.createMediaStreamSource(stream);
const analyser = ctx.createAnalyser();
analyser.fftSize = 2048;
source.connect(analyser);
source.connect(ctx.destination);  // IMPORTANT: re-route audio to speakers (tabCapture mutes by default)

// Send frequency data to the web app
const channel = new BroadcastChannel('dj-visualizer-audio');
function sendData() {
  const freq = new Float32Array(analyser.frequencyBinCount);
  const wave = new Float32Array(analyser.fftSize);
  analyser.getFloatFrequencyData(freq);
  analyser.getFloatTimeDomainData(wave);
  channel.postMessage({ freq: Array.from(freq), wave: Array.from(wave) });
  requestAnimationFrame(sendData);
}
sendData();
```

### Implementation Steps
1. Create extension scaffold (manifest.json, popup, background, offscreen)
2. Implement tabCapture → offscreen document → BroadcastChannel pipeline
3. Add `BroadcastChannel` receiver in `AudioSourceManager`
4. Package and publish to Chrome Web Store (or distribute as unpacked for dev)
5. Add "Install Extension" prompt in our app when tab audio isn't available

### Reference Projects (Study These)
- [ShaderAmp](https://github.com/ArthurTent/ShaderAmp) — **best reference**, 150+ shader visualizers, clean MV3 tabCapture implementation
- [AudioVisualizerExtension](https://github.com/Ronnie-Reagan/AudioVisualizerExtension) — clean MV3 tabCapture + Canvas visualizer
- [Butterchurn Chrome Extension](https://github.com/jberg/butterchurn-chrome-extension) — MilkDrop WebGL via tabCapture
- [ChromeAudioVisualizerExtension](https://github.com/afreakk/ChromeAudioVisualizerExtension) — published on Chrome Web Store

---

## Phase 3: Spotify Integration (Optional, Spotify-Specific Features)

### What's Available
- **Web Playback SDK**: Creates a Spotify Connect device in the browser. Audio plays but is sandboxed in an iframe — **no direct audio access**.
- **Web API Audio Analysis** (DEPRECATED): Previously returned per-segment pitch/timbre/loudness data. Now returns 403 for most developers.
- **Web API Now Playing**: Can get current track, playback position, album art. Still works.

### Practical Approach
Since we can't get raw audio from Spotify's SDK, the real value of Spotify integration is **metadata enrichment**:

1. **Now Playing Info**: Show track name, artist, album art alongside visualizations
2. **Track Features**: If API access is available — tempo, energy, danceability → influence visualizer parameters
3. **Actual Audio**: Use Phase 1 (getDisplayMedia) or Phase 2 (extension tabCapture) to get the actual audio data from the Spotify Web Player tab

```
Spotify Web API (OAuth)          Tab Audio Capture
    │                                  │
    │ track metadata                   │ raw audio stream
    │ tempo, energy, key               │ → AnalyserNode → FFT
    │ album art                        │
    ↓                                  ↓
┌─────────────────────────────────────────────┐
│  DJ Visualizer                              │
│  - Visualizers driven by real FFT data      │
│  - Metadata overlay (track info, art)       │
│  - Tempo-synced effects (from API data)     │
└─────────────────────────────────────────────┘
```

### Reference Projects
- [kaleidosync](https://github.com/zachwinter/kaleidosync) — ~862 stars, Vue/Three.js, uses Spotify audio analysis for 20+ WebGL visualizers
- [amertx/spotify-visualizer](https://github.com/amertx/spotify-visualizer) — hybrid: Spotify API metadata + getDisplayMedia for real audio

---

## Phase 4: Electron Desktop App (Future — Maximum Capability)

### Why
- **System-level audio capture** — captures ALL audio output, works with any app (YouTube Music app, Spotify desktop, Apple Music, local files)
- **No user interaction needed** — auto-captures system audio
- **Cross-platform**: macOS 12.3+, Windows 10+, Linux (PulseAudio)

### Key Library: electron-audio-loopback
```javascript
// Main process
import { initMain } from 'electron-audio-loopback';
initMain({ forceCoreAudioTap: true });

// Renderer process
import { getLoopbackAudioMediaStream } from 'electron-audio-loopback';
const stream = await getLoopbackAudioMediaStream();
const ctx = new AudioContext();
const source = ctx.createMediaStreamSource(stream);
const analyser = ctx.createAnalyser();
source.connect(analyser);
// Our existing visualizer code works unchanged!
```

### Platform-Specific Audio Capture
| Platform | Method | Library |
|----------|--------|---------|
| macOS 13+ | ScreenCaptureKit / Core Audio Tap | electron-audio-loopback |
| macOS 12 | BlackHole virtual audio driver | Manual setup |
| Windows 10+ | WASAPI Loopback | electron-audio-loopback |
| Linux | PulseAudio monitor source | electron-audio-loopback |

### Reference Projects
- [electron-audio-loopback](https://github.com/alectrocute/electron-audio-loopback) — npm package, clean API
- [projectM](https://github.com/projectM-visualizer/projectm) — ~4,100 stars, mature C++ visualization engine with WASM potential

---

## Implementation Roadmap

### Sprint 1 (Phase 1): getDisplayMedia Tab Audio — ~2-3 days
- [ ] Create `AudioSourceManager` class that abstracts mic vs tab audio
- [ ] Refactor `MicAnalyser` logic into `AudioSourceManager`
- [ ] Implement `connectTabAudio()` using `getDisplayMedia`
- [ ] Add audio source selector UI (Mic / Tab Audio toggle)
- [ ] Handle edge cases (no audio track, sharing stopped, unsupported browser)
- [ ] Show instructional tooltip about "Share tab audio" checkbox
- [ ] Test with YouTube Music, Spotify Web, SoundCloud

### Sprint 2 (Phase 2): Chrome Extension — ~4-5 days
- [ ] Create extension project structure (MV3)
- [ ] Implement popup UI ("Capture this tab" button)
- [ ] Background service worker: `tabCapture.getMediaStreamId()`
- [ ] Offscreen document: audio processing + BroadcastChannel
- [ ] Web app: BroadcastChannel receiver in AudioSourceManager
- [ ] Handle extension not installed (show install prompt)
- [ ] Handle tab switching, tab close, extension disable
- [ ] Package for Chrome Web Store

### Sprint 3 (Phase 3): Spotify Metadata — ~3-4 days
- [ ] Register Spotify Developer app, configure OAuth
- [ ] Implement Spotify OAuth PKCE flow
- [ ] Fetch now-playing track info (name, artist, album art, tempo)
- [ ] Create metadata overlay UI (current track display)
- [ ] Sync visualizer parameters to track energy/tempo when available
- [ ] Combine with tab audio capture for full experience

### Sprint 4 (Phase 4): Electron Desktop — ~5-7 days
- [ ] Set up Electron project wrapping our web app
- [ ] Integrate electron-audio-loopback for system audio
- [ ] Add AudioSourceManager support for loopback stream
- [ ] Platform testing (macOS, Windows, Linux)
- [ ] Build/packaging pipeline (electron-builder)
- [ ] Auto-update mechanism

---

## Open Source Projects to Study / Reuse

### Must-Read (Direct Code Reuse Potential)
| Project | Stars | What to Reuse | Link |
|---------|-------|---------------|------|
| **ShaderAmp** | Active | Chrome extension tabCapture architecture (MV3) | [GitHub](https://github.com/ArthurTent/ShaderAmp) |
| **amertx/spotify-visualizer** | — | getDisplayMedia tab audio + Spotify API hybrid | [GitHub](https://github.com/amertx/spotify-visualizer) |
| **Butterchurn** | ~1,800 | MilkDrop WebGL presets (npm library) | [GitHub](https://github.com/jberg/butterchurn) |
| **AudioVisualizerExtension** | — | Clean MV3 tabCapture reference | [GitHub](https://github.com/Ronnie-Reagan/AudioVisualizerExtension) |
| **kaleidosync** | ~862 | Spotify API integration patterns | [GitHub](https://github.com/zachwinter/kaleidosync) |
| **electron-audio-loopback** | — | System audio capture npm package | [GitHub](https://github.com/alectrocute/electron-audio-loopback) |

### Reference / Inspiration
| Project | What It Shows | Link |
|---------|---------------|------|
| **Webamp** (~10k stars) | Full music player + Butterchurn integration | [GitHub](https://github.com/captbaritone/webamp) |
| **projectM** (~4.1k stars) | Mature native visualization engine | [GitHub](https://github.com/projectM-visualizer/projectm) |
| **Spicetify CLI** (~22.7k stars) | Spotify desktop client modding platform | [GitHub](https://github.com/spicetify/cli) |
| **awesome-audio-visualization** (~5k stars) | Curated list of all viz projects | [GitHub](https://github.com/willianjusten/awesome-audio-visualization) |
| **captureSystemAudio** | Every possible system audio capture method | [GitHub](https://github.com/guest271314/captureSystemAudio) |

---

## Key Technical Decisions

### 1. AudioSourceManager as Central Abstraction
All audio sources (mic, tab, extension, Electron loopback, future Spotify) produce the same output: `getFrequencyData()` → 64 bins [0,1] and `getWaveformData()` → 256 samples [-1,1]. This means **zero changes to any visualizer code**.

### 2. Extension ↔ Web App Communication
Use `BroadcastChannel` API — it works same-origin between the extension's offscreen document and our web app. No need for `chrome.runtime.sendMessage` or content scripts.

### 3. Graceful Degradation
```
Extension available?  → Use tabCapture (best UX)
    ↓ no
getDisplayMedia supported?  → Use tab sharing (good UX)
    ↓ no
Microphone available?  → Use mic capture (current behavior)
    ↓ no
Show "No audio source" message
```

### 4. No DRM Circumvention
All approaches capture the audio **output** (what the user hears) rather than intercepting encrypted streams. This is the same as plugging a cable from headphone-out to line-in — legally analogous to personal use recording.
