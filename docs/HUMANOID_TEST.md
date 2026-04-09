# Testing the Humanoid Visualizer

## Quick Start

1. **Start server**: `python3 -m http.server 8000`
2. **Open**: http://localhost:8000
3. **Show modes**: Press `V` to reveal the mode selector bar
4. **Select**: Click **HUMANOID** (or cycle with `Shift+M`)
5. **Mic**: Click **TAP MIC** → grant permission → status shows "● LIVE"
6. **Play music** near your mic and watch

## What You Should See

### Pose Transitions (beat-synced)
Particles morph between dance poses on every beat:

| Pose | Description |
|------|-------------|
| Standing | Neutral upright pose |
| Arms Up | Arms raised overhead |
| Dance Pump | Arms bent, knees bent — pump motion |
| Wide Stance | Legs spread, arms mid-height |
| Lean Back | Body tilted backward |
| DJ Pose | Arms forward like working decks |
| **Explode** | Particles scatter to sphere (on drops) |
| **Ring** | Particles flatten to disc (on drops) |

### Music Reactivity

| What plays | What happens |
|------------|--------------|
| **Bass hit** | Particles push outward, legs bounce, head bobs |
| **Mid frequencies** | Arms wave, torso sways |
| **High frequencies** | Particle shimmer/jitter |
| **Beat** | Pose transition + brightness flash |
| **Big drop** | Explode/ring, then reform to human |
| **Silence** | Gentle breathing + sway (shape holds) |

### Colors
- **Head**: Cyan, reacts to highs
- **Torso**: Orange/red, reacts to bass
- **Arms**: Purple → magenta toward hands
- **Legs**: Blue-cyan, reacts to bass
- **All**: Hue slowly shifts over time, beats trigger flash

### Camera
- Slow auto-orbit around the figure
- Bass pushes camera further back
- Gentle vertical float

## Debugging

### No humanoid visible?
- Confirm mode selector shows HUMANOID as active
- Check mic is live (● LIVE indicator)
- Play loud bass-heavy music — the shape forms strongest with bass
- Open browser console (F12) for errors

### Shape too loose / won't hold?
- This is by design during drops (explode/ring poses)
- After 1-2 seconds it reforms into a dance pose
- With no audio, particles still converge via breathing animation

### Low FPS?
- 60K particles — needs a decent GPU
- Try Chrome/Edge (best WebGL perf)
- Close other GPU-heavy tabs

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Toggle mode selector visibility |
| `Shift+M` | Cycle through all viz modes |
| `Space` | Toggle mic |
| `F` | Fullscreen |
| `T` | Tap BPM |

## Test Checklist

- [ ] Humanoid forms within 2 seconds of selecting mode
- [ ] Shape recognizable as human (head, arms, legs visible)
- [ ] Poses change when bass beat hits
- [ ] Arms/legs move with mid/bass frequencies
- [ ] Drop detection works (play quiet → loud transition)
- [ ] Particles reform after explode/ring
- [ ] Colors shift over time
- [ ] Camera orbits smoothly
- [ ] No WebGL errors in console
- [ ] 45+ FPS on desktop
