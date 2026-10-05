import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { Hint } from "../zerna/Hint";
import { Sweep } from "../zerna/Sweep";
import { inOut, prog } from "../zerna/theme";
import { T } from "./theme";

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

  return (
    <AbsoluteFill>
      <Sweep src="zerna2/genplan-soft.jpg" size={{ w: 2000, h: 1123 }} pan={pan} zoom={zoom} p={p} half={24} tint={tint} on={on} />
      <Hint opacity={prog(frame, T.beam + 14, T.beam + 30, inOut) * (1 - prog(frame, end - 18, end - 5))} />
    </AbsoluteFill>
  );
};
