import type opentype from "opentype.js";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Cam, Canvas3D, Studio, gold } from "../three/Studio";
import { buildWord, useHeadFont } from "../three/text3d";
import { C, CH, FPS, HIT, MONO, clamp01, decay, lerp, prog } from "../theme";
import { Sparks } from "./Opus";

const HITL = HIT.collapse - CH.prompt[0]; // 36 → 6.5 s
const TYPE: [number, number] = [3, 21];
const CRUMBLE = 24;
const COLLAPSE: [number, number] = [29, HITL];

const LINES = ["› сделай ролик 10,3 с: 3D-графика,", "  металл, взрыв «5.5» и звук 120 BPM"];
const FS = 54;
const CW = FS * 0.6; // JetBrains Mono advance = 600/1000 em
const LH = 82;
const PANEL = { left: 280, top: 372, width: 1360, padX: 64, head: 72, padY: 46 };
const TARGET = { x: 960, y: 478 };

type Ch = { ch: string; x: number; y: number; word: number; i: number };

const layout = (): Ch[] => {
  const out: Ch[] = [];
  let word = 0;
  let i = 0;
  LINES.forEach((line, li) => {
    let prevSpace = true;
    [...line].forEach((ch, col) => {
      const space = ch === " ";
      if (!space && prevSpace) word++;
      prevSpace = space;
      out.push({
        ch,
        x: PANEL.left + PANEL.padX + col * CW,
        y: PANEL.top + PANEL.head + PANEL.padY + li * LH,
        word,
        i: i++,
      });
    });
  });
  return out;
};

const One: React.FC<{ frame: number; font: opentype.Font }> = ({ frame, font }) => {
  const word = useMemo(() => buildWord(font, "1", { size: 3.7, depth: 1.05, bevel: 0.1 }), [font]);
  const mat = useMemo(() => gold(), []);
  const on = frame >= HITL;
  const s = on ? spring({ frame: frame - HITL, fps: FPS, config: { damping: 9, stiffness: 160, mass: 0.6 } }) : 0;
  const sway = on ? 0.22 * Math.sin((frame - HITL) / 9) : 0;
  const g = word.glyphs[0];
  mat.emissive.set(C.gold);
  mat.emissiveIntensity = 0.35 * decay(frame, HITL, 5);
  return (
    <group position={[0, 0.48, 0]} rotation={[0, (1 - s) * 1.4 + sway, 0]} scale={lerp(0.3, 1, s)} visible={on}>
      <mesh geometry={g.geometry} material={mat} position={[0, 0, 0]} />
    </group>
  );
};

export const Prompt: React.FC = () => {
  const frame = useCurrentFrame();
  const font = useHeadFont();
  const chars = useMemo(layout, []);
  const visibleChars = chars.filter((c) => c.ch !== " ");
  const total = chars.length;
  const typed = Math.floor(prog(frame, TYPE[0], TYPE[1], (t) => t) * total);
  const panelIn = prog(frame, 0, 7);
  const panelOut = prog(frame, CRUMBLE + 2, CRUMBLE + 9);
  const kick = decay(frame, HITL, 4);
  const cu = clamp01((frame - COLLAPSE[0]) / (COLLAPSE[1] - COLLAPSE[0]));
  const ce = cu ** 2.4;

  // caret after the last typed character
  const last = chars[Math.min(typed, total - 1)];
  const caretX = typed >= total ? last.x + CW : last.x;
  const caretOn = typed < total || Math.floor(frame / 6) % 2 === 0;

  const charState = (c: Ch) => {
    const r = (k: string) => random(`${c.i}-${k}`);
    const start = CRUMBLE + c.word * 0.55;
    const tau = Math.max(0, frame - start);
    const vx = (r("vx") - 0.5) * 6;
    const vy = -2 - r("vy") * 6;
    const rv = (r("rv") - 0.5) * 30;
    let x = c.x + CW / 2 + vx * tau;
    let y = c.y + LH / 2 + vy * tau + 0.9 * tau * tau;
    let rot = rv * tau;
    // spiral into the target
    if (cu > 0) {
      const dx = x - TARGET.x;
      const dy = y - TARGET.y;
      const a = 1.6 * ce;
      const rx = dx * Math.cos(a) - dy * Math.sin(a);
      const ry = dx * Math.sin(a) + dy * Math.cos(a);
      x = TARGET.x + rx * (1 - ce);
      y = TARGET.y + ry * (1 - ce);
      rot *= 1 - ce;
    }
    return { x, y, rot, tau, s: 1 - 0.85 * ce };
  };

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${TARGET.x}px ${TARGET.y}px, rgba(255,194,61,${0.06 + 0.22 * prog(frame, COLLAPSE[0], HITL) * (0.6 + 0.4 * kick)}) 0%, rgba(255,194,61,0) 38%)`,
        }}
      />
      {/* prompt window */}
      <div
        style={{
          position: "absolute",
          left: PANEL.left,
          top: PANEL.top,
          width: PANEL.width,
          height: PANEL.head + PANEL.padY * 2 + LH * LINES.length,
          borderRadius: 28,
          background: "rgba(242,242,245,0.035)",
          border: `2px solid ${C.line}`,
          opacity: panelIn * (1 - panelOut),
          transform: `translateY(${(1 - panelIn) * 30}px) scale(${1 - 0.06 * panelOut}, ${1 - 0.3 * panelOut})`,
        }}
      >
        <div
          style={{
            height: PANEL.head,
            borderBottom: `2px solid ${C.line}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: `0 ${PANEL.padX - 8}px`,
          }}
        >
          {[C.pink, C.gold, C.cyan].map((col) => (
            <div key={col} style={{ width: 16, height: 16, borderRadius: 8, background: col }} />
          ))}
          <div style={{ marginLeft: 20, fontFamily: MONO, fontSize: 32, color: C.mute }}>промпт</div>
        </div>
      </div>

      {/* characters: typed, then crumbling, then sucked into the "1" */}
      {visibleChars.map((c) => {
        if (c.i >= typed) return null;
        const st = charState(c);
        if (cu >= 1) return null;
        const goldMix = clamp01(st.tau / 6);
        const isPrompt = c.ch === "›";
        const color = isPrompt ? C.gold : goldMix > 0.5 ? C.gold : C.ink;
        return (
          <div
            key={c.i}
            style={{
              position: "absolute",
              left: st.x - CW / 2,
              top: st.y - LH / 2,
              width: CW,
              height: LH,
              lineHeight: `${LH}px`,
              textAlign: "center",
              fontFamily: MONO,
              fontSize: FS,
              color,
              opacity: cu > 0.85 ? 1 - (cu - 0.85) / 0.15 : 1,
              transform: `rotate(${st.rot}deg) scale(${st.s})`,
            }}
          >
            {c.ch}
          </div>
        );
      })}

      {/* crumbs: dust that falls off the letters */}
      {frame >= CRUMBLE &&
        cu < 1 &&
        visibleChars.flatMap((c) =>
          [0, 1].map((k) => {
            if (c.i >= typed) return null;
            const r = (s: string) => random(`crumb-${c.i}-${k}-${s}`);
            const start = CRUMBLE + c.word * 0.55 + r("d") * 3;
            const tau = frame - start;
            if (tau < 0) return null;
            const x = lerp(c.x + CW * r("x"), TARGET.x, ce) + (r("vx") - 0.5) * 4 * tau * (1 - ce);
            const y = lerp(c.y + LH * (0.3 + 0.5 * r("y")) + 1.4 * tau * tau, TARGET.y, ce);
            const size = 4 + r("s") * 6;
            const col = [C.gold, C.pink, C.cyan][Math.floor(r("c") * 3)];
            return (
              <div
                key={`${c.i}-${k}`}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: size,
                  height: size,
                  background: col,
                  opacity: (1 - clamp01(tau / 14)) * (1 - ce),
                  transform: `rotate(${tau * 20}deg)`,
                }}
              />
            );
          }),
        )}

      {typed > 0 && frame < CRUMBLE && caretOn && (
        <div
          style={{
            position: "absolute",
            left: caretX + 2,
            top: last.y + 12,
            width: 4,
            height: LH - 24,
            background: C.gold,
          }}
        />
      )}

      {/* shock rings at the collapse */}
      {frame >= HITL &&
        [
          [C.gold, 0, 760],
          [C.pink, 2, 560],
        ].map(([col, delay, max]) => {
          const u = prog(frame, HITL + (delay as number), HITL + (delay as number) + 14);
          if (u >= 1) return null;
          const r = interpolate(u, [0, 1], [70, max as number]);
          return (
            <div
              key={col as string}
              style={{
                position: "absolute",
                left: TARGET.x - r,
                top: TARGET.y - r,
                width: r * 2,
                height: r * 2,
                borderRadius: "50%",
                border: `${Math.max(1.5, 6 * (1 - u))}px solid ${col}`,
                opacity: (1 - u) * 0.85,
              }}
            />
          );
        })}

      {font && (
        <Canvas3D>
          <Cam pos={[0, 0.2, 12]} look={[0, 0.2, 0]} />
          <Studio intensity={1.1} rotationY={interpolate(frame, [HITL, 59], [-0.6, 0.7], { extrapolateLeft: "clamp" })} />
          <directionalLight position={[2, 4, 6]} intensity={0.8} />
          <One frame={frame} font={font} />
          {frame >= HITL && <Sparks t={(frame - HITL) / FPS} origin={new THREE.Vector3(0, 0.48, 0.6)} opacity={Math.max(0, 1 - (frame - HITL) / 14)} />}
        </Canvas3D>
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 818,
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 38,
          color: C.ink,
          letterSpacing: "0.04em",
          opacity: prog(frame, HITL + 4, HITL + 11),
          transform: `translateY(${(1 - prog(frame, HITL + 4, HITL + 11)) * 16}px)`,
        }}
      >
        <span style={{ color: C.gold, fontWeight: 700 }}>1</span> промпт → весь ролик
      </div>
    </AbsoluteFill>
  );
};
