/**
 * Julia Set Fractal Visualizer
 * 3D audio-reactive Julia set rendered via raymarching
 */

(function () {
  'use strict';

  class JuliaSetVisualizer {
    constructor(container, audioAnalyser) {
      this.container = container;
      this.audioAnalyser = audioAnalyser;
      
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      );
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setClearColor(0x000000, 1);
      container.appendChild(this.renderer.domElement);
      
      this.camera.position.z = 1;
      
      this.setup();
      this.setupResize();
    }

    setup() {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -1, -1, 0,
        1, -1, 0,
        1, 1, 0,
        -1, 1, 0,
      ]);
      const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      this.material = new THREE.RawShaderMaterial({
        vertexShader: this.vertexShader(),
        fragmentShader: this.fragmentShader(),
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(this.container.clientWidth, this.container.clientHeight) },
          uCx: { value: -0.7 },
          uCy: { value: 0.27015 },
          uZoom: { value: 1.0 },
          uRotation: { value: 0.0 },
          uBass: { value: 0.0 },
          uMids: { value: 0.0 },
          uHighs: { value: 0.0 },
        },
        transparent: true,
      });

      this.mesh = new THREE.Mesh(geometry, this.material);
      this.scene.add(this.mesh);
    }

    vertexShader() {
      return `
        precision highp float;
        attribute vec3 position;
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `;
    }

    fragmentShader() {
      return `
        precision highp float;
        
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uCx;
        uniform float uCy;
        uniform float uZoom;
        uniform float uRotation;
        uniform float uBass;
        uniform float uMids;
        uniform float uHighs;
        
        const int MAX_ITERATIONS = 256;
        const float ESCAPE_RADIUS = 2.0;
        
        // Smooth color based on iteration count
        vec3 colorFromIteration(float iter, float smooth) {
          vec3 col = 0.5 + 0.5 * cos(3.14159 * (iter + 0.5 * sin(uTime)));
          
          // Add frequency coloring
          col.r += uHighs * 0.3;
          col.g += uMids * 0.3;
          col.b += uBass * 0.3;
          
          return col * smooth;
        }
        
        void main() {
          // Normalize coordinates
          vec2 uv = gl_FragCoord.xy / uResolution.xy;
          uv = uv * 2.0 - 1.0;
          uv.x *= uResolution.x / uResolution.y;
          
          // Apply zoom and rotation
          uv *= uZoom;
          float angle = uRotation;
          uv = vec2(cos(angle) * uv.x - sin(angle) * uv.y, sin(angle) * uv.x + cos(angle) * uv.y);
          
          // Julia set iteration
          vec2 z = uv;
          vec2 c = vec2(uCx, uCy);
          
          float iter = 0.0;
          for (int i = 0; i < MAX_ITERATIONS; i++) {
            if (dot(z, z) > ESCAPE_RADIUS * ESCAPE_RADIUS) break;
            
            // z = z^2 + c
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            iter = float(i);
          }
          
          // Smooth iteration count
          float smooth = 1.0;
          if (dot(z, z) > ESCAPE_RADIUS * ESCAPE_RADIUS) {
            float mag = length(z);
            smooth = 1.0 - log(log(mag)) / log(2.0);
          }
          
          vec3 col = colorFromIteration(iter, smooth);
          gl_FragColor = vec4(col, 1.0);
        }
      `;
    }

    update(frequencyData, waveformData) {
      // Update uniforms based on audio
      this.material.uniforms.uTime.value += 0.016;
      
      // Extract frequency bands
      const bass = frequencyData.slice(0, 4).reduce((a, b) => a + b) / 4 / 255;
      const mids = frequencyData.slice(10, 30).reduce((a, b) => a + b) / 20 / 255;
      const highs = frequencyData.slice(40, 64).reduce((a, b) => a + b) / 24 / 255;
      
      this.material.uniforms.uBass.value = bass;
      this.material.uniforms.uMids.value = mids;
      this.material.uniforms.uHighs.value = highs;
      
      // Modulate Julia parameters with audio
      this.material.uniforms.uCx.value = -0.7 + bass * 0.2;
      this.material.uniforms.uCy.value = 0.27015 + mids * 0.1;
      this.material.uniforms.uZoom.value = 1.0 + highs * 2.0;
      this.material.uniforms.uRotation.value = this.material.uniforms.uTime.value * 0.1;
      
      this.renderer.render(this.scene, this.camera);
    }

    setupResize() {
      window.addEventListener('resize', () => {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.material.uniforms.uResolution.value.set(w, h);
      });
    }

    dispose() {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
  }

  window.JuliaSetVisualizer = JuliaSetVisualizer;
})();
