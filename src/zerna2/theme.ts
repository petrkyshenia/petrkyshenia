// Teaser 2: "Coming soon" posters → strobe question → light over the genplan → logo + CTA.
// Frame map transcribed from the reference reel (720x1280, 30 fps, 150 BPM).

/** 15 s: the track's last hit is at 12.13 s, its echo tail (music-tail.wav) fades out by 14.9 s. */
export const DURATION = 450;

export const T = {
  // a poster is pasted ~3 frames after every eighth-note tick (0.2 s)
  posters: [0, 6, 13, 18, 25, 31, 36, 43, 49, 54, 61, 66, 73] as const,
  strobe: 79, // 79..185
  line1In: 81, // first line slides in with motion blur (81..83)
  ghosts: [90, 94, 95, 96, 97] as const, // frames with a vertical echo of the first line
  line2In: 128, // second line slides in (128..130)
  scatter: [136, 156] as const, // the second line scattered over the frame
  beam: 186, // 186..292: warm light sweeps over the genplan in the dark
  card: 293, // logo card fades in (on the 9.6 s hit)
  type: [335, 360] as const, // CTA types itself letter by letter
  hit: 364, // last hit of the track (12.13 s): sub line + soft flash
} as const;

/** Background tone of every strobe frame 79..185 (K black, M mid, L light, W white in the reference). */
export const TONES = "MWLMKLWWWLMMLWLKMMMLWMKMLWMMMKMLLMKMWWLLMKLWLMMMLLWLKMLWWMKMMLLMKKMWLMMKMWLLMKLWLLMMMLWLKMLWWMMKMLLMKKMWWLM";

export type Text2 = {
  poster: string; // repeated on every poster
  line1: string; // small first line of the question
  line2: string; // big second line, also scattered
  row: string; // small row under the logo
  cta: string; // typed letter by letter
  sub: string;
};

// Approved text (tone "whisper", formal "ви"); the question repeats teaser 1 so the posts read as a series.
export const TEXT2: Text2 = {
  poster: "ВАРТО УВАГИ",
  line1: "А ВИ",
  line2: "ГОТОВІ?",
  row: "КЛУБНЕ МІСТЕЧКО · КАРПАТИ",
  cta: "ДІЗНАЙТЕСЯ ПЕРШИМИ",
  sub: "посилання в шапці профілю",
};
