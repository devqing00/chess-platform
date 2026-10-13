// Synthesized high-fidelity Chess.com audio feedback engine using Web Audio API
// Fully compliant with R1 (Audible & Customizable Low-Time Warning) and R7 (Multi-bus Gain Settings)

import { SoundTheme, LowTimeRegister, SoundPreset, AudioSettings } from '@/types/chess';

class SoundService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private lowTimeGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;

  private soundTheme: SoundTheme = 'classic';
  private soundEnabled: boolean = true;

  private settings: AudioSettings = {
    masterVolume: 0.8,
    sfxVolume: 0.85,
    lowTimeVolume: 0.95,
    voiceVolume: 0.8,
    lowTimeRegister: 'tick',
    lowTimeThresholdSeconds: 10,
    neverBelowFloorVolume: true,
    preset: 'casual',
  };

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initGainBuses(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private initGainBuses(ctx: AudioContext) {
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.masterVolume, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.lowTimeGain = ctx.createGain();
    const effectiveLowTime = this.settings.neverBelowFloorVolume
      ? Math.max(0.5, this.settings.lowTimeVolume)
      : this.settings.lowTimeVolume;
    this.lowTimeGain.gain.setValueAtTime(effectiveLowTime, ctx.currentTime);
    this.lowTimeGain.connect(this.masterGain);

    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.setValueAtTime(this.settings.voiceVolume, ctx.currentTime);
    this.voiceGain.connect(this.masterGain);
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    if (this.ctx) {
      const t = this.ctx.currentTime;
      if (this.masterGain && partial.masterVolume !== undefined) {
        this.masterGain.gain.setValueAtTime(partial.masterVolume, t);
      }
      if (this.sfxGain && partial.sfxVolume !== undefined) {
        this.sfxGain.gain.setValueAtTime(partial.sfxVolume, t);
      }
      if (this.lowTimeGain && (partial.lowTimeVolume !== undefined || partial.neverBelowFloorVolume !== undefined)) {
        const floor = this.settings.neverBelowFloorVolume ? 0.5 : 0;
        const vol = Math.max(floor, this.settings.lowTimeVolume);
        this.lowTimeGain.gain.setValueAtTime(vol, t);
      }
    }
  }

  public applyPreset(preset: SoundPreset) {
    switch (preset) {
      case 'focus':
        this.updateSettings({
          masterVolume: 0.6,
          sfxVolume: 0.5,
          lowTimeVolume: 0.9,
          lowTimeRegister: 'tick',
          preset: 'focus',
        });
        break;
      case 'casual':
        this.updateSettings({
          masterVolume: 0.8,
          sfxVolume: 0.85,
          lowTimeVolume: 0.95,
          lowTimeRegister: 'tick',
          preset: 'casual',
        });
        break;
      case 'commentary':
        this.updateSettings({
          masterVolume: 0.9,
          sfxVolume: 0.7,
          lowTimeVolume: 1.0,
          lowTimeRegister: 'shrill',
          neverBelowFloorVolume: true,
          preset: 'commentary',
        });
        break;
    }
  }

  public setTheme(theme: SoundTheme) {
    this.soundTheme = theme;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  private getSfxDestination(): AudioNode {
    const ctx = this.getAudioContext();
    if (!ctx) throw new Error('No audio context');
    return this.sfxGain || ctx.destination;
  }

  private getLowTimeDestination(): AudioNode {
    const ctx = this.getAudioContext();
    if (!ctx) throw new Error('No audio context');
    return this.lowTimeGain || ctx.destination;
  }

  // Standard move: Crisp wooden tap / light piece click
  public playMove() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const dest = this.getSfxDestination();

    switch (this.soundTheme) {
      case 'arcade': {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.06);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(gain).connect(dest);
        osc.start(t);
        osc.stop(t + 0.08);
        return;
      }
      case 'wood': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(filter).connect(gain).connect(dest);
        osc.start(t);
        osc.stop(t + 0.1);
        return;
      }
      case 'marble': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.07);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain).connect(dest);
        osc.start(t);
        osc.stop(t + 0.09);
        return;
      }
      case 'silman': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(gain).connect(dest);
        osc.start(t);
        osc.stop(t + 0.08);
        return;
      }
      case 'classic':
      default: {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain).connect(dest);
        osc.start(t);
        osc.stop(t + 0.09);
        return;
      }
    }
  }

  // Capture move: Resonant wooden snap / pop
  public playCapture() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dest = this.getSfxDestination();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(420, t);
    snap.frequency.exponentialRampToValueAtTime(120, t + 0.04);
    snapGain.gain.setValueAtTime(0.18, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain).connect(dest);
    snap.connect(snapGain).connect(dest);

    osc.start(t);
    snap.start(t);
    osc.stop(t + 0.15);
    snap.stop(t + 0.06);
  }

  // Check alert: Distinct bell chime
  public playCheck() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dest = this.getSfxDestination();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, t); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, t + 0.18); // A5
    osc2.frequency.setValueAtTime(1174.66, t + 0.05); // D6

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc1.connect(gain).connect(dest);
    osc2.connect(gain).connect(dest);

    osc1.start(t);
    osc2.start(t + 0.05);
    osc1.stop(t + 0.26);
    osc2.stop(t + 0.26);
  }

  // Checkmate / Victory: Two-stage cue (Check cue + Game-End sting as per spec A7)
  public playCheckmate() {
    if (!this.soundEnabled) return;
    this.playCheck();
    setTimeout(() => {
      this.playGameEndWin();
    }, 180);
  }

  // Win resolution sting (Major resolve)
  public playGameEndWin() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25, 880];
    const t = ctx.currentTime;
    const dest = this.getSfxDestination();

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.18, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.45);
      osc.connect(gain).connect(dest);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.5);
    });
  }

  // Loss resolution sting (Minor descending fall)
  public playGameEndLoss() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [440, 415.3, 392, 349.23];
    const t = ctx.currentTime;
    const dest = this.getSfxDestination();

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);
      gain.gain.setValueAtTime(0.2, t + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.4);
      osc.connect(gain).connect(dest);
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.45);
    });
  }

  // Draw resolution sting
  public playGameEndDraw() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [440, 440];
    const t = ctx.currentTime;
    const dest = this.getSfxDestination();

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);
      gain.gain.setValueAtTime(0.16, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.35);
      osc.connect(gain).connect(dest);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.4);
    });
  }

  // Castling: Dedicated two-beat switch motif
  public playCastle() {
    if (!this.soundEnabled) return;
    this.playMove();
    setTimeout(() => {
      this.playMove();
    }, 110);
  }

  // Game start: Bright pairing chime
  public playGameStart() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [392, 523.25];
    const dest = this.getSfxDestination();

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.1);
      gain.gain.setValueAtTime(0.2, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.35);
      osc.connect(gain).connect(dest);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.4);
    });
  }

  // Puzzle success / combo streak
  public playPuzzleSuccess() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    const dest = this.getSfxDestination();

    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      gain.gain.setValueAtTime(0.18, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.3);
      osc.connect(gain).connect(dest);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.35);
    });
  }

  // Puzzle fail / blunder buzzer
  public playPuzzleFail() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dest = this.getSfxDestination();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(95, t + 0.3);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  /**
   * R1 Remediation: Low time warning with user-configurable register choices
   * ('tick', 'shrill', 'beep', 'voice') and guaranteed audible volume floor.
   */
  public playLowTime(secondsRemaining?: number) {
    if (!this.soundEnabled) return;

    // Optional voice countdown for ≤ 5 seconds
    if (this.settings.lowTimeRegister === 'voice' && secondsRemaining !== undefined && secondsRemaining <= 5) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(String(secondsRemaining));
        utter.rate = 1.4;
        utter.volume = Math.max(0.6, this.settings.voiceVolume);
        window.speechSynthesis.speak(utter);
        return;
      }
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dest = this.getLowTimeDestination();

    switch (this.settings.lowTimeRegister) {
      case 'shrill': {
        // Piercing dual resonant tone at 1200Hz & 2400Hz that cuts through background audio
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, t);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2400, t);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc1.connect(gain).connect(dest);
        osc2.connect(gain).connect(dest);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.09);
        osc2.stop(t + 0.09);
        break;
      }
      case 'beep': {
        // High-register electronic timer beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1760, t); // A6
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gain).connect(dest);
        osc.start(t);
        osc.stop(t + 0.07);
        break;
      }
      case 'tick':
      default: {
        // High register mechanical clock tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain).connect(dest);
        osc.start(t);
        osc.stop(t + 0.06);
        break;
      }
    }
  }
}

export const soundService = new SoundService();
