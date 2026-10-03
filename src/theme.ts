import { Easing, interpolate } from "remotion";
import score from "./audio/score.json";

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = Math.round(score.duration * FPS); // 309 frames = 10.3 s

export const C = {
  bg: "#07070A",
  gold: "#FFC23D",
  pink: "#FF3D7F",
  cyan: "#25E2FF",
  ink: "#F2F2F5",
  mute: "#A4A4B0",
  line: "rgba(242,242,245,0.14)",
} as const;

export const HEAD = "'Unbounded', sans-serif";
export const MONO = "'JetBrains Mono', monospace";

// Chapters (frames, [from, to)). Cuts land on 1.3 / 3.3 / 5.3 / 7.3 / 9.3 s.
export const CH = {
  intro: [0, 39],
  graphics: [39, 99],
  opus: [99, 159],
  prompt: [159, 219],
  sound: [219, 279],
  finale: [279, DURATION],
} as const;

// Visual impact frames. Audio hits sit at 0.34 / 4.88 / 6.5 / 9.34 s (score.json);
// the "5.5" makes contact at exactly 4.9 s as requested.
export const HIT = {
  intro: Math.round(score.hits.intro * FPS), // 10
  explosion: Math.round(4.9 * FPS), // 147
  collapse: Math.round(score.hits.collapse * FPS), // 195
  finale: Math.round(score.hits.finale * FPS), // 280
} as const;

export const crisp = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0→1 between frames a and b with easing. */
export const prog = (f: number, a: number, b: number, easing: (t: number) => number = crisp) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** Exponential decay after an event; 0 before it. */
export const decay = (f: number, at: number, frames: number) => (f < at ? 0 : Math.exp(-(f - at) / frames));

export { score };
