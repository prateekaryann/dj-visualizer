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
  const ALL_FORMATIONS = ['sphere', 'ring', 'spiral', 'cube', 'helix', 'galaxy', 'torus', 'dna', 'explosion', 'vortex', 'nebula', 'wave', 'flower', 'constellation', 'comet',
    // 100 tunnel formations
    'tunnelStraight', 'tunnelSpiral', 'tunnelHelix', 'tunnelPulse', 'tunnelRibbed', 'tunnelTwist', 'tunnelBraid', 'tunnelWave', 'tunnelBreath', 'tunnelVortex',
    'tunnelDouble', 'tunnelTriple', 'tunnelNested', 'tunnelCoil', 'tunnelDNA', 'tunnelChain', 'tunnelLattice', 'tunnelMesh', 'tunnelCage', 'tunnelBranch',
    'tunnelSplit', 'tunnelMerge', 'tunnelCross', 'tunnelStar', 'tunnelHex', 'tunnelSquare', 'tunnelTriangle', 'tunnelOctagon', 'tunnelEllipse', 'tunnelKeyhole',
    'tunnelInfinity', 'tunnelMobius', 'tunnelKnot', 'tunnelTrefoil', 'tunnelSpring', 'tunnelCorkscrew', 'tunnelBarber', 'tunnelDrill', 'tunnelTornado', 'tunnelWhirlpool',
    'tunnelWormhole', 'tunnelBlackhole', 'tunnelHyper', 'tunnelWarp', 'tunnelGlitch', 'tunnelShatter', 'tunnelCrystal', 'tunnelFractal', 'tunnelFern', 'tunnelCoral',
    'tunnelOrgan', 'tunnelVein', 'tunnelNeural', 'tunnelSynapse', 'tunnelSpine', 'tunnelRibcage', 'tunnelHeart', 'tunnelPulsar', 'tunnelNebula', 'tunnelAurora',
    'tunnelLava', 'tunnelIce', 'tunnelWater', 'tunnelFire', 'tunnelSmoke', 'tunnelCloud', 'tunnelLightning', 'tunnelRain', 'tunnelSnow', 'tunnelSand',
    'tunnelBamboo', 'tunnelVine', 'tunnelRoot', 'tunnelBark', 'tunnelShell', 'tunnelNautilus', 'tunnelJelly', 'tunnelTentacle', 'tunnelSerpent', 'tunnelDragon',
    'tunnelRipple', 'tunnelTide', 'tunnelCascade', 'tunnelFall', 'tunnelGeyser', 'tunnelBubble', 'tunnelFoam', 'tunnelSilk', 'tunnelChrome', 'tunnelNeon',
    'tunnelPrism', 'tunnelKaleidoscope', 'tunnelMandala', 'tunnelSacred', 'tunnelZen', 'tunnelChaos', 'tunnelOrder', 'tunnelPulseRing', 'tunnelEcho', 'tunnelPhantom'
  ];

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
    uniform float uSizeMultiplier;
    uniform float uPull;
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
      pos += dir * (wave * uDisplacement + pulse) * 0.6;
      pos += dir * wave2 * uDisplacement * 0.2;

      // Chaos
      float chaosScale = uChaos * (0.5 + uBass);
      pos.x += sin(t * 3.0 + aPhase * 7.0) * chaosScale;
      pos.y += cos(t * 4.0 + aPhase * 5.0) * chaosScale;
      pos.z += sin(t * 2.5 + aPhase * 9.0) * chaosScale;

      // Beat explosion — gentle push, not radial streak
      pos += dir * uBeatFlash * 0.6 * aActive;

      // Ambient drift
      pos.x += sin(t * 0.2 + aPhase) * 0.3;
      pos.y += cos(t * 0.15 + aPhase * 1.3) * 0.3;
      pos.z += sin(t * 0.1 + aPhase * 0.7) * 0.15;

      // ── Beat pull — particles flow smoothly into the globe center ──
      if (uPull > 0.001) {
        // Lerp position toward origin (center of globe)
        pos = pos * (1.0 - uPull);
      }

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
      float pullShrink  = 1.0 - uPull * 0.6; // shrink as they approach globe
      gl_PointSize = baseSize * activeBoost * midsBoost * beatBoost * rippleBoost * uSizeMultiplier * pullShrink * (120.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 1.0, 14.0);

      gl_Position = projectionMatrix * mvPosition;

      float distFade = clamp(1.0 - length(mvPosition.xyz) / 160.0, 0.1, 1.0);
      vAlpha     = (0.6 + aActive * 0.4) * distFade;
      // Fade particles as they get pulled into the globe
      if (uPull > 0.01) {
        // Visible during journey, fade only in last 30% of pull
        float fadePull = smoothstep(0.7, 1.0, uPull);
        vAlpha *= (1.0 - fadePull * 0.9);
      }
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

    // Star SDF: 5-pointed star shape
    float starSDF(vec2 p, float r, float points, float innerR) {
      float angle = atan(p.y, p.x);
      float seg = 6.2831853 / points;
      float a = mod(angle + seg * 0.5, seg) - seg * 0.5;
      float outer = r * cos(seg * 0.5);
      float d1 = length(p) * cos(a) - outer;
      float d2 = length(p) * cos(a - seg * 0.5) - outer * innerR;
      return min(max(d1, d2), length(p) - r * innerR * 0.5);
    }

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float dist = length(uv);

      // Star shape: 5-pointed with glow
      float star = starSDF(uv, 0.45, 5.0, 0.45);
      if (star > 0.15) discard;

      // Enhanced glow: bright core + soft halo + wide outer glow
      float core = 1.0 - smoothstep(0.0, 0.02, max(star, 0.0));
      float innerGlow = smoothstep(0.15, 0.0, star) * 0.6;
      float outerGlow = smoothstep(0.15, 0.05, star) * 0.25;
      float beatGlow = smoothstep(0.15, 0.02, star) * vBeatFlash * 0.4;
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

      // Julia c — slow autonomous rotation, subtle audio influence
      float angle     = uTime * 0.04;
      float bassShift = uBass * 0.12;
      vec2 c = vec2(
        -0.745 + cos(angle) * (0.12 + bassShift),
         0.112 + sin(angle * 0.7) * (0.08 + uMids * 0.06)
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

      vec2  z1    = zoomed * (2.4 + uHighs * 0.15);
      float iter  = juliaIter(z1, c);
      float t     = iter / 96.0;

      // Palette
      float phase = t * 6.2832 + uTime * 0.15;
      vec3  col   = 0.5 + 0.5 * cos(phase + uColor * 6.28 + vec3(0.0, 0.4, 0.8));

      col = mix(col, uBeatColor, uBeatFlash * 0.1);

      // Click flash
      float clickFlash = exp(-uClickAge * 3.5) * uClickStr;
      col = mix(col, vec3(1.0), clickFlash * 0.6);

      float exterior = smoothstep(0.0, 0.08, t);
      float alpha    = exterior * 0.22 * fadeEdge * (0.8 + uBass * 0.15 + uHighs * 0.05);

      gl_FragColor = vec4(col * (0.75 + uMids * 0.2), clamp(alpha, 0.0, 0.85));
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

      // Spiralling fractal-like rings inside the tunnel — subtle audio
      float rings = abs(sin(r * 18.0 - uTime * 1.5 + uBass * 1.2));
      float spoke = abs(sin(a * 8.0 + uTime * 0.6));
      float pattern = rings * 0.6 + spoke * 0.3;

      // Edge fade
      float edge = smoothstep(0.5, 0.35, r) * smoothstep(0.02, 0.06, r);
      float depthFade = clamp(1.0 - vDepth / 120.0, 0.0, 1.0);

      vec3 col = uColor * (0.5 + pattern * 1.2 + uBass * 0.15);
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

      // Enhanced audio metrics engine (set externally from app.js)
      this._audioMetrics = null;
      // Mic mode flag
      this._micMode = false;

      this.theme = THEMES.alpha;
      this.profile = Object.assign({}, DEFAULT_PROFILE);
      this.targetProfile = Object.assign({}, DEFAULT_PROFILE);
      this._profileLerpSpeed = 0.008; // slower = more fluid morphing between formations

      this._lastFreqData = null;
      this._lastWaveformData = null;

      // Beat detection
      this._prevBass = 0;
      this._beatFlash = 0;
      this._beatPull = 0;         // 0 = normal, 1 = particles pulled to center
      this._beatPullPhase = 0;    // 0 = idle, 1 = pulling in, 2 = releasing
      this._beatPullTimer = 0;    // time spent in pull phase
      this._beatPullStrength = 0; // how strong current pull is
      this._beatThreshold = 0.15;
      this._beatCooldown = 0;
      this._beatCount = 0;

      // Color cycling
      this._colorCycleTime = 0;
      this._currentBeatColorIdx = 0;
      this._beatColor = new Float32Array(this.theme.primary);
      this._targetBeatColor = new Float32Array(this.theme.primary);

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

      // Master musical intensity — slowly tracks overall energy envelope
      this._intensity = 0;        // [0,1] smoothed master energy
      this._intensityTarget = 0;
      this._intensityPeak = 0;    // recent peak for dynamic range

      // Particle config overrides (toggled by UI)
      this.config = {
        enabled: true,          // master on/off
        beatReact: true,
        colorCycle: true,
        formationMorph: true,
        shapeShift: true,
        cameraShake: true,
        displacement: true,
        connections: true,
        particleSizeMultiplier: 1,
        speedMultiplier: 1,
        chaosOverride: null, // null = use profile, number = override
      };

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
      // Freq bars removed — energy waves replace them
      this._createEnergyWaves();
      this._createRingSparks();

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
      // Use fractal-synced breathing color
      const br = this._breathR || 0.5, bg = this._breathG || 0.5, bb = this._breathB || 0.5;
      const bc = this._beatColor;
      const bm = Math.min(1, this._beatFlash * 0.6);
      const r = br*(1-bm)+bc[0]*bm;
      const g = bg*(1-bm)+bc[1]*bm;
      const b = bb*(1-bm)+bc[2]*bm;

      for (const ring of this._tunnelRings) {
        ring._uniforms.uTime.value    = elapsed;
        ring._uniforms.uBass.value    = this.bass * 0.35;
        ring._uniforms.uColor.value.set(r, g, b);
        ring._uniforms.uOpacity.value = (0.12 + this.bass * 0.08 + this._beatFlash * 0.1) * ring._speed;

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
        // ===== 100 TUNNEL FORMATIONS =====
        // All formations create tunnel-like structures — particles on cylindrical/tubular
        // surfaces extending along Z-axis. Viewer looks down the tunnel.
        // Base pattern: z = depth, x/y = ring position around tunnel wall.

        // --- Basic Tunnel Shapes ---
        case 'tunnelStraight': {
          // Simple straight cylinder tunnel
          const tsZ = (t - 0.5) * spread * 3;
          const tsR = spread * 0.4;
          return [tsR * Math.cos(theta) + rand * 0.5, tsR * Math.sin(theta) + rand * 0.5, tsZ];
        }
        case 'tunnelSpiral': {
          // Tunnel with spiral grooves on the wall
          const tspZ = (t - 0.5) * spread * 3;
          const tspA = theta + tspZ * 0.15;
          const tspR = spread * 0.4 + Math.sin(tspA * 6) * spread * 0.03;
          return [tspR * Math.cos(tspA) + rand * 0.3, tspR * Math.sin(tspA) + rand * 0.3, tspZ];
        }
        case 'tunnelHelix': {
          // Tunnel centerline follows a helix path
          const thZ = (t - 0.5) * spread * 3;
          const thHelixA = thZ * 0.12;
          const thCX = Math.cos(thHelixA) * spread * 0.15;
          const thCY = Math.sin(thHelixA) * spread * 0.15;
          const thR = spread * 0.3;
          return [thCX + thR * Math.cos(theta) + rand * 0.3, thCY + thR * Math.sin(theta) + rand * 0.3, thZ];
        }
        case 'tunnelPulse': {
          // Tunnel radius pulses along its length
          const tpZ = (t - 0.5) * spread * 3;
          const tpR = spread * 0.25 + Math.sin(tpZ * 0.3) * spread * 0.15;
          return [tpR * Math.cos(theta) + rand * 0.3, tpR * Math.sin(theta) + rand * 0.3, tpZ];
        }
        case 'tunnelRibbed': {
          // Tunnel with periodic ribs/rings
          const trZ = (t - 0.5) * spread * 3;
          const trRib = Math.cos(trZ * 0.8) * 0.5 + 0.5;
          const trR = spread * 0.3 + trRib * spread * 0.12;
          return [trR * Math.cos(theta) + rand * 0.3, trR * Math.sin(theta) + rand * 0.3, trZ];
        }
        case 'tunnelTwist': {
          // Tunnel cross-section rotates along length
          const ttZ = (t - 0.5) * spread * 3;
          const ttTwist = ttZ * 0.1;
          const ttA = theta + ttTwist;
          const ttR = spread * 0.35;
          return [ttR * Math.cos(ttA) + rand * 0.3, ttR * Math.sin(ttA) + rand * 0.3, ttZ];
        }
        case 'tunnelBraid': {
          // Three braided tunnel strands
          const tbZ = (t - 0.5) * spread * 3;
          const tbStrand = i % 3;
          const tbOff = tbStrand / 3 * Math.PI * 2;
          const tbBraidA = tbZ * 0.15 + tbOff;
          const tbCX = Math.cos(tbBraidA) * spread * 0.2;
          const tbCY = Math.sin(tbBraidA) * spread * 0.2;
          const tbR = spread * 0.12;
          return [tbCX + tbR * Math.cos(theta) + rand * 0.3, tbCY + tbR * Math.sin(theta) + rand * 0.3, tbZ];
        }
        case 'tunnelWave': {
          // Tunnel center undulates in sine wave
          const twZ = (t - 0.5) * spread * 3;
          const twCX = Math.sin(twZ * 0.2) * spread * 0.2;
          const twCY = Math.cos(twZ * 0.15) * spread * 0.15;
          const twR = spread * 0.3;
          return [twCX + twR * Math.cos(theta) + rand * 0.3, twCY + twR * Math.sin(theta) + rand * 0.3, twZ];
        }
        case 'tunnelBreath': {
          // Tunnel slowly expands and contracts like breathing
          const tbzZ = (t - 0.5) * spread * 3;
          const tbzR = spread * 0.3 + Math.sin(tbzZ * 0.1) * spread * 0.12 * Math.sin(t * Math.PI);
          return [tbzR * Math.cos(theta) + rand * 0.3, tbzR * Math.sin(theta) + rand * 0.3, tbzZ];
        }
        case 'tunnelVortex': {
          // Tunnel with vortex twist — particles spiral inward
          const tvZ = (t - 0.5) * spread * 3;
          const tvA = theta + tvZ * 0.25;
          const tvR = spread * 0.35 - Math.abs(Math.sin(tvZ * 0.15)) * spread * 0.1;
          return [tvR * Math.cos(tvA) + rand * 0.3, tvR * Math.sin(tvA) + rand * 0.3, tvZ];
        }

        // --- Multi-Tunnel ---
        case 'tunnelDouble': {
          // Two parallel tunnels side by side
          const tdZ = (t - 0.5) * spread * 3;
          const tdSide = i % 2 === 0 ? -1 : 1;
          const tdR = spread * 0.2;
          const tdOff = spread * 0.22;
          return [tdSide * tdOff + tdR * Math.cos(theta) + rand * 0.3, tdR * Math.sin(theta) + rand * 0.3, tdZ];
        }
        case 'tunnelTriple': {
          // Three tunnels in triangular arrangement
          const ttZ2 = (t - 0.5) * spread * 3;
          const ttTube = i % 3;
          const ttA2 = ttTube / 3 * Math.PI * 2 - Math.PI / 2;
          const ttOff = spread * 0.2;
          const ttR2 = spread * 0.15;
          return [Math.cos(ttA2) * ttOff + ttR2 * Math.cos(theta) + rand * 0.2, Math.sin(ttA2) * ttOff + ttR2 * Math.sin(theta) + rand * 0.2, ttZ2];
        }
        case 'tunnelNested': {
          // Tunnel inside a tunnel
          const tnZ = (t - 0.5) * spread * 3;
          const tnLayer = i % 2;
          const tnR = tnLayer === 0 ? spread * 0.45 : spread * 0.2;
          return [tnR * Math.cos(theta) + rand * 0.3, tnR * Math.sin(theta) + rand * 0.3, tnZ];
        }
        case 'tunnelCoil': {
          // Tunnel wall made of coiling strands
          const tcZ = (t - 0.5) * spread * 3;
          const tcCoilA = tcZ * 0.5 + theta * 3;
          const tcR = spread * 0.35 + Math.sin(tcCoilA) * spread * 0.06;
          const tcA = theta + Math.cos(tcCoilA) * 0.15;
          return [tcR * Math.cos(tcA) + rand * 0.3, tcR * Math.sin(tcA) + rand * 0.3, tcZ];
        }
        case 'tunnelDNA': {
          // Double helix strands forming tunnel wall
          const tdnZ = (t - 0.5) * spread * 3;
          const tdnStrand = i % 3;
          const tdnR = spread * 0.35;
          if (tdnStrand < 2) {
            const tdnS = tdnStrand === 0 ? 1 : -1;
            const tdnA = tdnZ * 0.2;
            return [tdnR * Math.cos(theta) * (0.8 + 0.2 * Math.cos(tdnA * tdnS)), tdnR * Math.sin(theta) * (0.8 + 0.2 * Math.sin(tdnA * tdnS)), tdnZ];
          }
          const tdnCross = Math.floor(t * 30) / 30;
          const tdnCA = tdnCross * spread * 3 * 0.2;
          const tdnCT = (t * 30) % 1;
          return [tdnR * Math.cos(tdnCA) * (0.8 + 0.4 * (tdnCT - 0.5)), tdnR * Math.sin(tdnCA) * (0.8 + 0.4 * (tdnCT - 0.5)), tdnCross * spread * 3 - spread * 1.5];
        }
        case 'tunnelChain': {
          // Chain of ring segments forming tunnel
          const tchZ = (t - 0.5) * spread * 3;
          const tchSeg = Math.floor(t * 20);
          const tchTilt = (tchSeg % 2) * 0.3;
          const tchR = spread * 0.35;
          const tchA = theta;
          return [tchR * Math.cos(tchA) + rand * 0.3, tchR * Math.sin(tchA) * Math.cos(tchTilt) + rand * 0.3, tchZ + tchR * Math.sin(tchA) * Math.sin(tchTilt) * 0.1];
        }
        case 'tunnelLattice': {
          // Grid/lattice pattern on tunnel surface
          const tlZ = (t - 0.5) * spread * 3;
          const tlR = spread * 0.4;
          const tlRing = Math.floor(t * 40);
          const tlIsHoriz = i % 3 === 0;
          if (tlIsHoriz) {
            return [tlR * Math.cos(theta) + rand * 0.2, tlR * Math.sin(theta) + rand * 0.2, (tlRing / 40 - 0.5) * spread * 3];
          }
          const tlStripe = Math.floor(theta / (Math.PI * 2) * 12);
          const tlSA = tlStripe / 12 * Math.PI * 2;
          return [tlR * Math.cos(tlSA) + rand * 0.3, tlR * Math.sin(tlSA) + rand * 0.3, tlZ];
        }
        case 'tunnelMesh': {
          // Woven mesh tunnel surface
          const tmZ = (t - 0.5) * spread * 3;
          const tmR = spread * 0.38;
          const tmWoven = Math.sin(theta * 8 + tmZ * 0.3) * spread * 0.04;
          return [(tmR + tmWoven) * Math.cos(theta) + rand * 0.2, (tmR + tmWoven) * Math.sin(theta) + rand * 0.2, tmZ];
        }
        case 'tunnelCage': {
          // Cage bars running length of tunnel + hoops
          const tcgZ = (t - 0.5) * spread * 3;
          const tcgR = spread * 0.4;
          const tcgIsBar = i % 2 === 0;
          if (tcgIsBar) {
            const tcgBar = Math.floor(Math.random() * 16);
            const tcgBA = tcgBar / 16 * Math.PI * 2;
            return [tcgR * Math.cos(tcgBA) + rand * 0.2, tcgR * Math.sin(tcgBA) + rand * 0.2, tcgZ];
          }
          return [tcgR * Math.cos(theta) + rand * 0.2, tcgR * Math.sin(theta) + rand * 0.2, Math.floor(t * 15) / 15 * spread * 3 - spread * 1.5];
        }
        case 'tunnelBranch': {
          // Main tunnel that branches into two
          const tbrZ = (t - 0.5) * spread * 3;
          const tbrR = spread * 0.25;
          if (tbrZ < 0) {
            return [tbrR * Math.cos(theta) + rand * 0.3, tbrR * Math.sin(theta) + rand * 0.3, tbrZ];
          }
          const tbrSide = i % 2 === 0 ? 1 : -1;
          const tbrSpread = tbrZ * 0.15;
          return [tbrSide * tbrSpread + tbrR * 0.8 * Math.cos(theta) + rand * 0.3, tbrR * 0.8 * Math.sin(theta) + rand * 0.3, tbrZ];
        }

        // --- Branching & Merging ---
        case 'tunnelSplit': {
          // Tunnel splits into four
          const tsZ2 = (t - 0.5) * spread * 3;
          const tsR2 = spread * 0.15;
          if (tsZ2 < -spread * 0.3) {
            const tsR3 = spread * 0.3;
            return [tsR3 * Math.cos(theta) + rand * 0.3, tsR3 * Math.sin(theta) + rand * 0.3, tsZ2];
          }
          const tsQuad = i % 4;
          const tsQA = tsQuad / 4 * Math.PI * 2 + Math.PI / 4;
          const tsOff2 = Math.max(0, tsZ2 + spread * 0.3) * 0.3;
          return [Math.cos(tsQA) * tsOff2 + tsR2 * Math.cos(theta) + rand * 0.2, Math.sin(tsQA) * tsOff2 + tsR2 * Math.sin(theta) + rand * 0.2, tsZ2];
        }
        case 'tunnelMerge': {
          // Multiple tunnels merging into one
          const tmgZ = (t - 0.5) * spread * 3;
          const tmgR2 = spread * 0.12;
          if (tmgZ > spread * 0.3) {
            const tmgR3 = spread * 0.35;
            return [tmgR3 * Math.cos(theta) + rand * 0.3, tmgR3 * Math.sin(theta) + rand * 0.3, tmgZ];
          }
          const tmgTube = i % 3;
          const tmgTA = tmgTube / 3 * Math.PI * 2;
          const tmgOff = Math.max(0, spread * 0.3 - tmgZ) * 0.3;
          return [Math.cos(tmgTA) * tmgOff + tmgR2 * Math.cos(theta) + rand * 0.2, Math.sin(tmgTA) * tmgOff + tmgR2 * Math.sin(theta) + rand * 0.2, tmgZ];
        }
        case 'tunnelCross': {
          // Two tunnels crossing through each other
          const txZ = (t - 0.5) * spread * 3;
          const txR = spread * 0.2;
          const txTube = i % 2;
          if (txTube === 0) {
            return [txR * Math.cos(theta) + rand * 0.2, txR * Math.sin(theta) + rand * 0.2, txZ];
          }
          return [txZ * 0.5 + rand * 0.2, txR * Math.cos(theta) + rand * 0.2, txR * Math.sin(theta)];
        }

        // --- Cross-Section Shapes ---
        case 'tunnelStar': {
          // Star-shaped cross-section tunnel
          const tsZ3 = (t - 0.5) * spread * 3;
          const tsPts = 5;
          const tsStarA = theta;
          const tsStarR = spread * 0.35 + Math.cos(tsStarA * tsPts) * spread * 0.12;
          return [tsStarR * Math.cos(tsStarA) + rand * 0.3, tsStarR * Math.sin(tsStarA) + rand * 0.3, tsZ3];
        }
        case 'tunnelHex': {
          // Hexagonal cross-section tunnel
          const thxZ = (t - 0.5) * spread * 3;
          const thxSeg = Math.floor(theta / (Math.PI * 2) * 6);
          const thxA1 = thxSeg / 6 * Math.PI * 2;
          const thxA2 = (thxSeg + 1) / 6 * Math.PI * 2;
          const thxLerp = (theta / (Math.PI * 2) * 6) % 1;
          const thxR = spread * 0.38;
          const thxX = thxR * (Math.cos(thxA1) * (1 - thxLerp) + Math.cos(thxA2) * thxLerp);
          const thxY = thxR * (Math.sin(thxA1) * (1 - thxLerp) + Math.sin(thxA2) * thxLerp);
          return [thxX + rand * 0.3, thxY + rand * 0.3, thxZ];
        }
        case 'tunnelSquare': {
          // Square cross-section tunnel
          const tsqZ = (t - 0.5) * spread * 3;
          const tsqS = spread * 0.35;
          const tsqFace = Math.floor(Math.random() * 4);
          const tsqT2 = Math.random() * 2 - 1;
          const tsqCoords = [[tsqS, tsqT2*tsqS], [-tsqS, tsqT2*tsqS], [tsqT2*tsqS, tsqS], [tsqT2*tsqS, -tsqS]];
          return [tsqCoords[tsqFace][0] + rand * 0.3, tsqCoords[tsqFace][1] + rand * 0.3, tsqZ];
        }
        case 'tunnelTriangle': {
          // Triangular cross-section tunnel
          const ttriZ = (t - 0.5) * spread * 3;
          const ttriV = [[0, spread*0.4], [-spread*0.35, -spread*0.2], [spread*0.35, -spread*0.2]];
          const ttriE = Math.floor(Math.random() * 3);
          const ttriLerp = Math.random();
          const ttriV1 = ttriV[ttriE], ttriV2 = ttriV[(ttriE+1)%3];
          return [ttriV1[0]*(1-ttriLerp)+ttriV2[0]*ttriLerp+rand*0.3, ttriV1[1]*(1-ttriLerp)+ttriV2[1]*ttriLerp+rand*0.3, ttriZ];
        }
        case 'tunnelOctagon': {
          // Octagonal cross-section
          const toZ = (t - 0.5) * spread * 3;
          const toSeg = Math.floor(theta / (Math.PI * 2) * 8);
          const toA1 = toSeg / 8 * Math.PI * 2;
          const toA2 = (toSeg + 1) / 8 * Math.PI * 2;
          const toLerp = (theta / (Math.PI * 2) * 8) % 1;
          const toR = spread * 0.38;
          return [toR * (Math.cos(toA1)*(1-toLerp)+Math.cos(toA2)*toLerp) + rand*0.3, toR * (Math.sin(toA1)*(1-toLerp)+Math.sin(toA2)*toLerp) + rand*0.3, toZ];
        }
        case 'tunnelEllipse': {
          // Elliptical cross-section tunnel
          const teZ = (t - 0.5) * spread * 3;
          const teRX = spread * 0.5;
          const teRY = spread * 0.25;
          return [teRX * Math.cos(theta) + rand * 0.3, teRY * Math.sin(theta) + rand * 0.3, teZ];
        }
        case 'tunnelKeyhole': {
          // Keyhole-shaped cross-section
          const tkZ = (t - 0.5) * spread * 3;
          const tkIsCircle = theta < Math.PI * 1.3 || theta > Math.PI * 1.7;
          if (tkIsCircle) {
            const tkR = spread * 0.3;
            return [tkR * Math.cos(theta) + rand * 0.3, tkR * Math.sin(theta) + spread * 0.1 + rand * 0.3, tkZ];
          }
          const tkSlotY = -spread * 0.1 - Math.random() * spread * 0.25;
          return [(Math.random() - 0.5) * spread * 0.12 + rand * 0.2, tkSlotY, tkZ];
        }

        // --- Complex Topology ---
        case 'tunnelInfinity': {
          // Figure-8 / infinity tunnel
          const tiZ = (t - 0.5) * spread * 3;
          const tiA = tiZ * 0.1;
          const tiScale = spread * 0.25;
          const tiDenom = 1 + Math.sin(tiA) * Math.sin(tiA);
          const tiCX = tiScale * Math.cos(tiA) / tiDenom;
          const tiCY = tiScale * Math.sin(tiA) * Math.cos(tiA) / tiDenom;
          const tiR = spread * 0.15;
          return [tiCX + tiR * Math.cos(theta) + rand * 0.3, tiCY + tiR * Math.sin(theta) + rand * 0.3, tiZ];
        }
        case 'tunnelMobius': {
          // Tunnel with Mobius-strip-like twist
          const tmZ2 = (t - 0.5) * spread * 3;
          const tmTwist = tmZ2 * 0.05;
          const tmR2 = spread * 0.35;
          const tmA = theta + tmTwist;
          const tmFlat = Math.cos(tmA) * tmR2;
          const tmUp = Math.sin(tmA) * tmR2 * Math.cos(tmTwist * 2);
          return [tmFlat + rand * 0.3, tmUp + rand * 0.3, tmZ2];
        }
        case 'tunnelKnot': {
          // Tunnel following a torus knot path
          const tkZ2 = t * Math.PI * 2;
          const tkP = 2, tkQ = 3;
          const tkKR = spread * 0.4, tkKr = spread * 0.08;
          const tkCX = (tkKR + tkKr * Math.cos(tkQ * tkZ2)) * Math.cos(tkP * tkZ2);
          const tkCY = (tkKR + tkKr * Math.cos(tkQ * tkZ2)) * Math.sin(tkP * tkZ2);
          const tkCZ = tkKr * Math.sin(tkQ * tkZ2);
          const tkTubeR = spread * 0.08;
          return [tkCX + tkTubeR * Math.cos(theta) + rand * 0.3, tkCZ + tkTubeR * Math.sin(theta) + rand * 0.3, tkCY + rand * 0.3];
        }
        case 'tunnelTrefoil': {
          // Trefoil knot tunnel
          const ttfT = t * Math.PI * 2;
          const ttfX = Math.sin(ttfT) + 2 * Math.sin(2 * ttfT);
          const ttfY = Math.cos(ttfT) - 2 * Math.cos(2 * ttfT);
          const ttfZ2 = -Math.sin(3 * ttfT);
          const ttfR = spread * 0.06;
          const ttfScale = spread * 0.18;
          return [ttfX * ttfScale + ttfR * Math.cos(theta) + rand * 0.3, ttfY * ttfScale + ttfR * Math.sin(theta) + rand * 0.3, ttfZ2 * ttfScale + rand * 0.3];
        }

        // --- Spiral Tunnels ---
        case 'tunnelSpring': {
          // Tight spring/coil tunnel
          const tspZ2 = (t - 0.5) * spread * 2;
          const tspCoilA = t * Math.PI * 16;
          const tspCoilR = spread * 0.35;
          const tspCX = tspCoilR * Math.cos(tspCoilA);
          const tspCY = tspCoilR * Math.sin(tspCoilA);
          const tspTR = spread * 0.1;
          return [tspCX + tspTR * Math.cos(theta) + rand * 0.3, tspCY + tspTR * Math.sin(theta) + rand * 0.3, tspZ2];
        }
        case 'tunnelCorkscrew': {
          // Expanding corkscrew tunnel
          const tcsZ = (t - 0.5) * spread * 3;
          const tcsA = t * Math.PI * 12;
          const tcsCoilR = spread * 0.1 + t * spread * 0.3;
          const tcsCX = tcsCoilR * Math.cos(tcsA);
          const tcsCY = tcsCoilR * Math.sin(tcsA);
          const tcsR = spread * 0.08;
          return [tcsCX + tcsR * Math.cos(theta) + rand * 0.3, tcsCY + tcsR * Math.sin(theta) + rand * 0.3, tcsZ];
        }
        case 'tunnelBarber': {
          // Multiple spiral stripes on tunnel wall
          const tbbZ = (t - 0.5) * spread * 3;
          const tbbStripe = i % 5;
          const tbbA = theta + tbbZ * 0.15 + tbbStripe / 5 * Math.PI * 2;
          const tbbR = spread * 0.4;
          return [tbbR * Math.cos(tbbA) + rand * 0.3, tbbR * Math.sin(tbbA) + rand * 0.3, tbbZ];
        }
        case 'tunnelDrill': {
          // Drill-bit spiral tunnel with sharp edges
          const tdZ2 = (t - 0.5) * spread * 3;
          const tdFlute = i % 2;
          const tdA = theta + tdZ2 * 0.2 + tdFlute * Math.PI;
          const tdR = spread * 0.35 + (tdFlute === 0 ? Math.max(0, Math.cos(tdA * 2)) * spread * 0.1 : 0);
          return [tdR * Math.cos(tdA) + rand * 0.3, tdR * Math.sin(tdA) + rand * 0.3, tdZ2];
        }
        case 'tunnelTornado': {
          // Tunnel that narrows to a point like a funnel
          const ttdZ = (t - 0.5) * spread * 3;
          const ttdR = spread * 0.5 * (1 - t * 0.7);
          const ttdA = theta + ttdZ * 0.2;
          return [ttdR * Math.cos(ttdA) + rand * 0.3, ttdR * Math.sin(ttdA) + rand * 0.3, ttdZ];
        }
        case 'tunnelWhirlpool': {
          // Tunnel with particles spiraling inward
          const twpZ = (t - 0.5) * spread * 3;
          const twpA = theta + Math.pow(Math.abs(twpZ) * 0.02, 1.5) * Math.sign(twpZ);
          const twpR = spread * 0.4 - Math.abs(Math.sin(twpZ * 0.15)) * spread * 0.15;
          return [twpR * Math.cos(twpA) + rand * 0.3, twpR * Math.sin(twpA) + rand * 0.3, twpZ];
        }

        // --- Sci-Fi / Space ---
        case 'tunnelWormhole': {
          // Wormhole — tunnel that pinches in the middle
          const twZ = (t - 0.5) * spread * 3;
          const twNorm = twZ / (spread * 1.5);
          const twR = spread * 0.15 + spread * 0.3 * twNorm * twNorm;
          const twA = theta + twZ * 0.08;
          return [twR * Math.cos(twA) + rand * 0.3, twR * Math.sin(twA) + rand * 0.3, twZ];
        }
        case 'tunnelBlackhole': {
          // Tunnel collapsing toward an event horizon center
          const tbhZ = (t - 0.5) * spread * 3;
          const tbhR = spread * 0.45 * Math.pow(Math.abs(t - 0.5) * 2, 0.5);
          const tbhA = theta + 3.0 / (Math.abs(t - 0.5) + 0.1);
          return [tbhR * Math.cos(tbhA) + rand * 0.3, tbhR * Math.sin(tbhA) + rand * 0.3, tbhZ];
        }
        case 'tunnelHyper': {
          // Hyperspace tunnel — accelerating rings
          const thyZ = Math.pow(t, 2) * spread * 3 - spread * 1.5;
          const thyR = spread * 0.3 + t * spread * 0.15;
          const thyA = theta + t * Math.PI * 2;
          return [thyR * Math.cos(thyA) + rand * 0.3, thyR * Math.sin(thyA) + rand * 0.3, thyZ];
        }
        case 'tunnelWarp': {
          // Warp drive distortion — stretched tunnel
          const twpZ2 = (t - 0.5) * spread * 3;
          const twpDist = Math.abs(twpZ2) / (spread * 1.5);
          const twpR2 = spread * 0.3 * (1 + Math.sin(twpDist * Math.PI) * 0.4);
          const twpStretch = 1 + (1 - twpDist) * 0.5;
          return [twpR2 * Math.cos(theta) * twpStretch + rand * 0.3, twpR2 * Math.sin(theta) + rand * 0.3, twpZ2];
        }
        case 'tunnelGlitch': {
          // Glitchy tunnel with displaced segments
          const tgZ = (t - 0.5) * spread * 3;
          const tgSeg = Math.floor(t * 25);
          const tgR = spread * 0.35;
          const tgGlitch = Math.sin(tgSeg * 17.3) * spread * 0.08;
          const tgGlitchY = Math.cos(tgSeg * 23.7) * spread * 0.08;
          return [tgGlitch + tgR * Math.cos(theta) + rand * 0.3, tgGlitchY + tgR * Math.sin(theta) + rand * 0.3, tgZ];
        }
        case 'tunnelShatter': {
          // Tunnel with fractured/shattered wall segments
          const tshZ = (t - 0.5) * spread * 3;
          const tshR = spread * 0.38;
          const tshSeg = Math.floor(theta / (Math.PI * 2) * 12);
          const tshOff = Math.sin(tshSeg * 7.1 + Math.floor(t * 20) * 3.7) * spread * 0.06;
          return [(tshR + tshOff) * Math.cos(theta) + rand * 0.3, (tshR + tshOff) * Math.sin(theta) + rand * 0.3, tshZ + tshOff * 0.5];
        }
        case 'tunnelCrystal': {
          // Crystalline faceted tunnel
          const tcryZ = (t - 0.5) * spread * 3;
          const tcrySeg = Math.floor(t * 15);
          const tcryFaces = 6 + (tcrySeg % 3);
          const tcryFace = Math.floor(theta / (Math.PI * 2) * tcryFaces);
          const tcryA = (tcryFace + 0.5) / tcryFaces * Math.PI * 2;
          const tcryR = spread * 0.38;
          return [tcryR * Math.cos(tcryA) + rand * 0.5, tcryR * Math.sin(tcryA) + rand * 0.5, tcryZ];
        }
        case 'tunnelFractal': {
          // Self-similar branching tunnel
          const tfZ = (t - 0.5) * spread * 3;
          const tfLevel = Math.floor(t * 4);
          const tfBranch = Math.floor(Math.random() * Math.pow(2, tfLevel));
          const tfBA = tfBranch / Math.pow(2, tfLevel) * Math.PI * 2;
          const tfOff = tfLevel * spread * 0.08;
          const tfR = spread * 0.3 / (1 + tfLevel * 0.3);
          return [Math.cos(tfBA) * tfOff + tfR * Math.cos(theta) + rand * 0.3, Math.sin(tfBA) * tfOff + tfR * Math.sin(theta) + rand * 0.3, tfZ];
        }
        case 'tunnelFern': {
          // Fern-frond spiral tunnel with offshoots
          const tfnZ = (t - 0.5) * spread * 3;
          const tfnA = tfnZ * 0.12;
          const tfnCX = Math.cos(tfnA) * spread * 0.12;
          const tfnCY = Math.sin(tfnA) * spread * 0.12;
          const tfnR = spread * 0.3 + Math.sin(tfnZ * 0.5) * spread * 0.08;
          const tfnFrond = Math.sin(theta * 5 + tfnZ * 0.2) * spread * 0.04;
          return [tfnCX + (tfnR + tfnFrond) * Math.cos(theta) + rand * 0.3, tfnCY + (tfnR + tfnFrond) * Math.sin(theta) + rand * 0.3, tfnZ];
        }
        case 'tunnelCoral': {
          // Organic coral-like tunnel with bumpy walls
          const tcoZ = (t - 0.5) * spread * 3;
          const tcoR = spread * 0.35;
          const tcoBump = Math.sin(theta * 7 + tcoZ * 0.3) * spread * 0.05 + Math.sin(theta * 13 + tcoZ * 0.7) * spread * 0.03;
          return [(tcoR + tcoBump) * Math.cos(theta) + rand * 0.3, (tcoR + tcoBump) * Math.sin(theta) + rand * 0.3, tcoZ];
        }

        // --- Organic / Bio ---
        case 'tunnelOrgan': {
          // Organ pipe — multiple parallel tunnels of varying size
          const topZ = (t - 0.5) * spread * 3;
          const topPipe = Math.floor(Math.random() * 7);
          const topPA = topPipe / 7 * Math.PI * 2;
          const topOff = spread * 0.25;
          const topR = spread * (0.06 + topPipe * 0.015);
          return [Math.cos(topPA) * topOff + topR * Math.cos(theta) + rand * 0.2, Math.sin(topPA) * topOff + topR * Math.sin(theta) + rand * 0.2, topZ];
        }
        case 'tunnelVein': {
          // Organic vein — tunnel that branches and narrows
          const tvnZ = (t - 0.5) * spread * 3;
          const tvnA = tvnZ * 0.08;
          const tvnCX = Math.sin(tvnA) * spread * 0.15 + Math.sin(tvnA * 2.3) * spread * 0.08;
          const tvnCY = Math.cos(tvnA * 1.7) * spread * 0.1;
          const tvnR = spread * 0.25 + Math.sin(tvnZ * 0.4) * spread * 0.08;
          return [tvnCX + tvnR * Math.cos(theta) + rand * 0.5, tvnCY + tvnR * Math.sin(theta) + rand * 0.5, tvnZ];
        }
        case 'tunnelNeural': {
          // Neural pathway — tunnel with synaptic bulges
          const tnnZ = (t - 0.5) * spread * 3;
          const tnnBulge = Math.exp(-Math.pow((t * 8) % 1 - 0.5, 2) * 20) * spread * 0.15;
          const tnnR = spread * 0.2 + tnnBulge;
          const tnnA = theta + tnnZ * 0.05;
          return [tnnR * Math.cos(tnnA) + rand * 0.3, tnnR * Math.sin(tnnA) + rand * 0.3, tnnZ];
        }
        case 'tunnelSynapse': {
          // Two tunnel bulbs connected by a narrow passage
          const tsyZ = (t - 0.5) * spread * 3;
          const tsyNorm = t;
          const tsyR = spread * (0.15 + 0.25 * (Math.exp(-Math.pow(tsyNorm - 0.2, 2) * 30) + Math.exp(-Math.pow(tsyNorm - 0.8, 2) * 30)));
          return [tsyR * Math.cos(theta) + rand * 0.3, tsyR * Math.sin(theta) + rand * 0.3, tsyZ];
        }
        case 'tunnelSpine': {
          // Vertebral column tunnel — segmented with disc gaps
          const tspnZ = (t - 0.5) * spread * 3;
          const tspnSeg = (t * 20) % 1;
          const tspnR = spread * 0.3 + Math.sin(tspnSeg * Math.PI) * spread * 0.08;
          const tspnWobble = Math.sin(tspnZ * 0.1) * spread * 0.05;
          return [tspnWobble + tspnR * Math.cos(theta) + rand * 0.3, tspnR * Math.sin(theta) + rand * 0.3, tspnZ];
        }
        case 'tunnelRibcage': {
          // Ribcage tunnel with periodic curved ribs
          const trcZ = (t - 0.5) * spread * 3;
          const trcIsRib = i % 3 === 0;
          if (trcIsRib) {
            const trcRib = Math.floor(t * 12);
            const trcRibZ = (trcRib / 12 - 0.5) * spread * 3;
            const trcR = spread * 0.4 * Math.sin(theta * 0.5 + Math.PI * 0.25);
            return [trcR * Math.cos(theta) + rand * 0.3, trcR * Math.sin(theta) + rand * 0.3, trcRibZ + rand * 0.5];
          }
          const trcSpineR = spread * 0.05;
          return [trcSpineR * Math.cos(theta) + rand * 0.2, spread * 0.35 + trcSpineR * Math.sin(theta) + rand * 0.2, trcZ];
        }
        case 'tunnelHeart': {
          // Heart-shaped cross-section tunnel
          const thrtZ = (t - 0.5) * spread * 3;
          const thrtA = theta;
          const thrtR = spread * 0.025 * (16 * Math.pow(Math.sin(thrtA), 3));
          const thrtRY = spread * 0.025 * (13 * Math.cos(thrtA) - 5 * Math.cos(2*thrtA) - 2 * Math.cos(3*thrtA) - Math.cos(4*thrtA));
          return [thrtR + rand * 0.5, thrtRY + rand * 0.5, thrtZ];
        }
        case 'tunnelPulsar': {
          // Tunnel with pulsing rings of energy
          const tplZ = (t - 0.5) * spread * 3;
          const tplPulse = Math.exp(-Math.pow((t * 6) % 1 - 0.5, 2) * 15);
          const tplR = spread * 0.3 + tplPulse * spread * 0.15;
          return [tplR * Math.cos(theta) + rand * 0.3, tplR * Math.sin(theta) + rand * 0.3, tplZ];
        }
        case 'tunnelNebula': {
          // Nebula gas tunnel — wispy, multiple layers
          const tnbZ = (t - 0.5) * spread * 3;
          const tnbLayer = Math.floor(Math.random() * 3);
          const tnbR = spread * (0.25 + tnbLayer * 0.08);
          const tnbDrift = Math.sin(tnbZ * 0.15 + tnbLayer * 2) * spread * 0.08;
          return [tnbDrift + tnbR * Math.cos(theta) + rand * 2, tnbR * Math.sin(theta) + rand * 2, tnbZ];
        }
        case 'tunnelAurora': {
          // Aurora borealis tunnel — wavy curtain walls
          const tauZ = (t - 0.5) * spread * 3;
          const tauR = spread * 0.35;
          const tauCurtain = Math.sin(theta * 3 + tauZ * 0.15) * spread * 0.1;
          const tauY = Math.sin(tauZ * 0.2 + theta * 2) * spread * 0.05;
          return [(tauR + tauCurtain) * Math.cos(theta) + rand * 0.5, (tauR + tauCurtain) * Math.sin(theta) + tauY + rand * 0.5, tauZ];
        }

        // --- Elemental ---
        case 'tunnelLava': {
          // Lava tube tunnel — irregular, bulging
          const tlvZ = (t - 0.5) * spread * 3;
          const tlvR = spread * 0.35 + Math.sin(theta * 3 + tlvZ * 0.2) * spread * 0.06 + Math.sin(theta * 7 + tlvZ * 0.5) * spread * 0.04;
          const tlvDrip = Math.max(0, Math.sin(theta * 5 + tlvZ * 0.3) - 0.7) * spread * 0.15;
          return [tlvR * Math.cos(theta) + rand * 0.3, tlvR * Math.sin(theta) - tlvDrip + rand * 0.3, tlvZ];
        }
        case 'tunnelIce': {
          // Ice crystal tunnel — sharp facets with frost
          const tiZ2 = (t - 0.5) * spread * 3;
          const tiFacets = 12;
          const tiFacet = Math.floor(theta / (Math.PI * 2) * tiFacets);
          const tiFA = (tiFacet + 0.5) / tiFacets * Math.PI * 2;
          const tiR = spread * 0.38 + Math.sin(tiFacet * 5 + Math.floor(t * 20) * 3) * spread * 0.04;
          return [tiR * Math.cos(tiFA) + rand * 0.5, tiR * Math.sin(tiFA) + rand * 0.5, tiZ2];
        }
        case 'tunnelWater': {
          // Water pipe — smooth with ripple distortions
          const twtrZ = (t - 0.5) * spread * 3;
          const twtrR = spread * 0.35;
          const twtrRipple = Math.sin(theta * 6 + twtrZ * 0.4) * spread * 0.02 + Math.sin(theta * 2 - twtrZ * 0.2) * spread * 0.03;
          return [(twtrR + twtrRipple) * Math.cos(theta) + rand * 0.3, (twtrR + twtrRipple) * Math.sin(theta) + rand * 0.3, twtrZ];
        }
        case 'tunnelFire': {
          // Fire tunnel — flickering outward expansions
          const tfZ2 = (t - 0.5) * spread * 3;
          const tfR2 = spread * 0.3;
          const tfFlicker = Math.abs(Math.sin(theta * 5 + tfZ2 * 0.3 + i * 0.01)) * spread * 0.12;
          const tfUp = Math.max(0, Math.sin(theta)) * spread * 0.05;
          return [(tfR2 + tfFlicker) * Math.cos(theta) + rand * 0.5, (tfR2 + tfFlicker) * Math.sin(theta) + tfUp + rand * 0.5, tfZ2];
        }
        case 'tunnelSmoke': {
          // Smoke tunnel — drifting, dissipating walls
          const tsmZ = (t - 0.5) * spread * 3;
          const tsmR = spread * 0.35 + Math.sin(tsmZ * 0.1 + theta * 2) * spread * 0.08;
          const tsmDrift = Math.sin(tsmZ * 0.05) * spread * 0.1;
          return [tsmDrift + tsmR * Math.cos(theta) + rand * 1.5, tsmR * Math.sin(theta) + rand * 1.5, tsmZ];
        }
        case 'tunnelCloud': {
          // Cloud tunnel — puffy, layered
          const tclZ = (t - 0.5) * spread * 3;
          const tclR = spread * 0.35;
          const tclPuff = Math.abs(Math.sin(theta * 4 + tclZ * 0.2)) * spread * 0.1 + Math.abs(Math.sin(theta * 7 + tclZ * 0.5)) * spread * 0.05;
          return [(tclR + tclPuff) * Math.cos(theta) + rand * 1, (tclR + tclPuff) * Math.sin(theta) + rand * 1, tclZ];
        }
        case 'tunnelLightning': {
          // Lightning bolt tunnel — jagged path
          const tlgZ = (t - 0.5) * spread * 3;
          const tlgSeg = Math.floor(t * 30);
          const tlgJagX = Math.sin(tlgSeg * 7.3) * spread * 0.12;
          const tlgJagY = Math.cos(tlgSeg * 11.7) * spread * 0.12;
          const tlgR = spread * 0.25;
          return [tlgJagX + tlgR * Math.cos(theta) + rand * 0.5, tlgJagY + tlgR * Math.sin(theta) + rand * 0.5, tlgZ];
        }
        case 'tunnelRain': {
          // Rain streaks forming tunnel walls
          const trnZ = (t - 0.5) * spread * 3;
          const trnStream = Math.floor(theta / (Math.PI * 2) * 24);
          const trnSA = trnStream / 24 * Math.PI * 2;
          const trnR = spread * 0.4;
          const trnDrip = Math.sin(trnZ * 0.5 + trnStream) * spread * 0.02;
          return [trnR * Math.cos(trnSA) + trnDrip + rand * 0.3, trnR * Math.sin(trnSA) + trnDrip + rand * 0.3, trnZ];
        }
        case 'tunnelSnow': {
          // Snowflake-patterned tunnel wall
          const tsnZ = (t - 0.5) * spread * 3;
          const tsnR = spread * 0.38;
          const tsnCrystal = Math.cos(theta * 6) * spread * 0.05;
          return [(tsnR + tsnCrystal) * Math.cos(theta) + rand * 0.5, (tsnR + tsnCrystal) * Math.sin(theta) + rand * 0.5, tsnZ];
        }
        case 'tunnelSand': {
          // Sandy/gritty tunnel with dune-like undulations
          const tsndZ = (t - 0.5) * spread * 3;
          const tsndR = spread * 0.38 + Math.sin(tsndZ * 0.25 + theta * 3) * spread * 0.05;
          return [tsndR * Math.cos(theta) + rand * 0.8, tsndR * Math.sin(theta) + rand * 0.8, tsndZ];
        }

        // --- Natural / Botanical ---
        case 'tunnelBamboo': {
          // Bamboo-segment tunnel with nodes
          const tbmZ = (t - 0.5) * spread * 3;
          const tbmSeg = (t * 10) % 1;
          const tbmNode = tbmSeg < 0.1 || tbmSeg > 0.9;
          const tbmR = spread * (tbmNode ? 0.42 : 0.35);
          return [tbmR * Math.cos(theta) + rand * 0.3, tbmR * Math.sin(theta) + rand * 0.3, tbmZ];
        }
        case 'tunnelVine': {
          // Tunnel with vine-like spiral growth on walls
          const tvnZ2 = (t - 0.5) * spread * 3;
          const tvnR2 = spread * 0.38;
          const tvnVine = Math.sin(theta * 3 + tvnZ2 * 0.2) > 0.5 ? spread * 0.05 : 0;
          return [(tvnR2 + tvnVine) * Math.cos(theta) + rand * 0.3, (tvnR2 + tvnVine) * Math.sin(theta) + rand * 0.3, tvnZ2];
        }
        case 'tunnelRoot': {
          // Root system tunnel — asymmetric, organic
          const trtZ = (t - 0.5) * spread * 3;
          const trtCX = Math.sin(trtZ * 0.08) * spread * 0.1;
          const trtCY = Math.cos(trtZ * 0.06) * spread * 0.08;
          const trtR = spread * 0.3 + Math.sin(theta * 5 + trtZ * 0.15) * spread * 0.06;
          return [trtCX + trtR * Math.cos(theta) + rand * 0.5, trtCY + trtR * Math.sin(theta) + rand * 0.5, trtZ];
        }
        case 'tunnelBark': {
          // Tree bark tunnel — rough ridged surface
          const tbkZ = (t - 0.5) * spread * 3;
          const tbkR = spread * 0.38;
          const tbkRidge = Math.floor(theta / (Math.PI * 2) * 20);
          const tbkDepth = Math.sin(tbkRidge * 3.7 + tbkZ * 0.1) * spread * 0.04;
          return [(tbkR + tbkDepth) * Math.cos(theta) + rand * 0.3, (tbkR + tbkDepth) * Math.sin(theta) + rand * 0.3, tbkZ];
        }
        case 'tunnelShell': {
          // Nautilus shell spiral tunnel
          const tshZ2 = t * Math.PI * 4;
          const tshR2 = spread * 0.04 * Math.exp(tshZ2 * 0.15);
          const tshCX = tshR2 * Math.cos(tshZ2);
          const tshCZ = tshR2 * Math.sin(tshZ2);
          const tshTR = spread * 0.03 * (1 + tshZ2 * 0.1);
          return [tshCX + tshTR * Math.cos(theta) + rand * 0.3, tshTR * Math.sin(theta) + rand * 0.3, tshCZ + rand * 0.3];
        }
        case 'tunnelNautilus': {
          // Logarithmic spiral tunnel expanding outward
          const tnuA = t * Math.PI * 6;
          const tnuR = spread * 0.05 * Math.exp(tnuA * 0.1);
          const tnuTR = spread * 0.02 + tnuA * spread * 0.008;
          return [tnuR * Math.cos(tnuA) + tnuTR * Math.cos(theta) + rand * 0.3, tnuTR * Math.sin(theta) + rand * 0.3, tnuR * Math.sin(tnuA) + rand * 0.3];
        }
        case 'tunnelJelly': {
          // Jellyfish bell tunnel — dome that undulates
          const tjZ = (t - 0.5) * spread * 3;
          const tjR = spread * 0.35 * Math.sin(t * Math.PI);
          const tjUndulate = Math.sin(theta * 8 + tjZ * 0.3) * spread * 0.03;
          return [(tjR + tjUndulate) * Math.cos(theta) + rand * 0.3, (tjR + tjUndulate) * Math.sin(theta) + rand * 0.3, tjZ];
        }
        case 'tunnelTentacle': {
          // Multiple tentacle tunnels radiating out
          const ttntZ = (t - 0.5) * spread * 3;
          const ttntArm = Math.floor(Math.random() * 6);
          const ttntBA = ttntArm / 6 * Math.PI * 2;
          const ttntSpread = Math.max(0, t - 0.3) * 0.5;
          const ttntOff = ttntSpread * spread;
          const ttntR = spread * 0.1 * (1 - ttntSpread * 0.5);
          const ttntWave = Math.sin(ttntZ * 0.3 + ttntArm * 2) * spread * 0.03;
          return [Math.cos(ttntBA) * ttntOff + ttntR * Math.cos(theta) + ttntWave + rand * 0.3, Math.sin(ttntBA) * ttntOff + ttntR * Math.sin(theta) + rand * 0.3, ttntZ];
        }
        case 'tunnelSerpent': {
          // Snake-like S-curve tunnel
          const tsrZ = (t - 0.5) * spread * 3;
          const tsrCX = Math.sin(tsrZ * 0.15) * spread * 0.25;
          const tsrCY = Math.sin(tsrZ * 0.1 + Math.PI * 0.5) * spread * 0.15;
          const tsrR = spread * 0.25;
          return [tsrCX + tsrR * Math.cos(theta) + rand * 0.3, tsrCY + tsrR * Math.sin(theta) + rand * 0.3, tsrZ];
        }
        case 'tunnelDragon': {
          // Dragon throat tunnel — scaled, undulating, fiery
          const tdrZ = (t - 0.5) * spread * 3;
          const tdrR = spread * 0.3 + Math.sin(tdrZ * 0.2) * spread * 0.1;
          const tdrScale = Math.sin(theta * 12 + tdrZ * 0.3) * spread * 0.03;
          const tdrA = theta + tdrZ * 0.05;
          return [(tdrR + tdrScale) * Math.cos(tdrA) + rand * 0.3, (tdrR + tdrScale) * Math.sin(tdrA) + rand * 0.3, tdrZ];
        }

        // --- Water / Fluid ---
        case 'tunnelRipple': {
          // Tunnel with concentric ripples along walls
          const trpZ = (t - 0.5) * spread * 3;
          const trpR = spread * 0.35 + Math.sin(trpZ * 0.6) * spread * 0.04 + Math.sin(trpZ * 1.2) * spread * 0.02;
          return [trpR * Math.cos(theta) + rand * 0.3, trpR * Math.sin(theta) + rand * 0.3, trpZ];
        }
        case 'tunnelTide': {
          // Tidal tunnel — radius oscillates with depth
          const ttdZ2 = (t - 0.5) * spread * 3;
          const ttdR2 = spread * 0.3 + Math.sin(t * Math.PI * 2) * spread * 0.15;
          const ttdWash = Math.sin(theta + ttdZ2 * 0.1) * spread * 0.03;
          return [(ttdR2 + ttdWash) * Math.cos(theta) + rand * 0.3, (ttdR2 + ttdWash) * Math.sin(theta) + rand * 0.3, ttdZ2];
        }
        case 'tunnelCascade': {
          // Cascading waterfall rings
          const tcscZ = (t - 0.5) * spread * 3;
          const tcscRing = (t * 12) % 1;
          const tcscR = spread * 0.25 + tcscRing * spread * 0.15;
          const tcscDrop = Math.pow(tcscRing, 2) * spread * 0.05;
          return [tcscR * Math.cos(theta) + rand * 0.3, tcscR * Math.sin(theta) - tcscDrop + rand * 0.3, tcscZ];
        }
        case 'tunnelFall': {
          // Waterfall tunnel — vertical descent with spray
          const tflZ = (t - 0.5) * spread * 3;
          const tflR = spread * 0.35 + (1 - t) * spread * 0.1;
          const tflSpray = Math.random() < 0.2 ? rand * spread * 0.05 : 0;
          return [tflR * Math.cos(theta) + tflSpray + rand * 0.3, tflR * Math.sin(theta) + tflSpray + rand * 0.3, tflZ];
        }
        case 'tunnelGeyser': {
          // Geyser tunnel — narrow at bottom, erupting wide at top
          const tgZ2 = (t - 0.5) * spread * 3;
          const tgR2 = spread * 0.1 + Math.pow(t, 2) * spread * 0.4;
          const tgErupt = t > 0.8 ? (t - 0.8) * spread * 0.3 : 0;
          return [(tgR2 + tgErupt) * Math.cos(theta) + rand * 0.5, (tgR2 + tgErupt) * Math.sin(theta) + rand * 0.5, tgZ2];
        }
        case 'tunnelBubble': {
          // Bubble-chain tunnel — spherical segments
          const tbuZ = (t - 0.5) * spread * 3;
          const tbuSeg = Math.floor(t * 8);
          const tbuLocal = (t * 8) % 1;
          const tbuR = spread * 0.35 * Math.sin(tbuLocal * Math.PI);
          const tbuSegZ = (tbuSeg / 8 - 0.5) * spread * 3;
          return [tbuR * Math.cos(theta) + rand * 0.3, tbuR * Math.sin(theta) + rand * 0.3, tbuSegZ + (tbuLocal - 0.5) * spread * 0.35];
        }
        case 'tunnelFoam': {
          // Foam texture tunnel — many small bubbles on wall
          const tfoZ = (t - 0.5) * spread * 3;
          const tfoR = spread * 0.38;
          const tfoBubble = Math.sin(theta * 11 + tfoZ * 0.5) * Math.sin(theta * 7 - tfoZ * 0.3) * spread * 0.05;
          return [(tfoR + Math.abs(tfoBubble)) * Math.cos(theta) + rand * 0.3, (tfoR + Math.abs(tfoBubble)) * Math.sin(theta) + rand * 0.3, tfoZ];
        }

        // --- Material / Abstract ---
        case 'tunnelSilk': {
          // Silk ribbon tunnel — smooth flowing curves
          const tslZ = (t - 0.5) * spread * 3;
          const tslR = spread * 0.35;
          const tslWave = Math.sin(theta * 2 + tslZ * 0.1) * spread * 0.08;
          const tslA = theta + Math.sin(tslZ * 0.05) * 0.3;
          return [(tslR + tslWave) * Math.cos(tslA) + rand * 0.2, (tslR + tslWave) * Math.sin(tslA) + rand * 0.2, tslZ];
        }
        case 'tunnelChrome': {
          // Chrome pipe — smooth with reflection-like distortion
          const tchZ = (t - 0.5) * spread * 3;
          const tchR = spread * 0.38;
          const tchDistort = Math.sin(theta * 4 + tchZ * 0.15) * spread * 0.02;
          return [(tchR + tchDistort) * Math.cos(theta) + rand * 0.15, (tchR + tchDistort) * Math.sin(theta) + rand * 0.15, tchZ];
        }
        case 'tunnelNeon': {
          // Neon ring tunnel — distinct glowing rings
          const tneZ = (t - 0.5) * spread * 3;
          const tneRing = Math.floor(t * 30);
          const tneRingZ = (tneRing / 30 - 0.5) * spread * 3;
          const tneR = spread * 0.35 + Math.sin(tneRing * 0.7) * spread * 0.05;
          return [tneR * Math.cos(theta) + rand * 0.2, tneR * Math.sin(theta) + rand * 0.2, tneRingZ + rand * 0.3];
        }
        case 'tunnelPrism': {
          // Prism-like tunnel — triangular that rotates
          const tprZ = (t - 0.5) * spread * 3;
          const tprTwist = tprZ * 0.08;
          const tprA = theta + tprTwist;
          const tprSeg = Math.floor(tprA / (Math.PI * 2) * 3);
          const tprSA = (tprSeg + 0.5) / 3 * Math.PI * 2;
          const tprR = spread * 0.4;
          return [tprR * Math.cos(tprSA) + rand * 0.5, tprR * Math.sin(tprSA) + rand * 0.5, tprZ];
        }
        case 'tunnelKaleidoscope': {
          // Kaleidoscope tunnel — mirrored segments
          const tkZ3 = (t - 0.5) * spread * 3;
          const tkSegs = 8;
          const tkSegA = Math.floor(theta / (Math.PI * 2) * tkSegs);
          const tkMirrorA = tkSegA / tkSegs * Math.PI * 2;
          const tkR2 = spread * 0.35 + Math.sin(tkMirrorA * tkSegs + tkZ3 * 0.2) * spread * 0.08;
          return [tkR2 * Math.cos(tkMirrorA + theta * 0.1) + rand * 0.3, tkR2 * Math.sin(tkMirrorA + theta * 0.1) + rand * 0.3, tkZ3];
        }
        case 'tunnelMandala': {
          // Mandala pattern tunnel — concentric ring patterns
          const tmdZ = (t - 0.5) * spread * 3;
          const tmdR = spread * 0.38;
          const tmdPattern = Math.sin(theta * 6) * Math.sin(theta * 4 + tmdZ * 0.1) * spread * 0.05;
          return [(tmdR + tmdPattern) * Math.cos(theta) + rand * 0.3, (tmdR + tmdPattern) * Math.sin(theta) + rand * 0.3, tmdZ];
        }
        case 'tunnelSacred': {
          // Sacred geometry tunnel — flower of life pattern
          const tsgZ = (t - 0.5) * spread * 3;
          const tsgR = spread * 0.38;
          const tsgFlower = (Math.sin(theta * 6) + Math.sin(theta * 6 + Math.PI/3)) * spread * 0.04;
          return [(tsgR + tsgFlower) * Math.cos(theta) + rand * 0.3, (tsgR + tsgFlower) * Math.sin(theta) + rand * 0.3, tsgZ];
        }
        case 'tunnelZen': {
          // Zen garden tunnel — minimal, smooth concentric rings
          const tzZ = (t - 0.5) * spread * 3;
          const tzRing = Math.floor(t * 20);
          const tzR = spread * 0.35 + (tzRing % 2) * spread * 0.03;
          return [tzR * Math.cos(theta) + rand * 0.15, tzR * Math.sin(theta) + rand * 0.15, (tzRing / 20 - 0.5) * spread * 3];
        }
        case 'tunnelChaos': {
          // Chaotic tunnel — wildly varying radius and center
          const tczZ = (t - 0.5) * spread * 3;
          const tczSeg = Math.floor(t * 30);
          const tczR = spread * 0.2 + Math.abs(Math.sin(tczSeg * 5.7)) * spread * 0.25;
          const tczOX = Math.sin(tczSeg * 3.3) * spread * 0.15;
          const tczOY = Math.cos(tczSeg * 7.1) * spread * 0.15;
          return [tczOX + tczR * Math.cos(theta) + rand * 0.5, tczOY + tczR * Math.sin(theta) + rand * 0.5, tczZ];
        }
        case 'tunnelOrder': {
          // Perfectly ordered tunnel — precise ring spacing
          const torZ = (t - 0.5) * spread * 3;
          const torRing = Math.floor(t * 40);
          const torR = spread * 0.38;
          return [torR * Math.cos(theta), torR * Math.sin(theta), (torRing / 40 - 0.5) * spread * 3];
        }
        case 'tunnelPulseRing': {
          // Rings that pulse outward like sonar
          const tprZ2 = (t - 0.5) * spread * 3;
          const tprRing = Math.floor(t * 15);
          const tprPhase = (t * 15) % 1;
          const tprR2 = spread * 0.2 + tprPhase * spread * 0.25;
          return [tprR2 * Math.cos(theta) + rand * 0.3, tprR2 * Math.sin(theta) + rand * 0.3, (tprRing / 15 - 0.5) * spread * 3];
        }
        case 'tunnelEcho': {
          // Echo tunnel — repeated diminishing rings
          const tecZ = (t - 0.5) * spread * 3;
          const tecEcho = Math.floor(t * 10);
          const tecDecay = 1 - tecEcho * 0.08;
          const tecR = spread * 0.4 * tecDecay;
          return [tecR * Math.cos(theta) + rand * 0.3, tecR * Math.sin(theta) + rand * 0.3, tecZ];
        }
        case 'tunnelPhantom': {
          // Phantom tunnel — fading in and out of existence
          const tphZ = (t - 0.5) * spread * 3;
          const tphR = spread * 0.38;
          const tphFade = Math.sin(t * Math.PI * 4) > 0;
          if (tphFade) {
            return [tphR * Math.cos(theta) + rand * 0.3, tphR * Math.sin(theta) + rand * 0.3, tphZ];
          }
          // Scatter particles when tunnel "fades"
          const tphScatter = spread * 0.5;
          return [(Math.random()-0.5)*tphScatter + rand, (Math.random()-0.5)*tphScatter + rand, tphZ];
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
        uSizeMultiplier: { value: 1.0 },
        uPull: { value: 0.0 },
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
      // Don't add to scene — replaced by ring sparks
    }

    _updateConnections() {
      const pArr = this.particles.geometry.attributes.position.array;
      const count = this.particleCount;
      const threshold = this.connectionThreshold;
      const threshSq = threshold * threshold;
      // Skip particles too close to center — connections only in the outer ring
      const minRadiusSq = 6 * 6; // particles must be at least 6 units from origin

      const lPos = this.lines.geometry.attributes.position.array;
      const lCol = this.lines.geometry.attributes.color.array;

      const I = this._intensity;
      const col = this._currentColor;
      const bc = this._beatColor;
      const beatMix = this._beatFlash * 0.4 * I;
      const r = col[0] * (1 - beatMix) + bc[0] * beatMix;
      const g = col[1] * (1 - beatMix) + bc[1] * beatMix;
      const b = col[2] * (1 - beatMix) + bc[2] * beatMix;

      let segCount = 0;
      const max = this.maxConnections;
      const step = this.isMobile ? 8 : 4;

      for (let i = 0; i < count && segCount < max; i += step) {
        const ix = pArr[i * 3], iy = pArr[i * 3 + 1], iz = pArr[i * 3 + 2];
        // Skip particles near the center
        if (ix * ix + iy * iy + iz * iz < minRadiusSq) continue;

        for (let j = i + step; j < count && segCount < max; j += step) {
          const jx = pArr[j * 3], jy = pArr[j * 3 + 1], jz = pArr[j * 3 + 2];
          if (jx * jx + jy * jy + jz * jz < minRadiusSq) continue;

          const dx = ix - jx, dy = iy - jy, dz = iz - jz;
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < threshSq) {
            const fade = 1.0 - Math.sqrt(dSq) / threshold;
            const opacity = fade * (0.1 + this._beatFlash * 0.15 * I);
            const idx = segCount * 6;
            lPos[idx] = ix; lPos[idx + 1] = iy; lPos[idx + 2] = iz;
            lPos[idx + 3] = jx; lPos[idx + 4] = jy; lPos[idx + 5] = jz;
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
      const m = this._audioMetrics;
      const silenceMul = (m && m.isSilent) ? 0.1 : 1.0; // suppress when silent
      for (let i = 0; i < count; i++) {
        const bin = bins[i];
        const rawVal = (freq[bin] + 100) / 70;
        const val = Math.max(0, Math.min(1, rawVal)) * silenceMul;
        const current = active[i];
        if (val > current) {
          active[i] = current + (val - current) * 0.4;
        } else {
          active[i] = current * 0.95;
        }
      }
      this._activeAttr.needsUpdate = true;
    }

    _detectBeat(dt) {
      const I = this._intensity;
      const bassJump = this.bass - this._prevBass;
      this._prevBass = this.bass;
      this._beatCooldown = Math.max(0, this._beatCooldown - dt);

      // Silence-aware beat detection: skip if AudioMetrics reports silence
      const m = this._audioMetrics;
      if (m && m.isSilent) return;

      // Adaptive threshold: scales with current intensity so quiet passages
      // don't trigger beats from tiny fluctuations
      const baseThreshold = this._beatThreshold;
      const dynamicThreshold = baseThreshold + I * 0.04; // harder to trigger at high energy
      const minBass = m ? 0.12 : 0.18; // AudioMetrics pre-gates, so can be slightly lower
      // Also require spectral flux (onset) confirmation when available
      const fluxOk = !m || m.spectralFlux > 0.05;

      if (bassJump > dynamicThreshold && this._beatCooldown <= 0 && this.bass > minBass && fluxOk) {
        // Start ABSORB phase — particles collapse into globe
        this._beatPullPhase = 1;
        this._beatPullTimer = 0;
        this._beatCooldown = 0.25;
        this._beatCount++;

        // Cycle beat color
        if (this._beatCount % 3 === 0) {
          const palette = BEAT_COLORS[this.targetProfile.colorPalette || 'cool'];
          this._currentBeatColorIdx = (this._currentBeatColorIdx + 1) % palette.length;
          const c = palette[this._currentBeatColorIdx];
          this._targetBeatColor[0] = c[0];
          this._targetBeatColor[1] = c[1];
          this._targetBeatColor[2] = c[2];
        }

        // Camera punches in
        this._cameraTargetZ = 55 - Math.min(10, bassJump * 30);
      }

      // ── 4-phase sequence: ABSORB → RAYS → BURST BACK → IDLE ───────
      if (this._beatPullPhase === 1) {
        // ABSORB: particles flow into globe over ~400ms
        this._beatPullTimer += dt;
        const t1 = Math.min(1, this._beatPullTimer / 0.4);
        this._beatPull = t1 * t1; // ease-in
        this._beatFlash = 0;

        // Fully absorbed → start RAYS phase
        if (this._beatPullTimer > 0.4) {
          this._beatPullPhase = 2;
          this._beatPullTimer = 0;
          this._beatPull = 1.0; // particles stay absorbed
          this._beatFlash = 0.8;
        }
      } else if (this._beatPullPhase === 2) {
        // RELEASE: particles hidden, emit either rays OR rings (chosen at random)
        this._beatPullTimer += dt;
        this._beatPull = 1.0;

        // Pick release type once at start of phase
        if (this._beatPullTimer < 0.02) {
          this._releaseType = Math.random(); // 0-0.5 = rays, 0.5-1.0 = rings
        }

        if (this._releaseType < 0.5) {
          // RAYS streaming out
          const raysPerFrame = Math.floor(3 + this._beatPullTimer * 20);
          for (let r = 0; r < raysPerFrame; r++) {
            this._emitSpark();
          }
        } else {
          // CONCENTRIC RINGS expanding out
          if (this._beatPullTimer < 0.02) {
            this._emitPulse(this._targetBeatColor, 14);
            this._emitPulse(this._targetBeatColor, 10);
          }
          // Stagger more rings over the phase
          if (Math.floor(this._beatPullTimer * 8) > Math.floor((this._beatPullTimer - dt) * 8)) {
            this._emitPulse(this._targetBeatColor, 6 + Math.random() * 10);
          }
        }

        this._beatFlash = 0.6 + Math.sin(this._beatPullTimer * 20) * 0.2;

        if (this._beatPullTimer > 0.5) {
          this._beatPullPhase = 3;
          this._beatPullTimer = 0;
          this._beatFlash = 1.0;

          // Final burst matches the release type
          if (this._releaseType < 0.5) {
            const burstCount = Math.floor(40 + this.bass * 50);
            for (let b = 0; b < burstCount; b++) this._emitSpark();
          } else {
            this._emitPulse(this._targetBeatColor, 18);
            this._emitPulse(this._targetBeatColor, 12);
            this._emitPulse(this._targetBeatColor, 6);
          }
        }
      } else if (this._beatPullPhase === 3) {
        // BURST BACK: particles explode back to positions over ~500ms
        this._beatPullTimer += dt;
        const t3 = Math.min(1, this._beatPullTimer / 0.5);
        this._beatPull = 1.0 - (t3 * t3); // ease-out from 1→0

        if (this._beatPullTimer > 0.5) {
          this._beatPullPhase = 0;
          this._beatPull = 0;
        }
      }

      // Decay flash
      this._beatFlash *= 0.88;
      if (this._beatFlash < 0.01) this._beatFlash = 0;

      // Lerp beat color
      for (let i = 0; i < 3; i++) {
        this._beatColor[i] += (this._targetBeatColor[i] - this._beatColor[i]) * 0.1;
      }

      // Camera shake scaled by intensity
      this._cameraShake *= 0.9;
      if (bassJump > 0.25 && this.bass > 0.5 && I > 0.3) {
        this._cameraShake = Math.min(0.4, bassJump * 1.5 * I);
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

      // Use AudioMetrics engine if available (provides silence gating + adaptive normalization)
      if (this._audioMetrics) {
        const m = this._audioMetrics;
        // Map 7-band metrics back to the 3 bands the visualizer uses
        // Bass = subBass + bass (weighted toward sub for kick punch)
        // Mids = lowMid + mid + vocals influence
        // Highs = upperMid + presence + brilliance
        this.bass  = m.subBass * 0.6 + m.bass * 0.4;
        this.mids  = m.lowMid * 0.3 + m.mid * 0.4 + m.vocals * 0.3;
        this.highs = m.upperMid * 0.3 + m.presence * 0.4 + m.brilliance * 0.3;

        // Silence gate: when AudioMetrics says silent, decay toward zero
        if (m.isSilent) {
          this.bass  *= 0.85; // fast decay per frame → reaches ~0 in 30 frames
          this.mids  *= 0.85;
          this.highs *= 0.85;
          if (this.bass < 0.005)  this.bass  = 0;
          if (this.mids < 0.005)  this.mids  = 0;
          if (this.highs < 0.005) this.highs = 0;
        }
      } else {
        // Fallback: original 3-band extraction with improved normalization
        let bassSum = 0, midsSum = 0, highsSum = 0;
        for (let i = 0; i < 4; i++) bassSum += frequencyData[i];
        for (let i = 4; i < 16; i++) midsSum += frequencyData[i];
        for (let i = 16; i < frequencyData.length; i++) highsSum += frequencyData[i];

        const bassNorm = Math.max(0, Math.min(1, (bassSum / 4 + 100) / 100));
        const midsNorm = Math.max(0, Math.min(1, (midsSum / 12 + 100) / 100));
        const highsNorm = Math.max(0, Math.min(1, (highsSum / (frequencyData.length - 16) + 100) / 100));

        const lerpSpeed = this._micMode ? 0.35 : 0.15;
        const lerpSpeedH = this._micMode ? 0.3 : 0.12;
        this.bass  += (bassNorm  - this.bass)  * lerpSpeed;
        this.mids  += (midsNorm  - this.mids)  * lerpSpeed;
        this.highs += (highsNorm - this.highs) * lerpSpeedH;
      }

      // Waveform on central geometry (gated by intensity)
      if (waveformData && this.centralMesh) {
        const posAttr = this.centralMesh.geometry.attributes.position;
        const arr = posAttr.array;
        const base = this._centralBasePos;
        const len = arr.length / 3;
        const wGate = this._audioMetrics && this._audioMetrics.isSilent ? 0 : 1;
        for (let i = 0; i < len; i++) {
          const wi = Math.floor((i / len) * waveformData.length);
          const wVal = waveformData[wi] || 0;
          const scale = 1.0 + wVal * this.bass * 0.6 * wGate;
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
        this._beatThreshold     = 0.10;  // sensitive but not noise-reactive
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
        const geo = new THREE.RingGeometry(1.5, 2.5, 72);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(this.theme.primary[0], this.theme.primary[1], this.theme.primary[2]),
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
      // Use fractal-synced breathing color instead of passed color
      const r = this._breathR || 0.5, g = this._breathG || 0.5, b = this._breathB || 0.5;
      // Brighten slightly for visibility
      mesh.material.color.setRGB(
        Math.min(1, r * 1.3),
        Math.min(1, g * 1.3),
        Math.min(1, b * 1.3)
      );
      mesh._pa = true; mesh._ps = 1.0; mesh._po = 1.0; mesh._pspd = speed || 14;
      mesh.scale.setScalar(1.0);
      mesh.material.opacity = 1.0;
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    }

    _updatePulseRings(dt) {
      for (const m of this._pulsePool) {
        if (!m._pa) continue;
        m._ps += m._pspd * dt;
        m._po -= 0.7 * dt;   // slower fade — rings linger longer
        if (m._po <= 0) { m._pa = false; m.material.opacity = 0; }
        else { m.scale.setScalar(m._ps); m.material.opacity = m._po * m._po * 0.8; }
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
      const I = this._intensity;
      const pos = this._waveRibbon.geometry.attributes.position.array;
      const col = this._waveRibbon.geometry.attributes.color.array;
      const N = pos.length / 3;
      const waveform = this._lastWaveformData;
      const cc = this._currentColor; const bc = this._beatColor;
      const bm = Math.min(1, this._beatFlash * 0.6 * I);
      const cr = cc[0]*(1-bm)+bc[0]*bm, cg = cc[1]*(1-bm)+bc[1]*bm, cb = cc[2]*(1-bm)+bc[2]*bm;

      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + elapsed * 0.04;
        let w = waveform ? (waveform[Math.floor((i/N)*waveform.length)] || 0)
                         : Math.sin(elapsed * 1.2 + i * 0.12) * 0.025;
        const bboost = 1 + this.bass * 1.2 * I;
        const r = Math.max(12, 18 + w * 5 * bboost);
        pos[i*3]   = Math.cos(a) * r;
        pos[i*3+1] = w * 2 * (0.3 + this.mids * I);
        pos[i*3+2] = Math.sin(a) * r;
        const bright = 0.5 + Math.abs(w) * 2 * I + this.highs * 0.4 * I;
        col[i*3]   = cr * bright; col[i*3+1] = cg * bright; col[i*3+2] = cb * bright;
      }
      this._waveRibbon.geometry.attributes.position.needsUpdate = true;
      this._waveRibbon.geometry.attributes.color.needsUpdate = true;
      this._waveRibbon.material.opacity = 0.35 + I * 0.4 + this._beatFlash * 0.2 * I;
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
      this._freqBarSmoothed = new Float32Array(N); // per-bar smoothing buffer
      this.scene.add(this._freqBars);
    }

    _updateFreqBars(elapsed) {
      if (!this._freqBars) return;
      const I = this._intensity;
      const pos = this._freqBars.geometry.attributes.position.array;
      const col = this._freqBars.geometry.attributes.color.array;
      const N = this._freqBarsN;
      const sm = this._freqBarSmoothed;
      const inner = 14;
      const rot = elapsed * 0.07;
      const cc = this._currentColor; const bc = this._beatColor;
      const bm = Math.min(1, this._beatFlash * 0.6 * I);
      const cr = cc[0]*(1-bm)+bc[0]*bm, cg = cc[1]*(1-bm)+bc[1]*bm, cb = cc[2]*(1-bm)+bc[2]*bm;

      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + rot;
        const cos = Math.cos(a), sin = Math.sin(a);
        let raw = 0;
        if (this._lastFreqData) {
          const bin = Math.floor(i * this._lastFreqData.length / N);
          raw = Math.max(0, (this._lastFreqData[bin] + 100) / 100);
        }

        // Per-bar smoothing: fast attack, slow decay
        if (raw > sm[i]) {
          sm[i] += (raw - sm[i]) * 0.5;
        } else {
          sm[i] *= 0.93;
        }
        const v = sm[i];

        // Bar length: frequency-driven, scaled by master intensity
        const barLen = 0.15 + v * v * 12 * I + v * this._beatFlash * 2 * I;
        const outer = inner + barLen;

        // inner vertex
        pos[i*6]   = cos*inner; pos[i*6+1] = 0;               pos[i*6+2] = sin*inner;
        // outer vertex (Y lift for 3D depth)
        pos[i*6+3] = cos*outer; pos[i*6+4] = v*3*this.mids*I;  pos[i*6+5] = sin*outer;

        const bright = 0.4 + v * 1.8 * I + this._beatFlash * 0.2 * I;
        col[i*6]   = cr*0.25; col[i*6+1] = cg*0.25; col[i*6+2] = cb*0.25;
        col[i*6+3] = Math.min(1.8, cr*bright); col[i*6+4] = Math.min(1.8, cg*bright); col[i*6+5] = Math.min(1.8, cb*bright);
      }
      this._freqBars.geometry.attributes.position.needsUpdate = true;
      this._freqBars.geometry.attributes.color.needsUpdate = true;
      this._freqBars.material.opacity = 0.5 + I * 0.4 + this._beatFlash * 0.15 * I;
    }

    // ─── Energy waves — continuous music-reactive ripples ────────────
    _createEnergyWaves() {
      this._energyWaves = [];
      this._ewEmitTimer = 0;
      this._ewSmoothedEnergy = 0;    // smoothed overall energy for vibe tracking

      const WAVE_COUNT = 24;
      for (let i = 0; i < WAVE_COUNT; i++) {
        const segments = 128;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(segments * 3);
        const colors = new Float32Array(segments * 3);
        for (let j = 0; j < segments; j++) {
          const a = (j / segments) * Math.PI * 2;
          positions[j * 3]     = Math.cos(a);
          positions[j * 3 + 1] = 0;
          positions[j * 3 + 2] = Math.sin(a);
          colors[j * 3] = 0.5; colors[j * 3 + 1] = 0.8; colors[j * 3 + 2] = 1.0;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({
          vertexColors: true, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const line = new THREE.LineLoop(geo, mat);
        line.rotation.x = Math.PI / 2; // lay flat in XZ plane
        this.scene.add(line);

        this._energyWaves.push({
          mesh: line,
          active: false,
          radius: 0,
          opacity: 0,
          speed: 0,
          energy: 0,        // energy level when spawned (shapes the wave)
          wobblePhase: Math.random() * Math.PI * 2,
        });
      }
      this._ewIdx = 0;
    }

    _emitEnergyWave(energy) {
      const w = this._energyWaves[this._ewIdx % this._energyWaves.length];
      this._ewIdx++;
      w.active = true;
      w.radius = 2;
      w.opacity = 0.3 + energy * 0.7;  // brighter when more energy
      w.speed = 6 + energy * 18;        // faster when more energy
      w.energy = energy;
      w.wobblePhase = Math.random() * Math.PI * 2;
      // slight random tilt for organic look
      w.mesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.15;
      w.mesh.rotation.z = (Math.random() - 0.5) * 0.1;
    }

    _updateEnergyWaves(dt) {
      const I = this._intensity;

      // Emit rate scales with master intensity
      // Calm: 1 wave/3s, moderate: 1/s, intense: 3-4/s
      const emitInterval = Math.max(0.25, 1.5 - I * 2.5);
      this._ewEmitTimer += dt;
      if (this._ewEmitTimer >= emitInterval && I > 0.05) {
        this._ewEmitTimer = 0;
        this._emitEnergyWave(I);
      }
      // Extra burst only on genuinely strong beats at high intensity
      if (this._beatFlash > 0.7 && I > 0.5) {
        this._emitEnergyWave(I);
      }

      // Current colors
      const cc = this._currentColor; const bc = this._beatColor;
      const bm = Math.min(1, this._beatFlash * 0.6);

      // Update each active wave
      for (const w of this._energyWaves) {
        if (!w.active) { w.mesh.material.opacity = 0; continue; }

        w.radius += w.speed * dt;
        // Fade: fast initial brightness, gradual tail
        w.opacity -= (0.3 + w.energy * 0.5) * dt;

        if (w.opacity <= 0 || w.radius > 60) {
          w.active = false;
          w.mesh.material.opacity = 0;
          continue;
        }

        // Update ring shape — wobbly organic circle
        const pos = w.mesh.geometry.attributes.position.array;
        const col = w.mesh.geometry.attributes.color.array;
        const N = pos.length / 3;
        const wobbleAmt = 0.5 + w.energy * 2.5; // more energy = more wobble
        const elapsed = this.clock.getElapsedTime();

        for (let j = 0; j < N; j++) {
          const a = (j / N) * Math.PI * 2;
          // Organic wobble: multiple sine waves create non-uniform expansion
          const wobble = 1
            + Math.sin(a * 3 + w.wobblePhase + elapsed * 1.5) * 0.08 * wobbleAmt
            + Math.sin(a * 5 - elapsed * 2.0 + w.wobblePhase * 2) * 0.04 * wobbleAmt
            + Math.sin(a * 2 + elapsed * 0.7) * 0.06 * wobbleAmt;
          const r = w.radius * wobble;
          pos[j * 3]     = Math.cos(a) * r;
          pos[j * 3 + 1] = Math.sin(a * 4 + w.wobblePhase) * wobbleAmt * 0.3; // slight Y ripple
          pos[j * 3 + 2] = Math.sin(a) * r;

          // Color: use fractal-synced breathing palette
          const bright = 0.6 + Math.sin(a * 6 + elapsed * 3) * 0.3 * w.energy;
          const br = this._breathR || 0.5, bg = this._breathG || 0.5, bb = this._breathB || 0.5;
          col[j * 3]     = (br * (1 - bm) + bc[0] * bm) * bright;
          col[j * 3 + 1] = (bg * (1 - bm) + bc[1] * bm) * bright;
          col[j * 3 + 2] = (bb * (1 - bm) + bc[2] * bm) * bright;
        }
        pos.needsUpdate = true;
        w.mesh.geometry.attributes.position.needsUpdate = true;
        w.mesh.geometry.attributes.color.needsUpdate = true;
        w.mesh.material.opacity = w.opacity * w.opacity; // quadratic fade for softer tail
      }
    }

    // ─── Ring sparks — short glowing rays that fly off the orbit ring ──
    _createRingSparks() {
      const SPARK_COUNT = 350;
      // Each spark is a line segment (2 vertices)
      const pos = new Float32Array(SPARK_COUNT * 2 * 3);
      const col = new Float32Array(SPARK_COUNT * 2 * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this._sparkMesh = new THREE.LineSegments(geo, mat);
      this._sparkMesh.renderOrder = 10; // render on top of everything
      this._sparkMesh.frustumCulled = false; // never cull
      this.scene.add(this._sparkMesh);

      // Per-spark state
      this._sparks = [];
      for (let i = 0; i < SPARK_COUNT; i++) {
        this._sparks.push({
          active: false,
          angle: 0,       // position on the ring (radians)
          dirX: 0, dirY: 0, dirZ: 0, // outward direction
          life: 0,        // remaining life (seconds)
          maxLife: 0,
          speed: 0,
          length: 0,      // visual length of the ray
          radius: 0,      // current distance from center
        });
      }
      this._sparkIdx = 0;
      this._sparkEmitTimer = 0;
    }

    _emitSpark() {
      const s = this._sparks[this._sparkIdx % this._sparks.length];
      this._sparkIdx++;

      // Uniform random direction on a sphere — rays spread in all directions
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      s.dirX = Math.sin(phi) * Math.cos(theta);
      s.dirY = Math.sin(phi) * Math.sin(theta);
      s.dirZ = Math.cos(phi);

      s.active = true;
      s.radius = 3; // start at globe surface
      // Speed and length — burst rays are big and fast
      const beatBoost = 1 + this._beatFlash * 3;
      s.speed = (40 + Math.random() * 80) * beatBoost;
      s.length = (5 + Math.random() * 12) * beatBoost;
      s.maxLife = 0.5 + Math.random() * 1.0;
      s.life = s.maxLife;
    }

    _updateRingSparks(dt, elapsed) {
      if (!this._sparkMesh) return;
      const I = this._intensity;
      const pos = this._sparkMesh.geometry.attributes.position.array;
      const col = this._sparkMesh.geometry.attributes.color.array;

      // Base emit rate from intensity + direct bass reactivity
      const emitRate = 2 + I * 20 + this.bass * 15;
      this._sparkEmitTimer += dt;
      const emitInterval = 1.0 / emitRate;
      while (this._sparkEmitTimer >= emitInterval) {
        this._sparkEmitTimer -= emitInterval;
        this._emitSpark();
      }
      // Color — use breathR/G/B stored from _animate to match fractal palette
      const bc = this._beatColor;
      const bm = Math.min(1, this._beatFlash * 0.7);

      for (let i = 0; i < this._sparks.length; i++) {
        const s = this._sparks[i];
        const idx = i * 6; // 2 vertices * 3 components

        if (!s.active) {
          // Move off-screen (not origin — avoids center artifacts)
          pos[idx] = pos[idx+3] = 9999;
          pos[idx+1] = pos[idx+4] = 9999;
          pos[idx+2] = pos[idx+5] = 9999;
          col[idx] = col[idx+1] = col[idx+2] = 0;
          col[idx+3] = col[idx+4] = col[idx+5] = 0;
          continue;
        }

        s.life -= dt;
        if (s.life <= 0) { s.active = false; continue; }

        // Move outward from ring
        s.radius += s.speed * dt;
        s.speed *= 0.97;

        const lifeRatio = s.life / s.maxLife;

        // Ray from globe surface outward in 3D
        const dist = s.radius - 3; // distance from globe surface (radius 3)
        const headX = s.dirX * (3 + dist);
        const headY = s.dirY * (3 + dist);
        const headZ = s.dirZ * (3 + dist);

        const tailLen = s.length * lifeRatio;
        const tailR = Math.max(3, 3 + dist - tailLen);
        const tailX = s.dirX * tailR;
        const tailY = s.dirY * tailR;
        const tailZ = s.dirZ * tailR;

        pos[idx]   = tailX; pos[idx+1] = tailY; pos[idx+2] = tailZ;
        pos[idx+3] = headX; pos[idx+4] = headY; pos[idx+5] = headZ;

        // Color: use fractal-synced breathing palette
        const brightness = lifeRatio * lifeRatio;
        const br = this._breathR || 0.5, bg = this._breathG || 0.5, bb = this._breathB || 0.5;
        const cr = br * (1 - bm) + bc[0] * bm;
        const cg = bg * (1 - bm) + bc[1] * bm;
        const cb = bb * (1 - bm) + bc[2] * bm;

        // Tail (slightly dim)
        col[idx]   = cr * brightness * 0.6;
        col[idx+1] = cg * brightness * 0.6;
        col[idx+2] = cb * brightness * 0.6;
        // Head (bright white-hot on beat, colored otherwise)
        const headBright = brightness * (1 + this._beatFlash * 2);
        col[idx+3] = Math.min(1.5, cr * headBright);
        col[idx+4] = Math.min(1.5, cg * headBright);
        col[idx+5] = Math.min(1.5, cb * headBright);
      }

      this._sparkMesh.geometry.attributes.position.needsUpdate = true;
      this._sparkMesh.geometry.attributes.color.needsUpdate = true;
      this._sparkMesh.material.opacity = 0.6 + I * 0.4;

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

      // Master toggle
      this.particles.visible = this.config.enabled;
      if (this.lines) this.lines.visible = false;


      const dt = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Lerp profile values and positions
      this._lerpProfile();
      this._lerpPositionsToTarget();

      // Per-particle audio activation
      this._updateParticleActivation();

      // Beat detection & color cycling
      if (this.config.beatReact) this._detectBeat(dt);
      else { this._beatFlash *= 0.92; if (this._beatFlash < 0.01) this._beatFlash = 0; }

      if (this.config.colorCycle) this._colorCycleTime += dt * (this.targetProfile.morphSpeed || 0.5);

      // ── Master intensity — unified musical energy ──────────────────
      const m = this._audioMetrics;
      const rawIntensity = m ? m.energy : (this.bass * 0.45 + this.mids * 0.35 + this.highs * 0.2);
      // Track recent peak for dynamic range (slow decay)
      if (rawIntensity > this._intensityPeak) this._intensityPeak = rawIntensity;
      else this._intensityPeak *= 0.998; // ~3s decay
      // Normalize against recent peak so quiet sections → low intensity
      const dynamicRange = Math.max(0.15, this._intensityPeak);
      this._intensityTarget = Math.min(1, rawIntensity / dynamicRange);
      // When silent, force intensity toward zero
      if (m && m.isSilent) this._intensityTarget = 0;
      // Smooth: slow rise for builds, medium fall for drops
      if (this._intensityTarget > this._intensity) {
        this._intensity += (this._intensityTarget - this._intensity) * 0.04; // ~0.7s rise
      } else {
        this._intensity += (this._intensityTarget - this._intensity) * 0.02; // ~1.5s fall
      }
      const I = this._intensity; // shorthand — use everywhere below

      // Random formation & geometry morphing
      if (this.config.formationMorph) this._randomFormationSwitch(dt);
      if (this.config.shapeShift) this._updateCentralGeoMorph(dt);

      // New effect updates
      this._updatePulseRings(dt);
      this._updateWaveformRibbon(elapsed);
      this._updateEnergyWaves(dt);
      this._updateRingSparks(dt, elapsed);
      this._updateTunnelRings(elapsed, dt);

      // Smooth theme color lerp
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

      // Match the fractal's cosine palette so everything is in sync
      const fracPhase = elapsed * 0.15;
      const breathR = this._breathR = 0.5 + 0.5 * Math.cos(fracPhase + cc[0] * 6.28 + 0.0);
      const breathG = this._breathG = 0.5 + 0.5 * Math.cos(fracPhase + cc[1] * 6.28 + 0.4);
      const breathB = this._breathB = 0.5 + 0.5 * Math.cos(fracPhase + cc[2] * 6.28 + 0.8);

      // Fractal background uniforms
      if (this._fractalUniforms) {
        const fu = this._fractalUniforms;
        fu.uTime.value      = elapsed;
        // Feed fractals heavily dampened audio — they should feel ambient, not reactive
        fu.uBass.value      = this.bass  * 0.35;
        fu.uMids.value      = this.mids  * 0.3;
        fu.uHighs.value     = this.highs * 0.25;
        fu.uBeatFlash.value = this._beatFlash * 0.3;
        fu.uColor.value.set(breathR, breathG, breathB);
        fu.uBeatColor.value.set(this._beatColor[0], this._beatColor[1], this._beatColor[2]);
        fu.uZoomSpeed.value = 0.01 + I * 0.03 + this.bass * 0.025 + this.mids * 0.012;
      }

      // Update uniforms — config overrides, scaled by master intensity
      this._particleUniforms.uTime.value = elapsed;
      // Scale everything by intensity — near-zero baseline when silent
      this._particleUniforms.uBass.value = this.bass * (0.05 + I * 0.95);
      this._particleUniforms.uMids.value = this.mids * (0.05 + I * 0.95);
      this._particleUniforms.uHighs.value = this.highs * (0.05 + I * 0.95);
      this._particleUniforms.uDisplacement.value = this.config.displacement ? this.profile.displacement * (0.03 + I * 0.97) : 0;
      this._particleUniforms.uSpeed.value = this.profile.speed * this.config.speedMultiplier * (0.08 + I * 0.92);
      this._particleUniforms.uChaos.value = (this.config.chaosOverride !== null ? this.config.chaosOverride : this.profile.chaos) * (0.02 + I * 0.98);
      this._particleUniforms.uSizeMultiplier.value = this.config.particleSizeMultiplier;
      this._particleUniforms.uPulseStrength.value = this.config.beatReact ? this.profile.pulseStrength * I : 0;
      this._particleUniforms.uPull.value = this._beatPull;
      this._particleUniforms.uBeatFlash.value = this._beatFlash;
      this._particleUniforms.uColorCycle.value = this._colorCycleTime;
      this._particleUniforms.uColor.value.set(breathR, breathG, breathB);
      this._particleUniforms.uBeatColor.value.set(
        this._beatColor[0], this._beatColor[1], this._beatColor[2]
      );

      // Central geometry — absorb/burst visual
      if (this.centralMesh) {
        this.centralMesh.rotation.x = elapsed * (0.05 + I * 0.12);
        this.centralMesh.rotation.y = elapsed * (0.08 + I * 0.15);
        this.centralMesh.rotation.z = elapsed * 0.03;

        // ABSORB: globe swells as it absorbs particles
        // BURST: globe briefly expands then returns
        const pullSwell = 1.0 + this._beatPull * 0.6;
        const burstSwell = 1.0 + this._beatFlash * 0.5;
        const cScale = Math.max(pullSwell, burstSwell) + this.bass * this.profile.pulseStrength * 0.3 * I;
        this.centralMesh.scale.setScalar(cScale);

        // During absorb: globe turns white-hot. During burst: beat color flash.
        const pullWhite = this._beatPull;
        const bc = this._beatColor;
        const bm = this._beatFlash * 0.6;
        this.centralMesh.material.color.setRGB(
          Math.min(1, breathR * (1 - bm - pullWhite) + bc[0] * bm + pullWhite),
          Math.min(1, breathG * (1 - bm - pullWhite) + bc[1] * bm + pullWhite),
          Math.min(1, breathB * (1 - bm - pullWhite) + bc[2] * bm + pullWhite)
        );
        // Dim when silent, bright during absorb and burst
        this.centralMesh.material.opacity = 0.05 + I * 0.45 + this._beatFlash * 0.5 + this._beatPull * 0.7;
      }

      // Aura ring — pulses on burst, color synced
      if (this.auraRing) {
        this.auraRing.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.3) * 0.2;
        this.auraRing.rotation.z = elapsed * 0.1;
        const auraScale = 1.0 + this.bass * 0.6 * I + this._beatFlash * 0.8;
        this.auraRing.scale.setScalar(auraScale);
        this.auraRing.material.opacity = 0.03 + this.bass * 0.12 * I + this._beatFlash * 0.3;

        const bc = this._beatColor;
        const bm = this._beatFlash * 0.6;
        this.auraRing.material.color.setRGB(
          breathR * (1 - bm) + bc[0] * bm,
          breathG * (1 - bm) + bc[1] * bm,
          breathB * (1 - bm) + bc[2] * bm
        );
      }

      // Center bloom glow — big bloom during absorb, massive on burst
      if (this._centerGlow && this._centerGlowUniforms) {
        this._centerGlow.quaternion.copy(this.camera.quaternion);
        this._centerGlowUniforms.uIntensity.value = 0.02 + I * 0.6 + this._beatFlash * 1.5 + this._beatPull * 2.5;
        this._centerGlowUniforms.uTime.value = elapsed;
        this._centerGlowUniforms.uColor.value.set(breathR, breathG, breathB);
      }

      // Particle group rotation - scaled by intensity
      const rotSpeed = 0.005 + I * 0.015 + this.bass * 0.02 * I;
      this.particles.rotation.y = elapsed * rotSpeed;
      this.particles.rotation.x = Math.sin(elapsed * 0.01) * 0.1;

      // Smooth mouse parallax lerp
      this._mouseX += (this._targetMouseX - this._mouseX) * 0.05;
      this._mouseY += (this._targetMouseY - this._mouseY) * 0.05;

      // Camera orbit with shake + mouse parallax
      this._orbitAngle += 0.0003 + this.bass * 0.0005;
      const shakeAmt = this.config.cameraShake ? this._cameraShake : 0;
      const shakeX = (Math.random() - 0.5) * shakeAmt;
      const shakeY = (Math.random() - 0.5) * shakeAmt;
      this.camera.position.x = Math.sin(this._orbitAngle) * 2 + shakeX + this._mouseX * 4;
      this.camera.position.y = Math.cos(this._orbitAngle * 0.7) * 1 + shakeY - this._mouseY * 3;
      this.camera.lookAt(0, 0, 0);

      this._frameCount = (this._frameCount || 0) + 1;

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
