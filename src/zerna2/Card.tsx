import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fitSize } from "../zerna/fonts";
import { C, EUKR, MURS, W, inOut, prog } from "../zerna/theme";
import { Backdrop } from "../zerna/Words";
import { DURATION, T } from "./theme";

const LOGO_W = 430; // vertical logo, 972x858 source

/**
 * 9.8 s → end: logo card; the CTA types itself like "Tickets Available Now" in the reference,
 * the sub line and a soft flash land on the last hit, then the echo tail carries the hold.
 * Nothing is applied to the logo itself (brand book p. 11); only the whole card drifts in.
 */
export const Card: React.FC<{ row: string; cta: string; sub: string }> = ({ row, cta, sub }) => {
  const frame = useCurrentFrame();
  const typed = Math.floor(interpolate(frame, T.type, [0, cta.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const ctaSize = fitSize([cta], MURS, 900, W * 0.8, 64);
  const subIn = prog(frame, T.hit, T.hit + 12);
  const flash = frame < T.hit ? 0 : Math.exp(-(frame - T.hit) / 5);
  const push = interpolate(frame, [T.card, DURATION], [1, 1.03]);
  const glint = prog(frame, T.hit + 10, DURATION - 10, inOut);
  const abs = (top: number): React.CSSProperties => ({ position: "absolute", top: `${top}%`, left: 0, right: 0, display: "flex", justifyContent: "center" });

  return (
    <AbsoluteFill style={{ opacity: prog(frame, T.card, T.card + 5, (t) => t) }}>
      <Backdrop tone="green" />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 34% 60% at ${interpolate(glint, [0, 1], [-30, 130])}% 46%, rgba(192,175,148,0.16) 0%, transparent 70%)`,
          mixBlendMode: "screen",
          opacity: Math.sin(glint * Math.PI),
        }}
      />
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <div style={abs(26)}>
          <Img src={staticFile("zerna/logo-vertical-ivory-sand.png")} style={{ width: LOGO_W }} />
        </div>
        <div style={{ ...abs(49), fontFamily: EUKR, fontWeight: 400, fontSize: 26, letterSpacing: "0.24em", color: C.sand }}>{row}</div>
        <div style={{ ...abs(63), fontFamily: MURS, fontWeight: 900, fontSize: ctaSize, color: C.ivory, whiteSpace: "pre" }}>
          {/* untyped letters keep their width so the line does not shift while typing */}
          {[...cta].map((ch, i) => (
            <span key={i} style={{ opacity: i < typed ? 1 : 0 }}>
              {ch}
            </span>
          ))}
        </div>
        <div
          style={{
            ...abs(69.5),
            fontFamily: EUKR,
            fontWeight: 300,
            fontSize: 34,
            color: C.sand,
            opacity: subIn,
            transform: `translateY(${interpolate(subIn, [0, 1], [10, 0])}px)`,
          }}
        >
          {sub}
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 45%, ${C.yellow} 0%, rgba(192,175,148,0.6) 45%, transparent 85%)`,
          mixBlendMode: "screen",
          opacity: 0.3 * flash,
        }}
      />
    </AbsoluteFill>
  );
};
