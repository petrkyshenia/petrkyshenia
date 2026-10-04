import { Easing, interpolate } from "remotion";

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/** Length of the reference track: 383 frames = 12.77 s. */
export const TRACK_END = 383;
/** Frames the logo + CTA hold after the music ends (silent tail): CTA stays ~3.2 s in total. */
export const HOLD = 67;
export const DURATION = TRACK_END + HOLD;

// Brand book "Zerna Development", p. 13.
export const C = {
  green: "#08281D",
  greenLift: "#0E3A2A",
  greenDeep: "#051A12",
  ivory: "#FAF6F0",
  sand: "#C0AF94",
  yellow: "#FDD64C",
  // mid tone for the glitch strobe: green mixed 42 % towards sand
  mid: "#55614F",
} as const;

export const MURS = "'Murs Gothic', sans-serif";
export const EUKR = "'e-Ukraine', sans-serif";

/**
 * Frame map taken from the reference reel (720x1280, 30 fps, 140 BPM).
 * Every word cut sits on a half-bar: 0.857 s = 25.7 frames.
 */
export const T = {
  words: [18, 43, 69, 120, 146, 171, 198] as const,
  glitch: 94, // 94..119: strobe on the 3rd word, over the snare roll
  picture: 224, // footage fades in from the background
  letters: 224, // brand line flickers in letter by letter, together with the picture
  scatter: 266, // brand line flies apart just before the first fact
  // Facts land on the next half-bars of the track (onsets 9.22 / 10.07 / 10.86 s), a frame early like the cuts above
  facts: [276, 301, 326] as const,
  leak: 304, // warm light leak, with "on the mountain top"
  streak: 336, // horizontal light streak
  defocus: 342, // picture and last fact melt into green (replaces the dark ring)
  logo: 348, // logo pulls into focus
  hit: 354, // last hit of the track (11.83 s): CTA lands
  sub: 364,
} as const;

export type Variant = {
  /** Seven words, one per half-bar; the 3rd one gets the glitch. */
  words: readonly string[];
  /** Brand line revealed letter by letter over the picture. */
  reveal: readonly string[];
  /** One fact per half-bar after the brand line (lines of each), see T.facts. */
  facts: readonly (readonly string[])[];
  /** Call to action under the logo. */
  cta: readonly string[];
  sub: string;
};

// Approved text (variant A). Tone: "whisper", formal "ви".
export const TEXT: Variant = {
  words: ["А", "ВИ", "ГОТОВІ?", "НОВИЙ", "ПРОЄКТ", "У", "КАРПАТАХ"],
  reveal: ["ВАРТУЄ", "УВАГИ"],
  facts: [
    ["ВСЬОГО", "130 КМ", "ВІД ЛЬВОВА"],
    ["НА ВЕРШИНІ", "ГОРИ"],
    ["ЛИШЕ 24", "БУДИНКИ"],
  ],
  cta: ["ДІЗНАЙТЕСЯ", "ПЕРШИМИ"],
  sub: "посилання в шапці профілю",
};

export type Picture = {
  src: string;
  /** The one sharp detail, in % of the frame. */
  focus: { x: number; y: number; r: number };
};

export const crisp = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 between frames a and b with easing. */
export const prog = (f: number, a: number, b: number, easing: (t: number) => number = crisp) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** Opacity of a letter that flickers on at frame `at` (the reference's letter-by-letter reveal). */
const FLICKER = [0.35, 0.05, 0.75, 0.45, 1];
export const flicker = (f: number, at: number) => (f < at ? 0 : (FLICKER[f - at] ?? 1));
/** Shorter flicker for the facts: each one only has a half-bar on screen. */
const FAST = [0.55, 0.15, 1];
export const flickerFast = (f: number, at: number) => (f < at ? 0 : (FAST[f - at] ?? 1));
