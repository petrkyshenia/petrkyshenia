import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { fitSize } from "./fonts";
import { Backdrop } from "./Words";
import { C, DURATION, EUKR, MURS, T, W, flicker, inOut, prog } from "./theme";

const LOGO_W = 430; // vertical logo, 972x858 source

/**
 * 11.8 s → end: the logo lands on the last hit with a soft flash, CTA flickers in, sub line on the first echo.
 * The hold stays alive with a slow push-in and one glint drifting over the background — never on the logo itself
 * (brand book p. 11: no shadows or other effects on the logo).
 */
export const Finale: React.FC<{ cta: readonly string[]; sub: string }> = ({ cta, sub }) => {
  const frame = useCurrentFrame();
  const land = prog(frame, T.logo, T.logo + 10);
  const ctaSize = fitSize(cta, MURS, 900, W * 0.7, 96);
  const subIn = prog(frame, T.sub, T.sub + 12);
  const flash = frame < T.logo ? 0 : Math.exp(-(frame - T.logo) / 5);
  const push = interpolate(frame, [T.logo, DURATION], [1, 1.035]);
  const glint = prog(frame, T.sub + 8, DURATION - 10, inOut);

  return (
    <AbsoluteFill style={{ opacity: prog(frame, T.logo - 2, T.logo + 2) }}>
      <Backdrop tone="green" />
      {/* one soft glint crossing the green behind the logo */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 34% 60% at ${interpolate(glint, [0, 1], [-30, 130])}% 46%, rgba(192,175,148,0.16) 0%, transparent 70%)`,
          mixBlendMode: "screen",
          opacity: Math.sin(glint * Math.PI),
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", transform: `scale(${push})` }}>
        <Img
          src={staticFile("zerna/logo-vertical-ivory-sand.png")}
          style={{
            width: LOGO_W,
            opacity: prog(frame, T.logo, T.logo + 4),
            filter: `blur(${interpolate(land, [0, 1], [20, 0])}px)`,
            transform: `scale(${interpolate(land, [0, 1], [1.05, 1])})`,
          }}
        />
        <div style={{ marginTop: 150, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {cta.map((line, r) => (
            <div key={r} style={{ fontFamily: MURS, fontWeight: 900, fontSize: ctaSize, lineHeight: 1.1, color: C.ivory, display: "flex" }}>
              {[...line].map((ch, i) => (
                <span key={i} style={{ opacity: flicker(frame, T.cta + Math.round(random(`cta${r}-${i}`) * 6)) }}>
                  {ch}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 48,
            fontFamily: EUKR,
            fontWeight: 300,
            fontSize: 38,
            letterSpacing: "0.02em",
            color: C.sand,
            opacity: subIn,
            transform: `translateY(${interpolate(subIn, [0, 1], [12, 0])}px)`,
          }}
        >
          {sub}
        </div>
      </AbsoluteFill>
      {/* soft flash on the last hit, Sunny Yellow into Warm Sand */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 45%, ${C.yellow} 0%, rgba(192,175,148,0.6) 45%, transparent 85%)`,
          mixBlendMode: "screen",
          opacity: 0.38 * flash,
        }}
      />
    </AbsoluteFill>
  );
};
