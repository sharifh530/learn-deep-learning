/**
 * NeuroQuest: Neural Network Architecture Designer
 * Visual Multi-Layer Perceptron (MLP) Builder, Forward-Propagation Signal Simulator,
 * Live Trainable Parameter Counter, and 1-Click PyTorch Code Generator.
 */

import { soundFx } from './sound_effects.js';

export class ArchitectDesigner {
  constructor(options = {}) {
    this.container = options.container || null;
    this.canvas = options.canvas || null;
    this.controlsContainer = options.controlsContainer || null;
    this.codeOutput = options.codeOutput || null;
    this.paramsBadge = options.paramsBadge || null;
    this.inspectorBox = options.inspectorBox || null;

    this.layers = [
      { id: 'l-in', type: 'input', name: 'Input Layer', nodes: 3, activation: 'none' },
      { id: 'l-h1', type: 'hidden', name: 'Hidden Layer 1', nodes: 6, activation: 'relu' },
      { id: 'l-h2', type: 'hidden', name: 'Hidden Layer 2', nodes: 4, activation: 'relu' },
      { id: 'l-out', type: 'output', name: 'Output Layer', nodes: 2, activation: 'softmax' }
    ];

    this.selectedNode = { layerIdx: 1, nodeIdx: 2 };
    this.isPulsing = false;
    this.pulseProgress = 0; // 0.0 to 1.0
    this.pulseAnimId = null;

    this.presets = {
      default: [
        { type: 'input', nodes: 3, activation: 'none' },
        { type: 'hidden', nodes: 6, activation: 'relu' },
        { type: 'hidden', nodes: 4, activation: 'relu' },
        { type: 'output', nodes: 2, activation: 'softmax' }
      ],
      classifier: [
        { type: 'input', nodes: 4, activation: 'none' },
        { type: 'hidden', nodes: 12, activation: 'relu' },
        { type: 'hidden', nodes: 8, activation: 'relu' },
        { type: 'output', nodes: 3, activation: 'softmax' }
      ],
      bottleneck: [
        { type: 'input', nodes: 8, activation: 'none' },
        { type: 'hidden', nodes: 4, activation: 'relu' },
        { type: 'hidden', nodes: 2, activation: 'tanh' },
        { type: 'hidden', nodes: 4, activation: 'relu' },
        { type: 'output', nodes: 8, activation: 'sigmoid' }
      ],
      wide: [
        { type: 'input', nodes: 2, activation: 'none' },
        { type: 'hidden', nodes: 14, activation: 'gelu' },
        { type: 'output', nodes: 1, activation: 'sigmoid' }
      ],
      deep: [
        { type: 'input', nodes: 4, activation: 'none' },
        { type: 'hidden', nodes: 8, activation: 'relu' },
        { type: 'hidden', nodes: 8, activation: 'relu' },
        { type: 'hidden', nodes: 6, activation: 'relu' },
        { type: 'hidden', nodes: 4, activation: 'relu' },
        { type: 'output', nodes: 2, activation: 'softmax' }
      ]
    };
  }

  loadPreset(key) {
    const p = this.presets[key];
    if (!p) return;
    this.layers = p.map((l, idx) => ({
      id: `l-${Date.now()}-${idx}`,
      type: l.type,
      name: l.type === 'input' ? 'Input Layer' : l.type === 'output' ? 'Output Layer' : `Hidden Layer ${idx}`,
      nodes: l.nodes,
      activation: l.activation
    }));
    this.selectedNode = { layerIdx: 1, nodeIdx: 0 };
    this.update();
  }

  addHiddenLayer() {
    if (this.layers.length >= 6) {
      alert('Maximum of 6 layers supported in the interactive visualizer for optimal rendering.');
      return;
    }
    const insertIdx = this.layers.length - 1; // Before output layer
    const prevNodes = this.layers[insertIdx - 1]?.nodes || 4;
    const newNodes = Math.max(2, Math.min(8, prevNodes));

    this.layers.splice(insertIdx, 0, {
      id: `l-${Date.now()}`,
      type: 'hidden',
      name: `Hidden Layer ${insertIdx}`,
      nodes: newNodes,
      activation: 'relu'
    });

    this.reindexLayerNames();
    soundFx.playBlip(750);
    this.update();
  }

  removeHiddenLayer(idx) {
    if (this.layers[idx]?.type !== 'hidden') return;
    if (this.layers.filter(l => l.type === 'hidden').length <= 1) {
      alert('Architecture must have at least one hidden layer.');
      return;
    }
    this.layers.splice(idx, 1);
    this.reindexLayerNames();
    soundFx.playBlip(480);
    this.update();
  }

  setLayerNodes(idx, count) {
    if (!this.layers[idx]) return;
    this.layers[idx].nodes = Math.max(1, Math.min(16, count));
    soundFx.playBlip(600 + count * 20);
    this.update();
  }

  setLayerActivation(idx, activation) {
    if (!this.layers[idx]) return;
    this.layers[idx].activation = activation;
    this.update();
  }

  reindexLayerNames() {
    let hiddenCount = 1;
    this.layers.forEach(l => {
      if (l.type === 'hidden') {
        l.name = `Hidden Layer ${hiddenCount++}`;
      }
    });
  }

  calculateParameters() {
    let totalWeights = 0;
    let totalBiases = 0;
    const layerStats = [];

    for (let i = 0; i < this.layers.length - 1; i++) {
      const nIn = this.layers[i].nodes;
      const nOut = this.layers[i + 1].nodes;
      const w = nIn * nOut;
      const b = nOut;
      totalWeights += w;
      totalBiases += b;
      layerStats.push({
        from: this.layers[i].name,
        to: this.layers[i + 1].name,
        weights: w,
        biases: b,
        total: w + b
      });
    }

    return {
      weights: totalWeights,
      biases: totalBiases,
      total: totalWeights + totalBiases,
      layerStats
    };
  }

  generatePyTorchCode() {
    const lines = [
      '# PyTorch Neural Network generated by NeuroQuest Architect',
      'import torch',
      'import torch.nn as nn',
      '',
      'class CustomMLP(nn.Module):',
      '    def __init__(self):',
      '        super().__init__()',
      '        self.net = nn.Sequential('
    ];

    const actMap = {
      relu: 'nn.ReLU()',
      sigmoid: 'nn.Sigmoid()',
      tanh: 'nn.Tanh()',
      gelu: 'nn.GELU()',
      leaky_relu: 'nn.LeakyReLU(0.01)',
      softmax: 'nn.Softmax(dim=-1)',
      none: null
    };

    for (let i = 0; i < this.layers.length - 1; i++) {
      const inNodes = this.layers[i].nodes;
      const outNodes = this.layers[i + 1].nodes;
      const act = this.layers[i + 1].activation;
      const isLast = i === this.layers.length - 2;

      lines.push(`            nn.Linear(${inNodes}, ${outNodes}),`);
      const actCode = actMap[act];
      if (actCode) {
        lines.push(`            ${actCode}${isLast ? '' : ','}`);
      }
    }

    const inputDim = this.layers[0].nodes;
    lines.push('        )');
    lines.push('');
    lines.push('    def forward(self, x):');
    lines.push('        return self.net(x)');
    lines.push('');
    lines.push('# Instantiate & Test Forward Pass:');
    lines.push('model = CustomMLP()');
    lines.push(`dummy_x = torch.randn(1, ${inputDim})  # Batch size 1, input dimension ${inputDim}`);
    lines.push('output = model(dummy_x)');
    lines.push('print("Architecture Initialized!")');
    lines.push(`print(f"Total Parameters: {sum(p.numel() for p in model.parameters())}")`);
    lines.push('print("Output shape:", output.shape)');
    lines.push('print("Prediction vector:", output.detach().numpy().round(4))');

    return lines.join('\n');
  }

  triggerPulse() {
    if (this.isPulsing) return;
    this.isPulsing = true;
    this.pulseProgress = 0.0;
    soundFx.playTrainingStep();

    const startTime = performance.now();
    const duration = 1100; // ms

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      this.pulseProgress = Math.min(1.0, elapsed / duration);
      this.drawCanvas();

      if (this.pulseProgress < 1.0) {
        this.pulseAnimId = requestAnimationFrame(animate);
      } else {
        this.isPulsing = false;
        this.pulseProgress = 0.0;
        soundFx.playBlip(900, 0.08);
        this.drawCanvas();
      }
    };

    this.pulseAnimId = requestAnimationFrame(animate);
  }

  update() {
    this.renderControls();
    this.drawCanvas();
    this.updateStats();
    this.updateCode();
    this.updateInspector();
  }

  updateStats() {
    if (!this.paramsBadge) return;
    const stats = this.calculateParameters();
    this.paramsBadge.innerHTML = `
      <span class="stat-pill"><strong>${this.layers.length}</strong> Layers</span>
      <span class="stat-pill"><strong>${stats.weights}</strong> Weights</span>
      <span class="stat-pill"><strong>${stats.biases}</strong> Biases</span>
      <span class="stat-pill highlight">Total: <strong>${stats.total}</strong> Params</span>
    `;
  }

  updateCode() {
    if (!this.codeOutput) return;
    this.codeOutput.textContent = this.generatePyTorchCode();
  }

  updateInspector() {
    if (!this.inspectorBox) return;
    const { layerIdx, nodeIdx } = this.selectedNode;
    const layer = this.layers[layerIdx];
    if (!layer) return;

    if (layer.type === 'input') {
      this.inspectorBox.innerHTML = `
        <div class="inspector-badge">Input Node x<sub>${nodeIdx + 1}</sub></div>
        <p>Receives raw feature input from your data batch.</p>
        <div class="formula-line">Activation: <code>a = x<sub>${nodeIdx + 1}</sub></code></div>
      `;
    } else {
      const prevLayer = this.layers[layerIdx - 1];
      const prevNodes = prevLayer ? prevLayer.nodes : 0;
      this.inspectorBox.innerHTML = `
        <div class="inspector-badge">${layer.name} • Neuron n<sub>${nodeIdx + 1}</sub></div>
        <p>Computes dot product over all ${prevNodes} inputs from ${prevLayer.name}:</p>
        <div class="formula-line"><code>z = &Sigma;(w<sub>i</sub> &times; a<sub>i</sub>) + b</code></div>
        <div class="formula-line">Activation: <code>a = ${layer.activation.toUpperCase()}(z)</code></div>
      `;
    }
  }

  renderControls() {
    if (!this.controlsContainer) return;
    this.controlsContainer.innerHTML = '';

    this.layers.forEach((layer, idx) => {
      const col = document.createElement('div');
      col.className = `layer-column-control ${layer.type}`;

      // Title & node count
      const header = document.createElement('div');
      header.className = 'layer-col-header';
      header.innerHTML = `
        <span class="layer-tag-badge">${layer.name}</span>
        <div class="node-stepper">
          <button class="step-btn btn-minus" title="Decrease neurons">-</button>
          <span class="node-count-label">${layer.nodes} ${layer.nodes === 1 ? 'node' : 'nodes'}</span>
          <button class="step-btn btn-plus" title="Increase neurons">+</button>
        </div>
      `;

      header.querySelector('.btn-minus').addEventListener('click', () => {
        this.setLayerNodes(idx, layer.nodes - 1);
      });
      header.querySelector('.btn-plus').addEventListener('click', () => {
        this.setLayerNodes(idx, layer.nodes + 1);
      });

      col.appendChild(header);

      // Activation dropdown
      if (layer.type !== 'input') {
        const actGroup = document.createElement('div');
        actGroup.className = 'layer-act-group';
        actGroup.innerHTML = `
          <label>Activation:</label>
          <select class="act-select">
            <option value="relu" ${layer.activation === 'relu' ? 'selected' : ''}>ReLU</option>
            <option value="sigmoid" ${layer.activation === 'sigmoid' ? 'selected' : ''}>Sigmoid</option>
            <option value="tanh" ${layer.activation === 'tanh' ? 'selected' : ''}>Tanh</option>
            <option value="gelu" ${layer.activation === 'gelu' ? 'selected' : ''}>GELU</option>
            <option value="leaky_relu" ${layer.activation === 'leaky_relu' ? 'selected' : ''}>LeakyReLU</option>
            <option value="softmax" ${layer.activation === 'softmax' ? 'selected' : ''}>Softmax</option>
            <option value="none" ${layer.activation === 'none' ? 'selected' : ''}>Linear (None)</option>
          </select>
        `;
        actGroup.querySelector('.act-select').addEventListener('change', (e) => {
          this.setLayerActivation(idx, e.target.value);
        });
        col.appendChild(actGroup);
      }

      // Remove button for hidden layers
      if (layer.type === 'hidden') {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove-layer';
        removeBtn.innerHTML = '🗑️ Remove Layer';
        removeBtn.addEventListener('click', () => this.removeHiddenLayer(idx));
        col.appendChild(removeBtn);
      }

      this.controlsContainer.appendChild(col);
    });
  }

  drawCanvas() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark sleek background with subtle grid
    ctx.fillStyle = '#070b16';
    ctx.fillRect(0, 0, width, height);

    const numLayers = this.layers.length;
    const layerSpacing = (width - 160) / (numLayers - 1);
    const startX = 80;

    // Calculate node coordinates for each layer
    const nodeCoords = [];
    this.layers.forEach((layer, lIdx) => {
      const x = startX + lIdx * layerSpacing;
      const count = layer.nodes;
      const coords = [];

      // Clamp vertical spacing
      const maxNodeHeight = height - 120;
      const vSpacing = Math.min(52, maxNodeHeight / Math.max(count, 1));
      const startY = height / 2 - ((count - 1) * vSpacing) / 2;

      for (let n = 0; n < count; n++) {
        coords.push({
          x,
          y: startY + n * vSpacing,
          layerIdx: lIdx,
          nodeIdx: n
        });
      }
      nodeCoords.push(coords);
    });

    // 1. Draw Synaptic Connections (edges)
    for (let l = 0; l < numLayers - 1; l++) {
      const currentNodes = nodeCoords[l];
      const nextNodes = nodeCoords[l + 1];

      currentNodes.forEach((src, srcIdx) => {
        nextNodes.forEach((dst, dstIdx) => {
          // Pseudo-random deterministic weight color
          const pseudoWeight = Math.sin(srcIdx * 3 + dstIdx * 7 + l * 5);
          const isPositive = pseudoWeight >= 0;

          ctx.strokeStyle = isPositive
            ? `rgba(6, 182, 212, ${0.15 + Math.abs(pseudoWeight) * 0.15})`
            : `rgba(244, 63, 94, ${0.12 + Math.abs(pseudoWeight) * 0.12})`;
          ctx.lineWidth = 1 + Math.abs(pseudoWeight) * 1.5;

          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(dst.x, dst.y);
          ctx.stroke();
        });
      });
    }

    // 2. Draw Forward-Propagation Pulse Particles if active
    if (this.isPulsing) {
      const totalIntervals = numLayers - 1;
      const currentInterval = Math.floor(this.pulseProgress * totalIntervals);
      const intervalProgress = (this.pulseProgress * totalIntervals) % 1.0;

      if (currentInterval < totalIntervals) {
        const fromNodes = nodeCoords[currentInterval];
        const toNodes = nodeCoords[currentInterval + 1];

        fromNodes.forEach(src => {
          toNodes.forEach(dst => {
            const curX = src.x + (dst.x - src.x) * intervalProgress;
            const curY = src.y + (dst.y - src.y) * intervalProgress;

            // Glowing particle
            ctx.fillStyle = '#67e8f9';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(curX, curY, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset
          });
        });
      }
    }

    // 3. Draw Neurons (nodes)
    nodeCoords.forEach((layerNodes, lIdx) => {
      const layer = this.layers[lIdx];
      const isInput = layer.type === 'input';
      const isOutput = layer.type === 'output';

      layerNodes.forEach((node, nIdx) => {
        const isSelected =
          this.selectedNode &&
          this.selectedNode.layerIdx === lIdx &&
          this.selectedNode.nodeIdx === nIdx;

        // Outer glow on hover or active pulse
        const isPulseLit = this.isPulsing && Math.floor(this.pulseProgress * (numLayers - 1)) >= lIdx;

        ctx.save();
        if (isSelected || isPulseLit) {
          ctx.shadowColor = isInput ? '#34d399' : isOutput ? '#f59e0b' : '#a855f7';
          ctx.shadowBlur = isSelected ? 20 : 12;
        }

        // Neuron fill gradient
        const radius = 17;
        const grad = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
        if (isInput) {
          grad.addColorStop(0, '#6ee7b7');
          grad.addColorStop(1, '#059669');
        } else if (isOutput) {
          grad.addColorStop(0, '#fde68a');
          grad.addColorStop(1, '#d97706');
        } else {
          grad.addColorStop(0, '#c084fc');
          grad.addColorStop(1, '#7e22ce');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Stroke ring
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        ctx.restore();

        // Inner node label
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 11px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = isInput ? `x${nIdx + 1}` : isOutput ? `y${nIdx + 1}` : `h${nIdx + 1}`;
        ctx.fillText(label, node.x, node.y);
      });
    });

    // Store node coordinates for click detection
    this.cachedNodeCoords = nodeCoords;
  }

  setupEventListeners(canvas, controlsContainer) {
    this.canvas = canvas;
    this.controlsContainer = controlsContainer;

    // Node click inspector
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
      const clickY = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

      if (!this.cachedNodeCoords) return;

      for (const layerNodes of this.cachedNodeCoords) {
        for (const node of layerNodes) {
          const dist = Math.hypot(clickX - node.x, clickY - node.y);
          if (dist <= 22) {
            this.selectedNode = { layerIdx: node.layerIdx, nodeIdx: node.nodeIdx };
            soundFx.playBlip(700);
            this.drawCanvas();
            this.updateInspector();
            return;
          }
        }
      }
    });

    this.update();
  }
}
