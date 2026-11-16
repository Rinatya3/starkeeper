// Synthesized sound: every effect and the music loop are built from
// oscillators and filtered noise, so the game ships no audio files.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicOn = false;
    this._step = 0;
    this._nextNoteTime = 0;
    this._shootThrottle = 0;
  }

  // Browsers unlock audio only after a gesture; call this from any input.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this._nextNoteTime = this.ctx.currentTime + 0.1;
    } catch (err) {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  _tone(freq, endFreq, duration, type, volume, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  _noise(duration, volume, filterFreq, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
  }

  shoot() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - this._shootThrottle < 0.05) return;
    this._shootThrottle = now;
    this._tone(880, 220, 0.08, 'square', 0.06);
  }

  explosion(big = false) {
    this._noise(big ? 0.5 : 0.25, big ? 0.35 : 0.2, big ? 500 : 900);
    this._tone(big ? 120 : 180, 40, big ? 0.4 : 0.2, 'sine', 0.25);
  }

  pickup() {
    this._tone(660, 660, 0.07, 'sine', 0.12);
    this._tone(990, 990, 0.09, 'sine', 0.12, 0.06);
  }

  starHit() {
    this._tone(140, 60, 0.3, 'sawtooth', 0.2);
    this._noise(0.2, 0.15, 400);
  }

  playerHit() {
    this._tone(300, 80, 0.25, 'sawtooth', 0.22);
    this._noise(0.18, 0.18, 700);
  }

  dash() {
    this._noise(0.15, 0.1, 2400);
  }

  upgrade() {
    this._tone(523, 523, 0.1, 'triangle', 0.14);
    this._tone(659, 659, 0.1, 'triangle', 0.14, 0.08);
    this._tone(784, 784, 0.16, 'triangle', 0.14, 0.16);
  }

  waveStart() {
    this._tone(392, 392, 0.12, 'triangle', 0.12);
    this._tone(523, 523, 0.18, 'triangle', 0.12, 0.1);
  }

  bossWarn() {
    this._tone(98, 98, 0.4, 'sawtooth', 0.18);
    this._tone(98, 98, 0.4, 'sawtooth', 0.18, 0.45);
  }

  gameOver() {
    this._tone(392, 392, 0.25, 'triangle', 0.16);
    this._tone(311, 311, 0.25, 'triangle', 0.16, 0.22);
    this._tone(233, 233, 0.5, 'triangle', 0.16, 0.44);
  }

  click() {
    this._tone(1200, 900, 0.05, 'sine', 0.08);
  }

  // A slow minor arpeggio under play. Called every frame; schedules ahead.
  updateMusic(playing) {
    if (!this.ctx || this.muted) return;
    if (!playing) {
      this.musicOn = false;
      return;
    }
    this.musicOn = true;
    const stepDur = 60 / 132 / 2;
    const bass = [110, 110, 130.8, 98];
    const arp = [440, 523.25, 659.25, 523.25, 440, 392, 523.25, 659.25];
    while (this._nextNoteTime < this.ctx.currentTime + 0.15) {
      const when = this._nextNoteTime - this.ctx.currentTime;
      const step = this._step % 16;
      if (step % 4 === 0) this._tone(bass[(step / 4) | 0], bass[(step / 4) | 0], stepDur * 3, 'triangle', 0.05, when);
      if (step % 2 === 0) this._tone(arp[(step / 2) | 0], arp[(step / 2) | 0], stepDur * 1.5, 'sine', 0.035, when);
      this._step += 1;
      this._nextNoteTime += stepDur;
    }
  }
}
