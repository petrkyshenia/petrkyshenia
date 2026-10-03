import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { C, H, W } from "../theme";

type Variant = "cool" | "warm";

// Studio sweep for reflections: a gradient dome with a bright horizon plus
// soft-boxes in the brand palette. "cool" lights chrome with pink + turquoise;
// "warm" swaps turquoise for warm white so gold never mixes into green.
const domeTexture = (variant: Variant) => {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const v = ctx.createLinearGradient(0, 0, 0, 512);
  v.addColorStop(0, "#1c1a26");
  v.addColorStop(0.3, "#5d5a70");
  v.addColorStop(0.47, "#d9d6e4");
  v.addColorStop(0.5, "#ffffff");
  v.addColorStop(0.53, "#2a2733");
  v.addColorStop(0.75, "#0b0a10");
  v.addColorStop(1, "#040406");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1024, 512);
  const blob = (u: number, y: number, r: number, color: string, a: number) => {
    const g = ctx.createRadialGradient(u * 1024, y * 512, 0, u * 1024, y * 512, r);
    g.addColorStop(0, color.replace("A", String(a)));
    g.addColorStop(1, color.replace("A", "0"));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
  };
  ctx.globalCompositeOperation = "screen";
  const warm = variant === "warm";
  blob(0.15, 0.4, 260, warm ? "rgba(255,120,90,A)" : "rgba(255,61,127,A)", warm ? 0.55 : 0.95);
  blob(0.65, 0.38, 260, variant === "cool" ? "rgba(37,226,255,A)" : "rgba(255,226,180,A)", 0.85);
  blob(0.4, 0.15, 300, "rgba(255,194,61,A)", 0.7);
  blob(0.9, 0.42, 200, warm ? "rgba(255,140,90,A)" : "rgba(255,61,127,A)", warm ? 0.3 : 0.5);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

const makeStudio = (variant: Variant) => {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(10, 64, 32),
    new THREE.MeshBasicMaterial({ map: domeTexture(variant), side: THREE.BackSide }),
  );
  (dome.material as THREE.MeshBasicMaterial).color.setScalar(1.0);
  scene.add(dome);
  const panel = (w: number, h: number, color: string, power: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(7, 1.0, C.gold, 2.6, [0, 6.5, 0.5]);
  panel(1.4, 6, variant === "cool" ? C.pink : "#ffb38a", variant === "cool" ? 2.6 : 1.8, [-6.5, 0.4, 2]);
  panel(1.4, 6, variant === "cool" ? C.cyan : "#ffe2b8", 2.2, [6.5, 0.4, 2]);
  panel(5, 0.28, "#ffffff", 4, [0, 1.8, 6.5]);
  return scene;
};

const useEnv = (variant: Variant) => {
  const gl = useThree((s) => s.gl);
  return useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(makeStudio(variant), 0.02);
    pmrem.dispose();
    return rt.texture;
  }, [gl, variant]);
};

/**
 * Image-based lighting for the scene. Materials flagged `userData.warm`
 * (gold) get the warm variant of the studio.
 */
export const Studio: React.FC<{ intensity?: number; rotationY?: number }> = ({ intensity = 1, rotationY = 0 }) => {
  const scene = useThree((s) => s.scene);
  const cool = useEnv("cool");
  const warm = useEnv("warm");
  useLayoutEffect(() => {
    scene.environment = cool;
  }, [cool, scene]);
  scene.environmentIntensity = intensity;
  scene.environmentRotation.set(0, rotationY, 0);
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && !Array.isArray(m) && m.userData?.warm) {
      if (m.envMap !== warm) {
        m.envMap = warm;
        m.needsUpdate = true;
      }
      m.envMapIntensity = intensity;
      m.envMapRotation.set(0, rotationY, 0);
    }
  });
  return null;
};

/** Sets the camera every frame (before ThreeCanvas advances the renderer). */
export const Cam: React.FC<{ pos: [number, number, number]; look?: [number, number, number]; fov?: number }> = ({
  pos,
  look = [0, 0, 0],
  fov = 30,
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pos);
  camera.lookAt(...look);
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return null;
};

let glowTex: THREE.Texture | null = null;
/** Soft radial sprite used for additive glows. */
export const glowTexture = () => {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.45)");
  g.addColorStop(0.6, "rgba(255,255,255,0.1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
};

export const chrome = () =>
  new THREE.MeshStandardMaterial({ color: new THREE.Color("#e4e6ee"), metalness: 1, roughness: 0.14 });
export const gold = () => {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.gold), metalness: 1, roughness: 0.22 });
  m.userData.warm = true;
  return m;
};

/** ThreeCanvas with the project defaults: transparent, antialiased, hue-preserving tone mapping. */
export const Canvas3D: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThreeCanvas
    width={W}
    height={H}
    gl={{ antialias: true, alpha: true }}
    onCreated={({ gl }) => {
      gl.toneMapping = THREE.NeutralToneMapping;
      gl.toneMappingExposure = 1;
    }}
  >
    {children}
  </ThreeCanvas>
);
