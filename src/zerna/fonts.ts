import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

// [family, file, weight] — weight ranges are variable fonts.
const faces: [string, string, string][] = [
  ["Murs Gothic", "zerna/fonts/MursGothic-WideDark.ttf", "900"],
  ["e-Ukraine", "zerna/fonts/e-Ukraine-Thin.otf", "100"],
  ["e-Ukraine", "zerna/fonts/e-Ukraine-Light.otf", "300"],
  ["e-Ukraine", "zerna/fonts/e-Ukraine-Regular.otf", "400"],
  ["e-Ukraine", "zerna/fonts/e-Ukraine-Medium.otf", "500"],
  ["e-Ukraine", "zerna/fonts/e-Ukraine-Bold.otf", "700"],
  // Glitch-only faces (all with Cyrillic, SIL OFL)
  ["Playfair Display", "zerna/fonts/PlayfairDisplay.ttf", "400 900"],
  ["Oswald", "zerna/fonts/Oswald.ttf", "200 700"],
  ["Caveat", "zerna/fonts/Caveat.ttf", "400 700"],
  ["Lobster", "zerna/fonts/Lobster.ttf", "400"],
  ["Comfortaa", "zerna/fonts/Comfortaa.ttf", "300 700"],
];

const ready: Promise<void> = Promise.all(
  faces.map(async ([family, file, weight]) => {
    const face = new FontFace(family, `url(${staticFile(file)})`, { weight });
    await face.load();
    document.fonts.add(face);
  }),
).then(() => undefined);

/** True once every face is loaded; holds the render until then so text can be measured. */
export const useFontsReady = () => {
  const [ok, setOk] = useState(false);
  const [handle] = useState(() => delayRender("Loading Zerna fonts"));
  useEffect(() => {
    ready
      .catch((err) => console.error(err))
      .finally(() => {
        setOk(true);
        continueRender(handle);
      });
  }, [handle]);
  return ok;
};

let ctx: CanvasRenderingContext2D | null = null;

/** Advance width of `text` at 100 px. */
export const measure = (text: string, family: string, weight: number | string, style = "normal") => {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 60;
  ctx.font = `${style} ${weight} 100px ${family}`;
  return ctx.measureText(text).width;
};

/** Font size at which every line fits `maxWidth`, capped at `maxSize`. */
export const fitSize = (
  lines: readonly string[],
  family: string,
  weight: number | string,
  maxWidth: number,
  maxSize: number,
  style = "normal",
) => Math.min(maxSize, ...lines.map((l) => (maxWidth / Math.max(1, measure(l, family, weight, style))) * 100));
