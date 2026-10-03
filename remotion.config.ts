import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
// The container has no GPU: SwiftShader via ANGLE gives deterministic WebGL.
Config.setChromiumOpenGlRenderer("swangle");
Config.setConcurrency(4);
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
// Use a locally installed headless shell when the default download is unavailable.
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
