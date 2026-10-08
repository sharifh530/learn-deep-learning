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

export async function renderInteractiveWidget(quest, context) {
  const { dom, state } = context;
  if (!dom || !dom.interactiveContainer) return;

  const currentQuestId = quest.id;
  const entry = widgetTypeMap[quest.interactiveType];

  if (!entry) {
    dom.interactiveContainer.innerHTML = '<div class="p-6 text-center text-slate-400">Interactive playground loading...</div>';
    return;
  }

  const [category, fnName] = entry;

  try {
    const mod = await loaders[category]();
    // Prevent race conditions if user switched quests while chunk was loading
    if (state && state.activeQuestId && state.activeQuestId !== currentQuestId) {
      return;
    }
    if (typeof mod[fnName] === 'function') {
      mod[fnName](quest, context);
    }
  } catch (err) {
    console.error(`Failed to load interactive widget (${quest.interactiveType}):`, err);
    if (state && state.activeQuestId && state.activeQuestId !== currentQuestId) return;
    dom.interactiveContainer.innerHTML = `
      <div class="p-6 text-center">
        <p class="text-rose-400 font-semibold mb-2">Error loading interactive widget</p>
        <p class="text-xs text-slate-400">${err.message}</p>
      </div>
    `;
  }
}
