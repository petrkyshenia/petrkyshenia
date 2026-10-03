import { Composition } from "remotion";
import "./fonts";
import { Main } from "./Main";
import { DURATION, FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="OpusPromo" component={Main} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
);
