/**
 * NeuroQuest: Celestial 20-Quest Constellation Galaxy Map
 * Interactive Celestial Tech Tree, Constellation Dependency Graph,
 * Starfield Particle Simulation, Pan/Zoom Camera, and Deep Lore Inspector.
 */

import { soundFx } from './sound_effects.js';

export const GALAXY_NODES = [
  // Phase 1: Foundations of Deep Learning (Sapphire Nebula)
  {
    id: 'quest-1',
    number: 1,
    roman: 'I',
    icon: '☕',
    title: 'Perceptrons & Decision Boundaries',
    subtitle: 'The Single Neuron & Linear Separability',
    tag: 'Foundations',
    phase: 1,
    phaseName: 'Phase 1: Foundations',
    nebula: 'sapphire',
    x: 180,
    y: 380,
    radius: 28,
    xp: 100,
    prereqs: []
  },
  {
    id: 'quest-2',
    number: 2,
    roman: 'II',
    icon: '⚡',
    title: 'Activation Sparks & Non-Linearity',
    subtitle: 'ReLU, Sigmoid, Tanh & Dying Neurons',
    tag: 'Activations',
    phase: 1,
    phaseName: 'Phase 1: Foundations',
    nebula: 'sapphire',
    x: 300,
    y: 260,
    radius: 28,
    xp: 150,
    prereqs: ['quest-1']
  },
  {
    id: 'quest-3',
    number: 3,
    roman: 'III',
    icon: '🏔️',
    title: 'Gradient Valleys & Loss Landscapes',
    subtitle: 'Optimization, Learning Rates & Saddle Points',
    tag: 'Optimization',
    phase: 1,
    phaseName: 'Phase 1: Foundations',
    nebula: 'sapphire',
    x: 430,
    y: 390,
    radius: 30,
    xp: 200,
    prereqs: ['quest-2']
  },
  {
    id: 'quest-4',
    number: 4,
    roman: 'IV',
    icon: '👁️',
    title: 'Convolutional Vision & Kernel Detectors',
    subtitle: 'Feature Maps, Edge Detectors & Weight Sharing',
    tag: 'Computer Vision',
    phase: 1,
    phaseName: 'Phase 1: Foundations',
    nebula: 'sapphire',
    x: 290,
    y: 580,
    radius: 28,
    xp: 150,
    prereqs: ['quest-3']
  },
  {
    id: 'quest-5',
    number: 5,
    roman: 'V',
    icon: '🔍',
    title: 'Pooling, Strides & Receptive Fields',
    subtitle: 'Spatial Downsampling & Translation Invariance',
    tag: 'CNN Vision',
    phase: 1,
    phaseName: 'Phase 1: Foundations',
    nebula: 'sapphire',
    x: 430,
    y: 680,
    radius: 28,
    xp: 150,
    prereqs: ['quest-4']
  },
  {
    id: 'quest-6',
    number: 6,
    roman: 'VI',
    icon: '🛡️',
    title: 'Regularization Arena & Overfitting',
    subtitle: 'Dropout, Weight Decay & Generalization',
    tag: 'Regularization',
    phase: 1,
    phaseName: 'Phase 1: Foundations',
    nebula: 'sapphire',
    x: 540,
    y: 530,
    radius: 28,
    xp: 150,
    prereqs: ['quest-5']
  },

  // Phase 2: The Attention Revolution & Architectures (Amethyst Nebula)
  {
    id: 'quest-7',
    number: 7,
    roman: 'VII',
    icon: '✨',
    title: 'Attention Machine & Self-Attention',
    subtitle: 'Query, Key, Value Matrices & Scaled Dot-Product',
    tag: 'Transformers',
    phase: 2,
    phaseName: 'Phase 2: Attention & GPT',
    nebula: 'amethyst',
    x: 700,
    y: 360,
    radius: 32,
    xp: 250,
    prereqs: ['quest-3', 'quest-6']
  },
  {
    id: 'quest-8',
    number: 8,
    roman: 'VIII',
    icon: '📚',
    title: 'Words into Vectors & Tokenization',
    subtitle: 'Word2Vec, BPE, Subwords & Positional Encoding',
    tag: 'NLP & Vectors',
    phase: 2,
    phaseName: 'Phase 2: Attention & GPT',
    nebula: 'amethyst',
    x: 740,
    y: 560,
    radius: 28,
    xp: 200,
    prereqs: ['quest-7']
  },
  {
    id: 'quest-9',
    number: 9,
    roman: 'IX',
    icon: '🧩',
    title: 'Inside the GPT Decoder Block',
    subtitle: 'Causal Masking, Residual Streams & RMSNorm',
    tag: 'LLM Architecture',
    phase: 2,
    phaseName: 'Phase 2: Attention & GPT',
    nebula: 'amethyst',
    x: 880,
    y: 400,
    radius: 32,
    xp: 250,
    prereqs: ['quest-7', 'quest-8']
  },
  {
    id: 'quest-10',
    number: 10,
    roman: 'X',
    icon: '🎲',
    title: 'Generation Engine & Sampling',
    subtitle: 'Temperature, Top-k, Top-p Nucleus & Repetition Penalties',
    tag: 'LLM Sampling',
    phase: 2,
    phaseName: 'Phase 2: Attention & GPT',
    nebula: 'amethyst',
    x: 940,
    y: 600,
    radius: 28,
    xp: 200,
    prereqs: ['quest-9']
  },

  // Phase 3: The LLM Odyssey, Alignment & Multimodal (Supernova Nebula)
  {
    id: 'quest-11',
    number: 11,
    roman: 'XI',
    icon: '⚖️',
    title: 'Alignment, RLHF & Direct Preference Optimization (DPO)',
    subtitle: 'Reward Modeling, Bradley-Terry & Implicit Rewards',
    tag: 'Alignment & DPO',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1080,
    y: 330,
    radius: 28,
    xp: 250,
    prereqs: ['quest-10']
  },
  {
    id: 'quest-12',
    number: 12,
    roman: 'XII',
    icon: '🪶',
    title: 'PEFT & LoRA (Low-Rank Adaptation)',
    subtitle: 'Intrinsic Rank r, Matrix Decomposition & QLoRA',
    tag: 'Parameter Efficient',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1220,
    y: 230,
    radius: 28,
    xp: 250,
    prereqs: ['quest-11']
  },
  {
    id: 'quest-13',
    number: 13,
    roman: 'XIII',
    icon: '🧠',
    title: 'Reasoning, Chain-of-Thought & PRMs',
    subtitle: 'Process vs Outcome Rewards & Monte Carlo Tree Search',
    tag: 'Reasoning & PRMs',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1100,
    y: 510,
    radius: 28,
    xp: 300,
    prereqs: ['quest-10']
  },
  {
    id: 'quest-14',
    number: 14,
    roman: 'XIV',
    icon: '🛠️',
    title: 'Agentic Tool Use, Function Calling & ReAct',
    subtitle: 'Thought-Action-Observation Loops & Structured JSON',
    tag: 'AI Agents',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1240,
    y: 450,
    radius: 28,
    xp: 300,
    prereqs: ['quest-13']
  },
  {
    id: 'quest-15',
    number: 15,
    roman: 'XV',
    icon: '🖼️',
    title: 'Multimodal Vision-Language Models (VLMs)',
    subtitle: 'CLIP Patch Encoders, Cross-Attention & Visual Grounding',
    tag: 'Multimodal Vision',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1040,
    y: 710,
    radius: 28,
    xp: 300,
    prereqs: ['quest-4', 'quest-9']
  },
  {
    id: 'quest-16',
    number: 16,
    roman: 'XVI',
    icon: '🔀',
    title: 'Mixture-of-Experts & Dynamic Routing (MoE)',
    subtitle: 'Sparse Top-k Gating, Load Balancing & Switch Transformers',
    tag: 'MoE Architecture',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1200,
    y: 650,
    radius: 28,
    xp: 300,
    prereqs: ['quest-9']
  },

  // Phase 3: Generative, Video, Audio & Robotics Frontiers
  {
    id: 'quest-17',
    number: 17,
    roman: 'XVII',
    icon: '🌫️',
    title: 'Diffusion Models & Flow Matching',
    subtitle: 'Score Matching, CFG Guidance & Rectified Flow ODEs',
    tag: 'Generative Diffusion',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1360,
    y: 330,
    radius: 30,
    xp: 350,
    prereqs: ['quest-3']
  },
  {
    id: 'quest-18',
    number: 18,
    roman: 'XVIII',
    icon: '🎙️',
    title: 'Audio & Speech AI: Neural Codecs & RVQ',
    subtitle: 'Mel Spectrograms, EnCodec Bottlenecks & Speech LMs',
    tag: 'Audio & Speech AI',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1440,
    y: 530,
    radius: 28,
    xp: 350,
    prereqs: ['quest-7', 'quest-17']
  },
  {
    id: 'quest-19',
    number: 19,
    roman: 'XIX',
    icon: '🎬',
    title: 'World Models & Video Generation',
    subtitle: '3D Spatio-Temporal DiT, Latent Dynamics & Action Conditioning',
    tag: 'World Models & Video',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1480,
    y: 270,
    radius: 30,
    xp: 350,
    prereqs: ['quest-17', 'quest-7']
  },
  {
    id: 'quest-20',
    number: 20,
    roman: 'XX',
    icon: '🤖',
    title: 'Embodied AI & Robotics Foundation Models',
    subtitle: 'Vision-Language-Action VLAs, Action Chunking ACT & Diffusion Policy',
    tag: 'Embodied Robotics',
    phase: 3,
    phaseName: 'Phase 3: Frontiers',
    nebula: 'supernova',
    x: 1560,
    y: 450,
    radius: 32,
    xp: 400,
    prereqs: ['quest-15', 'quest-17', 'quest-19']
  },

  // Apex Grand Master Singularity
  {
    id: 'apex-nexus',
    number: 21,
    roman: 'Ω',
    icon: '👑',
    title: 'Grand Capstone & Master Diploma',
    subtitle: 'DoodleVision Real-World AI & Verified Credential',
    tag: 'Grand Capstone',
    phase: 4,
    phaseName: 'Grand Singularity',
    nebula: 'apex',
    x: 880,
    y: 840,
    radius: 36,
    xp: 500,
    prereqs: ['quest-6', 'quest-10', 'quest-16', 'quest-20']
  }
];

export const CONSTELLATION_EDGES = [
  // Phase 1 paths
  ['quest-1', 'quest-2'],
  ['quest-2', 'quest-3'],
  ['quest-3', 'quest-4'],
  ['quest-4', 'quest-5'],
  ['quest-5', 'quest-6'],
  ['quest-3', 'quest-7'],
  ['quest-6', 'quest-7'],

  // Phase 2 paths
  ['quest-7', 'quest-8'],
  ['quest-7', 'quest-9'],
  ['quest-8', 'quest-9'],
  ['quest-9', 'quest-10'],

  // Phase 3 paths
  ['quest-10', 'quest-11'],
  ['quest-11', 'quest-12'],
  ['quest-10', 'quest-13'],
  ['quest-13', 'quest-14'],
  ['quest-4', 'quest-15'],
  ['quest-9', 'quest-15'],
  ['quest-9', 'quest-16'],
  ['quest-3', 'quest-17'],
  ['quest-7', 'quest-18'],
  ['quest-17', 'quest-18'],
  ['quest-17', 'quest-19'],
  ['quest-7', 'quest-19'],
  ['quest-15', 'quest-20'],
  ['quest-19', 'quest-20'],
  ['quest-17', 'quest-20'],

  // Apex nexus connections
  ['quest-6', 'apex-nexus'],
  ['quest-10', 'apex-nexus'],
  ['quest-16', 'apex-nexus'],
  ['quest-20', 'apex-nexus']
];

export class GalaxyConstellationMap {
  constructor(options = {}) {
    this.container = options.container || null;
    this.canvas = options.canvas || null;
    this.inspector = options.inspector || null;
    this.curriculum = options.curriculum || [];
    this.getCompletedQuests = options.getCompletedQuests || (() => new Set());
    this.getActiveQuestId = options.getActiveQuestId || (() => 'quest-1');
    this.onSelectQuest = options.onSelectQuest || (() => {});
    this.onOpenCapstone = options.onOpenCapstone || (() => {});
    this.onOpenDiploma = options.onOpenDiploma || (() => {});

    this.ctx = null;
    this.nodes = GALAXY_NODES;
    this.edges = CONSTELLATION_EDGES;

    // Camera view transform (World space: 0..1700 x 0..1000)
    this.camera = {
      x: 850,
      y: 500,
      zoom: 0.85,
      targetX: 850,
      targetY: 500,
      targetZoom: 0.85
    };

    // Starfield particles (240 cosmic background stars)
    this.stars = [];
    this.initStarfield();

    // Traveling photon pulses
    this.photons = [];
    this.initPhotons();

    // Interaction state
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.camStart = { x: 0, y: 0 };
    this.hoveredNode = null;
    this.selectedNode = null;
    this.animationId = null;
    this.lastTime = performance.now();
  }

  initStarfield() {
    this.stars = [];
    for (let i = 0; i < 240; i++) {
      this.stars.push({
        x: Math.random() * 2200 - 250,
        y: Math.random() * 1400 - 200,
        size: Math.random() * 2.2 + 0.6,
        baseAlpha: Math.random() * 0.7 + 0.25,
        twinkleSpeed: Math.random() * 2.5 + 0.8,
        twinklePhase: Math.random() * Math.PI * 2,
        layer: Math.floor(Math.random() * 3) // 0: far, 1: mid, 2: near
      });
    }
  }

  initPhotons() {
    this.photons = [];
    for (let i = 0; i < 22; i++) {
      const edge = this.edges[Math.floor(Math.random() * this.edges.length)];
      this.photons.push({
        from: edge[0],
        to: edge[1],
        progress: Math.random(),
        speed: 0.0018 + Math.random() * 0.0022,
        size: 3.5,
        color: '#67e8f9'
      });
    }
  }

  init() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.bindEvents();
    this.fitEntireGalaxy();
    this.startAnimationLoop();

    // Select active quest by default
    const activeId = this.getActiveQuestId();
    const activeNode = this.nodes.find(n => n.id === activeId) || this.nodes[0];
    this.selectNode(activeNode, false);
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(300, rect.width) * dpr;
    this.canvas.height = Math.max(300, rect.height) * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  bindEvents() {
    if (!this.canvas) return;

    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    const getCanvasPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.x,
        y: e.clientY - rect.y
      };
    };

    // Pointer events for smooth pan
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.canvas.setPointerCapture(e.pointerId);
      const pos = getCanvasPos(e);
      this.dragStart = pos;
      this.camStart = { x: this.camera.targetX, y: this.camera.targetY };
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const pos = getCanvasPos(e);

      if (this.isDragging) {
        const dx = (pos.x - this.dragStart.x) / this.camera.zoom;
        const dy = (pos.y - this.dragStart.y) / this.camera.zoom;
        this.camera.targetX = this.camStart.x - dx;
        this.camera.targetY = this.camStart.y - dy;
      } else {
        // Detect hover over nodes
        const worldPos = this.screenToWorld(pos.x, pos.y);
        let found = null;
        for (let node of this.nodes) {
          const dist = Math.hypot(worldPos.x - node.x, worldPos.y - node.y);
          if (dist <= node.radius + 12) {
            found = node;
            break;
          }
        }

        if (found !== this.hoveredNode) {
          this.hoveredNode = found;
          this.canvas.style.cursor = found ? 'pointer' : (this.isDragging ? 'grabbing' : 'grab');
          if (found) {
            soundFx.playBlip(720, 0.02);
          }
        }
      }
    });

    const handlePointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const pos = getCanvasPos(e);
      const moveDist = Math.hypot(pos.x - this.dragStart.x, pos.y - this.dragStart.y);

      // If user clicked without dragging, select node
      if (moveDist < 6) {
        const worldPos = this.screenToWorld(pos.x, pos.y);
        for (let node of this.nodes) {
          const dist = Math.hypot(worldPos.x - node.x, worldPos.y - node.y);
          if (dist <= node.radius + 12) {
            this.selectNode(node, true);
            break;
          }
        }
      }
    };

    this.canvas.addEventListener('pointerup', handlePointerUp);
    this.canvas.addEventListener('pointercancel', handlePointerUp);

    // Zoom on wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const pos = getCanvasPos(e);
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      this.zoomAtPoint(pos.x, pos.y, zoomFactor);
    }, { passive: false });

    // Double-click to launch quest directly
    this.canvas.addEventListener('dblclick', (e) => {
      const pos = getCanvasPos(e);
      const worldPos = this.screenToWorld(pos.x, pos.y);
      for (let node of this.nodes) {
        const dist = Math.hypot(worldPos.x - node.x, worldPos.y - node.y);
        if (dist <= node.radius + 12) {
          this.launchQuest(node);
          break;
        }
      }
    });
  }

  screenToWorld(sx, sy) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const wx = (sx - cx) / this.camera.zoom + this.camera.x;
    const wy = (sy - cy) / this.camera.zoom + this.camera.y;
    return { x: wx, y: wy };
  }

  worldToScreen(wx, wy) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const sx = (wx - this.camera.x) * this.camera.zoom + cx;
    const sy = (wy - this.camera.y) * this.camera.zoom + cy;
    return { x: sx, y: sy };
  }

  zoomAtPoint(sx, sy, factor) {
    const worldBefore = this.screenToWorld(sx, sy);
    const newZoom = Math.max(0.45, Math.min(2.4, this.camera.targetZoom * factor));
    this.camera.targetZoom = newZoom;

    // Adjust camera target to keep pointer position anchored
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    this.camera.targetX = worldBefore.x - (sx - cx) / newZoom;
    this.camera.targetY = worldBefore.y - (sy - cy) / newZoom;
  }

  zoomIn() {
    const rect = this.canvas.getBoundingClientRect();
    this.zoomAtPoint(rect.width / 2, rect.height / 2, 1.25);
    soundFx.playBlip(600, 0.04);
  }

  zoomOut() {
    const rect = this.canvas.getBoundingClientRect();
    this.zoomAtPoint(rect.width / 2, rect.height / 2, 0.8);
    soundFx.playBlip(480, 0.04);
  }

  fitEntireGalaxy() {
    const rect = this.canvas ? this.canvas.getBoundingClientRect() : { width: 1000, height: 600 };
    const pad = 120;
    const scaleX = rect.width / (1650 + pad * 2);
    const scaleY = rect.height / (920 + pad * 2);
    const fitZoom = Math.max(0.5, Math.min(1.0, Math.min(scaleX, scaleY)));

    this.camera.targetX = 870;
    this.camera.targetY = 500;
    this.camera.targetZoom = fitZoom;
    soundFx.playBlip(540, 0.05);
  }

  jumpToSector(sectorId) {
    soundFx.playCelestialChime(760);
    if (sectorId === 'all') {
      this.fitEntireGalaxy();
    } else if (sectorId === 'p1') {
      // Phase 1: Foundations
      this.camera.targetX = 350;
      this.camera.targetY = 460;
      this.camera.targetZoom = 1.05;
    } else if (sectorId === 'p2') {
      // Phase 2: Transformers & GPT
      this.camera.targetX = 810;
      this.camera.targetY = 470;
      this.camera.targetZoom = 1.1;
    } else if (sectorId === 'p3') {
      // Phase 3: Frontiers & Robotics
      this.camera.targetX = 1320;
      this.camera.targetY = 460;
      this.camera.targetZoom = 0.95;
    } else if (sectorId === 'apex') {
      // Master Nexus
      this.camera.targetX = 880;
      this.camera.targetY = 820;
      this.camera.targetZoom = 1.25;
    }
  }

  selectNode(node, playSound = true) {
    this.selectedNode = node;
    this.camera.targetX = node.x;
    this.camera.targetY = node.y;
    this.camera.targetZoom = Math.max(0.9, Math.min(1.4, this.camera.targetZoom));

    if (playSound) {
      soundFx.playCelestialChime(880 + (node.number || 1) * 20);
    }

    this.renderInspector();
  }

  launchQuest(node) {
    if (!node) return;
    if (node.id === 'apex-nexus') {
      this.onOpenDiploma();
    } else {
      this.onSelectQuest(node.id);
    }
    soundFx.playDojoGong();
  }

  renderInspector() {
    if (!this.inspector) return;
    const node = this.selectedNode;
    if (!node) {
      this.inspector.innerHTML = `<div class="inspector-placeholder">Click any Star Node to inspect lore and prerequisites.</div>`;
      return;
    }

    const completedSet = this.getCompletedQuests();
    const activeId = this.getActiveQuestId();
    const isCompleted = completedSet.has(node.id);
    const isActive = node.id === activeId;

    let statusHtml = '';
    if (node.id === 'apex-nexus') {
      statusHtml = `<span class="cosmic-status-badge apex">👑 Master Capstone & Singularity</span>`;
    } else if (isCompleted) {
      statusHtml = `<span class="cosmic-status-badge conquered">✓ Conquered (+${node.xp} XP)</span>`;
    } else if (isActive) {
      statusHtml = `<span class="cosmic-status-badge active">⭐ Active Focus</span>`;
    } else {
      statusHtml = `<span class="cosmic-status-badge unlocked">✨ Available Star</span>`;
    }

    // Find full quest data from curriculum if available
    const questMeta = this.curriculum.find(q => q.id === node.id);
    const storyText = questMeta && questMeta.story ? questMeta.story : `${node.title}: An essential celestial milestone on the path of deep learning mastery.`;
    const mentalModel = questMeta && questMeta.mentalModel ? `"${questMeta.mentalModel}"` : `Mastering the mathematical intuition behind ${node.tag}.`;

    // Prerequisite chips
    const prereqHtml = node.prereqs.length > 0
      ? node.prereqs.map(pid => {
          const pNode = this.nodes.find(n => n.id === pid);
          const pComp = completedSet.has(pid);
          return `<span class="prereq-chip ${pComp ? 'completed' : 'pending'}">${pNode ? `${pNode.icon} ${pNode.title}` : pid}</span>`;
        }).join('')
      : `<span class="prereq-none">None (Root Gateway)</span>`;

    this.inspector.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="inspector-star-avatar ${node.nebula}">
            <span class="star-icon">${node.icon}</span>
            <span class="star-roman">${node.roman}</span>
          </div>
          <div class="inspector-title-meta">
            ${statusHtml}
            <h3 class="inspector-title">${node.title}</h3>
            <span class="inspector-subtitle">${node.subtitle}</span>
          </div>
        </div>

        <div class="inspector-body">
          <div class="lore-box">
            <span class="lore-tag">📜 Cosmic Doctrine & Lore</span>
            <p>${storyText}</p>
          </div>

          <div class="quote-box">
            <span class="quote-tag">💡 Sensei's Mental Model</span>
            <p>${mentalModel}</p>
          </div>

          <div class="prereqs-box">
            <span class="prereq-title">🔗 Prerequisite Constellations:</span>
            <div class="prereq-chips-row">${prereqHtml}</div>
          </div>
        </div>

        <div class="inspector-footer">
          <div class="inspector-rewards">
            <span class="reward-xp">⭐ +${node.xp} XP</span>
            <span class="reward-phase">${node.phaseName}</span>
          </div>
          <button class="btn-launch-star" id="btn-launch-selected-star">
            <span>🚀</span> ${node.id === 'apex-nexus' ? 'Open Master Diploma' : 'Launch Quest Workspace'}
          </button>
        </div>
      </div>
    `;

    const launchBtn = document.getElementById('btn-launch-selected-star');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => {
        this.launchQuest(node);
      });
    }
  }

  startAnimationLoop() {
    const loop = (currentTime) => {
      const dt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      // Smooth camera lerp
      this.camera.x += (this.camera.targetX - this.camera.x) * 0.12;
      this.camera.y += (this.camera.targetY - this.camera.y) * 0.12;
      this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.14;

      this.render(currentTime);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stopAnimationLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  render(time) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle = '#020617'; // Deep interstellar void
    ctx.fillRect(0, 0, width, height);

    // Save camera transform
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Draw Nebulae
    this.drawNebulae(ctx);

    // 2. Draw Background Stars
    this.drawStarfield(ctx, time);

    // 3. Draw Constellation Prerequisite Edges & Photons
    this.drawConstellationEdges(ctx, time);

    // 4. Draw Constellation Star Nodes
    this.drawConstellationNodes(ctx, time);

    ctx.restore();
  }

  drawNebulae(ctx) {
    const nebulae = [
      { x: 380, y: 460, r: 420, c1: 'rgba(6, 182, 212, 0.14)', c2: 'rgba(59, 130, 246, 0.08)' }, // Sapphire
      { x: 820, y: 480, r: 400, c1: 'rgba(139, 92, 246, 0.16)', c2: 'rgba(168, 85, 247, 0.06)' }, // Amethyst
      { x: 1320, y: 450, r: 450, c1: 'rgba(244, 63, 94, 0.14)', c2: 'rgba(245, 158, 11, 0.08)' }, // Supernova
      { x: 880, y: 840, r: 280, c1: 'rgba(245, 158, 11, 0.18)', c2: 'rgba(16, 185, 129, 0.08)' }  // Apex Singularity
    ];

    nebulae.forEach(n => {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      grad.addColorStop(0, n.c1);
      grad.addColorStop(0.5, n.c2);
      grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawStarfield(ctx, time) {
    this.stars.forEach(s => {
      const twinkle = Math.sin(time * 0.002 * s.twinkleSpeed + s.twinklePhase);
      const alpha = Math.max(0.1, Math.min(1.0, s.baseAlpha + twinkle * 0.3));

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      // Subtle cross flare for brighter near stars
      if (s.size > 2.0 && alpha > 0.7) {
        ctx.strokeStyle = `rgba(165, 243, 252, ${alpha * 0.4})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.x - s.size * 2.5, s.y);
        ctx.lineTo(s.x + s.size * 2.5, s.y);
        ctx.moveTo(s.x, s.y - s.size * 2.5);
        ctx.lineTo(s.x, s.y + s.size * 2.5);
        ctx.stroke();
      }
    });
  }

  drawConstellationEdges(ctx, time) {
    const completedSet = this.getCompletedQuests();
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    this.edges.forEach(([fromId, toId]) => {
      const n1 = nodeMap.get(fromId);
      const n2 = nodeMap.get(toId);
      if (!n1 || !n2) return;

      const isConquered = completedSet.has(fromId) && completedSet.has(toId);
      const isAvailable = completedSet.has(fromId);

      ctx.lineWidth = isConquered ? 2.5 : (isAvailable ? 1.6 : 1.0);

      if (isConquered) {
        // Radiant glowing constellation starlight
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
        ctx.setLineDash([]);
      } else if (isAvailable) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.setLineDash([]);
      } else {
        // Locked/Future path: faint dashed line
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.setLineDash([4, 6]);
      }

      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Subtle outer bloom glow for conquered paths
      if (isConquered) {
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.12)';
        ctx.stroke();
      }
    });

    // Update and draw traveling photons on conquered paths
    this.photons.forEach(p => {
      const n1 = nodeMap.get(p.from);
      const n2 = nodeMap.get(p.to);
      if (!n1 || !n2) return;

      const isConquered = completedSet.has(p.from) && completedSet.has(p.to);
      p.progress += p.speed;
      if (p.progress > 1.0) p.progress = 0;

      if (isConquered) {
        const px = n1.x + (n2.x - n1.x) * p.progress;
        const py = n1.y + (n2.y - n1.y) * p.progress;

        // Glowing photon head
        ctx.fillStyle = '#67e8f9';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }

  drawConstellationNodes(ctx, time) {
    const completedSet = this.getCompletedQuests();
    const activeId = this.getActiveQuestId();

    this.nodes.forEach(node => {
      const isCompleted = completedSet.has(node.id);
      const isActive = node.id === activeId;
      const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
      const isSelected = this.selectedNode && this.selectedNode.id === node.id;

      const pulse = Math.sin(time * 0.003 + node.number) * 0.5 + 0.5;
      const baseR = node.radius + (isHovered ? 4 : 0);

      // 1. Outer Corona Beacon
      if (isActive || isCompleted || isSelected) {
        const coronaR = baseR + 10 + pulse * 6;
        const coronaGrad = ctx.createRadialGradient(node.x, node.y, baseR, node.x, node.y, coronaR);
        if (isActive) {
          coronaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
          coronaGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        } else if (isCompleted) {
          coronaGrad.addColorStop(0, 'rgba(52, 211, 153, 0.45)');
          coronaGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
        } else {
          coronaGrad.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
          coronaGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        }
        ctx.fillStyle = coronaGrad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, coronaR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Orbital Ring
      ctx.lineWidth = isSelected ? 3.5 : (isHovered ? 2.5 : 1.5);
      if (isCompleted) {
        ctx.strokeStyle = '#34d399'; // Emerald
      } else if (isActive) {
        ctx.strokeStyle = '#38bdf8'; // Cyan beacon
      } else if (node.id === 'apex-nexus') {
        ctx.strokeStyle = '#fbbf24'; // Gold
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)'; // Slate
      }
      ctx.beginPath();
      ctx.arc(node.x, node.y, baseR, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Core Sphere Fill
      const coreGrad = ctx.createRadialGradient(
        node.x - baseR * 0.3, node.y - baseR * 0.3, 0,
        node.x, node.y, baseR
      );
      if (isCompleted) {
        coreGrad.addColorStop(0, '#065f46');
        coreGrad.addColorStop(1, '#022c22');
      } else if (isActive) {
        coreGrad.addColorStop(0, '#0369a1');
        coreGrad.addColorStop(1, '#082f49');
      } else if (node.id === 'apex-nexus') {
        coreGrad.addColorStop(0, '#b45309');
        coreGrad.addColorStop(1, '#451a03');
      } else {
        coreGrad.addColorStop(0, '#1e293b');
        coreGrad.addColorStop(1, '#090d16');
      }
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, baseR - 1, 0, Math.PI * 2);
      ctx.fill();

      // 4. Center Icon Emoji
      ctx.font = `${Math.round(baseR * 0.9)}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.icon, node.x, node.y + 1);

      // 5. Roman Numeral Badge (top-right orbit)
      const badgeAngle = -Math.PI / 4;
      const bx = node.x + Math.cos(badgeAngle) * (baseR + 2);
      const by = node.y + Math.sin(badgeAngle) * (baseR + 2);

      ctx.fillStyle = isCompleted ? '#10b981' : (isActive ? '#0284c7' : '#334155');
      ctx.beginPath();
      ctx.arc(bx, by, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(node.roman, bx, by);

      // 6. Label Pill underneath star
      const labelY = node.y + baseR + 14;
      ctx.font = '600 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      const textWidth = ctx.measureText(node.title).width;

      // Label background pill
      ctx.fillStyle = 'rgba(7, 10, 19, 0.85)';
      ctx.strokeStyle = isSelected ? 'rgba(244, 63, 94, 0.6)' : (isHovered ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.08)');
      ctx.lineWidth = 1;
      const padX = 8;
      const padY = 4;
      ctx.beginPath();
      ctx.roundRect(node.x - textWidth / 2 - padX, labelY - padY - 7, textWidth + padX * 2, 17, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isCompleted ? '#a7f3d0' : (isActive ? '#bae6fd' : '#e2e8f0');
      ctx.fillText(node.title, node.x, labelY);
    });
  }
}
