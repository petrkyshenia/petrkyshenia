import { Composition } from "remotion";
import "./fonts";
import { Main } from "./Main";
import { DURATION, FPS, H, W } from "./theme";
import { Teaser } from "./zerna/Teaser";
import * as Z from "./zerna/theme";
import { Teaser2 } from "./zerna2/Teaser2";
import * as Z2 from "./zerna2/theme";

// Drone shot of the site (September 2026). The light lands on the beat on what each line names.
const picture: Z.Picture = {
  src: "zerna/drone-site.jpg",
  size: { w: 1500, h: 1125 },
  cx: 640, // the houses in the middle of the frame
  light: [
    [224, -12], // ВАРТУЄ УВАГИ: the beam enters over the mountains
    [262, 42],
    [276, 42], // ВСЬОГО 130 КМ ВІД ЛЬВОВА: the serpentine road
    [284, 70],
    [301, 70], // НА ВЕРШИНІ ГОРИ: the summit, with the warm leak
    [309, 32],
    [326, 32], // ЛИШЕ 24 БУДИНКИ: the houses
    [334, 54],
  ],
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="OpusPromo" component={Main} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition
      id="ZernaA"
      component={Teaser}
      durationInFrames={Z.DURATION}
      fps={Z.FPS}
      width={Z.W}
      height={Z.H}
      defaultProps={{ variant: Z.TEXT, picture, music: true }}
    />
    <Composition
      id="Zerna2"
      component={Teaser2}
      durationInFrames={Z2.DURATION}
      fps={Z.FPS}
      width={Z.W}
      height={Z.H}
      defaultProps={{ text: Z2.TEXT2, music: true }}
    />
  </>
);
