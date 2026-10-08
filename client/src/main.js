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
import { renderInteractiveWidget } from './widgets/index.js';
import { DojoManager } from './dojo_achievements.js';
import { MasteryChallengeManager } from './mastery_challenges.js';

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
window.state = state;

const tutorService = new AITutorService();

// --- DOM References ---
const dom = {
  // Navigation
  userLevelBadge: document.getElementById('user-level-badge'),
  userLevelText: document.getElementById('user-level-text'),
  navChallengesPill: document.getElementById('nav-challenges-pill'),
  navChallengesText: document.getElementById('nav-challenges-text'),
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

function updateNavChallenges() {
  if (!dom.navChallengesText || !window.masteryManager) return;
  const done = window.masteryManager.getCompletedCount();
  const total = window.masteryManager.getTotalCount();
  dom.navChallengesText.textContent = `${done}/${total} Goals`;
  if (done > 0) {
    dom.navChallengesText.style.color = '#34d399';
  } else {
    dom.navChallengesText.style.color = '#fbbf24';
  }
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
    card.dataset.questId = quest.id;
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
  renderInteractiveWidget(quest, {
    state,
    dom,
    awardXp: (amount, reason) => awardXp(amount, reason)
  });

  // Mount Guided Mastery Challenge HUD Card
  if (window.masteryManager && dom.interactiveContainer) {
    window.masteryManager.render(dom.interactiveContainer, quest.id);
    window.masteryManager.evaluate(quest.id);
  }

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

// --- Interactive Sandbox Renderers (Modularized) ---
// All 20 interactive widgets are extracted into ./widgets/ for clean modularity & speed.

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
          updateNavChallenges();
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
        updateNavChallenges();
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

  let galaxyMap = null;

  const getOrInitGalaxyMap = async () => {
    if (!galaxyMap) {
      const { GalaxyConstellationMap } = await import('./galaxy_map.js');
      galaxyMap = new GalaxyConstellationMap({
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
      window.galaxyConstellationMap = galaxyMap;
    }
    return galaxyMap;
  };

  const updateGalaxyHud = () => {
    if (dom.galaxyStarsConquered) {
      dom.galaxyStarsConquered.textContent = `${state.completedQuests.size} / ${state.curriculum.quests.length} Conquered`;
    }
  };

  const openModal = async () => {
    if (window.dojoManager) window.dojoManager.recordStat('galaxyOpens');
    updateGalaxyHud();
    dom.galaxyModal.style.display = 'flex';
    const map = await getOrInitGalaxyMap();
    map.init();
    requestAnimationFrame(() => {
      map.resizeCanvas();
      map.fitEntireGalaxy();
    });
    setTimeout(() => {
      map.resizeCanvas();
      map.fitEntireGalaxy();
    }, 320);
    soundFx.playCelestialChime(640);
  };

  const closeModal = () => {
    dom.galaxyModal.style.display = 'none';
    if (galaxyMap) galaxyMap.stopAnimationLoop();
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
      if (galaxyMap) galaxyMap.fitEntireGalaxy();
    }
  });

  // Zoom and Fit controls
  if (dom.btnGalaxyZoomIn) {
    dom.btnGalaxyZoomIn.addEventListener('click', () => { if (galaxyMap) galaxyMap.zoomIn(); });
  }

  if (dom.btnGalaxyZoomOut) {
    dom.btnGalaxyZoomOut.addEventListener('click', () => { if (galaxyMap) galaxyMap.zoomOut(); });
  }

  if (dom.btnGalaxyFit) {
    dom.btnGalaxyFit.addEventListener('click', () => { if (galaxyMap) galaxyMap.fitEntireGalaxy(); });
  }

  // Sector quick-jump chips
  const sectorChips = dom.galaxyModal.querySelectorAll('.sector-jump-chip');
  sectorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sectorChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const sectorId = chip.dataset.sector;
      if (galaxyMap) galaxyMap.jumpToSector(sectorId);
    });
  });
}

function setupCapstoneModal() {
  if (!dom.capstoneModal || !dom.doodleCanvas) return;

  let studio = null;

  const getOrInitStudio = async () => {
    if (!studio) {
      const { DoodleCapstoneStudio } = await import('./doodle_capstone.js');
      studio = new DoodleCapstoneStudio({
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
      window.doodleCapstoneStudio = studio;
      studio.init();
    }
    return studio;
  };

  const openModal = async () => {
    if (window.dojoManager) window.dojoManager.recordStat('doodleDraws');
    dom.capstoneModal.style.display = 'flex';
    const s = await getOrInitStudio();
    s.init();
    soundFx.playBlip(540, 0.08);
  };

  const closeModal = () => {
    dom.capstoneModal.style.display = 'none';
    if (studio && studio.challengeActive) studio.stopPictionaryChallenge(false);
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
    t.btn.addEventListener('click', async () => {
      tabs.forEach(other => {
        if (other.btn) other.btn.classList.remove('active');
        if (other.content) other.content.style.display = 'none';
      });
      t.btn.classList.add('active');
      if (t.content) t.content.style.display = 'block';
      soundFx.playBlip(480, 0.05);

      if (t.btn === dom.tabCapstoneTraining) {
        const s = await getOrInitStudio();
        s.renderTrainingUI();
      }
    });
  });

  // Tool buttons
  if (dom.btnToolBrush) {
    dom.btnToolBrush.addEventListener('click', async () => {
      const s = await getOrInitStudio();
      s.setTool('brush');
      dom.btnToolBrush.classList.add('active');
      if (dom.btnToolEraser) dom.btnToolEraser.classList.remove('active');
      soundFx.playBlip(500, 0.04);
    });
  }

  if (dom.btnToolEraser) {
    dom.btnToolEraser.addEventListener('click', async () => {
      const s = await getOrInitStudio();
      s.setTool('eraser');
      dom.btnToolEraser.classList.add('active');
      if (dom.btnToolBrush) dom.btnToolBrush.classList.remove('active');
      soundFx.playBlip(360, 0.04);
    });
  }

  // Brush size buttons
  const sizeBtns = dom.capstoneModal.querySelectorAll('.size-btn');
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sz = parseInt(btn.dataset.size, 10) || 16;
      const s = await getOrInitStudio();
      s.setBrushSize(sz);
      soundFx.playBlip(440, 0.04);
    });
  });

  // Undo & Clear
  if (dom.btnDoodleUndo) {
    dom.btnDoodleUndo.addEventListener('click', async () => {
      const s = await getOrInitStudio();
      s.undo();
    });
  }

  if (dom.btnDoodleClear) {
    dom.btnDoodleClear.addEventListener('click', async () => {
      const s = await getOrInitStudio();
      s.clearCanvas(true);
      soundFx.playBlip(300, 0.06);
    });
  }

  // Presets
  const presetBtns = dom.capstoneModal.querySelectorAll('.btn-preset-chip');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const preset = btn.dataset.preset;
      // Switch to sketch tab first if on other tab
      if (dom.tabCapstoneSketch && !dom.tabCapstoneSketch.classList.contains('active')) {
        dom.tabCapstoneSketch.click();
      }
      const s = await getOrInitStudio();
      s.loadPreset(preset);
    });
  });

  // Pictionary Challenge Start
  if (dom.btnStartPictionary) {
    dom.btnStartPictionary.addEventListener('click', async () => {
      const s = await getOrInitStudio();
      s.startPictionaryChallenge();
      // Switch to sketch tab so player can draw immediately
      if (dom.tabCapstoneSketch) {
        dom.tabCapstoneSketch.click();
      }
    });
  }

  // Training Lab Controls
  if (dom.btnDoodleTrainStep) {
    dom.btnDoodleTrainStep.addEventListener('click', async () => {
      const s = await getOrInitStudio();
      s.runTrainingEpochs(2);
    });
  }

  if (dom.btnDoodleResetModel) {
    dom.btnDoodleResetModel.addEventListener('click', async () => {
      if (confirm('Reset DoodleCNN to untrained random Gaussian noise? Predictions will become erratic until trained.')) {
        const s = await getOrInitStudio();
        s.resetModel();
      }
    });
  }

  if (dom.btnDoodleSendCode) {
    dom.btnDoodleSendCode.addEventListener('click', async () => {
      const s = await getOrInitStudio();
      const pyCode = s.generatePyTorchScript();
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

  let designer = null;

  const getOrInitDesigner = async () => {
    if (!designer) {
      const { ArchitectDesigner } = await import('./architect_designer.js');
      designer = new ArchitectDesigner({
        container: dom.architectModal,
        canvas: dom.architectCanvas,
        controlsContainer: dom.architectControlsContainer,
        codeOutput: dom.architectCodeOutput,
        paramsBadge: dom.architectParamsBadge,
        inspectorBox: dom.architectInspectorBox
      });
      designer.setupEventListeners(dom.architectCanvas, dom.architectControlsContainer);
      window.architectDesigner = designer;
    }
    return designer;
  };

  const openModal = async () => {
    if (window.dojoManager) window.dojoManager.recordStat('architectCustomized');
    dom.architectModal.style.display = 'flex';
    const d = await getOrInitDesigner();
    d.update();
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
    dom.architectPresetSelect.addEventListener('change', async (e) => {
      const d = await getOrInitDesigner();
      d.loadPreset(e.target.value);
    });
  }

  if (dom.btnAddLayer) {
    dom.btnAddLayer.addEventListener('click', async () => {
      const d = await getOrInitDesigner();
      d.addHiddenLayer();
    });
  }

  if (dom.btnPulseSignal) {
    dom.btnPulseSignal.addEventListener('click', async () => {
      const d = await getOrInitDesigner();
      d.triggerPulse();
    });
  }

  if (dom.btnExportArchitectCode) {
    dom.btnExportArchitectCode.addEventListener('click', async () => {
      const d = await getOrInitDesigner();
      const pyCode = d.generatePyTorchCode();
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
      const d = await getOrInitDesigner();
      const pyCode = d.generatePyTorchCode();
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

// --- GUIDED MASTERY CHALLENGE ENGINE ---
function setupMasteryChallenges() {
  const masteryManager = new MasteryChallengeManager({
    getState: () => state,
    awardXp: (amount, reason) => awardXp(amount, reason),
    soundFx,
    confetti,
    onChallengeComplete: (questId, challenge) => {
      updateNavChallenges();
      if (window.dojoManager) {
        window.dojoManager.recordStat('challengesCompleted');
        window.dojoManager.checkBadges();
      }
    },
    onBadgeCheck: () => {
      if (window.dojoManager) {
        window.dojoManager.checkBadges();
      }
    }
  });
  window.masteryManager = masteryManager;

  // Nav pill click: switches to Interactive Sandbox and smoothly scrolls to Challenge Card
  if (dom.navChallengesPill) {
    dom.navChallengesPill.addEventListener('click', () => {
      const sandboxTab = document.querySelector('.tab-btn[data-tab="interactive"]');
      if (sandboxTab) sandboxTab.click();
      const card = document.getElementById('mastery-challenge-card');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.classList.add('glow-pulse');
        setTimeout(() => card.classList.remove('glow-pulse'), 1500);
      } else if (window.dojoManager) {
        window.dojoManager.openModal();
      }
    });
  }

  // Interactive Container live delegation: re-evaluate challenges on input, change, or clicks
  if (dom.interactiveContainer) {
    dom.interactiveContainer.addEventListener('input', () => {
      if (window.masteryManager) {
        window.masteryManager.evaluate(state.activeQuestId);
      }
    });
    dom.interactiveContainer.addEventListener('change', () => {
      if (window.masteryManager) {
        window.masteryManager.evaluate(state.activeQuestId);
      }
    });
    dom.interactiveContainer.addEventListener('click', () => {
      setTimeout(() => {
        if (window.masteryManager) {
          window.masteryManager.evaluate(state.activeQuestId);
        }
      }, 50);
    });
  }

  updateNavChallenges();
  return masteryManager;
}

// --- 3D LOSS LANDSCAPE MOUNTAIN PLAYGROUND ---
function setupLandscapeModal() {
  if (!dom.landscapeModal || !dom.landscapeCanvasContainer) return null;

  let studio = null;

  const getOrInitStudio = async () => {
    if (!studio) {
      const { LossLandscape3D } = await import('./loss_landscape_3d.js');
      studio = new LossLandscape3D({
        container: dom.landscapeModal,
        canvasContainer: dom.landscapeCanvasContainer,
        onAwardXp: (amount, reason) => awardXp(amount, reason),
        onRecordStat: (key) => {
          if (window.dojoManager) window.dojoManager.recordStat(key);
        }
      });
      window.landscape3dStudio = studio;
    }
    return studio;
  };

  const openModal = async () => {
    const s = await getOrInitStudio();
    s.openModal();
    if (window.dojoManager) window.dojoManager.recordStat('lossPlaygroundRuns');
  };

  if (dom.btnMenuLandscape) {
    dom.btnMenuLandscape.addEventListener('click', openModal);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.landscapeModal.style.display === 'flex') {
      if (studio) studio.closeModal();
    }
  });

  return { getOrInitStudio, openModal };
}

// --- COMMAND PALETTE & QUICK SWITCHER ---
function setupCommandPalette() {
  if (!dom.paletteModal || !dom.paletteSearchInput || !dom.paletteResultsContainer) return null;

  let selectedIndex = 0;
  let currentResults = [];

  const quickActions = [
    {
      id: 'action-challenges',
      type: 'action',
      title: 'Current Quest Mastery Challenge',
      subtitle: 'Jump to active puzzle objective, hints & pass/fail tracker',
      icon: '🎯',
      kbd: 'C',
      run: () => {
        if (dom.navChallengesPill) dom.navChallengesPill.click();
      }
    },
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
      run: () => {
        if (dom.btnMenuLandscape) dom.btnMenuLandscape.click();
        else if (window.landscape3dStudio) window.landscape3dStudio.openModal();
      }
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
      if (dom.btnMenuLandscape) dom.btnMenuLandscape.click();
      else if (window.landscape3dStudio) window.landscape3dStudio.openModal();
    } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (dom.navChallengesPill) dom.navChallengesPill.click();
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
  const masteryManager = setupMasteryChallenges();
  updateXpDisplay();
  updateNavChallenges();
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
