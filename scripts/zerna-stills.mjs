// Renders storyboard stills for the Zerna teaser: bundle once, then one PNG per frame.
// Usage: node scripts/zerna-stills.mjs <outDir> <CompositionId> <frame> [frame...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [outDir, id, ...frames] = process.argv.slice(2);
if (!outDir || !id || frames.length === 0) {
  console.error("usage: node scripts/zerna-stills.mjs <outDir> <CompositionId> <frame...>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions: { gl: "swangle" } });

for (const f of frames.map(Number)) {
  const output = path.join(outDir, `${id}-${String(f).padStart(3, "0")}.png`);
  await renderStill({ serveUrl, composition, frame: f, output, browserExecutable, chromiumOptions: { gl: "swangle" } });
  console.log(output);
}
