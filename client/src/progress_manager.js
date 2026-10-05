/**
 * NeuroQuest Progress Manager
 * Handles exporting, importing, and resetting learner state and journey data.
 */

export function exportProgress(state, tutorService) {
  const learnerName = localStorage.getItem('nq_learner_name') || 'Tensor Scholar';
  const backupData = {
    version: '1.0.0',
    app: 'NeuroQuest Deep Learning Studio',
    exportedAt: new Date().toISOString(),
    learnerName,
    userXp: state.userXp,
    completedQuests: Array.from(state.completedQuests),
    activeQuestId: state.activeQuestId,
    backendUrl: state.backendUrl,
    tutorSettings: {
      providerType: tutorService?.providerType || 'gemini',
      model: tutorService?.model || 'gemini-3.8-flash',
      customAgentUrl: tutorService?.customAgentUrl || ''
    }
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `neuroquest_save_${dateStr}.json`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  return { success: true, fileName };
}

export function importProgress(jsonString, state, tutorService) {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON format.');
    }

    if (typeof data.userXp !== 'number' || !Array.isArray(data.completedQuests)) {
      throw new Error('Missing core progress fields (userXp or completedQuests).');
    }

    // Update state
    state.userXp = Math.max(0, data.userXp);
    state.completedQuests = new Set(data.completedQuests);
    if (data.activeQuestId) state.activeQuestId = data.activeQuestId;
    if (data.backendUrl) state.backendUrl = data.backendUrl;

    // Persist to localStorage
    localStorage.setItem('nq_user_xp', state.userXp.toString());
    localStorage.setItem('nq_completed_quests', JSON.stringify([...state.completedQuests]));
    if (data.learnerName) localStorage.setItem('nq_learner_name', data.learnerName);
    if (data.backendUrl) localStorage.setItem('nq_backend_url', data.backendUrl);

    if (data.tutorSettings && tutorService) {
      if (data.tutorSettings.providerType) {
        tutorService.setProvider(data.tutorSettings.providerType, data.tutorSettings.customAgentUrl || '');
      }
      if (data.tutorSettings.model) {
        tutorService.setModel(data.tutorSettings.model);
      }
    }

    return {
      success: true,
      learnerName: data.learnerName || 'Tensor Scholar',
      userXp: state.userXp,
      completedCount: state.completedQuests.size
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

export function resetProgress(state) {
  state.userXp = 100;
  state.completedQuests = new Set();
  state.activeQuestId = 'quest-1';

  localStorage.setItem('nq_user_xp', '100');
  localStorage.setItem('nq_completed_quests', '[]');
  localStorage.removeItem('nq_chat_history');
}
