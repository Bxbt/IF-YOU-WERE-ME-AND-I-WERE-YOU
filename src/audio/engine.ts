/**
 * Synthesised sound (Q-08 → option 1, docs/09 §5). Everything is generated with WebAudio — no audio
 * files, no licences to track. Rules from docs/09 §5:
 * - Off by default; nothing plays until the player turns sound on (that click unlocks audio).
 * - No sudden loud sounds: a compressor plus a master ceiling keep peaks well under -6 dBFS,
 *   and the elevator jolt is quieter still.
 * - Sound never carries information that is not also on screen.
 * Where WebAudio is missing (old browsers, tests) every call is a safe no-op.
 */

export type MusicKey = 'home' | 'night' | 'ending' | 'none';
export type RainKey = 'none' | 'light' | 'medium' | 'heavy';
export type SfxKey =
  | 'door_close'
  | 'elevator_jolt'
  | 'metal_creak'
  | 'tools_above'
  | 'door_pry'
  | 'alarm_bell'
  | 'phone_buzz'
  | 'ui_reveal';

export interface AmbientTarget {
  music: MusicKey;
  rain: RainKey;
  /** Low hum inside the stuck elevator. */
  hum: boolean;
}

export const SILENT: AmbientTarget = { music: 'none', rain: 'none', hum: false };

const MASTER_CEILING = 0.45; // × volume; with the compressor this stays well below -6 dBFS
const FADE = 1.2;
const RAIN_GAIN: Record<RainKey, number> = { none: 0, light: 0.05, medium: 0.09, heavy: 0.14 };

interface Layer {
  gain: GainNode;
  stop: () => void;
}

type Ctor = typeof AudioContext;

function audioCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function isSoundSupported(): boolean {
  return audioCtor() !== null;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private layers = new Map<string, Layer>();
  private enabled = false;
  private volume = 0.6;
  private target: AmbientTarget = SILENT;

  /** Creates the context lazily. Browsers only let it start after a user gesture. */
  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const C = audioCtor();
    if (!C) return null;
    try {
      const ctx = new C();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(comp);
      comp.connect(ctx.destination);
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.ctx = ctx;
      this.master = master;
      this.noise = buf;
      return ctx;
    } catch {
      return null;
    }
  }

  get isEnabled() {
    return this.enabled;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) {
      if (this.ctx && this.master) {
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      }
      return;
    }
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    void ctx.resume?.();
    this.master.gain.setTargetAtTime(this.volume * MASTER_CEILING, ctx.currentTime, 0.3);
    this.apply();
  }

  /** Call from any user gesture: browsers keep a context suspended until one happens. */
  unlock() {
    if (this.enabled && this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master && this.enabled)
      this.master.gain.setTargetAtTime(this.volume * MASTER_CEILING, this.ctx.currentTime, 0.1);
  }

  setPaused(paused: boolean) {
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend?.();
    else if (this.enabled) void this.ctx.resume?.();
  }

  setAmbient(t: AmbientTarget) {
    this.target = t;
    this.apply();
  }

  private apply() {
    if (!this.enabled || !this.ctx) return;
    const want = new Set<string>();
    if (this.target.music !== 'none') want.add(`music:${this.target.music}`);
    if (this.target.rain !== 'none') want.add('rain');
    if (this.target.hum) want.add('hum');
    for (const [key, layer] of this.layers) {
      if (!want.has(key)) {
        this.fadeOut(layer);
        this.layers.delete(key);
      }
    }
    for (const key of want) {
      if (!this.layers.has(key)) {
        const layer = this.build(key);
        if (layer) this.layers.set(key, layer);
      }
    }
    const rain = this.layers.get('rain');
    if (rain) rain.gain.gain.setTargetAtTime(RAIN_GAIN[this.target.rain], this.ctx.currentTime, 0.6);
  }

  private fadeOut(layer: Layer) {
    const ctx = this.ctx!;
    layer.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
    setTimeout(() => layer.stop(), FADE * 1000 + 200);
  }

  private noiseSource(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  private layerGain(level: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(level, ctx.currentTime, FADE / 3);
    g.connect(this.master!);
    return g;
  }

  private build(key: string): Layer | null {
    const ctx = this.ctx;
    if (!ctx || !this.master) return null;
    const stops: (() => void)[] = [];
    const osc = (type: OscillatorType, freq: number, to: AudioNode, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(to);
      o.start();
      stops.push(() => o.stop());
      return o;
    };
    const lfo = (target: AudioParam, rate: number, depth: number) => {
      const l = ctx.createOscillator();
      const d = ctx.createGain();
      l.frequency.value = rate;
      d.gain.value = depth;
      l.connect(d).connect(target);
      l.start();
      stops.push(() => l.stop());
    };

    if (key === 'rain') {
      const g = this.layerGain(RAIN_GAIN[this.target.rain]);
      const src = this.noiseSource();
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5000;
      src.connect(hp).connect(lp).connect(g);
      src.start();
      stops.push(() => src.stop());
      return { gain: g, stop: () => stops.forEach((s) => s()) };
    }
    if (key === 'hum') {
      const g = this.layerGain(0.035);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      lp.connect(g);
      osc('sine', 55, lp);
      osc('sine', 110, lp, 4);
      lfo(g.gain, 0.3, 0.008);
      return { gain: g, stop: () => stops.forEach((s) => s()) };
    }
    if (key === 'music:home') {
      // Warm room tone: soft low noise + a quiet drone that breathes.
      const g = this.layerGain(0.05);
      const src = this.noiseSource();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 280;
      src.connect(lp).connect(g);
      src.start();
      stops.push(() => src.stop());
      const drone = ctx.createGain();
      drone.gain.value = 0.25;
      drone.connect(g);
      osc('triangle', 110, drone);
      osc('triangle', 164.81, drone, -6);
      lfo(drone.gain, 0.08, 0.1);
      return { gain: g, stop: () => stops.forEach((s) => s()) };
    }
    if (key === 'music:night' || key === 'music:ending') {
      // Gentle pad + slow pentatonic notes; the ending is a little brighter and fuller.
      const ending = key === 'music:ending';
      const g = this.layerGain(ending ? 0.07 : 0.045);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = ending ? 1600 : 900;
      lp.connect(g);
      const pad = ctx.createGain();
      pad.gain.value = 0.35;
      pad.connect(lp);
      osc('triangle', 130.81, pad);
      osc('triangle', 196.0, pad, 5);
      lfo(pad.gain, 0.07, 0.12);
      const scale = ending ? [523.25, 587.33, 659.25, 783.99, 880.0, 659.25] : [392.0, 440.0, 523.25, 587.33];
      let i = 0;
      const timer = setInterval(
        () => {
          if (!this.ctx || this.ctx.state !== 'running') return;
          const t = this.ctx.currentTime;
          const o = this.ctx.createOscillator();
          const e = this.ctx.createGain();
          o.type = 'sine';
          o.frequency.value = scale[i % scale.length]!;
          i += ending ? 1 : 1 + Math.floor(Math.random() * 2);
          e.gain.setValueAtTime(0, t);
          e.gain.linearRampToValueAtTime(0.25, t + 0.08);
          e.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
          o.connect(e).connect(lp);
          o.start(t);
          o.stop(t + 2.5);
        },
        ending ? 900 : 2600,
      );
      stops.push(() => clearInterval(timer));
      return { gain: g, stop: () => stops.forEach((s) => s()) };
    }
    return null;
  }

  playSfx(key: SfxKey | string) {
    if (!this.enabled) return;
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.master);

    const env = (g: GainNode, peak: number, attack: number, decay: number, at = t) => {
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(peak, at + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    };
    const thump = (freq: number, peak: number, decay: number, at = t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(freq, at);
      o.frequency.exponentialRampToValueAtTime(freq / 2, at + decay);
      env(g, peak, 0.01, decay, at);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + decay + 0.1);
    };
    const burst = (type: BiquadFilterType, freq: number, peak: number, decay: number, at = t, q = 1) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      env(g, peak, 0.005, decay, at);
      src.connect(f).connect(g).connect(out);
      src.start(at, Math.random());
      src.stop(at + decay + 0.1);
    };
    const creak = (from: number, to: number, dur: number, peak: number, at = t) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(from, at);
      o.frequency.linearRampToValueAtTime(to, at + dur);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 700;
      f.Q.value = 6;
      const g = ctx.createGain();
      env(g, peak, 0.15, dur, at);
      o.connect(f).connect(g).connect(out);
      o.start(at);
      o.stop(at + dur + 0.3);
    };

    switch (key) {
      case 'door_close':
        burst('lowpass', 420, 0.5, 0.35);
        thump(80, 0.4, 0.3);
        break;
      case 'elevator_jolt': // quieter than the rest (docs/09 §5: ≤ -12 dBFS)
        thump(60, 0.3, 0.5);
        burst('bandpass', 1800, 0.12, 0.25, t + 0.05, 4);
        break;
      case 'metal_creak':
        creak(190, 120, 1.3, 0.25);
        break;
      case 'tools_above':
        for (let i = 0; i < 5; i++) burst('highpass', 2500, 0.25, 0.06, t + i * 0.17 + Math.random() * 0.05);
        break;
      case 'door_pry':
        creak(150, 230, 0.9, 0.22);
        burst('bandpass', 900, 0.3, 0.2, t + 0.9, 3);
        break;
      case 'alarm_bell':
        for (let i = 0; i < 3; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = 880;
          env(g, 0.12, 0.01, 0.35, t + i * 0.45);
          o.connect(g).connect(out);
          o.start(t + i * 0.45);
          o.stop(t + i * 0.45 + 0.5);
        }
        break;
      case 'phone_buzz':
        for (let i = 0; i < 2; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square';
          o.frequency.value = 140;
          env(g, 0.06, 0.01, 0.25, t + i * 0.4);
          o.connect(g).connect(out);
          o.start(t + i * 0.4);
          o.stop(t + i * 0.4 + 0.3);
        }
        break;
      case 'ui_reveal':
        [659.25, 987.77].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = f;
          env(g, 0.08, 0.02, 0.8, t + i * 0.12);
          o.connect(g).connect(out);
          o.start(t + i * 0.12);
          o.stop(t + i * 0.12 + 0.9);
        });
        break;
      default:
        break;
    }
    setTimeout(() => out.disconnect(), 3000);
  }
}

export const sound = new SoundEngine();

/** Ambient for a story scene: explicit `music` wins, otherwise inferred from the background. */
export function ambientFor(bg: string, rain: RainKey, light: string, music?: string): AmbientTarget {
  const hum = bg.includes('elevator') && light !== 'normal';
  if (music) {
    const m: MusicKey =
      music === 'ambient_home' ? 'home' : music === 'ambient_night' ? 'night' : music === 'ending_theme' ? 'ending' : 'none';
    return { music: m, rain, hum };
  }
  const indoorsHome = /apartment|kitchen|living|cozy/.test(bg);
  const night = /rooftop|title/.test(bg);
  return { music: indoorsHome ? 'home' : night ? 'night' : 'none', rain, hum };
}
