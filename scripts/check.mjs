// QA for the rendered video: format, blown highlights, audio loudness, hits and the wall filter.
// usage: node scripts/check.mjs renders/opus-5-5.mp4 [sheet-dir]
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] ?? "renders/opus-5-5.mp4";
const sheetDir = process.argv[3];
const score = JSON.parse(fs.readFileSync(new URL("../src/audio/score.json", import.meta.url), "utf8"));
let failed = false;
const report = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failed = true;
};

// ---------- format ----------
const probe = JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }),
);
const v = probe.streams.find((s) => s.codec_type === "video");
const a = probe.streams.find((s) => s.codec_type === "audio");
const [num, den] = v.r_frame_rate.split("/").map(Number);
const frames = Number(v.nb_frames);
report(v.width === 1920 && v.height === 1080, `video ${v.width}×${v.height}`);
report(Math.abs(num / den - 30) < 1e-6, `${num / den} fps`);
report(frames === Math.round(score.duration * 30), `${frames} frames = ${(frames / 30).toFixed(2)} s`);
report(Boolean(a), `audio: ${a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch` : "missing"}`);

// ---------- blown highlights ----------
// A pixel counts as blown when all three channels are ≥ 250 (clipped to white).
const W = 1920;
const H = 1080;
const frameBytes = W * H * 3;
const stats = await new Promise((resolve, reject) => {
  const ff = spawn("ffmpeg", ["-v", "error", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const out = [];
  let buf = Buffer.alloc(0);
  ff.stdout.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= frameBytes) {
      const f = buf.subarray(0, frameBytes);
      let blown = 0;
      let luma = 0;
      for (let i = 0; i < frameBytes; i += 3) {
        const r = f[i];
        const g = f[i + 1];
        const b = f[i + 2];
        if (r >= 250 && g >= 250 && b >= 250) blown++;
        luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      out.push({ blown: blown / (W * H), luma: luma / (W * H) / 255 });
      buf = buf.subarray(frameBytes);
    }
  });
  ff.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`ffmpeg exit ${code}`))));
});
const worst = stats.reduce((m, s, i) => (s.blown > m.blown ? { ...s, i } : m), { blown: -1, i: -1 });
const brightest = stats.reduce((m, s, i) => (s.luma > m.luma ? { ...s, i } : m), { luma: -1, i: -1 });
let jump = { d: 0, i: 0 };
for (let i = 1; i < stats.length; i++) {
  const d = stats[i].luma - stats[i - 1].luma;
  if (d > jump.d) jump = { d, i };
}
report(worst.blown < 0.002, `blown-white pixels: max ${(worst.blown * 100).toFixed(3)} % of frame (frame ${worst.i}), limit 0.2 %`);
report(brightest.luma < 0.45, `brightest frame: mean luma ${(brightest.luma * 100).toFixed(1)} % (frame ${brightest.i}), limit 45 %`);
report(jump.d < 0.12, `largest frame-to-frame flash: +${(jump.d * 100).toFixed(1)} % luma (frame ${jump.i}), limit 12 %`);

// ---------- audio ----------
const summary = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], {
  encoding: "utf8",
}).stderr;
const sum = summary.slice(summary.lastIndexOf("Summary:"));
const ebur = { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1]) };
report(ebur.I > -16 && ebur.I < -11, `integrated loudness ${ebur.I} LUFS (target −16…−11)`);
report(ebur.TP <= -1, `true peak ${ebur.TP} dBTP (limit −1)`);

// decode audio to mono float for envelope checks
const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], {
  maxBuffer: 1 << 28,
});
const sr = 48000;
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const rms = (t0, t1) => {
  let s = 0;
  const a0 = Math.max(0, Math.round(t0 * sr));
  const a1 = Math.min(x.length, Math.round(t1 * sr));
  for (let i = a0; i < a1; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, a1 - a0));
};
const toDb = (v) => 20 * Math.log10(v + 1e-9);
for (const [name, t] of Object.entries(score.hits)) {
  // find the strongest onset within ±60 ms of the scheduled hit
  let best = { t: 0, rise: -Infinity };
  for (let dt = -0.06; dt <= 0.06; dt += 0.002) {
    const rise = toDb(rms(t + dt, t + dt + 0.03)) - toDb(rms(t + dt - 0.05, t + dt));
    if (rise > best.rise) best = { t: t + dt, rise };
  }
  report(Math.abs(best.t - t) <= 0.02 && best.rise > 3, `hit "${name}" at ${t} s: onset ${best.t.toFixed(3)} s, +${best.rise.toFixed(1)} dB`);
}

// wall filter: share of energy above 2 kHz before and after 7.3 s
const hfShare = (t0, t1) => {
  const hp = execFileSync("ffmpeg", ["-v", "error", "-ss", String(t0), "-t", String(t1 - t0), "-i", file, "-ac", "1", "-af", "highpass=f=2000,highpass=f=2000", "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
  const full = execFileSync("ffmpeg", ["-v", "error", "-ss", String(t0), "-t", String(t1 - t0), "-i", file, "-ac", "1", "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
  const e = (b) => {
    const f = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
    let s = 0;
    for (const v of f) s += v * v;
    return s;
  };
  return e(hp) / e(full);
};
const before = hfShare(1.4, 4.3); // muffled section without impacts
const after = hfShare(7.4, 9.3);
report(after / before > 10, `energy above 2 kHz: ${(before * 100).toFixed(2)} % before 7.3 s → ${(after * 100).toFixed(2)} % after (×${(after / before).toFixed(0)})`);

// ---------- 1000 px card ----------
if (sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const picks = [20, 75, 130, 158, 172, 210, 250, 300];
  for (const f of picks) {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", `select=eq(n\\,${f}),scale=1000:-2:flags=lanczos`, "-frames:v", "1", path.join(sheetDir, `card-${String(f).padStart(3, "0")}.png`)]);
  }
  console.log(`1000 px card previews → ${sheetDir}`);
}

process.exit(failed ? 1 : 0);
