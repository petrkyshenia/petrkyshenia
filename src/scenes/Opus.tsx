import type opentype from "opentype.js";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Cam, Canvas3D, Studio, chrome, glowTexture, gold } from "../three/Studio";
import { buildWord, useHeadFont } from "../three/text3d";
import { C, CH, FPS, H, HIT, MONO, W, crisp, decay, easeIn, prog } from "../theme";

const I = HIT.explosion - CH.opus[0]; // impact, local frame 48 (= 4.9 s)
const CAM_Z = 12.4;
const FOV = 30;

export type Lockup = ReturnType<typeof makeLockup>;

/** "OPUS" + "5.5" sized so the final lockup is `width` world units wide. */
export const makeLockup = (font: opentype.Font, width: number) => {
  const probeO = buildWord(font, "OPUS", { size: 1 });
  const probe5 = buildWord(font, "5.5", { size: 1 });
  const gapEm = 0.4;
  const size = width / (probeO.width + probe5.width + gapEm);
  const opts = { size, depth: size * 0.3, bevel: size * 0.028 };
  const opus = buildWord(font, "OPUS", opts);
  const five = buildWord(font, "5.5", opts);
  const gap = gapEm * size;
  const total = opus.width + gap + five.width;
  return {
    size,
    opus,
    five,
    gap,
    opusX: -total / 2 + opus.width / 2,
    fiveX: total / 2 - five.width / 2,
  };
};

const PRE_X = -0.9; // OPUS position before the hit
const FLIGHT = 9; // frames the "5.5" is in the air

const N_SHARDS = 54;

const Shards: React.FC<{ t: number; origin: THREE.Vector3; color: string; seed: string }> = ({ t, origin, color, seed }) => {
  const geo = useMemo(() => new THREE.TetrahedronGeometry(1, 0), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.85,
        roughness: 0.2,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.22,
        flatShading: true,
      }),
    [color],
  );
  const mesh = useMemo(() => new THREE.InstancedMesh(geo, mat, N_SHARDS), [geo, mat]);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  for (let i = 0; i < N_SHARDS; i++) {
    const r = (k: string) => random(`${seed}-${i}-${k}`);
    const theta = r("a") * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(theta) * 1.25, Math.sin(theta) * 0.9, 0.25 + r("z") * 1.1).normalize();
    const speed = 3 + r("s") * 10;
    const k = 2.2; // drag
    const travel = (speed * (1 - Math.exp(-k * t))) / k;
    pos.copy(origin).addScaledVector(dir, travel);
    pos.y -= 2.4 * t * t;
    axis.set(r("x") - 0.5, r("y") - 0.5, r("w") - 0.5).normalize();
    q.setFromAxisAngle(axis, (2 + r("spin") * 14) * t + r("o") * 6);
    const size = (0.05 + r("size") ** 2 * 0.17) * (t <= 0 ? 0 : Math.max(0, 1 - t / 1.6));
    scl.setScalar(size);
    m.compose(pos, q, scl);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

const N_SPARKS = 240;
export const Sparks: React.FC<{ t: number; origin: THREE.Vector3; opacity: number }> = ({ t, origin, opacity }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N_SPARKS * 3), 3));
    const col = new Float32Array(N_SPARKS * 3);
    const pal = [C.gold, C.gold, C.pink, C.cyan].map((c) => new THREE.Color(c));
    for (let i = 0; i < N_SPARKS; i++) pal[i % 4].toArray(col, i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const p = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < N_SPARKS; i++) {
    const r = (k: string) => random(`spark-${i}-${k}`);
    const a = r("a") * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.8, 0.1 + r("z")).normalize();
    const speed = 7 + r("s") * 16;
    const travel = (speed * (1 - Math.exp(-4 * t))) / 4;
    p.setXYZ(i, origin.x + dir.x * travel, origin.y + dir.y * travel - 1.5 * t * t, origin.z + dir.z * travel);
  }
  p.needsUpdate = true;
  return (
    <points geometry={geo}>
      <pointsMaterial
        size={0.11}
        map={glowTexture()}
        vertexColors
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
};

const Ring: React.FC<{ u: number; origin: THREE.Vector3; color: string; max: number; alpha: number }> = ({ u, origin, color, max, alpha }) => {
  if (u <= 0 || u >= 1) return null;
  const s = 0.35 + max * crisp(u);
  return (
    <mesh position={origin} scale={[s, s, s]}>
      <ringGeometry args={[0.975, 1, 160]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={(1 - u) ** 1.6 * alpha}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
};

const OpusWorld: React.FC<{ frame: number; lock: Lockup }> = ({ frame, lock }) => {
  const chromeMat = useMemo(() => chrome(), []);
  const goldMat = useMemo(() => gold(), []);
  const ghostMats = useMemo(
    () =>
      [0.3, 0.17, 0.08].map(
        (o) => new THREE.MeshBasicMaterial({ color: new THREE.Color(C.gold), transparent: true, opacity: o, depthWrite: false, toneMapped: false }),
      ),
    [],
  );

  const after = frame >= I;
  const kick = decay(frame, I, 4);
  const shove = after ? spring({ frame: frame - I, fps: FPS, config: { damping: 12, stiffness: 170, mass: 0.7 } }) : 0;

  // OPUS waits left of centre (room for what is coming), then gets shoved into the final lockup
  const opusX = interpolate(shove, [0, 1], [PRE_X, lock.opusX]);
  const fiveContact = PRE_X + lock.opus.width / 2 + lock.gap * 0.25 + lock.five.width / 2;
  const fiveX = after ? interpolate(shove, [0, 1], [fiveContact, lock.fiveX]) : fiveContact;
  const impact = new THREE.Vector3(PRE_X + lock.opus.width / 2 + lock.gap * 0.12, 0, 0.35);

  // "5.5" flight: out of the depth, top right, accelerating — contact on frame I
  const fly = prog(frame, I - FLIGHT, I, easeIn);
  const flyPos = (u: number) =>
    new THREE.Vector3(
      interpolate(u, [0, 1], [fiveX + 3.2, fiveX]),
      interpolate(u, [0, 1], [3.3, 0]),
      interpolate(u, [0, 1], [-9, 0]),
    );
  const flyRot = (u: number): [number, number, number] => [(1 - u) * 0.9, (1 - u) * -1.4, (1 - u) * 1.2];
  const fivePos = after ? new THREE.Vector3(fiveX, 0, 0) : flyPos(fly);
  const squash = 1 + 0.12 * kick;

  const t = after ? (frame - I) / FPS : -1;
  // the projectile runs hot, then cools down after the hit
  goldMat.emissive.set(C.gold);
  goldMat.emissiveIntensity = after ? 0.3 * kick : 0.32;

  return (
    <>
      <group position={[opusX, 0, 0]}>
        {lock.opus.glyphs.map((g, i) => {
          const enter = prog(frame, i * 2, i * 2 + 16, crisp);
          const near = (i + 1) / lock.opus.glyphs.length; // letters closer to the impact take more of it
          const wob = kick * Math.sin((frame - I) * 1.1 + i) * near;
          return (
            <mesh
              key={i}
              geometry={g.geometry}
              material={chromeMat}
              position={[g.x, wob * 0.25, interpolate(enter, [0, 1], [-6, 0])]}
              rotation={[interpolate(enter, [0, 1], [0.9, 0]) + wob * 0.03, interpolate(enter, [0, 1], [-0.8, 0]), wob * 0.18]}
            />
          );
        })}
      </group>

      {frame >= I - FLIGHT && (
        <>
          {!after &&
            ghostMats.map((gm, k) => {
              const u = prog(frame - (k + 1) * 0.45, I - FLIGHT, I, easeIn);
              const gp = flyPos(u);
              return (
                <group key={k} position={gp} rotation={flyRot(u)}>
                  {lock.five.glyphs.map((g, i) => (
                    <mesh key={i} geometry={g.geometry} material={gm} position={[g.x, 0, 0]} />
                  ))}
                </group>
              );
            })}
          <group position={fivePos} rotation={after ? [0, 0, 0] : flyRot(fly)} scale={[1 / squash, squash, 1]}>
            {lock.five.glyphs.map((g, i) => (
              <mesh key={i} geometry={g.geometry} material={goldMat} position={[g.x, 0, 0]} />
            ))}
          </group>
        </>
      )}

      {after && (
        <>
          <pointLight position={impact} intensity={70 * kick} color={C.gold} distance={9} decay={2} />
          <Ring u={(frame - I) / 10} origin={impact} color={C.gold} max={6.5} alpha={0.95} />
          <Ring u={(frame - I - 2) / 11} origin={impact} color={C.pink} max={4.6} alpha={0.8} />
          <Ring u={(frame - I - 3) / 10} origin={impact} color={C.cyan} max={3.0} alpha={0.65} />
          <Shards t={t} origin={impact} color={C.gold} seed="g" />
          <Shards t={t} origin={impact} color={C.pink} seed="p" />
          <Shards t={t} origin={impact} color={C.cyan} seed="c" />
          <Sparks t={t} origin={impact} opacity={Math.max(0, 1 - t / 0.45)} />
        </>
      )}
    </>
  );
};

/** Screen position of a world point for the scene camera (for DOM overlays). */
const toScreen = (x: number, y: number, z: number, cam: [number, number, number]) => {
  const d = cam[2] - z;
  const ppu = (H / 2) / (d * Math.tan(((FOV / 2) * Math.PI) / 180));
  return [W / 2 + (x - cam[0]) * ppu, H / 2 - (y - cam[1]) * ppu];
};

export const Opus: React.FC = () => {
  const frame = useCurrentFrame();
  const font = useHeadFont();
  const lock = useMemo(() => (font ? makeLockup(font, 9.0) : null), [font]);
  const after = frame >= I;
  const kick = decay(frame, I, 4);
  const shake = after ? 0.16 * decay(frame, I, 5) : 0;
  const cam: [number, number, number] = [
    (random(`cx${frame}`) - 0.5) * shake * 2,
    0.1 + (random(`cy${frame}`) - 0.5) * shake * 2,
    interpolate(frame, [0, 59], [CAM_Z + 1.2, CAM_Z]) - 0.55 * kick,
  ];
  const impactX = lock ? PRE_X + lock.opus.width / 2 + lock.gap * 0.12 : 2;
  const [fx, fy] = toScreen(impactX, 0, 0.35, cam);
  const drift = frame * 0.6;
  const cap = prog(frame, 8, 18);

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(70% 85% at ${14 + drift * 0.08}% ${92 - drift * 0.05}%, rgba(255,61,127,${0.5 + 0.12 * kick}) 0%, rgba(255,61,127,0) 70%)`,
            `radial-gradient(60% 75% at ${88 - drift * 0.06}% ${10 + drift * 0.04}%, rgba(37,226,255,${0.36 + 0.1 * kick}) 0%, rgba(37,226,255,0) 70%)`,
            `radial-gradient(75% 60% at 50% 118%, rgba(255,194,61,0.34) 0%, rgba(255,194,61,0) 70%)`,
            `linear-gradient(160deg, #120a1c 0%, #07070A 55%, #061016 100%)`,
          ].join(", "),
        }}
      />
      {lock && (
        <Canvas3D>
          <Cam pos={cam} look={[cam[0] * 0.5, 0.1, 0]} fov={FOV} />
          <Studio intensity={1.15} rotationY={interpolate(frame, [0, 59], [-0.9, 0.6])} />
          <directionalLight position={[-4, 5, 6]} intensity={0.6} />
          <OpusWorld frame={frame} lock={lock} />
        </Canvas3D>
      )}
      {after && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${fx}px ${fy}px, rgba(255,194,61,${0.3 * kick}) 0%, rgba(255,61,127,${0.12 * kick}) 18%, rgba(0,0,0,0) 45%)`,
            mixBlendMode: "screen",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: 100,
          bottom: 92,
          fontFamily: MONO,
          fontSize: 36,
          color: C.ink,
          opacity: cap,
          transform: `translateX(${(1 - cap) * -24}px)`,
          letterSpacing: "0.02em",
        }}
      >
        объёмный металл <span style={{ color: C.gold }}>·</span> 3D-текст
      </div>
    </AbsoluteFill>
  );
};
