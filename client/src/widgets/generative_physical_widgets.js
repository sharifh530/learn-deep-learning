import { soundFx } from '../sound_effects.js';
import confetti from 'canvas-confetti';
import { marked } from 'marked';
import katex from 'katex';

export function renderMoeRoutingLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'moe-lab-container';

  const config = quest.interactiveConfig || {};
  const experts = config.experts || [
    { id: 0, name: 'Math & Formal Logic', icon: '📐', desc: 'Calculus, differential equations, proofs, and algebraic manipulation' },
    { id: 1, name: 'Python & Algorithmic Code', icon: '🐍', desc: 'NumPy, data structures, profiling, and software architecture' },
    { id: 2, name: 'Creative & Literary Writing', icon: '✍️', desc: 'Metaphorical prose, poetry, dialogue, and storytelling' },
    { id: 3, name: 'Multilingual & Translation', icon: '🌐', desc: 'Cross-lingual alignment, syntax, idioms' },
    { id: 4, name: 'Science & Quantum Physics', icon: '⚛️', desc: 'Thermodynamics, quantum states, chemistry, and biology' },
    { id: 5, name: 'Legal & Regulatory Analysis', icon: '⚖️', desc: 'Compliance, commercial contracts, statutory precedents' },
    { id: 6, name: 'Historical & Humanities Factoids', icon: '🏛️', desc: 'Chronology, archival history, philosophy, and sociology' },
    { id: 7, name: 'Common Sense & Pragmatics', icon: '💡', desc: 'Spatial intuition, daily conversational cues, and sanity checks' }
  ];
  const prompts = config.prompts || [];
  const architectures = config.architectures || [];

  let promptIdx = state.moePromptIdx || 0;
  if (promptIdx >= prompts.length) promptIdx = 0;
  let activeTab = state.moeActiveTab || 'routing_inspector';
  let topK = state.moeTopK || 2;
  let selectedTokenIdx = state.moeSelectedTokenIdx ?? 2;
  let routingMode = state.moeRoutingMode || 'top2_mixtral';
  let auxLossWeight = state.moeAuxLossWeight ?? 0.01;
  let capacityFactor = state.moeCapacityFactor ?? 1.25;
  let routerTemperature = 1.0;
  let batchSize = 16;
  let seqLen = 1024;

  let xpRoutingClaimed = false;
  let xpAuxClaimed = false;
  let xpArchClaimed = false;

  // Simulator state for Tab 2
  let simStepsRan = false;
  let isSimulating = false;
  let simExpertCounts = [62, 63, 62, 63, 62, 63, 62, 63];
  let simExpertProbs = [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125];
  let simEntropy = 3.0;
  let simAuxLoss = 0.010;

  const currentPrompt = () => prompts[promptIdx] || {
    id: 'stem_math_code',
    title: 'Differential Equation in Python',
    category: 'STEM & Algorithmic Computing',
    tokens: ['Solve', 'the', 'differential', 'equation', 'dy/dx', '+', '2y', '=', 'e^(-x)', 'in', 'Python', 'NumPy.'],
    expectedTopK: { 'differential': [0, 4], 'equation': [0, 4], 'dy/dx': [0, 4], 'Python': [1, 0], 'NumPy.': [1, 0] }
  };

  function getRouterLogitsForToken(token) {
    const curP = currentPrompt();
    const cleanTok = token.replace(/[^a-zA-Z0-9_.\-\+]/g, '');
    const expMap = curP.expectedTopK || {};
    
    // Baseline logits
    const logits = [-0.6, -0.4, -1.1, -0.3, -0.8, -1.2, -1.0, 0.4];
    
    for (const [key, pair] of Object.entries(expMap)) {
      if (cleanTok.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanTok.toLowerCase())) {
        logits[pair[0]] += 4.6;
        logits[pair[1]] += 3.3;
        for (let i = 0; i < 8; i++) {
          if (i !== pair[0] && i !== pair[1]) logits[i] -= 1.2;
        }
        return logits;
      }
    }

    const lower = token.toLowerCase();
    if (['solve', 'calculate', 'dy/dx', '2y', '=', '+', '1d', 'equation'].some(k => lower.includes(k))) {
      logits[0] += 4.0;
      logits[4] += 2.8;
    } else if (['python', 'numpy', 'code', 'function'].some(k => lower.includes(k))) {
      logits[1] += 4.3;
      logits[0] += 2.1;
    } else if (['haiku', 'obsidian', 'temple', 'compose', 'evocative', 'rain.'].some(k => lower.includes(k))) {
      logits[2] += 4.2;
      logits[6] += 2.5;
    } else if (['french', 'english', 'majeure', 'force', 'contracts', 'clauses'].some(k => lower.includes(k))) {
      logits[5] += 4.1;
      logits[3] += 3.6;
    } else if (['wave', 'particle', 'energy', 'box.', 'ground-state'].some(k => lower.includes(k))) {
      logits[4] += 4.5;
      logits[0] += 2.7;
    } else {
      logits[7] += 3.4;
      logits[3] += 1.8;
    }

    return logits;
  }

  function computeRouting(token) {
    const rawLogits = getRouterLogitsForToken(token);
    const scaledLogits = rawLogits.map(z => z / Math.max(0.2, routerTemperature));
    const maxLogit = Math.max(...scaledLogits);
    const exps = scaledLogits.map(z => Math.exp(z - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const fullProbs = exps.map(e => e / sumExps);

    // Rank indices descending by probability
    const indexed = fullProbs.map((p, idx) => ({ idx, p, logit: rawLogits[idx] }));
    indexed.sort((a, b) => b.p - a.p);

    const topIndices = indexed.slice(0, topK).map(item => item.idx);
    const topProbSum = topIndices.reduce((sum, idx) => sum + fullProbs[idx], 0);

    // Compute normalized gating weights
    const gatingWeights = fullProbs.map((p, idx) => {
      if (topIndices.includes(idx)) {
        return p / topProbSum;
      }
      return 0.0;
    });

    return {
      rawLogits,
      fullProbs,
      topIndices,
      gatingWeights,
      indexed
    };
  }

  container.innerHTML = `
    <div class="moe-lab-header">
      <div class="moe-title-row">
        <div class="moe-title-badge">
          <span class="moe-icon">🔀</span>
          <div>
            <h3>Mixture-of-Experts (MoE) & Dynamic Routing Lab</h3>
            <p class="moe-subtitle">Master Sparse Top-k gating, load balancing auxiliary losses, and frontier conditional compute architectures (Mixtral 8x7B, Switch Transformer & DeepSeek-V3).</p>
          </div>
        </div>
        <div class="moe-tab-nav">
          <button class="moe-tab-btn ${activeTab === 'routing_inspector' ? 'active' : ''}" data-tab="routing_inspector">🎯 Sparse Top-k Router</button>
          <button class="moe-tab-btn ${activeTab === 'load_balancer' ? 'active' : ''}" data-tab="load_balancer">⚖️ Load Balancing Simulator</button>
          <button class="moe-tab-btn ${activeTab === 'arch_arena' ? 'active' : ''}" data-tab="arch_arena">🏛️ Frontier Architecture Arena</button>
        </div>
      </div>
    </div>

    <!-- Scenario Prompts Bar -->
    <div class="moe-scenario-bar">
      <span class="scenario-bar-label">📜 Select Input Prompt:</span>
      <div class="scenario-chips" id="moe-prompt-chips">
        ${prompts.map((p, idx) => `
          <button class="scenario-chip ${idx === promptIdx ? 'active' : ''}" data-prompt-idx="${idx}">
            <span class="sc-icon">${idx === 0 ? '📐' : idx === 1 ? '✍️' : idx === 2 ? '⚖️' : '⚛️'}</span>
            <span class="sc-title">${p.title}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- TAB 1: SPARSE TOP-K ROUTER INSPECTOR -->
    <div class="moe-tab-panel" id="panel-routing-inspector" style="display: ${activeTab === 'routing_inspector' ? 'block' : 'none'};">
      <div class="moe-routing-layout">
        <!-- Token Sequence Stream Bar -->
        <div class="moe-card token-stream-card">
          <div class="card-header-flex">
            <div>
              <h4>Prompt Token Sequence & Dynamic Dispatch Stream</h4>
              <p class="card-hint">Click any token to observe its real-time router projection across all 8 specialized FFN experts.</p>
            </div>
            <div class="token-stream-badge">
              <span class="badge-dot pulse"></span>
              <span id="active-token-readout">Active Token: "${currentPrompt().tokens[selectedTokenIdx] || ''}"</span>
            </div>
          </div>
          <div class="token-chips-wrapper" id="token-chips-wrapper">
            <!-- Dynamically populated tokens -->
          </div>
        </div>

        <!-- Controls & Top-K Parameter Row -->
        <div class="moe-controls-bar">
          <div class="control-group">
            <span class="ctrl-label">Top-K Selection:</span>
            <div class="topk-pill-group">
              <button class="topk-pill ${topK === 1 ? 'active' : ''}" data-k="1">Top-1 (Switch)</button>
              <button class="topk-pill ${topK === 2 ? 'active' : ''}" data-k="2">Top-2 (Mixtral)</button>
              <button class="topk-pill ${topK === 3 ? 'active' : ''}" data-k="3">Top-3 (Exploratory)</button>
            </div>
          </div>

          <div class="control-group">
            <label class="ctrl-label" for="moe-temp-slider">Router Softmax Temp (T): <strong id="temp-val-display">${routerTemperature.toFixed(2)}</strong></label>
            <input type="range" id="moe-temp-slider" min="0.2" max="2.0" step="0.1" value="${routerTemperature}" class="moe-slider">
          </div>

          <div class="control-metric-pill">
            <span class="metric-name">Active Compute:</span>
            <span class="metric-val highlight" id="active-compute-pct">${((topK / 8) * 100).toFixed(0)}% FLOPs</span>
            <span class="metric-sub" id="flops-saved-pct">(${(((8 - topK) / 8) * 100).toFixed(0)}% Saved)</span>
          </div>
        </div>

        <!-- 8-Expert Grid Matrix -->
        <div class="expert-matrix-container">
          <div class="matrix-header">
            <h4>8 Specialized FFN Experts Routing Matrix</h4>
            <span class="matrix-sub">Top-${topK} highlighted in emerald/cyan • Non-Top-${topK} masked to -∞ with 0 FLOPs executed</span>
          </div>
          <div class="expert-cards-grid" id="expert-cards-grid">
            <!-- Dynamically populated 8 expert cards -->
          </div>
        </div>

        <!-- Output Synthesis & Mathematical Dispatch Box -->
        <div class="moe-card dispatch-synthesis-card">
          <div class="card-header-flex">
            <div>
              <h4>Weighted Linear Combination & Output Synthesis</h4>
              <p class="card-hint">How the activated experts' feed-forward outputs are blended into the token residual stream.</p>
            </div>
            <button class="btn-claim-xp" id="btn-claim-routing-xp">🏆 Claim +25 XP</button>
          </div>
          <div class="synthesis-details" id="synthesis-details-box">
            <!-- Dynamically populated equation and explanation -->
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: ROUTER COLLAPSE & LOAD BALANCING SIMULATOR -->
    <div class="moe-tab-panel" id="panel-load-balancer" style="display: ${activeTab === 'load_balancer' ? 'block' : 'none'};">
      <div class="moe-load-layout">
        <div class="moe-card intro-theory-card">
          <div class="theory-grid">
            <div class="theory-item">
              <span class="theory-icon">💀</span>
              <h5>The Router Collapse Phenomenon</h5>
              <p>Without regularizing the router, a catastrophic positive feedback loop occurs: 1 or 2 experts randomly receive higher initial gradients, learn faster, and monopolize 90%+ of tokens. The remaining experts starve with zero updates!</p>
            </div>
            <div class="theory-item">
              <span class="theory-icon">⚖️</span>
              <h5>The Auxiliary Load Balancing Loss</h5>
              <p><code>L_aux = α · N · Σ (f_i · P_i)</code> penalizes non-uniform expert loads. The dot product of two probability vectors is minimized when both are uniform (1/N), forcing tokens to distribute evenly without degrading model quality.</p>
            </div>
          </div>
        </div>

        <!-- Simulator Interactive Controls -->
        <div class="moe-card sim-controls-card">
          <div class="sim-ctrl-row">
            <div class="sim-slider-group">
              <div class="slider-title-row">
                <label for="aux-loss-slider">Auxiliary Loss Weight (α): <strong id="aux-val-display">${auxLossWeight.toFixed(3)}</strong></label>
                <div class="preset-buttons">
                  <button class="preset-btn" data-alpha="0.000">α = 0.00 (Collapse!)</button>
                  <button class="preset-btn" data-alpha="0.010">α = 0.01 (Mixtral Standard)</button>
                  <button class="preset-btn" data-alpha="0.050">α = 0.05 (Strict Balance)</button>
                </div>
              </div>
              <input type="range" id="aux-loss-slider" min="0.000" max="0.080" step="0.005" value="${auxLossWeight}" class="moe-slider">
            </div>

            <div class="sim-actions-col">
              <button class="btn-primary" id="btn-run-sim-steps">
                <span class="sim-btn-icon">⚡</span> Run 500 Token Routing Steps
              </button>
              <button class="btn-ghost" id="btn-reset-sim">↺ Reset</button>
            </div>
          </div>
        </div>

        <!-- Live Load Distribution & Metrics -->
        <div class="sim-results-grid">
          <!-- Left: 8 Expert Distribution Bars -->
          <div class="moe-card expert-dist-card">
            <div class="card-header-flex">
              <h4>Expert Utilization Breakdown (500 Dispatched Tokens)</h4>
              <span class="target-line-legend">-- Target Uniform: 12.5% (62.5 tokens)</span>
            </div>
            <div class="dist-bars-container" id="dist-bars-container">
              <!-- Dynamically populated bars -->
            </div>
          </div>

          <!-- Right: Health Dashboard & Status -->
          <div class="moe-card health-dashboard-card">
            <div class="card-header-flex">
              <h4>Router Health & Stability Telemetry</h4>
              <button class="btn-claim-xp" id="btn-claim-aux-xp">🏆 Claim +25 XP</button>
            </div>

            <div class="health-metrics-list">
              <div class="telemetry-box" id="health-status-badge">
                <span class="telemetry-label">Router State</span>
                <span class="telemetry-val" id="telemetry-status-text">Balanced Stability</span>
              </div>

              <div class="telemetry-box">
                <span class="telemetry-label">Routing Entropy H (Max 3.0 bits)</span>
                <div class="gauge-bar-wrapper">
                  <div class="gauge-bar-fill" id="entropy-bar-fill" style="width: 100%;"></div>
                </div>
                <span class="telemetry-num" id="entropy-num-display">3.00 bits / 3.00</span>
              </div>

              <div class="telemetry-box">
                <span class="telemetry-label">Computed Aux Loss Penalty (L_aux)</span>
                <span class="telemetry-num highlight" id="aux-loss-penalty-display">0.0100</span>
              </div>

              <div class="telemetry-box">
                <span class="telemetry-label">Starved / Dead Experts (&lt; 2% load)</span>
                <span class="telemetry-num" id="starved-count-display">0 of 8</span>
              </div>
            </div>

            <div class="telemetry-takeaway" id="telemetry-takeaway-box">
              <p>Auxiliary loss is active (α = 0.01). The router maintains high entropy across all 8 experts, avoiding starvation and ensuring full capacity utilization.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: FRONTIER ARCHITECTURE ARENA -->
    <div class="moe-tab-panel" id="panel-arch-arena" style="display: ${activeTab === 'arch_arena' ? 'block' : 'none'};">
      <div class="moe-arena-layout">
        <!-- Architecture Cards Selector -->
        <div class="arch-selector-grid">
          ${architectures.map((arch, idx) => `
            <div class="arch-card ${arch.id === routingMode ? 'selected' : ''}" data-arch-id="${arch.id}">
              <div class="arch-card-header">
                <span class="arch-badge">${idx === 0 ? 'Google Switch' : idx === 1 ? 'Mistral AI' : 'DeepSeek AI'}</span>
                <h5>${arch.name}</h5>
              </div>
              <div class="arch-specs">
                <div class="spec-pair">
                  <span class="k">Active Routing:</span>
                  <span class="v">${arch.activeRatio}</span>
                </div>
                <div class="spec-pair">
                  <span class="k">Total Parameters:</span>
                  <span class="v">${arch.totalParams}</span>
                </div>
                <div class="spec-pair">
                  <span class="k">Active Parameters:</span>
                  <span class="v highlight">${arch.activeParams}</span>
                </div>
              </div>
              <p class="arch-desc">${arch.desc}</p>
            </div>
          `).join('')}
        </div>

        <!-- Dynamic Parameter & Capacity Factor Controls -->
        <div class="moe-card arch-details-card">
          <div class="card-header-flex">
            <div>
              <h4 id="arena-current-title">Mixtral 8x7B Architecture Diagnostics</h4>
              <p class="card-hint">Simulate real-world inference batching, VRAM requirements, and capacity factor buffer sizing.</p>
            </div>
            <button class="btn-claim-xp" id="btn-claim-arch-xp">🏆 Claim +30 XP</button>
          </div>

          <div class="arena-controls-row">
            <div class="arena-ctrl-item">
              <label for="arena-batch-slider">Batch Size (B): <strong id="arena-batch-display">${batchSize}</strong></label>
              <input type="range" id="arena-batch-slider" min="1" max="64" step="1" value="${batchSize}" class="moe-slider">
            </div>

            <div class="arena-ctrl-item">
              <label for="arena-seq-slider">Sequence Length (S): <strong id="arena-seq-display">${seqLen}</strong></label>
              <input type="range" id="arena-seq-slider" min="256" max="4096" step="256" value="${seqLen}" class="moe-slider">
            </div>

            <div class="arena-ctrl-item">
              <label for="arena-cap-slider">Capacity Factor (C): <strong id="arena-cap-display">${capacityFactor.toFixed(2)}</strong></label>
              <input type="range" id="arena-cap-slider" min="1.0" max="2.0" step="0.05" value="${capacityFactor}" class="moe-slider">
            </div>
          </div>

          <!-- Dynamic Calculations Grid -->
          <div class="arena-calc-grid" id="arena-calc-grid">
            <!-- Dynamically populated telemetry -->
          </div>

          <!-- Spiky Traffic Simulation Button -->
          <div class="spiky-sim-bar">
            <div class="spiky-info">
              <strong>Buffer Underflow & Token Dropping Test:</strong>
              <span>Inject random traffic spikes to test if tokens exceed expert capacity buffers.</span>
            </div>
            <button class="btn-secondary" id="btn-test-spiky-traffic">💥 Inject Spiky Traffic Burst</button>
          </div>

          <div class="spiky-result-card" id="spiky-result-card" style="display: none;">
            <!-- Populated on click -->
          </div>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.innerHTML = '';
  dom.interactiveContainer.appendChild(container);

  // --- TAB NAVIGATION ---
  const tabButtons = container.querySelectorAll('.moe-tab-btn');
  const tabPanels = {
    routing_inspector: container.querySelector('#panel-routing-inspector'),
    load_balancer: container.querySelector('#panel-load-balancer'),
    arch_arena: container.querySelector('#panel-arch-arena')
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      activeTab = targetTab;
      state.moeActiveTab = targetTab;
      tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      Object.entries(tabPanels).forEach(([key, panel]) => {
        if (panel) panel.style.display = key === targetTab ? 'block' : 'none';
      });
      soundFx.playBlip(540, 0.05);
    });
  });

  // --- PROMPT SELECTOR ---
  const promptChips = container.querySelectorAll('#moe-prompt-chips .scenario-chip');
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      promptIdx = parseInt(chip.dataset.promptIdx, 10);
      state.moePromptIdx = promptIdx;
      selectedTokenIdx = 0;
      state.moeSelectedTokenIdx = 0;
      promptChips.forEach(c => c.classList.toggle('active', c === chip));
      soundFx.playBlip(600 + promptIdx * 50, 0.05);
      renderTokensAndRouting();
    });
  });

  // --- TAB 1 LOGIC & RENDERING ---
  const tokensWrapper = container.querySelector('#token-chips-wrapper');
  const activeTokenReadout = container.querySelector('#active-token-readout');
  const expertCardsGrid = container.querySelector('#expert-cards-grid');
  const synthesisDetailsBox = container.querySelector('#synthesis-details-box');
  const topkPills = container.querySelectorAll('.topk-pill');
  const tempSlider = container.querySelector('#moe-temp-slider');
  const tempValDisplay = container.querySelector('#temp-val-display');
  const activeComputePct = container.querySelector('#active-compute-pct');
  const flopsSavedPct = container.querySelector('#flops-saved-pct');
  const btnClaimRoutingXp = container.querySelector('#btn-claim-routing-xp');

  topkPills.forEach(pill => {
    pill.addEventListener('click', () => {
      topK = parseInt(pill.dataset.k, 10);
      state.moeTopK = topK;
      topkPills.forEach(p => p.classList.toggle('active', p === pill));
      activeComputePct.textContent = `${((topK / 8) * 100).toFixed(0)}% FLOPs`;
      flopsSavedPct.textContent = `(${(((8 - topK) / 8) * 100).toFixed(0)}% Saved)`;
      soundFx.playBlip(700, 0.05);
      renderRoutingView();
    });
  });

  if (tempSlider) {
    tempSlider.addEventListener('input', (e) => {
      routerTemperature = parseFloat(e.target.value);
      if (tempValDisplay) tempValDisplay.textContent = routerTemperature.toFixed(2);
      renderRoutingView();
    });
  }

  function renderTokensAndRouting() {
    const curP = currentPrompt();
    tokensWrapper.innerHTML = '';

    curP.tokens.forEach((tok, idx) => {
      const chip = document.createElement('button');
      chip.className = `token-chip ${idx === selectedTokenIdx ? 'active' : ''}`;
      chip.innerHTML = `<span class="tok-text">${tok}</span><span class="tok-idx">t${idx}</span>`;
      chip.addEventListener('click', () => {
        selectedTokenIdx = idx;
        state.moeSelectedTokenIdx = idx;
        container.querySelectorAll('.token-chip').forEach((c, i) => c.classList.toggle('active', i === idx));
        soundFx.playBlip(620 + idx * 20, 0.04);
        renderRoutingView();
      });
      tokensWrapper.appendChild(chip);
    });

    renderRoutingView();
  }

  function renderRoutingView() {
    const curP = currentPrompt();
    const token = curP.tokens[selectedTokenIdx] || curP.tokens[0];
    if (activeTokenReadout) {
      activeTokenReadout.textContent = `Active Token: "${token}" (Index ${selectedTokenIdx})`;
    }

    const { rawLogits, fullProbs, topIndices, gatingWeights, indexed } = computeRouting(token);

    // Render Expert Cards
    expertCardsGrid.innerHTML = '';
    experts.forEach((exp, idx) => {
      const isSelected = topIndices.includes(idx);
      const gateW = gatingWeights[idx];
      const probPct = (fullProbs[idx] * 100).toFixed(1);
      const rawZ = rawLogits[idx].toFixed(2);

      const card = document.createElement('div');
      card.className = `expert-card ${isSelected ? 'active-expert' : 'idle-expert'}`;
      card.innerHTML = `
        <div class="exp-card-header">
          <div class="exp-title-flex">
            <span class="exp-icon">${exp.icon}</span>
            <div>
              <h6 class="exp-name">${exp.name}</h6>
              <span class="exp-id">Expert E${exp.id}</span>
            </div>
          </div>
          ${isSelected ? `<span class="topk-badge">TOP-${topIndices.indexOf(idx) + 1} ACTIVE</span>` : `<span class="idle-badge">IDLE (0 FLOPs)</span>`}
        </div>

        <div class="exp-meter-section">
          <div class="meter-info">
            <span class="meter-label">Router Probability P(e):</span>
            <span class="meter-val">${probPct}%</span>
          </div>
          <div class="meter-bar-track">
            <div class="meter-bar-fill ${isSelected ? 'accent-fill' : ''}" style="width: ${probPct}%;"></div>
          </div>
        </div>

        <div class="exp-meta-row">
          <span class="meta-item">Raw Logit: <code>${rawZ > 0 ? '+' : ''}${rawZ}</code></span>
          <span class="meta-item ${isSelected ? 'highlight' : ''}">Gating Weight (g_i): <strong>${isSelected ? (gateW * 100).toFixed(1) + '%' : '0.0%'}</strong></span>
        </div>

        <div class="exp-desc-snip">${exp.desc}</div>
      `;
      expertCardsGrid.appendChild(card);
    });

    // Render Synthesis Details Box
    const activeExperts = topIndices.map(idx => ({
      exp: experts[idx],
      weight: gatingWeights[idx]
    }));

    const mathTerms = activeExperts.map(ae => `${(ae.weight * 100).toFixed(1)}% × FFN_${ae.exp.id}(x)`).join(' + ');

    synthesisDetailsBox.innerHTML = `
      <div class="synth-eq-banner">
        <code class="synth-eq">y = ${mathTerms}</code>
      </div>
      <div class="synth-explanation">
        <div class="synth-col">
          <h6>Dynamic Expert Dispatch</h6>
          <p>Token <strong>"${token}"</strong> routes primarily to <strong>${activeExperts[0].exp.icon} ${activeExperts[0].exp.name}</strong> (${(activeExperts[0].weight * 100).toFixed(1)}% weight)${activeExperts[1] ? ` and secondarily to <strong>${activeExperts[1].exp.icon} ${activeExperts[1].exp.name}</strong> (${(activeExperts[1].weight * 100).toFixed(1)}% weight)` : ''}.</p>
        </div>
        <div class="synth-col">
          <h6>FLOP Compute Savings</h6>
          <p>By executing only <strong>${topK} of 8 experts</strong>, this Transformer achieves the parameter representation of an 8x larger model while consuming only <strong>${((topK / 8) * 100).toFixed(0)}%</strong> of standard dense inference compute!</p>
        </div>
      </div>
    `;
  }

  if (btnClaimRoutingXp) {
    btnClaimRoutingXp.addEventListener('click', () => {
      if (!xpRoutingClaimed) {
        xpRoutingClaimed = true;
        awardXp(25, 'Sparse Top-k Router Conquered');
        btnClaimRoutingXp.textContent = '✓ +25 XP Claimed!';
        btnClaimRoutingXp.disabled = true;
        btnClaimRoutingXp.style.opacity = '0.6';
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    });
  }

  // --- TAB 2 LOGIC: SIMULATOR ---
  const auxSlider = container.querySelector('#aux-loss-slider');
  const auxValDisplay = container.querySelector('#aux-val-display');
  const presetButtons = container.querySelectorAll('.preset-btn');
  const btnRunSimSteps = container.querySelector('#btn-run-sim-steps');
  const btnResetSim = container.querySelector('#btn-reset-sim');
  const distBarsContainer = container.querySelector('#dist-bars-container');
  const healthStatusBadge = container.querySelector('#health-status-badge');
  const telemetryStatusText = container.querySelector('#telemetry-status-text');
  const entropyBarFill = container.querySelector('#entropy-bar-fill');
  const entropyNumDisplay = container.querySelector('#entropy-num-display');
  const auxLossPenaltyDisplay = container.querySelector('#aux-loss-penalty-display');
  const starvedCountDisplay = container.querySelector('#starved-count-display');
  const telemetryTakeawayBox = container.querySelector('#telemetry-takeaway-box');
  const btnClaimAuxXp = container.querySelector('#btn-claim-aux-xp');

  function updateSimulatorUI() {
    const totalTokens = simExpertCounts.reduce((a, b) => a + b, 0) || 500;
    distBarsContainer.innerHTML = '';

    let starvedCount = 0;
    simExpertCounts.forEach((cnt, idx) => {
      const pct = (cnt / totalTokens) * 100;
      const isStarved = pct < 2.0;
      const isOverloaded = pct > 45.0;
      if (isStarved) starvedCount++;

      const barRow = document.createElement('div');
      barRow.className = 'dist-bar-row';
      barRow.innerHTML = `
        <div class="bar-expert-meta">
          <span class="be-icon">${experts[idx].icon}</span>
          <span class="be-name">${experts[idx].name}</span>
          <span class="be-tokens">${cnt} tokens (${pct.toFixed(1)}%)</span>
        </div>
        <div class="bar-track-wrapper">
          <div class="bar-target-guideline" style="left: 12.5%;" title="Target: 12.5%"></div>
          <div class="bar-fill ${isOverloaded ? 'overloaded' : isStarved ? 'starved' : 'balanced'}" style="width: ${Math.min(100, pct * 1.3)}%;"></div>
        </div>
      `;
      distBarsContainer.appendChild(barRow);
    });

    // Update telemetry
    entropyNumDisplay.textContent = `${simEntropy.toFixed(2)} bits / 3.00`;
    entropyBarFill.style.width = `${((simEntropy / 3.0) * 100).toFixed(0)}%`;
    auxLossPenaltyDisplay.textContent = simAuxLoss.toFixed(4);
    starvedCountDisplay.textContent = `${starvedCount} of 8 experts`;

    if (starvedCount >= 4 || simEntropy < 1.6) {
      healthStatusBadge.className = 'telemetry-box danger-box';
      telemetryStatusText.textContent = '⚠️ SEVERE ROUTER COLLAPSE';
      entropyBarFill.style.background = '#ef4444';
      telemetryTakeawayBox.innerHTML = `
        <p class="danger-txt"><strong>Router Collapse Active!</strong> With α = ${auxLossWeight.toFixed(3)}, Expert 0 and 1 have monopolized the router. ${starvedCount} experts are completely starved and receiving zero gradients, wasting parameter capacity!</p>
      `;
    } else if (starvedCount > 0) {
      healthStatusBadge.className = 'telemetry-box warning-box';
      telemetryStatusText.textContent = '⚡ MODERATE LOAD IMBALANCE';
      entropyBarFill.style.background = '#f59e0b';
      telemetryTakeawayBox.innerHTML = `
        <p class="warn-txt"><strong>Mild Imbalance:</strong> Increase α slightly (e.g. to 0.010) to evenly distribute tokens across all 8 experts.</p>
      `;
    } else {
      healthStatusBadge.className = 'telemetry-box success-box';
      telemetryStatusText.textContent = '✅ BALANCED STABILITY';
      entropyBarFill.style.background = '#10b981';
      telemetryTakeawayBox.innerHTML = `
        <p class="success-txt"><strong>Optimal Load Distribution:</strong> Auxiliary loss L_aux is penalizing routing concentration. All 8 experts are actively engaged with near-uniform 12.5% load!</p>
      `;
    }
  }

  function runSimulation() {
    if (isSimulating) return;
    isSimulating = true;
    btnRunSimSteps.disabled = true;
    btnRunSimSteps.innerHTML = `<span class="sim-btn-icon spin">🔄</span> Simulating 500 Steps...`;

    soundFx.playBlip(440, 0.08);

    setTimeout(() => {
      // Calculate outcome based on auxLossWeight
      if (auxLossWeight <= 0.002) {
        // Severe Collapse
        simExpertCounts = [365, 95, 12, 8, 6, 5, 5, 4];
        simEntropy = 1.15;
        simAuxLoss = 0.000;
      } else if (auxLossWeight < 0.008) {
        // Partial Collapse
        simExpertCounts = [210, 140, 45, 35, 25, 20, 15, 10];
        simEntropy = 2.15;
        simAuxLoss = auxLossWeight * 8 * 0.18;
      } else if (auxLossWeight <= 0.03) {
        // Balanced Stability (Mixtral Standard)
        simExpertCounts = [64, 61, 63, 62, 65, 60, 62, 63];
        simEntropy = 2.97;
        simAuxLoss = auxLossWeight * 8 * 0.125 * 0.125 * 8;
      } else {
        // High penalty: perfectly uniform
        simExpertCounts = [62, 63, 62, 63, 62, 63, 62, 63];
        simEntropy = 3.00;
        simAuxLoss = auxLossWeight * 8 * 0.125;
      }

      simStepsRan = true;
      isSimulating = false;
      btnRunSimSteps.disabled = false;
      btnRunSimSteps.innerHTML = `<span class="sim-btn-icon">⚡</span> Run 500 Token Routing Steps`;
      soundFx.playLevelUp();
      updateSimulatorUI();
    }, 450);
  }

  if (auxSlider) {
    auxSlider.addEventListener('input', (e) => {
      auxLossWeight = parseFloat(e.target.value);
      state.moeAuxLossWeight = auxLossWeight;
      if (auxValDisplay) auxValDisplay.textContent = auxLossWeight.toFixed(3);
      runSimulation();
    });
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      auxLossWeight = parseFloat(btn.dataset.alpha);
      state.moeAuxLossWeight = auxLossWeight;
      if (auxSlider) auxSlider.value = auxLossWeight;
      if (auxValDisplay) auxValDisplay.textContent = auxLossWeight.toFixed(3);
      soundFx.playBlip(580, 0.05);
      runSimulation();
    });
  });

  if (btnRunSimSteps) {
    btnRunSimSteps.addEventListener('click', runSimulation);
  }

  if (btnResetSim) {
    btnResetSim.addEventListener('click', () => {
      auxLossWeight = 0.01;
      state.moeAuxLossWeight = 0.01;
      if (auxSlider) auxSlider.value = 0.01;
      if (auxValDisplay) auxValDisplay.textContent = '0.010';
      simExpertCounts = [62, 63, 62, 63, 62, 63, 62, 63];
      simEntropy = 3.0;
      simAuxLoss = 0.010;
      soundFx.playBlip(500, 0.04);
      updateSimulatorUI();
    });
  }

  if (btnClaimAuxXp) {
    btnClaimAuxXp.addEventListener('click', () => {
      if (!xpAuxClaimed) {
        xpAuxClaimed = true;
        awardXp(25, 'Auxiliary Load Balancing Conquered');
        btnClaimAuxXp.textContent = '✓ +25 XP Claimed!';
        btnClaimAuxXp.disabled = true;
        btnClaimAuxXp.style.opacity = '0.6';
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    });
  }

  // --- TAB 3 LOGIC: ARCHITECTURE ARENA ---
  const archCards = container.querySelectorAll('.arch-card');
  const arenaTitle = container.querySelector('#arena-current-title');
  const batchSlider = container.querySelector('#arena-batch-slider');
  const batchDisplay = container.querySelector('#arena-batch-display');
  const seqSlider = container.querySelector('#arena-seq-slider');
  const seqDisplay = container.querySelector('#arena-seq-display');
  const capSlider = container.querySelector('#arena-cap-slider');
  const capDisplay = container.querySelector('#arena-cap-display');
  const arenaCalcGrid = container.querySelector('#arena-calc-grid');
  const btnTestSpiky = container.querySelector('#btn-test-spiky-traffic');
  const spikyResultCard = container.querySelector('#spiky-result-card');
  const btnClaimArchXp = container.querySelector('#btn-claim-arch-xp');

  archCards.forEach(card => {
    card.addEventListener('click', () => {
      routingMode = card.dataset.archId;
      state.moeRoutingMode = routingMode;
      archCards.forEach(c => c.classList.toggle('selected', c === card));
      soundFx.playBlip(650, 0.05);
      renderArenaDiagnostics();
    });
  });

  if (batchSlider) {
    batchSlider.addEventListener('input', (e) => {
      batchSize = parseInt(e.target.value, 10);
      if (batchDisplay) batchDisplay.textContent = batchSize;
      renderArenaDiagnostics();
    });
  }

  if (seqSlider) {
    seqSlider.addEventListener('input', (e) => {
      seqLen = parseInt(e.target.value, 10);
      if (seqDisplay) seqDisplay.textContent = seqLen;
      renderArenaDiagnostics();
    });
  }

  if (capSlider) {
    capSlider.addEventListener('input', (e) => {
      capacityFactor = parseFloat(e.target.value);
      state.moeCapacityFactor = capacityFactor;
      if (capDisplay) capDisplay.textContent = capacityFactor.toFixed(2);
      renderArenaDiagnostics();
    });
  }

  function renderArenaDiagnostics() {
    const totalTokens = batchSize * seqLen;
    let numExperts = 8;
    let k = 2;
    let totalParams = 46.7;
    let activeParams = 12.9;
    let name = 'Mixtral 8x7B (Top-2 of 8)';
    let vramFp16 = 93.4;
    let vramQuant = 26.5;

    if (routingMode === 'top1_switch') {
      name = 'Switch Transformer (Top-1 of 8)';
      numExperts = 8;
      k = 1;
      totalParams = 26.0;
      activeParams = 3.25;
      vramFp16 = 52.0;
      vramQuant = 14.8;
    } else if (routingMode === 'shared_deepseek') {
      name = 'DeepSeek-V3 (1 Shared + Top-8 of 256)';
      numExperts = 256;
      k = 8;
      totalParams = 671.0;
      activeParams = 37.0;
      vramFp16 = 671.0;
      vramQuant = 185.0;
    }

    if (arenaTitle) arenaTitle.textContent = `${name} Diagnostics & Buffer Analysis`;

    // Tokens per expert capacity limit: ceil((Tokens * k / numExperts) * capacityFactor)
    const averageLoadPerExpert = Math.ceil((totalTokens * k) / numExperts);
    const capacityLimit = Math.ceil(averageLoadPerExpert * capacityFactor);
    const flopSavingsPct = (((totalParams - activeParams) / totalParams) * 100).toFixed(1);

    arenaCalcGrid.innerHTML = `
      <div class="calc-metric-box">
        <span class="calc-label">Total Batch Tokens (B × S)</span>
        <span class="calc-val">${totalTokens.toLocaleString()} tokens</span>
        <span class="calc-sub">${batchSize} batches × ${seqLen} seq len</span>
      </div>

      <div class="calc-metric-box">
        <span class="calc-label">Buffer Capacity Per Expert</span>
        <span class="calc-val highlight">${capacityLimit.toLocaleString()} tokens</span>
        <span class="calc-sub">Avg Load ${averageLoadPerExpert.toLocaleString()} × C=${capacityFactor.toFixed(2)}</span>
      </div>

      <div class="calc-metric-box">
        <span class="calc-label">GPU Memory Footprint</span>
        <span class="calc-val">${vramQuant.toFixed(0)} GB (4-bit)</span>
        <span class="calc-sub">Full FP16: ~${vramFp16.toFixed(0)} GB VRAM</span>
      </div>

      <div class="calc-metric-box">
        <span class="calc-label">Inference FLOP Savings</span>
        <span class="calc-val success-val">${flopSavingsPct}% SAVED</span>
        <span class="calc-sub">${activeParams}B active of ${totalParams}B total</span>
      </div>
    `;
  }

  if (btnTestSpiky) {
    btnTestSpiky.addEventListener('click', () => {
      soundFx.playBlip(750, 0.08);
      const totalTokens = batchSize * seqLen;
      let numExperts = routingMode === 'shared_deepseek' ? 256 : 8;
      let k = routingMode === 'top1_switch' ? 1 : routingMode === 'shared_deepseek' ? 8 : 2;
      const averageLoad = Math.ceil((totalTokens * k) / numExperts);
      const capacityLimit = Math.ceil(averageLoad * capacityFactor);

      // Random peak spike on busiest expert
      const spikeMultiplier = 1.05 + Math.random() * 0.45;
      const peakExpertLoad = Math.ceil(averageLoad * spikeMultiplier);
      const droppedTokens = Math.max(0, peakExpertLoad - capacityLimit);

      spikyResultCard.style.display = 'block';
      if (droppedTokens > 0) {
        spikyResultCard.className = 'spiky-result-card warning';
        spikyResultCard.innerHTML = `
          <h6>⚠️ Buffer Overflow Detected: ${droppedTokens.toLocaleString()} Tokens Dropped</h6>
          <p>Peak expert experienced <strong>${peakExpertLoad.toLocaleString()} tokens</strong>, exceeding capacity limit of <strong>${capacityLimit.toLocaleString()}</strong>.</p>
          <div class="dropped-solution">
            <span class="drop-tag">Residual Pass-Through</span>
            <p>In MoE architectures, dropped tokens are NOT lost or corrupted! They simply bypass the FFN layer via the residual skip connection: <code>y = x</code>. To eliminate drops, increase Capacity Factor C to <strong>${(spikeMultiplier + 0.05).toFixed(2)}</strong>.</p>
          </div>
        `;
      } else {
        spikyResultCard.className = 'spiky-result-card success';
        spikyResultCard.innerHTML = `
          <h6>✅ Perfect Buffer Clearance: 0 Tokens Dropped</h6>
          <p>Peak expert experienced <strong>${peakExpertLoad.toLocaleString()} tokens</strong>, safely below the capacity ceiling of <strong>${capacityLimit.toLocaleString()} tokens</strong> (Buffer headroom: +${(capacityLimit - peakExpertLoad).toLocaleString()} tokens).</p>
        `;
      }
    });
  }

  if (btnClaimArchXp) {
    btnClaimArchXp.addEventListener('click', () => {
      if (!xpArchClaimed) {
        xpArchClaimed = true;
        awardXp(30, 'Frontier MoE Architectures Mastered');
        btnClaimArchXp.textContent = '✓ +30 XP Claimed!';
        btnClaimArchXp.disabled = true;
        btnClaimArchXp.style.opacity = '0.6';
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    });
  }

  // Initial tab renders
  renderTokensAndRouting();
  updateSimulatorUI();
  renderArenaDiagnostics();
}


// --- WIDGET 17: Diffusion Models & Flow Matching Lab ---
export function renderDiffusionFlowLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'diff-lab-container';

  const config = quest.interactiveConfig || {};
  const scenarios = config.scenarios || [
    {
      id: 'cyberpunk_city',
      title: 'Cyberpunk Neon Metropolis',
      category: 'Sci-Fi & Urban Concept Art',
      prompt: 'A cinematic night view of a rainy neo-Tokyo alley with glowing holographic cyan kanji and purple reflections.',
      colorPalette: ['#06b6d4', '#ec4899', '#3b82f6', '#0f172a']
    },
    {
      id: 'deep_sea_jellyfish',
      title: 'Bioluminescent Abyss Jellyfish',
      category: 'Nature & Underwater Macro',
      prompt: 'An ethereal translucent medusa jellyfish drifting through midnight oceanic trenches with glowing emerald tentacles.',
      colorPalette: ['#10b981', '#06b6d4', '#6366f1', '#020617']
    },
    {
      id: 'cosmic_nebula',
      title: 'Orion Stellar Nursery & Spiral Galaxy',
      category: 'Astrophotography & Cosmos',
      prompt: 'Deep space Hubble view of a swirling violet nebula birthing golden proto-stars amidst interstellar dust.',
      colorPalette: ['#8b5cf6', '#f59e0b', '#ec4899', '#030712']
    },
    {
      id: 'renaissance_portrait',
      title: 'Renaissance Astrolabe Scholar',
      category: 'Classical Fine Art',
      prompt: 'A chiaroscuro oil painting of a Venetian astronomer in velvet robes examining an ornate brass astrolabe by candlelight.',
      colorPalette: ['#d97706', '#92400e', '#fef3c7', '#1c1917']
    }
  ];

  let scenarioIdx = state.diffScenarioIdx || 0;
  if (scenarioIdx >= scenarios.length) scenarioIdx = 0;
  let activeTab = state.diffActiveTab || 'noise_denoise_canvas';
  let timestep = state.diffTimestep ?? 500;
  let cfgScale = state.diffCfgScale ?? 7.5;
  let sampler = state.diffSampler || 'flow_matching';
  let numSteps = state.diffNumSteps || 20;

  let isDenoisingPlayback = false;
  let xpNoiseClaimed = false;
  let xpCfgClaimed = false;
  let xpFlowClaimed = false;

  const currentScenario = () => scenarios[scenarioIdx] || scenarios[0];

  // Mathematical Cosine Variance Schedule (Nichol & Dhariwal 2021)
  function getAlphaBar(t) {
    const s = 0.008;
    const normT = t / 1000;
    const fT = Math.cos(((normT + s) / (1 + s)) * (Math.PI / 2));
    const f0 = Math.cos((s / (1 + s)) * (Math.PI / 2));
    return Math.min(1.0, Math.max(0.0001, (fT * fT) / (f0 * f0)));
  }

  function getSnrDb(alphaBar) {
    const snr = alphaBar / Math.max(1e-5, 1.0 - alphaBar);
    return (10 * Math.log10(snr)).toFixed(1);
  }

  // Dynamic SVG Artwork Generator for each scenario
  function getSceneArtSvg(scId, noiseLevel = 0, filterStyle = '') {
    // noiseLevel in [0, 1]
    const noiseOpacity = (noiseLevel * 0.95).toFixed(2);
    const contentOpacity = Math.max(0.05, 1.0 - noiseLevel * 0.92).toFixed(2);

    let artContent = '';
    if (scId === 'cyberpunk_city') {
      artContent = `
        <!-- Cyberpunk Skyline -->
        <rect width="320" height="200" fill="#080d1a" />
        <!-- Distant Skyscrapers -->
        <rect x="20" y="40" width="35" height="160" fill="#0f172a" />
        <rect x="65" y="60" width="28" height="140" fill="#1e293b" />
        <rect x="100" y="25" width="42" height="175" fill="#0b1329" />
        <rect x="150" y="50" width="32" height="150" fill="#1e293b" />
        <rect x="190" y="20" width="48" height="180" fill="#0f172a" />
        <rect x="245" y="70" width="36" height="130" fill="#1e293b" />
        <rect x="288" y="45" width="25" height="155" fill="#0f172a" />
        
        <!-- Glowing Windows -->
        <circle cx="115" cy="40" r="1.5" fill="#06b6d4" />
        <circle cx="125" cy="40" r="1.5" fill="#ec4899" />
        <circle cx="115" cy="55" r="1.5" fill="#06b6d4" />
        <circle cx="125" cy="55" r="1.5" fill="#facc15" />
        <circle cx="205" cy="35" r="2" fill="#ec4899" />
        <circle cx="218" cy="35" r="2" fill="#06b6d4" />
        <circle cx="205" cy="50" r="2" fill="#06b6d4" />
        <circle cx="225" cy="50" r="2" fill="#ec4899" />

        <!-- Neon Holographic Kanji Signs -->
        <g filter="drop-shadow(0 0 6px #06b6d4)">
          <rect x="158" y="75" width="16" height="60" fill="rgba(6, 182, 212, 0.2)" stroke="#06b6d4" stroke-width="1.5" rx="3" />
          <text x="166" y="93" fill="#06b6d4" font-size="11" text-anchor="middle" font-family="sans-serif" font-weight="bold">東</text>
          <text x="166" y="111" fill="#06b6d4" font-size="11" text-anchor="middle" font-family="sans-serif" font-weight="bold">京</text>
          <text x="166" y="127" fill="#06b6d4" font-size="10" text-anchor="middle" font-family="sans-serif" font-weight="bold">新</text>
        </g>

        <!-- Magenta Hologram -->
        <g filter="drop-shadow(0 0 8px #ec4899)">
          <rect x="70" y="85" width="18" height="45" fill="rgba(236, 72, 153, 0.2)" stroke="#ec4899" stroke-width="1.5" rx="3" />
          <text x="79" y="102" fill="#ec4899" font-size="11" text-anchor="middle" font-family="sans-serif" font-weight="bold">ネ</text>
          <text x="79" y="120" fill="#ec4899" font-size="11" text-anchor="middle" font-family="sans-serif" font-weight="bold">オ</text>
        </g>

        <!-- Wet Asphalt Street & Neon Reflections -->
        <polygon points="0,175 320,175 320,200 0,200" fill="#050811" />
        <ellipse cx="166" cy="188" rx="25" ry="6" fill="rgba(6, 182, 212, 0.45)" filter="blur(2px)" />
        <ellipse cx="80" cy="188" rx="22" ry="5" fill="rgba(236, 72, 153, 0.45)" filter="blur(2px)" />
        <!-- Rain Streaks -->
        <line x1="40" y1="20" x2="25" y2="60" stroke="rgba(255,255,255,0.18)" stroke-width="0.8" />
        <line x1="120" y1="10" x2="105" y2="50" stroke="rgba(255,255,255,0.18)" stroke-width="0.8" />
        <line x1="220" y1="30" x2="205" y2="70" stroke="rgba(255,255,255,0.18)" stroke-width="0.8" />
        <line x1="280" y1="15" x2="265" y2="55" stroke="rgba(255,255,255,0.18)" stroke-width="0.8" />
      `;
    } else if (scId === 'deep_sea_jellyfish') {
      artContent = `
        <!-- Abyss Ocean -->
        <rect width="320" height="200" fill="#020617" />
        <!-- Ambient Depth Gradient -->
        <circle cx="160" cy="100" r="100" fill="rgba(16, 185, 129, 0.08)" filter="blur(30px)" />
        
        <!-- Glowing Bioluminescent Medusa Dome -->
        <g filter="drop-shadow(0 0 12px rgba(16, 185, 129, 0.8))">
          <!-- Bell Dome -->
          <path d="M 115,100 C 115,50 205,50 205,100 C 205,108 195,112 185,108 C 175,104 165,108 160,108 C 155,108 145,104 135,108 C 125,112 115,108 115,100 Z" 
                fill="rgba(16, 185, 129, 0.45)" stroke="#34d399" stroke-width="2" />
          <!-- Inner Organelle Core -->
          <ellipse cx="160" cy="85" rx="22" ry="16" fill="rgba(6, 182, 212, 0.7)" filter="drop-shadow(0 0 6px #06b6d4)" />
          <circle cx="160" cy="82" r="7" fill="#fef08a" />
        </g>

        <!-- Translucent Tentacles -->
        <g filter="drop-shadow(0 0 5px rgba(52, 211, 153, 0.7))">
          <path d="M 130,108 Q 120,135 135,160 T 125,195" fill="none" stroke="#6ee7b7" stroke-width="2" />
          <path d="M 145,108 Q 155,130 140,165 T 150,198" fill="none" stroke="#38bdf8" stroke-width="1.8" />
          <path d="M 160,108 Q 168,135 158,160 T 164,198" fill="none" stroke="#6ee7b7" stroke-width="2.2" />
          <path d="M 175,108 Q 165,130 180,165 T 172,198" fill="none" stroke="#38bdf8" stroke-width="1.8" />
          <path d="M 190,108 Q 200,135 185,160 T 195,195" fill="none" stroke="#6ee7b7" stroke-width="2" />
        </g>

        <!-- Marine Snow Flakes -->
        <circle cx="50" cy="40" r="1.5" fill="rgba(16,185,129,0.5)" />
        <circle cx="280" cy="70" r="2" fill="rgba(6,182,212,0.5)" />
        <circle cx="80" cy="160" r="1.5" fill="rgba(255,255,255,0.4)" />
        <circle cx="250" cy="150" r="2" fill="rgba(16,185,129,0.5)" />
      `;
    } else if (scId === 'cosmic_nebula') {
      artContent = `
        <!-- Deep Space Background -->
        <rect width="320" height="200" fill="#030712" />
        
        <!-- Swirling Violet Nebula Cloud -->
        <g filter="blur(14px)">
          <path d="M 40,100 Q 110,30 200,60 Q 280,90 260,150 Q 200,180 120,160 Z" fill="rgba(139, 92, 246, 0.45)" />
          <ellipse cx="160" cy="100" rx="70" ry="45" fill="rgba(236, 72, 153, 0.45)" transform="rotate(-18, 160, 100)" />
          <circle cx="160" cy="100" r="32" fill="rgba(245, 158, 11, 0.55)" />
        </g>

        <!-- Core Protostar Cluster -->
        <circle cx="160" cy="100" r="8" fill="#fff" filter="drop-shadow(0 0 10px #f59e0b)" />
        <circle cx="145" cy="92" r="4" fill="#fef08a" filter="drop-shadow(0 0 6px #f59e0b)" />
        <circle cx="178" cy="108" r="3.5" fill="#67e8f9" filter="drop-shadow(0 0 6px #38bdf8)" />

        <!-- Star Flare Lines -->
        <line x1="160" y1="70" x2="160" y2="130" stroke="rgba(255,255,255,0.85)" stroke-width="1.5" />
        <line x1="130" y1="100" x2="190" y2="100" stroke="rgba(255,255,255,0.85)" stroke-width="1.5" />

        <!-- Field Stars -->
        <circle cx="35" cy="30" r="1" fill="#fff" />
        <circle cx="75" cy="65" r="1.5" fill="#fef08a" />
        <circle cx="105" cy="25" r="1.2" fill="#fff" />
        <circle cx="230" cy="35" r="1" fill="#c4b5fd" />
        <circle cx="285" cy="50" r="1.5" fill="#fff" />
        <circle cx="270" cy="160" r="1.2" fill="#fca5a5" />
        <circle cx="60" cy="170" r="1" fill="#fff" />
      `;
    } else {
      artContent = `
        <!-- Renaissance Interior Chiaroscuro -->
        <rect width="320" height="200" fill="#120c06" />
        
        <!-- Gothic Arch Window (Night Sky) -->
        <path d="M 40,140 L 40,60 Q 65,30 90,60 L 90,140 Z" fill="#0f172a" stroke="#451a03" stroke-width="2" />
        <circle cx="65" cy="55" r="1.5" fill="#fff" />
        <circle cx="55" cy="75" r="1" fill="#fef3c7" />
        <circle cx="78" cy="70" r="1" fill="#fff" />

        <!-- Wooden Study Desk -->
        <polygon points="20,140 300,140 320,200 0,200" fill="#29180c" />
        
        <!-- Open Manuscript & Quill -->
        <rect x="75" y="152" width="60" height="35" fill="#fef3c7" rx="2" transform="rotate(-6, 105, 170)" />
        <line x1="82" y1="160" x2="128" y2="155" stroke="#78350f" stroke-width="1" />
        <line x1="84" y1="166" x2="126" y2="161" stroke="#78350f" stroke-width="1" />
        <line x1="86" y1="172" x2="122" y2="167" stroke="#78350f" stroke-width="1" />

        <!-- Golden Brass Astrolabe Rings -->
        <g transform="translate(185, 115)" filter="drop-shadow(0 0 6px rgba(245, 158, 11, 0.7))">
          <circle cx="25" cy="25" r="24" fill="none" stroke="#f59e0b" stroke-width="2.5" />
          <ellipse cx="25" cy="25" rx="24" ry="12" fill="none" stroke="#fbbf24" stroke-width="1.8" transform="rotate(30, 25, 25)" />
          <ellipse cx="25" cy="25" rx="24" ry="12" fill="none" stroke="#fbbf24" stroke-width="1.8" transform="rotate(-30, 25, 25)" />
          <circle cx="25" cy="25" r="5" fill="#d97706" />
          <line x1="25" y1="1" x2="25" y2="49" stroke="#f59e0b" stroke-width="2" />
        </g>

        <!-- Candle & Golden Flame Halo -->
        <rect x="145" y="132" width="10" height="28" fill="#fef3c7" rx="1" />
        <ellipse cx="150" cy="124" rx="4" ry="8" fill="#f59e0b" filter="drop-shadow(0 0 8px #f59e0b)" />
        <ellipse cx="150" cy="125" rx="2" ry="4" fill="#fff" />
        <!-- Candle Warm Light Gradient on Desk -->
        <circle cx="150" cy="140" r="50" fill="rgba(245, 158, 11, 0.12)" filter="blur(16px)" />
      `;
    }

    return `
      <svg viewBox="0 0 320 200" class="diff-viewport-svg" style="${filterStyle}">
        <defs>
          <filter id="diff-noise-filter-${scId}" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="${(0.65 + noiseLevel * 0.35).toFixed(2)}" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0" />
          </filter>
        </defs>

        <!-- Base Artwork Layer -->
        <g opacity="${contentOpacity}">
          ${artContent}
        </g>

        <!-- Procedural Noise Static Overlay -->
        <rect width="320" height="200" filter="url(#diff-noise-filter-${scId})" opacity="${noiseOpacity}" style="mix-blend-mode: screen;" />
      </svg>
    `;
  }

  container.innerHTML = `
    <div class="diff-lab-header">
      <div class="diff-title-row">
        <div class="diff-title-badge">
          <span class="diff-icon">🌊</span>
          <div>
            <h3>Diffusion Models & Rectified Flow Matching Lab</h3>
            <p class="diff-subtitle">Deconstruct forward Gaussian noise schedules, explore reverse Langevin denoising, tune Classifier-Free Guidance (CFG), and compare straight-line Flow Matching trajectories.</p>
          </div>
        </div>
        <div class="diff-tab-nav">
          <button class="diff-tab-btn ${activeTab === 'noise_denoise_canvas' ? 'active' : ''}" data-tab="noise_denoise_canvas">🌫️ Noise & Denoise Canvas</button>
          <button class="diff-tab-btn ${activeTab === 'cfg_sampler' ? 'active' : ''}" data-tab="cfg_sampler">🎯 CFG & Sampler Arena</button>
          <button class="diff-tab-btn ${activeTab === 'flow_matching' ? 'active' : ''}" data-tab="flow_matching">⚡ Flow Matching vs SDE</button>
        </div>
      </div>
    </div>

    <!-- Scenario Selector Bar -->
    <div class="diff-scenario-bar">
      <span class="scenario-bar-label">🎨 Select Generative Subject:</span>
      <div class="scenario-chips" id="diff-scenario-chips">
        ${scenarios.map((sc, idx) => `
          <button class="scenario-chip ${idx === scenarioIdx ? 'active' : ''}" data-sc-idx="${idx}">
            <span class="sc-icon">${idx === 0 ? '🌆' : idx === 1 ? '🪼' : idx === 2 ? '🌌' : '📜'}</span>
            <span class="sc-title">${sc.title}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- TAB 1: FORWARD NOISE & REVERSE DENOISE SCRUB CANVAS -->
    <div class="diff-tab-panel" id="panel-noise-denoise" style="display: ${activeTab === 'noise_denoise_canvas' ? 'block' : 'none'};">
      <div class="diff-canvas-layout">
        <!-- Left: Dynamic Viewport & Playback -->
        <div class="diff-card viewport-card">
          <div class="card-header-flex">
            <div>
              <h4 id="canvas-card-title">${currentScenario().title}</h4>
              <p class="card-hint">Scrub through timesteps t ∈ [0, 1000] to witness entropy dissolve the image or reconstruct it step-by-step.</p>
            </div>
            <div class="snr-telemetry-badge" id="snr-telemetry-badge">
              <span class="badge-dot pulse"></span>
              <span id="snr-db-readout">SNR: +12.4 dB</span>
            </div>
          </div>

          <div class="diff-viewport-wrapper" id="diff-viewport-wrapper">
            <!-- Dynamically populated SVG with noise overlay -->
          </div>

          <!-- Playback Actions Row -->
          <div class="playback-actions-bar">
            <button class="btn-primary" id="btn-animate-denoising">
              <span class="play-icon">▶</span> Animate Reverse Denoising (t=1000 ➔ 0)
            </button>
            <div class="step-quick-buttons">
              <button class="btn-step-preset" data-t="0">t = 0 (Clean)</button>
              <button class="btn-step-preset" data-t="250">t = 250</button>
              <button class="btn-step-preset" data-t="500">t = 500</button>
              <button class="btn-step-preset" data-t="750">t = 750</button>
              <button class="btn-step-preset" data-t="1000">t = 1000 (Noise)</button>
            </div>
          </div>
        </div>

        <!-- Right: Telemetry & Closed-Form Forward Formula -->
        <div class="diff-card telemetry-card">
          <div class="card-header-flex">
            <h4>Closed-Form Forward Leap & Thermodynamics</h4>
            <button class="btn-claim-xp" id="btn-claim-noise-xp">🏆 Claim +25 XP</button>
          </div>

          <!-- Timestep Scrubber Slider -->
          <div class="scrubber-box">
            <div class="scrubber-header">
              <label for="diff-t-slider">Diffusion Timestep (t): <strong id="t-val-display">${timestep}</strong> / 1000</label>
              <span class="progress-sub" id="t-progress-sub">Step 500 of 1000 (Midpoint)</span>
            </div>
            <input type="range" id="diff-t-slider" min="0" max="1000" step="10" value="${timestep}" class="diff-slider">
          </div>

          <!-- Signal vs Noise Ratios Bar -->
          <div class="signal-ratio-section">
            <div class="ratio-labels">
              <span class="signal-txt">Signal: √(ᾱ_t) = <strong id="signal-pct-display">70.7%</strong></span>
              <span class="noise-txt">Noise: √(1 - ᾱ_t) = <strong id="noise-pct-display">70.7%</strong></span>
            </div>
            <div class="ratio-bar-track">
              <div class="ratio-bar-signal" id="ratio-signal-bar" style="width: 50%;"></div>
              <div class="ratio-bar-noise" id="ratio-noise-bar" style="width: 50%;"></div>
            </div>
          </div>

          <!-- Formula & Mathematical Breakdown -->
          <div class="formula-banner">
            <code class="diff-formula">x_t = √(ᾱ_t) · x₀ + √(1 − ᾱ_t) · ε,   ε ~ 𝒩(0, I)</code>
          </div>

          <div class="telemetry-info-grid">
            <div class="info-item">
              <span class="lbl">Cumulative Variance ᾱ_t:</span>
              <span class="val highlight" id="alpha-bar-val">0.5000</span>
            </div>
            <div class="info-item">
              <span class="lbl">Inference Task:</span>
              <span class="val" id="task-type-val">Mid-Frequency Inpainting</span>
            </div>
          </div>

          <div class="explanation-box" id="step-explanation-box">
            <p>At <strong>t = 500</strong>, exactly half of the signal energy is preserved while half is Gaussian noise. The U-Net relies on cross-attention text conditioning to hallucinate global composition.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: CLASSIFIER-FREE GUIDANCE & SAMPLER ARENA -->
    <div class="diff-tab-panel" id="panel-cfg-sampler" style="display: ${activeTab === 'cfg_sampler' ? 'block' : 'none'};">
      <div class="cfg-arena-layout">
        <!-- Top: Prompt Conditioning Bar -->
        <div class="diff-card prompt-card">
          <div class="card-header-flex">
            <div>
              <h4>Cross-Attention Text Conditioning (c)</h4>
              <p class="card-hint">The target prompt encoded into continuous vectors by CLIP or T5.</p>
            </div>
            <span class="prompt-badge">CLIP-ViT-L/14 • 77 Tokens</span>
          </div>
          <div class="prompt-display-banner">
            <span class="prompt-icon">💬</span>
            <p class="prompt-text" id="cfg-prompt-display">"${currentScenario().prompt}"</p>
          </div>
        </div>

        <!-- Left: CFG Slider & Vector Extrapolation -->
        <div class="diff-card cfg-controls-card">
          <div class="card-header-flex">
            <h4>Classifier-Free Guidance (CFG) Extrapolation</h4>
            <button class="btn-claim-xp" id="btn-claim-cfg-xp">🏆 Claim +25 XP</button>
          </div>

          <div class="cfg-slider-group">
            <div class="cfg-slider-header">
              <label for="cfg-scale-slider">Guidance Scale (w): <strong id="cfg-scale-val">${cfgScale.toFixed(1)}</strong></label>
              <span class="cfg-status-pill" id="cfg-status-pill">★ Balanced Sweetspot</span>
            </div>
            <input type="range" id="cfg-scale-slider" min="1.0" max="20.0" step="0.5" value="${cfgScale}" class="diff-slider">
            <div class="preset-buttons">
              <button class="preset-btn" data-scale="1.0">w = 1.0 (Unguided)</button>
              <button class="preset-btn" data-scale="7.5">w = 7.5 (Optimal Sweetspot)</button>
              <button class="preset-btn" data-scale="20.0">w = 20.0 (Contrast Burn)</button>
            </div>
          </div>

          <!-- Vector Extrapolation Canvas -->
          <div class="vector-math-box">
            <div class="vm-header">
              <span class="vm-title">Noise Space Extrapolation Equation</span>
              <code>ε̃ = ε_uncond + w · (ε_cond - ε_uncond)</code>
            </div>
            <div class="vector-diagram-container" id="vector-diagram-container">
              <!-- Dynamically populated SVG vector diagram -->
            </div>
          </div>

          <div class="cfg-warning-box" id="cfg-warning-box" style="display: none;">
            <p><strong>⚠️ High-Guidance Distortion:</strong> At w ≥ 16.0, vector extrapolation overshoots the natural image distribution, causing pixel values to clip and creating severe chromatic aberration and contrast burn!</p>
          </div>
        </div>

        <!-- Right: Live Image Effect Preview & Sampler Diagnostics -->
        <div class="diff-card sampler-preview-card">
          <div class="card-header-flex">
            <h4>Visual Impact & Sampler Comparison</h4>
            <span class="res-badge">512×512 Resized</span>
          </div>

          <!-- Scaled Artwork with Filter -->
          <div class="cfg-preview-viewport" id="cfg-preview-viewport">
            <!-- Dynamically populated image with saturation filter -->
          </div>

          <!-- Sampler Selector & Latency -->
          <div class="sampler-selector-section">
            <label class="sampler-lbl">Inference Sampler Algorithm:</label>
            <div class="sampler-pills">
              <button class="sampler-pill ${sampler === 'ddpm' ? 'active' : ''}" data-sampler="ddpm">DDPM (1000 Steps)</button>
              <button class="sampler-pill ${sampler === 'ddim' ? 'active' : ''}" data-sampler="ddim">DDIM (50 Steps)</button>
              <button class="sampler-pill ${sampler === 'flow_matching' ? 'active' : ''}" data-sampler="flow_matching">Flow Matching (20 Steps) ★</button>
            </div>
            <div class="sampler-specs-row" id="sampler-specs-row">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: RECTIFIED FLOW MATCHING VS BROWNIAN DIFFUSION -->
    <div class="diff-tab-panel" id="panel-flow-matching" style="display: ${activeTab === 'flow_matching' ? 'block' : 'none'};">
      <div class="flow-layout">
        <!-- Theory Header Card -->
        <div class="diff-card flow-theory-card">
          <div class="flow-theory-grid">
            <div class="ft-item">
              <span class="ft-icon">🌪️</span>
              <h5>Brownian Diffusion SDE (Curved)</h5>
              <p>Classic DDPM treats generation as reverse Brownian motion. The probability flow ODE trajectory curves wildly through high-dimensional space. Discretization errors accumulate rapidly if steps fall below 50.</p>
            </div>
            <div class="ft-item">
              <span class="ft-icon">⚡</span>
              <h5>Rectified Flow Matching (Straight Highway)</h5>
              <p>Flux.1 and Stable Diffusion 3 define generative paths along direct straight lines: <code>x_t = (1 - t)x₀ + t x₁</code> with constant target velocity <code>v_t = x₁ - x₀</code>. Straight lines allow Euler integration in just 15-20 steps!</p>
            </div>
          </div>
        </div>

        <!-- Interactive Phase Space & Step Slider -->
        <div class="diff-card phase-space-card">
          <div class="card-header-flex">
            <div>
              <h4>2D Generative Phase Space: Trajectory Curvature & Drift Error</h4>
              <p class="card-hint">Compare particle trajectories from Gaussian noise prior (x₁) to data cluster (x₀).</p>
            </div>
            <button class="btn-claim-xp" id="btn-claim-flow-xp">🏆 Claim +30 XP</button>
          </div>

          <div class="phase-controls-row">
            <div class="step-slider-group">
              <label for="flow-steps-slider">Euler Integration Steps (N): <strong id="flow-steps-val">${numSteps}</strong> steps</label>
              <input type="range" id="flow-steps-slider" min="2" max="50" step="2" value="${numSteps}" class="diff-slider">
            </div>

            <div class="phase-actions">
              <button class="btn-primary" id="btn-rollout-particles">
                <span class="icon">🚀</span> Simulate Particle Trajectory Rollout
              </button>
            </div>
          </div>

          <!-- Phase Space Canvas -->
          <div class="phase-canvas-wrapper" id="phase-canvas-wrapper">
            <!-- Dynamically populated SVG with trajectory curves -->
          </div>

          <!-- Telemetry Comparison Metrics -->
          <div class="flow-metrics-grid" id="flow-metrics-grid">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.innerHTML = '';
  dom.interactiveContainer.appendChild(container);

  // --- TAB NAVIGATION ---
  const tabButtons = container.querySelectorAll('.diff-tab-btn');
  const tabPanels = {
    noise_denoise_canvas: container.querySelector('#panel-noise-denoise'),
    cfg_sampler: container.querySelector('#panel-cfg-sampler'),
    flow_matching: container.querySelector('#panel-flow-matching')
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      activeTab = targetTab;
      state.diffActiveTab = targetTab;
      tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      Object.entries(tabPanels).forEach(([key, panel]) => {
        if (panel) panel.style.display = key === targetTab ? 'block' : 'none';
      });
      soundFx.playBlip(540, 0.05);
    });
  });

  // --- SCENARIO SELECTOR ---
  const scenarioChips = container.querySelectorAll('#diff-scenario-chips .scenario-chip');
  scenarioChips.forEach(chip => {
    chip.addEventListener('click', () => {
      scenarioIdx = parseInt(chip.dataset.scIdx, 10);
      state.diffScenarioIdx = scenarioIdx;
      scenarioChips.forEach(c => c.classList.toggle('active', c === chip));
      soundFx.playBlip(600 + scenarioIdx * 40, 0.05);
      renderAllTabs();
    });
  });

  // --- TAB 1 LOGIC: FORWARD & REVERSE NOISE CANVAS ---
  const viewportWrapper = container.querySelector('#diff-viewport-wrapper');
  const tSlider = container.querySelector('#diff-t-slider');
  const tValDisplay = container.querySelector('#t-val-display');
  const tProgressSub = container.querySelector('#t-progress-sub');
  const snrDbReadout = container.querySelector('#snr-db-readout');
  const signalPctDisplay = container.querySelector('#signal-pct-display');
  const noisePctDisplay = container.querySelector('#noise-pct-display');
  const ratioSignalBar = container.querySelector('#ratio-signal-bar');
  const ratioNoiseBar = container.querySelector('#ratio-noise-bar');
  const alphaBarVal = container.querySelector('#alpha-bar-val');
  const taskTypeVal = container.querySelector('#task-type-val');
  const stepExplanationBox = container.querySelector('#step-explanation-box');
  const btnAnimateDenoising = container.querySelector('#btn-animate-denoising');
  const stepPresetButtons = container.querySelectorAll('.btn-step-preset');
  const btnClaimNoiseXp = container.querySelector('#btn-claim-noise-xp');

  function updateNoiseCanvas() {
    const sc = currentScenario();
    const alphaBar = getAlphaBar(timestep);
    const snrDb = getSnrDb(alphaBar);
    const signalAmp = Math.sqrt(alphaBar);
    const noiseAmp = Math.sqrt(1.0 - alphaBar);

    // Update displays
    if (tValDisplay) tValDisplay.textContent = timestep;
    if (alphaBarVal) alphaBarVal.textContent = alphaBar.toFixed(4);
    if (snrDbReadout) snrDbReadout.textContent = `SNR: ${snrDb > 0 ? '+' : ''}${snrDb} dB`;
    if (signalPctDisplay) signalPctDisplay.textContent = `${(signalAmp * 100).toFixed(1)}%`;
    if (noisePctDisplay) noisePctDisplay.textContent = `${(noiseAmp * 100).toFixed(1)}%`;
    if (ratioSignalBar) ratioSignalBar.style.width = `${(signalAmp / (signalAmp + noiseAmp) * 100).toFixed(0)}%`;
    if (ratioNoiseBar) ratioNoiseBar.style.width = `${(noiseAmp / (signalAmp + noiseAmp) * 100).toFixed(0)}%`;

    if (tProgressSub) {
      if (timestep <= 100) tProgressSub.textContent = 'Step 0-100: Micro Detail Cleaning';
      else if (timestep <= 400) tProgressSub.textContent = 'Step 100-400: Mid-Frequency Edge Synthesis';
      else if (timestep <= 750) tProgressSub.textContent = 'Step 400-750: Global Geometry Formation';
      else tProgressSub.textContent = 'Step 750-1000: Coarse Compositional Halos';
    }

    if (taskTypeVal) {
      if (timestep <= 150) taskTypeVal.textContent = 'High-Frequency Texture Cleaning';
      else if (timestep <= 600) taskTypeVal.textContent = 'Mid-Frequency Semantic Formation';
      else taskTypeVal.textContent = 'Coarse Spatial Composition';
    }

    if (stepExplanationBox) {
      if (timestep <= 50) {
        stepExplanationBox.innerHTML = `<p>At <strong>t = ${timestep}</strong>, the image is 99% clean. The U-Net performs micro-detail sharpening on hair, wet reflections, and fine text.</p>`;
      } else if (timestep <= 500) {
        stepExplanationBox.innerHTML = `<p>At <strong>t = ${timestep}</strong>, signal energy equals noise energy (0 dB). Structural silhouettes and dominant color palettes crystallize from the mist.</p>`;
      } else {
        stepExplanationBox.innerHTML = `<p>At <strong>t = ${timestep}</strong>, noise completely dominates (SNR: ${snrDb} dB). The U-Net receives cross-attention prompt guidance to decide initial layout seeds.</p>`;
      }
    }

    // Render SVG
    if (viewportWrapper) {
      viewportWrapper.innerHTML = getSceneArtSvg(sc.id, noiseAmp);
    }
  }

  if (tSlider) {
    tSlider.addEventListener('input', (e) => {
      timestep = parseInt(e.target.value, 10);
      state.diffTimestep = timestep;
      updateNoiseCanvas();
    });
  }

  stepPresetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      timestep = parseInt(btn.dataset.t, 10);
      state.diffTimestep = timestep;
      if (tSlider) tSlider.value = timestep;
      soundFx.playBlip(550 + timestep * 0.3, 0.04);
      updateNoiseCanvas();
    });
  });

  if (btnAnimateDenoising) {
    btnAnimateDenoising.addEventListener('click', () => {
      if (isDenoisingPlayback) return;
      isDenoisingPlayback = true;
      btnAnimateDenoising.disabled = true;
      btnAnimateDenoising.innerHTML = `<span class="play-icon spin">🔄</span> Denoising Reverse Loop...`;

      timestep = 1000;
      updateNoiseCanvas();

      const keyframes = [900, 800, 700, 600, 500, 400, 300, 200, 100, 0];
      let kIdx = 0;

      const interval = setInterval(() => {
        if (kIdx >= keyframes.length) {
          clearInterval(interval);
          isDenoisingPlayback = false;
          btnAnimateDenoising.disabled = false;
          btnAnimateDenoising.innerHTML = `<span class="play-icon">▶</span> Animate Reverse Denoising (t=1000 ➔ 0)`;
          soundFx.playLevelUp();
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
          return;
        }

        timestep = keyframes[kIdx];
        state.diffTimestep = timestep;
        if (tSlider) tSlider.value = timestep;
        soundFx.playBlip(400 + (keyframes.length - kIdx) * 50, 0.04);
        updateNoiseCanvas();
        kIdx++;
      }, 250);
    });
  }

  if (btnClaimNoiseXp) {
    btnClaimNoiseXp.addEventListener('click', () => {
      if (!xpNoiseClaimed) {
        xpNoiseClaimed = true;
        awardXp(25, 'Forward & Reverse Diffusion Conquered');
        btnClaimNoiseXp.textContent = '✓ +25 XP Claimed!';
        btnClaimNoiseXp.disabled = true;
        btnClaimNoiseXp.style.opacity = '0.6';
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    });
  }

  // --- TAB 2 LOGIC: CFG & SAMPLER ARENA ---
  const cfgPromptDisplay = container.querySelector('#cfg-prompt-display');
  const cfgScaleSlider = container.querySelector('#cfg-scale-slider');
  const cfgScaleVal = container.querySelector('#cfg-scale-val');
  const cfgStatusPill = container.querySelector('#cfg-status-pill');
  const cfgPresetButtons = container.querySelectorAll('.cfg-slider-group .preset-btn');
  const vectorDiagramContainer = container.querySelector('#vector-diagram-container');
  const cfgWarningBox = container.querySelector('#cfg-warning-box');
  const cfgPreviewViewport = container.querySelector('#cfg-preview-viewport');
  const samplerPills = container.querySelectorAll('.sampler-pill');
  const samplerSpecsRow = container.querySelector('#sampler-specs-row');
  const btnClaimCfgXp = container.querySelector('#btn-claim-cfg-xp');

  function updateCfgArena() {
    const sc = currentScenario();
    if (cfgPromptDisplay) cfgPromptDisplay.textContent = `"${sc.prompt}"`;
    if (cfgScaleVal) cfgScaleVal.textContent = cfgScale.toFixed(1);

    // Update CFG status and warning
    if (cfgStatusPill) {
      if (cfgScale <= 2.5) {
        cfgStatusPill.className = 'cfg-status-pill underguided';
        cfgStatusPill.textContent = '⚠️ Under-Guided (Washed Out)';
        if (cfgWarningBox) cfgWarningBox.style.display = 'none';
      } else if (cfgScale <= 6.5) {
        cfgStatusPill.className = 'cfg-status-pill mild';
        cfgStatusPill.textContent = 'Mild Guidance (Natural)';
        if (cfgWarningBox) cfgWarningBox.style.display = 'none';
      } else if (cfgScale <= 9.0) {
        cfgStatusPill.className = 'cfg-status-pill optimal';
        cfgStatusPill.textContent = '★ Balanced Sweetspot (High Fidelity)';
        if (cfgWarningBox) cfgWarningBox.style.display = 'none';
      } else if (cfgScale <= 14.0) {
        cfgStatusPill.className = 'cfg-status-pill stylized';
        cfgStatusPill.textContent = 'Strong Stylization (High Contrast)';
        if (cfgWarningBox) cfgWarningBox.style.display = 'none';
      } else {
        cfgStatusPill.className = 'cfg-status-pill burned';
        cfgStatusPill.textContent = '🔥 Contrast Burn / Artifacts';
        if (cfgWarningBox) cfgWarningBox.style.display = 'block';
      }
    }

    // Dynamic Filter Style for Preview Image
    let filterStyle = '';
    if (cfgScale <= 2.0) {
      filterStyle = 'filter: saturate(0.55) contrast(0.85);';
    } else if (cfgScale <= 5.0) {
      filterStyle = 'filter: saturate(0.85) contrast(0.95);';
    } else if (cfgScale <= 9.0) {
      filterStyle = 'filter: saturate(1.2) contrast(1.1);';
    } else if (cfgScale <= 14.0) {
      filterStyle = 'filter: saturate(1.7) contrast(1.4);';
    } else {
      filterStyle = 'filter: saturate(2.6) contrast(2.2) brightness(1.15) drop-shadow(0 0 10px rgba(239, 68, 68, 0.7));';
    }

    if (cfgPreviewViewport) {
      cfgPreviewViewport.innerHTML = getSceneArtSvg(sc.id, 0.08, filterStyle);
    }

    // Render Vector Diagram
    if (vectorDiagramContainer) {
      const uX = 90;
      const uY = 65;
      const cX = 140;
      const cY = 40;
      // Extrapolate: u + w * (c - u)
      const diffX = cX - uX;
      const diffY = cY - uY;
      const normW = Math.min(2.5, 0.4 + (cfgScale / 20.0) * 2.1);
      const gX = Math.round(uX + diffX * normW);
      const gY = Math.round(uY + diffY * normW);

      vectorDiagramContainer.innerHTML = `
        <svg viewBox="0 0 280 110" class="vector-svg">
          <!-- Origin Base Latent -->
          <circle cx="30" cy="85" r="4" fill="#f59e0b" />
          <text x="30" y="100" fill="#f59e0b" font-size="8" text-anchor="middle" font-family="monospace">x_t</text>

          <!-- Vector 1: Unconditional eps_u -->
          <line x1="30" y1="85" x2="${uX}" y2="${uY}" stroke="#64748b" stroke-width="2" stroke-dasharray="3,2" />
          <circle cx="${uX}" cy="${uY}" r="3" fill="#64748b" />
          <text x="${uX - 10}" y="${uY - 6}" fill="#94a3b8" font-size="7.5" font-family="monospace">ε_uncond</text>

          <!-- Vector 2: Conditional eps_c -->
          <line x1="30" y1="85" x2="${cX}" y2="${cY}" stroke="#06b6d4" stroke-width="2" />
          <circle cx="${cX}" cy="${cY}" r="3" fill="#06b6d4" />
          <text x="${cX}" y="${cY - 6}" fill="#06b6d4" font-size="7.5" font-family="monospace" font-weight="bold">ε_cond</text>

          <!-- Vector Extrapolation Line (Red/Emerald) -->
          <line x1="${uX}" y1="${uY}" x2="${gX}" y2="${gY}" stroke="${cfgScale > 15 ? '#ef4444' : '#10b981'}" stroke-width="2.5" />
          <circle cx="${gX}" cy="${gY}" r="5" fill="${cfgScale > 15 ? '#ef4444' : '#10b981'}" />
          <text x="${gX}" y="${Math.max(12, gY - 8)}" fill="${cfgScale > 15 ? '#f87171' : '#34d399'}" font-size="8.5" font-family="monospace" font-weight="bold">
            Guided ε̃ (w=${cfgScale.toFixed(1)})
          </text>
        </svg>
      `;
    }

    // Sampler Specs row
    if (samplerSpecsRow) {
      if (sampler === 'ddpm') {
        samplerSpecsRow.innerHTML = `
          <div class="spec-col"><span class="k">Required Steps:</span><span class="v">1,000 passes</span></div>
          <div class="spec-col"><span class="k">Inference Latency:</span><span class="v">~18.5 seconds (Slow)</span></div>
          <div class="spec-col"><span class="k">Math Type:</span><span class="v">Stochastic Markov Chain</span></div>
        `;
      } else if (sampler === 'ddim') {
        samplerSpecsRow.innerHTML = `
          <div class="spec-col"><span class="k">Required Steps:</span><span class="v">50 passes</span></div>
          <div class="spec-col"><span class="k">Inference Latency:</span><span class="v">~920 ms (Fast)</span></div>
          <div class="spec-col"><span class="k">Math Type:</span><span class="v">Deterministic ODE Solver</span></div>
        `;
      } else {
        samplerSpecsRow.innerHTML = `
          <div class="spec-col"><span class="k">Required Steps:</span><span class="v highlight">20 passes</span></div>
          <div class="spec-col"><span class="k">Inference Latency:</span><span class="v highlight">~340 ms (Blazing Fast)</span></div>
          <div class="spec-col"><span class="k">Math Type:</span><span class="v highlight">Rectified Flow Matching</span></div>
        `;
      }
    }
  }

  if (cfgScaleSlider) {
    cfgScaleSlider.addEventListener('input', (e) => {
      cfgScale = parseFloat(e.target.value);
      state.diffCfgScale = cfgScale;
      updateCfgArena();
    });
  }

  cfgPresetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      cfgScale = parseFloat(btn.dataset.scale);
      state.diffCfgScale = cfgScale;
      if (cfgScaleSlider) cfgScaleSlider.value = cfgScale;
      soundFx.playBlip(620, 0.04);
      updateCfgArena();
    });
  });

  samplerPills.forEach(pill => {
    pill.addEventListener('click', () => {
      sampler = pill.dataset.sampler;
      state.diffSampler = sampler;
      samplerPills.forEach(p => p.classList.toggle('active', p === pill));
      soundFx.playBlip(680, 0.05);
      updateCfgArena();
    });
  });

  if (btnClaimCfgXp) {
    btnClaimCfgXp.addEventListener('click', () => {
      if (!xpCfgClaimed) {
        xpCfgClaimed = true;
        awardXp(25, 'Classifier-Free Guidance Conquered');
        btnClaimCfgXp.textContent = '✓ +25 XP Claimed!';
        btnClaimCfgXp.disabled = true;
        btnClaimCfgXp.style.opacity = '0.6';
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    });
  }

  // --- TAB 3 LOGIC: FLOW MATCHING VS SDE ---
  const flowStepsSlider = container.querySelector('#flow-steps-slider');
  const flowStepsVal = container.querySelector('#flow-steps-val');
  const btnRolloutParticles = container.querySelector('#btn-rollout-particles');
  const phaseCanvasWrapper = container.querySelector('#phase-canvas-wrapper');
  const flowMetricsGrid = container.querySelector('#flow-metrics-grid');
  const btnClaimFlowXp = container.querySelector('#btn-claim-flow-xp');

  let isRollingOut = false;

  function renderPhaseSpace() {
    if (flowStepsVal) flowStepsVal.textContent = numSteps;

    // Truncation Error Calculation
    const sdeDriftError = Math.max(1.2, (120 / numSteps)).toFixed(1);
    const flowDriftError = Math.max(0.1, (18 / (numSteps * numSteps))).toFixed(2);

    if (flowMetricsGrid) {
      flowMetricsGrid.innerHTML = `
        <div class="flow-metric-box danger">
          <span class="m-lbl">Curved Diffusion Drift Error</span>
          <span class="m-val">${sdeDriftError}% Deviation</span>
          <span class="m-sub">Wandering trajectory cuts corners</span>
        </div>

        <div class="flow-metric-box success">
          <span class="m-lbl">Rectified Flow Drift Error</span>
          <span class="m-val">${flowDriftError}% Deviation</span>
          <span class="m-sub">Linear velocity field (zero drift)</span>
        </div>

        <div class="flow-metric-box">
          <span class="m-lbl">Inference Speedup</span>
          <span class="m-val highlight">${(1000 / numSteps).toFixed(0)}× FASTER</span>
          <span class="m-sub">Compared to classic 1000-step DDPM</span>
        </div>

        <div class="flow-metric-box">
          <span class="m-lbl">Frontier Adoption</span>
          <span class="m-val">Flux.1 & SD 3</span>
          <span class="m-sub">State-of-the-art open weights</span>
        </div>
      `;
    }

    if (phaseCanvasWrapper) {
      phaseCanvasWrapper.innerHTML = `
        <svg viewBox="0 0 520 220" class="phase-svg">
          <!-- Background Grid Lines -->
          <line x1="40" y1="30" x2="40" y2="190" stroke="rgba(255,255,255,0.06)" />
          <line x1="160" y1="30" x2="160" y2="190" stroke="rgba(255,255,255,0.06)" />
          <line x1="280" y1="30" x2="280" y2="190" stroke="rgba(255,255,255,0.06)" />
          <line x1="400" y1="30" x2="400" y2="190" stroke="rgba(255,255,255,0.06)" />
          <line x1="40" y1="190" x2="480" y2="190" stroke="#475569" stroke-width="1.5" />

          <!-- Noise Prior Cluster (Left: x_1) -->
          <circle cx="80" cy="110" r="35" fill="rgba(239, 68, 68, 0.08)" stroke="#f87171" stroke-width="1" stroke-dasharray="2,2" />
          <circle cx="80" cy="110" r="5" fill="#f87171" />
          <text x="80" y="160" fill="#f87171" font-size="9" text-anchor="middle" font-family="monospace">Noise Prior x₁ ~ 𝒩(0, I)</text>

          <!-- Data Manifold Cluster (Right: x_0) -->
          <circle cx="440" cy="110" r="35" fill="rgba(16, 185, 129, 0.08)" stroke="#34d399" stroke-width="1" stroke-dasharray="2,2" />
          <circle cx="440" cy="110" r="5" fill="#34d399" />
          <text x="440" y="160" fill="#34d399" font-size="9" text-anchor="middle" font-family="monospace">Data Manifold x₀</text>

          <!-- 1. Curved Diffusion Path (Red dashed curve) -->
          <path d="M 80,110 C 180,25 240,200 440,110" fill="none" stroke="#f87171" stroke-width="2.5" stroke-dasharray="4,3" />
          <text x="210" y="45" fill="#fca5a5" font-size="8.5" font-family="monospace">Curved SDE Path (Brownian Drift)</text>

          <!-- 2. Rectified Flow Straight Highway (Emerald bold line) -->
          <line x1="80" y1="110" x2="440" y2="110" stroke="#10b981" stroke-width="3.5" />
          <circle cx="260" cy="110" r="4" fill="#10b981" />
          <text x="260" y="100" fill="#34d399" font-size="9.5" text-anchor="middle" font-family="monospace" font-weight="bold">
            Rectified Flow Vector v_t = x₁ - x₀ (Direct Laser)
          </text>
        </svg>
      `;
    }
  }

  if (flowStepsSlider) {
    flowStepsSlider.addEventListener('input', (e) => {
      numSteps = parseInt(e.target.value, 10);
      state.diffNumSteps = numSteps;
      renderPhaseSpace();
    });
  }

  if (btnRolloutParticles) {
    btnRolloutParticles.addEventListener('click', () => {
      if (isRollingOut) return;
      isRollingOut = true;
      btnRolloutParticles.disabled = true;
      btnRolloutParticles.innerHTML = `<span class="icon spin">🔄</span> Rolling Out Particles...`;
      soundFx.playBlip(720, 0.08);

      setTimeout(() => {
        isRollingOut = false;
        btnRolloutParticles.disabled = false;
        btnRolloutParticles.innerHTML = `<span class="icon">🚀</span> Simulate Particle Trajectory Rollout`;
        soundFx.playLevelUp();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }, 500);
    });
  }

  if (btnClaimFlowXp) {
    btnClaimFlowXp.addEventListener('click', () => {
      if (!xpFlowClaimed) {
        xpFlowClaimed = true;
        awardXp(30, 'Rectified Flow Matching Conquered');
        btnClaimFlowXp.textContent = '✓ +30 XP Claimed!';
        btnClaimFlowXp.disabled = true;
        btnClaimFlowXp.style.opacity = '0.6';
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    });
  }

  function renderAllTabs() {
    updateNoiseCanvas();
    updateCfgArena();
    renderPhaseSpace();
  }

  // Initial render
  renderAllTabs();
}



// --- WIDGET 18: Audio & Speech AI (Neural Codecs & RVQ Lab) ---
export function renderAudioSpeechLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'audio-lab-container';

  const scenarios = [
    {
      id: 'speech_vowel',
      title: 'Human Speech Formants (/a/ & /i/)',
      category: 'Vocal Tract Acoustics',
      description: 'Human vocal cords vibrate at pitch F0 (~120-240 Hz), shaped into distinctive formants (F1, F2, F3) by resonant mouth cavities.',
      baseFreq: 220,
      harmonics: [1.0, 0.75, 0.55, 0.35, 0.18, 0.08],
      energyEnvelope: [0.2, 0.8, 1.0, 0.9, 0.85, 0.7, 0.4, 0.1],
      codecBitrate4: '6.0 kbps',
      pesqScore: '3.9★ / 4.5'
    },
    {
      id: 'acoustic_guitar',
      title: 'Acoustic Guitar Harmonic Arpeggio',
      category: 'String Resonance & Timbre',
      description: 'Plucked nylon string produces sharp percussive transient attack followed by rich decaying harmonic overtone cascades.',
      baseFreq: 330,
      harmonics: [1.0, 0.85, 0.65, 0.45, 0.30, 0.22, 0.15, 0.08],
      energyEnvelope: [1.0, 0.6, 0.45, 0.35, 0.25, 0.18, 0.1, 0.05],
      codecBitrate4: '6.0 kbps',
      pesqScore: '4.1★ / 4.5'
    },
    {
      id: 'synthetic_lead',
      title: 'Cyberpunk Sawtooth Lead Synth',
      category: 'Electronic & Band-Limited Synthesis',
      description: 'Aggressive sawtooth wave with resonance sweeps across high harmonics, challenging standard audio codecs with dense frequency energy.',
      baseFreq: 175,
      harmonics: [1.0, 0.92, 0.82, 0.71, 0.62, 0.51, 0.43, 0.35],
      energyEnvelope: [0.5, 0.9, 0.95, 0.88, 0.82, 0.75, 0.65, 0.4],
      codecBitrate4: '6.0 kbps',
      pesqScore: '3.8★ / 4.5'
    },
    {
      id: 'ambient_urban',
      title: 'Metropolitan Urban Rain & Traffic',
      category: 'Broadband Environmental Noise',
      description: 'Stochastic rain drops combined with low-frequency bus rumble. Non-harmonic broadband noise tests codec reconstruction limits.',
      baseFreq: 110,
      harmonics: [0.7, 0.65, 0.6, 0.58, 0.52, 0.48, 0.44, 0.4],
      energyEnvelope: [0.6, 0.65, 0.62, 0.7, 0.68, 0.64, 0.6, 0.55],
      codecBitrate4: '6.0 kbps',
      pesqScore: '3.7★ / 4.5'
    }
  ];

  let scenarioIdx = state.audioScenarioIdx || 0;
  if (scenarioIdx >= scenarios.length) scenarioIdx = 0;
  let activeTab = state.audioActiveTab || 'spectrogram_synth';
  let rvqStages = state.audioRvqStages || 4;
  let melBins = state.audioMelBins || 80;
  let isPlayingAudio = false;
  let audioCtxInstance = null;
  let activeOscillators = [];
  let isGeneratingTokens = false;
  let tokenStep = 4; // default timeline step scrubber

  let xpSpectrogramClaimed = false;
  let xpRvqClaimed = false;
  let xpLlmClaimed = false;

  const currentSc = scenarios[scenarioIdx];

  // Helper Web Audio API synthesizer
  function toggleWebAudioPlayback() {
    if (isPlayingAudio) {
      stopWebAudio();
      return;
    }
    try {
      if (!audioCtxInstance) {
        audioCtxInstance = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxInstance.state === 'suspended') {
        audioCtxInstance.resume();
      }

      const masterGain = audioCtxInstance.createGain();
      masterGain.gain.setValueAtTime(0.15, audioCtxInstance.currentTime);
      masterGain.connect(audioCtxInstance.destination);

      activeOscillators = [];
      const baseF = currentSc.baseFreq;
      currentSc.harmonics.slice(0, 5).forEach((hAmp, idx) => {
        const osc = audioCtxInstance.createOscillator();
        const harmGain = audioCtxInstance.createGain();
        osc.type = idx === 0 ? 'sine' : (scenarioIdx === 2 ? 'sawtooth' : 'sine');
        osc.frequency.setValueAtTime(baseF * (idx + 1), audioCtxInstance.currentTime);
        harmGain.gain.setValueAtTime(hAmp * 0.25, audioCtxInstance.currentTime);
        osc.connect(harmGain);
        harmGain.connect(masterGain);
        osc.start();
        activeOscillators.push(osc);
      });

      isPlayingAudio = true;
      soundFx.playBlip(540, 0.05);
      updatePlayButtonUI();

      // Automatically stop after 3.5 seconds
      setTimeout(() => {
        if (isPlayingAudio) stopWebAudio();
      }, 3500);
    } catch (err) {
      console.warn('Web Audio playback failed or blocked:', err);
    }
  }

  function stopWebAudio() {
    activeOscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch (e) {}
    });
    activeOscillators = [];
    isPlayingAudio = false;
    updatePlayButtonUI();
  }

  function updatePlayButtonUI() {
    const btn = container.querySelector('#btn-play-synth-audio');
    if (btn) {
      if (isPlayingAudio) {
        btn.innerHTML = `<span class="icon">⏹</span> Stop Audio Tone`;
        btn.classList.add('playing');
      } else {
        btn.innerHTML = `<span class="icon">▶</span> Play Synthesized Waveform (Web Audio)`;
        btn.classList.remove('playing');
      }
    }
  }

  // Generate Spectrogram Heatmap SVG
  function generateSpectrogramSvg() {
    const numFrames = 32;
    const numBins = melBins === 40 ? 20 : (melBins === 80 ? 32 : 44);
    const cellW = 560 / numFrames;
    const cellH = 160 / numBins;
    let svgInner = '';

    // Color gradient palette: [deep navy, purple, cyan, emerald, bright gold]
    const palette = [
      '#0a0f1d', '#1e1b4b', '#3b0764', '#1d4ed8', '#0284c7',
      '#06b6d4', '#10b981', '#34d399', '#f59e0b', '#fef08a'
    ];

    for (let f = 0; f < numFrames; f++) {
      const frameNorm = f / (numFrames - 1);
      // Envelope multiplier
      const energyEnv = currentSc.energyEnvelope || [0.2, 0.8, 1.0, 0.9, 0.85, 0.7, 0.4, 0.1];
      const envIdx = Math.min(Math.floor(frameNorm * energyEnv.length), energyEnv.length - 1);
      const env = energyEnv[envIdx];

      for (let b = 0; b < numBins; b++) {
        const binNorm = (numBins - 1 - b) / numBins; // 0 at bottom (bass), 1 at top (treble)
        
        // Simulating energy based on harmonics and scenario
        let energy = 0;
        currentSc.harmonics.forEach((h, hIdx) => {
          const targetBin = ((hIdx + 1) * 0.18) % 1.0;
          const dist = Math.abs(binNorm - targetBin);
          if (dist < 0.12) {
            energy += h * Math.exp(-dist * 25) * env;
          }
        });
        // Background noise floor
        energy += (Math.sin(f * 1.7 + b * 2.3) * 0.5 + 0.5) * 0.08;
        if (scenarioIdx === 3) energy += (Math.random() * 0.25); // urban noise
        energy = Math.max(0, Math.min(0.99, energy));

        const colorIdx = Math.floor(energy * palette.length);
        const cellColor = palette[Math.min(colorIdx, palette.length - 1)];

        const x = 40 + f * cellW;
        const y = 20 + b * cellH;
        svgInner += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(cellW - 0.5).toFixed(1)}" height="${(cellH - 0.5).toFixed(1)}" fill="${cellColor}" rx="1"/>`;
      }
    }

    // Axes and labels
    svgInner += `
      <line x1="38" y1="20" x2="38" y2="182" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
      <line x1="38" y1="182" x2="602" y2="182" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
      <text x="32" y="25" fill="#94a3b8" font-size="8.5" text-anchor="end" font-family="monospace">8 kHz</text>
      <text x="32" y="100" fill="#94a3b8" font-size="8.5" text-anchor="end" font-family="monospace">1 kHz</text>
      <text x="32" y="178" fill="#94a3b8" font-size="8.5" text-anchor="end" font-family="monospace">80 Hz</text>
      <text x="40" y="196" fill="#64748b" font-size="8.5" font-family="monospace">0.0s (Frame 0)</text>
      <text x="320" y="196" fill="#94a3b8" font-size="8.5" text-anchor="middle" font-family="monospace">Time Axis (50 Frames / sec • 20ms Hop)</text>
      <text x="600" y="196" fill="#64748b" font-size="8.5" text-anchor="end" font-family="monospace">0.64s</text>
    `;

    return `
      <svg class="spectrogram-svg" viewBox="0 0 620 205" preserveAspectRatio="xMidYMid meet">
        ${svgInner}
      </svg>
    `;
  }

  // RVQ Calculation & Metrics
  function getRvqMetrics(stages) {
    // 50 frames/sec * stages * 10 bits = stages * 500 bps
    const bitrateKbps = (stages * 1.5).toFixed(1);
    const compRatio = (705.6 / (stages * 1.5)).toFixed(1); // vs 44.1kHz 16-bit uncompressed
    const snrMap = { 1: 14.2, 2: 23.5, 4: 33.8, 8: 41.2 };
    const pesqMap = { 1: '2.1 (Robotic)', 2: '3.1 (Intelligible)', 4: '3.9 (Natural)', 8: '4.4 (Studio Hi-Fi)' };
    const residualErrors = {
      1: [0.42],
      2: [0.42, 0.18],
      4: [0.42, 0.18, 0.07, 0.02],
      8: [0.42, 0.18, 0.07, 0.02, 0.009, 0.004, 0.002, 0.001]
    };

    return {
      bitrateKbps,
      compRatio,
      snr: snrMap[stages] || 33.8,
      pesq: pesqMap[stages] || '3.9 (Natural)',
      residuals: residualErrors[stages] || [0.42, 0.18, 0.07, 0.02]
    };
  }

  // HTML Structure
  container.innerHTML = `
    <div class="audio-lab-header">
      <div class="audio-title-row">
        <div class="audio-title-badge">
          <span class="audio-icon">🎙️</span>
          <div>
            <h3>Audio & Speech AI: Neural Codecs & RVQ Studio</h3>
            <p class="audio-subtitle">Explore continuous-to-discrete audio tokenization: inspect 80-bin Mel spectrograms, reconstruct multi-stage RVQ codebook cascades, and simulate autoregressive speech token generation.</p>
          </div>
        </div>
        <div class="audio-tab-nav">
          <button class="audio-tab-btn ${activeTab === 'spectrogram_synth' ? 'active' : ''}" data-tab="spectrogram_synth">🌊 Mel Spectrogram & Synthesizer</button>
          <button class="audio-tab-btn ${activeTab === 'rvq_studio' ? 'active' : ''}" data-tab="rvq_studio">🧱 RVQ Ladder & Bitrates</button>
          <button class="audio-tab-btn ${activeTab === 'speech_lm' ? 'active' : ''}" data-tab="speech_lm">⏱️ Acoustic LM & Delay Tokenizer</button>
        </div>
      </div>
    </div>

    <!-- Scenario Selector Bar -->
    <div class="audio-scenario-bar">
      <span class="sc-label">Sound Profile:</span>
      <div class="sc-btn-group">
        ${scenarios.map((sc, i) => `
          <button class="audio-sc-btn ${i === scenarioIdx ? 'active' : ''}" data-sc-idx="${i}">
            <span class="sc-badge-dot" style="background: ${i === 0 ? '#06b6d4' : (i === 1 ? '#f59e0b' : (i === 2 ? '#ec4899' : '#10b981'))};"></span>
            ${sc.title}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- TAB 1: SPECTROGRAM & SYNTHESIZER -->
    <div class="audio-tab-panel" id="panel-spectrogram-synth" style="display: ${activeTab === 'spectrogram_synth' ? 'block' : 'none'};">
      <div class="audio-grid-2col">
        <!-- Left: Audio Source Card -->
        <div class="audio-card source-card">
          <div class="card-head">
            <h4><span class="icon">🎼</span> Continuous Waveform Source</h4>
            <span class="badge category-badge">${currentSc.category}</span>
          </div>
          <p class="sc-desc">${currentSc.description}</p>

          <div class="audio-player-box">
            <button class="btn-play-synth" id="btn-play-synth-audio">
              <span class="icon">▶</span> Play Synthesized Waveform (Web Audio)
            </button>
            <div class="synth-specs">
              <div class="spec-item"><span class="lbl">Fundamental F0:</span> <strong>${currentSc.baseFreq} Hz</strong></div>
              <div class="spec-item"><span class="lbl">Sample Rate:</span> <strong>24,000 Hz</strong></div>
              <div class="spec-item"><span class="lbl">Uncompressed:</span> <strong>768 kbps PCM</strong></div>
            </div>
          </div>

          <div class="mel-formula-box">
            <span class="box-title">Biological Mel Frequency Warping:</span>
            <div class="formula-code">Mel(f) = 2595 · log₁₀(1 + f / 700)</div>
            <p class="formula-expl">Human cochlear hair cells are densely clustered for vocal frequencies (100–3,000 Hz). The Mel filterbank maps linear FFT hertz into biologically sensitive logarithmic bands.</p>
          </div>

          <div class="card-footer-action">
            <button class="btn-claim-xp" id="btn-claim-spectrogram-xp">
              🌊 Claim +20 XP: Fourier & Mel Bridge Mastered
            </button>
          </div>
        </div>

        <!-- Right: 80-Bin Mel Spectrogram Display -->
        <div class="audio-card spectrogram-card">
          <div class="card-head">
            <h4><span class="icon">🌈</span> Log Mel-Spectrogram Heatmap</h4>
            <div class="res-picker">
              <span class="lbl">Mel Bins:</span>
              <button class="res-btn ${melBins === 40 ? 'active' : ''}" data-bins="40">40 Bins</button>
              <button class="res-btn ${melBins === 80 ? 'active' : ''}" data-bins="80">80 Bins ★</button>
              <button class="res-btn ${melBins === 128 ? 'active' : ''}" data-bins="128">128 Bins</button>
            </div>
          </div>

          <div class="spectrogram-viewport" id="spectrogram-viewport">
            ${generateSpectrogramSvg()}
          </div>

          <div class="spectrogram-legend">
            <span class="legend-lbl">Spectral Energy Intensity (dB):</span>
            <div class="legend-gradient">
              <span>-80 dB (Silence)</span>
              <div class="grad-bar"></div>
              <span>0 dB (Peak Energy)</span>
            </div>
          </div>

          <div class="spectrogram-stats-row">
            <div class="stat-pill"><span class="lbl">Window:</span> <strong>25 ms (600 spl)</strong></div>
            <div class="stat-pill"><span class="lbl">Hop Size:</span> <strong>10 ms (240 spl)</strong></div>
            <div class="stat-pill"><span class="lbl">Frame Rate:</span> <strong>100 Hz</strong></div>
            <div class="stat-pill highlight"><span class="lbl">Compress:</span> <strong>240× Stride</strong></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: RVQ LADDER & BITRATE STUDIO -->
    <div class="audio-tab-panel" id="panel-rvq-studio" style="display: ${activeTab === 'rvq_studio' ? 'block' : 'none'};">
      <div class="rvq-layout">
        <!-- Interactive Stage Selector -->
        <div class="audio-card rvq-controls-card">
          <div class="rvq-controls-head">
            <div>
              <h4><span class="icon">🧱</span> Residual Vector Quantization Hierarchy</h4>
              <p class="sub">Select the number of codebook stages to observe how quantization error shrinks monotonically across the cascade.</p>
            </div>
            <div class="stages-toggle-group">
              <span class="stages-lbl">Codebook Stages (N_q):</span>
              <button class="stage-btn ${rvqStages === 1 ? 'active' : ''}" data-stages="1">1 Stage (1.5 kbps)</button>
              <button class="stage-btn ${rvqStages === 2 ? 'active' : ''}" data-stages="2">2 Stages (3.0 kbps)</button>
              <button class="stage-btn ${rvqStages === 4 ? 'active' : ''}" data-stages="4">4 Stages (6.0 kbps) ★</button>
              <button class="stage-btn ${rvqStages === 8 ? 'active' : ''}" data-stages="8">8 Stages (12.0 kbps)</button>
            </div>
          </div>

          <!-- Dynamic Metrics Grid -->
          <div class="rvq-metrics-grid" id="rvq-metrics-grid">
            <!-- Rendered by updateRvqView() -->
          </div>
        </div>

        <!-- RVQ Cascade Architecture Diagram -->
        <div class="audio-card rvq-cascade-card">
          <div class="card-head">
            <h4><span class="icon">🧬</span> Multi-Stage Error Subtraction Pipeline</h4>
            <span class="badge codebook-badge">Codebook K = 1024 (10 bits per stage)</span>
          </div>

          <div class="rvq-svg-container" id="rvq-svg-container">
            <!-- Dynamic SVG Cascade rendered by updateRvqView() -->
          </div>

          <!-- Residual Decay Chart & Codebook Tokens -->
          <div class="rvq-lower-grid">
            <div class="sub-card error-decay-card">
              <h5>Monotonic Error Decay ||r_k||²</h5>
              <div class="decay-bars" id="decay-bars-container">
                <!-- Bars dynamically rendered -->
              </div>
            </div>
            <div class="sub-card codebook-tokens-card">
              <h5>Discrete Codebook Index Stream</h5>
              <div class="code-stream-chips" id="code-stream-chips">
                <!-- Chips dynamically rendered -->
              </div>
              <p class="token-sub">Each stage outputs an integer index ∈ [0, 1023]. Audio is now a sequence of compact discrete tokens ready for LLMs!</p>
            </div>
          </div>

          <div class="card-footer-action">
            <button class="btn-claim-xp" id="btn-claim-rvq-xp">
              🧱 Claim +25 XP: RVQ Multi-Stage Cascade Mastered
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: ACOUSTIC LANGUAGE MODEL & DELAY TOKENIZER -->
    <div class="audio-tab-panel" id="panel-speech-lm" style="display: ${activeTab === 'speech_lm' ? 'block' : 'none'};">
      <div class="speech-lm-layout">
        <!-- Theory Intro -->
        <div class="audio-card speech-theory-card">
          <div class="card-head">
            <h4><span class="icon">⏱️</span> Acoustic Delay Pattern Interleaving (VALL-E / MusicGen)</h4>
            <span class="badge delay-badge">Autoregressive Acoustic LM</span>
          </div>
          <p class="theory-desc">
            Generating audio like text requires predicting multiple RVQ codebooks per frame. If we flatten them naively, the sequence becomes 4× to 8× longer! By introducing a <strong>1-step delay</strong> between each subsequent codebook stream, a standard causal Transformer can predict all codebook levels simultaneously without leaking future information.
          </p>
        </div>

        <!-- Interactive Delay Grid Simulator -->
        <div class="audio-card delay-sim-card">
          <div class="sim-header-row">
            <div>
              <h5>Acoustic Token Matrix (4 RVQ Codebooks × 8 Timesteps)</h5>
              <p class="sim-sub">Scrub the timeline or hit "Simulate Autoregressive Generation" to observe causal generation step by step.</p>
            </div>
            <div class="sim-actions">
              <button class="btn-run-sim" id="btn-run-acoustic-sim">
                <span class="icon">🚀</span> Simulate Generation Rollout
              </button>
            </div>
          </div>

          <!-- Step Scrubber -->
          <div class="timeline-scrubber-box">
            <div class="scrub-head">
              <label for="audio-step-slider">Autoregressive Generation Step: <strong id="step-display">Step ${tokenStep}</strong> / 8</label>
              <span class="active-focus" id="step-focus-desc">Streams 1-4 active</span>
            </div>
            <input type="range" id="audio-step-slider" min="1" max="8" value="${tokenStep}" class="audio-slider">
          </div>

          <!-- Delay Matrix Grid View -->
          <div class="delay-matrix-wrapper" id="delay-matrix-wrapper">
            <!-- Dynamic Delay Matrix Grid rendered by updateDelayMatrix() -->
          </div>

          <!-- Attention Arcs Visualization -->
          <div class="attention-arcs-box">
            <span class="arcs-title">Causal Attention Receptive Field:</span>
            <div class="arcs-info" id="arcs-info-text">
              At Step <strong>${tokenStep}</strong>, the model attends strictly to past and current prompt tokens. Due to the diagonal delay pattern, high-frequency codebook $C_k$ is conditioned on coarse codebook $C_{k-1}$ from the same acoustic frame!
            </div>
          </div>

          <div class="card-footer-action">
            <button class="btn-claim-xp" id="btn-claim-llm-xp">
              ⏱️ Claim +30 XP: Acoustic Language Modeling Mastered
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach container to DOM
  dom.interactiveContainer.innerHTML = '';
  dom.interactiveContainer.appendChild(container);

  // Tab switching logic
  const tabBtns = container.querySelectorAll('.audio-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      state.audioActiveTab = activeTab;

      container.querySelector('#panel-spectrogram-synth').style.display = activeTab === 'spectrogram_synth' ? 'block' : 'none';
      container.querySelector('#panel-rvq-studio').style.display = activeTab === 'rvq_studio' ? 'block' : 'none';
      container.querySelector('#panel-speech-lm').style.display = activeTab === 'speech_lm' ? 'block' : 'none';
      soundFx.playBlip(620, 0.05);

      if (activeTab === 'rvq_studio') updateRvqView();
      if (activeTab === 'speech_lm') updateDelayMatrix();
    });
  });

  // Scenario buttons
  const scBtns = container.querySelectorAll('.audio-sc-btn');
  scBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      scenarioIdx = parseInt(btn.getAttribute('data-sc-idx'), 10);
      state.audioScenarioIdx = scenarioIdx;
      if (isPlayingAudio) stopWebAudio();
      renderAudioSpeechLabWidget(quest);
      soundFx.playBlip(480, 0.06);
    });
  });

  // Mel Bins selector
  const resBtns = container.querySelectorAll('.res-btn');
  resBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      resBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      melBins = parseInt(btn.getAttribute('data-bins'), 10);
      state.audioMelBins = melBins;
      const viewport = container.querySelector('#spectrogram-viewport');
      if (viewport) viewport.innerHTML = generateSpectrogramSvg();
      soundFx.playBlip(700, 0.04);
    });
  });

  // Web Audio Play Button
  const btnPlaySynth = container.querySelector('#btn-play-synth-audio');
  if (btnPlaySynth) {
    btnPlaySynth.addEventListener('click', () => {
      toggleWebAudioPlayback();
    });
  }

  // RVQ Stage buttons
  function setupRvqControls() {
    const stageBtns = container.querySelectorAll('.stage-btn');
    stageBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        stageBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        rvqStages = parseInt(btn.getAttribute('data-stages'), 10);
        state.audioRvqStages = rvqStages;
        updateRvqView();
        soundFx.playBlip(550 + rvqStages * 35, 0.06);
      });
    });
  }

  function updateRvqView() {
    const metrics = getRvqMetrics(rvqStages);
    const metricsGrid = container.querySelector('#rvq-metrics-grid');
    if (metricsGrid) {
      metricsGrid.innerHTML = `
        <div class="audio-metric-card">
          <span class="m-lbl">Total Audio Bitrate</span>
          <span class="m-val highlight">${metrics.bitrateKbps} kbps</span>
          <span class="m-sub">${rvqStages} codebook stages × 50 Hz</span>
        </div>
        <div class="audio-metric-card">
          <span class="m-lbl">Compression vs PCM</span>
          <span class="m-val">${metrics.compRatio}×</span>
          <span class="m-sub">705.6 kbps uncompressed</span>
        </div>
        <div class="audio-metric-card">
          <span class="m-lbl">Signal-to-Noise Ratio</span>
          <span class="m-val">${metrics.snr} dB</span>
          <span class="m-sub">Reconstruction precision</span>
        </div>
        <div class="audio-metric-card">
          <span class="m-lbl">PESQ Speech Quality</span>
          <span class="m-val">${metrics.pesq}</span>
          <span class="m-sub">Perceptual fidelity score</span>
        </div>
      `;
    }

    // Dynamic RVQ Cascade SVG
    const svgBox = container.querySelector('#rvq-svg-container');
    if (svgBox) {
      let cascadeSvg = '';
      const totalStages = rvqStages;
      const stageW = Math.min(115, Math.floor(480 / totalStages));
      
      // Input z
      cascadeSvg += `
        <rect x="15" y="45" width="60" height="55" rx="6" fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" stroke-width="1.5"/>
        <text x="45" y="68" fill="#60a5fa" font-size="10" font-weight="bold" text-anchor="middle">Latent z</text>
        <text x="45" y="84" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">dim=128</text>
        <line x1="75" y1="72" x2="95" y2="72" stroke="#60a5fa" stroke-width="1.8" marker-end="url(#lv-ar-cyan)"/>
      `;

      for (let s = 0; s < totalStages; s++) {
        const sx = 95 + s * (stageW + 16);
        const colr = s === 0 ? '#fb7185' : (s === 1 ? '#fbbf24' : (s === 2 ? '#22d3ee' : '#34d399'));
        const errVal = metrics.residuals[s] || (0.42 * Math.pow(0.45, s)).toFixed(3);

        cascadeSvg += `
          <g>
            <rect x="${sx}" y="25" width="${stageW}" height="95" rx="6" fill="rgba(15, 23, 42, 0.8)" stroke="${colr}" stroke-width="1.5"/>
            <text x="${sx + stageW / 2}" y="42" fill="${colr}" font-size="9" font-weight="bold" text-anchor="middle">Stage ${s + 1}</text>
            <rect x="${sx + 6}" y="52" width="${stageW - 12}" height="18" rx="3" fill="rgba(255,255,255,0.06)"/>
            <text x="${sx + stageW / 2}" y="64" fill="#e2e8f0" font-size="7.5" font-family="monospace" text-anchor="middle">C_${s+1} [1024]</text>
            <text x="${sx + stageW / 2}" y="86" fill="#94a3b8" font-size="7" font-family="monospace" text-anchor="middle">||r_${s+1}|| = ${errVal}</text>
            <text x="${sx + stageW / 2}" y="104" fill="${colr}" font-size="7.5" font-weight="bold" text-anchor="middle">+1.5 kbps</text>
          </g>
        `;

        if (s < totalStages - 1) {
          cascadeSvg += `
            <line x1="${sx + stageW}" y1="72" x2="${sx + stageW + 14}" y2="72" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
          `;
        }
      }

      // Output Reconstructed z_hat
      const outX = 95 + totalStages * (stageW + 16);
      cascadeSvg += `
        <line x1="${outX - 16}" y1="72" x2="${outX}" y2="72" stroke="#34d399" stroke-width="1.8"/>
        <rect x="${outX}" y="45" width="65" height="55" rx="6" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" stroke-width="1.5"/>
        <text x="${outX + 32}" y="68" fill="#34d399" font-size="9.5" font-weight="bold" text-anchor="middle">Recon ẑ</text>
        <text x="${outX + 32}" y="84" fill="#a7f3d0" font-size="7.5" font-family="monospace" text-anchor="middle">∑ₖ qₖ</text>
      `;

      svgBox.innerHTML = `
        <svg class="rvq-flow-svg" viewBox="0 0 ${Math.max(620, outX + 80)} 145" preserveAspectRatio="xMidYMid meet">
          ${cascadeSvg}
        </svg>
      `;
    }

    // Error Decay Bar Chart
    const decayBox = container.querySelector('#decay-bars-container');
    if (decayBox) {
      decayBox.innerHTML = metrics.residuals.map((res, i) => {
        const pct = Math.max(4, Math.min(100, (res / 0.42) * 100));
        const colr = i === 0 ? '#fb7185' : (i === 1 ? '#fbbf24' : (i === 2 ? '#22d3ee' : '#34d399'));
        return `
          <div class="decay-row">
            <span class="d-stage">Stage ${i + 1}:</span>
            <div class="d-bar-track">
              <div class="d-bar-fill" style="width: ${pct}%; background: ${colr};"></div>
            </div>
            <span class="d-val">${res}</span>
          </div>
        `;
      }).join('');
    }

    // Code Stream Chips
    const chipsBox = container.querySelector('#code-stream-chips');
    if (chipsBox) {
      const sampleCodes = [742, 108, 915, 42, 603, 319, 881, 14];
      chipsBox.innerHTML = Array.from({ length: rvqStages }).map((_, i) => {
        const codeVal = sampleCodes[i % sampleCodes.length];
        const colr = i === 0 ? '#fb7185' : (i === 1 ? '#fbbf24' : (i === 2 ? '#22d3ee' : '#34d399'));
        return `
          <div class="code-chip" style="border-color: ${colr}; color: ${colr};">
            <span class="chip-lbl">Codebook ${i + 1}:</span>
            <strong>#${codeVal}</strong>
          </div>
        `;
      }).join('');
    }
  }

  // TAB 3: Delay Matrix & Interleaving View
  function updateDelayMatrix() {
    const matrixBox = container.querySelector('#delay-matrix-wrapper');
    if (!matrixBox) return;

    const streams = [
      { name: 'CB 1 (Base Semantics)', delay: 0, color: '#fb7185' },
      { name: 'CB 2 (Timbre/Pitch)', delay: 1, color: '#fbbf24' },
      { name: 'CB 3 (Formants/Prosody)', delay: 2, color: '#22d3ee' },
      { name: 'CB 4 (Acoustic Shine)', delay: 3, color: '#34d399' }
    ];

    const totalCols = 8;
    let html = '<div class="delay-table">';

    // Header row (Timesteps)
    html += '<div class="delay-row head-row"><div class="st-cell label-cell">Stream / Layer</div>';
    for (let c = 1; c <= totalCols; c++) {
      const isCur = c === tokenStep;
      html += `<div class="st-cell step-head ${isCur ? 'active-col' : ''}">t = ${c}</div>`;
    }
    html += '</div>';

    // Stream rows
    streams.forEach((st, sIdx) => {
      html += `<div class="delay-row"><div class="st-cell label-cell" style="color: ${st.color}; font-weight: 600;">${st.name}</div>`;
      for (let c = 1; c <= totalCols; c++) {
        const isCur = c === tokenStep;
        if (c - 1 < st.delay) {
          // Staggered Delay pad
          html += `<div class="st-cell delay-pad ${isCur ? 'active-pad' : ''}">&lt;delay&gt;</div>`;
        } else {
          const frameNum = c - st.delay;
          const isGenerated = c <= tokenStep;
          const cellCls = isGenerated ? 'generated-tok' : 'pending-tok';
          html += `
            <div class="st-cell ${cellCls} ${isCur ? 'current-step' : ''}" style="${isGenerated ? `background: rgba(${sIdx === 0 ? '251,113,133' : (sIdx === 1 ? '251,191,36' : (sIdx === 2 ? '34,211,238' : '52,211,153'))}, 0.22); border-color: ${st.color};` : ''}">
              tok_${frameNum}
            </div>
          `;
        }
      }
      html += '</div>';
    });

    html += '</div>';
    matrixBox.innerHTML = html;

    // Update scrubber text
    const disp = container.querySelector('#step-display');
    if (disp) disp.textContent = `Step ${tokenStep}`;
    const desc = container.querySelector('#step-focus-desc');
    if (desc) {
      if (tokenStep === 1) desc.textContent = 'Only CB 1 active (CB 2-4 delayed)';
      else if (tokenStep === 2) desc.textContent = 'CB 1 & CB 2 active (CB 3-4 delayed)';
      else if (tokenStep === 3) desc.textContent = 'CB 1, CB 2 & CB 3 active (CB 4 delayed)';
      else desc.textContent = 'All 4 RVQ Streams generating in parallel!';
    }
  }

  // Scrubber input
  const stepSlider = container.querySelector('#audio-step-slider');
  if (stepSlider) {
    stepSlider.addEventListener('input', (e) => {
      tokenStep = parseInt(e.target.value, 10);
      updateDelayMatrix();
      soundFx.playBlip(400 + tokenStep * 40, 0.04);
    });
  }

  // Simulation Rollout Button
  const btnRunSim = container.querySelector('#btn-run-acoustic-sim');
  if (btnRunSim) {
    btnRunSim.addEventListener('click', () => {
      if (isGeneratingTokens) return;
      isGeneratingTokens = true;
      btnRunSim.disabled = true;
      btnRunSim.innerHTML = `<span class="icon spin">🔄</span> Generating Tokens...`;
      soundFx.playBlip(750, 0.08);

      let stepI = 1;
      tokenStep = 1;
      if (stepSlider) stepSlider.value = 1;
      updateDelayMatrix();

      const timer = setInterval(() => {
        stepI++;
        tokenStep = stepI;
        if (stepSlider) stepSlider.value = stepI;
        updateDelayMatrix();
        soundFx.playBlip(420 + stepI * 50, 0.05);

        if (stepI >= 8) {
          clearInterval(timer);
          isGeneratingTokens = false;
          btnRunSim.disabled = false;
          btnRunSim.innerHTML = `<span class="icon">🚀</span> Simulate Generation Rollout`;
          soundFx.playLevelUp();
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        }
      }, 350);
    });
  }

  // Claim XP buttons
  const btnClaimSpectrogramXp = container.querySelector('#btn-claim-spectrogram-xp');
  if (btnClaimSpectrogramXp) {
    btnClaimSpectrogramXp.addEventListener('click', () => {
      if (!xpSpectrogramClaimed) {
        xpSpectrogramClaimed = true;
        awardXp(20, 'Fourier & Mel Spectrogram Conquered');
        btnClaimSpectrogramXp.textContent = '✓ +20 XP Claimed!';
        btnClaimSpectrogramXp.disabled = true;
        btnClaimSpectrogramXp.style.opacity = '0.6';
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      }
    });
  }

  const btnClaimRvqXp = container.querySelector('#btn-claim-rvq-xp');
  if (btnClaimRvqXp) {
    btnClaimRvqXp.addEventListener('click', () => {
      if (!xpRvqClaimed) {
        xpRvqClaimed = true;
        awardXp(25, 'Residual Vector Quantization Conquered');
        btnClaimRvqXp.textContent = '✓ +25 XP Claimed!';
        btnClaimRvqXp.disabled = true;
        btnClaimRvqXp.style.opacity = '0.6';
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    });
  }

  const btnClaimLlmXp = container.querySelector('#btn-claim-llm-xp');
  if (btnClaimLlmXp) {
    btnClaimLlmXp.addEventListener('click', () => {
      if (!xpLlmClaimed) {
        xpLlmClaimed = true;
        awardXp(30, 'Acoustic Language Models Conquered');
        btnClaimLlmXp.textContent = '✓ +30 XP Claimed!';
        btnClaimLlmXp.disabled = true;
        btnClaimLlmXp.style.opacity = '0.6';
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    });
  }

  // Initialize view
  setupRvqControls();
  updateRvqView();
  updateDelayMatrix();
}



// --- WIDGET 19: World Models & Video Generation Lab ---
export function renderWorldModelVideoLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'world-lab-container';

  const config = quest.interactiveConfig || {};
  const scenarios = config.scenarios || [
    {
      id: 'hyperdrive_space',
      title: 'Starship Asteroid Slalom',
      category: '3D Kinematics & Space Physics',
      prompt: 'Cinematic 4K tracking shot of a starship dodging tumbling obsidian asteroids through a purple nebula, hyper-realistic thruster particle dynamics.',
      actionVector: [0.0, 1.0, 0.2],
      motionVelocity: '720 m/s',
      fvdScore: 142.5
    },
    {
      id: 'robot_arm',
      title: 'Robotic Gripper Block Stacking',
      category: 'Embodied Manipulation & Contact Physics',
      prompt: 'Top-down laboratory camera view of a 7-DOF robotic arm picking a metallic golden cube and stacking it precisely onto an azure base, realistic rigid body contact.',
      actionVector: [0.4, 0.0, -0.6],
      motionVelocity: '0.15 m/s',
      fvdScore: 118.2
    },
    {
      id: 'autonomous_drive',
      title: 'Urban Autonomous Highway',
      category: 'Ego-Vehicle Kinematics & Traffic Flow',
      prompt: 'First-person dashcam view accelerating down a rainy Tokyo expressway at dusk, vehicle headlights reflecting on wet asphalt, dynamic lane switching.',
      actionVector: [-0.1, 0.8, 0.0],
      motionVelocity: '28.5 m/s',
      fvdScore: 129.8
    },
    {
      id: 'fluid_dynamics',
      title: 'Bioluminescent Fluid Splash',
      category: 'Non-Linear Navier-Stokes Hydrodynamics',
      prompt: 'High-speed macro 1000fps capture of a drop of cyan luminescent droplet impacting dark viscous oil, crown splash droplet breakup and surface tension ripples.',
      actionVector: [0.0, 0.0, -1.0],
      motionVelocity: '4.2 m/s',
      fvdScore: 165.4
    }
  ];

  const tubeletConfigs = [
    { label: '8×8×2 (Fine Detail)', p: 8, t: 2, tokens: 4096, vram: '14.2 GB', comp: '128×' },
    { label: '16×16×2 (Standard Sora) ★', p: 16, t: 2, tokens: 1024, vram: '4.8 GB', comp: '512×' },
    { label: '16×16×4 (Temporal Fast)', p: 16, t: 4, tokens: 512, vram: '2.5 GB', comp: '1024×' }
  ];

  let scenarioIdx = state.worldScenarioIdx || 0;
  if (scenarioIdx >= scenarios.length) scenarioIdx = 0;
  let activeTab = state.worldActiveTab || 'spacetime_tubelets';
  let tubeletIdx = state.worldTubeletSizeIdx ?? 1;
  let currentFrame = state.worldCurrentFrame || 4;
  let motionScale = state.worldMotionScale || 2.5;
  let simAction = state.worldSimAction || 'accelerate';
  let isSimulatingRollout = false;

  let xpTubeletClaimed = false;
  let xpDitClaimed = false;
  let xpWorldSimClaimed = false;

  const currentSc = scenarios[scenarioIdx];
  const curTube = tubeletConfigs[tubeletIdx];

  // Procedural SVG Video Cube Renderer
  function generateVideoCubeSvg() {
    const totalFrames = 8;
    let svgInner = '';

    // Perspective stack of frames
    for (let f = 0; f < totalFrames; f++) {
      const isSelected = (f + 1) === currentFrame;
      const offsetX = 35 + f * 42;
      const offsetY = 120 - f * 10;
      const frameW = 125;
      const frameH = 75;

      const fillColor = isSelected
        ? 'rgba(56, 189, 248, 0.35)'
        : `rgba(15, 23, 42, ${0.4 + f * 0.06})`;
      const strokeColor = isSelected ? '#38bdf8' : 'rgba(148, 163, 184, 0.4)';
      const strokeW = isSelected ? 2 : 1;

      svgInner += `
        <g class="frame-layer ${isSelected ? 'active-layer' : ''}">
          <rect x="${offsetX}" y="${offsetY}" width="${frameW}" height="${frameH}" rx="4"
                fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeW}" />
          <text x="${offsetX + 10}" y="${offsetY + 16}" fill="${isSelected ? '#38bdf8' : '#64748b'}" font-size="8" font-family="monospace">
            f_${f+1}
          </text>
      `;

      // Draw grid lines on selected frame
      if (isSelected) {
        const pSize = curTube.p === 8 ? 16 : 25;
        for (let gx = offsetX + pSize; gx < offsetX + frameW; gx += pSize) {
          svgInner += `<line x1="${gx}" y1="${offsetY}" x2="${gx}" y2="${offsetY + frameH}" stroke="rgba(56, 189, 248, 0.4)" stroke-width="0.8" stroke-dasharray="2,2"/>`;
        }
        for (let gy = offsetY + pSize; gy < offsetY + frameH; gy += pSize) {
          svgInner += `<line x1="${offsetX}" y1="${gy}" x2="${offsetX + frameW}" y2="${gy}" stroke="rgba(56, 189, 248, 0.4)" stroke-width="0.8" stroke-dasharray="2,2"/>`;
        }
        // Active 3D Tubelet Cube
        svgInner += `
          <rect x="${offsetX + 35}" y="${offsetY + 22}" width="${pSize}" height="${pSize}" rx="2"
                fill="rgba(245, 158, 11, 0.4)" stroke="#f59e0b" stroke-width="1.8"/>
          <text x="${offsetX + 35 + pSize/2}" y="${offsetY + 22 + pSize/2 + 3}" fill="#fef08a" font-size="7" font-weight="bold" text-anchor="middle" font-family="monospace">
            ${curTube.p}²×${curTube.t}
          </text>
        `;
      }

      svgInner += `</g>`;
    }

    // Time Axis arrow along top
    svgInner += `
      <line x1="45" y1="35" x2="365" y2="35" stroke="#38bdf8" stroke-width="1.5" marker-end="url(#lv-ar-cyan)"/>
      <text x="205" y="24" fill="#38bdf8" font-size="8.5" font-weight="bold" text-anchor="middle" font-family="monospace">
        Time Axis t (8 Frames • 24 fps)
      </text>
    `;

    return `
      <svg class="video-cube-svg" viewBox="0 0 420 185" preserveAspectRatio="xMidYMid meet">
        ${svgInner}
      </svg>
    `;
  }

  // Dual Attention & Optical Flow SVG
  function generateAttentionSvg() {
    let svgInner = '';

    // Left: Spatial Attention Box
    svgInner += `
      <rect x="25" y="25" width="260" height="150" rx="8" fill="rgba(6, 182, 212, 0.08)" stroke="#06b6d4" stroke-width="1.5"/>
      <text x="155" y="44" fill="#06b6d4" font-size="9.5" font-weight="bold" text-anchor="middle">1. Spatial Attention (Inside Frame ${currentFrame})</text>
      <text x="155" y="58" fill="#94a3b8" font-size="7.5" text-anchor="middle">Reshaped: [Batch × T, S, Dim] • Token Grid S = H×W</text>
    `;

    // 4x4 Grid of Spatial Tokens with intra-attention arcs
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const cx = 55 + c * 52;
        const cy = 80 + r * 28;
        const isCore = (r === 1 && c === 1);
        svgInner += `
          <rect x="${cx - 16}" y="${cy - 10}" width="32" height="20" rx="3"
                fill="${isCore ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.15)'}"
                stroke="${isCore ? '#f59e0b' : '#06b6d4'}" stroke-width="${isCore ? 1.5 : 1}"/>
          <text x="${cx}" y="${cy + 3}" fill="${isCore ? '#fef08a' : '#a5f3fc'}" font-size="7.5" font-family="monospace" text-anchor="middle">
            p_${r*4 + c + 1}
          </text>
        `;
        if (isCore && c < 3) {
          svgInner += `<path d="M ${cx+16},${cy} Q ${cx+32},${cy-12} ${cx+36},${cy}" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="2,2"/>`;
        }
      }
    }
    svgInner += `
      <text x="155" y="162" fill="#67e8f9" font-size="7.5" font-family="monospace" text-anchor="middle">
        Guarantees Geometric Sharpness & Edge Continuity
      </text>
    `;

    // Right: Temporal Attention Box
    svgInner += `
      <rect x="315" y="25" width="280" height="150" rx="8" fill="rgba(168, 85, 247, 0.08)" stroke="#a855f7" stroke-width="1.5"/>
      <text x="455" y="44" fill="#a855f7" font-size="9.5" font-weight="bold" text-anchor="middle">2. Temporal Attention (Across Timeline T)</text>
      <text x="455" y="58" fill="#94a3b8" font-size="7.5" text-anchor="middle">Reshaped: [Batch × S, T, Dim] • Motion Flow Tracking</text>
    `;

    // Horizontal timeline of identical spatial coordinate across frames
    for (let f = 0; f < 5; f++) {
      const tx = 345 + f * 52;
      const ty = 100;
      const isCur = (f + 1) === currentFrame;
      svgInner += `
        <circle cx="${tx}" cy="${ty}" r="14" fill="${isCur ? 'rgba(52, 211, 153, 0.35)' : 'rgba(168, 85, 247, 0.2)'}"
                stroke="${isCur ? '#34d399' : '#a855f7'}" stroke-width="${isCur ? 2 : 1.2}"/>
        <text x="${tx}" y="${ty + 3}" fill="${isCur ? '#34d399' : '#e2e8f0'}" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">
          t_${f+1}
        </text>
      `;
      if (f < 4) {
        // Motion velocity arrow
        const arrowW = (motionScale * 8).toFixed(1);
        svgInner += `
          <line x1="${tx + 14}" y1="${ty}" x2="${tx + 38}" y2="${ty}" stroke="#a855f7" stroke-width="1.5" marker-end="url(#lv-ar-violet)"/>
        `;
      }
    }

    svgInner += `
      <text x="455" y="142" fill="#d8b4fe" font-size="7.5" font-family="monospace" text-anchor="middle">
        Velocity v_t = ${currentSc.motionVelocity} (Guidance scale: ${motionScale}×)
      </text>
      <text x="455" y="162" fill="#34d399" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">
        ✓ Eliminates Frame Flickering & Shape Morphing
      </text>
    `;

    return `
      <svg class="dit-attn-svg" viewBox="0 0 620 190" preserveAspectRatio="xMidYMid meet">
        ${svgInner}
      </svg>
    `;
  }

  // HTML Structure
  container.innerHTML = `
    <div class="world-lab-header">
      <div class="world-title-row">
        <div class="world-title-badge">
          <span class="world-icon">🎬</span>
          <div>
            <h3>World Models & Video Generation: 3D DiT Studio</h3>
            <p class="world-subtitle">Deconstruct 4D video volumes into 3D spacetime tubelet patches, inspect decoupled spatial-temporal attention, and simulate action-conditioned generative world dynamics.</p>
          </div>
        </div>
        <div class="world-tab-nav">
          <button class="world-tab-btn ${activeTab === 'spacetime_tubelets' ? 'active' : ''}" data-tab="spacetime_tubelets">🧊 3D Spacetime Tubelets</button>
          <button class="world-tab-btn ${activeTab === 'dit_attention' ? 'active' : ''}" data-tab="dit_attention">⚡ 3D DiT Attention Arena</button>
          <button class="world-tab-btn ${activeTab === 'world_simulator' ? 'active' : ''}" data-tab="world_simulator">🕹️ Action World Simulator</button>
        </div>
      </div>
    </div>

    <!-- Scenario Selector Bar -->
    <div class="world-scenario-bar">
      <span class="sc-label">Simulation World:</span>
      <div class="sc-btn-group">
        ${scenarios.map((sc, i) => `
          <button class="world-sc-btn ${i === scenarioIdx ? 'active' : ''}" data-sc-idx="${i}">
            <span class="sc-badge-dot" style="background: ${i === 0 ? '#38bdf8' : (i === 1 ? '#f59e0b' : (i === 2 ? '#10b981' : '#ec4899'))};"></span>
            ${sc.title}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- TAB 1: 3D SPACETIME TUBELETS -->
    <div class="world-tab-panel" id="panel-spacetime-tubelets" style="display: ${activeTab === 'spacetime_tubelets' ? 'block' : 'none'};">
      <div class="world-grid-2col">
        <!-- Left: Tubelet Geometry & Video Cube -->
        <div class="world-card cube-card">
          <div class="card-head">
            <h4><span class="icon">📦</span> 4D Spacetime Volume Slicing</h4>
            <span class="badge category-badge">${currentSc.category}</span>
          </div>
          <p class="sc-desc">${currentSc.prompt}</p>

          <div class="cube-viewport" id="cube-viewport">
            ${generateVideoCubeSvg()}
          </div>

          <!-- Timeline Scrubber -->
          <div class="frame-scrubber-box">
            <div class="scrub-head">
              <label for="frame-slider">Inspect Video Frame: <strong id="frame-disp">Frame ${currentFrame}</strong> / 8</label>
              <span class="time-stamp" id="time-disp">${((currentFrame - 1) * 0.042).toFixed(3)}s</span>
            </div>
            <input type="range" id="frame-slider" min="1" max="8" value="${currentFrame}" class="world-slider">
          </div>

          <div class="card-footer-action">
            <button class="btn-claim-xp" id="btn-claim-tubelet-xp">
              🧊 Claim +20 XP: 3D Tubelet Patchification Mastered
            </button>
          </div>
        </div>

        <!-- Right: Patch Size Config & Computational Footprint -->
        <div class="world-card metrics-card">
          <div class="card-head">
            <h4><span class="icon">📐</span> Patch Size & Sequence Complexity</h4>
          </div>

          <div class="tubelet-picker">
            <span class="picker-lbl">Spacetime Tubelet Size (P_h × P_w × P_t):</span>
            <div class="tube-btn-row">
              ${tubeletConfigs.map((tc, idx) => `
                <button class="tube-btn ${idx === tubeletIdx ? 'active' : ''}" data-tube-idx="${idx}">
                  ${tc.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Dynamic Metrics Grid -->
          <div class="tube-metrics-grid">
            <div class="w-metric-box">
              <span class="m-lbl">1D Sequence Length</span>
              <span class="m-val highlight" id="m-tokens-disp">${curTube.tokens} Tokens</span>
              <span class="m-sub">(T/P_t) × (H/P_h) × (W/P_w)</span>
            </div>
            <div class="w-metric-box">
              <span class="m-lbl">3D VAE Compression</span>
              <span class="m-val">${curTube.comp}</span>
              <span class="m-sub">Spatiotemporal reduction</span>
            </div>
            <div class="w-metric-box">
              <span class="m-lbl">VRAM Attention Footprint</span>
              <span class="m-val">${curTube.vram}</span>
              <span class="m-sub">Dual attention memory</span>
            </div>
            <div class="w-metric-box">
              <span class="m-lbl">Fréchet Video Dist (FVD)</span>
              <span class="m-val success">${currentSc.fvdScore}</span>
              <span class="m-sub">Lower is higher fidelity</span>
            </div>
          </div>

          <div class="formula-box">
            <span class="box-title">Spacetime Sequence Formula:</span>
            <div class="formula-code">N_tokens = (T / P_t) · (H / P_h) · (W / P_w)</div>
            <p class="formula-desc">Smaller tubelets (e.g. 8×8×2) capture hyper-fine high-frequency textures but increase token count by 4×, demanding quadratic attention compute.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: 3D DiT ATTENTION ARENA -->
    <div class="world-tab-panel" id="panel-dit-attention" style="display: ${activeTab === 'dit_attention' ? 'block' : 'none'};">
      <div class="dit-layout">
        <!-- Dual Attention Explainer Card -->
        <div class="world-card attn-explainer-card">
          <div class="card-head">
            <h4><span class="icon">⚡</span> Factorized Spatio-Temporal Attention Engine</h4>
            <span class="badge dit-badge">Decoupled DiT Block</span>
          </div>
          <p class="explainer-desc">
            Full 3D attention over video would require <strong>O((T·H·W)²)</strong> operations, crashing GPU memory. Factorizing attention decouples spatial geometry from temporal kinematics:
          </p>

          <div class="attn-viewport" id="attn-viewport">
            ${generateAttentionSvg()}
          </div>

          <!-- Motion Guidance Slider -->
          <div class="motion-slider-box">
            <div class="scrub-head">
              <label for="motion-slider">Temporal Motion Guidance Scale (s_motion): <strong id="motion-disp">${motionScale}×</strong></label>
              <span class="active-focus" id="motion-desc">Optimal physical fluidity</span>
            </div>
            <input type="range" id="motion-slider" min="1.0" max="5.0" step="0.5" value="${motionScale}" class="world-slider">
          </div>

          <div class="card-footer-action">
            <button class="btn-claim-xp" id="btn-claim-dit-xp">
              ⚡ Claim +25 XP: 3D DiT Architecture Mastered
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: ACTION-CONDITIONED WORLD SIMULATOR -->
    <div class="world-tab-panel" id="panel-world-simulator" style="display: ${activeTab === 'world_simulator' ? 'block' : 'none'};">
      <div class="world-sim-layout">
        <!-- Theory Intro -->
        <div class="world-card sim-intro-card">
          <div class="card-head">
            <h4><span class="icon">🕹️</span> Generative World Model: Mental Physics Engine</h4>
            <span class="badge world-badge">s_{t+1} = 𝒯(s_t, a_t)</span>
          </div>
          <p class="sim-desc">
            A World Model does not just hallucinate pixels—it builds an internal physics engine. By injecting an <strong>agent action vector a_t</strong>, the model simulates counterfactual futures, predicting how the environment will react before taking physical real-world risks.
          </p>
        </div>

        <!-- Interactive Joystick & Rollout Canvas -->
        <div class="world-card interactive-sim-card">
          <div class="sim-top-row">
            <!-- Left: Action Pad -->
            <div class="action-pad-box">
              <span class="pad-title">Agent Action Vector a_t:</span>
              <div class="joystick-grid">
                <button class="act-btn ${simAction === 'steer_left' ? 'active' : ''}" data-act="steer_left" title="Steer Left">
                  <span class="act-icon">⬅️</span>
                  <span>Steer Left</span>
                </button>
                <button class="act-btn ${simAction === 'accelerate' ? 'active' : ''}" data-act="accelerate" title="Accelerate Forward">
                  <span class="act-icon">⬆️</span>
                  <span>Accelerate</span>
                </button>
                <button class="act-btn ${simAction === 'steer_right' ? 'active' : ''}" data-act="steer_right" title="Steer Right">
                  <span class="act-icon">➡️</span>
                  <span>Steer Right</span>
                </button>
                <button class="act-btn ${simAction === 'brake' ? 'active' : ''}" data-act="brake" title="Brake / Reverse">
                  <span class="act-icon">⬇️</span>
                  <span>Brake</span>
                </button>
              </div>
            </div>

            <!-- Right: Action Vector Display -->
            <div class="vector-spec-box">
              <span class="spec-title">Conditioning Action Parameters:</span>
              <div class="spec-row">
                <span class="s-lbl">Selected Action:</span>
                <strong id="act-name-disp" class="highlight">${simAction.toUpperCase()}</strong>
              </div>
              <div class="spec-row">
                <span class="s-lbl">Ego-Velocity:</span>
                <strong id="act-vel-disp">${currentSc.motionVelocity}</strong>
              </div>
              <div class="spec-row">
                <span class="s-lbl">Predicted Reward r̂:</span>
                <strong class="success">+0.84 (Safe & Feasible)</strong>
              </div>
              <button class="btn-run-rollout" id="btn-run-world-rollout">
                <span class="icon">🚀</span> Run 5-Step Autoregressive Rollout
              </button>
            </div>
          </div>

          <!-- Rollout Trajectory Visualizer -->
          <div class="rollout-tray-box">
            <span class="tray-title">5-Frame Forward Hallucination Trajectory (s_{t+1} ... s_{t+5}):</span>
            <div class="tray-steps-row" id="tray-steps-row">
              <!-- Dynamically populated -->
            </div>
          </div>

          <div class="card-footer-action">
            <button class="btn-claim-xp" id="btn-claim-world-xp">
              🕹️ Claim +30 XP: Generative World Models Mastered
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach to DOM
  dom.interactiveContainer.innerHTML = '';
  dom.interactiveContainer.appendChild(container);

  // Helper to render Rollout Steps Tray
  function updateRolloutTray() {
    const tray = container.querySelector('#tray-steps-row');
    if (!tray) return;

    const actionIcons = {
      steer_left: '↩️ Curving Left',
      accelerate: '⚡ Surging Forward',
      steer_right: '↪️ Curving Right',
      brake: '🛑 Decelerating'
    };

    let html = '';
    for (let s = 1; s <= 5; s++) {
      const isDone = true;
      html += `
        <div class="rollout-frame-card">
          <div class="frame-tag">t + ${s} (${s * 40}ms)</div>
          <div class="frame-preview-box">
            <span class="f-icon">${s === 1 ? '🎯' : (s === 5 ? '🏁' : '✨')}</span>
            <span class="f-action-sub">${actionIcons[simAction]}</span>
          </div>
          <div class="frame-metric">s_{t+${s}} ✓</div>
        </div>
      `;
    }
    tray.innerHTML = html;
  }

  // Tab switching
  const tabBtns = container.querySelectorAll('.world-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      state.worldActiveTab = activeTab;

      container.querySelector('#panel-spacetime-tubelets').style.display = activeTab === 'spacetime_tubelets' ? 'block' : 'none';
      container.querySelector('#panel-dit-attention').style.display = activeTab === 'dit_attention' ? 'block' : 'none';
      container.querySelector('#panel-world-simulator').style.display = activeTab === 'world_simulator' ? 'block' : 'none';
      soundFx.playBlip(620, 0.05);
    });
  });

  // Scenario buttons
  const scBtns = container.querySelectorAll('.world-sc-btn');
  scBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      scenarioIdx = parseInt(btn.getAttribute('data-sc-idx'), 10);
      state.worldScenarioIdx = scenarioIdx;
      renderWorldModelVideoLabWidget(quest);
      soundFx.playBlip(500, 0.06);
    });
  });

  // Tubelet picker
  const tubeBtns = container.querySelectorAll('.tube-btn');
  tubeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tubeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tubeletIdx = parseInt(btn.getAttribute('data-tube-idx'), 10);
      state.worldTubeletSizeIdx = tubeletIdx;
      
      const cubeVp = container.querySelector('#cube-viewport');
      if (cubeVp) cubeVp.innerHTML = generateVideoCubeSvg();

      const tokensDisp = container.querySelector('#m-tokens-disp');
      if (tokensDisp) tokensDisp.textContent = `${tubeletConfigs[tubeletIdx].tokens} Tokens`;

      soundFx.playBlip(680, 0.05);
    });
  });

  // Frame Scrubber
  const frameSlider = container.querySelector('#frame-slider');
  if (frameSlider) {
    frameSlider.addEventListener('input', (e) => {
      currentFrame = parseInt(e.target.value, 10);
      state.worldCurrentFrame = currentFrame;

      const fDisp = container.querySelector('#frame-disp');
      if (fDisp) fDisp.textContent = `Frame ${currentFrame}`;
      const tDisp = container.querySelector('#time-disp');
      if (tDisp) tDisp.textContent = `${((currentFrame - 1) * 0.042).toFixed(3)}s`;

      const cubeVp = container.querySelector('#cube-viewport');
      if (cubeVp) cubeVp.innerHTML = generateVideoCubeSvg();

      const attnVp = container.querySelector('#attn-viewport');
      if (attnVp) attnVp.innerHTML = generateAttentionSvg();

      soundFx.playBlip(440 + currentFrame * 35, 0.03);
    });
  }

  // Motion Guidance Slider
  const motionSlider = container.querySelector('#motion-slider');
  if (motionSlider) {
    motionSlider.addEventListener('input', (e) => {
      motionScale = parseFloat(e.target.value);
      state.worldMotionScale = motionScale;

      const mDisp = container.querySelector('#motion-disp');
      if (mDisp) mDisp.textContent = `${motionScale.toFixed(1)}×`;

      const attnVp = container.querySelector('#attn-viewport');
      if (attnVp) attnVp.innerHTML = generateAttentionSvg();

      soundFx.playBlip(550, 0.03);
    });
  }

  // Action Buttons
  const actBtns = container.querySelectorAll('.act-btn');
  actBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      actBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      simAction = btn.getAttribute('data-act');
      state.worldSimAction = simAction;

      const actDisp = container.querySelector('#act-name-disp');
      if (actDisp) actDisp.textContent = simAction.toUpperCase();

      updateRolloutTray();
      soundFx.playBlip(580, 0.05);
    });
  });

  // Run Rollout Simulation Button
  const btnRunRollout = container.querySelector('#btn-run-world-rollout');
  if (btnRunRollout) {
    btnRunRollout.addEventListener('click', () => {
      if (isSimulatingRollout) return;
      isSimulatingRollout = true;
      btnRunRollout.disabled = true;
      btnRunRollout.innerHTML = `<span class="icon spin">🔄</span> Simulating Future Physics...`;
      soundFx.playBlip(750, 0.08);

      setTimeout(() => {
        isSimulatingRollout = false;
        btnRunRollout.disabled = false;
        btnRunRollout.innerHTML = `<span class="icon">🚀</span> Run 5-Step Autoregressive Rollout`;
        updateRolloutTray();
        soundFx.playLevelUp();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }, 500);
    });
  }

  // Claim XP buttons
  const btnClaimTubeletXp = container.querySelector('#btn-claim-tubelet-xp');
  if (btnClaimTubeletXp) {
    btnClaimTubeletXp.addEventListener('click', () => {
      if (!xpTubeletClaimed) {
        xpTubeletClaimed = true;
        awardXp(20, '3D Tubelet Patchification Conquered');
        btnClaimTubeletXp.textContent = '✓ +20 XP Claimed!';
        btnClaimTubeletXp.disabled = true;
        btnClaimTubeletXp.style.opacity = '0.6';
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      }
    });
  }

  const btnClaimDitXp = container.querySelector('#btn-claim-dit-xp');
  if (btnClaimDitXp) {
    btnClaimDitXp.addEventListener('click', () => {
      if (!xpDitClaimed) {
        xpDitClaimed = true;
        awardXp(25, '3D Diffusion Transformer Conquered');
        btnClaimDitXp.textContent = '✓ +25 XP Claimed!';
        btnClaimDitXp.disabled = true;
        btnClaimDitXp.style.opacity = '0.6';
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    });
  }

  const btnClaimWorldXp = container.querySelector('#btn-claim-world-xp');
  if (btnClaimWorldXp) {
    btnClaimWorldXp.addEventListener('click', () => {
      if (!xpWorldSimClaimed) {
        xpWorldSimClaimed = true;
        awardXp(30, 'Action-Conditioned World Models Conquered');
        btnClaimWorldXp.textContent = '✓ +30 XP Claimed!';
        btnClaimWorldXp.disabled = true;
        btnClaimWorldXp.style.opacity = '0.6';
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    });
  }

  // Initial render of rollout tray
  updateRolloutTray();
}



// --- WIDGET 20: Embodied AI & Robotics Lab ---
export function renderEmbodiedRoboticsLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'embodied-lab-container';

  const config = quest.interactiveConfig || {};
  const scenarios = config.scenarios || [
    {
      id: 'kitchen_manipulation',
      title: 'Pick and Place Golden Apple into Fruit Bowl',
      category: 'Household Dexterous Manipulation',
      prompt: 'Pick up the ripe golden apple from the cutting board and place it gently inside the porcelain fruit bowl without bruising.',
      targetCoords: [0.35, -0.15, 0.22],
      controlHz: 50,
      successRate: '96.4%'
    },
    {
      id: 'tabletop_assembly',
      title: 'Precision Electronic Connector Insertion',
      category: 'High-Precision Industrial Contact',
      prompt: 'Align the 12-pin ribbon cable connector with the PCB header slot with sub-millimeter precision and insert until locked.',
      targetCoords: [0.18, 0.24, 0.08],
      controlHz: 100,
      successRate: '94.8%'
    },
    {
      id: 'dual_arm_folding',
      title: 'Bimanual Cloth Folding & Fabric Smoothing',
      category: 'Deformable Object Manipulation',
      prompt: 'Grasp the two top corners of the linen towel with both robotic grippers, lift simultaneously, and fold symmetrically across the center axis.',
      targetCoords: [0.0, 0.32, 0.15],
      controlHz: 50,
      successRate: '91.2%'
    },
    {
      id: 'hazardous_valve',
      title: 'Industrial High-Pressure Valve Turning',
      category: 'Heavy Torque & Contact Dynamics',
      prompt: 'Grasp the circular valve wheel with high-friction silicone pads, exert 15 Nm rotational torque counter-clockwise to shut off flow.',
      targetCoords: [-0.25, 0.18, 0.45],
      controlHz: 50,
      successRate: '98.1%'
    }
  ];

  const chunkConfigs = [
    { label: 'k = 10 (Fast Reactive • 0.2s)', k: 10, rmse: '0.024 m', smoothness: '84%' },
    { label: 'k = 50 (Standard ACT • 1.0s) ★', k: 50, rmse: '0.011 m', smoothness: '97%' },
    { label: 'k = 100 (Long Horizon • 2.0s)', k: 100, rmse: '0.019 m', smoothness: '92%' }
  ];

  let scenarioIdx = state.robotScenarioIdx || 0;
  if (scenarioIdx >= scenarios.length) scenarioIdx = 0;
  let activeTab = state.robotActiveTab || 'vla_teleop';
  let chunkIdx = state.robotChunkSizeIdx ?? 1;
  let eePos = state.robotEePos ? [...state.robotEePos] : [0.35, -0.15, 0.22];
  let gripperState = state.robotGripperState ?? 0.0;
  let pathMode = state.robotPathMode || 'diffusion_policy';
  let denoiseStep = state.robotDenoiseStep ?? 16;
  let isExecutingTrajectory = false;

  let xpVlaClaimed = false;
  let xpActClaimed = false;
  let xpDiffPolicyClaimed = false;

  const currentSc = scenarios[scenarioIdx];
  const curChunk = chunkConfigs[chunkIdx];

  // Helper: map coordinate [-0.5, 0.5] to discrete token bin [0, 255]
  function coordToBin(val, min = -0.5, max = 0.5) {
    const clamped = Math.max(min, Math.min(max, val));
    return Math.floor(((clamped - min) / (max - min)) * 255);
  }

  // Generate Robot Arm Kinematics SVG
  function generateRobotArmSvg() {
    const startX = 60;
    const startY = 160;
    // Map End-Effector X, Y to canvas coordinates
    const targetX = 260 + eePos[0] * 120;
    const targetY = 160 - eePos[2] * 180;

    // Inverse kinematics 2-joint visual approximation
    const midX = (startX + targetX) / 2 + 15;
    const midY = Math.min(startY, targetY) - 35;

    let svgInner = '';

    // Worktable surface
    svgInner += `
      <rect x="20" y="165" width="380" height="25" rx="3" fill="#0f172a" stroke="rgba(255,255,255,0.1)"/>
      <line x1="20" y1="165" x2="400" y2="165" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,4"/>
      <text x="390" y="180" fill="#64748b" font-size="7.5" font-family="monospace" text-anchor="end">Worktable Manifold</text>
    `;

    // Target Goal Position (Apple / Connector)
    const goalX = 260 + currentSc.targetCoords[0] * 120;
    const goalY = 160 - currentSc.targetCoords[2] * 180;
    svgInner += `
      <circle cx="${goalX}" cy="${goalY}" r="12" fill="rgba(16, 185, 129, 0.25)" stroke="#10b981" stroke-width="1.8" stroke-dasharray="3,2"/>
      <text x="${goalX}" y="${goalY + 3}" fill="#34d399" font-size="8" font-weight="bold" text-anchor="middle">🎯</text>
      <text x="${goalX}" y="${goalY + 22}" fill="#34d399" font-size="7.5" font-family="monospace" text-anchor="middle">Goal</text>
    `;

    // Robot Base
    svgInner += `
      <rect x="${startX - 20}" y="${startY - 5}" width="40" height="15" rx="3" fill="#334155" stroke="#64748b"/>
      <circle cx="${startX}" cy="${startY}" r="8" fill="#475569" stroke="#94a3b8" stroke-width="1.5"/>
    `;

    // Arm Link 1 (Base to Elbow)
    svgInner += `
      <line x1="${startX}" y1="${startY}" x2="${midX}" y2="${midY}" stroke="#60a5fa" stroke-width="6" stroke-linecap="round"/>
      <circle cx="${midX}" cy="${midY}" r="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    `;

    // Arm Link 2 (Elbow to Wrist)
    svgInner += `
      <line x1="${midX}" y1="${midY}" x2="${targetX}" y2="${targetY}" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
      <circle cx="${targetX}" cy="${targetY}" r="5" fill="#f59e0b" stroke="#fff" stroke-width="1.5"/>
    `;

    // End-Effector Gripper
    const gripGap = gripperState > 0.5 ? 4 : 12;
    svgInner += `
      <g>
        <line x1="${targetX - gripGap}" y1="${targetY}" x2="${targetX - gripGap}" y2="${targetY + 14}" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
        <line x1="${targetX + gripGap}" y1="${targetY}" x2="${targetX + gripGap}" y2="${targetY + 14}" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
        <text x="${targetX}" y="${targetY - 10}" fill="#fde68a" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">
          EE (${eePos[0].toFixed(2)}, ${eePos[2].toFixed(2)})
        </text>
      </g>
    `;

    return `
      <svg class="robot-arm-svg" viewBox="0 0 420 195" preserveAspectRatio="xMidYMid meet">
        ${svgInner}
      </svg>
    `;
  }

  // Trajectory Diffusion vs MSE Arena SVG
  function generateTrajectoryArenaSvg() {
    let svgInner = '';
    const startX = 60;
    const startY = 100;
    const goalX = 360;
    const goalY = 100;

    // Obstacle Box in Center
    svgInner += `
      <rect x="185" y="70" width="50" height="60" rx="6" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" stroke-width="2"/>
      <text x="210" y="102" fill="#fca5a5" font-size="8.5" font-weight="bold" text-anchor="middle">OBSTACLE</text>
      <text x="210" y="116" fill="#fca5a5" font-size="6.8" font-family="monospace" text-anchor="middle">Rigid Barrier</text>
    `;

    // Start & Goal Dots
    svgInner += `
      <circle cx="${startX}" cy="${startY}" r="8" fill="#3b82f6" stroke="#93c5fd" stroke-width="2"/>
      <text x="${startX}" y="${startY + 22}" fill="#60a5fa" font-size="8" font-family="monospace" text-anchor="middle">Start a_0</text>
      
      <circle cx="${goalX}" cy="${goalY}" r="9" fill="#10b981" stroke="#a7f3d0" stroke-width="2"/>
      <text x="${goalX}" y="${goalY + 22}" fill="#34d399" font-size="8" font-family="monospace" text-anchor="middle">Target a_T</text>
    `;

    if (pathMode === 'mse_average') {
      // MSE Straight line crashing into obstacle
      svgInner += `
        <line x1="${startX}" y1="${startY}" x2="185" y2="${startY}" stroke="#f87171" stroke-width="3" stroke-dasharray="4,2"/>
        <circle cx="185" cy="${startY}" r="7" fill="#ef4444" stroke="#fff" stroke-width="2"/>
        <text x="185" y="${startY - 14}" fill="#ef4444" font-size="9" font-weight="bold" text-anchor="middle">💥 CRASH!</text>
        <text x="120" y="88" fill="#fca5a5" font-size="7.5" font-family="monospace">Mean of Modes: (Left+Right)/2</text>
      `;
    } else {
      // Diffusion Policy Mode - Clean Curve around Obstacle
      const denoiseProgress = (16 - denoiseStep) / 16;
      const arcHeight = 45;
      const isDenoised = denoiseStep <= 4;
      const strokeColr = isDenoised ? '#10b981' : '#f59e0b';
      const strokeW = isDenoised ? 3 : 2;

      svgInner += `
        <path d="M ${startX},${startY} Q 210,${startY - arcHeight} ${goalX},${goalY}" fill="none" stroke="${strokeColr}" stroke-width="${strokeW}" />
        <text x="210" y="${startY - arcHeight - 8}" fill="${strokeColr}" font-size="8.5" font-weight="bold" text-anchor="middle" font-family="monospace">
          Diffusion Policy Mode A (Clears Obstacle!)
        </text>
      `;

      // Alternative mode ghost path (bimodal representation)
      svgInner += `
        <path d="M ${startX},${startY} Q 210,${startY + arcHeight} ${goalX},${goalY}" fill="none" stroke="rgba(56, 189, 248, 0.45)" stroke-width="1.8" stroke-dasharray="3,3"/>
        <text x="210" y="${startY + arcHeight + 16}" fill="#38bdf8" font-size="7.5" font-family="monospace" text-anchor="middle">
          Mode B (Counterfactual Valid Trajectory)
        </text>
      `;
    }

    return `
      <svg class="arena-svg" viewBox="0 0 420 180" preserveAspectRatio="xMidYMid meet">
        ${svgInner}
      </svg>
    `;
  }

  // HTML Structure
  container.innerHTML = `
    <div class="embodied-lab-header">
      <div class="embodied-title-row">
        <div class="embodied-title-badge">
          <span class="embodied-icon">🤖</span>
          <div>
            <h3>Embodied AI & Robotics: VLA & Diffusion Policy Lab</h3>
            <p class="embodied-subtitle">Explore physical foundation models: convert continuous 6-DoF kinematics into discrete VLA tokens, evaluate Action Chunking with Transformers (ACT), and execute multimodal trajectories with Diffusion Policy.</p>
          </div>
        </div>
        <div class="embodied-tab-nav">
          <button class="embodied-tab-btn ${activeTab === 'vla_teleop' ? 'active' : ''}" data-tab="vla_teleop">🦾 VLA Action Tokenizer</button>
          <button class="embodied-tab-btn ${activeTab === 'action_chunking' ? 'active' : ''}" data-tab="action_chunking">📦 Action Chunking (ACT)</button>
          <button class="embodied-tab-btn ${activeTab === 'diffusion_policy' ? 'active' : ''}" data-tab="diffusion_policy">⚡ Diffusion Policy Arena</button>
        </div>
      </div>
    </div>

    <!-- Scenario Selector Bar -->
    <div class="embodied-scenario-bar">
      <span class="sc-label">Robotic Manipulation Task:</span>
      <div class="sc-btn-group">
        ${scenarios.map((sc, i) => `
          <button class="embodied-sc-btn ${i === scenarioIdx ? 'active' : ''}" data-sc-idx="${i}">
            <span class="sc-badge-dot" style="background: ${i === 0 ? '#10b981' : (i === 1 ? '#38bdf8' : (i === 2 ? '#a855f7' : '#f59e0b'))};"></span>
            ${sc.title}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- TAB 1: VLA ACTION TOKENIZER & TELEOP -->
    <div class="embodied-tab-panel" id="panel-vla-teleop" style="display: ${activeTab === 'vla_teleop' ? 'block' : 'none'};">
      <div class="embodied-grid-2col">
        <!-- Left: Kinematics Visualizer & Teleop Sliders -->
        <div class="embodied-card arm-card">
          <div class="card-head">
            <h4><span class="icon">🦾</span> 7-DoF Robot Arm End-Effector Control</h4>
            <span class="badge category-badge">${currentSc.category}</span>
          </div>
          <p class="sc-desc">${currentSc.prompt}</p>

          <div class="arm-viewport" id="arm-viewport">
            ${generateRobotArmSvg()}
          </div>

          <!-- Coordinate Sliders -->
          <div class="teleop-controls">
            <div class="control-row">
              <label for="ee-x-slider">X Position: <strong id="val-x">${eePos[0].toFixed(2)} m</strong></label>
              <input type="range" id="ee-x-slider" min="-0.5" max="0.5" step="0.02" value="${eePos[0]}" class="embodied-slider">
            </div>
            <div class="control-row">
              <label for="ee-z-slider">Z Height: <strong id="val-z">${eePos[2].toFixed(2)} m</strong></label>
              <input type="range" id="ee-z-slider" min="0.05" max="0.5" step="0.02" value="${eePos[2]}" class="embodied-slider">
            </div>
            <div class="gripper-toggle-row">
              <span class="lbl">Parallel Jaw Gripper:</span>
              <button class="btn-gripper ${gripperState > 0.5 ? 'closed' : 'open'}" id="btn-toggle-gripper">
                ${gripperState > 0.5 ? '🔒 Closed [1.0]' : '🔓 Open [0.0]'}
              </button>
            </div>
          </div>

          <div class="card-footer-action">
            <button class="btn-claim-xp" id="btn-claim-vla-xp">
              🦾 Claim +20 XP: VLA Action Tokenization Mastered
            </button>
          </div>
        </div>

        <!-- Right: VLA 256 Action Token Bins -->
        <div class="embodied-card tokens-card">
          <div class="card-head">
            <h4><span class="icon">🔤</span> VLA Vocabulary Token Discretization</h4>
            <span class="badge vla-badge">256 Numerical Bins</span>
          </div>

          <div class="token-bins-display">
            <div class="bin-item">
              <span class="b-lbl">ΔX Position:</span>
              <div class="token-chip rose">
                <code>&lt;action_x_${coordToBin(eePos[0])}&gt;</code>
              </div>
              <span class="b-coord">${eePos[0].toFixed(3)} m</span>
            </div>
            <div class="bin-item">
              <span class="b-lbl">ΔY Position:</span>
              <div class="token-chip blue">
                <code>&lt;action_y_${coordToBin(eePos[1])}&gt;</code>
              </div>
              <span class="b-coord">${eePos[1].toFixed(3)} m</span>
            </div>
            <div class="bin-item">
              <span class="b-lbl">ΔZ Height:</span>
              <div class="token-chip emerald">
                <code>&lt;action_z_${coordToBin(eePos[2])}&gt;</code>
              </div>
              <span class="b-coord">${eePos[2].toFixed(3)} m</span>
            </div>
            <div class="bin-item">
              <span class="b-lbl">Gripper State:</span>
              <div class="token-chip amber">
                <code>&lt;gripper_${gripperState > 0.5 ? '255' : '0'}&gt;</code>
              </div>
              <span class="b-coord">${gripperState > 0.5 ? 'Grip Closed' : 'Grip Open'}</span>
            </div>
          </div>

          <div class="vla-stats-box">
            <div class="stat-row">
              <span class="s-lbl">Closed-Loop Control Rate:</span>
              <strong>${currentSc.controlHz} Hz (20 ms loop)</strong>
            </div>
            <div class="stat-row">
              <span class="s-lbl">Task Physical Success Rate:</span>
              <strong class="success">${currentSc.successRate}</strong>
            </div>
            <div class="stat-row">
              <span class="s-lbl">Pretrained VLA Backbone:</span>
              <strong class="highlight">OpenVLA (Prismatic-7B)</strong>
            </div>
          </div>

          <div class="vla-explainer-box">
            <span class="box-title">Why Tokenize Motor Actions?</span>
            <p>Discretizing physical continuous control into tokens allows standard LLMs to output robot movements as native text predictions, inheriting billions of parameters of pre-trained common sense!</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: ACTION CHUNKING (ACT) -->
    <div class="embodied-tab-panel" id="panel-action-chunking" style="display: ${activeTab === 'action_chunking' ? 'block' : 'none'};">
      <div class="act-layout">
        <!-- ACT Header Card -->
        <div class="embodied-card act-header-card">
          <div class="card-head">
            <h4><span class="icon">📦</span> Action Chunking with Transformers (ACT)</h4>
            <span class="badge act-badge">Temporal Ensembling</span>
          </div>
          <p class="sc-desc">
            Single-step policies suffer from <strong>covariate shift</strong>: a 1-millimeter error compounds until the robot misses the goal. ACT predicts an entire trajectory chunk <code>A_{t:t+k}</code> at once, blending overlapping chunks with exponential weights:
          </p>

          <!-- Chunk Size Selector -->
          <div class="chunk-picker-row">
            <span class="picker-lbl">Trajectory Horizon (k timesteps):</span>
            <div class="chunk-btn-group">
              ${chunkConfigs.map((cc, idx) => `
                <button class="chunk-btn ${idx === chunkIdx ? 'active' : ''}" data-chunk-idx="${idx}">
                  ${cc.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- ACT Metrics Grid -->
          <div class="act-metrics-grid">
            <div class="act-metric-box">
              <span class="m-lbl">Trajectory Tracking RMSE</span>
              <span class="m-val highlight" id="m-rmse-disp">${curChunk.rmse}</span>
              <span class="m-sub">Sub-centimeter accuracy</span>
            </div>
            <div class="act-metric-box">
              <span class="m-lbl">Kinematic Smoothness</span>
              <span class="m-val success" id="m-smooth-disp">${curChunk.smoothness}</span>
              <span class="m-sub">Jerk-free motion profile</span>
            </div>
            <div class="act-metric-box">
              <span class="m-lbl">Temporal Ensemble Window</span>
              <span class="m-val">${(curChunk.k * 0.02).toFixed(1)}s Horizon</span>
              <span class="m-sub">Exponentially blended</span>
            </div>
            <div class="act-metric-box">
              <span class="m-lbl">Covariate Shift Drift</span>
              <span class="m-val success">&lt; 0.5% Drift</span>
              <span class="m-sub">Eliminates error compounding</span>
            </div>
          </div>

          <div class="card-footer-action">
            <button class="btn-claim-xp" id="btn-claim-act-xp">
              📦 Claim +25 XP: Action Chunking & ACT Mastered
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: DIFFUSION POLICY ARENA -->
    <div class="embodied-tab-panel" id="panel-diffusion-policy" style="display: ${activeTab === 'diffusion_policy' ? 'block' : 'none'};">
      <div class="diff-policy-layout">
        <div class="embodied-card arena-card">
          <div class="card-head">
            <h4><span class="icon">⚡</span> Multimodal Trajectory Generation Arena</h4>
            <div class="path-mode-picker">
              <span class="lbl">Policy Formulation:</span>
              <button class="mode-btn ${pathMode === 'mse_average' ? 'active danger' : ''}" data-mode="mse_average">MSE (Mean Crash)</button>
              <button class="mode-btn ${pathMode === 'diffusion_policy' ? 'active success' : ''}" data-mode="diffusion_policy">Diffusion Policy ★</button>
            </div>
          </div>
          <p class="sc-desc">
            Observe the fatal flaw of MSE imitation learning: when demonstrations dodge both Left and Right around an obstacle, MSE calculates the arithmetic mean—driving straight into the obstacle! Diffusion Policy generates valid collision-free paths.
          </p>

          <div class="arena-viewport" id="arena-viewport">
            ${generateTrajectoryArenaSvg()}
          </div>

          <!-- Denoising Scrubber -->
          <div class="denoise-scrubber-box">
            <div class="scrub-head">
              <label for="denoise-slider">Diffusion Denoising Step (k): <strong id="step-disp">Step ${denoiseStep}</strong> / 16</label>
              <span class="active-focus" id="step-focus-lbl">${denoiseStep <= 4 ? 'Clean Collision-Free Trajectory' : 'Iterative Action Denoising'}</span>
            </div>
            <input type="range" id="denoise-slider" min="0" max="16" value="${denoiseStep}" class="embodied-slider">
          </div>

          <div class="arena-footer-row">
            <button class="btn-run-trajectory" id="btn-run-robot-trajectory">
              <span class="icon">🚀</span> Execute Trajectory on Robot Arm
            </button>
            <button class="btn-claim-xp" id="btn-claim-diff-xp">
              🤖 Claim +30 XP: Diffusion Policy & Embodied AI Mastered
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach to DOM
  dom.interactiveContainer.innerHTML = '';
  dom.interactiveContainer.appendChild(container);

  // Tab switching
  const tabBtns = container.querySelectorAll('.embodied-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      state.robotActiveTab = activeTab;

      container.querySelector('#panel-vla-teleop').style.display = activeTab === 'vla_teleop' ? 'block' : 'none';
      container.querySelector('#panel-action-chunking').style.display = activeTab === 'action_chunking' ? 'block' : 'none';
      container.querySelector('#panel-diffusion-policy').style.display = activeTab === 'diffusion_policy' ? 'block' : 'none';
      soundFx.playBlip(620, 0.05);
    });
  });

  // Scenario buttons
  const scBtns = container.querySelectorAll('.embodied-sc-btn');
  scBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      scenarioIdx = parseInt(btn.getAttribute('data-sc-idx'), 10);
      state.robotScenarioIdx = scenarioIdx;
      renderEmbodiedRoboticsLabWidget(quest);
      soundFx.playBlip(500, 0.06);
    });
  });

  // Teleoperation Sliders
  const sliderX = container.querySelector('#ee-x-slider');
  const sliderZ = container.querySelector('#ee-z-slider');

  function updateTeleopUI() {
    state.robotEePos = [...eePos];
    const armVp = container.querySelector('#arm-viewport');
    if (armVp) armVp.innerHTML = generateRobotArmSvg();

    const valX = container.querySelector('#val-x');
    if (valX) valX.textContent = `${eePos[0].toFixed(2)} m`;
    const valZ = container.querySelector('#val-z');
    if (valZ) valZ.textContent = `${eePos[2].toFixed(2)} m`;

    const tokenChips = container.querySelectorAll('.token-bins-display code');
    if (tokenChips.length >= 3) {
      tokenChips[0].textContent = `<action_x_${coordToBin(eePos[0])}>`;
      tokenChips[2].textContent = `<action_z_${coordToBin(eePos[2])}>`;
    }
  }

  if (sliderX) {
    sliderX.addEventListener('input', (e) => {
      eePos[0] = parseFloat(e.target.value);
      updateTeleopUI();
      soundFx.playBlip(480, 0.02);
    });
  }

  if (sliderZ) {
    sliderZ.addEventListener('input', (e) => {
      eePos[2] = parseFloat(e.target.value);
      updateTeleopUI();
      soundFx.playBlip(520, 0.02);
    });
  }

  // Gripper toggle
  const btnGripper = container.querySelector('#btn-toggle-gripper');
  if (btnGripper) {
    btnGripper.addEventListener('click', () => {
      gripperState = gripperState > 0.5 ? 0.0 : 1.0;
      state.robotGripperState = gripperState;
      btnGripper.className = `btn-gripper ${gripperState > 0.5 ? 'closed' : 'open'}`;
      btnGripper.textContent = gripperState > 0.5 ? '🔒 Closed [1.0]' : '🔓 Open [0.0]';
      updateTeleopUI();
      soundFx.playBlip(gripperState > 0.5 ? 700 : 380, 0.06);
    });
  }

  // Chunk picker buttons
  const chunkBtns = container.querySelectorAll('.chunk-btn');
  chunkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chunkBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chunkIdx = parseInt(btn.getAttribute('data-chunk-idx'), 10);
      state.robotChunkSizeIdx = chunkIdx;

      const rmseDisp = container.querySelector('#m-rmse-disp');
      if (rmseDisp) rmseDisp.textContent = chunkConfigs[chunkIdx].rmse;
      const smoothDisp = container.querySelector('#m-smooth-disp');
      if (smoothDisp) smoothDisp.textContent = chunkConfigs[chunkIdx].smoothness;

      soundFx.playBlip(600, 0.05);
    });
  });

  // Path mode buttons
  const modeBtns = container.querySelectorAll('.mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pathMode = btn.getAttribute('data-mode');
      state.robotPathMode = pathMode;

      const arenaVp = container.querySelector('#arena-viewport');
      if (arenaVp) arenaVp.innerHTML = generateTrajectoryArenaSvg();

      soundFx.playBlip(pathMode === 'mse_average' ? 320 : 680, 0.05);
    });
  });

  // Denoise slider
  const denoiseSlider = container.querySelector('#denoise-slider');
  if (denoiseSlider) {
    denoiseSlider.addEventListener('input', (e) => {
      denoiseStep = parseInt(e.target.value, 10);
      state.robotDenoiseStep = denoiseStep;

      const sDisp = container.querySelector('#step-disp');
      if (sDisp) sDisp.textContent = `Step ${denoiseStep}`;
      const fLbl = container.querySelector('#step-focus-lbl');
      if (fLbl) fLbl.textContent = denoiseStep <= 4 ? 'Clean Collision-Free Trajectory' : 'Iterative Action Denoising';

      const arenaVp = container.querySelector('#arena-viewport');
      if (arenaVp) arenaVp.innerHTML = generateTrajectoryArenaSvg();

      soundFx.playBlip(400 + (16 - denoiseStep) * 20, 0.02);
    });
  }

  // Trajectory execution button
  const btnRunTraj = container.querySelector('#btn-run-robot-trajectory');
  if (btnRunTraj) {
    btnRunTraj.addEventListener('click', () => {
      if (isExecutingTrajectory) return;
      isExecutingTrajectory = true;
      btnRunTraj.disabled = true;
      btnRunTraj.innerHTML = `<span class="icon spin">🔄</span> Executing 50Hz Motor Commands...`;
      soundFx.playBlip(720, 0.08);

      setTimeout(() => {
        isExecutingTrajectory = false;
        btnRunTraj.disabled = false;
        btnRunTraj.innerHTML = `<span class="icon">🚀</span> Execute Trajectory on Robot Arm`;
        if (pathMode === 'mse_average') {
          soundFx.playQuizWrong();
          alert('⚠️ COLLISION DETECTED! MSE mode-averaging crashed into the rigid obstacle. Switch to Diffusion Policy to execute a safe trajectory!');
        } else {
          soundFx.playLevelUp();
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        }
      }, 600);
    });
  }

  // Claim XP buttons
  const btnClaimVlaXp = container.querySelector('#btn-claim-vla-xp');
  if (btnClaimVlaXp) {
    btnClaimVlaXp.addEventListener('click', () => {
      if (!xpVlaClaimed) {
        xpVlaClaimed = true;
        awardXp(20, 'VLA Action Tokenization Conquered');
        btnClaimVlaXp.textContent = '✓ +20 XP Claimed!';
        btnClaimVlaXp.disabled = true;
        btnClaimVlaXp.style.opacity = '0.6';
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      }
    });
  }

  const btnClaimActXp = container.querySelector('#btn-claim-act-xp');
  if (btnClaimActXp) {
    btnClaimActXp.addEventListener('click', () => {
      if (!xpActClaimed) {
        xpActClaimed = true;
        awardXp(25, 'Action Chunking with Transformers Conquered');
        btnClaimActXp.textContent = '✓ +25 XP Claimed!';
        btnClaimActXp.disabled = true;
        btnClaimActXp.style.opacity = '0.6';
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    });
  }

  const btnClaimDiffXp = container.querySelector('#btn-claim-diff-xp');
  if (btnClaimDiffXp) {
    btnClaimDiffXp.addEventListener('click', () => {
      if (!xpDiffPolicyClaimed) {
        xpDiffPolicyClaimed = true;
        awardXp(30, 'Diffusion Policy & Embodied AI Conquered');
        btnClaimDiffXp.textContent = '✓ +30 XP Claimed!';
        btnClaimDiffXp.disabled = true;
        btnClaimDiffXp.style.opacity = '0.6';
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      }
    });
  }
}

