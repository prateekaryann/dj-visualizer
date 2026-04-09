/**
 * Metaball Organic Blob Visualizer
 * Audio-reactive organic shapes using implicit surfaces
 */

(function () {
  'use strict';

  class MetaballVisualizer {
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
      this.camera.position.z = 3;
      
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setClearColor(0x000000, 1);
      container.appendChild(this.renderer.domElement);
      
      // Metaballs
      this.metaballs = [
        new MetaballParticle(0, 0, 0, { r: 0.2, g: 0.5, b: 1.0 }),
        new MetaballParticle(1, 0, 0, { r: 1.0, g: 0.2, b: 0.5 }),
        new MetaballParticle(-1, 0, 0, { r: 0.5, g: 1.0, b: 0.2 }),
        new MetaballParticle(0, 1, 0, { r: 1.0, g: 1.0, b: 0.2 }),
        new MetaballParticle(0, -1, 0, { r: 0.8, g: 0.2, b: 1.0 }),
      ];
      
      this.time = 0;
      this.mesh = null;
      
      this.setup();
      this.setupResize();
    }

    setup() {
      // Create the metaball surface using marching cubes
      this.updateGeometry();
    }

    updateGeometry() {
      // Remove old mesh
      if (this.mesh) this.scene.remove(this.mesh);
      
      // Generate surface using simple marching cubes
      const geometry = this.generateMetaballGeometry();
      
      const material = new THREE.MeshPhongMaterial({
        emissive: 0x444444,
        wireframe: false,
        side: THREE.DoubleSide,
      });
      
      this.mesh = new THREE.Mesh(geometry, material);
      this.scene.add(this.mesh);
    }

    generateMetaballGeometry() {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      const indices = [];
      const colors = [];
      
      const gridSize = 24;
      const cellSize = 0.3;
      const threshold = 0.5;
      
      let vertexIndex = 0;
      
      // Create grid of points
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          for (let z = 0; z < gridSize; z++) {
            const px = (x - gridSize / 2) * cellSize;
            const py = (y - gridSize / 2) * cellSize;
            const pz = (z - gridSize / 2) * cellSize;
            
            const value = this.evaluateMetaballs(px, py, pz);
            
            if (value > threshold) {
              vertices.push(px, py, pz);
              
              // Color based on which metaball is closest
              const closestBall = this.getClosestMetaball(px, py, pz);
              const color = closestBall.color;
              colors.push(color.r, color.g, color.b);
              vertexIndex++;
            }
          }
        }
      }
      
      // Simple connectivity (just create triangles from points)
      for (let i = 0; i < vertices.length / 3 - 3; i++) {
        indices.push(i, i + 1, i + 2);
        if ((i + 3) * 3 < vertices.length) {
          indices.push(i, i + 2, i + 3);
        }
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(vertices), 3
      ));
      geometry.setAttribute('color', new THREE.BufferAttribute(
        new Float32Array(colors), 3
      ));
      
      if (indices.length > 0) {
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
      }
      
      geometry.computeVertexNormals();
      
      return geometry;
    }

    evaluateMetaballs(x, y, z) {
      let value = 0;
      for (const ball of this.metaballs) {
        const dx = x - ball.x;
        const dy = y - ball.y;
        const dz = z - ball.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);
        
        // Wyvill brothers' polynomial (smooth)
        if (dist < ball.radius) {
          const r = dist / ball.radius;
          value += ball.strength * (1 - r * r) * (1 - r * r) * (1 - r * r);
        }
      }
      return value;
    }

    getClosestMetaball(x, y, z) {
      let closest = this.metaballs[0];
      let minDist = Infinity;
      
      for (const ball of this.metaballs) {
        const dx = x - ball.x;
        const dy = y - ball.y;
        const dz = z - ball.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < minDist) {
          minDist = dist;
          closest = ball;
        }
      }
      
      return closest;
    }

    update(frequencyData, waveformData) {
      this.time += 0.016;
      
      // Extract frequency bands
      const bass = frequencyData.slice(0, 4).reduce((a, b) => a + b) / 4 / 255;
      const mids = frequencyData.slice(10, 30).reduce((a, b) => a + b) / 20 / 255;
      const highs = frequencyData.slice(40, 64).reduce((a, b) => a + b) / 24 / 255;
      
      // Update metaball parameters based on audio
      this.metaballs[0].radius = 0.3 + bass * 0.5;
      this.metaballs[0].strength = 0.8 + bass * 0.5;
      
      this.metaballs[1].radius = 0.25 + mids * 0.3;
      this.metaballs[1].strength = 0.6 + mids * 0.4;
      
      this.metaballs[2].radius = 0.25 + mids * 0.3;
      this.metaballs[2].strength = 0.6 + mids * 0.4;
      
      // Orbit metaballs
      for (let i = 0; i < this.metaballs.length; i++) {
        const angle = this.time * (0.5 + i * 0.1) + (i * Math.PI * 2 / this.metaballs.length);
        const radius = 0.8 + highs * 0.5;
        
        if (i === 0) {
          this.metaballs[i].x = 0;
          this.metaballs[i].y = 0;
          this.metaballs[i].z = 0;
        } else {
          this.metaballs[i].x = Math.cos(angle) * radius;
          this.metaballs[i].y = Math.sin(angle) * radius * 0.5;
          this.metaballs[i].z = Math.sin(angle * 0.5) * radius * 0.3;
        }
      }
      
      // Update geometry periodically (expensive, so skip some frames)
      if (Math.floor(this.time * 60) % 3 === 0) {
        this.updateGeometry();
      }
      
      // Rotate camera
      this.camera.position.x = Math.sin(this.time * 0.3) * 4;
      this.camera.position.y = Math.cos(this.time * 0.2) * 3;
      this.camera.lookAt(0, 0, 0);
      
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

  class MetaballParticle {
    constructor(x, y, z, color) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.color = color;
      this.radius = 0.3;
      this.strength = 0.8;
    }
  }

  window.MetaballVisualizer = MetaballVisualizer;
})();
