// Procedural soundtrack: 120 BPM, A minor, 10.3 s.
// Everything before 7.3 s plays through a closed low-pass ("через стену"),
// the filter opens on 7.3 s. Impacts land on the times listed in score.json.
// Output: public/music.wav (48 kHz, 16-bit, stereo). No dependencies.
import fs from "node:fs";

const score = JSON.parse(
  fs.readFileSync(new URL("../src/audio/score.json", import.meta.url), "utf8"),
);
const SR = score.sampleRate;
const N = Math.round(SR * score.duration);
const BEAT = 60 / score.bpm;
const STEP = BEAT / 4;
const TAU = Math.PI * 2;

// ---------- utils ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20251003);
const noise = () => rand() * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const db = (d) => 10 ** (d / 20);

const makeBus = () => [new Float32Array(N), new Float32Array(N)];
function put(bus, i, l, r) {
  if (i >= 0 && i < N) {
    bus[0][i] += l;
    bus[1][i] += r;
  }
}
const panLR = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

class Biquad {
  constructor() {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.b0 = 1;
    this.b1 = this.b2 = this.a1 = this.a2 = 0;
  }
  set(type, f, q = 0.7071) {
    const w = (TAU * Math.min(f, SR * 0.49)) / SR;
    const c = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === "lp") [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
    else if (type === "hp") [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    else [b0, b1, b2] = [alpha, 0, -alpha]; // band-pass, 0 dB peak
    const a0 = 1 + alpha;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * c) / a0;
    this.a2 = (1 - alpha) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// band-limited saw (polyBLEP)
function blep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}
class Saw {
  constructor(phase = 0) {
    this.p = phase;
  }
  next(f) {
    const dt = f / SR;
    this.p += dt;
    if (this.p >= 1) this.p -= 1;
    return 2 * this.p - 1 - blep(this.p, dt);
  }
}

// ---------- buses ----------
const synths = makeBus(); // pads, bass, arp: sidechained
const drums = makeBus();
const musicVerb = makeBus(); // reverb send, music side (filtered later)
const delaySend = makeBus();
const fx = makeBus(); // impacts: outside the wall filter
const fxVerb = makeBus();

// ---------- instruments ----------
function kick(bus, t0, vel = 1, send = null) {
  const s0 = Math.round(t0 * SR);
  let ph = 0;
  const len = Math.round(0.45 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 46 + 115 * Math.exp(-t / 0.03) + 60 * Math.exp(-t / 0.004);
    ph += (TAU * f) / SR;
    let v = Math.sin(ph) * Math.exp(-t / 0.3) * Math.min(1, t / 0.0015);
    v += noise() * Math.exp(-t / 0.002) * 0.3;
    v = Math.tanh(v * 1.8) * vel * 0.9;
    put(bus, s0 + i, v, v);
    if (send) put(send, s0 + i, v * 0.05, v * 0.05);
  }
}

function snare(bus, t0, vel = 1, send = musicVerb, pan = 0) {
  const s0 = Math.round(t0 * SR);
  const hp = new Biquad().set("hp", 1400, 0.7);
  const bp = new Biquad().set("bp", 4200, 0.8);
  const [gl, gr] = panLR(pan);
  for (let i = 0; i < 0.35 * SR; i++) {
    const t = i / SR;
    const tone = 0.55 * Math.sin(TAU * 185 * t) * Math.exp(-t / 0.05) + 0.3 * Math.sin(TAU * 330 * t) * Math.exp(-t / 0.035);
    const n = noise();
    const nz = (hp.run(n) * 0.7 + bp.run(n) * 0.5) * Math.exp(-t / 0.12);
    const v = (tone + nz) * vel * 0.75;
    put(bus, s0 + i, v * gl, v * gr);
    if (send) put(send, s0 + i, v * 0.25 * gl, v * 0.25 * gr);
  }
}

function clap(bus, t0, vel = 1) {
  const s0 = Math.round(t0 * SR);
  const bp = new Biquad().set("bp", 1250, 1.4);
  for (let i = 0; i < 0.4 * SR; i++) {
    const t = i / SR;
    let env = 0;
    for (const o of [0, 0.011, 0.023]) if (t >= o) env += Math.exp(-(t - o) / 0.006);
    if (t >= 0.031) env += 0.9 * Math.exp(-(t - 0.031) / 0.11);
    const v = bp.run(noise()) * env * vel * 1.3;
    put(bus, s0 + i, v * 0.9, v);
    put(musicVerb, s0 + i, v * 0.35, v * 0.35);
  }
}

const HAT_RATIOS = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 1.72);
function hat(bus, t0, decay, vel = 1, pan = 0.25) {
  const s0 = Math.round(t0 * SR);
  const hp = new Biquad().set("hp", 7200, 0.8);
  const hp2 = new Biquad().set("hp", 7200, 0.8);
  const ph = HAT_RATIOS.map(() => rand());
  const [gl, gr] = panLR(pan);
  for (let i = 0; i < decay * 6 * SR; i++) {
    const t = i / SR;
    let m = 0;
    for (let k = 0; k < 6; k++) m += ((ph[k] + HAT_RATIOS[k] * t) % 1) < 0.5 ? 1 : -1;
    const x = m / 6 * 0.6 + noise() * 0.5;
    const v = hp2.run(hp.run(x)) * Math.exp(-t / decay) * Math.min(1, t / 0.0008) * vel * 0.5;
    put(bus, s0 + i, v * gl, v * gr);
  }
}

function tom(bus, t0, f0, vel = 1, pan = 0) {
  const s0 = Math.round(t0 * SR);
  let ph = 0;
  const [gl, gr] = panLR(pan);
  for (let i = 0; i < 0.4 * SR; i++) {
    const t = i / SR;
    ph += (TAU * f0 * (1 + 0.55 * Math.exp(-t / 0.035))) / SR;
    const v = (Math.sin(ph) * Math.exp(-t / 0.2) + noise() * Math.exp(-t / 0.01) * 0.15) * vel * 0.8;
    put(bus, s0 + i, v * gl, v * gr);
    put(musicVerb, s0 + i, v * 0.2 * gl, v * 0.2 * gr);
  }
}

function perc(bus, t0, vel = 1, pan = -0.4) {
  const s0 = Math.round(t0 * SR);
  const bp = new Biquad().set("bp", 3100, 2.5);
  const [gl, gr] = panLR(pan);
  for (let i = 0; i < 0.12 * SR; i++) {
    const t = i / SR;
    const v = (Math.sin(TAU * 1720 * t) * Math.exp(-t / 0.018) * 0.5 + bp.run(noise()) * Math.exp(-t / 0.012) * 1.2) * vel * 0.55;
    put(bus, s0 + i, v * gl, v * gr);
  }
}

function crash(bus, t0, vel = 1, len = 1.6) {
  const s0 = Math.round(t0 * SR);
  const hpL = new Biquad().set("hp", 4500, 0.7);
  const hpR = new Biquad().set("hp", 4500, 0.7);
  const ph = HAT_RATIOS.map(() => rand());
  for (let i = 0; i < len * SR; i++) {
    const t = i / SR;
    let m = 0;
    for (let k = 0; k < 6; k++) m += ((ph[k] + HAT_RATIOS[k] * 0.77 * t) % 1) < 0.5 ? 1 : -1;
    const env = Math.exp(-t / (len * 0.35)) * Math.min(1, t / 0.002);
    const l = hpL.run(noise() * 0.8 + (m / 6) * 0.4) * env * vel * 0.4;
    const r = hpR.run(noise() * 0.8 + (m / 6) * 0.4) * env * vel * 0.4;
    put(bus, s0 + i, l, r);
  }
}

// pluck for the arpeggio
function pluck(bus, t0, midi, vel = 1, pan = 0) {
  const s0 = Math.round(t0 * SR);
  const f = mtof(midi);
  const a = new Saw(rand());
  const b = new Saw(rand());
  const lp = new Biquad();
  const [gl, gr] = panLR(pan);
  const len = 0.32 * SR;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if (i % 16 === 0) lp.set("lp", 700 + 5200 * Math.exp(-t / 0.05), 1.1);
    const x = a.next(f) * 0.6 + b.next(f * 1.004) * 0.4;
    const v = lp.run(x) * Math.exp(-t / 0.11) * Math.min(1, t / 0.002) * vel * 0.32;
    put(bus, s0 + i, v * gl, v * gr);
    put(delaySend, s0 + i, v * gl * 0.5, v * gr * 0.5);
    put(musicVerb, s0 + i, v * 0.15, v * 0.15);
  }
}

function bassNote(bus, t0, dur, midi, vel = 1, bright = 0.5) {
  const s0 = Math.round(t0 * SR);
  const f = mtof(midi);
  const saw = new Saw(0);
  const lp = new Biquad();
  let sub = 0;
  const len = Math.round((dur + 0.06) * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if (i % 16 === 0) lp.set("lp", 220 + bright * 1600 * Math.exp(-t / 0.07), 1.2);
    sub += (TAU * f) / SR;
    const gate = t < dur ? Math.min(1, t / 0.003) : Math.exp(-(t - dur) / 0.012);
    const v = (lp.run(saw.next(f)) * 0.55 + Math.sin(sub) * 0.6) * gate * vel * 0.55;
    put(bus, s0 + i, v, v);
  }
}

function padChord(bus, t0, t1, notes, vel = 1, attack = 0.25, release = 0.45) {
  const s0 = Math.round(t0 * SR);
  const len = Math.round((t1 - t0 + release) * SR);
  notes.forEach((m, k) => {
    const f = mtof(m);
    const oscs = [new Saw(rand()), new Saw(rand()), new Saw(rand())];
    const det = [1, 2 ** (7 / 1200), 2 ** (-7 / 1200)];
    const lpL = new Biquad().set("lp", 1900, 0.6);
    const lpR = new Biquad().set("lp", 1900, 0.6);
    const pan = (k - (notes.length - 1) / 2) * 0.45;
    const [gl, gr] = panLR(pan);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = t < t1 - t0 ? Math.min(1, t / attack) : Math.exp(-(t - (t1 - t0)) / (release / 3));
      const a = oscs[0].next(f * det[0]);
      const l = a * 0.5 + oscs[1].next(f * det[1]) * 0.5;
      const r = a * 0.5 + oscs[2].next(f * det[2]) * 0.5;
      const vl = lpL.run(l) * env * vel * 0.11;
      const vr = lpR.run(r) * env * vel * 0.11;
      put(bus, s0 + i, vl * gl * 1.2, vr * gr * 1.2);
      put(musicVerb, s0 + i, vl * 0.3, vr * 0.3);
    }
  });
}

// impacts ---------------------------------------------------------------
function boom(t0, { gain = 1, sub = 1, body = 1, crackle = 0, tail = 1, f0 = 70 } = {}) {
  const s0 = Math.round(t0 * SR);
  const lpN = new Biquad().set("lp", 1800, 0.7);
  const bpC = new Biquad().set("bp", 2300, 0.9);
  let ph = 0;
  const len = Math.round(2.2 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 26 + (f0 - 26) * Math.exp(-t / 0.25) + 90 * Math.exp(-t / 0.01);
    ph += (TAU * f) / SR;
    const s = Math.sin(ph) * Math.exp(-t / (0.75 * tail)) * Math.min(1, t / 0.002) * sub;
    const nb = lpN.run(noise()) * Math.exp(-t / (0.22 * tail)) * body * 1.6;
    // crackle: gated noise grains thinning out over time
    let c = 0;
    if (crackle > 0 && rand() < 0.015 * Math.exp(-t / 0.18)) c = noise() * 5;
    const cr = bpC.run(c + noise() * 0.2 * Math.exp(-t / 0.08)) * crackle * Math.exp(-t / 0.28);
    const v = Math.tanh((s * 1.3 + nb) * 1.2) * gain + cr * gain;
    const w = (rand() - 0.5) * cr * gain * 0.6;
    put(fx, s0 + i, v - w, v + w);
    put(fxVerb, s0 + i, (nb * 0.4 + cr * 0.15) * gain, (nb * 0.4 + cr * 0.15) * gain);
  }
}

function bell(t0, midi, gain = 1, pan = 0) {
  const s0 = Math.round(t0 * SR);
  const f = mtof(midi);
  const partials = [
    [1, 1, 1.1],
    [2.0, 0.35, 0.7],
    [2.76, 0.45, 0.5],
    [5.4, 0.18, 0.25],
    [8.93, 0.08, 0.12],
  ];
  const [gl, gr] = panLR(pan);
  for (let i = 0; i < 2.5 * SR; i++) {
    const t = i / SR;
    let v = 0;
    for (const [r, a, d] of partials) v += Math.sin(TAU * f * r * t) * a * Math.exp(-t / d);
    v *= Math.min(1, t / 0.001) * gain * 0.22;
    put(fx, s0 + i, v * gl, v * gr);
    put(fxVerb, s0 + i, v * 0.3, v * 0.3);
  }
}

function reverseSwell(t0, t1, gain = 1) {
  // noise that grows towards t1 and cuts off: the "suck-in" before a hit
  const s0 = Math.round(t0 * SR);
  const len = Math.round((t1 - t0) * SR);
  const lpL = new Biquad();
  const lpR = new Biquad();
  for (let i = 0; i < len; i++) {
    const x = i / len;
    if (i % 32 === 0) {
      lpL.set("lp", 300 + 2600 * x * x, 0.9);
      lpR.set("lp", 300 + 2600 * x * x, 0.9);
    }
    const env = x ** 3 * gain * 0.5;
    put(fx, s0 + i, lpL.run(noise()) * env, lpR.run(noise()) * env);
  }
}

function riser(t0, t1, gain = 1) {
  const s0 = Math.round(t0 * SR);
  const len = Math.round((t1 - t0) * SR);
  const bpL = new Biquad();
  const bpR = new Biquad();
  const saw = new Saw(0);
  for (let i = 0; i < len; i++) {
    const x = i / len;
    if (i % 32 === 0) {
      bpL.set("bp", 250 * 10 ** (x * 1.0), 2.2);
      bpR.set("bp", 260 * 10 ** (x * 1.0), 2.2);
    }
    const env = (x ** 2) * gain * Math.min(1, (len - i) / (0.004 * SR));
    const tone = saw.next(110 * 2 ** (x * 2)) * 0.08;
    put(fx, s0 + i, (bpL.run(noise()) * 1.4 + tone) * env, (bpR.run(noise()) * 1.4 + tone) * env);
  }
}

function tick(bus, t0, vel = 1) {
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < 0.03 * SR; i++) {
    const t = i / SR;
    const v = Math.sin(TAU * 2600 * t) * Math.exp(-t / 0.004) * vel * 0.4;
    put(bus, s0 + i, v, v);
  }
}

// ---------- arrangement ----------
const H = score.hits;
const DROP = score.drop.start;
const beats = [];
for (let k = 0; ; k++) {
  const t = score.beatZero + k * BEAT;
  if (t > score.duration) break;
  beats.push(t);
}
const chordAt = (t) => score.chords.find((c) => t >= c.start - 1e-6 && t < c.end - 1e-6);

// intro: stopwatch ticks
for (let t = H.intro; t < 1.3; t += STEP * 2) tick(drums, t, 0.7);

// pads
for (const c of score.chords) {
  const drop = c.start >= DROP - 1e-6;
  padChord(synths, c.start, c.end, drop ? [...c.notes, c.notes[0] + 12] : c.notes, drop ? 1.1 : 0.9, c.start === H.intro ? 0.5 : 0.12, 0.5);
}

// bass: 8ths before the drop, 16th groove in the drop
for (let t = 1.34; t < 9.34 - 1e-6; t += STEP * (t >= DROP - 1e-6 ? 1 : 2)) {
  const c = chordAt(t);
  if (!c) continue;
  const inDrop = t >= DROP - 1e-6;
  const step = Math.round((t - 1.34) / STEP);
  if (inDrop) {
    const s = step % 16;
    if ([1, 5, 9, 13].includes(s)) continue; // leave air after the kick
    const up = [3, 7, 11, 14, 15].includes(s);
    bassNote(synths, t, STEP * 0.8, c.bass + (up ? 12 : 0), 1, 0.9);
  } else {
    if (t > H.explosion - 0.05 && t < 5.34) continue;
    bassNote(synths, t, STEP * 1.6, c.bass + (step % 4 === 2 ? 12 : 0), 0.9, 0.4);
  }
}

// arpeggio
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
for (let t = 1.34, n = 0; t < 9.34 - 1e-6; t += STEP, n++) {
  const c = chordAt(t);
  if (!c) continue;
  if (t > H.explosion - 0.02 && t < 5.3) continue;
  const tones = [c.notes[0] + 12, c.notes[1] + 12, c.notes[2] + 12, c.notes[0] + 24];
  const inDrop = t >= DROP - 1e-6;
  pluck(synths, t, tones[ARP[n % 8]], (n % 4 === 0 ? 1 : 0.7) * (inDrop ? 1 : 0.85), n % 2 ? 0.35 : -0.35);
}

// pre-drop drums (heard through the wall)
for (const t of beats) {
  if (t < 1.34 - 1e-6 || t >= DROP - 1e-6) continue;
  if (Math.abs(t - 4.84) < 0.01 || Math.abs(t - 6.84) < 0.01) continue; // space for the boom / the build
  kick(drums, t, 0.8);
}
for (let t = 3.34 + BEAT / 2; t < 6.5; t += BEAT) if (Math.abs(t - H.explosion) > 0.2) hat(drums, t, 0.05, 0.6);
for (const t of [3.84, 4.34]) snare(drums, t, 0.7);
// snare roll into the drop
for (let t = 6.59; t < 7.3; ) {
  const x = (t - 6.59) / 0.71;
  snare(drums, t, 0.25 + 0.6 * x, musicVerb, 0);
  t += x < 0.55 ? STEP : STEP / 2;
}
// typing clicks while the prompt is typed (5.33 – 6.0 s)
for (let t = 5.36; t < 6.0; t += 0.045 + rand() * 0.03) perc(drums, t, 0.35, (rand() - 0.5) * 0.8);

// the drop bar from score.json — the 3D pads read the very same steps
const tr = score.drop.tracks;
const at = (s) => DROP + s * score.drop.stepSeconds;
tr.kick.forEach((s) => kick(drums, at(s), 1.05, musicVerb));
tr.snare.forEach((s) => snare(drums, at(s), 1));
tr.clap.forEach((s) => clap(drums, at(s), 0.9));
tr.hatClosed.forEach((s) => hat(drums, at(s), 0.035, s % 2 ? 0.55 : 0.85, 0.3));
tr.hatOpen.forEach((s) => hat(drums, at(s), 0.16, 0.75, -0.3));
tr.perc.forEach((s, k) => perc(drums, at(s), 0.8, k % 2 ? 0.5 : -0.5));
tr.tomLow.forEach((s) => tom(drums, at(s), 98, 1, -0.3));
tr.tomMid.forEach((s) => tom(drums, at(s), 131, 1, 0));
tr.tomHigh.forEach((s) => tom(drums, at(s), 175, 1, 0.3));
tr.crash.forEach((s) => crash(drums, at(s), 0.9, 1.8));

// impacts
boom(H.intro, { gain: 0.85, sub: 1, body: 0.7, f0: 80, tail: 0.8 });
bell(H.intro, 81, 0.35, 0.2);
reverseSwell(4.3, H.explosion, 0.9);
boom(H.explosion, { gain: 1.1, sub: 1.2, body: 1.2, crackle: 1, tail: 1.2, f0: 75 });
reverseSwell(6.05, H.collapse, 1.0);
boom(H.collapse, { gain: 0.7, sub: 0.9, body: 0.4, f0: 90, tail: 0.6 });
bell(H.collapse, 81, 1, -0.15);
bell(H.collapse + 0.002, 88, 0.55, 0.25);
riser(H.collapse + 0.05, 7.3, 0.55);
boom(H.finale, { gain: 1.0, sub: 1.2, body: 0.9, f0: 70, tail: 1.3 });
padChord(fx, H.finale, 9.9, [45, 57, 60, 64, 69], 2.4, 0.004, 0.9);
crash(fx, H.finale, 0.8, 2.0);
bell(H.finale, 69, 0.6, 0);

// ---------- processing ----------
// sidechain: synths duck under every kick of the drop and deep after the explosion
const duck = new Float32Array(N).fill(1);
const duckAt = (t, depth, rel) => {
  const s0 = Math.round(t * SR);
  for (let i = 0; i < rel * 5 * SR; i++) {
    const j = s0 + i;
    if (j >= N) break;
    const g = 1 - depth * Math.exp(-i / SR / rel);
    if (g < duck[j]) duck[j] = g;
  }
};
tr.kick.forEach((s) => duckAt(at(s), 0.55, 0.09));
for (const t of beats) if (t >= 1.34 && t < DROP) duckAt(t, 0.35, 0.1);
duckAt(H.explosion, 0.85, 0.35);
duckAt(H.collapse, 0.6, 0.2);
for (let i = 0; i < N; i++) {
  synths[0][i] *= duck[i];
  synths[1][i] *= duck[i];
}

function pingPong(send, time, fb, mix) {
  const d = Math.round(time * SR);
  const out = makeBus();
  const lp = [new Biquad().set("lp", 3500), new Biquad().set("lp", 3500)];
  const bufL = new Float32Array(N);
  const bufR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const dl = i >= d ? bufR[i - d] : 0;
    const dr = i >= d ? bufL[i - d] : 0;
    bufL[i] = send[0][i] + lp[0].run(dl) * fb;
    bufR[i] = lp[1].run(dr) * fb;
    out[0][i] = dl * mix;
    out[1][i] = dr * mix;
  }
  return out;
}

// Freeverb (Schroeder/Moorer): 8 combs + 4 all-passes per side
function freeverb(send, room = 0.84, damp = 0.3, wet = 1) {
  const scale = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const out = makeBus();
  for (let ch = 0; ch < 2; ch++) {
    const spread = ch ? 23 : 0;
    const combs = combT.map((c) => ({ buf: new Float32Array(Math.round((c + spread) * scale)), i: 0, f: 0 }));
    const aps = apT.map((c) => ({ buf: new Float32Array(Math.round((c + spread) * scale)), i: 0 }));
    const x = send[ch];
    const y = out[ch];
    for (let n = 0; n < N; n++) {
      const inp = x[n] * 0.015;
      let s = 0;
      for (const c of combs) {
        const o = c.buf[c.i];
        c.f = o * (1 - damp) + c.f * damp;
        c.buf[c.i] = inp + c.f * room;
        if (++c.i >= c.buf.length) c.i = 0;
        s += o;
      }
      for (const a of aps) {
        const o = a.buf[a.i];
        a.buf[a.i] = s + o * 0.5;
        if (++a.i >= a.buf.length) a.i = 0;
        s = o - s;
      }
      y[n] = s * wet;
    }
  }
  return out;
}

const delayed = pingPong(delaySend, BEAT * 0.75, 0.38, 0.55);
const mVerb = freeverb(musicVerb, 0.82, 0.35, 3.2);
const fVerb = freeverb(fxVerb, 0.78, 0.35, 2.2);

// the wall: 24 dB/oct Butterworth low-pass, closed until 7.3 s
const music = makeBus();
for (let i = 0; i < N; i++) {
  for (let ch = 0; ch < 2; ch++) {
    music[ch][i] = synths[ch][i] + drums[ch][i] * 0.95 + delayed[ch][i] + mVerb[ch][i];
  }
}
const F = score.filter;
function cutoff(t) {
  if (t < F.sweep[0]) {
    // closed; breathes a little wider through the build after the collapse
    const build = Math.max(0, Math.min(1, (t - score.hits.collapse) / (F.sweep[0] - score.hits.collapse)));
    return F.closedHz * (1 + 0.9 * build * build);
  }
  if (t >= F.sweep[1]) return 20000;
  const x = (t - F.sweep[0]) / (F.sweep[1] - F.sweep[0]);
  const from = F.closedHz * 1.9;
  return from * (20000 / from) ** (x * x * (3 - 2 * x));
}
for (let ch = 0; ch < 2; ch++) {
  const a = new Biquad();
  const b = new Biquad();
  const sig = music[ch];
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if (t >= F.sweep[1] + 0.05) break; // fully open: leave the rest untouched
    if (i % 16 === 0) {
      const fc = cutoff(t);
      a.set("lp", fc, 0.5412);
      b.set("lp", fc, 1.3066);
    }
    const y = b.run(a.run(sig[i]));
    // crossfade out of the filter right after it is fully open (no click)
    const x = Math.max(0, Math.min(1, (t - F.sweep[1]) / 0.05));
    sig[i] = y * (1 - x) + sig[i] * x;
  }
}
// the muffled part sits a bit lower so the opening reads as a lift
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const x = Math.max(0, Math.min(1, (t - F.sweep[0]) / (F.sweep[1] - F.sweep[0])));
  const g = db(-4.5 * (1 - x));
  music[0][i] *= g;
  music[1][i] *= g;
}

// master
const L = new Float32Array(N);
const R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = music[0][i] + fx[0][i] * 0.9 + fVerb[0][i];
  R[i] = music[1][i] + fx[1][i] * 0.9 + fVerb[1][i];
}
// DC/rumble cleanup
for (const sig of [L, R]) {
  const hp = new Biquad().set("hp", 24, 0.7071);
  for (let i = 0; i < N; i++) sig[i] = hp.run(sig[i]);
}

// look-ahead peak limiter
function limit(ceilingDb, driveDb) {
  const ceil = db(ceilingDb);
  const drive = db(driveDb);
  const look = Math.round(0.004 * SR);
  const rel = Math.exp(-1 / (0.09 * SR));
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = Math.max(Math.abs(L[i]), Math.abs(R[i])) * drive;
    need[i] = p > ceil ? ceil / p : 1;
  }
  // min over the look-ahead window, then smooth release
  const gmin = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let m = 1;
    for (let k = 0; k <= look && i + k < N; k++) if (need[i + k] < m) m = need[i + k];
    gmin[i] = m;
  }
  let g = 1;
  for (let i = 0; i < N; i++) {
    g = gmin[i] < g ? gmin[i] : gmin[i] + (g - gmin[i]) * rel;
    L[i] *= drive * g;
    R[i] *= drive * g;
  }
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const preGain = -20 * Math.log10(peak); // bring raw peak to 0 dBFS reference
const DRIVE = Number(process.env.DRIVE ?? 3);
limit(-2.2, preGain + DRIVE); // headroom for AAC overshoot (true peak ≤ −1 dBTP after encoding)

// short fades at the edges
const fadeIn = Math.round(0.004 * SR);
const fadeOut = Math.round(0.18 * SR);
for (let i = 0; i < fadeIn; i++) {
  L[i] *= i / fadeIn;
  R[i] *= i / fadeIn;
}
for (let i = 0; i < fadeOut; i++) {
  const g = (i / fadeOut) ** 2;
  L[N - 1 - i] *= g;
  R[N - 1 - i] *= g;
}

// write 16-bit WAV with TPDF dither
const out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0);
out.writeUInt32LE(36 + N * 4, 4);
out.write("WAVE", 8);
out.write("fmt ", 12);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20);
out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32);
out.writeUInt16LE(16, 34);
out.write("data", 36);
out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  for (let ch = 0; ch < 2; ch++) {
    const v = (ch ? R : L)[i] * 32767 + (rand() - rand());
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v))), 44 + i * 4 + ch * 2);
  }
}
const dest = new URL("../public/music.wav", import.meta.url);
fs.writeFileSync(dest, out);
console.log(`music.wav: ${score.duration}s, ${SR} Hz, drive +${DRIVE} dB`);
