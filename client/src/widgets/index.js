/**
 * NeuroQuest Interactive Widgets Router
 * Dynamically code-splits and loads widget modules on-demand by quest category.
 */

const loaders = {
  foundations: () => import('./foundations_widgets.js'),
  transformer: () => import('./transformer_widgets.js'),
  frontier: () => import('./frontier_llm_widgets.js'),
  generative: () => import('./generative_physical_widgets.js')
};

const widgetTypeMap = {
  // Foundations (Quests 1 - 5)
  neuron_tuner: ['foundations', 'renderCoffeeNeuronWidget'],
  activation_lab: ['foundations', 'renderActivationLabWidget'],
  gradient_runner: ['foundations', 'renderGradientRunnerWidget'],
  doodle_arena: ['foundations', 'renderDoodleArenaWidget'],
  kernel_detective: ['foundations', 'renderKernelDetectiveWidget'],

  // Deep & Transformers (Quests 6 - 10)
  regularization_arena: ['transformer', 'renderRegularizationArenaWidget'],
  attention_workshop: ['transformer', 'renderAttentionWorkshopWidget'],
  bpe_embedding_lab: ['transformer', 'renderBpeEmbeddingLabWidget'],
  transformer_block_inspector: ['transformer', 'renderTransformerBlockInspectorWidget'],
  generation_sampler_lab: ['transformer', 'renderGenerationSamplerLabWidget'],

  // Frontier LLMs & Agents (Quests 11 - 15)
  alignment_dpo_lab: ['frontier', 'renderAlignmentDpoLabWidget'],
  peft_lora_lab: ['frontier', 'renderPeftLoraLabWidget'],
  reasoning_model_lab: ['frontier', 'renderReasoningModelLabWidget'],
  agentic_tool_lab: ['frontier', 'renderAgenticToolLabWidget'],
  multimodal_vlm_lab: ['frontier', 'renderMultimodalVlmLabWidget'],

  // Generative & Physical AI (Quests 16 - 20)
  moe_routing_lab: ['generative', 'renderMoeRoutingLabWidget'],
  diffusion_flow_lab: ['generative', 'renderDiffusionFlowLabWidget'],
  audio_speech_lab: ['generative', 'renderAudioSpeechLabWidget'],
  world_model_video_lab: ['generative', 'renderWorldModelVideoLabWidget'],
  embodied_robotics_lab: ['generative', 'renderEmbodiedRoboticsLabWidget']
};

/**
 * Clears any previous sandbox widgets from interactiveContainer,
 * preserving the Guided Mastery Challenge HUD card (#mastery-challenge-card) if present.
 */
export function clearInteractiveSandbox(container) {
  if (!container) return;
  const children = Array.from(container.children);
  for (const child of children) {
    if (child.id !== 'mastery-challenge-card') {
      child.remove();
    }
  }
}

/**
 * Cleans up active widget timers, animations, and callbacks.
 */
export function cleanupActiveWidgetState(state) {
  if (state && state.challengeTimerId) {
    clearInterval(state.challengeTimerId);
    state.challengeTimerId = null;
  }
  if (typeof window._activeWidgetCleanup === 'function') {
    try {
      window._activeWidgetCleanup();
    } catch (e) {
      console.warn('Widget cleanup error:', e);
    }
    window._activeWidgetCleanup = null;
  }
}

export async function renderInteractiveWidget(quest, context) {
  const { dom, state } = context;
  if (!dom || !dom.interactiveContainer) return;

  // 1. Clean up any active timers or animation callbacks
  cleanupActiveWidgetState(state);

  // 2. Immediately remove any prior sandbox widgets from previous quests
  clearInteractiveSandbox(dom.interactiveContainer);

  const currentQuestId = quest.id;
  const entry = widgetTypeMap[quest.interactiveType];

  if (!entry) {
    const placeholder = document.createElement('div');
    placeholder.className = 'interactive-widget-placeholder';
    placeholder.style.cssText = 'padding: 2.5rem 1rem; text-align: center; color: var(--text-dim, #94a3b8); font-size: 0.9rem;';
    placeholder.textContent = 'Interactive playground loading...';
    dom.interactiveContainer.appendChild(placeholder);
    return;
  }

  const [category, fnName] = entry;

  // 3. Render a lightweight loading placeholder below mastery card while chunk loads
  const loaderEl = document.createElement('div');
  loaderEl.className = 'interactive-widget-loader';
  loaderEl.style.cssText = 'padding: 2.5rem 1rem; text-align: center; color: var(--text-dim, #94a3b8); font-size: 0.88rem;';
  loaderEl.innerHTML = `<div style="display: inline-flex; align-items: center; gap: 0.6rem;"><span>⚙️</span> Loading ${quest.title} playground...</div>`;
  dom.interactiveContainer.appendChild(loaderEl);

  try {
    const mod = await loaders[category]();
    // Prevent race conditions if user switched quests while chunk was loading
    if (state && state.activeQuestId && state.activeQuestId !== currentQuestId) {
      if (loaderEl.parentNode) loaderEl.remove();
      return;
    }

    // 4. Remove loader placeholder and any leftover non-mastery elements before mounting
    clearInteractiveSandbox(dom.interactiveContainer);

    if (typeof mod[fnName] === 'function') {
      mod[fnName](quest, context);
    }

    // 5. Re-evaluate mastery challenge for the newly mounted sandbox widget
    if (window.masteryManager) {
      window.masteryManager.evaluate(quest.id);
    }
  } catch (err) {
    console.error(`Failed to load interactive widget (${quest.interactiveType}):`, err);
    if (state && state.activeQuestId && state.activeQuestId !== currentQuestId) return;
    clearInteractiveSandbox(dom.interactiveContainer);
    const errBox = document.createElement('div');
    errBox.className = 'p-6 text-center';
    errBox.innerHTML = `
      <p style="color: #f43f5e; font-weight: 600; margin-bottom: 0.5rem;">Error loading interactive widget</p>
      <p style="color: #94a3b8; font-size: 0.78rem;">${err.message}</p>
    `;
    dom.interactiveContainer.appendChild(errBox);
  }
}
