/**
 * NeuroQuest: 3D Loss Landscape Mountain Playground (WebGL / Three.js)
 * Real-time 3D non-convex surface renderer, mathematical optimization simulator,
 * multi-optimizer race (SGD, Momentum, RMSprop, Adam), particle trajectory ribbons,
 * raycasting drop points, and live telemetry leaderboard.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { soundFx } from './sound_effects.js';
import confetti from 'canvas-confetti';

export const LANDSCAPE_PRESETS = [
  {
    id: 'beale',
    name: "Beale's Ravine",
    tag: 'Narrow Curved Canyon',
    description: 'A sharp, narrow curved valley with steep cliff walls. Standard SGD oscillates wildly across the walls while Adam navigates smoothly down the floor.',
    xRange: [-4.5, 4.5],
    yRange: [-4.5, 4.5],
    defaultStart: [-2.0, 2.5],
    globalMin: [3.0, 0.5],
    minVal: 0,
    heightScale: 0.28,
    formulaTex: 'f(x,y) = (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2',
    fn: (x, y) => {
      const t1 = 1.5 - x + x * y;
      const t2 = 2.25 - x + x * y * y;
      const t3 = 2.625 - x + x * y * y * y;
      const raw = t1 * t1 + t2 * t2 + t3 * t3;
      return Math.log1p(raw) * 3.5;
    },
    rawLoss: (x, y) => {
      const t1 = 1.5 - x + x * y;
      const t2 = 2.25 - x + x * y * y;
      const t3 = 2.625 - x + x * y * y * y;
      return t1 * t1 + t2 * t2 + t3 * t3;
    }
  },
  {
    id: 'rastrigin',
    name: "Rastrigin's Minefield",
    tag: 'Highly Multimodal',
    description: 'Perforated with dozens of treacherous local minima pits! Vanilla SGD gets permanently trapped in the nearest hole, while Momentum & Adam carry the inertia to escape.',
    xRange: [-4.5, 4.5],
    yRange: [-4.5, 4.5],
    defaultStart: [3.5, 3.2],
    globalMin: [0.0, 0.0],
    minVal: 0,
    heightScale: 0.35,
    formulaTex: 'f(x,y) = 20 + x^2 - 10\\cos(2\\pi x) + y^2 - 10\\cos(2\\pi y)',
    fn: (x, y) => {
      return 20 + (x * x - 10 * Math.cos(2 * Math.PI * x)) + (y * y - 10 * Math.cos(2 * Math.PI * y));
    },
    rawLoss: (x, y) => {
      return 20 + (x * x - 10 * Math.cos(2 * Math.PI * x)) + (y * y - 10 * Math.cos(2 * Math.PI * y));
    }
  },
  {
    id: 'rosenbrock',
    name: "Rosenbrock's Banana",
    tag: 'Flat Parabolic Valley',
    description: 'The infamous benchmark. Finding the parabolic groove is easy, but converging along the flat valley bottom to the global minimum requires high adaptive momentum.',
    xRange: [-2.2, 2.2],
    yRange: [-1.2, 3.2],
    defaultStart: [-1.5, 2.0],
    globalMin: [1.0, 1.0],
    minVal: 0,
    heightScale: 0.22,
    formulaTex: 'f(x,y) = (1 - x)^2 + 100(y - x^2)^2',
    fn: (x, y) => {
      const t1 = 1 - x;
      const t2 = y - x * x;
      const raw = t1 * t1 + 100 * t2 * t2;
      return Math.log1p(raw) * 4.0;
    },
    rawLoss: (x, y) => {
      const t1 = 1 - x;
      const t2 = y - x * x;
      return t1 * t1 + 100 * t2 * t2;
    }
  },
  {
    id: 'saddle',
    name: 'Saddle Point Col',
    tag: 'Zero Gradient Trap',
    description: 'At (0, 0) the gradient is completely zero, yet it is NOT a minimum! Curvature curves upward along X and downward along Y, testing saddle escape escapes.',
    xRange: [-3.2, 3.2],
    yRange: [-3.2, 3.2],
    defaultStart: [0.05, 0.8],
    globalMin: [0.0, -3.0],
    minVal: -4.5,
    heightScale: 0.45,
    formulaTex: 'f(x,y) = 0.5(x^2 - y^2) + 0.05(x^4 + y^4)',
    fn: (x, y) => {
      return 0.5 * (x * x - y * y) + 0.05 * (Math.pow(x, 4) + Math.pow(y, 4));
    },
    rawLoss: (x, y) => {
      return 0.5 * (x * x - y * y) + 0.05 * (Math.pow(x, 4) + Math.pow(y, 4));
    }
  },
  {
    id: 'ackley',
    name: "Ackley's Deep Abyss",
    tag: 'Flat Rim to Central Funnel',
    description: 'A nearly flat outer perimeter covered in high-frequency ripples that suddenly plunges like a black hole into a deep central global minimum.',
    xRange: [-4.0, 4.0],
    yRange: [-4.0, 4.0],
    defaultStart: [3.2, 2.8],
    globalMin: [0.0, 0.0],
    minVal: 0,
    heightScale: 0.42,
    formulaTex: 'f(x,y) = -20\\exp(-0.2\\sqrt{0.5(x^2+y^2)}) - \\exp(0.5(\\cos 2\\pi x + \\cos 2\\pi y)) + e + 20',
    fn: (x, y) => {
      const r = Math.sqrt(0.5 * (x * x + y * y));
      const t1 = -20 * Math.exp(-0.2 * r);
      const t2 = -Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y)));
      return t1 + t2 + Math.E + 20;
    },
    rawLoss: (x, y) => {
      const r = Math.sqrt(0.5 * (x * x + y * y));
      const t1 = -20 * Math.exp(-0.2 * r);
      const t2 = -Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y)));
      return t1 + t2 + Math.E + 20;
    }
  },
  {
    id: 'himmelblau',
    name: "Himmelblau's 4 Wells",
    tag: 'Quad-Modal Basins',
    description: 'Four identical, deep global minimum basins separated by high mountain ridges. Demonstrates multimodal basin of attraction depending on drop location.',
    xRange: [-5.0, 5.0],
    yRange: [-5.0, 5.0],
    defaultStart: [0.0, 0.0],
    globalMin: [3.0, 2.0],
    minVal: 0,
    heightScale: 0.16,
    formulaTex: 'f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2',
    fn: (x, y) => {
      const t1 = x * x + y - 11;
      const t2 = x + y * y - 7;
      const raw = t1 * t1 + t2 * t2;
      return Math.log1p(raw) * 3.8;
    },
    rawLoss: (x, y) => {
      const t1 = x * x + y - 11;
      const t2 = x + y * y - 7;
      return t1 * t1 + t2 * t2;
    }
  }
];

export const OPTIMIZERS = [
  {
    id: 'sgd',
    name: 'SGD',
    fullName: 'Standard Gradient Descent',
    colorHex: '#ef4444',
    colorThree: 0xef4444,
    textColor: '#f87171',
    enabled: true,
    desc: 'Vanilla step along steepest slope. Prone to severe oscillation across steep ravines.'
  },
  {
    id: 'momentum',
    name: 'Momentum',
    fullName: 'Polyak Heavy Ball Momentum',
    colorHex: '#06b6d4',
    colorThree: 0x06b6d4,
    textColor: '#22d3ee',
    enabled: true,
    desc: 'Builds velocity along flat valleys; barrels past saddle points and dampens lateral oscillations.'
  },
  {
    id: 'rmsprop',
    name: 'RMSprop',
    fullName: 'Root Mean Square Propagation',
    colorHex: '#a855f7',
    colorThree: 0xa855f7,
    textColor: '#c084fc',
    enabled: true,
    desc: 'Divides gradient by moving average of squared magnitudes; rescales elongated canyons.'
  },
  {
    id: 'adam',
    name: 'Adam',
    fullName: 'Adaptive Moment Estimation',
    colorHex: '#f59e0b',
    colorThree: 0xf59e0b,
    textColor: '#fbbf24',
    enabled: true,
    desc: 'Combines 1st & 2nd moment velocity with bias correction. The reigning industry champion.'
  }
];

export class LossLandscape3D {
  constructor(options = {}) {
    this.container = options.container;
    this.canvasContainer = options.canvasContainer;
    this.onAwardXp = options.onAwardXp || (() => {});
    this.onRecordStat = options.onRecordStat || (() => {});

    // State
    this.currentPreset = LANDSCAPE_PRESETS[0];
    this.activeOptimizers = new Set(['sgd', 'momentum', 'rmsprop', 'adam']);
    this.learningRate = 0.04;
    this.momentumGamma = 0.85;
    this.adamBeta1 = 0.9;
    this.adamBeta2 = 0.999;
    this.noiseStd = 0.0;
    this.maxSteps = 300;
    this.stepSpeedMs = 50; // Delay per step in autoplay

    this.isRunning = false;
    this.stepIndex = 0;
    this.timerId = null;

    // Drop point (x, y) in function domain
    this.startPoint = [...this.currentPreset.defaultStart];

    // Optimizer agent runtime states
    this.agentStates = {};

    // Three.js instances
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.mesh = null;
    this.wireframeMesh = null;
    this.beaconMesh = null;
    this.startPointMarker = null;
    this.marbleMeshes = {};
    this.trajectoryLines = {};
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.planeSize = 24;
    this.gridResolution = 110;

    this.wireframeVisible = false;
    this.cameraMode = 'perspective'; // 'perspective' | 'top'
    this.animationFrameId = null;
    this.hasCelebratedConvergence = false;
  }

  init() {
    if (!this.canvasContainer) return;
    this.setupThreeScene();
    this.rebuildLandscapeTerrain();
    this.resetSimulation();
    this.setupDOMControls();
    this.animate();
  }

  setupThreeScene() {
    const width = this.canvasContainer.clientWidth || 800;
    const height = this.canvasContainer.clientHeight || 560;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);
    this.scene.fog = new THREE.FogExp2(0x020617, 0.015);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(24, 28, 28);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clean previous canvas if any
    this.canvasContainer.innerHTML = '';
    this.canvasContainer.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera dipping below floor
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const blueRimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    blueRimLight.position.set(-20, 15, -20);
    this.scene.add(blueRimLight);

    // Floor grid
    const gridHelper = new THREE.GridHelper(40, 40, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.05;
    this.scene.add(gridHelper);

    // Window resize observer
    this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
    this.resizeObserver.observe(this.canvasContainer);

    // Surface click raycasting (drop point picker)
    this.renderer.domElement.addEventListener('pointerdown', (e) => this.onCanvasPointerDown(e));
  }

  onWindowResize() {
    if (!this.canvasContainer || !this.renderer || !this.camera) return;
    const width = this.canvasContainer.clientWidth;
    const height = this.canvasContainer.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Convert (x, y) in function domain to 3D world (wx, wy, wz)
  domainToWorld(x, y) {
    const p = this.currentPreset;
    const normX = (x - p.xRange[0]) / (p.xRange[1] - p.xRange[0]);
    const normY = (y - p.yRange[0]) / (p.yRange[1] - p.yRange[0]);

    const wx = (normX - 0.5) * this.planeSize;
    const wz = (normY - 0.5) * this.planeSize;
    const wy = p.fn(x, y) * p.heightScale;

    return { x: wx, y: wy, z: wz };
  }

  // Convert 3D world (wx, wz) back to domain (x, y)
  worldToDomain(wx, wz) {
    const p = this.currentPreset;
    const normX = wx / this.planeSize + 0.5;
    const normY = wz / this.planeSize + 0.5;

    const x = p.xRange[0] + normX * (p.xRange[1] - p.xRange[0]);
    const y = p.yRange[0] + normY * (p.yRange[1] - p.yRange[0]);

    return {
      x: Math.min(p.xRange[1], Math.max(p.xRange[0], x)),
      y: Math.min(p.yRange[1], Math.max(p.yRange[0], y))
    };
  }

  // Compute numerical gradient vector [df/dx, df/dy]
  getGradient(x, y) {
    const h = 0.0001;
    const fn = this.currentPreset.fn;
    const dfdx = (fn(x + h, y) - fn(x - h, y)) / (2 * h);
    const dfdy = (fn(x, y + h) - fn(x, y - h)) / (2 * h);

    // Optional mini-batch stochastic noise
    let noiseX = 0;
    let noiseY = 0;
    if (this.noiseStd > 0) {
      noiseX = (Math.random() - 0.5) * 2 * this.noiseStd;
      noiseY = (Math.random() - 0.5) * 2 * this.noiseStd;
    }

    return [dfdx + noiseX, dfdy + noiseY];
  }

  rebuildLandscapeTerrain() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.geometry.dispose();
      this.wireframeMesh.material.dispose();
    }
    if (this.beaconMesh) {
      this.scene.remove(this.beaconMesh);
    }
    if (this.startPointMarker) {
      this.scene.remove(this.startPointMarker);
    }

    const p = this.currentPreset;
    const geom = new THREE.PlaneGeometry(this.planeSize, this.planeSize, this.gridResolution, this.gridResolution);
    geom.rotateX(-Math.PI / 2); // Orient horizontal

    const pos = geom.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    // Find min and max height for smooth color normalization
    let minH = Infinity;
    let maxH = -Infinity;
    const heights = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i);
      const dom = this.worldToDomain(wx, wz);
      const h = p.fn(dom.x, dom.y) * p.heightScale;
      heights[i] = h;
      pos.setY(i, h);
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }

    const span = Math.max(0.001, maxH - minH);

    // Cyberpunk Heatmap: Deep Midnight Indigo -> Cyan -> Emerald -> Gold -> Hot Magenta
    for (let i = 0; i < count; i++) {
      const norm = (heights[i] - minH) / span; // 0 to 1
      let color = new THREE.Color();

      if (norm < 0.2) {
        // Deep indigo to electric cyan
        const t = norm / 0.2;
        color.setRGB(0.04 + 0.1 * t, 0.15 + 0.55 * t, 0.4 + 0.55 * t);
      } else if (norm < 0.5) {
        // Cyan to emerald
        const t = (norm - 0.2) / 0.3;
        color.setRGB(0.14 - 0.05 * t, 0.7 + 0.25 * t, 0.95 - 0.55 * t);
      } else if (norm < 0.8) {
        // Emerald to gold
        const t = (norm - 0.5) / 0.3;
        color.setRGB(0.09 + 0.85 * t, 0.95 - 0.2 * t, 0.4 - 0.3 * t);
      } else {
        // Gold to bright neon coral
        const t = (norm - 0.8) / 0.2;
        color.setRGB(0.94 + 0.05 * t, 0.75 - 0.5 * t, 0.1 + 0.4 * t);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    // Subtle Wireframe overlay for technical terrain aesthetic
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    this.wireframeMesh = new THREE.Mesh(geom, wireMat);
    this.wireframeMesh.visible = this.wireframeVisible;
    this.scene.add(this.wireframeMesh);

    // Global Minimum Beacon Light Tower
    this.buildGlobalMinBeacon();

    // Spawn Point Target Marker
    this.buildSpawnPointMarker();
  }

  buildGlobalMinBeacon() {
    const p = this.currentPreset;
    const minW = this.domainToWorld(p.globalMin[0], p.globalMin[1]);

    const beaconGroup = new THREE.Group();

    // Glowing vertical pillar
    const cylGeom = new THREE.CylinderGeometry(0.15, 0.15, 12, 16);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45
    });
    const cyl = new THREE.Mesh(cylGeom, cylMat);
    cyl.position.set(minW.x, minW.y + 6, minW.z);
    beaconGroup.add(cyl);

    // Crown Star
    const starGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const starMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const star = new THREE.Mesh(starGeom, starMat);
    star.position.set(minW.x, minW.y + 12, minW.z);
    beaconGroup.add(star);

    // Point light at optimal location
    const beaconLight = new THREE.PointLight(0x38bdf8, 2, 8);
    beaconLight.position.set(minW.x, minW.y + 1, minW.z);
    beaconGroup.add(beaconLight);

    this.beaconMesh = beaconGroup;
    this.scene.add(this.beaconMesh);
  }

  buildSpawnPointMarker() {
    if (this.startPointMarker) this.scene.remove(this.startPointMarker);

    const s = this.domainToWorld(this.startPoint[0], this.startPoint[1]);
    const group = new THREE.Group();

    // Concentric ring on terrain surface
    const ringGeom = new THREE.RingGeometry(0.4, 0.7, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(s.x, s.y + 0.1, s.z);
    group.add(ring);

    // Vertical arrow pole
    const arrowGeom = new THREE.ConeGeometry(0.35, 1.0, 16);
    arrowGeom.rotateX(Math.PI); // Point downward
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const arrow = new THREE.Mesh(arrowGeom, arrowMat);
    arrow.position.set(s.x, s.y + 2.2, s.z);
    group.add(arrow);

    this.startPointMarker = group;
    this.scene.add(this.startPointMarker);
  }

  resetSimulation() {
    this.pause();
    this.stepIndex = 0;
    this.hasCelebratedConvergence = false;

    // Remove old marbles and trajectory lines
    Object.values(this.marbleMeshes).forEach(m => this.scene.remove(m));
    Object.values(this.trajectoryLines).forEach(l => this.scene.remove(l));
    this.marbleMeshes = {};
    this.trajectoryLines = {};
    this.agentStates = {};

    const startX = this.startPoint[0];
    const startY = this.startPoint[1];
    const initialWorld = this.domainToWorld(startX, startY);

    OPTIMIZERS.forEach(opt => {
      if (!this.activeOptimizers.has(opt.id)) return;

      // Agent math state
      this.agentStates[opt.id] = {
        id: opt.id,
        name: opt.name,
        colorHex: opt.colorHex,
        x: startX,
        y: startY,
        loss: this.currentPreset.rawLoss(startX, startY),
        converged: false,
        convergedStep: null,
        history: [{ ...initialWorld }],
        // Optimizer specific variables
        velocity: [0, 0], // for momentum
        s: [0, 0], // for rmsprop
        m: [0, 0], // for adam 1st moment
        v: [0, 0], // for adam 2nd moment
        t: 0 // timestep
      };

      // 3D Marble sphere
      const sphereGeom = new THREE.SphereGeometry(0.42, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: opt.colorThree,
        emissive: opt.colorThree,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.8
      });
      const marble = new THREE.Mesh(sphereGeom, sphereMat);
      marble.position.set(initialWorld.x, initialWorld.y + 0.42, initialWorld.z);
      marble.castShadow = true;
      this.marbleMeshes[opt.id] = marble;
      this.scene.add(marble);

      // 3D Ribbon Trajectory Line
      const maxPts = this.maxSteps + 5;
      const positions = new Float32Array(maxPts * 3);
      positions[0] = initialWorld.x;
      positions[1] = initialWorld.y + 0.15;
      positions[2] = initialWorld.z;

      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      lineGeom.setDrawRange(0, 1);

      const lineMat = new THREE.LineBasicMaterial({
        color: opt.colorThree,
        linewidth: 3,
        transparent: true,
        opacity: 0.85
      });
      const line = new THREE.Line(lineGeom, lineMat);
      this.trajectoryLines[opt.id] = line;
      this.scene.add(line);
    });

    this.updateTelemetryHUD();
  }

  stepSimulation() {
    if (this.stepIndex >= this.maxSteps) {
      this.pause();
      return;
    }

    this.stepIndex++;
    const lr = this.learningRate;
    const p = this.currentPreset;
    let anyConvergedThisStep = false;

    OPTIMIZERS.forEach(opt => {
      if (!this.activeOptimizers.has(opt.id)) return;
      const agent = this.agentStates[opt.id];
      if (!agent || agent.converged) return;

      agent.t += 1;
      const [gx, gy] = this.getGradient(agent.x, agent.y);

      let stepX = 0;
      let stepY = 0;

      if (opt.id === 'sgd') {
        stepX = -lr * gx;
        stepY = -lr * gy;
      } else if (opt.id === 'momentum') {
        const gamma = this.momentumGamma;
        agent.velocity[0] = gamma * agent.velocity[0] + lr * gx;
        agent.velocity[1] = gamma * agent.velocity[1] + lr * gy;
        stepX = -agent.velocity[0];
        stepY = -agent.velocity[1];
      } else if (opt.id === 'rmsprop') {
        const beta = 0.9;
        const eps = 1e-8;
        agent.s[0] = beta * agent.s[0] + (1 - beta) * (gx * gx);
        agent.s[1] = beta * agent.s[1] + (1 - beta) * (gy * gy);
        stepX = -lr / (Math.sqrt(agent.s[0]) + eps) * gx;
        stepY = -lr / (Math.sqrt(agent.s[1]) + eps) * gy;
      } else if (opt.id === 'adam') {
        const b1 = this.adamBeta1;
        const b2 = this.adamBeta2;
        const eps = 1e-8;
        agent.m[0] = b1 * agent.m[0] + (1 - b1) * gx;
        agent.m[1] = b1 * agent.m[1] + (1 - b1) * gy;
        agent.v[0] = b2 * agent.v[0] + (1 - b2) * (gx * gx);
        agent.v[1] = b2 * agent.v[1] + (1 - b2) * (gy * gy);

        const mHat0 = agent.m[0] / (1 - Math.pow(b1, agent.t));
        const mHat1 = agent.m[1] / (1 - Math.pow(b1, agent.t));
        const vHat0 = agent.v[0] / (1 - Math.pow(b2, agent.t));
        const vHat1 = agent.v[1] / (1 - Math.pow(b2, agent.t));

        stepX = -lr / (Math.sqrt(vHat0) + eps) * mHat0;
        stepY = -lr / (Math.sqrt(vHat1) + eps) * mHat1;
      }

      // Safeguard against extreme NaN/infinity divergence explosion
      if (!isFinite(stepX) || !isFinite(stepY)) {
        stepX = 0;
        stepY = 0;
      }

      // Clamp step velocity to avoid teleporting across galaxy
      const maxDelta = 1.2;
      stepX = Math.min(maxDelta, Math.max(-maxDelta, stepX));
      stepY = Math.min(maxDelta, Math.max(-maxDelta, stepY));

      agent.x += stepX;
      agent.y += stepY;

      // Keep within domain bounds
      agent.x = Math.min(p.xRange[1], Math.max(p.xRange[0], agent.x));
      agent.y = Math.min(p.yRange[1], Math.max(p.yRange[0], agent.y));

      agent.loss = p.rawLoss(agent.x, agent.y);

      // Check convergence distance to global minimum
      const distToMin = Math.hypot(agent.x - p.globalMin[0], agent.y - p.globalMin[1]);
      if (distToMin < 0.25 || Math.abs(agent.loss - p.minVal) < 0.05) {
        agent.converged = true;
        agent.convergedStep = this.stepIndex;
        anyConvergedThisStep = true;
      }

      // Update 3D marble position
      const worldPos = this.domainToWorld(agent.x, agent.y);
      agent.history.push({ ...worldPos });

      const marble = this.marbleMeshes[opt.id];
      if (marble) {
        marble.position.set(worldPos.x, worldPos.y + 0.42, worldPos.z);
      }

      // Update trajectory ribbon
      const line = this.trajectoryLines[opt.id];
      if (line) {
        const positions = line.geometry.attributes.position.array;
        const idx = agent.history.length - 1;
        positions[idx * 3] = worldPos.x;
        positions[idx * 3 + 1] = worldPos.y + 0.15;
        positions[idx * 3 + 2] = worldPos.z;
        line.geometry.attributes.position.needsUpdate = true;
        line.geometry.setDrawRange(0, agent.history.length);
      }
    });

    if (anyConvergedThisStep && !this.hasCelebratedConvergence) {
      this.hasCelebratedConvergence = true;
      soundFx.playCelestialChime(920);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      this.onAwardXp(35, 'Optimization Marble Reached Global Minimum');
    }

    this.updateTelemetryHUD();

    if (this.stepIndex % 15 === 0) {
      soundFx.playBlip(560 + (this.stepIndex % 4) * 40, 0.015);
    }
  }

  play() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.onRecordStat('lossPlaygroundRuns');

    const tick = () => {
      if (!this.isRunning) return;
      this.stepSimulation();
      if (this.stepIndex < this.maxSteps && this.isRunning) {
        this.timerId = setTimeout(tick, this.stepSpeedMs);
      } else {
        this.pause();
      }
    };
    this.timerId = setTimeout(tick, this.stepSpeedMs);
    this.updatePlayPauseBtn();
  }

  pause() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.updatePlayPauseBtn();
  }

  updatePlayPauseBtn() {
    const btn = this.container ? this.container.querySelector('#btn-landscape-play') : null;
    if (!btn) return;
    if (this.isRunning) {
      btn.innerHTML = '<span>⏸</span> Pause';
      btn.classList.add('playing');
    } else {
      btn.innerHTML = '<span>▶</span> Roll Marbles';
      btn.classList.remove('playing');
    }
  }

  onCanvasPointerDown(e) {
    if (!this.mesh || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.mesh);

    if (intersects.length > 0) {
      const hit = intersects[0].point;
      const dom = this.worldToDomain(hit.x, hit.z);
      this.startPoint = [parseFloat(dom.x.toFixed(3)), parseFloat(dom.y.toFixed(3))];
      this.buildSpawnPointMarker();
      this.resetSimulation();
      soundFx.playBlip(780, 0.04);
    }
  }

  setLandscapePreset(presetId) {
    const found = LANDSCAPE_PRESETS.find(p => p.id === presetId);
    if (!found) return;
    this.currentPreset = found;
    this.startPoint = [...found.defaultStart];
    this.rebuildLandscapeTerrain();
    this.resetSimulation();
    this.renderPresetChips();
    this.updateFormulaCard();
    soundFx.playCelestialChime(700);
  }

  toggleOptimizer(optId) {
    if (this.activeOptimizers.has(optId)) {
      if (this.activeOptimizers.size > 1) {
        this.activeOptimizers.delete(optId);
      }
    } else {
      this.activeOptimizers.add(optId);
    }
    this.resetSimulation();
    this.renderOptimizerPills();
    soundFx.playBlip(620, 0.03);
  }

  setCameraView(mode) {
    this.cameraMode = mode;
    if (mode === 'top') {
      this.camera.position.set(0, 38, 0.001);
      this.controls.target.set(0, 0, 0);
    } else if (mode === 'side') {
      this.camera.position.set(38, 4, 0);
      this.controls.target.set(0, 4, 0);
    } else {
      // Perspective default
      this.camera.position.set(24, 28, 28);
      this.controls.target.set(0, 2, 0);
    }
    this.controls.update();
    soundFx.playBlip(520, 0.03);
  }

  toggleWireframe() {
    this.wireframeVisible = !this.wireframeVisible;
    if (this.wireframeMesh) this.wireframeMesh.visible = this.wireframeVisible;
    soundFx.playBlip(480, 0.03);
  }

  setupDOMControls() {
    if (!this.container) return;

    // Preset selector chips
    this.renderPresetChips();

    // Optimizer selector pills
    this.renderOptimizerPills();

    // Formula & Lore
    this.updateFormulaCard();

    // Play/Pause button
    const btnPlay = this.container.querySelector('#btn-landscape-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (this.isRunning) this.pause();
        else this.play();
      });
    }

    // Step forward button
    const btnStep = this.container.querySelector('#btn-landscape-step');
    if (btnStep) {
      btnStep.addEventListener('click', () => {
        this.pause();
        this.stepSimulation();
      });
    }

    // Reset button
    const btnReset = this.container.querySelector('#btn-landscape-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.resetSimulation();
        soundFx.playBlip(440, 0.04);
      });
    }

    // Learning rate slider
    const lrSlider = this.container.querySelector('#landscape-lr-slider');
    const lrValLabel = this.container.querySelector('#landscape-lr-val');
    if (lrSlider) {
      lrSlider.addEventListener('input', (e) => {
        this.learningRate = parseFloat(e.target.value);
        if (lrValLabel) lrValLabel.textContent = this.learningRate.toFixed(3);
      });
    }

    // Noise slider
    const noiseSlider = this.container.querySelector('#landscape-noise-slider');
    const noiseValLabel = this.container.querySelector('#landscape-noise-val');
    if (noiseSlider) {
      noiseSlider.addEventListener('input', (e) => {
        this.noiseStd = parseFloat(e.target.value);
        if (noiseValLabel) noiseValLabel.textContent = this.noiseStd.toFixed(2);
      });
    }

    // Camera view buttons
    const btnCamPersp = this.container.querySelector('#btn-cam-persp');
    if (btnCamPersp) btnCamPersp.addEventListener('click', () => this.setCameraView('perspective'));

    const btnCamTop = this.container.querySelector('#btn-cam-top');
    if (btnCamTop) btnCamTop.addEventListener('click', () => this.setCameraView('top'));

    const btnCamSide = this.container.querySelector('#btn-cam-side');
    if (btnCamSide) btnCamSide.addEventListener('click', () => this.setCameraView('side'));

    const btnWire = this.container.querySelector('#btn-toggle-wireframe');
    if (btnWire) btnWire.addEventListener('click', () => this.toggleWireframe());

    // Close button
    const btnClose = this.container.querySelector('#btn-close-landscape');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.closeModal());
    }

    // Container background click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.closeModal();
      }
    });
  }

  renderPresetChips() {
    const wrapper = this.container ? this.container.querySelector('#landscape-presets-wrapper') : null;
    if (!wrapper) return;

    wrapper.innerHTML = LANDSCAPE_PRESETS.map(p => `
      <button class="landscape-preset-chip ${p.id === this.currentPreset.id ? 'active' : ''}" data-id="${p.id}" title="${p.description}">
        <span class="chip-title">${p.name}</span>
        <span class="chip-tag">${p.tag}</span>
      </button>
    `).join('');

    wrapper.querySelectorAll('.landscape-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.setLandscapePreset(chip.dataset.id);
      });
    });
  }

  renderOptimizerPills() {
    const wrapper = this.container ? this.container.querySelector('#landscape-optimizers-wrapper') : null;
    if (!wrapper) return;

    wrapper.innerHTML = OPTIMIZERS.map(opt => {
      const active = this.activeOptimizers.has(opt.id);
      return `
        <button class="optimizer-toggle-pill ${active ? 'active' : 'inactive'}" data-id="${opt.id}" style="--pill-color: ${opt.colorHex}">
          <span class="pill-dot" style="background: ${opt.colorHex}"></span>
          <span class="pill-name">${opt.name}</span>
          <span class="pill-status">${active ? '✓' : '+'}</span>
        </button>
      `;
    }).join('');

    wrapper.querySelectorAll('.optimizer-toggle-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.toggleOptimizer(pill.dataset.id);
      });
    });
  }

  updateFormulaCard() {
    const titleEl = this.container ? this.container.querySelector('#landscape-formula-title') : null;
    const descEl = this.container ? this.container.querySelector('#landscape-formula-desc') : null;
    const minCoordEl = this.container ? this.container.querySelector('#landscape-min-coords') : null;
    const p = this.currentPreset;

    if (titleEl) titleEl.textContent = p.name;
    if (descEl) descEl.textContent = p.description;
    if (minCoordEl) {
      minCoordEl.innerHTML = `Global Minimum: <strong>(${p.globalMin[0]}, ${p.globalMin[1]})</strong> | Value: <strong>${p.minVal}</strong>`;
    }
  }

  updateTelemetryHUD() {
    const stepLabel = this.container ? this.container.querySelector('#landscape-step-label') : null;
    if (stepLabel) {
      stepLabel.textContent = `Step: ${this.stepIndex} / ${this.maxSteps}`;
    }

    const leaderboardBody = this.container ? this.container.querySelector('#landscape-leaderboard-body') : null;
    if (!leaderboardBody) return;

    const agents = Object.values(this.agentStates).sort((a, b) => a.loss - b.loss);

    leaderboardBody.innerHTML = agents.map((agent, rank) => {
      const opt = OPTIMIZERS.find(o => o.id === agent.id);
      const isWinner = agent.converged;
      const statusBadge = isWinner
        ? `<span class="badge-winner">🏆 Converged (${agent.convergedStep} steps)</span>`
        : `<span class="badge-running">Marching...</span>`;

      return `
        <tr class="leaderboard-row ${isWinner ? 'winner-row' : ''}">
          <td class="rank-col">#${rank + 1}</td>
          <td class="opt-col" style="color: ${agent.colorHex}">
            <span class="opt-legend-dot" style="background: ${agent.colorHex}"></span>
            <strong>${agent.name}</strong>
          </td>
          <td class="pos-col">(${agent.x.toFixed(2)}, ${agent.y.toFixed(2)})</td>
          <td class="loss-col"><strong>${agent.loss.toFixed(4)}</strong></td>
          <td class="status-col">${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.controls) this.controls.update();

    // Gentle beacon beacon rotation
    if (this.beaconMesh) {
      this.beaconMesh.rotation.y += 0.01;
    }

    // Marble pulse shimmer
    Object.values(this.marbleMeshes).forEach(marble => {
      if (marble.material.emissiveIntensity) {
        marble.material.emissiveIntensity = 0.5 + 0.2 * Math.sin(Date.now() * 0.005);
      }
    });

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  openModal() {
    if (!this.container) return;
    this.container.style.display = 'flex';
    this.init();
    requestAnimationFrame(() => {
      this.onWindowResize();
    });
    setTimeout(() => {
      this.onWindowResize();
    }, 280);
    soundFx.playDojoGong();
  }

  closeModal() {
    if (!this.container) return;
    this.pause();
    this.container.style.display = 'none';
    soundFx.playBlip(420, 0.05);
  }

  destroy() {
    this.pause();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
