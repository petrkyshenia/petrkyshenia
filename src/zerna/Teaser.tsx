import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Finale } from "./Finale";
import { useFontsReady } from "./fonts";
import { Reveal } from "./Reveal";
import { C, DURATION, type Picture, T, type Variant } from "./theme";
import { Words } from "./Words";

export type TeaserProps = { variant: Variant; picture: Picture; music: boolean };

/** All parts read absolute frames from T, so they are switched by frame instead of wrapped in Sequences. */
export const Teaser: React.FC<TeaserProps> = ({ variant, picture, music }) => {
  const ready = useFontsReady();
  const frame = useCurrentFrame();
  // Every size is fitted to the measured text, so nothing renders before the fonts are in.
  if (!ready) return <AbsoluteFill style={{ background: C.green }} />;

  return (
    <AbsoluteFill style={{ background: C.green }}>
      {frame < T.picture && <Words words={variant.words} />}
      {frame >= T.picture && frame < T.logo + 6 && <Reveal picture={picture} reveal={variant.reveal} facts={variant.facts} />}
      {frame >= T.logo - 2 && <Finale cta={variant.cta} sub={variant.sub} />}
      {music && <Audio src={staticFile("zerna/music-tail.wav")} endAt={DURATION} />}
    </AbsoluteFill>
  );
};
