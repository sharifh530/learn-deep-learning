/**
 * NeuroQuest: Guided Mastery Challenge Engine
 * Goal-oriented puzzles, interactive objectives, real-time mathematical condition checks,
 * live progress tracking, hint clues, and victory celebrations across all 20 quests.
 */

export const MASTERY_CHALLENGES = {
  'quest-1': {
    questId: 'quest-1',
    title: "The Barista's Golden Ratio",
    tag: 'Perceptron Boundary',
    brief: 'Tune the weights (sugar, milk, espresso) and bias so your artificial neuron satisfies 100% of café customers (5 / 5 correct predictions).',
    target: '5 / 5 Customers Satisfied (100% Accuracy)',
    hint: 'Espresso has the strongest positive affinity. If dark roast orders fail, try increasing espresso weight to >= 1.5 and balance the negative threshold bias around -0.5 to -1.0.',
    xpReward: 50,
    check: (state) => {
      const customers = [
        { sugar: 2, milk: 1, espresso: 2, target: 1 },
        { sugar: 0, milk: 0, espresso: 1, target: 0 },
        { sugar: 3, milk: 2, espresso: 1, target: 1 },
        { sugar: 1, milk: 3, espresso: 0, target: 0 },
        { sugar: 2, milk: 2, espresso: 3, target: 1 }
      ];
      const w = state.neuronWeights || { sugar: 0.8, milk: 0.4, espresso: 1.5, bias: -0.5 };
      let correct = 0;
      customers.forEach(c => {
        const z = c.sugar * w.sugar + c.milk * w.milk + c.espresso * w.espresso + w.bias;
        const pred = 1 / (1 + Math.exp(-z)) >= 0.5 ? 1 : 0;
        if (pred === c.target) correct++;
      });
      const ratio = correct / customers.length;
      return {
        passed: correct === customers.length,
        progressRatio: ratio,
        currentStatus: `${correct} / ${customers.length} Customers Satisfied (${Math.round(ratio * 100)}%)`
      };
    }
  },

  'quest-2': {
    questId: 'quest-2',
    title: 'Escaping the Dead ReLU Abyss',
    tag: 'Non-Linear Activations',
    brief: 'Set input x <= -1.0 to enter the negative zone, then switch to Leaky ReLU or GELU to revive gradient flow and prevent neuron extinction.',
    target: 'Input x <= -1.0 with Non-Zero Activation Output',
    hint: 'Under standard ReLU, any negative input outputs 0.0 with 0 gradient. Select Leaky ReLU (slope 0.01) or smooth GELU to keep the gradient pathway alive.',
    xpReward: 50,
    check: (state) => {
      const x = state.activationX ?? 1.5;
      const act = state.activeActivation || 'relu';
      const isNegative = x <= -1.0;
      const isAlive = (act === 'leaky_relu' || act === 'gelu' || act === 'tanh' || act === 'sigmoid');
      const passed = isNegative && (act === 'leaky_relu' || act === 'gelu');
      return {
        passed,
        progressRatio: passed ? 1 : (isNegative ? 0.5 : (isAlive ? 0.3 : 0.1)),
        currentStatus: passed
          ? 'Revived! Non-zero gradient flowing 🟢'
          : (isNegative ? `Negative input (x = ${x.toFixed(1)}), but ReLU is flat dead 💀` : `Set x <= -1.0 (Current: ${x.toFixed(1)})`)
      };
    }
  },

  'quest-3': {
    questId: 'quest-3',
    title: 'Convex Basin Convergence',
    tag: 'Gradient Descent',
    brief: 'Tune your learning rate and take gradient descent steps to reach the optimal loss basin (|w| <= 0.15) with Loss < 0.05 without exploding.',
    target: 'Converged Minimum (|w| <= 0.15 with >= 3 Steps)',
    hint: 'If the ball oscillates wildly or explodes, lower the learning rate to ~0.08. Click "Take Step" several times to roll steadily into the global trough.',
    xpReward: 50,
    check: (state) => {
      const w = state.gradientWeight ?? -3.5;
      const steps = state.gradientSteps || 0;
      const dist = Math.abs(w);
      const passed = dist <= 0.20 && steps >= 3;
      const ratio = Math.max(0, Math.min(1, 1 - (dist / 4.0)));
      return {
        passed,
        progressRatio: passed ? 1 : Math.min(0.9, ratio),
        currentStatus: passed
          ? `Global Minimum reached! (|w| = ${dist.toFixed(3)}, ${steps} steps)`
          : `Distance to Minimum: ${dist.toFixed(2)} (Target: <= 0.20, Steps: ${steps}/3)`
      };
    }
  },

  'quest-4': {
    questId: 'quest-4',
    title: 'The Confident Sketch',
    tag: 'DoodleVision CNN',
    brief: 'Draw on the QuickDraw canvas and produce a high-confidence neural prediction (Confidence >= 70%) on any recognized doodle class.',
    target: 'Prediction Confidence >= 70%',
    hint: 'Draw recognizable shapes with thick, clear strokes (e.g., an apple, lightning bolt, or circle). The 28x28 grayscale CNN looks for strong edge contrasts.',
    xpReward: 50,
    check: (state) => {
      const preds = state.doodlePredictions || [];
      const top = preds[0] ? preds[0].confidence : 0;
      const passed = top >= 0.70;
      return {
        passed,
        progressRatio: Math.min(1, top / 0.70),
        currentStatus: passed
          ? `High Confidence Match: ${Math.round(top * 100)}% (${preds[0]?.name || 'Target'}) 🎯`
          : `Top Confidence: ${Math.round(top * 100)}% (Target: >= 70%)`
      };
    }
  },

  'quest-5': {
    questId: 'quest-5',
    title: 'Edge Boundary Extraction',
    tag: 'Spatial Convolutions',
    brief: 'Configure Sobel-Horizontal or Sobel-Vertical edge detection filter with ReLU activation to isolate sharp directional image gradients.',
    target: 'Sobel Filter Active with ReLU Non-Linearity',
    hint: 'Sobel kernels compute discrete image gradients (-1, 0, 1). Pair with ReLU to discard negative edges and retain clean boundary activations.',
    xpReward: 50,
    check: (state) => {
      const preset = state.kernelActivePreset || '';
      const act = state.kernelActivation || 'none';
      const isSobel = (preset === 'sobel_h' || preset === 'sobel_v');
      const isRelu = act === 'relu';
      const passed = isSobel && isRelu;
      return {
        passed,
        progressRatio: passed ? 1 : (isSobel ? 0.6 : (isRelu ? 0.4 : 0.2)),
        currentStatus: passed
          ? `Boundary Isolated: ${preset.toUpperCase()} + ReLU Active ⚡`
          : `Current: ${preset || 'Custom'} (${act} activation)`
      };
    }
  },

  'quest-6': {
    questId: 'quest-6',
    title: 'Tame the 8th-Degree Polynomial',
    tag: 'L2 Regularization',
    brief: 'Set polynomial complexity to Degree >= 6 (where unregularized curves wildly oscillate), then apply L2 Ridge penalty (lambda >= 0.03) to stabilize validation error.',
    target: 'Complexity >= 6 with L2 Lambda >= 0.03',
    hint: 'Without regularization, higher degrees fit pure noise (overfitting). Adding weight decay penalizes extreme coefficients and smooths out wild oscillations.',
    xpReward: 50,
    check: (state) => {
      const comp = state.regComplexity || 8;
      const l2 = state.regL2Lambda ?? 0;
      const isHighDegree = comp >= 6;
      const hasL2 = l2 >= 0.03;
      const passed = isHighDegree && hasL2;
      return {
        passed,
        progressRatio: passed ? 1 : (isHighDegree ? 0.5 : 0.2),
        currentStatus: passed
          ? `Overfitting Tamed: Degree ${comp} with λ = ${l2.toFixed(3)} 🛡️`
          : `Degree ${comp} (Target: >= 6), L2 λ = ${l2.toFixed(3)} (Target: >= 0.03)`
      };
    }
  },

  'quest-7': {
    questId: 'quest-7',
    title: 'Coreference Attention Lock',
    tag: 'Scaled Dot-Product',
    brief: 'In benchmark sentence #1 ("The animal didn\'t cross the street because it was too tired"), select query token "it" (#7) to inspect self-attention links.',
    target: 'Query Token Focused on "it" (Token #7)',
    hint: 'Coreference resolution allows language models to resolve ambiguous pronouns. Click token #7 ("it") on the token ribbon to see it attend to "animal".',
    xpReward: 50,
    check: (state) => {
      const qIdx = state.attentionActiveQueryIdx ?? 0;
      const passed = qIdx === 7;
      return {
        passed,
        progressRatio: passed ? 1 : 0.4,
        currentStatus: passed
          ? 'Coreference Active: Query locked on "it" (#7) ➔ "animal" 👑'
          : `Active Query: Token #${qIdx} (Click "it" #7 to solve)`
      };
    }
  },

  'quest-8': {
    questId: 'quest-8',
    title: 'Rotary Embedding Horizon (RoPE)',
    tag: 'Positional Embeddings',
    brief: 'Switch to the RoPE tab and increase the token sequence position to m >= 3 to observe complex 2D vector rotation across frequency sub-spaces.',
    target: 'RoPE Mode Active with Token Position m >= 3',
    hint: 'RoPE encodes relative token distance directly into query-key dot products via complex 2D Givens rotation matrices $R_{\\Theta, m}^d$.',
    xpReward: 50,
    check: (state) => {
      const tab = state.bpeActiveTab || 'tokenizer';
      const pos = state.bpeRopePos ?? 2;
      const isRope = tab === 'rope';
      const hasPos = pos >= 3;
      const passed = isRope && hasPos;
      return {
        passed,
        progressRatio: passed ? 1 : (isRope ? 0.6 : 0.2),
        currentStatus: passed
          ? `RoPE Angle Rotated: Position m = ${pos} 🌀`
          : (isRope ? `RoPE tab active, increase position m >= 3 (Current: ${pos})` : 'Switch to RoPE tab')
      };
    }
  },

  'quest-9': {
    questId: 'quest-9',
    title: 'Autoregressive Causal Shield',
    tag: 'Transformer Architecture',
    brief: 'Navigate to the Attention Mask tab and confirm the Upper-Triangular -inf mask is enabled to prevent future token information leakage.',
    target: 'Causal Mask Tab with Masking Active',
    hint: 'Decoder-only models like GPT must never attend to future tokens. Masking future keys with -inf forces their softmax probabilities strictly to 0.',
    xpReward: 50,
    check: (state) => {
      const tab = state.gptActiveTab || 'flow';
      const maskActive = state.gptCausalMaskActive !== false;
      const isMaskTab = tab === 'mask';
      const passed = isMaskTab && maskActive;
      return {
        passed,
        progressRatio: passed ? 1 : (isMaskTab ? 0.6 : 0.3),
        currentStatus: passed
          ? 'Causal Invariance Verified: Upper triangle strictly masked 🛡️'
          : (isMaskTab ? 'Enable Causal Mask checkbox' : 'Switch to Attention Mask tab')
      };
    }
  },

  'quest-10': {
    questId: 'quest-10',
    title: 'Coherent Sampling Governance',
    tag: 'Sampling Dynamics',
    brief: 'Tame sampling entropy: tune Temperature <= 0.70, Top-P <= 0.90, and Repetition Penalty >= 1.15 to generate focused, coherent text.',
    target: 'Temp <= 0.70, Top-P <= 0.90, Rep Penalty >= 1.15',
    hint: 'High temperature causes hallucinations; low repetition penalty causes infinite loops. Balanced nucleus sampling keeps generation crisp and logical.',
    xpReward: 50,
    check: (state) => {
      const t = state.genTemperature ?? 0.7;
      const p = state.genTopP ?? 0.90;
      const rep = state.genRepetitionPenalty ?? 1.15;
      const tOk = t <= 0.72;
      const pOk = p <= 0.92;
      const repOk = rep >= 1.14;
      const passed = tOk && pOk && repOk;
      const ratio = ((tOk ? 1 : 0) + (pOk ? 1 : 0) + (repOk ? 1 : 0)) / 3;
      return {
        passed,
        progressRatio: ratio,
        currentStatus: passed
          ? `Balanced Governance: T=${t.toFixed(2)}, P=${p.toFixed(2)}, Rep=${rep.toFixed(2)} 🎯`
          : `T: ${t.toFixed(2)} (<=0.70), P: ${p.toFixed(2)} (<=0.90), Rep: ${rep.toFixed(2)} (>=1.15)`
      };
    }
  },

  'quest-11': {
    questId: 'quest-11',
    title: 'Direct Preference Optimization',
    tag: 'Post-Training Alignment',
    brief: 'Cast preference votes in at least 2 DPO scenarios and execute >= 3 gradient alignment steps to steer probabilities toward chosen responses.',
    target: '>= 2 Scenario Votes & >= 3 DPO Training Steps',
    hint: 'DPO aligns language models without training an unstable reward model by directly reparameterizing the Bradley-Terry loss objective.',
    xpReward: 50,
    check: (state) => {
      const votes = Object.keys(state.dpoUserVotes || {}).length;
      const steps = state.dpoTrainedSteps || 0;
      const votesOk = votes >= 2;
      const stepsOk = steps >= 3;
      const passed = votesOk && stepsOk;
      const ratio = (Math.min(2, votes) / 2 * 0.5) + (Math.min(3, steps) / 3 * 0.5);
      return {
        passed,
        progressRatio: ratio,
        currentStatus: passed
          ? `Aligned! ${votes} votes cast, ${steps} DPO steps trained 🥋`
          : `Votes: ${votes}/2, Trained Steps: ${steps}/3`
      };
    }
  },

  'quest-12': {
    questId: 'quest-12',
    title: 'Rank-8 LoRA Adaptation',
    tag: 'Parameter-Efficient Fine-Tuning',
    brief: 'Configure Rank r = 8, Alpha alpha = 16, select the Medical adapter, and train >= 2 adaptation steps to fit specialized downstream weights.',
    target: 'Rank r=8, Alpha=16, Adapter=Medical, Steps >= 2',
    hint: 'LoRA freezes the W0 base model weights and trains low-rank decomposition matrices $B \\times A$ ($d \\times r$ and $r \\times k$), slashing VRAM by over 80%.',
    xpReward: 50,
    check: (state) => {
      const r = state.loraRank ?? 8;
      const a = state.loraAlpha ?? 16;
      const adapt = state.loraActiveAdapter || 'medical';
      const steps = state.loraTrainedSteps || 0;
      const passed = r === 8 && a === 16 && adapt === 'medical' && steps >= 2;
      return {
        passed,
        progressRatio: passed ? 1 : (steps > 0 ? 0.7 : 0.4),
        currentStatus: passed
          ? `LoRA Adapted: r=8, α=16 on Medical domain (${steps} steps) 🎛️`
          : `r=${r} (8), α=${a} (16), Adapter=${adapt} (medical), Steps: ${steps}/2`
      };
    }
  },

  'quest-13': {
    questId: 'quest-13',
    title: 'Process Reward Verification',
    tag: 'Reasoning Models',
    brief: 'Inspect reasoning step verification: switch to PRM Tree Search tab or advance reasoning rollout to step >= 2 to inspect test-time compute scaling.',
    target: 'PRM Tree Search Active or Rollout Step >= 2',
    hint: 'Unlike Outcome Reward Models (ORM) that score only the final answer, Process Reward Models (PRM) score every intermediate reasoning step.',
    xpReward: 50,
    check: (state) => {
      const tab = state.reasoningActiveTab || 'scratchpad';
      const step = state.reasoningActiveStep || 0;
      const isPrm = tab === 'prm_tree';
      const passed = isPrm || step >= 2;
      return {
        passed,
        progressRatio: passed ? 1 : 0.5,
        currentStatus: passed
          ? `PRM Verified: Intermediate reasoning chain validated (Step ${step}) 🧠`
          : `Current: ${tab} (Step ${step}). Switch to PRM Tree or advance steps`
      };
    }
  },

  'quest-14': {
    questId: 'quest-14',
    title: 'Autonomous ReAct Execution',
    tag: 'Agentic Tool Use',
    brief: 'Advance the agentic ReAct loop through Thought and Action to Step >= 3 to parse real-world environmental tool observations.',
    target: 'ReAct Agent Progress >= Step 3 (Observation)',
    hint: 'ReAct (Reason + Act) interleaves reasoning traces with external tool actions, allowing LLMs to look up live data, calculate math, and run SQL queries.',
    xpReward: 50,
    check: (state) => {
      const step = state.agentActiveStep || 1;
      const passed = step >= 3;
      return {
        passed,
        progressRatio: Math.min(1, step / 3),
        currentStatus: passed
          ? `ReAct Loop Executed: Action dispatched and Observation parsed (Step ${step}) 🤖`
          : `ReAct Loop at Step ${step} / 3 (Click "Next ReAct Step")`
      };
    }
  },

  'quest-15': {
    questId: 'quest-15',
    title: 'Vision-Language MLP Projector',
    tag: 'Multimodal VLMs',
    brief: 'Switch to Projector Arena and select the 2-Layer MLP (LLaVA) projection architecture to project ViT patch tokens into the LLM embedding dimension.',
    target: 'Projector Arena Active with 2-Layer MLP (LLaVA)',
    hint: 'Visual patch tokens must be projected from ViT latent space ($D_v = 1024$) into LLM word embedding space ($D_{llm} = 4096$) using a non-linear projector.',
    xpReward: 50,
    check: (state) => {
      const tab = state.vlmActiveTab || 'patch_inspector';
      const proj = state.vlmProjectorMode || 'mlp_llava';
      const isProjTab = tab === 'projector_arena';
      const isMlp = proj === 'mlp_llava';
      const passed = isProjTab && isMlp;
      return {
        passed,
        progressRatio: passed ? 1 : (isProjTab ? 0.6 : (isMlp ? 0.4 : 0.2)),
        currentStatus: passed
          ? 'Multimodal Bridge Active: 2-Layer MLP (LLaVA) Projected 👁️'
          : (isProjTab ? 'Select "2-Layer MLP (LLaVA)" mode' : 'Switch to Projector Arena tab')
      };
    }
  },

  'quest-16': {
    questId: 'quest-16',
    title: 'Load-Balanced Sparse Gating',
    tag: 'Mixture-of-Experts',
    brief: 'Select Top-2 Mixtral routing mode with Auxiliary Load-Balancing Loss weight >= 0.01 to ensure all 8 experts participate without routing collapse.',
    target: 'Top-2 Mixtral Mode with Aux Loss >= 0.01',
    hint: 'Without auxiliary load-balancing loss, gating networks suffer routing collapse where 1 or 2 dominant experts receive 100% of tokens while others starve.',
    xpReward: 50,
    check: (state) => {
      const mode = state.moeRoutingMode || 'top2_mixtral';
      const aux = state.moeAuxLossWeight ?? 0.01;
      const isTop2 = mode === 'top2_mixtral';
      const hasAux = aux >= 0.01;
      const passed = isTop2 && hasAux;
      return {
        passed,
        progressRatio: passed ? 1 : (isTop2 ? 0.6 : 0.3),
        currentStatus: passed
          ? `Balanced Routing: Top-2 Mixtral active with Aux Loss = ${aux} ⚖️`
          : `Mode: ${mode} (Top-2 Mixtral), Aux Loss: ${aux} (>= 0.01)`
      };
    }
  },

  'quest-17': {
    questId: 'quest-17',
    title: 'Rectified Flow Alignment',
    tag: 'Diffusion & Flow Matching',
    brief: 'Select Rectified Flow Matching sampler with Timestep <= 300 and CFG Scale >= 7.0 to produce a sharp, aligned trajectory toward target image distribution.',
    target: 'Flow Matching Sampler, Timestep <= 300, CFG >= 7.0',
    hint: 'Classifier-Free Guidance (CFG) extrapolates conditional predictions away from unconditional drift: $\\tilde{\\epsilon} = \\epsilon_{uncond} + w(\\epsilon_{cond} - \\epsilon_{uncond})$.',
    xpReward: 50,
    check: (state) => {
      const sampler = state.diffSampler || 'flow_matching';
      const t = state.diffTimestep ?? 500;
      const cfg = state.diffCfgScale ?? 7.5;
      const sOk = sampler === 'flow_matching';
      const tOk = t <= 350;
      const cfgOk = cfg >= 6.8;
      const passed = sOk && tOk && cfgOk;
      const ratio = ((sOk ? 1 : 0) + (tOk ? 1 : 0) + (cfgOk ? 1 : 0)) / 3;
      return {
        passed,
        progressRatio: ratio,
        currentStatus: passed
          ? `Straight Trajectory: Flow Matching at t=${t}, CFG=${cfg.toFixed(1)} 🌊`
          : `Sampler: ${sampler} (flow_matching), Timestep: ${t} (<=300), CFG: ${cfg.toFixed(1)} (>=7.0)`
      };
    }
  },

  'quest-18': {
    questId: 'quest-18',
    title: 'Neural Audio Codec Compression',
    tag: 'Audio AI & RVQ',
    brief: 'In the RVQ Ladder, select 4 or 8 codebook stages with 80 Mel filterbank bins to achieve high-fidelity speech reconstruction.',
    target: '>= 4 RVQ Stages with 80 Mel Bins',
    hint: 'Residual Vector Quantization uses a cascade of codebooks where each stage quantizes the residual error of the previous stage, shrinking error exponentially.',
    xpReward: 50,
    check: (state) => {
      const stages = state.audioRvqStages || 4;
      const bins = state.audioMelBins || 80;
      const stagesOk = stages >= 4;
      const binsOk = bins === 80;
      const passed = stagesOk && binsOk;
      return {
        passed,
        progressRatio: passed ? 1 : (stagesOk ? 0.6 : 0.3),
        currentStatus: passed
          ? `High-Fidelity Codec: ${stages} Codebook Stages @ ${bins} Mel Bins 🎙️`
          : `RVQ Stages: ${stages}/4, Mel Bins: ${bins}/80`
      };
    }
  },

  'quest-19': {
    questId: 'quest-19',
    title: 'Spacetime DiT Tubelet Compression',
    tag: 'World Models & Video Generation',
    brief: 'Configure standard 16x16x2 Spacetime Tubelet video tokenization (Sora standard) with 512x latent spacetime compression.',
    target: 'Spacetime Tubelet Config: 16x16x2 (512x Compression)',
    hint: 'Video Diffusion Transformers (DiT) pack spatio-temporal video volumes into 3D tubelets (height x width x time), treating video patches just like language tokens.',
    xpReward: 50,
    check: (state) => {
      const tubeIdx = state.worldTubeletSizeIdx ?? 1;
      const passed = tubeIdx === 1;
      return {
        passed,
        progressRatio: passed ? 1 : 0.5,
        currentStatus: passed
          ? 'Spacetime Patchified: 16×16×2 Tubelets Active (512× Comp) 🌌'
          : `Tubelet Config #${tubeIdx + 1} (Select 16×16×2)`
      };
    }
  },

  'quest-20': {
    questId: 'quest-20',
    title: 'Diffusion Policy Action Chunking',
    tag: 'Embodied Robotics',
    brief: 'Configure Diffusion Policy trajectory generation with Action Chunk Size k = 50 to generate multimodal robot motor trajectories without compounding error.',
    target: 'Diffusion Policy Mode with Chunk Size k = 50',
    hint: 'Action chunking predicts a horizon of future motor actions simultaneously, mitigating compounding drift and handling multimodal human demonstrations.',
    xpReward: 50,
    check: (state) => {
      const mode = state.robotPathMode || 'diffusion_policy';
      const chunkIdx = state.robotChunkSizeIdx ?? 1;
      const isDiff = mode === 'diffusion_policy';
      const isChunk50 = chunkIdx === 1;
      const passed = isDiff && isChunk50;
      return {
        passed,
        progressRatio: passed ? 1 : (isDiff ? 0.6 : 0.3),
        currentStatus: passed
          ? 'Multimodal Robot Action: Diffusion Policy with Horizon k=50 🦾'
          : `Mode: ${mode} (diffusion_policy), Chunk Size Index: ${chunkIdx} (k=50)`
      };
    }
  }
};

export class MasteryChallengeManager {
  constructor({ getState, awardXp, soundFx, confetti, onChallengeComplete, onBadgeCheck }) {
    this.getState = getState;
    this.awardXp = awardXp;
    this.soundFx = soundFx;
    this.confetti = confetti;
    this.onChallengeComplete = onChallengeComplete;
    this.onBadgeCheck = onBadgeCheck;
    this.completedChallenges = new Set(JSON.parse(localStorage.getItem('nq_completed_challenges') || '[]'));
    this.challengeModeActive = JSON.parse(localStorage.getItem('nq_challenge_mode_active') ?? 'true');
    this.currentQuestId = null;
    this.containerEl = null;
  }

  isCompleted(questId) {
    return this.completedChallenges.has(questId);
  }

  getCompletedCount() {
    return this.completedChallenges.size;
  }

  getTotalCount() {
    return Object.keys(MASTERY_CHALLENGES).length;
  }

  reloadFromStorage() {
    this.completedChallenges = new Set(JSON.parse(localStorage.getItem('nq_completed_challenges') || '[]'));
    if (this.currentQuestId && this.containerEl) {
      this.render(this.containerEl, this.currentQuestId);
    }
  }

  resetAll() {
    this.completedChallenges = new Set();
    if (this.currentQuestId && this.containerEl) {
      this.render(this.containerEl, this.currentQuestId);
    }
  }

  toggleMode() {
    this.challengeModeActive = !this.challengeModeActive;
    localStorage.setItem('nq_challenge_mode_active', JSON.stringify(this.challengeModeActive));
    if (this.currentQuestId) {
      this.render(this.containerEl, this.currentQuestId);
    }
  }

  render(targetContainer, questId) {
    this.containerEl = targetContainer;
    this.currentQuestId = questId;

    if (!targetContainer) return;

    // Check if card container already exists or create
    let hud = targetContainer.querySelector('#mastery-challenge-card');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'mastery-challenge-card';
      targetContainer.prepend(hud);
    }

    const challenge = MASTERY_CHALLENGES[questId];
    if (!challenge) {
      hud.style.display = 'none';
      return;
    }
    hud.style.display = 'block';

    const isDone = this.isCompleted(questId);
    const state = this.getState();
    const evalResult = challenge.check(state);

    hud.className = `mastery-challenge-card ${isDone ? 'completed' : ''} ${this.challengeModeActive ? 'active-mode' : 'free-mode'}`;

    hud.innerHTML = `
      <div class="mcc-header">
        <div class="mcc-title-col">
          <div class="mcc-badge-row">
            <span class="mcc-pillar-tag">🎯 MASTERY OBJECTIVE</span>
            <span class="mcc-quest-tag">${challenge.tag}</span>
            <span class="mcc-xp-pill">⭐ +${challenge.xpReward} XP</span>
          </div>
          <h3 class="mcc-title">${challenge.title}</h3>
        </div>
        <div class="mcc-controls-col">
          <button id="btn-toggle-challenge-mode" class="mcc-toggle-btn ${this.challengeModeActive ? 'active' : ''}" title="Toggle between Free Sandbox and Guided Challenge Objective">
            ${this.challengeModeActive ? '🎯 Challenge Mode' : '🎮 Free Play'}
          </button>
        </div>
      </div>

      <div class="mcc-body" style="display: ${this.challengeModeActive ? 'block' : 'none'};">
        <p class="mcc-brief">${challenge.brief}</p>

        <div class="mcc-criteria-banner">
          <div class="mcc-target-row">
            <span class="mcc-target-label">Target Goal:</span>
            <strong class="mcc-target-val">${challenge.target}</strong>
          </div>
          <div class="mcc-status-row">
            <span class="mcc-status-pill ${evalResult.passed || isDone ? 'passed' : 'pending'}">
              ${isDone ? '✓ MASTERED' : (evalResult.passed ? '★ GOAL ACHIEVED' : '⏳ IN PROGRESS')}
            </span>
            <span class="mcc-status-text" id="mcc-live-status-text">${evalResult.currentStatus}</span>
          </div>
          <div class="mcc-progress-bar-wrap">
            <div class="mcc-progress-bar-fill" id="mcc-live-progress-fill" style="width: ${Math.round((isDone ? 1 : evalResult.progressRatio) * 100)}%;"></div>
          </div>
        </div>

        <div class="mcc-actions-row">
          <button id="btn-challenge-hint" class="mcc-hint-btn">
            💡 Sensei's Clue
          </button>
          ${isDone ? `
            <span class="mcc-victory-badge">🏆 Challenge Solved! (+${challenge.xpReward} XP Earned)</span>
          ` : `
            <span class="mcc-active-hint">Interact with the sandbox below to achieve the target condition.</span>
          `}
        </div>

        <div id="mcc-hint-drawer" class="mcc-hint-drawer" style="display: none;">
          <div class="mcc-hint-bubble">
            <div class="mcc-hint-author">🥋 Sensei Tensor Advice:</div>
            <p class="mcc-hint-text">${challenge.hint}</p>
          </div>
        </div>
      </div>
    `;

    // Hook up internal buttons
    const btnToggle = hud.querySelector('#btn-toggle-challenge-mode');
    if (btnToggle) {
      btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMode();
      });
    }

    const btnHint = hud.querySelector('#btn-challenge-hint');
    const hintDrawer = hud.querySelector('#mcc-hint-drawer');
    if (btnHint && hintDrawer) {
      btnHint.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = hintDrawer.style.display === 'none';
        hintDrawer.style.display = isHidden ? 'block' : 'none';
        btnHint.classList.toggle('active', isHidden);
        if (this.soundFx) this.soundFx.playBlip(isHidden ? 600 : 400, 0.04);
      });
    }
  }

  evaluate(questId) {
    if (!questId) questId = this.currentQuestId;
    if (!questId) return;

    const challenge = MASTERY_CHALLENGES[questId];
    if (!challenge) return;

    const state = this.getState();
    const evalResult = challenge.check(state);

    // Update live text & progress bar without full re-render
    const statusTextEl = document.getElementById('mcc-live-status-text');
    const progressFillEl = document.getElementById('mcc-live-progress-fill');
    if (statusTextEl) statusTextEl.textContent = evalResult.currentStatus;
    if (progressFillEl) progressFillEl.style.width = `${Math.round((this.isCompleted(questId) ? 1 : evalResult.progressRatio) * 100)}%`;

    // If passed and not previously completed, trigger victory celebration!
    if (evalResult.passed && !this.isCompleted(questId)) {
      this.completeChallenge(questId, challenge);
    }
  }

  completeChallenge(questId, challenge) {
    this.completedChallenges.add(questId);
    localStorage.setItem('nq_completed_challenges', JSON.stringify(Array.from(this.completedChallenges)));

    // Audio & Visual celebratory fanfare
    if (this.soundFx) {
      if (typeof this.soundFx.playQuestComplete === 'function') {
        this.soundFx.playQuestComplete();
      } else if (typeof this.soundFx.playCelestialChime === 'function') {
        this.soundFx.playCelestialChime(880);
      }
    }
    if (this.confetti) {
      this.confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#fbbf24', '#34d399', '#a78bfa']
      });
    }

    // Award XP
    if (this.awardXp) {
      this.awardXp(challenge.xpReward, `Mastery Challenge: ${challenge.title}`);
    }

    // Record Dojo stats
    const dojoStats = JSON.parse(localStorage.getItem('nq_dojo_stats') || '{}');
    dojoStats.challengesCompleted = (dojoStats.challengesCompleted || 0) + 1;
    localStorage.setItem('nq_dojo_stats', JSON.stringify(dojoStats));

    // Callback & check badges
    if (this.onChallengeComplete) {
      this.onChallengeComplete(questId, challenge);
    }
    if (this.onBadgeCheck) {
      this.onBadgeCheck();
    }

    // Update HUD
    if (this.containerEl) {
      this.render(this.containerEl, questId);
    }
  }
}
