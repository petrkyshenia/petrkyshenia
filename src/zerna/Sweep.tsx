import { AbsoluteFill, Img, staticFile } from "remotion";
import { H } from "./theme";

export type SweepProps = {
  /** Picture in public/, filled to the frame height. */
  src: string;
  size: { w: number; h: number };
  /** Horizontal offset of the picture, px (camera pan). */
  pan: number;
  zoom: number;
  /** Centre of the light band along the 118° diagonal, % (0 = top left, 100 = bottom right). */
  p: number;
  /** Half-width of the band, % of the diagonal. */
  half: number;
  tint: string;
  /** 0..1: the light (and the faint picture) fades in and out. */
  on: number;
};

const FALLOFF = "radial-gradient(ellipse 90% 70% at 50% 50%, #000 45%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.15) 100%)";

/** A picture in the dark with one warm band of light crossing it: only fragments are ever visible. */
export const Sweep: React.FC<SweepProps> = ({ src, size, pan, zoom, p, half, tint, on }) => {
  const w = (size.w * H) / size.h;
  const band = `linear-gradient(118deg, transparent ${p - half}%, rgba(0,0,0,0.6) ${p - (half * 5) / 12}%, #000 ${p}%, rgba(0,0,0,0.6) ${p + (half * 5) / 12}%, transparent ${p + half}%)`;
  const picture = (filter: string) => (
    <Img
      src={staticFile(src)}
      style={{ position: "absolute", top: 0, left: -pan, height: H, width: w, filter, transform: `scale(${zoom})`, transformOrigin: `${pan + 540}px 50%` }}
    />
  );
  return (
    <AbsoluteFill style={{ background: "#020604" }}>
      <AbsoluteFill style={{ opacity: on }}>
        {picture("brightness(0.06)")}
        <AbsoluteFill style={{ maskImage: FALLOFF, WebkitMaskImage: FALLOFF }}>
          <AbsoluteFill style={{ maskImage: band, WebkitMaskImage: band }}>
            {picture("brightness(1.25) saturate(1.05)")}
            <AbsoluteFill style={{ background: tint, mixBlendMode: "multiply", opacity: 0.45 }} />
            <AbsoluteFill style={{ background: tint, mixBlendMode: "screen", opacity: 0.12 }} />
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
