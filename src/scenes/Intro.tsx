import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { clock } from "../components/Hud";
import { C, HEAD, HIT, MONO, crisp, decay, easeIn, prog } from "../theme";

const CX = 960;
const CY = 540;
const R = 400;
const END = 38;

/** Fixed-width digit cells so the proportional Unbounded figures never jitter. */
const Digits: React.FC<{ text: string; color: string; size: number }> = ({ text, color, size }) => (
  <div style={{ display: "flex", fontFamily: HEAD, fontWeight: 900, fontSize: size, color, lineHeight: 1 }}>
    {[...text].map((ch, i) => (
      <span key={i} style={{ display: "inline-block", width: ch === "," ? "0.42em" : "0.96em", textAlign: "center" }}>
        {ch}
      </span>
    ))}
  </div>
);

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const hit = HIT.intro;
  const after = frame >= hit;
  const kick = decay(frame, hit, 3.2);

  // pre-roll: ticks sweep in, a gold seed grows towards the hit
  const ticksIn = prog(frame, 0, hit - 1, crisp);
  const seed = interpolate(frame, [0, hit - 1], [3, 15], { extrapolateRight: "clamp", easing: easeIn });

  // exit: everything shrinks towards the HUD clock in the top-left corner
  const exit = prog(frame, 29, END, easeIn);
  const ex = interpolate(exit, [0, 1], [0, 245 - CX]);
  const ey = interpolate(exit, [0, 1], [0, 80 - CY]);
  const es = interpolate(exit, [0, 1], [1, 0.16]);
  const fade = 1 - prog(frame, 33, END + 1);

  // impact shake
  const sx = after ? (random(`sx${frame}`) - 0.5) * 18 * kick : 0;
  const sy = after ? (random(`sy${frame}`) - 0.5) * 18 * kick : 0;

  const arc = prog(frame, hit, END, (t) => t);
  const slam = after ? interpolate(prog(frame, hit, hit + 7, crisp), [0, 1], [1.38, 1]) : 0;
  const split = 18 * kick;
  const time = clock(frame);
  const wave = prog(frame, hit, hit + 16, crisp);

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          transform: `translate(${ex + sx}px, ${ey + sy}px) scale(${es})`,
          transformOrigin: `${CX}px ${CY}px`,
          opacity: fade,
        }}
      >
        {/* soft gold bloom behind the dial, lifted by the hit */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${CX}px ${CY}px, rgba(255,194,61,${0.1 + 0.16 * kick}) 0%, rgba(255,194,61,0) 34%)`,
          }}
        />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
            const major = i % 5 === 0;
            const len = major ? 30 : 16;
            const visible = i / 60 < ticksIn;
            const lit = after && i / 60 < arc;
            return (
              <line
                key={i}
                x1={CX + Math.cos(a) * (R - len)}
                y1={CY + Math.sin(a) * (R - len)}
                x2={CX + Math.cos(a) * R}
                y2={CY + Math.sin(a) * R}
                stroke={lit ? C.gold : "#4a4a56"}
                strokeWidth={major ? 5 : 3}
                strokeLinecap="round"
                opacity={visible ? 1 : 0}
              />
            );
          })}
          {after && (
            <circle
              cx={CX}
              cy={CY}
              r={R + 26}
              fill="none"
              stroke={C.gold}
              strokeWidth={4}
              strokeDasharray={`${arc * 2 * Math.PI * (R + 26)} 99999`}
              transform={`rotate(-90 ${CX} ${CY})`}
              strokeLinecap="round"
            />
          )}
          {after && (
            <>
              <circle cx={CX} cy={CY} r={interpolate(wave, [0, 1], [180, 760])} fill="none" stroke={C.gold} strokeWidth={6 * (1 - wave) + 1} opacity={(1 - wave) * 0.85} />
              <circle cx={CX} cy={CY} r={interpolate(prog(frame, hit + 2, hit + 18), [0, 1], [150, 640])} fill="none" stroke={C.pink} strokeWidth={3} opacity={(1 - prog(frame, hit + 2, hit + 18)) * 0.6} />
            </>
          )}
          {!after && <circle cx={CX} cy={CY} r={seed} fill={C.gold} />}
        </svg>

        {after && (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 34,
                color: C.pink,
                letterSpacing: "0.3em",
                marginBottom: 26,
                opacity: prog(frame, hit + 2, hit + 8),
              }}
            >
              ● REC
            </div>
            <div style={{ position: "relative", transform: `scale(${slam})` }}>
              <div style={{ position: "absolute", inset: 0, transform: `translateX(${-split}px)`, opacity: 0.9 * kick }}>
                <Digits text={time} color={C.cyan} size={150} />
              </div>
              <div style={{ position: "absolute", inset: 0, transform: `translateX(${split}px)`, opacity: 0.9 * kick }}>
                <Digits text={time} color={C.pink} size={150} />
              </div>
              <div style={{ position: "relative" }}>
                <Digits text={time} color={C.ink} size={150} />
              </div>
            </div>
            <div
              style={{
                marginTop: 34,
                fontFamily: MONO,
                fontSize: 36,
                color: C.ink,
                letterSpacing: "0.06em",
                opacity: prog(frame, hit + 5, hit + 12),
                transform: `translateY(${(1 - prog(frame, hit + 5, hit + 12)) * 14}px)`,
              }}
            >
              1 ПРОМПТ <span style={{ color: C.gold }}>·</span> 10,3 СЕКУНДЫ
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
