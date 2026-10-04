import { AbsoluteFill, Img, interpolate, interpolateColors, staticFile, useCurrentFrame } from "remotion";
import { H } from "../zerna/theme";
import { inOut, prog } from "../zerna/theme";
import { T } from "./theme";

const SRC = { w: 2000, h: 1123 }; // genplan render
const IMG_W = (SRC.w * H) / SRC.h; // fills the frame height

/** 6.2–9.7 s: in the dark, a warm beam sweeps across the genplan and back, showing only fragments. */
export const Beam: React.FC = () => {
  const frame = useCurrentFrame();
  const end = T.card - 1;
  const pan = interpolate(frame, [T.beam, end], [60, 1500], { easing: inOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoom = interpolate(frame, [T.beam, end], [1, 1.05]);
  const on = prog(frame, T.beam + 2, T.beam + 14) * (1 - prog(frame, end - 18, end - 5));
  // one beam: across (golden), then back (peach)
  const turn = Math.round((T.beam + end) / 2);
  const p =
    frame < turn
      ? interpolate(frame, [T.beam + 4, turn], [6, 86], { easing: inOut, extrapolateLeft: "clamp" })
      : interpolate(frame, [turn, end - 6], [86, 6], { easing: inOut, extrapolateRight: "clamp" });
  const tint = interpolateColors(frame, [T.beam, turn, end], ["#FDD64C", "#FFE9B8", "#F3B97A"]);

  const band = `linear-gradient(118deg, transparent ${p - 24}%, rgba(0,0,0,0.6) ${p - 10}%, #000 ${p}%, rgba(0,0,0,0.6) ${p + 10}%, transparent ${p + 24}%)`;
  const falloff = "radial-gradient(ellipse 90% 70% at 50% 50%, #000 45%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.15) 100%)";
  const picture = (filter: string) => (
    <Img
      src={staticFile("zerna2/genplan.jpg")}
      style={{ position: "absolute", top: 0, left: -pan, height: H, width: IMG_W, filter, transform: `scale(${zoom})`, transformOrigin: `${pan + 540}px 50%` }}
    />
  );

  return (
    <AbsoluteFill style={{ background: "#020604" }}>
      <AbsoluteFill style={{ opacity: on }}>
        {picture("brightness(0.06)")}
        <AbsoluteFill style={{ maskImage: falloff, WebkitMaskImage: falloff }}>
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
