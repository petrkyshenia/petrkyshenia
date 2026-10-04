import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { fitSize } from "./fonts";
import { Backdrop } from "./Words";
import { C, EUKR, MURS, T, W, flicker, prog } from "./theme";

const LOGO_W = 430; // vertical logo, 972x858 source

/** 11.6 s → end: logo pulls into focus, CTA flickers in on the last hit, sub line below. */
export const Finale: React.FC<{ cta: readonly string[]; sub: string }> = ({ cta, sub }) => {
  const frame = useCurrentFrame();
  const focus = prog(frame, T.logo, T.logo + 14);
  const ctaSize = cta.length ? fitSize(cta, MURS, 900, W * 0.7, 96) : 0;
  const subIn = prog(frame, T.sub, T.sub + 12);

  return (
    <AbsoluteFill style={{ opacity: prog(frame, T.logo - 4, T.logo + 4) }}>
      <Backdrop tone="green" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <Img
          src={staticFile("zerna/logo-vertical-ivory-sand.png")}
          style={{
            width: LOGO_W,
            opacity: focus,
            filter: `blur(${interpolate(focus, [0, 1], [26, 0])}px)`,
            transform: `scale(${interpolate(focus, [0, 1], [1.05, 1])})`,
          }}
        />
        {cta.length > 0 && (
          <div style={{ marginTop: 150, display: "flex", flexDirection: "column", alignItems: "center" }}>
            {cta.map((line, r) => (
              <div key={r} style={{ fontFamily: MURS, fontWeight: 900, fontSize: ctaSize, lineHeight: 1.1, color: C.ivory, display: "flex" }}>
                {[...line].map((ch, i) => (
                  <span key={i} style={{ opacity: flicker(frame, T.hit + Math.round(random(`cta${r}-${i}`) * 7)) }}>
                    {ch}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            marginTop: cta.length ? 48 : 150,
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
    </AbsoluteFill>
  );
};
