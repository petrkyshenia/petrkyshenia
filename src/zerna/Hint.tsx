import { C, EUKR, HINT } from "./theme";

/** Quiet line over the blurred genplan in the videos, in the tone of the CTA's sub line. */
export const Hint: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      top: "74%",
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: EUKR,
      fontWeight: 300,
      fontSize: 46,
      letterSpacing: "0.04em",
      color: C.ivory,
      textShadow: "0 2px 18px rgba(5,26,18,0.9), 0 0 6px rgba(5,26,18,0.6)",
      opacity,
    }}
  >
    {HINT}
  </div>
);
