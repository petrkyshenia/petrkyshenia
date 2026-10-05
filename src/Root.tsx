import { Composition, Still } from "remotion";
import "./fonts";
import { Main } from "./Main";
import { DURATION, FPS, H, W } from "./theme";
import { Cover1, Cover2 } from "./zerna-cover/Cover";
import { Teaser } from "./zerna/Teaser";
import * as Z from "./zerna/theme";
import { Teaser2 } from "./zerna2/Teaser2";
import * as Z2 from "./zerna2/theme";

// Night render of the Zerna genplan, seen from above, panning left to right.
// The light lands on the beat on what each line names.
const picture: Z.Picture = {
  src: "zerna/genplan-night-soft.jpg", // blurred: phase 0 shows silhouettes only (scripts/zerna-soft.py)
  size: { w: 2000, h: 1121 },
  cx: [820, 1250],
  gain: 1.9, // a night render: the light has to lift it more than a daylight picture
  light: [
    [224, -12], // ВАРТУЄ УВАГИ: the beam enters over the forest and the first houses
    [262, 42],
    [276, 42], // ВСЬОГО 130 КМ ВІД ЛЬВОВА: the road with the cars
    [284, 51],
    [301, 51], // НА ВЕРШИНІ ГОРИ: the top of the plan, with the warm leak
    [309, 31],
    [326, 31], // ЛИШЕ 24 БУДИНКИ: the cluster of houses below
    [334, 61],
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
    {/* Reels covers for the two teasers */}
    <Still
      id="ZernaCover1"
      component={Cover1}
      width={Z.W}
      height={Z.H}
      defaultProps={{ accent: "А ВИ ГОТОВІ?", title: ["НОВИЙ ПРОЄКТ", "У КАРПАТАХ"], sub: "Всього 130 км від Львова" }}
    />
    <Still
      id="ZernaCover2"
      component={Cover2}
      width={Z.W}
      height={Z.H}
      defaultProps={{ plate: "ВАРТУЄ УВАГИ", title: ["НОВЕ КЛУБНЕ МІСТЕЧКО", "В КАРПАТАХ"], cta: "Дізнайтеся першими" }}
    />
  </>
);
