/**
 * NeuroQuest Retro Dojo Audio & Sound FX Synthesizer
 * Built entirely with Web Audio API - zero external audio assets, zero latency.
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('nq_sound_muted') === 'true';
    this.masterGainNode = null;
    this.masterVolume = 0.35;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.setValueAtTime(
          this.isMuted ? 0 : this.masterVolume,
          this.ctx.currentTime
        );
        this.masterGainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.init();
    this.isMuted = !this.isMuted;
    localStorage.setItem('nq_sound_muted', this.isMuted.toString());
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGainNode.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
    if (!this.isMuted) {
      this.playBlip(660);
    }
    return this.isMuted;
  }

  getAudioDestination() {
    this.init();
    if (!this.ctx || this.isMuted) return null;
    return this.masterGainNode;
  }

  /**
   * Short pleasant UI interaction blip (tab switch, button hover/click)
   */
  playBlip(freq = 560, duration = 0.04) {
    const dest = this.getAudioDestination();
    if (!dest) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + duration);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Retro arcade crystal / coin chime for XP gains
   */
  playXpGain() {
    const dest = this.getAudioDestination();
    if (!dest) return;
    const now = this.ctx.currentTime;

    // Two rapid notes: B5 (987.77Hz) -> E6 (1318.51Hz) with sparkling harmonics
    const notes = [
      { f: 987.77, t: 0, d: 0.08 },
      { f: 1318.51, t: 0.07, d: 0.22 }
    ];

    notes.forEach(({ f, t, d }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + t);

      gain.gain.setValueAtTime(0.25, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + t);
      osc.stop(now + t + d);
    });
  }

  /**
   * Uplifting 4-note major arpeggio for correct quiz answers
   */
  playQuizCorrect() {
    const dest = this.getAudioDestination();
    if (!dest) return;
    const now = this.ctx.currentTime;

    // C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    const arpeggio = [523.25, 659.25, 783.99, 1046.5];

    arpeggio.forEach((freq, idx) => {
      const start = now + idx * 0.06;
      const duration = 0.28;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === arpeggio.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(start);
      osc.stop(start + duration);
    });
  }

  /**
   * Gentle retro low buzz for incorrect quiz answers
   */
  playQuizWrong() {
    const dest = this.getAudioDestination();
    if (!dest) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Resonant Japanese Zen Temple Gong / Bell
   * Rich metallic harmonics with long meditative sustain
   */
  playDojoGong() {
    const dest = this.getAudioDestination();
    if (!dest) return;
    const now = this.ctx.currentTime;

    // Harmonic ratios for authentic bell/gong timbre
    const partials = [
      { ratio: 1.0, gain: 0.4, decay: 2.4 },     // Fundamental ~110Hz (A2)
      { ratio: 2.14, gain: 0.28, decay: 1.8 },   // Inharmonic overtone
      { ratio: 3.52, gain: 0.18, decay: 1.2 },   // Metallic chime
      { ratio: 4.88, gain: 0.1, decay: 0.8 },    // High shimmer
      { ratio: 6.25, gain: 0.05, decay: 0.5 }
    ];

    const baseFreq = 110;

    partials.forEach(({ ratio, gain: gLevel, decay }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);

      gain.gain.setValueAtTime(gLevel * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + decay);
    });
  }

  /**
   * Triumphant level-up / quest mastery fanfare
   */
  playQuestComplete() {
    const dest = this.getAudioDestination();
    if (!dest) return;
    const now = this.ctx.currentTime;

    // Fanfare motif: G4 (392Hz), C5 (523Hz), E5 (659Hz), G5 (784Hz), A5 (880Hz), C6 (1046Hz)
    const melody = [
      { f: 392.0, t: 0, d: 0.1 },
      { f: 523.25, t: 0.09, d: 0.1 },
      { f: 659.25, t: 0.18, d: 0.1 },
      { f: 783.99, t: 0.27, d: 0.18 },
      { f: 1046.5, t: 0.45, d: 0.55 }
    ];

    melody.forEach(({ f, t, d }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + t);

      gain.gain.setValueAtTime(0.28, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + t);
      osc.stop(now + t + d);
    });
  }

  /**
   * Snappy mechanical stepper motor click for PyTorch training step
   */
  playTrainingStep() {
    const dest = this.getAudioDestination();
    if (!dest) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.035);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  /**
   * Clear training boxing bell / epoch completion ding
   */
  playEpochBell() {
    const dest = this.getAudioDestination();
    if (!dest) return;
    const now = this.ctx.currentTime;

    [880, 1760, 2640].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const amp = idx === 0 ? 0.3 : 0.12 / idx;
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  /**
   * Subtle soft canvas pencil scratch for drawing on doodle canvas
   */
  playDoodleStroke() {
    const dest = this.getAudioDestination();
    if (!dest) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 + Math.random() * 80, now);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.02);
  }

  /**
   * Grandmaster Diploma Coronation Fanfare
   * Royal harmonic chord flourish
   */
  playDiplomaFanfare() {
    this.playDojoGong();
    setTimeout(() => {
      this.playQuestComplete();
    }, 400);
  }
}

export const soundFx = new SoundSynthesizer();
