// Builds a comparison sheet of hero-image candidates, each cropped to the
// hero aspect ratio with the same dark scrim the live hero uses, so we can
// judge how each would actually look as the hero.
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve("../brotherswedding-photo-download-1of2/wedding_day-part1");
const OUT = path.resolve("./scratch-hero-options");

// candidate files + short label
const CANDIDATES = [
  ["aa241.jpg", "1 - aa241  (CURRENT - golden field, holding hands)"],
  ["YB-8.jpg", "2 - YB-8  (silhouette walking into sunset)"],
  ["aa398.jpg", "3 - aa398  (golden beach sunset kiss)"],
  ["cYB-609.jpg", "4 - cYB-609  (sun-flare silhouette kiss)"],
  ["YB-807.jpg", "5 - YB-807  (field embrace at sunset)"],
  ["cYB-745.jpg", "6 - cYB-745  (kiss in a golden field)"],
];

const W = 1500;
const H = 620; // hero-ish wide crop
const LABEL_H = 40;
const GAP = 16;

// dark scrim matching the live hero (bottom + top darkening)
function scrim() {
  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="rgb(40,28,20)" stop-opacity="0.72"/>
          <stop offset="42%" stop-color="rgb(40,28,20)" stop-opacity="0.18"/>
          <stop offset="70%" stop-color="rgb(40,28,20)" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="rgb(40,28,20)" stop-opacity="0.40"/>
        </linearGradient>
        <linearGradient id="r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgb(40,28,20)" stop-opacity="0.55"/>
          <stop offset="45%" stop-color="rgb(40,28,20)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect width="100%" height="100%" fill="url(#r)"/>
    </svg>`
  );
}

function label(text) {
  return Buffer.from(
    `<svg width="${W}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgb(28,20,14)"/>
      <text x="16" y="26" font-family="monospace" font-size="20" fill="#E7D7C2">${text}</text>
    </svg>`
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const rowH = LABEL_H + H;
  const sheetH = CANDIDATES.length * rowH + (CANDIDATES.length + 1) * GAP;
  const composites = [];

  for (let i = 0; i < CANDIDATES.length; i++) {
    const [file, text] = CANDIDATES[i];
    const y = GAP + i * (rowH + GAP);
    try {
      const cropped = await sharp(path.join(SRC, file))
        .rotate()
        .resize(W, H, { fit: "cover", position: sharp.strategy.attention })
        .toBuffer();
      const withScrim = await sharp(cropped)
        .composite([{ input: scrim(), left: 0, top: 0 }])
        .jpeg({ quality: 82 })
        .toBuffer();
      composites.push({ input: label(text), left: 0, top: y });
      composites.push({ input: withScrim, left: 0, top: y + LABEL_H });
    } catch (e) {
      console.warn(`skip ${file}: ${e.message}`);
    }
  }

  await sharp({
    create: { width: W, height: sheetH, channels: 3, background: { r: 20, g: 14, b: 10 } },
  })
    .composite(composites)
    .jpeg({ quality: 82 })
    .toFile(path.join(OUT, "hero-options.jpg"));
  console.log("Wrote " + path.join(OUT, "hero-options.jpg"));
}

main().catch((e) => { console.error(e); process.exit(1); });
