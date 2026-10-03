import opentype from "opentype.js";
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";

let fontPromise: Promise<opentype.Font> | null = null;
const loadHeadFont = () =>
  (fontPromise ??= fetch(staticFile("fonts/Unbounded-Black.ttf"))
    .then((r) => r.arrayBuffer())
    .then((buf) => opentype.parse(buf)));

/** Unbounded 900 as an opentype.js font, for extruded 3D type. */
export const useHeadFont = () => {
  const [font, setFont] = useState<opentype.Font | null>(null);
  const [handle] = useState(() => delayRender("Loading Unbounded outlines"));
  useEffect(() => {
    loadHeadFont()
      .then((f) => {
        setFont(f);
        continueRender(handle);
      })
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
  return font;
};

const pathToShapes = (path: opentype.Path) => {
  const sp = new THREE.ShapePath();
  for (const c of path.commands) {
    // opentype is y-down; three is y-up
    if (c.type === "M") sp.moveTo(c.x, -c.y);
    else if (c.type === "L") sp.lineTo(c.x, -c.y);
    else if (c.type === "Q") sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
    else if (c.type === "C") sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
  }
  return sp.toShapes();
};

export type Glyph3D = {
  char: string;
  geometry: THREE.BufferGeometry;
  /** centre of the glyph along x, relative to the centre of the whole word */
  x: number;
  width: number;
};

export type Word3D = { glyphs: Glyph3D[]; width: number; capHeight: number };

/**
 * Extruded word. Every glyph is centred on its own pivot (for per-letter motion);
 * the word itself is centred horizontally and on the cap height vertically.
 */
export const buildWord = (
  font: opentype.Font,
  text: string,
  { size = 1, depth = 0.32, bevel = 0.035, tracking = 0, curveSegments = 10 } = {},
): Word3D => {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  const capHeight = ((font.tables.os2 as { sCapHeight?: number }).sCapHeight ?? 700) * scale;
  const out: Glyph3D[] = [];
  let pen = 0;
  glyphs.forEach((g, i) => {
    const adv = (g.advanceWidth ?? 0) * scale;
    const ch = text[i];
    if (ch !== " ") {
      const shapes = pathToShapes(g.getPath(0, 0, size));
      const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel * 0.8,
        bevelSegments: 4,
        curveSegments,
      });
      geometry.computeBoundingBox();
      const bb = geometry.boundingBox!;
      const cx = (bb.min.x + bb.max.x) / 2;
      geometry.translate(-cx, -capHeight / 2, -depth / 2);
      geometry.computeVertexNormals();
      out.push({ char: ch, geometry, x: pen + cx, width: bb.max.x - bb.min.x });
    }
    pen += adv + tracking;
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  // centre the ink box of the whole word
  const left = Math.min(...out.map((o) => o.x - o.width / 2));
  const right = Math.max(...out.map((o) => o.x + o.width / 2));
  const mid = (left + right) / 2;
  out.forEach((o) => (o.x -= mid));
  return { glyphs: out, width: right - left, capHeight };
};
