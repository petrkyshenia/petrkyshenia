import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Title } from "../components/Title";
import { Cam, Canvas3D, Studio, glowTexture, gold } from "../three/Studio";
import { C, crisp, decay, inOut, prog } from "../theme";

// (3,5) torus knot as a parametric curve
class Knot extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const p = 3;
    const q = 5;
    const u = t * Math.PI * 2;
    const r = 1.15 + 0.48 * Math.cos(q * u);
    return target.set(r * Math.cos(p * u), r * Math.sin(p * u), 0.62 * Math.sin(q * u));
  }
}

const SEG = 1400;
const RAD = 22;

const KnotDrawing: React.FC<{ frame: number }> = ({ frame }) => {
  const curve = useMemo(() => new Knot(), []);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, SEG, 0.15, RAD, true), [curve]);
  const ghost = useMemo(() => new THREE.TubeGeometry(curve, 700, 0.012, 6, true), [curve]);
  const mat = useMemo(() => gold(), []);

  // the pen: draws the knot from 0 to 100 %
  const p = prog(frame, 3, 47, inOut);
  tube.setDrawRange(0, Math.floor(p * SEG) * RAD * 6);
  const head = curve.getPoint(Math.min(p, 0.9999));
  const done = decay(frame, 47, 7);
  mat.emissive.set(C.gold);
  mat.emissiveIntensity = 0.28 * done;

  const penOn = p > 0 && p < 1 ? 1 : Math.max(0, 1 - (frame - 47) / 4);
  const rotY = interpolate(frame, [0, 59], [-0.55, 0.5]);
  const rotX = interpolate(frame, [0, 59], [0.42, 0.18]);
  const s = interpolate(prog(frame, 0, 14, crisp), [0, 1], [0.86, 1]) * (1 + 0.035 * done);

  return (
    <group position={[2.95, -0.05, 0]} rotation={[rotX, rotY, 0.12]} scale={s}>
      <mesh geometry={ghost}>
        <meshBasicMaterial color={C.cyan} transparent opacity={0.42 * (1 - 0.6 * prog(frame, 40, 56))} toneMapped={false} />
      </mesh>
      <mesh geometry={tube} material={mat} />
      <group position={head}>
        <mesh>
          <sphereGeometry args={[0.17, 24, 24]} />
          <meshBasicMaterial color={C.pink} transparent opacity={penOn} toneMapped={false} />
        </mesh>
        <sprite scale={[1.5, 1.5, 1]}>
          <spriteMaterial
            map={glowTexture()}
            color={C.pink}
            transparent
            opacity={0.85 * penOn}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      </group>
    </group>
  );
};

export const Graphics: React.FC = () => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, 59], [12.8, 11.6]);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{ background: "radial-gradient(circle at 1390px 540px, rgba(37,226,255,0.10) 0%, rgba(37,226,255,0) 32%)" }}
      />
      <Canvas3D>
        <Cam pos={[0.4, 0.25, z]} look={[0.4, 0, 0]} />
        <Studio intensity={1.05} rotationY={interpolate(frame, [0, 59], [-0.4, 0.5])} />
        <directionalLight position={[3, 4, 6]} intensity={1.1} color="#fff4e0" />
        <KnotDrawing frame={frame} />
      </Canvas3D>
      <Title frame={frame} text="ГРАФИКА" start={2} size={122} captions={["3D-узел рисует сам себя", "torus knot (3,5) · three.js"]} />
    </AbsoluteFill>
  );
};
