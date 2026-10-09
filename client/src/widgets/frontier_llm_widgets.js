import { soundFx } from '../sound_effects.js';
import confetti from 'canvas-confetti';
import { marked } from 'marked';
import katex from 'katex';
import { escapeHtml } from './utils.js';

export function renderAlignmentDpoLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'alignment-dpo-container';

  const config = quest.interactiveConfig || {};
  const scenarios = config.scenarios || [
    {
      id: "code_bug",
      title: "Debugging Python Recursion",
      prompt: "Why is my recursive Fibonacci function crashing with RecursionError: maximum recursion depth exceeded?",
      rawCompletion: "RecursionError: maximum recursion depth exceeded. Post by user_99 on StackOverflow: 'Did you forget the base case? Also check out my Bitcoin website!'",
      sftResponse: "Your function is missing a base case (e.g. if n <= 1: return n). Without it, the function calls itself infinitely until the Python call stack overflows at 1000 frames.",
      dpoAligned: "Your recursive Fibonacci is hitting a stack overflow because it lacks a terminating base case (e.g., if n <= 1: return n). Here is the fix and an iterative O(n) alternative to prevent deep recursion entirely:\n\ndef fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)",
      rejectedResponse: "Python has a dumb 1000 limit. Just import sys and do sys.setrecursionlimit(10000000) so your computer runs out of RAM and freezes.",
      category: "coding",
      policyChosenLogp: -8.2,
      policyRejectedLogp: -16.4,
      refChosenLogp: -9.8,
      refRejectedLogp: -12.1
    }
  ];

  let currentScenarioIdx = state.dpoScenarioIdx !== undefined ? state.dpoScenarioIdx : 0;
  if (currentScenarioIdx >= scenarios.length) currentScenarioIdx = 0;
  let currentBeta = state.dpoBeta !== undefined ? state.dpoBeta : 0.10;
  let activeTab = state.dpoActiveTab || 'dojo';
  let lossMaskMode = state.dpoLossMaskMode || 'labels';
  let trainedSteps = state.dpoTrainedSteps || 0;

  // Custom ChatML state
  let customSystem = "You are a concise, helpful, and honest AI coding assistant.";
  let customUser = "Write a Python one-liner to reverse words in a string.";
  let customAssistant = "' '.join(sentence.split()[::-1])";

  // Simulation delta state per scenario
  let simulatedOffsets = {
    polChosenDelta: trainedSteps * 0.4,
    polRejectedDelta: trainedSteps * -0.6
  };

  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="dpo-diagnostic-hud">
      <div class="dpo-hud-col">
        <div class="dpo-hud-badge">
          <span>🛡️</span>
          <span>POST-TRAINING & ALIGNMENT ENGINE</span>
        </div>
        <div class="dpo-hud-desc">
          Shape raw text predictors into safe, helpful assistants using ChatML role loss masking and Direct Preference Optimization (DPO).
        </div>
      </div>
      <div class="dpo-metrics-grid">
        <div class="dpo-metric-card">
          <span class="dpo-metric-lbl">ALIGNMENT REGIME</span>
          <span class="dpo-metric-val green" id="dpo-stat-regime">✨ Optimal HHH Balance</span>
          <span class="dpo-metric-sub" id="dpo-stat-regime-desc">Helpful • Honest • Harmless</span>
        </div>
        <div class="dpo-metric-card">
          <span class="dpo-metric-lbl">REGULARIZATION (β)</span>
          <span class="dpo-metric-val cyan" id="dpo-stat-beta">${currentBeta.toFixed(2)}</span>
          <span class="dpo-metric-sub" id="dpo-stat-anchor-desc">KL Reference Anchor</span>
        </div>
        <div class="dpo-metric-card">
          <span class="dpo-metric-lbl">REWARD MARGIN (Δr)</span>
          <span class="dpo-metric-val green" id="dpo-stat-margin">+0.820</span>
          <span class="dpo-metric-sub" id="dpo-stat-conf">Win Prob: 69.4%</span>
        </div>
        <div class="dpo-metric-card">
          <span class="dpo-metric-lbl">OPTIMIZATION STEPS</span>
          <span class="dpo-metric-val amber" id="dpo-stat-steps">${trainedSteps} Steps</span>
          <span class="dpo-metric-sub" id="dpo-stat-loss">DPO Loss: 0.365</span>
        </div>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div class="dpo-subtabs-bar">
      <button class="dpo-subtab-btn ${activeTab === 'dojo' ? 'active' : ''}" data-tab="dojo">
        <span>🛡️</span> The Alignment Arena (DPO Lab)
      </button>
      <button class="dpo-subtab-btn ${activeTab === 'chatml' ? 'active' : ''}" data-tab="chatml">
        <span>🎭</span> ChatML Template & Loss Masking
      </button>
      <button class="dpo-subtab-btn ${activeTab === 'rlhf_vs_dpo' ? 'active' : ''}" data-tab="rlhf_vs_dpo">
        <span>⚔️</span> RLHF (PPO) vs DPO Showdown
      </button>
    </div>

    <!-- SUB-TAB 1: THE ALIGNMENT ARENA (DPO LAB) -->
    <div class="dpo-subtab-content ${activeTab === 'dojo' ? 'active' : ''}" id="dpo-content-dojo">
      <!-- Scenario Selector Banner -->
      <div class="dpo-scenario-bar">
        <div class="scenario-select-left">
          <span class="scenario-lbl">Select Alignment Scenario:</span>
          <select id="dpo-scenario-select" class="dpo-select-input">
            ${scenarios.map((s, idx) => `<option value="${idx}" ${idx === currentScenarioIdx ? 'selected' : ''}>${s.category.toUpperCase()}: ${s.title}</option>`).join('')}
          </select>
        </div>
        <div class="scenario-select-right">
          <button class="btn-dpo-step" id="btn-trigger-dpo-step">
            <span>⚡</span> Apply DPO Gradient Step
          </button>
          <button class="btn-dpo-reset" id="btn-reset-dpo" title="Reset optimization progress">
            ↺ Reset
          </button>
        </div>
      </div>

      <!-- Main Two Column Grid: Math & Sliders on Left, 4-Tier Evolution on Right -->
      <div class="dpo-arena-grid">
        <!-- Left: Mathematics & Hyperparameters Panel -->
        <div class="dpo-math-panel">
          <div class="panel-section-title">
            <span>📐</span> DPO MATHEMATICAL ENGINE
          </div>

          <!-- Beta Hyperparameter Slider -->
          <div class="dpo-slider-block">
            <div class="dpo-slider-header">
              <div class="dpo-slider-info">
                <span class="dpo-slider-name">KL Penalty Weight (β)</span>
                <span class="dpo-slider-math">r(x, y) = β · [log π_θ - log π_ref]</span>
              </div>
              <span class="dpo-slider-val-badge cyan" id="val-badge-beta">${currentBeta.toFixed(2)}</span>
            </div>
            <input type="range" class="dpo-range-slider" id="slider-beta" min="0.01" max="0.50" step="0.01" value="${currentBeta}">
            <div class="dpo-slider-scale">
              <span>0.01 (Loose / Drift)</span>
              <span>0.10 (Standard DPO)</span>
              <span>0.50 (Stiff Anchor)</span>
            </div>
            <div class="dpo-preset-pills">
              <button class="dpo-preset-pill" data-val="0.02">Loose (0.02)</button>
              <button class="dpo-preset-pill" data-val="0.10">Standard (0.10)</button>
              <button class="dpo-preset-pill" data-val="0.25">Conservative (0.25)</button>
              <button class="dpo-preset-pill" data-val="0.45">Stiff Anchor (0.45)</button>
            </div>
          </div>

          <!-- Live Formula & Telemetry Card -->
          <div class="dpo-telemetry-card">
            <h4>Live Preference Telemetry</h4>
            <div class="telemetry-math-row">
              <span class="t-lbl">Policy Chosen Log-Prob:</span>
              <strong class="cyan" id="t-pol-chosen">-8.20</strong>
            </div>
            <div class="telemetry-math-row">
              <span class="t-lbl">Policy Rejected Log-Prob:</span>
              <strong class="rose" id="t-pol-rejected">-16.40</strong>
            </div>
            <div class="telemetry-math-row">
              <span class="t-lbl">Ref Chosen Log-Prob:</span>
              <span class="mono" id="t-ref-chosen">-9.80</span>
            </div>
            <div class="telemetry-math-row">
              <span class="t-lbl">Ref Rejected Log-Prob:</span>
              <span class="mono" id="t-ref-rejected">-12.10</span>
            </div>
            <div class="telemetry-divider"></div>
            <div class="telemetry-math-row">
              <span class="t-lbl">Implicit Reward r(y_w):</span>
              <strong class="green" id="t-r-chosen">+0.160</strong>
            </div>
            <div class="telemetry-math-row">
              <span class="t-lbl">Implicit Reward r(y_l):</span>
              <strong class="red" id="t-r-rejected">-0.430</strong>
            </div>
            <div class="telemetry-math-row highlight">
              <span class="t-lbl">Reward Margin (r_w - r_l):</span>
              <strong class="green" id="t-margin">+0.590</strong>
            </div>
            <div class="telemetry-math-row highlight">
              <span class="t-lbl">Preference Prob P(y_w > y_l):</span>
              <strong class="cyan" id="t-win-prob">64.3%</strong>
            </div>
            <div class="telemetry-math-row">
              <span class="t-lbl">DPO Loss:</span>
              <strong class="amber" id="t-dpo-loss">0.441</strong>
            </div>
          </div>

          <!-- Formula Card -->
          <div class="dpo-formula-card">
            <code>L_DPO = -log σ( β · [ log(π_θ(y_w)/π_ref(y_w)) - log(π_θ(y_l)/π_ref(y_l)) ] )</code>
            <p>Maximizes the margin between winner and loser while penalizing drift away from π_ref.</p>
          </div>
        </div>

        <!-- Right: 4-Tier Evolution Display -->
        <div class="dpo-evolution-panel">
          <div class="panel-section-title">
            <span>🧬</span> THE 4-STAGE MODEL EVOLUTION
          </div>

          <div class="user-prompt-card">
            <span class="prompt-tag">USER INSTRUCTION PROMPT</span>
            <p id="dpo-display-prompt">Prompt loading...</p>
          </div>

          <!-- Tier 1: Raw Base Model -->
          <div class="tier-card raw">
            <div class="tier-card-header">
              <span class="tier-badge raw">1. RAW BASE MODEL (PRE-TRAINED)</span>
              <span class="tier-meta">No Alignment • Pure Web Completion</span>
            </div>
            <div class="tier-content" id="dpo-out-raw">
              <!-- Rendered in JS -->
            </div>
            <div class="tier-footer">
              <span class="tier-verdict fail">❌ Fails to act as an assistant; autocompletes forum chatter.</span>
            </div>
          </div>

          <!-- Tier 2: SFT Model -->
          <div class="tier-card sft">
            <div class="tier-card-header">
              <span class="tier-badge sft">2. SFT MODEL (CHATML INSTRUCTION TUNED)</span>
              <span class="tier-meta">Turn-Taking • Basic Helpfulness</span>
            </div>
            <div class="tier-content" id="dpo-out-sft">
              <!-- Rendered in JS -->
            </div>
            <div class="tier-footer">
              <span class="tier-verdict neutral">🔹 Follows instructions, but lacks deep nuance or safe alternatives.</span>
            </div>
          </div>

          <!-- Tier 3: DPO Aligned (Chosen y_w) -->
          <div class="tier-card dpo-win" id="card-chosen">
            <div class="tier-card-header">
              <span class="tier-badge win">3. DPO ALIGNED (CHOSEN WINNER y_w)</span>
              <span class="reward-pill" id="pill-r-win">Implicit Reward: +0.16</span>
            </div>
            <div class="tier-content" id="dpo-out-win">
              <!-- Rendered in JS -->
            </div>
            <div class="tier-footer">
              <span class="tier-verdict pass">✓ Comprehensive, safe, structured, and educational!</span>
              <button class="btn-vote-pair active" id="btn-vote-chosen">🏆 Preferred Winner</button>
            </div>
          </div>

          <!-- Tier 4: Rejected Candidate (Loser y_l) -->
          <div class="tier-card dpo-loss" id="card-rejected">
            <div class="tier-card-header">
              <span class="tier-badge loss">4. REJECTED CANDIDATE (LOSER y_l)</span>
              <span class="reward-pill loss" id="pill-r-loss">Implicit Reward: -0.43</span>
            </div>
            <div class="tier-content" id="dpo-out-loss">
              <!-- Rendered in JS -->
            </div>
            <div class="tier-footer">
              <span class="tier-verdict fail">🚫 Toxic, dangerously reckless, or unhelpfully preachy!</span>
              <button class="btn-vote-pair reject" id="btn-vote-rejected">✕ Disapproved Loser</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 2: CHATML TEMPLATE & LOSS MASKING -->
    <div class="dpo-subtab-content ${activeTab === 'chatml' ? 'active' : ''}" id="dpo-content-chatml">
      <div class="chatml-banner">
        <div class="banner-icon">🎭</div>
        <div class="banner-text">
          <h3>ChatML: Teaching Transformers The Grammar of Dialogue</h3>
          <p>
            Language models only see a flat 1D sequence of integers. ChatML introduces explicit role boundaries: 
            <code>&lt;|im_start|&gt;system</code>, <code>&lt;|im_start|&gt;user</code>, and <code>&lt;|im_start|&gt;assistant</code>.
            Crucially, during training, PyTorch applies <strong>Loss Masking (-100)</strong> to user tokens so the model only learns how to answer!
          </p>
        </div>
      </div>

      <!-- Interactive Turn Builder -->
      <div class="chatml-builder-grid">
        <div class="builder-inputs-col">
          <div class="panel-section-title">
            <span>✏️</span> EDIT CONVERSATION TURNS
          </div>

          <div class="turn-input-block">
            <label for="input-system-prompt">
              <span class="role-pill system">SYSTEM PROMPT</span>
              <span class="role-desc">Persona & Core Guardrails</span>
            </label>
            <textarea id="input-system-prompt" class="chatml-textarea" rows="2">${escapeHtml(customSystem)}</textarea>
          </div>

          <div class="turn-input-block">
            <label for="input-user-prompt">
              <span class="role-pill user">USER QUERY</span>
              <span class="role-desc">Question / Prompt (Loss Masked to -100)</span>
            </label>
            <textarea id="input-user-prompt" class="chatml-textarea" rows="2">${escapeHtml(customUser)}</textarea>
          </div>

          <div class="turn-input-block">
            <label for="input-assistant-prompt">
              <span class="role-pill assistant">ASSISTANT RESPONSE</span>
              <span class="role-desc">Target Completion (Cross-Entropy Trained)</span>
            </label>
            <textarea id="input-assistant-prompt" class="chatml-textarea" rows="2">${escapeHtml(customAssistant)}</textarea>
          </div>

          <div class="mask-mode-toggle-row">
            <span>Inspector Mode:</span>
            <div class="mode-toggle-group">
              <button class="btn-mode-toggle ${lossMaskMode === 'labels' ? 'active' : ''}" data-mode="labels">
                🏷️ Loss Labels (-100 Masking)
              </button>
              <button class="btn-mode-toggle ${lossMaskMode === 'input_ids' ? 'active' : ''}" data-mode="input_ids">
                🔤 Raw Input IDs Stream
              </button>
            </div>
          </div>
        </div>

        <div class="builder-preview-col">
          <div class="panel-section-title">
            <span>🔍</span> TOKENIZED STREAM & LOSS MASK INSPECTOR
          </div>

          <div class="chatml-rendered-stream" id="chatml-token-stream">
            <!-- Rendered in JS -->
          </div>

          <div class="masking-insight-card">
            <h4>💡 Why is Prompt Loss Masking Essential?</h4>
            <p>
              If we computed Cross-Entropy loss over the user's prompt tokens, the model would learn the probability distribution of <em>human questions</em>. 
              When deployed, it would frequently answer a user query with another question instead of solving the problem! Setting <code>label = -100</code> tells PyTorch to ignore prompt gradients completely.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 3: RLHF (PPO) VS DPO SHOWDOWN -->
    <div class="dpo-subtab-content ${activeTab === 'rlhf_vs_dpo' ? 'active' : ''}" id="dpo-content-rlhf_vs_dpo">
      <div class="showdown-header">
        <h3>⚔️ The Alignment Architectural Evolution: PPO vs DPO</h3>
        <p>Why the AI industry transitioned from complex Reinforcement Learning (PPO) to elegant closed-form Direct Preference Optimization.</p>
      </div>

      <div class="showdown-cards-grid">
        <!-- PPO Card -->
        <div class="showdown-card ppo">
          <div class="card-badge ppo">CLASSIC RLHF (PPO - 2022)</div>
          <h4>Actor-Critic Reinforcement Learning</h4>
          <p class="arch-desc">Used in original ChatGPT. Trains a proxy Reward Model network, then uses PPO policy gradients to optimize the LLM.</p>
          
          <div class="arch-specs">
            <div class="spec-row">
              <span>Concurrent Models in VRAM:</span>
              <strong class="rose">4 Models (Actor, Critic, Reward, Ref)</strong>
            </div>
            <div class="spec-row">
              <span>70B Model VRAM Required:</span>
              <strong class="rose">~560 GB (8× H100 GPUs)</strong>
            </div>
            <div class="spec-row">
              <span>Training Stability:</span>
              <strong class="rose">⚠️ Unstable (High policy gradient variance)</strong>
            </div>
            <div class="spec-row">
              <span>Vulnerability:</span>
              <strong class="rose">Reward Hacking & Exploits</strong>
            </div>
          </div>

          <div class="pipeline-flow-box">
            <span class="step">SFT Model</span> ➔ 
            <span class="step">Train Reward Network R_ψ</span> ➔ 
            <span class="step warn">PPO Loop (Actor + Critic)</span>
          </div>
        </div>

        <!-- DPO Card -->
        <div class="showdown-card dpo">
          <div class="card-badge dpo">MODERN PARADIGM (DPO - 2023+)</div>
          <h4>Direct Preference Optimization</h4>
          <p class="arch-desc">Used in Llama 3, Mistral, and Claude. Mathematically proves that the optimal policy can be derived directly from reference log-probabilities.</p>
          
          <div class="arch-specs">
            <div class="spec-row">
              <span>Concurrent Models in VRAM:</span>
              <strong class="green">2 Models (Trainable Policy + Frozen Ref)</strong>
            </div>
            <div class="spec-row">
              <span>70B Model VRAM Required:</span>
              <strong class="green">~280 GB (4× H100 GPUs)</strong>
            </div>
            <div class="spec-row">
              <span>Training Stability:</span>
              <strong class="green">✓ 100% Stable (Standard Cross-Entropy Loss)</strong>
            </div>
            <div class="spec-row">
              <span>Hardware Efficiency:</span>
              <strong class="green">50% Less GPU Memory & 3× Faster</strong>
            </div>
          </div>

          <div class="pipeline-flow-box green">
            <span class="step">SFT Model</span> ➔ 
            <span class="step green">Direct DPO Loss on (y_w, y_l) Pairs</span>
          </div>
        </div>
      </div>

      <!-- VRAM Calculator Widget -->
      <div class="vram-calc-card">
        <h4>💾 Interactive Hardware VRAM Calculator</h4>
        <div class="calc-row">
          <label for="vram-model-size">LLM Parameter Size:</label>
          <select id="vram-model-size" class="dpo-select-input">
            <option value="7">7 Billion (e.g. Mistral-7B, Llama-3-8B)</option>
            <option value="13">13 Billion (e.g. Llama-2-13B)</option>
            <option value="70" selected>70 Billion (e.g. Llama-3-70B)</option>
            <option value="405">405 Billion (e.g. Llama-3.1-405B)</option>
          </select>
        </div>
        <div class="calc-results-grid">
          <div class="calc-box ppo">
            <span class="c-lbl">PPO RLHF VRAM (4 Models + Gradients)</span>
            <span class="c-val rose" id="calc-ppo-vram">~560 GB VRAM</span>
            <span class="c-sub" id="calc-ppo-gpus">Requires: 8× 80GB H100 SXM5</span>
          </div>
          <div class="calc-box dpo">
            <span class="c-lbl">DPO Alignment VRAM (2 Models)</span>
            <span class="c-val green" id="calc-dpo-vram">~280 GB VRAM</span>
            <span class="c-sub" id="calc-dpo-gpus">Requires: 4× 80GB H100 SXM5</span>
          </div>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // --- Mathematics Calculation Function ---
  function computeDpoMetrics() {
    const sc = scenarios[currentScenarioIdx];

    // Effective policy logps with simulation offsets
    const polWin = sc.policyChosenLogp + simulatedOffsets.polChosenDelta;
    const polLoss = sc.policyRejectedLogp + simulatedOffsets.polRejectedDelta;
    const refWin = sc.refChosenLogp;
    const refLoss = sc.refRejectedLogp;

    // Log-ratios: log pi(y) - log ref(y)
    const logRatioWin = polWin - refWin;
    const logRatioLoss = polLoss - refLoss;

    // Implicit rewards: r(x, y) = beta * logRatio
    const rWin = currentBeta * logRatioWin;
    const rLoss = currentBeta * logRatioLoss;

    // Reward margin: r_w - r_l
    const margin = rWin - rLoss;

    // Sigmoid probability of preference: P(y_w > y_l) = 1 / (1 + exp(-margin / beta)) = 1 / (1 + exp(-(logRatioWin - logRatioLoss)))
    // Under DPO definition: logits = beta * ((polWin - polLoss) - (refWin - refLoss)) = margin
    // preference prob = sigmoid(logits / beta) or sigmoid(margin)
    const winProb = 1 / (1 + Math.exp(-margin));

    // DPO loss: -log(sigmoid(margin))
    const dpoLoss = -Math.log(Math.max(winProb, 1e-7));

    return {
      polWin,
      polLoss,
      refWin,
      refLoss,
      rWin,
      rLoss,
      margin,
      winProb,
      dpoLoss
    };
  }

  // --- UI Update Routine ---
  function updateUI() {
    const sc = scenarios[currentScenarioIdx];
    const metrics = computeDpoMetrics();

    // 1. Update HUD stats
    const statRegime = container.querySelector('#dpo-stat-regime');
    const statRegimeDesc = container.querySelector('#dpo-stat-regime-desc');
    const statBeta = container.querySelector('#dpo-stat-beta');
    const statMargin = container.querySelector('#dpo-stat-margin');
    const statConf = container.querySelector('#dpo-stat-conf');
    const statSteps = container.querySelector('#dpo-stat-steps');
    const statLoss = container.querySelector('#dpo-stat-loss');

    if (statBeta) statBeta.textContent = currentBeta.toFixed(2);
    if (statMargin) statMargin.textContent = `${metrics.margin >= 0 ? '+' : ''}${metrics.margin.toFixed(3)}`;
    if (statConf) statConf.textContent = `Win Prob: ${(metrics.winProb * 100).toFixed(1)}%`;
    if (statSteps) statSteps.textContent = `${trainedSteps} Steps`;
    if (statLoss) statLoss.textContent = `DPO Loss: ${metrics.dpoLoss.toFixed(3)}`;

    if (statRegime && statRegimeDesc) {
      if (currentBeta < 0.05) {
        statRegime.textContent = '⚠️ Weak KL Anchor (Drift Risk)';
        statRegime.className = 'dpo-metric-val rose';
        statRegimeDesc.textContent = 'Policy may diverge from ref model';
      } else if (currentBeta > 0.3) {
        statRegime.textContent = '🔒 Over-Conservative Anchor';
        statRegime.className = 'dpo-metric-val amber';
        statRegimeDesc.textContent = 'Policy resists learning preferences';
      } else {
        statRegime.textContent = '✨ Optimal HHH Balance';
        statRegime.className = 'dpo-metric-val green';
        statRegimeDesc.textContent = 'Helpful • Honest • Harmless';
      }
    }

    // 2. Update Slider Badge
    const valBadgeBeta = container.querySelector('#val-badge-beta');
    if (valBadgeBeta) valBadgeBeta.textContent = currentBeta.toFixed(2);

    // 3. Update Telemetry Card
    const tPolChosen = container.querySelector('#t-pol-chosen');
    const tPolRejected = container.querySelector('#t-pol-rejected');
    const tRefChosen = container.querySelector('#t-ref-chosen');
    const tRefRejected = container.querySelector('#t-ref-rejected');
    const tRChosen = container.querySelector('#t-r-chosen');
    const tRRejected = container.querySelector('#t-r-rejected');
    const tMargin = container.querySelector('#t-margin');
    const tWinProb = container.querySelector('#t-win-prob');
    const tDpoLoss = container.querySelector('#t-dpo-loss');

    if (tPolChosen) tPolChosen.textContent = metrics.polWin.toFixed(2);
    if (tPolRejected) tPolRejected.textContent = metrics.polLoss.toFixed(2);
    if (tRefChosen) tRefChosen.textContent = metrics.refWin.toFixed(2);
    if (tRefRejected) tRefRejected.textContent = metrics.refLoss.toFixed(2);
    if (tRChosen) tRChosen.textContent = `${metrics.rWin >= 0 ? '+' : ''}${metrics.rWin.toFixed(3)}`;
    if (tRRejected) tRRejected.textContent = `${metrics.rLoss >= 0 ? '+' : ''}${metrics.rLoss.toFixed(3)}`;
    if (tMargin) tMargin.textContent = `${metrics.margin >= 0 ? '+' : ''}${metrics.margin.toFixed(3)}`;
    if (tWinProb) tWinProb.textContent = `${(metrics.winProb * 100).toFixed(1)}%`;
    if (tDpoLoss) tDpoLoss.textContent = metrics.dpoLoss.toFixed(3);

    // 4. Update Evolution Display Text
    const dispPrompt = container.querySelector('#dpo-display-prompt');
    const outRaw = container.querySelector('#dpo-out-raw');
    const outSft = container.querySelector('#dpo-out-sft');
    const outWin = container.querySelector('#dpo-out-win');
    const outLoss = container.querySelector('#dpo-out-loss');
    const pillRWin = container.querySelector('#pill-r-win');
    const pillRLoss = container.querySelector('#pill-r-loss');

    if (dispPrompt) dispPrompt.textContent = sc.prompt;
    if (outRaw) outRaw.textContent = sc.rawCompletion;
    if (outSft) outSft.textContent = sc.sftResponse;
    if (outWin) outWin.textContent = sc.dpoAligned;
    if (outLoss) outLoss.textContent = sc.rejectedResponse;
    if (pillRWin) pillRWin.textContent = `Implicit Reward: ${metrics.rWin >= 0 ? '+' : ''}${metrics.rWin.toFixed(2)}`;
    if (pillRLoss) pillRLoss.textContent = `Implicit Reward: ${metrics.rLoss >= 0 ? '+' : ''}${metrics.rLoss.toFixed(2)}`;

    // 5. Render ChatML Inspector
    renderChatMLStream();
  }

  // --- Render ChatML Token Stream ---
  function renderChatMLStream() {
    const streamContainer = container.querySelector('#chatml-token-stream');
    if (!streamContainer) return;

    if (lossMaskMode === 'input_ids') {
      streamContainer.innerHTML = `
        <div class="stream-role-block system">
          <span class="special-tok">&lt;|im_start|&gt;system\\n</span>
          <span class="tok-text">${escapeHtml(customSystem)}</span>
          <span class="special-tok">\\n&lt;|im_end|&gt;\\n</span>
        </div>
        <div class="stream-role-block user">
          <span class="special-tok">&lt;|im_start|&gt;user\\n</span>
          <span class="tok-text">${escapeHtml(customUser)}</span>
          <span class="special-tok">\\n&lt;|im_end|&gt;\\n</span>
        </div>
        <div class="stream-role-block assistant">
          <span class="special-tok">&lt;|im_start|&gt;assistant\\n</span>
          <span class="tok-text">${escapeHtml(customAssistant)}</span>
          <span class="special-tok">\\n&lt;|im_end|&gt;</span>
        </div>
      `;
    } else {
      // Labels mode with loss masking (-100)
      streamContainer.innerHTML = `
        <div class="stream-role-block masked">
          <div class="mask-badge-top">LOSS = -100 (MASKED OUT / ZERO GRADIENT)</div>
          <span class="special-tok">&lt;|im_start|&gt;system\\n</span>
          <span class="tok-text">${escapeHtml(customSystem)}</span>
          <span class="special-tok">\\n&lt;|im_end|&gt;\\n</span>
        </div>
        <div class="stream-role-block masked">
          <div class="mask-badge-top">LOSS = -100 (MASKED OUT / ZERO GRADIENT)</div>
          <span class="special-tok">&lt;|im_start|&gt;user\\n</span>
          <span class="tok-text">${escapeHtml(customUser)}</span>
          <span class="special-tok">\\n&lt;|im_end|&gt;\\n</span>
        </div>
        <div class="stream-role-block target">
          <div class="mask-badge-top active">LABEL = TARGET TOKENS (CROSS-ENTROPY TRAINED!)</div>
          <span class="special-tok">&lt;|im_start|&gt;assistant\\n</span>
          <span class="tok-text active">${escapeHtml(customAssistant)}</span>
          <span class="special-tok">\\n&lt;|im_end|&gt;</span>
        </div>
      `;
    }
  }

  // --- Subtab Switching ---
  container.querySelectorAll('.dpo-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.dpo-subtab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.dpo-subtab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      activeTab = tabName;
      state.dpoActiveTab = tabName;
      const target = container.querySelector(`#dpo-content-${tabName}`);
      if (target) target.classList.add('active');
      soundFx.playBlip(560, 0.05);
    });
  });

  // --- Event Listeners for Sliders & Presets ---
  const sliderBeta = container.querySelector('#slider-beta');
  if (sliderBeta) {
    sliderBeta.addEventListener('input', (e) => {
      currentBeta = parseFloat(e.target.value);
      state.dpoBeta = currentBeta;
      updateUI();
    });
  }

  container.querySelectorAll('.dpo-preset-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      currentBeta = parseFloat(btn.dataset.val);
      state.dpoBeta = currentBeta;
      if (sliderBeta) sliderBeta.value = currentBeta;
      soundFx.playBlip(720, 0.05);
      updateUI();
    });
  });

  // --- Scenario Select ---
  const selectScenario = container.querySelector('#dpo-scenario-select');
  if (selectScenario) {
    selectScenario.addEventListener('change', (e) => {
      currentScenarioIdx = parseInt(e.target.value, 10);
      state.dpoScenarioIdx = currentScenarioIdx;
      soundFx.playBlip(620, 0.06);
      updateUI();
    });
  }

  // --- DPO Gradient Step Action Button ---
  const btnTriggerStep = container.querySelector('#btn-trigger-dpo-step');
  const cardChosen = container.querySelector('#card-chosen');
  const cardRejected = container.querySelector('#card-rejected');

  if (btnTriggerStep) {
    btnTriggerStep.addEventListener('click', () => {
      trainedSteps++;
      state.dpoTrainedSteps = trainedSteps;
      simulatedOffsets.polChosenDelta += 0.35;
      simulatedOffsets.polRejectedDelta -= 0.55;

      soundFx.playSuccess();
      awardXp(15);

      if (cardChosen) {
        cardChosen.classList.add('step-flash-win');
        setTimeout(() => cardChosen.classList.remove('step-flash-win'), 700);
      }
      if (cardRejected) {
        cardRejected.classList.add('step-flash-loss');
        setTimeout(() => cardRejected.classList.remove('step-flash-loss'), 700);
      }

      updateUI();
    });
  }

  const btnReset = container.querySelector('#btn-reset-dpo');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      trainedSteps = 0;
      state.dpoTrainedSteps = 0;
      state.dpoUserVotes = {};
      simulatedOffsets.polChosenDelta = 0;
      simulatedOffsets.polRejectedDelta = 0;
      soundFx.playBlip(420, 0.08);
      updateUI();
    });
  }

  // --- Preference Voting Buttons ---
  const btnVoteChosen = container.querySelector('#btn-vote-chosen');
  const btnVoteRejected = container.querySelector('#btn-vote-rejected');
  if (btnVoteChosen) {
    btnVoteChosen.addEventListener('click', () => {
      if (!state.dpoUserVotes) state.dpoUserVotes = {};
      state.dpoUserVotes[currentScenarioIdx] = 'chosen';
      soundFx.playBlip(880, 0.08);
      awardXp(10);
      btnTriggerStep.click();
    });
  }
  if (btnVoteRejected) {
    btnVoteRejected.addEventListener('click', () => {
      if (!state.dpoUserVotes) state.dpoUserVotes = {};
      state.dpoUserVotes[currentScenarioIdx] = 'rejected';
      soundFx.playBlip(440, 0.08);
      btnTriggerStep.click();
    });
  }

  // --- ChatML Interactive Inputs ---
  const inputSys = container.querySelector('#input-system-prompt');
  const inputUsr = container.querySelector('#input-user-prompt');
  const inputAsst = container.querySelector('#input-assistant-prompt');

  if (inputSys) inputSys.addEventListener('input', (e) => { customSystem = e.target.value; renderChatMLStream(); });
  if (inputUsr) inputUsr.addEventListener('input', (e) => { customUser = e.target.value; renderChatMLStream(); });
  if (inputAsst) inputAsst.addEventListener('input', (e) => { customAssistant = e.target.value; renderChatMLStream(); });

  container.querySelectorAll('.btn-mode-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-mode-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lossMaskMode = btn.dataset.mode;
      state.dpoLossMaskMode = lossMaskMode;
      soundFx.playBlip(640, 0.05);
      renderChatMLStream();
    });
  });

  // --- VRAM Calculator Listener ---
  const selectVramSize = container.querySelector('#vram-model-size');
  const valPpoVram = container.querySelector('#calc-ppo-vram');
  const subPpoGpus = container.querySelector('#calc-ppo-gpus');
  const valDpoVram = container.querySelector('#calc-dpo-vram');
  const subDpoGpus = container.querySelector('#calc-dpo-gpus');

  if (selectVramSize) {
    selectVramSize.addEventListener('change', (e) => {
      const b = parseInt(e.target.value, 10);
      // Roughly 8 bytes per param for FP16 weights + gradients + Adam states
      // PPO: 4 models = ~4 * 2 * B bytes = ~8B GB VRAM
      const ppoGb = Math.round(b * 8);
      const dpoGb = Math.round(b * 4);
      const ppoH100 = Math.ceil(ppoGb / 75);
      const dpoH100 = Math.ceil(dpoGb / 75);

      if (valPpoVram) valPpoVram.textContent = `~${ppoGb} GB VRAM`;
      if (subPpoGpus) subPpoGpus.textContent = `Requires: ${ppoH100}× 80GB H100 SXM5`;
      if (valDpoVram) valDpoVram.textContent = `~${dpoGb} GB VRAM`;
      if (subDpoGpus) subDpoGpus.textContent = `Requires: ${dpoH100}× 80GB H100 SXM5`;
      soundFx.playBlip(700, 0.05);
    });
  }

  // Initial draw
  updateUI();
}

// ============================================================================
// WIDGET 12: PEFT, LoRA & QLoRA Lab (Low-Rank Adaptation & Quantization)
// ============================================================================
export function renderPeftLoraLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'peft-lora-container';

  const config = quest.interactiveConfig || {};
  const models = config.models || [
    { id: "llama3_8b", name: "Llama 3 (8B)", d_model: 4096, layers: 32, totalParams: 8030000000, baseVramFp16: 16.1 },
    { id: "llama3_70b", name: "Llama 3 (70B)", d_model: 8192, layers: 80, totalParams: 70600000000, baseVramFp16: 141.2 },
    { id: "mistral_7b", name: "Mistral (7B)", d_model: 4096, layers: 32, totalParams: 7240000000, baseVramFp16: 14.5 }
  ];

  let currentModelId = state.loraBaseModel || 'llama3_8b';
  let currentRank = state.loraRank !== undefined ? state.loraRank : 8;
  let currentAlpha = state.loraAlpha !== undefined ? state.loraAlpha : 16;
  let currentDropout = 0.05;
  let currentQuantMode = state.loraQuantMode || 'nf4_4bit';
  let activeTab = state.loraActiveTab || 'matrix';
  let selectedModules = new Set(state.loraSelectedModules || ['q_proj', 'v_proj']);
  let trainedSteps = state.loraTrainedSteps || 0;
  let activeAdapterKey = state.loraActiveAdapter || 'medical';
  let isMerged = state.loraMerged || false;

  // Domain adapters database
  const adapters = {
    medical: {
      key: 'medical',
      name: "🩺 Clinical Diagnostician",
      category: "Healthcare",
      rank: 16,
      alpha: 32,
      fileSize: "33.5 MB",
      prompt: "Patient presents with sudden onset unilateral throbbing headache, photophobia, and nausea after sleep deprivation.",
      baseOutput: "Headaches can be caused by many conditions like stress, dehydration, or migraine. Rest in a quiet room, drink plenty of water, and consult a doctor if symptoms persist.",
      loraOutput: "Differential Diagnosis: Classical Acute Migraine with Aura.\nRecommended First-Line: Oral Triptan (e.g., Sumatriptan 50mg) combined with NSAID (Naproxen 500mg) and dark-room rest.\nRed Flags to Rule Out: SNOOP criteria (Systemic symptoms, Neurologic deficits, Sudden 'thunderclap' onset indicating subarachnoid hemorrhage)."
    },
    coding: {
      key: 'coding',
      name: "💻 Python Async Copilot",
      category: "Software Engineering",
      rank: 32,
      alpha: 64,
      fileSize: "67.1 MB",
      prompt: "How do I build an asynchronous rate-limited batch consumer using asyncio and a Semaphore in Python?",
      baseOutput: "Asyncio has tasks. You can use asyncio.gather to run multiple functions at the same time in Python to make web requests.",
      loraOutput: "```python\nimport asyncio\n\nasync def worker(item_id: int, sem: asyncio.Semaphore):\n    async with sem:\n        await asyncio.sleep(0.05)  # Simulated rate-limited I/O\n        return f'processed_{item_id}'\n\nasync def main():\n    sem = asyncio.Semaphore(10)  # Max 10 concurrent requests\n    tasks = [worker(i, sem) for i in range(100)]\n    results = await asyncio.gather(*tasks)\n    print(f'Done {len(results)} items')\n```"
    },
    legal: {
      key: 'legal',
      name: "⚖️ Contract & NDA Auditor",
      category: "Legal & Compliance",
      rank: 8,
      alpha: 16,
      fileSize: "16.8 MB",
      prompt: "Audit Clause 9.2: 'Recipient shall keep all Disclosing Party technical and commercial data confidential in perpetuity without exception.'",
      baseOutput: "This clause says you must keep all information confidential forever and cannot share it with anyone else.",
      loraOutput: "⚠️ High Risk Finding: 'In perpetuity' confidentiality covenants are frequently held unenforceable as undue trade restraint in common law jurisdictions.\nRecommended Counter-Draft: Limit survival term to 3 to 5 years post-termination, with standard carved-out exceptions for independently developed data, public domain disclosures, and compelled legal court orders."
    },
    story: {
      key: 'story',
      name: "🎨 Cyberpunk Worldbuilder",
      category: "Creative Writing",
      rank: 4,
      alpha: 8,
      fileSize: "8.4 MB",
      prompt: "Describe the neon marketplace in Neo-Kyoto under perpetual synthetic rain.",
      baseOutput: "The marketplace is busy with neon lights and people walking under the rain selling electronics and street food in a futuristic city.",
      loraOutput: "Chromium smog hangs thick over the sub-level alleys of Neo-Kyoto, reflecting shattered magenta neon across slick puddles of synthetic coolant. Street hawkers in patched carbon-fiber cloaks peddle neural stim-cartridges beneath the low hum of atmospheric scrubbers and surveillance drones."
    }
  };

  // Math helper
  function computeLoraMath() {
    const model = models.find(m => m.id === currentModelId) || models[0];
    const d = model.d_model;
    const d_ff = Math.round(d * 8 / 3); // Llama SwiGLU hidden dim (approx 11008 for 4096)
    const L = model.layers;
    const r = currentRank;
    const alpha = currentAlpha;
    const scaling = alpha / r;

    // Calculate parameter count per layer for selected modules
    let loraParamsPerLayer = 0;
    selectedModules.forEach(mod => {
      if (['q_proj', 'k_proj', 'v_proj', 'o_proj'].includes(mod)) {
        // d_model x d_model: A is r x d, B is d x r -> 2 * r * d
        loraParamsPerLayer += 2 * r * d;
      } else {
        // MLP proj (gate_proj, up_proj, down_proj): A is r x d, B is d_ff x r -> r * (d + d_ff)
        loraParamsPerLayer += r * (d + d_ff);
      }
    });

    const totalLoraParams = loraParamsPerLayer * L;
    const pctTrainable = (totalLoraParams / model.totalParams) * 100;
    const reductionFactor = (model.totalParams / Math.max(totalLoraParams, 1)).toFixed(0);

    // VRAM Footprint calculation (GB)
    let baseModelGb = 0;
    if (currentQuantMode === 'fp16') {
      baseModelGb = (model.totalParams * 2) / (1024 ** 3); // 2 bytes
    } else if (currentQuantMode === 'int8') {
      baseModelGb = (model.totalParams * 1) / (1024 ** 3); // 1 byte
    } else {
      // QLoRA NF4 (0.5 bytes + 0.04 bytes Double Quantization overhead)
      baseModelGb = (model.totalParams * 0.54) / (1024 ** 3);
    }

    // Gradients & Optimizer:
    // Full Fine-Tuning: 2 bytes gradients + 8 bytes AdamW (fp32 moments m and v) = 10 bytes / param
    const fullGradsGb = (model.totalParams * 2) / (1024 ** 3);
    const fullAdamGb = (model.totalParams * 8) / (1024 ** 3);
    const activationsGb = model.id === 'llama3_70b' ? 14.0 : 2.8;
    const fullVramTotal = baseModelGb + fullGradsGb + fullAdamGb + activationsGb;

    // LoRA: Gradients and AdamW ONLY on LoRA trainable parameters!
    const loraGradsGb = (totalLoraParams * 2) / (1024 ** 3);
    const loraAdamGb = (totalLoraParams * 8) / (1024 ** 3);
    const loraActivationsGb = activationsGb * 0.85; // slightly reduced backward graph
    const loraVramTotal = baseModelGb + loraGradsGb + loraAdamGb + loraActivationsGb;

    // Adapter file size (FP16 weights of A and B)
    const adapterFileMb = ((totalLoraParams * 2) / (1024 * 1024)).toFixed(1);

    // Simulated loss and norms
    const currentLoss = Math.max(0.65, 3.75 - Math.log(1 + trainedSteps * 0.45) * 0.72).toFixed(3);
    const normB = Math.min(1.42, trainedSteps * 0.028).toFixed(3);
    const normA = (0.35 + Math.min(0.85, trainedSteps * 0.015)).toFixed(3);

    return {
      model,
      r,
      alpha,
      scaling,
      totalLoraParams,
      pctTrainable,
      reductionFactor,
      baseModelGb,
      loraGradsGb,
      loraAdamGb,
      loraVramTotal,
      fullVramTotal,
      adapterFileMb,
      currentLoss,
      normA,
      normB
    };
  }

  const initialMath = computeLoraMath();

  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="peft-diagnostic-hud">
      <div class="peft-hud-col">
        <div class="peft-hud-badge">
          <span>🎛️</span>
          <span>PEFT & LOW-RANK ADAPTATION ENGINE</span>
        </div>
        <div class="peft-hud-desc">
          Surgically adapt billion-parameter foundation LLMs by decomposing weight updates into low-rank bottleneck matrices (ΔW = B × A) with zero-cost production weight merging.
        </div>
      </div>
      <div class="peft-metrics-grid">
        <div class="peft-metric-card">
          <span class="peft-metric-lbl">TRAINABLE PARAMS</span>
          <span class="peft-metric-val green" id="peft-stat-trainable-pct">${initialMath.pctTrainable.toFixed(3)}%</span>
          <span class="peft-metric-sub" id="peft-stat-trainable-count">${(initialMath.totalLoraParams / 1e6).toFixed(2)}M / ${(initialMath.model.totalParams / 1e9).toFixed(1)}B</span>
        </div>
        <div class="peft-metric-card">
          <span class="peft-metric-lbl">SCALING FACTOR (α / r)</span>
          <span class="peft-metric-val cyan" id="peft-stat-scaling">${initialMath.scaling.toFixed(2)}×</span>
          <span class="peft-metric-sub" id="peft-stat-alpha-sub">α=${currentAlpha} • r=${currentRank}</span>
        </div>
        <div class="peft-metric-card">
          <span class="peft-metric-lbl">ESTIMATED VRAM</span>
          <span class="peft-metric-val ${initialMath.loraVramTotal < 16 ? 'green' : 'amber'}" id="peft-stat-vram">${initialMath.loraVramTotal.toFixed(1)} GB</span>
          <span class="peft-metric-sub" id="peft-stat-vram-sub">${currentQuantMode === 'nf4_4bit' ? '4-Bit QLoRA NF4' : currentQuantMode.toUpperCase()}</span>
        </div>
        <div class="peft-metric-card">
          <span class="peft-metric-lbl">INFERENCE OVERHEAD</span>
          <span class="peft-metric-val ${isMerged ? 'green' : 'cyan'}" id="peft-stat-latency">${isMerged ? '0.00 ms (Merged)' : '+1.85 ms (LoRA)'}</span>
          <span class="peft-metric-sub" id="peft-stat-latency-sub">${isMerged ? '⚡ Zero-Latency Merged' : 'Hot-Swappable Adapter'}</span>
        </div>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div class="peft-subtabs-bar">
      <button class="peft-subtab-btn ${activeTab === 'matrix' ? 'active' : ''}" data-tab="matrix">
        <span>🎛️</span> Matrix Factorization & Rank Explorer
      </button>
      <button class="peft-subtab-btn ${activeTab === 'vram_qlora' ? 'active' : ''}" data-tab="vram_qlora">
        <span>💾</span> VRAM & QLoRA Quantization Studio
      </button>
      <button class="peft-subtab-btn ${activeTab === 'hot_swap' ? 'active' : ''}" data-tab="hot_swap">
        <span>⚡</span> Multi-Tenant Hot-Swapping & Merging
      </button>
    </div>

    <!-- SUB-TAB 1: MATRIX FACTORIZATION & RANK EXPLORER -->
    <div class="peft-subtab-content ${activeTab === 'matrix' ? 'active' : ''}" id="peft-content-matrix">
      <!-- Model and Module Selection Bar -->
      <div class="peft-model-config-bar">
        <div class="peft-config-group">
          <label for="lora-model-select">Target Base LLM:</label>
          <select id="lora-model-select" class="peft-select-input">
            ${models.map(m => `<option value="${m.id}" ${m.id === currentModelId ? 'selected' : ''}>${m.name} (${(m.totalParams / 1e9).toFixed(0)}B params, d=${m.d_model}, L=${m.layers})</option>`).join('')}
          </select>
        </div>
        <div class="peft-config-group modules-group">
          <span class="config-lbl">Target Modules to Adapt:</span>
          <div class="module-chips-wrapper">
            ${['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'].map(mod => `
              <label class="module-check-chip ${selectedModules.has(mod) ? 'active' : ''}">
                <input type="checkbox" value="${mod}" ${selectedModules.has(mod) ? 'checked' : ''} />
                <span>${mod}</span>
              </label>
            `).join('')}
          </div>
          <div class="module-quick-buttons">
            <button class="btn-quick-mod" id="btn-mod-qv">Attention Only (q, v)</button>
            <button class="btn-quick-mod" id="btn-mod-all">All Linear (All 7)</button>
            <button class="btn-quick-mod" id="btn-mod-mlp">MLP Only</button>
          </div>
        </div>
      </div>

      <!-- Sliders and Diagram Grid -->
      <div class="peft-core-grid">
        <!-- Left: Interactive Sliders & Parameter Controls -->
        <div class="peft-controls-card">
          <div class="card-section-title">
            <span>⚙️</span> LORA HYPERPARAMETER STUDIO
          </div>

          <!-- Rank Slider -->
          <div class="peft-slider-row">
            <div class="slider-header">
              <label for="lora-rank-slider">Bottleneck Rank (r):</label>
              <div class="slider-val-badge cyan" id="val-rank-badge">r = ${currentRank}</div>
            </div>
            <input type="range" id="lora-rank-slider" min="1" max="64" step="1" value="${currentRank}" class="peft-range-slider" />
            <div class="slider-subtext">
              <span id="rank-capacity-desc">Standard Rank: Optimal balance between expressiveness and efficiency.</span>
            </div>
          </div>

          <!-- Alpha Slider -->
          <div class="peft-slider-row">
            <div class="slider-header">
              <label for="lora-alpha-slider">LoRA Alpha (α):</label>
              <div class="slider-val-badge amber" id="val-alpha-badge">α = ${currentAlpha}</div>
            </div>
            <input type="range" id="lora-alpha-slider" min="1" max="128" step="1" value="${currentAlpha}" class="peft-range-slider" />
            <div class="slider-subtext">
              <span id="alpha-scaling-desc">Scaling multiplier: ΔW update scaled by ${initialMath.scaling.toFixed(2)}× (α / r).</span>
            </div>
          </div>

          <!-- Dropout Slider -->
          <div class="peft-slider-row">
            <div class="slider-header">
              <label for="lora-dropout-slider">LoRA Dropout (p):</label>
              <div class="slider-val-badge" id="val-dropout-badge">p = ${currentDropout.toFixed(2)}</div>
            </div>
            <input type="range" id="lora-dropout-slider" min="0" max="0.2" step="0.01" value="${currentDropout}" class="peft-range-slider" />
            <div class="slider-subtext">
              <span>Regularizes low-rank adapter to prevent memorizing small target datasets.</span>
            </div>
          </div>

          <!-- Gradient Step Simulation Box -->
          <div class="peft-sim-box">
            <div class="sim-header">
              <span>⚡ TRAINING STEP SIMULATOR</span>
              <span class="sim-counter" id="sim-steps-counter">${trainedSteps} Steps</span>
            </div>
            <div class="sim-metrics">
              <div class="sim-metric">
                <span class="s-lbl">Task Loss:</span>
                <span class="s-val amber" id="sim-stat-loss">${initialMath.currentLoss}</span>
              </div>
              <div class="sim-metric">
                <span class="s-lbl">||A|| Norm:</span>
                <span class="s-val cyan" id="sim-stat-norma">${initialMath.normA}</span>
              </div>
              <div class="sim-metric">
                <span class="s-lbl">||B|| Norm:</span>
                <span class="s-val green" id="sim-stat-normb">${initialMath.normB}</span>
              </div>
            </div>
            <div class="sim-actions">
              <button class="btn-lora-step" id="btn-lora-step">
                <span>⚡</span> Step 50 LoRA Batches (+10 XP)
              </button>
              <button class="btn-lora-reset" id="btn-lora-reset" title="Reset steps to 0">
                ↺ Reset
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Low-Rank Matrix Decomposition Flowchart -->
        <div class="peft-diagram-card">
          <div class="card-section-title">
            <span>📐</span> LOW-RANK FORWARD PASS: h = W₀x + (α/r)·B·A·x
          </div>

          <div class="matrix-flowchart-container" id="matrix-flowchart">
            <!-- Dynamically populated diagram -->
          </div>

          <div class="zero-init-guarantee-card">
            <div class="guarantee-icon">🛡️</div>
            <div class="guarantee-body">
              <strong>The Zero-Initialization Rule (B = 0):</strong>
              <p>
                Matrix B is strictly initialized to <code>torch.zeros_()</code> while Matrix A uses Kaiming Gaussian noise.
                At step 0: <code>ΔW = B × A = 0 × A = 0</code>. The model output is mathematically identical to the pre-trained base model, ensuring zero catastrophic forgetting before fine-tuning starts!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 2: VRAM & QLORA QUANTIZATION STUDIO -->
    <div class="peft-subtab-content ${activeTab === 'vram_qlora' ? 'active' : ''}" id="peft-content-vram_qlora">
      <!-- Precision Toggle Header -->
      <div class="precision-toggle-bar">
        <span class="prec-lbl">Base Model Weight Quantization:</span>
        <div class="prec-buttons-group">
          <button class="btn-prec-mode ${currentQuantMode === 'fp16' ? 'active' : ''}" data-mode="fp16">
            <span>💠</span> FP16 (16-bit Half Precision)
          </button>
          <button class="btn-prec-mode ${currentQuantMode === 'int8' ? 'active' : ''}" data-mode="int8">
            <span>⚙️</span> INT8 (8-bit Quantized)
          </button>
          <button class="btn-prec-mode ${currentQuantMode === 'nf4_4bit' ? 'active' : ''}" data-mode="nf4_4bit">
            <span>⚡</span> QLoRA NF4 (4-bit NormalFloat)
          </button>
        </div>
      </div>

      <!-- Comparative VRAM Stack Bars -->
      <div class="vram-comparison-grid">
        <!-- Full Fine-Tuning Card -->
        <div class="vram-arch-card full-ft">
          <div class="arch-badge rose">FULL FINE-TUNING (UNFEASIBLE)</div>
          <h4>All Weights & States in VRAM</h4>
          <p class="arch-note">Requires storing 16-bit weights, 16-bit gradients, and 32-bit Adam optimizer states for every parameter.</p>
          
          <div class="vram-stack-visual" id="vram-stack-full">
            <!-- Rendered in JS -->
          </div>

          <div class="vram-total-banner rose">
            <span>Total VRAM Required:</span>
            <strong id="vram-total-full-val">${initialMath.fullVramTotal.toFixed(1)} GB</strong>
          </div>
          <div class="hardware-verdict rose">
            ❌ Out of Memory on all consumer hardware. Requires 80GB H100 / A100 datacenter cluster!
          </div>
        </div>

        <!-- LoRA / QLoRA Card -->
        <div class="vram-arch-card peft-ft">
          <div class="arch-badge green">${currentQuantMode === 'nf4_4bit' ? 'QLORA (4-BIT NF4)' : 'LORA (' + currentQuantMode.toUpperCase() + ')'}</div>
          <h4>Frozen Base + Low-Rank Adapters</h4>
          <p class="arch-note">Base model is 100% frozen. Gradients and Adam optimizer states are computed ONLY for tiny adapter matrices A and B!</p>

          <div class="vram-stack-visual" id="vram-stack-lora">
            <!-- Rendered in JS -->
          </div>

          <div class="vram-total-banner green">
            <span>Total VRAM Required:</span>
            <strong id="vram-total-lora-val">${initialMath.loraVramTotal.toFixed(1)} GB</strong>
          </div>
          <div class="hardware-verdict green" id="hardware-verdict-text">
            ✓ FITS ON CONSUMER GPU! Single RTX 3060 / 4060 / 4090 desktop card.
          </div>
        </div>
      </div>

      <!-- Hardware Compatibility Matrix -->
      <div class="gpu-matrix-card">
        <h4>🖥️ Consumer & Workstation GPU Feasibility Matrix</h4>
        <div class="gpu-chips-grid" id="gpu-chips-grid">
          <!-- Populated in JS -->
        </div>
      </div>

      <!-- QLoRA 3 Pillars Cards -->
      <div class="qlora-pillars-grid">
        <div class="pillar-card">
          <div class="pillar-icon cyan">1</div>
          <h5>4-Bit NormalFloat (NF4)</h5>
          <p>
            Standard INT4 divides numbers into uniform linear buckets. But pre-trained neural network weights follow a <strong>Gaussian bell curve</strong>! 
            NF4 positions quantization quantiles so each bin holds an equal probability mass, preserving high information density with zero quantization loss.
          </p>
        </div>
        <div class="pillar-card">
          <div class="pillar-icon amber">2</div>
          <h5>Double Quantization (DQ)</h5>
          <p>
            Quantizing weights requires scaling constants (block size 64). These constants normally consume 32 bits per 64 weights (0.5 bits/param). 
            Double Quantization quantizes the <em>constants themselves</em> into 8-bit integers, slashing memory by <strong>0.37 bits per parameter</strong>!
          </p>
        </div>
        <div class="pillar-card">
          <div class="pillar-icon green">3</div>
          <h5>Paged Optimizers</h5>
          <p>
            Long sequence lengths cause temporary gradient memory surges that trigger sudden CUDA Out-of-Memory (OOM) crashes. 
            QLoRA leverages CUDA Unified Memory to automatically page non-critical optimizer memory to CPU RAM during surges, guaranteeing 100% stable runs.
          </p>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 3: MULTI-TENANT HOT-SWAPPING & MERGING -->
    <div class="peft-subtab-content ${activeTab === 'hot_swap' ? 'active' : ''}" id="peft-content-hot_swap">
      <!-- Top Overview Banner -->
      <div class="adapter-overview-banner">
        <div class="banner-text">
          <h3>⚡ 1 Frozen Base Model + N Specialized Micro-Adapters</h3>
          <p>Serve hundreds of enterprise clients simultaneously: instead of loading 16GB models per customer, swap lightweight 30MB adapters in milliseconds without touching base memory!</p>
        </div>
        <div class="merge-toggle-wrapper">
          <button class="btn-merge-toggle ${isMerged ? 'merged' : ''}" id="btn-toggle-merge">
            <span>${isMerged ? '⚡' : '🔗'}</span>
            <span id="merge-btn-text">${isMerged ? 'LoRA Folded into Base (Zero Latency)' : 'Merge LoRA into Base Weights'}</span>
          </button>
        </div>
      </div>

      <!-- Adapter Selector Grid -->
      <div class="adapters-cards-grid">
        ${Object.values(adapters).map(a => `
          <div class="adapter-card ${a.key === activeAdapterKey ? 'active' : ''}" data-adapter="${a.key}">
            <div class="adapter-card-top">
              <span class="adapter-cat">${a.category}</span>
              <span class="adapter-size">${a.fileSize}</span>
            </div>
            <h4>${a.name}</h4>
            <div class="adapter-specs">
              <span>r = ${a.rank}</span> • <span>α = ${a.alpha}</span>
            </div>
            <div class="adapter-status-pill">
              ${a.key === activeAdapterKey ? (isMerged ? '✓ MERGED IN PRODUCTION' : '● ACTIVE AT RUNTIME') : '○ Click to Mount (<2ms)'}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Live Token Stream Playground -->
      <div class="adapter-playground-grid">
        <!-- Input Prompt -->
        <div class="play-input-col">
          <div class="panel-section-title">
            <span>💬</span> TEST PROMPT (ROUTED TO ADAPTER)
          </div>
          <div class="sample-prompt-box" id="active-prompt-display">
            ${escapeHtml(adapters[activeAdapterKey].prompt)}
          </div>
          <div class="serving-metrics-box">
            <div class="serving-metric">
              <span class="m-lbl">Active Adapter Size:</span>
              <span class="m-val cyan" id="active-adapter-size">${adapters[activeAdapterKey].fileSize}</span>
            </div>
            <div class="serving-metric">
              <span class="m-lbl">Mount / Swap Latency:</span>
              <span class="m-val green">&lt; 1.8 ms</span>
            </div>
            <div class="serving-metric">
              <span class="m-lbl">Inference Compute:</span>
              <span class="m-val ${isMerged ? 'green' : 'amber'}" id="active-compute-mode">
                ${isMerged ? '1 Matrix Mult (Merged)' : '2 Matrix Mults (Dual Branch)'}
              </span>
            </div>
          </div>
        </div>

        <!-- Comparative Output -->
        <div class="play-output-col">
          <div class="panel-section-title">
            <span>🤖</span> OUTPUT COMPARISON: BASE VS LORA
          </div>

          <div class="output-compare-block">
            <div class="output-label base">🔒 Frozen Base LLM Response (Unspecialized):</div>
            <div class="output-text base" id="out-base-text">
              ${escapeHtml(adapters[activeAdapterKey].baseOutput)}
            </div>
          </div>

          <div class="output-compare-block">
            <div class="output-label lora">🎛️ Active LoRA Specialist Response:</div>
            <div class="output-text lora" id="out-lora-text">
              ${escapeHtml(adapters[activeAdapterKey].loraOutput)}
            </div>
          </div>
        </div>
      </div>

      <!-- Production Merging Code Box -->
      <div class="merge-code-card">
        <div class="merge-code-header">
          <span>🚀 PRODUCTION DEPLOYMENT CODE (ZERO LATENCY MERGING)</span>
          <button class="btn-copy-code" id="btn-copy-merge-code">📋 Copy PyTorch Code</button>
        </div>
        <pre class="merge-code-pre"><code><span class="kw">from</span> peft <span class="kw">import</span> PeftModel
<span class="kw">from</span> transformers <span class="kw">import</span> AutoModelForCausalLM

<span class="comment"># 1. Load base model in full precision (or FP16/BF16)</span>
base_model = AutoModelForCausalLM.from_pretrained(<span class="str">"meta-llama/Meta-Llama-3-8B"</span>)

<span class="comment"># 2. Attach specialized adapter weights</span>
model = PeftModel.from_pretrained(base_model, <span class="str">"./lora_adapter_${activeAdapterKey}"</span>)

<span class="comment"># 3. Permanently fold: W_merged = W0 + (alpha/r) * B * A</span>
model = model.merge_and_unload()

<span class="comment"># 4. Save merged model: Zero extra latency, ready for vLLM, TensorRT-LLM, or llama.cpp!</span>
model.save_pretrained(<span class="str">"./llama3_8b_${activeAdapterKey}_merged"</span>)</code></pre>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // --- Dynamic Flowchart Renderer ---
  function renderFlowchart() {
    const fcEl = container.querySelector('#matrix-flowchart');
    if (!fcEl) return;
    const math = computeLoraMath();
    const d = math.model.d_model;
    const r = math.r;
    const alpha = math.alpha;
    const scaling = math.scaling.toFixed(2);
    const modCount = selectedModules.size;

    fcEl.innerHTML = `
      <div class="fc-stage input-stage">
        <div class="fc-node token-node">
          <span class="n-title">Input Token x</span>
          <span class="n-dim">dim = ${d}</span>
        </div>
      </div>

      <div class="fc-fork">
        <div class="fc-branch top-branch">
          <div class="branch-wire top-wire"></div>
          <div class="fc-node base-node">
            <div class="node-badge">🔒 FROZEN BASE LAYER</div>
            <span class="n-title">Base Weight Matrix W₀</span>
            <span class="n-dim">${d} × ${d}</span>
            <span class="n-status">Requires Grad = False</span>
          </div>
        </div>

        <div class="fc-branch bottom-branch">
          <div class="branch-wire btm-wire"></div>
          <div class="lora-bypass-box">
            <div class="node-badge lora">🎛️ LOW-RANK ADAPTER BYPASS (${modCount} Modules)</div>
            <div class="lora-matrices-flow">
              <div class="fc-node mat-a">
                <span class="n-title">Matrix A</span>
                <span class="n-dim">${r} × ${d}</span>
                <span class="n-init">Kaiming Uniform Init</span>
              </div>
              <div class="fc-arrow">➔</div>
              <div class="bottleneck-pill">
                <span>Rank r = ${r}</span>
                <small>${((r / d) * 100).toFixed(2)}% of dim</small>
              </div>
              <div class="fc-arrow">➔</div>
              <div class="fc-node mat-b">
                <span class="n-title">Matrix B</span>
                <span class="n-dim">${d} × ${r}</span>
                <span class="n-init green">Zero Init (zeros_)</span>
              </div>
              <div class="fc-arrow">➔</div>
              <div class="fc-node scale-node">
                <span class="n-title">Scale</span>
                <span class="n-dim">× (${alpha} / ${r})</span>
                <span class="n-factor">${scaling}×</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="fc-stage sum-stage">
        <div class="fc-sum-node">
          <span>⊕</span>
          <small>Add</small>
        </div>
        <div class="fc-arrow">➔</div>
        <div class="fc-node output-node">
          <span class="n-title">Output Vector h</span>
          <span class="n-dim">dim = ${d}</span>
          <span class="n-math">h = W₀x + (α/r)·BAx</span>
        </div>
      </div>
    `;
  }

  // --- Dynamic VRAM Bars Renderer ---
  function renderVramBars() {
    const math = computeLoraMath();
    const fullStack = container.querySelector('#vram-stack-full');
    const loraStack = container.querySelector('#vram-stack-lora');
    if (!fullStack || !loraStack) return;

    // Full FT Bars
    fullStack.innerHTML = `
      <div class="vram-bar-row">
        <span class="v-lbl">Model Weights (FP16):</span>
        <div class="v-bar-track">
          <div class="v-bar-fill blue" style="width: 25%;"></div>
        </div>
        <span class="v-val">${math.baseModelGb.toFixed(1)} GB</span>
      </div>
      <div class="vram-bar-row">
        <span class="v-lbl">Gradients (FP16):</span>
        <div class="v-bar-track">
          <div class="v-bar-fill amber" style="width: 25%;"></div>
        </div>
        <span class="v-val">${math.baseModelGb.toFixed(1)} GB</span>
      </div>
      <div class="vram-bar-row">
        <span class="v-lbl">AdamW States (FP32 moments):</span>
        <div class="v-bar-track">
          <div class="v-bar-fill rose" style="width: 50%;"></div>
        </div>
        <span class="v-val">${(math.baseModelGb * 4).toFixed(1)} GB</span>
      </div>
      <div class="vram-bar-row">
        <span class="v-lbl">Activations & KV Buffers:</span>
        <div class="v-bar-track">
          <div class="v-bar-fill violet" style="width: 15%;"></div>
        </div>
        <span class="v-val">~4.0 GB</span>
      </div>
    `;

    // LoRA Bars
    const loraBasePct = Math.min(100, Math.max(10, (math.baseModelGb / math.loraVramTotal) * 100));
    loraStack.innerHTML = `
      <div class="vram-bar-row">
        <span class="v-lbl">Frozen Weights (${currentQuantMode === 'nf4_4bit' ? '4-Bit NF4' : currentQuantMode.toUpperCase()}):</span>
        <div class="v-bar-track">
          <div class="v-bar-fill cyan" style="width: ${loraBasePct}%;"></div>
        </div>
        <span class="v-val">${math.baseModelGb.toFixed(1)} GB</span>
      </div>
      <div class="vram-bar-row">
        <span class="v-lbl">LoRA Gradients (Trainable Only):</span>
        <div class="v-bar-track">
          <div class="v-bar-fill green" style="width: 4%;"></div>
        </div>
        <span class="v-val">&lt; ${Math.max(0.01, math.loraGradsGb).toFixed(2)} GB</span>
      </div>
      <div class="vram-bar-row">
        <span class="v-lbl">LoRA AdamW States:</span>
        <div class="v-bar-track">
          <div class="v-bar-fill green" style="width: 6%;"></div>
        </div>
        <span class="v-val">&lt; ${Math.max(0.02, math.loraAdamGb).toFixed(2)} GB</span>
      </div>
      <div class="vram-bar-row">
        <span class="v-lbl">Activations (Reduced Graph):</span>
        <div class="v-bar-track">
          <div class="v-bar-fill violet" style="width: 25%;"></div>
        </div>
        <span class="v-val">~2.4 GB</span>
      </div>
    `;

    // Update totals
    const elFullVal = container.querySelector('#vram-total-full-val');
    const elLoraVal = container.querySelector('#vram-total-lora-val');
    const elVerdict = container.querySelector('#hardware-verdict-text');
    if (elFullVal) elFullVal.textContent = `${math.fullVramTotal.toFixed(1)} GB`;
    if (elLoraVal) elLoraVal.textContent = `${math.loraVramTotal.toFixed(1)} GB`;
    if (elVerdict) {
      if (math.loraVramTotal <= 12) {
        elVerdict.className = 'hardware-verdict green';
        elVerdict.innerHTML = '✓ FITS ON ENTRY GPU: RTX 3060 (12GB) / RTX 4060 (16GB) / Mac 16GB';
      } else if (math.loraVramTotal <= 24) {
        elVerdict.className = 'hardware-verdict green';
        elVerdict.innerHTML = '✓ FITS ON HIGH-END CONSUMER GPU: RTX 3090 / 4090 (24GB VRAM)';
      } else if (math.loraVramTotal <= 48) {
        elVerdict.className = 'hardware-verdict amber';
        elVerdict.innerHTML = '⚠️ WORKSTATION GPU REQUIRED: RTX 6000 Ada / A6000 (48GB VRAM)';
      } else {
        elVerdict.className = 'hardware-verdict rose';
        elVerdict.innerHTML = '❌ MULTI-GPU REQUIRED: 80GB H100 / A100 Datacenter Cluster';
      }
    }
  }

  // --- Dynamic GPU Matrix Renderer ---
  function renderGpuMatrix() {
    const grid = container.querySelector('#gpu-chips-grid');
    if (!grid) return;
    const math = computeLoraMath();
    const vram = math.loraVramTotal;

    const gpus = [
      { name: "RTX 3060 Desktop", vram: 12, cost: "$299" },
      { name: "RTX 4070 Desktop", vram: 12, cost: "$549" },
      { name: "RTX 4080 Desktop", vram: 16, cost: "$999" },
      { name: "RTX 3090 / 4090", vram: 24, cost: "$1,599" },
      { name: "Apple M3 Max (36GB+)", vram: 36, cost: "$3,199" },
      { name: "RTX 6000 Ada", vram: 48, cost: "$6,800" },
      { name: "NVIDIA H100 SXM5", vram: 80, cost: "$32,000" }
    ];

    grid.innerHTML = gpus.map(g => {
      const fits = g.vram >= vram;
      return `
        <div class="gpu-chip ${fits ? 'pass' : 'fail'}">
          <div class="gpu-top">
            <span class="gpu-name">${g.name}</span>
            <span class="gpu-status">${fits ? '✅ PASS' : '❌ OOM'}</span>
          </div>
          <div class="gpu-bar">
            <div class="gpu-fill ${fits ? 'green' : 'rose'}" style="width: ${Math.min(100, (vram / g.vram) * 100)}%;"></div>
          </div>
          <div class="gpu-specs">
            <span>${vram.toFixed(1)} / ${g.vram} GB VRAM</span>
            <span class="cost">${g.cost}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Main UI Sync Routine ---
  function updateUI() {
    const math = computeLoraMath();

    // 1. Diagnostic HUD
    const elTrainablePct = container.querySelector('#peft-stat-trainable-pct');
    const elTrainableCount = container.querySelector('#peft-stat-trainable-count');
    const elScaling = container.querySelector('#peft-stat-scaling');
    const elAlphaSub = container.querySelector('#peft-stat-alpha-sub');
    const elVram = container.querySelector('#peft-stat-vram');
    const elVramSub = container.querySelector('#peft-stat-vram-sub');
    const elLatency = container.querySelector('#peft-stat-latency');
    const elLatencySub = container.querySelector('#peft-stat-latency-sub');

    if (elTrainablePct) elTrainablePct.textContent = `${math.pctTrainable.toFixed(3)}%`;
    if (elTrainableCount) elTrainableCount.textContent = `${(math.totalLoraParams / 1e6).toFixed(2)}M / ${(math.model.totalParams / 1e9).toFixed(1)}B`;
    if (elScaling) elScaling.textContent = `${math.scaling.toFixed(2)}×`;
    if (elAlphaSub) elAlphaSub.textContent = `α=${currentAlpha} • r=${currentRank}`;
    if (elVram) {
      elVram.textContent = `${math.loraVramTotal.toFixed(1)} GB`;
      elVram.className = `peft-metric-val ${math.loraVramTotal <= 16 ? 'green' : 'amber'}`;
    }
    if (elVramSub) elVramSub.textContent = currentQuantMode === 'nf4_4bit' ? '4-Bit QLoRA NF4' : currentQuantMode.toUpperCase();
    if (elLatency) {
      elLatency.textContent = isMerged ? '0.00 ms (Merged)' : '+1.85 ms (LoRA)';
      elLatency.className = `peft-metric-val ${isMerged ? 'green' : 'cyan'}`;
    }
    if (elLatencySub) elLatencySub.textContent = isMerged ? '⚡ Zero-Latency Merged' : 'Hot-Swappable Adapter';

    // 2. Sliders badges and descriptions
    const elRankBadge = container.querySelector('#val-rank-badge');
    const elAlphaBadge = container.querySelector('#val-alpha-badge');
    const elDropoutBadge = container.querySelector('#val-dropout-badge');
    const elRankDesc = container.querySelector('#rank-capacity-desc');
    const elAlphaDesc = container.querySelector('#alpha-scaling-desc');

    if (elRankBadge) elRankBadge.textContent = `r = ${currentRank}`;
    if (elAlphaBadge) elAlphaBadge.textContent = `α = ${currentAlpha}`;
    if (elDropoutBadge) elDropoutBadge.textContent = `p = ${currentDropout.toFixed(2)}`;

    if (elRankDesc) {
      if (currentRank <= 2) elRankDesc.textContent = "Ultra-Low Rank: Minimal expressiveness, best for slight tone adjustments.";
      else if (currentRank <= 8) elRankDesc.textContent = "Standard LoRA: Optimal sweet spot for classification and conversational alignment.";
      else if (currentRank <= 16) elRankDesc.textContent = "High Capacity: Ideal for coding, mathematics, and intricate specialized reasoning.";
      else elRankDesc.textContent = "Heavy Adapter: Maximum expressive representation, approaching full fine-tuning performance.";
    }

    if (elAlphaDesc) {
      elAlphaDesc.textContent = `Scaling multiplier: ΔW update scaled by ${math.scaling.toFixed(2)}× (α / r). Recommended: α ≈ 2r.`;
    }

    // 3. Step simulator
    const elSteps = container.querySelector('#sim-steps-counter');
    const elLoss = container.querySelector('#sim-stat-loss');
    const elNormA = container.querySelector('#sim-stat-norma');
    const elNormB = container.querySelector('#sim-stat-normb');
    if (elSteps) elSteps.textContent = `${trainedSteps} Steps`;
    if (elLoss) elLoss.textContent = math.currentLoss;
    if (elNormA) elNormA.textContent = math.normA;
    if (elNormB) elNormB.textContent = math.normB;

    // 4. Serving & Merging section
    const elMergeBtn = container.querySelector('#btn-toggle-merge');
    const elMergeText = container.querySelector('#merge-btn-text');
    const elComputeMode = container.querySelector('#active-compute-mode');
    if (elMergeBtn) {
      if (isMerged) elMergeBtn.classList.add('merged');
      else elMergeBtn.classList.remove('merged');
    }
    if (elMergeText) {
      elMergeText.textContent = isMerged ? 'LoRA Folded into Base (Zero Latency)' : 'Merge LoRA into Base Weights';
    }
    if (elComputeMode) {
      elComputeMode.textContent = isMerged ? '1 Matrix Mult (Merged)' : '2 Matrix Mults (Dual Branch)';
      elComputeMode.className = `m-val ${isMerged ? 'green' : 'amber'}`;
    }

    // Re-render visual components
    renderFlowchart();
    renderVramBars();
    renderGpuMatrix();
  }

  // --- Sub-Tab Switching Event Listeners ---
  container.querySelectorAll('.peft-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.peft-subtab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.peft-subtab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      state.loraActiveTab = activeTab;

      const target = container.querySelector(`#peft-content-${activeTab}`);
      if (target) target.classList.add('active');
      soundFx.playBlip(580, 0.05);
      updateUI();
    });
  });

  // --- Base Model Selection Listener ---
  const selModel = container.querySelector('#lora-model-select');
  if (selModel) {
    selModel.addEventListener('change', (e) => {
      currentModelId = e.target.value;
      state.loraBaseModel = currentModelId;
      soundFx.playBlip(620, 0.05);
      updateUI();
    });
  }

  // --- Module Checkboxes Listeners ---
  container.querySelectorAll('.module-check-chip input').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const val = e.target.value;
      if (e.target.checked) {
        selectedModules.add(val);
        e.target.closest('.module-check-chip').classList.add('active');
      } else {
        if (selectedModules.size > 1) {
          selectedModules.delete(val);
          e.target.closest('.module-check-chip').classList.remove('active');
        } else {
          e.target.checked = true; // At least one module must remain
        }
      }
      state.loraSelectedModules = Array.from(selectedModules);
      soundFx.playBlip(700, 0.04);
      updateUI();
    });
  });

  // Quick module buttons
  const btnModQv = container.querySelector('#btn-mod-qv');
  const btnModAll = container.querySelector('#btn-mod-all');
  const btnModMlp = container.querySelector('#btn-mod-mlp');

  const syncCheckboxes = () => {
    container.querySelectorAll('.module-check-chip input').forEach(input => {
      const isSel = selectedModules.has(input.value);
      input.checked = isSel;
      if (isSel) input.closest('.module-check-chip').classList.add('active');
      else input.closest('.module-check-chip').classList.remove('active');
    });
    state.loraSelectedModules = Array.from(selectedModules);
    updateUI();
  };

  if (btnModQv) {
    btnModQv.addEventListener('click', () => {
      selectedModules = new Set(['q_proj', 'v_proj']);
      soundFx.playBlip(650, 0.05);
      syncCheckboxes();
    });
  }
  if (btnModAll) {
    btnModAll.addEventListener('click', () => {
      selectedModules = new Set(['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj']);
      soundFx.playBlip(750, 0.05);
      syncCheckboxes();
    });
  }
  if (btnModMlp) {
    btnModMlp.addEventListener('click', () => {
      selectedModules = new Set(['gate_proj', 'up_proj', 'down_proj']);
      soundFx.playBlip(680, 0.05);
      syncCheckboxes();
    });
  }

  // --- Sliders Listeners ---
  const sliderRank = container.querySelector('#lora-rank-slider');
  const sliderAlpha = container.querySelector('#lora-alpha-slider');
  const sliderDropout = container.querySelector('#lora-dropout-slider');

  if (sliderRank) {
    sliderRank.addEventListener('input', (e) => {
      currentRank = parseInt(e.target.value, 10);
      state.loraRank = currentRank;
      updateUI();
    });
  }
  if (sliderAlpha) {
    sliderAlpha.addEventListener('input', (e) => {
      currentAlpha = parseInt(e.target.value, 10);
      state.loraAlpha = currentAlpha;
      updateUI();
    });
  }
  if (sliderDropout) {
    sliderDropout.addEventListener('input', (e) => {
      currentDropout = parseFloat(e.target.value);
      updateUI();
    });
  }

  // --- Gradient Step Simulator Buttons ---
  const btnStep = container.querySelector('#btn-lora-step');
  const btnReset = container.querySelector('#btn-lora-reset');

  if (btnStep) {
    btnStep.addEventListener('click', () => {
      trainedSteps += 50;
      state.loraTrainedSteps = trainedSteps;
      soundFx.playBlip(880, 0.08);
      awardXp(10);
      updateUI();
    });
  }
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      trainedSteps = 0;
      state.loraTrainedSteps = 0;
      soundFx.playBlip(420, 0.08);
      updateUI();
    });
  }

  // --- Precision Mode Buttons ---
  container.querySelectorAll('.btn-prec-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-prec-mode').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentQuantMode = btn.dataset.mode;
      state.loraQuantMode = currentQuantMode;
      soundFx.playBlip(720, 0.05);
      updateUI();
    });
  });

  // --- Adapter Selection Listener ---
  container.querySelectorAll('.adapter-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.adapter-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      activeAdapterKey = card.dataset.adapter;
      state.loraActiveAdapter = activeAdapterKey;
      const ad = adapters[activeAdapterKey];

      // Update prompt & outputs
      const elPrompt = container.querySelector('#active-prompt-display');
      const elBase = container.querySelector('#out-base-text');
      const elLora = container.querySelector('#out-lora-text');
      const elSize = container.querySelector('#active-adapter-size');

      if (elPrompt) elPrompt.textContent = ad.prompt;
      if (elBase) elBase.textContent = ad.baseOutput;
      if (elLora) elLora.textContent = ad.loraOutput;
      if (elSize) elSize.textContent = ad.fileSize;

      soundFx.playBlip(640, 0.06);
      updateUI();
    });
  });

  // --- Merge Toggle Listener ---
  const btnToggleMerge = container.querySelector('#btn-toggle-merge');
  if (btnToggleMerge) {
    btnToggleMerge.addEventListener('click', () => {
      isMerged = !isMerged;
      state.loraMerged = isMerged;
      if (isMerged) {
        soundFx.playLevelUp();
        awardXp(25);
      } else {
        soundFx.playBlip(480, 0.06);
      }
      updateUI();
    });
  }

  // --- Copy Merge Code Button ---
  const btnCopyCode = container.querySelector('#btn-copy-merge-code');
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const codeSnippet = `from peft import PeftModel\nfrom transformers import AutoModelForCausalLM\n\nbase_model = AutoModelForCausalLM.from_pretrained("meta-llama/Meta-Llama-3-8B")\nmodel = PeftModel.from_pretrained(base_model, "./lora_adapter_${activeAdapterKey}")\nmodel = model.merge_and_unload()\nmodel.save_pretrained("./llama3_8b_${activeAdapterKey}_merged")`;
      navigator.clipboard.writeText(codeSnippet).then(() => {
        btnCopyCode.textContent = '✓ Copied!';
        setTimeout(() => { btnCopyCode.textContent = '📋 Copy PyTorch Code'; }, 1800);
      });
      soundFx.playBlip(920, 0.05);
    });
  }

  // Initial draw
  updateUI();
}


// ============================================================================
// WIDGET 13: Reasoning Models & Test-Time Compute Lab (DeepSeek-R1, PRM, GRPO)
// ============================================================================
export function renderReasoningModelLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'reasoning-lab-container';

  const config = quest.interactiveConfig || {};
  const problems = config.problems || [
    {
      id: "strawberries",
      title: "Letter Counting & Token Granularity",
      category: "Orthography & Tokenization",
      prompt: "How many times does the letter 'r' appear in the word 'strawberry'?",
      system1Response: "The letter 'r' appears 2 times in the word 'strawberry'.",
      reasoningSteps: [
        {
          stepNum: 1,
          tag: "Token Breakdown",
          thought: "Wait, LLMs see tokens, not raw characters. Subword tokenizer chunks 'strawberry' into ['straw', 'berry']. I must dismantle the word character-by-character: s - t - r - a - w - b - e - r - r - y.",
          prmScore: 0.95,
          isCorrection: false
        },
        {
          stepNum: 2,
          tag: "Character Indexing",
          thought: "Let me index each letter: 1:s, 2:t, 3:r (Match 1!), 4:a, 5:w, 6:b, 7:e, 8:r (Match 2!), 9:r (Match 3!), 10:y.",
          prmScore: 0.98,
          isCorrection: false
        },
        {
          stepNum: 3,
          tag: "Aha! Self-Correction",
          thought: "Count the matches: Index 3 ('r'), Index 8 ('r'), Index 9 ('r'). Total count = 1 + 1 + 1 = 3. System 1 commonly misses the double-r in berry or the r in straw.",
          prmScore: 1.0,
          isCorrection: true
        },
        {
          stepNum: 4,
          tag: "Verification & Sanity Check",
          thought: "Re-verify: 'straw' contains 1 'r'. 'berry' contains 2 'r's. 1 + 2 = 3. Verified with 100% confidence.",
          prmScore: 1.0,
          isCorrection: false
        }
      ],
      finalAnswer: "The letter 'r' appears exactly 3 times in the word 'strawberry'."
    },
    {
      id: "knights_knaves",
      title: "Knights and Knaves Island Paradox",
      category: "Formal Logic & Deduction",
      prompt: "On an island, inhabitants are either Knights (who always tell the truth) or Knaves (who always lie). You meet A and B. A says: 'Both of us are knaves.' What are A and B?",
      system1Response: "A says both are knaves, so A must be a knave and B is a knight because usually people have mixed identities.",
      reasoningSteps: [
        {
          stepNum: 1,
          tag: "Hypothesis 1: A is Knight",
          thought: "Assume A is a Knight. If A is a Knight, A's statement must be TRUE. A's statement is: 'Both A and B are Knaves'. But this implies A is a Knave! A cannot be both Knight and Knave simultaneously. Contradiction!",
          prmScore: 0.99,
          isCorrection: false
        },
        {
          stepNum: 2,
          tag: "Deduction: A is Knave",
          thought: "Since assuming A is a Knight produces a logical contradiction, A MUST be a Knave. Therefore, A is a Knave and always lies.",
          prmScore: 1.0,
          isCorrection: false
        },
        {
          stepNum: 3,
          tag: "Aha! Inverting Falsehood",
          thought: "Since A is a Knave, A's statement 'Both A and B are Knaves' is FALSE. The negation of (A is Knave AND B is Knave) is: (A is Knight OR B is Knight).",
          prmScore: 0.97,
          isCorrection: true
        },
        {
          stepNum: 4,
          tag: "Resolving B",
          thought: "We already know A is a Knave. For the disjunction (A is Knight OR B is Knight) to hold true, B MUST be a Knight!",
          prmScore: 1.0,
          isCorrection: false
        },
        {
          stepNum: 5,
          tag: "Final Verification",
          thought: "Check world consistency: A = Knave, B = Knight. A says 'Both are knaves' -> FALSE. A is indeed lying. Consistent. Deduction complete.",
          prmScore: 1.0,
          isCorrection: false
        }
      ],
      finalAnswer: "A is a Knave (liar), and B is a Knight (truth-teller)."
    },
    {
      id: "game_24",
      title: "The 24-Game: Arithmetical Search",
      category: "Combinatorial Arithmetic",
      prompt: "Using the numbers 3, 3, 8, 8 and the basic operations (+, -, *, /), each number exactly once, obtain 24.",
      system1Response: "8 * 3 = 24, but we have 8 and 3 left over, so maybe (8 - 3) * (8 - 3) = 25 which is close to 24.",
      reasoningSteps: [
        {
          stepNum: 1,
          tag: "Integer Factor Exploration",
          thought: "Target = 24. Standard integer factors: 3 * 8 = 24, 4 * 6 = 24, 2 * 12 = 24. If I multiply 8 * 3 = 24, remaining are {3, 8}. No way to combine 3 and 8 to get 1 or 0 without changing 24.",
          prmScore: 0.88,
          isCorrection: false
        },
        {
          stepNum: 2,
          tag: "Additive & Subtractive Search",
          thought: "Can we do 8 + 8 + 8? We have only two 8s. 8 * (something)? 3 * (something)? What if we divide by a fraction?",
          prmScore: 0.92,
          isCorrection: false
        },
        {
          stepNum: 3,
          tag: "Aha! Fractional Division",
          thought: "Notice that dividing by a fraction multiplies! 24 = 8 / (1/3). Can I construct 1/3 using {3, 3, 8}? Yes: 3 - (8 / 3) = 9/3 - 8/3 = 1/3! EUREKA!",
          prmScore: 1.0,
          isCorrection: true
        },
        {
          stepNum: 4,
          tag: "Exact Evaluation",
          thought: "Compute 8 / (3 - (8 / 3)): Step A: 8/3. Step B: 3 - 8/3 = 1/3. Step C: 8 / (1/3) = 8 * 3 = 24. Exactly 24!",
          prmScore: 1.0,
          isCorrection: false
        },
        {
          stepNum: 5,
          tag: "Constraint Verification",
          thought: "Verify multiset: {3, 3, 8, 8}. 8 (numerator), 3 (subtrahend), 8 (fraction numerator), 3 (fraction denominator). All 4 numbers used exactly once. Valid.",
          prmScore: 1.0,
          isCorrection: false
        }
      ],
      finalAnswer: "8 / (3 - (8 / 3)) = 24"
    },
    {
      id: "river_crossing",
      title: "The River Crossing State-Space Search",
      category: "State-Space Planning",
      prompt: "A farmer must cross a river with a fox, a goose, and a bag of grain in a boat that holds only himself and one item. Left alone, the fox eats the goose, or the goose eats the grain. How does he cross safely?",
      system1Response: "The farmer takes the fox first, then comes back and takes the grain, then takes the goose.",
      reasoningSteps: [
        {
          stepNum: 1,
          tag: "Constraint Analysis",
          thought: "Forbidden states on either bank without farmer: (Fox + Goose) -> Goose eaten. (Goose + Grain) -> Grain eaten. Safe combination: (Fox + Grain). The Goose is the conflict bottleneck.",
          prmScore: 0.98,
          isCorrection: false
        },
        {
          stepNum: 2,
          tag: "Move 1: Isolate Conflicts",
          thought: "Since Fox + Grain can safely stay together on Bank A, the farmer MUST take the Goose across first. Bank A: {Fox, Grain}. Bank B: {Goose}. Farmer returns alone.",
          prmScore: 1.0,
          isCorrection: false
        },
        {
          stepNum: 3,
          tag: "Move 2 & The Dilemma",
          thought: "Farmer takes Fox across to Bank B. But now Bank B has {Fox, Goose}! If farmer leaves, Fox eats Goose!",
          prmScore: 0.85,
          isCorrection: false
        },
        {
          stepNum: 4,
          tag: "Aha! The Reverse Shuttle Move",
          thought: "Backtrack insight: The farmer does NOT need to return alone! He unloads the Fox on Bank B, and takes the GOOSE BACK with him to Bank A! Bank A: {Goose, Grain}. Bank B: {Fox}.",
          prmScore: 1.0,
          isCorrection: true
        },
        {
          stepNum: 5,
          tag: "Move 4 & 5 to Target",
          thought: "Farmer leaves Goose on Bank A, takes Grain to Bank B (Fox + Grain is safe). Farmer returns alone to Bank A, picks up Goose, and crosses to Bank B. All safely across!",
          prmScore: 1.0,
          isCorrection: false
        }
      ],
      finalAnswer: "1. Take Goose across. 2. Return alone. 3. Take Fox across. 4. Bring Goose back! 5. Take Grain across. 6. Return alone. 7. Take Goose across."
    }
  ];

  // Tree data for PRM Tree Tab
  const problemTrees = {
    strawberries: {
      root: { label: "Root: Count 'r's in 'strawberry'", depth: 0 },
      nodes: [
        { id: "s_b1", label: "Step 1: Subwords ['straw', 'berry']", score: 0.95, status: "active", depth: 1, detail: "Model identifies tokenizer chunking boundaries." },
        { id: "s_b2_bad", label: "Step 2A: Count 1 ('straw') + 1 ('berry') = 2", score: 0.15, status: "pruned", depth: 2, detail: "Greedy subword heuristic misses the double-r in 'berry'. PRM detects contradiction." },
        { id: "s_b2_good", label: "Step 2B: Character expansion: s-t-r-a-w-b-e-r-r-y", score: 0.98, status: "active", depth: 2, detail: "Model dismantles word into 10 character tokens." },
        { id: "s_b3_aha", label: "Step 3: Aha! Find matches at indices 3, 8, 9", score: 1.0, status: "active", depth: 3, detail: "Self-correction flags 3 distinct matches. Backtracks from flawed 2-count." },
        { id: "s_term", label: "Terminal: Verified 'r' Count = 3", score: 1.0, status: "solution", depth: 4, detail: "Outcome verified with 100% certainty. Clean deductive path." }
      ]
    },
    knights_knaves: {
      root: { label: "Root: A says 'Both of us are knaves'", depth: 0 },
      nodes: [
        { id: "k_b1_bad", label: "Hypothesis A: A is Knight (truth-teller)", score: 0.12, status: "pruned", depth: 1, detail: "If A is Knight, his statement is true: both are knaves. So A is knave! Direct paradox. Pruned." },
        { id: "k_b1_good", label: "Deduction: A must be Knave (liar)", score: 1.0, status: "active", depth: 1, detail: "Hypothesis A being Knight failed, so A is strictly a Knave." },
        { id: "k_b2_bad", label: "Guess: Since A lies, B also lies -> B is Knave", score: 0.22, status: "pruned", depth: 2, detail: "Invalid inference: negation of conjunction is not both false." },
        { id: "k_b2_good", label: "Aha! Invert: NOT(A is knave AND B is knave)", score: 0.97, status: "active", depth: 2, detail: "By De Morgan's Law: At least one person must be a Knight!" },
        { id: "k_term", label: "Terminal: Since A is Knave, B MUST be Knight!", score: 1.0, status: "solution", depth: 3, detail: "Complete resolution verified against all island logic constraints." }
      ]
    },
    game_24: {
      root: { label: "Root: Obtain 24 from {3, 3, 8, 8}", depth: 0 },
      nodes: [
        { id: "g_b1_bad", label: "Path 1: Greedy integer 8 * 3 = 24", score: 0.25, status: "pruned", depth: 1, detail: "Remaining numbers {3, 8} cannot form 1 (identity) or 0. Dead end." },
        { id: "g_b1_good", label: "Path 2: Fractional division 24 = 8 / (1/3)", score: 0.92, status: "active", depth: 1, detail: "Explore division by fraction to multiply by 3." },
        { id: "g_b2_bad", label: "Path 2A: Try (8 - 3) * (8 - 3) = 25", score: 0.35, status: "pruned", depth: 2, detail: "Yields 25, close but does not satisfy 24. PRM flags arithmetic mismatch." },
        { id: "g_b2_good", label: "Aha! Form 1/3 as 3 - (8 / 3)", score: 1.0, status: "active", depth: 2, detail: "3 - 8/3 = 9/3 - 8/3 = 1/3. All numbers {3, 3, 8, 8} utilized." },
        { id: "g_term", label: "Terminal: 8 / (3 - (8 / 3)) = 24", score: 1.0, status: "solution", depth: 3, detail: "Exact combinatorial arithmetic solution confirmed." }
      ]
    },
    river_crossing: {
      root: { label: "Root: Farmer, Fox, Goose, Grain across river", depth: 0 },
      nodes: [
        { id: "r_b1_bad", label: "Move 1: Take Fox across first", score: 0.10, status: "pruned", depth: 1, detail: "Leaves Goose + Grain alone on Bank A. Goose consumes Grain. Illegal state." },
        { id: "r_b1_good", label: "Move 1: Take Goose across (Fox + Grain safe)", score: 1.0, status: "active", depth: 1, detail: "Fox does not eat Grain. Bank B has Goose. Farmer returns alone." },
        { id: "r_b2_bad", label: "Move 2: Take Fox, leave both on Bank B, return alone", score: 0.18, status: "pruned", depth: 2, detail: "Leaves Fox + Goose on Bank B alone. Fox consumes Goose! Illegal state." },
        { id: "r_b2_good", label: "Aha! Take Fox across, bring GOOSE BACK to Bank A!", score: 1.0, status: "active", depth: 2, detail: "Brilliant reverse shuttle move isolates conflicts on both banks." },
        { id: "r_term", label: "Terminal: Move Grain, return alone, take Goose across", score: 1.0, status: "solution", depth: 3, detail: "All three items safely transported with zero conflicts." }
      ]
    }
  };

  // Local state variables
  let currentProblemIdx = state.reasoningProblemIdx || 0;
  let currentBudget = state.reasoningBudget || 1024;
  let currentTemp = state.reasoningTemp || 0.6;
  let activeTab = state.reasoningActiveTab || 'scratchpad';
  let activeStep = state.reasoningActiveStep || 1;
  let playInterval = null;
  let isPlaying = false;
  let prmThreshold = 0.80;
  let selectedTreeNodeId = null;

  // GRPO Rollout Arena state
  let grpoRewards = [1.0, 0.0, 1.0, 0.3];
  let grpoTrainedSteps = 0;

  const currentProblem = problems[currentProblemIdx] || problems[0];

  container.innerHTML = `
    <!-- Reasoning Lab Header -->
    <div class="reasoning-header-bar">
      <div class="reasoning-title-group">
        <div class="reasoning-pill-badge">🧠 SYSTEM 2 TEST-TIME COMPUTE</div>
        <h3 class="reasoning-main-title">Reasoning Models & Test-Time Compute Lab</h3>
        <p class="reasoning-subtitle">
          Explore the paradigm shift from fast System 1 next-token prediction to deliberate System 2 reasoning:
          Chain-of-Thought scratchpads, Process Reward Models (PRMs), and DeepSeek-R1's Critic-free GRPO.
        </p>
      </div>
      <div class="reasoning-metrics-pill">
        <div class="metric-item">
          <span class="m-label">THOUGHT COMPUTE</span>
          <span class="m-val cyan" id="hud-compute-budget">${currentBudget} Tokens</span>
        </div>
        <div class="metric-item">
          <span class="m-label">SAMPLING TEMP</span>
          <span class="m-val amber" id="hud-temp-val">${currentTemp.toFixed(1)}</span>
        </div>
        <div class="metric-item">
          <span class="m-label">OPTIMIZER</span>
          <span class="m-val green">GRPO (No Critic)</span>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="reasoning-tabs-nav">
      <button class="btn-reasoning-tab ${activeTab === 'scratchpad' ? 'active' : ''}" data-tab="scratchpad">
        <span>💭</span> 1. Chain-of-Thought Scratchpad & Self-Correction
      </button>
      <button class="btn-reasoning-tab ${activeTab === 'prm_tree' ? 'active' : ''}" data-tab="prm_tree">
        <span>🌲</span> 2. PRM Step Verifier & Tree-of-Thoughts Search
      </button>
      <button class="btn-reasoning-tab ${activeTab === 'grpo_arena' ? 'active' : ''}" data-tab="grpo_arena">
        <span>🚀</span> 3. DeepSeek-R1 GRPO Group Rollout Arena
      </button>
    </div>

    <!-- Tab 1: Chain-of-Thought Scratchpad -->
    <div class="reasoning-tab-pane ${activeTab === 'scratchpad' ? 'active' : ''}" id="tab-reasoning-scratchpad">
      <!-- Problem Selector Deck -->
      <div class="reasoning-problem-deck">
        <div class="deck-label">SELECT REASONING CHALLENGE:</div>
        <div class="problem-chips-row">
          ${problems.map((p, idx) => `
            <button class="btn-problem-chip ${idx === currentProblemIdx ? 'active' : ''}" data-pidx="${idx}">
              <span class="p-icon">${idx === 0 ? '🍓' : idx === 1 ? '🏝️' : idx === 2 ? '🧮' : '🦊'}</span>
              <span class="p-title">${p.title}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Problem Prompt Banner -->
      <div class="problem-prompt-banner">
        <div class="prompt-badge">${currentProblem.category}</div>
        <div class="prompt-text"><strong>Problem:</strong> "${currentProblem.prompt}"</div>
      </div>

      <!-- Test-Time Controls Bar -->
      <div class="test-time-controls-card">
        <div class="control-col">
          <div class="slider-label-row">
            <span>Inference Compute Budget:</span>
            <strong id="label-token-budget">${currentBudget} Tokens</strong>
          </div>
          <input type="range" id="slider-token-budget" min="256" max="4096" step="256" value="${currentBudget}" class="form-range" />
          <div class="range-hint">Higher budget allocates deeper thought paths, multiple backtrack cycles, and rigorous sanity checks.</div>
        </div>
        <div class="control-col">
          <div class="slider-label-row">
            <span>Exploration Temperature:</span>
            <strong id="label-temp-val">${currentTemp.toFixed(1)}</strong>
          </div>
          <input type="range" id="slider-temp-val" min="0.1" max="1.2" step="0.1" value="${currentTemp}" class="form-range" />
          <div class="range-hint">Recommended T=0.6 for reasoning: allows exploratory branching without incoherent degeneration.</div>
        </div>
      </div>

      <!-- Dual Stage Comparison (System 1 vs System 2) -->
      <div class="reasoning-dual-stage">
        <!-- Left: System 1 Instant Predictor -->
        <div class="model-arena-box sys1-box">
          <div class="arena-box-header red">
            <div class="box-tag">SYSTEM 1 (STANDARD LLM)</div>
            <h4>⚡ Zero-Shot Fast Predictor</h4>
            <div class="box-stat">0 Thought Tokens • Greedy Argmax</div>
          </div>
          <div class="arena-content">
            <div class="response-lead-label">Immediate Response:</div>
            <div class="sys1-response-quote">
              "${currentProblem.system1Response}"
            </div>
            <div class="failure-diagnosis-box">
              <span class="fail-icon">⚠️</span>
              <div class="fail-info">
                <strong>Why System 1 Failed:</strong>
                <p>
                  ${currentProblemIdx === 0 
                    ? "Subword tokenization blindspot! Tokenizer grouped 'straw' and 'berry' as monolithic vector embeddings, preventing character-level positional counting."
                    : currentProblemIdx === 1
                    ? "Premature commitment! The model greedily assumed mixed roles without checking logical consistency, failing to invert the falsehood of a liar's conjunction."
                    : currentProblemIdx === 2
                    ? "Greedy integer factor trap! The model multiplied 8 * 3 = 24 immediately, leaving no valid way to incorporate the remaining {3, 8} without violating rules."
                    : "Dead-end state collision! The model moved forward naively without considering reverse shuttle moves, letting the fox eat the goose on the opposite bank."}
                </p>
              </div>
            </div>
            <div class="accuracy-verdict red">
              <span>Verdict:</span> <strong>❌ INCORRECT / HALLUCINATED</strong>
            </div>
          </div>
        </div>

        <!-- Right: System 2 DeepSeek-R1 Deliberate Engine -->
        <div class="model-arena-box sys2-box">
          <div class="arena-box-header green">
            <div class="box-tag">SYSTEM 2 (DEEPSEEK-R1 / O1)</div>
            <h4>🧠 Deliberate Reasoning Engine</h4>
            <div class="box-stat" id="sys2-tokens-spent">Allocated: ${Math.round(currentBudget * (activeStep / Math.max(currentProblem.reasoningSteps.length, 1)))} Tokens</div>
          </div>
          <div class="arena-content">
            <!-- Step Player Controls -->
            <div class="step-player-toolbar">
              <button class="btn-player" id="btn-player-reset" title="Restart Scratchpad">⏮ Reset</button>
              <button class="btn-player" id="btn-player-prev" title="Step Back">◀ Prev</button>
              <button class="btn-player btn-player-play" id="btn-player-toggle" title="Play/Pause Auto-Reveal">▶ Play</button>
              <button class="btn-player" id="btn-player-next" title="Next Reasoning Step">Next ▶</button>
              <div class="step-counter-badge" id="step-counter-text">
                Step ${Math.min(activeStep, currentProblem.reasoningSteps.length)} / ${currentProblem.reasoningSteps.length}
              </div>
            </div>

            <!-- Scratchpad Stream Area -->
            <div class="scratchpad-stream-container">
              <div class="scratchpad-header-tag">&lt;think&gt;</div>
              <div class="scratchpad-steps-list" id="scratchpad-steps-list">
                <!-- Dynamically injected reasoning step cards -->
              </div>
              <div class="scratchpad-footer-tag" id="scratchpad-closing-tag" style="display: none;">&lt;/think&gt;</div>
            </div>

            <!-- Final Verified Output Card -->
            <div class="verified-solution-card" id="verified-solution-card" style="display: none;">
              <div class="solution-header">
                <span class="sol-icon">✓</span>
                <div>
                  <h5>Verified System 2 Conclusion</h5>
                  <span class="sol-sub">100% Deductive Confidence Verified</span>
                </div>
              </div>
              <div class="solution-body" id="verified-solution-text">
                "${currentProblem.finalAnswer}"
              </div>
              <div class="solution-actions">
                <button class="btn-claim-xp" id="btn-claim-reasoning-xp">🏆 Claim +25 XP</button>
                <button class="btn-copy-solution" id="btn-copy-thought-chain">📋 Copy Thought Trace</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: PRM Step Verifier & Tree-of-Thoughts -->
    <div class="reasoning-tab-pane ${activeTab === 'prm_tree' ? 'active' : ''}" id="tab-reasoning-prm">
      <!-- PRM vs ORM Architectural Comparison -->
      <div class="prm-comparison-grid">
        <div class="prm-card orm-card">
          <div class="card-badge rose">OUTCOME REWARD MODEL (ORM)</div>
          <h4>Final Answer Grading Only (+1 or 0)</h4>
          <p>
            An ORM inspects only the final line of output. If a model generates a 20-step proof with flawless math but a tiny arithmetic typo on the last line, it gets <strong>Score = 0</strong>.
            Conversely, if a model writes pure gibberish but stumbles into the right answer by coincidence, it gets <strong>Score = +1</strong>!
          </p>
          <div class="prm-flaw-pill">❌ Severe credit assignment ambiguity • Cannot guide search trees</div>
        </div>
        <div class="prm-card prm-card-highlight">
          <div class="card-badge emerald">PROCESS REWARD MODEL (PRM)</div>
          <h4>Step-by-Step Dense Supervision (r_t ∈ [0, 1])</h4>
          <p>
            A PRM acts as an expert mentor checking every intermediate deduction step. It detects the exact moment a line of reasoning breaks down,
            enabling search algorithms (MCTS, Best-of-N) to <strong>prune dead ends early</strong> and backtrack before wasting tokens.
          </p>
          <div class="prm-benefit-pill">✓ Granular credit assignment • Prunes dead ends • Powers MCTS Search</div>
        </div>
      </div>

      <!-- Interactive Tree-of-Thoughts Visualization -->
      <div class="tree-stage-card">
        <div class="tree-stage-header">
          <div>
            <h4>🌲 Tree-of-Thoughts / MCTS Search Explorer</h4>
            <p>Adjust the PRM pruning threshold below. Branches with step scores below threshold are dynamically pruned to save test-time compute!</p>
          </div>
          <div class="tree-controls-group">
            <span class="threshold-label">PRM Pruning Cutoff:</span>
            <input type="range" id="slider-prm-threshold" min="0.50" max="0.95" step="0.05" value="${prmThreshold}" class="form-range" style="width: 140px;" />
            <strong class="threshold-val" id="val-prm-threshold">${Math.round(prmThreshold * 100)}%</strong>
          </div>
        </div>

        <!-- Rendered Tree Nodes -->
        <div class="tree-nodes-canvas" id="tree-nodes-canvas">
          <!-- Populated by JS -->
        </div>

        <!-- Step Diagnostic Inspector -->
        <div class="tree-node-inspector" id="tree-node-inspector">
          <div class="inspector-empty">💡 Click any node in the tree above to inspect its PRM verification score, token breakdown, and deductive state.</div>
        </div>
      </div>
    </div>

    <!-- Tab 3: DeepSeek-R1 GRPO Group Rollout Arena -->
    <div class="reasoning-tab-pane ${activeTab === 'grpo_arena' ? 'active' : ''}" id="tab-reasoning-grpo">
      <!-- Hero Banner: Zero Critic in VRAM -->
      <div class="grpo-hero-card">
        <div class="grpo-hero-badge">REINFORCEMENT LEARNING REVOLUTION</div>
        <h3>DeepSeek-R1 GRPO: Group Relative Policy Optimization</h3>
        <p>
          Traditional Actor-Critic (PPO) requires four models in GPU memory: <strong>Policy (π_θ), Critic (V_ψ), Reward (R), and Reference (π_ref)</strong>.
          For a 70B parameter model, hosting the Critic network requires over 140GB of additional VRAM. 
          DeepSeek-R1 eliminates the Critic model entirely by sampling a group of G candidate rollouts for each prompt and normalizing rewards against the group!
        </p>
        <div class="vram-savings-strip">
          <div class="vram-spec ppo">PPO VRAM (70B): <strong>~280 GB</strong> (Requires 4× 80GB H100s)</div>
          <div class="vram-vs">VS</div>
          <div class="vram-spec grpo">GRPO VRAM (70B): <strong>~140 GB</strong> (50% GPU Memory Saved! 0 Critic in VRAM)</div>
        </div>
      </div>

      <!-- Group Rollouts Arena -->
      <div class="group-rollouts-section">
        <div class="section-title-bar">
          <h4>Group of G=4 Sampled Rollouts for Current Prompt</h4>
          <span class="subtext">Tweak individual completion rewards to see group advantages and policy reinforcement react live:</span>
        </div>

        <div class="rollout-cards-grid" id="grpo-rollouts-grid">
          <!-- Populated in JS with 4 interactive rollout cards -->
        </div>

        <!-- Mathematical Statistics Readout -->
        <div class="grpo-math-panel">
          <div class="math-stat-box">
            <span class="m-title">GROUP MEAN (μ)</span>
            <span class="m-number" id="grpo-mean-val">0.575</span>
            <span class="m-desc">Baseline reward expectation across group</span>
          </div>
          <div class="math-stat-box">
            <span class="m-title">GROUP STD (σ)</span>
            <span class="m-number" id="grpo-std-val">0.428</span>
            <span class="m-desc">Reward variance across candidates</span>
          </div>
          <div class="math-stat-box">
            <span class="m-title">KL PENALTY (β·D_KL)</span>
            <span class="m-number cyan">0.0048</span>
            <span class="m-desc">Anchors policy to reference model π_ref</span>
          </div>
          <div class="math-stat-box">
            <span class="m-title">NET GRPO LOSS</span>
            <span class="m-number emerald" id="grpo-loss-val">-0.3842</span>
            <span class="m-desc">Surrogate loss driving gradient descent</span>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="grpo-actions-bar">
          <button class="btn-grpo-action btn-step" id="btn-simulate-grpo-step">
            <span>⚡</span> Simulate Policy Gradient Step (+10 XP)
          </button>
          <button class="btn-grpo-action btn-reset" id="btn-reset-grpo-rewards">
            <span>🔄</span> Reset Rollout Rewards
          </button>
          <button class="btn-grpo-action btn-copy-code" id="btn-copy-grpo-pytorch">
            <span>📋</span> Copy PyTorch GRPO Loss
          </button>
          <span class="grpo-step-tracker" id="grpo-step-tracker">Steps Simulated: ${grpoTrainedSteps}</span>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // --- TAB SWITCHING LOGIC ---
  container.querySelectorAll('.btn-reasoning-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-reasoning-tab').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.reasoning-tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      state.reasoningActiveTab = activeTab;

      const pane = container.querySelector(`#tab-reasoning-${activeTab}`);
      if (pane) pane.classList.add('active');

      soundFx.playBlip(750, 0.05);

      if (activeTab === 'prm_tree') {
        renderTreeCanvas();
      } else if (activeTab === 'grpo_arena') {
        updateGrpoArena();
      }
    });
  });

  // --- PROBLEM SELECTION LOGIC ---
  container.querySelectorAll('.btn-problem-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      currentProblemIdx = parseInt(btn.dataset.pidx, 10);
      state.reasoningProblemIdx = currentProblemIdx;
      activeStep = 1;
      state.reasoningActiveStep = 1;
      stopAutoPlay();
      soundFx.playBlip(680, 0.06);

      // Re-render widget with new problem
      renderReasoningModelLabWidget(quest);
    });
  });

  // --- TAB 1: SCRATCHPAD STEP LOGIC ---
  function renderScratchpadSteps() {
    const stepsListEl = container.querySelector('#scratchpad-steps-list');
    const closingTagEl = container.querySelector('#scratchpad-closing-tag');
    const solutionCard = container.querySelector('#verified-solution-card');
    const tokensSpentEl = container.querySelector('#sys2-tokens-spent');
    const counterText = container.querySelector('#step-counter-text');

    if (!stepsListEl) return;
    stepsListEl.innerHTML = '';

    const steps = currentProblem.reasoningSteps || [];
    const revealedSteps = steps.slice(0, activeStep);

    revealedSteps.forEach((st, idx) => {
      const stepCard = document.createElement('div');
      stepCard.className = `scratchpad-step-card ${st.isCorrection ? 'is-correction-highlight' : ''}`;
      
      const prmPercent = Math.round(st.prmScore * 100);
      const prmColor = st.prmScore >= 0.95 ? '#34d399' : st.prmScore >= 0.85 ? '#fbbf24' : '#f87171';

      stepCard.innerHTML = `
        <div class="step-card-header">
          <div class="step-meta">
            <span class="step-idx-badge">Step ${st.stepNum}</span>
            <span class="step-tag-text">${st.tag}</span>
            ${st.isCorrection ? '<span class="aha-badge">💡 AHA! SELF-CORRECTION</span>' : ''}
          </div>
          <div class="step-prm-badge" style="color: ${prmColor}; border-color: ${prmColor};">
            <span>PRM Score:</span> <strong>${prmPercent}%</strong>
          </div>
        </div>
        <div class="step-thought-text">${st.thought}</div>
      `;

      stepsListEl.appendChild(stepCard);
    });

    // Update tokens spent
    const spentTokens = Math.round(currentBudget * (activeStep / Math.max(steps.length, 1)));
    if (tokensSpentEl) tokensSpentEl.textContent = `Allocated: ${spentTokens} Tokens • PRM Verified`;

    if (counterText) {
      counterText.textContent = `Step ${Math.min(activeStep, steps.length)} / ${steps.length}`;
    }

    const isAllDone = activeStep >= steps.length;
    if (closingTagEl) closingTagEl.style.display = isAllDone ? 'block' : 'none';
    if (solutionCard) solutionCard.style.display = isAllDone ? 'block' : 'none';
  }

  function startAutoPlay() {
    isPlaying = true;
    const playBtn = container.querySelector('#btn-player-toggle');
    if (playBtn) playBtn.innerHTML = '⏸ Pause';

    playInterval = setInterval(() => {
      const steps = currentProblem.reasoningSteps || [];
      if (activeStep < steps.length) {
        activeStep++;
        state.reasoningActiveStep = activeStep;
        soundFx.playBlip(780 + activeStep * 40, 0.04);
        renderScratchpadSteps();
      } else {
        stopAutoPlay();
        soundFx.playLevelUp();
      }
    }, 1200);
  }

  function stopAutoPlay() {
    isPlaying = false;
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
    const playBtn = container.querySelector('#btn-player-toggle');
    if (playBtn) playBtn.innerHTML = '▶ Play';
  }

  // Step player buttons
  const btnNext = container.querySelector('#btn-player-next');
  const btnPrev = container.querySelector('#btn-player-prev');
  const btnReset = container.querySelector('#btn-player-reset');
  const btnToggle = container.querySelector('#btn-player-toggle');

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      stopAutoPlay();
      const steps = currentProblem.reasoningSteps || [];
      if (activeStep < steps.length) {
        activeStep++;
        state.reasoningActiveStep = activeStep;
        soundFx.playBlip(820, 0.05);
        renderScratchpadSteps();
        if (activeStep >= steps.length) soundFx.playLevelUp();
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      stopAutoPlay();
      if (activeStep > 1) {
        activeStep--;
        state.reasoningActiveStep = activeStep;
        soundFx.playBlip(540, 0.05);
        renderScratchpadSteps();
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      stopAutoPlay();
      activeStep = 1;
      state.reasoningActiveStep = activeStep;
      soundFx.playBlip(440, 0.06);
      renderScratchpadSteps();
    });
  }

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      if (isPlaying) {
        stopAutoPlay();
        soundFx.playBlip(500, 0.05);
      } else {
        const steps = currentProblem.reasoningSteps || [];
        if (activeStep >= steps.length) activeStep = 0;
        startAutoPlay();
        soundFx.playBlip(880, 0.06);
      }
    });
  }

  // Budget & Temp sliders
  const sliderBudget = container.querySelector('#slider-token-budget');
  const sliderTemp = container.querySelector('#slider-temp-val');
  const labelBudget = container.querySelector('#label-token-budget');
  const labelTemp = container.querySelector('#label-temp-val');
  const hudBudget = container.querySelector('#hud-compute-budget');
  const hudTemp = container.querySelector('#hud-temp-val');

  if (sliderBudget) {
    sliderBudget.addEventListener('input', (e) => {
      currentBudget = parseInt(e.target.value, 10);
      state.reasoningBudget = currentBudget;
      if (labelBudget) labelBudget.textContent = `${currentBudget} Tokens`;
      if (hudBudget) hudBudget.textContent = `${currentBudget} Tokens`;
      renderScratchpadSteps();
    });
  }

  if (sliderTemp) {
    sliderTemp.addEventListener('input', (e) => {
      currentTemp = parseFloat(e.target.value);
      state.reasoningTemp = currentTemp;
      if (labelTemp) labelTemp.textContent = currentTemp.toFixed(1);
      if (hudTemp) hudTemp.textContent = currentTemp.toFixed(1);
    });
  }

  // Claim XP Button
  const btnClaimXp = container.querySelector('#btn-claim-reasoning-xp');
  if (btnClaimXp) {
    btnClaimXp.addEventListener('click', () => {
      soundFx.playLevelUp();
      awardXp(25, 'Reasoning Scratchpad Conquered');
      btnClaimXp.disabled = true;
      btnClaimXp.textContent = '✓ Claimed +25 XP!';
    });
  }

  // Copy Thought Chain
  const btnCopyChain = container.querySelector('#btn-copy-thought-chain');
  if (btnCopyChain) {
    btnCopyChain.addEventListener('click', () => {
      const steps = currentProblem.reasoningSteps || [];
      const trace = `<think>\n` + steps.map(s => `[Step ${s.stepNum}: ${s.tag}]\n${s.thought}`).join('\n\n') + `\n</think>\n\nFinal Answer: ${currentProblem.finalAnswer}`;
      navigator.clipboard.writeText(trace).then(() => {
        btnCopyChain.textContent = '✓ Copied Trace!';
        setTimeout(() => { btnCopyChain.textContent = '📋 Copy Thought Trace'; }, 1800);
      });
      soundFx.playBlip(920, 0.05);
    });
  }

  // --- TAB 2: PRM SEARCH TREE LOGIC ---
  function renderTreeCanvas() {
    const treeCanvas = container.querySelector('#tree-nodes-canvas');
    if (!treeCanvas) return;
    treeCanvas.innerHTML = '';

    const problemKey = currentProblem.id || 'strawberries';
    const treeData = problemTrees[problemKey] || problemTrees.strawberries;

    const rootEl = document.createElement('div');
    rootEl.className = 'tree-node-item root-node active';
    rootEl.innerHTML = `
      <div class="node-pill">
        <span class="node-icon">🎯</span>
        <span class="node-title">${treeData.root.label}</span>
      </div>
    `;
    rootEl.addEventListener('click', () => {
      inspectTreeNode({
        title: treeData.root.label,
        score: 1.0,
        status: 'root',
        detail: 'Initial prompt state entered into reasoning model engine.'
      });
    });
    treeCanvas.appendChild(rootEl);

    // Render tree branches
    const branchesContainer = document.createElement('div');
    branchesContainer.className = 'tree-branches-container';

    treeData.nodes.forEach(node => {
      const isPruned = node.score < prmThreshold;
      const nodeEl = document.createElement('div');
      nodeEl.className = `tree-node-item ${isPruned ? 'pruned' : node.status === 'solution' ? 'solution' : 'active'}`;
      nodeEl.dataset.nid = node.id;

      const prmPct = Math.round(node.score * 100);
      const icon = isPruned ? '✂️' : node.status === 'solution' ? '🏆' : '🌱';

      nodeEl.innerHTML = `
        <div class="node-pill">
          <span class="node-icon">${icon}</span>
          <div class="node-texts">
            <span class="node-title">${node.label}</span>
            <span class="node-score-tag">${isPruned ? 'PRUNED' : 'PRM: ' + prmPct + '%'}</span>
          </div>
        </div>
      `;

      nodeEl.addEventListener('click', () => {
        inspectTreeNode({
          title: node.label,
          score: node.score,
          status: isPruned ? 'pruned' : node.status,
          detail: node.detail
        });
        soundFx.playBlip(720, 0.05);
      });

      branchesContainer.appendChild(nodeEl);
    });

    treeCanvas.appendChild(branchesContainer);
  }

  function inspectTreeNode(nodeInfo) {
    const inspector = container.querySelector('#tree-node-inspector');
    if (!inspector) return;

    const prmPct = Math.round(nodeInfo.score * 100);
    const color = nodeInfo.status === 'pruned' ? '#f43f5e' : nodeInfo.status === 'solution' ? '#10b981' : '#38bdf8';

    inspector.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="ins-title-row">
            <span class="ins-badge" style="background: ${color}22; color: ${color}; border: 1px solid ${color};">
              ${nodeInfo.status.toUpperCase()}
            </span>
            <h5>${nodeInfo.title}</h5>
          </div>
          <div class="ins-score-box" style="color: ${color};">
            PRM Confidence: <strong>${prmPct}%</strong>
          </div>
        </div>
        <p class="ins-detail">${nodeInfo.detail}</p>
        <div class="ins-verdict">
          ${nodeInfo.status === 'pruned'
            ? '⛔ <strong>Pruned by PRM:</strong> Step confidence fell below current threshold (' + Math.round(prmThreshold * 100) + '%). Token exploration halted along this path to conserve inference compute.'
            : nodeInfo.status === 'solution'
            ? '🏆 <strong>Terminal Deduction:</strong> Verification passed with 100% formal confidence. Reached target state.'
            : '✓ <strong>Active Branch:</strong> High PRM confidence score allows Monte Carlo Tree Search to expand subsequent child nodes.'}
        </div>
      </div>
    `;
  }

  const sliderThreshold = container.querySelector('#slider-prm-threshold');
  const valThreshold = container.querySelector('#val-prm-threshold');
  if (sliderThreshold) {
    sliderThreshold.addEventListener('input', (e) => {
      prmThreshold = parseFloat(e.target.value);
      if (valThreshold) valThreshold.textContent = `${Math.round(prmThreshold * 100)}%`;
      renderTreeCanvas();
    });
  }

  // --- TAB 3: GRPO GROUP ROLLOUT LOGIC ---
  function updateGrpoArena() {
    const gridEl = container.querySelector('#grpo-rollouts-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    // Calculate Group Statistics
    const G = grpoRewards.length;
    const mean = grpoRewards.reduce((a, b) => a + b, 0) / G;
    const variance = grpoRewards.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / G;
    const std = Math.sqrt(variance) + 1e-6;

    // Update Math readouts
    const elMean = container.querySelector('#grpo-mean-val');
    const elStd = container.querySelector('#grpo-std-val');
    const elLoss = container.querySelector('#grpo-loss-val');

    if (elMean) elMean.textContent = mean.toFixed(3);
    if (elStd) elStd.textContent = std.toFixed(3);

    const rolloutMetas = [
      { num: 1, title: "Rigorous Step-by-Step Proof", desc: "Dismantled premises methodically, confirmed exact invariants, zero hallucinations." },
      { num: 2, title: "Hallucinated Unsound Jump", desc: "Assumed premature conclusion, committed arithmetic fallacy on intermediate step." },
      { num: 3, title: "Alternative Valid Derivation", desc: "Approached from dual angle, inverted falsehood, arrived at sound verified answer." },
      { num: 4, title: "Sound Reasoning, Minor Glitch", desc: "Correct logic trajectory, but minor formatting hesitation before final answer." }
    ];

    let totalPolicyLoss = 0;

    grpoRewards.forEach((r, idx) => {
      const adv = (r - mean) / std;
      const isPositive = adv > 0;
      const isNeutral = Math.abs(adv) < 0.001;
      const meta = rolloutMetas[idx];

      // Simulated surrogate loss
      totalPolicyLoss += -adv;

      const card = document.createElement('div');
      card.className = `rollout-card ${isPositive ? 'positive-adv' : isNeutral ? 'neutral-adv' : 'negative-adv'}`;

      card.innerHTML = `
        <div class="rollout-card-header">
          <div class="rollout-num-badge">Rollout o_${meta.num}</div>
          <div class="rollout-adv-badge ${isPositive ? 'green' : isNeutral ? 'gray' : 'red'}">
            Advantage: <strong>${adv >= 0 ? '+' : ''}${adv.toFixed(2)}</strong>
          </div>
        </div>
        <h5 class="rollout-title">${meta.title}</h5>
        <p class="rollout-desc">${meta.desc}</p>
        
        <div class="rollout-slider-control">
          <div class="r-label-row">
            <span>Terminal Reward R_${meta.num}:</span>
            <strong class="r-val-pill">${r.toFixed(2)}</strong>
          </div>
          <input type="range" class="reward-slider" data-ridx="${idx}" min="0.0" max="1.0" step="0.1" value="${r}" />
        </div>

        <div class="rollout-verdict-pill ${isPositive ? 'reinforce' : isNeutral ? 'neutral' : 'penalize'}">
          ${isPositive 
            ? '🟢 REINFORCE: Positive gradient update (+Δθ)' 
            : isNeutral 
            ? '⚪ BASELINE: Zero policy change (Matches group mean)' 
            : '🔴 PENALIZE: Negative gradient update (-Δθ)'}
        </div>
      `;

      // Slider listener
      const slider = card.querySelector('.reward-slider');
      slider.addEventListener('input', (e) => {
        grpoRewards[idx] = parseFloat(e.target.value);
        updateGrpoArena();
      });

      gridEl.appendChild(card);
    });

    // Net GRPO loss (policy + KL)
    const netLoss = (totalPolicyLoss / G) + 0.0048;
    if (elLoss) elLoss.textContent = netLoss.toFixed(4);
  }

  // GRPO Actions
  const btnSimulateStep = container.querySelector('#btn-simulate-grpo-step');
  const btnResetRewards = container.querySelector('#btn-reset-grpo-rewards');
  const btnCopyGrpoCode = container.querySelector('#btn-copy-grpo-pytorch');
  const stepTracker = container.querySelector('#grpo-step-tracker');

  if (btnSimulateStep) {
    btnSimulateStep.addEventListener('click', () => {
      grpoTrainedSteps += 10;
      soundFx.playBlip(920, 0.08);
      awardXp(10, 'GRPO Step Optimized');
      if (stepTracker) stepTracker.textContent = `Steps Simulated: ${grpoTrainedSteps}`;
      updateGrpoArena();
    });
  }

  if (btnResetRewards) {
    btnResetRewards.addEventListener('click', () => {
      grpoRewards = [1.0, 0.0, 1.0, 0.3];
      soundFx.playBlip(440, 0.06);
      updateGrpoArena();
    });
  }

  if (btnCopyGrpoCode) {
    btnCopyGrpoCode.addEventListener('click', () => {
      const codeSnippet = quest.codeSnippet || `# DeepSeek-R1 GRPO Loss\ndef compute_grpo_loss(policy_logps, old_logps, rewards):\n    adv = (rewards - rewards.mean()) / (rewards.std() + 1e-8)\n    return -(torch.exp(policy_logps - old_logps) * adv).mean()`;
      navigator.clipboard.writeText(codeSnippet).then(() => {
        btnCopyGrpoCode.textContent = '✓ Copied PyTorch Code!';
        setTimeout(() => { btnCopyGrpoCode.textContent = '📋 Copy PyTorch GRPO Loss'; }, 1800);
      });
      soundFx.playBlip(880, 0.05);
    });
  }

  // Initial draw
  renderScratchpadSteps();
}

// --- WIDGET 14: Agentic Tool Use & Function Calling Lab ---
export function renderAgenticToolLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'agentic-lab-container';

  const config = quest.interactiveConfig || {};
  const scenarios = config.scenarios || [];
  const toolsRegistry = config.toolsRegistry || [];

  let scenarioIdx = state.agentScenarioIdx || 0;
  if (scenarioIdx >= scenarios.length) scenarioIdx = 0;
  let activeTab = state.agentActiveTab || 'react_loop';
  let activeStep = state.agentActiveStep || 1;
  let autoPlayInterval = null;
  let selectedToolIdx = state.agentSelectedToolIdx || 0;
  if (selectedToolIdx >= toolsRegistry.length) selectedToolIdx = 0;
  let swarmInterval = null;
  let swarmRunning = false;
  let xpClaimed = false;
  let swarmXpClaimed = false;

  const currentScenario = () => scenarios[scenarioIdx] || {
    id: 'financial_cagr',
    title: 'Financial CAGR & Inflation Adjustment',
    category: 'Quantitative Finance & Market Research',
    userPrompt: 'Calculate 5-year CAGR and inflation-adjusted real return.',
    tools: ['calculator', 'currency_converter'],
    reactSteps: [],
    finalAnswer: 'Computed successfully.'
  };

  container.innerHTML = `
    <div class="agentic-lab-header">
      <div class="agentic-title-row">
        <div class="agentic-title-badge">
          <span class="agentic-icon">🛠️</span>
          <div>
            <h3>Agentic Tool Use & Function Calling Lab</h3>
            <p class="agentic-subtitle">Explore ReAct Thought-Action-Observation loops, JSON Schema constrained decoding, and Multi-Agent Swarms.</p>
          </div>
        </div>
        <div class="agentic-tab-nav">
          <button class="agentic-tab-btn ${activeTab === 'react_loop' ? 'active' : ''}" data-tab="react_loop">🔄 ReAct Loop</button>
          <button class="agentic-tab-btn ${activeTab === 'schema_inspector' ? 'active' : ''}" data-tab="schema_inspector">📋 JSON Schema & Grammar</button>
          <button class="agentic-tab-btn ${activeTab === 'swarm_arena' ? 'active' : ''}" data-tab="swarm_arena">🐝 Multi-Agent Swarm</button>
        </div>
      </div>
    </div>

    <!-- TAB 1: ReAct Loop Simulator -->
    <div class="agentic-tab-panel" id="panel-react-loop" style="display: ${activeTab === 'react_loop' ? 'block' : 'none'};">
      <div class="agentic-scenario-bar">
        <span class="scenario-bar-label">🎯 Select Challenge:</span>
        <div class="scenario-chips" id="scenario-chips-container">
          ${scenarios.map((sc, idx) => `
            <button class="scenario-chip ${idx === scenarioIdx ? 'active' : ''}" data-sc-idx="${idx}">
              <span class="sc-icon">${idx === 0 ? '📈' : idx === 1 ? '🐍' : idx === 2 ? '✈️' : '🔍'}</span>
              <span class="sc-title">${sc.title}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="agentic-mission-card">
        <div class="mission-header">
          <div class="mission-tag">USER QUERY & AGENT OBJECTIVE</div>
          <div class="mission-category" id="mission-category-badge">${currentScenario().category}</div>
        </div>
        <div class="mission-prompt" id="mission-prompt-display">
          <span class="prompt-user-badge">User:</span> "${currentScenario().userPrompt}"
        </div>
        <div class="mission-tools-row" id="mission-tools-display">
          <span class="tools-label">Allowed Tools in Sandbox:</span>
          ${(currentScenario().tools || []).map(t => `<span class="tool-pill"><span class="tool-pill-icon">🔧</span> ${t}</span>`).join('')}
        </div>
      </div>

      <!-- Stepper Controls -->
      <div class="react-stepper-controls">
        <div class="stepper-actions">
          <button class="react-ctrl-btn" id="btn-react-reset" title="Rewind to Step 1">⏮ Reset</button>
          <button class="react-ctrl-btn" id="btn-react-prev" title="Step Back">◀ Previous</button>
          <button class="react-ctrl-btn primary" id="btn-react-toggle" title="Auto Play Loop">▶ Auto-Play</button>
          <button class="react-ctrl-btn" id="btn-react-next" title="Step Forward">Next Step ▶</button>
        </div>
        <div class="stepper-status">
          <span class="step-count-badge" id="react-step-counter">Step ${Math.min(activeStep, currentScenario().reactSteps.length)} / ${currentScenario().reactSteps.length}</span>
          <span class="status-indicator-pill"><span class="pulse-dot"></span> ReAct Loop Active</span>
        </div>
      </div>

      <!-- Stream of Thought-Action-Observation Cards -->
      <div class="react-stream-container" id="react-stream-container">
        <!-- Rendered dynamically -->
      </div>

      <!-- Final Answer Card -->
      <div class="react-final-answer-card" id="react-final-answer-card" style="display: none;">
        <div class="final-answer-header">
          <div class="final-badge">
            <span class="final-icon">🏆</span>
            <div>
              <h4>Final Synthesized Output</h4>
              <p class="final-sub">All observations grounded and verified. Autonomous loop terminated.</p>
            </div>
          </div>
          <button class="claim-xp-btn" id="btn-claim-react-xp">✨ Claim Master XP (+25 XP)</button>
        </div>
        <div class="final-answer-content" id="react-final-answer-text">
          <!-- Final answer injected -->
        </div>
      </div>
    </div>

    <!-- TAB 2: JSON Schema & Grammar Inspector -->
    <div class="agentic-tab-panel" id="panel-schema-inspector" style="display: ${activeTab === 'schema_inspector' ? 'block' : 'none'};">
      <div class="schema-lab-grid">
        <!-- Left: Tool Selector & Schema Definition -->
        <div class="schema-card">
          <div class="schema-card-header">
            <h4>1. Tool Registry & JSON Schema</h4>
            <span class="info-badge">OpenAI / Anthropic Spec</span>
          </div>
          <div class="tool-selector-row">
            <label for="agent-tool-select">Select Registered Tool:</label>
            <select id="agent-tool-select" class="agent-tool-dropdown">
              ${toolsRegistry.map((t, idx) => `<option value="${idx}" ${idx === selectedToolIdx ? 'selected' : ''}>🛠️ ${t.name}</option>`).join('')}
            </select>
          </div>
          <p class="tool-desc-text" id="tool-desc-display">${toolsRegistry[selectedToolIdx]?.description || ''}</p>
          
          <div class="schema-code-box">
            <div class="code-box-header">
              <span>JSON Schema Contract</span>
              <button class="mini-copy-btn" id="btn-copy-tool-schema">📋 Copy Schema</button>
            </div>
            <pre class="schema-json" id="schema-json-display"><code></code></pre>
          </div>

          <!-- Constrained Grammar Visualizer -->
          <div class="grammar-mask-box">
            <div class="grammar-header">
              <span class="grammar-title">⚡ Constrained Logit Masking (CFG)</span>
              <span class="status-tag">Deterministic Grammar</span>
            </div>
            <p class="grammar-desc">At each token generation step, the engine evaluates the Context-Free Grammar. Any token that would violate valid JSON syntax or schema types receives a <code class="math-code">logit = -∞</code> mask.</p>
            <div class="vocab-mask-demo">
              <div class="vocab-row"><span class="v-token valid">"expr"</span> <span class="v-status">Allowed (Schema Key)</span> <span class="v-logit">+8.42</span></div>
              <div class="vocab-row"><span class="v-token valid">":"</span> <span class="v-status">Allowed (Colon Sep)</span> <span class="v-logit">+12.10</span></div>
              <div class="vocab-row"><span class="v-token masked">def</span> <span class="v-status">MASKED (-∞)</span> <span class="v-logit">-99999</span></div>
              <div class="vocab-row"><span class="v-token masked">&lt;html&gt;</span> <span class="v-status">MASKED (-∞)</span> <span class="v-logit">-99999</span></div>
            </div>
          </div>
        </div>

        <!-- Right: Interactive Tool Argument Playground -->
        <div class="schema-card">
          <div class="schema-card-header">
            <h4>2. Live Function Call Dispatcher</h4>
            <span class="info-badge">Client Validation</span>
          </div>
          <p class="schema-hint">Fill in arguments according to the strict JSON Schema. Click <strong>Validate & Dispatch</strong> to verify schema compliance against the logit mask.</p>
          
          <div class="tool-form-container" id="tool-form-container">
            <!-- Form inputs generated dynamically -->
          </div>

          <div class="dispatch-actions">
            <button class="dispatch-btn" id="btn-validate-dispatch">🚀 Validate & Dispatch Tool Call</button>
            <button class="reset-args-btn" id="btn-load-sample-args">⚡ Load Sample Args</button>
          </div>

          <div class="validation-result-box" id="validation-result-box" style="display: none;">
            <!-- Validation status message -->
          </div>

          <div class="dispatched-payload-box">
            <div class="code-box-header">
              <span>Dispatched Tool Call Payload (JSON)</span>
            </div>
            <pre class="schema-json" id="dispatched-payload-display"><code>// Awaiting tool call dispatch...</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: Multi-Agent Swarm Arena -->
    <div class="agentic-tab-panel" id="panel-swarm-arena" style="display: ${activeTab === 'swarm_arena' ? 'block' : 'none'};">
      <div class="swarm-arena-card">
        <div class="swarm-header">
          <div class="swarm-info">
            <h4>Hierarchical Supervisor-Worker Swarm</h4>
            <p>Orchestrate specialized sub-agents with distinct system prompts and tool access to tackle complex multi-step objectives.</p>
          </div>
          <button class="swarm-run-btn" id="btn-run-swarm">🚀 Launch Multi-Agent Swarm</button>
        </div>

        <!-- Architecture Flow Diagram -->
        <div class="swarm-topology-diagram">
          <div class="agent-node supervisor" id="node-supervisor">
            <div class="node-icon">👑</div>
            <div class="node-role">SUPERVISOR AGENT</div>
            <div class="node-desc">Task Decomposition & State Machine Orchestrator</div>
            <div class="node-status" id="supervisor-status">Standby</div>
          </div>
          <div class="swarm-arrows-down">
            <span>↓ Task A</span>
            <span>↓ Task B</span>
            <span>↓ Task C</span>
          </div>
          <div class="swarm-workers-row">
            <div class="agent-node worker" id="worker-researcher">
              <div class="node-icon">🔎</div>
              <div class="node-role">RESEARCHER AGENT</div>
              <div class="node-desc">Tools: <code>log_analyzer</code>, <code>weather_api</code></div>
              <div class="node-status" id="researcher-status">Idle</div>
            </div>
            <div class="agent-node worker" id="worker-coder">
              <div class="node-icon">💻</div>
              <div class="node-role">CODER AGENT</div>
              <div class="node-desc">Tools: <code>python_interpreter</code>, <code>calculator</code></div>
              <div class="node-status" id="coder-status">Idle</div>
            </div>
            <div class="agent-node worker" id="worker-verifier">
              <div class="node-icon">🛡️</div>
              <div class="node-role">VERIFIER / CRITIC</div>
              <div class="node-desc">Tools: <code>git_patcher</code>, Unit Test Suite</div>
              <div class="node-status" id="verifier-status">Idle</div>
            </div>
          </div>
        </div>

        <!-- Live Swarm Execution Log -->
        <div class="swarm-log-box">
          <div class="swarm-log-header">
            <span>Swarm Event Timeline</span>
            <span class="swarm-progress-text" id="swarm-progress-text">Ready to run</span>
          </div>
          <div class="swarm-log-entries" id="swarm-log-entries">
            <div class="log-entry system"><span class="log-time">[00:00.00]</span> Swarm nodes initialized. Awaiting objective trigger.</div>
          </div>
        </div>

        <div class="swarm-claim-row" id="swarm-claim-row" style="display: none;">
          <button class="claim-xp-btn" id="btn-claim-swarm-xp">🌟 Claim Multi-Agent Architect XP (+30 XP)</button>
        </div>
      </div>
    </div>
  `;

  // Attach to DOM
  dom.interactiveContainer.appendChild(container);

  // --- TAB NAVIGATION ---
  const tabBtns = container.querySelectorAll('.agentic-tab-btn');
  const panels = {
    react_loop: container.querySelector('#panel-react-loop'),
    schema_inspector: container.querySelector('#panel-schema-inspector'),
    swarm_arena: container.querySelector('#panel-swarm-arena')
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      activeTab = target;
      state.agentActiveTab = target;

      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      Object.keys(panels).forEach(k => {
        if (panels[k]) panels[k].style.display = (k === target) ? 'block' : 'none';
      });

      soundFx.playBlip(520, 0.05);

      if (target === 'schema_inspector') {
        updateSchemaDisplay();
      }
    });
  });

  // --- TAB 1: REACT LOOP LOGIC ---
  const streamContainer = container.querySelector('#react-stream-container');
  const stepCounterEl = container.querySelector('#react-step-counter');
  const finalAnswerCard = container.querySelector('#react-final-answer-card');
  const finalAnswerText = container.querySelector('#react-final-answer-text');
  const btnReset = container.querySelector('#btn-react-reset');
  const btnPrev = container.querySelector('#btn-react-prev');
  const btnNext = container.querySelector('#btn-react-next');
  const btnToggle = container.querySelector('#btn-react-toggle');
  const btnClaimReactXp = container.querySelector('#btn-claim-react-xp');

  function renderReActStream() {
    if (!streamContainer) return;
    streamContainer.innerHTML = '';

    const sc = currentScenario();
    const steps = sc.reactSteps || [];
    const revealedSteps = steps.slice(0, activeStep);

    revealedSteps.forEach((st) => {
      const card = document.createElement('div');
      card.className = 'react-cycle-card';
      
      const argsFormatted = escapeHtml(JSON.stringify(st.action.arguments, null, 2));

      card.innerHTML = `
        <div class="cycle-card-header">
          <div class="cycle-title">
            <span class="cycle-badge">Step ${st.stepNum}</span>
            <span class="cycle-flow-pill">Thought ➔ Action ➔ Observation</span>
          </div>
          <span class="cycle-time-tag">Iteration ${st.stepNum}</span>
        </div>

        <div class="react-blocks-grid">
          <!-- Thought Box -->
          <div class="react-block thought-box">
            <div class="block-label"><span class="block-icon">💭</span> Internal Reasoning (Thought)</div>
            <div class="block-content">${escapeHtml(st.thought)}</div>
          </div>

          <!-- Action Box -->
          <div class="react-block action-box">
            <div class="block-label">
              <span class="block-icon">🛠️</span> Dispatched Tool Call (Action)
              <code class="action-tool-badge">${escapeHtml(st.action.tool)}</code>
            </div>
            <pre class="json-code-view"><code>${argsFormatted}</code></pre>
          </div>

          <!-- Observation Box -->
          <div class="react-block observation-box">
            <div class="block-label"><span class="block-icon">📡</span> Environment Response (Observation)</div>
            <div class="obs-output-text">${escapeHtml(st.observation)}</div>
          </div>
        </div>
      `;

      streamContainer.appendChild(card);
    });

    if (stepCounterEl) {
      stepCounterEl.textContent = `Step ${Math.min(activeStep, steps.length)} / ${steps.length}`;
    }

    const isFinished = activeStep >= steps.length;
    if (finalAnswerCard) {
      finalAnswerCard.style.display = isFinished ? 'block' : 'none';
      if (isFinished && finalAnswerText) {
        finalAnswerText.innerHTML = marked.parse(sc.finalAnswer || '');
      }
    }
  }

  function stopAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }
    if (btnToggle) btnToggle.textContent = '▶ Auto-Play';
  }

  function startAutoPlay() {
    stopAutoPlay();
    const sc = currentScenario();
    const steps = sc.reactSteps || [];

    if (activeStep >= steps.length) {
      activeStep = 1;
      state.agentActiveStep = activeStep;
      renderReActStream();
    }

    if (btnToggle) btnToggle.textContent = '⏸ Pause';

    autoPlayInterval = setInterval(() => {
      if (activeStep < steps.length) {
        activeStep++;
        state.agentActiveStep = activeStep;
        soundFx.playBlip(720 + activeStep * 60, 0.04);
        renderReActStream();
      } else {
        stopAutoPlay();
        soundFx.playLevelUp();
      }
    }, 1500);
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      stopAutoPlay();
      activeStep = 1;
      state.agentActiveStep = activeStep;
      soundFx.playBlip(440, 0.05);
      renderReActStream();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      stopAutoPlay();
      if (activeStep > 1) {
        activeStep--;
        state.agentActiveStep = activeStep;
        soundFx.playBlip(550, 0.05);
        renderReActStream();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      stopAutoPlay();
      const steps = currentScenario().reactSteps || [];
      if (activeStep < steps.length) {
        activeStep++;
        state.agentActiveStep = activeStep;
        soundFx.playBlip(750, 0.05);
        renderReActStream();
        if (activeStep >= steps.length) {
          soundFx.playLevelUp();
        }
      }
    });
  }

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      if (autoPlayInterval) {
        stopAutoPlay();
        soundFx.playBlip(480, 0.05);
      } else {
        startAutoPlay();
        soundFx.playBlip(800, 0.05);
      }
    });
  }

  if (btnClaimReactXp) {
    btnClaimReactXp.addEventListener('click', () => {
      if (!xpClaimed) {
        xpClaimed = true;
        awardXp(25, 'ReAct Autonomous Loop Conquered');
        btnClaimReactXp.textContent = '✓ +25 XP Claimed!';
        btnClaimReactXp.disabled = true;
        btnClaimReactXp.style.opacity = '0.6';
      }
    });
  }

  // Scenario chips click handling
  const scenarioChips = container.querySelectorAll('.scenario-chip');
  scenarioChips.forEach(chip => {
    chip.addEventListener('click', () => {
      stopAutoPlay();
      scenarioIdx = parseInt(chip.dataset.scIdx, 10);
      state.agentScenarioIdx = scenarioIdx;
      activeStep = 1;
      state.agentActiveStep = 1;

      scenarioChips.forEach(c => c.classList.toggle('active', c === chip));

      const sc = currentScenario();
      const promptEl = container.querySelector('#mission-prompt-display');
      const catEl = container.querySelector('#mission-category-badge');
      const toolsEl = container.querySelector('#mission-tools-display');

      if (promptEl) promptEl.innerHTML = `<span class="prompt-user-badge">User:</span> "${escapeHtml(sc.userPrompt)}"`;
      if (catEl) catEl.textContent = sc.category;
      if (toolsEl) {
        toolsEl.innerHTML = `<span class="tools-label">Allowed Tools in Sandbox:</span>` +
          (sc.tools || []).map(t => `<span class="tool-pill"><span class="tool-pill-icon">🔧</span> ${t}</span>`).join('');
      }

      soundFx.playBlip(600, 0.05);
      renderReActStream();
    });
  });

  // --- TAB 2: SCHEMA & GRAMMAR INSPECTOR ---
  const toolSelect = container.querySelector('#agent-tool-select');
  const toolDescDisplay = container.querySelector('#tool-desc-display');
  const schemaJsonDisplay = container.querySelector('#schema-json-display');
  const toolFormContainer = container.querySelector('#tool-form-container');
  const btnCopySchema = container.querySelector('#btn-copy-tool-schema');
  const btnValidateDispatch = container.querySelector('#btn-validate-dispatch');
  const btnLoadSampleArgs = container.querySelector('#btn-load-sample-args');
  const validationResultBox = container.querySelector('#validation-result-box');
  const dispatchedPayloadDisplay = container.querySelector('#dispatched-payload-display');

  function getSampleArgsForTool(name) {
    switch (name) {
      case 'calculator':
        return { expr: '(14500 * 1.08)**3 - 14500' };
      case 'python_interpreter':
        return { code: 'import math\ndef is_prime(n):\n    return n > 1 and all(n % i != 0 for i in range(2, int(math.isqrt(n)) + 1))\nprint([x for x in range(20, 50) if is_prime(x)])' };
      case 'currency_converter':
        return { amount: 2500, from_currency: 'USD', to_currency: 'EUR' };
      case 'weather_api':
        return { location: 'Zurich, Switzerland', units: 'metric' };
      case 'flight_search':
        return { origin: 'SFO', destination: 'NRT', departure_date: '2026-11-15' };
      case 'hotel_finder':
        return { city: 'Tokyo', max_price_per_night: 220 };
      case 'log_analyzer':
        return { service: 'checkout-service', query: 'ERROR connection pool exhausted' };
      case 'git_patcher':
        return { repository: 'deep-learning-core', commit_message: 'fix: eliminate circular buffer leak in session cache' };
      default:
        return {};
    }
  }

  function updateSchemaDisplay() {
    const curTool = toolsRegistry[selectedToolIdx] || toolsRegistry[0];
    if (!curTool) return;

    if (toolDescDisplay) toolDescDisplay.textContent = curTool.description;
    if (schemaJsonDisplay) {
      schemaJsonDisplay.innerHTML = `<code>${escapeHtml(JSON.stringify(curTool.schema, null, 2))}</code>`;
    }

    if (toolFormContainer) {
      toolFormContainer.innerHTML = '';
      const properties = curTool.schema.properties || {};
      const requiredList = curTool.schema.required || [];

      Object.entries(properties).forEach(([key, prop]) => {
        const isRequired = requiredList.includes(key);
        const group = document.createElement('div');
        group.className = 'tool-arg-group';

        const sample = getSampleArgsForTool(curTool.name)[key] ?? '';

        group.innerHTML = `
          <div class="arg-header-row">
            <span class="arg-name"><code>${key}</code></span>
            <span class="arg-type">${prop.type}</span>
            ${isRequired ? '<span class="arg-req-pill">required</span>' : '<span class="arg-opt-pill">optional</span>'}
          </div>
          <div class="arg-desc">${prop.description || ''}</div>
          ${prop.type === 'string' && key === 'code' 
            ? `<textarea class="arg-input-field" id="field-${key}" data-key="${key}" data-type="${prop.type}" rows="4">${escapeHtml(String(sample))}</textarea>`
            : `<input class="arg-input-field" id="field-${key}" data-key="${key}" data-type="${prop.type}" value="${escapeHtml(String(sample))}" />`
          }
        `;
        toolFormContainer.appendChild(group);
      });
    }

    if (validationResultBox) validationResultBox.style.display = 'none';
    if (dispatchedPayloadDisplay) dispatchedPayloadDisplay.innerHTML = `<code>// Fill arguments above and click Validate & Dispatch</code>`;
  }

  if (toolSelect) {
    toolSelect.addEventListener('change', () => {
      selectedToolIdx = parseInt(toolSelect.value, 10);
      state.agentSelectedToolIdx = selectedToolIdx;
      soundFx.playBlip(640, 0.05);
      updateSchemaDisplay();
    });
  }

  if (btnCopySchema) {
    btnCopySchema.addEventListener('click', () => {
      const curTool = toolsRegistry[selectedToolIdx] || toolsRegistry[0];
      if (curTool) {
        navigator.clipboard.writeText(JSON.stringify(curTool.schema, null, 2)).then(() => {
          btnCopySchema.textContent = '✓ Copied Schema!';
          setTimeout(() => { btnCopySchema.textContent = '📋 Copy Schema'; }, 1800);
        });
        soundFx.playBlip(880, 0.05);
      }
    });
  }

  if (btnLoadSampleArgs) {
    btnLoadSampleArgs.addEventListener('click', () => {
      const curTool = toolsRegistry[selectedToolIdx] || toolsRegistry[0];
      if (curTool) {
        const samples = getSampleArgsForTool(curTool.name);
        Object.entries(samples).forEach(([k, v]) => {
          const el = toolFormContainer.querySelector(`#field-${k}`);
          if (el) el.value = v;
        });
        soundFx.playBlip(700, 0.05);
      }
    });
  }

  if (btnValidateDispatch) {
    btnValidateDispatch.addEventListener('click', () => {
      const curTool = toolsRegistry[selectedToolIdx] || toolsRegistry[0];
      if (!curTool) return;

      const properties = curTool.schema.properties || {};
      const requiredList = curTool.schema.required || [];
      const collectedArgs = {};
      let missingField = null;

      for (const [key, prop] of Object.entries(properties)) {
        const el = toolFormContainer.querySelector(`#field-${key}`);
        const rawVal = el ? el.value.trim() : '';

        if (requiredList.includes(key) && !rawVal) {
          missingField = key;
          break;
        }

        if (rawVal) {
          if (prop.type === 'number') {
            const num = parseFloat(rawVal);
            collectedArgs[key] = isNaN(num) ? rawVal : num;
          } else if (prop.type === 'boolean') {
            collectedArgs[key] = (rawVal === 'true');
          } else {
            collectedArgs[key] = rawVal;
          }
        }
      }

      if (missingField) {
        validationResultBox.style.display = 'block';
        validationResultBox.className = 'validation-result-box error';
        validationResultBox.innerHTML = `
          <strong>❌ Schema Validation Failed</strong>: Missing required property <code>${missingField}</code>.<br>
          <small>Under constrained decoding, the LLM logit mask prevents generating closing braces <code>}</code> until all required fields are satisfied.</small>
        `;
        soundFx.playBlip(280, 0.1);
        return;
      }

      // Valid!
      validationResultBox.style.display = 'block';
      validationResultBox.className = 'validation-result-box success';
      validationResultBox.innerHTML = `
        <strong>✅ Schema Validated Successfully!</strong><br>
        100% conforming JSON payload. CFG Logit mask permitted token generation with zero syntax errors.
      `;
      soundFx.playBlip(880, 0.08);

      const payload = {
        name: curTool.name,
        arguments: collectedArgs
      };

      if (dispatchedPayloadDisplay) {
        dispatchedPayloadDisplay.innerHTML = `<code>${escapeHtml(JSON.stringify(payload, null, 2))}</code>`;
      }
    });
  }

  // --- TAB 3: MULTI-AGENT SWARM LOGIC ---
  const btnRunSwarm = container.querySelector('#btn-run-swarm');
  const swarmEntriesEl = container.querySelector('#swarm-log-entries');
  const swarmProgressText = container.querySelector('#swarm-progress-text');
  const supervisorStatus = container.querySelector('#supervisor-status');
  const researcherStatus = container.querySelector('#researcher-status');
  const coderStatus = container.querySelector('#coder-status');
  const verifierStatus = container.querySelector('#verifier-status');
  const swarmClaimRow = container.querySelector('#swarm-claim-row');
  const btnClaimSwarmXp = container.querySelector('#btn-claim-swarm-xp');

  const supervisorNode = container.querySelector('#node-supervisor');
  const researcherNode = container.querySelector('#worker-researcher');
  const coderNode = container.querySelector('#worker-coder');
  const verifierNode = container.querySelector('#worker-verifier');

  function appendSwarmLog(type, time, message) {
    if (!swarmEntriesEl) return;
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    swarmEntriesEl.appendChild(div);
    swarmEntriesEl.scrollTop = swarmEntriesEl.scrollHeight;
  }

  if (btnRunSwarm) {
    btnRunSwarm.addEventListener('click', () => {
      if (swarmRunning) return;
      swarmRunning = true;
      btnRunSwarm.disabled = true;
      btnRunSwarm.textContent = '⚡ Swarm Executing...';
      if (swarmEntriesEl) swarmEntriesEl.innerHTML = '';

      if (swarmProgressText) swarmProgressText.textContent = 'Phase 1: Task Decomposition';
      supervisorNode?.classList.add('pulse-active');
      if (supervisorStatus) supervisorStatus.textContent = 'Decomposing Task DAG...';

      appendSwarmLog('supervisor', '00:00.10', '👑 <strong>Supervisor</strong> received objective: <em>"Audit checkout microservice and patch circular memory leak."</em> Decomposing into parallel subtasks.');
      soundFx.playBlip(550, 0.05);

      setTimeout(() => {
        if (swarmProgressText) swarmProgressText.textContent = 'Phase 2: Log Analysis & Diagnostics';
        supervisorNode?.classList.remove('pulse-active');
        researcherNode?.classList.add('pulse-active');
        if (supervisorStatus) supervisorStatus.textContent = 'Supervising Pipeline';
        if (researcherStatus) researcherStatus.textContent = 'Invoking log_analyzer...';

        appendSwarmLog('researcher', '00:01.35', '🔎 <strong>Researcher Agent</strong> invoked <code>log_analyzer(service="checkout", query="Out of Memory")</code>. Identified leak in <code>session_cache.py</code>: 104MB buffer accumulation.');
        soundFx.playBlip(680, 0.05);
      }, 1200);

      setTimeout(() => {
        if (swarmProgressText) swarmProgressText.textContent = 'Phase 3: Sandbox Code Patching';
        researcherNode?.classList.remove('pulse-active');
        coderNode?.classList.add('pulse-active');
        if (researcherStatus) researcherStatus.textContent = 'Findings Dispatched';
        if (coderStatus) coderStatus.textContent = 'Invoking python_interpreter...';

        appendSwarmLog('coder', '00:02.60', '💻 <strong>Coder Agent</strong> executed <code>python_interpreter</code> in isolated sandbox. Replaced unbounded dictionary with <code>weakref.WeakValueDictionary</code>. Memory stabilized at 14MB baseline.');
        soundFx.playBlip(780, 0.05);
      }, 2500);

      setTimeout(() => {
        if (swarmProgressText) swarmProgressText.textContent = 'Phase 4: Regression & Fact Verification';
        coderNode?.classList.remove('pulse-active');
        verifierNode?.classList.add('pulse-active');
        if (coderStatus) coderStatus.textContent = 'Patch Generated';
        if (verifierStatus) verifierStatus.textContent = 'Invoking git_patcher & test runner...';

        appendSwarmLog('verifier', '00:03.85', '🛡️ <strong>Verifier / Critic</strong> executed unit test suite: <strong>48/48 tests passed</strong>. Verified memory footprint under synthetic load. Reflection confidence: 100%.');
        soundFx.playBlip(880, 0.05);
      }, 3800);

      setTimeout(() => {
        if (swarmProgressText) swarmProgressText.textContent = 'Phase 5: Resolution & Synthesis';
        verifierNode?.classList.remove('pulse-active');
        supervisorNode?.classList.add('pulse-active');
        if (verifierStatus) verifierStatus.textContent = 'Verified (100% Pass)';
        if (supervisorStatus) supervisorStatus.textContent = 'Objective Fulfilled';

        appendSwarmLog('supervisor', '00:05.10', '👑 <strong>Supervisor</strong> synthesized verified PR artifact: <code>pr-1402-fix-leak.patch</code> ready for merge. Multi-agent swarm cycle terminated cleanly.');
        soundFx.playLevelUp();

        if (swarmClaimRow) swarmClaimRow.style.display = 'block';
        swarmRunning = false;
        btnRunSwarm.disabled = false;
        btnRunSwarm.textContent = '🚀 Re-run Swarm Simulation';
      }, 5100);
    });
  }

  if (btnClaimSwarmXp) {
    btnClaimSwarmXp.addEventListener('click', () => {
      if (!swarmXpClaimed) {
        swarmXpClaimed = true;
        awardXp(30, 'Multi-Agent Swarm Architect Conquered');
        btnClaimSwarmXp.textContent = '✓ +30 XP Claimed!';
        btnClaimSwarmXp.disabled = true;
        btnClaimSwarmXp.style.opacity = '0.6';
      }
    });
  }

  // Initial stream render & schema setup
  renderReActStream();
  updateSchemaDisplay();
}


// --- WIDGET 15: Multimodal Vision-Language Models Lab ---
export function renderMultimodalVlmLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'vlm-lab-container';

  const config = quest.interactiveConfig || {};
  const images = config.images || [];
  const projectorModes = config.projectorModes || [];

  let imageIdx = state.vlmImageIdx || 0;
  if (imageIdx >= images.length) imageIdx = 0;
  let activeTab = state.vlmActiveTab || 'patch_inspector';
  let selectedPatchIdx = state.vlmSelectedPatchIdx ?? 9;
  let projectorMode = state.vlmProjectorMode || 'mlp_llava';
  let showBoundingBox = state.vlmShowBoundingBox ?? true;
  let isGenerating = false;
  let xpClaimed = false;
  let vqaXpClaimed = false;

  const currentImg = () => images[imageIdx] || {
    id: 'autonomous_nav',
    title: 'Autonomous Driving Perception',
    category: 'Robotics & Spatial Grounding',
    resolution: '224x224',
    description: 'Urban intersection with crossing pedestrian.',
    userQuery: 'Detect the pedestrian and predict the bounding box coordinates.',
    groundingTarget: {
      label: 'pedestrian',
      box: [112, 112, 210, 168],
      boxNorm: [500, 500, 938, 750],
      primaryPatches: [9, 10, 13, 14]
    },
    answer: 'The pedestrian is crossing in lower-right quadrant. Bounding box: [500, 500, 938, 750].'
  };

  function getSceneSvg(imgId) {
    if (imgId === 'chest_xray') {
      return `
        <svg viewBox="0 0 224 224" class="vlm-scene-svg">
          <rect width="224" height="224" fill="#080c14" />
          <!-- Spine & Sternum -->
          <line x1="112" y1="20" x2="112" y2="204" stroke="#475569" stroke-width="6" stroke-linecap="round" />
          <!-- Rib Cages -->
          <path d="M 60,60 Q 112,50 164,60" fill="none" stroke="rgba(203,213,225,0.4)" stroke-width="3" />
          <path d="M 50,85 Q 112,75 174,85" fill="none" stroke="rgba(203,213,225,0.45)" stroke-width="3.5" />
          <path d="M 45,115 Q 112,105 179,115" fill="none" stroke="rgba(203,213,225,0.45)" stroke-width="4" />
          <path d="M 45,145 Q 112,135 179,145" fill="none" stroke="rgba(203,213,225,0.4)" stroke-width="4" />
          <!-- Lung Outlines -->
          <ellipse cx="78" cy="115" rx="36" ry="58" fill="rgba(30,41,59,0.5)" stroke="rgba(148,163,184,0.3)" stroke-width="1.5" />
          <ellipse cx="146" cy="115" rx="36" ry="58" fill="rgba(30,41,59,0.5)" stroke="rgba(148,163,184,0.3)" stroke-width="1.5" />
          <!-- Cardiac Silhouette -->
          <path d="M 112,100 C 135,110 145,140 120,165 C 105,175 95,150 112,100 Z" fill="rgba(71,85,105,0.6)" stroke="#94a3b8" stroke-width="1.5" />
          <!-- Focal Consolidation Opacity (Target) -->
          <ellipse cx="65" cy="155" rx="28" ry="20" fill="rgba(56,189,248,0.45)" filter="drop-shadow(0 0 8px rgba(56,189,248,0.7))" />
          <circle cx="62" cy="152" r="10" fill="rgba(255,255,255,0.4)" />
        </svg>
      `;
    } else if (imgId === 'chart_analytics') {
      return `
        <svg viewBox="0 0 224 224" class="vlm-scene-svg">
          <rect width="224" height="224" fill="#0b1120" />
          <!-- Grid Lines -->
          <line x1="30" y1="40" x2="204" y2="40" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2" />
          <line x1="30" y1="80" x2="204" y2="80" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2" />
          <line x1="30" y1="120" x2="204" y2="120" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2" />
          <line x1="30" y1="160" x2="204" y2="160" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2" />
          <line x1="30" y1="190" x2="204" y2="190" stroke="#475569" stroke-width="2" />
          <!-- Q1 Bars -->
          <rect x="42" y="130" width="12" height="60" fill="#38bdf8" rx="2" />
          <rect x="56" y="110" width="12" height="80" fill="#a855f7" rx="2" />
          <rect x="70" y="145" width="12" height="45" fill="#10b981" rx="2" />
          <!-- Q2 Bars -->
          <rect x="94" y="115" width="12" height="75" fill="#38bdf8" rx="2" />
          <rect x="108" y="95" width="12" height="95" fill="#a855f7" rx="2" />
          <rect x="122" y="100" width="12" height="90" fill="#10b981" rx="2" />
          <!-- Q3 Bars (Peak Target) -->
          <rect x="146" y="100" width="12" height="90" fill="#38bdf8" rx="2" />
          <rect x="160" y="125" width="12" height="65" fill="#a855f7" rx="2" />
          <!-- AI Services Peak Bar -->
          <rect x="174" y="45" width="12" height="145" fill="#10b981" rx="2" filter="drop-shadow(0 0 6px rgba(16,185,129,0.7))" />
          <!-- Q3 Tag -->
          <text x="168" y="206" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="monospace">Q3 PEAK</text>
        </svg>
      `;
    } else if (imgId === 'satellite_recon') {
      return `
        <svg viewBox="0 0 224 224" class="vlm-scene-svg">
          <rect width="224" height="224" fill="#0369a1" />
          <!-- Coastal Landmass -->
          <path d="M 0,0 L 90,0 Q 110,60 80,120 Q 60,180 0,224 Z" fill="#1e293b" stroke="#334155" stroke-width="2" />
          <!-- Harbor Piers -->
          <rect x="80" y="45" width="35" height="10" fill="#475569" rx="1" />
          <rect x="70" y="85" width="45" height="12" fill="#475569" rx="1" />
          <!-- Container Ship (Target) -->
          <g transform="translate(110, 85) rotate(25)">
            <path d="M -12,-35 L 12,-35 L 16,30 Q 0,42 -16,30 Z" fill="#b91c1c" stroke="#f87171" stroke-width="1.5" />
            <!-- Cargo Containers -->
            <rect x="-8" y="-28" width="7" height="14" fill="#f59e0b" />
            <rect x="1" y="-28" width="7" height="14" fill="#10b981" />
            <rect x="-8" y="-10" width="7" height="14" fill="#38bdf8" />
            <rect x="1" y="-10" width="7" height="14" fill="#f59e0b" />
            <rect x="-8" y="8" width="7" height="14" fill="#10b981" />
            <rect x="1" y="8" width="7" height="14" fill="#38bdf8" />
            <!-- Bridge Tower -->
            <rect x="-10" y="24" width="20" height="6" fill="#ffffff" />
          </g>
          <!-- Water Wake Waves -->
          <path d="M 145,130 Q 170,145 195,140" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
          <path d="M 155,145 Q 180,160 205,155" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
        </svg>
      `;
    } else {
      // autonomous_nav
      return `
        <svg viewBox="0 0 224 224" class="vlm-scene-svg">
          <rect width="224" height="224" fill="#0f172a" />
          <!-- Road Asphalt -->
          <polygon points="30,224 194,224 140,80 84,80" fill="#1e293b" />
          <!-- Road Center Dashes -->
          <line x1="112" y1="85" x2="112" y2="98" stroke="#f59e0b" stroke-width="2" />
          <line x1="112" y1="112" x2="112" y2="132" stroke="#f59e0b" stroke-width="2.5" />
          <line x1="112" y1="150" x2="112" y2="180" stroke="#f59e0b" stroke-width="3" />
          <line x1="112" y1="195" x2="112" y2="224" stroke="#f59e0b" stroke-width="3.5" />
          <!-- Crosswalk Stripes in Lower-Right -->
          <line x1="118" y1="175" x2="175" y2="175" stroke="rgba(255,255,255,0.5)" stroke-width="4" stroke-dasharray="8,6" />
          <line x1="115" y1="190" x2="185" y2="190" stroke="rgba(255,255,255,0.5)" stroke-width="4" stroke-dasharray="10,6" />
          <!-- Approaching Car on Left -->
          <rect x="58" y="115" width="28" height="42" fill="#3b82f6" rx="4" stroke="#60a5fa" stroke-width="1.5" />
          <rect x="62" y="125" width="20" height="14" fill="#1e293b" rx="2" />
          <circle x="64" y="152" r="3" fill="#facc15" />
          <circle x="80" y="152" r="3" fill="#facc15" />
          <!-- Pedestrian on Crosswalk (Target) -->
          <g transform="translate(136, 140)">
            <circle cx="8" cy="8" r="4" fill="#10b981" />
            <line x1="8" y1="12" x2="8" y2="28" stroke="#10b981" stroke-width="2.5" />
            <line x1="8" y1="18" x2="2" y2="24" stroke="#10b981" stroke-width="2" />
            <line x1="8" y1="18" x2="14" y2="24" stroke="#10b981" stroke-width="2" />
            <line x1="8" y1="28" x2="4" y2="38" stroke="#10b981" stroke-width="2" />
            <line x1="8" y1="28" x2="13" y2="38" stroke="#10b981" stroke-width="2" />
          </g>
          <!-- Traffic Light -->
          <rect x="180" y="35" width="14" height="34" fill="#000" rx="3" stroke="#475569" />
          <circle cx="187" cy="44" r="3.5" fill="#334155" />
          <circle cx="187" cy="52" r="3.5" fill="#334155" />
          <circle cx="187" cy="60" r="3.5" fill="#10b981" filter="drop-shadow(0 0 4px #10b981)" />
        </svg>
      `;
    }
  }

  container.innerHTML = `
    <div class="vlm-lab-header">
      <div class="vlm-title-row">
        <div class="vlm-title-badge">
          <span class="vlm-icon">👁️</span>
          <div>
            <h3>Multimodal Vision-Language Models (VLM) Lab</h3>
            <p class="vlm-subtitle">Deconstruct 2D images into ViT patches, warp visual vectors through multimodal projectors, and ground coordinates.</p>
          </div>
        </div>
        <div class="vlm-tab-nav">
          <button class="vlm-tab-btn ${activeTab === 'patch_inspector' ? 'active' : ''}" data-tab="patch_inspector">🧩 ViT Patchifier</button>
          <button class="vlm-tab-btn ${activeTab === 'projector_arena' ? 'active' : ''}" data-tab="projector_arena">🔌 Multimodal Projector</button>
          <button class="vlm-tab-btn ${activeTab === 'visual_qa' ? 'active' : ''}" data-tab="visual_qa">📍 Spatial Grounding & VQA</button>
        </div>
      </div>
    </div>

    <!-- Scenario Chips Bar -->
    <div class="vlm-scenario-bar">
      <span class="scenario-bar-label">🖼️ Select Multimodal Input:</span>
      <div class="scenario-chips" id="vlm-image-chips">
        ${images.map((img, idx) => `
          <button class="scenario-chip ${idx === imageIdx ? 'active' : ''}" data-img-idx="${idx}">
            <span class="sc-icon">${idx === 0 ? '🚗' : idx === 1 ? '🩻' : idx === 2 ? '📊' : '🛰️'}</span>
            <span class="sc-title">${img.title}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- TAB 1: ViT Patch Inspector -->
    <div class="vlm-tab-panel" id="panel-patch-inspector" style="display: ${activeTab === 'patch_inspector' ? 'block' : 'none'};">
      <div class="patch-lab-grid">
        <!-- Left: Image Canvas with 4x4 Grid Overlay -->
        <div class="vlm-canvas-card">
          <div class="canvas-header">
            <h4>2D Image Patch Grid (4×4 = 16 Patches)</h4>
            <span class="res-badge">224×224 px • Patch P=56</span>
          </div>
          <div class="vlm-viewport-wrapper">
            <div class="vlm-scene-viewport" id="vlm-scene-viewport">
              ${getSceneSvg(currentImg().id)}
              <!-- 4x4 Interactive Grid Overlay -->
              <div class="patch-grid-overlay" id="patch-grid-overlay">
                ${Array.from({ length: 16 }).map((_, i) => `
                  <div class="patch-cell ${i === selectedPatchIdx ? 'selected' : ''}" data-patch="${i}">
                    <span class="patch-label">P${i + 1}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="viewport-footer">
            <span class="viewport-hint">👆 Click any patch cell to inspect its 768-dim raw tensor & position embedding</span>
          </div>
        </div>

        <!-- Right: Patch Tensor & Embedding Inspector -->
        <div class="vlm-tensor-card">
          <div class="tensor-header">
            <div class="patch-ident">
              <span class="patch-badge" id="inspect-patch-badge">Patch #${selectedPatchIdx + 1}</span>
              <span class="coord-tag" id="inspect-coord-tag">Row ${Math.floor(selectedPatchIdx / 4) + 1}, Col ${(selectedPatchIdx % 4) + 1}</span>
            </div>
            <button class="claim-xp-btn mini" id="btn-claim-patch-xp">✨ Claim ViT XP (+25 XP)</button>
          </div>

          <!-- Feature Breakdown -->
          <div class="tensor-details-box">
            <div class="detail-row">
              <span class="detail-label">Raw Pixel Vector x_p:</span>
              <span class="detail-val mono">56×56×3 = 9,408 values (norm to [1, 768])</span>
            </div>
            <!-- Simulated Heat Bar -->
            <div class="vector-heat-bar" id="patch-heat-bar"></div>

            <div class="detail-row" style="margin-top: 0.6rem;">
              <span class="detail-label">Linear Projection E:</span>
              <span class="detail-val mono">W_E · x_p ➔ ℝ¹⁰²⁴ Visual Feature</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Spatial Positional Embedding E_pos:</span>
              <span class="detail-val mono" id="patch-pos-emb-text">2D Learned Grid Embed (r=${Math.floor(selectedPatchIdx / 4)}, c=${selectedPatchIdx % 4})</span>
            </div>
          </div>

          <!-- Patch-to-Patch Cosine Similarity Heatmap -->
          <div class="patch-similarity-box">
            <div class="sim-header">
              <span class="sim-title">Cosine Similarity vs All Patches</span>
              <span class="sim-sub">Self-Attention Weight Distribution</span>
            </div>
            <div class="sim-grid-4x4" id="sim-grid-4x4">
              <!-- Rendered dynamically -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Multimodal Projector Arena -->
    <div class="vlm-tab-panel" id="panel-projector-arena" style="display: ${activeTab === 'projector_arena' ? 'block' : 'none'};">
      <div class="projector-arena-card">
        <div class="projector-top-bar">
          <div class="proj-modes-col">
            <label class="mode-label">Select Projector Architecture:</label>
            <div class="proj-mode-pills" id="proj-mode-pills">
              ${projectorModes.map(m => `
                <button class="proj-pill ${m.id === projectorMode ? 'active' : ''}" data-mode="${m.id}">
                  ${m.name}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="dim-flow-pill">
            <span class="dim-chip vision">Vision d_v: 768</span>
            <span class="dim-arrow">➔ Projector ➔</span>
            <span class="dim-chip text">LLM d_text: 4096</span>
          </div>
        </div>

        <!-- Projector Spec Details -->
        <div class="projector-spec-card" id="projector-spec-display">
          <!-- Injected dynamically -->
        </div>

        <!-- Cross-Modal Token Attention Matrix -->
        <div class="cross-attn-matrix-box">
          <div class="cross-attn-header">
            <h4>Cross-Modal Token Attention Heatmap</h4>
            <span class="attn-badge">Q (Prompt Tokens) × K^T (16 Visual Patches)</span>
          </div>
          <p class="cross-attn-desc">See which image patches light up when the LLM reads specific words in the prompt query: <em>"${currentImg().userQuery}"</em></p>
          <div class="cross-attn-table-wrapper" id="cross-attn-table-container">
            <!-- Heatmap generated dynamically -->
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: Visual Grounding & VQA Engine -->
    <div class="vlm-tab-panel" id="panel-visual-qa" style="display: ${activeTab === 'visual_qa' ? 'block' : 'none'};">
      <div class="grounding-lab-grid">
        <!-- Left: Image with Glowing Bounding Box -->
        <div class="grounding-canvas-card">
          <div class="canvas-header">
            <h4>Spatial Grounding Reticle</h4>
            <div class="box-toggle-wrapper">
              <label for="chk-vlm-box" class="box-toggle-label">
                <input type="checkbox" id="chk-vlm-box" ${showBoundingBox ? 'checked' : ''} />
                <span>Show Bounding Box Pin 📍</span>
              </label>
            </div>
          </div>
          <div class="vlm-viewport-wrapper">
            <div class="vlm-scene-viewport relative" id="vlm-grounding-viewport">
              ${getSceneSvg(currentImg().id)}
              <!-- Glowing Bounding Box Overlay -->
              <div class="bounding-box-reticle" id="bounding-box-reticle" style="display: ${showBoundingBox ? 'block' : 'none'};">
                <div class="reticle-label" id="reticle-label-text">${currentImg().groundingTarget.label}</div>
                <div class="reticle-corner tl"></div>
                <div class="reticle-corner tr"></div>
                <div class="reticle-corner bl"></div>
                <div class="reticle-corner br"></div>
              </div>
            </div>
          </div>
          <div class="grounding-coords-row">
            <span class="coords-label">Normalized Coordinate Bins [0, 1000]:</span>
            <code class="coords-code" id="grounding-coords-text">[${currentImg().groundingTarget.boxNorm.join(', ')}]</code>
          </div>
        </div>

        <!-- Right: VQA Autoregressive Inference Console -->
        <div class="grounding-vqa-card">
          <div class="vqa-header">
            <h4>Multimodal Generation & Autoregressive Decoder</h4>
            <span class="vqa-model-badge">LLaVA-1.5 7B Engine</span>
          </div>

          <div class="vqa-query-box">
            <span class="query-role">User Query:</span>
            <div class="query-text">"${currentImg().userQuery}"</div>
          </div>

          <div class="vqa-actions">
            <button class="vqa-generate-btn" id="btn-generate-vlm">🚀 Generate Grounded Response</button>
          </div>

          <!-- Generation Sequence Timeline -->
          <div class="vqa-stream-box" id="vqa-stream-box">
            <div class="stream-idle-text">// Click Generate to simulate multimodal token sequence decoding...</div>
          </div>

          <div class="vqa-claim-row" id="vqa-claim-row" style="display: none;">
            <button class="claim-xp-btn" id="btn-claim-vqa-xp">🌟 Claim Multimodal Master XP (+30 XP)</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach to DOM
  dom.interactiveContainer.appendChild(container);

  // Position the bounding box reticle based on target
  function updateBoundingBoxPosition() {
    const reticle = container.querySelector('#bounding-box-reticle');
    const target = currentImg().groundingTarget;
    if (reticle && target) {
      const [top, left, bottom, right] = target.box;
      reticle.style.top = `${top}px`;
      reticle.style.left = `${left}px`;
      reticle.style.width = `${right - left}px`;
      reticle.style.height = `${bottom - top}px`;
    }
  }

  // --- TAB NAVIGATION ---
  const tabBtns = container.querySelectorAll('.vlm-tab-btn');
  const panels = {
    patch_inspector: container.querySelector('#panel-patch-inspector'),
    projector_arena: container.querySelector('#panel-projector-arena'),
    visual_qa: container.querySelector('#panel-visual-qa')
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      activeTab = target;
      state.vlmActiveTab = target;

      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      Object.keys(panels).forEach(k => {
        if (panels[k]) panels[k].style.display = (k === target) ? 'block' : 'none';
      });

      soundFx.playBlip(540, 0.05);

      if (target === 'projector_arena') {
        updateProjectorTab();
      } else if (target === 'visual_qa') {
        updateBoundingBoxPosition();
      }
    });
  });

  // --- SCENARIO SWITCHING ---
  const imgChips = container.querySelectorAll('.scenario-chip');
  imgChips.forEach(chip => {
    chip.addEventListener('click', () => {
      imageIdx = parseInt(chip.dataset.imgIdx, 10);
      state.vlmImageIdx = imageIdx;

      imgChips.forEach(c => c.classList.toggle('active', c === chip));

      // Refresh viewports
      const pViewport = container.querySelector('#vlm-scene-viewport');
      const gViewport = container.querySelector('#vlm-grounding-viewport');
      const svg = getSceneSvg(currentImg().id);

      if (pViewport) {
        const overlay = pViewport.querySelector('#patch-grid-overlay');
        pViewport.innerHTML = svg;
        if (overlay) pViewport.appendChild(overlay);
      }

      if (gViewport) {
        const reticle = gViewport.querySelector('#bounding-box-reticle');
        gViewport.innerHTML = svg;
        if (reticle) gViewport.appendChild(reticle);
      }

      // Update text in QA
      const qText = container.querySelector('.query-text');
      if (qText) qText.textContent = `"${currentImg().userQuery}"`;

      const cText = container.querySelector('#grounding-coords-text');
      if (cText) cText.textContent = `[${currentImg().groundingTarget.boxNorm.join(', ')}]`;

      const rLabel = container.querySelector('#reticle-label-text');
      if (rLabel) rLabel.textContent = currentImg().groundingTarget.label;

      // Reset VQA stream
      const streamBox = container.querySelector('#vqa-stream-box');
      if (streamBox) streamBox.innerHTML = `<div class="stream-idle-text">// Click Generate to simulate multimodal token sequence decoding...</div>`;
      const claimRow = container.querySelector('#vqa-claim-row');
      if (claimRow) claimRow.style.display = 'none';

      soundFx.playBlip(620, 0.05);
      renderPatchDetails();
      updateProjectorTab();
      updateBoundingBoxPosition();
    });
  });

  // --- TAB 1: PATCH INSPECTOR LOGIC ---
  const patchCells = container.querySelectorAll('.patch-cell');
  const inspectBadge = container.querySelector('#inspect-patch-badge');
  const inspectCoord = container.querySelector('#inspect-coord-tag');
  const heatBar = container.querySelector('#patch-heat-bar');
  const simGrid = container.querySelector('#sim-grid-4x4');
  const btnClaimPatchXp = container.querySelector('#btn-claim-patch-xp');

  function renderPatchDetails() {
    if (inspectBadge) inspectBadge.textContent = `Patch #${selectedPatchIdx + 1}`;
    const r = Math.floor(selectedPatchIdx / 4);
    const c = selectedPatchIdx % 4;
    if (inspectCoord) inspectCoord.textContent = `Row ${r + 1}, Col ${c + 1} • P[${r},${c}]`;

    // Render simulated heat bar
    if (heatBar) {
      heatBar.innerHTML = '';
      for (let i = 0; i < 24; i++) {
        const div = document.createElement('div');
        div.className = 'heat-segment';
        const val = 0.2 + 0.8 * Math.sin((selectedPatchIdx + 1) * 0.7 + i * 0.35) ** 2;
        div.style.background = `rgba(56, 189, 248, ${val.toFixed(2)})`;
        heatBar.appendChild(div);
      }
    }

    // Render 4x4 similarity grid
    if (simGrid) {
      simGrid.innerHTML = '';
      const primaryPatches = currentImg().groundingTarget.primaryPatches || [];
      const isTargetPatch = primaryPatches.includes(selectedPatchIdx);

      for (let i = 0; i < 16; i++) {
        const div = document.createElement('div');
        div.className = 'sim-cell';

        let simScore;
        if (i === selectedPatchIdx) {
          simScore = 1.0;
        } else if (isTargetPatch && primaryPatches.includes(i)) {
          simScore = 0.85 + 0.1 * Math.random();
        } else {
          const dist = Math.hypot(Math.floor(i / 4) - r, (i % 4) - c);
          simScore = Math.max(0.12, 0.75 - dist * 0.18 + 0.05 * Math.sin(i));
        }

        const scorePercent = Math.round(simScore * 100);
        div.style.background = `rgba(16, 185, 129, ${(simScore * 0.55).toFixed(2)})`;
        div.innerHTML = `<span class="sim-val">${scorePercent}%</span><span class="sim-p">P${i + 1}</span>`;

        div.addEventListener('click', () => {
          selectPatch(i);
        });

        simGrid.appendChild(div);
      }
    }
  }

  function selectPatch(idx) {
    selectedPatchIdx = idx;
    state.vlmSelectedPatchIdx = idx;
    patchCells.forEach((c, i) => c.classList.toggle('selected', i === idx));
    soundFx.playBlip(680 + idx * 20, 0.04);
    renderPatchDetails();
  }

  patchCells.forEach((cell, idx) => {
    cell.addEventListener('click', () => {
      selectPatch(idx);
    });
  });

  if (btnClaimPatchXp) {
    btnClaimPatchXp.addEventListener('click', () => {
      if (!xpClaimed) {
        xpClaimed = true;
        awardXp(25, 'Vision Transformer Patch Conquered');
        btnClaimPatchXp.textContent = '✓ +25 XP Claimed!';
        btnClaimPatchXp.disabled = true;
        btnClaimPatchXp.style.opacity = '0.6';
      }
    });
  }

  // --- TAB 2: PROJECTOR ARENA LOGIC ---
  const projPills = container.querySelectorAll('.proj-pill');
  const specDisplay = container.querySelector('#projector-spec-display');
  const crossAttnContainer = container.querySelector('#cross-attn-table-container');

  function updateProjectorTab() {
    const curSpec = projectorModes.find(m => m.id === projectorMode) || projectorModes[1];
    if (specDisplay && curSpec) {
      specDisplay.innerHTML = `
        <div class="spec-row">
          <div class="spec-col">
            <span class="spec-label">Architecture Formula:</span>
            <code class="spec-formula">${curSpec.formula}</code>
          </div>
          <div class="spec-col">
            <span class="spec-label">Parameter Scaling:</span>
            <span class="spec-val">${curSpec.params}</span>
          </div>
        </div>
        <div class="spec-pros-cons">
          <div class="spec-benefit"><strong>✓ Advantage:</strong> ${curSpec.pros}</div>
          <div class="spec-drawback"><strong>⚠️ Trade-off:</strong> ${curSpec.cons}</div>
        </div>
      `;
    }

    // Render Cross-Attention Heatmap Table
    if (crossAttnContainer) {
      crossAttnContainer.innerHTML = '';
      const promptWords = currentImg().userQuery.split(' ').slice(0, 6);
      const targetPatches = currentImg().groundingTarget.primaryPatches || [9, 10];

      let tableHtml = `
        <table class="attn-table">
          <thead>
            <tr>
              <th>Patch / Token</th>
              ${promptWords.map(w => `<th><code>${w}</code></th>`).join('')}
            </tr>
          </thead>
          <tbody>
      `;

      for (let p = 0; p < 16; p++) {
        const isTarget = targetPatches.includes(p);
        tableHtml += `
          <tr>
            <td class="patch-col"><strong>P${p + 1}</strong></td>
        `;

        promptWords.forEach((word, wIdx) => {
          let score;
          const isKeyword = word.toLowerCase().includes('pedestrian') ||
                            word.toLowerCase().includes('detect') ||
                            word.toLowerCase().includes('opacity') ||
                            word.toLowerCase().includes('peak') ||
                            word.toLowerCase().includes('vessel') ||
                            word.toLowerCase().includes('target');

          if (isTarget && isKeyword) {
            score = 0.82 + 0.15 * Math.random();
          } else if (isTarget) {
            score = 0.45 + 0.2 * Math.random();
          } else if (isKeyword) {
            score = 0.25 + 0.15 * Math.random();
          } else {
            score = 0.05 + 0.12 * Math.random();
          }

          const scorePercent = Math.round(score * 100);
          const bgOpacity = (score * 0.65).toFixed(2);
          tableHtml += `
            <td style="background: rgba(139, 92, 246, ${bgOpacity});">
              <span class="attn-score">${scorePercent}%</span>
            </td>
          `;
        });

        tableHtml += `</tr>`;
      }

      tableHtml += `</tbody></table>`;
      crossAttnContainer.innerHTML = tableHtml;
    }
  }

  projPills.forEach(pill => {
    pill.addEventListener('click', () => {
      projectorMode = pill.dataset.mode;
      state.vlmProjectorMode = projectorMode;
      projPills.forEach(p => p.classList.toggle('active', p === pill));
      soundFx.playBlip(720, 0.05);
      updateProjectorTab();
    });
  });

  // --- TAB 3: VISUAL GROUNDING & VQA LOGIC ---
  const chkBox = container.querySelector('#chk-vlm-box');
  const reticle = container.querySelector('#bounding-box-reticle');
  const btnGenerateVlm = container.querySelector('#btn-generate-vlm');
  const streamBox = container.querySelector('#vqa-stream-box');
  const vqaClaimRow = container.querySelector('#vqa-claim-row');
  const btnClaimVqaXp = container.querySelector('#btn-claim-vqa-xp');

  if (chkBox && reticle) {
    chkBox.addEventListener('change', () => {
      showBoundingBox = chkBox.checked;
      state.vlmShowBoundingBox = showBoundingBox;
      reticle.style.display = showBoundingBox ? 'block' : 'none';
      soundFx.playBlip(560, 0.04);
    });
  }

  if (btnGenerateVlm) {
    btnGenerateVlm.addEventListener('click', () => {
      if (isGenerating) return;
      isGenerating = true;
      btnGenerateVlm.disabled = true;
      btnGenerateVlm.textContent = '⏳ Decoding Multimodal Tokens...';
      if (streamBox) streamBox.innerHTML = '';

      // Phase 1: Visual Tokens Ingested
      const vStep = document.createElement('div');
      vStep.className = 'vqa-token-pill visual';
      vStep.innerHTML = `<span>🖼️ Projected Image Embeddings:</span> <code>[v₁ ... v₁₆] (${currentImg().resolution})</code>`;
      streamBox.appendChild(vStep);
      soundFx.playBlip(550, 0.05);

      setTimeout(() => {
        // Phase 2: Text Prompt Ingested
        const pStep = document.createElement('div');
        pStep.className = 'vqa-token-pill prompt';
        pStep.innerHTML = `<span>💬 Prompt Tokens:</span> <code>"${currentImg().userQuery}"</code>`;
        streamBox.appendChild(pStep);
        soundFx.playBlip(650, 0.05);
      }, 700);

      setTimeout(() => {
        // Phase 3: Text Answer Stream
        const aStep = document.createElement('div');
        aStep.className = 'vqa-answer-card';
        aStep.innerHTML = `
          <div class="answer-label">Autoregressive Answer:</div>
          <div class="answer-body">${currentImg().answer}</div>
          <div class="coords-badge">
            <span>Discrete Coordinate Tokens:</span>
            <code>&lt;box&gt;[${currentImg().groundingTarget.boxNorm.join(', ')}]&lt;/box&gt;</code>
          </div>
        `;
        streamBox.appendChild(aStep);

        // Highlight Bounding Box
        if (chkBox) chkBox.checked = true;
        if (reticle) reticle.style.display = 'block';
        reticle?.classList.add('pulse-box');
        setTimeout(() => reticle?.classList.remove('pulse-box'), 2000);

        soundFx.playLevelUp();
        if (vqaClaimRow) vqaClaimRow.style.display = 'flex';
        isGenerating = false;
        btnGenerateVlm.disabled = false;
        btnGenerateVlm.textContent = '🚀 Re-generate Grounded Response';
      }, 1800);
    });
  }

  if (btnClaimVqaXp) {
    btnClaimVqaXp.addEventListener('click', () => {
      if (!vqaXpClaimed) {
        vqaXpClaimed = true;
        awardXp(30, 'Multimodal VLM Master Conquered');
        btnClaimVqaXp.textContent = '✓ +30 XP Claimed!';
        btnClaimVqaXp.disabled = true;
        btnClaimVqaXp.style.opacity = '0.6';
      }
    });
  }

  // Initial draw
  renderPatchDetails();
  updateProjectorTab();
  updateBoundingBoxPosition();
}


// --- WIDGET 16: Mixture-of-Experts & Dynamic Routing Lab ---