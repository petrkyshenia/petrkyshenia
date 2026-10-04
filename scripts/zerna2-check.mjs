// QA for Zerna teaser 2 against its reference reel.
// Usage: node scripts/zerna2-check.mjs <render.mp4> [reference.mp4]
import { spawnSync } from "node:child_process";

const [video, reference = "zerna-teaser-2/reference/reference.mp4"] = process.argv.slice(2);
if (!video) {
  console.error("usage: node scripts/zerna2-check.mjs <render.mp4> [reference.mp4]");
  process.exit(1);
}

let failed = false;
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed = true;
};
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 30, ...opts });

const streams = (file) => JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", file]).stdout).streams;

/** 180x320 grey frames. */
const frames = (file) => {
  const raw = run("ffmpeg", ["-v", "error", "-i", file, "-vf", "scale=180:320,format=gray", "-f", "rawvideo", "-"], { encoding: "buffer" }).stdout;
  const size = 180 * 320;
  return Array.from({ length: raw.length / size }, (_, i) => raw.subarray(i * size, (i + 1) * size));
};

/** Frames < 80 where the picture changes: one per pasted poster. */
const pastes = (f) =>
  f.slice(1, 80).flatMap((cur, i) => {
    const prev = f[i];
    let d = 0;
    for (let k = 0; k < cur.length; k++) d += Math.abs(cur[k] - prev[k]);
    return d / cur.length > 1.5 ? [i + 1] : [];
  });

/** Background tone of each strobe frame (79..185), ranked dark → light: 0..3, from the top-left corner. */
const tones = (f) => {
  const corner = f.slice(79, 186).map((fr) => {
    const v = [];
    for (let y = 2; y < 15; y++) for (let x = 2; x < 15; x++) v.push(fr[y * 180 + x]);
    v.sort((a, b) => a - b);
    return v[v.length >> 1];
  });
  const levels = [...new Set(corner.map((c) => Math.round(c / 20)))].sort((a, b) => a - b);
  return corner.map((c) => levels.indexOf(Math.round(c / 20))).join("");
};

const samples = (file) => {
  const pcm = run("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], { encoding: "buffer" }).stdout;
  return new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 1);
};
const onset = (s) => (s.findIndex((v) => Math.abs(v) > 330) / 48000) * 1000;
const level = (s, from, to) => {
  const part = s.subarray(Math.round(from * 48000), Math.round(to * 48000));
  const ms = part.reduce((acc, v) => acc + (v / 32768) ** 2, 0) / Math.max(1, part.length);
  return 10 * Math.log10(ms + 1e-12);
};
const loudness = (file) => {
  const err = run("ffmpeg", ["-hide_banner", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
  const summary = err.slice(err.lastIndexOf("Summary:"));
  return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]), peak: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]) };
};

const v = streams(video);
const vs = v.find((s) => s.codec_type === "video");
const as = v.find((s) => s.codec_type === "audio");
check(vs.width === 1080 && vs.height === 1920, "1080x1920", `${vs.width}x${vs.height}`);
check(vs.r_frame_rate === "30/1", "30 fps", vs.r_frame_rate);
check(Number(vs.nb_frames) === 450, "450 frames = 15 s", vs.nb_frames);
check(vs.codec_name === "h264" && vs.pix_fmt === "yuv420p", "H.264 yuv420p", `${vs.codec_name} ${vs.pix_fmt}`);
check(vs.color_range === "tv" && vs.color_space === "bt709", "BT.709, limited range", `${vs.color_space} ${vs.color_range}`);
check(Boolean(as), "has audio track");

const ref = frames(reference);
const ours = frames(video);
const pr = pastes(ref);
const po = pastes(ours);
check(pr.join() === po.join(), "posters are pasted on the reference frames", `${po.length - 1} pastes`);
const tr = tones(ref);
const to = tones(ours);
check(tr === to, "strobe background tone matches the reference frame by frame", `${to.length} frames`);
if (tr !== to) console.log(`   ref:  ${tr}\n   ours: ${to}`);

if (as) {
  const s = samples(video);
  const d = onset(s) - onset(samples(reference));
  check(Math.abs(d) <= 5, "music starts in sync with the reference", `${d.toFixed(1)} ms`);
  // the source file ends at 12.98 s; the echo tail must carry the CTA and die out before the loop
  const tail = level(s, 13.0, 13.6);
  const end = level(s, 14.9, 15);
  check(tail > -45 && end < -60, "echo tail after the source ends, silent at the loop point", `${tail.toFixed(0)} / ${end.toFixed(0)} dBFS`);
  const { I, peak } = loudness(video);
  check(I >= -16 && I <= -12, "loudness -16…-12 LUFS", `${I} LUFS`);
  check(peak <= -0.5, "peak <= -0.5 dBFS", `${peak} dBFS`);
}

process.exit(failed ? 1 : 0);
