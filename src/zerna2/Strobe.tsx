import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitSize } from "../zerna/fonts";
import { C, MURS, W } from "../zerna/theme";
import { Backdrop } from "../zerna/Words";
import { T, TONES } from "./theme";

const TONE = { K: "green", M: "mid", L: "sand", W: "ivory" } as const;

// Motion-blurred slide-ins, as in the reference: [x offset px, blur px] per frame after the start
const SLIDE: [number, number][] = [
  [260, 10],
  [90, 5],
  [25, 2],
];

// The second line scattered over the frame (136..156): [top %, size × line2, left % from → to, opacity]
const SCATTER: [number, number, number, number, number][] = [
  [7, 1.0, 58, 44, 1],
  [16, 0.8, 70, 60, 1],
  [29, 0.35, -12, -2, 1],
  [56, 1.6, 74, 56, 1],
  [45, 1.2, -4, 8, 0.4],
  [63, 0.6, -10, 2, 0.5],
  [76, 0.25, 4, 12, 1],
  [89, 0.7, 84, 72, 1],
];

const text = (size: number): React.CSSProperties => ({
  fontFamily: MURS,
  fontWeight: 900,
  fontSize: size,
  lineHeight: 1,
  color: C.ivory,
  whiteSpace: "nowrap",
});

/** 2.6–6.2 s: background strobes every frame, the question builds up, scatters, settles. */
export const Strobe: React.FC<{ line1: string; line2: string }> = ({ line1, line2 }) => {
  const frame = useCurrentFrame();
  const tone = TONE[TONES[frame - T.strobe] as keyof typeof TONE] ?? "green";
  const size2 = fitSize([line2], MURS, 900, W * 0.86, 175);
  const size1 = Math.min(110, size2 * 0.6);

  const slide = (start: number) => SLIDE[frame - start] ?? [0, 0];
  const [x1, b1] = slide(T.line1In);
  const [x2, b2] = slide(T.line2In);
  const showLine1 = frame >= T.line1In;
  const showLine2 = frame >= T.line2In;
  const scattered = frame >= T.scatter[0] && frame <= T.scatter[1];
  const ghost = (T.ghosts as readonly number[]).includes(frame);

  return (
    <AbsoluteFill>
      <Backdrop tone={tone} />
      {scattered ? (
        SCATTER.map(([top, k, from, to, o], i) => (
          <div
            key={i}
            style={{
              ...text(size2 * k),
              position: "absolute",
              top: `${top}%`,
              left: `${interpolate(frame, T.scatter, [from, to])}%`,
              opacity: o,
            }}
          >
            {line2}
          </div>
        ))
      ) : (
        // the first line keeps its place (46 % from the top); the second one lands under it
        <div style={{ position: "absolute", top: "46.4%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {showLine1 && (
            <div style={{ ...text(size1), transform: `translateX(${x1}px)`, filter: `blur(${b1}px)` }}>{line1}</div>
          )}
          {ghost && <div style={{ ...text(size1), opacity: 0.5, marginTop: size1 * 0.15 }}>{line1}</div>}
          {showLine2 && !ghost && (
            <div style={{ ...text(size2), marginTop: size1 * 0.22, transform: `translateX(${x2}px)`, filter: `blur(${b2}px)` }}>
              {line2}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
