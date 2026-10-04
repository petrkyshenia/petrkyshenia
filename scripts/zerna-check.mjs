// QA for the Zerna teaser against the reference reel.
// Usage: node scripts/zerna-check.mjs <render.mp4> [silent.mp4] [reference.mp4]
import { spawnSync } from "node:child_process";

const [video, silent, reference = "zerna-teaser/reference/reference.mp4"] = process.argv.slice(2);
if (!video) {
  console.error("usage: node scripts/zerna-check.mjs <render.mp4> [silent.mp4] [reference.mp4]");
  process.exit(1);
}

let failed = false;
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed = true;
};

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 30, ...opts });

const streams = (file) =>
  JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", file]).stdout).streams;

/** Frames (before the picture section, < 232) where mean luma jumps by more than 40: the word cuts and strobe. */
const cuts = (file) => {
  const out = run("ffmpeg", ["-v", "error", "-i", file, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"]).stdout;
  const y = [...out.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  return y.flatMap((v, i) => (i > 0 && i < 232 && Math.abs(v - y[i - 1]) > 40 ? [i] : []));
};

/** Time of the first audible sample, in ms. */
const onset = (file) => {
  const pcm = run("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], { encoding: "buffer" }).stdout;
  const s = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 1);
  const i = s.findIndex((v) => Math.abs(v) > 330); // about -40 dBFS
  return (i / 48000) * 1000;
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
check(Number(vs.nb_frames) === 413, "413 frames = 13.77 s", vs.nb_frames);
check(vs.codec_name === "h264" && vs.pix_fmt === "yuv420p", "H.264 yuv420p", `${vs.codec_name} ${vs.pix_fmt}`);
// limited range BT.709 with tags, so phones and Instagram show the brand colours as designed
check(vs.color_range === "tv" && vs.color_space === "bt709", "BT.709, limited range", `${vs.color_space} ${vs.color_range}`);
check(Boolean(as), "has audio track");

const ref = cuts(reference);
const ours = cuts(video);
check(ref.join() === ours.join(), "word cuts and glitch strobe land on the reference frames", `${ours.length} cuts`);
if (ref.join() !== ours.join()) console.log(`   ref:  ${ref.join(" ")}\n   ours: ${ours.join(" ")}`);

if (as) {
  const d = onset(video) - onset(reference);
  check(Math.abs(d) <= 5, "music starts in sync with the reference", `${d.toFixed(1)} ms`);
  const { I, peak } = loudness(video);
  check(I >= -16 && I <= -12, "loudness -16…-12 LUFS", `${I} LUFS`);
  check(peak <= -0.5, "peak <= -0.5 dBFS", `${peak} dBFS`);
}

if (silent) {
  const s = streams(silent);
  check(!s.some((x) => x.codec_type === "audio"), "silent version has no audio track");
  check(cuts(silent).join() === ref.join(), "silent version keeps the same cuts");
}

process.exit(failed ? 1 : 0);
