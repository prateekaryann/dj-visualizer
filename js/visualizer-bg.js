/**
 * VisualizerBG - Enhanced audio-reactive Three.js particle visualizer
 * Features: beat-reactive colors, morphing formations, random animations,
 * central geometry shape-shifting, particle streaks, and color cycling.
 */
(function () {
  'use strict';

  const THEMES = {
    theta:   { primary: new Float32Array([0.545, 0.361, 0.965]), secondary: new Float32Array([0.427, 0.157, 0.851]) },
    alpha:   { primary: new Float32Array([0.388, 0.400, 0.945]), secondary: new Float32Array([0.310, 0.275, 0.898]) },
    beta:    { primary: new Float32Array([0.078, 0.722, 0.651]), secondary: new Float32Array([0.051, 0.580, 0.533]) },
    gamma:   { primary: new Float32Array([0.133, 0.773, 0.369]), secondary: new Float32Array([0.086, 0.639, 0.290]) },
  };

  // Color palettes that cycle on beat - each genre gets reactive accent colors
  const BEAT_COLORS = {
    warm:    [[1.0, 0.4, 0.1], [1.0, 0.2, 0.5], [0.9, 0.6, 0.0]],
    cool:    [[0.2, 0.5, 1.0], [0.4, 0.2, 0.9], [0.1, 0.8, 0.9]],
    neon:    [[0.0, 1.0, 0.5], [1.0, 0.0, 0.8], [0.3, 0.0, 1.0]],
    fire:    [[1.0, 0.1, 0.0], [1.0, 0.5, 0.0], [1.0, 0.8, 0.1]],
    ice:     [[0.3, 0.7, 1.0], [0.6, 0.3, 1.0], [0.1, 0.9, 0.8]],
    psyche:  [[0.9, 0.1, 0.9], [0.1, 0.9, 0.3], [0.9, 0.9, 0.1]],
  };

  const GENRE_PROFILES = {
    ambienttechno: { speed: 0.3, displacement: 0.3, spread: 55, particleSize: 1.0, lineOpacity: 0.05, pulseStrength: 0.2, chaos: 0,    formation: 'sphere',  colorPalette: 'cool',  morphSpeed: 0.3,  shapeShift: false },
    dubtechno:     { speed: 0.4, displacement: 0.4, spread: 50, particleSize: 1.2, lineOpacity: 0.08, pulseStrength: 0.3, chaos: 0,    formation: 'sphere',  colorPalette: 'cool',  morphSpeed: 0.4,  shapeShift: false },
    minimal:       { speed: 0.5, displacement: 0.5, spread: 45, particleSize: 1.0, lineOpacity: 0.1,  pulseStrength: 0.5, chaos: 0.1,  formation: 'ring',    colorPalette: 'ice',   morphSpeed: 0.5,  shapeShift: true },
    detroit:       { speed: 0.6, displacement: 0.6, spread: 44, particleSize: 1.2, lineOpacity: 0.12, pulseStrength: 0.6, chaos: 0.1,  formation: 'ring',    colorPalette: 'warm',  morphSpeed: 0.6,  shapeShift: true },
    deephouse:     { speed: 0.5, displacement: 0.5, spread: 44, particleSize: 1.1, lineOpacity: 0.1,  pulseStrength: 0.5, chaos: 0.05, formation: 'ring',    colorPalette: 'warm',  morphSpeed: 0.5,  shapeShift: false },
    progressive:   { speed: 0.6, displacement: 0.7, spread: 48, particleSize: 1.3, lineOpacity: 0.12, pulseStrength: 0.7, chaos: 0.15, formation: 'spiral',  colorPalette: 'neon',  morphSpeed: 0.7,  shapeShift: true },
    trance:        { speed: 0.8, displacement: 0.9, spread: 50, particleSize: 1.5, lineOpacity: 0.15, pulseStrength: 0.9, chaos: 0.2,  formation: 'helix',   colorPalette: 'psyche',morphSpeed: 0.9,  shapeShift: true },
    acid:          { speed: 0.9, displacement: 1.0, spread: 46, particleSize: 1.4, lineOpacity: 0.15, pulseStrength: 1.0, chaos: 0.25, formation: 'galaxy',  colorPalette: 'neon',  morphSpeed: 1.0,  shapeShift: true },
    dnb:           { speed: 1.0, displacement: 1.2, spread: 48, particleSize: 1.5, lineOpacity: 0.18, pulseStrength: 1.2, chaos: 0.2,  formation: 'sphere',  colorPalette: 'fire',  morphSpeed: 1.1,  shapeShift: true },
    hardtechno:    { speed: 1.2, displacement: 1.5, spread: 42, particleSize: 1.8, lineOpacity: 0.2,  pulseStrength: 1.5, chaos: 0.4,  formation: 'cube',    colorPalette: 'fire',  morphSpeed: 1.3,  shapeShift: true },
  };
  const DEFAULT_PROFILE = { speed: 0.5, displacement: 0.5, spread: 45, particleSize: 1.0, lineOpacity: 0.1, pulseStrength: 0.5, chaos: 0.1, formation: 'sphere', colorPalette: 'cool', morphSpeed: 0.5, shapeShift: false };

  // All available formations for random cycling
  const ALL_FORMATIONS = ['sphere', 'ring', 'spiral', 'cube', 'helix', 'galaxy', 'torus', 'dna', 'explosion', 'vortex', 'nebula', 'wave', 'flower', 'constellation', 'comet'];

  const VERT_SHADER = `
    attribute float aSize;
    attribute float aPhase;
    attribute float aActive;
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    uniform float uSpeed;
    uniform float uDisplacement;
    uniform float uChaos;
    uniform float uPulseStrength;
    uniform float uBeatFlash;
    uniform float uMorphProgress;
    // Ripple uniforms
    uniform vec3  uMouseWorld;   // mouse position in world space
    uniform float uRippleTime;   // time since last ripple stamp (seconds, -1 = inactive)
    uniform float uRippleStr;    // overall ripple strength (0 at rest → 1 on move)
    // Click burst uniforms
    uniform vec3  uClickWorld;   // click position in world space
    uniform float uClickAge;     // seconds since click (large = old)
    uniform float uClickStr;     // burst strength (decays to 0)
    varying float vAlpha;
    varying float vActive;
    varying float vBeatFlash;
    varying float vDist;
    varying float vRipple;       // passed to frag for glow tinting

    void main() {
      vec3 pos = position;
      vec3 dir = normalize(pos + vec3(0.0001));
      float t = uTime * uSpeed;

      // Displacement waves
      float wave = sin(pos.x * 1.5 + t) * cos(pos.y * 1.2 + t * 0.7);
      float wave2 = cos(pos.z * 0.8 + t * 1.3) * sin(pos.x * 0.6 - t * 0.5);
      float pulse = uBass * uPulseStrength;
      pos += dir * (wave * uDisplacement + pulse) * 1.5;
      pos += dir * wave2 * uDisplacement * 0.4;

      // Chaos
      float chaosScale = uChaos * (0.5 + uBass);
      pos.x += sin(t * 3.0 + aPhase * 7.0) * chaosScale;
      pos.y += cos(t * 4.0 + aPhase * 5.0) * chaosScale;
      pos.z += sin(t * 2.5 + aPhase * 9.0) * chaosScale;

      // Beat explosion
      pos += dir * uBeatFlash * 2.0 * aActive;

      // Ambient drift
      pos.x += sin(t * 0.2 + aPhase) * 0.3;
      pos.y += cos(t * 0.15 + aPhase * 1.3) * 0.3;
      pos.z += sin(t * 0.1 + aPhase * 0.7) * 0.15;

      // ── Ripple effect ─────────────────────────────────────────────
      float rippleGlow = 0.0;
      if (uRippleStr > 0.001) {
        vec3 toMouse = pos - uMouseWorld;
        float d = length(toMouse);

        // Expanding ring: front edge travels outward at ~14 units/sec
        float ringRadius = uRippleTime * 14.0;
        float ringWidth  = 5.0;
        float onRing     = max(0.0, 1.0 - abs(d - ringRadius) / ringWidth);

        // Decaying push: particles on the ring get nudged outward
        float pushAmt = onRing * 3.5 * exp(-uRippleTime * 1.2) * uRippleStr;
        vec3 pushDir  = d > 0.001 ? toMouse / d : dir;
        pos += pushDir * pushAmt;

        // Proximity hover glow — constant soft push while mouse is near
        float hoverR  = 8.0;
        float hover   = max(0.0, 1.0 - d / hoverR) * uRippleStr;
        pos += pushDir * hover * 1.8;

        rippleGlow = onRing * exp(-uRippleTime * 0.8) + hover * 0.6;
      }

      // ── Click burst ───────────────────────────────────────────────
      if (uClickStr > 0.001) {
        vec3 fromClick = pos - uClickWorld;
        float cd = length(fromClick);
        vec3 burstDir = cd > 0.001 ? fromClick / cd : dir;

        // Shockwave ring expanding at 22 units/sec
        float shockR     = uClickAge * 22.0;
        float shockWidth = 7.0 + uClickAge * 4.0;
        float onShock    = max(0.0, 1.0 - abs(cd - shockR) / shockWidth);

        // Inner burst: all particles within shockwave radius fly outward
        float innerBurst = max(0.0, 1.0 - cd / max(shockR, 1.0));
        float innerForce = innerBurst * 12.0 * exp(-uClickAge * 2.5) * uClickStr;

        // Ring edge gets a sharp extra kick
        float shockForce = onShock * 8.0 * exp(-uClickAge * 1.8) * uClickStr;

        pos += burstDir * (innerForce + shockForce);

        // Particles near the click origin get a vertical lift for 3D depth
        float lift = exp(-cd * 0.3) * 5.0 * exp(-uClickAge * 3.0) * uClickStr;
        pos.z += lift;

        rippleGlow = max(rippleGlow, (onShock + innerBurst * 0.4) * exp(-uClickAge * 1.2) * uClickStr);
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

      float baseSize    = aSize;
      float activeBoost = 1.0 + aActive * 2.5;
      float midsBoost   = 1.0 + uMids * 0.4;
      float beatBoost   = 1.0 + uBeatFlash * 1.5;
      float rippleBoost = 1.0 + rippleGlow * 2.5;
      gl_PointSize = baseSize * activeBoost * midsBoost * beatBoost * rippleBoost * (120.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 1.0, 28.0);

      gl_Position = projectionMatrix * mvPosition;

      float distFade = clamp(1.0 - length(mvPosition.xyz) / 160.0, 0.1, 1.0);
      vAlpha     = (0.6 + aActive * 0.4) * distFade;
      vActive    = aActive;
      vBeatFlash = uBeatFlash;
      vDist      = length(pos) / 50.0;
      vRipple    = rippleGlow;
    }
  `;

  const FRAG_SHADER = `
    precision highp float;
    varying float vAlpha;
    varying float vActive;
    varying float vBeatFlash;
    varying float vDist;
    varying float vRipple;
    uniform vec3 uColor;
    uniform vec3 uBeatColor;
    uniform float uHighs;
    uniform float uBeatFlash;
    uniform float uColorCycle;
    uniform float uTime;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float dist = length(uv);

      if (dist > 0.5) discard;

      // Enhanced glow: bright core + soft halo + wide outer glow
      float core = 1.0 - smoothstep(0.0, 0.08, dist);
      float innerGlow = smoothstep(0.5, 0.1, dist) * 0.6;
      float outerGlow = smoothstep(0.5, 0.2, dist) * 0.25;
      float beatGlow = smoothstep(0.5, 0.15, dist) * vBeatFlash * 0.4;
      float alpha = core + innerGlow + outerGlow + beatGlow;

      // Breathing brightness — particles slowly pulse even without audio
      float breathe = 0.12 * sin(uTime * 0.8 + vDist * 6.0);
      float brightness = 0.85 + breathe + uHighs * 0.5 + vActive * 1.0;

      // Color mixing: base -> beat color on beats
      vec3 baseCol = uColor * brightness;
      vec3 beatCol = uBeatColor * (brightness + 0.4);

      // Blend toward beat color — more responsive
      float beatMix = clamp(vBeatFlash * (0.5 + vActive * 0.5), 0.0, 1.0);
      vec3 col = mix(baseCol, beatCol, beatMix);

      // Distance-based hue shift for depth
      float hueShift = vDist * uColorCycle * 0.4 + uTime * 0.1;
      col.r += sin(hueShift) * 0.1 * (0.3 + vActive * 0.7);
      col.g += sin(hueShift + 2.094) * 0.1 * (0.3 + vActive * 0.7);
      col.b += sin(hueShift + 4.189) * 0.1 * (0.3 + vActive * 0.7);

      // Hot white core on strong beats
      col = mix(col, vec3(1.0), core * vBeatFlash * 0.5);

      // Ripple: tint toward cyan-white and boost brightness on ring + hover
      col += vec3(0.4, 0.8, 1.0) * vRipple * (core + innerGlow) * 1.4;
      col = mix(col, vec3(1.0), vRipple * core * 0.7);

      // Soft luminance boost for active particles
      col += vec3(0.05) * vActive * innerGlow;

      gl_FragColor = vec4(col, alpha * vAlpha);
    }
  `;

  // ─── Fractal background: infinite-zoom Julia set ──────────────────────────
  const FRACTAL_VERT = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
  `;

  const FRACTAL_FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    uniform float uBeatFlash;
    uniform vec3  uColor;
    uniform vec3  uBeatColor;
    uniform float uAspect;
    uniform float uZoomSpeed;
    uniform vec2  uClickScreen;
    uniform float uClickAge;
    uniform float uClickStr;

    float juliaIter(vec2 z, vec2 c) {
      float i = 0.0;
      for (int n = 0; n < 96; n++) {
        if (dot(z, z) > 16.0) break;
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        i += 1.0;
      }
      float log2z = log(dot(z,z)) * 0.5 / log(2.0);
      return i - log2(log2z);
    }

    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);

      // Infinite zoom — centre fixed, seamless cycle
      float zoomCycle = fract(uTime * uZoomSpeed);
      float scale     = pow(2.0, zoomCycle);
      float fadeEdge  = sin(zoomCycle * 3.14159);
      vec2  zoomed    = uv / scale;

      // Julia c — slow autonomous rotation, audio-reactive
      float angle     = uTime * 0.04;
      float bassShift = uBass * 0.35;
      vec2 c = vec2(
        -0.745 + cos(angle) * (0.12 + bassShift),
         0.112 + sin(angle * 0.7) * (0.08 + uMids * 0.2)
      );

      // Click ripple — warps UVs outward from click point
      if (uClickStr > 0.001) {
        vec2 clickUV   = uClickScreen * vec2(uAspect, 1.0);
        vec2 fromClick = uv - clickUV;
        float cd       = length(fromClick);
        vec2 clickDir  = cd > 0.0001 ? fromClick / cd : vec2(1.0, 0.0);

        float r1 = uClickAge * 1.8;
        float r2 = uClickAge * 1.1;
        float r3 = uClickAge * 0.55;
        float w  = 0.18 + uClickAge * 0.12;

        float ring1 = exp(-pow((cd - r1) / w, 2.0)) * exp(-uClickAge * 1.4);
        float ring2 = exp(-pow((cd - r2) / w, 2.0)) * exp(-uClickAge * 1.8) * 0.7;
        float ring3 = exp(-pow((cd - r3) / w, 2.0)) * exp(-uClickAge * 2.2) * 0.5;
        float totalRipple = (ring1 + ring2 + ring3) * uClickStr;

        zoomed += clickDir * totalRipple * (0.35 + uClickStr * 0.25);
        c      += clickDir * totalRipple * 0.18;
      }

      vec2  z1    = zoomed * (2.4 + uHighs * 0.6);
      float iter  = juliaIter(z1, c);
      float t     = iter / 96.0;

      // Palette
      float phase = t * 6.2832 + uTime * 0.15;
      vec3  col   = 0.5 + 0.5 * cos(phase + uColor * 6.28 + vec3(0.0, 0.4, 0.8));

      col = mix(col, uBeatColor, uBeatFlash * 0.35);

      // Click flash
      float clickFlash = exp(-uClickAge * 3.5) * uClickStr;
      col = mix(col, vec3(1.0), clickFlash * 0.6);

      float exterior = smoothstep(0.0, 0.08, t);
      float alpha    = exterior * 0.22 * fadeEdge * (0.7 + uBass * 0.6 + uHighs * 0.3);

      gl_FragColor = vec4(col * (0.6 + uMids * 0.8), clamp(alpha, 0.0, 0.85));
    }
  `;

  // ─── Tunnel ring shader for infinite fly-through ──────────────────────────
  const TUNNEL_VERT = `
    varying vec2 vUv;
    varying float vDepth;
    void main() {
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const TUNNEL_FRAG = `
    precision highp float;
    varying vec2 vUv;
    varying float vDepth;
    uniform float uTime;
    uniform float uBass;
    uniform vec3  uColor;
    uniform float uOpacity;
    void main() {
      vec2 uv = vUv - 0.5;
      float r  = length(uv);
      float a  = atan(uv.y, uv.x);

      // Spiralling fractal-like rings inside the tunnel
      float rings = abs(sin(r * 18.0 - uTime * 1.5 + uBass * 4.0));
      float spoke = abs(sin(a * 8.0 + uTime * 0.6));
      float pattern = rings * 0.6 + spoke * 0.3;

      // Edge fade
      float edge = smoothstep(0.5, 0.35, r) * smoothstep(0.02, 0.06, r);
      float depthFade = clamp(1.0 - vDepth / 120.0, 0.0, 1.0);

      vec3 col = uColor * (0.5 + pattern * 1.2 + uBass * 0.6);
      gl_FragColor = vec4(col, edge * depthFade * uOpacity * pattern);
    }
  `;

  class VisualizerBG {
    constructor(containerEl) {
      if (typeof THREE === 'undefined') return;
      try {
        const c = document.createElement('canvas');
        if (!c.getContext('webgl') && !c.getContext('experimental-webgl')) return;
      } catch (e) { return; }

      this.container = containerEl;
      this.clock = new THREE.Clock();
      this.isMobile = window.innerWidth < 768;
      this.particleCount = this.isMobile ? 1500 : 4000;
      this.maxConnections = this.isMobile ? 150 : 300;
      this.connectionThreshold = 2.8;

      this.bass = 0; this.mids = 0; this.highs = 0;

      this.theme = THEMES.alpha;
      this.profile = Object.assign({}, DEFAULT_PROFILE);
      this.targetProfile = Object.assign({}, DEFAULT_PROFILE);
      this._profileLerpSpeed = 0.008; // slower = more fluid morphing between formations

      this._lastFreqData = null;
      this._lastWaveformData = null;

      // Beat detection
      this._prevBass = 0;
      this._beatFlash = 0;
      this._beatThreshold = 0.15;
      this._beatCooldown = 0;
      this._beatCount = 0;

      // Color cycling
      this._colorCycleTime = 0;
      this._currentBeatColorIdx = 0;
      this._beatColor = new Float32Array([1, 0.4, 0.1]);
      this._targetBeatColor = new Float32Array([1, 0.4, 0.1]);

      // Smooth theme color lerping
      this._currentColor = new Float32Array(this.theme.primary);
      this._targetColor = new Float32Array(this.theme.primary);

      // Formation morphing
      this._formationTimer = 0;
      this._formationInterval = 18; // seconds between formation changes
      this._morphProgress = 0;      // 0 = settled, >0 = mid-morph (drives uMorphProgress)
      this._currentFormationIdx = 0;

      // Central geometry morphing
      this._centralGeoTypes = ['icosahedron', 'octahedron', 'dodecahedron', 'torus'];
      this._centralGeoIdx = 0;
      this._centralMorphTimer = 0;
      this._centralMorphInterval = 35;

      // Camera dynamics
      this._cameraShake = 0;
      this._cameraZ = 55;
      this._cameraTargetZ = 55;

      // New effect systems
      this._pulsePool = [];
      this._pulseIdx = 0;
      this._waveRibbon = null;
      this._freqBars = null;
      this._centerGlow = null;
      this._centerGlowUniforms = null;
      this._fractalUniforms = null;
      this._tunnelRings = [];
      this._tunnelZ = 0;          // virtual camera Z for tunnel recycling
      this._targetMouseX = 0; this._targetMouseY = 0;
      this._mouseX = 0; this._mouseY = 0;

      this._initScene();
      this._createFractalBackground();
      this._createParticles();
      this._createTunnelRings();
      this._createCentralGeo();
      this._createLines();
      this._createAuraRing();
      this._createCenterGlow();
      this._createPulseRings();
      this._createWaveformRibbon();
      this._createFreqBars();

      this._bound_animate = this._animate.bind(this);
      this._bound_resize = this.resize.bind(this);
      window.addEventListener('resize', this._bound_resize);
      this._rafId = requestAnimationFrame(this._bound_animate);
      this.ready = true;
    }

    _initScene() {
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x06060b, 0.006);
      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
      this.camera.position.z = 55;
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor(0x000000, 0);
      this.container.appendChild(this.renderer.domElement);
      this._orbitAngle = 0;
    }

    _createFractalBackground() {
      // Fullscreen triangle — no projection needed, just clip space
      const geo = new THREE.PlaneGeometry(2, 2);
      const col = this.theme.primary;
      this._fractalUniforms = {
        uTime:      { value: 0 },
        uBass:      { value: 0 },
        uMids:      { value: 0 },
        uHighs:     { value: 0 },
        uBeatFlash: { value: 0 },
        uColor:     { value: new THREE.Vector3(col[0], col[1], col[2]) },
        uBeatColor: { value: new THREE.Vector3(1, 0.4, 0.1) },
        uAspect:    { value: window.innerWidth / window.innerHeight },
        uZoomSpeed:   { value: 0.04 },
        uClickScreen: { value: new THREE.Vector2(0, 0) },
        uClickAge:    { value: 999.0 },
        uClickStr:    { value: 0.0 },
      };
      const mat = new THREE.ShaderMaterial({
        vertexShader:   FRACTAL_VERT,
        fragmentShader: FRACTAL_FRAG,
        uniforms:       this._fractalUniforms,
        transparent:    true,
        depthWrite:     false,
        depthTest:      false,
        blending:       THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = -10;  // draw first, behind everything
      // Freeze in camera space so it's always fullscreen
      this.camera.add(mesh);
      mesh.position.set(0, 0, -1);
      // Scale to fill the near plane at z=-1 with fov=75
      const h = 2 * Math.tan((75 * Math.PI / 180) / 2);
      mesh.scale.set(h * (window.innerWidth / window.innerHeight), h, 1);
      this._fractalMesh = mesh;
      this.scene.add(this.camera); // camera must be in scene for its children to render
    }

    _createTunnelRings() {
      // 24 rings spaced along Z axis — recycled as camera flies through
      const RING_COUNT = 24;
      const RING_SPACING = 12;
      const col = this.theme.primary;

      for (let i = 0; i < RING_COUNT; i++) {
        const geo = new THREE.TorusGeometry(
          18 + Math.random() * 12,  // radius: 18–30
          0.12 + Math.random() * 0.18,  // tube thickness
          8,
          80
        );
        const uniforms = {
          uTime:    { value: 0 },
          uBass:    { value: 0 },
          uColor:   { value: new THREE.Vector3(col[0], col[1], col[2]) },
          uOpacity: { value: 0.18 + Math.random() * 0.15 },
        };
        const mat = new THREE.ShaderMaterial({
          vertexShader:   TUNNEL_VERT,
          fragmentShader: TUNNEL_FRAG,
          uniforms,
          transparent: true,
          depthWrite:  false,
          blending:    THREE.AdditiveBlending,
          side:        THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.z = -i * RING_SPACING;
        // Random tilt for variety
        mesh.rotation.x = Math.random() * Math.PI * 0.4;
        mesh.rotation.y = Math.random() * Math.PI * 0.4;
        mesh._baseZ      = mesh.position.z;
        mesh._tiltX      = mesh.rotation.x;
        mesh._tiltY      = mesh.rotation.y;
        mesh._uniforms   = uniforms;
        mesh._speed      = 0.8 + Math.random() * 0.6;
        this._tunnelRings.push(mesh);
        this.scene.add(mesh);
      }
      this._tunnelSpacing = RING_SPACING;
      this._tunnelCount   = RING_COUNT;
    }

    _updateTunnelRings(elapsed, dt) {
      if (!this._tunnelRings.length) return;
      const speed    = 3.5 + this.bass * 8 + this._beatFlash * 6;
      const camZ     = this.camera.position.z;
      const cc       = this._currentColor;
      const bc       = this._beatColor;
      const bm       = Math.min(1, this._beatFlash * 0.8);
      const r = cc[0]*(1-bm)+bc[0]*bm;
      const g = cc[1]*(1-bm)+bc[1]*bm;
      const b = cc[2]*(1-bm)+bc[2]*bm;

      for (const ring of this._tunnelRings) {
        ring._uniforms.uTime.value    = elapsed;
        ring._uniforms.uBass.value    = this.bass;
        ring._uniforms.uColor.value.set(r, g, b);
        ring._uniforms.uOpacity.value = (0.12 + this.bass * 0.25 + this._beatFlash * 0.3) * ring._speed;

        // Tilt wobble
        ring.rotation.x = ring._tiltX + Math.sin(elapsed * 0.12 + ring._speed) * 0.08;
        ring.rotation.y = ring._tiltY + Math.cos(elapsed * 0.09 + ring._speed) * 0.08;

        // Scale pulse on bass
        const s = 1.0 + this.bass * 0.12 + this._beatFlash * 0.18;
        ring.scale.setScalar(s);

        // Advance ring toward camera
        ring.position.z += speed * dt;

        // Recycle: once a ring passes the camera, push it far back
        const RECYCLE_Z = camZ + 5;
        if (ring.position.z > RECYCLE_Z) {
          const farthest = this._tunnelRings.reduce((a, r2) => r2.position.z < a.position.z ? r2 : a, this._tunnelRings[0]);
          ring.position.z = farthest.position.z - this._tunnelSpacing;
          ring.rotation.x = ring._tiltX = (Math.random() - 0.5) * Math.PI * 0.4;
          ring.rotation.y = ring._tiltY = (Math.random() - 0.5) * Math.PI * 0.4;
        }
      }
    }

    _distributeParticle(i, formation, spread) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rand = (Math.random() - 0.5) * 2;
      const t = i / this.particleCount;

      switch (formation) {
        case 'sphere': {
          const r = spread * 0.5 + Math.random() * spread * 0.5;
          return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)];
        }
        case 'ring': {
          const r = spread * 0.7 + Math.random() * spread * 0.3;
          const y = (Math.random() - 0.5) * spread * 0.3;
          return [r * Math.cos(theta), y, r * Math.sin(theta)];
        }
        case 'spiral': {
          const spiralR = spread * 0.3 + t * spread * 0.7;
          const spiralTheta = t * Math.PI * 6;
          const y = (t - 0.5) * spread * 0.5;
          return [spiralR * Math.cos(spiralTheta) + rand * 2, y + rand * 2, spiralR * Math.sin(spiralTheta) + rand * 2];
        }
        case 'cube': {
          return [(Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread];
        }
        case 'helix': {
          const helixR = spread * 0.5;
          const helixTheta = t * Math.PI * 8;
          const y = (t - 0.5) * spread * 1.2;
          const strand = i % 2 === 0 ? 1 : -1;
          return [
            helixR * Math.cos(helixTheta) * strand + rand * 1.5,
            y + rand * 1.5,
            helixR * Math.sin(helixTheta) * strand + rand * 1.5
          ];
        }
        case 'galaxy': {
          const arm = Math.floor(Math.random() * 3);
          const armAngle = (arm / 3) * Math.PI * 2;
          const dist = Math.pow(Math.random(), 0.5) * spread;
          const spiralAngle = dist * 0.3 + armAngle;
          const y = (Math.random() - 0.5) * spread * 0.15 * (1 + dist / spread);
          return [
            dist * Math.cos(spiralAngle) + rand * 1.5,
            y,
            dist * Math.sin(spiralAngle) + rand * 1.5
          ];
        }
        case 'torus': {
          const R = spread * 0.6;
          const r = spread * 0.25;
          const u = Math.random() * Math.PI * 2;
          const v = Math.random() * Math.PI * 2;
          return [
            (R + r * Math.cos(v)) * Math.cos(u) + rand * 0.8,
            r * Math.sin(v) + rand * 0.8,
            (R + r * Math.cos(v)) * Math.sin(u) + rand * 0.8
          ];
        }
        case 'dna': {
          const dnaR = spread * 0.35;
          const dnaTheta2 = t * Math.PI * 10;
          const y2 = (t - 0.5) * spread * 1.5;
          const strand2 = i % 3;
          if (strand2 < 2) {
            const s = strand2 === 0 ? 1 : -1;
            return [dnaR * Math.cos(dnaTheta2) * s, y2 + rand * 0.5, dnaR * Math.sin(dnaTheta2) * s];
          }
          // Cross bars
          const crossPhase = Math.floor(t * 20) / 20;
          const crossAngle = crossPhase * Math.PI * 10;
          const crossT = (t * 20) % 1;
          const cx = dnaR * Math.cos(crossAngle) * (1 - 2 * crossT);
          const cz = dnaR * Math.sin(crossAngle) * (1 - 2 * crossT);
          return [cx, (crossPhase - 0.5) * spread * 1.5, cz];
        }
        case 'explosion': {
          const r2 = spread * 0.3 + Math.pow(Math.random(), 0.3) * spread * 0.9;
          return [r2 * Math.sin(phi) * Math.cos(theta), r2 * Math.sin(phi) * Math.sin(theta), r2 * Math.cos(phi)];
        }
        case 'vortex': {
          const vR = spread * 0.2 + t * spread * 0.8;
          const vTheta = t * Math.PI * 12;
          const vy = (Math.random() - 0.5) * spread * 0.4 * (1 - t);
          return [vR * Math.cos(vTheta) + rand, vy, vR * Math.sin(vTheta) + rand];
        }
        case 'nebula': {
          // Wispy cloud clusters scattered in 3D space
          const cluster = Math.floor(Math.random() * 5);
          const cx = Math.cos(cluster / 5 * Math.PI * 2) * spread * 0.45;
          const cz = Math.sin(cluster / 5 * Math.PI * 2) * spread * 0.45;
          const cy = (Math.random() - 0.5) * spread * 0.4;
          const scatter = spread * 0.35;
          return [cx + (Math.random() - 0.5) * scatter, cy + (Math.random() - 0.5) * scatter * 0.6, cz + (Math.random() - 0.5) * scatter];
        }
        case 'wave': {
          // Undulating sine surface spread across XZ plane
          const wx = (Math.random() - 0.5) * spread * 2;
          const wz = (Math.random() - 0.5) * spread * 2;
          const wy = Math.sin(wx * 0.35) * Math.cos(wz * 0.35) * spread * 0.4 + (Math.random() - 0.5) * spread * 0.05;
          return [wx, wy, wz];
        }
        case 'flower': {
          // Petals: multiple rings at different Y levels and radii forming a bloom
          const petal = Math.floor(t * 6);
          const petalAngle = (petal / 6) * Math.PI * 2;
          const petalR = spread * 0.3 + Math.sin(t * Math.PI * 6) * spread * 0.45;
          const petalY = Math.cos(t * Math.PI * 6) * spread * 0.3;
          return [
            petalR * Math.cos(theta + petalAngle) + rand,
            petalY + rand * 0.5,
            petalR * Math.sin(theta + petalAngle) + rand
          ];
        }
        case 'constellation': {
          // Star-map-like: random XYZ but heavily concentrated on a flat plane with depth variation
          const starR = Math.pow(Math.random(), 0.4) * spread;
          const starTheta = Math.random() * Math.PI * 2;
          const depth = (Math.random() - 0.5) * spread * 0.4;
          return [starR * Math.cos(starTheta), depth, starR * Math.sin(starTheta)];
        }
        case 'comet': {
          // Elongated tail streaming in one direction
          const cometT = Math.pow(Math.random(), 1.8);
          const headR = spread * 0.04 + Math.random() * spread * 0.06 * (1 - cometT);
          const cometTheta2 = Math.random() * Math.PI * 2;
          const cometPhi = Math.acos(2 * Math.random() - 1);
          return [
            headR * Math.sin(cometPhi) * Math.cos(cometTheta2),
            headR * Math.sin(cometPhi) * Math.sin(cometTheta2),
            -spread * 0.5 + cometT * spread * 1.4 + rand * (0.5 + cometT * 2)
          ];
        }
        default: {
          const r3 = spread * 0.5 + Math.random() * spread * 0.5;
          return [r3 * Math.sin(phi) * Math.cos(theta), r3 * Math.sin(phi) * Math.sin(theta), r3 * Math.cos(phi)];
        }
      }
    }

    _createParticles() {
      const count = this.particleCount;
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const phases = new Float32Array(count);
      const active = new Float32Array(count);

      const formation = this.profile.formation;
      const spread = this.profile.spread;

      for (let i = 0; i < count; i++) {
        const p = this._distributeParticle(i, formation, spread);
        positions[i * 3] = p[0];
        positions[i * 3 + 1] = p[1];
        positions[i * 3 + 2] = p[2];
        sizes[i] = 1.0 + Math.random() * 1.5;
        phases[i] = Math.random() * Math.PI * 2;
        active[i] = 0;
      }

      const freqBins = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
        const r = Math.sqrt(x * x + y * y + z * z);
        freqBins[i] = Math.floor(Math.min(r / spread, 1.0) * 63);
      }
      this._freqBins = freqBins;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      geo.setAttribute('aActive', new THREE.BufferAttribute(active, 1));

      this._basePositions = new Float32Array(positions);
      this._targetPositions = new Float32Array(positions);
      this._activeAttr = geo.attributes.aActive;

      const col = this.theme.primary;
      this._particleUniforms = {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMids: { value: 0 },
        uHighs: { value: 0 },
        uSpeed: { value: this.profile.speed },
        uDisplacement: { value: this.profile.displacement },
        uChaos: { value: this.profile.chaos },
        uPulseStrength: { value: this.profile.pulseStrength },
        uColor: { value: new THREE.Vector3(col[0], col[1], col[2]) },
        uBeatColor: { value: new THREE.Vector3(1, 0.4, 0.1) },
        uBeatFlash: { value: 0 },
        uColorCycle: { value: 0 },
        uMorphProgress: { value: 0 },
        uMouseWorld: { value: new THREE.Vector3(0, 0, 0) },
        uRippleTime: { value: -1.0 },
        uRippleStr:  { value: 0.0 },
        uClickWorld: { value: new THREE.Vector3(0, 0, 0) },
        uClickAge:   { value: 999.0 },
        uClickStr:   { value: 0.0 },
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT_SHADER,
        fragmentShader: FRAG_SHADER,
        uniforms: this._particleUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      this.particles = new THREE.Points(geo, mat);
      this.scene.add(this.particles);
    }

    _createCentralGeo() {
      const geo = new THREE.IcosahedronGeometry(3.0, 2);
      const col = this.theme.primary;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(col[0], col[1], col[2]),
        wireframe: true,
        transparent: true,
        opacity: 0.32,
      });
      this.centralMesh = new THREE.Mesh(geo, mat);
      this.scene.add(this.centralMesh);
      this._centralBasePos = new Float32Array(geo.attributes.position.array);
    }

    _createAuraRing() {
      // Glowing ring around the central geometry that reacts to bass
      const ringGeo = new THREE.RingGeometry(4.5, 5.0, 64);
      const col = this.theme.primary;
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(col[0], col[1], col[2]),
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      this.auraRing = new THREE.Mesh(ringGeo, ringMat);
      this.scene.add(this.auraRing);
    }

    _morphCentralGeo() {
      this._centralGeoIdx = (this._centralGeoIdx + 1) % this._centralGeoTypes.length;
      const type = this._centralGeoTypes[this._centralGeoIdx];
      let newGeo;
      switch (type) {
        case 'octahedron': newGeo = new THREE.OctahedronGeometry(3.5, 2); break;
        case 'dodecahedron': newGeo = new THREE.DodecahedronGeometry(3.0, 1); break;
        case 'torus': newGeo = new THREE.TorusGeometry(3.0, 1.0, 8, 16); break;
        default: newGeo = new THREE.IcosahedronGeometry(3.0, 2); break;
      }

      this.centralMesh.geometry.dispose();
      this.centralMesh.geometry = newGeo;
      this._centralBasePos = new Float32Array(newGeo.attributes.position.array);
    }

    _createLines() {
      const maxSegs = this.maxConnections;
      const positions = new Float32Array(maxSegs * 6);
      const colors = new Float32Array(maxSegs * 6);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setDrawRange(0, 0);

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: this.profile.lineOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      this.lines = new THREE.LineSegments(geo, mat);
      this.scene.add(this.lines);
    }

    _updateConnections() {
      const pArr = this.particles.geometry.attributes.position.array;
      const count = this.particleCount;
      const threshold = this.connectionThreshold;
      const threshSq = threshold * threshold;

      const lPos = this.lines.geometry.attributes.position.array;
      const lCol = this.lines.geometry.attributes.color.array;

      // Mix smooth-lerped color with beat color
      const col = this._currentColor;
      const bc = this._beatColor;
      const beatMix = this._beatFlash * 0.5;
      const r = col[0] * (1 - beatMix) + bc[0] * beatMix;
      const g = col[1] * (1 - beatMix) + bc[1] * beatMix;
      const b = col[2] * (1 - beatMix) + bc[2] * beatMix;

      let segCount = 0;
      const max = this.maxConnections;
      const step = this.isMobile ? 8 : 4;

      for (let i = 0; i < count && segCount < max; i += step) {
        const ix = pArr[i * 3], iy = pArr[i * 3 + 1], iz = pArr[i * 3 + 2];
        for (let j = i + step; j < count && segCount < max; j += step) {
          const dx = ix - pArr[j * 3];
          const dy = iy - pArr[j * 3 + 1];
          const dz = iz - pArr[j * 3 + 2];
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < threshSq) {
            const fade = 1.0 - Math.sqrt(dSq) / threshold;
            const opacity = fade * (0.15 + this._beatFlash * 0.2);
            const idx = segCount * 6;
            lPos[idx] = ix; lPos[idx + 1] = iy; lPos[idx + 2] = iz;
            lPos[idx + 3] = pArr[j * 3]; lPos[idx + 4] = pArr[j * 3 + 1]; lPos[idx + 5] = pArr[j * 3 + 2];
            lCol[idx] = r * opacity; lCol[idx + 1] = g * opacity; lCol[idx + 2] = b * opacity;
            lCol[idx + 3] = r * opacity; lCol[idx + 4] = g * opacity; lCol[idx + 5] = b * opacity;
            segCount++;
          }
        }
      }

      this.lines.geometry.setDrawRange(0, segCount * 2);
      this.lines.geometry.attributes.position.needsUpdate = true;
      this.lines.geometry.attributes.color.needsUpdate = true;
    }

    _lerpPositionsToTarget() {
      const base = this._basePositions;
      const target = this._targetPositions;
      const len = base.length;
      for (let i = 0; i < len; i++) {
        base[i] += (target[i] - base[i]) * this._profileLerpSpeed;
      }
      this.particles.geometry.attributes.position.array.set(base);
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    _lerpProfile() {
      const keys = ['speed', 'displacement', 'chaos', 'pulseStrength', 'lineOpacity'];
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        this.profile[key] += (this.targetProfile[key] - this.profile[key]) * 0.03;
      }
      this._particleUniforms.uSpeed.value = this.profile.speed;
      this._particleUniforms.uDisplacement.value = this.profile.displacement;
      this._particleUniforms.uChaos.value = this.profile.chaos;
      this._particleUniforms.uPulseStrength.value = this.profile.pulseStrength;
      this.lines.material.opacity = this.profile.lineOpacity;
    }

    _updateParticleActivation() {
      if (!this._lastFreqData) return;
      const active = this._activeAttr.array;
      const freq = this._lastFreqData;
      const bins = this._freqBins;
      const count = this.particleCount;
      for (let i = 0; i < count; i++) {
        const bin = bins[i];
        const rawVal = (freq[bin] + 100) / 70;
        const val = Math.max(0, Math.min(1, rawVal));
        const current = active[i];
        if (val > current) {
          active[i] = current + (val - current) * 0.5;
        } else {
          // Slower decay — particles glow longer, more cinematic fade
          active[i] = current * 0.96;
        }
      }
      this._activeAttr.needsUpdate = true;
    }

    _detectBeat(dt) {
      // Detect bass transients for flash effects
      const bassJump = this.bass - this._prevBass;
      this._prevBass = this.bass;
      this._beatCooldown = Math.max(0, this._beatCooldown - dt);

      if (bassJump > this._beatThreshold && this._beatCooldown <= 0 && this.bass > 0.3) {
        this._beatFlash = 1.0;
        this._beatCooldown = 0.15;
        this._beatCount++;

        // Cycle beat color every few beats
        if (this._beatCount % 4 === 0) {
          const palette = BEAT_COLORS[this.targetProfile.colorPalette || 'cool'];
          this._currentBeatColorIdx = (this._currentBeatColorIdx + 1) % palette.length;
          const c = palette[this._currentBeatColorIdx];
          this._targetBeatColor[0] = c[0];
          this._targetBeatColor[1] = c[1];
          this._targetBeatColor[2] = c[2];
        }

        // Emit a pulse ring on every beat
        this._emitPulse(this._targetBeatColor, 9 + bassJump * 20);

        // Every 4th beat emit a second larger, slower ring
        if (this._beatCount % 4 === 0) {
          this._emitPulse(this._targetBeatColor, 5);
        }

        // Camera zoom punch — pull camera toward the scene on strong beats
        this._cameraTargetZ = 55 - Math.min(12, bassJump * 40);
      }

      // Decay flash — slower for more dramatic glow
      this._beatFlash *= 0.92;
      if (this._beatFlash < 0.01) this._beatFlash = 0;

      // Lerp beat color
      for (let i = 0; i < 3; i++) {
        this._beatColor[i] += (this._targetBeatColor[i] - this._beatColor[i]) * 0.1;
      }

      // Camera shake on strong beats
      this._cameraShake *= 0.9;
      if (bassJump > 0.25 && this.bass > 0.5) {
        this._cameraShake = Math.min(0.5, bassJump * 2);
      }
    }

    _randomFormationSwitch(dt) {
      this._formationTimer += dt;

      // Decay morph progress toward 0 (settled)
      if (this._morphProgress > 0) {
        this._morphProgress = Math.max(0, this._morphProgress - dt * 0.6);
        this._particleUniforms.uMorphProgress.value = this._morphProgress;
      }

      if (this._formationTimer >= this._formationInterval) {
        this._formationTimer = 0;
        this._morphProgress = 1.0; // trigger glow flash during transition

        let newFormation;
        do {
          newFormation = ALL_FORMATIONS[Math.floor(Math.random() * ALL_FORMATIONS.length)];
        } while (newFormation === this.profile.formation);

        const spread = this.targetProfile.spread;
        const count = this.particleCount;
        for (let i = 0; i < count; i++) {
          const p = this._distributeParticle(i, newFormation, spread);
          this._targetPositions[i * 3] = p[0];
          this._targetPositions[i * 3 + 1] = p[1];
          this._targetPositions[i * 3 + 2] = p[2];
        }
        this.profile.formation = newFormation;

        for (let i = 0; i < count; i++) {
          const x = this._targetPositions[i * 3], y = this._targetPositions[i * 3 + 1], z = this._targetPositions[i * 3 + 2];
          const r = Math.sqrt(x * x + y * y + z * z);
          this._freqBins[i] = Math.floor(Math.min(r / spread, 1.0) * 63);
        }
      }
    }

    _updateCentralGeoMorph(dt) {
      if (!this.targetProfile.shapeShift) return;
      this._centralMorphTimer += dt;
      if (this._centralMorphTimer >= this._centralMorphInterval) {
        this._centralMorphTimer = 0;
        this._morphCentralGeo();
      }
    }

    update(frequencyData, waveformData) {
      if (!this.ready) return;

      this._lastFreqData = frequencyData;
      this._lastWaveformData = waveformData;

      if (!frequencyData) {
        this.bass *= 0.95;
        this.mids *= 0.95;
        this.highs *= 0.95;
        return;
      }

      let bassSum = 0, midsSum = 0, highsSum = 0;
      for (let i = 0; i < 4; i++) bassSum += frequencyData[i];
      for (let i = 4; i < 16; i++) midsSum += frequencyData[i];
      for (let i = 16; i < frequencyData.length; i++) highsSum += frequencyData[i];

      const bassNorm = Math.max(0, Math.min(1, (bassSum / 4 + 100) / 100));
      const midsNorm = Math.max(0, Math.min(1, (midsSum / 12 + 100) / 100));
      const highsNorm = Math.max(0, Math.min(1, (highsSum / (frequencyData.length - 16) + 100) / 100));

      // Mic mode uses faster attack so live music beats hit immediately
      const lerpSpeed = this._micMode ? 0.45 : 0.15;
      const lerpSpeedH = this._micMode ? 0.4 : 0.12;
      this.bass  += (bassNorm  - this.bass)  * lerpSpeed;
      this.mids  += (midsNorm  - this.mids)  * lerpSpeed;
      this.highs += (highsNorm - this.highs) * lerpSpeedH;

      // Waveform on central geometry
      if (waveformData && this.centralMesh) {
        const posAttr = this.centralMesh.geometry.attributes.position;
        const arr = posAttr.array;
        const base = this._centralBasePos;
        const len = arr.length / 3;
        for (let i = 0; i < len; i++) {
          const wi = Math.floor((i / len) * waveformData.length);
          const wVal = waveformData[wi] || 0;
          const scale = 1.0 + wVal * this.bass * 0.6;
          arr[i * 3] = base[i * 3] * scale;
          arr[i * 3 + 1] = base[i * 3 + 1] * scale;
          arr[i * 3 + 2] = base[i * 3 + 2] * scale;
        }
        posAttr.needsUpdate = true;
      }
    }

    setTheme(themeName) {
      this.theme = THEMES[themeName] || THEMES.alpha;
      if (!this.ready) return;

      const col = this.theme.primary;
      const sec = this.theme.secondary;
      // Set target — actual color lerps smoothly in _animate
      this._targetColor[0] = col[0] * 0.7 + sec[0] * 0.3;
      this._targetColor[1] = col[1] * 0.7 + sec[1] * 0.3;
      this._targetColor[2] = col[2] * 0.7 + sec[2] * 0.3;
    }

    setMicMode(enabled) {
      this._micMode = enabled;
      if (enabled) {
        this._beatThreshold     = 0.06;  // very sensitive — catch every kick/snare
        this._profileLerpSpeed  = 0.018; // faster formation morphing
        this._formationInterval = 10;    // shapes change more frequently
        this.targetProfile.shapeShift = true;
      } else {
        this._beatThreshold     = 0.15;
        this._profileLerpSpeed  = 0.008;
        this._formationInterval = 18;
      }
    }

    setGenre(genreName) {
      const newProfile = GENRE_PROFILES[genreName] || DEFAULT_PROFILE;
      this.targetProfile = Object.assign({}, newProfile);

      const count = this.particleCount;
      const spread = newProfile.spread;
      const formation = newProfile.formation;
      for (let i = 0; i < count; i++) {
        const p = this._distributeParticle(i, formation, spread);
        this._targetPositions[i * 3] = p[0];
        this._targetPositions[i * 3 + 1] = p[1];
        this._targetPositions[i * 3 + 2] = p[2];
      }
      this.profile.formation = formation;

      for (let i = 0; i < count; i++) {
        const x = this._targetPositions[i * 3], y = this._targetPositions[i * 3 + 1], z = this._targetPositions[i * 3 + 2];
        const r = Math.sqrt(x * x + y * y + z * z);
        this._freqBins[i] = Math.floor(Math.min(r / spread, 1.0) * 63);
      }

      // Reset formation timer so we get the new genre's formation for a while before morphing
      this._formationTimer = 0;

      // Set initial beat color from palette
      const palette = BEAT_COLORS[newProfile.colorPalette || 'cool'];
      const c = palette[0];
      this._targetBeatColor[0] = c[0];
      this._targetBeatColor[1] = c[1];
      this._targetBeatColor[2] = c[2];

      // Drive the sphere/particle base color toward the genre palette
      this._targetColor[0] = c[0] * 0.75;
      this._targetColor[1] = c[1] * 0.75;
      this._targetColor[2] = c[2] * 0.75;

      // Seed fractal + tunnel with new palette color
      if (this._fractalUniforms) {
        this._fractalUniforms.uColor.value.set(c[0] * 0.75, c[1] * 0.75, c[2] * 0.75);
      }

      // Dispatch event so CSS background can react to genre color
      window.dispatchEvent(new CustomEvent('genre-change', {
        detail: { genre: genreName, palette: newProfile.colorPalette, color: c }
      }));
    }

    // ─── Center bloom glow ───────────────────────────────────────────
    _createCenterGlow() {
      const geo = new THREE.PlaneGeometry(28, 28);
      const uniforms = {
        uColor:     { value: new THREE.Vector3(0.5, 0.3, 1.0) },
        uIntensity: { value: 0.25 },
        uTime:      { value: 0 },
      };
      const mat = new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          varying vec2 vUv;
          uniform vec3 uColor;
          uniform float uIntensity;
          uniform float uTime;
          void main(){
            vec2 uv = vUv - 0.5;
            float d = length(uv);
            float g = pow(max(0.0, 1.0 - d * 2.4), 2.5) * uIntensity;
            g *= 0.85 + 0.15 * sin(uTime * 1.1);
            gl_FragColor = vec4(uColor * g * 1.4, g * 0.65);
          }`,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      this._centerGlow = new THREE.Mesh(geo, mat);
      this._centerGlowUniforms = uniforms;
      this.scene.add(this._centerGlow);
    }

    // ─── Pulse rings (emitted on every beat) ─────────────────────────
    _createPulseRings() {
      for (let i = 0; i < 8; i++) {
        const geo = new THREE.RingGeometry(0.6, 1.1, 72);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(1, 0.5, 0.1),
          transparent: true, opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh._pa = false; mesh._ps = 1; mesh._po = 0; mesh._pspd = 10;
        this.scene.add(mesh);
        this._pulsePool.push(mesh);
      }
    }

    _emitPulse(color, speed) {
      const mesh = this._pulsePool[this._pulseIdx % this._pulsePool.length];
      this._pulseIdx++;
      mesh.material.color.setRGB(color[0], color[1], color[2]);
      mesh._pa = true; mesh._ps = 0.4; mesh._po = 1.0; mesh._pspd = speed || 10;
      mesh.scale.setScalar(0.4);
      mesh.material.opacity = 1.0;
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    }

    _updatePulseRings(dt) {
      for (const m of this._pulsePool) {
        if (!m._pa) continue;
        m._ps += m._pspd * dt;
        m._po -= 1.6 * dt;
        if (m._po <= 0) { m._pa = false; m.material.opacity = 0; }
        else { m.scale.setScalar(m._ps); m.material.opacity = m._po * m._po; }
      }
    }

    // ─── Waveform ribbon ─────────────────────────────────────────────
    _createWaveformRibbon() {
      const N = 256;
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        pos[i*3] = Math.cos(a) * 18; pos[i*3+1] = 0; pos[i*3+2] = Math.sin(a) * 18;
        col[i*3] = 0.5; col[i*3+1] = 0.3; col[i*3+2] = 1.0;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this._waveRibbon = new THREE.LineLoop(geo, mat);
      this.scene.add(this._waveRibbon);
    }

    _updateWaveformRibbon(elapsed) {
      if (!this._waveRibbon) return;
      const pos = this._waveRibbon.geometry.attributes.position.array;
      const col = this._waveRibbon.geometry.attributes.color.array;
      const N = pos.length / 3;
      const waveform = this._lastWaveformData;
      const cc = this._currentColor; const bc = this._beatColor;
      const bm = Math.min(1, this._beatFlash * 0.9);
      const cr = cc[0]*(1-bm)+bc[0]*bm, cg = cc[1]*(1-bm)+bc[1]*bm, cb = cc[2]*(1-bm)+bc[2]*bm;

      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + elapsed * 0.04;
        let w = waveform ? (waveform[Math.floor((i/N)*waveform.length)] || 0)
                         : Math.sin(elapsed * 1.2 + i * 0.12) * 0.025;
        const bboost = 1 + this.bass * 3;
        const r = 18 + w * 10 * bboost;
        pos[i*3]   = Math.cos(a) * r;
        pos[i*3+1] = w * 4 * (0.4 + this.mids);
        pos[i*3+2] = Math.sin(a) * r;
        const bright = 0.7 + Math.abs(w) * 3 + this.highs * 0.6;
        col[i*3]   = cr * bright; col[i*3+1] = cg * bright; col[i*3+2] = cb * bright;
      }
      this._waveRibbon.geometry.attributes.position.needsUpdate = true;
      this._waveRibbon.geometry.attributes.color.needsUpdate = true;
      this._waveRibbon.material.opacity = 0.55 + this.bass * 0.4 + this._beatFlash * 0.3;
    }

    // ─── Frequency bars (circular EQ ring) ───────────────────────────
    _createFreqBars() {
      const N = 64;
      const pos = new Float32Array(N * 2 * 3);
      const col = new Float32Array(N * 2 * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this._freqBars = new THREE.LineSegments(geo, mat);
      this._freqBarsN = N;
      this.scene.add(this._freqBars);
    }

    _updateFreqBars(elapsed) {
      if (!this._freqBars) return;
      const pos = this._freqBars.geometry.attributes.position.array;
      const col = this._freqBars.geometry.attributes.color.array;
      const N = this._freqBarsN;
      const inner = 14;
      const rot = elapsed * 0.07;
      const cc = this._currentColor; const bc = this._beatColor;
      const bm = Math.min(1, this._beatFlash * 0.85);
      const cr = cc[0]*(1-bm)+bc[0]*bm, cg = cc[1]*(1-bm)+bc[1]*bm, cb = cc[2]*(1-bm)+bc[2]*bm;

      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + rot;
        const cos = Math.cos(a), sin = Math.sin(a);
        let v = 0;
        if (this._lastFreqData) {
          const bin = Math.floor(i * this._lastFreqData.length / N);
          v = Math.max(0, (this._lastFreqData[bin] + 100) / 100);
        } else {
          v = 0.04 + Math.sin(elapsed * 0.7 + i * 0.35) * 0.02;
        }
        const barLen = 0.2 + v * 5.5 * (1 + this._beatFlash * 0.7);
        const outer = inner + barLen;

        // inner vertex
        pos[i*6]   = cos*inner; pos[i*6+1] = 0;               pos[i*6+2] = sin*inner;
        // outer vertex (slight Y lift for 3D effect)
        pos[i*6+3] = cos*outer; pos[i*6+4] = v*2*this.mids;   pos[i*6+5] = sin*outer;

        // inner dim, outer bright
        col[i*6]   = cr*0.3; col[i*6+1] = cg*0.3; col[i*6+2] = cb*0.3;
        col[i*6+3] = Math.min(1.5, cr*1.4); col[i*6+4] = Math.min(1.5, cg*1.4); col[i*6+5] = Math.min(1.5, cb*1.4);
      }
      this._freqBars.geometry.attributes.position.needsUpdate = true;
      this._freqBars.geometry.attributes.color.needsUpdate = true;
      this._freqBars.material.opacity = 0.65 + this.bass * 0.3 + this._beatFlash * 0.2;
    }

    triggerClick(nx, ny) {
      // nx, ny in [-1,1] normalised screen coords
      if (!this.ready) return;

      // Fractal: store screen-space click in [-0.5, 0.5]
      if (this._fractalUniforms) {
        this._fractalUniforms.uClickScreen.value.set(nx * 0.5, ny * 0.5);
        this._fractalUniforms.uClickAge.value  = 0.0;
        this._fractalUniforms.uClickStr.value  = 1.0;
      }

      // Particles: unproject click onto Z=0 world plane
      if (this._particleUniforms) {
        const vec = new THREE.Vector3(nx, ny, 0.5).unproject(this.camera);
        const dir = vec.sub(this.camera.position).normalize();
        const dist = -this.camera.position.z / dir.z;
        const world = this.camera.position.clone().add(dir.multiplyScalar(dist));
        this._particleUniforms.uClickWorld.value.copy(world);
        this._particleUniforms.uClickAge.value = 0.0;
        this._particleUniforms.uClickStr.value = 1.0;
        this._clickStampTime = this._rippleClock || 0;
      }

      // Extra pulse ring at click point
      this._emitPulse(this._beatColor, 18);
      this._emitPulse(this._currentColor, 10);
    }

    setMousePosition(nx, ny) {
      // nx, ny in [-1, 1] normalized screen coords
      this._targetMouseX = nx;
      this._targetMouseY = ny;


      // Unproject mouse onto Z=0 plane in world space for ripple origin
      if (!this.ready || !this._particleUniforms) return;
      const vec = new THREE.Vector3(nx, ny, 0.5).unproject(this.camera);
      const dir = vec.sub(this.camera.position).normalize();
      const dist = -this.camera.position.z / dir.z;
      const worldPos = this.camera.position.clone().add(dir.multiplyScalar(dist));

      const prev = this._particleUniforms.uMouseWorld.value;
      const moved = prev.distanceTo(worldPos);

      // Stamp a new ripple if mouse moved meaningfully
      if (moved > 0.8) {
        this._rippleStampTime = this._rippleClock || 0;
        this._particleUniforms.uRippleStr.value = 1.0;
      }
      this._particleUniforms.uMouseWorld.value.copy(worldPos);

      // Fade ripple strength in continuously while moving
      this._rippleMoving = true;
    }

    resize() {
      if (!this.ready) return;
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this._fractalUniforms) this._fractalUniforms.uAspect.value = aspect;
      if (this._fractalMesh) {
        const h = 2 * Math.tan((75 * Math.PI / 180) / 2);
        this._fractalMesh.scale.set(h * aspect, h, 1);
      }
    }

    _animate() {
      this._rafId = requestAnimationFrame(this._bound_animate);

      const dt = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Lerp profile values and positions
      this._lerpProfile();
      this._lerpPositionsToTarget();

      // Per-particle audio activation
      this._updateParticleActivation();

      // Beat detection & color cycling
      this._detectBeat(dt);
      this._colorCycleTime += dt * (this.targetProfile.morphSpeed || 0.5);

      // Random formation & geometry morphing
      this._randomFormationSwitch(dt);
      this._updateCentralGeoMorph(dt);

      // New effect updates
      this._updatePulseRings(dt);
      this._updateWaveformRibbon(elapsed);
      this._updateFreqBars(elapsed);
      this._updateTunnelRings(elapsed, dt);

      // Smooth theme color lerp — the key fix for sphere color transitions
      const cc = this._currentColor;
      const tc = this._targetColor;
      const colorLerp = 0.025;
      cc[0] += (tc[0] - cc[0]) * colorLerp;
      cc[1] += (tc[1] - cc[1]) * colorLerp;
      cc[2] += (tc[2] - cc[2]) * colorLerp;

      // Camera Z zoom pulse — lerp back to rest after beat punch
      this._cameraTargetZ += (55 - this._cameraTargetZ) * 0.08;
      this._cameraZ += (this._cameraTargetZ - this._cameraZ) * 0.12;
      this.camera.position.z = this._cameraZ;

      // Ambient color breathing — sphere gently shifts hue over time
      const breathR = cc[0] + Math.sin(elapsed * 0.15) * 0.06;
      const breathG = cc[1] + Math.sin(elapsed * 0.15 + 2.094) * 0.06;
      const breathB = cc[2] + Math.sin(elapsed * 0.15 + 4.189) * 0.06;

      // Fractal background uniforms (must come after breathR/G/B are defined)
      if (this._fractalUniforms) {
        const fu = this._fractalUniforms;
        fu.uTime.value      = elapsed;
        fu.uBass.value      = this.bass;
        fu.uMids.value      = this.mids;
        fu.uHighs.value     = this.highs;
        fu.uBeatFlash.value = this._beatFlash;
        fu.uColor.value.set(breathR, breathG, breathB);
        fu.uBeatColor.value.set(this._beatColor[0], this._beatColor[1], this._beatColor[2]);
        fu.uZoomSpeed.value = 0.038 + this.bass * 0.025 + this.mids * 0.012;

      }

      // Update uniforms
      this._particleUniforms.uTime.value = elapsed;
      this._particleUniforms.uBass.value = this.bass;
      this._particleUniforms.uMids.value = this.mids;
      this._particleUniforms.uHighs.value = this.highs;
      this._particleUniforms.uBeatFlash.value = this._beatFlash;
      this._particleUniforms.uColorCycle.value = this._colorCycleTime;
      this._particleUniforms.uColor.value.set(breathR, breathG, breathB);
      this._particleUniforms.uBeatColor.value.set(
        this._beatColor[0], this._beatColor[1], this._beatColor[2]
      );

      // Central geometry - dynamic rotation speed based on energy
      if (this.centralMesh) {
        const energy = this.bass * 0.5 + this.mids * 0.3 + this.highs * 0.2;
        this.centralMesh.rotation.x = elapsed * (0.05 + energy * 0.15);
        this.centralMesh.rotation.y = elapsed * (0.08 + energy * 0.2);
        this.centralMesh.rotation.z = elapsed * 0.03;
        const cScale = 1.0 + this.bass * this.profile.pulseStrength * 0.6;
        this.centralMesh.scale.setScalar(cScale);

        // Smooth color: lerped theme + beat reactive + breathing
        const bc = this._beatColor;
        const bm = this._beatFlash * 0.6;
        this.centralMesh.material.color.setRGB(
          breathR * (1 - bm) + bc[0] * bm,
          breathG * (1 - bm) + bc[1] * bm,
          breathB * (1 - bm) + bc[2] * bm
        );
        this.centralMesh.material.opacity = 0.32 + energy * 0.25 + this._beatFlash * 0.35;
      }

      // Aura ring - pulses on bass, color synced
      if (this.auraRing) {
        this.auraRing.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.3) * 0.2;
        this.auraRing.rotation.z = elapsed * 0.1;
        const auraScale = 1.0 + this.bass * 0.8 + this._beatFlash * 0.5;
        this.auraRing.scale.setScalar(auraScale);
        this.auraRing.material.opacity = 0.04 + this.bass * 0.15 + this._beatFlash * 0.2;

        const bc = this._beatColor;
        const bm = this._beatFlash * 0.7;
        this.auraRing.material.color.setRGB(
          breathR * (1 - bm) + bc[0] * bm,
          breathG * (1 - bm) + bc[1] * bm,
          breathB * (1 - bm) + bc[2] * bm
        );
      }

      // Center bloom glow — always faces camera, reacts to energy + beats
      if (this._centerGlow && this._centerGlowUniforms) {
        this._centerGlow.quaternion.copy(this.camera.quaternion);
        const energy = this.bass * 0.5 + this.mids * 0.3 + this.highs * 0.2;
        this._centerGlowUniforms.uIntensity.value = 0.18 + energy * 0.7 + this._beatFlash * 1.0;
        this._centerGlowUniforms.uTime.value = elapsed;
        this._centerGlowUniforms.uColor.value.set(breathR, breathG, breathB);
      }

      // Particle group rotation - energy-reactive
      const rotSpeed = 0.02 + this.bass * 0.03;
      this.particles.rotation.y = elapsed * rotSpeed;
      this.particles.rotation.x = Math.sin(elapsed * 0.01) * 0.1;

      // Smooth mouse parallax lerp
      this._mouseX += (this._targetMouseX - this._mouseX) * 0.05;
      this._mouseY += (this._targetMouseY - this._mouseY) * 0.05;

      // Camera orbit with shake + mouse parallax
      this._orbitAngle += 0.0003 + this.bass * 0.0005;
      const shakeX = (Math.random() - 0.5) * this._cameraShake;
      const shakeY = (Math.random() - 0.5) * this._cameraShake;
      this.camera.position.x = Math.sin(this._orbitAngle) * 2 + shakeX + this._mouseX * 4;
      this.camera.position.y = Math.cos(this._orbitAngle * 0.7) * 1 + shakeY - this._mouseY * 3;
      this.camera.lookAt(0, 0, 0);

      // Update connections every 3rd frame
      this._frameCount = (this._frameCount || 0) + 1;
      if (this._frameCount % 3 === 0) {
        this._updateConnections();
      }

      // ── Ripple + click tick ────────────────────────────────────────
      if (this._particleUniforms) {
        this._rippleClock = (this._rippleClock || 0) + dt;

        // Hover ripple
        const age = this._rippleClock - (this._rippleStampTime || 0);
        this._particleUniforms.uRippleTime.value = age;
        if (!this._rippleMoving) {
          this._particleUniforms.uRippleStr.value *= 0.92;
        }
        this._rippleMoving = false;

        // Click burst — advance age and decay strength
        this._particleUniforms.uClickAge.value += dt;
        this._particleUniforms.uClickStr.value *= 0.96;
        if (this._particleUniforms.uClickStr.value < 0.001) {
          this._particleUniforms.uClickStr.value = 0.0;
        }
      }

      // Click age for fractal
      if (this._fractalUniforms) {
        this._fractalUniforms.uClickAge.value += dt;
        this._fractalUniforms.uClickStr.value *= 0.97;
        if (this._fractalUniforms.uClickStr.value < 0.001) {
          this._fractalUniforms.uClickStr.value = 0.0;
        }
      }

      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      if (!this.ready) return;
      cancelAnimationFrame(this._rafId);
      window.removeEventListener('resize', this._bound_resize);

      this.particles.geometry.dispose();
      this.particles.material.dispose();
      this.centralMesh.geometry.dispose();
      this.centralMesh.material.dispose();
      this.lines.geometry.dispose();
      this.lines.material.dispose();
      if (this.auraRing) {
        this.auraRing.geometry.dispose();
        this.auraRing.material.dispose();
      }

      for (const ring of this._tunnelRings) {
        ring.geometry.dispose();
        ring.material.dispose();
      }
      if (this._fractalMesh) {
        this._fractalMesh.geometry.dispose();
        this._fractalMesh.material.dispose();
      }
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.ready = false;
    }
  }

  window.VisualizerBG = VisualizerBG;
})();
