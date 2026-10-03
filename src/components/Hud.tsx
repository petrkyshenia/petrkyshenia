import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, CH, DURATION, MONO, prog, score } from "../theme";

const LABELS: { from: number; n: string; label: string }[] = [
  { from: CH.graphics[0], n: "01", label: "ГРАФИКА" },
  { from: CH.opus[0], n: "02", label: "МЕТАЛЛ" },
  { from: CH.prompt[0], n: "03", label: "ПРОМПТ" },
  { from: CH.sound[0], n: "04", label: "ЗВУК" },
];

/** Running time as 00,00 — reaches exactly 10,30 on the last frame. */
export const clock = (frame: number) => {
  const t = (frame / (DURATION - 1)) * score.duration;
  return t.toFixed(2).padStart(5, "0").replace(".", ",");
};

export const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const appear = prog(frame, 33, 41);
  const t = (frame / (DURATION - 1)) * score.duration;
  const style = { fontFamily: MONO, fontSize: 34, letterSpacing: "0.04em", color: C.ink } as const;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 80, top: 58, opacity: appear, transform: `translateY(${(1 - appear) * -12}px)` }}>
        <div style={{ ...style, display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ color: C.pink, fontSize: 24 }}>●</span>
          <span style={{ fontWeight: 700 }}>{clock(frame)}</span>
          <span style={{ color: C.mute }}>/ 10,30 с</span>
        </div>
        <div style={{ marginTop: 14, width: 330, height: 3, background: C.line, borderRadius: 2 }}>
          <div style={{ width: `${(t / score.duration) * 100}%`, height: "100%", background: C.gold, borderRadius: 2 }} />
        </div>
      </div>
      {LABELS.map((l, i) => {
        const next = LABELS[i + 1]?.from ?? CH.finale[0];
        const inP = prog(frame, l.from + 1, l.from + 8);
        const outP = prog(frame, next - 1, next + 2);
        if (frame < l.from - 1 || outP >= 1) return null;
        return (
          <div
            key={l.n}
            style={{
              ...style,
              position: "absolute",
              right: 80,
              top: 58,
              display: "flex",
              gap: 18,
              opacity: inP * (1 - outP),
              transform: `translateY(${interpolate(inP, [0, 1], [22, 0]) - outP * 22}px)`,
            }}
          >
            <span style={{ color: C.gold, fontWeight: 700 }}>{l.n}</span>
            <span>{l.label}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
