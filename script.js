/**
 * ============================================================================
 * SHADOW SHOP — A Polished, Beginner-Friendly Puzzle Game
 * ============================================================================
 * Architecture:
 *   1. SoundManager: Pure Web Audio API synthesized music and sound effects.
 *   2. Level Definitions: Exactly 3 playable, tested, solvable levels.
 *   3. GameEngine: Grid logic, collision, shadow dragging, tethering & goals.
 *   4. CanvasRenderer: High-DPI 2D rendering with cute animations & particles.
 *   5. UIController: Modals, HUD, instructional hints, arrows & touch D-pad.
 *   6. StorageManager: LocalStorage persistence for settings & level progress.
 * ============================================================================
 */

'use strict';

/* ============================================================================
   1. SOUND MANAGER (Web Audio API Synthesizer)
   ============================================================================ */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    // Default settings
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.7;

    // Music playback state
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.melodyIndex = 0;
    this.hasUserInteracted = false;

    // Movement sound throttler (prevent machine-gunning audio)
    this.lastStepTime = 0;
    this.lastDragTime = 0;

    // Pentatonic scale frequencies for dreamy ambient music (C minor / Eb major pentatonic)
    // Eb3, G3, Bb3, C4, Eb4, F4, G4, Bb4, C5
    this.melodyNotes = [
      { note: 261.63, dur: 0.6 }, // C4
      { note: 311.13, dur: 0.6 }, // Eb4
      { note: 349.23, dur: 0.6 }, // F4
      { note: 392.00, dur: 1.0 }, // G4
      { note: 349.23, dur: 0.5 }, // F4
      { note: 311.13, dur: 0.5 }, // Eb4
      { note: 261.63, dur: 1.2 }, // C4
      { note: 0,      dur: 0.4 }, // Rest
      { note: 392.00, dur: 0.6 }, // G4
      { note: 466.16, dur: 0.6 }, // Bb4
      { note: 523.25, dur: 1.2 }, // C5
      { note: 466.16, dur: 0.6 }, // Bb4
      { note: 392.00, dur: 0.8 }, // G4
      { note: 311.13, dur: 1.2 }, // Eb4
      { note: 0,      dur: 0.6 }, // Rest
    ];

    this.bassNotes = [
      130.81, // C3
      103.83, // Ab2
      116.54, // Bb2
      155.56  // Eb3
    ];
    this.bassIndex = 0;

    this.loadSettings();
  }

  /**
   * Lazily initializes Web Audio context upon the first user gesture.
   */
  initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Separate Music bus
      this.musicGain = this.ctx.createGain();
      this.updateMusicVolume();
      this.musicGain.connect(this.masterGain);

      // Separate SFX bus
      this.sfxGain = this.ctx.createGain();
      this.updateSfxVolume();
      this.sfxGain.connect(this.masterGain);

      if (this.musicEnabled) {
        this.startMusic();
      }
    } catch (err) {
      console.warn('Web Audio could not be initialized:', err);
    }
  }

  registerUserInteraction() {
    this.hasUserInteracted = true;
    this.initContext();
  }

  /* ---------------- Settings & Persistence ---------------- */

  loadSettings() {
    try {
      const saved = localStorage.getItem('shadow_shop_audio_settings');
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data.musicEnabled === 'boolean') this.musicEnabled = data.musicEnabled;
        if (typeof data.sfxEnabled === 'boolean') this.sfxEnabled = data.sfxEnabled;
        if (typeof data.musicVolume === 'number') this.musicVolume = data.musicVolume;
        if (typeof data.sfxVolume === 'number') this.sfxVolume = data.sfxVolume;
      }
    } catch (e) {
      console.warn('Could not read audio settings from localStorage:', e);
    }
  }

  saveSettings() {
    try {
      const data = {
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume
      };
      localStorage.setItem('shadow_shop_audio_settings', JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save audio settings to localStorage:', e);
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    this.updateMusicVolume();
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    this.saveSettings();
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    this.updateSfxVolume();
    this.saveSettings();
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.updateMusicVolume();
    this.saveSettings();
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.updateSfxVolume();
    this.saveSettings();
  }

  updateMusicVolume() {
    if (!this.musicGain || !this.ctx) return;
    const targetGain = this.musicEnabled ? this.musicVolume * 0.35 : 0;
    this.musicGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  updateSfxVolume() {
    if (!this.sfxGain || !this.ctx) return;
    const targetGain = this.sfxEnabled ? this.sfxVolume * 0.8 : 0;
    this.sfxGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  /* ---------------- Music Synthesizer Loop ---------------- */

  startMusic() {
    if (!this.musicEnabled || this.isPlayingMusic) return;
    if (!this.ctx) {
      this.initContext();
      if (!this.ctx) return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.isPlayingMusic = true;
    this.playNextMusicNote();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playNextMusicNote() {
    if (!this.isPlayingMusic || !this.musicEnabled || !this.ctx) return;

    const noteItem = this.melodyNotes[this.melodyIndex];
    const duration = noteItem.dur;
    const freq = noteItem.note;

    if (freq > 0) {
      try {
        const now = this.ctx.currentTime;
        // Soft Rhodes / music box bell timbre: Sine + soft triangle through lowpass filter
        const osc = this.ctx.createOscillator();
        const oscHarmonic = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const noteGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        oscHarmonic.type = 'triangle';
        oscHarmonic.frequency.setValueAtTime(freq * 2, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.Q.setValueAtTime(1.2, now);

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.35, now + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        oscHarmonic.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.musicGain);

        osc.start(now);
        oscHarmonic.start(now);
        osc.stop(now + duration);
        oscHarmonic.stop(now + duration);
      } catch (e) {
        // Audio error caught gracefully
      }
    }

    // Occasional gentle ambient bass note
    if (this.melodyIndex % 4 === 0) {
      try {
        const now = this.ctx.currentTime;
        const bassFreq = this.bassNotes[this.bassIndex % this.bassNotes.length];
        this.bassIndex++;

        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(0.25, now + 0.1);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);

        bassOsc.start(now);
        bassOsc.stop(now + 1.9);
      } catch (e) {}
    }

    this.melodyIndex = (this.melodyIndex + 1) % this.melodyNotes.length;

    // Schedule next note with a gentle swing
    const delayMs = duration * 680;
    this.musicTimer = setTimeout(() => this.playNextMusicNote(), delayMs);
  }

  /* ---------------- Sound Effects (Gentle & Tactile) ---------------- */

  /**
   * Character movement footstep: cute gentle pop
   */
  playStep() {
    if (!this.sfxEnabled || !this.ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastStepTime < 140) return; // Throttled
    this.lastStepTime = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260 + Math.random() * 40, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  /**
   * Shadow dragging sound: ethereal magical shimmer
   */
  playShadowDrag() {
    if (!this.sfxEnabled || !this.ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastDragTime < 240) return; // Throttled
    this.lastDragTime = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.linearRampToValueAtTime(740, now + 0.14);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.17);
    } catch (e) {}
  }

  /**
   * Shadow star collection: sparkling ascending chime arpeggio
   */
  playStarCollect() {
    if (!this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const start = now + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.28, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(start);
        osc.stop(start + 0.36);
      });
    } catch (e) {}
  }

  /**
   * Switch activation: tactile mechanical click + crystal chime
   */
  playSwitch() {
    if (!this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      // Part 1: Crisp click transient
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(800, now);
      clickOsc.frequency.exponentialRampToValueAtTime(120, now + 0.03);
      clickGain.gain.setValueAtTime(0.2, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      clickOsc.connect(clickGain);
      clickGain.connect(this.sfxGain);
      clickOsc.start(now);
      clickOsc.stop(now + 0.04);

      // Part 2: Crystal resonance chime
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(880, now + 0.02); // A5
      chimeGain.gain.setValueAtTime(0.3, now + 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      chimeOsc.start(now + 0.02);
      chimeOsc.stop(now + 0.52);
    } catch (e) {}
  }

  /**
   * Door unlocked sound: resonant opening major chord chime
   */
  playDoorUnlock() {
    if (!this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const chord = [311.13, 392.00, 466.16, 622.25]; // Eb4, G4, Bb4, Eb5

      chord.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.95);
      });
    } catch (e) {}
  }

  /**
   * Victory sound: cheerful celebratory jingle
   */
  playVictory() {
    if (!this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const melody = [
        { f: 523.25, t: 0.00, d: 0.15 }, // C5
        { f: 659.25, t: 0.14, d: 0.15 }, // E5
        { f: 783.99, t: 0.28, d: 0.18 }, // G5
        { f: 1046.50, t: 0.46, d: 0.65 } // C6
      ];

      melody.forEach(n => {
        const start = now + n.t;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, start);

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(start);
        osc.stop(start + n.d + 0.05);
      });
    } catch (e) {}
  }

  /**
   * Button click sound: soft tactile tap
   */
  playButtonClick() {
    if (!this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  /**
   * Wall bump sound: gentle dull bonk
   */
  playWallBump() {
    if (!this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }
}

/* ============================================================================
   2. LEVEL DEFINITIONS (Exactly 3 Playable & Tested Levels)
   ============================================================================ */

/**
 * Tile Types:
 * 0 = Floor
 * 1 = Wall (blocks player; shadow can pass through inside shadow area)
 * 2 = Gate (unlocked by switch; blocks player while closed)
 */
const LEVELS = [
  // ---------------- LEVEL 1 — LEARN THE SHADOW ----------------
  {
    id: 1,
    name: 'Learn the Shadow',
    description: 'Introduce the character, shadow, star, and exit.',
    cols: 10,
    rows: 7,
    playerStart: { x: 2, y: 3 },
    shadowStart: { x: 3, y: 3 },
    // Tether radius is unlimited/full room for Level 1
    tetherRadius: 99,
    // Outer boundaries are walls
    walls: [
      // Top & Bottom border walls
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }, { x: 8, y: 0 }, { x: 9, y: 0 },
      { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 },
      // Left & Right borders
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 },
      { x: 9, y: 1 }, { x: 9, y: 2 }, { x: 9, y: 3 }, { x: 9, y: 4 }, { x: 9, y: 5 },
    ],
    gates: [],
    switches: [],
    stars: [
      { id: 'star1', x: 6, y: 3, collected: false }
    ],
    exit: { x: 8, y: 3, unlocked: false },
    instructions: {
      initial: 'Drag your shadow onto the star!',
      afterStar: 'Great! Now move your character to the exit!',
      hint: 'Hold your mouse or finger on the purple shadow and drag it onto the glowing star!'
    }
  },

  // ---------------- LEVEL 2 — BEHIND THE WALL ----------------
  {
    id: 2,
    name: 'Behind the Wall',
    description: 'Place a switch behind a wall that the character cannot cross.',
    cols: 10,
    rows: 7,
    playerStart: { x: 2, y: 3 },
    shadowStart: { x: 3, y: 3 },
    tetherRadius: 99, // Marked shadow area covers the chamber across the wall
    walls: [
      // Outer borders
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }, { x: 8, y: 0 }, { x: 9, y: 0 },
      { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 },
      { x: 9, y: 1 }, { x: 9, y: 2 }, { x: 9, y: 3 }, { x: 9, y: 4 }, { x: 9, y: 5 },
      // Dividing vertical wall down column 5
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 5 }
    ],
    gates: [
      // Magical gate at (5, 3) between left and right sides
      { id: 'gate1', x: 5, y: 3, open: false }
    ],
    switches: [
      // Switch behind the wall at (7, 3)
      { id: 'sw1', x: 7, y: 3, activated: false, linkedGate: 'gate1' }
    ],
    stars: [],
    exit: { x: 8, y: 3, unlocked: false },
    instructions: {
      initial: 'Character cannot cross the wall, but your shadow passes right through! Drag your shadow to the switch.',
      afterSwitch: 'The gate has unlocked! Guide Lumi through to the exit.',
      hint: 'Walls block your character, but your purple shadow can glide right through them! Drag your shadow across the wall onto the switch.'
    }
  },

  // ---------------- LEVEL 3 — THE FINAL SHADOW CHALLENGE ----------------
  {
    id: 3,
    name: 'The Final Shadow Challenge',
    description: 'Combine stars, multiple switches, walls, and an exit requiring character movement and shadow dragging.',
    cols: 11,
    rows: 8,
    playerStart: { x: 1, y: 4 },
    shadowStart: { x: 2, y: 4 },
    // Tether radius: 4.2 tiles! Lumi must walk to corridors to bring Umbra in reach of chambers.
    tetherRadius: 4.2,
    walls: [
      // Outer borders
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }, { x: 8, y: 0 }, { x: 9, y: 0 }, { x: 10, y: 0 },
      { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 }, { x: 10, y: 7 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 },
      { x: 10, y: 1 }, { x: 10, y: 2 }, { x: 10, y: 3 }, { x: 10, y: 4 }, { x: 10, y: 5 }, { x: 10, y: 6 },

      // North Chamber dividing wall (row 2, cols 1 to 4)
      { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 },
      // Partition wall down column 5 (rows 1, 2, 5, 6)
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 5 }, { x: 5, y: 6 },
      // South Chamber dividing wall (row 5, cols 6 to 9)
      { x: 6, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 }
    ],
    gates: [
      // Gate 1 between West and East corridors at (5, 4)
      { id: 'gate1', x: 5, y: 4, open: false }
    ],
    switches: [
      // Switch 1 in North Chamber at (3, 1) -> opens Gate 1
      { id: 'sw1', x: 3, y: 1, activated: false, linkedGate: 'gate1' },
      // Switch 2 in South Chamber at (7, 6) -> unlocks Exit
      { id: 'sw2', x: 7, y: 6, activated: false, opensExit: true }
    ],
    stars: [
      // Star 1 in North Chamber at (1, 1)
      { id: 'star1', x: 1, y: 1, collected: false },
      // Star 2 in South Chamber at (9, 6)
      { id: 'star2', x: 9, y: 6, collected: false }
    ],
    exit: { x: 9, y: 2, unlocked: false },
    instructions: {
      initial: 'Move Lumi & drag Umbra together. Collect stars and activate both switches!',
      gateOpened: 'Gate 1 is open! Move Lumi into the eastern hallway to reach the next switch.',
      allSwitches: 'All switches active! The grand exit has opened.',
      hint: 'Lumi must move closer so your shadow’s magical range can reach each room’s switch and star!'
    }
  }
];

/* ============================================================================
   3. GAME ENGINE & STATE
   ============================================================================ */
class GameEngine {
  constructor(soundManager) {
    this.sound = soundManager;
    this.currentLevelIndex = 0;
    this.level = null;

    // Player state (Lumi)
    this.player = {
      x: 0,
      y: 0,
      renderX: 0,
      renderY: 0,
      facing: 'right',
      walking: false,
      walkAnimTime: 0
    };

    // Shadow state (Umbra)
    this.shadow = {
      x: 0,
      y: 0,
      renderX: 0,
      renderY: 0,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      glowPulse: 0
    };

    // Level state
    this.walls = new Set();
    this.gates = [];
    this.switches = [];
    this.stars = [];
    this.exit = null;
    this.isLevelCompleted = false;

    // Hint timer
    this.levelStartTime = Date.now();
    this.lastActionTime = Date.now();
    this.stuckHintTriggered = false;

    // Particles array
    this.particles = [];

    // Storage for unlocked levels
    this.unlockedLevel = 1;
    this.loadProgress();
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('shadow_shop_unlocked_level');
      if (saved) {
        this.unlockedLevel = Math.max(1, parseInt(saved, 10) || 1);
      }
    } catch (e) {}
  }

  saveProgress() {
    try {
      localStorage.setItem('shadow_shop_unlocked_level', this.unlockedLevel.toString());
    } catch (e) {}
  }

  resetProgress() {
    this.unlockedLevel = 1;
    this.saveProgress();
  }

  loadLevel(levelIndex) {
    if (levelIndex < 0 || levelIndex >= LEVELS.length) levelIndex = 0;
    this.currentLevelIndex = levelIndex;
    const def = LEVELS[levelIndex];

    this.level = {
      id: def.id,
      name: def.name,
      description: def.description,
      cols: def.cols,
      rows: def.rows,
      tetherRadius: def.tetherRadius,
      instructions: def.instructions
    };

    // Setup player
    this.player.x = def.playerStart.x;
    this.player.y = def.playerStart.y;
    this.player.renderX = def.playerStart.x;
    this.player.renderY = def.playerStart.y;
    this.player.facing = 'right';
    this.player.walking = false;

    // Setup shadow
    this.shadow.x = def.shadowStart.x;
    this.shadow.y = def.shadowStart.y;
    this.shadow.renderX = def.shadowStart.x;
    this.shadow.renderY = def.shadowStart.y;
    this.shadow.isDragging = false;

    // Walls set
    this.walls = new Set();
    def.walls.forEach(w => this.walls.add(`${w.x},${w.y}`));

    // Deep copy gates, switches, stars, exit
    this.gates = def.gates.map(g => ({ ...g, open: false }));
    this.switches = def.switches.map(s => ({ ...s, activated: false }));
    this.stars = def.stars.map(st => ({ ...st, collected: false }));
    this.exit = { ...def.exit, unlocked: false };

    this.isLevelCompleted = false;
    this.levelStartTime = Date.now();
    this.lastActionTime = Date.now();
    this.stuckHintTriggered = false;
    this.particles = [];
  }

  restartCurrentLevel() {
    this.loadLevel(this.currentLevelIndex);
  }

  /* ---------------- Player Movement & Wall Collision ---------------- */

  movePlayer(dx, dy) {
    if (this.isLevelCompleted) return;

    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    if (dx > 0) this.player.facing = 'right';
    else if (dx < 0) this.player.facing = 'left';

    // Check bounds
    if (newX < 0 || newX >= this.level.cols || newY < 0 || newY >= this.level.rows) {
      this.sound.playWallBump();
      return;
    }

    // Check wall collision
    if (this.walls.has(`${newX},${newY}`)) {
      this.sound.playWallBump();
      this.recordWallBump();
      return;
    }

    // Check closed gate collision
    const closedGate = this.gates.find(g => g.x === newX && g.y === newY && !g.open);
    if (closedGate) {
      this.sound.playWallBump();
      this.recordWallBump();
      return;
    }

    // Move is valid
    this.player.x = newX;
    this.player.y = newY;
    this.player.walking = true;
    this.player.walkAnimTime = 0.2;
    this.lastActionTime = Date.now();

    this.sound.playStep();

    // Check if player stepped on the Exit
    this.checkExit();
  }

  recordWallBump() {
    this.lastActionTime = Date.now();
  }

  /* ---------------- Shadow Dragging & Permissions ---------------- */

  /**
   * Distance between Lumi and a coordinate (used for tether checking)
   */
  getDistanceToPlayer(x, y) {
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Checks if coordinate is within shadow's permitted movement zone.
   * In levels 1 & 2, full room within bounds is permitted.
   * In level 3, must be within tether radius of Lumi.
   */
  isShadowPositionAllowed(x, y) {
    if (x < 0 || x >= this.level.cols || y < 0 || y >= this.level.rows) return false;
    const dist = this.getDistanceToPlayer(x, y);
    return dist <= this.level.tetherRadius;
  }

  startShadowDrag(gridX, gridY) {
    if (this.isLevelCompleted) return;
    this.shadow.isDragging = true;
    this.sound.playShadowDrag();
    this.updateShadowPosition(gridX, gridY);
  }

  updateShadowPosition(targetX, targetY) {
    if (!this.shadow.isDragging || this.isLevelCompleted) return;

    // Clamp inside board bounds
    targetX = Math.max(0.5, Math.min(this.level.cols - 0.5, targetX));
    targetY = Math.max(0.5, Math.min(this.level.rows - 0.5, targetY));

    // Clamp by tether radius if tether is enabled
    if (this.level.tetherRadius < 90) {
      const dx = targetX - this.player.x;
      const dy = targetY - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > this.level.tetherRadius) {
        targetX = this.player.x + (dx / dist) * this.level.tetherRadius;
        targetY = this.player.y + (dy / dist) * this.level.tetherRadius;
      }
    }

    this.shadow.x = targetX;
    this.shadow.y = targetY;
    this.lastActionTime = Date.now();

    // Add trailing magical particle
    if (Math.random() < 0.4) {
      this.addParticle(this.shadow.x, this.shadow.y, '#c084fc', 1.2);
    }

    this.sound.playShadowDrag();

    // Test triggers with discrete grid cell (nearest integer)
    const gridCellX = Math.round(this.shadow.x);
    const gridCellY = Math.round(this.shadow.y);
    this.checkShadowInteractions(gridCellX, gridCellY);
  }

  endShadowDrag() {
    if (!this.shadow.isDragging) return;
    this.shadow.isDragging = false;
    // Snap shadow to nearest cell
    this.shadow.x = Math.round(this.shadow.x);
    this.shadow.y = Math.round(this.shadow.y);
  }

  /* ---------------- Triggers & Goals ---------------- */

  checkShadowInteractions(gx, gy) {
    // 1. Star collection
    this.stars.forEach(st => {
      if (!st.collected && st.x === gx && st.y === gy) {
        st.collected = true;
        this.sound.playStarCollect();
        this.spawnBurst(st.x, st.y, '#fde047', 16);
        this.evaluateExitStatus();
      }
    });

    // 2. Switch activation
    this.switches.forEach(sw => {
      if (!sw.activated && sw.x === gx && sw.y === gy) {
        sw.activated = true;
        this.sound.playSwitch();
        this.spawnBurst(sw.x, sw.y, '#38bdf8', 14);

        // Open linked gate if any
        if (sw.linkedGate) {
          const gate = this.gates.find(g => g.id === sw.linkedGate);
          if (gate && !gate.open) {
            gate.open = true;
            this.sound.playDoorUnlock();
            this.spawnBurst(gate.x, gate.y, '#a855f7', 12);
          }
        }

        this.evaluateExitStatus();
      }
    });
  }

  evaluateExitStatus() {
    // Rule:
    // Level 1: Requires 1 star collected -> Exit unlocks!
    // Level 2: Requires 1 switch activated -> Exit unlocks!
    // Level 3: Requires all switches activated and all stars collected -> Exit unlocks!
    const allStars = this.stars.every(s => s.collected);
    const allSwitches = this.switches.every(sw => sw.activated);

    let shouldUnlock = false;
    if (this.level.id === 1) {
      shouldUnlock = allStars;
    } else if (this.level.id === 2) {
      shouldUnlock = allSwitches;
    } else if (this.level.id === 3) {
      shouldUnlock = allSwitches && allStars;
    }

    if (shouldUnlock && !this.exit.unlocked) {
      this.exit.unlocked = true;
      this.sound.playDoorUnlock();
      this.spawnBurst(this.exit.x, this.exit.y, '#4ade80', 20);
    }
  }

  checkExit() {
    if (this.exit.unlocked && this.player.x === this.exit.x && this.player.y === this.exit.y) {
      this.completeLevel();
    }
  }

  completeLevel() {
    if (this.isLevelCompleted) return;
    this.isLevelCompleted = true;
    this.sound.playVictory();

    // Unlock next level in progress
    if (this.currentLevelIndex + 2 > this.unlockedLevel && this.currentLevelIndex + 2 <= 3) {
      this.unlockedLevel = this.currentLevelIndex + 2;
      this.saveProgress();
    }

    if (window.uiController) {
      window.uiController.onLevelCompleted(this.level.id);
    }
  }

  /* ---------------- Particle Spawners ---------------- */

  addParticle(x, y, color, sizeMultiplier = 1) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.4,
      y: y + (Math.random() - 0.5) * 0.4,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5 - 0.5,
      color: color,
      radius: (Math.random() * 3 + 2) * sizeMultiplier,
      alpha: 1.0,
      life: 0.6 + Math.random() * 0.4
    });
  }

  spawnBurst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 1.2 + Math.random() * 2.0;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        radius: Math.random() * 3.5 + 2,
        alpha: 1.0,
        life: 0.8 + Math.random() * 0.5
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt / p.life;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
}

/* ============================================================================
   4. CANVAS RENDERER (High-DPI Cute Aesthetic Renderer)
   ============================================================================ */
class CanvasRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;

    this.tileSize = 48;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dpr = window.devicePixelRatio || 1;

    this.lastTime = performance.now();
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.globalAnimTime = 0;

    this.setupResizeListener();
  }

  setupResizeListener() {
    window.addEventListener('resize', () => this.resize());
    // Initial resize
    setTimeout(() => this.resize(), 50);
  }

  resize() {
    const container = this.canvas.parentElement;
    if (!container || !this.engine.level) return;

    const availableW = container.clientWidth - 20;
    const availableH = container.clientHeight - 20;

    const cols = this.engine.level.cols;
    const rows = this.engine.level.rows;

    // Calculate max tile size that fits nicely
    const maxTileW = Math.floor(availableW / cols);
    const maxTileH = Math.floor(availableH / rows);
    this.tileSize = Math.max(32, Math.min(64, Math.min(maxTileW, maxTileH)));

    const width = cols * this.tileSize;
    const height = rows * this.tileSize;

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    this.offsetX = 0;
    this.offsetY = 0;
  }

  start() {
    const loop = (now) => {
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    this.globalAnimTime += dt;

    // Smooth player movement interpolation
    const p = this.engine.player;
    p.renderX += (p.x - p.renderX) * 12 * dt;
    p.renderY += (p.y - p.renderY) * 12 * dt;

    // Smooth shadow movement interpolation if not dragging
    const s = this.engine.shadow;
    if (!s.isDragging) {
      s.renderX += (s.x - s.renderX) * 14 * dt;
      s.renderY += (s.y - s.renderY) * 14 * dt;
    } else {
      s.renderX = s.x;
      s.renderY = s.y;
    }

    // Blinking animation
    this.blinkTimer += dt;
    if (this.blinkTimer > 3.5) {
      this.isBlinking = true;
      if (this.blinkTimer > 3.7) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }

    // Update particles
    this.engine.updateParticles(dt);
  }

  render() {
    const ctx = this.ctx;
    const cols = this.engine.level.cols;
    const rows = this.engine.level.rows;
    const ts = this.tileSize;

    ctx.clearRect(0, 0, cols * ts, rows * ts);

    // 1. Draw Floor Tiles
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const isAlternate = (x + y) % 2 === 0;
        ctx.fillStyle = isAlternate ? '#231b42' : '#271f49';
        ctx.fillRect(x * ts, y * ts, ts, ts);

        // Soft subtle grid borders
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * ts, y * ts, ts, ts);
      }
    }

    // 2. Draw Shadow Tether Zone (Permitted Area)
    this.drawShadowPermittedArea(ctx, ts);

    // 3. Draw Switches
    this.engine.switches.forEach(sw => this.drawSwitch(ctx, sw, ts));

    // 4. Draw Stars
    this.engine.stars.forEach(st => {
      if (!st.collected) this.drawStar(ctx, st, ts);
    });

    // 5. Draw Exit Portal
    if (this.engine.exit) {
      this.drawExit(ctx, this.engine.exit, ts);
    }

    // 6. Draw Gates
    this.engine.gates.forEach(g => this.drawGate(ctx, g, ts));

    // 7. Draw Walls
    this.engine.walls.forEach(coord => {
      const [wx, wy] = coord.split(',').map(Number);
      this.drawWall(ctx, wx, wy, ts);
    });

    // 8. Draw Magical Tether Line connecting Lumi and Umbra
    this.drawTetherLine(ctx, ts);

    // 9. Draw Shadow (Umbra)
    this.drawShadow(ctx, ts);

    // 10. Draw Character (Lumi)
    this.drawPlayer(ctx, ts);

    // 11. Draw Particles
    this.drawParticles(ctx, ts);
  }

  /* ---------------- Drawing Helper Functions ---------------- */

  drawShadowPermittedArea(ctx, ts) {
    const level = this.engine.level;
    const p = this.engine.player;

    if (level.tetherRadius < 90) {
      // Dynamic tether zone centered on Lumi (Level 3)
      const centerX = (p.renderX + 0.5) * ts;
      const centerY = (p.renderY + 0.5) * ts;
      const radius = level.tetherRadius * ts;

      ctx.save();
      const grad = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
      grad.addColorStop(0, 'rgba(192, 132, 252, 0.12)');
      grad.addColorStop(0.7, 'rgba(147, 51, 234, 0.08)');
      grad.addColorStop(1, 'rgba(147, 51, 234, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Dotted glowing boundary
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -this.globalAnimTime * 15;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      // Full marked shadow area (Levels 1 & 2): gentle purple ambient tint
      ctx.fillStyle = 'rgba(147, 51, 234, 0.04)';
      ctx.fillRect(ts, ts, (level.cols - 2) * ts, (level.rows - 2) * ts);
    }
  }

  drawWall(ctx, x, y, ts) {
    const px = x * ts;
    const py = y * ts;
    const pad = 3;
    const r = 8;

    ctx.save();
    // Drop shadow
    ctx.fillStyle = 'rgba(10, 6, 24, 0.5)';
    this.roundRect(ctx, px + pad, py + pad + 3, ts - pad * 2, ts - pad * 2, r);
    ctx.fill();

    // Wall base gradient
    const grad = ctx.createLinearGradient(px, py, px, py + ts);
    grad.addColorStop(0, '#533e7d');
    grad.addColorStop(1, '#3a2b5c');
    ctx.fillStyle = grad;
    this.roundRect(ctx, px + pad, py + pad, ts - pad * 2, ts - pad * 2, r);
    ctx.fill();

    // Soft highlight border
    ctx.strokeStyle = '#7c62ad';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner subtle brick texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(px + pad + 4, py + pad + 4, ts - pad * 2 - 8, 4);
    ctx.restore();
  }

  drawGate(ctx, gate, ts) {
    const px = gate.x * ts;
    const py = gate.y * ts;

    if (gate.open) {
      // Opened gate: glowing unlocked floor rune
      ctx.save();
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 6, py + 6, ts - 12, ts - 12);
      ctx.restore();
      return;
    }

    // Closed gate: glowing magical crystal barrier
    ctx.save();
    const grad = ctx.createLinearGradient(px, py, px + ts, py);
    grad.addColorStop(0, '#7e22ce');
    grad.addColorStop(0.5, '#c084fc');
    grad.addColorStop(1, '#7e22ce');

    ctx.fillStyle = 'rgba(147, 51, 234, 0.35)';
    ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);

    // Bars
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i++) {
      const bx = px + (ts / 4) * i;
      ctx.beginPath();
      ctx.moveTo(bx, py + 4);
      ctx.lineTo(bx, py + ts - 4);
      ctx.stroke();
    }

    // Gate lock crystal
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(px + ts / 2, py + ts / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawSwitch(ctx, sw, ts) {
    const cx = (sw.x + 0.5) * ts;
    const cy = (sw.y + 0.5) * ts;
    const r = ts * 0.32;

    ctx.save();
    // Base plate
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = sw.activated ? '#065f46' : '#2e1065';
    ctx.fill();

    ctx.strokeStyle = sw.activated ? '#34d399' : '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner glowing crystal
    const pulse = Math.sin(this.globalAnimTime * 4) * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, (r * 0.55) + (sw.activated ? 1 : pulse * 0.3), 0, Math.PI * 2);
    ctx.fillStyle = sw.activated ? '#4ade80' : '#c084fc';
    ctx.shadowColor = sw.activated ? '#4ade80' : '#c084fc';
    ctx.shadowBlur = sw.activated ? 14 : 8;
    ctx.fill();
    ctx.restore();
  }

  drawStar(ctx, st, ts) {
    const cx = (st.x + 0.5) * ts;
    const floatY = Math.sin(this.globalAnimTime * 3) * 4;
    const cy = (st.y + 0.5) * ts + floatY;
    const r = ts * 0.3;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.globalAnimTime * 1.2);

    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;

    // Draw 5-pointed star
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * r, -Math.sin((18 + i * 72) * Math.PI / 180) * r);
      ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (r * 0.45), -Math.sin((54 + i * 72) * Math.PI / 180) * (r * 0.45));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawExit(ctx, exit, ts) {
    const px = exit.x * ts;
    const py = exit.y * ts;
    const cx = px + ts / 2;
    const cy = py + ts / 2;

    ctx.save();
    if (exit.unlocked) {
      // Unlocked Portal: Golden swirling gateway
      const pulse = Math.sin(this.globalAnimTime * 3.5) * 3;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, ts * 0.45 + pulse);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#fef08a');
      grad.addColorStop(0.7, '#4ade80');
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, ts * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // Archway outline
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, ts * 0.38, Math.PI, 0, false);
      ctx.lineTo(cx + ts * 0.38, py + ts - 4);
      ctx.lineTo(cx - ts * 0.38, py + ts - 4);
      ctx.closePath();
      ctx.stroke();
    } else {
      // Locked door: Dark purple archway with lock
      ctx.fillStyle = '#2c1e4a';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(cx, cy, ts * 0.36, Math.PI, 0, false);
      ctx.lineTo(cx + ts * 0.36, py + ts - 4);
      ctx.lineTo(cx - ts * 0.36, py + ts - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Lock icon
      ctx.fillStyle = '#f472b6';
      ctx.font = `${Math.floor(ts * 0.35)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', cx, cy + 2);
    }
    ctx.restore();
  }

  drawTetherLine(ctx, ts) {
    const p = this.engine.player;
    const s = this.engine.shadow;

    const px = (p.renderX + 0.5) * ts;
    const py = (p.renderY + 0.5) * ts;
    const sx = (s.renderX + 0.5) * ts;
    const sy = (s.renderY + 0.5) * ts;

    ctx.save();
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -this.globalAnimTime * 20;

    // Slight curve in tether line
    const midX = (px + sx) / 2;
    const midY = (py + sy) / 2 + Math.sin(this.globalAnimTime * 3) * 6;

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(midX, midY, sx, sy);
    ctx.stroke();
    ctx.restore();
  }

  drawShadow(ctx, ts) {
    const s = this.engine.shadow;
    const cx = (s.renderX + 0.5) * ts;
    const cy = (s.renderY + 0.5) * ts;
    const floatY = Math.sin(this.globalAnimTime * 3.2) * 3;
    const r = ts * 0.32;

    ctx.save();
    ctx.translate(cx, cy + floatY);

    // Ethereal outer glow aura
    const glowGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.5);
    glowGrad.addColorStop(0, 'rgba(192, 132, 252, 0.6)');
    glowGrad.addColorStop(0.7, 'rgba(147, 51, 234, 0.25)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Shadow body (living purple teardrop/orb)
    const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, r);
    bodyGrad.addColorStop(0, '#c084fc');
    bodyGrad.addColorStop(0.6, '#9333ea');
    bodyGrad.addColorStop(1, '#581c87');
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = s.isDragging ? 18 : 10;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Glowing lilac shadow eyes
    ctx.fillStyle = '#f5d0fe';
    ctx.shadowColor = '#f5d0fe';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.1, 3, 0, Math.PI * 2);
    ctx.arc(r * 0.32, -r * 0.1, 3, 0, Math.PI * 2);
    ctx.fill();

    // If dragging, show cute animated sparkle ring
    if (s.isDragging) {
      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawPlayer(ctx, ts) {
    const p = this.engine.player;
    const cx = (p.renderX + 0.5) * ts;
    const cy = (p.renderY + 0.5) * ts;
    const r = ts * 0.32;
    const isFacingLeft = p.facing === 'left';

    // Walk bounce
    const bounce = p.walking ? Math.abs(Math.sin(this.globalAnimTime * 12)) * 3 : 0;

    ctx.save();
    ctx.translate(cx, cy - bounce);
    if (isFacingLeft) ctx.scale(-1, 1);

    // Floor shadow under Lumi
    ctx.save();
    ctx.fillStyle = 'rgba(10, 6, 24, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, r + 2, r * 0.8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ears (bunny / mythical creature ears)
    const earWiggle = Math.sin(this.globalAnimTime * 4) * 0.1;
    this.drawEar(ctx, -r * 0.4, -r * 0.7, -0.2 + earWiggle, r);
    this.drawEar(ctx, r * 0.4, -r * 0.7, 0.2 - earWiggle, r);

    // Cute Round Head / Body
    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.75, '#fef3c7');
    grad.addColorStop(1, '#fde68a');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1e1b4b';
    ctx.shadowBlur = 0;
    if (this.isBlinking) {
      // Blink line
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -1);
      ctx.lineTo(-r * 0.15, -1);
      ctx.moveTo(r * 0.15, -1);
      ctx.lineTo(r * 0.4, -1);
      ctx.stroke();
    } else {
      // Big shiny eyes
      ctx.beginPath();
      ctx.ellipse(-r * 0.28, -2, 3, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(r * 0.28, -2, 3, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-r * 0.32, -4, 1.3, 0, Math.PI * 2);
      ctx.arc(r * 0.24, -4, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rosy blushing cheeks
    ctx.fillStyle = '#f472b6';
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(-r * 0.5, 5, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.5, 5, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Cute mouth
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 3, 3, 0.2, Math.PI - 0.2, false);
    ctx.stroke();

    ctx.restore();
  }

  drawEar(ctx, x, y, angle, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Outer ear
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.4, r * 0.22, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner pink ear
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.4, r * 0.12, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawParticles(ctx, ts) {
    this.engine.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x * ts, p.y * ts, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/* ============================================================================
   5. UI CONTROLLER (HUD, Modals, Instructions & Audio Controls)
   ============================================================================ */
class UIController {
  constructor(engine, soundManager, renderer) {
    this.engine = engine;
    this.sound = soundManager;
    this.renderer = renderer;

    this.cacheDOMElements();
    this.bindEvents();
    this.startHintWatchdog();

    // Initial HUD update
    this.updateHUD();
    this.updateLevelSelectCards();
  }

  cacheDOMElements() {
    // HUD
    this.hudLevelNum = document.getElementById('hudLevelNum');
    this.hudLevelName = document.getElementById('hudLevelName');
    this.starCount = document.getElementById('starCount');
    this.switchCount = document.getElementById('switchCount');
    this.chipDoor = document.getElementById('chipDoor');
    this.doorIcon = document.getElementById('doorIcon');
    this.doorText = document.getElementById('doorText');

    // In-game banner & pointer
    this.instructionBanner = document.getElementById('instructionBanner');
    this.bannerText = document.getElementById('bannerText');
    this.bannerDismiss = document.getElementById('bannerDismiss');
    this.targetPointer = document.getElementById('targetPointer');
    this.dragHint = document.getElementById('dragHint');
    this.btnHint = document.getElementById('btnHint');

    // Modals
    this.modalHome = document.getElementById('modalHome');
    this.modalLevelSelect = document.getElementById('modalLevelSelect');
    this.modalHowToPlay = document.getElementById('modalHowToPlay');
    this.modalSettings = document.getElementById('modalSettings');
    this.modalLevelComplete = document.getElementById('modalLevelComplete');
    this.modalVictory = document.getElementById('modalVictory');
    this.modalConfirmHome = document.getElementById('modalConfirmHome');

    // Audio & Settings Elements
    this.toggleMusic = document.getElementById('toggleMusic');
    this.toggleSfx = document.getElementById('toggleSfx');
    this.sliderMusicVol = document.getElementById('sliderMusicVol');
    this.sliderSfxVol = document.getElementById('sliderSfxVol');
    this.labelMusicVol = document.getElementById('labelMusicVol');
    this.labelSfxVol = document.getElementById('labelSfxVol');
    this.btnTestAudio = document.getElementById('btnTestAudio');
    this.btnResetProgress = document.getElementById('btnResetProgress');

    // Sync settings values with soundManager
    this.syncSettingsUI();
  }

  syncSettingsUI() {
    this.toggleMusic.checked = this.sound.musicEnabled;
    this.toggleSfx.checked = this.sound.sfxEnabled;
    this.sliderMusicVol.value = Math.round(this.sound.musicVolume * 100);
    this.sliderSfxVol.value = Math.round(this.sound.sfxVolume * 100);
    this.labelMusicVol.textContent = `${this.sliderMusicVol.value}%`;
    this.labelSfxVol.textContent = `${this.sliderSfxVol.value}%`;
  }

  bindEvents() {
    // Top Bar HUD buttons
    document.getElementById('btnHome').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.openModal(this.modalConfirmHome);
    });

    document.getElementById('btnHelp').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.openModal(this.modalHowToPlay);
    });

    document.getElementById('btnRestart').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.restartLevel();
    });

    document.getElementById('btnSettings').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.openModal(this.modalSettings);
    });

    this.btnHint.addEventListener('click', () => {
      this.sound.playButtonClick();
      this.showHintModal();
    });

    this.bannerDismiss.addEventListener('click', () => {
      this.sound.playButtonClick();
      this.instructionBanner.classList.add('hidden');
    });

    // Home Screen buttons
    document.getElementById('btnHomePlay').addEventListener('click', () => {
      this.sound.registerUserInteraction();
      this.sound.playButtonClick();
      this.closeModal(this.modalHome);
      this.engine.loadLevel(this.engine.unlockedLevel - 1);
      this.renderer.resize();
      this.updateHUD();
    });

    document.getElementById('btnHomeLevels').addEventListener('click', () => {
      this.sound.registerUserInteraction();
      this.sound.playButtonClick();
      this.updateLevelSelectCards();
      this.openModal(this.modalLevelSelect);
    });

    document.getElementById('btnHomeHowToPlay').addEventListener('click', () => {
      this.sound.registerUserInteraction();
      this.sound.playButtonClick();
      this.openModal(this.modalHowToPlay);
    });

    document.getElementById('btnHomeSettings').addEventListener('click', () => {
      this.sound.registerUserInteraction();
      this.sound.playButtonClick();
      this.openModal(this.modalSettings);
    });

    // Level Select close & play buttons
    document.getElementById('btnCloseLevelSelect').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalLevelSelect);
    });

    document.querySelectorAll('.card-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lvl = parseInt(e.target.getAttribute('data-level'), 10);
        if (lvl <= this.engine.unlockedLevel) {
          this.sound.registerUserInteraction();
          this.sound.playButtonClick();
          this.closeModal(this.modalLevelSelect);
          this.closeModal(this.modalHome);
          this.engine.loadLevel(lvl - 1);
          this.renderer.resize();
          this.updateHUD();
        }
      });
    });

    // How to Play modal close & Got It button
    document.getElementById('btnCloseHowToPlay').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalHowToPlay);
    });

    document.getElementById('btnGotIt').addEventListener('click', () => {
      this.sound.registerUserInteraction();
      this.sound.playButtonClick();
      this.closeModal(this.modalHowToPlay);
    });

    // Settings modal interactions
    document.getElementById('btnCloseSettings').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalSettings);
    });

    document.getElementById('btnSaveSettings').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalSettings);
    });

    this.toggleMusic.addEventListener('change', (e) => {
      this.sound.setMusicEnabled(e.target.checked);
    });

    this.toggleSfx.addEventListener('change', (e) => {
      this.sound.setSfxEnabled(e.target.checked);
    });

    this.sliderMusicVol.addEventListener('input', (e) => {
      const vol = parseInt(e.target.value, 10) / 100;
      this.labelMusicVol.textContent = `${e.target.value}%`;
      this.sound.setMusicVolume(vol);
    });

    this.sliderSfxVol.addEventListener('input', (e) => {
      const vol = parseInt(e.target.value, 10) / 100;
      this.labelSfxVol.textContent = `${e.target.value}%`;
      this.sound.setSfxVolume(vol);
    });

    this.btnTestAudio.addEventListener('click', () => {
      this.sound.registerUserInteraction();
      this.sound.playStarCollect();
    });

    this.btnResetProgress.addEventListener('click', () => {
      if (confirm('Reset your saved progress back to Level 1?')) {
        this.engine.resetProgress();
        this.updateLevelSelectCards();
        alert('Progress reset to Level 1.');
      }
    });

    // Home Confirm Modal
    document.getElementById('btnCancelHome').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalConfirmHome);
    });

    document.getElementById('btnConfirmHome').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalConfirmHome);
      this.openModal(this.modalHome);
    });

    // Level Complete Modal buttons
    document.getElementById('btnReplayLevel').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalLevelComplete);
      this.restartLevel();
    });

    document.getElementById('btnNextLevel').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalLevelComplete);
      const nextIdx = this.engine.currentLevelIndex + 1;
      if (nextIdx < LEVELS.length) {
        this.engine.loadLevel(nextIdx);
        this.renderer.resize();
        this.updateHUD();
      }
    });

    // Final Victory Modal buttons
    document.getElementById('btnVictoryPlayAgain').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalVictory);
      this.engine.loadLevel(0);
      this.renderer.resize();
      this.updateHUD();
    });

    document.getElementById('btnVictoryHome').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.closeModal(this.modalVictory);
      this.openModal(this.modalHome);
    });

    // Keyboard controls for player
    window.addEventListener('keydown', (e) => {
      this.sound.registerUserInteraction();
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          this.engine.movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          this.engine.movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          this.engine.movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          this.engine.movePlayer(1, 0);
          break;
        case 'r':
        case 'R':
          this.restartLevel();
          break;
      }
      this.updateHUD();
    });

    // Touch / Mobile D-Pad buttons
    const bindDpad = (id, dx, dy) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const handler = (e) => {
        e.preventDefault();
        this.sound.registerUserInteraction();
        this.engine.movePlayer(dx, dy);
        this.updateHUD();
      };
      btn.addEventListener('touchstart', handler, { passive: false });
      btn.addEventListener('mousedown', handler);
    };

    bindDpad('btnDpadUp', 0, -1);
    bindDpad('btnDpadDown', 0, 1);
    bindDpad('btnDpadLeft', -1, 0);
    bindDpad('btnDpadRight', 1, 0);

    // Mouse and Touch dragging for the Shadow on Canvas
    this.setupCanvasDragging();
  }

  setupCanvasDragging() {
    const canvas = this.renderer.canvas;

    const getCanvasCoords = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / this.renderer.tileSize;
      const y = (clientY - rect.top) / this.renderer.tileSize;
      return { x, y };
    };

    // Pointer Down
    const onPointerDown = (clientX, clientY) => {
      this.sound.registerUserInteraction();
      const { x, y } = getCanvasCoords(clientX, clientY);
      const s = this.engine.shadow;

      // Check distance to shadow
      const dx = x - (s.x + 0.5);
      const dy = y - (s.y + 0.5);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Generous grab radius: within 1.2 tiles of shadow
      if (dist < 1.2) {
        this.engine.startShadowDrag(x - 0.5, y - 0.5);
        this.hideDragHint();
      }
    };

    // Pointer Move
    const onPointerMove = (clientX, clientY) => {
      if (!this.engine.shadow.isDragging) return;
      const { x, y } = getCanvasCoords(clientX, clientY);
      this.engine.updateShadowPosition(x - 0.5, y - 0.5);
      this.updateHUD();
    };

    // Pointer Up
    const onPointerUp = () => {
      if (this.engine.shadow.isDragging) {
        this.engine.endShadowDrag();
        this.updateHUD();
      }
    };

    // Mouse listeners
    canvas.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onPointerUp);

    // Touch listeners
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.engine.shadow.isDragging && e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);
  }

  /* ---------------- UI Updates & Hints ---------------- */

  updateHUD() {
    const lvl = this.engine.level;
    if (!lvl) return;

    this.hudLevelNum.textContent = lvl.id;
    this.hudLevelName.textContent = lvl.name;

    // Stars count
    const totalStars = this.engine.stars.length;
    const collectedStars = this.engine.stars.filter(s => s.collected).length;
    this.starCount.textContent = `${collectedStars} / ${totalStars}`;
    document.getElementById('chipStars').style.display = totalStars > 0 ? 'flex' : 'none';

    // Switches count
    const totalSwitches = this.engine.switches.length;
    const activeSwitches = this.engine.switches.filter(sw => sw.activated).length;
    this.switchCount.textContent = `${activeSwitches} / ${totalSwitches}`;
    document.getElementById('chipSwitches').style.display = totalSwitches > 0 ? 'flex' : 'none';

    // Exit Door Status
    const isUnlocked = this.engine.exit && this.engine.exit.unlocked;
    if (isUnlocked) {
      this.chipDoor.className = 'chip chip-door unlocked';
      this.doorIcon.textContent = '🔓';
      this.doorText.textContent = 'Open!';
    } else {
      this.chipDoor.className = 'chip chip-door locked';
      this.doorIcon.textContent = '🔒';
      this.doorText.textContent = 'Locked';
    }

    // Dynamic Instruction Banner Text
    this.updateInstructionBanner();
    this.updateTargetPointer();
  }

  updateInstructionBanner() {
    const lvl = this.engine.level;
    if (!lvl) return;

    let text = lvl.instructions.initial;

    if (lvl.id === 1) {
      const star = this.engine.stars[0];
      if (star && star.collected) {
        text = lvl.instructions.afterStar;
      }
    } else if (lvl.id === 2) {
      const sw = this.engine.switches[0];
      if (sw && sw.activated) {
        text = lvl.instructions.afterSwitch;
      }
    } else if (lvl.id === 3) {
      const sw1 = this.engine.switches[0];
      const allSw = this.engine.switches.every(s => s.activated);
      if (allSw) {
        text = lvl.instructions.allSwitches;
      } else if (sw1 && sw1.activated) {
        text = lvl.instructions.gateOpened;
      }
    }

    this.bannerText.textContent = text;
    this.instructionBanner.classList.remove('hidden');
  }

  updateTargetPointer() {
    const lvl = this.engine.level;
    const canvas = this.renderer.canvas;
    const ts = this.renderer.tileSize;
    if (!lvl || !canvas) return;

    let targetX = -1;
    let targetY = -1;

    // Determine current priority target:
    // Level 1: Star -> Exit
    if (lvl.id === 1) {
      const star = this.engine.stars[0];
      if (star && !star.collected) {
        targetX = star.x;
        targetY = star.y;
      } else if (this.engine.exit && this.engine.exit.unlocked) {
        targetX = this.engine.exit.x;
        targetY = this.engine.exit.y;
      }
    } else if (lvl.id === 2) {
      // Level 2: Switch -> Exit
      const sw = this.engine.switches[0];
      if (sw && !sw.activated) {
        targetX = sw.x;
        targetY = sw.y;
      } else if (this.engine.exit && this.engine.exit.unlocked) {
        targetX = this.engine.exit.x;
        targetY = this.engine.exit.y;
      }
    } else if (lvl.id === 3) {
      // Level 3: Inactive switches/stars -> Exit
      const inactiveSw = this.engine.switches.find(s => !s.activated);
      if (inactiveSw) {
        targetX = inactiveSw.x;
        targetY = inactiveSw.y;
      } else if (this.engine.exit && this.engine.exit.unlocked) {
        targetX = this.engine.exit.x;
        targetY = this.engine.exit.y;
      }
    }

    if (targetX >= 0 && targetY >= 0) {
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = canvas.parentElement.getBoundingClientRect();

      const screenX = canvasRect.left - containerRect.left + (targetX + 0.5) * ts;
      const screenY = canvasRect.top - containerRect.top + (targetY + 0.5) * ts;

      this.targetPointer.style.left = `${screenX}px`;
      this.targetPointer.style.top = `${screenY}px`;
      this.targetPointer.classList.add('visible');
    } else {
      this.targetPointer.classList.remove('visible');
    }

    // Show drag hint on shadow in level 1 start
    if (lvl.id === 1 && !this.engine.stars[0].collected && !this.engine.shadow.isDragging) {
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = canvas.parentElement.getBoundingClientRect();
      const sx = canvasRect.left - containerRect.left + (this.engine.shadow.x + 0.5) * ts;
      const sy = canvasRect.top - containerRect.top + (this.engine.shadow.y + 0.5) * ts;
      this.dragHint.style.left = `${sx}px`;
      this.dragHint.style.top = `${sy}px`;
      this.dragHint.classList.add('visible');
    } else {
      this.hideDragHint();
    }
  }

  hideDragHint() {
    this.dragHint.classList.remove('visible');
  }

  startHintWatchdog() {
    // If player hasn't progressed in 12 seconds, gently pulse the Hint button
    setInterval(() => {
      const elapsed = Date.now() - this.engine.lastActionTime;
      if (elapsed > 12000 && !this.stuckHintTriggered && !this.engine.isLevelCompleted) {
        this.btnHint.classList.add('pulsing');
      } else {
        this.btnHint.classList.remove('pulsing');
      }
    }, 2000);
  }

  showHintModal() {
    const lvl = this.engine.level;
    if (!lvl) return;
    alert(`💡 Hint:\n\n${lvl.instructions.hint}`);
  }

  restartLevel() {
    this.engine.restartCurrentLevel();
    this.updateHUD();
    this.renderer.resize();
  }

  onLevelCompleted(levelId) {
    const elapsedSec = Math.floor((Date.now() - this.engine.levelStartTime) / 1000);
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    if (levelId === 3) {
      // Final level completed! Show glorious victory celebration
      document.getElementById('victoryTotalStars').textContent = '3 / 3';
      this.openModal(this.modalVictory);
      this.startConfetti();
    } else {
      document.getElementById('completeLevelName').textContent = this.engine.level.name;
      document.getElementById('completeStars').textContent = `${this.engine.stars.length} / ${this.engine.stars.length}`;
      document.getElementById('completeTime').textContent = timeStr;
      this.openModal(this.modalLevelComplete);
    }
    this.updateLevelSelectCards();
  }

  updateLevelSelectCards() {
    for (let i = 1; i <= 3; i++) {
      const card = document.getElementById(`cardLevel${i}`);
      const statusSpan = document.getElementById(`statusLevel${i}`);
      if (!card) continue;

      if (i <= this.engine.unlockedLevel) {
        card.classList.remove('locked');
        if (statusSpan) {
          statusSpan.className = 'card-status status-unlocked';
          statusSpan.textContent = 'Unlocked ✨';
        }
      } else {
        card.classList.add('locked');
        if (statusSpan) {
          statusSpan.className = 'card-status';
          statusSpan.textContent = 'Locked 🔒';
        }
      }
    }
  }

  openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  /* ---------------- Confetti Animation for Level 3 Victory ---------------- */

  startConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const pieces = [];
    const colors = ['#c084fc', '#f472b6', '#facc15', '#38bdf8', '#4ade80', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 4,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let animId;
    const renderConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (this.modalVictory.classList.contains('active')) {
        animId = requestAnimationFrame(renderConfetti);
      }
    };
    renderConfetti();
  }
}

/* ============================================================================
   6. BOOTSTRAP / INITIALIZATION
   ============================================================================ */
window.addEventListener('DOMContentLoaded', () => {
  const soundManager = new SoundManager();
  const gameEngine = new GameEngine(soundManager);
  const canvas = document.getElementById('gameCanvas');
  const renderer = new CanvasRenderer(canvas, gameEngine);
  const uiController = new UIController(gameEngine, soundManager, renderer);

  window.soundManager = soundManager;
  window.gameEngine = gameEngine;
  window.uiController = uiController;
  window.renderer = renderer;

  // Load Level 1 initially
  gameEngine.loadLevel(0);
  renderer.resize();
  renderer.start();
  uiController.updateHUD();

  // Global user interaction handler to satisfy browser autoplay
  const unlockAudio = () => {
    soundManager.registerUserInteraction();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
});
