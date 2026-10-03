import { useMemo } from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Title } from "../components/Title";
import { Cam, Canvas3D, Studio, glowTexture } from "../three/Studio";
import { C, CH, FPS, MONO, crisp, decay, prog, score } from "../theme";

type Inst = keyof typeof score.drop.tracks;
type PadColor = "gold" | "pink" | "cyan";

// envelope per instrument: [amplitude, decay seconds]
const ENV: Record<Inst, [number, number]> = {
  kick: [1, 0.2],
  snare: [1, 0.18],
  clap: [0.9, 0.18],
  tomLow: [1, 0.24],
  tomMid: [1, 0.24],
  tomHigh: [1, 0.24],
  perc: [0.85, 0.1],
  hatOpen: [0.8, 0.17],
  hatClosed: [0.55, 0.07],
  crash: [0.5, 0.32],
};

type Hit = { t: number; inst: Inst; pad: number; amp: number; tau: number };

/** Every drum hit of the drop bar, mapped onto the 4×4 pads (same data the synth plays). */
const buildHits = (): Hit[] => {
  const hits: Hit[] = [];
  const { start, stepSeconds, tracks } = score.drop;
  (Object.keys(tracks) as Inst[]).forEach((inst) => {
    tracks[inst].forEach((step, n) => {
      const t = start + step * stepSeconds;
      const [amp, tau] = ENV[inst];
      if (inst === "crash") {
        // the crash on the downbeat rolls across the whole grid from the centre
        for (let p = 0; p < 16; p++) {
          const d = Math.hypot((p % 4) - 1.5, Math.floor(p / 4) - 1.5);
          hits.push({ t: t + d * 0.028, inst, pad: p, amp, tau });
        }
        return;
      }
      const map = score.pads[inst as Exclude<Inst, "crash">];
      const pads = map.mode === "cycle" ? [map.pads[n % map.pads.length]] : map.pads;
      const accent = inst === "hatClosed" && step % 2 === 1 ? 0.7 : 1;
      pads.forEach((pad) => hits.push({ t, inst, pad, amp: amp * accent, tau }));
    });
  });
  return hits;
};

const padColor = (() => {
  const out: PadColor[] = Array(16).fill("gold");
  Object.values(score.pads).forEach((m) => m.pads.forEach((p) => (out[p] = m.color as PadColor)));
  return out;
})();
const HEX: Record<PadColor, string> = { gold: C.gold, pink: C.pink, cyan: C.cyan };

// a hit lights its pad on the frame nearest to it (±½ frame), never a frame late
const level = (hits: Hit[], t: number, pad: number) => {
  const te = t + 0.5 / FPS;
  let v = 0;
  for (const h of hits) if (h.pad === pad && te >= h.t) v += h.amp * Math.exp(-(te - h.t) / h.tau);
  return Math.min(1.2, v);
};

const SIZE = 1;
const GAP = 0.17;
const PITCH = SIZE + GAP;

const Pads: React.FC<{ t: number; frame: number; hits: Hit[] }> = ({ t, frame, hits }) => {
  const padGeo = useMemo(() => new RoundedBoxGeometry(SIZE, 0.34, SIZE, 4, 0.13), []);
  const baseGeo = useMemo(() => new RoundedBoxGeometry(4 * PITCH + 0.5, 0.3, 4 * PITCH + 0.5, 4, 0.16), []);
  const mats = useMemo(
    () =>
      padColor.map(
        (c) =>
          new THREE.MeshStandardMaterial({
            color: new THREE.Color("#1a1a22"),
            metalness: 0.35,
            roughness: 0.42,
            emissive: new THREE.Color(HEX[c]),
          }),
      ),
    [],
  );
  const glowMats = useMemo(
    () =>
      padColor.map(
        (c) =>
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(HEX[c]),
            map: glowTexture(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );

  return (
    <group position={[3.05, -0.1, 0]} rotation={[0.95, interpolate(frame, [0, 59], [-0.34, -0.2]), 0]} scale={0.84}>
      <mesh geometry={baseGeo} position={[0, -0.3, 0]}>
        <meshStandardMaterial color="#0c0c11" metalness={0.85} roughness={0.32} />
      </mesh>
      {padColor.map((_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const lv = level(hits, t, i);
        const press = Math.min(1, lv);
        mats[i].emissiveIntensity = 0.06 + 0.8 * Math.min(1, lv);
        glowMats[i].opacity = Math.min(0.75, 0.62 * lv);
        const x = (col - 1.5) * PITCH;
        const z = (1.5 - row) * PITCH;
        const y = -0.06 * press;
        return (
          <group key={i} position={[x, y, z]}>
            <mesh geometry={padGeo} material={mats[i]} />
            <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glowMats[i]}>
              <planeGeometry args={[2.1, 2.1]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Cut-off of the wall filter at time t (mirror of scripts/synth.mjs). */
const cutoff = (t: number) => {
  const F = score.filter;
  if (t < F.sweep[0]) return F.closedHz;
  if (t >= F.sweep[1]) return 20000;
  const x = (t - F.sweep[0]) / (F.sweep[1] - F.sweep[0]);
  const from = F.closedHz * 1.9;
  return from * (20000 / from) ** (x * x * (3 - 2 * x));
};

const BANDS = 28;
const PROFILE: Record<Inst, [number, number]> = {
  kick: [2, 2.2],
  tomLow: [6, 2],
  tomMid: [8, 2],
  tomHigh: [10, 2],
  snare: [12, 3.2],
  clap: [14, 2.6],
  perc: [19, 2],
  hatOpen: [23, 3],
  hatClosed: [25, 2.4],
  crash: [20, 7],
};

const Spectrum: React.FC<{ t: number; frame: number; hits: Hit[] }> = ({ t, frame, hits }) => {
  const te = t + 0.5 / FPS;
  const bars = Array.from({ length: BANDS }, (_, b) => {
    let v = 0.12 + 0.1 * random(`bed-${b}-${frame}`) + 0.14 * Math.exp(-((b - 5) ** 2) / 30);
    for (const h of hits) {
      if (te < h.t || (h.inst === "crash" && h.pad !== 0)) continue;
      const [c, w] = PROFILE[h.inst];
      v += h.amp * Math.exp(-(te - h.t) / h.tau) * Math.exp(-((b - c) ** 2) / (2 * w * w));
    }
    return Math.min(1, v);
  });
  const colorOf = (b: number) => (b < 9 ? C.gold : b < 18 ? C.pink : C.cyan);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130 }}>
      {bars.map((v, b) => (
        <div key={b} style={{ width: 12, height: Math.max(6, v * 130), background: colorOf(b), borderRadius: 3, opacity: 0.92 }} />
      ))}
    </div>
  );
};

export const Sound: React.FC = () => {
  const frame = useCurrentFrame();
  const hits = useMemo(buildHits, []);
  const t = (CH.sound[0] + frame) / FPS;
  const hz = Math.round(cutoff(t));
  const open = hz >= 20000;
  const dropFrame = Math.round(score.drop.start * FPS) - CH.sound[0]; // 1
  const punch = decay(frame, dropFrame, 4);
  const z = interpolate(prog(frame, 0, 12, crisp), [0, 1], [13.6, 12.4]) - 0.35 * frame / 59;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 1420px 560px, rgba(255,61,127,${0.08 + 0.1 * punch}) 0%, rgba(255,61,127,0) 36%), radial-gradient(circle at 1500px 380px, rgba(37,226,255,0.07) 0%, rgba(37,226,255,0) 30%)`,
        }}
      />
      <Canvas3D>
        <Cam pos={[0.5, 0.6, z]} look={[0.9, -0.1, 0]} />
        <Studio intensity={0.75} rotationY={interpolate(frame, [0, 59], [0.3, -0.4])} />
        <directionalLight position={[-3, 6, 5]} intensity={0.5} />
        <Pads t={t} frame={frame} hits={hits} />
      </Canvas3D>
      <div style={{ position: "absolute", left: 0, top: -70, width: 1000, height: 1080 }}>
        <Title
          frame={frame}
          text="ЗВУК"
          start={-8}
          size={150}
          punch={punch}
          captions={[
            "120 BPM · ля минор",
            <span key="f">
              фильтр{" "}
              <span style={{ color: open ? C.gold : C.ink, fontWeight: 700 }}>
                {hz.toLocaleString("ru-RU").replace(/ /g, " ")} Гц
              </span>{" "}
              {open ? "· открыт" : ""}
            </span>,
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 100, top: 790, opacity: prog(frame, 2, 10) }}>
        <Spectrum t={t} frame={frame} hits={hits} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 936,
          fontFamily: MONO,
          fontSize: 32,
          color: C.mute,
          opacity: prog(frame, 6, 14),
        }}
      >
        <span style={{ color: C.gold }}>■</span> бочка <span style={{ color: C.pink, marginLeft: 18 }}>■</span> малый{" "}
        <span style={{ color: C.cyan, marginLeft: 18 }}>■</span> хэты
      </div>
    </AbsoluteFill>
  );
};
