import { AbsoluteFill, Img, random, staticFile, useCurrentFrame } from "remotion";
import { fitSize } from "../zerna/fonts";
import { C, MURS } from "../zerna/theme";
import { T } from "./theme";

const PW = 302; // poster width: 28 % of the frame, A-format like the reference
const PH = Math.round(PW * 1.414);

// 3x3 grid (centres in % of the frame) in the order the reference pastes them,
// then four big posters dropped over the centre: [x %, y %, rotation °, scale]
const SLOTS: [number, number, number, number][] = [
  [50.2, 49.9, 0, 1],
  [78.7, 49.9, 0, 1],
  [21.7, 49.9, 0, 1],
  [50.2, 26.7, 0, 1],
  [78.7, 26.7, 0, 1],
  [21.7, 26.7, 0, 1],
  [50.2, 73.0, 0, 1],
  [78.7, 73.0, 0, 1],
  [21.7, 73.0, 0, 1],
  [51.0, 48.5, 4, 1.4],
  [48.5, 50.0, -36, 1.4],
  [51.5, 48.0, 38, 1.4],
  [50.2, 47.5, 0, 1.4],
];

const Poster: React.FC<{ text: string; i: number; slot: (typeof SLOTS)[number] }> = ({ text, i, slot }) => {
  const [x, y, rot, scale] = slot;
  // wheat-pasted by hand: never perfectly straight
  const jr = (random(`r${i}`) - 0.5) * 1.6;
  const jx = (random(`x${i}`) - 0.5) * 6;
  const jy = (random(`y${i}`) - 0.5) * 6;
  const pad = PW * 0.07;
  // the phrase stacked word by word and repeated, each word justified to the full width (a typographic poster)
  const words = text.split(" ");
  const lines = Array.from({ length: 4 }, () => words).flat();
  const sizes = lines.map((w) => fitSize([w], MURS, 900, PW - 2 * pad, 200));
  const room = PH - 2 * pad - PH * 0.07; // under the sprout
  const k = Math.min(1, room / sizes.reduce((a, b) => a + b * 0.86, 0));
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: PW,
        height: PH,
        transform: `translate(-50%, -50%) translate(${jx}px, ${jy}px) rotate(${rot + jr}deg) scale(${scale})`,
        boxShadow: "0 14px 22px rgba(20,10,0,0.55), 0 2px 4px rgba(20,10,0,0.4)",
        background: `url(${staticFile("zerna2/paper.png")}) center / cover`,
        padding: pad,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Img src={staticFile("zerna2/icon-green.png")} style={{ height: PH * 0.045, alignSelf: "flex-start", opacity: 0.85 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {lines.map((w, j) => (
          <div key={j} style={{ fontFamily: MURS, fontWeight: 900, fontSize: sizes[j] * k, lineHeight: 0.86, color: C.green, whiteSpace: "nowrap" }}>
            {w}
          </div>
        ))}
      </div>
    </div>
  );
};

/** 0–2.6 s: posters pasted one per tick on a wall of vertical boards, lit from the top. */
export const Wall: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const shown = T.posters.filter((at) => frame >= at).length;
  return (
    <AbsoluteFill>
      <Img src={staticFile("zerna2/wood-wall.jpg")} style={{ width: "100%", height: "100%" }} />
      {SLOTS.slice(0, shown).map((slot, i) => (
        <Poster key={i} i={i} slot={slot} text={text} />
      ))}
      {/* light pool from the top centre and a heavy vignette, as on the reference wall */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 70% 38% at 50% 14%, rgba(255,236,205,0.30) 0%, rgba(255,236,205,0.08) 55%, transparent 80%)",
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 38%, transparent 45%, rgba(12,6,0,0.62) 100%)" }} />
    </AbsoluteFill>
  );
};

