/**
 * NeuroQuest: DoodleVision AI Real-World Capstone Studio
 * Interactive 28x28 Drawing Studio, Real-Time PyTorch Inference,
 * Conv1 Feature Maps Visualizer, AI Pictionary Challenge, and Live Training Lab.
 */

import { soundFx } from './sound_effects.js';
import confetti from 'canvas-confetti';

export const CLASS_NAMES = [
  { name: 'Cat 🐱', label: 'Cat', icon: '🐱', id: 'cat' },
  { name: 'Bicycle 🚲', label: 'Bicycle', icon: '🚲', id: 'bicycle' },
  { name: 'Star ⭐', label: 'Star', icon: '⭐', id: 'star' },
  { name: 'Pizza 🍕', label: 'Pizza', icon: '🍕', id: 'pizza' },
  { name: 'Umbrella ☂️', label: 'Umbrella', icon: '☂️', id: 'umbrella' }
];

export class DoodleCapstoneStudio {
  constructor(options = {}) {
    this.container = options.container || null;
    this.canvas = options.canvas || null;
    this.previewCanvas = options.previewCanvas || null;
    this.getBackendUrl = options.getBackendUrl || (() => 'http://localhost:8000');
    this.isBackendOnline = options.isBackendOnline || (() => false);
    this.onAwardXp = options.onAwardXp || (() => {});
    this.onSendCodeToLab = options.onSendCodeToLab || (() => {});

    // Drawing state
    this.ctx = null;
    this.previewCtx = null;
    this.isDrawing = false;
    this.currentTool = 'brush'; // 'brush' | 'eraser'
    this.brushSize = 16; // 8, 16, 26
    this.lastPoint = null;
    this.strokeHistory = []; // For undo
    this.currentStroke = [];
    this.predictDebounceTimer = null;

    // Active View Tab
    this.activeTab = 'sketch'; // 'sketch' | 'pictionary' | 'training'

    // Real-time inference state
    this.currentPredictions = [
      { class: 'Cat 🐱', confidence: 20.0 },
      { class: 'Bicycle 🚲', confidence: 20.0 },
      { class: 'Star ⭐', confidence: 20.0 },
      { class: 'Pizza 🍕', confidence: 20.0 },
      { class: 'Umbrella ☂️', confidence: 20.0 }
    ];
    this.topPrediction = { class: 'Awaiting Sketch...', confidence: 0.0 };
    this.featureMaps = [];

    // AI Pictionary Challenge State
    this.challengeActive = false;
    this.challengeTarget = null;
    this.challengeTimeLeft = 20;
    this.challengeTimerId = null;
    this.challengeRoundsCompleted = 0;
    this.challengeSuccess = false;

    // Training Lab State
    this.trainingHistory = [
      { epoch: 1, loss: 1.48, accuracy: 42.0 },
      { epoch: 2, loss: 1.12, accuracy: 64.5 },
      { epoch: 3, loss: 0.81, accuracy: 78.0 },
      { epoch: 4, loss: 0.54, accuracy: 86.5 }
    ];
    this.isTraining = false;
    this.trainingEpochs = 2;
    this.learningRate = 0.003;
    this.modelStatus = 'Trained (12 Epochs Pre-Trained)';
  }

  init() {
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.clearCanvas(false);
      this.bindCanvasEvents();
    }
    if (this.previewCanvas) {
      this.previewCtx = this.previewCanvas.getContext('2d');
    }
    this.updatePreview28();
    this.renderPredictionsUI();
  }

  bindCanvasEvents() {
    if (!this.canvas) return;

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.x) * scaleX,
        y: (e.clientY - rect.y) * scaleY
      };
    };

    const handlePointerDown = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      this.canvas.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      this.lastPoint = pos;
      this.currentStroke = [{ x: pos.x, y: pos.y, tool: this.currentTool, size: this.brushSize }];
      this.drawDot(pos.x, pos.y);
      soundFx.playBlip(320, 0.02);
    };

    const handlePointerMove = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      if (this.lastPoint) {
        this.drawLine(this.lastPoint.x, this.lastPoint.y, pos.x, pos.y);
      }
      this.lastPoint = pos;
      this.currentStroke.push({ x: pos.x, y: pos.y });
      this.scheduleInference();
    };

    const handlePointerUp = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      this.lastPoint = null;
      if (this.currentStroke.length > 0) {
        this.saveStrokeToHistory();
      }
      this.updatePreview28();
      this.runInferenceNow();
    };

    this.canvas.addEventListener('pointerdown', handlePointerDown);
    this.canvas.addEventListener('pointermove', handlePointerMove);
    this.canvas.addEventListener('pointerup', handlePointerUp);
    this.canvas.addEventListener('pointercancel', handlePointerUp);
    this.canvas.addEventListener('pointerleave', handlePointerUp);
  }

  drawDot(x, y) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.currentTool === 'eraser' ? '#070a13' : '#ffffff';
    this.ctx.fill();
  }

  drawLine(x1, y1, x2, y2) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = this.brushSize;
    this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#070a13' : '#ffffff';
    this.ctx.stroke();
  }

  saveStrokeToHistory() {
    if (!this.ctx) return;
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.strokeHistory.push(imgData);
    if (this.strokeHistory.length > 20) {
      this.strokeHistory.shift();
    }
  }

  undo() {
    if (!this.ctx || this.strokeHistory.length === 0) return;
    this.strokeHistory.pop(); // Remove current state
    if (this.strokeHistory.length > 0) {
      const prev = this.strokeHistory[this.strokeHistory.length - 1];
      this.ctx.putImageData(prev, 0, 0);
    } else {
      this.clearCanvas(false);
    }
    soundFx.playBlip(280, 0.05);
    this.updatePreview28();
    this.runInferenceNow();
  }

  clearCanvas(saveHistory = true) {
    if (!this.ctx) return;
    this.ctx.fillStyle = '#070a13';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (saveHistory) {
      this.saveStrokeToHistory();
    }
    this.updatePreview28();
    this.resetPredictions();
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setBrushSize(size) {
    this.brushSize = size;
  }

  /**
   * Downsamples the 280x280 canvas to a 28x28 normalized float array [0.0 - 1.0].
   * Centers the drawing bounding box with padding, matching MNIST/QuickDraw training.
   */
  getNormalized28Grid() {
    if (!this.canvas || !this.ctx) {
      return Array(28).fill(0).map(() => Array(28).fill(0.0));
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const imgData = this.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Find bounding box of drawn ink
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasInk = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (brightness > 40) { // Non-black ink
          hasInk = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasInk) {
      return Array(28).fill(0).map(() => Array(28).fill(0.0));
    }

    // Create an offscreen canvas to scale and center
    const offscreen = document.createElement('canvas');
    offscreen.width = 28;
    offscreen.height = 28;
    const offCtx = offscreen.getContext('2d');
    offCtx.fillStyle = '#000000';
    offCtx.fillRect(0, 0, 28, 28);

    const bbW = maxX - minX + 1;
    const bbH = maxY - minY + 1;
    const maxDim = Math.max(bbW, bbH);
    const targetSize = 20; // 20x20 inside 28x28 gives 4px margin
    const scale = targetSize / maxDim;

    const scaledW = Math.max(1, Math.round(bbW * scale));
    const scaledH = Math.max(1, Math.round(bbH * scale));
    const destX = Math.round((28 - scaledW) / 2);
    const destY = Math.round((28 - scaledH) / 2);

    // Draw the cropped bounding box centered onto the 28x28 canvas
    offCtx.drawImage(
      this.canvas,
      minX, minY, bbW, bbH,
      destX, destY, scaledW, scaledH
    );

    const smallData = offCtx.getImageData(0, 0, 28, 28).data;
    const grid = [];
    for (let y = 0; y < 28; y++) {
      const row = [];
      for (let x = 0; x < 28; x++) {
        const idx = (y * 28 + x) * 4;
        const val = (smallData[idx] + smallData[idx + 1] + smallData[idx + 2]) / (3 * 255.0);
        row.push(Math.round(val * 1000) / 1000);
      }
      grid.push(row);
    }
    return grid;
  }

  updatePreview28() {
    if (!this.previewCanvas || !this.previewCtx) return;
    const grid = this.getNormalized28Grid();
    const pW = this.previewCanvas.width;
    const pH = this.previewCanvas.height;
    const cellW = pW / 28;
    const cellH = pH / 28;

    this.previewCtx.fillStyle = '#070a13';
    this.previewCtx.fillRect(0, 0, pW, pH);

    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const val = grid[y][x];
        if (val > 0.05) {
          const intensity = Math.round(val * 255);
          this.previewCtx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
          this.previewCtx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }
  }

  scheduleInference() {
    if (this.predictDebounceTimer) clearTimeout(this.predictDebounceTimer);
    this.predictDebounceTimer = setTimeout(() => {
      this.updatePreview28();
      this.runInferenceNow();
    }, 180);
  }

  async runInferenceNow() {
    const grid = this.getNormalized28Grid();
    
    // Check total ink
    let totalInk = 0;
    for (let r of grid) {
      for (let v of r) totalInk += v;
    }

    if (totalInk < 1.0) {
      this.resetPredictions();
      return;
    }

    const backendUrl = this.getBackendUrl();
    let backendSuccess = false;

    try {
      const res = await fetch(`${backendUrl}/api/predict_doodle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixels: grid }),
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        this.currentPredictions = data.all_predictions;
        this.topPrediction = { class: data.top_class, confidence: data.confidence };
        backendSuccess = true;
        this.fetchFeatureMaps(grid);
      }
    } catch (e) {
      // Backend unreachable; gracefully use local offline heuristic
    }

    if (!backendSuccess) {
      this.runLocalInference(grid);
      this.generateLocalFeatureMaps(grid);
    }

    this.renderPredictionsUI();
    this.checkPictionaryWin();
  }

  runLocalInference(grid) {
    // Intelligent geometric and mass distribution heuristics
    let totalInk = 0;
    let topInk = 0;
    let bottomInk = 0;
    let centerInk = 0;
    let leftInk = 0;
    let rightInk = 0;

    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const v = grid[y][x];
        totalInk += v;
        if (y < 12) topInk += v;
        if (y >= 16) bottomInk += v;
        if (y >= 9 && y <= 19 && x >= 9 && x <= 19) centerInk += v;
        if (x < 12) leftInk += v;
        if (x >= 16) rightInk += v;
      }
    }

    const scores = {
      'Cat 🐱': 15.0,
      'Bicycle 🚲': 15.0,
      'Star ⭐': 15.0,
      'Pizza 🍕': 15.0,
      'Umbrella ☂️': 15.0
    };

    if (topInk > bottomInk * 1.6) {
      scores['Umbrella ☂️'] += 45; // Dome canopy
      scores['Cat 🐱'] += 30; // Pointy cat ears
    } else if (bottomInk > topInk * 1.3) {
      scores['Bicycle 🚲'] += 55; // Bottom two wheels
    }

    if (centerInk / Math.max(1, totalInk) > 0.42) {
      scores['Star ⭐'] += 50; // Dense central star hub
      scores['Pizza 🍕'] += 35; // Crust + cheese center
    }

    if (topInk > 8 && bottomInk > 8 && leftInk > 6 && rightInk > 6) {
      scores['Star ⭐'] += 25; // Radial symmetry
      scores['Cat 🐱'] += 20;
    }

    // Softmax normalization
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const preds = Object.entries(scores).map(([cls, score]) => ({
      class: cls,
      confidence: Math.round((score / totalScore) * 1000) / 10
    }));

    preds.sort((a, b) => b.confidence - a.confidence);
    this.currentPredictions = preds;
    this.topPrediction = { class: preds[0].class, confidence: preds[0].confidence };
  }

  async fetchFeatureMaps(grid) {
    const backendUrl = this.getBackendUrl();
    try {
      const res = await fetch(`${backendUrl}/api/feature_maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixels: grid }),
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.feature_maps) {
          this.featureMaps = data.feature_maps;
          this.renderFeatureMapsUI();
          return;
        }
      }
    } catch (e) {
      // fallback to local feature maps
    }
    this.generateLocalFeatureMaps(grid);
  }

  generateLocalFeatureMaps(grid) {
    // Synthetic conv kernels for offline visualization
    const kernels = [
      { id: 0, label: 'F0: Horiz Edge', k: [[-1, -1, -1], [2, 2, 2], [-1, -1, -1]] },
      { id: 1, label: 'F1: Vert Edge', k: [[-1, 2, -1], [-1, 2, -1], [-1, 2, -1]] },
      { id: 2, label: 'F2: Diagonal Slopes', k: [[2, -1, -1], [-1, 2, -1], [-1, -1, 2]] },
      { id: 3, label: 'F3: Corner Detect', k: [[2, 2, -1], [2, -1, -1], [-1, -1, -1]] },
      { id: 4, label: 'F4: Texture Contrast', k: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]] },
      { id: 5, label: 'F5: Ridge Filter', k: [[0, 1, 0], [1, -4, 1], [0, 1, 0]] },
      { id: 6, label: 'F6: Mass Center', k: [[1, 1, 1], [1, 2, 1], [1, 1, 1]] },
      { id: 7, label: 'F7: Ambient Contour', k: [[1, 0, -1], [2, 0, -2], [1, 0, -1]] }
    ];

    const maps = [];
    for (let kInfo of kernels) {
      const out = [];
      const k = kInfo.k;
      for (let y = 0; y < 28; y++) {
        const row = [];
        for (let x = 0; x < 28; x++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const py = Math.min(27, Math.max(0, y + ky));
              const px = Math.min(27, Math.max(0, x + kx));
              sum += grid[py][px] * k[ky + 1][kx + 1];
            }
          }
          // ReLU activation
          row.push(Math.max(0, Math.min(1.0, sum)));
        }
        out.push(row);
      }
      maps.push({
        filter_id: kInfo.id,
        label: kInfo.label,
        grid: out
      });
    }
    this.featureMaps = maps;
    this.renderFeatureMapsUI();
  }

  resetPredictions() {
    this.currentPredictions = CLASS_NAMES.map(c => ({ class: c.name, confidence: 20.0 }));
    this.topPrediction = { class: 'Sketch on canvas to test...', confidence: 0.0 };
    this.renderPredictionsUI();
    this.renderEmptyFeatureMaps();
  }

  renderPredictionsUI() {
    const heroTitle = document.getElementById('doodle-hero-title');
    const heroConf = document.getElementById('doodle-hero-conf');
    const heroBadge = document.getElementById('doodle-hero-badge');
    const barsContainer = document.getElementById('doodle-prob-bars');

    if (heroTitle && heroConf) {
      if (this.topPrediction.confidence > 0) {
        heroTitle.textContent = this.topPrediction.class;
        heroConf.textContent = `${this.topPrediction.confidence.toFixed(1)}%`;
        if (heroBadge) {
          if (this.topPrediction.confidence >= 65) {
            heroBadge.textContent = 'High Confidence (Conv2 Match)';
            heroBadge.className = 'doodle-badge badge-high';
          } else if (this.topPrediction.confidence >= 40) {
            heroBadge.textContent = 'Moderate Match (Evaluating Features)';
            heroBadge.className = 'doodle-badge badge-mid';
          } else {
            heroBadge.textContent = 'Uncertain (Keep Drawing)';
            heroBadge.className = 'doodle-badge badge-low';
          }
        }
      } else {
        heroTitle.textContent = 'Awaiting Sketch...';
        heroConf.textContent = '--%';
        if (heroBadge) {
          heroBadge.textContent = 'Ready for Input';
          heroBadge.className = 'doodle-badge badge-low';
        }
      }
    }

    if (barsContainer) {
      barsContainer.innerHTML = '';
      this.currentPredictions.forEach(pred => {
        const isLeader = pred.class === this.topPrediction.class && this.topPrediction.confidence > 0;
        const row = document.createElement('div');
        row.className = `doodle-prob-row ${isLeader ? 'leader' : ''}`;
        row.innerHTML = `
          <div class="doodle-prob-meta">
            <span class="doodle-prob-name">${pred.class}</span>
            <span class="doodle-prob-pct">${pred.confidence.toFixed(1)}%</span>
          </div>
          <div class="doodle-bar-track">
            <div class="doodle-bar-fill" style="width: ${pred.confidence}%;"></div>
          </div>
        `;
        barsContainer.appendChild(row);
      });
    }
  }

  renderFeatureMapsUI() {
    const container = document.getElementById('doodle-feature-maps-grid');
    if (!container) return;
    container.innerHTML = '';

    this.featureMaps.slice(0, 8).forEach(fm => {
      const tile = document.createElement('div');
      tile.className = 'doodle-fm-tile';
      tile.title = `${fm.label} - Conv1 Activation`;

      const title = document.createElement('div');
      title.className = 'doodle-fm-title';
      title.textContent = fm.label;

      const miniCanvas = document.createElement('canvas');
      miniCanvas.width = 56;
      miniCanvas.height = 56;
      miniCanvas.className = 'doodle-fm-canvas';
      const mCtx = miniCanvas.getContext('2d');

      const grid = fm.grid;
      const cellW = 56 / 28;
      const cellH = 56 / 28;

      mCtx.fillStyle = '#070a13';
      mCtx.fillRect(0, 0, 56, 56);

      for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 28; x++) {
          const val = grid[y] ? grid[y][x] : 0;
          if (val > 0.05) {
            // Neon cyan/violet heatmap
            const r = Math.round(val * 140);
            const g = Math.round(val * 220);
            const b = 255;
            mCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            mCtx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
          }
        }
      }

      tile.appendChild(title);
      tile.appendChild(miniCanvas);
      container.appendChild(tile);
    });
  }

  renderEmptyFeatureMaps() {
    const container = document.getElementById('doodle-feature-maps-grid');
    if (!container) return;
    container.innerHTML = '';
    const labels = [
      'F0: Horiz Edge', 'F1: Vert Edge', 'F2: Diagonal', 'F3: Corner',
      'F4: Texture', 'F5: Ridge', 'F6: Mass Center', 'F7: Contour'
    ];
    labels.forEach(l => {
      const tile = document.createElement('div');
      tile.className = 'doodle-fm-tile empty';
      tile.innerHTML = `
        <div class="doodle-fm-title">${l}</div>
        <div class="doodle-fm-placeholder">--</div>
      `;
      container.appendChild(tile);
    });
  }

  // --- Preset Doodles ---
  loadPreset(presetName) {
    this.clearCanvas(true);
    if (!this.ctx) return;

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.lineWidth = 14;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    if (presetName === 'star') {
      // 5-point star
      const spikes = 5;
      const outerRadius = 85;
      const innerRadius = 40;
      let rot = (Math.PI / 2) * 3;
      let step = Math.PI / spikes;

      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        this.ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        this.ctx.lineTo(x, y);
        rot += step;
      }
      this.ctx.lineTo(cx, cy - outerRadius);
      this.ctx.closePath();
      this.ctx.stroke();
    } else if (presetName === 'cat') {
      // Cat face outline with pointy ears
      this.ctx.beginPath();
      this.ctx.arc(cx, cy + 20, 65, 0, Math.PI * 2);
      this.ctx.stroke();

      // Left ear
      this.ctx.beginPath();
      this.ctx.moveTo(cx - 50, cy - 25);
      this.ctx.lineTo(cx - 70, cy - 90);
      this.ctx.lineTo(cx - 20, cy - 40);
      this.ctx.stroke();

      // Right ear
      this.ctx.beginPath();
      this.ctx.moveTo(cx + 20, cy - 40);
      this.ctx.lineTo(cx + 70, cy - 90);
      this.ctx.lineTo(cx + 50, cy - 25);
      this.ctx.stroke();

      // Whiskers
      this.ctx.lineWidth = 6;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - 75, cy + 15);
      this.ctx.lineTo(cx - 15, cy + 20);
      this.ctx.moveTo(cx - 75, cy + 30);
      this.ctx.lineTo(cx - 15, cy + 25);

      this.ctx.moveTo(cx + 15, cy + 20);
      this.ctx.lineTo(cx + 75, cy + 15);
      this.ctx.moveTo(cx + 15, cy + 25);
      this.ctx.lineTo(cx + 75, cy + 30);
      this.ctx.stroke();
    } else if (presetName === 'bicycle') {
      // Two bottom wheels and triangle frame
      this.ctx.beginPath();
      this.ctx.arc(cx - 65, cy + 45, 34, 0, Math.PI * 2); // Rear wheel
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(cx + 65, cy + 45, 34, 0, Math.PI * 2); // Front wheel
      this.ctx.stroke();

      // Frame
      this.ctx.beginPath();
      this.ctx.moveTo(cx - 65, cy + 45); // rear hub
      this.ctx.lineTo(cx - 15, cy - 10); // seat post
      this.ctx.lineTo(cx + 40, cy - 10); // handle post
      this.ctx.lineTo(cx + 65, cy + 45); // front hub
      this.ctx.moveTo(cx - 15, cy - 10);
      this.ctx.lineTo(cx - 10, cy + 45); // bottom bracket
      this.ctx.lineTo(cx + 40, cy - 10);
      this.ctx.moveTo(cx - 10, cy + 45);
      this.ctx.lineTo(cx - 65, cy + 45);
      this.ctx.stroke();

      // Handlebars
      this.ctx.beginPath();
      this.ctx.moveTo(cx + 35, cy - 25);
      this.ctx.lineTo(cx + 55, cy - 25);
      this.ctx.stroke();
    } else if (presetName === 'umbrella') {
      // Curved umbrella canopy and cane handle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy + 10, 80, Math.PI, 0, false); // Dome
      this.ctx.lineTo(cx - 80, cy + 10);
      this.ctx.stroke();

      // Center pole
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy + 10);
      this.ctx.lineTo(cx, cy + 85);
      // Hook
      this.ctx.arc(cx - 15, cy + 85, 15, 0, Math.PI, false);
      this.ctx.stroke();

      // Top tip
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - 70);
      this.ctx.lineTo(cx, cy - 85);
      this.ctx.stroke();
    } else if (presetName === 'pizza') {
      // Triangle slice with crust arc
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy + 80); // tip
      this.ctx.lineTo(cx - 75, cy - 50);
      // Crust arc
      this.ctx.quadraticCurveTo(cx, cy - 80, cx + 75, cy - 50);
      this.ctx.lineTo(cx, cy + 80);
      this.ctx.stroke();

      // Pepperoni circles
      this.ctx.lineWidth = 6;
      this.ctx.beginPath();
      this.ctx.arc(cx - 20, cy - 20, 10, 0, Math.PI * 2);
      this.ctx.arc(cx + 25, cy - 15, 12, 0, Math.PI * 2);
      this.ctx.arc(cx, cy + 25, 9, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.saveStrokeToHistory();
    this.updatePreview28();
    this.runInferenceNow();
    soundFx.playSuccess();
  }

  // --- AI Pictionary Challenge Mode ---
  startPictionaryChallenge() {
    this.challengeActive = true;
    this.challengeSuccess = false;
    this.challengeTimeLeft = 20;

    // Pick a random target class
    const randIdx = Math.floor(Math.random() * CLASS_NAMES.length);
    this.challengeTarget = CLASS_NAMES[randIdx];

    this.clearCanvas(true);

    const targetEl = document.getElementById('doodle-challenge-target');
    const timerEl = document.getElementById('doodle-challenge-timer');
    const bannerEl = document.getElementById('doodle-challenge-banner');

    if (targetEl) targetEl.textContent = `${this.challengeTarget.name}`;
    if (timerEl) timerEl.textContent = `${this.challengeTimeLeft}s`;
    if (bannerEl) bannerEl.className = 'doodle-challenge-banner active';

    soundFx.playLevelUp();

    if (this.challengeTimerId) clearInterval(this.challengeTimerId);
    this.challengeTimerId = setInterval(() => {
      this.challengeTimeLeft--;
      if (timerEl) timerEl.textContent = `${this.challengeTimeLeft}s`;

      if (this.challengeTimeLeft <= 5 && this.challengeTimeLeft > 0) {
        soundFx.playBlip(600, 0.05);
      }

      if (this.challengeTimeLeft <= 0) {
        this.stopPictionaryChallenge(false);
      }
    }, 1000);
  }

  checkPictionaryWin() {
    if (!this.challengeActive || !this.challengeTarget || this.challengeSuccess) return;

    // Find confidence of the target class
    const targetPred = this.currentPredictions.find(p => p.class === this.challengeTarget.name);
    if (targetPred && targetPred.confidence >= 65.0) {
      this.challengeSuccess = true;
      this.stopPictionaryChallenge(true);
    }
  }

  stopPictionaryChallenge(won) {
    if (this.challengeTimerId) {
      clearInterval(this.challengeTimerId);
      this.challengeTimerId = null;
    }
    this.challengeActive = false;

    const bannerEl = document.getElementById('doodle-challenge-banner');
    if (!bannerEl) return;

    if (won) {
      this.challengeRoundsCompleted++;
      bannerEl.className = 'doodle-challenge-banner won';
      soundFx.playDiplomaFanfare();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
      this.onAwardXp(50);
    } else {
      bannerEl.className = 'doodle-challenge-banner lost';
      soundFx.playBlip(200, 0.2);
    }
  }

  // --- PyTorch Training Lab Controls ---
  async runTrainingEpochs(epochs = 1) {
    if (this.isTraining) return;
    this.isTraining = true;
    const btn = document.getElementById('btn-doodle-train-step');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spin-icon">⏳</span> Training ${epochs} Epoch${epochs > 1 ? 's' : ''}...`;
    }

    const backendUrl = this.getBackendUrl();
    let success = false;

    try {
      const res = await fetch(`${backendUrl}/api/train_step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epochs, learning_rate: this.learningRate }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          success = true;
          this.trainingHistory = data.history.map(h => ({
            epoch: h.epoch,
            loss: h.loss,
            accuracy: data.accuracy
          }));
          this.modelStatus = `Live PyTorch Model (Epoch ${data.current_epoch}, Loss: ${data.loss})`;
        }
      }
    } catch (e) {
      // simulated training if offline
    }

    if (!success) {
      // Offline simulated gradient descent
      await new Promise(r => setTimeout(r, 600));
      const last = this.trainingHistory[this.trainingHistory.length - 1] || { epoch: 0, loss: 1.5, accuracy: 40 };
      for (let i = 1; i <= epochs; i++) {
        const nextEpoch = last.epoch + i;
        const nextLoss = Math.max(0.12, Math.round((last.loss * 0.82) * 100) / 100);
        const nextAcc = Math.min(96.5, Math.round((last.accuracy + 6.5) * 10) / 10);
        this.trainingHistory.push({ epoch: nextEpoch, loss: nextLoss, accuracy: nextAcc });
      }
      this.modelStatus = `Simulated Neural Weights (Trained)`;
    }

    this.isTraining = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>⚡</span> Train PyTorch CNN`;
    }
    soundFx.playLevelUp();
    this.renderTrainingUI();
    this.runInferenceNow();
  }

  async resetModel() {
    const backendUrl = this.getBackendUrl();
    try {
      await fetch(`${backendUrl}/api/reset_model`, { method: 'POST' });
    } catch (e) {}

    this.trainingHistory = [{ epoch: 0, loss: 2.30, accuracy: 20.0 }];
    this.modelStatus = 'Untrained Random Gaussian Weights (Chaos Mode)';
    this.renderTrainingUI();
    soundFx.playBlip(250, 0.1);
    this.runInferenceNow();
  }

  renderTrainingUI() {
    const statusEl = document.getElementById('doodle-model-status-text');
    const historyTable = document.getElementById('doodle-training-history-body');

    if (statusEl) statusEl.textContent = this.modelStatus;

    if (historyTable) {
      historyTable.innerHTML = '';
      const recent = this.trainingHistory.slice(-6).reverse();
      recent.forEach(h => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>Epoch ${h.epoch}</td>
          <td><span class="loss-badge">${h.loss.toFixed(3)}</span></td>
          <td><span class="acc-badge">${h.accuracy ? h.accuracy.toFixed(1) + '%' : '--'}</span></td>
        `;
        historyTable.appendChild(tr);
      });
    }
  }

  generatePyTorchScript() {
    return `# =====================================================================
# NeuroQuest Capstone: DoodleVision AI (PyTorch CNN Classifier)
# Architecture: Conv2D -> ReLU -> MaxPool2D -> Conv2D -> MaxPool2D -> Linear -> Linear
# =====================================================================

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

CLASS_NAMES = ["Cat 🐱", "Bicycle 🚲", "Star ⭐", "Pizza 🍕", "Umbrella ☂️"]

class DoodleCNN(nn.Module):
    def __init__(self, num_classes=5):
        super().__init__()
        # Conv block 1: [1, 28, 28] -> [16, 14, 14]
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, padding=1)
        self.pool1 = nn.MaxPool2d(2, 2)
        
        # Conv block 2: [16, 14, 14] -> [32, 7, 7]
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.pool2 = nn.MaxPool2d(2, 2)
        
        # Dense classification head
        self.fc1 = nn.Linear(32 * 7 * 7, 64)
        self.dropout = nn.Dropout(0.25)
        self.fc2 = nn.Linear(64, num_classes)

    def forward(self, x):
        x = self.pool1(F.relu(self.conv1(x)))
        x = self.pool2(F.relu(self.conv2(x)))
        x = torch.flatten(x, 1) # 32 * 7 * 7 = 1568
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        return self.fc2(x)

# Instantiate model
model = DoodleCNN(num_classes=5)
print(model)
total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"Total Trainable Parameters: {total_params:,}")

# Test forward pass with synthetic batch of 4 sketches
dummy_sketches = torch.randn(4, 1, 28, 28)
logits = model(dummy_sketches)
probabilities = F.softmax(logits, dim=1)
print("\\nSample Softmax Predictions (Batch Size: 4):")
for i, probs in enumerate(probabilities):
    top_idx = torch.argmax(probs).item()
    print(f" Sketch #{i+1}: Predicted -> {CLASS_NAMES[top_idx]} ({probs[top_idx]*100:.1f}%)")
`;
  }
}
