import { useMemo } from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Cam, Canvas3D, Studio, chrome, gold } from "../three/Studio";
import { useHeadFont } from "../three/text3d";
import { C, CH, FPS, HIT, MONO, crisp, decay, easeIn, prog } from "../theme";
import { Lockup, Sparks, makeLockup } from "./Opus";

const HITL = HIT.finale - CH.finale[0]; // 1 → 9.34 s
const Y = 0.42;

const Logo: React.FC<{ frame: number; lock: Lockup }> = ({ frame, lock }) => {
  const chromeMat = useMemo(() => chrome(), []);
  const goldMat = useMemo(() => gold(), []);
  const on = frame >= HITL;
  // the two halves meet on the hit
  const meet = on ? 1 : prog(frame, -6, HITL, easeIn);
  const settle = on ? spring({ frame: frame - HITL, fps: FPS, config: { damping: 10, stiffness: 190, mass: 0.6 } }) : 0;
  const squash = on ? 1 + 0.07 * (1 - settle) : 1;
  goldMat.emissive.set(C.gold);
  goldMat.emissiveIntensity = 0.3 * decay(frame, HITL, 5);
  return (
    <group position={[0, Y, 0]} scale={[squash, 2 - squash, 1]}>
      <group position={[lock.opusX - (1 - meet) * 2.2, 0, -(1 - meet) * 3]} rotation={[0, (1 - meet) * 0.5, 0]}>
        {lock.opus.glyphs.map((g, i) => (
          <mesh key={i} geometry={g.geometry} material={chromeMat} position={[g.x, 0, 0]} />
        ))}
      </group>
      <group position={[lock.fiveX + (1 - meet) * 2.2, 0, -(1 - meet) * 3]} rotation={[0, -(1 - meet) * 0.5, 0]}>
        {lock.five.glyphs.map((g, i) => (
          <mesh key={i} geometry={g.geometry} material={goldMat} position={[g.x, 0, 0]} />
        ))}
      </group>
    </group>
  );
};

export const Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const font = useHeadFont();
  const lock = useMemo(() => (font ? makeLockup(font, 8.2) : null), [font]);
  const kick = decay(frame, HITL, 4);
  const shake = 0.08 * kick;
  const z = interpolate(frame, [0, 29], [12.6, 11.7]);
  const tag = prog(frame, 6, 13);
  const ring = prog(frame, HITL, HITL + 14, crisp);

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(60% 50% at 50% 46%, rgba(255,194,61,${0.1 + 0.12 * kick}) 0%, rgba(255,194,61,0) 70%)`,
            `radial-gradient(45% 55% at 12% 100%, rgba(255,61,127,0.22) 0%, rgba(255,61,127,0) 70%)`,
            `radial-gradient(45% 55% at 90% 0%, rgba(37,226,255,0.16) 0%, rgba(37,226,255,0) 70%)`,
          ].join(", "),
        }}
      />
      {frame >= HITL && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: 960 - interpolate(ring, [0, 1], [300, 1100]),
            top: 470 - interpolate(ring, [0, 1], [300, 1100]),
            width: interpolate(ring, [0, 1], [600, 2200]),
            height: interpolate(ring, [0, 1], [600, 2200]),
            borderRadius: "50%",
            border: `${Math.max(1.5, 7 * (1 - ring))}px solid ${C.gold}`,
            opacity: (1 - ring) * 0.8,
          }}
        />
      )}
      {lock && (
        <Canvas3D>
          <Cam pos={[(random(`fx${frame}`) - 0.5) * shake, 0.25 + (random(`fy${frame}`) - 0.5) * shake, z]} look={[0, 0.25, 0]} />
          <Studio intensity={1.1} rotationY={interpolate(frame, [0, 29], [-0.3, 0.9])} />
          <directionalLight position={[-3, 5, 6]} intensity={0.5} />
          <Logo frame={frame} lock={lock} />
          {frame >= HITL && (
            <Sparks t={(frame - HITL) / FPS} origin={new THREE.Vector3(lock.opusX + lock.opus.width / 2 + lock.gap / 2, Y, 0.6)} opacity={Math.max(0, 1 - (frame - HITL) / 12)} />
          )}
        </Canvas3D>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 752,
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 38,
          color: C.ink,
          letterSpacing: "0.04em",
          opacity: tag,
          transform: `translateY(${(1 - tag) * 16}px)`,
        }}
      >
        графика <span style={{ color: C.gold }}>·</span> текст <span style={{ color: C.gold }}>·</span> звук{" "}
        <span style={{ color: C.mute }}>— из одного промпта</span>
      </div>
    </AbsoluteFill>
  );
};
