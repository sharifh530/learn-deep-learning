/**
 * NeuroQuest Progress Manager
 * Handles exporting, importing, and resetting learner state and journey data,
 * including 20 Quests, XP, 10-Tier Belt Ranks, 16 Dojo Badges, and Combat Records.
 */

export function exportProgress(state, tutorService) {
  const learnerName = localStorage.getItem('nq_learner_name') || 'Tensor Scholar';
  const unlockedBadges = Array.from(new Set(JSON.parse(localStorage.getItem('nq_unlocked_badges') || '[]')));
  const dojoStats = JSON.parse(localStorage.getItem('nq_dojo_stats') || JSON.stringify({
    galaxyOpens: 0,
    architectCustomized: 0,
    lossPlaygroundRuns: 0,
    doodleDraws: 0,
    codeRuns: 0,
    tutorChats: 0,
    correctQuizzes: 0
  }));

  const backupData = {
    version: '2.0.0',
    app: 'NeuroQuest Deep Learning Studio',
    exportedAt: new Date().toISOString(),
    learnerName,
    userXp: state.userXp,
    completedQuests: Array.from(state.completedQuests),
    completedChallenges: Array.from(new Set(JSON.parse(localStorage.getItem('nq_completed_challenges') || '[]'))),
    activeQuestId: state.activeQuestId,
    backendUrl: state.backendUrl,
    unlockedBadges,
    dojoStats,
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

  return {
    success: true,
    fileName,
    completedCount: state.completedQuests.size,
    badgeCount: unlockedBadges.length,
    userXp: state.userXp
  };
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

    // 1. Restore Core Progression State
    state.userXp = Math.max(0, data.userXp);
    state.completedQuests = new Set(data.completedQuests);
    if (data.activeQuestId) state.activeQuestId = data.activeQuestId;
    if (data.backendUrl) state.backendUrl = data.backendUrl;

    // 2. Persist to localStorage
    localStorage.setItem('nq_user_xp', state.userXp.toString());
    localStorage.setItem('nq_completed_quests', JSON.stringify([...state.completedQuests]));
    if (data.learnerName) localStorage.setItem('nq_learner_name', data.learnerName);
    if (data.backendUrl) localStorage.setItem('nq_backend_url', data.backendUrl);

    // 3. Restore Badges & Combat Records (with backward compatibility)
    let restoredBadgesCount = 0;
    if (Array.isArray(data.unlockedBadges)) {
      localStorage.setItem('nq_unlocked_badges', JSON.stringify(data.unlockedBadges));
      restoredBadgesCount = data.unlockedBadges.length;
    }

    if (data.dojoStats && typeof data.dojoStats === 'object') {
      localStorage.setItem('nq_dojo_stats', JSON.stringify(data.dojoStats));
    }

    if (Array.isArray(data.completedChallenges)) {
      localStorage.setItem('nq_completed_challenges', JSON.stringify(data.completedChallenges));
    }

    // 4. Restore AI Tutor Settings
    if (data.tutorSettings && tutorService) {
      if (data.tutorSettings.providerType) {
        tutorService.setProvider(data.tutorSettings.providerType, data.tutorSettings.customAgentUrl || '');
      }
      if (data.tutorSettings.model) {
        tutorService.setModel(data.tutorSettings.model);
      }
    }

    // 5. Sync active in-memory managers
    if (window.dojoManager && typeof window.dojoManager.reloadFromStorage === 'function') {
      window.dojoManager.reloadFromStorage();
    }
    if (window.masteryManager) {
      if (typeof window.masteryManager.reloadFromStorage === 'function') {
        window.masteryManager.reloadFromStorage();
      } else {
        window.masteryManager.completedChallenges = new Set(JSON.parse(localStorage.getItem('nq_completed_challenges') || '[]'));
      }
    }

    const totalQuests = state.curriculum?.quests?.length || 20;

    return {
      success: true,
      learnerName: data.learnerName || 'Tensor Scholar',
      userXp: state.userXp,
      completedCount: state.completedQuests.size,
      totalQuests,
      badgeCount: restoredBadgesCount,
      challengeCount: Array.isArray(data.completedChallenges) ? data.completedChallenges.length : 0
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
  localStorage.setItem('nq_unlocked_badges', '[]');
  localStorage.setItem('nq_completed_challenges', '[]');
  localStorage.setItem('nq_dojo_stats', JSON.stringify({
    galaxyOpens: 0,
    architectCustomized: 0,
    lossPlaygroundRuns: 0,
    doodleDraws: 0,
    codeRuns: 0,
    tutorChats: 0,
    correctQuizzes: 0,
    challengesCompleted: 0
  }));
  localStorage.removeItem('nq_chat_history');

  // Sync active managers
  if (window.dojoManager && typeof window.dojoManager.resetAll === 'function') {
    window.dojoManager.resetAll();
  }
  if (window.masteryManager) {
    if (typeof window.masteryManager.resetAll === 'function') {
      window.masteryManager.resetAll();
    } else {
      window.masteryManager.completedChallenges = new Set();
    }
  }
}
