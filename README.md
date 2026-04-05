# VIZORA — Live DJ Visualizer

Real-time mic-reactive 3D WebGL visualizer for DJs, electronic music, and live streams.

## Features
- 🎙 **Mic-reactive** — listens to room audio through microphone, drives the 3D particle system in real time
- 🎛 **5 DJ scenes** — TECHNO, TRANCE, HOUSE, MINIMAL, ACID (each with unique formation profiles)
- 🎵 **BPM tap tempo** — tap to the beat, visualizer syncs morph timing
- 📺 **OBS-ready** — add `?obs=1` to URL for transparent background browser source
- ⌨️ **Keyboard shortcuts** — Space (mic), F (fullscreen), 1-5 (scenes), T (tap BPM)

## Use in OBS

1. Add a **Browser Source** in OBS
2. URL: `https://prateekaryann.github.io/dj-visualizer/?obs=1`
3. Set width/height to your stream resolution (1920×1080)
4. Enable **"Control audio via OBS"** if routing desktop audio instead of mic

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Toggle mic |
| `F` | Toggle fullscreen |
| `1` | TECHNO scene |
| `2` | TRANCE scene |
| `3` | HOUSE scene |
| `4` | MINIMAL scene |
| `5` | ACID scene |
| `T` | Tap BPM |

## Tech Stack

- **Three.js r128** — WebGL 3D particle system
- **Web Audio API** — microphone capture and FFT analysis
- **GLSL shaders** — Julia set fractals, tunnel rings, particle formations
- Zero build step — pure HTML/CSS/JS, runs in any modern browser

## Live Demo

[vizora.live](https://prateekaryann.github.io/dj-visualizer)
