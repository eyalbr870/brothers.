// Builds contact-sheet montages of all wedding photos so they can be reviewed
// at a glance for curation. Each sheet is a grid of downscaled thumbnails with
// the filename printed under each cell.
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve(
  "../brotherswedding-photo-download-1of2/wedding_day-part1"
);
const OUT = path.resolve("./scratch-contact-sheets");

const COLS = 6;
const ROWS = 7; // 42 per sheet
const CELL_W = 300;
const CELL_H = 300;
const LABEL_H = 22;
const PAD = 6;
const cellFull = CELL_H + LABEL_H;

const bg = { r: 24, g: 18, b: 14, alpha: 1 };

function svgLabel(text) {
  return Buffer.from(
    `<svg width="${CELL_W}" height="${LABEL_H}"><rect width="100%" height="100%" fill="rgb(24,18,14)"/><text x="${CELL_W / 2}" y="15" font-family="monospace" font-size="14" fill="#E7D7C2" text-anchor="middle">${text}</text></svg>`
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let files = (await readdir(SRC))
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort();
  console.log(`Found ${files.length} images.`);

  const perSheet = COLS * ROWS;
  const sheets = Math.ceil(files.length / perSheet);

  for (let s = 0; s < sheets; s++) {
    const slice = files.slice(s * perSheet, (s + 1) * perSheet);
    const sheetW = COLS * CELL_W + (COLS + 1) * PAD;
    const sheetH = ROWS * cellFull + (ROWS + 1) * PAD;
    const composites = [];

    for (let i = 0; i < slice.length; i++) {
      const file = slice[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = PAD + col * (CELL_W + PAD);
      const y = PAD + row * (cellFull + PAD);
      try {
        const thumb = await sharp(path.join(SRC, file))
          .rotate()
          .resize(CELL_W, CELL_H, { fit: "cover" })
          .jpeg({ quality: 70 })
          .toBuffer();
        composites.push({ input: thumb, left: x, top: y });
        composites.push({ input: svgLabel(file), left: x, top: y + CELL_H });
      } catch (e) {
        console.warn(`skip ${file}: ${e.message}`);
      }
    }

    const outPath = path.join(OUT, `sheet-${String(s + 1).padStart(2, "0")}.jpg`);
    await sharp({
      create: { width: sheetW, height: sheetH, channels: 3, background: bg },
    })
      .composite(composites)
      .jpeg({ quality: 72 })
      .toFile(outPath);
    console.log(`Wrote ${outPath} (${slice.length} imgs)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
