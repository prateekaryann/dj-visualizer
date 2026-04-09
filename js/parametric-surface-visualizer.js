/**
 * Parametric Surface Visualizer
 * Audio-reactive mathematical surfaces (Torus, Klein Bottle, etc.)
 */

(function () {
  'use strict';

  class ParametricSurfaceVisualizer {
    constructor(container, audioAnalyser) {
      this.container = container;
      this.audioAnalyser = audioAnalyser;
      
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x000000);
      
      this.camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      );
      this.camera.position.z = 4;
      
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setClearColor(0x000000, 1);
      container.appendChild(this.renderer.domElement);
      
      this.time = 0;
      this.currentSurface = 'torus';
      this.mesh = null;
      
      this.setup();
      this.setupResize();
    }

    setup() {
      this.createLights();
      this.updateSurface();
    }

    createLights() {
      const light1 = new THREE.PointLight(0xff00ff, 1, 100);
      light1.position.set(5, 5, 5);
      this.scene.add(light1);
      
      const light2 = new THREE.PointLight(0x00ffff, 1, 100);
      light2.position.set(-5, -5, 5);
      this.scene.add(light2);
      
      const ambientLight = new THREE.AmbientLight(0x444444);
      this.scene.add(ambientLight);
    }

    updateSurface() {
      if (this.mesh) this.scene.remove(this.mesh);
      
      const geometry = this.generateSurfaceGeometry();
      
      const material = new THREE.MeshPhongMaterial({
        emissive: 0x000000,
        wireframe: false,
        side: THREE.DoubleSide,
        flatShading: false,
      });
      
      this.mesh = new THREE.Mesh(geometry, material);
      this.scene.add(this.mesh);
    }

    generateSurfaceGeometry() {
      const geometry = new THREE.BufferGeometry();
      
      const uSegments = 64;
      const vSegments = 64;
      
      const vertices = [];
      const indices = [];
      const colors = [];
      
      for (let i = 0; i <= uSegments; i++) {
        const u = (i / uSegments) * Math.PI * 2;
        
        for (let j = 0; j <= vSegments; j++) {
          const v = (j / vSegments) * Math.PI * 2;
          
          const point = this.evaluateSurface(u, v);
          
          vertices.push(point.x, point.y, point.z);
          
          // Color based on position
          const hue = (i / uSegments);
          const rgb = this.hslToRgb(hue, 0.7, 0.5);
          colors.push(rgb.r, rgb.g, rgb.b);
        }
      }
      
      // Create triangles
      for (let i = 0; i < uSegments; i++) {
        for (let j = 0; j < vSegments; j++) {
          const a = i * (vSegments + 1) + j;
          const b = a + 1;
          const c = a + (vSegments + 1);
          const d = c + 1;
          
          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(vertices), 3
      ));
      geometry.setAttribute('color', new THREE.BufferAttribute(
        new Float32Array(colors), 3
      ));
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
      
      geometry.computeVertexNormals();
      
      return geometry;
    }

    evaluateSurface(u, v) {
      const surface = this.currentSurface;
      
      switch (surface) {
        case 'torus':
          return this.surfaceTorus(u, v);
        case 'kleinBottle':
          return this.surfaceKleinBottle(u, v);
        case 'twistedTorus':
          return this.surfaceTwistedTorus(u, v);
        case 'boySurface':
          return this.surfaceBoySurface(u, v);
        default:
          return this.surfaceTorus(u, v);
      }
    }

    surfaceTorus(u, v) {
      const R = 2; // Major radius
      const r = 0.8; // Minor radius
      
      const distortion = Math.sin(this.time * 0.5) * 0.2;
      
      return {
        x: (R + r * Math.cos(v)) * Math.cos(u) * (1 + distortion),
        y: r * Math.sin(v) * (1 + distortion),
        z: (R + r * Math.cos(v)) * Math.sin(u) * (1 + distortion),
      };
    }

    surfaceKleinBottle(u, v) {
      const scale = 1.5;
      
      return {
        x: (2 + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.cos(u) * scale,
        y: Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v) * scale,
        z: (2 + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.sin(u) * scale,
      };
    }

    surfaceTwistedTorus(u, v) {
      const R = 2;
      const r = 0.8;
      const twist = Math.sin(this.time) * Math.PI;
      
      const vTwisted = v + twist * Math.sin(u);
      
      return {
        x: (R + r * Math.cos(vTwisted)) * Math.cos(u),
        y: r * Math.sin(vTwisted),
        z: (R + r * Math.cos(vTwisted)) * Math.sin(u),
      };
    }

    surfaceBoySurface(u, v) {
      // Parametrization of Boy's surface (Möbius-like but orientable)
      const scale = 1.2;
      
      const x = (Math.cos(v) * Math.cos(u) - Math.cos(2 * v) * Math.sin(u)) * scale;
      const y = (Math.sin(v) * Math.cos(u) + Math.cos(2 * v) * Math.sin(u)) * scale;
      const z = Math.sin(u) * scale;
      
      return { x, y, z };
    }

    hslToRgb(h, s, l) {
      let r, g, b;
      
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      
      return { r, g, b };
    }

    update(frequencyData, waveformData) {
      this.time += 0.016;
      
      // Rotate mesh
      if (this.mesh) {
        this.mesh.rotation.x += 0.005;
        this.mesh.rotation.y += 0.008;
      }
      
      // Extract frequency bands
      const bass = frequencyData.slice(0, 4).reduce((a, b) => a + b) / 4 / 255;
      const mids = frequencyData.slice(10, 30).reduce((a, b) => a + b) / 20 / 255;
      const highs = frequencyData.slice(40, 64).reduce((a, b) => a + b) / 24 / 255;
      
      // Switch surfaces based on frequency
      if (bass > 0.7) {
        if (this.currentSurface !== 'torus') {
          this.currentSurface = 'torus';
          this.updateSurface();
        }
      } else if (mids > 0.6) {
        if (this.currentSurface !== 'kleinBottle') {
          this.currentSurface = 'kleinBottle';
          this.updateSurface();
        }
      } else if (highs > 0.5) {
        if (this.currentSurface !== 'twistedTorus') {
          this.currentSurface = 'twistedTorus';
          this.updateSurface();
        }
      } else {
        if (this.currentSurface !== 'boySurface') {
          this.currentSurface = 'boySurface';
          this.updateSurface();
        }
      }
      
      // Scale based on audio
      if (this.mesh) {
        this.mesh.scale.set(
          1 + bass * 0.3,
          1 + mids * 0.2,
          1 + highs * 0.2
        );
      }
      
      this.renderer.render(this.scene, this.camera);
    }

    setupResize() {
      window.addEventListener('resize', () => {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      });
    }

    dispose() {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
  }

  window.ParametricSurfaceVisualizer = ParametricSurfaceVisualizer;
})();
