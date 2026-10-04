import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { fitSize } from "./fonts";
import { C, MURS, type Picture, T, W, easeIn, flicker, flickerFast, inOut, prog } from "./theme";

/** Blurred picture with one sharp detail, slow push-in, brand-tinted shadows. */
const Photo: React.FC<{ picture: Picture; blur: number; scale: number }> = ({ picture, blur, scale }) => {
  const { x, y, r } = picture.focus;
  // `circle` takes a length, not a percentage: r is a share of the frame width
  const mask = `radial-gradient(circle ${(r / 100) * W}px at ${x}% ${y}%, #000 0%, #000 45%, transparent 100%)`;
  const img: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})` }}>
      <AbsoluteFill style={{ filter: `blur(${blur}px)`, transform: "scale(1.08)" }}>
        <Img src={staticFile(picture.src)} style={img} />
      </AbsoluteFill>
      {/* the one sharp detail: "blur the overall look, never the quality" */}
      <AbsoluteFill
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
          opacity: interpolate(blur, [14, 40], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <Img src={staticFile(picture.src)} style={img} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: C.green, mixBlendMode: "multiply", opacity: 0.28 }} />
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse 85% 70% at 50% 45%, transparent 40%, ${C.greenDeep} 100%)`, opacity: 0.7 }}
      />
    </AbsoluteFill>
  );
};

type Glyph = { ch: string; at: number; dx: number; dy: number; dz: number; rx: number; ry: number; rz: number; lag: number };

const glyphs = (line: string, row: number, from: number, to: number): Glyph[] =>
  [...line].map((ch, i) => {
    const k = `${row}-${i}`;
    return {
      ch,
      at: Math.round(from + random(`at${k}`) * (to - from)),
      dx: (random(`dx${k}`) - 0.25) * 900,
      dy: -(350 + random(`dy${k}`) * 1100),
      dz: (random(`dz${k}`) - 0.5) * 600,
      rx: (random(`rx${k}`) - 0.5) * 720,
      ry: (random(`ry${k}`) - 0.5) * 720,
      rz: (random(`rz${k}`) - 0.5) * 540,
      lag: Math.round(random(`lag${k}`) * 3),
    };
  });

const LINE: React.CSSProperties = { display: "flex", justifyContent: "center", fontFamily: MURS, fontWeight: 900, lineHeight: 1.06, color: C.ivory };
const GLYPH: React.CSSProperties = { display: "inline-block", whiteSpace: "pre", textShadow: "0 4px 30px rgba(5,26,18,0.5)" };

/** 7.47–11.8 s: picture rises out of green, brand line flickers in and flies apart, three facts on the beat, defocus to green. */
export const Reveal: React.FC<{ picture: Picture; reveal: readonly string[]; facts: readonly (readonly string[])[] }> = ({
  picture,
  reveal,
  facts,
}) => {
  const frame = useCurrentFrame();
  const brandSize = fitSize(reveal, MURS, 900, W * 0.72, 150);
  // one size for all facts, set by the widest line
  const factSize = fitSize(facts.flat(), MURS, 900, W * 0.84, 130);

  // the reference lifts its footage out of black top-first over ~1 s
  const wipe = prog(frame, T.picture, T.picture + 28, (t) => t);
  const edge = interpolate(wipe, [0, 1], [-5, 140]);
  const melt = prog(frame, T.defocus, T.logo + 6, inOut);
  const blur = interpolate(melt, [0, 1], [14, 70]);
  const push = interpolate(frame, [T.picture, T.logo + 6], [1, 1.07]);

  const leak = prog(frame, T.leak - 8, T.leak + 6) * (1 - prog(frame, T.leak + 18, T.streak + 6, inOut));
  const streak = prog(frame, T.streak, T.streak + 3) * (1 - prog(frame, T.streak + 4, T.streak + 11));
  const streakY = interpolate(frame, [T.streak, T.streak + 11], [31, 38], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const rows = reveal.map((line, r) => glyphs(line, r, T.letters + r * 6, T.letters + r * 6 + 10));
  const current = T.facts.reduce((acc: number, at, i) => (frame >= at ? i : acc), -1);

  return (
    <AbsoluteFill style={{ background: C.green }}>
      <AbsoluteFill
        style={{
          maskImage: `linear-gradient(to bottom, #000 ${edge - 40}%, transparent ${edge}%)`,
          WebkitMaskImage: `linear-gradient(to bottom, #000 ${edge - 40}%, transparent ${edge}%)`,
        }}
      >
        <Photo picture={picture} blur={blur} scale={push} />
      </AbsoluteFill>

      {/* warm light leak, Sunny Yellow into Warm Sand */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 60% at 72% 28%, ${C.yellow} 0%, rgba(192,175,148,0.55) 45%, transparent 80%)`,
          mixBlendMode: "screen",
          opacity: 0.55 * leak,
        }}
      />
      <AbsoluteFill style={{ background: "#F3B97A", mixBlendMode: "soft-light", opacity: 0.5 * leak }} />

      {/* text sits low so the sharp detail above stays free; it blurs away with the picture */}
      <AbsoluteFill style={{ perspective: 1400, filter: `blur(${melt * 14}px)`, opacity: 1 - melt }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "62%", transform: "translateY(-50%)" }}>
          {current < 0 &&
            rows.map((row, r) => (
              <div key={r} style={{ ...LINE, fontSize: brandSize }}>
                {row.map((g, i) => {
                  const fly = prog(frame, T.scatter + g.lag, T.scatter + g.lag + 10, easeIn);
                  const o = flicker(frame, g.at) * (1 - prog(frame, T.scatter + g.lag + 4, T.scatter + g.lag + 10));
                  return (
                    <span
                      key={i}
                      style={{
                        ...GLYPH,
                        opacity: o,
                        transform: `translate3d(${g.dx * fly}px, ${g.dy * fly}px, ${g.dz * fly}px) rotateX(${g.rx * fly}deg) rotateY(${g.ry * fly}deg) rotateZ(${g.rz * fly}deg)`,
                      }}
                    >
                      {g.ch}
                    </span>
                  );
                })}
              </div>
            ))}
          {current >= 0 &&
            facts[current].map((line, r) => (
              <div key={`${current}-${r}`} style={{ ...LINE, fontSize: factSize }}>
                {[...line].map((ch, i) => (
                  <span key={i} style={{ ...GLYPH, opacity: flickerFast(frame, T.facts[current] + Math.round(random(`f${current}-${r}-${i}`) * 2)) }}>
                    {ch}
                  </span>
                ))}
              </div>
            ))}
        </div>
      </AbsoluteFill>

      {/* horizontal light streak, as in the reference right before its exit */}
      <AbsoluteFill style={{ opacity: streak }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${streakY}%`,
            height: 5,
            background: `linear-gradient(90deg, transparent, ${C.ivory} 20%, #FFF4C8 50%, ${C.ivory} 80%, transparent)`,
            boxShadow: `0 0 24px 6px rgba(253,214,76,0.55), 0 0 90px 20px rgba(250,246,240,0.35)`,
          }}
        />
      </AbsoluteFill>

      {/* defocus into brand green instead of the reference's dark ring */}
      <AbsoluteFill style={{ background: C.green, opacity: melt }} />
    </AbsoluteFill>
  );
};
