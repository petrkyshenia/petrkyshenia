import { Composition } from "remotion";
import "./fonts";
import { Main } from "./Main";
import { DURATION, FPS, H, W } from "./theme";
import { Teaser } from "./zerna/Teaser";
import * as Z from "./zerna/theme";

// Drone shot of the site; the one sharp detail is the plot at the bend of the road (marked by the client).
const picture: Z.Picture = { src: "zerna/picture-placeholder.jpg", focus: { x: 60, y: 37, r: 17 } };

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
  </>
);
