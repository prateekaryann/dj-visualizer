# DJ Visualizer Expansion - Quick Start Guide

## 🎉 What's New

Your DJ Visualizer has been expanded with **4 unique visualization modes**:

1. **DEFAULT** - Classic particle system (original)
2. **JULIA** - 3D fractal visualization  
3. **SURFACE** - Parametric mathematical surfaces
4. **METABALL** - Organic blob formations

---

## 🚀 Quick Start

### 1. Start the Development Server

```bash
cd /Users/prateek/Projects/dj-visualizer

# Option A: Using Python
python3 -m http.server 8000

# Option B: Using Node.js
npx http-server

# Then open: http://localhost:8000
```

### 2. Enable Microphone
- Click **TAP MIC** button
- Grant microphone permission when prompted
- Play music or speak into microphone to see visualizations

### 3. Switch Visualization Modes

**Method 1: Keyboard**
- Press **V** to show visualization mode selector
- Press **Shift+M** to cycle through modes

**Method 2: UI Buttons**
- Press **V** to show the mode selector bar at the bottom
- Click one of: DEFAULT, JULIA, SURFACE, METABALL

### 4. Switch DJ Scenes (Optional)
- Press **1** for TECHNO
- Press **2** for TRANCE
- Press **3** for HOUSE
- Press **4** for MINIMAL
- Press **5** for ACID

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `VISUALIZATION_GUIDE.md` | Deep technical documentation on visualization techniques |
| `NEW_FEATURES.md` | Complete guide to new visualization modes |
| `README.md` | Original project information |

---

## 🎮 Keyboard Shortcuts

```
V              Toggle visualization mode selector visibility
Shift+M        Cycle through visualization modes
Space          Toggle microphone
F              Toggle fullscreen
1-5            Switch DJ scenes
T              Tap to set BPM
L              Toggle lyrics mode
```

---

## 📁 New Files Added

```
js/
├── julia-set-visualizer.js         (NEW) 3D fractal rendering
├── parametric-surface-visualizer.js (NEW) Mathematical surfaces
├── metaball-visualizer.js          (NEW) Organic blobs
└── [updated] app.js                 Mode switching logic

css/
└── [updated] style.css              Mode selector styling

html/
└── [updated] index.html             New UI elements

docs/
├── VISUALIZATION_GUIDE.md           (NEW) Technical deep-dive
└── NEW_FEATURES.md                  (NEW) Feature guide
```

---

## 🧪 Testing Each Visualization

### JULIA (Fractal)
✨ **Visual**: Hypnotic swirling fractals with beautiful color gradients  
🎵 **Audio Reactivity**: Bass changes shape, highs increase zoom  
🎯 **Best For**: Psychedelic music, bass-heavy tracks  
⏱️ **Performance**: Excellent (GPU-accelerated)

**To test**: 
1. Play electronic/psychedelic music
2. Switch to JULIA mode
3. Watch fractals respond to beat

### SURFACE (Parametric)
✨ **Visual**: Smooth 3D mathematical surfaces morphing in real-time  
🎵 **Audio Reactivity**: Auto-switches between 4 different surfaces  
🎯 **Best For**: Artistic performances, tech venues  
⏱️ **Performance**: Good (medium GPU usage)

**To test**:
1. Play music with varying frequency content
2. Switch to SURFACE mode
3. Surfaces change: Torus (bass) → Klein Bottle (mids) → Twisted Torus (highs)

### METABALL (Organic Blobs)
✨ **Visual**: Flowing organic blob formations  
🎵 **Audio Reactivity**: Blobs grow with bass, orbit with highs  
🎯 **Best For**: Experimental electronic, generative art  
⏱️ **Performance**: Good (geometry updates every 3 frames)

**To test**:
1. Play electronic music with clear bass
2. Switch to METABALL mode
3. See central blob grow on beats

---

## 🔧 Architecture

### Visualizer System
- All visualizers inherit from a common interface
- Receive same audio data: `update(frequencyData, waveformData)`
- Can be swapped without rebuilding

### Three.js Integration
- Default visualizer: Custom particle system
- Julia: Fragment shader raymarching
- Surfaces: Generated mesh from parametric equations
- Metaballs: Implicit surface extraction

### Audio Analysis
- FFT analysis via Web Audio API (64 frequency bins)
- Real-time waveform data (256 samples)
- Beat detection based on frequency peaks

---

## ⚡ Performance Tips

1. **Use fullscreen mode** for better performance visibility
2. **Disable other browser tabs** for best results
3. **Use Chrome or Firefox** (best WebGL support)
4. **For weak GPUs**: Use DEFAULT or SURFACE modes
5. **For mobile**: May need to reduce resolution

---

## 🐛 Troubleshooting

### Visualizer showing black screen?
- Check browser console (F12) for errors
- Ensure WebGL is supported
- Try a different browser

### Microphone not working?
1. Check browser permissions (green lock icon in address bar)
2. Go to Settings → Privacy → Microphone → Allow this site
3. Reload the page
4. Click TAP MIC again

### Visualization mode selector not showing?
- Press **V** to toggle visibility
- Or click the V key mentioned on screen

### Low performance?
- Switch to DEFAULT mode
- Try SURFACE instead of METABALL
- Reduce browser window size
- Close other applications

---

## 📊 Recommended Setup

### For Live DJ Performance
1. **Browser**: Chrome or Firefox (full-screen recommended)
2. **Resolution**: 1920×1080
3. **Default Mode**: DEFAULT or JULIA
4. **Microphone**: USB external mic for better audio input
5. **Keyboard**: Keep shortcut keys accessible

### For Live Streaming (OBS)
1. Add browser source with `?obs=1` in URL
2. Set dimensions to your stream resolution
3. Enable "Control audio via OBS" for desktop audio
4. Recommended mode for streaming: DEFAULT or JULIA

### For Recording/Content Creation
1. Use Screen Capture tool
2. Switch modes every 30-60 seconds for variety
3. Recommended sequence:
   - DEFAULT (intro)
   - JULIA (build)
   - SURFACE (breakdown)
   - METABALL (outro)

---

## 🎓 Learning Resources

The project includes extensive documentation:

- **Understanding Fractals**: See VISUALIZATION_GUIDE.md → Julia Set Fractals
- **Mathematical Surfaces**: See VISUALIZATION_GUIDE.md → Parametric Surfaces  
- **Organic Shapes**: See VISUALIZATION_GUIDE.md → Metaballs
- **Audio Analysis**: See VISUALIZATION_GUIDE.md → Audio Analysis Techniques

---

## 🎯 Next Steps

Now that you've set up the expanded visualizer:

1. ✅ Try each visualization mode
2. ✅ Experiment with different music genres
3. ✅ Test keyboard shortcuts (V, Shift+M, 1-5, F, Space, T)
4. ✅ Use in a performance or stream
5. Customize parameters in code (see respective visualizer files)

---

## 📞 Support

For issues or questions:
1. Check the browser console (F12 → Console tab)
2. Review NEW_FEATURES.md for common FAQs
3. Check VISUALIZATION_GUIDE.md for technical details
4. Look at the source code comments in new visualizer files

---

## 🎬 Example Workflow

```
1. Open http://localhost:8000
2. Click TAP MIC (grant permission)
3. Play music in background
4. Press V to show visualization mode selector
5. Press Shift+M to cycle through modes
6. Press 1-5 to try different DJ scenes
7. Press F for fullscreen
8. Press Shift+M repeatedly to explore all 4 modes
```

---

**Enjoy your enhanced DJ Visualizer!** 🎉✨

Let the fractals flow with the beat! 🎵
