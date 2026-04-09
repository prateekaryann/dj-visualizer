/**
 * Humanoid Visualizer — v4 (Anyma-inspired)
 *
 * Shader-driven mesh humanoid with:
 *   - Procedural sculpted mesh body (not particles-as-body)
 *   - Custom GLSL: fresnel rim glow, subsurface scattering, iridescence
 *   - Dissolution particles that detach along surface normals
 *   - Post-processing: bloom, chromatic aberration, film grain, color grading
 *   - Volumetric atmosphere with rim spotlights
 *   - Beat-synced motion with heavy easing (organic, fluid, delayed)
 */
(function () {
  'use strict';

  const { sin, cos, abs, sqrt, floor, min, max, pow, PI, random: rand } = Math;
  const TAU = PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const hash = (i) => { let x = sin(i * 127.1 + 311.7) * 43758.5453; return x - floor(x); };

  /* ── texture helpers ─────────────────────────────────────────── */

  function createGlowTex(sz) {
    const c = document.createElement('canvas');
    c.width = c.height = sz;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz/2);
    r.addColorStop(0.0, 'rgba(255,255,255,1)');
    r.addColorStop(0.2, 'rgba(255,255,255,0.6)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    r.addColorStop(1.0, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, sz, sz);
    return new THREE.CanvasTexture(c);
  }

  function createSharpDotTex(sz) {
    const c = document.createElement('canvas');
    c.width = c.height = sz;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz/2);
    r.addColorStop(0.0, 'rgba(255,255,255,0.9)');
    r.addColorStop(0.3, 'rgba(255,255,255,0.3)');
    r.addColorStop(0.6, 'rgba(255,255,255,0.04)');
    r.addColorStop(1.0, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, sz, sz);
    return new THREE.CanvasTexture(c);
  }

  /* ═══════════════════════════════════════════════════════════════
     GLSL SHADERS
     ═══════════════════════════════════════════════════════════════ */

  const bodyVertexShader = `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uEnergy;
    uniform float uBeatImpact;

    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewDir;
    varying float vDisplace;
    varying float vHeight;

    // Simplex-ish noise
    float snoise(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    }

    void main() {
      vec3 pos = position;
      vec3 norm = normal;
      vHeight = position.y;

      // Audio-reactive vertex displacement along normals
      float noiseVal = snoise(pos * 3.0 + uTime * 0.3) * 2.0 - 1.0;
      float bassDisplace = uBass * 0.02 * (0.5 + 0.5 * sin(pos.y * 8.0 + uTime * 2.0));
      float beatPulse = uBeatImpact * 0.04 * (1.0 + noiseVal * 0.5);
      float midRipple = uMid * 0.008 * sin(pos.y * 15.0 - uTime * 5.0);

      float totalDisplace = bassDisplace + beatPulse + midRipple;
      pos += norm * totalDisplace;

      // Subtle organic breathing
      float breath = sin(uTime * 1.6) * 0.005;
      pos += norm * breath;

      vDisplace = totalDisplace;
      vNormal = normalize(normalMatrix * norm);
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const bodyFragmentShader = `
    uniform float uTime;
    uniform float uBass;
    uniform float uEnergy;
    uniform float uBeatImpact;
    uniform vec3 uBaseColor;    // cool silver-teal
    uniform vec3 uRimColor;     // pale blue rim
    uniform vec3 uCoreColor;    // subtle warm core (SSS)

    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewDir;
    varying float vDisplace;
    varying float vHeight;

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewDir);

      // Fresnel rim lighting (Anyma's signature edge glow)
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5);
      fresnel = clamp(fresnel, 0.0, 1.0);

      // Subsurface scattering approximation
      // Light wraps around the form
      float sss = pow(clamp(dot(-N, V) * 0.5 + 0.5, 0.0, 1.0), 2.0) * 0.3;

      // Iridescence — subtle color shift based on view angle
      float iriAngle = dot(N, V);
      vec3 iriColor = mix(
        vec3(0.6, 0.8, 1.0),  // blue at edge
        vec3(0.9, 0.95, 1.0), // white at center
        iriAngle
      );

      // Height-based variation (head glows brighter)
      float heightFactor = smoothstep(-1.0, 2.5, vHeight);

      // Combine — kept dark/subtle, detail visible
      vec3 base = uBaseColor * (0.03 + heightFactor * 0.03);
      vec3 rim = uRimColor * fresnel * (0.35 + uEnergy * 0.2 + uBeatImpact * 0.15);
      vec3 sub = uCoreColor * sss * (0.15 + uBass * 0.1);
      vec3 iri = iriColor * fresnel * 0.08;

      // Displacement glow — subtle
      vec3 dispGlow = uRimColor * abs(vDisplace) * 3.0;

      vec3 finalColor = base + rim + sub + iri + dispGlow;

      // Beat flash — subtle
      finalColor += uBeatImpact * 0.06 * uRimColor;

      // Energy-driven emission — gentle
      finalColor *= 1.0 + uEnergy * 0.15;

      float alpha = 0.85 + fresnel * 0.15;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  // Wireframe overlay shader (subtle structural lines)
  const wireVertexShader = `
    uniform float uTime;
    uniform float uBass;
    uniform float uBeatImpact;

    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
      vec3 pos = position;
      vec3 norm = normal;

      float bassDisplace = uBass * 0.02 * (0.5 + 0.5 * sin(pos.y * 8.0 + uTime * 2.0));
      float beatPulse = uBeatImpact * 0.04;
      pos += norm * (bassDisplace + beatPulse + sin(uTime * 1.6) * 0.005);
      // Slight outward offset so wireframe sits on top of surface
      pos += norm * 0.003;

      vNormal = normalize(normalMatrix * norm);
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const wireFragmentShader = `
    uniform float uEnergy;
    uniform vec3 uRimColor;

    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
      float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.0);
      vec3 col = uRimColor * (0.06 + fresnel * 0.15) * (0.3 + uEnergy * 0.3);
      gl_FragColor = vec4(col, 0.05 + fresnel * 0.1);
    }
  `;

  // Dissolution particles vertex shader
  const dissolutionVertexShader = `
    attribute float aLife;
    attribute float aSize;
    attribute vec3 aVelocity;

    uniform float uTime;
    uniform float uEnergy;

    varying float vLife;
    varying float vDist;

    void main() {
      vLife = aLife;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vDist = -mvPos.z;
      gl_Position = projectionMatrix * mvPos;
      gl_PointSize = aSize * (200.0 / -mvPos.z) * (0.8 + uEnergy * 0.4);
    }
  `;

  const dissolutionFragmentShader = `
    varying float vLife;
    varying float vDist;

    uniform vec3 uColor;

    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;

      // Soft circular falloff
      float alpha = smoothstep(1.0, 0.2, d);
      // Fade with life
      alpha *= smoothstep(0.0, 0.3, vLife) * smoothstep(1.0, 0.6, vLife);
      alpha *= 0.6;

      vec3 col = uColor * (1.0 + (1.0 - vLife) * 0.5);
      gl_FragColor = vec4(col, alpha);
    }
  `;

  // Post-processing: chromatic aberration + film grain + color grading
  const postFragmentShader = `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uBeatImpact;
    uniform float uEnergy;
    varying vec2 vUv;

    // Film grain
    float grain(vec2 uv, float t) {
      return fract(sin(dot(uv * t, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
    }

    void main() {
      vec2 uv = vUv;

      // Chromatic aberration — subtle, increases on beats
      float caStrength = 0.0015 + uBeatImpact * 0.003;
      vec2 dir = (uv - 0.5) * caStrength;
      float r = texture2D(tDiffuse, uv + dir).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - dir).b;
      vec3 col = vec3(r, g, b);

      // Color grading — push toward cool teals/silvers
      // Lift shadows toward teal, keep highlights neutral
      vec3 shadowTint = vec3(0.05, 0.12, 0.18);
      vec3 highlightTint = vec3(0.95, 0.97, 1.0);
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col + shadowTint * (1.0 - luma) * 0.3,
                col * highlightTint,
                smoothstep(0.0, 1.0, luma));

      // Subtle vignette
      float vig = 1.0 - smoothstep(0.5, 1.4, length((uv - 0.5) * 1.8));
      col *= 0.7 + vig * 0.3;

      // Film grain (very subtle)
      float g2 = grain(uv, uTime * 60.0);
      col += g2 * 0.018;

      // Final contrast boost
      col = pow(col, vec3(1.05));

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ═══════════════════════════════════════════════════════════════
     PROCEDURAL HUMANOID MESH BUILDER
     Uses LatheGeometry for torso/head (smooth profile revolution)
     and TubeGeometry for limbs (smooth curved tubes along bones)
     ═══════════════════════════════════════════════════════════════ */

  // Create a limb as a TubeGeometry along a CatmullRomCurve3
  // with variable radius (thicker at top, thinner at bottom)
  function makeLimb(points, radiusTop, radiusBottom, tubeSeg, radSeg) {
    tubeSeg = tubeSeg || 12;
    radSeg = radSeg || 10;
    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p[0], p[1], p[2])),
      false, 'catmullrom', 0.5
    );

    // TubeGeometry has uniform radius. We need variable radius.
    // Build it manually using Frenet frames along the curve.
    const frames = curve.computeFrenetFrames(tubeSeg, false);
    const positions = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i <= tubeSeg; i++) {
      const t = i / tubeSeg;
      const pos = curve.getPointAt(t);
      const N = frames.normals[i];
      const B = frames.binormals[i];

      // Interpolate radius
      const r = radiusTop + (radiusBottom - radiusTop) * t;
      // Slight taper at very start and end for smooth caps
      const capTaper = 1.0 - 0.4 * pow(2*t - 1, 6);
      const radius = r * capTaper;

      for (let j = 0; j <= radSeg; j++) {
        const angle = (j / radSeg) * TAU;
        const cx = cos(angle), sy = sin(angle);

        const nx = cx * N.x + sy * B.x;
        const ny = cx * N.y + sy * B.y;
        const nz = cx * N.z + sy * B.z;

        positions.push(
          pos.x + radius * nx,
          pos.y + radius * ny,
          pos.z + radius * nz
        );
        normals.push(nx, ny, nz);
      }
    }

    // Indices
    for (let i = 0; i < tubeSeg; i++) {
      for (let j = 0; j < radSeg; j++) {
        const a = i * (radSeg + 1) + j;
        const b = a + radSeg + 1;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    geo.setIndex(indices);
    return geo;
  }

  // Create a body of revolution from a 2D profile (LatheGeometry)
  // profile: array of [radius, y] pairs, top to bottom
  function makeLatheBody(profile, segments, offsetX, offsetZ) {
    offsetX = offsetX || 0;
    offsetZ = offsetZ || 0;
    segments = segments || 24;
    const points = profile.map(p => new THREE.Vector2(p[0], p[1]));
    const geo = new THREE.LatheGeometry(points, segments);
    if (offsetX || offsetZ) geo.translate(offsetX, 0, offsetZ);
    return geo;
  }

  function buildHumanoidMesh() {
    const geos = [];

    // ── HEAD: ellipsoidal profile ──
    // A human head is ~0.11m radius, slightly taller than wide
    const headProfile = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16; // 0 (top) to 1 (bottom)
      const angle = t * PI;
      const r = sin(angle) * 0.105; // max radius 0.105
      const y = 2.38 - cos(angle) * 0.14; // height: 2.24 to 2.52, center ~2.38
      headProfile.push([r, y]);
    }
    geos.push(makeLatheBody(headProfile, 20));

    // ── NECK ──
    const neckProfile = [
      [0.04, 2.22], [0.055, 2.18], [0.06, 2.12],
      [0.06, 2.05], [0.065, 2.00], [0.07, 1.96],
    ];
    geos.push(makeLatheBody(neckProfile, 14));

    // ── TORSO: single smooth profile from shoulders to hips ──
    // Key anatomical landmarks (front profile, radius from center):
    // Shoulders wide (0.20), chest ~0.17, waist narrow (0.12), hips wide (0.18)
    const torsoProfile = [
      // Shoulder top
      [0.10, 1.96],
      [0.18, 1.90],  // shoulders
      [0.21, 1.82],  // deltoid area
      [0.20, 1.72],  // upper chest
      [0.18, 1.60],  // mid chest
      [0.17, 1.50],  // lower ribcage
      [0.155, 1.40], // narrowing
      [0.13, 1.30],  // waist (narrowest)
      [0.12, 1.22],  // lower waist
      [0.14, 1.14],  // start of hip flare
      [0.17, 1.06],  // hip bone
      [0.19, 0.98],  // widest hip
      [0.18, 0.92],  // lower hip
      [0.16, 0.86],  // upper thigh crease
      [0.10, 0.82],  // crotch area convergence
    ];
    geos.push(makeLatheBody(torsoProfile, 24));

    // ── ARMS: TubeGeometry along curved paths ──
    // Left arm: shoulder -> elbow -> wrist -> hand
    // Slight natural bend at elbow, slight forward curve
    const leftArmPts = [
      [-0.22, 1.86, -0.02],  // shoulder
      [-0.28, 1.72, 0.00],   // upper arm
      [-0.32, 1.56, 0.02],   // mid upper arm
      [-0.35, 1.40, 0.04],   // above elbow
      [-0.36, 1.28, 0.05],   // elbow
      [-0.35, 1.14, 0.03],   // below elbow
      [-0.34, 1.00, 0.01],   // mid forearm
      [-0.33, 0.86, -0.01],  // lower forearm
      [-0.32, 0.74, -0.02],  // wrist
      [-0.31, 0.66, -0.02],  // hand
    ];
    geos.push(makeLimb(leftArmPts, 0.050, 0.028, 14, 10));

    // Right arm (mirror)
    const rightArmPts = leftArmPts.map(p => [-p[0], p[1], p[2]]);
    geos.push(makeLimb(rightArmPts, 0.050, 0.028, 14, 10));

    // ── LEGS: TubeGeometry ──
    // Left leg: hip -> knee -> ankle -> foot
    const leftLegPts = [
      [-0.10, 0.86, 0.00],   // upper hip
      [-0.12, 0.72, 0.00],   // hip joint
      [-0.13, 0.56, 0.01],   // mid thigh
      [-0.13, 0.40, 0.02],   // lower thigh
      [-0.13, 0.26, 0.025],  // above knee
      [-0.13, 0.16, 0.02],   // knee
      [-0.13, 0.06, 0.015],  // below knee
      [-0.13, -0.10, 0.01],  // mid shin
      [-0.13, -0.26, 0.005], // lower shin
      [-0.13, -0.38, 0.00],  // ankle
      [-0.13, -0.44, 0.03],  // foot
    ];
    geos.push(makeLimb(leftLegPts, 0.080, 0.035, 16, 10));

    // Right leg (mirror)
    const rightLegPts = leftLegPts.map(p => [-p[0], p[1], p[2]]);
    geos.push(makeLimb(rightLegPts, 0.080, 0.035, 16, 10));

    // Merge all
    const merged = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    return merged;
  }

  function mergeGeometries(geometries) {
    let totalVerts = 0;
    for (const g of geometries) totalVerts += g.attributes.position.count;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const indices = [];
    let vertOffset = 0;

    for (const g of geometries) {
      const pos = g.attributes.position.array;
      const norm = g.attributes.normal ? g.attributes.normal.array : null;
      const count = g.attributes.position.count;

      positions.set(pos, vertOffset * 3);
      if (norm) normals.set(norm, vertOffset * 3);

      if (g.index) {
        const idx = g.index.array;
        for (let i = 0; i < idx.length; i++) indices.push(idx[i] + vertOffset);
      } else {
        // Non-indexed: create sequential indices
        for (let i = 0; i < count; i++) indices.push(vertOffset + i);
      }
      vertOffset += count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setIndex(indices);
    merged.computeVertexNormals(); // recompute for smooth shading across merged parts
    return merged;
  }

  /* ═══════════════════════════════════════════════════════════════
     DISSOLUTION PARTICLE SYSTEM
     Particles that gently detach from the mesh surface
     ═══════════════════════════════════════════════════════════════ */

  function buildDissolutionSystem(meshGeo, count) {
    const srcPos = meshGeo.attributes.position.array;
    const srcNorm = meshGeo.attributes.normal.array;
    const srcCount = meshGeo.attributes.position.count;

    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lives = new Float32Array(count);
    const sizes = new Float32Array(count);

    // Seed particles on random surface points
    for (let i = 0; i < count; i++) {
      const si = floor(hash(i) * srcCount) * 3;
      positions[i*3]   = srcPos[si];
      positions[i*3+1] = srcPos[si+1];
      positions[i*3+2] = srcPos[si+2];

      // Velocity along surface normal (gentle outward drift)
      const speed = 0.01 + hash(i + 1000) * 0.03;
      velocities[i*3]   = srcNorm[si]   * speed;
      velocities[i*3+1] = srcNorm[si+1] * speed + 0.005; // slight upward bias
      velocities[i*3+2] = srcNorm[si+2] * speed;

      lives[i] = hash(i + 2000); // random starting life phase
      sizes[i] = 1.5 + hash(i + 3000) * 2.5;
    }

    return { positions, velocities, lives, sizes, srcPos, srcNorm, srcCount };
  }

  /* ═══════════════════════════════════════════════════════════════
     SMOOTH AUDIO ANALYZER
     Heavy lerping for organic, fluid reactivity
     ═══════════════════════════════════════════════════════════════ */

  class SmoothAudio {
    constructor() {
      this.bass = 0; this.mid = 0; this.high = 0; this.energy = 0;
      // Extra-smooth versions for shader uniforms
      this.sBass = 0; this.sMid = 0; this.sHigh = 0; this.sEnergy = 0;
      this.bassHist = new Float32Array(120);
      this.bassIdx = 0;
      this.lastBeatT = -1;
      this.lastDropT = -10;
      this.beatImpact = 0;  // sharp on beat, smooth decay
      this.dropImpact = 0;
      this.beatCount = 0;
      this.isBeat = false;
      this.isDrop = false;
    }

    update(freqData, time, dt) {
      const norm = v => clamp((v + 100) / 100, 0, 1);
      let bS = 0, mS = 0, hS = 0, tS = 0;
      for (let i = 0; i < 64; i++) {
        const v = norm(freqData[i]);
        tS += v;
        if (i < 8) bS += v;
        else if (i < 28) mS += v;
        else hS += v;
      }
      const rawBass = bS / 8, rawMid = mS / 20, rawHigh = hS / 36, rawEnergy = tS / 64;

      // Medium smoothing for detection
      this.bass = lerp(this.bass, rawBass, 0.2);
      this.mid = lerp(this.mid, rawMid, 0.2);
      this.high = lerp(this.high, rawHigh, 0.2);
      this.energy = lerp(this.energy, rawEnergy, 0.2);

      // Heavy smoothing for shader uniforms (organic, delayed)
      const slow = 1.0 - pow(0.05, dt);
      this.sBass = lerp(this.sBass, rawBass, slow);
      this.sMid = lerp(this.sMid, rawMid, slow);
      this.sHigh = lerp(this.sHigh, rawHigh, slow);
      this.sEnergy = lerp(this.sEnergy, rawEnergy, slow);

      // Beat detection
      this.bassHist[this.bassIdx % 120] = rawBass;
      this.bassIdx++;
      let avgB = 0;
      for (let i = 0; i < 120; i++) avgB += this.bassHist[i];
      avgB /= 120;

      this.isBeat = rawBass > avgB * 1.35 + 0.08 && (time - this.lastBeatT) > 0.2;
      if (this.isBeat) {
        this.lastBeatT = time;
        this.beatCount++;
        this.beatImpact = 0.5 + rawBass * 0.5;
      }

      this.isDrop = rawBass > 0.6 && avgB < 0.25 && (time - this.lastDropT) > 5;
      if (this.isDrop) {
        this.lastDropT = time;
        this.dropImpact = 1.0;
      }

      // Decay impacts smoothly
      this.beatImpact *= pow(0.015, dt); // ~60ms to near-zero
      this.dropImpact *= pow(0.4, dt);   // ~1.7s half-life
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     CINEMATIC CAMERA
     ═══════════════════════════════════════════════════════════════ */

  class CinematicCamera {
    constructor(cam) {
      this.cam = cam;
      this.angle = 0;
      this.radius = 4.0;
      this.height = 1.3;
      this.lookY = 1.2;
      this.tR = 4.0; this.tH = 1.3; this.tLookY = 1.2;
      this.mode = 0;
      this.modeT = 0;
      this.modeDur = 12;
    }

    update(dt, audio) {
      this.modeT += dt;
      if (this.modeT > this.modeDur || audio.isDrop) {
        this.mode = (this.mode + 1) % 5;
        this.modeT = 0;
        this.modeDur = 10 + rand() * 10;
      }

      const t = performance.now() * 0.001;
      const e = audio.sEnergy;

      switch (this.mode) {
        case 0: // Slow front-facing orbit
          this.angle += (0.08 + e * 0.12) * dt;
          this.tR = 3.8;
          this.tH = 1.3 + sin(t * 0.12) * 0.2;
          this.tLookY = 1.2;
          break;
        case 1: // Closer, higher
          this.angle += (0.06 + e * 0.08) * dt;
          this.tR = 3.0;
          this.tH = 1.8;
          this.tLookY = 1.4;
          break;
        case 2: // Low dramatic
          this.angle += 0.05 * dt;
          this.tR = 3.5;
          this.tH = 0.3;
          this.tLookY = 1.3;
          break;
        case 3: // Wide establishing
          this.angle += (0.04 + e * 0.06) * dt;
          this.tR = 5.5;
          this.tH = 1.8 + sin(t * 0.08) * 0.5;
          this.tLookY = 1.0;
          break;
        case 4: // Close-up face level
          this.angle += sin(t * 0.2) * 0.02 * dt;
          this.tR = 2.2;
          this.tH = 2.2;
          this.tLookY = 2.1;
          break;
      }

      // Very smooth camera movement
      const s = 1.0 - pow(0.1, dt);
      this.radius = lerp(this.radius, this.tR, s);
      this.height = lerp(this.height, this.tH, s);
      this.lookY = lerp(this.lookY, this.tLookY, s);

      this.cam.position.x = sin(this.angle) * this.radius;
      this.cam.position.y = this.height;
      this.cam.position.z = cos(this.angle) * this.radius;
      this.cam.lookAt(0, this.lookY, 0);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     MAIN VISUALIZER
     ═══════════════════════════════════════════════════════════════ */

  class HumanoidVisualizer {
    constructor(container, audioAnalyser) {
      try { this._init(container, audioAnalyser); }
      catch (e) { console.error('HumanoidVisualizer init failed:', e); }
    }

    _init(container, audioAnalyser) {
      this.container = container;
      this.audioAnalyser = audioAnalyser;
      this.time = 0;
      this.lastNow = performance.now();

      // ── Scene ──
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x040412);
      this.scene.fog = new THREE.FogExp2(0x040412, 0.08);

      // ── Camera ──
      this.camera = new THREE.PerspectiveCamera(
        50, container.clientWidth / container.clientHeight, 0.1, 100
      );
      this.camera.position.set(0, 1.3, 4.0);

      // ── Renderer ──
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setPixelRatio(min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x040412, 1);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      Object.assign(this.renderer.domElement.style, {
        position: 'absolute', top: '0', left: '0', zIndex: '1',
      });
      container.appendChild(this.renderer.domElement);

      // ── Audio ──
      this.audio = new SmoothAudio();

      // ── Camera controller ──
      this.camCtrl = new CinematicCamera(this.camera);

      // ── Build humanoid mesh ──
      this.buildHumanoid();

      // ── Build dissolution particles ──
      this.buildDissolution();

      // ── Build atmosphere ──
      this.buildAtmosphere();

      // ── Lighting ──
      this.buildLighting();

      // ── Post-processing ──
      this.buildPostProcessing();

      // ── Resize ──
      this._onResize = () => {
        const w = container.clientWidth, h = container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        if (this.composer) {
          this.composer.setSize(w, h);
        }
      };
      window.addEventListener('resize', this._onResize);
    }

    /* ── Build humanoid ──────────────────────────────── */

    buildHumanoid() {
      const geo = buildHumanoidMesh();

      // Shared uniforms
      this.bodyUniforms = {
        uTime:       { value: 0 },
        uBass:       { value: 0 },
        uMid:        { value: 0 },
        uEnergy:     { value: 0 },
        uBeatImpact: { value: 0 },
        uBaseColor:  { value: new THREE.Color(0.18, 0.22, 0.28) },  // dark silver
        uRimColor:   { value: new THREE.Color(0.3, 0.45, 0.7) },    // muted blue rim
        uCoreColor:  { value: new THREE.Color(0.4, 0.42, 0.5) },    // subtle SSS
      };

      // Main body — translucent shader
      const bodyMat = new THREE.ShaderMaterial({
        vertexShader: bodyVertexShader,
        fragmentShader: bodyFragmentShader,
        uniforms: this.bodyUniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        blending: THREE.NormalBlending,
      });

      this.bodyMesh = new THREE.Mesh(geo, bodyMat);
      this.scene.add(this.bodyMesh);

      // Wireframe overlay
      const wireUniforms = {
        uTime:       this.bodyUniforms.uTime,
        uBass:       this.bodyUniforms.uBass,
        uEnergy:     this.bodyUniforms.uEnergy,
        uBeatImpact: this.bodyUniforms.uBeatImpact,
        uRimColor:   this.bodyUniforms.uRimColor,
      };

      const wireMat = new THREE.ShaderMaterial({
        vertexShader: wireVertexShader,
        fragmentShader: wireFragmentShader,
        uniforms: wireUniforms,
        transparent: true,
        wireframe: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      this.wireMesh = new THREE.Mesh(geo, wireMat);
      this.scene.add(this.wireMesh);
    }

    /* ── Dissolution particles ───────────────────────── */

    buildDissolution() {
      const DISS_COUNT = 8000;
      const meshGeo = this.bodyMesh.geometry;
      const data = buildDissolutionSystem(meshGeo, DISS_COUNT);
      this.dissData = data;
      this.dissCount = DISS_COUNT;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      geo.setAttribute('aLife', new THREE.BufferAttribute(data.lives, 1));
      geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
      geo.setAttribute('aVelocity', new THREE.BufferAttribute(data.velocities, 3));

      const mat = new THREE.ShaderMaterial({
        vertexShader: dissolutionVertexShader,
        fragmentShader: dissolutionFragmentShader,
        uniforms: {
          uTime: this.bodyUniforms.uTime,
          uEnergy: this.bodyUniforms.uEnergy,
          uColor: { value: new THREE.Color(0.5, 0.65, 0.85) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      this.dissPoints = new THREE.Points(geo, mat);
      this.scene.add(this.dissPoints);
    }

    /* ── Atmosphere ──────────────────────────────────── */

    buildAtmosphere() {
      // Fog particles — fine dust in the air
      const FOG_COUNT = 5000;
      const pos = new Float32Array(FOG_COUNT * 3);
      const col = new Float32Array(FOG_COUNT * 3);
      this.fogVel = new Float32Array(FOG_COUNT * 3);

      for (let i = 0; i < FOG_COUNT; i++) {
        pos[i*3]   = (hash(i + 500) - 0.5) * 16;
        pos[i*3+1] = (hash(i + 600) - 0.5) * 10;
        pos[i*3+2] = (hash(i + 700) - 0.5) * 16;

        const lum = 0.03 + hash(i + 800) * 0.03;
        col[i*3] = lum * 0.7; col[i*3+1] = lum * 0.8; col[i*3+2] = lum;

        this.fogVel[i*3]   = (hash(i + 900) - 0.5) * 0.003;
        this.fogVel[i*3+1] = hash(i + 1000) * 0.002;
        this.fogVel[i*3+2] = (hash(i + 1100) - 0.5) * 0.003;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

      const tex = createGlowTex(32);
      this.fogPts = new THREE.Points(geo, new THREE.PointsMaterial({
        size: 0.03,
        map: tex,
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }));
      this.fogTex = tex;
      this.scene.add(this.fogPts);
      this.FOG_COUNT = FOG_COUNT;
    }

    /* ── Lighting ────────────────────────────────────── */

    buildLighting() {
      // Ambient — very low, cool
      this.ambientLight = new THREE.AmbientLight(0x1a1a3a, 0.3);
      this.scene.add(this.ambientLight);

      // Key light — cool blue from above-right
      this.keyLight = new THREE.DirectionalLight(0x4488cc, 0.6);
      this.keyLight.position.set(2, 4, 3);
      this.scene.add(this.keyLight);

      // Rim light — pale blue from behind
      this.rimLight = new THREE.DirectionalLight(0x6699ff, 0.4);
      this.rimLight.position.set(-1, 2, -4);
      this.scene.add(this.rimLight);

      // Fill light — subtle warm from below (for SSS effect)
      this.fillLight = new THREE.PointLight(0x334466, 0.3, 8);
      this.fillLight.position.set(0, -1, 2);
      this.scene.add(this.fillLight);

      // Spot — dramatic top-down godray feel
      this.spotLight = new THREE.SpotLight(0x5577aa, 0.5, 12, PI * 0.15, 0.5, 1.5);
      this.spotLight.position.set(0, 6, 0);
      this.spotLight.target.position.set(0, 1.2, 0);
      this.scene.add(this.spotLight);
      this.scene.add(this.spotLight.target);

      // Floor
      const floorGeo = new THREE.PlaneGeometry(20, 20);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a1a,
        roughness: 0.9,
        metalness: 0.1,
        transparent: true,
        opacity: 0.4,
      });
      this.floor = new THREE.Mesh(floorGeo, floorMat);
      this.floor.rotation.x = -PI / 2;
      this.floor.position.y = -0.05;
      this.scene.add(this.floor);
    }

    /* ── Post-processing ─────────────────────────────── */

    buildPostProcessing() {
      this.composer = null;
      this.bloomPass = null;
      this.postUniforms = null;

      try {
        if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass) return;

        const w = this.container.clientWidth;
        const h = this.container.clientHeight;

        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));

        // Bloom — soft, cinematic
        this.bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(w, h), 0.25, 0.6, 0.7
        );
        this.composer.addPass(this.bloomPass);

        // Custom post pass (chromatic aberration + grain + color grading)
        if (THREE.ShaderPass) {
          this.postUniforms = {
            tDiffuse: { value: null },
            uTime: { value: 0 },
            uBeatImpact: { value: 0 },
            uEnergy: { value: 0 },
          };
          const postPass = new THREE.ShaderPass({
            uniforms: this.postUniforms,
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: postFragmentShader,
          });
          this.composer.addPass(postPass);
        }
      } catch (e) {
        console.warn('Post-processing setup failed, using direct render:', e);
        this.composer = null;
      }
    }

    /* ── Main update ─────────────────────────────────── */

    update(frequencyData, _waveformData) {
      if (!this.scene || !this.fogPts) return; // init failed or incomplete
      try { this._update(frequencyData); }
      catch (e) { console.error('HumanoidVisualizer update error:', e); }
    }

    _update(frequencyData) {
      const now = performance.now();
      const dt = min(0.05, (now - this.lastNow) * 0.001);
      this.lastNow = now;
      this.time += dt;

      // Audio analysis with heavy smoothing
      this.audio.update(frequencyData, this.time, dt);
      const a = this.audio;

      // Update shader uniforms (using extra-smooth values)
      this.bodyUniforms.uTime.value = this.time;
      this.bodyUniforms.uBass.value = a.sBass;
      this.bodyUniforms.uMid.value = a.sMid;
      this.bodyUniforms.uEnergy.value = a.sEnergy;
      this.bodyUniforms.uBeatImpact.value = a.beatImpact;

      // Subtle body rotation — slow, hypnotic
      const rotSpeed = 0.05 + a.sEnergy * 0.08;
      this.bodyMesh.rotation.y += rotSpeed * dt;
      this.wireMesh.rotation.y = this.bodyMesh.rotation.y;
      this.dissPoints.rotation.y = this.bodyMesh.rotation.y;

      // Beat: slight body scale pulse
      const scl = 1.0 + a.beatImpact * 0.02;
      this.bodyMesh.scale.setScalar(scl);
      this.wireMesh.scale.setScalar(scl);

      // Update dissolution particles
      this.updateDissolution(dt, a);

      // Update fog
      this.updateFog(dt, a);

      // Update lighting intensity
      this.keyLight.intensity = 0.3 + a.sBass * 0.15;
      this.rimLight.intensity = 0.2 + a.sEnergy * 0.15 + a.beatImpact * 0.1;
      this.spotLight.intensity = 0.25 + a.sBass * 0.15;

      // Bloom reacts to energy
      if (this.bloomPass) {
        this.bloomPass.strength = 0.2 + a.sEnergy * 0.15 + a.beatImpact * 0.1;
      }

      // Post-processing uniforms
      if (this.postUniforms) {
        this.postUniforms.uTime.value = this.time;
        this.postUniforms.uBeatImpact.value = a.beatImpact;
        this.postUniforms.uEnergy.value = a.sEnergy;
      }

      // Camera
      this.camCtrl.update(dt, a);

      // Render
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }

    updateDissolution(dt, audio) {
      const pos = this.dissPoints.geometry.attributes.position.array;
      const lives = this.dissPoints.geometry.attributes.aLife.array;
      const data = this.dissData;
      const n = this.dissCount;

      const emitRate = 0.3 + audio.sEnergy * 0.7; // more particles emitted with energy

      for (let i = 0; i < n; i++) {
        const i3 = i * 3;

        // Advance life
        lives[i] += dt * (0.15 + audio.sEnergy * 0.3);

        // When life expires, respawn at random mesh surface point
        if (lives[i] > 1.0) {
          lives[i] = 0;
          const si = floor(hash(i + this.time * 100) * data.srcCount) * 3;
          pos[i3]   = data.srcPos[si];
          pos[i3+1] = data.srcPos[si+1];
          pos[i3+2] = data.srcPos[si+2];

          // New velocity along normal
          const speed = 0.008 + hash(i + this.time * 50) * 0.025 + audio.sBass * 0.02;
          data.velocities[i3]   = data.srcNorm[si]   * speed;
          data.velocities[i3+1] = data.srcNorm[si+1] * speed + 0.003;
          data.velocities[i3+2] = data.srcNorm[si+2] * speed;
        }

        // Move
        pos[i3]   += data.velocities[i3]   * (1 + audio.sEnergy * 2);
        pos[i3+1] += data.velocities[i3+1] * (1 + audio.sEnergy * 2);
        pos[i3+2] += data.velocities[i3+2] * (1 + audio.sEnergy * 2);

        // Gentle drift
        data.velocities[i3+1] += 0.00005; // slight upward acceleration
        data.velocities[i3]   *= 0.998;   // slow deceleration
        data.velocities[i3+1] *= 0.998;
        data.velocities[i3+2] *= 0.998;
      }

      this.dissPoints.geometry.attributes.position.needsUpdate = true;
      this.dissPoints.geometry.attributes.aLife.needsUpdate = true;
    }

    updateFog(dt, audio) {
      const pos = this.fogPts.geometry.attributes.position.array;
      const n = this.FOG_COUNT;

      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        pos[i3]   += this.fogVel[i3]   * (1 + audio.sEnergy);
        pos[i3+1] += this.fogVel[i3+1] * (1 + audio.sEnergy);
        pos[i3+2] += this.fogVel[i3+2] * (1 + audio.sEnergy);

        // Respawn if out of bounds
        if (abs(pos[i3]) > 8 || pos[i3+1] > 5 || pos[i3+1] < -5) {
          pos[i3]   = (hash(i + this.time * 10) - 0.5) * 16;
          pos[i3+1] = (hash(i + this.time * 10 + 100) - 0.5) * 10;
          pos[i3+2] = (hash(i + this.time * 10 + 200) - 0.5) * 16;
        }
      }

      this.fogPts.geometry.attributes.position.needsUpdate = true;
      this.fogPts.material.opacity = 0.08 + audio.sEnergy * 0.1;
    }

    /* ── Dispose ──────────────────────────────────────── */

    dispose() {
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      try {
        if (this.bodyMesh) { this.bodyMesh.geometry.dispose(); this.bodyMesh.material.dispose(); }
        if (this.wireMesh) this.wireMesh.material.dispose();
        if (this.dissPoints) { this.dissPoints.geometry.dispose(); this.dissPoints.material.dispose(); }
        if (this.fogPts) { this.fogPts.geometry.dispose(); this.fogPts.material.dispose(); }
        if (this.fogTex) this.fogTex.dispose();
        if (this.floor) { this.floor.geometry.dispose(); this.floor.material.dispose(); }
        if (this.composer) {
          this.composer.renderTarget1.dispose();
          this.composer.renderTarget2.dispose();
        }
        if (this.renderer) {
          this.renderer.dispose();
          if (this.renderer.domElement.parentNode)
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      } catch (e) { console.warn('Dispose error:', e); }
    }
  }

  window.HumanoidVisualizer = HumanoidVisualizer;
})();
