import { continueRender, delayRender, staticFile } from "remotion";

const faces: [string, string, string][] = [
  ["Unbounded", "fonts/Unbounded-Black.ttf", "900"],
  ["JetBrains Mono", "fonts/JetBrainsMono-Regular.ttf", "400"],
  ["JetBrains Mono", "fonts/JetBrainsMono-Bold.ttf", "700"],
];

const handle = delayRender("Loading fonts");
Promise.all(
  faces.map(async ([family, file, weight]) => {
    const face = new FontFace(family, `url(${staticFile(file)})`, { weight });
    await face.load();
    document.fonts.add(face);
  }),
)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
