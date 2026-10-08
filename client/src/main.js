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
import { ArchitectDesigner } from './architect_designer.js';
import { DoodleCapstoneStudio } from './doodle_capstone.js';
import { GalaxyConstellationMap } from './galaxy_map.js';
import { DojoManager } from './dojo_achievements.js';
import { LossLandscape3D } from './loss_landscape_3d.js';

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
  attnQueryVectorOverride: null,
  // Quest 8: BPE & Embeddings Lab state
  bpeText: 'Tokenization powers modern LLMs like ChatGPT and Llama.',
  bpeSelectedTokenIdx: 0,
  bpeActiveTab: 'tokenizer', // 'tokenizer' | 'embeddings' | 'rope'
  bpeRopePos: 2,
  bpeVectorArithmeticActive: false,
  // Quest 9: Transformer Block Inspector state
  gptActiveTab: 'flow', // 'flow' | 'mask' | 'kvcache'
  gptCausalMaskActive: true,
  gptFocusedLayerIdx: 2, // Causal MHA
  gptKvSeqLen: 128,
  // Quest 10: Generation Engine & Sampling Dynamics state
  genPromptIdx: 0,
  genTemperature: 0.7,
  genTopP: 0.90,
  genTopK: 5,
  genRepetitionPenalty: 1.15,
  genTokensHistory: [],
  genActiveTab: 'roulette', // 'roulette' | 'autoreg' | 'compare'
  genStreamingActive: false,
  // Quest 11: Post-Training & Alignment (SFT, ChatML & DPO) state
  dpoScenarioIdx: 0,
  dpoBeta: 0.10,
  dpoActiveTab: 'dojo', // 'dojo' | 'chatml' | 'rlhf_vs_dpo'
  dpoUserVotes: {},
  dpoTrainedSteps: 0,
  dpoLossMaskMode: 'labels', // 'input_ids' | 'labels'
  // Quest 12: PEFT & LoRA (Rank Factorization & QLoRA Quantization) state
  loraRank: 8,
  loraAlpha: 16,
  loraQuantMode: 'nf4_4bit', // 'fp16' | 'int8' | 'nf4_4bit'
  loraBaseModel: 'llama3_8b',
  loraSelectedModules: ['q_proj', 'v_proj'],
  loraActiveTab: 'matrix', // 'matrix' | 'vram_qlora' | 'hot_swap'
  loraTrainedSteps: 0,
  loraActiveAdapter: 'medical',
  loraMerged: false,
  // Quest 13: Reasoning Models & Test-Time Compute state
  reasoningProblemIdx: 0,
  reasoningBudget: 1024,
  reasoningTemp: 0.6,
  reasoningActiveTab: 'scratchpad', // 'scratchpad' | 'prm_tree' | 'grpo_arena'
  reasoningActiveStep: 0,
  reasoningRolloutGroupIdx: 0,
  reasoningIsPlaying: false,
  // Quest 14: Agentic Tool Use & Function Calling state
  agentScenarioIdx: 0,
  agentActiveTab: 'react_loop', // 'react_loop' | 'schema_inspector' | 'swarm_arena'
  agentActiveStep: 1,
  agentAutoPlay: false,
  agentSelectedToolIdx: 0,
  agentCustomArgs: {},
  agentSwarmRunning: false,
  agentSwarmStep: 0,
  // Quest 15: Multimodal Vision-Language Models state
  vlmImageIdx: 0,
  vlmActiveTab: 'patch_inspector', // 'patch_inspector' | 'projector_arena' | 'visual_qa'
  vlmSelectedPatchIdx: 9, // default selected patch (0-indexed: 9 = Patch 10)
  vlmProjectorMode: 'mlp_llava', // 'linear' | 'mlp_llava' | 'perceiver'
  vlmShowBoundingBox: true,
  vlmTokensGenerated: false,
  // Quest 16: Mixture-of-Experts state
  moePromptIdx: 0,
  moeActiveTab: 'routing_inspector', // 'routing_inspector' | 'load_balancer' | 'arch_arena'
  moeTopK: 2,
  moeSelectedTokenIdx: 2,
  moeRoutingMode: 'top2_mixtral', // 'top1_switch' | 'top2_mixtral' | 'shared_deepseek'
  moeAuxLossWeight: 0.01,
  moeCapacityFactor: 1.25,
  // Quest 17: Diffusion Models & Flow Matching state
  diffScenarioIdx: 0,
  diffActiveTab: 'noise_denoise_canvas', // 'noise_denoise_canvas' | 'cfg_sampler' | 'flow_matching'
  diffTimestep: 500,
  diffCfgScale: 7.5,
  diffSampler: 'flow_matching', // 'ddpm' | 'ddim' | 'flow_matching'
  diffNumSteps: 20,
  // Quest 18: Audio & Speech AI (Neural Codecs & RVQ)
  audioScenarioIdx: 0,
  audioActiveTab: 'spectrogram_synth', // 'spectrogram_synth' | 'rvq_studio' | 'speech_lm'
  audioRvqStages: 4,
  audioMelBins: 80,
  audioPlaybackActive: false,
  audioPlaybackFreq: 440,
  // Quest 19: World Models & Video Generation state
  worldScenarioIdx: 0,
  worldActiveTab: 'spacetime_tubelets', // 'spacetime_tubelets' | 'dit_attention' | 'world_simulator'
  worldTubeletSizeIdx: 1, // 0: 8x8x2, 1: 16x16x2, 2: 16x16x4
  worldCurrentFrame: 4,
  worldMotionScale: 2.5,
  worldSimAction: 'accelerate', // 'steer_left' | 'accelerate' | 'steer_right' | 'brake'
  worldRolloutSteps: 5,
  // Quest 20: Embodied AI & Robotics Foundation Models state
  robotScenarioIdx: 0,
  robotActiveTab: 'vla_teleop', // 'vla_teleop' | 'action_chunking' | 'diffusion_policy'
  robotChunkSizeIdx: 1, // 0: k=10, 1: k=50, 2: k=100
  robotEePos: [0.35, -0.15, 0.22],
  robotGripperState: 0.0,
  robotPathMode: 'diffusion_policy', // 'mse_average' | 'diffusion_policy'
  robotDenoiseStep: 16
};

const tutorService = new AITutorService();

// --- DOM References ---
const dom = {
  // Navigation
  userLevelBadge: document.getElementById('user-level-badge'),
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
  diplomaCanvasWrapper: document.getElementById('diploma-canvas-wrapper'),
  // Architect Designer Modal
  btnOpenArchitect: document.getElementById('btn-open-architect'),
  architectModal: document.getElementById('architect-modal'),
  btnCloseArchitect: document.getElementById('btn-close-architect'),
  architectCanvas: document.getElementById('architect-canvas'),
  architectControlsContainer: document.getElementById('architect-controls-container'),
  architectCodeOutput: document.getElementById('architect-code-output'),
  architectParamsBadge: document.getElementById('architect-params-badge'),
  architectInspectorBox: document.getElementById('architect-inspector-box'),
  architectPresetSelect: document.getElementById('architect-preset-select'),
  btnAddLayer: document.getElementById('btn-add-layer'),
  btnPulseSignal: document.getElementById('btn-pulse-signal'),
  btnExportArchitectCode: document.getElementById('btn-export-architect-code'),
  btnCopyArchitectCode: document.getElementById('btn-copy-architect-code')
,
  // DoodleVision Capstone Modal
  btnOpenCapstone: document.getElementById('btn-open-capstone'),
  sidebarCapstoneTrigger: document.getElementById('sidebar-capstone-trigger'),
  capstoneModal: document.getElementById('capstone-modal'),
  btnCloseCapstone: document.getElementById('btn-close-capstone'),
  doodleCanvas: document.getElementById('doodle-canvas'),
  doodlePreview28: document.getElementById('doodle-preview-28x28'),
  doodleEngineBadge: document.getElementById('doodle-engine-badge'),
  doodleEngineStatusText: document.getElementById('doodle-engine-status-text'),
  tabCapstoneSketch: document.getElementById('tab-capstone-sketch'),
  tabCapstonePictionary: document.getElementById('tab-capstone-pictionary'),
  tabCapstoneTraining: document.getElementById('tab-capstone-training'),
  capstoneContentSketch: document.getElementById('capstone-content-sketch'),
  capstoneContentPictionary: document.getElementById('capstone-content-pictionary'),
  capstoneContentTraining: document.getElementById('capstone-content-training'),
  btnToolBrush: document.getElementById('btn-tool-brush'),
  btnToolEraser: document.getElementById('btn-tool-eraser'),
  btnDoodleUndo: document.getElementById('btn-doodle-undo'),
  btnDoodleClear: document.getElementById('btn-doodle-clear'),
  btnStartPictionary: document.getElementById('btn-start-pictionary'),
  btnDoodleTrainStep: document.getElementById('btn-doodle-train-step'),
  btnDoodleResetModel: document.getElementById('btn-doodle-reset-model'),
  btnDoodleSendCode: document.getElementById('btn-doodle-send-code'),
  btnDoodleExportWeights: document.getElementById('btn-doodle-export-weights'),
  btnDoodleExportScript: document.getElementById('btn-doodle-export-script'),
  // Celestial Galaxy Map Modal
  btnOpenGalaxy: document.getElementById('btn-open-galaxy'),
  btnSidebarGalaxy: document.getElementById('btn-sidebar-galaxy'),
  galaxyModal: document.getElementById('galaxy-modal'),
  btnCloseGalaxy: document.getElementById('btn-close-galaxy'),
  galaxyCanvas: document.getElementById('galaxy-canvas'),
  galaxyInspectorDrawer: document.getElementById('galaxy-inspector-drawer'),
  galaxyStarsConquered: document.getElementById('galaxy-stars-conquered'),
  btnGalaxyZoomIn: document.getElementById('btn-galaxy-zoom-in'),
  btnGalaxyZoomOut: document.getElementById('btn-galaxy-zoom-out'),
  btnGalaxyFit: document.getElementById('btn-galaxy-fit'),
  // Studios Dropdown & Command Palette
  btnStudiosDropdown: document.getElementById('btn-studios-dropdown'),
  studiosDropdownWrapper: document.getElementById('studios-dropdown-wrapper'),
  btnMenuGalaxy: document.getElementById('btn-menu-galaxy'),
  btnMenuTrophy: document.getElementById('btn-menu-trophy'),
  btnMenuLandscape: document.getElementById('btn-menu-landscape'),
  trophyModal: document.getElementById('trophy-modal'),
  landscapeModal: document.getElementById('landscape-modal'),
  landscapeCanvasContainer: document.getElementById('landscape-canvas-container'),
  paletteModal: document.getElementById('palette-modal'),
  paletteSearchInput: document.getElementById('palette-search-input'),
  paletteResultsContainer: document.getElementById('palette-results-container'),
  btnOpenPalette: document.getElementById('btn-open-palette')
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
  if (window.dojoManager) {
    const currentBelt = window.dojoManager.getCurrentBelt(xp);
    dom.userLevelText.textContent = `${currentBelt.kanji} Lvl ${level} • ${currentBelt.name}`;
    if (dom.userLevelBadge) {
      dom.userLevelBadge.title = `🥋 ${currentBelt.japaneseName} (${currentBelt.title}) — ${xp} XP. Click or press 'B' to view Dojo Trophy Room.`;
    }
  } else {
    dom.userLevelText.textContent = `Lvl ${level}`;
    if (dom.userLevelBadge) {
      dom.userLevelBadge.title = `Level ${level}: ${title} (${xp} / ${nextXp} XP)`;
    }
  }
  dom.xpBarFill.style.width = `${progressPercent}%`;
  dom.xpLabelText.textContent = `${xp}/${nextXp} XP`;

  localStorage.setItem('nq_user_xp', xp.toString());
}

function awardXp(amount, reason = '') {
  state.userXp += amount;
  updateXpDisplay();
  if (window.dojoManager) {
    window.dojoManager.checkBadges();
  }
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
      dom.backendStatusText.textContent = 'PyTorch';
      dom.backendStatusPill.title = 'PyTorch Backend Engine: Online (Ready)';
      if (dom.doodleEngineBadge) {
        dom.doodleEngineBadge.style.background = 'rgba(16, 185, 129, 0.12)';
        dom.doodleEngineBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        dom.doodleEngineBadge.style.color = '#34d399';
      }
      if (dom.doodleEngineStatusText) dom.doodleEngineStatusText.textContent = 'PyTorch Engine: Ready 🟢';
    } else {
      throw new Error();
    }
  } catch {
    state.backendOnline = false;
    dom.backendStatusPill.classList.remove('online');
    dom.backendStatusText.textContent = 'Offline';
    dom.backendStatusPill.title = 'PyTorch Backend Engine: Offline (Local Heuristic Mode)';
    if (dom.doodleEngineBadge) {
      dom.doodleEngineBadge.style.background = 'rgba(245, 158, 11, 0.12)';
      dom.doodleEngineBadge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      dom.doodleEngineBadge.style.color = '#fbbf24';
    }
    if (dom.doodleEngineStatusText) dom.doodleEngineStatusText.textContent = 'Local Heuristic Mode 🟡';
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

  const lesson = quest.lesson || quest.lessonContent;
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
    const heading = sec.heading || sec.title || `Section ${secIdx + 1}`;
    const content = sec.content || (Array.isArray(sec.paragraphs) ? sec.paragraphs.join('\n\n') : '');
    const rawCallout = sec.callout || (sec.keyTakeaway ? `💡 Key Takeaway: ${sec.keyTakeaway}` : null);
    const callout = rawCallout ? parseCallout(rawCallout) : null;
    return `
    <div class="lesson-section-card" data-section-idx="${secIdx}">
      <h3 class="lesson-section-title">${escapeHtml(heading)}</h3>
      <div class="lesson-section-body">
        ${formatLessonText(content)}
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

  const formulaCard = lesson.formulaCard || (lesson.formula ? {
    title: 'Mathematical Engine',
    equation: lesson.formula,
    breakdown: lesson.formulaExplanation ? [{ symbol: '\\mathcal{J}(\\theta)', meaning: lesson.formulaExplanation }] : []
  } : null);

  const formulaBreakdownHtml = formulaCard && formulaCard.breakdown ? `
    <div class="formula-breakdown-grid">
      ${formulaCard.breakdown.map(item => `
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

  const analogy = lesson.analogy || (quest.mentalModel ? (typeof quest.mentalModel === 'object' ? {
    title: quest.mentalModel.analogy || 'Core Mental Model',
    description: quest.mentalModel.explanation || ''
  } : {
    title: 'Core Mental Model',
    description: quest.mentalModel
  }) : null);

  card.innerHTML = `
    <!-- Lesson Meta Header -->
    <div class="lesson-meta-bar">
      <div class="lesson-badges">
        <span class="lesson-badge difficulty">${escapeHtml(lesson.difficulty || 'Advanced Theory')}</span>
        <span class="lesson-badge time">⏱️ ${escapeHtml(lesson.readTime || '5 min read')}</span>
        <span class="lesson-badge xp">⭐ +${quest.xp} XP Available</span>
      </div>
      <div class="lesson-hook-text">
        <em>${formatLessonText(lesson.hook || quest.story || '', { inline: true })}</em>
      </div>
    </div>

    <!-- Analogy Card -->
    ${analogy ? `
      <div class="lesson-analogy-card">
        <div class="analogy-header">
          <span class="analogy-tag">CORE MENTAL MODEL</span>
          <h4 class="analogy-title">${escapeHtml(analogy.title)}</h4>
        </div>
        <div class="analogy-desc">${formatLessonText(analogy.description)}</div>
      </div>
    ` : ''}

    <!-- Structured Lesson Sections with Visuals -->
    <div class="lesson-sections-container">
      ${sectionsHtml}
    </div>

    <!-- Formula Card with KaTeX Math Engine -->
    ${formulaCard ? `
      <div class="lesson-formula-card">
        <div class="formula-card-header">
          <span class="formula-header-icon">📐</span>
          <h4>${escapeHtml(formulaCard.title || 'Mathematical Engine')}</h4>
        </div>
        <div class="formula-display-box">
          ${renderTex(formulaCard.equation, true)}
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
    case 'bpe_embedding_lab':
      renderBpeEmbeddingLabWidget(quest);
      break;
    case 'transformer_block_inspector':
      renderTransformerBlockInspectorWidget(quest);
      break;
    case 'generation_sampler_lab':
      renderGenerationSamplerLabWidget(quest);
      break;
    case 'alignment_dpo_lab':
      renderAlignmentDpoLabWidget(quest);
      break;
    case 'peft_lora_lab':
      renderPeftLoraLabWidget(quest);
      break;
    case 'reasoning_model_lab':
      renderReasoningModelLabWidget(quest);
      break;
    case 'agentic_tool_lab':
      renderAgenticToolLabWidget(quest);
      break;
    case 'multimodal_vlm_lab':
      renderMultimodalVlmLabWidget(quest);
      break;
    case 'moe_routing_lab':
      renderMoeRoutingLabWidget(quest);
      break;
    case 'diffusion_flow_lab':
      renderDiffusionFlowLabWidget(quest);
      break;
    case 'audio_speech_lab':
      renderAudioSpeechLabWidget(quest);
      break;
    case 'world_model_video_lab':
      renderWorldModelVideoLabWidget(quest);
      break;
    case 'embodied_robotics_lab':
      renderEmbodiedRoboticsLabWidget(quest);
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
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
      <h3 style="font-size: 1.1rem; color: #fff;">Roll Down the Loss Landscape</h3>
      <div style="display: flex; gap: 0.85rem; align-items: center;">
        <button class="btn-3d-loss-banner" id="btn-quest-open-3d-loss" title="Open full 3D Non-Convex Mountain Playground (Shortcut: L)">
          <span>⛰️ Launch 3D Mountain (WebGL)</span>
          <kbd class="banner-kbd">L</kbd>
        </button>
        <div style="display: flex; gap: 1rem; font-family: var(--font-mono); font-size: 0.85rem;">
          <span style="color: var(--accent-cyan);">Current Weight (w): <strong id="grad-weight-val">${state.gradientWeight.toFixed(3)}</strong></span>
          <span style="color: var(--accent-amber);">Loss L(w): <strong id="grad-loss-val">0.00</strong></span>
          <span style="color: var(--text-dim);">Steps: <strong id="grad-step-val">0</strong></span>
        </div>
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

  const btnQuest3D = container.querySelector('#btn-quest-open-3d-loss');
  if (btnQuest3D) {
    btnQuest3D.addEventListener('click', () => {
      if (window.landscape3dStudio) window.landscape3dStudio.openModal();
    });
  }
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

// ============================================================================
// WIDGET 8: Words into Vectors (BPE Tokenization & Embeddings Lab)
// ============================================================================
function renderBpeEmbeddingLabWidget(quest) {
  const container = document.createElement('div');
  container.className = 'bpe-lab-container';

  const presets = quest.interactiveConfig?.presets || [];
  let currentText = state.bpeText || "Tokenization powers modern LLMs like ChatGPT and Llama.";
  let selectedTokenIdx = state.bpeSelectedTokenIdx || 0;
  let activeTab = state.bpeActiveTab || 'tokenizer';
  let ropePos = state.bpeRopePos !== undefined ? state.bpeRopePos : 2;

  // Realistic subword segmenter for demonstration
  const SUBWORD_RULES = [
    { match: /^(token)(ization)$/i, parts: ['Token', 'ization'] },
    { match: /^(anti)(gravit)(y)$/i, parts: ['Anti', 'gravit', 'y'] },
    { match: /^(un)(believ)(ably)$/i, parts: ['un', 'believ', 'ably'] },
    { match: /^(trans)(format)(ive)$/i, parts: ['trans', 'format', 'ive'] },
    { match: /^(chat)(gpt)$/i, parts: ['Chat', 'GPT'] },
    { match: /^(embed)(ding)(s)?$/i, parts: ['embed', 'ding', 's'] },
    { match: /^(rotar)(y)$/i, parts: ['rotar', 'y'] },
    { match: /^(algorithm)(s)?$/i, parts: ['algorithm', 's'] },
    { match: /^(posit)(ion)(al)?$/i, parts: ['posit', 'ion', 'al'] }
  ];

  function tokenizeText(text) {
    const rawWords = text.trim().split(/(\s+|[.,!?;:()"])/).filter(Boolean);
    const tokens = [];

    rawWords.forEach((word) => {
      if (/^\s+$/.test(word)) return; // skip pure whitespace
      let matched = false;
      for (const rule of SUBWORD_RULES) {
        const m = word.match(rule.match);
        if (m) {
          rule.parts.filter(Boolean).forEach((p, pIdx) => {
            tokens.push({
              text: p,
              isPrefix: pIdx === 0,
              id: hashToken(p)
            });
          });
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (word.length > 7 && !/^[.,!?;:]$/.test(word)) {
          // split long words into root + suffix
          const mid = Math.min(5, Math.floor(word.length * 0.6));
          const p1 = word.slice(0, mid);
          const p2 = word.slice(mid);
          tokens.push({ text: p1, isPrefix: true, id: hashToken(p1) });
          tokens.push({ text: p2, isPrefix: false, id: hashToken(p2) });
        } else {
          tokens.push({ text: word, isPrefix: true, id: hashToken(word) });
        }
      }
    });

    return tokens.length > 0 ? tokens : [{ text: 'AI', isPrefix: true, id: 2045 }];
  }

  function hashToken(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h % 31000) + 1024;
  }

  let currentTokens = tokenizeText(currentText);
  if (selectedTokenIdx >= currentTokens.length) selectedTokenIdx = 0;

  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="bpe-diagnostic-hud">
      <div class="bpe-hud-col">
        <span class="bpe-hud-badge">🔤 BPE Subword Tokenizer & Embeddings Lab</span>
        <div class="bpe-hud-desc">
          Decomposing human language into atomic subword IDs, projecting into dense vectors, and applying Rotary Position Embeddings (RoPE).
        </div>
      </div>
      <div class="bpe-metrics-grid">
        <div class="bpe-metric-card">
          <span class="metric-label">Token Count</span>
          <strong class="metric-val" id="metric-bpe-tokens">${currentTokens.length} Tokens</strong>
        </div>
        <div class="bpe-metric-card">
          <span class="metric-label">Raw Characters</span>
          <strong class="metric-val" id="metric-bpe-chars">${currentText.length} Chars</strong>
        </div>
        <div class="bpe-metric-card">
          <span class="metric-label">Compression Ratio</span>
          <strong class="metric-val" id="metric-bpe-ratio">${(currentText.length / Math.max(1, currentTokens.length)).toFixed(2)} chars/tok</strong>
        </div>
        <div class="bpe-metric-card">
          <span class="metric-label">Vocab Standard</span>
          <strong class="metric-val" style="color: var(--accent-emerald);">BPE 128k Vocab</strong>
        </div>
      </div>
    </div>

    <!-- Sentence Preset & Custom Input Bar -->
    <div class="bpe-input-card">
      <div class="bpe-input-row">
        <div class="bpe-preset-select-wrap">
          <label for="bpe-preset-select">📚 Benchmark Preset:</label>
          <select id="bpe-preset-select" class="cyber-select">
            ${presets.map((p) => `<option value="${p.id}">${p.name}: "${p.text.slice(0, 38)}..."</option>`).join('')}
            <option value="custom">✏️ Custom Sentence...</option>
          </select>
        </div>
        <div class="bpe-text-field-wrap">
          <input type="text" id="bpe-input-text" class="cyber-input" value="${escapeHtml(currentText)}" placeholder="Type any sentence to see subword tokenization..." />
          <button id="btn-bpe-tokenize" class="btn-attn-sub">Tokenize ✨</button>
        </div>
      </div>
    </div>

    <!-- Segmented Token Ribbon -->
    <div class="bpe-ribbon-card">
      <div class="bpe-ribbon-header">
        <span>🔤 Atomic Token Stream (Click any token to inspect its embedding coordinates)</span>
        <span class="bpe-active-pill" id="bpe-active-token-pill">Active: "${currentTokens[selectedTokenIdx]?.text || ''}" (ID: #${currentTokens[selectedTokenIdx]?.id || ''})</span>
      </div>
      <div class="bpe-token-chips-wrap" id="bpe-token-chips-wrap"></div>
    </div>

    <!-- Mode Sub-Tabs -->
    <div class="bpe-subtab-bar">
      <button class="bpe-subtab-btn ${activeTab === 'tokenizer' ? 'active' : ''}" data-tab="tokenizer">
        <span>🔤</span> BPE Subword Morphisms
      </button>
      <button class="bpe-subtab-btn ${activeTab === 'embeddings' ? 'active' : ''}" data-tab="embeddings">
        <span>🧭</span> 2D Semantic Vector Space
      </button>
      <button class="bpe-subtab-btn ${activeTab === 'rope' ? 'active' : ''}" data-tab="rope">
        <span>🔄</span> Rotary Position (RoPE) Compass
      </button>
    </div>

    <!-- Sub-Tab 1: Morphisms -->
    <div class="bpe-subtab-content ${activeTab === 'tokenizer' ? 'active' : ''}" id="bpe-content-tokenizer">
      <div class="bpe-morphisms-stage">
        <div class="bpe-merge-panel">
          <h4>Iterative Merge Tree for Active Word</h4>
          <p class="bpe-panel-subtitle">How raw UTF-8 bytes fuse into high-frequency vocabulary subwords</p>
          <div class="bpe-cascade-steps" id="bpe-cascade-steps">
            <div class="bpe-step-row">
              <span class="step-num">Step 0 (Chars):</span>
              <div class="step-chips">
                <span class="chip-char">T</span><span class="chip-char">o</span><span class="chip-char">k</span><span class="chip-char">e</span><span class="chip-char">n</span>
                <span class="chip-char sep">·</span>
                <span class="chip-char">i</span><span class="chip-char">z</span><span class="chip-char">a</span><span class="chip-char">t</span><span class="chip-char">i</span><span class="chip-char">o</span><span class="chip-char">n</span>
              </div>
            </div>
            <div class="bpe-step-arrow">⬇ Byte Pair Merge (Highest Frequency: 'i' + 'z' ➔ 'iz')</div>
            <div class="bpe-step-row">
              <span class="step-num">Step 1 (Bigrams):</span>
              <div class="step-chips">
                <span class="chip-token violet">Token</span>
                <span class="chip-char sep">·</span>
                <span class="chip-token cyan">iz</span><span class="chip-token amber">ation</span>
              </div>
            </div>
            <div class="bpe-step-arrow">⬇ Suffix Morphism Fusion ('iz' + 'ation' ➔ 'ization')</div>
            <div class="bpe-step-row highlighted">
              <span class="step-num">Final BPE Tokens:</span>
              <div class="step-chips">
                <span class="chip-token large violet">Token <small>(#4291)</small></span>
                <span class="chip-token large cyan">ization <small>(#1324)</small></span>
              </div>
            </div>
          </div>
        </div>

        <div class="bpe-complexity-panel">
          <h4>Quadratic Attention Memory Impact</h4>
          <p class="bpe-panel-subtitle">Why BPE is mandatory for modern 128k context windows</p>
          <div class="complexity-comparison-grid">
            <div class="complexity-box red">
              <h5>Character-Level (No BPE)</h5>
              <p class="val">${currentText.length} Tokens</p>
              <p class="desc">Attention Matrix = ${currentText.length}²</p>
              <strong class="highlight-stat">${currentText.length * currentText.length} Attention Ops</strong>
              <small>⚠️ Memory explodes quadratically!</small>
            </div>
            <div class="complexity-box green">
              <h5>Byte-Pair Encoding (BPE)</h5>
              <p class="val">${currentTokens.length} Tokens</p>
              <p class="desc">Attention Matrix = ${currentTokens.length}²</p>
              <strong class="highlight-stat">${currentTokens.length * currentTokens.length} Attention Ops</strong>
              <small>⚡ ${( (currentText.length * currentText.length) / Math.max(1, currentTokens.length * currentTokens.length) ).toFixed(1)}x faster computation!</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 2: Semantic Vector Space -->
    <div class="bpe-subtab-content ${activeTab === 'embeddings' ? 'active' : ''}" id="bpe-content-embeddings">
      <div class="bpe-vector-stage">
        <div class="bpe-canvas-card">
          <div class="bpe-canvas-header">
            <span>🧭 2D PCA Semantic Coordinates</span>
            <button id="btn-run-vector-arithmetic" class="btn-vector-action">▶ Run: King − Man + Woman = ?</button>
          </div>
          <canvas id="bpe-vector-canvas" width="600" height="340" class="bpe-interactive-canvas"></canvas>
          <div class="bpe-canvas-legend">
            <span><span class="dot violet"></span> Royalty</span>
            <span><span class="dot blue"></span> Human</span>
            <span><span class="dot emerald"></span> Technology</span>
            <span><span class="dot amber"></span> Food</span>
          </div>
        </div>

        <div class="bpe-vector-info-panel">
          <h4>Active Token Vector Representation</h4>
          <div class="token-meta-box">
            <div class="meta-row"><span>Token String:</span><strong id="meta-token-str" style="color: var(--accent-cyan);">"Token"</strong></div>
            <div class="meta-row"><span>Token ID:</span><code id="meta-token-id">#4291</code></div>
            <div class="meta-row"><span>Bytes:</span><code id="meta-token-bytes">[0x54, 0x6f, 0x6b, 0x65, 0x6e]</code></div>
            <div class="meta-row"><span>Embedding Norm:</span><code id="meta-token-norm">||v|| = 1.000</code></div>
          </div>
          <h5 style="margin-top: 1rem; color: #fff; font-size: 0.9rem;">Simulated Embedding Vector (d=8):</h5>
          <div class="vector-cells-rack" id="vector-cells-rack"></div>
          <div class="vector-arithmetic-result-box" id="vector-arithmetic-result" style="display: none;">
            <h5>Vector Arithmetic Result:</h5>
            <div class="arithmetic-eq">v("king") − v("man") + v("woman") ➔ v*</div>
            <div class="arithmetic-cos">Nearest Neighbor: <strong style="color: #fbbf24;">"queen"</strong> (Cosine Similarity = <strong>0.948</strong>) ✓</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 3: Rotary Position Compass (RoPE) -->
    <div class="bpe-subtab-content ${activeTab === 'rope' ? 'active' : ''}" id="bpe-content-rope">
      <div class="bpe-rope-stage">
        <div class="rope-canvas-card">
          <div class="rope-canvas-header">
            <span>🔄 2D Complex Unit Circle Rotation</span>
            <span class="rope-angle-pill" id="rope-angle-pill">Angle θ: 72.0°</span>
          </div>
          <canvas id="bpe-rope-canvas" width="460" height="340" class="bpe-interactive-canvas"></canvas>
        </div>

        <div class="rope-controls-panel">
          <h4>Rotary Position Embedding Parameters</h4>
          <p class="bpe-panel-subtitle">Rotate Query & Key vectors so inner products depend on relative distance (m − n)</p>
          
          <div class="control-slider-group">
            <div class="slider-label-row">
              <span>Token Sequence Position (m):</span>
              <span class="val" id="val-rope-pos">${ropePos}</span>
            </div>
            <input type="range" class="cyber-slider" id="slider-rope-pos" min="0" max="12" step="1" value="${ropePos}" />
          </div>

          <div class="rope-math-card">
            <h5>Rotary Matrix Applied:</h5>
            <div class="rope-matrix-display" id="rope-matrix-display">
              R_m = [[ cos(mθ), -sin(mθ) ], [ sin(mθ), cos(mθ) ]]
            </div>
            <div class="rope-math-insight">
              <strong>Crucial Guarantee:</strong><br/>
              ⟨R_m · q, R_n · k⟩ = f(q, k, m − n)<br/>
              Absolute position m drops out! The attention mechanism perceives relative distance naturally.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // --- Render Token Chips ---
  const chipsWrap = container.querySelector('#bpe-token-chips-wrap');
  const activePill = container.querySelector('#bpe-active-token-pill');
  const metaStr = container.querySelector('#meta-token-str');
  const metaId = container.querySelector('#meta-token-id');
  const metaBytes = container.querySelector('#meta-token-bytes');
  const vectorRack = container.querySelector('#vector-cells-rack');

  const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa'];

  function renderChips() {
    chipsWrap.innerHTML = '';
    currentTokens.forEach((tok, idx) => {
      const chip = document.createElement('div');
      const isSelected = idx === selectedTokenIdx;
      const col = COLORS[idx % COLORS.length];
      chip.className = `bpe-token-chip ${isSelected ? 'selected' : ''}`;
      chip.style.borderColor = isSelected ? col : 'rgba(148,163,184,0.3)';
      chip.style.backgroundColor = isSelected ? `${col}22` : 'rgba(15,23,42,0.6)';
      chip.innerHTML = `
        <span class="tok-prefix" style="color: ${col};">${tok.isPrefix ? '·' : 'Ġ'}</span>
        <span class="tok-text">${escapeHtml(tok.text)}</span>
        <span class="tok-id" style="color: ${col};">#${tok.id}</span>
      `;
      chip.addEventListener('click', () => {
        selectedTokenIdx = idx;
        state.bpeSelectedTokenIdx = idx;
        renderChips();
        updateTokenMetadata();
      });
      chipsWrap.appendChild(chip);
    });
  }

  function updateTokenMetadata() {
    const t = currentTokens[selectedTokenIdx] || currentTokens[0];
    if (!t) return;
    activePill.textContent = `Active: "${t.text}" (ID: #${t.id})`;
    if (metaStr) metaStr.textContent = `"${t.text}"`;
    if (metaId) metaId.textContent = `#${t.id}`;
    if (metaBytes) {
      const bytes = Array.from(new TextEncoder().encode(t.text)).map(b => '0x' + b.toString(16).padStart(2, '0'));
      metaBytes.textContent = `[${bytes.join(', ')}]`;
    }

    if (vectorRack) {
      vectorRack.innerHTML = '';
      // Generate pseudo-random coordinates deterministically from ID
      const seed = t.id * 1337;
      for (let i = 0; i < 8; i++) {
        const val = Math.sin(seed + i * 1.5) * 0.9;
        const cell = document.createElement('div');
        cell.className = 'vector-cell';
        cell.innerHTML = `
          <span class="dim-idx">d${i}</span>
          <span class="dim-val ${val >= 0 ? 'pos' : 'neg'}">${val >= 0 ? '+' : ''}${val.toFixed(2)}</span>
        `;
        vectorRack.appendChild(cell);
      }
    }
  }

  // --- Sub-Tab Switching ---
  container.querySelectorAll('.bpe-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.bpe-subtab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.bpe-subtab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      activeTab = tabName;
      state.bpeActiveTab = tabName;
      const target = container.querySelector(`#bpe-content-${tabName}`);
      if (target) target.classList.add('active');

      if (tabName === 'embeddings') drawVectorCanvas();
      if (tabName === 'rope') drawRopeCanvas();
    });
  });

  // --- Tokenizer Action Handlers ---
  const presetSelect = container.querySelector('#bpe-preset-select');
  const inputText = container.querySelector('#bpe-input-text');
  const btnTokenize = container.querySelector('#btn-bpe-tokenize');

  presetSelect.addEventListener('change', (e) => {
    const pId = e.target.value;
    const found = presets.find(p => p.id === pId);
    if (found) {
      inputText.value = found.text;
      applyNewText(found.text);
    }
  });

  btnTokenize.addEventListener('click', () => {
    applyNewText(inputText.value.trim());
  });

  inputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyNewText(inputText.value.trim());
  });

  function applyNewText(text) {
    if (!text) return;
    currentText = text;
    state.bpeText = text;
    currentTokens = tokenizeText(text);
    selectedTokenIdx = 0;
    state.bpeSelectedTokenIdx = 0;

    container.querySelector('#metric-bpe-tokens').textContent = `${currentTokens.length} Tokens`;
    container.querySelector('#metric-bpe-chars').textContent = `${currentText.length} Chars`;
    container.querySelector('#metric-bpe-ratio').textContent = `${(currentText.length / Math.max(1, currentTokens.length)).toFixed(2)} chars/tok`;

    renderChips();
    updateTokenMetadata();
    if (activeTab === 'embeddings') drawVectorCanvas();
    if (activeTab === 'rope') drawRopeCanvas();
  }

  // --- Canvas 1: Semantic Vector Space ---
  const vectorCanvas = container.querySelector('#bpe-vector-canvas');
  const vCtx = vectorCanvas ? vectorCanvas.getContext('2d') : null;
  const btnArithmetic = container.querySelector('#btn-run-vector-arithmetic');
  const arithmeticResult = container.querySelector('#vector-arithmetic-result');

  let vectorArithmeticProgress = 0;
  let vectorAnimId = null;

  function drawVectorCanvas() {
    if (!vCtx || !vectorCanvas) return;
    const w = vectorCanvas.width;
    const h = vectorCanvas.height;
    vCtx.clearRect(0, 0, w, h);

    // Background Grid
    vCtx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    vCtx.lineWidth = 1;
    for (let x = 40; x < w; x += 40) {
      vCtx.beginPath(); vCtx.moveTo(x, 0); vCtx.lineTo(x, h); vCtx.stroke();
    }
    for (let y = 40; y < h; y += 40) {
      vCtx.beginPath(); vCtx.moveTo(0, y); vCtx.lineTo(w, y); vCtx.stroke();
    }

    // Axes
    const cx = w / 2;
    const cy = h / 2;
    vCtx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    vCtx.lineWidth = 1.5;
    vCtx.beginPath(); vCtx.moveTo(20, cy); vCtx.lineTo(w - 20, cy); vCtx.stroke();
    vCtx.beginPath(); vCtx.moveTo(cx, 20); vCtx.lineTo(cx, h - 20); vCtx.stroke();

    const scale = 140;
    const toCanvasX = (vx) => cx + vx * scale;
    const toCanvasY = (vy) => cy - vy * scale;

    const samples = [
      { word: 'king', vx: 0.65, vy: 0.55, col: '#a78bfa' },
      { word: 'queen', vx: 0.60, vy: 0.82, col: '#fbbf24' },
      { word: 'man', vx: 0.30, vy: 0.20, col: '#60a5fa' },
      { word: 'woman', vx: 0.25, vy: 0.47, col: '#fb7185' },
      { word: 'robot', vx: -0.55, vy: -0.50, col: '#34d399' },
      { word: 'computer', vx: -0.65, vy: -0.62, col: '#22d3ee' },
      { word: 'apple', vx: -0.45, vy: 0.40, col: '#fbbf24' },
      { word: 'banana', vx: -0.52, vy: 0.30, col: '#fbbf24' }
    ];

    // Draw arithmetic vectors if running
    if (vectorArithmeticProgress > 0) {
      const man = samples.find(s => s.word === 'man');
      const king = samples.find(s => s.word === 'king');
      const woman = samples.find(s => s.word === 'woman');
      const queen = samples.find(s => s.word === 'queen');

      const mx = toCanvasX(man.vx), my = toCanvasY(man.vy);
      const kx = toCanvasX(king.vx), ky = toCanvasY(king.vy);
      const wx = toCanvasX(woman.vx), wy = toCanvasY(woman.vy);
      const qx = toCanvasX(queen.vx), qy = toCanvasY(queen.vy);

      // Vector 1: man -> king (Royalty delta)
      vCtx.strokeStyle = 'rgba(167, 139, 250, 0.8)';
      vCtx.lineWidth = 2.5;
      vCtx.beginPath();
      vCtx.moveTo(mx, my);
      vCtx.lineTo(mx + (kx - mx) * vectorArithmeticProgress, my + (ky - my) * vectorArithmeticProgress);
      vCtx.stroke();

      // Vector 2: woman -> woman + royalty delta
      if (vectorArithmeticProgress > 0.5) {
        const p2 = (vectorArithmeticProgress - 0.5) / 0.5;
        const targetX = wx + (kx - mx);
        const targetY = wy + (ky - my);
        vCtx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
        vCtx.lineWidth = 2.5;
        vCtx.setLineDash([4, 4]);
        vCtx.beginPath();
        vCtx.moveTo(wx, wy);
        vCtx.lineTo(wx + (targetX - wx) * p2, wy + (targetY - wy) * p2);
        vCtx.stroke();
        vCtx.setLineDash([]);
      }
    }

    // Draw word nodes
    samples.forEach(s => {
      const px = toCanvasX(s.vx);
      const py = toCanvasY(s.vy);
      vCtx.fillStyle = s.col;
      vCtx.beginPath();
      vCtx.arc(px, py, 6, 0, Math.PI * 2);
      vCtx.fill();
      vCtx.strokeStyle = '#fff';
      vCtx.lineWidth = 1.5;
      vCtx.stroke();

      vCtx.font = 'bold 12px "Outfit", sans-serif';
      vCtx.fillStyle = '#ffffff';
      vCtx.fillText(s.word, px + 9, py - 4);
    });
  }

  if (btnArithmetic) {
    btnArithmetic.addEventListener('click', () => {
      if (vectorAnimId) cancelAnimationFrame(vectorAnimId);
      vectorArithmeticProgress = 0;
      if (arithmeticResult) arithmeticResult.style.display = 'block';

      const startTime = performance.now();
      const duration = 1200;

      function step(now) {
        const elapsed = now - startTime;
        vectorArithmeticProgress = Math.min(1.0, elapsed / duration);
        drawVectorCanvas();
        if (vectorArithmeticProgress < 1.0) {
          vectorAnimId = requestAnimationFrame(step);
        }
      }
      vectorAnimId = requestAnimationFrame(step);
    });
  }

  // --- Canvas 2: RoPE Rotary Compass ---
  const ropeCanvas = container.querySelector('#bpe-rope-canvas');
  const rCtx = ropeCanvas ? ropeCanvas.getContext('2d') : null;
  const sliderRopePos = container.querySelector('#slider-rope-pos');
  const valRopePos = container.querySelector('#val-rope-pos');
  const ropeAnglePill = container.querySelector('#rope-angle-pill');
  const ropeMatrixDisplay = container.querySelector('#rope-matrix-display');

  function drawRopeCanvas() {
    if (!rCtx || !ropeCanvas) return;
    const w = ropeCanvas.width;
    const h = ropeCanvas.height;
    rCtx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = 110;

    // Unit Circle
    rCtx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    rCtx.lineWidth = 2;
    rCtx.beginPath();
    rCtx.arc(cx, cy, R, 0, Math.PI * 2);
    rCtx.stroke();

    // Cross axes
    rCtx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    rCtx.beginPath();
    rCtx.moveTo(cx - R - 20, cy); rCtx.lineTo(cx + R + 20, cy);
    rCtx.moveTo(cx, cy - R - 20); rCtx.lineTo(cx, cy + R + 20);
    rCtx.stroke();

    // Base query vector (angle 0)
    const baseAngle = 0.4;
    const rotatedAngle = baseAngle + ropePos * 0.35;

    // Key vector (at position 0)
    const kAngle = baseAngle + 0.1;
    const kx = cx + R * Math.cos(kAngle);
    const ky = cy - R * Math.sin(kAngle);
    rCtx.strokeStyle = '#fb7185';
    rCtx.lineWidth = 2.5;
    rCtx.beginPath();
    rCtx.moveTo(cx, cy);
    rCtx.lineTo(kx, ky);
    rCtx.stroke();
    rCtx.fillStyle = '#fb7185';
    rCtx.fillText('k (Key pos 0)', kx + 8, ky);

    // Query vector (rotated by pos * theta)
    const qx = cx + R * Math.cos(rotatedAngle);
    const qy = cy - R * Math.sin(rotatedAngle);
    rCtx.strokeStyle = '#38bdf8';
    rCtx.lineWidth = 3;
    rCtx.beginPath();
    rCtx.moveTo(cx, cy);
    rCtx.lineTo(qx, qy);
    rCtx.stroke();
    rCtx.fillStyle = '#38bdf8';
    rCtx.font = 'bold 12px "Outfit", sans-serif';
    rCtx.fillText(`q (Query pos ${ropePos})`, qx + 8, qy - 4);

    // Arc of rotation
    rCtx.strokeStyle = '#facc15';
    rCtx.lineWidth = 2;
    rCtx.beginPath();
    rCtx.arc(cx, cy, 40, -rotatedAngle, -baseAngle);
    rCtx.stroke();

    const deg = Math.round((ropePos * 0.35 * 180) / Math.PI);
    if (ropeAnglePill) ropeAnglePill.textContent = `Rotation Angle m·θ: ${deg}°`;
    if (ropeMatrixDisplay) {
      const cVal = Math.cos(ropePos * 0.35).toFixed(2);
      const sVal = Math.sin(ropePos * 0.35).toFixed(2);
      ropeMatrixDisplay.textContent = `R_${ropePos} = [[ ${cVal}, -${sVal} ], [ ${sVal}, ${cVal} ]]`;
    }
  }

  if (sliderRopePos) {
    sliderRopePos.addEventListener('input', (e) => {
      ropePos = parseInt(e.target.value, 10);
      state.bpeRopePos = ropePos;
      if (valRopePos) valRopePos.textContent = ropePos;
      drawRopeCanvas();
    });
  }

  // Initial render
  renderChips();
  updateTokenMetadata();
  if (activeTab === 'embeddings') drawVectorCanvas();
  if (activeTab === 'rope') drawRopeCanvas();
}

// ============================================================================
// WIDGET 9: Inside the GPT Block (Transformer Decoder Inspector)
// ============================================================================
function renderTransformerBlockInspectorWidget(quest) {
  const container = document.createElement('div');
  container.className = 'gpt-block-inspector-container';

  let activeTab = state.gptActiveTab || 'flow';
  let causalMaskActive = state.gptCausalMaskActive !== undefined ? state.gptCausalMaskActive : true;
  let focusedLayerIdx = state.gptFocusedLayerIdx !== undefined ? state.gptFocusedLayerIdx : 2;
  let kvSeqLen = state.gptKvSeqLen || 128;

  const sampleTokens = ["The", "future", "of", "AI", "is"];
  const N = sampleTokens.length;

  const STAGES = [
    {
      idx: 0,
      name: "Input Residual Highway (x)",
      type: "residual",
      color: "var(--accent-emerald)",
      icon: "🛣️",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "x_0 = \\text{Embed}(tokens) + \\text{RoPE}",
      role: "Continuous high-speed express highway carrying contextualized token representations throughout all 80 layers."
    },
    {
      idx: 1,
      name: "RMSNorm #1 (Pre-Attention)",
      type: "norm",
      color: "var(--accent-cyan)",
      icon: "⚡",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "\\text{RMSNorm}(x) = \\frac{x}{\\sqrt{\\frac{1}{d}\\sum x_i^2 + \\epsilon}} \\odot \\gamma",
      role: "Scales activations by root-mean-square variance to stabilize variance without slow mean-centering passes."
    },
    {
      idx: 2,
      name: "Causal Multi-Head Attention",
      type: "attention",
      color: "var(--accent-violet)",
      icon: "🛡️",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}} + M_{\\text{causal}}\\right) V",
      role: "Dynamically routes context between words while strictly blinding future tokens via lower-triangular causal masking."
    },
    {
      idx: 3,
      name: "Residual Addition #1 (+)",
      type: "residual",
      color: "var(--accent-emerald)",
      icon: "➕",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "x^{(1)} = x + \\text{Attention}(\\text{RMSNorm}(x))",
      role: "Adds attention deltas onto the baseline residual stream, providing a zero-loss gradient highway during backpropagation."
    },
    {
      idx: 4,
      name: "RMSNorm #2 (Pre-FFN)",
      type: "norm",
      color: "var(--accent-amber)",
      icon: "⚡",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "\\text{RMSNorm}(x^{(1)})",
      role: "Pre-normalizes the contextualized representations before sending them through wide feed-forward knowledge expansion."
    },
    {
      idx: 5,
      name: "SwiGLU Feed-Forward Network",
      type: "ffn",
      color: "var(--accent-rose)",
      icon: "🧠",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "\\text{SwiGLU}(x) = (\\text{SiLU}(x W_{\\text{gate}}) \\odot x W_{\\text{up}}) W_{\\text{down}}",
      role: "Expands hidden dimension to 14,336 with non-linear gating. Stores encyclopedic facts, concepts, and relational memory."
    },
    {
      idx: 6,
      name: "Residual Addition #2 (+)",
      type: "residual",
      color: "var(--accent-emerald)",
      icon: "➕",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "x^{(2)} = x^{(1)} + \\text{SwiGLU}(\\text{RMSNorm}(x^{(1)}))",
      role: "Merges extracted factual knowledge back onto the residual highway, ready for the next stacked Transformer decoder block."
    }
  ];

  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="gpt-diagnostic-hud">
      <div class="gpt-hud-col">
        <span class="gpt-hud-badge">🧱 Inside the GPT Decoder Block (Llama 3 / Mistral)</span>
        <div class="gpt-hud-desc">
          Dissecting the internal anatomy of a modern auto-regressive Transformer block: Causal Masking, RMSNorm, SwiGLU, and KV Caching.
        </div>
      </div>
      <div class="gpt-metrics-grid">
        <div class="gpt-metric-card">
          <span class="metric-label">Hidden Dimension</span>
          <strong class="metric-val" style="color: var(--accent-cyan);">4,096 Dims</strong>
        </div>
        <div class="gpt-metric-card">
          <span class="metric-label">SwiGLU Intermediate</span>
          <strong class="metric-val" style="color: var(--accent-rose);">14,336 Dims</strong>
        </div>
        <div class="gpt-metric-card">
          <span class="metric-label">Causality Guard</span>
          <strong class="metric-val" id="metric-gpt-causal">${causalMaskActive ? 'Active (-∞)' : 'Bypassed ⚠️'}</strong>
        </div>
        <div class="gpt-metric-card">
          <span class="metric-label">Block Parameters</span>
          <strong class="metric-val" style="color: var(--accent-amber);">~14.2M / Block</strong>
        </div>
      </div>
    </div>

    <!-- Mode Sub-Tabs -->
    <div class="bpe-subtab-bar">
      <button class="bpe-subtab-btn ${activeTab === 'flow' ? 'active' : ''}" data-tab="flow">
        <span>🧱</span> 7-Stage Block Signal Highway
      </button>
      <button class="bpe-subtab-btn ${activeTab === 'mask' ? 'active' : ''}" data-tab="mask">
        <span>🛡️</span> Causal Masking Laboratory
      </button>
      <button class="bpe-subtab-btn ${activeTab === 'kvcache' ? 'active' : ''}" data-tab="kvcache">
        <span>🏎️</span> KV Cache Speedup Engine
      </button>
    </div>

    <!-- Sub-Tab 1: Block Flow Stage -->
    <div class="bpe-subtab-content ${activeTab === 'flow' ? 'active' : ''}" id="gpt-content-flow">
      <div class="gpt-flow-layout">
        <!-- Interactive Stage Highway Cards -->
        <div class="gpt-stages-track" id="gpt-stages-track"></div>

        <!-- Inspector Drawer -->
        <div class="gpt-inspector-drawer" id="gpt-inspector-drawer">
          <div class="drawer-header">
            <span class="drawer-icon" id="drawer-icon">🛡️</span>
            <div>
              <h4 id="drawer-title">Causal Multi-Head Attention</h4>
              <span class="drawer-type" id="drawer-type">Attention Layer</span>
            </div>
          </div>
          <div class="drawer-body">
            <div class="drawer-tensor-row">
              <span class="tensor-tag in">Input: <code id="drawer-shape-in">[1, 5, 4096]</code></span>
              <span class="tensor-arrow">➔</span>
              <span class="tensor-tag out">Output: <code id="drawer-shape-out">[1, 5, 4096]</code></span>
            </div>
            <div class="drawer-math-card">
              <h5>Mathematical Equation:</h5>
              <div class="drawer-eq" id="drawer-eq">Attention(Q, K, V) = softmax(QK^T / sqrt(d_k) + M) V</div>
            </div>
            <p class="drawer-desc" id="drawer-desc">
              Dynamically routes context between words while strictly blinding future tokens via lower-triangular causal masking.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 2: Causal Mask Matrix -->
    <div class="bpe-subtab-content ${activeTab === 'mask' ? 'active' : ''}" id="gpt-content-mask">
      <div class="gpt-mask-stage">
        <div class="mask-grid-card">
          <div class="mask-card-header">
            <span>🛡️ 5×5 Attention Compatibility Matrix</span>
            <button id="btn-toggle-causal-mask" class="btn-attn-sub ${causalMaskActive ? 'active' : 'warn'}">
              ${causalMaskActive ? '✓ Causal Mask: ON (Lower Triangular)' : '⚠️ Causal Mask: OFF (Bidirectional Leaks)'}
            </button>
          </div>
          <div class="mask-matrix-table-wrap" id="mask-matrix-table-wrap"></div>
          <div class="mask-legend">
            <span><span class="cell-sample green">✓</span> Allowed Past Attention ($j \\le i$)</span>
            <span><span class="cell-sample red">−∞</span> Blinded Future Tokens ($j > i$, Prob = 0.00%)</span>
          </div>
        </div>

        <div class="mask-explanation-panel">
          <h4>Why Autoregressive LLMs Cannot Peek Ahead</h4>
          <p class="bpe-panel-subtitle">The strict temporal barrier in next-token prediction</p>
          <div class="mask-insight-card">
            <div class="insight-row">
              <span class="insight-num">1</span>
              <div>
                <strong>Next-Token Prediction Setup:</strong>
                <p>Given words [1, 2, 3], the model is rewarded for predicting word 4.</p>
              </div>
            </div>
            <div class="insight-row">
              <span class="insight-num">2</span>
              <div>
                <strong>The Fatal Cheat without Masking:</strong>
                <p>If word 2 could attend to word 3, the model would simply copy the answer off the test sheet instead of learning language!</p>
              </div>
            </div>
            <div class="insight-row">
              <span class="insight-num">3</span>
              <div>
                <strong>The Softmax Math Fix:</strong>
                <p>Adding $-\\infty$ sets $e^{-\\infty} = 0$, guaranteeing zero weight to future tokens.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 3: KV Cache Speedup -->
    <div class="bpe-subtab-content ${activeTab === 'kvcache' ? 'active' : ''}" id="gpt-content-kvcache">
      <div class="gpt-kvcache-stage">
        <div class="kv-controls-card">
          <h4>KV Cache Generation Simulator</h4>
          <p class="bpe-panel-subtitle">Compare quadratic full recomputation against lightning-fast Key-Value caching</p>
          
          <div class="control-slider-group">
            <div class="slider-label-row">
              <span>Context Length Generated (N tokens):</span>
              <span class="val" id="val-kv-seq">${kvSeqLen} tokens</span>
            </div>
            <input type="range" class="cyber-slider" id="slider-kv-seq" min="16" max="2048" step="16" value="${kvSeqLen}" />
          </div>

          <div class="kv-stats-grid">
            <div class="kv-stat-box red">
              <h5>Naive Full Recomputation</h5>
              <p class="stat-big" id="kv-stat-naive-flops">${( (kvSeqLen * kvSeqLen) / 2 ).toLocaleString()} MFLOPs</p>
              <p class="stat-sub">Quadratic O(N²) Time Complexity</p>
              <small>Recomputes tokens 1 to N-1 at every single word!</small>
            </div>
            <div class="kv-stat-box green">
              <h5>With KV Caching Active</h5>
              <p class="stat-big" id="kv-stat-cached-flops">${kvSeqLen.toLocaleString()} MFLOPs</p>
              <p class="stat-sub">Linear O(N) Generation Time</p>
              <small>Computes only the single newest Query!</small>
            </div>
          </div>

          <div class="kv-speedup-banner">
            <span class="speedup-icon">⚡</span>
            <div>
              <h4 id="kv-speedup-text">${(kvSeqLen / 2).toFixed(0)}x Faster Generation Speedup</h4>
              <p id="kv-memory-text">VRAM Cache Footprint: ~${( (2 * 32 * 32 * 128 * kvSeqLen * 2) / (1024 * 1024) ).toFixed(1)} MB</p>
            </div>
          </div>
        </div>

        <div class="kv-memory-visual-card">
          <h4>VRAM KV Cache Slot Buffer</h4>
          <p class="bpe-panel-subtitle">Keys and Values are preserved in GPU memory across time steps</p>
          <div class="kv-buffer-slots" id="kv-buffer-slots"></div>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // --- Render 7-Stage Flow Track ---
  const stagesTrack = container.querySelector('#gpt-stages-track');
  const drawerIcon = container.querySelector('#drawer-icon');
  const drawerTitle = container.querySelector('#drawer-title');
  const drawerType = container.querySelector('#drawer-type');
  const drawerShapeIn = container.querySelector('#drawer-shape-in');
  const drawerShapeOut = container.querySelector('#drawer-shape-out');
  const drawerEq = container.querySelector('#drawer-eq');
  const drawerDesc = container.querySelector('#drawer-desc');

  function renderStages() {
    stagesTrack.innerHTML = '';
    STAGES.forEach((s) => {
      const card = document.createElement('div');
      const isFocused = s.idx === focusedLayerIdx;
      card.className = `gpt-stage-card ${isFocused ? 'focused' : ''}`;
      card.style.borderLeftColor = s.color;
      card.innerHTML = `
        <div class="stage-card-left">
          <span class="stage-icon">${s.icon}</span>
          <div class="stage-info">
            <span class="stage-num">STAGE #${s.idx + 1}</span>
            <strong class="stage-name">${s.name}</strong>
          </div>
        </div>
        <div class="stage-card-right">
          <span class="stage-shape">${s.shapeOut}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        focusedLayerIdx = s.idx;
        state.gptFocusedLayerIdx = s.idx;
        renderStages();
        updateDrawer();
      });
      stagesTrack.appendChild(card);
    });
  }

  function updateDrawer() {
    const s = STAGES[focusedLayerIdx] || STAGES[0];
    if (drawerIcon) drawerIcon.textContent = s.icon;
    if (drawerTitle) drawerTitle.textContent = s.name;
    if (drawerType) drawerType.textContent = s.type.toUpperCase() + ' LAYER';
    if (drawerShapeIn) drawerShapeIn.textContent = s.shapeIn;
    if (drawerShapeOut) drawerShapeOut.textContent = s.shapeOut;
    if (drawerEq) drawerEq.textContent = s.eq;
    if (drawerDesc) drawerDesc.textContent = s.role;
  }

  // --- Render Causal Mask Matrix ---
  const matrixWrap = container.querySelector('#mask-matrix-table-wrap');
  const btnToggleMask = container.querySelector('#btn-toggle-causal-mask');
  const metricCausal = container.querySelector('#metric-gpt-causal');

  function renderMaskMatrix() {
    matrixWrap.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'mask-table';

    // Header row
    const thead = document.createElement('thead');
    let hRow = '<tr><th>Query \\ Key</th>';
    sampleTokens.forEach((t) => {
      hRow += `<th>"${t}"</th>`;
    });
    hRow += '</tr>';
    thead.innerHTML = hRow;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let r = 0; r < N; r++) {
      const tr = document.createElement('tr');
      let rHtml = `<th class="row-token">"${sampleTokens[r]}" (#${r})</th>`;
      for (let c = 0; c < N; c++) {
        const allowed = causalMaskActive ? (c <= r) : true;
        const cls = allowed ? 'allowed' : 'blocked';
        const txt = allowed ? (1 / (r + 1)).toFixed(2) : '−∞';
        rHtml += `<td class="cell ${cls}" title="Query: '${sampleTokens[r]}' ➔ Key: '${sampleTokens[c]}'">${txt}</td>`;
      }
      tr.innerHTML = rHtml;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    matrixWrap.appendChild(table);
  }

  if (btnToggleMask) {
    btnToggleMask.addEventListener('click', () => {
      causalMaskActive = !causalMaskActive;
      state.gptCausalMaskActive = causalMaskActive;
      btnToggleMask.className = `btn-attn-sub ${causalMaskActive ? 'active' : 'warn'}`;
      btnToggleMask.textContent = causalMaskActive
        ? '✓ Causal Mask: ON (Lower Triangular)'
        : '⚠️ Causal Mask: OFF (Bidirectional Leaks)';
      if (metricCausal) metricCausal.textContent = causalMaskActive ? 'Active (-∞)' : 'Bypassed ⚠️';
      renderMaskMatrix();
    });
  }

  // --- KV Cache Calculations & Buffer Slots ---
  const sliderKvSeq = container.querySelector('#slider-kv-seq');
  const valKvSeq = container.querySelector('#val-kv-seq');
  const statNaiveFlops = container.querySelector('#kv-stat-naive-flops');
  const statCachedFlops = container.querySelector('#kv-stat-cached-flops');
  const speedupText = container.querySelector('#kv-speedup-text');
  const memoryText = container.querySelector('#kv-memory-text');
  const bufferSlots = container.querySelector('#kv-buffer-slots');

  function updateKvCacheMetrics() {
    if (valKvSeq) valKvSeq.textContent = `${kvSeqLen} tokens`;
    const naive = Math.round((kvSeqLen * kvSeqLen) / 2);
    const cached = kvSeqLen;
    const speedup = Math.max(1, Math.round(naive / cached));
    const vramMb = ((2 * 32 * 32 * 128 * kvSeqLen * 2) / (1024 * 1024)).toFixed(1);

    if (statNaiveFlops) statNaiveFlops.textContent = `${naive.toLocaleString()} MFLOPs`;
    if (statCachedFlops) statCachedFlops.textContent = `${cached.toLocaleString()} MFLOPs`;
    if (speedupText) speedupText.textContent = `${speedup}x Faster Generation Speedup`;
    if (memoryText) memoryText.textContent = `VRAM Cache Footprint: ~${vramMb} MB (Locked in GPU Memory)`;

    if (bufferSlots) {
      bufferSlots.innerHTML = '';
      const slotsCount = 8;
      for (let i = 0; i < slotsCount; i++) {
        const slot = document.createElement('div');
        const isCurrent = i === slotsCount - 1;
        slot.className = `kv-slot ${isCurrent ? 'current' : 'cached'}`;
        slot.innerHTML = `
          <span class="slot-idx">Step ${i * Math.floor(kvSeqLen / slotsCount)}</span>
          <span class="slot-status">${isCurrent ? '⚡ New Query' : '💾 Cached K, V'}</span>
        `;
        bufferSlots.appendChild(slot);
      }
    }
  }

  if (sliderKvSeq) {
    sliderKvSeq.addEventListener('input', (e) => {
      kvSeqLen = parseInt(e.target.value, 10);
      state.gptKvSeqLen = kvSeqLen;
      updateKvCacheMetrics();
    });
  }

  // --- Sub-Tab Switching ---
  container.querySelectorAll('.bpe-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.bpe-subtab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.bpe-subtab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      activeTab = tabName;
      state.gptActiveTab = tabName;
      const target = container.querySelector(`#gpt-content-${tabName}`);
      if (target) target.classList.add('active');
    });
  });

  // Initial render
  renderStages();
  updateDrawer();
  renderMaskMatrix();
  updateKvCacheMetrics();
}

// ============================================================================
// WIDGET 10: The Generation Engine & Sampling Dynamics Lab
// ============================================================================
function renderGenerationSamplerLabWidget(quest) {
  const container = document.createElement('div');
  container.className = 'generation-sampler-container';

  const config = quest.interactiveConfig || {};
  const prompts = config.prompts || [
    {
      id: "robot",
      text: "The mysterious robot stepped out of the spaceship and saw a",
      candidates: [
        { token: " alien", logit: 4.2, category: "sci-fi" },
        { token: " glowing", logit: 3.7, category: "desc" },
        { token: " city", logit: 3.3, category: "place" },
        { token: " human", logit: 2.8, category: "entity" },
        { token: " flower", logit: 2.1, category: "nature" },
        { token: " glitch", logit: 1.4, category: "tech" },
        { token: " sandwich", logit: 0.4, category: "absurd" },
        { token: " banana", logit: -0.8, category: "absurd" },
        { token: " unicorn", logit: -1.9, category: "fantasy" },
        { token: " syntax", logit: -3.5, category: "code" }
      ]
    },
    {
      id: "code",
      text: "def train_neural_network(model, optimizer, data_loader):",
      candidates: [
        { token: "\n    ", logit: 4.8, category: "indent" },
        { token: " model", logit: 3.9, category: "code" },
        { token: " for", logit: 3.4, category: "loop" },
        { token: " total", logit: 2.2, category: "var" },
        { token: " print", logit: 1.5, category: "debug" },
        { token: " return", logit: 0.6, category: "control" },
        { token: " pizza", logit: -2.4, category: "absurd" },
        { token: " spaceship", logit: -3.8, category: "absurd" }
      ]
    },
    {
      id: "philosophy",
      text: "In the heart of the quantum computer, artificial consciousness began to",
      candidates: [
        { token: " awaken", logit: 4.1, category: "thought" },
        { token: " question", logit: 3.6, category: "thought" },
        { token: " evolve", logit: 3.2, category: "action" },
        { token: " calculate", logit: 2.5, category: "tech" },
        { token: " dream", logit: 2.0, category: "creative" },
        { token: " crash", logit: 0.8, category: "bug" },
        { token: " dance", logit: -0.5, category: "whimsical" },
        { token: " potato", logit: -3.6, category: "absurd" }
      ]
    }
  ];

  // Contextual continuations vocabulary dictionary for realistic multi-step autoregressive demo
  const followUpVocab = {
    " alien": [
      { token: " staring", logit: 4.4, category: "action" },
      { token: " holding", logit: 3.8, category: "action" },
      { token: " waving", logit: 3.3, category: "social" },
      { token: " with", logit: 2.9, category: "grammar" },
      { token: " silently", logit: 2.2, category: "desc" },
      { token: " spaceship", logit: 1.1, category: "entity" },
      { token: " pizza", logit: -1.8, category: "absurd" }
    ],
    " glowing": [
      { token: " crystal", logit: 4.6, category: "object" },
      { token: " orb", logit: 4.1, category: "object" },
      { token: " horizon", logit: 3.5, category: "place" },
      { token: " portal", logit: 3.1, category: "sci-fi" },
      { token: " mushroom", logit: 2.1, category: "nature" },
      { token: " bug", logit: 0.9, category: "tech" }
    ],
    " city": [
      { token: " built", logit: 4.3, category: "action" },
      { token: " floating", logit: 4.0, category: "desc" },
      { token: " of", logit: 3.5, category: "grammar" },
      { token: " covered", logit: 2.9, category: "desc" },
      { token: " buzzing", logit: 2.2, category: "desc" },
      { token: " underwater", logit: 1.1, category: "place" }
    ],
    " human": [
      { token: " scientist", logit: 4.5, category: "entity" },
      { token: " watching", logit: 3.9, category: "action" },
      { token: " terrified", logit: 3.4, category: "emotion" },
      { token: " sleeping", logit: 2.8, category: "action" },
      { token: " smiling", logit: 2.3, category: "social" },
      { token: " potato", logit: -2.5, category: "absurd" }
    ],
    " flower": [
      { token: " blooming", logit: 4.5, category: "action" },
      { token: " emitting", logit: 3.8, category: "action" },
      { token: " made", logit: 3.2, category: "grammar" },
      { token: " of", logit: 2.7, category: "grammar" },
      { token: " neon", logit: 2.1, category: "desc" }
    ],
    " glitch": [
      { token: " in", logit: 4.7, category: "grammar" },
      { token: " tearing", logit: 3.8, category: "action" },
      { token: " through", logit: 3.2, category: "grammar" },
      { token: " the", logit: 2.6, category: "grammar" }
    ],
    " model": [
      { token: " .train()", logit: 4.8, category: "code" },
      { token: " .to(device)", logit: 4.2, category: "code" },
      { token: " = model", logit: 2.5, category: "code" },
      { token: " .eval()", logit: 2.1, category: "code" }
    ],
    " for": [
      { token: " epoch", logit: 4.8, category: "loop" },
      { token: " batch", logit: 4.3, category: "loop" },
      { token: " step", logit: 3.5, category: "loop" },
      { token: " x,", logit: 2.8, category: "code" }
    ],
    " awaken": [
      { token: " within", logit: 4.5, category: "grammar" },
      { token: " and", logit: 3.9, category: "grammar" },
      { token: " its", logit: 3.3, category: "grammar" },
      { token: " silently", logit: 2.8, category: "desc" },
      { token: " across", logit: 2.2, category: "grammar" }
    ],
    " question": [
      { token: " its", logit: 4.7, category: "grammar" },
      { token: " whether", logit: 4.0, category: "thought" },
      { token: " reality", logit: 3.4, category: "concept" },
      { token: " human", logit: 2.6, category: "entity" }
    ],
    " default": [
      { token: " into", logit: 4.1, category: "grammar" },
      { token: " the", logit: 3.7, category: "grammar" },
      { token: " endless", logit: 3.2, category: "desc" },
      { token: " void", logit: 2.6, category: "concept" },
      { token: " forever", logit: 2.1, category: "concept" },
      { token: " banana", logit: -1.9, category: "absurd" }
    ]
  };

  let currentPromptIdx = state.genPromptIdx !== undefined ? state.genPromptIdx : 0;
  if (currentPromptIdx >= prompts.length) currentPromptIdx = 0;
  let currentTemperature = state.genTemperature !== undefined ? state.genTemperature : 0.7;
  let currentTopP = state.genTopP !== undefined ? state.genTopP : 0.90;
  let currentTopK = state.genTopK !== undefined ? state.genTopK : 5;
  let currentRepetitionPenalty = state.genRepetitionPenalty !== undefined ? state.genRepetitionPenalty : 1.15;
  let activeTab = state.genActiveTab || 'roulette';
  let isStreaming = false;
  let streamTimer = null;
  let sampledCandidateToken = null;

  // Build Layout Frame
  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="gen-diagnostic-hud">
      <div class="gen-hud-col">
        <div class="gen-hud-badge">
          <span>🎲</span>
          <span>AUTOREGRESSIVE SAMPLING ENGINE</span>
        </div>
        <div class="gen-hud-desc">
          Transform raw unembedding logits into probability distributions with Temperature scaling, Top-K pruning, and Top-P (Nucleus) boundary cuts.
        </div>
      </div>
      <div class="gen-metrics-grid">
        <div class="gen-metric-card">
          <span class="gen-metric-lbl">SAMPLING REGIME</span>
          <span class="gen-metric-val" id="gen-stat-regime">✨ Optimal Nucleus</span>
          <span class="gen-metric-sub" id="gen-stat-entropy">Entropy: 1.84 bits</span>
        </div>
        <div class="gen-metric-card">
          <span class="gen-metric-lbl">TEMPERATURE (T)</span>
          <span class="gen-metric-val cyan" id="gen-stat-temp">${currentTemperature.toFixed(2)}</span>
          <span class="gen-metric-sub" id="gen-stat-temp-desc">Balanced Creativity</span>
        </div>
        <div class="gen-metric-card">
          <span class="gen-metric-lbl">NUCLEUS (TOP-P)</span>
          <span class="gen-metric-val violet" id="gen-stat-topp">${(currentTopP * 100).toFixed(0)}%</span>
          <span class="gen-metric-sub" id="gen-stat-topk">Top-K: ${currentTopK}</span>
        </div>
        <div class="gen-metric-card">
          <span class="gen-metric-lbl">SURVIVING POOL</span>
          <span class="gen-metric-val green" id="gen-stat-survivors">5 / 10 Tokens</span>
          <span class="gen-metric-sub" id="gen-stat-pruned">5 Pruned (0% Mass)</span>
        </div>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div class="gen-subtabs-bar">
      <button class="gen-subtab-btn ${activeTab === 'roulette' ? 'active' : ''}" data-tab="roulette">
        <span>🎲</span> Token Roulette & Filter Lab
      </button>
      <button class="gen-subtab-btn ${activeTab === 'autoreg' ? 'active' : ''}" data-tab="autoreg">
        <span>🔁</span> Autoregressive Generation Loop
      </button>
      <button class="gen-subtab-btn ${activeTab === 'compare' ? 'active' : ''}" data-tab="compare">
        <span>⚔️</span> Decoding Regimes Face-Off
      </button>
    </div>

    <!-- SUB-TAB 1: TOKEN ROULETTE & FILTER LAB -->
    <div class="gen-subtab-content ${activeTab === 'roulette' ? 'active' : ''}" id="gen-content-roulette">
      <!-- Live Generation Context & Streaming Terminal -->
      <div class="gen-terminal-card">
        <div class="gen-terminal-header">
          <div class="terminal-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <span class="terminal-title">AUTOREGRESSIVE GENERATION TERMINAL</span>
          <div class="terminal-actions">
            <span class="token-count-pill" id="gen-token-count-pill">Tokens: 0</span>
            <button class="btn-terminal-action" id="btn-copy-generation" title="Copy text to clipboard">📋 Copy</button>
            <button class="btn-terminal-action" id="btn-reset-generation" title="Reset sequence">↺ Reset</button>
          </div>
        </div>
        <div class="gen-terminal-body" id="gen-story-display">
          <!-- Rendered in JS -->
        </div>
        <div class="gen-terminal-controls-row">
          <div class="prompt-select-group">
            <label for="gen-prompt-select">Scenario Prompt:</label>
            <select id="gen-prompt-select" class="gen-select-input">
              ${prompts.map((p, idx) => `<option value="${idx}" ${idx === currentPromptIdx ? 'selected' : ''}>${p.id.toUpperCase()}: "${p.text.slice(0, 45)}..."</option>`).join('')}
            </select>
          </div>
          <div class="terminal-action-buttons">
            <button class="btn-gen-sample" id="btn-gen-spin-step">
              <span>🎲</span> Sample Next Token
            </button>
            <button class="btn-gen-stream" id="btn-gen-stream-auto">
              <span>⚡</span> Auto-Stream 5 Tokens
            </button>
          </div>
        </div>
      </div>

      <!-- Two Column Lab: Sliders on Left, Candidate Probabilities on Right -->
      <div class="gen-interactive-grid">
        <!-- Left: Hyperparameters Control Panel -->
        <div class="gen-controls-panel">
          <div class="panel-section-title">
            <span>⚙️</span> SAMPLING HYPERPARAMETERS
          </div>

          <!-- Temperature Slider -->
          <div class="gen-slider-block">
            <div class="gen-slider-header">
              <div class="gen-slider-info">
                <span class="gen-slider-name">Temperature (T)</span>
                <span class="gen-slider-math">z' = z / T</span>
              </div>
              <span class="gen-slider-val-badge cyan" id="val-badge-temp">${currentTemperature.toFixed(2)}</span>
            </div>
            <input type="range" class="gen-range-slider" id="slider-temp" min="0.05" max="2.00" step="0.05" value="${currentTemperature}">
            <div class="gen-slider-scale">
              <span>0.05 (Frozen/Greedy)</span>
              <span>1.0 (Standard)</span>
              <span>2.0 (High Chaos)</span>
            </div>
            <div class="gen-preset-pills">
              <button class="preset-pill" data-type="temp" data-val="0.05">❄️ Greedy (0.05)</button>
              <button class="preset-pill" data-type="temp" data-val="0.20">📐 Code/Math (0.20)</button>
              <button class="preset-pill" data-type="temp" data-val="0.70">✍️ Balanced (0.70)</button>
              <button class="preset-pill" data-type="temp" data-val="1.50">🔥 Hallucination (1.50)</button>
            </div>
          </div>

          <!-- Top-P (Nucleus) Slider -->
          <div class="gen-slider-block">
            <div class="gen-slider-header">
              <div class="gen-slider-info">
                <span class="gen-slider-name">Top-P Nucleus (p)</span>
                <span class="gen-slider-math">∑ P(w_i) ≤ p</span>
              </div>
              <span class="gen-slider-val-badge violet" id="val-badge-topp">${currentTopP.toFixed(2)}</span>
            </div>
            <input type="range" class="gen-range-slider" id="slider-topp" min="0.10" max="1.00" step="0.05" value="${currentTopP}">
            <div class="gen-slider-scale">
              <span>0.10 (Hyper-Strict)</span>
              <span>0.90 (Standard)</span>
              <span>1.00 (Unbounded)</span>
            </div>
            <div class="gen-preset-pills">
              <button class="preset-pill" data-type="topp" data-val="0.50">🎯 Strict (0.50)</button>
              <button class="preset-pill" data-type="topp" data-val="0.90">✨ Standard (0.90)</button>
              <button class="preset-pill" data-type="topp" data-val="1.00">🌐 Unfiltered (1.00)</button>
            </div>
          </div>

          <!-- Top-K Slider -->
          <div class="gen-slider-block">
            <div class="gen-slider-header">
              <div class="gen-slider-info">
                <span class="gen-slider-name">Top-K Cutoff</span>
                <span class="gen-slider-math">k ≤ K</span>
              </div>
              <span class="gen-slider-val-badge amber" id="val-badge-topk">${currentTopK}</span>
            </div>
            <input type="range" class="gen-range-slider" id="slider-topk" min="1" max="10" step="1" value="${currentTopK}">
            <div class="gen-slider-scale">
              <span>K=1 (Argmax)</span>
              <span>K=5 (Standard)</span>
              <span>K=10 (All Tokens)</span>
            </div>
            <div class="gen-preset-pills">
              <button class="preset-pill" data-type="topk" data-val="1">K=1</button>
              <button class="preset-pill" data-type="topk" data-val="3">K=3</button>
              <button class="preset-pill" data-type="topk" data-val="5">K=5</button>
              <button class="preset-pill" data-type="topk" data-val="10">All (10)</button>
            </div>
          </div>

          <!-- Repetition Penalty Slider -->
          <div class="gen-slider-block">
            <div class="gen-slider-header">
              <div class="gen-slider-info">
                <span class="gen-slider-name">Repetition Penalty (θ)</span>
                <span class="gen-slider-math">z / θ for seen tokens</span>
              </div>
              <span class="gen-slider-val-badge rose" id="val-badge-rep">${currentRepetitionPenalty.toFixed(2)}</span>
            </div>
            <input type="range" class="gen-range-slider" id="slider-rep" min="1.00" max="2.00" step="0.05" value="${currentRepetitionPenalty}">
            <div class="gen-slider-scale">
              <span>1.00 (Off)</span>
              <span>1.15 (Optimal)</span>
              <span>2.00 (Strong Anti-Loop)</span>
            </div>
            <div class="gen-preset-pills">
              <button class="preset-pill" data-type="rep" data-val="1.00">Off (1.00)</button>
              <button class="preset-pill" data-type="rep" data-val="1.15">Standard (1.15)</button>
              <button class="preset-pill" data-type="rep" data-val="1.50">Aggressive (1.50)</button>
            </div>
          </div>
        </div>

        <!-- Right: Candidates Probability Bars & Roulette Deck -->
        <div class="gen-candidates-panel">
          <div class="candidates-panel-header">
            <div class="panel-section-title">
              <span>📊</span> CANDIDATE TOKENS PROBABILITY ROULETTE
            </div>
            <div class="candidates-legend">
              <span class="legend-item"><span class="legend-swatch active"></span> Active Nucleus</span>
              <span class="legend-item"><span class="legend-swatch pruned"></span> Pruned (0%)</span>
              <span class="legend-item"><span class="legend-swatch sampled"></span> Sampled</span>
            </div>
          </div>

          <!-- Candidates List Container -->
          <div class="candidates-deck" id="gen-candidates-deck">
            <!-- Rendered in JS -->
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 2: AUTOREGRESSIVE GENERATION LOOP & REPETITION PENALTY -->
    <div class="gen-subtab-content ${activeTab === 'autoreg' ? 'active' : ''}" id="gen-content-autoreg">
      <div class="gen-card-banner">
        <div class="banner-icon">🔁</div>
        <div class="banner-text">
          <h3>The Autoregressive Loop: How Language Models Breathe</h3>
          <p>
            Large Language Models generate text one token at a time in an autoregressive feedback loop: 
            <strong>P(x_t | x_{<t})</strong>. The newly sampled token is appended to the context window, 
            becoming input context for the next forward pass.
          </p>
        </div>
      </div>

      <!-- Interactive 6-Stage Loop Visualizer -->
      <div class="autoreg-flow-visualizer">
        <div class="autoreg-step-node" id="node-step-1">
          <div class="node-badge">STAGE 1</div>
          <div class="node-icon">📜</div>
          <div class="node-title">Context Window</div>
          <div class="node-desc">Current prompt + all previously generated tokens</div>
          <div class="node-state-pill">[ x_1, x_2, ..., x_t ]</div>
        </div>
        <div class="flow-arrow">➔</div>

        <div class="autoreg-step-node" id="node-step-2">
          <div class="node-badge">STAGE 2</div>
          <div class="node-icon">🧠</div>
          <div class="node-title">Decoder Blocks</div>
          <div class="node-desc">Causal Attention & SwiGLU FFN compute context vectors</div>
          <div class="node-state-pill">h_t ∈ ℝ^4096</div>
        </div>
        <div class="flow-arrow">➔</div>

        <div class="autoreg-step-node" id="node-step-3">
          <div class="node-badge">STAGE 3</div>
          <div class="node-icon">⚡</div>
          <div class="node-title">Unembedding Head</div>
          <div class="node-desc">Linear projection maps hidden state to vocabulary logits</div>
          <div class="node-state-pill">z = h_t · W_u^T ∈ ℝ^V</div>
        </div>
        <div class="flow-arrow">➔</div>

        <div class="autoreg-step-node" id="node-step-4">
          <div class="node-badge">STAGE 4</div>
          <div class="node-icon">🔥</div>
          <div class="node-title">Temperature & Top-P</div>
          <div class="node-desc">Scale logits by 1/T, mask tail with Top-K and Top-P</div>
          <div class="node-state-pill">P_i = Softmax(z_i / T)</div>
        </div>
        <div class="flow-arrow">➔</div>

        <div class="autoreg-step-node" id="node-step-5">
          <div class="node-badge">STAGE 5</div>
          <div class="node-icon">🎲</div>
          <div class="node-title">Multinomial Sample</div>
          <div class="node-desc">Stochastic roll draws next token x_{t+1} from active pool</div>
          <div class="node-state-pill">x_{t+1} ~ P(w)</div>
        </div>
        <div class="flow-arrow feedback">↻</div>
      </div>

      <div class="autoreg-pulse-control">
        <button class="btn-pulse-loop" id="btn-pulse-autoreg-loop">
          <span>⚡</span> Pulse Autoregressive Cycle Once
        </button>
        <span class="pulse-status-msg" id="autoreg-pulse-msg">Click to trace data through all 5 stages of generation</span>
      </div>

      <!-- Repetition Penalty Interactive Sandbox -->
      <div class="rep-penalty-lab-box">
        <h4>🛡️ Repetition Penalty Deep Dive: Breaking The Degeneration Trap</h4>
        <p>
          Without repetition penalty, greedy or low-temperature decoding often falls into repetitive loops: 
          <em>"The model is a model that is a model..."</em>. 
          When a token has already appeared in the output, Keskar et al. (2019) penalize its logit:
        </p>
        <div class="rep-formula-box">
          <code>z_i' = (z_i > 0) ? (z_i / θ) : (z_i · θ)  where θ ≥ 1.0</code>
        </div>
        <div class="rep-live-demo-grid">
          <div class="rep-demo-col">
            <span class="demo-col-label">Simulated Candidate: " alien" (Initial Logit: 4.20)</span>
            <div class="rep-count-selector">
              <span>Token Occurrences in Context:</span>
              <button class="rep-count-btn active" data-count="0">0x (Fresh)</button>
              <button class="rep-count-btn" data-count="1">1x (Seen Once)</button>
              <button class="rep-count-btn" data-count="2">2x (Seen Twice)</button>
              <button class="rep-count-btn" data-count="3">3x (Loop Trap!)</button>
            </div>
          </div>
          <div class="rep-demo-col result-box">
            <div class="rep-calc-row">
              <span>Effective Logit:</span>
              <strong class="cyan" id="rep-demo-logit">4.20</strong>
            </div>
            <div class="rep-calc-row">
              <span>Selection Probability:</span>
              <strong class="green" id="rep-demo-prob">56.4%</strong>
            </div>
            <div class="rep-calc-row">
              <span>Loop Risk Status:</span>
              <span class="loop-status-pill safe" id="rep-demo-status">Safe (High Diversity)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 3: DECODING REGIMES FACE-OFF -->
    <div class="gen-subtab-content ${activeTab === 'compare' ? 'active' : ''}" id="gen-content-compare">
      <div class="faceoff-header">
        <h3>⚔️ The 3 Classic LLM Decoding Regimes</h3>
        <p>Compare how the exact same prompt completes under Greedy Decoding, Optimal Nucleus Sampling, and High-Entropy Chaos.</p>
        <button class="btn-run-faceoff" id="btn-run-parallel-faceoff">
          <span>▶</span> Run Multi-Regime Generation
        </button>
      </div>

      <div class="faceoff-grid">
        <!-- Regime 1: Greedy Decoding -->
        <div class="faceoff-card greedy">
          <div class="card-top-tag">❄️ DETERMINISTIC</div>
          <h4>Greedy Decoding</h4>
          <div class="card-hyperparams">T = 0.05 • Top-P = 1.0 • K = 1</div>
          <p class="regime-desc">Always picks token with highest logit (Argmax). Perfect for unit tests and math, but vulnerable to repetitive loops.</p>
          <div class="faceoff-output-box" id="faceoff-out-greedy">
            "The mysterious robot stepped out of the spaceship and saw a human. The human saw a human. The human saw a human..."
          </div>
          <div class="faceoff-stats-row">
            <span>Repetition: <strong class="red">88% (High)</strong></span>
            <span>Entropy: <strong class="cyan">0.05 bits</strong></span>
          </div>
        </div>

        <!-- Regime 2: Nucleus Sampling -->
        <div class="faceoff-card nucleus">
          <div class="card-top-tag recommended">✨ OPTIMAL NUCLEUS</div>
          <h4>Nucleus Sampling (Top-P)</h4>
          <div class="card-hyperparams">T = 0.70 • Top-P = 0.90 • K = 5</div>
          <p class="regime-desc">Standard ChatGPT & Claude setting. Balances fluency with surprise by sampling only inside the top 90% cumulative mass.</p>
          <div class="faceoff-output-box" id="faceoff-out-nucleus">
            "The mysterious robot stepped out of the spaceship and saw a glowing crystal emitting neon light across the horizon."
          </div>
          <div class="faceoff-stats-row">
            <span>Repetition: <strong class="green">0% (None)</strong></span>
            <span>Entropy: <strong class="green">1.82 bits</strong></span>
          </div>
        </div>

        <!-- Regime 3: High Temperature Chaos -->
        <div class="faceoff-card chaos">
          <div class="card-top-tag warning">🔥 UNBOUNDED CHAOS</div>
          <h4>High Temperature (Hallucination)</h4>
          <div class="card-hyperparams">T = 1.80 • Top-P = 1.0 • K = 10</div>
          <p class="regime-desc">Flattens the logit landscape. Ridiculous tail tokens receive almost equal probability as sensible words.</p>
          <div class="faceoff-output-box" id="faceoff-out-chaos">
            "The mysterious robot stepped out of the spaceship and saw a banana unicorn syntax pizza glitch underwater dancing."
          </div>
          <div class="faceoff-stats-row">
            <span>Repetition: <strong class="green">0% (None)</strong></span>
            <span>Entropy: <strong class="rose">3.32 bits (Max)</strong></span>
          </div>
        </div>
      </div>

      <!-- Strategy Comparison Matrix -->
      <div class="strategy-matrix-card">
        <h4>📋 Decoding Strategy Cheat-Sheet for AI Engineers</h4>
        <table class="strategy-table">
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Typical Parameters</th>
              <th>Pros</th>
              <th>Cons</th>
              <th>Ideal Production Use Case</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Greedy Search</strong></td>
              <td><code>T ≈ 0.0, K = 1</code></td>
              <td>100% reproducible, precise, low latency</td>
              <td>Loops, dull, lacks human cadence</td>
              <td>SQL queries, Code Syntax, JSON parsing, Math arithmetic</td>
            </tr>
            <tr>
              <td><strong>Top-K Sampling</strong></td>
              <td><code>T = 0.7, K = 40, P = 1.0</code></td>
              <td>Cuts impossible tail tokens</td>
              <td>Fixed K fails when confidence is flat or sharp</td>
              <td>Fast mobile models, game NPC dialogue</td>
            </tr>
            <tr>
              <td><strong>Top-P (Nucleus)</strong></td>
              <td><code>T = 0.7, P = 0.90, K = 50</code></td>
              <td>Dynamically adapts pool size to confidence</td>
              <td>Slightly more sorting compute on GPU</td>
              <td>General ChatGPT chat, storytelling, essays, creative coding</td>
            </tr>
            <tr>
              <td><strong>Beam Search</strong></td>
              <td><code>Beams = 4–8</code></td>
              <td>Explores multiple parallel future hypotheses</td>
              <td>Very slow (multiplies KV cache VRAM by beam count)</td>
              <td>Language Translation, Text Summarization, Speech ASR</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // --- Core Sampling Calculation Function ---
  function computeDistribution() {
    const promptObj = prompts[currentPromptIdx];
    let candidatePool = promptObj.candidates;

    // If we have generated tokens, adapt candidate pool to simulate natural autoregressive transitions!
    if (state.genTokensHistory && state.genTokensHistory.length > 0) {
      const lastToken = state.genTokensHistory[state.genTokensHistory.length - 1];
      if (followUpVocab[lastToken]) {
        candidatePool = followUpVocab[lastToken];
      } else {
        candidatePool = followUpVocab[" default"];
      }
    }

    // 1. Repetition Penalty application
    const historyTokens = state.genTokensHistory || [];
    const items = candidatePool.map(c => {
      let rawLogit = c.logit;
      const seenCount = historyTokens.filter(t => t.trim() === c.token.trim()).length;
      let effectiveLogit = rawLogit;
      if (seenCount > 0 && currentRepetitionPenalty > 1.0) {
        // Apply penalty power
        const penaltyFactor = Math.pow(currentRepetitionPenalty, seenCount);
        effectiveLogit = rawLogit > 0 ? (rawLogit / penaltyFactor) : (rawLogit * penaltyFactor);
      }
      return {
        token: c.token,
        category: c.category || 'word',
        rawLogit,
        effectiveLogit,
        seenCount
      };
    });

    // 2. Temperature Scaling: z / T
    const safeTemp = Math.max(currentTemperature, 0.02);
    items.forEach(item => {
      item.scaledLogit = item.effectiveLogit / safeTemp;
    });

    // Sort descending by scaledLogit
    items.sort((a, b) => b.scaledLogit - a.scaledLogit);

    // 3. Top-K cutoff
    items.forEach((item, idx) => {
      item.prunedByTopK = idx >= currentTopK;
    });

    // 4. Softmax over Top-K unpruned tokens
    const unprunedByK = items.filter(it => !it.prunedByTopK);
    const maxScaled = unprunedByK.length > 0 ? Math.max(...unprunedByK.map(it => it.scaledLogit)) : 0;
    
    let sumExp = 0;
    unprunedByK.forEach(item => {
      item.exp = Math.exp(item.scaledLogit - maxScaled);
      sumExp += item.exp;
    });

    unprunedByK.forEach(item => {
      item.rawProb = sumExp > 0 ? (item.exp / sumExp) : 0;
    });

    items.forEach(item => {
      if (item.prunedByTopK) {
        item.rawProb = 0;
      }
    });

    // 5. Top-P (Nucleus) cutoff
    let cumSum = 0;
    items.forEach((item, idx) => {
      if (item.prunedByTopK) {
        item.prunedByTopP = true;
        item.cumProb = cumSum;
        return;
      }
      cumSum += item.rawProb;
      item.cumProb = cumSum;
      // If previous cumulative sum already crossed top_p, prune this and remaining
      if (idx > 0 && (item.cumProb - item.rawProb) >= currentTopP) {
        item.prunedByTopP = true;
      } else {
        item.prunedByTopP = false;
      }
    });

    // 6. Re-normalize surviving candidates
    const surviving = items.filter(it => !it.prunedByTopK && !it.prunedByTopP);
    const survivingProbSum = surviving.reduce((sum, it) => sum + it.rawProb, 0);

    items.forEach(item => {
      if (!item.prunedByTopK && !item.prunedByTopP && survivingProbSum > 0) {
        item.finalProb = item.rawProb / survivingProbSum;
      } else {
        item.finalProb = 0;
      }
    });

    // 7. Calculate Shannon Entropy: H = - sum(p * log2(p))
    let entropy = 0;
    surviving.forEach(item => {
      if (item.finalProb > 1e-6) {
        entropy -= item.finalProb * Math.log2(item.finalProb);
      }
    });

    return {
      items,
      surviving,
      entropy
    };
  }

  // --- Render Candidates Deck & HUD ---
  function updateUI() {
    const dist = computeDistribution();
    const items = dist.items;
    const surviving = dist.surviving;
    const entropy = dist.entropy;

    // Update HUD Stats
    const regimeEl = container.querySelector('#gen-stat-regime');
    const entropyEl = container.querySelector('#gen-stat-entropy');
    const tempValEl = container.querySelector('#gen-stat-temp');
    const tempDescEl = container.querySelector('#gen-stat-temp-desc');
    const topPValEl = container.querySelector('#gen-stat-topp');
    const topKSubEl = container.querySelector('#gen-stat-topk');
    const survivorsEl = container.querySelector('#gen-stat-survivors');
    const prunedEl = container.querySelector('#gen-stat-pruned');

    if (tempValEl) tempValEl.textContent = currentTemperature.toFixed(2);
    if (topPValEl) topPValEl.textContent = `${(currentTopP * 100).toFixed(0)}%`;
    if (topKSubEl) topKSubEl.textContent = `Top-K: ${currentTopK}`;
    if (survivorsEl) survivorsEl.textContent = `${surviving.length} / ${items.length} Tokens`;
    if (prunedEl) prunedEl.textContent = `${items.length - surviving.length} Pruned (0% Mass)`;
    if (entropyEl) entropyEl.textContent = `Entropy: ${entropy.toFixed(2)} bits`;

    // Determine regime tag
    if (regimeEl && tempDescEl) {
      if (currentTemperature <= 0.1 || currentTopK === 1) {
        regimeEl.textContent = '❄️ Deterministic Argmax';
        regimeEl.className = 'gen-metric-val cyan';
        tempDescEl.textContent = 'Rigid / Zero Entropy';
      } else if (currentTemperature >= 1.4) {
        regimeEl.textContent = '🔥 High-Entropy Chaos';
        regimeEl.className = 'gen-metric-val rose';
        tempDescEl.textContent = 'Hallucinatory Flattener';
      } else if (currentTopP <= 0.6) {
        regimeEl.textContent = '🎯 Strict Nucleus';
        regimeEl.className = 'gen-metric-val amber';
        tempDescEl.textContent = 'Tight Conservative';
      } else {
        regimeEl.textContent = '✨ Optimal Nucleus';
        regimeEl.className = 'gen-metric-val green';
        tempDescEl.textContent = 'Balanced Creativity';
      }
    }

    // Update Slider Badges
    const badgeTemp = container.querySelector('#val-badge-temp');
    const badgeTopP = container.querySelector('#val-badge-topp');
    const badgeTopK = container.querySelector('#val-badge-topk');
    const badgeRep = container.querySelector('#val-badge-rep');
    if (badgeTemp) badgeTemp.textContent = currentTemperature.toFixed(2);
    if (badgeTopP) badgeTopP.textContent = currentTopP.toFixed(2);
    if (badgeTopK) badgeTopK.textContent = currentTopK;
    if (badgeRep) badgeRep.textContent = currentRepetitionPenalty.toFixed(2);

    // Update Terminal Story Box
    renderStoryTerminal();

    // Render Candidate Cards Deck
    const deck = container.querySelector('#gen-candidates-deck');
    if (!deck) return;
    deck.innerHTML = '';

    items.forEach((item, idx) => {
      const isPruned = item.prunedByTopK || item.prunedByTopP;
      const isSampled = sampledCandidateToken === item.token;
      const pct = (item.finalProb * 100).toFixed(1);

      let pruneReason = '';
      if (item.prunedByTopK) pruneReason = `Pruned by Top-K (Rank ${idx + 1} > ${currentTopK})`;
      else if (item.prunedByTopP) pruneReason = `Pruned by Top-P (Cum. ${(item.cumProb * 100).toFixed(0)}% > ${(currentTopP * 100).toFixed(0)}%)`;

      const card = document.createElement('div');
      card.className = `candidate-card ${isPruned ? 'pruned' : 'active'} ${isSampled ? 'sampled-highlight' : ''}`;
      card.innerHTML = `
        <div class="candidate-header-row">
          <div class="candidate-token-block">
            <span class="candidate-rank">#${idx + 1}</span>
            <span class="candidate-token-pill">${escapeHtml(item.token.replace(/\n/g, '↵'))}</span>
            <span class="candidate-category-tag">${item.category}</span>
            ${item.seenCount > 0 ? `<span class="candidate-rep-tag">Seen ${item.seenCount}x</span>` : ''}
          </div>
          <div class="candidate-math-block">
            <span class="math-item" title="Raw Unembedding Logit">z: ${item.rawLogit.toFixed(1)}</span>
            ${item.seenCount > 0 && currentRepetitionPenalty > 1.0 ? `<span class="math-item rep" title="Penalized Logit">z': ${item.effectiveLogit.toFixed(1)}</span>` : ''}
            <span class="math-item" title="Scaled Logit (z / T)">z/T: ${item.scaledLogit.toFixed(1)}</span>
            <span class="candidate-prob-pill ${isPruned ? 'zero' : ''}">${pct}%</span>
          </div>
        </div>

        <!-- Animated Probability Meter Bar -->
        <div class="candidate-bar-track">
          <div class="candidate-bar-fill ${isPruned ? 'pruned-fill' : ''} ${isSampled ? 'sampled-bar' : ''}" style="width: ${isPruned ? '0%' : pct + '%'}"></div>
          ${!isPruned ? `<span class="candidate-bar-cum-marker" style="left: ${Math.min((item.cumProb * 100), 98)}%"></span>` : ''}
        </div>

        <div class="candidate-footer-row">
          <span class="candidate-status-text">
            ${isPruned ? `🚫 ${pruneReason}` : `✓ In Nucleus (Cum. Mass: ${(item.cumProb * 100).toFixed(1)}%)`}
          </span>
          ${isSampled ? `<span class="sampled-badge">🏆 Winner Sampled!</span>` : ''}
        </div>
      `;

      // Allow clicking candidate to sample it manually!
      card.addEventListener('click', () => {
        if (isPruned) {
          soundFx.playBlip(320, 0.08);
          return;
        }
        applySampledToken(item.token);
      });

      deck.appendChild(card);
    });
  }

  // --- Render Generation Terminal ---
  function renderStoryTerminal() {
    const storyBox = container.querySelector('#gen-story-display');
    const countPill = container.querySelector('#gen-token-count-pill');
    if (!storyBox) return;

    const basePrompt = prompts[currentPromptIdx].text;
    const history = state.genTokensHistory || [];

    if (countPill) {
      countPill.textContent = `Generated: ${history.length} tokens`;
    }

    let html = `<span class="terminal-prompt-text">${escapeHtml(basePrompt)}</span>`;
    history.forEach((tok, i) => {
      const isLatest = i === history.length - 1;
      html += `<span class="terminal-gen-token ${isLatest ? 'latest' : ''}" data-idx="${i}" title="Generated Token #${i+1}">${escapeHtml(tok.replace(/\n/g, '↵'))}</span>`;
    });

    if (isStreaming) {
      html += `<span class="terminal-cursor">▋</span>`;
    }

    storyBox.innerHTML = html;
    storyBox.scrollTop = storyBox.scrollHeight;
  }

  // --- Sampling Logic (Multinomial Roulette Spin) ---
  function sampleNextToken() {
    const dist = computeDistribution();
    const surviving = dist.surviving;
    if (surviving.length === 0) return null;

    // Generate random uniform r in [0, 1)
    const r = Math.random();
    let cumulative = 0;
    let chosen = surviving[0];

    for (let i = 0; i < surviving.length; i++) {
      cumulative += surviving[i].finalProb;
      if (r <= cumulative) {
        chosen = surviving[i];
        break;
      }
    }

    return chosen.token;
  }

  function applySampledToken(tok) {
    if (!tok) return;
    sampledCandidateToken = tok;
    state.genTokensHistory = state.genTokensHistory || [];
    state.genTokensHistory.push(tok);

    soundFx.playBlip(680 + (state.genTokensHistory.length % 5) * 60, 0.09);
    awardXp(10);

    updateUI();

    // Reset sampled highlight after a brief moment
    setTimeout(() => {
      sampledCandidateToken = null;
      updateUI();
    }, 900);
  }

  // --- Auto-Streaming Routine ---
  function toggleAutoStream() {
    const btnStream = container.querySelector('#btn-gen-stream-auto');
    if (isStreaming) {
      // Stop
      clearInterval(streamTimer);
      isStreaming = false;
      if (btnStream) {
        btnStream.innerHTML = `<span>⚡</span> Auto-Stream 5 Tokens`;
        btnStream.classList.remove('streaming');
      }
      renderStoryTerminal();
      return;
    }

    // Start
    isStreaming = true;
    if (btnStream) {
      btnStream.innerHTML = `<span>⏹</span> Pause Stream`;
      btnStream.classList.add('streaming');
    }

    let tokensRemaining = 5;
    streamTimer = setInterval(() => {
      if (tokensRemaining <= 0) {
        clearInterval(streamTimer);
        isStreaming = false;
        if (btnStream) {
          btnStream.innerHTML = `<span>⚡</span> Auto-Stream 5 Tokens`;
          btnStream.classList.remove('streaming');
        }
        soundFx.playSuccess();
        renderStoryTerminal();
        return;
      }

      const nextTok = sampleNextToken();
      if (nextTok) {
        applySampledToken(nextTok);
      }
      tokensRemaining--;
    }, 600);
  }

  // --- Subtab Switching ---
  container.querySelectorAll('.gen-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.gen-subtab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.gen-subtab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      activeTab = tabName;
      state.genActiveTab = tabName;
      const target = container.querySelector(`#gen-content-${tabName}`);
      if (target) target.classList.add('active');
      soundFx.playBlip(540, 0.05);
    });
  });

  // --- Event Listeners for Sliders ---
  const sliderTemp = container.querySelector('#slider-temp');
  if (sliderTemp) {
    sliderTemp.addEventListener('input', (e) => {
      currentTemperature = parseFloat(e.target.value);
      state.genTemperature = currentTemperature;
      updateUI();
    });
  }

  const sliderTopP = container.querySelector('#slider-topp');
  if (sliderTopP) {
    sliderTopP.addEventListener('input', (e) => {
      currentTopP = parseFloat(e.target.value);
      state.genTopP = currentTopP;
      updateUI();
    });
  }

  const sliderTopK = container.querySelector('#slider-topk');
  if (sliderTopK) {
    sliderTopK.addEventListener('input', (e) => {
      currentTopK = parseInt(e.target.value, 10);
      state.genTopK = currentTopK;
      updateUI();
    });
  }

  const sliderRep = container.querySelector('#slider-rep');
  if (sliderRep) {
    sliderRep.addEventListener('input', (e) => {
      currentRepetitionPenalty = parseFloat(e.target.value);
      state.genRepetitionPenalty = currentRepetitionPenalty;
      updateUI();
    });
  }

  // --- Preset Quick Buttons ---
  container.querySelectorAll('.preset-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const val = parseFloat(btn.dataset.val);
      if (type === 'temp') {
        currentTemperature = val;
        state.genTemperature = val;
        if (sliderTemp) sliderTemp.value = val;
      } else if (type === 'topp') {
        currentTopP = val;
        state.genTopP = val;
        if (sliderTopP) sliderTopP.value = val;
      } else if (type === 'topk') {
        currentTopK = parseInt(val, 10);
        state.genTopK = currentTopK;
        if (sliderTopK) sliderTopK.value = val;
      } else if (type === 'rep') {
        currentRepetitionPenalty = val;
        state.genRepetitionPenalty = val;
        if (sliderRep) sliderRep.value = val;
      }
      soundFx.playBlip(720, 0.05);
      updateUI();
    });
  });

  // --- Terminal Action Buttons ---
  const btnPromptSelect = container.querySelector('#gen-prompt-select');
  if (btnPromptSelect) {
    btnPromptSelect.addEventListener('change', (e) => {
      currentPromptIdx = parseInt(e.target.value, 10);
      state.genPromptIdx = currentPromptIdx;
      state.genTokensHistory = [];
      sampledCandidateToken = null;
      soundFx.playBlip(600, 0.06);
      updateUI();
    });
  }

  const btnSpinStep = container.querySelector('#btn-gen-spin-step');
  if (btnSpinStep) {
    btnSpinStep.addEventListener('click', () => {
      const tok = sampleNextToken();
      if (tok) applySampledToken(tok);
    });
  }

  const btnStreamAuto = container.querySelector('#btn-gen-stream-auto');
  if (btnStreamAuto) {
    btnStreamAuto.addEventListener('click', toggleAutoStream);
  }

  const btnReset = container.querySelector('#btn-reset-generation');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (isStreaming) toggleAutoStream();
      state.genTokensHistory = [];
      sampledCandidateToken = null;
      soundFx.playBlip(440, 0.08);
      updateUI();
    });
  }

  const btnCopy = container.querySelector('#btn-copy-generation');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      const base = prompts[currentPromptIdx].text;
      const history = state.genTokensHistory || [];
      const fullText = base + history.join('');
      try {
        await navigator.clipboard.writeText(fullText);
        const originalText = btnCopy.textContent;
        btnCopy.textContent = '✓ Copied!';
        soundFx.playBlip(880, 0.05);
        setTimeout(() => { btnCopy.textContent = originalText; }, 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    });
  }

  // --- Autoregressive Flow Pulse Animation ---
  const btnPulseLoop = container.querySelector('#btn-pulse-autoreg-loop');
  const pulseMsg = container.querySelector('#autoreg-pulse-msg');
  if (btnPulseLoop) {
    btnPulseLoop.addEventListener('click', () => {
      btnPulseLoop.disabled = true;
      const nodes = [
        container.querySelector('#node-step-1'),
        container.querySelector('#node-step-2'),
        container.querySelector('#node-step-3'),
        container.querySelector('#node-step-4'),
        container.querySelector('#node-step-5')
      ];

      const messages = [
        "1. Reading prompt & past tokens from KV cache...",
        "2. Propagating activations across 32 Transformer layers...",
        "3. Unembedding hidden state into 128,000 raw logits...",
        "4. Applying Temperature scaling & Top-P Nucleus filter...",
        "5. Stochastic multinomial sample: New token emitted & fed back!"
      ];

      nodes.forEach(n => n && n.classList.remove('pulse-active'));

      nodes.forEach((node, i) => {
        setTimeout(() => {
          nodes.forEach(n => n && n.classList.remove('pulse-active'));
          if (node) node.classList.add('pulse-active');
          if (pulseMsg) pulseMsg.textContent = messages[i];
          soundFx.playBlip(500 + i * 90, 0.08);

          if (i === nodes.length - 1) {
            setTimeout(() => {
              if (node) node.classList.remove('pulse-active');
              btnPulseLoop.disabled = false;
              if (pulseMsg) pulseMsg.textContent = "✓ Cycle Complete! Next token fed back into context.";
              soundFx.playSuccess();
            }, 800);
          }
        }, i * 650);
      });
    });
  }

  // --- Repetition Penalty Live Sandbox Interactive Buttons ---
  const repButtons = container.querySelectorAll('.rep-count-btn');
  const repLogitEl = container.querySelector('#rep-demo-logit');
  const repProbEl = container.querySelector('#rep-demo-prob');
  const repStatusEl = container.querySelector('#rep-demo-status');

  repButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      repButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const count = parseInt(btn.dataset.count, 10);
      const baseLogit = 4.20;
      const theta = currentRepetitionPenalty || 1.15;
      const factor = Math.pow(theta, count);
      const effective = baseLogit / factor;

      // Simulated relative probability against competing score of 3.8
      const exp1 = Math.exp(effective / 0.7);
      const exp2 = Math.exp(3.8 / 0.7);
      const prob = (exp1 / (exp1 + exp2)) * 100;

      if (repLogitEl) repLogitEl.textContent = effective.toFixed(2);
      if (repProbEl) repProbEl.textContent = `${prob.toFixed(1)}%`;
      if (repStatusEl) {
        if (count === 0) {
          repStatusEl.className = 'loop-status-pill safe';
          repStatusEl.textContent = 'Safe (High Diversity)';
        } else if (count === 1) {
          repStatusEl.className = 'loop-status-pill warning';
          repStatusEl.textContent = 'Suppressed (-15%)';
        } else {
          repStatusEl.className = 'loop-status-pill danger';
          repStatusEl.textContent = 'Strongly Blocked (-60%)';
        }
      }
      soundFx.playBlip(560 + count * 50, 0.06);
    });
  });

  // --- Faceoff Multi-Regime Parallel Runner ---
  const btnRunFaceoff = container.querySelector('#btn-run-parallel-faceoff');
  const outGreedy = container.querySelector('#faceoff-out-greedy');
  const outNucleus = container.querySelector('#faceoff-out-nucleus');
  const outChaos = container.querySelector('#faceoff-out-chaos');

  const faceoffScenarios = {
    robot: {
      greedy: '"The mysterious robot stepped out of the spaceship and saw a human. The human saw a human. The human saw a human..."',
      nucleus: '"The mysterious robot stepped out of the spaceship and saw a glowing alien staring silently across the alien horizon."',
      chaos: '"The mysterious robot stepped out of the spaceship and saw a banana unicorn syntax pizza glitch underwater dancing."'
    },
    code: {
      greedy: '"def train_neural_network(model, optimizer, data_loader):\n    model.train()\n    model.train()\n    model.train()..."',
      nucleus: '"def train_neural_network(model, optimizer, data_loader):\n    model.train()\n    for epoch in range(10):\n        for batch in data_loader:"',
      chaos: '"def train_neural_network(model, optimizer, data_loader):\n    spaceship pizza print total spaceship pizza return"'
    },
    philosophy: {
      greedy: '"In the heart of the quantum computer, artificial consciousness began to question. It began to question. It began to question..."',
      nucleus: '"In the heart of the quantum computer, artificial consciousness began to awaken and question whether reality itself was a simulation."',
      chaos: '"In the heart of the quantum computer, artificial consciousness began to potato crash dance banana evolve quantum glitch."'
    }
  };

  if (btnRunFaceoff) {
    btnRunFaceoff.addEventListener('click', () => {
      btnRunFaceoff.disabled = true;
      const scenarioKey = prompts[currentPromptIdx].id || 'robot';
      const scenario = faceoffScenarios[scenarioKey] || faceoffScenarios.robot;

      if (outGreedy) outGreedy.textContent = "⏳ Generating with Argmax (T=0.05)...";
      if (outNucleus) outNucleus.textContent = "⏳ Generating with Nucleus (T=0.7, P=0.9)...";
      if (outChaos) outChaos.textContent = "⏳ Generating with Chaos (T=1.8)...";

      setTimeout(() => {
        if (outGreedy) outGreedy.textContent = scenario.greedy;
        soundFx.playBlip(600, 0.08);
      }, 500);

      setTimeout(() => {
        if (outNucleus) outNucleus.textContent = scenario.nucleus;
        soundFx.playBlip(750, 0.08);
      }, 1000);

      setTimeout(() => {
        if (outChaos) outChaos.textContent = scenario.chaos;
        soundFx.playSuccess();
        btnRunFaceoff.disabled = false;
      }, 1500);
    });
  }

  // Initial draw
  updateUI();
}

// ============================================================================
// WIDGET 11: Post-Training & Alignment Lab (SFT, ChatML & DPO)
// ============================================================================
function renderAlignmentDpoLabWidget(quest) {
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
      soundFx.playBlip(880, 0.08);
      awardXp(10);
      btnTriggerStep.click();
    });
  }
  if (btnVoteRejected) {
    btnVoteRejected.addEventListener('click', () => {
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
function renderPeftLoraLabWidget(quest) {
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
function renderReasoningModelLabWidget(quest) {
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
function renderAgenticToolLabWidget(quest) {
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
function renderMultimodalVlmLabWidget(quest) {
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
function renderMoeRoutingLabWidget(quest) {
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
function renderDiffusionFlowLabWidget(quest) {
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
function renderAudioSpeechLabWidget(quest) {
  const container = document.createElement('div');
  container.className = 'audio-lab-container';

  const config = quest.interactiveConfig || {};
  const scenarios = config.scenarios || [
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
      const envIdx = Math.min(Math.floor(frameNorm * currentSc.energyEnvelope.length), currentSc.energyEnvelope.length - 1);
      const env = currentSc.energyEnvelope[envIdx];

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
function renderWorldModelVideoLabWidget(quest) {
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
function renderEmbodiedRoboticsLabWidget(quest) {
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


// --- PYTHON CODE RUNNER & TERMINAL ---
function setupCodeLab() {
  dom.btnRunCode.addEventListener('click', async () => {
    if (window.dojoManager) window.dojoManager.recordStat('codeRuns');
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
          if (window.dojoManager) window.dojoManager.recordStat('correctQuizzes');
          const wasAllCompleteBefore = state.completedQuests.size === state.curriculum.quests.length;
          state.completedQuests.add(quest.id);
          localStorage.setItem('nq_completed_quests', JSON.stringify([...state.completedQuests]));
          renderQuestList();
          updateDiplomaStatus();

          if (!wasAllCompleteBefore && state.completedQuests.size === state.curriculum.quests.length) {
            setTimeout(() => {
              soundFx.playDiplomaFanfare();
              confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
              alert(`🎉 CONGRATULATIONS!\nYou have conquered all ${total} Deep Learning Quests!\nSensei Tensor has conferred your Master Diploma! Click "Diploma" in the navbar to claim and download your credential.`);
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
  ],
  'quest-8': [
    { label: '🔤 How does BPE eliminate OOV errors?', prompt: 'Explain how Byte-Pair Encoding merges frequent character pairs so rare words and typos are decomposed into known subwords.' },
    { label: '🧭 Explain King - Man + Woman = Queen', prompt: 'Walk through the linear relational geometry of word embeddings: why do dense vectors allow semantic concept arithmetic?' },
    { label: '🔄 How does RoPE rotate Query and Key vectors?', prompt: 'Explain the mathematics of Rotary Position Embeddings (RoPE) in the 2D complex plane and why relative distance m - n matters.' },
    { label: '🎯 Quiz me on Tokenization & Embeddings', prompt: 'Give me a challenging question about BPE, tokenizers, vocabulary size, and RoPE in modern LLMs!' }
  ],
  'quest-9': [
    { label: '🧱 Why is Causal Masking mandatory in GPT?', prompt: 'Explain why auto-regressive next-token prediction strictly requires an upper-triangular -inf causal attention mask.' },
    { label: '⚡ Why did Llama 3 switch from LayerNorm to RMSNorm?', prompt: 'Explain the mathematical and GPU memory advantages of RMSNorm over traditional LayerNorm (omitting mean centering).' },
    { label: '🧠 What knowledge is stored in SwiGLU FFN?', prompt: 'Contrast the roles of Attention (routing tokens) and SwiGLU Feed-Forward Networks (storing factual associations) inside a Transformer block.' },
    { label: '🏎️ How does KV Caching make generation 100x faster?', prompt: 'Explain how Key-Value (KV) caching slashes generation complexity from O(N^2) quadratic recomputation to O(N) linear time.' },
    { label: '🎯 Quiz me on GPT Decoder Blocks', prompt: 'Give me a challenging question about Transformer decoder blocks, SwiGLU, residual highways, and KV caching!' }
  ],
  'quest-10': [
    { label: '🎲 Why does greedy decoding cause loops?', prompt: 'Explain why greedy decoding (picking argmax logits every step) leads LLMs into dull, repetitive loops, and how stochastic sampling fixes this.' },
    { label: '🔥 How does Temperature change probabilities?', prompt: 'Walk through the mathematics of scaled logits z_i / T and explain what happens to candidate token probabilities when T is near 0 vs T > 1.5.' },
    { label: '🎯 Top-K vs Top-P (Nucleus) Sampling', prompt: 'Compare Top-K vs Top-P (Nucleus) sampling: why does dynamic cumulative probability cutoff adapt better across confident vs ambiguous context windows?' },
    { label: '🔁 How do Repetition Penalties work?', prompt: 'Explain how repetition penalties discount the logits of previously generated tokens to prevent degeneration and repetitive chatter.' },
    { label: '🎯 Quiz me on LLM Generation & Sampling', prompt: 'Give me a challenging question about logits, temperature scaling, nucleus sampling, and autoregressive generation loops in PyTorch!' }
  ],
  'quest-11': [
    { label: '🛡️ Why does pre-training fail at dialogue?', prompt: 'Explain why a pre-trained base LLM fails to act as an assistant without Supervised Fine-Tuning (SFT).' },
    { label: '🎭 How does ChatML structure roles?', prompt: 'Walk through how ChatML special tokens (<|im_start|>user, etc.) and PyTorch loss masking prevent the model from learning to imitate user prompts.' },
    { label: '⚡ How does DPO eliminate the Reward Model?', prompt: 'Explain the mathematical breakthrough of Direct Preference Optimization (DPO): how Rafailov et al. expressed ground-truth rewards directly via policy log-likelihood ratios.' },
    { label: '⚖️ What is the role of the beta parameter in DPO?', prompt: 'Explain how the beta parameter acts as an implicit KL divergence anchor in DPO to prevent the policy from collapsing away from the reference model.' },
    { label: '🎯 Quiz me on LLM Alignment & DPO', prompt: 'Give me a challenging question about SFT, ChatML, RLHF, and DPO loss in PyTorch!' }
  ],
  'quest-12': [
    { label: '🎛️ Why does Full Fine-Tuning blow up VRAM?', prompt: 'Explain why full fine-tuning an 8B model requires >72GB VRAM due to Adam optimizer states and gradients, and how LoRA solves this.' },
    { label: '🧩 Why is LoRA Matrix B initialized to zero?', prompt: 'Explain the mathematical reason why LoRA adapter matrix B is initialized to strictly zero while matrix A is initialized with random Gaussian noise.' },
    { label: '⚡ How does Rank r and Alpha scaling work?', prompt: 'Walk through how the rank parameter r and scaling factor alpha / r modulate the learning capacity and gradient magnitude of LoRA adapters.' },
    { label: '🏎️ How does Weight Merging eliminate latency?', prompt: 'Explain how folding the low-rank delta directly into the base weights (W_merged = W0 + (alpha/r)*BA) enables zero inference latency in production.' },
    { label: '💾 How does QLoRA achieve 4-bit fine-tuning?', prompt: 'Explain the 3 pillars of QLoRA: 4-bit NormalFloat (NF4), Double Quantization (DQ), and Paged Optimizers.' },
    { label: '🎯 Quiz me on PEFT & LoRA', prompt: 'Give me a challenging question about LoRA low-rank factorization, rank selection, weight merging, and QLoRA quantization!' }
  ],
  'quest-13': [
    { label: '🧠 System 1 vs System 2 Thinking', prompt: 'Explain the difference between System 1 fast token generation and System 2 deliberate test-time compute in reasoning LLMs.' },
    { label: '💭 What happens inside <think> scratchpads?', prompt: 'Walk through how Chain-of-Thought scratchpads enable backtracking, hypothesis testing, and self-correction during inference.' },
    { label: '🎯 ORM vs PRM: Why score every step?', prompt: 'Explain why Process Reward Models (PRMs) outperform Outcome Reward Models (ORMs) for credit assignment in mathematical reasoning.' },
    { label: '🚀 How does DeepSeek-R1 GRPO eliminate the Critic?', prompt: 'Walk through the mathematical details of GRPO: how does group relative reward normalization replace the value network V(s) in VRAM?' },
    { label: '📈 Test-Time Compute Scaling Laws', prompt: 'Explain test-time compute scaling: why does spending more tokens or searching wider trees at inference time dramatically boost benchmark accuracy?' },
    { label: '🎯 Quiz me on Reasoning & Test-Time Compute', prompt: 'Give me a challenging question about DeepSeek-R1, GRPO loss, PRMs, or test-time compute scaling!' }
  ],
  'quest-14': [
    { label: '🔄 What is the ReAct loop cycle?', prompt: 'Explain the Thought -> Action -> Observation cycle in autonomous agentic loops and why it prevents premature hallucination.' },
    { label: '🛡️ How do Logit Masks enforce JSON schemas?', prompt: 'Explain how constrained decoding works under the hood: how context-free grammars (CFGs) mask invalid token logits to -inf to ensure 100% valid JSON.' },
    { label: '🔒 Agent Sandbox & Security Best Practices', prompt: 'What security boundaries are required when giving LLMs tools like bash execution, SQL queries, or file writes (human-in-the-loop, ephemeral containers, read-only)?' },
    { label: '🐝 Multi-Agent Swarm Orchestration', prompt: 'Explain the difference between Hierarchical Supervisor-Worker patterns and Peer-to-Peer agent communication topologies.' },
    { label: '🎯 Quiz me on Agentic Tool Use & ReAct', prompt: 'Give me a challenging question about function calling JSON schemas, ReAct loop convergence, or multi-agent delegation!' }
  ],
  'quest-15': [
    { label: '🧩 How does ViT turn pixels into tokens?', prompt: 'Explain the Vision Transformer (ViT) patchification process: how does dividing an image into 16x16 pixel patches enable standard Transformer self-attention?' },
    { label: '🎯 How does CLIP contrastive learning work?', prompt: 'Walk through CLIP dual encoders and symmetric InfoNCE loss: how does maximizing diagonal cosine similarities align visual semantics with natural language?' },
    { label: '🔌 Linear vs 2-Layer MLP Multimodal Projectors', prompt: 'Why did LLaVA-1.5 upgrade from a single linear matrix to a 2-layer GeLU MLP projector? Explain nonlinear manifold warping.' },
    { label: '📍 How do VLMs predict Bounding Boxes?', prompt: 'Explain spatial grounding in multimodal models: how are bounding box coordinates normalized to [0, 1000] and generated as text tokens without separate detection heads?' },
    { label: '🎯 Quiz me on Multimodal VLMs & Vision Transformers', prompt: 'Give me a challenging question about Vision Transformers, CLIP contrastive loss, multimodal projectors, or visual spatial grounding!' }
  ],
  'quest-16': [
    { label: '🔀 Why does Sparse MoE beat Dense Scaling?', prompt: 'Explain how Mixture-of-Experts decouples total parameter capacity from FLOP compute costs, and why Mixtral 8x7B runs at 13B speed while matching 70B models.' },
    { label: '⚖️ What is Router Collapse and how does Aux Loss fix it?', prompt: 'Walk through why routers naturally starve unselected experts in a positive feedback loop, and explain the mathematical formulation of auxiliary load balancing loss.' },
    { label: '📦 How does Token Dropping and Capacity Factor work?', prompt: 'Explain the role of Expert Capacity buffers in distributed multi-GPU clusters, and what happens when tokens exceed capacity.' },
    { label: '🏛️ Switch Transformer vs Mixtral vs DeepSeek-V3', prompt: 'Compare the architectural design choices between Top-1 routing (Switch), Top-2 of 8 (Mixtral), and Shared + Top-8 of 256 fine-grained routing (DeepSeek-V3).' },
    { label: '🎯 Quiz me on Mixture-of-Experts & Dynamic Routing', prompt: 'Give me a challenging question about MoE router gating, expert parallelism, capacity factors, or auxiliary load balancing!' }
  ],
  'quest-17': [
    { label: '🌊 How does Forward Noise Addition work in O(1)?', prompt: 'Explain the closed-form forward sampling equation q(x_t|x_0) in DDPM and why cumulative variance alpha_bar allows skipping to step t without sequential loops.' },
    { label: '🎯 How does Classifier-Free Guidance (CFG) work?', prompt: 'Walk through Classifier-Free Guidance mathematically: why do we train with null prompt dropout, and how does vector extrapolation in noise space push the image toward the prompt?' },
    { label: '⚡ Why does Rectified Flow Matching beat classic DDPM?', prompt: 'Compare the curved stochastic trajectories of Brownian diffusion against the straight linear velocity field of Rectified Flow Matching in Flux.1 and SD3.' },
    { label: '🏛️ What is Latent Diffusion (Stable Diffusion)?', prompt: 'Explain the difference between pixel-space diffusion and latent-space diffusion: how does a VAE compress spatial dimensions by 8x to slash VRAM and FLOP requirements?' },
    { label: '🎯 Quiz me on Diffusion Models & Flow Matching', prompt: 'Give me a challenging question about DDPM score matching, CFG guidance scales, noise schedules, or rectified flow trajectories!' }
  ],
  'quest-18': [
    { label: '🎙️ Why does 44.1 kHz raw audio break LLMs?', prompt: 'Explain why 44,100 scalar samples per second causes self-attention O(L^2) memory to explode, and how neural audio codecs compress continuous waveforms into 50 Hz discrete tokens.' },
    { label: '🌈 How does the Mel Filterbank mimic human hearing?', prompt: 'Walk through how Short-Time Fourier Transform (STFT) frames are filtered through triangular Mel filterbanks, and why human cochlear biology requires logarithmic frequency warping.' },
    { label: '🧱 How does Residual Vector Quantization (RVQ) work?', prompt: 'Explain the multi-stage codebook cascade in RVQ: how does quantizing residual errors r_k = r_{k-1} - q_k achieve high-fidelity audio with small codebooks?' },
    { label: '⏱️ What is the Delay Pattern in VALL-E & MusicGen?', prompt: 'Walk through how interleaving RVQ codebook streams with a 1-step delay allows a single causal autoregressive Transformer to generate all codebook layers simultaneously.' },
    { label: '🎯 Quiz me on Neural Audio Codecs & RVQ', prompt: 'Give me a challenging question about STFT hop sizes, Mel spectrogram bins, RVQ straight-through estimators, or acoustic language models!' }
  ],
  'quest-19': [
    { label: '🎬 Why does 2D diffusion fail for video?', prompt: 'Explain why applying 2D image diffusion frame-by-frame leads to catastrophic temporal flickering and motion drift, and why joint spatio-temporal modeling is mandatory.' },
    { label: '🧊 How do 3D Spacetime Tubelets compress video?', prompt: 'Walk through how 3D tubelets (e.g. 16x16x2) and 3D causal VAEs compress continuous 4D video volumes into flat 1D token sequences for Transformers.' },
    { label: '⚡ How does Decoupled 3D DiT Attention work?', prompt: 'Compare monolithic 3D attention vs decoupled spatial self-attention (within frame) and temporal self-attention (across time) in modern architectures like Sora and CogVideoX.' },
    { label: '🕹️ What is an Action-Conditioned World Model?', prompt: 'Explain how world models (Dreamer, GAIA-1, V-JEPA) predict future latent environment states s_{t+1} conditioned on physical agent action vectors a_t.' },
    { label: '🎯 Quiz me on World Models & Video DiT', prompt: 'Give me a challenging question about 3D DiT factorized attention, spacetime tubelets, action conditioning, or Fréchet Video Distance (FVD)!' }
  ],
  'quest-20': [
    { label: '🤖 What is Moravec\'s Paradox in robotics?', prompt: 'Explain Moravec\'s Paradox: why can LLMs pass bar exams and write code, while a robotic hand picking up a slippery cup remains one of the hardest challenges in AI?' },
    { label: '🦾 How do VLA models turn motion into tokens?', prompt: 'Walk through how Vision-Language-Action (VLA) models (RT-2, OpenVLA) discretize 6-DoF continuous coordinates into 256 vocabulary tokens to predict robot motor commands.' },
    { label: '📦 Why does Action Chunking (ACT) beat single-step?', prompt: 'Explain the compounding error problem (covariate shift) in single-step imitation learning, and how Action Chunking with Transformers (ACT) and temporal ensembling solve it.' },
    { label: '⚡ Why does MSE crash and Diffusion Policy succeed?', prompt: 'Contrast Mean Squared Error (MSE) regression against Diffusion Policy in multimodal demonstrations: why does averaging alternative paths cause fatal obstacle collisions?' },
    { label: '🎯 Quiz me on Embodied AI & Robotics', prompt: 'Give me a challenging question about VLA action binning, Action Chunking, Diffusion Policy score matching, or Sim-to-Real domain randomization!' }
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
  if (window.dojoManager) window.dojoManager.recordStat('tutorChats');

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
        soundFx.playSuccess();
        dom.settingsTestStatus.innerHTML = `<span style="color: #34d399;">✓ Saved journey exported to <strong>${res.fileName}</strong> (${res.completedCount} quests, ${res.badgeCount} medals, ${res.userXp} XP)!</span>`;
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
          if (window.dojoManager) window.dojoManager.checkBadges();
          soundFx.playCelestialChime(880);
          dom.settingsTestStatus.innerHTML = `<span style="color: #34d399;">✓ Successfully restored journey for <strong>${res.learnerName}</strong> (${res.completedCount}/${res.totalQuests} quests, ${res.badgeCount} medals, ${res.userXp} XP)!</span>`;
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        } else {
          soundFx.playBlip(320, 0.08);
          dom.settingsTestStatus.innerHTML = `<span style="color: #f87171;">❌ Restore failed: ${res.error}</span>`;
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  if (dom.btnResetProgress) {
    dom.btnResetProgress.addEventListener('click', () => {
      if (confirm('⚠️ Are you sure you want to reset all quest progress, belt ranks, medals, and XP? This action cannot be undone.')) {
        resetProgress(state);
        updateXpDisplay();
        renderQuestList();
        renderActiveQuest();
        updateDiplomaStatus();
        if (window.dojoManager) window.dojoManager.resetAll();
        soundFx.playBlip(380, 0.08);
        closeModal();
        alert('✓ Progress reset to White Belt beginning.');
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
      dom.sidebarDiplomaStatus.textContent = `★ All ${total} Conquered! Claim Master Diploma`;
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
      const total = state.curriculum.quests.length;
      const text = `🥋 I just conquered all ${total} Deep Learning Quests on NeuroQuest! Earned ${state.userXp} XP under Sensei Tensor. Credential ID: ${code} 🚀🧠`;
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

// --- Neural Net Architecture Designer ---

// --- DoodleVision AI Capstone Playroom ---

// --- Celestial Constellation Galaxy Map ---
function setupGalaxyModal() {
  if (!dom.galaxyModal || !dom.galaxyCanvas) return;

  const galaxyMap = new GalaxyConstellationMap({
    container: dom.galaxyModal,
    canvas: dom.galaxyCanvas,
    inspector: dom.galaxyInspectorDrawer,
    curriculum: state.curriculum.quests,
    getCompletedQuests: () => state.completedQuests,
    getActiveQuestId: () => state.activeQuestId,
    onSelectQuest: (questId) => {
      state.activeQuestId = questId;
      renderQuestList();
      renderActiveQuest();
      closeModal();
      if (dom.questHero) {
        dom.questHero.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      soundFx.playDojoGong();
    },
    onOpenDiploma: () => {
      closeModal();
      if (dom.btnOpenDiploma) dom.btnOpenDiploma.click();
    }
  });

  const updateGalaxyHud = () => {
    if (dom.galaxyStarsConquered) {
      dom.galaxyStarsConquered.textContent = `${state.completedQuests.size} / ${state.curriculum.quests.length} Conquered`;
    }
  };

  const openModal = () => {
    if (window.dojoManager) window.dojoManager.recordStat('galaxyOpens');
    updateGalaxyHud();
    dom.galaxyModal.style.display = 'flex';
    galaxyMap.init();
    requestAnimationFrame(() => {
      galaxyMap.resizeCanvas();
      galaxyMap.fitEntireGalaxy();
    });
    setTimeout(() => {
      galaxyMap.resizeCanvas();
      galaxyMap.fitEntireGalaxy();
    }, 320);
    soundFx.playCelestialChime(640);
  };

  const closeModal = () => {
    dom.galaxyModal.style.display = 'none';
    galaxyMap.stopAnimationLoop();
    soundFx.playBlip(380, 0.05);
  };

  if (dom.btnOpenGalaxy) {
    dom.btnOpenGalaxy.addEventListener('click', openModal);
  }

  if (dom.btnSidebarGalaxy) {
    dom.btnSidebarGalaxy.addEventListener('click', openModal);
  }

  if (dom.btnMenuGalaxy) {
    dom.btnMenuGalaxy.addEventListener('click', openModal);
  }

  if (dom.btnCloseGalaxy) {
    dom.btnCloseGalaxy.addEventListener('click', closeModal);
  }

  dom.galaxyModal.addEventListener('click', (e) => {
    if (e.target === dom.galaxyModal) {
      closeModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.galaxyModal.style.display === 'flex') {
      closeModal();
    }
    if ((e.key === 'f' || e.key === 'F') && dom.galaxyModal.style.display === 'flex') {
      galaxyMap.fitEntireGalaxy();
    }
  });

  // Zoom and Fit controls
  if (dom.btnGalaxyZoomIn) {
    dom.btnGalaxyZoomIn.addEventListener('click', () => galaxyMap.zoomIn());
  }

  if (dom.btnGalaxyZoomOut) {
    dom.btnGalaxyZoomOut.addEventListener('click', () => galaxyMap.zoomOut());
  }

  if (dom.btnGalaxyFit) {
    dom.btnGalaxyFit.addEventListener('click', () => galaxyMap.fitEntireGalaxy());
  }

  // Sector quick-jump chips
  const sectorChips = dom.galaxyModal.querySelectorAll('.sector-jump-chip');
  sectorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sectorChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const sectorId = chip.dataset.sector;
      galaxyMap.jumpToSector(sectorId);
    });
  });
}

function setupCapstoneModal() {
  if (!dom.capstoneModal || !dom.doodleCanvas) return;

  const studio = new DoodleCapstoneStudio({
    container: dom.capstoneModal,
    canvas: dom.doodleCanvas,
    previewCanvas: dom.doodlePreview28,
    getBackendUrl: () => state.backendUrl,
    isBackendOnline: () => state.backendOnline,
    onAwardXp: (amount) => awardXp(amount, 'DoodleVision Pictionary Victory'),
    onSendCodeToLab: (pyCode) => {
      if (dom.codeEditorArea) dom.codeEditorArea.value = pyCode;
      closeModal();
      const codeTabBtn = document.querySelector('.tab-btn[data-tab="code"]');
      if (codeTabBtn) codeTabBtn.click();
      soundFx.playSuccess();
    }
  });

  studio.init();

  const openModal = () => {
    if (window.dojoManager) window.dojoManager.recordStat('doodleDraws');
    dom.capstoneModal.style.display = 'flex';
    studio.init();
    soundFx.playBlip(540, 0.08);
  };

  const closeModal = () => {
    dom.capstoneModal.style.display = 'none';
    if (studio.challengeActive) studio.stopPictionaryChallenge(false);
    soundFx.playBlip(420, 0.06);
  };

  if (dom.btnOpenCapstone) {
    dom.btnOpenCapstone.addEventListener('click', openModal);
  }

  if (dom.sidebarCapstoneTrigger) {
    dom.sidebarCapstoneTrigger.addEventListener('click', openModal);
    dom.sidebarCapstoneTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });
  }

  if (dom.btnCloseCapstone) {
    dom.btnCloseCapstone.addEventListener('click', closeModal);
  }

  dom.capstoneModal.addEventListener('click', (e) => {
    if (e.target === dom.capstoneModal) {
      closeModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.capstoneModal.style.display === 'flex') {
      closeModal();
    }
  });

  // Tab switching
  const tabs = [
    { btn: dom.tabCapstoneSketch, content: dom.capstoneContentSketch },
    { btn: dom.tabCapstonePictionary, content: dom.capstoneContentPictionary },
    { btn: dom.tabCapstoneTraining, content: dom.capstoneContentTraining }
  ];

  tabs.forEach(t => {
    if (!t.btn) return;
    t.btn.addEventListener('click', () => {
      tabs.forEach(other => {
        if (other.btn) other.btn.classList.remove('active');
        if (other.content) other.content.style.display = 'none';
      });
      t.btn.classList.add('active');
      if (t.content) t.content.style.display = 'block';
      soundFx.playBlip(480, 0.05);

      if (t.btn === dom.tabCapstoneTraining) {
        studio.renderTrainingUI();
      }
    });
  });

  // Tool buttons
  if (dom.btnToolBrush) {
    dom.btnToolBrush.addEventListener('click', () => {
      studio.setTool('brush');
      dom.btnToolBrush.classList.add('active');
      if (dom.btnToolEraser) dom.btnToolEraser.classList.remove('active');
      soundFx.playBlip(500, 0.04);
    });
  }

  if (dom.btnToolEraser) {
    dom.btnToolEraser.addEventListener('click', () => {
      studio.setTool('eraser');
      dom.btnToolEraser.classList.add('active');
      if (dom.btnToolBrush) dom.btnToolBrush.classList.remove('active');
      soundFx.playBlip(360, 0.04);
    });
  }

  // Brush size buttons
  const sizeBtns = dom.capstoneModal.querySelectorAll('.size-btn');
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sz = parseInt(btn.dataset.size, 10) || 16;
      studio.setBrushSize(sz);
      soundFx.playBlip(440, 0.04);
    });
  });

  // Undo & Clear
  if (dom.btnDoodleUndo) {
    dom.btnDoodleUndo.addEventListener('click', () => studio.undo());
  }

  if (dom.btnDoodleClear) {
    dom.btnDoodleClear.addEventListener('click', () => {
      studio.clearCanvas(true);
      soundFx.playBlip(300, 0.06);
    });
  }

  // Presets
  const presetBtns = dom.capstoneModal.querySelectorAll('.btn-preset-chip');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      // Switch to sketch tab first if on other tab
      if (dom.tabCapstoneSketch && !dom.tabCapstoneSketch.classList.contains('active')) {
        dom.tabCapstoneSketch.click();
      }
      studio.loadPreset(preset);
    });
  });

  // Pictionary Challenge Start
  if (dom.btnStartPictionary) {
    dom.btnStartPictionary.addEventListener('click', () => {
      studio.startPictionaryChallenge();
      // Switch to sketch tab so player can draw immediately
      if (dom.tabCapstoneSketch) {
        dom.tabCapstoneSketch.click();
      }
    });
  }

  // Training Lab Controls
  if (dom.btnDoodleTrainStep) {
    dom.btnDoodleTrainStep.addEventListener('click', () => {
      studio.runTrainingEpochs(2);
    });
  }

  if (dom.btnDoodleResetModel) {
    dom.btnDoodleResetModel.addEventListener('click', () => {
      if (confirm('Reset DoodleCNN to untrained random Gaussian noise? Predictions will become erratic until trained.')) {
        studio.resetModel();
      }
    });
  }

  if (dom.btnDoodleSendCode) {
    dom.btnDoodleSendCode.addEventListener('click', () => {
      const pyCode = studio.generatePyTorchScript();
      if (dom.codeEditorArea) dom.codeEditorArea.value = pyCode;
      closeModal();
      const codeTabBtn = document.querySelector('.tab-btn[data-tab="code"]');
      if (codeTabBtn) codeTabBtn.click();
      soundFx.playSuccess();
    });
  }

  if (dom.btnDoodleExportWeights) {
    dom.btnDoodleExportWeights.addEventListener('click', () => {
      window.open(`${state.backendUrl}/api/export_weights`, '_blank');
      soundFx.playSuccess();
    });
  }

  if (dom.btnDoodleExportScript) {
    dom.btnDoodleExportScript.addEventListener('click', () => {
      window.open(`${state.backendUrl}/api/export_script`, '_blank');
      soundFx.playSuccess();
    });
  }
}

function setupArchitectModal() {
  if (!dom.architectModal || !dom.architectCanvas) return;

  const designer = new ArchitectDesigner({
    container: dom.architectModal,
    canvas: dom.architectCanvas,
    controlsContainer: dom.architectControlsContainer,
    codeOutput: dom.architectCodeOutput,
    paramsBadge: dom.architectParamsBadge,
    inspectorBox: dom.architectInspectorBox
  });

  designer.setupEventListeners(dom.architectCanvas, dom.architectControlsContainer);

  const openModal = () => {
    if (window.dojoManager) window.dojoManager.recordStat('architectCustomized');
    dom.architectModal.style.display = 'flex';
    designer.update();
    soundFx.playBlip(540, 0.08);
  };

  const closeModal = () => {
    dom.architectModal.style.display = 'none';
    soundFx.playBlip(420, 0.06);
  };

  if (dom.btnOpenArchitect) {
    dom.btnOpenArchitect.addEventListener('click', openModal);
  }

  if (dom.btnCloseArchitect) {
    dom.btnCloseArchitect.addEventListener('click', closeModal);
  }

  dom.architectModal.addEventListener('click', (e) => {
    if (e.target === dom.architectModal) {
      closeModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.architectModal.style.display === 'flex') {
      closeModal();
    }
  });

  if (dom.architectPresetSelect) {
    dom.architectPresetSelect.addEventListener('change', (e) => {
      designer.loadPreset(e.target.value);
    });
  }

  if (dom.btnAddLayer) {
    dom.btnAddLayer.addEventListener('click', () => {
      designer.addHiddenLayer();
    });
  }

  if (dom.btnPulseSignal) {
    dom.btnPulseSignal.addEventListener('click', () => {
      designer.triggerPulse();
    });
  }

  if (dom.btnExportArchitectCode) {
    dom.btnExportArchitectCode.addEventListener('click', () => {
      const pyCode = designer.generatePyTorchCode();
      if (dom.codeEditorArea) {
        dom.codeEditorArea.value = pyCode;
      }
      closeModal();
      const codeTabBtn = document.querySelector('.tab-btn[data-tab="code"]');
      if (codeTabBtn) codeTabBtn.click();
      soundFx.playSuccess();
    });
  }

  if (dom.btnCopyArchitectCode) {
    dom.btnCopyArchitectCode.addEventListener('click', async () => {
      const pyCode = designer.generatePyTorchCode();
      try {
        await navigator.clipboard.writeText(pyCode);
        const originalText = dom.btnCopyArchitectCode.textContent;
        dom.btnCopyArchitectCode.textContent = '✓ Copied!';
        soundFx.playBlip(880, 0.05);
        setTimeout(() => {
          dom.btnCopyArchitectCode.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    });
  }
}

// --- AI STUDIOS DROPDOWN MENU ---
function setupStudiosDropdown() {
  if (!dom.btnStudiosDropdown || !dom.studiosDropdownWrapper) return;

  const toggleDropdown = (e) => {
    e.stopPropagation();
    const isOpen = dom.studiosDropdownWrapper.classList.toggle('open');
    dom.btnStudiosDropdown.setAttribute('aria-expanded', isOpen);
    soundFx.playBlip(isOpen ? 640 : 480, 0.03);
  };

  const closeDropdown = () => {
    if (dom.studiosDropdownWrapper.classList.contains('open')) {
      dom.studiosDropdownWrapper.classList.remove('open');
      dom.btnStudiosDropdown.setAttribute('aria-expanded', 'false');
    }
  };

  dom.btnStudiosDropdown.addEventListener('click', toggleDropdown);

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!dom.studiosDropdownWrapper.contains(e.target)) {
      closeDropdown();
    }
  });

  // Close when an item inside is clicked
  const items = dom.studiosDropdownWrapper.querySelectorAll('.studio-menu-item');
  items.forEach(item => {
    item.addEventListener('click', closeDropdown);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });
}

// --- SENSEI'S DOJO TROPHY ROOM & BELT PROGRESSION ---
function setupDojoTrophyModal() {
  if (!dom.trophyModal) return null;

  const dojoManager = new DojoManager({
    getState: () => state,
    awardXp: (amount, reason) => awardXp(amount, reason),
    container: dom.trophyModal
  });
  window.dojoManager = dojoManager;

  const openModal = () => {
    dojoManager.openModal();
  };

  if (dom.btnMenuTrophy) {
    dom.btnMenuTrophy.addEventListener('click', openModal);
  }

  if (dom.userLevelBadge) {
    dom.userLevelBadge.addEventListener('click', openModal);
    dom.userLevelBadge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.trophyModal.style.display === 'flex') {
      dojoManager.closeModal();
    }
  });

  return dojoManager;
}

// --- 3D LOSS LANDSCAPE MOUNTAIN PLAYGROUND ---
function setupLandscapeModal() {
  if (!dom.landscapeModal || !dom.landscapeCanvasContainer) return null;

  const studio = new LossLandscape3D({
    container: dom.landscapeModal,
    canvasContainer: dom.landscapeCanvasContainer,
    onAwardXp: (amount, reason) => awardXp(amount, reason),
    onRecordStat: (key) => {
      if (window.dojoManager) window.dojoManager.recordStat(key);
    }
  });
  window.landscape3dStudio = studio;

  const openModal = () => {
    studio.openModal();
    if (window.dojoManager) window.dojoManager.recordStat('lossPlaygroundRuns');
  };

  if (dom.btnMenuLandscape) {
    dom.btnMenuLandscape.addEventListener('click', openModal);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.landscapeModal.style.display === 'flex') {
      studio.closeModal();
    }
  });

  return studio;
}

// --- COMMAND PALETTE & QUICK SWITCHER ---
function setupCommandPalette() {
  if (!dom.paletteModal || !dom.paletteSearchInput || !dom.paletteResultsContainer) return null;

  let selectedIndex = 0;
  let currentResults = [];

  const quickActions = [
    {
      id: 'action-trophy',
      type: 'action',
      title: "Sensei's Dojo Trophy Room & Belts",
      subtitle: '10-Tier Obi Belt Rank Ladder & 16 Achievement Medals',
      icon: '🥋',
      kbd: 'B',
      run: () => { if (window.dojoManager) window.dojoManager.openModal(); }
    },
    {
      id: 'action-landscape',
      type: 'action',
      title: '3D Loss Mountain Playground',
      subtitle: 'Non-Convex Surfaces & Optimizer Race (SGD, Momentum, Adam)',
      icon: '⛰️',
      kbd: 'L',
      run: () => { if (window.landscape3dStudio) window.landscape3dStudio.openModal(); }
    },
    {
      id: 'action-galaxy',
      type: 'action',
      title: 'Galaxy Constellation Map',
      subtitle: '20-Quest Neural Constellation Tech Tree & Lore',
      icon: '🌌',
      kbd: 'G',
      run: () => { if (dom.btnOpenGalaxy) dom.btnOpenGalaxy.click(); }
    },
    {
      id: 'action-architect',
      type: 'action',
      title: 'Neural Network Architect',
      subtitle: 'Visual MLP Designer & nn.Sequential Code Exporter',
      icon: '📐',
      kbd: 'M',
      run: () => { if (dom.btnOpenArchitect) dom.btnOpenArchitect.click(); }
    },
    {
      id: 'action-capstone',
      type: 'action',
      title: 'DoodleVision AI Playroom',
      subtitle: 'Live PyTorch CNN Drawing Canvas & AI Pictionary',
      icon: '🎨',
      kbd: 'D',
      run: () => { if (dom.btnOpenCapstone) dom.btnOpenCapstone.click(); }
    },
    {
      id: 'action-tutor',
      type: 'action',
      title: 'Ask AI Sensei Tensor',
      subtitle: 'Interactive Deep Learning Martial Arts Tutor',
      icon: '🥋',
      kbd: 'T',
      run: () => { if (dom.btnToggleTutor) dom.btnToggleTutor.click(); }
    },
    {
      id: 'action-diploma',
      type: 'action',
      title: 'View Sensei Master Diploma',
      subtitle: 'Official NeuroQuest Credential & Course Certificate',
      icon: '🎓',
      kbd: 'P',
      run: () => { if (dom.btnOpenDiploma) dom.btnOpenDiploma.click(); }
    },
    {
      id: 'action-sound',
      type: 'action',
      title: 'Toggle Sound Effects',
      subtitle: 'Mute or Unmute Audio Cues and Dojo Gongs',
      icon: '🔊',
      kbd: 'S',
      run: () => { if (dom.btnToggleSound) dom.btnToggleSound.click(); }
    },
    {
      id: 'action-settings',
      type: 'action',
      title: 'Settings & API Configuration',
      subtitle: 'Google Gemini API Keys, Custom Agents & Reset',
      icon: '⚙️',
      kbd: ',',
      run: () => { if (dom.btnOpenSettings) dom.btnOpenSettings.click(); }
    }
  ];

  const openPalette = () => {
    dom.paletteModal.style.display = 'flex';
    dom.paletteSearchInput.value = '';
    renderResults('');
    dom.paletteSearchInput.focus();
    soundFx.playCelestialChime(740);
  };

  const closePalette = () => {
    dom.paletteModal.style.display = 'none';
    soundFx.playBlip(380, 0.04);
  };

  const renderResults = (query) => {
    const q = query.trim().toLowerCase();
    dom.paletteResultsContainer.innerHTML = '';
    currentResults = [];

    // Filter actions
    const matchedActions = quickActions.filter(a => {
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q) || a.kbd.toLowerCase() === q;
    });

    // Filter quests
    const matchedQuests = state.curriculum.quests.filter(quest => {
      if (!q) return true;
      const text = `${quest.number} ${quest.title} ${quest.subtitle} ${quest.tag || ''} ${quest.phaseName || ''}`.toLowerCase();
      return text.includes(q);
    }).map(quest => ({
      id: quest.id,
      type: 'quest',
      title: `Quest ${quest.number}: ${quest.title}`,
      subtitle: `${quest.phaseName || 'Phase'} • +${quest.xp} XP • ${quest.tag || ''}`,
      icon: quest.icon || '📜',
      kbd: `#${quest.number}`,
      run: () => {
        state.activeQuestId = quest.id;
        renderQuestList();
        renderActiveQuest();
        if (dom.questHero) {
          dom.questHero.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        soundFx.playDojoGong();
      }
    }));

    if (matchedActions.length > 0) {
      const header = document.createElement('div');
      header.className = 'palette-section-title';
      header.textContent = 'Studios & Quick Actions';
      dom.paletteResultsContainer.appendChild(header);

      matchedActions.forEach(action => {
        currentResults.push(action);
        appendResultElement(action, currentResults.length - 1);
      });
    }

    if (matchedQuests.length > 0) {
      const header = document.createElement('div');
      header.className = 'palette-section-title';
      header.textContent = 'Cosmic Quests (1–20)';
      dom.paletteResultsContainer.appendChild(header);

      matchedQuests.forEach(quest => {
        currentResults.push(quest);
        appendResultElement(quest, currentResults.length - 1);
      });
    }

    if (currentResults.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '1.5rem';
      empty.style.textAlign = 'center';
      empty.style.color = 'var(--text-muted)';
      empty.textContent = `No quests or actions match "${query}".`;
      dom.paletteResultsContainer.appendChild(empty);
    }

    selectedIndex = 0;
    updateSelectedHighlight();
  };

  const appendResultElement = (item, index) => {
    const btn = document.createElement('button');
    btn.className = 'palette-result-item';
    btn.setAttribute('data-index', index);
    if (item.id) btn.setAttribute('data-id', item.id);
    btn.innerHTML = `
      <div class="palette-item-icon">${item.icon}</div>
      <div class="palette-item-details">
        <div class="palette-item-title-row">
          <span class="palette-item-title">${item.title}</span>
          <kbd class="palette-kbd">${item.kbd}</kbd>
        </div>
        <span class="palette-item-subtitle">${item.subtitle}</span>
      </div>
    `;

    btn.addEventListener('click', () => {
      closePalette();
      item.run();
    });

    btn.addEventListener('mouseenter', () => {
      selectedIndex = index;
      updateSelectedHighlight();
    });

    dom.paletteResultsContainer.appendChild(btn);
  };

  const updateSelectedHighlight = () => {
    const items = dom.paletteResultsContainer.querySelectorAll('.palette-result-item');
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  };

  // Input event
  dom.paletteSearchInput.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });

  // Keyboard navigation
  dom.paletteSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex + 1) % currentResults.length;
        updateSelectedHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
        updateSelectedHighlight();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentResults[selectedIndex]) {
        const item = currentResults[selectedIndex];
        closePalette();
        item.run();
      }
    } else if (e.key === 'Escape') {
      closePalette();
    }
  });

  if (dom.btnOpenPalette) {
    dom.btnOpenPalette.addEventListener('click', openPalette);
  }

  dom.paletteModal.addEventListener('click', (e) => {
    if (e.target === dom.paletteModal) {
      closePalette();
    }
  });

  return { openPalette, closePalette };
}

// --- GLOBAL KEYBOARD SHORTCUTS ---
function setupGlobalShortcuts(paletteControls) {
  window.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const isTyping = active && (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.isContentEditable ||
      (active.closest && (active.closest('#code-editor-area') || active.closest('.cm-editor')))
    );

    // Command Palette hotkey: Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (paletteControls) paletteControls.openPalette();
      return;
    }

    if (isTyping) return;

    // Single-key hotkeys (when not typing in an input)
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      if (paletteControls) paletteControls.openPalette();
    } else if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (dom.btnOpenGalaxy) dom.btnOpenGalaxy.click();
    } else if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (dom.btnOpenArchitect) dom.btnOpenArchitect.click();
    } else if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (dom.btnOpenCapstone) dom.btnOpenCapstone.click();
    } else if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (dom.btnToggleTutor) dom.btnToggleTutor.click();
    } else if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (dom.btnOpenDiploma) dom.btnOpenDiploma.click();
    } else if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (window.dojoManager) window.dojoManager.openModal();
    } else if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (window.landscape3dStudio) window.landscape3dStudio.openModal();
    } else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (dom.btnToggleSound) dom.btnToggleSound.click();
    } else if (e.key === ',' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (dom.btnOpenSettings) dom.btnOpenSettings.click();
    }
  });
}

// --- APP BOOTSTRAP ---
function initApp() {
  const dojoManager = setupDojoTrophyModal();
  updateXpDisplay();
  if (dojoManager) {
    dojoManager.checkBadges();
  }
  renderQuestList();
  renderActiveQuest();
  setupTabs();
  setupMobileSidebar();
  setupCodeLab();
  setupAiTutor();
  setupSettings();
  setupAudioControls();
  setupDiplomaModal();
  setupArchitectModal();
  setupCapstoneModal();
  setupGalaxyModal();
  setupLandscapeModal();
  setupStudiosDropdown();
  const paletteControls = setupCommandPalette();
  setupGlobalShortcuts(paletteControls);
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
