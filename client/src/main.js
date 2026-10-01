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
  challengeTimerId: null
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
  // Tutor Drawer
  aiTutorDrawer: document.getElementById('ai-tutor-drawer'),
  btnCloseTutor: document.getElementById('btn-close-tutor'),
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

      <div class="preview-28-box" style="width: 100%;">
        <canvas id="preview-28-canvas" class="preview-28-canvas" width="28" height="28"></canvas>
        <div style="font-size: 0.78rem; color: var(--text-muted);">
          <strong>Neural Downsample (28x28):</strong>
          <p>What the Convolutional layers actually process.</p>
        </div>
      </div>
    </div>

    <div class="doodle-predictions-panel">
      <div class="top-prediction-banner">
        <div>
          <span class="top-pred-label">Top Model Prediction</span>
          <div class="top-pred-name" id="doodle-top-class">Waiting for sketch...</div>
        </div>
        <div class="top-pred-confidence" id="doodle-top-confidence">0.0%</div>
      </div>

      <div id="challenge-status-box" style="display: none; padding: 0.8rem; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--accent-amber); border-radius: var(--radius-md); font-size: 0.88rem;"></div>

      <div style="margin-top: 0.5rem;">
        <h4 style="font-size: 0.85rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.8rem;">
          Category Confidence Distribution:
        </h4>
        <div id="doodle-probability-bars"></div>
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
  });

  // Downsample 280x280 -> 28x28 grayscale array
  const extract28x28 = () => {
    previewCtx.drawImage(canvas, 0, 0, 280, 280, 0, 0, 28, 28);
    const imgData = previewCtx.getImageData(0, 0, 28, 28);
    const grid = [];
    for (let r = 0; r < 28; r++) {
      const row = [];
      for (let c = 0; c < 28; c++) {
        const idx = (r * 28 + c) * 4;
        // Grayscale normalized value [0.0 - 1.0]
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
    debounceTimer = setTimeout(triggerPrediction, 120);
  };

  const triggerPrediction = async () => {
    const grid = extract28x28();
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
    } catch {
      // Backend error fallback
    }

    // Client-side quick heuristic prediction
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
    // Heuristic weight distribution
    const topRowSum = grid.slice(0, 10).flat().reduce((a, b) => a + b, 0);
    const bottomRowSum = grid.slice(18, 28).flat().reduce((a, b) => a + b, 0);

    let scores = [20, 20, 20, 20, 20];
    if (topRowSum > bottomRowSum * 1.6) scores[4] += 55; // Umbrella
    else if (bottomRowSum > topRowSum * 1.4) scores[1] += 50; // Bicycle
    else scores[2] += 45; // Star

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
    container.querySelector('#doodle-top-class').textContent = data.top_class;
    container.querySelector('#doodle-top-confidence').textContent = `${data.confidence}%`;

    const barContainer = container.querySelector('#doodle-probability-bars');
    barContainer.innerHTML = '';
    (data.all_predictions || []).forEach(p => {
      const row = document.createElement('div');
      row.className = 'probability-bar-row';
      row.innerHTML = `
        <div class="prob-label-row">
          <span>${p.class}</span>
          <span style="font-family: var(--font-mono); color: var(--accent-cyan);">${p.confidence}%</span>
        </div>
        <div class="prob-track">
          <div class="prob-fill" style="width: ${p.confidence}%"></div>
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

  // Initial call
  triggerPrediction();
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

// --- AI TUTOR (SENSEI TENSOR) DRAWER ---
function setupAiTutor() {
  const toggleDrawer = () => {
    dom.aiTutorDrawer.classList.toggle('open');
  };

  dom.btnToggleTutor.addEventListener('click', toggleDrawer);
  dom.btnCloseTutor.addEventListener('click', toggleDrawer);

  const appendMessage = (sender, text) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = sender === 'ai' ? marked.parse(text) : `<p>${text}</p>`;
    dom.tutorChatHistory.appendChild(bubble);
    dom.tutorChatHistory.scrollTop = dom.tutorChatHistory.scrollHeight;
  };

  const handleSend = async (customPrompt = null) => {
    const prompt = customPrompt || dom.tutorInputText.value.trim();
    if (!prompt) return;

    appendMessage('user', prompt);
    if (!customPrompt) dom.tutorInputText.value = '';

    const thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'chat-bubble ai';
    thinkingBubble.innerHTML = `<em>Sensei Tensor is meditating on your query...</em>`;
    dom.tutorChatHistory.appendChild(thinkingBubble);
    dom.tutorChatHistory.scrollTop = dom.tutorChatHistory.scrollHeight;

    const quest = getActiveQuest();
    const answer = await tutorService.ask(prompt, quest);

    thinkingBubble.remove();
    appendMessage('ai', answer);
  };

  dom.btnSendTutor.addEventListener('click', () => handleSend());
  dom.tutorInputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Preset prompt chips
  dom.tutorPresetChips.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      handleSend(chip.dataset.prompt);
    });
  });
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

function updateTutorBadge() {
  if (dom.tutorModelBadge) {
    if (tutorService.providerType === 'custom_agent') {
      dom.tutorModelBadge.textContent = 'Custom Cloud Agent';
    } else {
      dom.tutorModelBadge.textContent = tutorService.model;
    }
  }
}

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

document.addEventListener('DOMContentLoaded', initApp);
