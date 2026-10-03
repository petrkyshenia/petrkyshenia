import { C, HEAD, MONO, crisp, prog } from "../theme";

/** Chapter title: letters rise out of a mask, captions follow. */
export const Title: React.FC<{
  frame: number;
  text: string;
  start: number;
  captions: React.ReactNode[];
  size?: number;
  punch?: number;
}> = ({ frame, text, start, captions, size = 136, punch = 0 }) => {
  return (
    <div style={{ position: "absolute", left: 100, top: "50%", transform: "translateY(-50%)" }}>
      <div
        style={{
          fontFamily: HEAD,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.05,
          color: C.ink,
          display: "flex",
          letterSpacing: "-0.01em",
          transform: `scale(${1 + punch * 0.06})`,
          transformOrigin: "left center",
        }}
      >
        {[...text].map((ch, i) => {
          const p = prog(frame, start + i * 1.4, start + i * 1.4 + 11, crisp);
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.06em" }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>{ch}</span>
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14 }}>
        {captions.map((c, i) => {
          const p = prog(frame, start + 8 + i * 3, start + 18 + i * 3);
          return (
            <div
              key={i}
              style={{
                fontFamily: MONO,
                fontSize: 36,
                color: i === 0 ? C.ink : C.mute,
                letterSpacing: "0.02em",
                opacity: p,
                transform: `translateX(${(1 - p) * -24}px)`,
              }}
            >
              {c}
            </div>
          );
        })}
      </div>
    </div>
  );
};
