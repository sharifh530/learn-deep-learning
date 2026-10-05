import './style.css';
import curriculumData from './curriculum.json';
import { AITutorService } from './ai_tutor.js';
import confetti from 'canvas-confetti';
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { getSectionVisual, mountVisual, disposeVisuals } from './lesson_visuals.js';
import { generateDiplomaCanvas, downloadDiplomaPng, generateVerificationCode } from './certificate_generator.js';
import { exportProgress, importProgress, resetProgress } from './progress_manager.js';
import { soundFx } from './sound_effects.js';

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
  kernelInspectCoord: { x: 14, y: 14 },
  // Regularization Arena state
  regComplexity: 8,
  regNoise: 0.25,
  regDataSize: 18,
  regDropout: 0.0,
  regWeightDecay: 0.0,
  regAugmentActive: false,
  // Attention Workshop state
  attnSentenceIdx: 0,
  attnFocusedToken: 7,
  attnHead: 'head-2',
  attnScaleEnabled: true,
  attnCustomText: '',
  attnQueryVectorOverride: null
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
  btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
  btnCloseSidebar: document.getElementById('btn-close-sidebar'),
  sidebarBackdrop: document.getElementById('sidebar-backdrop'),
  sidebarQuests: document.getElementById('sidebar-quests'),
  btnOpenDiploma: document.getElementById('btn-open-diploma'),
  diplomaNavPill: document.getElementById('diploma-nav-pill'),
  sidebarDiplomaTrigger: document.getElementById('sidebar-diploma-trigger'),
  sidebarDiplomaStatus: document.getElementById('sidebar-diploma-status'),
  btnToggleSound: document.getElementById('btn-toggle-sound'),
  audioIcon: document.getElementById('audio-icon'),
  audioText: document.getElementById('audio-text'),
  settingsAudioToggle: document.getElementById('settings-audio-toggle'),
  settingsAudioStatus: document.getElementById('settings-audio-status'),
  // Sidebar
  questListContainer: document.getElementById('quest-list-container'),
  questCompletionCount: document.getElementById('quest-completion-count'),
  // Stage
  questHero: document.getElementById('quest-hero'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  interactiveContainer: document.getElementById('interactive-container'),
  lessonContainer: document.getElementById('lesson-container'),
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
  settingsTestStatus: document.getElementById('settings-test-status'),
  settingsLearnerName: document.getElementById('settings-learner-name'),
  btnExportProgress: document.getElementById('btn-export-progress'),
  btnImportTrigger: document.getElementById('btn-import-trigger'),
  fileImportProgress: document.getElementById('file-import-progress'),
  btnResetProgress: document.getElementById('btn-reset-progress'),
  // Diploma Modal
  diplomaModal: document.getElementById('diploma-modal'),
  btnCloseDiploma: document.getElementById('btn-close-diploma'),
  diplomaStudentName: document.getElementById('diploma-student-name'),
  btnDownloadDiploma: document.getElementById('btn-download-diploma'),
  btnPrintDiploma: document.getElementById('btn-print-diploma'),
  btnShareDiploma: document.getElementById('btn-share-diploma'),
  diplomaCanvasWrapper: document.getElementById('diploma-canvas-wrapper')
};

// --- XP & Level Calculations ---
function updateXpDisplay() {
  const xp = state.userXp;
  let level = 1;
  let title = 'Tensor Novice';
  let nextXp = 250;

  if (xp >= 1500) {
    level = 6;
    title = 'Attention Grandmaster';
    nextXp = 2000;
  } else if (xp >= 1100) {
    level = 5;
    title = 'Regularization Sage';
    nextXp = 1500;
  } else if (xp >= 750) {
    level = 4;
    title = 'Convolution Master';
    nextXp = 1100;
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
  soundFx.playXpGain();
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

function setSidebarOpen(open) {
  if (!dom.sidebarQuests) return;
  dom.sidebarQuests.classList.toggle('open', open);
  if (dom.sidebarBackdrop) {
    dom.sidebarBackdrop.classList.toggle('active', open);
  }
  document.body.classList.toggle('sidebar-locked', open);
}

// --- Sidebar Render ---
function renderQuestList() {
  dom.questListContainer.innerHTML = '';
  const total = state.curriculum.quests.length;
  const completed = state.completedQuests.size;
  dom.questCompletionCount.textContent = `${completed}/${total} Done`;
  updateDiplomaStatus();

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
      if (state.activeQuestId !== quest.id) {
        soundFx.playDojoGong();
      }
      state.activeQuestId = quest.id;
      renderQuestList();
      renderActiveQuest();
      if (window.innerWidth <= 960) {
        setSidebarOpen(false);
        if (dom.questHero) {
          dom.questHero.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
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
      <div class="hero-actions-row" style="margin-top: 0.8rem; display: flex; gap: 0.6rem; align-items: center;">
        <button class="btn-hero-lesson" id="btn-hero-read-lesson" style="background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.45); color: #ddd6fe; padding: 0.35rem 0.85rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.35rem;">
          <span>📖</span> Read Concept Lesson
        </button>
        <button class="btn-hero-sandbox" id="btn-hero-jump-sandbox" style="background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.4); color: #a5f3fc; padding: 0.35rem 0.85rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.35rem;">
          <span>🎮</span> Try Playful Sandbox
        </button>
      </div>
    </div>
  `;

  // Hero action buttons
  const btnHeroLesson = dom.questHero.querySelector('#btn-hero-read-lesson');
  if (btnHeroLesson) {
    btnHeroLesson.addEventListener('click', () => {
      const lessonTab = document.querySelector('.tab-btn[data-tab="lesson"]');
      if (lessonTab) lessonTab.click();
    });
  }
  const btnHeroSandbox = dom.questHero.querySelector('#btn-hero-jump-sandbox');
  if (btnHeroSandbox) {
    btnHeroSandbox.addEventListener('click', () => {
      const sandboxTab = document.querySelector('.tab-btn[data-tab="interactive"]');
      if (sandboxTab) sandboxTab.click();
    });
  }

  // Code editor init
  dom.codeEditorArea.value = quest.codeSnippet;

  // Render Concept Lesson
  renderLesson(quest);

  // Render Sandbox based on type
  renderInteractiveWidget(quest);

  // Render Quiz
  renderQuiz(quest);

  // Synchronize AI Tutor suggestion prompt deck with currently active quest
  if (typeof renderTutorChips === 'function') {
    renderTutorChips();
  }
}

// --- FORMAT LESSON TEXT HELPERS ---
function renderTex(src, displayMode = false) {
  try {
    return katex.renderToString(src, { displayMode, throwOnError: false, strict: 'ignore' });
  } catch {
    return `<code class="math-inline">${escapeHtml(src)}</code>`;
  }
}

/**
 * Converts lesson markup (subset of Markdown + LaTeX) into HTML.
 * Supports $$display$$ / $inline$ math, `code`, **bold**, *italic*,
 * "• " bullet lists and "1. " numbered lists.
 * When `inline` is true, block structure (lists/paragraphs) is skipped.
 */
function formatLessonText(text, { inline = false } = {}) {
  if (!text) return '';
  const store = [];
  const hold = (html) => `\uE000${store.push(html) - 1}\uE001`;

  let t = String(text)
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => hold(`<div class="math-display">${renderTex(m.trim(), true)}</div>`))
    .replace(/\$([^$\n]+?)\$/g, (_, m) => hold(renderTex(m.trim())))
    .replace(/`([^`\n]+)`/g, (_, m) => hold(`<code class="code-inline">${escapeHtml(m)}</code>`));

  t = escapeHtml(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s.,;:!?)]|$)/gm, '$1<em>$2</em>');

  const restore = (s) => s.replace(/\uE000(\d+)\uE001/g, (_, i) => store[+i]);
  if (inline) return restore(t.replace(/\n/g, ' '));

  // Block structure: paragraphs, bullet lists, ordered lists, display math
  const out = [];
  let list = null; // { type: 'ul' | 'ol', items: [] }
  const flush = () => {
    if (list) {
      out.push(`<${list.type} class="lesson-list ${list.type}">${list.items.map(i => `<li>${i}</li>`).join('')}</${list.type}>`);
      list = null;
    }
  };
  t.split('\n').forEach(raw => {
    const ln = raw.trim();
    if (!ln) { flush(); return; }
    const bullet = ln.match(/^[•\-]\s+(.*)$/);
    const ordered = ln.match(/^\d+\.\s+(.*)$/);
    if (bullet || ordered) {
      const type = bullet ? 'ul' : 'ol';
      if (!list || list.type !== type) { flush(); list = { type, items: [] }; }
      list.items.push((bullet || ordered)[1]);
      return;
    }
    flush();
    if (/^\uE000\d+\uE001$/.test(ln) && store[+ln.slice(1, -1)].startsWith('<div class="math-display"')) {
      out.push(ln);
    } else {
      out.push(`<p>${ln}</p>`);
    }
  });
  flush();
  return restore(out.join(''));
}

/** Splits "🎯 Title: body" callouts into icon / title / body parts. */
function parseCallout(text) {
  const m = String(text).match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(?:([^:]{2,48}):\s*)?([\s\S]*)$/u);
  if (!m) return { icon: '💡', title: '', body: text };
  return { icon: m[1], title: m[2] || '', body: m[3] };
}

// --- LESSON COMPONENT ---
function renderLesson(quest) {
  if (!dom.lessonContainer) return;
  disposeVisuals();
  dom.lessonContainer.innerHTML = '';

  const lesson = quest.lesson;
  if (!lesson) {
    dom.lessonContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
        <p>Lesson content coming soon for this quest.</p>
      </div>
    `;
    return;
  }

  const card = document.createElement('div');
  card.className = 'lesson-article';

  const sectionsHtml = (lesson.sections || []).map((sec, secIdx) => {
    const visual = getSectionVisual(quest.id, secIdx);
    const callout = sec.callout ? parseCallout(sec.callout) : null;
    return `
    <div class="lesson-section-card" data-section-idx="${secIdx}">
      <h3 class="lesson-section-title">${escapeHtml(sec.heading)}</h3>
      <div class="lesson-section-body">
        ${formatLessonText(sec.content)}
      </div>
      ${visual ? `
        <figure class="lesson-visual-figure" data-visual-idx="${secIdx}">
          <div class="lesson-visual-canvas">
            ${visual.html}
          </div>
          ${visual.caption ? `
            <figcaption class="lesson-visual-caption">
              <span class="visual-tag">ILLUSTRATION</span>
              <span class="caption-text">${visual.caption}</span>
            </figcaption>` : ''}
        </figure>
      ` : ''}
      ${callout ? `
        <div class="lesson-callout-box">
          <span class="callout-icon">${callout.icon}</span>
          <div class="callout-content">
            ${callout.title ? `<strong class="callout-title">${escapeHtml(callout.title)}:</strong> ` : ''}
            <span class="callout-text">${formatLessonText(callout.body, { inline: true })}</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
  }).join('');

  const formulaBreakdownHtml = lesson.formulaCard && lesson.formulaCard.breakdown ? `
    <div class="formula-breakdown-grid">
      ${lesson.formulaCard.breakdown.map(item => `
        <div class="formula-param-item">
          <div class="param-symbol-badge">${renderTex(item.symbol)}</div>
          <span class="param-meaning">${formatLessonText(item.meaning, { inline: true })}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const takeawaysHtml = (lesson.takeaways || []).map(t => `
    <li class="takeaway-item">
      <span class="takeaway-check">✓</span>
      <span>${formatLessonText(t, { inline: true })}</span>
    </li>
  `).join('');

  const pitfallsHtml = (lesson.commonPitfalls || []).map(p => `
    <li class="pitfall-item">
      <span class="pitfall-icon">⚠️</span>
      <span>${formatLessonText(p, { inline: true })}</span>
    </li>
  `).join('');

  card.innerHTML = `
    <!-- Lesson Meta Header -->
    <div class="lesson-meta-bar">
      <div class="lesson-badges">
        <span class="lesson-badge difficulty">${escapeHtml(lesson.difficulty || 'Core Theory')}</span>
        <span class="lesson-badge time">⏱️ ${escapeHtml(lesson.readTime || '3 min read')}</span>
        <span class="lesson-badge xp">⭐ +${quest.xp} XP Available</span>
      </div>
      <div class="lesson-hook-text">
        <em>${formatLessonText(lesson.hook || '', { inline: true })}</em>
      </div>
    </div>

    <!-- Analogy Card -->
    ${lesson.analogy ? `
      <div class="lesson-analogy-card">
        <div class="analogy-header">
          <span class="analogy-tag">CORE MENTAL MODEL</span>
          <h4 class="analogy-title">${escapeHtml(lesson.analogy.title)}</h4>
        </div>
        <div class="analogy-desc">${formatLessonText(lesson.analogy.description)}</div>
      </div>
    ` : ''}

    <!-- Structured Lesson Sections with Visuals -->
    <div class="lesson-sections-container">
      ${sectionsHtml}
    </div>

    <!-- Formula Card with KaTeX Math Engine -->
    ${lesson.formulaCard ? `
      <div class="lesson-formula-card">
        <div class="formula-card-header">
          <span class="formula-header-icon">📐</span>
          <h4>${escapeHtml(lesson.formulaCard.title || 'Mathematical Engine')}</h4>
        </div>
        <div class="formula-display-box">
          ${renderTex(lesson.formulaCard.equation, true)}
        </div>
        ${formulaBreakdownHtml}
      </div>
    ` : ''}

    <!-- Dual Cards: Takeaways & Pitfalls -->
    <div class="lesson-dual-cards">
      <div class="lesson-summary-box takeaways">
        <div class="summary-box-title">
          <span>🎯</span>
          <h4>Key Principles & Takeaways</h4>
        </div>
        <ul class="takeaway-list">
          ${takeawaysHtml}
        </ul>
      </div>

      <div class="lesson-summary-box pitfalls">
        <div class="summary-box-title">
          <span>⚠️</span>
          <h4>Common Pitfalls & Gotchas</h4>
        </div>
        <ul class="pitfall-list">
          ${pitfallsHtml}
        </ul>
      </div>
    </div>

    <!-- Action Footer -->
    <div class="lesson-action-footer">
      <div class="lesson-footer-prompt">
        <span>Ready to experiment with these concepts hands-on?</span>
      </div>
      <div class="lesson-footer-btns">
        <button class="btn-lesson-action btn-to-sandbox" id="btn-lesson-jump-sandbox">
          <span>🎮 Jump to Playful Sandbox</span>
          <span class="arrow-icon">➔</span>
        </button>
        <button class="btn-lesson-action btn-to-tutor" id="btn-lesson-ask-tutor">
          <span>🥋 Ask Sensei Tensor about this</span>
        </button>
      </div>
    </div>
  `;

  dom.lessonContainer.appendChild(card);

  // Mount interactive visuals
  card.querySelectorAll('.lesson-visual-figure').forEach(fig => {
    const sIdx = parseInt(fig.dataset.visualIdx, 10);
    const v = getSectionVisual(quest.id, sIdx);
    if (v) {
      mountVisual(v, fig);
    }
  });

  // Wire buttons
  const btnJump = card.querySelector('#btn-lesson-jump-sandbox');
  if (btnJump) {
    btnJump.addEventListener('click', () => {
      const sandboxTabBtn = document.querySelector('.tab-btn[data-tab="interactive"]');
      if (sandboxTabBtn) sandboxTabBtn.click();
    });
  }

  const btnTutor = card.querySelector('#btn-lesson-ask-tutor');
  if (btnTutor) {
    btnTutor.addEventListener('click', () => {
      openAITutorModal();
    });
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
    case 'regularization_arena':
      renderRegularizationArenaWidget(quest);
      break;
    case 'attention_workshop':
      renderAttentionWorkshopWidget(quest);
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

  let strokeTick = 0;
  const draw = (e) => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();

    strokeTick++;
    if (strokeTick % 6 === 0) {
      soundFx.playDoodleStroke();
    }

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
    soundFx.playTrainingStep();

    try {
      if (state.backendOnline) {
        const res = await fetch(`${state.backendUrl}/api/train_step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ epochs, learning_rate: lr })
        });
        const data = await res.json();
        if (data.success) {
          soundFx.playEpochBell();
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

// --- WIDGET 6: The Overfitting Beast & Regularization Arena ---
function solveLinearSystem(A, b) {
  const n = b.length;
  const M = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(n + 1);
    for (let j = 0; j < n; j++) row[j] = A[i][j];
    row[n] = b[i];
    return row;
  });

  for (let p = 0; p < n; p++) {
    let maxRow = p;
    for (let i = p + 1; i < n; i++) {
      if (Math.abs(M[i][p]) > Math.abs(M[maxRow][p])) maxRow = i;
    }
    const temp = M[p];
    M[p] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[p][p];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let j = p; j <= n; j++) M[p][j] /= pivot;

    for (let i = 0; i < n; i++) {
      if (i !== p) {
        const factor = M[i][p];
        for (let j = p; j <= n; j++) {
          M[i][j] -= factor * M[p][j];
        }
      }
    }
  }

  const res = new Float64Array(n);
  for (let i = 0; i < n; i++) res[i] = isNaN(M[i][n]) ? 0 : M[i][n];
  return res;
}

function evalPoly(W, x) {
  let y = 0;
  let px = 1;
  for (let d = 0; d < W.length; d++) {
    y += W[d] * px;
    px *= x;
  }
  return y;
}

function groundTruthFn(x) {
  return Math.sin(2.4 * x) + 0.25 * x;
}

function fitPolynomial(points, degree, lambda, dropout = 0) {
  const n = degree + 1;
  const N = points.length;
  if (N === 0) return new Float64Array(n);

  // Precompute power sums of x up to 2 * degree
  const S = new Float64Array(2 * degree + 1);
  for (let i = 0; i < N; i++) {
    const x = points[i].x;
    let px = 1;
    for (let p = 0; p <= 2 * degree; p++) {
      S[p] += px;
      px *= x;
    }
  }

  // Precompute b_j = sum(y_i * x_i^j)
  const b = new Float64Array(n);
  for (let i = 0; i < N; i++) {
    const x = points[i].x;
    const y = points[i].y;
    let px = 1;
    for (let j = 0; j < n; j++) {
      b[j] += y * px;
      px *= x;
    }
  }

  // Build normal equation matrix A
  const A = Array.from({ length: n }, () => new Float64Array(n));
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < n; k++) {
      A[j][k] = S[j + k];
    }
    // Regularization (L2 Weight Decay) applied to non-bias weights (j > 0)
    if (j > 0) {
      A[j][j] += N * lambda * 10.0;
      // Dropout effect: progressively damps higher order polynomial co-adaptations
      if (dropout > 0) {
        A[j][j] += N * dropout * Math.pow(j, 1.8) * 0.15;
      }
    }
  }

  return solveLinearSystem(A, b);
}

function renderRegularizationArenaWidget(quest) {
  const container = document.createElement('div');
  container.className = 'regularization-arena-container';

  container.innerHTML = `
    <!-- Top Diagnostic Banner -->
    <div class="reg-diagnostic-banner">
      <div class="reg-status-col">
        <span class="reg-status-badge" id="reg-status-badge">🚨 Severe Overfitting</span>
        <div class="reg-status-desc" id="reg-status-desc">
          Model capacity is too high for this dataset size. It connects random training noise, causing validation error to explode!
        </div>
      </div>
      <div class="reg-score-col">
        <div class="reg-score-label">Generalization Score</div>
        <div class="reg-score-val" id="reg-score-val">34%</div>
        <div class="reg-score-bar-bg">
          <div class="reg-score-bar-fill" id="reg-score-bar-fill" style="width: 34%;"></div>
        </div>
      </div>
    </div>

    <!-- Presets Bar -->
    <div class="reg-presets-bar" id="reg-presets-bar">
      <span class="reg-presets-label">Battle Scenarios:</span>
      <button class="btn-reg-preset active" data-preset="monster">🚨 Overfitting Monster</button>
      <button class="btn-reg-preset" data-preset="underfit">⚠️ Rigid Underfitter</button>
      <button class="btn-reg-preset" data-preset="dropout">🛡️ Tamed by Dropout</button>
      <button class="btn-reg-preset" data-preset="decay">⚖️ Tamed by L2 Decay</button>
      <button class="btn-reg-preset" data-preset="optimal">🏆 Optimal Improv Master</button>
    </div>

    <!-- 2-Column Canvas Stage -->
    <div class="reg-stage-grid">
      <!-- Col 1: Curve Fitting & Decision Boundary -->
      <div class="reg-panel-card">
        <div class="reg-panel-header">
          <span>📈 Curve Fitting & Decision Boundary</span>
          <div class="reg-legend">
            <span class="legend-item"><span class="legend-dot blue"></span> Train (N=<span id="legend-train-n">18</span>)</span>
            <span class="legend-item"><span class="legend-dot orange"></span> Val / Test</span>
            <span class="legend-item"><span class="legend-line green"></span> Ground Truth</span>
          </div>
        </div>
        <div class="reg-canvas-wrapper">
          <canvas id="reg-curve-canvas" width="500" height="280" class="reg-canvas"></canvas>
        </div>
        <div class="reg-metrics-row">
          <div class="metric-pill">Train MSE: <strong id="metric-train-mse" style="color: #38bdf8;">0.004</strong></div>
          <div class="metric-pill">Val MSE: <strong id="metric-val-mse" style="color: #f97316;">0.582</strong></div>
          <div class="metric-pill">Gap (Variance): <strong id="metric-gap" style="color: #f43f5e;">+0.578</strong></div>
        </div>
      </div>

      <!-- Col 2: Dual Loss Telemetry Curve -->
      <div class="reg-panel-card">
        <div class="reg-panel-header">
          <span>📉 Training vs. Validation Loss (Epochs 0–40)</span>
          <div class="reg-legend">
            <span class="legend-item"><span class="legend-line cyan"></span> Train Loss</span>
            <span class="legend-item"><span class="legend-line orange"></span> Val Loss</span>
          </div>
        </div>
        <div class="reg-canvas-wrapper">
          <canvas id="reg-loss-canvas" width="500" height="280" class="reg-canvas"></canvas>
        </div>
        <div class="reg-callout-footer" id="reg-loss-insight">
          Notice the U-shaped orange curve: Validation loss bottoms out around Epoch 14 and begins climbing, proving memorization of noise!
        </div>
      </div>
    </div>

    <!-- Bottom: Weapons & Regularization Controls Rack -->
    <div class="reg-controls-rack">
      <div class="reg-control-box">
        <div class="control-header">
          <span>🎚️ Model Capacity (Degree)</span>
          <strong id="val-complexity" style="color: var(--accent-cyan); font-family: var(--font-mono);">Degree 8</strong>
        </div>
        <input type="range" id="slider-complexity" min="1" max="12" step="1" value="8" class="cyber-slider" />
        <span class="control-hint">Degree 1 = Linear; Degree 8+ = High polynomial capacity</span>
      </div>

      <div class="reg-control-box">
        <div class="control-header">
          <span>📊 Training Dataset Size</span>
          <strong id="val-datasize" style="color: var(--accent-amber); font-family: var(--font-mono);">18 Points</strong>
        </div>
        <input type="range" id="slider-datasize" min="10" max="45" step="1" value="18" class="cyber-slider" />
        <span class="control-hint">Smaller datasets are exponentially easier to memorize</span>
      </div>

      <div class="reg-control-box">
        <div class="control-header">
          <span>🛡️ Dropout Weapon (p)</span>
          <strong id="val-dropout" style="color: #c4b5fd; font-family: var(--font-mono);">p = 0.0</strong>
        </div>
        <div class="reg-segmented-btn-group" id="reg-dropout-group">
          <button class="param-btn active" data-p="0.0">Off (0.0)</button>
          <button class="param-btn" data-p="0.2">Light (0.2)</button>
          <button class="param-btn" data-p="0.5">Heavy (0.5)</button>
        </div>
        <span class="control-hint">Randomly drops activations to eliminate co-adaptation</span>
      </div>

      <div class="reg-control-box">
        <div class="control-header">
          <span>⚖️ L2 Weight Decay (λ)</span>
          <strong id="val-weightdecay" style="color: #34d399; font-family: var(--font-mono);">λ = 0.000</strong>
        </div>
        <input type="range" id="slider-weightdecay" min="0" max="0.04" step="0.002" value="0.0" class="cyber-slider" />
        <span class="control-hint">Penalizes large weights: pulls curve toward smooth trajectory</span>
      </div>

      <div class="reg-control-box" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div class="control-header">
          <span>🔄 Data Augmentation</span>
          <span class="badge-status" id="badge-augment-status" style="font-size: 0.72rem; color: var(--text-muted);">Disabled</span>
        </div>
        <button class="btn-reg-action" id="btn-toggle-augment" style="margin-top: 0.3rem;">
          <span>✨ Synthesize +12 Points</span>
        </button>
        <span class="control-hint" style="margin-top: 0.3rem;">Artificially expands dataset to boost invariance</span>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // References
  const curveCanvas = container.querySelector('#reg-curve-canvas');
  const curveCtx = curveCanvas.getContext('2d');
  const lossCanvas = container.querySelector('#reg-loss-canvas');
  const lossCtx = lossCanvas.getContext('2d');

  const statusBadge = container.querySelector('#reg-status-badge');
  const statusDesc = container.querySelector('#reg-status-desc');
  const scoreVal = container.querySelector('#reg-score-val');
  const scoreBarFill = container.querySelector('#reg-score-bar-fill');

  const metricTrain = container.querySelector('#metric-train-mse');
  const metricVal = container.querySelector('#metric-val-mse');
  const metricGap = container.querySelector('#metric-gap');
  const lossInsight = container.querySelector('#reg-loss-insight');
  const legendTrainN = container.querySelector('#legend-train-n');

  const sliderComplexity = container.querySelector('#slider-complexity');
  const valComplexity = container.querySelector('#val-complexity');
  const sliderDataSize = container.querySelector('#slider-datasize');
  const valDataSize = container.querySelector('#val-datasize');
  const sliderWeightDecay = container.querySelector('#slider-weightdecay');
  const valWeightDecay = container.querySelector('#val-weightdecay');
  const valDropout = container.querySelector('#val-dropout');
  const btnToggleAugment = container.querySelector('#btn-toggle-augment');
  const badgeAugmentStatus = container.querySelector('#badge-augment-status');

  // Generate fixed base points (deterministic noise seed for repeatability)
  let trainPoints = [];
  let valPoints = [];
  let augPoints = [];

  function makeDatasets() {
    const N = state.regDataSize;
    trainPoints = [];
    valPoints = [];
    augPoints = [];

    // Training points
    for (let i = 0; i < N; i++) {
      const x = -0.9 + (1.8 * i) / (N - 1);
      // Pseudo-random noise with sine variation
      const noise = Math.sin(i * 12.9898 + 4.1414) * state.regNoise;
      const y = groundTruthFn(x) + noise;
      trainPoints.push({ x, y });
    }

    // Validation points (24 independent test samples spanning -0.96 to 0.96)
    for (let i = 0; i < 24; i++) {
      const x = -0.96 + (1.92 * i) / 23;
      const noise = Math.cos(i * 7.8233 + 1.234) * (state.regNoise * 0.9);
      const y = groundTruthFn(x) + noise;
      valPoints.push({ x, y });
    }

    // Augmented points
    if (state.regAugmentActive) {
      for (let i = 0; i < 12; i++) {
        const base = trainPoints[i % trainPoints.length];
        const jitX = Math.max(-0.95, Math.min(0.95, base.x + (Math.sin(i * 3.14) * 0.06)));
        const jitY = base.y + (Math.cos(i * 2.71) * 0.08);
        augPoints.push({ x: jitX, y: jitY });
      }
    }

    legendTrainN.textContent = trainPoints.length + augPoints.length;
  }

  function recomputeAndDraw() {
    const combinedTrain = state.regAugmentActive ? [...trainPoints, ...augPoints] : trainPoints;
    const degree = state.regComplexity;
    const lambda = state.regWeightDecay;
    const dropout = state.regDropout;

    // Fit model
    const W = fitPolynomial(combinedTrain, degree, lambda, dropout);

    // Compute MSE
    let trainLoss = 0;
    for (const p of combinedTrain) {
      const diff = p.y - evalPoly(W, p.x);
      trainLoss += diff * diff;
    }
    trainLoss /= combinedTrain.length;

    let valLoss = 0;
    for (const p of valPoints) {
      const diff = p.y - evalPoly(W, p.x);
      valLoss += diff * diff;
    }
    valLoss /= valPoints.length;

    const gap = Math.max(0, valLoss - trainLoss);

    // Update readouts
    metricTrain.textContent = trainLoss.toFixed(4);
    metricVal.textContent = valLoss.toFixed(4);
    metricGap.textContent = (gap >= 0 ? '+' : '') + gap.toFixed(4);

    const isOverfit = (degree >= 7 && lambda < 0.006 && dropout < 0.2) || (gap > 0.12 && lambda < 0.005);
    const isUnderfit = degree <= 2;

    // Calculate Generalization Score (0% to 100%)
    let genScore;
    if (isUnderfit) {
      genScore = Math.max(15, Math.min(45, Math.round(35 - trainLoss * 20)));
    } else if (isOverfit) {
      genScore = Math.max(12, Math.min(42, Math.round(42 - gap * 35)));
    } else {
      genScore = Math.max(75, Math.min(98, Math.round(96 - (valLoss * 30 + gap * 20))));
    }

    scoreVal.textContent = `${genScore}%`;
    scoreBarFill.style.width = `${genScore}%`;

    // Status classification
    if (isUnderfit) {
      statusBadge.className = 'reg-status-badge underfit';
      statusBadge.textContent = '⚠️ Rigid Underfitting';
      statusDesc.textContent = 'High Bias: Model is too primitive (straight line) to capture the true non-linear wave. Both Train and Val errors are high.';
      scoreBarFill.style.background = '#eab308';
    } else if (isOverfit) {
      statusBadge.className = 'reg-status-badge overfit';
      statusBadge.textContent = '🚨 Severe Overfitting';
      statusDesc.textContent = 'High Variance: Model connects every noisy data point with extreme loops! Train Loss is near 0, but Validation Loss is exploding.';
      scoreBarFill.style.background = '#f43f5e';
    } else {
      statusBadge.className = 'reg-status-badge optimal';
      statusBadge.textContent = '🏆 Optimal Generalization';
      statusDesc.textContent = 'Goldilocks Zone! Regularization smoothed the curve, matching the true pattern and keeping Test Error low.';
      scoreBarFill.style.background = '#10b981';
    }

    // Draw Canvases
    drawCurveCanvas(curveCtx, combinedTrain, valPoints, augPoints, W, degree, gap);
    drawLossCanvas(lossCtx, trainLoss, valLoss, degree, lambda, dropout, gap);
  }

  function drawCurveCanvas(ctx, trainPts, valPts, augPts, W, degree, gap) {
    const W_px = 500;
    const H_px = 280;
    ctx.clearRect(0, 0, W_px, H_px);

    // Coordinate mapping: x in [-1.1, 1.1], y in [-1.8, 1.8]
    const mapX = (x) => ((x + 1.1) / 2.2) * W_px;
    const mapY = (y) => H_px - ((y + 1.8) / 3.6) * H_px;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let gx = -1; gx <= 1; gx += 0.5) {
      ctx.beginPath();
      ctx.moveTo(mapX(gx), 0);
      ctx.lineTo(mapX(gx), H_px);
      ctx.stroke();
    }
    for (let gy = -1; gy <= 1; gy += 0.5) {
      ctx.beginPath();
      ctx.moveTo(0, mapY(gy));
      ctx.lineTo(W_px, mapY(gy));
      ctx.stroke();
    }

    // 1. Ground Truth Function (Dashed green line)
    ctx.save();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = -1.05 + (2.1 * i) / 100;
      const y = groundTruthFn(x);
      if (i === 0) ctx.moveTo(mapX(x), mapY(y));
      else ctx.lineTo(mapX(x), mapY(y));
    }
    ctx.stroke();
    ctx.restore();

    // 2. Model's Learned Curve
    ctx.save();
    const isOverfit = (degree >= 7 && state.regWeightDecay < 0.006 && state.regDropout < 0.2) || (gap > 0.12 && state.regWeightDecay < 0.005);
    const isUnderfit = degree <= 2;
    ctx.strokeStyle = isOverfit ? '#f43f5e' : (isUnderfit ? '#eab308' : '#06b6d4');
    ctx.lineWidth = 3.5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();

    for (let i = 0; i <= 150; i++) {
      const x = -1.05 + (2.1 * i) / 150;
      const y = Math.max(-2.2, Math.min(2.2, evalPoly(W, x)));
      if (i === 0) ctx.moveTo(mapX(x), mapY(y));
      else ctx.lineTo(mapX(x), mapY(y));
    }
    ctx.stroke();
    ctx.restore();

    // 3. Augmented Points (if any)
    for (const p of augPts) {
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(mapX(p.x), mapY(p.y), 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 4. Training Points (Blue dots)
    for (const p of trainPoints) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mapX(p.x), mapY(p.y), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 5. Validation Points (Orange triangles)
    for (const p of valPts) {
      const cx = mapX(p.x);
      const cy = mapY(p.y);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx + 5, cy + 4);
      ctx.lineTo(cx - 5, cy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawLossCanvas(ctx, trainLoss, valLoss, degree, lambda, dropout, gap) {
    const W_px = 500;
    const H_px = 280;
    ctx.clearRect(0, 0, W_px, H_px);

    // Padding & Axes
    const padL = 45, padR = 25, padT = 25, padB = 40;
    const plotW = W_px - padL - padR;
    const plotH = H_px - padT - padB;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let e = 0; e <= 40; e += 10) {
      const x = padL + (e / 40) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
      // Epoch label
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`Ep ${e}`, x - 12, padT + plotH + 16);
    }

    // Simulate 40 Epochs Progression
    const isOverfit = (degree >= 7 && lambda < 0.006 && dropout < 0.2) || (gap > 0.12 && lambda < 0.005);
    const trainPointsCurve = [];
    const valPointsCurve = [];

    const maxLossDisplay = 1.0;
    const mapLossY = (l) => padT + plotH - (Math.min(maxLossDisplay, Math.max(0, l)) / maxLossDisplay) * plotH;

    for (let e = 0; e <= 40; e++) {
      const progress = e / 40;
      // Train loss decay
      const tL = Math.max(0.01, trainLoss + (0.9 - trainLoss) * Math.exp(-e / 7.0));
      trainPointsCurve.push({ x: padL + progress * plotW, y: mapLossY(tL) });

      // Val loss behavior
      let vL;
      if (isOverfit) {
        // U-shaped curve: drops then shoots up after epoch 14
        const baseDrop = 0.85 * Math.exp(-e / 6.0) + 0.12;
        const divergence = e > 14 ? Math.pow((e - 14) / 26, 1.8) * 0.75 : 0;
        vL = baseDrop + divergence;
      } else {
        // Healthy: stays coupled
        vL = tL + 0.03 + Math.sin(e * 0.5) * 0.01;
      }
      valPointsCurve.push({ x: padL + progress * plotW, y: mapLossY(vL) });
    }

    // Optimal Early Stopping Marker (Epoch 14)
    if (isOverfit) {
      const stopX = padL + (14 / 40) * plotW;
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stopX, padT);
      ctx.lineTo(stopX, padT + plotH);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('⭐ Early Stop (Ep 14)', stopX - 55, padT + 12);
      ctx.restore();
    }

    // Draw Train Loss Curve (Cyan)
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < trainPointsCurve.length; i++) {
      if (i === 0) ctx.moveTo(trainPointsCurve[i].x, trainPointsCurve[i].y);
      else ctx.lineTo(trainPointsCurve[i].x, trainPointsCurve[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // Draw Val Loss Curve (Orange)
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < valPointsCurve.length; i++) {
      if (i === 0) ctx.moveTo(valPointsCurve[i].x, valPointsCurve[i].y);
      else ctx.lineTo(valPointsCurve[i].x, valPointsCurve[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // Dynamic insight footer
    if (isOverfit) {
      lossInsight.innerHTML = '🚨 <strong>Classic U-Shaped Divergence:</strong> Validation loss bottoms out around Epoch 14 and begins climbing, proving the network is memorizing noise!';
    } else if (degree <= 2) {
      lossInsight.innerHTML = '⚠️ <strong>Underfitting Plateau:</strong> Both training and validation errors stall at high levels. The model lacks sufficient parameters to learn the wave.';
    } else {
      lossInsight.innerHTML = '🏆 <strong>Coupled Generalization:</strong> Validation loss closely follows training loss with minimal gap. Your regularization weapons conquered the beast!';
    }
  }

  // --- Controls Event Listeners ---
  sliderComplexity.addEventListener('input', (e) => {
    state.regComplexity = parseInt(e.target.value, 10);
    valComplexity.textContent = `Degree ${state.regComplexity}`;
    recomputeAndDraw();
  });

  sliderDataSize.addEventListener('input', (e) => {
    state.regDataSize = parseInt(e.target.value, 10);
    valDataSize.textContent = `${state.regDataSize} Points`;
    makeDatasets();
    recomputeAndDraw();
  });

  sliderWeightDecay.addEventListener('input', (e) => {
    state.regWeightDecay = parseFloat(e.target.value);
    valWeightDecay.textContent = `λ = ${state.regWeightDecay.toFixed(3)}`;
    recomputeAndDraw();
  });

  container.querySelectorAll('#reg-dropout-group .param-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#reg-dropout-group .param-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.regDropout = parseFloat(btn.dataset.p);
      valDropout.textContent = `p = ${state.regDropout.toFixed(1)}`;
      recomputeAndDraw();
    });
  });

  btnToggleAugment.addEventListener('click', () => {
    state.regAugmentActive = !state.regAugmentActive;
    badgeAugmentStatus.textContent = state.regAugmentActive ? 'Active (+12 pts)' : 'Disabled';
    badgeAugmentStatus.style.color = state.regAugmentActive ? '#34d399' : 'var(--text-muted)';
    btnToggleAugment.classList.toggle('active', state.regAugmentActive);
    makeDatasets();
    recomputeAndDraw();
  });

  // --- Preset Scenarios ---
  container.querySelectorAll('.btn-reg-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-reg-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.dataset.preset;
      if (preset === 'monster') {
        state.regComplexity = 11;
        state.regDataSize = 14;
        state.regWeightDecay = 0.0;
        state.regDropout = 0.0;
        state.regAugmentActive = false;
      } else if (preset === 'underfit') {
        state.regComplexity = 1;
        state.regDataSize = 25;
        state.regWeightDecay = 0.0;
        state.regDropout = 0.0;
        state.regAugmentActive = false;
      } else if (preset === 'dropout') {
        state.regComplexity = 10;
        state.regDataSize = 20;
        state.regWeightDecay = 0.0;
        state.regDropout = 0.5;
        state.regAugmentActive = false;
      } else if (preset === 'decay') {
        state.regComplexity = 10;
        state.regDataSize = 20;
        state.regWeightDecay = 0.024;
        state.regDropout = 0.0;
        state.regAugmentActive = false;
      } else if (preset === 'optimal') {
        state.regComplexity = 4;
        state.regDataSize = 24;
        state.regWeightDecay = 0.006;
        state.regDropout = 0.2;
        state.regAugmentActive = true;
      }

      // Sync UI sliders
      sliderComplexity.value = state.regComplexity;
      valComplexity.textContent = `Degree ${state.regComplexity}`;
      sliderDataSize.value = state.regDataSize;
      valDataSize.textContent = `${state.regDataSize} Points`;
      sliderWeightDecay.value = state.regWeightDecay;
      valWeightDecay.textContent = `λ = ${state.regWeightDecay.toFixed(3)}`;
      valDropout.textContent = `p = ${state.regDropout.toFixed(1)}`;

      container.querySelectorAll('#reg-dropout-group .param-btn').forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.p) === state.regDropout);
      });

      badgeAugmentStatus.textContent = state.regAugmentActive ? 'Active (+12 pts)' : 'Disabled';
      badgeAugmentStatus.style.color = state.regAugmentActive ? '#34d399' : 'var(--text-muted)';
      btnToggleAugment.classList.toggle('active', state.regAugmentActive);

      makeDatasets();
      recomputeAndDraw();
    });
  });

  // Initial draw
  makeDatasets();
  recomputeAndDraw();
}

// ==========================================================================
// WIDGET 7: The Attention Machine (Transformers & Self-Attention Workshop)
// ==========================================================================

const WORD_EMBEDDINGS_4D = {
  // Sentence 1: The animal didn't cross the street because it was too tired.
  'the': [0.05, 0.05, 0.05, 0.95],
  'animal': [0.95, 0.40, 0.15, 0.05],
  "didn't": [0.05, 0.15, 0.70, 0.85],
  'didnt': [0.05, 0.15, 0.70, 0.85],
  'cross': [0.20, 0.20, 0.95, 0.10],
  'street': [0.90, 0.05, 0.10, 0.05],
  'because': [0.05, 0.10, 0.10, 0.95],
  'it': [0.85, 0.65, 0.10, 0.15],
  'was': [0.10, 0.30, 0.85, 0.40],
  'too': [0.05, 0.70, 0.10, 0.80],
  'tired': [0.15, 0.95, 0.05, 0.10],
  'tired.': [0.15, 0.95, 0.05, 0.10],

  // Sentence 2: The river bank was muddy after the heavy morning storm.
  'river': [0.92, 0.85, 0.20, 0.05],
  'bank': [0.90, 0.70, 0.05, 0.10],
  'muddy': [0.25, 0.92, 0.05, 0.10],
  'after': [0.05, 0.10, 0.10, 0.92],
  'heavy': [0.20, 0.88, 0.05, 0.15],
  'morning': [0.45, 0.60, 0.05, 0.10],
  'storm': [0.85, 0.90, 0.30, 0.05],
  'storm.': [0.85, 0.90, 0.30, 0.05],

  // Sentence 3: The central bank raised interest rates to combat inflation.
  'central': [0.45, 0.80, 0.10, 0.20],
  'raised': [0.15, 0.25, 0.95, 0.10],
  'interest': [0.80, 0.75, 0.10, 0.10],
  'rates': [0.85, 0.70, 0.10, 0.05],
  'to': [0.05, 0.05, 0.10, 0.90],
  'combat': [0.15, 0.25, 0.92, 0.10],
  'inflation': [0.80, 0.85, 0.10, 0.10],
  'inflation.': [0.80, 0.85, 0.10, 0.10],

  // Sentence 4: Attention is all you need for modern sequence modeling.
  'attention': [0.90, 0.80, 0.30, 0.10],
  'is': [0.10, 0.20, 0.80, 0.30],
  'all': [0.10, 0.40, 0.10, 0.85],
  'you': [0.80, 0.30, 0.10, 0.15],
  'need': [0.20, 0.30, 0.90, 0.10],
  'for': [0.05, 0.05, 0.10, 0.90],
  'modern': [0.25, 0.75, 0.05, 0.20],
  'sequence': [0.85, 0.50, 0.20, 0.10],
  'modeling': [0.80, 0.65, 0.30, 0.10],
  'modeling.': [0.80, 0.65, 0.30, 0.10]
};

function getWordVector4D(word) {
  const clean = word.toLowerCase().replace(/[^a-z0-9']/g, '');
  if (WORD_EMBEDDINGS_4D[clean]) {
    return [...WORD_EMBEDDINGS_4D[clean]];
  }
  if (WORD_EMBEDDINGS_4D[word.toLowerCase()]) {
    return [...WORD_EMBEDDINGS_4D[word.toLowerCase()]];
  }
  // Deterministic pseudo-random embedding for arbitrary user tokens
  let h = 0;
  for (let i = 0; i < clean.length; i++) {
    h = (h * 31 + clean.charCodeAt(i)) & 0xffffffff;
  }
  const v0 = ((Math.abs(h) % 100) / 100) * 0.9 + 0.05;
  const v1 = ((Math.abs(h >> 4) % 100) / 100) * 0.9 + 0.05;
  const v2 = ((Math.abs(h >> 8) % 100) / 100) * 0.9 + 0.05;
  const v3 = ((Math.abs(h >> 12) % 100) / 100) * 0.9 + 0.05;
  return [v0, v1, v2, v3];
}

// Multi-Head Projection Transformations
function projectToken(vector, role, headType) {
  const [d0, d1, d2, d3] = vector;
  if (headType === 'head-1') {
    // Head 1: Syntax & Verb-Object Dependency
    if (role === 'Q') {
      return [d2 * 1.5, d0 * 0.8, d3 * 1.1, d1 * 0.3];
    } else {
      return [d0 * 1.6, d2 * 0.6, d3 * 1.0, d1 * 0.2];
    }
  } else if (headType === 'head-2') {
    // Head 2: Coreference & Semantic Antecedent Binding
    if (role === 'Q') {
      return [d0 * 1.5, d1 * 1.6, d2 * 0.2, d3 * 0.1];
    } else {
      return [d0 * 1.4, d1 * 1.5, d2 * 0.1, d3 * 0.2];
    }
  } else if (headType === 'head-3') {
    // Head 3: Positional Locality & Modifier Flow
    if (role === 'Q') {
      return [d3 * 1.3, d1 * 0.5, d2 * 0.7, d0 * 0.6];
    } else {
      return [d3 * 1.2, d1 * 0.6, d2 * 0.8, d0 * 0.5];
    }
  }
  return [d0, d1, d2, d3];
}

function renderAttentionWorkshopWidget(quest) {
  const container = document.createElement('div');
  container.className = 'attention-workshop-container';

  const sentences = quest.interactiveConfig?.sentences || [];
  let currentSentenceIdx = state.attnSentenceIdx || 0;
  let currentTokens = sentences[currentSentenceIdx]?.tokens || ["Attention", "is", "all", "you", "need"];
  let focusedIdx = Math.min(state.attnFocusedToken, currentTokens.length - 1);
  if (focusedIdx < 0) focusedIdx = 0;

  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="attn-diagnostic-banner">
      <div class="attn-status-col">
        <span class="attn-status-badge" id="attn-status-badge">⚡ Scaled Dot-Product Active</span>
        <div class="attn-status-desc" id="attn-status-desc">
          Attention Mechanism: Every token broadcasts a Query, scans all Keys, and extracts weighted Values in parallel.
        </div>
      </div>
      <div class="attn-metrics-rack">
        <div class="attn-metric-item">
          <span class="metric-label">Focused Query</span>
          <strong class="metric-val query-token" id="metric-query-token">"it" (#7)</strong>
        </div>
        <div class="attn-metric-item">
          <span class="metric-label">Top Key Match</span>
          <strong class="metric-val key-token" id="metric-key-token">"animal" (68.4%)</strong>
        </div>
        <div class="attn-metric-item">
          <span class="metric-label">Attention Entropy</span>
          <strong class="metric-val entropy" id="metric-entropy">0.52 bits</strong>
        </div>
        <div class="attn-metric-item">
          <span class="metric-label">Softmax State</span>
          <strong class="metric-val gradient" id="metric-gradient-health">Healthy Flow 🟢</strong>
        </div>
      </div>
    </div>

    <!-- Sentence Selector & Preset Bar -->
    <div class="attn-sentence-bar">
      <div class="attn-sentence-select-wrap">
        <label for="attn-sentence-select">📚 Benchmark Sentence:</label>
        <select id="attn-sentence-select" class="cyber-select">
          ${sentences.map((s, idx) => `
            <option value="${idx}" ${idx === currentSentenceIdx ? 'selected' : ''}>
              #${idx + 1}: ${s.text.length > 55 ? s.text.substring(0, 52) + '...' : s.text}
            </option>
          `).join('')}
        </select>
      </div>
      <div class="attn-custom-input-wrap">
        <input type="text" id="attn-custom-input" placeholder="Or enter your custom sentence..." class="cyber-input" />
        <button id="btn-apply-custom" class="btn-attn-sub">Tokenize ✨</button>
      </div>
    </div>

    <!-- Interactive Token Ribbon -->
    <div class="attn-tokens-ribbon-card">
      <div class="ribbon-header">
        <span>🔤 Sequence Tokens (Click any token to set as Query)</span>
        <span class="ribbon-hint">Current Query: <span id="ribbon-active-query-name" style="color: var(--accent-cyan); font-weight: 700;">"it"</span></span>
      </div>
      <div class="attn-tokens-ribbon" id="attn-tokens-ribbon">
        <!-- Rendered token chips -->
      </div>
    </div>

    <!-- 2-Column Visualizer Stage -->
    <div class="attn-stage-grid">
      <!-- Col 1: Dynamic Attention Strands (Bezier Arcs) -->
      <div class="attn-panel-card">
        <div class="attn-panel-header">
          <span>🕸️ Attention Arcs: Query ➔ All Keys</span>
          <div class="attn-legend">
            <span class="legend-item"><span class="legend-dot cyan"></span> Focused Query</span>
            <span class="legend-item"><span class="legend-dot yellow"></span> Attended Keys</span>
          </div>
        </div>
        <div class="attn-canvas-wrapper">
          <canvas id="attn-arcs-canvas" width="540" height="280" class="attn-canvas"></canvas>
        </div>
        <div class="attn-panel-footer" id="attn-arcs-caption">
          Arc thickness & glow represent the exact softmax probability $P(\\text{Key} \\mid \\text{Query})$.
        </div>
      </div>

      <!-- Col 2: N x N Attention Matrix Heatmap -->
      <div class="attn-panel-card">
        <div class="attn-panel-header">
          <span>🗺️ Self-Attention Matrix Heatmap ($N \\times N$)</span>
          <div class="attn-legend">
            <span class="legend-item"><span class="heatmap-swatch"></span> Softmax Weight ($0 \\to 1$)</span>
          </div>
        </div>
        <div class="attn-canvas-wrapper">
          <canvas id="attn-heatmap-canvas" width="540" height="280" class="attn-canvas"></canvas>
        </div>
        <div class="attn-panel-footer" id="attn-heatmap-hover-info">
          Hover over any cell $(i, j)$ to inspect the exact dot product and softmax calculation.
        </div>
      </div>
    </div>

    <!-- Attention Controls & Multi-Head Deck -->
    <div class="attn-controls-rack">
      <!-- Multi-Head Tabs -->
      <div class="attn-control-box">
        <div class="control-header">
          <span>🧠 Attention Head Subspace</span>
          <span id="label-active-head" style="color: var(--accent-violet); font-size: 0.8rem; font-weight: 700;">Head 2: Coreference</span>
        </div>
        <div class="attn-segmented-btn-group" id="attn-head-group">
          <button class="param-btn ${state.attnHead === 'head-1' ? 'active' : ''}" data-head="head-1">Head 1: Syntax</button>
          <button class="param-btn ${state.attnHead === 'head-2' ? 'active' : ''}" data-head="head-2">Head 2: Coreference</button>
          <button class="param-btn ${state.attnHead === 'head-3' ? 'active' : ''}" data-head="head-3">Head 3: Locality</button>
          <button class="param-btn ${state.attnHead === 'all' ? 'active' : ''}" data-head="all">Average Ensemble</button>
        </div>
        <span class="control-hint">Each head projects Query and Key into a distinct linguistic subspace</span>
      </div>

      <!-- Scaling Factor sqrt(d_k) Toggle -->
      <div class="attn-control-box">
        <div class="control-header">
          <span>🛡️ Scale Factor ($\\sqrt{d_k} = \\sqrt{4} = 2.0$)</span>
          <span id="badge-scale-status" class="scale-badge ${state.attnScaleEnabled ? 'enabled' : 'disabled'}">
            ${state.attnScaleEnabled ? 'Active (÷ 2.0)' : 'Disabled (Raw)'}
          </span>
        </div>
        <button class="btn-toggle-scale ${state.attnScaleEnabled ? 'active' : ''}" id="btn-toggle-scale">
          <span>${state.attnScaleEnabled ? '✓ Guardrail Enabled (÷ √d_k)' : '⚠️ Guardrail Bypassed (Saturate Softmax)'}</span>
        </button>
        <span class="control-hint">Disabling causes softmax saturation and gradient flatlining!</span>
      </div>

      <!-- Vector Inspector for Active Query Token -->
      <div class="attn-control-box attn-vector-box" style="grid-column: span 2;">
        <div class="control-header">
          <span>🔬 4D Query Projection for <strong id="val-query-token-name" style="color: #38bdf8;">"${currentTokens[focusedIdx]}"</strong></span>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button id="btn-reset-vector" class="btn-subtle" title="Revert to base embedding">↺ Reset Vector</button>
            <span class="dim-badge">Dimension $d_k = 4$</span>
          </div>
        </div>
        <div class="attn-vector-sliders-grid" id="attn-vector-sliders">
          <!-- Populated dynamically with 4 sliders -->
        </div>
        <span class="control-hint">Nudge Query features to watch real-time redistribution of attention across Keys!</span>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // References
  const arcsCanvas = container.querySelector('#attn-arcs-canvas');
  const arcsCtx = arcsCanvas.getContext('2d');
  const heatmapCanvas = container.querySelector('#attn-heatmap-canvas');
  const heatmapCtx = heatmapCanvas.getContext('2d');

  const statusBadge = container.querySelector('#attn-status-badge');
  const statusDesc = container.querySelector('#attn-status-desc');
  const metricQuery = container.querySelector('#metric-query-token');
  const metricKey = container.querySelector('#metric-key-token');
  const metricEntropy = container.querySelector('#metric-entropy');
  const metricGrad = container.querySelector('#metric-gradient-health');

  const sentenceSelect = container.querySelector('#attn-sentence-select');
  const customInput = container.querySelector('#attn-custom-input');
  const btnApplyCustom = container.querySelector('#btn-apply-custom');
  const tokensRibbon = container.querySelector('#attn-tokens-ribbon');
  const ribbonQueryName = container.querySelector('#ribbon-active-query-name');
  const valQueryTokenName = container.querySelector('#val-query-token-name');
  const labelActiveHead = container.querySelector('#label-active-head');
  const badgeScaleStatus = container.querySelector('#badge-scale-status');
  const btnToggleScale = container.querySelector('#btn-toggle-scale');
  const vectorSlidersContainer = container.querySelector('#attn-vector-sliders');
  const btnResetVector = container.querySelector('#btn-reset-vector');
  const heatmapHoverInfo = container.querySelector('#attn-heatmap-hover-info');

  // Matrix and computed attention weights
  let attentionMatrix = []; // N x N
  let rawScoresMatrix = [];
  let scaledScoresMatrix = [];

  function computeAttention() {
    const N = currentTokens.length;
    attentionMatrix = Array.from({ length: N }, () => new Float64Array(N));
    rawScoresMatrix = Array.from({ length: N }, () => new Float64Array(N));
    scaledScoresMatrix = Array.from({ length: N }, () => new Float64Array(N));

    const headMode = state.attnHead; // 'head-1', 'head-2', 'head-3', or 'all'
    const headsToCompute = headMode === 'all' ? ['head-1', 'head-2', 'head-3'] : [headMode];

    // Compute for each head and average if 'all'
    for (const h of headsToCompute) {
      for (let i = 0; i < N; i++) {
        let baseVecI = getWordVector4D(currentTokens[i]);
        if (i === focusedIdx && state.attnQueryVectorOverride) {
          baseVecI = [...state.attnQueryVectorOverride];
        }
        const q_i = projectToken(baseVecI, 'Q', h);

        const rowScores = new Float64Array(N);
        for (let j = 0; j < N; j++) {
          const baseVecJ = getWordVector4D(currentTokens[j]);
          const k_j = projectToken(baseVecJ, 'K', h);

          // Dot product
          let dot = 0;
          for (let d = 0; d < 4; d++) dot += q_i[d] * k_j[d];

          // Positional bias for Head 3 (Locality)
          if (h === 'head-3') {
            dot += 2.2 / (1 + Math.pow(Math.abs(i - j), 1.3));
          }

          rowScores[j] = dot;
          rawScoresMatrix[i][j] = dot;
        }

        // Scaling factor sqrt(d_k) = sqrt(4) = 2.0
        const scaledRow = new Float64Array(N);
        for (let j = 0; j < N; j++) {
          if (state.attnScaleEnabled) {
            scaledRow[j] = rowScores[j] / 2.0;
          } else {
            // Unscaled: amplified variance pushes softmax into extreme saturation
            scaledRow[j] = rowScores[j] * 2.8;
          }
          scaledScoresMatrix[i][j] = scaledRow[j];
        }

        // Softmax: exp(z_j - max) / sum(exp(z_k - max))
        let maxZ = -Infinity;
        for (let j = 0; j < N; j++) if (scaledRow[j] > maxZ) maxZ = scaledRow[j];

        let sumExp = 0;
        const expRow = new Float64Array(N);
        for (let j = 0; j < N; j++) {
          expRow[j] = Math.exp(scaledRow[j] - maxZ);
          sumExp += expRow[j];
        }

        for (let j = 0; j < N; j++) {
          const prob = expRow[j] / (sumExp || 1);
          attentionMatrix[i][j] += prob / headsToCompute.length;
        }
      }
    }
  }

  function updateHUDMetrics() {
    const N = currentTokens.length;
    const qToken = currentTokens[focusedIdx] || 'token';
    metricQuery.textContent = `"${qToken}" (#${focusedIdx})`;
    ribbonQueryName.textContent = `"${qToken}"`;
    valQueryTokenName.textContent = `"${qToken}"`;

    // Find top attention target from focusedIdx
    let maxProb = -1;
    let topTargetIdx = focusedIdx;
    let entropy = 0;

    const row = attentionMatrix[focusedIdx] || [];
    for (let j = 0; j < N; j++) {
      const p = row[j] || 0;
      if (p > maxProb && j !== focusedIdx) {
        maxProb = p;
        topTargetIdx = j;
      }
      if (p > 1e-9) {
        entropy -= p * Math.log2(p);
      }
    }

    const topTokenName = currentTokens[topTargetIdx] || 'none';
    metricKey.textContent = `"${topTokenName}" (${((maxProb > 0 ? maxProb : row[focusedIdx]) * 100).toFixed(1)}%)`;
    metricEntropy.textContent = `${entropy.toFixed(2)} bits ${entropy < 1.2 ? '(Sharp 🎯)' : '(Diffuse 🌊)'}`;

    // Softmax Saturation check
    const isSaturated = !state.attnScaleEnabled || maxProb > 0.95 || (row[focusedIdx] > 0.95);
    if (!state.attnScaleEnabled) {
      statusBadge.className = 'attn-status-badge saturated';
      statusBadge.textContent = '⚠️ Softmax Saturated (Gradients Dead)';
      statusDesc.textContent = 'Without sqrt(d_k) scaling, raw dot products explode! Softmax peaks into an argmax spike (99%+ on one token) where gradients flatline to zero.';
      metricGrad.textContent = 'Flatlined 🛑 (0% Flow)';
      metricGrad.style.color = '#f43f5e';
    } else {
      statusBadge.className = 'attn-status-badge';
      statusBadge.textContent = '⚡ Scaled Dot-Product Active';
      statusDesc.textContent = `Query "${qToken}" actively attends across all Keys. Notice how Query meets Key to gather contextual information.`;
      metricGrad.textContent = 'Healthy Flow 🟢 (100%)';
      metricGrad.style.color = '#34d399';
    }
  }

  function renderTokenRibbon() {
    tokensRibbon.innerHTML = '';
    const N = currentTokens.length;
    const weightsFromQuery = attentionMatrix[focusedIdx] || [];

    currentTokens.forEach((token, idx) => {
      const chip = document.createElement('div');
      const isQuery = idx === focusedIdx;
      const weight = weightsFromQuery[idx] || 0;

      let affinityClass = '';
      if (!isQuery) {
        if (weight > 0.35) affinityClass = 'high-affinity';
        else if (weight > 0.15) affinityClass = 'medium-affinity';
      }

      chip.className = `token-chip ${isQuery ? 'active-query' : ''} ${affinityClass}`;
      chip.innerHTML = `
        <span class="chip-idx">#${idx}</span>
        <span class="chip-word">${escapeHtml(token)}</span>
        <span class="chip-weight">${isQuery ? 'QUERY' : `${(weight * 100).toFixed(0)}%`}</span>
      `;

      chip.addEventListener('click', () => {
        focusedIdx = idx;
        state.attnFocusedToken = idx;
        state.attnQueryVectorOverride = null;
        recomputeAndDraw();
      });

      tokensRibbon.appendChild(chip);
    });
  }

  function renderVectorSliders() {
    vectorSlidersContainer.innerHTML = '';
    const dimNames = ['Entity / Nouniness', 'State / Fatigue', 'Action / Transitivity', 'Syntax / Modifier'];
    const baseVec = state.attnQueryVectorOverride || getWordVector4D(currentTokens[focusedIdx]);

    baseVec.forEach((val, dim) => {
      const item = document.createElement('div');
      item.className = 'attn-slider-item';
      item.innerHTML = `
        <div class="slider-meta">
          <span class="dim-name">d${dim}: ${dimNames[dim]}</span>
          <strong class="dim-val" id="val-dim-${dim}">${val.toFixed(2)}</strong>
        </div>
        <input type="range" class="cyber-slider dim-slider" data-dim="${dim}" min="-2.0" max="2.0" step="0.05" value="${val}" />
      `;

      const slider = item.querySelector('.dim-slider');
      slider.addEventListener('input', (e) => {
        const newVal = parseFloat(e.target.value);
        if (!state.attnQueryVectorOverride) {
          state.attnQueryVectorOverride = [...baseVec];
        }
        state.attnQueryVectorOverride[dim] = newVal;
        item.querySelector(`#val-dim-${dim}`).textContent = newVal.toFixed(2);
        computeAttention();
        updateHUDMetrics();
        renderTokenRibbon();
        drawArcs();
        drawHeatmap();
      });

      vectorSlidersContainer.appendChild(item);
    });
  }

  function drawArcs() {
    const W_px = 540;
    const H_px = 280;
    arcsCtx.clearRect(0, 0, W_px, H_px);

    const N = currentTokens.length;
    const padL = 36;
    const padR = 36;
    const stepX = (W_px - padL - padR) / Math.max(1, N - 1);
    const lineY = H_px - 45;

    // Baseline track
    arcsCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    arcsCtx.lineWidth = 1.5;
    arcsCtx.beginPath();
    arcsCtx.moveTo(padL, lineY);
    arcsCtx.lineTo(W_px - padR, lineY);
    arcsCtx.stroke();

    const queryX = padL + focusedIdx * stepX;
    const queryY = lineY;
    const row = attentionMatrix[focusedIdx] || [];

    // Find highest affinity target for floating badge
    let maxWeight = -1;
    let maxTargetIdx = -1;
    for (let j = 0; j < N; j++) {
      if (j !== focusedIdx && row[j] > maxWeight) {
        maxWeight = row[j];
        maxTargetIdx = j;
      }
    }

    // Draw Attention Arcs from Query to all Keys
    for (let j = 0; j < N; j++) {
      const weight = row[j] || 0;
      const keyX = padL + j * stepX;
      const keyY = lineY;

      if (j === focusedIdx) {
        // Self-loop arc
        const loopR = Math.max(10, Math.min(30, weight * 40));
        arcsCtx.save();
        arcsCtx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0.2, weight)})`;
        arcsCtx.lineWidth = Math.max(1, weight * 7);
        arcsCtx.beginPath();
        arcsCtx.arc(queryX, queryY - loopR, loopR, 0, Math.PI * 2);
        arcsCtx.stroke();
        arcsCtx.restore();
        continue;
      }

      // Bezier curve
      const dist = Math.abs(queryX - keyX);
      const arcHeight = Math.min(180, Math.max(40, (dist / (W_px * 0.7)) * 140 + weight * 70));
      const midY = queryY - arcHeight;

      arcsCtx.save();
      const isTop = j === maxTargetIdx && weight > 0.25;
      if (isTop) {
        arcsCtx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
        arcsCtx.lineWidth = Math.max(3, weight * 10);
        arcsCtx.shadowColor = '#facc15';
        arcsCtx.shadowBlur = 14;
      } else {
        arcsCtx.strokeStyle = `rgba(6, 182, 212, ${Math.max(0.12, weight * 1.2)})`;
        arcsCtx.lineWidth = Math.max(1, weight * 7);
        arcsCtx.shadowColor = '#06b6d4';
        arcsCtx.shadowBlur = weight > 0.2 ? 8 : 0;
      }

      arcsCtx.beginPath();
      arcsCtx.moveTo(queryX, queryY - 8);
      arcsCtx.bezierCurveTo(queryX, midY, keyX, midY, keyX, keyY - 8);
      arcsCtx.stroke();
      arcsCtx.restore();

      // Draw percentage pill over top arc apex
      if (isTop) {
        const apexX = (queryX + keyX) / 2;
        const apexY = midY - 6;
        arcsCtx.save();
        arcsCtx.fillStyle = '#0f172a';
        arcsCtx.strokeStyle = '#facc15';
        arcsCtx.lineWidth = 1.5;
        const badgeW = 76;
        const badgeH = 18;
        arcsCtx.beginPath();
        arcsCtx.roundRect(apexX - badgeW / 2, apexY - badgeH / 2, badgeW, badgeH, 6);
        arcsCtx.fill();
        arcsCtx.stroke();
        arcsCtx.fillStyle = '#facc15';
        arcsCtx.font = 'bold 9.5px JetBrains Mono, monospace';
        arcsCtx.textAlign = 'center';
        arcsCtx.textBaseline = 'middle';
        arcsCtx.fillText(`Match: ${(weight * 100).toFixed(1)}%`, apexX, apexY);
        arcsCtx.restore();
      }
    }

    // Draw Token Pins and Labels along bottom
    for (let i = 0; i < N; i++) {
      const px = padL + i * stepX;
      const isQuery = i === focusedIdx;
      const isTop = i === maxTargetIdx;

      // Pin circle
      arcsCtx.save();
      if (isQuery) {
        arcsCtx.fillStyle = '#38bdf8';
        arcsCtx.shadowColor = '#38bdf8';
        arcsCtx.shadowBlur = 12;
        arcsCtx.beginPath();
        arcsCtx.arc(px, lineY, 7, 0, Math.PI * 2);
        arcsCtx.fill();
      } else if (isTop) {
        arcsCtx.fillStyle = '#facc15';
        arcsCtx.shadowColor = '#facc15';
        arcsCtx.shadowBlur = 10;
        arcsCtx.beginPath();
        arcsCtx.arc(px, lineY, 5.5, 0, Math.PI * 2);
        arcsCtx.fill();
      } else {
        arcsCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        arcsCtx.beginPath();
        arcsCtx.arc(px, lineY, 4, 0, Math.PI * 2);
        arcsCtx.fill();
      }
      arcsCtx.restore();

      // Word Label
      arcsCtx.save();
      arcsCtx.font = isQuery ? 'bold 11px Outfit, sans-serif' : '10px Outfit, sans-serif';
      arcsCtx.fillStyle = isQuery ? '#38bdf8' : (isTop ? '#facc15' : 'var(--text-muted)');
      arcsCtx.textAlign = 'center';
      const labelText = currentTokens[i].length > 7 ? currentTokens[i].substring(0, 6) + '..' : currentTokens[i];
      arcsCtx.fillText(labelText, px, lineY + 18);
      arcsCtx.restore();
    }
  }

  function drawHeatmap(hoverRow = -1, hoverCol = -1) {
    const W_px = 540;
    const H_px = 280;
    heatmapCtx.clearRect(0, 0, W_px, H_px);

    const N = currentTokens.length;
    const padL = 70;
    const padT = 35;
    const gridMaxW = W_px - padL - 25;
    const gridMaxH = H_px - padT - 25;
    const cellSize = Math.min(24, Math.floor(Math.min(gridMaxW, gridMaxH) / N));

    // Draw Column Headers (Keys)
    heatmapCtx.save();
    heatmapCtx.font = '9px JetBrains Mono, monospace';
    heatmapCtx.fillStyle = 'var(--text-muted)';
    heatmapCtx.textAlign = 'center';
    for (let c = 0; c < N; c++) {
      const cx = padL + c * cellSize + cellSize / 2;
      const rawWord = currentTokens[c];
      const shortWord = rawWord.length > 3 ? rawWord.substring(0, 3) : rawWord;
      heatmapCtx.fillText(shortWord, cx, padT - 8);
    }
    heatmapCtx.restore();

    // Draw Cells & Row Headers (Queries)
    for (let r = 0; r < N; r++) {
      const ry = padT + r * cellSize;
      const isQueryRow = r === focusedIdx;

      // Row Label
      heatmapCtx.save();
      heatmapCtx.font = isQueryRow ? 'bold 10px JetBrains Mono, monospace' : '9px JetBrains Mono, monospace';
      heatmapCtx.fillStyle = isQueryRow ? '#38bdf8' : 'var(--text-muted)';
      heatmapCtx.textAlign = 'right';
      heatmapCtx.textBaseline = 'middle';
      const rowWord = currentTokens[r].length > 7 ? currentTokens[r].substring(0, 6) + '..' : currentTokens[r];
      heatmapCtx.fillText(rowWord, padL - 8, ry + cellSize / 2);
      heatmapCtx.restore();

      for (let c = 0; c < N; c++) {
        const cx = padL + c * cellSize;
        const weight = attentionMatrix[r] ? (attentionMatrix[r][c] || 0) : 0;

        // Color ramp: dark indigo (0.0) -> cyan (0.5) -> bright yellow (1.0)
        let rVal, gVal, bVal;
        if (weight <= 0.5) {
          const t = weight / 0.5;
          rVal = Math.round(15 + t * (6 - 15));
          gVal = Math.round(23 + t * (182 - 23));
          bVal = Math.round(42 + t * (212 - 42));
        } else {
          const t = (weight - 0.5) / 0.5;
          rVal = Math.round(6 + t * (250 - 6));
          gVal = Math.round(182 + t * (204 - 182));
          bVal = Math.round(212 + t * (21 - 212));
        }

        heatmapCtx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
        heatmapCtx.fillRect(cx, ry, cellSize - 1, cellSize - 1);

        // Highlight hover cell
        if (r === hoverRow && c === hoverCol) {
          heatmapCtx.strokeStyle = '#ffffff';
          heatmapCtx.lineWidth = 2;
          heatmapCtx.strokeRect(cx - 0.5, ry - 0.5, cellSize, cellSize);
        }
      }

      // Highlight active query row with cyan border
      if (isQueryRow) {
        heatmapCtx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        heatmapCtx.lineWidth = 1.5;
        heatmapCtx.strokeRect(padL - 1, ry - 1, N * cellSize + 1, cellSize + 1);
      }
    }
  }

  function recomputeAndDraw() {
    computeAttention();
    updateHUDMetrics();
    renderTokenRibbon();
    renderVectorSliders();
    drawArcs();
    drawHeatmap();
  }

  // --- Canvas Interaction: Mouse Hover on Heatmap ---
  heatmapCanvas.addEventListener('mousemove', (e) => {
    const rect = heatmapCanvas.getBoundingClientRect();
    const scaleX = heatmapCanvas.width / rect.width;
    const scaleY = heatmapCanvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const N = currentTokens.length;
    const padL = 70;
    const padT = 35;
    const gridMaxW = heatmapCanvas.width - padL - 25;
    const gridMaxH = heatmapCanvas.height - padT - 25;
    const cellSize = Math.min(24, Math.floor(Math.min(gridMaxW, gridMaxH) / N));

    const col = Math.floor((mouseX - padL) / cellSize);
    const row = Math.floor((mouseY - padT) / cellSize);

    if (row >= 0 && row < N && col >= 0 && col < N) {
      drawHeatmap(row, col);
      const raw = rawScoresMatrix[row] ? rawScoresMatrix[row][col] : 0;
      const scaled = scaledScoresMatrix[row] ? scaledScoresMatrix[row][col] : 0;
      const prob = attentionMatrix[row] ? attentionMatrix[row][col] : 0;
      heatmapHoverInfo.innerHTML = `
        Cell <strong>[Q: "${currentTokens[row]}" ➔ K: "${currentTokens[col]}"]</strong>:
        Raw Dot = <span style="color: #38bdf8;">${raw.toFixed(2)}</span> |
        Scaled = <span style="color: #c4b5fd;">${scaled.toFixed(2)}</span> |
        Softmax Weight = <strong style="color: #facc15;">${(prob * 100).toFixed(1)}%</strong>
      `;
    } else {
      drawHeatmap(-1, -1);
      heatmapHoverInfo.textContent = 'Hover over any cell (i, j) to inspect the exact dot product and softmax calculation.';
    }
  });

  heatmapCanvas.addEventListener('mouseleave', () => {
    drawHeatmap(-1, -1);
    heatmapHoverInfo.textContent = 'Hover over any cell (i, j) to inspect the exact dot product and softmax calculation.';
  });

  // --- Canvas Click: Click Arc Canvas token pin to switch Query ---
  arcsCanvas.addEventListener('click', (e) => {
    const rect = arcsCanvas.getBoundingClientRect();
    const scaleX = arcsCanvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    const N = currentTokens.length;
    const padL = 36;
    const padR = 36;
    const stepX = (arcsCanvas.width - padL - padR) / Math.max(1, N - 1);

    for (let i = 0; i < N; i++) {
      const px = padL + i * stepX;
      if (Math.abs(mouseX - px) < stepX / 2) {
        focusedIdx = i;
        state.attnFocusedToken = i;
        state.attnQueryVectorOverride = null;
        recomputeAndDraw();
        break;
      }
    }
  });

  // --- Sentence Selector Listener ---
  sentenceSelect.addEventListener('change', (e) => {
    currentSentenceIdx = parseInt(e.target.value, 10);
    state.attnSentenceIdx = currentSentenceIdx;
    const selected = sentences[currentSentenceIdx];
    currentTokens = selected?.tokens || ["Attention", "is", "all", "you", "need"];
    focusedIdx = selected?.targetTokenIdx ?? 0;
    state.attnFocusedToken = focusedIdx;
    state.attnQueryVectorOverride = null;
    recomputeAndDraw();
  });

  // --- Custom Sentence Tokenize Button ---
  btnApplyCustom.addEventListener('click', () => {
    const text = customInput.value.trim();
    if (!text) return;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 2) return;

    currentTokens = words.slice(0, 16); // limit to 16 tokens for clean display
    focusedIdx = 0;
    state.attnFocusedToken = 0;
    state.attnQueryVectorOverride = null;
    recomputeAndDraw();
  });

  // --- Multi-Head Selector Buttons ---
  container.querySelectorAll('#attn-head-group .param-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#attn-head-group .param-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.attnHead = btn.dataset.head;
      const headLabels = {
        'head-1': 'Head 1: Syntax & Dependency',
        'head-2': 'Head 2: Coreference & Entities',
        'head-3': 'Head 3: Positional Locality',
        'all': 'Average Multi-Head Ensemble'
      };
      labelActiveHead.textContent = headLabels[state.attnHead] || state.attnHead;
      recomputeAndDraw();
    });
  });

  // --- Scale Factor Toggle Button ---
  btnToggleScale.addEventListener('click', () => {
    state.attnScaleEnabled = !state.attnScaleEnabled;
    badgeScaleStatus.className = `scale-badge ${state.attnScaleEnabled ? 'enabled' : 'disabled'}`;
    badgeScaleStatus.textContent = state.attnScaleEnabled ? 'Active (÷ 2.0)' : 'Disabled (Raw)';
    btnToggleScale.className = `btn-toggle-scale ${state.attnScaleEnabled ? 'active' : ''}`;
    btnToggleScale.querySelector('span').textContent = state.attnScaleEnabled
      ? '✓ Guardrail Enabled (÷ √d_k)'
      : '⚠️ Guardrail Bypassed (Saturate Softmax)';
    recomputeAndDraw();
  });

  // --- Reset Vector Button ---
  btnResetVector.addEventListener('click', () => {
    state.attnQueryVectorOverride = null;
    recomputeAndDraw();
  });

  // Initial draw
  recomputeAndDraw();
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
          soundFx.playQuizCorrect();
          btn.classList.add('correct');
          feedbackEl.style.display = 'block';
          feedbackEl.style.background = 'rgba(16, 185, 129, 0.2)';
          feedbackEl.style.color = '#34d399';
          feedbackEl.innerHTML = `✓ <strong>Correct!</strong> ${q.explanation}`;
          awardXp(50);
          const wasAllCompleteBefore = state.completedQuests.size === state.curriculum.quests.length;
          state.completedQuests.add(quest.id);
          localStorage.setItem('nq_completed_quests', JSON.stringify([...state.completedQuests]));
          renderQuestList();
          updateDiplomaStatus();

          if (!wasAllCompleteBefore && state.completedQuests.size === state.curriculum.quests.length) {
            setTimeout(() => {
              soundFx.playDiplomaFanfare();
              confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
              alert('🎉 CONGRATULATIONS!\nYou have conquered all 7 Deep Learning Quests!\nSensei Tensor has conferred your Master Diploma! Click "Diploma" in the navbar to claim and download your credential.');
            }, 600);
          } else {
            soundFx.playQuestComplete();
          }
        } else {
          soundFx.playQuizWrong();
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
  ],
  'quest-6': [
    { label: '🐉 How does Dropout prevent co-adaptation?', prompt: 'Explain how Dropout (p=0.5) forces individual neurons to learn useful features instead of relying on neighboring neurons to fix mistakes.' },
    { label: '🐉 Why do train and val loss diverge?', prompt: 'Walk through why training loss keeps dropping while validation loss explodes upward when a neural network overfits.' },
    { label: '⚖️ How does L2 Weight Decay smooth boundaries?', prompt: 'Explain the mathematics of L2 weight decay (loss + 0.5 * lambda * ||w||^2) and why smaller weights produce smoother curves.' },
    { label: '🎯 Quiz me on Regularization', prompt: 'Give me a challenging question about bias-variance tradeoff, early stopping, and dropout in PyTorch!' }
  ],
  'quest-7': [
    { label: '⚡ Why divide QKT by sqrt(dk)?', prompt: 'Walk through why the scaling factor sqrt(d_k) prevents softmax from saturating into an argmax spike with vanishing gradients.' },
    { label: '📚 Explain Q, K, and V with an analogy', prompt: 'Explain Query, Key, and Value vectors using an intuitive everyday analogy like a research library or YouTube search engine.' },
    { label: '🤖 How does Multi-Head Attention see multiple angles?', prompt: 'Explain how splitting embeddings into multiple attention heads lets a model track grammar, coreference, and semantics simultaneously.' },
    { label: '🎯 Quiz me on Transformers', prompt: 'Give me a challenging question about self-attention, masking, or transformer architecture in PyTorch!' }
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

function formatAiBubbleHtml(text) {
  if (!text) return '';
  // Convert KaTeX formulas before markdown parsing
  let processed = String(text)
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => `<div class="math-display">${renderTex(m.trim(), true)}</div>`)
    .replace(/\$([^$\n]+?)\$/g, (_, m) => renderTex(m.trim()));
  return marked.parse(processed);
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
      ${isAi ? formatAiBubbleHtml(text) : `<p>${escapeHtml(text)}</p>`}
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
        <p>I am your dedicated Deep Learning mentor, powered by the built-in <strong>Offline Dojo Knowledge Engine</strong> (ready instantly with zero setup, zero API key required!).</p>
        <p>Whether you're curious about how weights act like volume knobs, why non-linearity bends space, rolling marbles down gradient slopes, or debugging PyTorch convolutional layers, ask away or click any suggested prompt below!</p>
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

  // If the answer awarded pop quiz XP, grant it
  if (answer.includes('+30 XP EARNED')) {
    awardXp(30, 'Dojo Pop Quiz Correct Answer');
  }
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
    dom.tutorModelBadge.textContent = tutorService.getModeBadge();
    if (tutorService.isOfflineMode()) {
      dom.tutorModelBadge.classList.add('offline-dojo');
      dom.tutorModelBadge.title = 'Sensei Tensor is running in built-in Offline Dojo Mode! Add an API key in Settings for live cloud generative model.';
    } else {
      dom.tutorModelBadge.classList.remove('offline-dojo');
      dom.tutorModelBadge.title = 'Live Generative Cloud AI active';
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
    if (dom.settingsLearnerName) {
      dom.settingsLearnerName.value = localStorage.getItem('nq_learner_name') || 'Tensor Scholar';
    }
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
    if (dom.settingsLearnerName) {
      const name = dom.settingsLearnerName.value.trim() || 'Tensor Scholar';
      localStorage.setItem('nq_learner_name', name);
      if (dom.diplomaStudentName) dom.diplomaStudentName.value = name;
    }

    tutorService.setProvider(provider, customUrl);
    tutorService.setApiKey(key);
    tutorService.setModel(model);
    state.backendUrl = backend;
    localStorage.setItem('nq_backend_url', backend);

    updateTutorBadge();
    closeModal();
    checkBackendStatus();
  });

  if (dom.btnExportProgress) {
    dom.btnExportProgress.addEventListener('click', () => {
      const res = exportProgress(state, tutorService);
      if (res.success) {
        dom.settingsTestStatus.innerHTML = `<span style="color: #34d399;">✓ Saved journey data exported to <strong>${res.fileName}</strong></span>`;
      }
    });
  }

  if (dom.btnImportTrigger && dom.fileImportProgress) {
    dom.btnImportTrigger.addEventListener('click', () => {
      dom.fileImportProgress.click();
    });

    dom.fileImportProgress.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = importProgress(event.target.result, state, tutorService);
        if (res.success) {
          updateXpDisplay();
          renderQuestList();
          renderActiveQuest();
          updateDiplomaStatus();
          updateTutorBadge();
          dom.settingsTestStatus.innerHTML = `<span style="color: #34d399;">✓ Successfully restored journey for <strong>${res.learnerName}</strong> (${res.completedCount}/7 quests, ${res.userXp} XP)!</span>`;
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } else {
          dom.settingsTestStatus.innerHTML = `<span style="color: #f87171;">❌ Restore failed: ${res.error}</span>`;
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  if (dom.btnResetProgress) {
    dom.btnResetProgress.addEventListener('click', () => {
      if (confirm('⚠️ Are you sure you want to reset all quest progress and XP? This action cannot be undone.')) {
        resetProgress(state);
        updateXpDisplay();
        renderQuestList();
        renderActiveQuest();
        updateDiplomaStatus();
        closeModal();
        alert('✓ Progress reset to beginning.');
      }
    });
  }

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
      soundFx.playBlip(620);
    });
  });
}

// --- MOBILE SIDEBAR DRAWER ---
function setupMobileSidebar() {
  if (dom.btnToggleSidebar) {
    dom.btnToggleSidebar.addEventListener('click', () => {
      const isOpen = dom.sidebarQuests && dom.sidebarQuests.classList.contains('open');
      setSidebarOpen(!isOpen);
    });
  }
  if (dom.btnCloseSidebar) {
    dom.btnCloseSidebar.addEventListener('click', () => setSidebarOpen(false));
  }
  if (dom.sidebarBackdrop) {
    dom.sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.sidebarQuests && dom.sidebarQuests.classList.contains('open')) setSidebarOpen(false);
      if (dom.aiTutorModal && dom.aiTutorModal.style.display === 'flex') dom.aiTutorModal.style.display = 'none';
      if (dom.settingsModal && dom.settingsModal.style.display === 'flex') dom.settingsModal.style.display = 'none';
      if (dom.diplomaModal && dom.diplomaModal.style.display === 'flex') dom.diplomaModal.style.display = 'none';
    }
  });
}

// --- DIPLOMA & COURSE COMPLETION MODAL ---
let activeDiplomaCanvas = null;

function updateDiplomaStatus() {
  const total = state.curriculum.quests.length;
  const completed = state.completedQuests.size;
  if (dom.diplomaNavPill) {
    dom.diplomaNavPill.textContent = `${completed}/${total}`;
  }
  if (dom.sidebarDiplomaStatus) {
    if (completed >= total) {
      dom.sidebarDiplomaStatus.textContent = '★ All 7 Conquered! Claim Master Diploma';
    } else {
      dom.sidebarDiplomaStatus.textContent = `${completed}/${total} Conquered • Tap to view`;
    }
  }
  if (completed >= total) {
    if (dom.btnOpenDiploma) dom.btnOpenDiploma.classList.add('unlocked');
    if (dom.sidebarDiplomaTrigger) dom.sidebarDiplomaTrigger.classList.add('unlocked');
  } else {
    if (dom.btnOpenDiploma) dom.btnOpenDiploma.classList.remove('unlocked');
    if (dom.sidebarDiplomaTrigger) dom.sidebarDiplomaTrigger.classList.remove('unlocked');
  }
}

function renderDiplomaPreview() {
  if (!dom.diplomaCanvasWrapper) return;
  const studentName = (dom.diplomaStudentName ? dom.diplomaStudentName.value.trim() : '') || 'Tensor Scholar';
  
  activeDiplomaCanvas = generateDiplomaCanvas({
    studentName,
    completedQuests: [...state.completedQuests],
    totalQuests: state.curriculum.quests.length,
    userXp: state.userXp
  });

  dom.diplomaCanvasWrapper.innerHTML = '';
  dom.diplomaCanvasWrapper.appendChild(activeDiplomaCanvas);
}

function setupDiplomaModal() {
  const openModal = () => {
    const savedName = localStorage.getItem('nq_learner_name') || 'Tensor Scholar';
    if (dom.diplomaStudentName) dom.diplomaStudentName.value = savedName;
    renderDiplomaPreview();
    if (dom.diplomaModal) dom.diplomaModal.style.display = 'flex';
    if (state.completedQuests.size >= state.curriculum.quests.length) {
      soundFx.playDiplomaFanfare();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else {
      soundFx.playDojoGong();
    }
  };

  const closeModal = () => {
    if (dom.diplomaModal) dom.diplomaModal.style.display = 'none';
  };

  if (dom.btnOpenDiploma) dom.btnOpenDiploma.addEventListener('click', openModal);
  if (dom.sidebarDiplomaTrigger) dom.sidebarDiplomaTrigger.addEventListener('click', openModal);
  if (dom.btnCloseDiploma) dom.btnCloseDiploma.addEventListener('click', closeModal);

  // Live input synchronization
  if (dom.diplomaStudentName) {
    dom.diplomaStudentName.addEventListener('input', (e) => {
      const val = e.target.value;
      localStorage.setItem('nq_learner_name', val);
      if (dom.settingsLearnerName) dom.settingsLearnerName.value = val;
      renderDiplomaPreview();
    });
  }

  // Download PNG button
  if (dom.btnDownloadDiploma) {
    dom.btnDownloadDiploma.addEventListener('click', () => {
      const name = dom.diplomaStudentName.value.trim() || 'Tensor Scholar';
      if (!activeDiplomaCanvas) renderDiplomaPreview();
      downloadDiplomaPng(activeDiplomaCanvas, name);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    });
  }

  // Print button
  if (dom.btnPrintDiploma) {
    dom.btnPrintDiploma.addEventListener('click', () => {
      window.print();
    });
  }

  // Share button
  if (dom.btnShareDiploma) {
    dom.btnShareDiploma.addEventListener('click', async () => {
      const name = (dom.diplomaStudentName ? dom.diplomaStudentName.value.trim() : '') || 'Tensor Scholar';
      const code = generateVerificationCode(name);
      const text = `🥋 I just conquered all 7 Deep Learning Quests on NeuroQuest! Earned ${state.userXp} XP under Sensei Tensor. Credential ID: ${code} 🚀🧠`;
      try {
        await navigator.clipboard.writeText(text);
        const originalText = dom.btnShareDiploma.innerHTML;
        dom.btnShareDiploma.innerHTML = `<span>✓</span> Copied to Clipboard!`;
        setTimeout(() => {
          dom.btnShareDiploma.innerHTML = originalText;
        }, 2000);
      } catch {
        alert(text);
      }
    });
  }
}

// --- AUDIO CONTROLS ---
function updateAudioUI() {
  const isMuted = soundFx.isMuted;
  if (dom.audioIcon) dom.audioIcon.textContent = isMuted ? '🔇' : '🔊';
  if (dom.audioText) dom.audioText.textContent = isMuted ? 'Muted' : 'Audio';
  if (dom.btnToggleSound) {
    dom.btnToggleSound.classList.toggle('muted', isMuted);
    dom.btnToggleSound.title = isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects';
  }
  if (dom.settingsAudioStatus) {
    dom.settingsAudioStatus.textContent = isMuted ? '🔇 Muted' : '🔊 Enabled';
  }
}

function setupAudioControls() {
  updateAudioUI();

  const handleToggle = () => {
    soundFx.toggleMute();
    updateAudioUI();
  };

  if (dom.btnToggleSound) {
    dom.btnToggleSound.addEventListener('click', handleToggle);
  }
  if (dom.settingsAudioToggle) {
    dom.settingsAudioToggle.addEventListener('click', handleToggle);
  }

  // Resume Web Audio context on first user click anywhere
  const resumeAudio = () => {
    soundFx.init();
    window.removeEventListener('click', resumeAudio);
    window.removeEventListener('keydown', resumeAudio);
  };
  window.addEventListener('click', resumeAudio, { once: true });
  window.addEventListener('keydown', resumeAudio, { once: true });
}

// --- APP BOOTSTRAP ---
function initApp() {
  updateXpDisplay();
  renderQuestList();
  renderActiveQuest();
  setupTabs();
  setupMobileSidebar();
  setupCodeLab();
  setupAiTutor();
  setupSettings();
  setupAudioControls();
  setupDiplomaModal();
  updateDiplomaStatus();
  updateTutorBadge();

  checkBackendStatus();
  setInterval(checkBackendStatus, 15000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
