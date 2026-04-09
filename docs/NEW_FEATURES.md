# DJ Visualizer - Expansion Update

## 🎨 New Visualization Modes

The DJ Visualizer has been expanded with **4 unique visualization styles** to match professional DJ software visualizers. Switch between them using the **VISUALIZATION MODE SELECTOR**.

---

## 📍 Visualization Modes

### 1. **DEFAULT** (Original Particle System)
The classic VIZORA experience with:
- Genre-specific particle formations  
- Beat-reactive morphing  
- Dynamic color cycling  
- Waveform deformation

**When to use**: Energetic performances, general-purpose performances

### 2. **JULIA** (Fractal Visualization)
3D Julia set fractals with real-time audio reactivity:
- Raymarched 3D fractals on GPU
- Smooth color iteration mapping
- Dynamic parameter modulation by frequency
- Mathematically beautiful infinite detail

**Technical Details**:
- Fragment shader-based raymarching
- Formula: `z = z² + c` (interactive complex polynomial)
- Audio mapping: Bass modulates complex constant `c`, Highs control zoom
- Smooth iteration: `μ = k + 1 - log(log|z|) / log(n)`

**When to use**: Ambient/downtempo music, psychedelic experiences, mathematical beauty

### 3. **SURFACE** (Parametric Surfaces)
Mathematical surfaces that morph based on audio frequencies:
- **Torus**: Smooth ring geometry (high bass)
- **Klein Bottle**: Non-orientable mathematical surface (high mids)
- **Twisted Torus**: Spiral topology (high highs)
- **Boy's Surface**: Complex Möbius-like surface (quiet moments)

Surfaces automatically switch based on frequency dominance.

**When to use**: Artistic performances, mathematical visuals, tech venues

### 4. **METABALL** (Organic Blobs)
Organic blob formations using implicit metaball surfaces:
- 5 orbiting metaballs with dynamic strength
- Smooth Wyvill polynomial falloff  
- Real-time surface mesh generation
- Organic, flowing shapes

**Technical Details**:
- Wyvill brothers' polynomial: `f(r) = a(1 - r²/R²)³` (smooth C² continuity)
- Threshold-based surface extraction
- Color based on closest metaball
- Central growth controlled by bass, orbital motion by highs

**When to use**: Experimental electronic, organic visual aesthetic, live generative art

---

## 🎮 Controls

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **V** | Toggle visualization mode selector visibility |
| **Shift+M** | Cycle through visualization modes |
| **1-5** | Switch DJ scenes (TECHNO, TRANCE, HOUSE, MINIMAL, ACID) |
| **Space** | Toggle microphone input |
| **F** | Toggle fullscreen |
| **T** | Tap to set BPM |
| **L** | Toggle lyrics mode |

### Mouse/Touch
- **Click buttons** in the bottom bar to select visualization mode
- The mode selector is hidden by default but shown when in use

---

## 🔧 Implementation Details

### File Structure

```
js/
├── visualizer-bg.js            (Original BG particle system)
├── julia-set-visualizer.js     (NEW: Fractal visualization)
├── parametric-surface-visualizer.js (NEW: Mathematical surfaces)
├── metaball-visualizer.js      (NEW: Organic blobs)
├── app.js                       (Updated with mode switching)
├── mic-analyser.js
└── lyric-engine.js
```

### Key Classes

#### `JuliaSetVisualizer`
```javascript
const julia = new JuliaSetVisualizer(container, audioAnalyser);
julia.update(frequencyData, waveformData);
julia.dispose(); // Cleanup
```

**Uniforms Modulated by Audio**:
- `uCx`, `uCy`: Complex constant (bass influence)
- `uZoom`: Zoom level (highs influence)
- `uRotation`: Rotation angle (time-based)
- `uBass/uMids/uHighs`: Frequency band energy (0-1)

#### `ParametricSurfaceVisualizer`
```javascript
const surface = new ParametricSurfaceVisualizer(container, audioAnalyser);
```

**Features**:
- 4 parametric surfaces with automatic switching
- Smooth morphing between surfaces
- Audio-driven deformation
- Phong lighting with dual-color lights

#### `MetaballVisualizer`
```javascript
const metaball = new MetaballVisualizer(container, audioAnalyser);
```

**Features**:
- 5 metaballs with dynamic radius/strength
- Orbital motion synchronized to audio
- Per-frame geometry updates
- Wyvill falloff function for smooth surfaces

### Audio Analysis Integration

All visualizers receive **64-bin frequency data** and **256-sample waveform data**:

```javascript
visualizer.update(frequencyData, waveformData);
```

**Typical Frequency Bands**:
- **Bass** (0-5 bins): ~0-115 Hz
- **Mids** (5-30 bins): ~115-700 Hz  
- **Highs** (30-64 bins): ~700-1500 Hz

---

## 🚀 Performance Optimization

### GPU Acceleration
- **Julia Set**: Pure GPU raymarching (minimal CPU)
- **Parametric Surfaces**: GPU geometry generation
- **Metaballs**: GPU rendering of wireframes

### Recommended Resolutions

| Mode | Resolution | Quality | Notes |
|------|-----------|---------|-------|
| Default | 1920×1080 | High | Optimized |
| Julia | 1920×1080 | Very High | GPU-intensive |
| Surfaces | 1920×1080 | High | Medium GPU cost |
| Metaball | 1280×720 | High | More geometry updates |

### Performance Tips
1. **Reduce geometry detail** for lower-end GPUs
2. **Decrease update frequency** for metaballs (currently every 3 frames)
3. **Use OBS "Canvas" scaling** instead of source scaling

---

## 📚 Documentation

See `VISUALIZATION_GUIDE.md` for:
- Deep mathematical explanations
- Implementation strategies for each technique
- Audio analysis best practices
- Professional reference software

---

## 🎵 Recommended Audio Genre Pairings

| Mood | Scene | Visualization Mode | Reason |
|------|-------|-------------------|--------|
| Hypnotic/Psychedelic | ACID | JULIA | Mathematical fractals match the vibe |
| Organic/Ethereal | MINIMAL | SURFACE | Flow and topology match minimalism |
| Experimental | TRANCE | METABALL | Organic shapes evolve with energy |
| Club/High-Energy | TECHNO, HOUSE | DEFAULT or JULIA | Particle density matches beat |
| Ambient | Any | SURFACE | Calm flowing mathematics |

---

## 🐛 Troubleshooting

### Visualizer Not Showing
1. **Check browser console** for errors (F12)
2. **Ensure Three.js loaded** (check Network tab)
3. **Verify WebGL support** (WebGL2 may be required)
4. **Try a different browser** (Chrome/Firefox recommended)

### Microphone Not Working with Custom Visualizers
- Custom visualizers share mic input with default visualizer
- Mic permissions required (see README.md for details)

### Performance Issues
1. Switch to lower-resolution mode
2. Reduce `uSegments`/`vSegments` in parametric surfaces
3. Minimize metaball particle count
4. Close other GPU-intensive applications

---

## 🔮 Future Enhancements

- [ ] **Preset System**: Save and load visualization configurations
- [ ] **Smooth Morphing**: Transition smoothly between modes
- [ ] **Custom Shaders**: User-defined fragment shaders
- [ ] **Real-time Mesh Optimization**: Better metaball performance
- [ ] **Particle Trail Effects**: History visualization
- [ ] **XYZ Frequency Projection**: 3D spectrogram (like MilkDrop)
- [ ] **Record/Replay**: Save visualizer output as video

---

## 📖 To Use Locally

1. **Start a local server**:
   ```bash
   python3 -m http.server 8000
   # or
   npx http-server
   ```

2. **Open browser**:
   ```
   http://localhost:8000
   ```

3. **Enable microphone**:
   - Click "TAP MIC" button
   - Grant microphone permission
   - Music/sound starts visualization

4. **Switch visualization modes**:
   - Press **V** to show mode selector
   - Click a mode button or press **Shift+M** to cycle
   - Each mode reacts differently to audio

---

## 🎓 Learning Resources

- **Julia Sets**: https://en.wikipedia.org/wiki/Julia_set
- **Parametric Surfaces**: https://en.wikipedia.org/wiki/Parametric_surface
- **Metaballs**: https://en.wikipedia.org/wiki/Metaball
- **Three.js**: https://threejs.org/docs/
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **GLSL Shaders**: https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language

---

## 📝 Updates Made

### New Files
- `js/julia-set-visualizer.js` - Julia set fractal implementation
- `js/metaball-visualizer.js` - Organic blob implementation
- `js/parametric-surface-visualizer.js` - Mathematical surfaces
- `VISUALIZATION_GUIDE.md` - Technical documentation

### Modified Files
- `index.html` - Added visualization mode selector UI and new script includes
- `css/style.css` - Added styles for visualization mode buttons
- `js/app.js` - Added visualization mode switching logic, keyboard shortcuts

### Key Features Added
- Multi-visualizer support with clean switching
- Audio-reactive parametric adaptation
- GPU-accelerated fractal rendering
- Organic metaball surface generation
- Keyboard controls (V, Shift+M)
- Persistent UI state management

---

## 🎬 Example Use Cases

### Live Stream Setup
1. Add browser source to OBS with `?obs=1` parameter
2. Switch visualization mode based on music energy
3. Use TECHNO/HOUSE for builds, MINIMAL for breakdowns
4. JULIA for psychedelic moments, SURFACE for storytelling

### DJ Performance
1. Start with DEFAULT for familiarity
2. Switch to JULIA or METABALL for key moments
3. Use SURFACE for smooth transitions
4. Match visual energy to musical intensity

### Recording/Content
1. Switch modes every 30-60 seconds for variety
2. Use METABALL for organic intro/outro vibes
3. JULIA for intense drops
4. SURFACE for bridges

---

## 💪 Keyboard Quick Reference

```
V          → Show/hide visualization selector
Shift+M    → Cycle visualization modes (DEFAULT → JULIA → SURFACE → METABALL → DEFAULT)
Space      → Toggle microphone
F          → Fullscreen
1-5        → Switch DJ scenes
T          → Tap BPM
L          → Lyrics mode
```

---

Enjoy your enhanced DJ Visualizer! 🎉

For questions or issues, check the console (F12) for error messages.

Let more beautiful fractals power your performances! ✨
