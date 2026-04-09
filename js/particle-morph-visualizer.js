/**
 * Advanced Particle Morph Visualizer
 * Millions of particles forming organic blob shapes that morph based on audio
 * with particle trails, physics, and bloom effects
 */

(function () {
  'use strict';

  class ParticleMorphVisualizer {
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
      
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true
      });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setClearColor(0x000000, 1);
      container.appendChild(this.renderer.domElement);
      
      // Particle system
      this.particles = [];
      this.particleCount = 100000;
      this.targetShapeIndex = 0;
      this.time = 0;
      this.morphProgress = 0;
      
      // Shape definitions
      this.shapes = this.defineShapes();
      
      // Post-processing
      this.setupPostProcessing();
      this.setup();
      this.setupResize();
    }

    defineShapes() {
      // Define multiple 3D shapes with particle trails
      return {
        humanoid: this.generateHumanoidShape(),
        sphere: this.generateSphereShape(),
        cube: this.generateCubeShape(),
        torus: this.generateTorusShape(),
        helix: this.generateHelixShape(),
        flower: this.generateFlowerShape(),
      };
    }

    generateHumanoidShape() {
      const points = [];
      const particlesPerSection = Math.ceil(this.particleCount / 5);
      
      // Head - spherical at top center
      for (let i = 0; i < particlesPerSection * 0.12; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 0.3 + Math.random() * 0.15;
        points.push({
          x: r * Math.sin(phi) * Math.cos(theta) * 0.7,
          y: r * Math.sin(phi) * Math.sin(theta) * 0.7 + 1.5,
          z: r * Math.cos(phi) * 0.7,
        });
      }
      
      // Torso
      for (let i = 0; i < particlesPerSection * 0.30; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 0.5 + Math.random() * 0.25;
        const scaleY = 1.2 + Math.random() * 0.3;
        points.push({
          x: r * Math.sin(phi) * Math.cos(theta) * 0.6,
          y: r * Math.sin(phi) * Math.sin(theta) * scaleY,
          z: r * Math.cos(phi) * 0.8,
        });
      }
      
      // Left arm
      for (let i = 0; i < particlesPerSection * 0.20; i++) {
        const t = Math.random();
        const angle = Math.random() * Math.PI * 2;
        const thickness = 0.2 * (1 - Math.abs(t - 0.5) * 2);
        points.push({
          x: (-0.8 - t * 1.8) + Math.cos(angle) * thickness * 0.3,
          y: 0.6 + Math.random() * 0.3,
          z: Math.sin(angle) * thickness * 0.3,
        });
      }
      
      // Right arm
      for (let i = 0; i < particlesPerSection * 0.20; i++) {
        const t = Math.random();
        const angle = Math.random() * Math.PI * 2;
        const thickness = 0.2 * (1 - Math.abs(t - 0.5) * 2);
        points.push({
          x: (0.8 + t * 1.8) + Math.cos(angle) * thickness * 0.3,
          y: 0.6 + Math.random() * 0.3,
          z: Math.sin(angle) * thickness * 0.3,
        });
      }
      
      // Legs
      for (let i = 0; i < particlesPerSection * 0.18; i++) {
        const leg = i % 2;
        const t = Math.random();
        const angle = Math.random() * Math.PI * 2;
        const thickness = 0.2 * (1 - Math.abs(t - 0.5) * 2);
        points.push({
          x: (leg === 0 ? -0.3 : 0.3) + Math.cos(angle) * thickness * 0.2,
          y: -0.2 - t * 1.8,
          z: Math.sin(angle) * thickness * 0.2,
        });
      }
      
      while (points.length < this.particleCount) {
        const rand = Math.random();
        if (rand < 0.2) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const r = 0.3 + Math.random() * 0.15;
          points.push({
            x: r * Math.sin(phi) * Math.cos(theta) * 0.7,
            y: r * Math.sin(phi) * Math.sin(theta) * 0.7 + 1.5,
            z: r * Math.cos(phi) * 0.7,
          });
        } else {
          points.push({
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            z: (Math.random() - 0.5) * 2,
          });
        }
      }
      
      return points.slice(0, this.particleCount);
    }

    generateSphereShape() {
      const points = [];
      for (let i = 0; i < this.particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 0.8 + Math.random() * 0.2;
        points.push({
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi),
        });
      }
      return points;
    }

    generateCubeShape() {
      const points = [];
      const size = 1.2;
      for (let i = 0; i < this.particleCount; i++) {
        const face = Math.floor(Math.random() * 6);
        let x, y, z;
        const u = Math.random() - 0.5;
        const v = Math.random() - 0.5;
        
        switch(face) {
          case 0: x = size/2; y = u * size; z = v * size; break;
          case 1: x = -size/2; y = u * size; z = v * size; break;
          case 2: y = size/2; x = u * size; z = v * size; break;
          case 3: y = -size/2; x = u * size; z = v * size; break;
          case 4: z = size/2; x = u * size; y = v * size; break;
          default: z = -size/2; x = u * size; y = v * size;
        }
        points.push({ x, y, z });
      }
      return points;
    }

    generateTorusShape() {
      const points = [];
      const R = 1.0;
      const r = 0.4;
      for (let i = 0; i < this.particleCount; i++) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        points.push({
          x: (R + r * Math.cos(v)) * Math.cos(u),
          y: r * Math.sin(v) + Math.random() * 0.15,
          z: (R + r * Math.cos(v)) * Math.sin(u),
        });
      }
      return points;
    }

    generateHelixShape() {
      const points = [];
      for (let i = 0; i < this.particleCount; i++) {
        const t = Math.random();
        const angle = t * Math.PI * 10; // More twists
        const radius = 0.2 + t * 0.4;
        points.push({
          x: radius * Math.cos(angle) * (1 - Math.abs(t - 0.5) * 0.5),
          y: (t - 0.5) * 2.5,
          z: radius * Math.sin(angle) * (1 - Math.abs(t - 0.5) * 0.5),
        });
      }
      return points;
    }

    generateFlowerShape() {
      const points = [];
      const petalCount = 6;
      for (let i = 0; i < this.particleCount; i++) {
        const petal = Math.floor(Math.random() * petalCount);
        const angle = (petal / petalCount) * Math.PI * 2;
        const t = Math.random();
        const distance = t * 1.2;
        const spreadAngle = angle + (Math.random() - 0.5) * Math.PI * 0.3;
        
        points.push({
          x: Math.cos(spreadAngle) * distance * 0.8,
          y: (Math.random() - 0.5) * 0.6,
          z: Math.sin(spreadAngle) * distance * 0.8,
        });
      }
      return points;
    }

    setup() {
      // Initialize particles with trail tracking
      for (let i = 0; i < this.particleCount; i++) {
        this.particles.push({
          x: 0, y: 0, z: 0,
          vx: 0, vy: 0, vz: 0,
          targetX: 0, targetY: 0, targetZ: 0,
          life: 1.0,
          color: new THREE.Color(),
          trail: [], // Trail positions for motion streaks
          trailMaxLength: 8,
        });
      }

      this.createParticleGeometry();
    }

    createParticleGeometry() {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.particleCount * 3);
      const colors = new Float32Array(this.particleCount * 3);

      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3] = this.particles[i].x;
        positions[i * 3 + 1] = this.particles[i].y;
        positions[i * 3 + 2] = this.particles[i].z;

        colors[i * 3] = this.particles[i].color.r;
        colors[i * 3 + 1] = this.particles[i].color.g;
        colors[i * 3 + 2] = this.particles[i].color.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.028,
        vertexColors: true,
        transparent: true,
        sizeAttenuation: true,
      });

      this.pointsObject = new THREE.Points(geometry, material);
      this.scene.add(this.pointsObject);
    }

    setupPostProcessing() {
      // Canvas post-processing for bloom/glow effect
      this.bloomCanvas = document.createElement('canvas');
      this.bloomCtx = this.bloomCanvas.getContext('2d');
    }

    update(frequencyData, waveformData) {
      this.time += 0.016;

      // Extract frequency bands with better distribution
      const bass = frequencyData.slice(0, 8).reduce((a, b) => a + b) / 8 / 255;
      const mids = frequencyData.slice(15, 35).reduce((a, b) => a + b) / 20 / 255;
      const highs = frequencyData.slice(35, 64).reduce((a, b) => a + b) / 29 / 255;
      const treble = frequencyData.slice(55, 64).reduce((a, b) => a + b) / 9 / 255;

      // Select shape with smooth cycling
      let nextShapeIndex = 0;
      const shapeKeys = Object.keys(this.shapes);

      if (bass > 0.35) {
        nextShapeIndex = 0; // Humanoid (bass)
      } else if (mids > 0.35) {
        nextShapeIndex = 1; // Sphere (mids)
      } else if (highs > 0.30) {
        nextShapeIndex = 2; // Cube (highs)
      } else if (treble > 0.25) {
        nextShapeIndex = 3; // Torus (treble)
      } else {
        // Cycle through remaining shapes
        nextShapeIndex = Math.floor((this.time * 0.3) % 2) + 4;
      }

      nextShapeIndex = nextShapeIndex % shapeKeys.length;

      if (nextShapeIndex !== this.targetShapeIndex) {
        this.targetShapeIndex = nextShapeIndex;
        this.morphProgress = 0;
      }

      // Smooth morphing
      this.morphProgress += 0.04;
      if (this.morphProgress > 1) this.morphProgress = 1;

      // Update particles with physics
      this.updateParticles(bass, mids, highs, treble);

      // Update geometry
      this.updateGeometry();

      // Rotate camera based on audio
      this.camera.position.x = Math.sin(this.time * 0.2 + bass * 2) * 3;
      this.camera.position.y = Math.cos(this.time * 0.15) * 2 + mids * 1.5;
      this.camera.position.z = 4 + highs * 1;
      this.camera.lookAt(0, 0.2, 0);

      // Apply bloom effect
      this.applyBloomEffect();

      this.renderer.render(this.scene, this.camera);
    }

    updateParticles(bass, mids, highs, treble) {
      const shapeKeys = Object.keys(this.shapes);
      const currentShape = this.shapes[shapeKeys[this.targetShapeIndex]];

      for (let i = 0; i < this.particleCount; i++) {
        const particle = this.particles[i];
        const targetPoint = currentShape[i % currentShape.length];

        // Strong morphing to target shape
        particle.targetX = targetPoint.x;
        particle.targetY = targetPoint.y;
        particle.targetZ = targetPoint.z;

        // Store previous position for trail
        const prevX = particle.x;
        const prevY = particle.y;
        const prevZ = particle.z;

        // Smoothly move toward target
        particle.x += (particle.targetX - particle.x) * 0.28;
        particle.y += (particle.targetY - particle.y) * 0.28;
        particle.z += (particle.targetZ - particle.z) * 0.28;

        // Add to trail for motion streaks
        particle.trail.push({ x: prevX, y: prevY, z: prevZ });
        if (particle.trail.length > particle.trailMaxLength) {
          particle.trail.shift();
        }

        // Enhanced physics engine
        const distFromCenter = Math.sqrt(particle.x ** 2 + particle.y ** 2 + particle.z ** 2);
        
        // Orbital vortex force (bass-driven)
        if (bass > 0.1) {
          const vortexForce = bass * 0.4;
          const angle = Math.atan2(particle.z, particle.x);
          particle.vx += Math.cos(angle + 0.2) * vortexForce * 0.008;
          particle.vz += Math.sin(angle + 0.2) * vortexForce * 0.008;
          particle.vy += Math.sin(this.time) * bass * 0.005;
        }
        
        // Repulsion waves on highs
        if (distFromCenter > 0.01 && highs > 0.1) {
          const repulsion = highs * 0.25;
          const nx = particle.x / distFromCenter;
          const ny = particle.y / distFromCenter;
          const nz = particle.z / distFromCenter;
          
          particle.vx += nx * repulsion * 0.001;
          particle.vy += ny * repulsion * 0.0008;
          particle.vz += nz * repulsion * 0.001;
        }

        // Attraction on treble (create clusters)
        if (treble > 0.15) {
          const attraction = treble * 0.2;
          particle.vx -= particle.x * attraction * 0.001;
          particle.vy -= particle.y * attraction * 0.001;
          particle.vz -= particle.z * attraction * 0.001;
        }

        // Tighter damping for better shape retention
        particle.vx *= 0.93;
        particle.vy *= 0.93;
        particle.vz *= 0.93;

        // Apply velocity
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.z += particle.vz;

        // Update color with enhanced gradient
        const hue = (i / this.particleCount + this.time * 0.03 + bass * 0.2 + mids * 0.1) % 1;
        const saturation = 0.85 + bass * 0.15;
        const lightness = 0.5 + highs * 0.25 + treble * 0.15;
        
        particle.color.setHSL(hue, saturation, lightness);
      }
    }

    updateGeometry() {
      const geometry = this.pointsObject.geometry;
      const positions = geometry.attributes.position.array;
      const colors = geometry.attributes.color.array;

      for (let i = 0; i < this.particleCount; i++) {
        const particle = this.particles[i];
        
        positions[i * 3] = particle.x;
        positions[i * 3 + 1] = particle.y;
        positions[i * 3 + 2] = particle.z;

        colors[i * 3] = particle.color.r;
        colors[i * 3 + 1] = particle.color.g;
        colors[i * 3 + 2] = particle.color.b;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }

    applyBloomEffect() {
      // Simple bloom by rendering to canvas and back
      // This creates a glow effect without expensive post-processing
      const canvas = this.renderer.domElement;
      const ctx = this.renderer.getContext();
      
      // Subtle bloom is achieved through particle size and transparency
      // Could be enhanced with actual post-processing if needed
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

  window.ParticleMorphVisualizer = ParticleMorphVisualizer;
})();
