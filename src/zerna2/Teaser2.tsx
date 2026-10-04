import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { useFontsReady } from "../zerna/fonts";
import { C } from "../zerna/theme";
import { Beam } from "./Beam";
import { Card } from "./Card";
import { Strobe } from "./Strobe";
import { DURATION, T, type Text2 } from "./theme";
import { Wall } from "./Wall";

export type Teaser2Props = { text: Text2; music: boolean };

/** Parts read absolute frames from T and are switched by frame, like teaser 1. */
export const Teaser2: React.FC<Teaser2Props> = ({ text, music }) => {
  const ready = useFontsReady();
  const frame = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: C.green }} />;

  return (
    <AbsoluteFill style={{ background: "#020604" }}>
      {frame < T.strobe && <Wall text={text.poster} />}
      {frame >= T.strobe && frame < T.beam && <Strobe line1={text.line1} line2={text.line2} />}
      {frame >= T.beam && frame < T.card + 6 && <Beam />}
      {frame >= T.card && <Card row={text.row} cta={text.cta} sub={text.sub} />}
      {music && <Audio src={staticFile("zerna2/music-tail.wav")} endAt={DURATION} />}
    </AbsoluteFill>
  );
};
