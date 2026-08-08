/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/audio.js
 * ------------------------------------------------------------
 * AUDIO — arquitectura completa de sonido con WebAudio API.
 *
 * TODOS los sonidos se sintetizan en tiempo real (sin archivos
 * externos, sin CDN). El sistema está preparado para cargar
 * archivos .wav/.ogg desde assets/audio/ si se desea: ver
 * `loadSample()` y README.
 *
 * Eventos disponibles:
 *   click, launch, stretch, impact-wood, impact-glass,
 *   impact-stone, impact-frog, break-wood, break-glass,
 *   break-bamboo, break-stone, pop, splash, win, lose, star
 *
 * La música ambiental es generativa (acordes suaves + olas).
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { MathUtils } = NS.Utils;

  class AudioManager {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.muted = false;
      this.musicOn = true;
      this._musicTimer = null;
      this._noiseBuffer = null;
      this._sampleBank = new Map(); // nombre → AudioBuffer (carga opcional)
      this._initialized = false;
      try {
        this.muted = localStorage.getItem('rana-muted') === '1';
        this.musicOn = localStorage.getItem('rana-music') !== '0';
      } catch (e) { /* localStorage no disponible */ }
    }

    /** Debe llamarse tras un gesto del usuario (clic/toque). */
    unlock() {
      if (this._initialized) {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 1;
        this.sfxGain.connect(this.master);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicOn ? 0.5 : 0;
        this.musicGain.connect(this.master);

        // Buffer de ruido blanco reutilizable
        const len = this.ctx.sampleRate * 1;
        this._noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this._noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        this._initialized = true;
        this.startMusic();
      } catch (e) {
        console.warn('[audio] WebAudio no disponible:', e);
      }
    }

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.5;
      try { localStorage.setItem('rana-muted', m ? '1' : '0'); } catch (e) {}
    }

    setMusic(on) {
      this.musicOn = on;
      if (this.musicGain) this.musicGain.gain.value = on ? 0.5 : 0;
      try { localStorage.setItem('rana-music', on ? '1' : '0'); } catch (e) {}
    }

    /**
     * Punto de entrada: reproduce un evento por nombre.
     * Acepta `vol` 0..1 para ajustar por contexto.
     */
    play(name, vol = 1) {
      if (!this._initialized || this.muted) return;
      const t = this.ctx.currentTime;
      switch (name) {
        case 'click': this._tone(t, 620, 0.06, 'triangle', 0.18 * vol, 0.01); break;
        case 'launch':
          this._boing(t, 150, 380, 0.22, 0.5 * vol);
          this._noiseBurst(t, 0.08, 900, 0.22 * vol, 'lowpass');
          break;
        case 'stretch': this._tone(t, 120, 0.12, 'sawtooth', 0.06 * vol, 0.01); break;
        case 'impact-wood': this._thud(t, 130, 0.12, 0.5 * vol); break;
        case 'impact-glass': this._chime(t, 0.25 * vol); break;
        case 'impact-stone': this._thud(t, 70, 0.2, 0.55 * vol); break;
        case 'impact-frog':
          this._tone(t, 320, 0.12, 'sine', 0.4 * vol, 0.005);
          this._tone(t + 0.02, 180, 0.14, 'sine', 0.35 * vol, 0.005);
          break;
        case 'break-wood':
          this._noiseBurst(t, 0.18, 1200, 0.4 * vol, 'bandpass');
          this._noiseBurst(t + 0.02, 0.2, 500, 0.3 * vol, 'lowpass');
          break;
        case 'break-glass':
          this._glassBreak(t, 0.4 * vol);
          break;
        case 'break-bamboo':
          this._noiseBurst(t, 0.16, 900, 0.35 * vol, 'bandpass');
          this._tone(t, 220, 0.1, 'triangle', 0.25 * vol, 0.005);
          break;
        case 'break-stone':
          this._thud(t, 60, 0.3, 0.5 * vol);
          this._noiseBurst(t, 0.3, 400, 0.25 * vol, 'lowpass');
          break;
        case 'pop':
          this._tone(t, 700, 0.09, 'sine', 0.3 * vol, 0.005);
          this._tone(t + 0.01, 400, 0.12, 'sine', 0.3 * vol, 0.005);
          break;
        case 'splash':
          this._noiseBurst(t, 0.45, 1400, 0.4 * vol, 'bandpass');
          this._tone(t + 0.05, 500, 0.3, 'sine', 0.12 * vol, 0.02, 200);
          break;
        case 'star':
          this._tone(t, 880, 0.16, 'triangle', 0.3 * vol, 0.01);
          this._tone(t + 0.08, 1318, 0.2, 'triangle', 0.3 * vol, 0.01);
          break;
        case 'win':
          [523, 659, 784, 1046].forEach((f, i) => {
            this._tone(t + i * 0.12, f, 0.35, 'triangle', 0.32 * vol, 0.01);
          });
          break;
        case 'lose':
          this._tone(t, 330, 0.3, 'sine', 0.3 * vol, 0.01);
          this._tone(t + 0.25, 262, 0.45, 'sine', 0.3 * vol, 0.01);
          break;
        default: break;
      }
    }

    /* ================= SINTESIS ================= */

    /** Tono simple con envolvente ADSR mínima. */
    _tone(t, freq, dur, type = 'sine', gain = 0.3, attack = 0.01, glideTo = null) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    /** Rebote de goma ("boing") con barrido de frecuencia. */
    _boing(t, f0, f1, dur, gain) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.5);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    /** Golpe sordo (madera/piedra) = ruido + grave. */
    _thud(t, freq, dur, gain) {
      this._noiseBurst(t, dur * 0.6, 400, gain * 0.7, 'lowpass');
      this._tone(t, freq, dur * 1.4, 'sine', gain * 0.8, 0.004);
    }

    /** Campanilla cristalina (impacto en cristal). */
    _chime(t, gain) {
      [1760, 2637, 3520].forEach((f, i) => {
        this._tone(t + i * 0.012, f, 0.18, 'sine', gain * 0.4 / (i + 1), 0.002);
      });
      this._noiseBurst(t, 0.06, 5000, gain * 0.3, 'highpass');
    }

    /** Rotura de cristal: ruido brillante + parciales. */
    _glassBreak(t, gain) {
      this._noiseBurst(t, 0.3, 3500, gain * 0.7, 'highpass');
      [2100, 2800, 1500].forEach((f, i) => {
        this._tone(t + i * 0.03, f, 0.2, 'sine', gain * 0.25, 0.003);
      });
    }

    /** Ráfaga de ruido filtrada. */
    _noiseBurst(t, dur, freq, gain, type = 'bandpass') {
      if (!this._noiseBuffer) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = type === 'bandpass' ? 1.2 : 0.7;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      src.start(t, Math.random());
      src.stop(t + dur + 0.05);
    }

    /* ================= MUSICA AMBIENTAL ================= */

    /** Bucle generativo: pad suave + olas de ruido filtrado. */
    startMusic() {
      if (!this._initialized || this._musicTimer) return;
      const schedule = () => {
        if (!this._initialized) return;
        this._schedulePad();
        this._scheduleWaves();
      };
      schedule();
      this._musicTimer = setInterval(schedule, 6000);
    }

    _schedulePad() {
      const t = this.ctx.currentTime + 0.1;
      const progression = [
        [220.0, 261.6, 329.6, 392.0], // Am7
        [174.6, 220.0, 261.6, 329.6], // Fmaj7
        [196.0, 246.9, 293.7, 392.0], // G
        [261.6, 329.6, 392.0, 493.9]  // C
      ];
      const chord = progression[Math.floor(this.ctx.currentTime / 6) % progression.length];
      const dur = 5.8;
      for (const f of chord) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        const detune = MathUtils.rand(-6, 6);
        osc.detune.value = detune;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.06, t + 0.8);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        osc.connect(filter);
        filter.connect(g);
        g.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + dur + 0.1);
      }
    }

    /** Olas: ruido filtrado con LFO de ganancia lento. */
    _scheduleWaves() {
      const t = this.ctx.currentTime + 0.1;
      const dur = 5.8;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 620;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.04, t);
      // LFO para simular el vaivén de las olas
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
      src.start(t);
      lfo.start(t);
      src.stop(t + dur);
      lfo.stop(t + dur);
    }

    /** Carga opcional de un sample externo (assets/audio/xxx.wav). */
    async loadSample(name, url) {
      if (!this._initialized || !this.ctx) return;
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const audioBuf = await this.ctx.decodeAudioData(buf);
        this._sampleBank.set(name, audioBuf);
      } catch (e) {
        console.warn(`[audio] No se pudo cargar ${url}`, e);
      }
    }
  }

  NS.Audio = { AudioManager };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
