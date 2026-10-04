import { Composition } from "remotion";
import "./fonts";
import { Main } from "./Main";
import { DURATION, FPS, H, W } from "./theme";
import { Teaser } from "./zerna/Teaser";
import * as Z from "./zerna/theme";

// Placeholder until the final picture is chosen: drone shot of the site, sharp on the houses at the top.
const picture: Z.Picture = { src: "zerna/picture-placeholder.jpg", focus: { x: 62, y: 12, r: 22 } };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="OpusPromo" component={Main} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    {(Object.keys(Z.VARIANTS) as (keyof typeof Z.VARIANTS)[]).map((key) => (
      <Composition
        key={key}
        id={`Zerna${key}`}
        component={Teaser}
        durationInFrames={Z.DURATION}
        fps={Z.FPS}
        width={Z.W}
        height={Z.H}
        defaultProps={{ variant: Z.VARIANTS[key], picture, music: true }}
      />
    ))}
  </>
);
