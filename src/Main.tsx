import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Hud } from "./components/Hud";
import { Overlay } from "./components/Overlay";
import { Finale } from "./scenes/Finale";
import { Graphics } from "./scenes/Graphics";
import { Intro } from "./scenes/Intro";
import { Opus } from "./scenes/Opus";
import { Prompt } from "./scenes/Prompt";
import { Sound } from "./scenes/Sound";
import { C, CH } from "./theme";

const scenes = [
  ["intro", Intro],
  ["graphics", Graphics],
  ["opus", Opus],
  ["prompt", Prompt],
  ["sound", Sound],
  ["finale", Finale],
] as const;

export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    {scenes.map(([key, Scene]) => (
      <Sequence key={key} name={key} from={CH[key][0]} durationInFrames={CH[key][1] - CH[key][0]} premountFor={15}>
        <Scene />
      </Sequence>
    ))}
    <Hud />
    <Overlay />
    <Audio src={staticFile("music.wav")} />
  </AbsoluteFill>
);
