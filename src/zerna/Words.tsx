import { AbsoluteFill, useCurrentFrame } from "remotion";
import { fitSize } from "./fonts";
import { C, EUKR, MURS, T, W } from "./theme";

type Face = { family: string; weight: number; style?: string; width: number };

// Glitch faces. `width` is the share of the frame the word is fitted to.
const F: Record<string, Face> = {
  murs: { family: MURS, weight: 900, width: 0.8 },
  thin: { family: EUKR, weight: 100, width: 0.78 },
  bold: { family: EUKR, weight: 700, width: 0.74 },
  serif: { family: "'Playfair Display'", weight: 400, width: 0.8 },
  serifBold: { family: "'Playfair Display'", weight: 800, width: 0.78 },
  cond: { family: "Oswald", weight: 300, width: 0.62 },
  condBold: { family: "Oswald", weight: 600, width: 0.66 },
  hand: { family: "Caveat", weight: 700, width: 0.7 },
  script: { family: "Lobster", weight: 400, width: 0.74 },
  round: { family: "Comfortaa", weight: 300, width: 0.72 },
};

type Bg = "green" | "mid" | "sand" | "ivory";

// One entry per frame 94..119, transcribed from the reference: background tone + face.
// Ivory frames hide the (ivory) word, exactly like the white flashes in the original.
const STROBE: [Bg, keyof typeof F][] = [
  ["mid", "serif"],
  ["sand", "serif"],
  ["ivory", "murs"],
  ["ivory", "murs"],
  ["sand", "hand"],
  ["green", "thin"],
  ["mid", "cond"],
  ["sand", "condBold"],
  ["sand", "bold"],
  ["ivory", "murs"],
  ["mid", "serif"],
  ["green", "serifBold"],
  ["mid", "condBold"],
  ["mid", "condBold"],
  ["sand", "hand"],
  ["ivory", "murs"],
  ["mid", "round"],
  ["green", "script"],
  ["green", "hand"],
  ["mid", "murs"],
  ["sand", "serif"],
  ["sand", "hand"],
  ["mid", "script"],
  ["mid", "script"],
  ["green", "serif"],
  ["mid", "serif"],
];

/** Flat brand backgrounds with the soft vignette the reference has on its white frames. */
export const Backdrop: React.FC<{ tone: Bg }> = ({ tone }) => {
  if (tone === "ivory") {
    return (
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse 75% 60% at 50% 48%, ${C.ivory} 0%, ${C.ivory} 55%, #EEE8DD 100%)` }}
      />
    );
  }
  if (tone === "green") {
    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 70% at 35% 30%, ${C.greenLift} 0%, ${C.green} 55%, ${C.greenDeep} 100%)`,
        }}
      />
    );
  }
  return <AbsoluteFill style={{ background: tone === "mid" ? C.mid : C.sand }} />;
};

const Word: React.FC<{ text: string; face: Face; size: number; color: string }> = ({ text, face, size, color }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <div
      style={{
        fontFamily: face.family,
        fontWeight: face.weight,
        fontStyle: face.style ?? "normal",
        fontSize: size,
        lineHeight: 1,
        color,
        whiteSpace: "nowrap",
        // optical centre: the reference sits its words 1 % above the middle
        transform: "translateY(-1%)",
      }}
    >
      {text}
    </div>
  </AbsoluteFill>
);

/** 0–7.47 s: one word per half-bar on alternating green / ivory, glitch on the 3rd word. */
export const Words: React.FC<{ words: readonly string[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  // One size for every word, set by the widest one (Murs Gothic is twice as wide as the reference face).
  const size = fitSize(words, MURS, 900, W * 0.84, 170);

  if (frame < T.words[0]) return <Backdrop tone="green" />;

  if (frame >= T.glitch && frame < T.words[3]) {
    const [tone, key] = STROBE[frame - T.glitch];
    const face = F[key];
    const s = fitSize([words[2]], face.family, face.weight, W * face.width, 260, face.style);
    return (
      <AbsoluteFill>
        <Backdrop tone={tone} />
        <Word text={words[2]} face={face} size={s} color={C.ivory} />
      </AbsoluteFill>
    );
  }

  let i = 0;
  while (i < T.words.length - 1 && frame >= T.words[i + 1]) i++;
  const onIvory = i % 2 === 1;
  return (
    <AbsoluteFill>
      <Backdrop tone={onIvory ? "ivory" : "green"} />
      <Word text={words[i]} face={F.murs} size={size} color={onIvory ? C.green : C.ivory} />
    </AbsoluteFill>
  );
};
