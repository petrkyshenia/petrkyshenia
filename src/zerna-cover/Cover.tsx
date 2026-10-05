import { AbsoluteFill, Img, staticFile } from "remotion";
import { useFontsReady } from "../zerna/fonts";
import { C, EUKR, H, MURS, W } from "../zerna/theme";

// Reels covers, 1080x1920, after the Zerna design code v1.0:
// §8 grid (64 px margins, title Murs Gothic CAPS 64/1.15, sub e-Ukraine 32/1.3, logo centred at the top),
// 250 px safe zone top and bottom; everything that matters also sits inside the 1080x1440 centre
// the profile grid crops to (y 240..1680).
const SAFE = 250;
const MARGIN = 64;
const LOGO_W = 210; // vertical logo (§8: reels take the sign or the vertical logo), 972x858 source
const TITLE: React.CSSProperties = { fontFamily: MURS, fontWeight: 900, fontSize: 64, lineHeight: 1.15, color: C.ivory, textAlign: "center" };
const SUB: React.CSSProperties = { fontFamily: EUKR, fontWeight: 400, fontSize: 32, lineHeight: 1.3, color: C.ivory, textAlign: "center" };

/** Brand background (landscape source), filled to the frame height and centred. */
const Background: React.FC<{ src: string }> = ({ src }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", top: 0, left: (W - (1920 * H) / 1080) / 2, height: H, width: (1920 * H) / 1080 }} />
);

/** Logo as delivered, no effects (§2); the gap under it keeps the safe zone. */
const Logo: React.FC = () => (
  <div style={{ position: "absolute", top: SAFE + 10, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
    <Img src={staticFile("zerna/logo-vertical-ivory-sand.png")} style={{ width: LOGO_W }} />
  </div>
);

/** §7.5 CTA sticker: white, green e-Ukraine, radius 10, the arrow-down-swing doodle on the right. */
const Sticker: React.FC<{ text: string; top: number }> = ({ text, top }) => (
  <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        background: "#FFFFFF",
        borderRadius: 10,
        boxShadow: "0 6px 18px rgba(0,0,0,.25)",
        padding: "16px 26px 16px 34px",
        fontFamily: EUKR,
        fontWeight: 500,
        fontSize: 32,
        color: C.green,
      }}
    >
      {text}
      <Img src={staticFile("zerna-cover/arrow-down-swing-ink.png")} style={{ height: 52 }} />
    </div>
  </div>
);

/**
 * Teaser 1: composition A. The night genplan fills the lower part of the frame and fades into
 * brand green at the top (as in the kit's reel-5); question in Sunny Yellow, project line in ivory.
 */
export const Cover1: React.FC<{ accent: string; title: readonly string[]; sub: string }> = ({ accent, title, sub }) => {
  const ok = useFontsReady();
  const top = 740; // where the photo starts
  const ph = H - top;
  const pw = (2000 * ph) / 1121;
  const cx = 1010; // source px at the centre: the road and the houses around it
  return (
    <AbsoluteFill style={{ background: C.green }}>
      <Background src="zerna-cover/bg-green-leaf.png" />
      <Img
        src={staticFile("zerna/genplan-night.jpg")}
        style={{ position: "absolute", top, height: ph, width: pw, left: W / 2 - (cx * ph) / 1121 }}
      />
      {/* §7.6: text never sits on the photo without the green overlay; here it fades the photo in from the top */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, #08281D ${top - 10}px, rgba(8,40,29,.85) ${top + 120}px, rgba(8,40,29,0) ${top + 460}px, rgba(8,40,29,0) ${H - 380}px, rgba(8,40,29,.55) ${H}px)`,
        }}
      />
      {ok && (
        <>
          <Logo />
          <div style={{ position: "absolute", top: 520, left: MARGIN, right: MARGIN }}>
            <div style={{ ...TITLE, color: C.yellow }}>{accent}</div>
            {title.map((l) => (
              <div key={l} style={TITLE}>
                {l}
              </div>
            ))}
            <div style={{ ...SUB, marginTop: 22 }}>{sub}</div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

/**
 * Teaser 2: composition B. Green rhombus background (§7.2: covers), the one yellow plate on the
 * posters' line, the genplan in a photo card (radius 32), the CTA sticker under it.
 */
export const Cover2: React.FC<{ plate: string; title: readonly string[]; cta: string }> = ({ plate, title, cta }) => {
  const ok = useFontsReady();
  const card = { top: 840, w: W - 2 * MARGIN, h: 680 };
  // genplan 2000x1123: fill the card, centred on the houses and the fire pit
  const scale = card.h / 1123;
  const iw = 2000 * scale;
  const cx = 1180;
  return (
    <AbsoluteFill style={{ background: C.green }}>
      <Background src="zerna-cover/bg-green-rhombus.png" />
      {ok && (
        <>
          <Logo />
          <div style={{ position: "absolute", top: 520, left: MARGIN, right: MARGIN, display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* §7.4 accent plate: radius 14, side padding 0.75 x line height */}
            <div style={{ ...TITLE, color: C.green, background: C.yellow, borderRadius: 14, padding: `6px ${Math.round(0.75 * 64 * 1.15)}px 2px`, marginBottom: 22 }}>
              {plate}
            </div>
            {title.map((l) => (
              <div key={l} style={TITLE}>
                {l}
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", top: card.top, left: MARGIN, width: card.w, height: card.h, borderRadius: 32, overflow: "hidden" }}>
            <Img src={staticFile("zerna2/genplan.jpg")} style={{ position: "absolute", top: 0, height: card.h, width: iw, left: card.w / 2 - cx * scale }} />
          </div>
          <Sticker text={cta} top={card.top + card.h + 44} />
        </>
      )}
    </AbsoluteFill>
  );
};
