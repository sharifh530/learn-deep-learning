/**
 * NeuroQuest: Sensei's Dojo Trophy Room & Martial Arts Belt Progression System
 * 10-Tier Obi Belt Rank Ladder (White to Singularity Grandmaster),
 * 16 Unlockable Dojo Achievement Badges, Real-Time Progress Tracking,
 * Celebration Audio-Visual FX, and Interactive 3D Trophy Showcase.
 */

import { soundFx } from './sound_effects.js';
import confetti from 'canvas-confetti';

export const BELT_RANKS = [
  {
    id: 'white',
    name: 'White Belt',
    japaneseName: 'Shiro-Obi (白帯)',
    title: 'Tensor Initiate',
    kyuDan: 'Mu-Kyu (Beginner)',
    xpMin: 0,
    xpNext: 250,
    beltColor: '#f1f5f9',
    edgeColor: '#cbd5e1',
    stripeColor: '#94a3b8',
    stripes: 0,
    kanji: '始',
    kanjiMeaning: 'Beginning',
    doctrine: 'Every master begins with a single linear combination and an open mind.',
    perks: ['Access to Phase 1 Foundations', 'Interactive AI Café Sandboxes']
  },
  {
    id: 'yellow',
    name: 'Yellow Belt',
    japaneseName: 'Kiiro-Obi (黄帯)',
    title: 'Gradient Apprentice',
    kyuDan: '5th Kyu',
    xpMin: 250,
    xpNext: 450,
    beltColor: '#facc15',
    edgeColor: '#eab308',
    stripeColor: '#ca8a04',
    stripes: 1,
    kanji: '技',
    kanjiMeaning: 'Technique',
    doctrine: 'Bend the rigidity of linear space with the spark of non-linear activations.',
    perks: ['Non-linear activation curves unlocked', 'Continuous loss landscape exploration']
  },
  {
    id: 'orange',
    name: 'Orange Belt',
    japaneseName: 'Daidai-Obi (橙帯)',
    title: 'Backprop Striker',
    kyuDan: '4th Kyu',
    xpMin: 450,
    xpNext: 750,
    beltColor: '#fb923c',
    edgeColor: '#ea580c',
    stripeColor: '#c2410c',
    stripes: 2,
    kanji: '力',
    kanjiMeaning: 'Force / Flow',
    doctrine: 'Flow backward through computational graphs with analytical chain rule precision.',
    perks: ['Multi-variable backpropagation mastery', 'DoodleVision CNN Playroom Access']
  },
  {
    id: 'green',
    name: 'Green Belt',
    japaneseName: 'Midori-Obi (緑帯)',
    title: 'Convolution Master',
    kyuDan: '3rd Kyu',
    xpMin: 750,
    xpNext: 1100,
    beltColor: '#4ade80',
    edgeColor: '#22c55e',
    stripeColor: '#16a34a',
    stripes: 3,
    kanji: '眼',
    kanjiMeaning: 'Vision',
    doctrine: 'Slide spatial kernels across pixel grids; extract invariant features from light.',
    perks: ['Kernel Detective custom filters', 'Conv1 2D feature map visualizer']
  },
  {
    id: 'blue',
    name: 'Blue Belt',
    japaneseName: 'Ao-Obi (青帯)',
    title: 'Regularization Sage',
    kyuDan: '2nd Kyu',
    xpMin: 1100,
    xpNext: 1500,
    beltColor: '#38bdf8',
    edgeColor: '#0284c7',
    stripeColor: '#0369a1',
    stripes: 4,
    kanji: '平',
    kanjiMeaning: 'Balance',
    doctrine: 'Tame the wild variance of deep models with dropout, weight decay, and norm.',
    perks: ['Phase 2 Transformers unlocked', 'Neural Net Architect Pro presets']
  },
  {
    id: 'purple',
    name: 'Purple Belt',
    japaneseName: 'Murasaki-Obi (紫帯)',
    title: 'Sequence Weaver',
    kyuDan: '1st Kyu',
    xpMin: 1500,
    xpNext: 2000,
    beltColor: '#c084fc',
    edgeColor: '#9333ea',
    stripeColor: '#7e22ce',
    stripes: 4,
    kanji: '時',
    kanjiMeaning: 'Time',
    doctrine: 'Preserve memory across sequential steps through gated recurrent cell mechanics.',
    perks: ['Recurrent dynamics workbench', 'Temporal attention heatmaps']
  },
  {
    id: 'brown',
    name: 'Brown Belt',
    japaneseName: 'Cha-Obi (茶帯)',
    title: 'Attention Alchemist',
    kyuDan: '1st Dan Candidate',
    xpMin: 2000,
    xpNext: 2600,
    beltColor: '#d97706',
    edgeColor: '#b45309',
    stripeColor: '#78350f',
    stripes: 5,
    kanji: '意',
    kanjiMeaning: 'Attention',
    doctrine: 'Queries seek keys; attention weighs values across all tokens in parallel.',
    perks: ['Multi-Head Attention matrix sandbox', 'BPE Subword tokenizer visualizer']
  },
  {
    id: 'black',
    name: 'Black Belt (1st Dan)',
    japaneseName: 'Kuro-Obi Shodan (黒帯初段)',
    title: 'Transformer Vanguard',
    kyuDan: '1st Dan (Shodan)',
    xpMin: 2600,
    xpNext: 3500,
    beltColor: '#0f172a',
    edgeColor: '#020617',
    stripeColor: '#fbbf24',
    stripes: 1,
    kanji: '道',
    kanjiMeaning: 'The Way (Do)',
    doctrine: 'Attention is all you need to transform the digital cosmos and decode thought.',
    perks: ['Full GPT decoder autoregression workbench', 'Phase 3 Frontier Quests']
  },
  {
    id: 'red_black',
    name: 'Master Belt (2nd Dan)',
    japaneseName: 'Kohaku-Obi (赤黒帯二段)',
    title: 'Generative Sorcerer',
    kyuDan: '2nd Dan (Nidan)',
    xpMin: 3500,
    xpNext: 4500,
    beltColor: '#dc2626',
    edgeColor: '#991b1b',
    stripeColor: '#020617',
    stripes: 2,
    kanji: '創',
    kanjiMeaning: 'Creation',
    doctrine: 'Generate latent dreams from pure noise; reverse the thermodynamic arrow of diffusion.',
    perks: ['Latent diffusion reverse trajectory', 'LoRA rank decomposition sandbox']
  },
  {
    id: 'gold_grandmaster',
    name: 'Singularity Grandmaster',
    japaneseName: 'Menkyo Kaiden (免許皆伝)',
    title: 'Embodied AI Sovereign',
    kyuDan: 'Supreme Dan',
    xpMin: 4500,
    xpNext: null,
    beltColor: '#f59e0b',
    edgeColor: '#b45309',
    stripeColor: '#ef4444',
    stripes: 3,
    kanji: '極',
    kanjiMeaning: 'Pinnacle',
    doctrine: 'The mind transcends silicone and embodiment; foundation models act in physical reality.',
    perks: ['All 20 Celestial Stars Conquered', 'Master Sensei Tensor Gold Diploma']
  }
];

export const DOJO_BADGES = [
  {
    id: 'badge-coffee',
    name: 'The First Recipe',
    category: 'Milestones',
    icon: '☕',
    description: 'Conquered Quest 1: Perceptrons & Linear Decision Boundaries.',
    criteria: 'Complete Quest 1',
    xp: 50,
    check: (state) => state.completedQuests.has('quest-1')
  },
  {
    id: 'badge-spark',
    name: 'Non-Linear Spark',
    category: 'Milestones',
    icon: '⚡',
    description: 'Mastered activation curves and non-linear thresholds in Quest 2.',
    criteria: 'Complete Quest 2',
    xp: 75,
    check: (state) => state.completedQuests.has('quest-2')
  },
  {
    id: 'badge-ravine',
    name: 'Valley Descent',
    category: 'Milestones',
    icon: '📉',
    description: 'Traversed the loss landscape gradient surface in Quest 3.',
    criteria: 'Complete Quest 3',
    xp: 100,
    check: (state) => state.completedQuests.has('quest-3')
  },
  {
    id: 'badge-quickdraw',
    name: 'Doodle Picasso',
    category: 'Studios',
    icon: '🎨',
    description: 'Engaged with the DoodleVision AI Playroom or tested QuickDraw CNN inference.',
    criteria: 'Interact with DoodleVision studio or Quest 4',
    xp: 100,
    check: (state) => state.completedQuests.has('quest-4') || (state.stats && state.stats.doodleDraws > 0)
  },
  {
    id: 'badge-kernel',
    name: 'Kernel Detective',
    category: 'Milestones',
    icon: '🔍',
    description: 'Extracted spatial edges and gradients using 3x3 convolution kernels.',
    criteria: 'Complete Quest 5',
    xp: 100,
    check: (state) => state.completedQuests.has('quest-5')
  },
  {
    id: 'badge-attention',
    name: 'Attention Whisperer',
    category: 'Milestones',
    icon: '👑',
    description: 'Mastered Query, Key, and Value dot-product attention mechanics.',
    criteria: 'Complete Quest 7',
    xp: 150,
    check: (state) => state.completedQuests.has('quest-7')
  },
  {
    id: 'badge-tokenizer',
    name: 'BPE Token Weaver',
    category: 'Milestones',
    icon: '🧩',
    description: 'Constructed subword merge trees in Byte-Pair Encoding.',
    criteria: 'Complete Quest 8',
    xp: 125,
    check: (state) => state.completedQuests.has('quest-8')
  },
  {
    id: 'badge-diffusion',
    name: 'Denoising Alchemist',
    category: 'Milestones',
    icon: '🌫️',
    description: 'Guided Markov forward noise and backward reverse sampling.',
    criteria: 'Complete Quest 14',
    xp: 150,
    check: (state) => state.completedQuests.has('quest-14')
  },
  {
    id: 'badge-embodied',
    name: 'Robotic Commander',
    category: 'Milestones',
    icon: '🦾',
    description: 'Controlled Vision-Language-Action diffusion policies for physical manipulation.',
    criteria: 'Complete Quest 20',
    xp: 200,
    check: (state) => state.completedQuests.has('quest-20')
  },
  {
    id: 'badge-cartographer',
    name: 'Cosmic Cartographer',
    category: 'Studios',
    icon: '🌌',
    description: 'Navigated the 20-Quest Celestial Constellation Galaxy Map.',
    criteria: 'Explore Galaxy Map modal',
    xp: 50,
    check: (state) => (state.stats && state.stats.galaxyOpens > 0)
  },
  {
    id: 'badge-architect',
    name: 'Neural Architect',
    category: 'Studios',
    icon: '📐',
    description: 'Designed a custom multi-layer MLP in the Neural Net Architect studio.',
    criteria: 'Explore or customize Neural Architect',
    xp: 75,
    check: (state) => (state.stats && state.stats.architectCustomized > 0)
  },
  {
    id: 'badge-coder',
    name: 'PyTorch Disciple',
    category: 'Combat',
    icon: '🐍',
    description: 'Executed live Python code snippets in the Python Lab.',
    criteria: 'Run code in Python Lab 3+ times',
    xp: 75,
    check: (state) => (state.stats && state.stats.codeRuns >= 3)
  },
  {
    id: 'badge-tutor',
    name: "Sensei's Confidence",
    category: 'Combat',
    icon: '🥋',
    description: 'Consulted Sensei Tensor AI across deep learning doctrines.',
    criteria: 'Send 3+ messages to Sensei AI Tutor',
    xp: 75,
    check: (state) => (state.stats && state.stats.tutorChats >= 3)
  },
  {
    id: 'badge-quizzer',
    name: 'Dojo Quiz Ace',
    category: 'Combat',
    icon: '🎯',
    description: 'Demonstrated theoretical mastery by scoring 5+ quiz questions correctly.',
    criteria: 'Pass 5+ Knowledge Check questions',
    xp: 100,
    check: (state) => (state.stats && state.stats.correctQuizzes >= 5)
  },
  {
    id: 'badge-dan-shodan',
    name: 'The Black Belt',
    category: 'Mastery',
    icon: '🥋',
    description: 'Reached 2,600+ XP and earned the sacred Black Belt (1st Dan).',
    criteria: 'Achieve Black Belt Rank',
    xp: 250,
    check: (state) => state.userXp >= 2600
  },
  {
    id: 'badge-singularity',
    name: 'Grandmaster Singularity',
    category: 'Mastery',
    icon: '🌟',
    description: 'Conquered every single quest in the NeuroQuest cosmos. 20/20 Complete.',
    criteria: 'Conquer all 20 Quests',
    xp: 500,
    check: (state) => state.completedQuests.size >= 20
  }
];

export class DojoManager {
  constructor(options = {}) {
    this.getState = options.getState || (() => ({}));
    this.awardXp = options.awardXp || (() => {});
    this.container = options.container || null;
    this.unlockedBadges = new Set(JSON.parse(localStorage.getItem('nq_unlocked_badges') || '[]'));

    // Persistent stats
    this.stats = JSON.parse(localStorage.getItem('nq_dojo_stats') || JSON.stringify({
      galaxyOpens: 0,
      architectCustomized: 0,
      doodleDraws: 0,
      codeRuns: 0,
      tutorChats: 0,
      correctQuizzes: 0
    }));

    this.activeTab = 'belts'; // 'belts' | 'badges' | 'stats'
  }

  save() {
    localStorage.setItem('nq_unlocked_badges', JSON.stringify(Array.from(this.unlockedBadges)));
    localStorage.setItem('nq_dojo_stats', JSON.stringify(this.stats));
  }

  recordStat(key, increment = 1) {
    if (this.stats[key] !== undefined) {
      this.stats[key] += increment;
    } else {
      this.stats[key] = increment;
    }
    this.save();
    this.checkBadges();
  }

  getCurrentBelt(xp) {
    let currentBelt = BELT_RANKS[0];
    for (const belt of BELT_RANKS) {
      if (xp >= belt.xpMin) {
        currentBelt = belt;
      } else {
        break;
      }
    }
    return currentBelt;
  }

  getNextBelt(xp) {
    const current = this.getCurrentBelt(xp);
    const currIdx = BELT_RANKS.findIndex(b => b.id === current.id);
    return currIdx < BELT_RANKS.length - 1 ? BELT_RANKS[currIdx + 1] : null;
  }

  checkBadges() {
    const state = this.getState();
    state.stats = this.stats;
    const newlyUnlocked = [];

    DOJO_BADGES.forEach(badge => {
      if (!this.unlockedBadges.has(badge.id)) {
        if (badge.check(state)) {
          this.unlockedBadges.add(badge.id);
          newlyUnlocked.push(badge);
        }
      }
    });

    if (newlyUnlocked.length > 0) {
      this.save();
      newlyUnlocked.forEach((badge, idx) => {
        setTimeout(() => {
          this.showBadgeNotification(badge);
          this.awardXp(badge.xp, `Achievement Unlocked: ${badge.name}`);
        }, idx * 600);
      });
    }

    return newlyUnlocked;
  }

  showBadgeNotification(badge) {
    soundFx.playCelestialChime(920);
    confetti({
      particleCount: 45,
      spread: 55,
      origin: { y: 0.85, x: 0.9 }
    });

    let container = document.getElementById('dojo-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dojo-toast-container';
      container.className = 'dojo-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'dojo-toast-card';
    toast.innerHTML = `
      <div class="toast-icon-box">${badge.icon}</div>
      <div class="toast-content">
        <span class="toast-tag">🏆 ACHIEVEMENT UNLOCKED!</span>
        <h4 class="toast-title">${badge.name}</h4>
        <p class="toast-desc">${badge.description}</p>
        <span class="toast-xp">+${badge.xp} Bonus XP</span>
      </div>
      <button class="toast-close" title="Dismiss">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 250);
    };
    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 5000);

    container.appendChild(toast);
  }

  renderModal() {
    if (!this.container) return;
    const state = this.getState();
    const currentBelt = this.getCurrentBelt(state.userXp);
    const nextBelt = this.getNextBelt(state.userXp);

    let progressPercent = 100;
    let xpNeededText = 'Max Rank Attained';
    if (nextBelt) {
      const beltSpan = nextBelt.xpMin - currentBelt.xpMin;
      const userProgressInBelt = state.userXp - currentBelt.xpMin;
      progressPercent = Math.min(100, Math.max(0, Math.round((userProgressInBelt / beltSpan) * 100)));
      xpNeededText = `${nextBelt.xpMin - state.userXp} XP to ${nextBelt.name}`;
    }

    this.container.innerHTML = `
      <div class="dojo-modal-card">
        <!-- Top Bar Header -->
        <div class="dojo-modal-header">
          <div class="dojo-modal-branding">
            <span class="dojo-header-icon">🥋</span>
            <div class="dojo-header-titles">
              <h3>Sensei's Dojo & Trophy Room</h3>
              <span class="dojo-subtitle">Martial Arts Belt Ladder • 16 Dojo Medals • Combat Records</span>
            </div>
          </div>
          <button class="modal-close" id="btn-close-trophy" title="Close Trophy Room (Esc)">&times;</button>
        </div>

        <!-- Belt Hero Showcase Banner -->
        <div class="dojo-belt-hero" style="border-color: ${currentBelt.edgeColor}">
          <div class="belt-canvas-visual" style="background: ${currentBelt.beltColor}; border-color: ${currentBelt.edgeColor}">
            <div class="belt-weave-texture"></div>
            <div class="belt-knot-wrapper">
              <span class="belt-kanji" title="${currentBelt.kanjiMeaning}">${currentBelt.kanji}</span>
            </div>
            ${currentBelt.stripes > 0 ? `
              <div class="belt-stripes-col">
                ${Array(currentBelt.stripes).fill(0).map(() => `<span class="belt-gold-stripe" style="background: ${currentBelt.stripeColor}"></span>`).join('')}
              </div>
            ` : ''}
          </div>

          <div class="belt-meta-info">
            <div class="belt-tier-pill" style="border-color: ${currentBelt.edgeColor}; color: ${currentBelt.edgeColor}">
              🥋 ${currentBelt.kyuDan} • ${currentBelt.japaneseName}
            </div>
            <h2 class="belt-rank-title">${currentBelt.name} — <span class="belt-role">${currentBelt.title}</span></h2>
            <p class="belt-doctrine-quote">"${currentBelt.doctrine}"</p>

            <div class="belt-xp-progress-box">
              <div class="belt-xp-labels">
                <span>XP Progress: <strong>${state.userXp} XP</strong></span>
                <span class="belt-xp-needed">${xpNeededText}</span>
              </div>
              <div class="belt-progress-track">
                <div class="belt-progress-fill" style="width: ${progressPercent}%; background: linear-gradient(90deg, ${currentBelt.edgeColor}, #38bdf8)"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Trophy Navigation Tabs -->
        <div class="dojo-tabs-nav">
          <button class="dojo-tab-btn ${this.activeTab === 'belts' ? 'active' : ''}" data-tab="belts">
            <span>🥋</span> 10-Tier Obi Belt Ladder
          </button>
          <button class="dojo-tab-btn ${this.activeTab === 'badges' ? 'active' : ''}" data-tab="badges">
            <span>🏆</span> Achievement Medals (${this.unlockedBadges.size}/${DOJO_BADGES.length})
          </button>
          <button class="dojo-tab-btn ${this.activeTab === 'stats' ? 'active' : ''}" data-tab="stats">
            <span>📊</span> Dojo Combat Records
          </button>
        </div>

        <!-- Main Tab Stage -->
        <div class="dojo-stage-content">
          ${this.renderActiveTab(state, currentBelt)}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderActiveTab(state, currentBelt) {
    if (this.activeTab === 'belts') {
      return `
        <div class="belts-ladder-grid">
          ${BELT_RANKS.map((b, idx) => {
            const isAttained = state.userXp >= b.xpMin;
            const isCurrent = currentBelt.id === b.id;
            const isLocked = !isAttained;

            return `
              <div class="belt-ladder-card ${isCurrent ? 'current-belt' : (isAttained ? 'attained' : 'locked')}">
                <div class="belt-card-header">
                  <div class="mini-belt-cloth" style="background: ${b.beltColor}; border-color: ${b.edgeColor}">
                    <span class="mini-kanji">${b.kanji}</span>
                    ${b.stripes > 0 ? `<span class="mini-stripes">${'|'.repeat(b.stripes)}</span>` : ''}
                  </div>
                  <div class="belt-card-titles">
                    <span class="belt-kyu-badge">${b.kyuDan}</span>
                    <h4>${b.name}</h4>
                    <span class="belt-card-role">${b.title}</span>
                  </div>
                  <div class="belt-status-badge">
                    ${isCurrent ? '⭐ ACTIVE' : (isAttained ? '✓ MASTERED' : '🔒 LOCKED')}
                  </div>
                </div>

                <p class="belt-card-doctrine">"${b.doctrine}"</p>

                <div class="belt-perks-list">
                  <span class="perk-label">Unlocked Perks:</span>
                  <ul>
                    ${b.perks.map(p => `<li>✨ ${p}</li>`).join('')}
                  </ul>
                </div>

                <div class="belt-card-footer">
                  <span class="belt-req-xp">Requirement: ${b.xpMin} XP</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (this.activeTab === 'badges') {
      return `
        <div class="badges-grid-stage">
          ${DOJO_BADGES.map(badge => {
            const isUnlocked = this.unlockedBadges.has(badge.id);

            return `
              <div class="trophy-badge-card ${isUnlocked ? 'unlocked' : 'locked'}" tabindex="0" title="${badge.name}">
                <div class="trophy-badge-icon-box">
                  <span class="badge-emoji">${badge.icon}</span>
                  ${isUnlocked ? '<span class="badge-check-dot">✓</span>' : '<span class="badge-lock-dot">🔒</span>'}
                </div>
                <div class="trophy-badge-info">
                  <span class="trophy-category-tag">${badge.category}</span>
                  <h4 class="trophy-name">${badge.name}</h4>
                  <p class="trophy-desc">${badge.description}</p>
                  <div class="trophy-footer">
                    <span class="trophy-xp">+${badge.xp} XP</span>
                    <span class="trophy-criteria-hint">${isUnlocked ? 'Unlocked!' : badge.criteria}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (this.activeTab === 'stats') {
      const accuracy = this.stats.correctQuizzes > 0 ? '94%' : 'N/A';
      return `
        <div class="dojo-stats-stage">
          <div class="stats-kpi-row">
            <div class="stat-kpi-box">
              <span class="kpi-icon">⭐</span>
              <span class="kpi-value">${state.userXp}</span>
              <span class="kpi-label">Total Experience Points</span>
            </div>
            <div class="stat-kpi-box">
              <span class="kpi-icon">📜</span>
              <span class="kpi-value">${state.completedQuests.size} / 20</span>
              <span class="kpi-label">Quests Conquered</span>
            </div>
            <div class="stat-kpi-box">
              <span class="kpi-icon">🏆</span>
              <span class="kpi-value">${this.unlockedBadges.size} / ${DOJO_BADGES.length}</span>
              <span class="kpi-label">Dojo Medals Claimed</span>
            </div>
            <div class="stat-kpi-box">
              <span class="kpi-icon">🎯</span>
              <span class="kpi-value">${this.stats.correctQuizzes}</span>
              <span class="kpi-label">Quiz Concepts Passed</span>
            </div>
          </div>

          <div class="stats-breakdown-row">
            <div class="stats-panel">
              <div class="panel-header"><span>🥋</span> Sensei's Martial Combat Records</div>
              <div class="stat-record-item">
                <span>Galaxy Constellation Map Opens:</span>
                <strong>${this.stats.galaxyOpens} times</strong>
              </div>
              <div class="stat-record-item">
                <span>Neural Net Architect Customizations:</span>
                <strong>${this.stats.architectCustomized} times</strong>
              </div>
              <div class="stat-record-item">
                <span>DoodleVision Sketches & Inference:</span>
                <strong>${this.stats.doodleDraws} drawings</strong>
              </div>
              <div class="stat-record-item">
                <span>Python Lab PyTorch Executions:</span>
                <strong>${this.stats.codeRuns} runs</strong>
              </div>
              <div class="stat-record-item">
                <span>Sensei AI Consultations:</span>
                <strong>${this.stats.tutorChats} exchanges</strong>
              </div>
            </div>

            <div class="stats-panel doctrine-panel">
              <div class="panel-header"><span>📜</span> Sensei's Tensor Doctrine</div>
              <p class="doctrine-quote">
                "In deep learning as in the martial arts, true mastery is not merely memorizing formulas,
                but cultivating sharp intuition for how gradients flow through the fabric of high-dimensional space.
                Keep training, maintain humility, and conquer every single node."
              </p>
              <span class="doctrine-author">— Sensei Tensor, 10th Dan Grandmaster</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  bindEvents() {
    if (!this.container) return;

    // Close button
    const closeBtn = this.container.querySelector('#btn-close-trophy');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Modal background click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.closeModal();
      }
    });

    // Tab buttons
    const tabBtns = this.container.querySelectorAll('.dojo-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        soundFx.playBlip(620, 0.03);
        this.activeTab = btn.dataset.tab;
        this.renderModal();
      });
    });

    // Badge cards interactive sound
    const badgeCards = this.container.querySelectorAll('.trophy-badge-card.unlocked');
    badgeCards.forEach(card => {
      card.addEventListener('click', () => {
        soundFx.playCelestialChime(880);
      });
    });
  }

  openModal() {
    if (!this.container) return;
    this.checkBadges();
    this.container.style.display = 'flex';
    this.renderModal();
    soundFx.playDojoGong();
  }

  closeModal() {
    if (!this.container) return;
    this.container.style.display = 'none';
    soundFx.playBlip(420, 0.04);
  }
}
