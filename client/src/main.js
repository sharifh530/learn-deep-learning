import './style.css';
import curriculumData from './curriculum.json';
import { AITutorService } from './ai_tutor.js';
import confetti from 'canvas-confetti';
import { marked } from 'marked';

// --- State Management ---
const state = {
  curriculum: curriculumData,
  activeQuestId: 'quest-1',
  completedQuests: new Set(JSON.parse(localStorage.getItem('nq_completed_quests') || '[]')),
  userXp: parseInt(localStorage.getItem('nq_user_xp') || '100', 10),
  backendUrl: localStorage.getItem('nq_backend_url') || 'http://localhost:8000',
  backendOnline: false,
  activeTab: 'interactive',
  // Coffee neuron state
  neuronWeights: { sugar: 0.8, milk: 0.4, espresso: 1.5, bias: -0.5 },
  selectedCustomerIdx: 0,
  // Activation lab state
  activeActivation: 'relu',
  activationX: 1.5,
  // Gradient state
  gradientWeight: -3.5,
  learningRate: 0.08,
  gradientSteps: 0,
  // Doodle state
  isDrawing: false,
  doodleTimer: null,
  challengeTarget: null,
  challengeCountdown: 0,
  challengeTimerId: null,
  // Kernel Detective state
  kernelWeights: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
  kernelStride: 1,
  kernelPadding: 'same',
  kernelActivation: 'none',
  kernelBias: 0,
  kernelActivePreset: 'sobel_h',
  kernelPattern: 'shapes',
  kernelInspectCoord: { x: 14, y: 14 }
};

const tutorService = new AITutorService();

// --- DOM References ---
const dom = {
  // Navigation
  userLevelText: document.getElementById('user-level-text'),
  xpBarFill: document.getElementById('xp-bar-fill'),
  xpLabelText: document.getElementById('xp-label-text'),
  backendStatusPill: document.getElementById('backend-status-pill'),
  backendStatusText: document.getElementById('backend-status-text'),
  btnOpenSettings: document.getElementById('btn-open-settings'),
  btnToggleTutor: document.getElementById('btn-toggle-tutor'),
  // Sidebar
  questListContainer: document.getElementById('quest-list-container'),
  questCompletionCount: document.getElementById('quest-completion-count'),
  // Stage
  questHero: document.getElementById('quest-hero'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  interactiveContainer: document.getElementById('interactive-container'),
  // Code Lab
  codeEditorArea: document.getElementById('code-editor-area'),
  btnRunCode: document.getElementById('btn-run-code'),
  btnResetCode: document.getElementById('btn-reset-code'),
  terminalOutput: document.getElementById('terminal-output'),
  btnClearTerminal: document.getElementById('btn-clear-terminal'),
  // Quiz
  quizContainer: document.getElementById('quiz-container'),
  // Tutor Modal & Floating button
  aiTutorModal: document.getElementById('ai-tutor-modal'),
  floatingBtnTutor: document.getElementById('floating-btn-tutor'),
  btnCloseTutorModal: document.getElementById('btn-close-tutor-modal'),
  btnClearChat: document.getElementById('btn-clear-chat'),
  tutorQuestContextPill: document.getElementById('tutor-quest-context-pill'),
  tutorQuestSelect: document.getElementById('tutor-quest-select'),
  tutorModelBadge: document.getElementById('tutor-model-badge'),
  tutorChatHistory: document.getElementById('tutor-chat-history'),
  tutorInputText: document.getElementById('tutor-input-text'),
  btnSendTutor: document.getElementById('btn-send-tutor'),
  tutorPresetChips: document.getElementById('tutor-preset-chips'),
  // Settings Modal
  settingsModal: document.getElementById('settings-modal'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnTestApi: document.getElementById('btn-test-api'),
  btnDetectModels: document.getElementById('btn-detect-models'),
  aiProviderSelect: document.getElementById('ai-provider-select'),
  geminiKeyInput: document.getElementById('gemini-key-input'),
  geminiModelSelect: document.getElementById('gemini-model-select'),
  groupGeminiModel: document.getElementById('group-gemini-model'),
  groupCustomAgent: document.getElementById('group-custom-agent'),
  customAgentUrlInput: document.getElementById('custom-agent-url-input'),
  backendUrlInput: document.getElementById('backend-url-input'),
  settingsTestStatus: document.getElementById('settings-test-status')
};

// --- XP & Level Calculations ---
function updateXpDisplay() {
  const xp = state.userXp;
  let level = 1;
  let title = 'Tensor Novice';
  let nextXp = 250;

  if (xp >= 750) {
    level = 4;
    title = 'Master of Convolutions';
    nextXp = 1000;
  } else if (xp >= 450) {
    level = 3;
    title = 'Gradient Surfer';
    nextXp = 750;
  } else if (xp >= 200) {
    level = 2;
    title = 'Neuron Apprentice';
    nextXp = 450;
  }

  const progressPercent = Math.min(100, Math.round((xp / nextXp) * 100));
  dom.userLevelText.textContent = `Lvl ${level} • ${title}`;
  dom.xpBarFill.style.width = `${progressPercent}%`;
  dom.xpLabelText.textContent = `${xp} / ${nextXp} XP`;

  localStorage.setItem('nq_user_xp', xp.toString());
}

function awardXp(amount, reason = '') {
  state.userXp += amount;
  updateXpDisplay();
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.7 }
  });
}

// --- Backend Health Check ---
async function checkBackendStatus() {
  try {
    const res = await fetch(`${state.backendUrl}/api/status`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      state.backendOnline = true;
      dom.backendStatusPill.classList.add('online');
      dom.backendStatusText.textContent = 'PyTorch Engine: Online 🟢';
    } else {
      throw new Error();
    }
  } catch {
    state.backendOnline = false;
    dom.backendStatusPill.classList.remove('online');
    dom.backendStatusText.textContent = 'PyTorch Engine: Offline (Local Mode)';
  }
}

// --- Sidebar Render ---
function renderQuestList() {
  dom.questListContainer.innerHTML = '';
  const total = state.curriculum.quests.length;
  const completed = state.completedQuests.size;
  dom.questCompletionCount.textContent = `${completed}/${total} Done`;

  state.curriculum.quests.forEach(quest => {
    const isCompleted = state.completedQuests.has(quest.id);
    const isActive = quest.id === state.activeQuestId;

    const card = document.createElement('div');
    card.className = `quest-card-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="quest-item-icon">${quest.icon}</div>
      <div class="quest-item-content">
        <span class="quest-item-tag">${quest.tag}</span>
        <div class="quest-item-title">${quest.number}. ${quest.title}</div>
        <div class="quest-item-footer">
          <span class="quest-item-xp">⭐ +${quest.xp} XP</span>
          <span class="quest-item-badge">${isCompleted ? '✓ Completed' : 'Active'}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      state.activeQuestId = quest.id;
      renderQuestList();
      renderActiveQuest();
    });

    dom.questListContainer.appendChild(card);
  });
}

// --- Active Quest Rendering ---
function getActiveQuest() {
  return state.curriculum.quests.find(q => q.id === state.activeQuestId) || state.curriculum.quests[0];
}

function renderActiveQuest() {
  const quest = getActiveQuest();

  // Hero Section
  dom.questHero.innerHTML = `
    <div class="hero-header">
      <div>
        <span class="hero-tag">${quest.tag} • QUEST ${quest.number}</span>
        <h1 class="hero-title">${quest.icon} ${quest.title}</h1>
        <div class="hero-subtitle">${quest.subtitle}</div>
      </div>
      <div class="hero-xp-reward">
        <span>⭐</span>
        <span>+${quest.xp} XP Reward</span>
      </div>
    </div>
    <div class="hero-story-box">
      <p>${quest.story}</p>
      <div class="mental-model-pill">
        <span>💡 Mental Model:</span>
        <span>${quest.mentalModel}</span>
      </div>
    </div>
  `;

  // Code editor init
  dom.codeEditorArea.value = quest.codeSnippet;

  // Render Sandbox based on type
  renderInteractiveWidget(quest);

  // Render Quiz
  renderQuiz(quest);

  // Synchronize AI Tutor suggestion prompt deck with currently active quest
  if (typeof renderTutorChips === 'function') {
    renderTutorChips();
  }
}

// --- Interactive Sandbox Renderers ---
function renderInteractiveWidget(quest) {
  dom.interactiveContainer.innerHTML = '';

  switch (quest.interactiveType) {
    case 'neuron_tuner':
      renderCoffeeNeuronWidget(quest);
      break;
    case 'activation_lab':
      renderActivationLabWidget(quest);
      break;
    case 'gradient_runner':
      renderGradientRunnerWidget(quest);
      break;
    case 'doodle_arena':
      renderDoodleArenaWidget(quest);
      break;
    case 'kernel_detective':
      renderKernelDetectiveWidget(quest);
      break;
    default:
      dom.interactiveContainer.innerHTML = `<p>Interactive playground loading...</p>`;
  }
}

// --- WIDGET 1: Coffee Neuron ---
function renderCoffeeNeuronWidget(quest) {
  const config = quest.interactiveConfig;
  const customer = config.customers[state.selectedCustomerIdx];

  const calcScore = () => {
    const [s, m, e] = customer.inputs;
    const { sugar, milk, espresso, bias } = state.neuronWeights;
    return (s * sugar) + (m * milk) + (e * espresso) + bias;
  };

  const container = document.createElement('div');
  container.className = 'neuron-widget-grid';
  container.innerHTML = `
    <div class="neuron-controls-panel">
      <h3 style="font-size: 1.1rem; margin-bottom: 0.8rem; color: #fff;">Adjust Synaptic Weights & Bias</h3>
      
      <div class="control-slider-group">
        <div class="slider-label-row">
          <span>Sugar Weight (W₁):</span>
          <span class="val" id="val-w-sugar">${state.neuronWeights.sugar.toFixed(2)}</span>
        </div>
        <input type="range" class="cyber-slider" id="slider-w-sugar" min="-2" max="3" step="0.1" value="${state.neuronWeights.sugar}" />
      </div>

      <div class="control-slider-group">
        <div class="slider-label-row">
          <span>Milk Weight (W₂):</span>
          <span class="val" id="val-w-milk">${state.neuronWeights.milk.toFixed(2)}</span>
        </div>
        <input type="range" class="cyber-slider" id="slider-w-milk" min="-2" max="3" step="0.1" value="${state.neuronWeights.milk}" />
      </div>

      <div class="control-slider-group">
        <div class="slider-label-row">
          <span>Espresso Weight (W₃):</span>
          <span class="val" id="val-w-espresso">${state.neuronWeights.espresso.toFixed(2)}</span>
        </div>
        <input type="range" class="cyber-slider" id="slider-w-espresso" min="-2" max="3" step="0.1" value="${state.neuronWeights.espresso}" />
      </div>

      <div class="control-slider-group">
        <div class="slider-label-row">
          <span>Neuron Bias (b):</span>
          <span class="val" id="val-w-bias">${state.neuronWeights.bias.toFixed(2)}</span>
        </div>
        <input type="range" class="cyber-slider" id="slider-w-bias" min="-5" max="5" step="0.2" value="${state.neuronWeights.bias}" />
      </div>

      <div style="margin-top: 1.2rem;">
        <h4 style="font-size: 0.9rem; color: var(--text-dim); text-transform: uppercase;">Café Customers:</h4>
        <div class="customer-cards-list" id="customer-cards-list"></div>
      </div>
    </div>

    <div class="neuron-visualizer-card">
      <h4 style="font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-violet);">Single Artificial Neuron</h4>
      
      <div class="neuron-node-display" id="neuron-display-node">
        <span class="neuron-score-value" id="neuron-score-text">0.00</span>
        <span class="neuron-score-label">Delight Score</span>
      </div>

      <div style="text-align: center; max-width: 320px; font-size: 0.9rem; color: var(--text-muted); margin-top: 1rem;">
        Formula: <code style="color: #67e8f9; font-family: var(--font-mono);">(Sugar·W₁) + (Milk·W₂) + (Espresso·W₃) + Bias</code>
      </div>

      <div id="customer-feedback-badge" style="margin-top: 1.2rem; padding: 0.5rem 1rem; border-radius: 999px; font-weight: 700; font-size: 0.85rem;"></div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // Wire customer list
  const listEl = container.querySelector('#customer-cards-list');
  config.customers.forEach((cust, idx) => {
    const isCur = idx === state.selectedCustomerIdx;
    const card = document.createElement('div');
    card.className = `customer-card ${isCur ? 'active' : ''}`;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.9rem;">
        <span>${cust.name}</span>
        <span style="color: var(--accent-amber);">Target: ${cust.target}</span>
      </div>
      <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">Hint: ${cust.hint}</div>
    `;
    card.addEventListener('click', () => {
      state.selectedCustomerIdx = idx;
      renderCoffeeNeuronWidget(quest);
    });
    listEl.appendChild(card);
  });

  // Wire Sliders
  const updateNeuronUI = () => {
    const score = calcScore();
    const scoreEl = container.querySelector('#neuron-score-text');
    const feedbackEl = container.querySelector('#customer-feedback-badge');
    const target = customer.target;
    const diff = Math.abs(score - target);

    scoreEl.textContent = score.toFixed(2);

    if (diff <= customer.tolerance) {
      feedbackEl.textContent = `🎉 Target Reached! ${customer.name} is thrilled!`;
      feedbackEl.style.background = 'rgba(16, 185, 129, 0.2)';
      feedbackEl.style.border = '1px solid var(--accent-emerald)';
      feedbackEl.style.color = '#34d399';
    } else {
      feedbackEl.textContent = `Target: ${target} (Difference: ${diff.toFixed(2)})`;
      feedbackEl.style.background = 'rgba(255, 255, 255, 0.05)';
      feedbackEl.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      feedbackEl.style.color = 'var(--text-muted)';
    }
  };

  const bindSlider = (id, prop, valId) => {
    const slider = container.querySelector(`#${id}`);
    const valText = container.querySelector(`#${valId}`);
    slider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      state.neuronWeights[prop] = v;
      valText.textContent = v.toFixed(2);
      updateNeuronUI();
    });
  };

  bindSlider('slider-w-sugar', 'sugar', 'val-w-sugar');
  bindSlider('slider-w-milk', 'milk', 'val-w-milk');
  bindSlider('slider-w-espresso', 'espresso', 'val-w-espresso');
  bindSlider('slider-w-bias', 'bias', 'val-w-bias');

  updateNeuronUI();
}

// --- WIDGET 2: Activation Function Lab ---
function renderActivationLabWidget(quest) {
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
      <div class="activation-selector">
        <button class="act-btn ${state.activeActivation === 'relu' ? 'active' : ''}" data-act="relu">ReLU: max(0, x)</button>
        <button class="act-btn ${state.activeActivation === 'sigmoid' ? 'active' : ''}" data-act="sigmoid">Sigmoid: 1/(1+e⁻ˣ)</button>
        <button class="act-btn ${state.activeActivation === 'tanh' ? 'active' : ''}" data-act="tanh">Tanh</button>
        <button class="act-btn ${state.activeActivation === 'linear' ? 'active' : ''}" data-act="linear">Linear (No Activation)</button>
      </div>
      <div style="font-size: 0.85rem; color: var(--accent-cyan); font-family: var(--font-mono);">
        Input x = <span id="act-x-val">${state.activationX.toFixed(2)}</span>
      </div>
    </div>

    <div class="activation-chart-container">
      <canvas id="act-canvas" width="700" height="300" style="width: 100%; height: 100%;"></canvas>
    </div>

    <div style="background: rgba(0,0,0,0.3); padding: 1.2rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 2rem;">
      <div style="flex: 1;">
        <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">
          Slide Input Signal (x):
        </label>
        <input type="range" class="cyber-slider" id="slider-act-x" min="-5" max="5" step="0.1" value="${state.activationX}" />
      </div>
      <div style="background: rgba(139, 92, 246, 0.15); border: 1px solid var(--accent-violet); padding: 0.6rem 1.4rem; border-radius: var(--radius-md); text-align: center;">
        <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim);">Output f(x)</span>
        <div style="font-size: 1.6rem; font-weight: 800; font-family: var(--font-mono); color: #fff;" id="act-output-val">0.00</div>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  const canvas = container.querySelector('#act-canvas');
  const ctx = canvas.getContext('2d');

  const computeAct = (x, type) => {
    if (type === 'relu') return Math.max(0, x);
    if (type === 'sigmoid') return 1 / (1 + Math.exp(-x));
    if (type === 'tanh') return Math.tanh(x);
    return x; // Linear
  };

  const drawChart = () => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Axes
    const originX = w / 2;
    const originY = h / 2;
    const scaleX = 50;
    const scaleY = 70;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, originY); ctx.lineTo(w, originY);
    ctx.moveTo(originX, 0); ctx.lineTo(originX, h);
    ctx.stroke();

    // Plot activation curve
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const x = (px - originX) / scaleX;
      const y = computeAct(x, state.activeActivation);
      const py = originY - (y * scaleY);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Current point marker
    const curX = state.activationX;
    const curY = computeAct(curX, state.activeActivation);
    const curPx = originX + (curX * scaleX);
    const curPy = originY - (curY * scaleY);

    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(curPx, curPy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Update readouts
    container.querySelector('#act-x-val').textContent = curX.toFixed(2);
    container.querySelector('#act-output-val').textContent = curY.toFixed(3);
  };

  // Button switches
  container.querySelectorAll('.act-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.act-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeActivation = btn.dataset.act;
      drawChart();
    });
  });

  // Slider
  container.querySelector('#slider-act-x').addEventListener('input', (e) => {
    state.activationX = parseFloat(e.target.value);
    drawChart();
  });

  drawChart();
}

// --- WIDGET 3: Gradient Descent Marble Run ---
function renderGradientRunnerWidget(quest) {
  const container = document.createElement('div');
  container.className = 'marble-run-container';
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 style="font-size: 1.1rem; color: #fff;">Roll Down the Loss Landscape</h3>
      <div style="display: flex; gap: 1rem; font-family: var(--font-mono); font-size: 0.85rem;">
        <span style="color: var(--accent-cyan);">Current Weight (w): <strong id="grad-weight-val">${state.gradientWeight.toFixed(3)}</strong></span>
        <span style="color: var(--accent-amber);">Loss L(w): <strong id="grad-loss-val">0.00</strong></span>
        <span style="color: var(--text-dim);">Steps: <strong id="grad-step-val">0</strong></span>
      </div>
    </div>

    <div class="marble-canvas-wrapper">
      <canvas id="marble-canvas" width="800" height="280" style="width: 100%; height: 100%;"></canvas>
    </div>

    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; background: rgba(0,0,0,0.3); padding: 1.2rem; border-radius: var(--radius-md);">
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
          <span style="color: var(--text-muted); font-weight: 600;">Learning Rate (η / Alpha):</span>
          <span style="color: var(--accent-cyan); font-family: var(--font-mono);" id="lr-val-display">${state.learningRate}</span>
        </div>
        <input type="range" class="cyber-slider" id="slider-learning-rate" min="0.01" max="0.5" step="0.01" value="${state.learningRate}" />
      </div>

      <div style="display: flex; gap: 0.8rem;">
        <button class="btn-secondary" id="btn-reset-gradient" style="padding: 0.6rem 1.1rem;">↺ Reset</button>
        <button class="btn-primary" id="btn-step-gradient" style="padding: 0.6rem 1.4rem;">⚡ Step Gradient Descent</button>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  const canvas = container.querySelector('#marble-canvas');
  const ctx = canvas.getContext('2d');

  // Loss formula: L(w) = (w - 1.5)^2 + 1
  const lossFn = (w) => Math.pow(w - 1.5, 2) + 1.0;
  const gradFn = (w) => 2 * (w - 1.5);

  const drawScene = () => {
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const originX = width / 2;
    const originY = height - 40;
    const scaleX = 65;
    const scaleY = 14;

    // Draw Valley Curve
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let px = 0; px < width; px++) {
      const w = (px - originX) / scaleX;
      const l = lossFn(w);
      const py = originY - (l * scaleY);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Optimal minimum marker
    const minW = 1.5;
    const minPx = originX + (minW * scaleX);
    const minPy = originY - (lossFn(minW) * scaleY);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(minPx, minPy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw Marble
    const curW = state.gradientWeight;
    const curLoss = lossFn(curW);
    const marblePx = originX + (curW * scaleX);
    const marblePy = originY - (curLoss * scaleY) - 10;

    // Gradient Arrow
    const g = gradFn(curW);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marblePx, marblePy);
    ctx.lineTo(marblePx - (g * 15), marblePy);
    ctx.stroke();

    // Glowing Marble Ball
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(marblePx, marblePy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Updates
    container.querySelector('#grad-weight-val').textContent = curW.toFixed(3);
    container.querySelector('#grad-loss-val').textContent = curLoss.toFixed(3);
    container.querySelector('#grad-step-val').textContent = state.gradientSteps.toString();
  };

  container.querySelector('#slider-learning-rate').addEventListener('input', (e) => {
    state.learningRate = parseFloat(e.target.value);
    container.querySelector('#lr-val-display').textContent = state.learningRate.toFixed(2);
  });

  container.querySelector('#btn-step-gradient').addEventListener('click', () => {
    const g = gradFn(state.gradientWeight);
    state.gradientWeight -= state.learningRate * g;
    state.gradientSteps += 1;
    drawScene();

    if (Math.abs(state.gradientWeight - 1.5) < 0.05 && state.gradientSteps <= 20) {
      confetti({ particleCount: 40, spread: 50 });
    }
  });

  container.querySelector('#btn-reset-gradient').addEventListener('click', () => {
    state.gradientWeight = -3.5;
    state.gradientSteps = 0;
    drawScene();
  });

  drawScene();
}

// --- WIDGET 4: DoodleVision AI Real-World Capstone ---
const DOODLE_STENCILS = {
  cat: (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 280, 280);
    c.strokeStyle = '#fff';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.arc(140, 150, 65, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(85, 115); c.lineTo(75, 50); c.lineTo(125, 95);
    c.stroke();
    c.beginPath();
    c.moveTo(155, 95); c.lineTo(205, 50); c.lineTo(195, 115);
    c.stroke();
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(90, 150); c.lineTo(40, 140);
    c.moveTo(90, 160); c.lineTo(40, 165);
    c.moveTo(190, 150); c.lineTo(240, 140);
    c.moveTo(190, 160); c.lineTo(240, 165);
    c.stroke();
  },
  bicycle: (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 280, 280);
    c.strokeStyle = '#fff';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath(); c.arc(75, 195, 38, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(205, 195, 38, 0, Math.PI * 2); c.stroke();
    c.beginPath();
    c.moveTo(75, 195); c.lineTo(130, 195); c.lineTo(105, 130); c.lineTo(75, 195);
    c.lineTo(105, 130); c.lineTo(175, 130); c.lineTo(205, 195);
    c.stroke();
    c.beginPath();
    c.moveTo(175, 130); c.lineTo(170, 95); c.lineTo(185, 95);
    c.moveTo(105, 130); c.lineTo(100, 115); c.lineTo(120, 115);
    c.stroke();
  },
  star: (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 280, 280);
    c.strokeStyle = '#fff';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const cx = 140, cy = 140;
    const points = [
      [cx, 35],
      [cx - 75, cy + 85],
      [cx + 75, cy + 85],
      [cx - 95, cy - 35],
      [cx + 95, cy - 35]
    ];
    points.forEach(([px, py]) => {
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(px, py);
      c.stroke();
    });
    c.beginPath();
    c.moveTo(points[0][0], points[0][1]);
    c.lineTo(points[1][0], points[1][1]);
    c.lineTo(points[4][0], points[4][1]);
    c.lineTo(points[3][0], points[3][1]);
    c.lineTo(points[2][0], points[2][1]);
    c.closePath();
    c.stroke();
  },
  pizza: (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 280, 280);
    c.strokeStyle = '#fff';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.arc(140, -50, 190, 0.35 * Math.PI, 0.65 * Math.PI);
    c.stroke();
    c.beginPath();
    c.moveTo(60, 120); c.lineTo(140, 245); c.lineTo(220, 120);
    c.stroke();
    c.fillStyle = '#fff';
    [[140, 150], [115, 180], [165, 185], [140, 215]].forEach(([px, py]) => {
      c.beginPath();
      c.arc(px, py, 10, 0, Math.PI * 2);
      c.fill();
    });
  },
  umbrella: (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 280, 280);
    c.strokeStyle = '#fff';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.arc(140, 125, 95, Math.PI, 0);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(140, 125); c.lineTo(140, 225);
    c.stroke();
    c.beginPath();
    c.arc(125, 225, 15, 0, Math.PI);
    c.stroke();
  }
};

function computeClientFeatureMaps(grid28) {
  const kernels = [
    { label: "F0: Horizontal Edge", k: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] },
    { label: "F1: Vertical Edge", k: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
    { label: "F2: Diagonal Slopes", k: [[0, 1, 2], [-1, 0, 1], [-2, -1, 0]] },
    { label: "F3: Corner Detect", k: [[2, 1, 0], [1, 0, -1], [0, -1, -2]] },
    { label: "F4: Texture Contrast", k: [[0, -1, 0], [-1, 4, -1], [0, -1, 0]] },
    { label: "F5: Ridge Filter", k: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]] },
    { label: "F6: High Contrast Mass", k: [[-1, 2, -1], [-1, 2, -1], [-1, 2, -1]] },
    { label: "F7: Ambient Contour", k: [[1, 2, 1], [2, 4, 2], [1, 2, 1]] }
  ];

  return kernels.map((item, idx) => {
    const k = item.k;
    const out = [];
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let r = 0; r < 28; r++) {
      const row = [];
      for (let c = 0; c < 28; c++) {
        let sum = 0;
        for (let kr = -1; kr <= 1; kr++) {
          for (let kc = -1; kc <= 1; kc++) {
            const nr = r + kr;
            const nc = c + kc;
            const val = (nr >= 0 && nr < 28 && nc >= 0 && nc < 28) ? grid28[nr][nc] : 0;
            sum += val * k[kr + 1][kc + 1];
          }
        }
        const reluVal = Math.max(0, sum);
        if (reluVal < minVal) minVal = reluVal;
        if (reluVal > maxVal) maxVal = reluVal;
        row.push(reluVal);
      }
      out.push(row);
    }

    const range = (maxVal - minVal > 1e-4) ? (maxVal - minVal) : 1;
    const normalized = out.map(row => row.map(v => Math.min(1, Math.max(0, (v - minVal) / range))));

    return {
      filter_id: idx,
      label: item.label,
      grid: normalized
    };
  });
}

function renderDoodleArenaWidget(quest) {
  const container = document.createElement('div');
  container.className = 'doodle-arena-grid';
  container.innerHTML = `
    <div class="doodle-canvas-box">
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <span style="font-size: 0.85rem; font-weight: 700; color: #fff;">Drawing Canvas (280x280)</span>
        <span style="font-size: 0.75rem; color: var(--accent-cyan); font-family: var(--font-mono);">Real-time PyTorch CNN</span>
      </div>

      <canvas id="doodle-draw-canvas" class="doodle-canvas" width="280" height="280"></canvas>

      <div class="canvas-toolbar">
        <button class="canvas-btn" id="btn-clear-canvas">🗑️ Clear Canvas</button>
        <button class="canvas-btn" id="btn-start-challenge">⏱️ QuickDraw Battle</button>
      </div>

      <div class="stencil-bar">
        <span class="stencil-label">✨ Stencils:</span>
        <button class="stencil-chip" data-stencil="cat">🐱 Cat</button>
        <button class="stencil-chip" data-stencil="bicycle">🚲 Bicycle</button>
        <button class="stencil-chip" data-stencil="star">⭐ Star</button>
        <button class="stencil-chip" data-stencil="pizza">🍕 Pizza</button>
        <button class="stencil-chip" data-stencil="umbrella">☂️ Umbrella</button>
      </div>

      <div class="preview-28-box" style="width: 100%;">
        <canvas id="preview-28-canvas" class="preview-28-canvas" width="28" height="28"></canvas>
        <div style="font-size: 0.78rem; color: var(--text-muted);">
          <strong>Neural Downsample (28x28):</strong>
          <p>Grayscale tensor fed into Conv1 layer.</p>
        </div>
      </div>
    </div>

    <div class="doodle-predictions-panel">
      <div class="arena-tabs">
        <button class="arena-tab-btn active" data-view="predictions">🎯 Predictions</button>
        <button class="arena-tab-btn" data-view="feature-maps">🔬 Neural X-Ray (Conv1)</button>
        <button class="arena-tab-btn" data-view="train-model">⚡ Train CNN Studio</button>
      </div>

      <!-- View 1: Predictions -->
      <div id="doodle-view-predictions" class="arena-view-content">
        <div class="top-prediction-banner">
          <div>
            <span class="top-pred-label">Top Model Prediction</span>
            <div class="top-pred-name" id="doodle-top-class">Waiting for sketch...</div>
          </div>
          <div class="top-pred-confidence" id="doodle-top-confidence">0.0%</div>
        </div>

        <div id="challenge-status-box" style="display: none; padding: 0.8rem; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--accent-amber); border-radius: var(--radius-md); font-size: 0.88rem; margin-top: 0.8rem;"></div>

        <div style="margin-top: 0.8rem;">
          <h4 style="font-size: 0.85rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.8rem;">
            Category Confidence Distribution:
          </h4>
          <div id="doodle-probability-bars"></div>
        </div>
      </div>

      <!-- View 2: Neural X-Ray Feature Maps -->
      <div id="doodle-view-feature-maps" class="arena-view-content" style="display: none;">
        <div class="feature-maps-container">
          <div class="feature-maps-header">
            <strong>🔬 Conv1 Feature Maps (3x3 Kernels):</strong>
            <p style="margin-top: 0.2rem;">Live activations extracted from PyTorch's first convolution layer. Watch how filters isolate edges, curves, and textures!</p>
          </div>
          <div class="feature-maps-grid" id="feature-maps-grid"></div>
        </div>
      </div>

      <!-- View 3: Train CNN Studio -->
      <div id="doodle-view-train-model" class="arena-view-content" style="display: none;">
        <div class="training-studio-panel">
          <div class="training-stats-row">
            <div class="training-stat-card">
              <div class="training-stat-label">Trained Epochs</div>
              <div class="training-stat-val" id="train-stat-epoch">12</div>
            </div>
            <div class="training-stat-card">
              <div class="training-stat-label">Loss (CE)</div>
              <div class="training-stat-val" id="train-stat-loss">0.0015</div>
            </div>
            <div class="training-stat-card">
              <div class="training-stat-label">Batch Accuracy</div>
              <div class="training-stat-val" id="train-stat-acc">100%</div>
            </div>
          </div>

          <div style="background: rgba(0, 0, 0, 0.3); padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid rgba(255, 255, 255, 0.06);">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; font-weight: 600;">
              <span>Optimizer: <strong>Adam</strong></span>
              <span>Learning Rate: <strong id="train-lr-val" style="color: var(--accent-cyan); font-family: var(--font-mono);">0.003</strong></span>
            </div>
            <input type="range" id="train-lr-slider" min="0.001" max="0.02" step="0.001" value="0.003" class="cyber-slider" />
          </div>

          <div class="training-actions-row">
            <button class="btn-train-action btn-train-primary" id="btn-train-1-epoch">⚡ Train 1 Epoch</button>
            <button class="btn-train-action btn-train-secondary" id="btn-train-5-epochs">🚀 Train 5 Epochs</button>
            <button class="btn-train-action btn-train-reset" id="btn-reset-weights" title="Reset to random weights">🔄 Reset Weights</button>
          </div>

          <div>
            <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.3rem;">Training Telemetry Log:</div>
            <div class="training-log-box" id="training-log-box">
              <div>[Ready] PyTorch DoodleCNN connected. Click Train to run epochs on QuickDraw synthetic data.</div>
            </div>
          </div>

          <div class="model-export-panel" style="margin-top: 1rem; padding: 0.85rem; background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--radius-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
              <span style="font-weight: 700; font-size: 0.82rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.4rem;">
                📦 <span>Model Export & Production Serving</span>
              </span>
              <span style="font-size: 0.72rem; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 0.15rem 0.5rem; border-radius: 4px; font-family: var(--font-mono);">PyTorch 2.x • 425 KB</span>
            </div>
            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.6rem; line-height: 1.4;">
              Export your trained neural network weights or download the turnkey Python server to test live inference on your local machine.
            </p>
            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
              <button class="btn-train-action btn-train-secondary" id="btn-export-weights" style="font-size: 0.78rem; padding: 0.45rem 0.8rem; cursor: pointer;">
                💾 Download Weights (.pth)
              </button>
              <button class="btn-train-action btn-train-secondary" id="btn-export-script" style="font-size: 0.78rem; padding: 0.45rem 0.8rem; cursor: pointer;">
                🐍 Download serve_doodle.py
              </button>
            </div>
            <div style="margin-top: 0.6rem; font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); background: rgba(0,0,0,0.4); padding: 0.4rem 0.6rem; border-radius: 4px;">
              $ python serve_doodle.py  # Run local inference CLI
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  const canvas = container.querySelector('#doodle-draw-canvas');
  const ctx = canvas.getContext('2d');
  const previewCanvas = container.querySelector('#preview-28-canvas');
  const previewCtx = previewCanvas.getContext('2d');

  // Canvas Drawing Setup
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let drawing = false;

  const startDraw = (e) => {
    drawing = true;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();

    triggerPredictionDebounced();
  };

  const stopDraw = () => {
    if (drawing) {
      drawing = false;
      ctx.closePath();
      triggerPrediction();
    }
  };

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', stopDraw);

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
  window.addEventListener('touchend', stopDraw);

  // Clear Canvas
  container.querySelector('#btn-clear-canvas').addEventListener('click', () => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    previewCtx.fillStyle = '#000000';
    previewCtx.fillRect(0, 0, 28, 28);
    updatePredictionUI({
      top_class: 'Draw something!',
      confidence: 0,
      all_predictions: quest.interactiveConfig.classes.map(c => ({ class: c, confidence: 20.0 }))
    });
    updateFeatureMaps(extract28x28());
  });

  // Stencils
  container.querySelectorAll('.stencil-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.stencil;
      const fn = DOODLE_STENCILS[type];
      if (fn) {
        fn(ctx);
        triggerPrediction();
      }
    });
  });

  // Arena Sub-tabs
  container.querySelectorAll('.arena-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.arena-tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.arena-view-content').forEach(v => v.style.display = 'none');
      btn.classList.add('active');
      const viewName = btn.dataset.view;
      const targetView = container.querySelector(`#doodle-view-${viewName}`);
      if (targetView) targetView.style.display = 'block';

      if (viewName === 'train-model') {
        fetchTrainingStatus();
      }
    });
  });

  // Feature Maps Grid Initialization
  const fmapsGrid = container.querySelector('#feature-maps-grid');
  fmapsGrid.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const card = document.createElement('div');
    card.className = 'feature-map-card';
    card.innerHTML = `
      <canvas class="feature-map-canvas" id="fmap-canvas-${i}" width="28" height="28"></canvas>
      <div class="feature-map-title" id="fmap-title-${i}">F${i}</div>
    `;
    fmapsGrid.appendChild(card);
  }

  const updateFeatureMaps = async (grid) => {
    let maps = null;
    if (state.backendOnline) {
      try {
        const res = await fetch(`${state.backendUrl}/api/feature_maps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pixels: grid })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.feature_maps && data.feature_maps.length > 0) {
            maps = data.feature_maps;
          }
        }
      } catch {}
    }

    if (!maps) {
      maps = computeClientFeatureMaps(grid);
    }

    maps.forEach((m, idx) => {
      const fCanvas = container.querySelector(`#fmap-canvas-${idx}`);
      const fTitle = container.querySelector(`#fmap-title-${idx}`);
      if (fCanvas && m.grid) {
        const fctx = fCanvas.getContext('2d');
        const imgData = fctx.createImageData(28, 28);
        for (let r = 0; r < 28; r++) {
          for (let c = 0; c < 28; c++) {
            const val = Math.min(255, Math.max(0, Math.round(m.grid[r][c] * 255)));
            const pIdx = (r * 28 + c) * 4;
            imgData.data[pIdx] = Math.round(val * 0.35);     // R
            imgData.data[pIdx + 1] = Math.round(val * 0.95); // G (Cyan)
            imgData.data[pIdx + 2] = val;                    // B (Electric)
            imgData.data[pIdx + 3] = 255;
          }
        }
        fctx.putImageData(imgData, 0, 0);
        if (fTitle) {
          fTitle.textContent = m.label.split(':')[0];
          fTitle.title = m.label;
        }
      }
    });
  };

  // Downsample 280x280 -> 28x28 grayscale array
  const extract28x28 = () => {
    previewCtx.drawImage(canvas, 0, 0, 280, 280, 0, 0, 28, 28);
    const imgData = previewCtx.getImageData(0, 0, 28, 28);
    const grid = [];
    for (let r = 0; r < 28; r++) {
      const row = [];
      for (let c = 0; c < 28; c++) {
        const idx = (r * 28 + c) * 4;
        const val = imgData.data[idx] / 255.0;
        row.push(val);
      }
      grid.push(row);
    }
    return grid;
  };

  let debounceTimer = null;
  const triggerPredictionDebounced = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerPrediction, 100);
  };

  const triggerPrediction = async () => {
    const grid = extract28x28();
    updateFeatureMaps(grid);

    try {
      if (state.backendOnline) {
        const res = await fetch(`${state.backendUrl}/api/predict_doodle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pixels: grid })
        });
        if (res.ok) {
          const data = await res.json();
          updatePredictionUI(data);
          checkChallenge(data);
          return;
        }
      }
    } catch {}

    // Fallback heuristic prediction
    const flat = grid.flat();
    const sumInk = flat.reduce((a, b) => a + b, 0);
    if (sumInk < 2) {
      updatePredictionUI({
        top_class: 'Draw something!',
        confidence: 0,
        all_predictions: quest.interactiveConfig.classes.map(c => ({ class: c, confidence: 20.0 }))
      });
      return;
    }

    const classes = quest.interactiveConfig.classes;
    const topRowSum = grid.slice(0, 10).flat().reduce((a, b) => a + b, 0);
    const bottomRowSum = grid.slice(18, 28).flat().reduce((a, b) => a + b, 0);

    let scores = [20, 20, 20, 20, 20];
    if (topRowSum > bottomRowSum * 1.6) scores[4] += 55;
    else if (bottomRowSum > topRowSum * 1.4) scores[1] += 50;
    else scores[2] += 45;

    const total = scores.reduce((a, b) => a + b, 0);
    const preds = classes.map((c, i) => ({
      class: c,
      confidence: Math.round((scores[i] / total) * 100)
    })).sort((a, b) => b.confidence - a.confidence);

    updatePredictionUI({
      top_class: preds[0].class,
      confidence: preds[0].confidence,
      all_predictions: preds
    });
  };

  const updatePredictionUI = (data) => {
    const topConf = typeof data.confidence === 'number' ? Number(data.confidence).toFixed(1) : data.confidence;
    container.querySelector('#doodle-top-class').textContent = data.top_class;
    container.querySelector('#doodle-top-confidence').textContent = `${topConf}%`;

    const barContainer = container.querySelector('#doodle-probability-bars');
    barContainer.innerHTML = '';
    (data.all_predictions || []).forEach(p => {
      const confNum = typeof p.confidence === 'number' ? Number(p.confidence).toFixed(1) : p.confidence;
      const row = document.createElement('div');
      row.className = 'probability-bar-row';
      row.innerHTML = `
        <div class="prob-label-row">
          <span>${p.class}</span>
          <span style="font-family: var(--font-mono); color: var(--accent-cyan);">${confNum}%</span>
        </div>
        <div class="prob-track">
          <div class="prob-fill" style="width: ${confNum}%"></div>
        </div>
      `;
      barContainer.appendChild(row);
    });
  };

  // QuickDraw Battle Game
  const challengeBox = container.querySelector('#challenge-status-box');
  container.querySelector('#btn-start-challenge').addEventListener('click', () => {
    const classes = quest.interactiveConfig.classes;
    const target = classes[Math.floor(Math.random() * classes.length)];
    state.challengeTarget = target;
    state.challengeCountdown = 20;

    challengeBox.style.display = 'block';
    challengeBox.innerHTML = `🎯 <strong>QuickDraw Challenge:</strong> Draw a <strong>${target}</strong> in <span id="timer-sec">${state.challengeCountdown}</span>s!`;

    clearInterval(state.challengeTimerId);
    state.challengeTimerId = setInterval(() => {
      state.challengeCountdown -= 1;
      const secEl = challengeBox.querySelector('#timer-sec');
      if (secEl) secEl.textContent = state.challengeCountdown;

      if (state.challengeCountdown <= 0) {
        clearInterval(state.challengeTimerId);
        challengeBox.innerHTML = `⏰ Time's up! Try again to conquer the challenge.`;
      }
    }, 1000);
  });

  const checkChallenge = (data) => {
    if (state.challengeTarget && data.top_class === state.challengeTarget && data.confidence >= 60) {
      clearInterval(state.challengeTimerId);
      challengeBox.innerHTML = `🏆 <strong>VICTORY!</strong> DoodleVision AI recognized your <strong>${state.challengeTarget}</strong> with ${data.confidence}% confidence! (+150 XP)`;
      state.challengeTarget = null;
      awardXp(150);
    }
  };

  // Training Studio Logic
  const fetchTrainingStatus = async () => {
    if (!state.backendOnline) return;
    try {
      const res = await fetch(`${state.backendUrl}/api/status`);
      if (res.ok) {
        const d = await res.json();
        if (d.history && d.history.length > 0) {
          const last = d.history[d.history.length - 1];
          container.querySelector('#train-stat-epoch').textContent = last.epoch;
          container.querySelector('#train-stat-loss').textContent = last.loss.toFixed(4);
        }
      }
    } catch {}
  };

  container.querySelector('#train-lr-slider').addEventListener('input', (e) => {
    container.querySelector('#train-lr-val').textContent = e.target.value;
  });

  const runTrainStep = async (epochs) => {
    const lr = parseFloat(container.querySelector('#train-lr-slider').value) || 0.003;
    const logBox = container.querySelector('#training-log-box');
    logBox.innerHTML += `<div>⏳ Training ${epochs} epoch(s) on PyTorch CNN (lr=${lr})...</div>`;
    logBox.scrollTop = logBox.scrollHeight;

    const btn1 = container.querySelector('#btn-train-1-epoch');
    const btn5 = container.querySelector('#btn-train-5-epochs');
    btn1.disabled = true; btn5.disabled = true;

    try {
      if (state.backendOnline) {
        const res = await fetch(`${state.backendUrl}/api/train_step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ epochs, learning_rate: lr })
        });
        const data = await res.json();
        if (data.success) {
          container.querySelector('#train-stat-epoch').textContent = data.current_epoch;
          container.querySelector('#train-stat-loss').textContent = data.loss.toFixed(4);
          container.querySelector('#train-stat-acc').textContent = `${data.accuracy}%`;

          logBox.innerHTML += `<div style="color: #34d399;">✓ Epoch ${data.current_epoch} complete: Loss = ${data.loss.toFixed(4)}, Train Accuracy = ${data.accuracy}%</div>`;
          awardXp(epochs * 25);
          triggerPrediction();
        } else {
          logBox.innerHTML += `<div style="color: #f87171;">❌ Training failed: ${data.error}</div>`;
        }
      } else {
        logBox.innerHTML += `<div style="color: #facc15;">⚠️ Start Python backend (uvicorn) to run real PyTorch GPU/CPU training!</div>`;
      }
    } catch (err) {
      logBox.innerHTML += `<div style="color: #f87171;">❌ Error: ${err.message}</div>`;
    } finally {
      btn1.disabled = false; btn5.disabled = false;
      logBox.scrollTop = logBox.scrollHeight;
    }
  };

  container.querySelector('#btn-train-1-epoch').addEventListener('click', () => runTrainStep(1));
  container.querySelector('#btn-train-5-epochs').addEventListener('click', () => runTrainStep(5));

  container.querySelector('#btn-reset-weights').addEventListener('click', async () => {
    const logBox = container.querySelector('#training-log-box');
    if (state.backendOnline) {
      try {
        const res = await fetch(`${state.backendUrl}/api/reset_model`, { method: 'POST' });
        const data = await res.json();
        container.querySelector('#train-stat-epoch').textContent = '0';
        container.querySelector('#train-stat-loss').textContent = '1.6094';
        container.querySelector('#train-stat-acc').textContent = '20.0%';
        logBox.innerHTML += `<div style="color: #fca5a5;">⚠️ Model reset to random weights. Predictions are now untrained! Test drawing on the canvas.</div>`;
        triggerPrediction();
      } catch (err) {
        logBox.innerHTML += `<div style="color: #f87171;">❌ Reset error: ${err.message}</div>`;
      }
    } else {
      logBox.innerHTML += `<div style="color: #fca5a5;">⚠️ Reset simulated.</div>`;
    }
    logBox.scrollTop = logBox.scrollHeight;
  });

  // Model Export buttons
  const btnExportWeights = container.querySelector('#btn-export-weights');
  const btnExportScript = container.querySelector('#btn-export-script');

  if (btnExportWeights) {
    btnExportWeights.addEventListener('click', () => {
      window.open(`${state.backendUrl}/api/export_weights`, '_blank');
    });
  }
  if (btnExportScript) {
    btnExportScript.addEventListener('click', () => {
      window.open(`${state.backendUrl}/api/export_script`, '_blank');
    });
  }

  // Initial call
  triggerPrediction();
}

// --- WIDGET 5: The Convolution Kernel Detective ---
const KERNEL_PRESETS = {
  sobel_h: {
    name: 'Sobel Horizontal',
    icon: '🧭',
    matrix: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
    desc: 'Detects horizontal boundaries by contrasting bottom row with top row.'
  },
  sobel_v: {
    name: 'Sobel Vertical',
    icon: '🧭',
    matrix: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    desc: 'Detects vertical borders by contrasting right column with left column.'
  },
  ridge: {
    name: 'Laplacian Ridge',
    icon: '⚡',
    matrix: [[0, 1, 0], [1, -4, 1], [0, 1, 0]],
    desc: 'High response on rapid multidirectional pixel contrast (edge outline).'
  },
  sharpen: {
    name: 'Sharpen',
    icon: '🗡️',
    matrix: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    desc: 'Boosts high frequencies by subtracting local blur from the center pixel.'
  },
  blur: {
    name: 'Gaussian Blur',
    icon: '🌫️',
    matrix: [[0.0625, 0.125, 0.0625], [0.125, 0.25, 0.125], [0.0625, 0.125, 0.0625]],
    desc: 'Distance-weighted neighborhood averaging that smooths high-frequency noise.'
  },
  emboss: {
    name: 'Emboss (3D)',
    icon: '💎',
    matrix: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]],
    desc: 'Simulates top-left directional lighting, giving an embossed 3D relief.'
  },
  identity: {
    name: 'Identity',
    icon: '🔘',
    matrix: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
    desc: 'Transfers pixels 1:1 without alteration.'
  }
};

function renderKernelDetectiveWidget(quest) {
  const container = document.createElement('div');
  container.className = 'kernel-detective-container';

  container.innerHTML = `
    <!-- Top Dimensions Banner -->
    <div class="kernel-dimension-banner">
      <div class="dim-badge-group">
        <div class="dim-badge">
          <span class="dim-label">Input Tensor:</span>
          <span class="dim-val" id="kernel-dim-in">1 × 28 × 28</span>
        </div>
        <div class="dim-op">➔ [ Conv2D: 3×3 Kernel ] ➔</div>
        <div class="dim-badge active">
          <span class="dim-label">Output Feature Map:</span>
          <span class="dim-val" id="kernel-dim-out">1 × 28 × 28</span>
        </div>
      </div>
      <div class="dim-formula-tag" id="kernel-formula-tag">
        Formula: ⌊(28 - 3 + 2×1)/1⌋ + 1 = 28
      </div>
    </div>

    <!-- 3-Column Detective Layout -->
    <div class="kernel-detective-grid">
      <!-- Col 1: 3x3 Weights & Presets -->
      <div class="kernel-col-controls">
        <div class="kernel-panel-header">
          <span>🎛️ 3×3 Kernel Stencil</span>
          <span class="kernel-active-tag" id="kernel-active-tag">Sobel Horizontal</span>
        </div>

        <!-- Presets Buttons -->
        <div class="kernel-presets-shelf">
          <div class="kernel-section-label">Legendary Filter Presets:</div>
          <div class="kernel-presets-grid" id="kernel-presets-grid">
            <button class="btn-kernel-preset active" data-preset="sobel_h" title="Detects horizontal edges">Sobel H 🧭</button>
            <button class="btn-kernel-preset" data-preset="sobel_v" title="Detects vertical borders">Sobel V 🧭</button>
            <button class="btn-kernel-preset" data-preset="ridge" title="Detects outlines in all directions">Laplacian ⚡</button>
            <button class="btn-kernel-preset" data-preset="sharpen" title="Sharpens transitions">Sharpen 🗡️</button>
            <button class="btn-kernel-preset" data-preset="blur" title="Smooths noise">Gaussian 🌫️</button>
            <button class="btn-kernel-preset" data-preset="emboss" title="3D relief effect">Emboss 💎</button>
            <button class="btn-kernel-preset" data-preset="identity" title="Passthrough center">Identity 🔘</button>
            <button class="btn-kernel-preset" data-preset="random" title="Random weight initialization">Random 🧪</button>
          </div>
        </div>

        <!-- 3x3 Matrix Grid -->
        <div class="kernel-matrix-card">
          <div class="kernel-section-label" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Interactive Weights (K):</span>
            <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">Hover / edit any cell</span>
          </div>
          <div class="kernel-matrix-grid" id="kernel-matrix-grid">
            <!-- 9 cells generated by script -->
          </div>
        </div>

        <!-- Hyperparameters Box -->
        <div class="kernel-hyperparams-card">
          <div class="kernel-section-label">Convolution Hyperparameters:</div>
          
          <div class="kernel-param-row">
            <span class="param-name">Stride (S):</span>
            <div class="param-segmented-ctrl" id="kernel-stride-ctrl">
              <button class="param-btn active" data-val="1">1 (Pixel-by-Pixel)</button>
              <button class="param-btn" data-val="2">2 (Downsample 2×)</button>
            </div>
          </div>

          <div class="kernel-param-row">
            <span class="param-name">Padding (P):</span>
            <div class="param-segmented-ctrl" id="kernel-padding-ctrl">
              <button class="param-btn active" data-val="same">Same (P=1)</button>
              <button class="param-btn" data-val="valid">Valid (P=0)</button>
            </div>
          </div>

          <div class="kernel-param-row">
            <span class="param-name">Activation:</span>
            <div class="param-segmented-ctrl" id="kernel-act-ctrl">
              <button class="param-btn active" data-val="none">Linear (Raw)</button>
              <button class="param-btn" data-val="relu">ReLU (max(0, x))</button>
            </div>
          </div>

          <div class="kernel-param-row">
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 0.2rem;">
              <span class="param-name">Bias Offset:</span>
              <span id="kernel-bias-val" style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 0.8rem;">0.0</span>
            </div>
            <input type="range" id="kernel-bias-slider" min="-100" max="100" value="0" step="5" class="cyber-slider" style="width: 100%;" />
          </div>
        </div>
      </div>

      <!-- Col 2: Input Canvas & Magnifier -->
      <div class="kernel-col-canvas">
        <div class="kernel-panel-header">
          <span>🖼️ Input Image (28×28)</span>
          <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">Hover / Drag Reticle</span>
        </div>

        <!-- Pattern selector -->
        <div class="pattern-pill-group" id="kernel-pattern-group">
          <button class="pattern-pill-btn active" data-pattern="shapes">Shapes ⭕</button>
          <button class="pattern-pill-btn" data-pattern="checkerboard">Checker 🏁</button>
          <button class="pattern-pill-btn" data-pattern="star">Star 🌟</button>
          <button class="pattern-pill-btn" data-pattern="cat">Cat 🐱</button>
          <button class="pattern-pill-btn" data-pattern="draw">Draw ✍️</button>
        </div>

        <!-- Input Canvas Wrapper with Overlaid Magnifier Reticle -->
        <div class="canvas-reticle-wrapper" id="canvas-reticle-wrapper">
          <canvas id="kernel-input-canvas" width="28" height="28" class="kernel-pixel-canvas"></canvas>
          <div class="kernel-reticle-box" id="kernel-reticle-box">
            <div class="reticle-corner tl"></div>
            <div class="reticle-corner tr"></div>
            <div class="reticle-corner bl"></div>
            <div class="reticle-corner br"></div>
            <div class="reticle-center-dot"></div>
          </div>
        </div>

        <div class="canvas-sub-actions">
          <span style="font-size: 0.72rem; color: var(--text-muted);">Reticle Focus: <strong id="reticle-coord-text" style="color: var(--accent-amber); font-family: var(--font-mono);">(X: 14, Y: 14)</strong></span>
          <button class="btn-clear-canvas" id="btn-clear-kernel-draw" style="display: none; padding: 0.2rem 0.6rem; font-size: 0.72rem;">Clear</button>
        </div>
      </div>

      <!-- Col 3: Convolved Feature Map & Live Dot Product Math -->
      <div class="kernel-col-math">
        <div class="kernel-panel-header">
          <span>✨ Output Feature Map</span>
          <span id="output-canvas-res" style="font-size: 0.72rem; color: var(--accent-cyan); font-family: var(--font-mono);">28×28</span>
        </div>

        <!-- Output Canvas Wrapper -->
        <div class="output-canvas-wrapper" id="output-canvas-wrapper">
          <canvas id="kernel-output-canvas" width="28" height="28" class="kernel-pixel-canvas"></canvas>
          <div class="output-reticle-dot" id="output-reticle-dot"></div>
        </div>

        <!-- Live Dot Product Arithmetic Breakdown Card -->
        <div class="kernel-math-card">
          <div class="math-card-header">
            <span class="math-card-title">🔬 Live Dot-Product Arithmetic</span>
            <span class="math-card-cell-badge" id="math-output-cell-badge">Out[14, 14]</span>
          </div>

          <div class="math-formula-box">
            <div class="math-formula-row">
              <span class="math-sym">y</span> = <span class="math-fn" id="math-fn-label">Linear</span>( <span class="math-sigma">∑</span> (P<sub>i,j</sub> × K<sub>i,j</sub>) + Bias )
            </div>
          </div>

          <!-- 3x3 calculation mini-table -->
          <div class="math-matrix-comparison">
            <div class="math-matrix-col">
              <div class="math-col-label">Pixels (P)</div>
              <div class="math-mini-grid" id="math-mini-pixels"></div>
            </div>
            <div class="math-matrix-op">×</div>
            <div class="math-matrix-col">
              <div class="math-col-label">Kernel (K)</div>
              <div class="math-mini-grid" id="math-mini-kernel"></div>
            </div>
            <div class="math-matrix-op">=</div>
            <div class="math-matrix-col">
              <div class="math-col-label">Product</div>
              <div class="math-mini-grid" id="math-mini-product"></div>
            </div>
          </div>

          <div class="math-sum-breakdown">
            <div class="math-sum-row">
              <span>Dot Product Sum:</span>
              <strong id="math-sum-val" style="color: var(--accent-cyan); font-family: var(--font-mono);">0.0</strong>
            </div>
            <div class="math-sum-row">
              <span>After Activation:</span>
              <strong id="math-act-val" style="color: #34d399; font-family: var(--font-mono);">0.0</strong>
            </div>
          </div>

          <div class="math-insight-callout" id="math-insight-callout">
            Hover over any pixel in the input image to see how its 3×3 neighborhood multiplies against the kernel weights!
          </div>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // References
  const inCanvas = container.querySelector('#kernel-input-canvas');
  const inCtx = inCanvas.getContext('2d');
  const outCanvas = container.querySelector('#kernel-output-canvas');
  const outCtx = outCanvas.getContext('2d');
  const reticleBox = container.querySelector('#kernel-reticle-box');
  const outputDot = container.querySelector('#output-reticle-dot');
  const canvasWrapper = container.querySelector('#canvas-reticle-wrapper');
  const matrixGrid = container.querySelector('#kernel-matrix-grid');
  const biasSlider = container.querySelector('#kernel-bias-slider');
  const biasVal = container.querySelector('#kernel-bias-val');
  const activeTag = container.querySelector('#kernel-active-tag');
  const coordText = container.querySelector('#reticle-coord-text');
  const btnClearDraw = container.querySelector('#btn-clear-kernel-draw');

  // Dimension elements
  const dimOut = container.querySelector('#kernel-dim-out');
  const formulaTag = container.querySelector('#kernel-formula-tag');
  const outputRes = container.querySelector('#output-canvas-res');

  // Math breakdown elements
  const miniPixels = container.querySelector('#math-mini-pixels');
  const miniKernel = container.querySelector('#math-mini-kernel');
  const miniProduct = container.querySelector('#math-mini-product');
  const mathSumVal = container.querySelector('#math-sum-val');
  const mathActVal = container.querySelector('#math-act-val');
  const mathCellBadge = container.querySelector('#math-output-cell-badge');
  const mathFnLabel = container.querySelector('#math-fn-label');
  const mathInsight = container.querySelector('#math-insight-callout');

  // Internal 28x28 pixel buffer (0..255)
  const inputGrid = Array.from({ length: 28 }, () => new Float32Array(28));
  let outputGrid = [];
  let isFreeDrawing = false;

  // --- Draw Pattern ---
  function drawPattern(pattern) {
    state.kernelPattern = pattern;
    inCtx.fillStyle = '#000000';
    inCtx.fillRect(0, 0, 28, 28);
    inCtx.strokeStyle = '#ffffff';
    inCtx.fillStyle = '#ffffff';

    if (pattern === 'shapes') {
      // Circle at top-left
      inCtx.beginPath();
      inCtx.arc(9, 9, 5, 0, Math.PI * 2);
      inCtx.fill();
      // Square at bottom-right
      inCtx.fillRect(15, 15, 9, 9);
      // Diagonal stripe
      inCtx.lineWidth = 2;
      inCtx.beginPath();
      inCtx.moveTo(2, 26);
      inCtx.lineTo(26, 2);
      inCtx.stroke();
    } else if (pattern === 'checkerboard') {
      const tileSize = 7;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if ((r + c) % 2 === 0) {
            inCtx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
          }
        }
      }
    } else if (pattern === 'star') {
      const cx = 14, cy = 14, spikes = 5, outerR = 10, innerR = 4;
      let rot = Math.PI / 2 * 3;
      let step = Math.PI / spikes;
      inCtx.beginPath();
      inCtx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerR;
        let y = cy + Math.sin(rot) * outerR;
        inCtx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerR;
        y = cy + Math.sin(rot) * innerR;
        inCtx.lineTo(x, y);
        rot += step;
      }
      inCtx.lineTo(cx, cy - outerR);
      inCtx.closePath();
      inCtx.fill();
    } else if (pattern === 'cat') {
      // Cat head silhouette
      inCtx.beginPath();
      inCtx.arc(14, 16, 8, 0, Math.PI * 2);
      inCtx.fill();
      // Left ear
      inCtx.beginPath();
      inCtx.moveTo(7, 13);
      inCtx.lineTo(7, 5);
      inCtx.lineTo(13, 10);
      inCtx.fill();
      // Right ear
      inCtx.beginPath();
      inCtx.moveTo(21, 13);
      inCtx.lineTo(21, 5);
      inCtx.lineTo(15, 10);
      inCtx.fill();
      // Whiskers
      inCtx.lineWidth = 1;
      inCtx.beginPath();
      inCtx.moveTo(4, 16); inCtx.lineTo(10, 16);
      inCtx.moveTo(4, 19); inCtx.lineTo(10, 18);
      inCtx.moveTo(18, 16); inCtx.lineTo(24, 16);
      inCtx.moveTo(18, 18); inCtx.lineTo(24, 19);
      inCtx.stroke();
    } else if (pattern === 'draw') {
      // Clear for drawing
      btnClearDraw.style.display = 'inline-block';
    }

    if (pattern !== 'draw') {
      btnClearDraw.style.display = 'none';
    }

    // Read back pixel intensities
    const imgData = inCtx.getImageData(0, 0, 28, 28);
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        inputGrid[y][x] = imgData.data[(y * 28 + x) * 4];
      }
    }

    runConvolution();
  }

  // --- Render 3x3 Matrix Grid Inputs ---
  function renderMatrixInputs() {
    matrixGrid.innerHTML = '';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const val = state.kernelWeights[r][c];
        const input = document.createElement('input');
        input.type = 'number';
        input.step = 'any';
        input.className = 'kernel-cell-input';
        input.value = typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(3)) : val;
        input.title = `Weight K[${r}, ${c}]`;

        input.addEventListener('input', (e) => {
          const num = parseFloat(e.target.value) || 0;
          state.kernelWeights[r][c] = num;
          state.kernelActivePreset = 'custom';
          activeTag.textContent = 'Custom Kernel';
          container.querySelectorAll('.btn-kernel-preset').forEach(b => b.classList.remove('active'));
          runConvolution();
        });

        matrixGrid.appendChild(input);
      }
    }
  }

  // --- 2D Convolution Engine ---
  function runConvolution() {
    const K = state.kernelWeights;
    const S = state.kernelStride;
    const isSame = state.kernelPadding === 'same';
    const P = isSame ? 1 : 0;
    const bias = state.kernelBias;
    const isRelu = state.kernelActivation === 'relu';

    mathFnLabel.textContent = isRelu ? 'ReLU' : 'Linear';

    // Dimension Formula: Out = floor((In - Kernel + 2*Pad)/Stride) + 1
    const outW = Math.floor((28 - 3 + 2 * P) / S) + 1;
    const outH = Math.floor((28 - 3 + 2 * P) / S) + 1;

    dimOut.textContent = `1 × ${outW} × ${outH}`;
    formulaTag.textContent = `Formula: ⌊(28 - 3 + 2×${P})/${S}⌋ + 1 = ${outW}`;
    outputRes.textContent = `${outW}×${outH}`;

    // Prepare padded grid of size (28 + 2P) x (28 + 2P)
    const padSize = 28 + 2 * P;
    const padded = Array.from({ length: padSize }, () => new Float32Array(padSize));

    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        padded[y + P][x + P] = inputGrid[y][x];
      }
    }

    // Allocate outputGrid
    outputGrid = Array.from({ length: outH }, () => new Float32Array(outW));
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let outY = 0; outY < outH; outY++) {
      for (let outX = 0; outX < outW; outX++) {
        const startY = outY * S;
        const startX = outX * S;
        let sum = 0;

        for (let kr = 0; kr < 3; kr++) {
          for (let kc = 0; kc < 3; kc++) {
            sum += K[kr][kc] * padded[startY + kr][startX + kc];
          }
        }
        sum += bias;
        const actVal = isRelu ? Math.max(0, sum) : sum;
        outputGrid[outY][outX] = actVal;

        if (actVal < minVal) minVal = actVal;
        if (actVal > maxVal) maxVal = actVal;
      }
    }

    // Render to output canvas
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outImgData = outCtx.createImageData(outW, outH);

    const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal), 1.0);

    for (let y = 0; y < outH; y++) {
      for (let x = 0; x < outW; x++) {
        const val = outputGrid[y][x];
        const idx = (y * outW + x) * 4;

        if (isRelu) {
          // ReLU: 0 is dark background, positive lights up vibrant cyan-gold
          const norm = Math.min(255, Math.floor((val / absMax) * 255));
          outImgData.data[idx] = Math.floor(norm * 0.4);     // R
          outImgData.data[idx + 1] = Math.floor(norm * 0.9); // G
          outImgData.data[idx + 2] = norm;                   // B
          outImgData.data[idx + 3] = 255;
        } else {
          // Linear: positive = cyan/green, negative = violet/rose
          if (val >= 0) {
            const norm = Math.min(255, Math.floor((val / absMax) * 255));
            outImgData.data[idx] = Math.floor(norm * 0.1);
            outImgData.data[idx + 1] = Math.floor(norm * 0.85);
            outImgData.data[idx + 2] = norm;
            outImgData.data[idx + 3] = 255;
          } else {
            const norm = Math.min(255, Math.floor((-val / absMax) * 255));
            outImgData.data[idx] = norm;
            outImgData.data[idx + 1] = Math.floor(norm * 0.2);
            outImgData.data[idx + 2] = Math.floor(norm * 0.4);
            outImgData.data[idx + 3] = 255;
          }
        }
      }
    }

    outCtx.putImageData(outImgData, 0, 0);

    // Update live math inspector at active focus coordinate
    updateMathInspector();
  }

  // --- Live Math Inspector ---
  function updateMathInspector() {
    const { x, y } = state.kernelInspectCoord;
    const S = state.kernelStride;
    const isSame = state.kernelPadding === 'same';
    const P = isSame ? 1 : 0;
    const K = state.kernelWeights;
    const bias = state.kernelBias;
    const isRelu = state.kernelActivation === 'relu';

    // Position of reticle on screen
    const rect = inCanvas.getBoundingClientRect();
    const cellW = rect.width / 28;
    const cellH = rect.height / 28;

    reticleBox.style.left = `${(x - 1) * cellW}px`;
    reticleBox.style.top = `${(y - 1) * cellH}px`;
    reticleBox.style.width = `${3 * cellW}px`;
    reticleBox.style.height = `${3 * cellH}px`;

    coordText.textContent = `(X: ${x}, Y: ${y})`;

    // Check corresponding output cell
    let outX = null, outY = null;
    const padX = x + P;
    const padY = y + P;

    if (P === 1) {
      if (x % S === 0 && y % S === 0) {
        outX = Math.floor(x / S);
        outY = Math.floor(y / S);
      }
    } else {
      if ((x - 1) >= 0 && (y - 1) >= 0 && (x - 1) % S === 0 && (y - 1) % S === 0) {
        outX = Math.floor((x - 1) / S);
        outY = Math.floor((y - 1) / S);
      }
    }

    const outW = Math.floor((28 - 3 + 2 * P) / S) + 1;
    const outH = Math.floor((28 - 3 + 2 * P) / S) + 1;

    if (outX !== null && outY !== null && outX < outW && outY < outH) {
      mathCellBadge.textContent = `Out[${outY}, ${outX}]`;
      const outRect = outCanvas.getBoundingClientRect();
      const outCellW = outRect.width / outW;
      const outCellH = outRect.height / outH;
      outputDot.style.display = 'block';
      outputDot.style.left = `${outX * outCellW}px`;
      outputDot.style.top = `${outY * outCellH}px`;
      outputDot.style.width = `${outCellW}px`;
      outputDot.style.height = `${outCellH}px`;
    } else {
      mathCellBadge.textContent = `Skipped by Stride/Valid`;
      outputDot.style.display = 'none';
    }

    // Extract 3x3 pixel values around (x, y)
    miniPixels.innerHTML = '';
    miniKernel.innerHTML = '';
    miniProduct.innerHTML = '';

    let sum = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const curY = y - 1 + r;
        const curX = x - 1 + c;
        let pVal = 0;
        if (curY >= 0 && curY < 28 && curX >= 0 && curX < 28) {
          pVal = inputGrid[curY][curX];
        }
        const kVal = K[r][c];
        const prod = pVal * kVal;
        sum += prod;

        // Pixel cell
        const pCell = document.createElement('div');
        pCell.className = 'math-cell';
        pCell.textContent = Math.round(pVal);
        pCell.style.background = `rgba(255, 255, 255, ${Math.min(1, Math.max(0.08, pVal / 255))})`;
        if (pVal > 150) pCell.style.color = '#000';
        miniPixels.appendChild(pCell);

        // Kernel cell
        const kCell = document.createElement('div');
        kCell.className = 'math-cell';
        kCell.textContent = Number.isInteger(kVal) ? kVal : kVal.toFixed(2);
        if (kVal > 0) kCell.style.color = '#38bdf8';
        else if (kVal < 0) kCell.style.color = '#f43f5e';
        miniKernel.appendChild(kCell);

        // Product cell
        const prodCell = document.createElement('div');
        prodCell.className = 'math-cell';
        prodCell.textContent = Math.round(prod);
        if (prod > 0) prodCell.style.color = '#34d399';
        else if (prod < 0) prodCell.style.color = '#f87171';
        miniProduct.appendChild(prodCell);
      }
    }

    sum += bias;
    const finalVal = isRelu ? Math.max(0, sum) : sum;

    mathSumVal.textContent = sum.toFixed(1);
    mathActVal.textContent = finalVal.toFixed(1);

    // Contextual educational insight
    const presetKey = state.kernelActivePreset;
    if (presetKey === 'sobel_h') {
      if (Math.abs(sum) > 200) {
        mathInsight.innerHTML = `🧭 <strong>Strong Horizontal Edge!</strong> Notice how contrast between the top row and bottom row produces a high output gradient (${Math.round(sum)}).`;
      } else {
        mathInsight.innerHTML = `🧭 <strong>Uniform Area:</strong> Top and bottom rows cancel each other out (${Math.round(sum)}), indicating no horizontal edge here.`;
      }
    } else if (presetKey === 'sobel_v') {
      if (Math.abs(sum) > 200) {
        mathInsight.innerHTML = `🧭 <strong>Strong Vertical Edge!</strong> Notice how contrast between the left column and right column lights up this filter (${Math.round(sum)}).`;
      } else {
        mathInsight.innerHTML = `🧭 <strong>Uniform Area:</strong> Left and right columns balance out to near zero (${Math.round(sum)}).`;
      }
    } else if (presetKey === 'blur') {
      mathInsight.innerHTML = `🌫️ <strong>Gaussian Smoothing:</strong> All weights are positive fractions summing to 1.0. Output (${Math.round(finalVal)}) is the weighted local average!`;
    } else if (presetKey === 'ridge') {
      mathInsight.innerHTML = `⚡ <strong>Laplacian Ridge:</strong> The center is contrasted against all four cardinal neighbors to detect outlines in every direction.`;
    } else {
      mathInsight.innerHTML = `💡 <strong>3×3 Dot Product:</strong> Output = (${Math.round(sum - bias)} dot product) + (${bias} bias) ${isRelu ? '➔ ReLU: ' + Math.round(finalVal) : ''}.`;
    }
  }

  // --- Interaction: Reticle Drag / Hover ---
  function handleCanvasPointer(e) {
    const rect = inCanvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const pixelX = Math.floor(normX * 28);
    const pixelY = Math.floor(normY * 28);

    state.kernelInspectCoord = {
      x: Math.max(0, Math.min(27, pixelX)),
      y: Math.max(0, Math.min(27, pixelY))
    };

    if (state.kernelPattern === 'draw' && isFreeDrawing) {
      inCtx.fillStyle = '#ffffff';
      inCtx.beginPath();
      inCtx.arc(pixelX, pixelY, 1.5, 0, Math.PI * 2);
      inCtx.fill();

      // Update inputGrid
      const imgData = inCtx.getImageData(0, 0, 28, 28);
      for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 28; x++) {
          inputGrid[y][x] = imgData.data[(y * 28 + x) * 4];
        }
      }
      runConvolution();
    } else {
      updateMathInspector();
    }
  }

  canvasWrapper.addEventListener('mousemove', handleCanvasPointer);
  canvasWrapper.addEventListener('mousedown', (e) => {
    isFreeDrawing = true;
    handleCanvasPointer(e);
  });
  window.addEventListener('mouseup', () => { isFreeDrawing = false; });

  // Touch support
  canvasWrapper.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleCanvasPointer(e);
  }, { passive: false });

  // --- Presets Click ---
  container.querySelectorAll('.btn-kernel-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      container.querySelectorAll('.btn-kernel-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (presetKey === 'random') {
        state.kernelActivePreset = 'random';
        activeTag.textContent = 'Random Filter';
        state.kernelWeights = Array.from({ length: 3 }, () =>
          Array.from({ length: 3 }, () => parseFloat((Math.random() * 2 - 1).toFixed(2)))
        );
      } else {
        const p = KERNEL_PRESETS[presetKey];
        if (p) {
          state.kernelActivePreset = presetKey;
          activeTag.textContent = p.name;
          state.kernelWeights = p.matrix.map(row => [...row]);
        }
      }

      awardXp(15);
      renderMatrixInputs();
      runConvolution();
    });
  });

  // --- Patterns Click ---
  container.querySelectorAll('.pattern-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pattern-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      drawPattern(btn.dataset.pattern);
    });
  });

  btnClearDraw.addEventListener('click', () => {
    inCtx.fillStyle = '#000000';
    inCtx.fillRect(0, 0, 28, 28);
    for (let y = 0; y < 28; y++) inputGrid[y].fill(0);
    runConvolution();
  });

  // --- Hyperparams Segmented Controls ---
  // Stride
  container.querySelectorAll('#kernel-stride-ctrl .param-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#kernel-stride-ctrl .param-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.kernelStride = parseInt(btn.dataset.val, 10);
      runConvolution();
    });
  });

  // Padding
  container.querySelectorAll('#kernel-padding-ctrl .param-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#kernel-padding-ctrl .param-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.kernelPadding = btn.dataset.val;
      runConvolution();
    });
  });

  // Activation
  container.querySelectorAll('#kernel-act-ctrl .param-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#kernel-act-ctrl .param-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.kernelActivation = btn.dataset.val;
      runConvolution();
    });
  });

  // Bias slider
  biasSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.kernelBias = val;
    biasVal.textContent = val.toFixed(1);
    runConvolution();
  });

  // Initial draw
  renderMatrixInputs();
  drawPattern('shapes');
}

// --- PYTHON CODE RUNNER & TERMINAL ---
function setupCodeLab() {
  dom.btnRunCode.addEventListener('click', async () => {
    const code = dom.codeEditorArea.value;
    dom.terminalOutput.textContent = '⏳ Executing snippet in Python engine...';
    dom.btnRunCode.disabled = true;

    try {
      if (state.backendOnline) {
        const res = await fetch(`${state.backendUrl}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (data.success) {
          dom.terminalOutput.textContent = data.output || '✓ Code executed with no stdout.';
          awardXp(25);
        } else {
          dom.terminalOutput.textContent = `❌ Execution Error:\n${data.error}`;
        }
      } else {
        // Simulated local fallback
        await new Promise(r => setTimeout(r, 600));
        dom.terminalOutput.textContent = `[Local Engine Simulation]\n✓ Execution simulated successfully.\n(Start Python backend: uvicorn server.main:app to run live PyTorch)`;
        awardXp(25);
      }
    } catch (err) {
      dom.terminalOutput.textContent = `❌ Communication Error: ${err.message}`;
    } finally {
      dom.btnRunCode.disabled = false;
    }
  });

  dom.btnResetCode.addEventListener('click', () => {
    const quest = getActiveQuest();
    dom.codeEditorArea.value = quest.codeSnippet;
  });

  dom.btnClearTerminal.addEventListener('click', () => {
    dom.terminalOutput.textContent = '// Terminal cleared.';
  });
}

// --- QUIZ COMPONENT ---
function renderQuiz(quest) {
  dom.quizContainer.innerHTML = '';

  if (!quest.quiz || quest.quiz.length === 0) {
    dom.quizContainer.innerHTML = `<p style="color: var(--text-muted);">No quiz for this quest.</p>`;
    return;
  }

  quest.quiz.forEach((q, qIdx) => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="quiz-question-title">${qIdx + 1}. ${q.question}</div>
      <div class="quiz-options-list" id="opts-${qIdx}"></div>
      <div class="quiz-feedback" id="feedback-${qIdx}"></div>
    `;

    const optsContainer = card.querySelector(`#opts-${qIdx}`);
    const feedbackEl = card.querySelector(`#feedback-${qIdx}`);

    q.options.forEach((optText, optIdx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = optText;

      btn.addEventListener('click', () => {
        // Disable other options in this question
        optsContainer.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);

        if (optIdx === q.answer) {
          btn.classList.add('correct');
          feedbackEl.style.display = 'block';
          feedbackEl.style.background = 'rgba(16, 185, 129, 0.2)';
          feedbackEl.style.color = '#34d399';
          feedbackEl.innerHTML = `✓ <strong>Correct!</strong> ${q.explanation}`;
          awardXp(50);
          state.completedQuests.add(quest.id);
          localStorage.setItem('nq_completed_quests', JSON.stringify([...state.completedQuests]));
          renderQuestList();
        } else {
          btn.classList.add('wrong');
          feedbackEl.style.display = 'block';
          feedbackEl.style.background = 'rgba(244, 63, 94, 0.2)';
          feedbackEl.style.color = '#f87171';
          feedbackEl.innerHTML = `✗ <strong>Not quite!</strong> ${q.explanation}`;
        }
      });

      optsContainer.appendChild(btn);
    });

    dom.quizContainer.appendChild(card);
  });
}

// --- AI TUTOR (SENSEI TENSOR DOJO) MODAL ---
const CHAT_STORAGE_KEY = 'nq_chat_history';

const questPrompts = {
  'quest-1': [
    { label: '☕ Why weights act like knobs?', prompt: 'Explain why weights act like volume knobs on coffee ingredients with a playful metaphor.' },
    { label: '☕ How does bias shift the zero point?', prompt: 'Why do we need a bias term even if all coffee ingredients are zero?' },
    { label: '🐍 Code a 3-input neuron', prompt: 'Show me how to code a single artificial neuron with 3 inputs and a bias in clean Python NumPy.' },
    { label: '🎯 Quiz me on Quest 1', prompt: 'Give me a quick 1-question quiz about weights and bias to test my intuition!' }
  ],
  'quest-2': [
    { label: '⚡ Why can\'t linear layers solve XOR?', prompt: 'Why can\'t a single straight line separate diagonal XOR dots without an activation function?' },
    { label: '⚡ When to use ReLU vs Sigmoid?', prompt: 'When should I use ReLU versus Sigmoid or Tanh in neural networks?' },
    { label: '⚡ What is the dying ReLU problem?', prompt: 'Explain what happens when a neuron gets stuck outputting 0 with ReLU.' },
    { label: '🎯 Quiz me on Quest 2', prompt: 'Give me a quick pop quiz on activation functions and non-linearity!' }
  ],
  'quest-3': [
    { label: '⛰️ Explain gradients with a mountain', prompt: 'Use a foggy mountain and rolling marbles to explain loss functions and gradient descent.' },
    { label: '⛰️ What is learning rate overshoot?', prompt: 'What happens mathematically and visually when the learning rate alpha is set too large?' },
    { label: '🐍 10 lines of PyTorch training', prompt: 'Write a complete 10-line PyTorch script demonstrating gradient descent optimization with loss.backward().' },
    { label: '🎯 Quiz me on Quest 3', prompt: 'Test me with a tricky question on learning rates and gradient descent!' }
  ],
  'quest-4': [
    { label: '🎨 How do 3x3 filters find edges?', prompt: 'How does sliding a 3x3 matrix across image pixels detect horizontal and vertical edges?' },
    { label: '🎨 Why use Max Pooling?', prompt: 'Why do CNNs downsample with MaxPool2d instead of just making images smaller beforehand?' },
    { label: '🎨 Explain DoodleCNN architecture', prompt: 'Break down the DoodleCNN architecture line-by-line: Conv2d -> ReLU -> MaxPool2d -> Linear.' },
    { label: '🎯 Quiz me on Convolutions', prompt: 'Give me a challenging question about CNN feature maps and pooling!' }
  ],
  'quest-5': [
    { label: '🔍 How does a Sobel filter find edges?', prompt: 'Explain how the Sobel 3x3 matrix detects horizontal and vertical edges by calculating gradient intensity across neighboring pixels.' },
    { label: '🔍 Explain Stride and Padding math', prompt: 'Walk through the formula for convolutional output dimensions: O = ((W - K + 2P)/S) + 1 with concrete examples.' },
    { label: '🔍 What makes Gaussian blur smooth images?', prompt: 'Why do the fractions in a Gaussian blur kernel sum to 1.0, and how does it reduce high-frequency image noise?' },
    { label: '🎯 Quiz me on Kernel Detective', prompt: 'Give me a challenging question about 3x3 convolution kernels, padding, and stride!' }
  ]
};

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStoredChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to parse chat history from localStorage', e);
    return [];
  }
}

function persistChatMessage(sender, text, time) {
  try {
    const history = getStoredChatHistory();
    const quest = getActiveQuest();
    history.push({
      sender,
      text,
      time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      questId: quest ? quest.id : null,
      timestamp: Date.now()
    });
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save chat message to localStorage', e);
  }
}

function enhanceCodeBlocks(containerEl) {
  if (!containerEl) return;
  const pres = containerEl.querySelectorAll('pre');
  pres.forEach(pre => {
    if (pre.parentElement.classList.contains('chat-code-block-wrapper')) return;

    const codeEl = pre.querySelector('code');
    const rawCode = (codeEl ? codeEl.textContent : pre.textContent).trim();
    const langMatch = codeEl ? codeEl.className.match(/language-(\w+)/) : null;
    const lang = langMatch ? langMatch[1] : 'python';

    const wrapper = document.createElement('div');
    wrapper.className = 'chat-code-block-wrapper';

    const header = document.createElement('div');
    header.className = 'chat-code-header';
    header.innerHTML = `
      <span class="chat-code-lang">${lang}</span>
      <div class="chat-code-actions">
        <button class="chat-code-btn btn-copy-code" title="Copy code">📋 Copy</button>
        <button class="chat-code-btn btn-send-lab" title="Load into Python Lab">▶ Send to Python Lab</button>
      </div>
    `;

    const copyBtn = header.querySelector('.btn-copy-code');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(rawCode).then(() => {
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 1800);
      });
    });

    const sendLabBtn = header.querySelector('.btn-send-lab');
    sendLabBtn.addEventListener('click', () => {
      dom.codeEditorArea.value = rawCode;
      dom.tabBtns.forEach(b => b.classList.remove('active'));
      dom.tabContents.forEach(c => c.classList.remove('active'));
      const codeTab = document.getElementById('tab-code-btn');
      const codeContent = document.getElementById('content-code');
      if (codeTab) codeTab.classList.add('active');
      if (codeContent) codeContent.classList.add('active');
      if (dom.aiTutorModal) dom.aiTutorModal.style.display = 'none';
      dom.codeEditorArea.focus();
      dom.codeEditorArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
}

function renderMessageBubble(sender, text, time = null, shouldScroll = true) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;

  const isAi = sender === 'ai';
  const avatar = isAi ? '🥋' : '🧑‍💻';
  const author = isAi ? 'Sensei Tensor' : 'You';
  const timestamp = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  bubble.innerHTML = `
    <div class="bubble-header">
      <span class="bubble-avatar">${avatar}</span>
      <span class="bubble-author">${author}</span>
      <span class="bubble-time">${timestamp}</span>
    </div>
    <div class="bubble-content">
      ${isAi ? marked.parse(text) : `<p>${escapeHtml(text)}</p>`}
    </div>
  `;

  if (isAi) {
    enhanceCodeBlocks(bubble.querySelector('.bubble-content'));
  }

  dom.tutorChatHistory.appendChild(bubble);
  if (shouldScroll) {
    dom.tutorChatHistory.scrollTop = dom.tutorChatHistory.scrollHeight;
  }
  return bubble;
}

function renderDefaultWelcomeMessage() {
  dom.tutorChatHistory.innerHTML = `
    <div class="chat-bubble ai">
      <div class="bubble-header">
        <span class="bubble-avatar">🥋</span>
        <span class="bubble-author">Sensei Tensor</span>
        <span class="bubble-time">Dojo Master</span>
      </div>
      <div class="bubble-content">
        <p>Osu! Welcome to the <strong>Sensei Tensor Dojo</strong> 🥋🧠.</p>
        <p>I am your dedicated Deep Learning mentor. Whether you're curious about how weights act like volume knobs, why non-linearity bends space, rolling marbles down gradient slopes, or debugging PyTorch convolutional layers, ask away!</p>
      </div>
    </div>
  `;
}

function loadStoredChatHistory() {
  const history = getStoredChatHistory();
  if (history && history.length > 0) {
    dom.tutorChatHistory.innerHTML = '';
    history.forEach(item => {
      renderMessageBubble(item.sender, item.text, item.time, false);
    });
    dom.tutorChatHistory.scrollTop = dom.tutorChatHistory.scrollHeight;
  } else {
    renderDefaultWelcomeMessage();
  }
}

function clearChatHistory() {
  localStorage.removeItem(CHAT_STORAGE_KEY);
  dom.tutorChatHistory.innerHTML = `
    <div class="chat-bubble ai">
      <div class="bubble-header">
        <span class="bubble-avatar">🥋</span>
        <span class="bubble-author">Sensei Tensor</span>
        <span class="bubble-time">Dojo Master</span>
      </div>
      <div class="bubble-content">
        <p>✨ <strong>Conversation cleared.</strong> Dojo memory reset!</p>
        <p>Ready for your next inquiry, Tensor Cadet! Try one of the suggested prompts below based on your current quest.</p>
      </div>
    </div>
  `;
  if (dom.btnClearChat) {
    const originalText = dom.btnClearChat.textContent;
    dom.btnClearChat.textContent = '✓ Cleared!';
    setTimeout(() => {
      dom.btnClearChat.textContent = originalText;
    }, 1800);
  }
}

function renderTutorChips() {
  if (!dom.tutorPresetChips) return;
  const quest = getActiveQuest();
  const chips = questPrompts[quest.id] || [
    { label: '💡 Explain like I\'m 10', prompt: 'Explain the current deep learning concept like I am 10 years old.' },
    { label: '🐍 Show Python snippet', prompt: 'Provide a clean, runnable Python snippet explaining this concept.' },
    { label: '🎯 Quiz Me (+XP)', prompt: 'Give me a quick pop quiz on deep learning!' }
  ];

  dom.tutorPresetChips.innerHTML = '';

  const tag = document.createElement('span');
  tag.className = 'chips-quest-tag';
  tag.innerHTML = `<span>${quest.icon} Quest ${quest.number} Suggestions:</span>`;
  dom.tutorPresetChips.appendChild(tag);

  chips.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = c.label;
    btn.title = `Ask: "${c.prompt}"`;
    btn.addEventListener('click', () => handleSend(c.prompt));
    dom.tutorPresetChips.appendChild(btn);
  });

  if (dom.tutorQuestContextPill) {
    dom.tutorQuestContextPill.textContent = `${quest.icon} Quest ${quest.number}: ${quest.title}`;
  }
  if (dom.tutorQuestSelect) {
    dom.tutorQuestSelect.value = quest.id;
  }
}

async function handleSend(customPrompt = null) {
  const prompt = customPrompt || (dom.tutorInputText ? dom.tutorInputText.value.trim() : '');
  if (!prompt) return;

  const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  renderMessageBubble('user', prompt, userTime);
  persistChatMessage('user', prompt, userTime);

  if (!customPrompt && dom.tutorInputText) dom.tutorInputText.value = '';

  const thinkingBubble = document.createElement('div');
  thinkingBubble.className = 'chat-bubble ai';
  thinkingBubble.innerHTML = `
    <div class="bubble-header">
      <span class="bubble-avatar">🥋</span>
      <span class="bubble-author">Sensei Tensor</span>
    </div>
    <div class="bubble-content">
      <em>Sensei Tensor is meditating on your query...</em>
    </div>
  `;
  dom.tutorChatHistory.appendChild(thinkingBubble);
  dom.tutorChatHistory.scrollTop = dom.tutorChatHistory.scrollHeight;

  const quest = getActiveQuest();
  const answer = await tutorService.ask(prompt, quest);

  thinkingBubble.remove();
  const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  renderMessageBubble('ai', answer, aiTime);
  persistChatMessage('ai', answer, aiTime);
}

function setupAiTutor() {
  // Load existing chat history from localStorage (or show welcome message)
  loadStoredChatHistory();

  const openModal = () => {
    renderTutorChips();
    updateTutorBadge();
    dom.aiTutorModal.style.display = 'flex';
    setTimeout(() => {
      if (dom.tutorInputText) dom.tutorInputText.focus();
    }, 100);
  };

  const closeModal = () => {
    dom.aiTutorModal.style.display = 'none';
  };

  // Triggers
  dom.btnToggleTutor.addEventListener('click', openModal);
  if (dom.floatingBtnTutor) {
    dom.floatingBtnTutor.addEventListener('click', openModal);
  }
  if (dom.btnCloseTutorModal) {
    dom.btnCloseTutorModal.addEventListener('click', closeModal);
  }

  // Clear chat
  if (dom.btnClearChat) {
    dom.btnClearChat.addEventListener('click', clearChatHistory);
  }

  // Quest selector in modal header (synced with Quest Map)
  if (dom.tutorQuestSelect) {
    dom.tutorQuestSelect.addEventListener('change', (e) => {
      state.activeQuestId = e.target.value;
      renderQuestList();
      renderActiveQuest();
    });
  }

  // Send controls
  if (dom.btnSendTutor) {
    dom.btnSendTutor.addEventListener('click', () => handleSend());
  }
  if (dom.tutorInputText) {
    dom.tutorInputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }

  // Global Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.aiTutorModal && dom.aiTutorModal.style.display === 'flex') closeModal();
      if (dom.settingsModal && dom.settingsModal.style.display === 'flex') dom.settingsModal.style.display = 'none';
    }
  });

  // Initial chips based on active quest
  renderTutorChips();
}

// --- TUTOR BADGE HELPER ---
function updateTutorBadge() {
  if (dom.tutorModelBadge) {
    if (tutorService.providerType === 'custom_agent') {
      dom.tutorModelBadge.textContent = 'Custom Cloud Agent';
    } else {
      dom.tutorModelBadge.textContent = tutorService.model;
    }
  }
}

// --- SETTINGS MODAL & API KEY ---
function setupSettings() {
  const updateProviderVisibility = () => {
    const isCustom = dom.aiProviderSelect.value === 'custom_agent';
    dom.groupCustomAgent.style.display = isCustom ? 'block' : 'none';
    dom.groupGeminiModel.style.display = isCustom ? 'none' : 'block';
  };

  dom.aiProviderSelect.addEventListener('change', updateProviderVisibility);

  const openModal = () => {
    dom.aiProviderSelect.value = tutorService.providerType;
    dom.geminiKeyInput.value = tutorService.getApiKey();
    dom.customAgentUrlInput.value = tutorService.customAgentUrl;
    dom.geminiModelSelect.value = tutorService.model;
    dom.backendUrlInput.value = state.backendUrl;
    dom.settingsTestStatus.textContent = '';
    updateProviderVisibility();
    dom.settingsModal.style.display = 'flex';
  };

  const closeModal = () => {
    dom.settingsModal.style.display = 'none';
  };

  dom.btnOpenSettings.addEventListener('click', openModal);
  dom.btnCloseSettings.addEventListener('click', closeModal);

  dom.geminiModelSelect.addEventListener('change', () => {
    tutorService.setModel(dom.geminiModelSelect.value);
    updateTutorBadge();
  });

  dom.btnSaveSettings.addEventListener('click', () => {
    const provider = dom.aiProviderSelect.value;
    const key = dom.geminiKeyInput.value;
    const customUrl = dom.customAgentUrlInput.value.trim();
    const model = dom.geminiModelSelect.value;
    const backend = dom.backendUrlInput.value.trim() || 'http://localhost:8000';

    tutorService.setProvider(provider, customUrl);
    tutorService.setApiKey(key);
    tutorService.setModel(model);
    state.backendUrl = backend;
    localStorage.setItem('nq_backend_url', backend);

    updateTutorBadge();
    closeModal();
    checkBackendStatus();
  });

  dom.btnTestApi.addEventListener('click', async () => {
    const key = dom.geminiKeyInput.value.trim();
    const provider = dom.aiProviderSelect.value;
    const customUrl = dom.customAgentUrlInput.value.trim();
    const model = dom.geminiModelSelect.value;

    if (!key && provider !== 'custom_agent') {
      dom.settingsTestStatus.innerHTML = `<span style="color: #f87171;">Please enter an API key first.</span>`;
      return;
    }
    if (provider === 'custom_agent' && !customUrl) {
      dom.settingsTestStatus.innerHTML = `<span style="color: #f87171;">Please enter a Custom Agent Endpoint URL.</span>`;
      return;
    }

    dom.settingsTestStatus.innerHTML = `<span>⏳ Testing connection to AI tutor with <strong>${model}</strong>...</span>`;
    tutorService.setProvider(provider, customUrl);
    tutorService.setApiKey(key);
    tutorService.setModel(model);
    updateTutorBadge();

    const testAns = await tutorService.ask("Test connection! Reply with 'Osu! Sensei Tensor is online!' in 5 words.");
    dom.settingsTestStatus.innerHTML = marked.parse(testAns);
  });

  if (dom.btnDetectModels) {
    dom.btnDetectModels.addEventListener('click', async () => {
      const key = dom.geminiKeyInput.value.trim();
      if (!key) {
        dom.settingsTestStatus.innerHTML = `<span style="color: #f87171;">Please enter an API key first to auto-detect models.</span>`;
        return;
      }

      dom.settingsTestStatus.innerHTML = `<span>⏳ Querying available models from Google API for your key...</span>`;
      tutorService.setApiKey(key);
      const models = await tutorService.listAvailableModels();

      if (models.length > 0) {
        dom.geminiModelSelect.innerHTML = '';
        models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.displayName} (${m.id})`;
          dom.geminiModelSelect.appendChild(opt);
        });

        // Pick preferred or first
        const preferred = models.find(m => m.id.includes('flash')) || models[0];
        dom.geminiModelSelect.value = preferred.id;
        tutorService.setModel(preferred.id);
        updateTutorBadge();

        dom.settingsTestStatus.innerHTML = `<span style="color: #34d399;">✓ Successfully detected <strong>${models.length} models</strong>! Selected: <strong>${preferred.id}</strong></span>`;
      } else {
        dom.settingsTestStatus.innerHTML = `<span style="color: #f87171;">⚠️ Could not list models automatically. Check key restrictions or select manually.</span>`;
      }
    });
  }
}

// --- TABS SWITCHER ---
function setupTabs() {
  dom.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      dom.tabBtns.forEach(b => b.classList.remove('active'));
      dom.tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(`content-${tabName}`);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}

// --- APP BOOTSTRAP ---
function initApp() {
  updateXpDisplay();
  renderQuestList();
  renderActiveQuest();
  setupTabs();
  setupCodeLab();
  setupAiTutor();
  setupSettings();
  updateTutorBadge();

  checkBackendStatus();
  setInterval(checkBackendStatus, 15000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
