// Generates optimized, responsive web derivatives for the curated wedding
// photos + logo, and writes a manifest the site consumes.
//
// For every curated photo we emit (into public/gallery/):
//   <id>-<w>.webp / .jpg   at several widths (thumb + full)
//   plus a tiny base64 LQIP for blur-up and the intrinsic aspect ratio.
// The hero + section backgrounds get larger widths.
import sharp from "sharp";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(".");
const SRC_DIR = path.resolve(
  "../brotherswedding-photo-download-1of2/wedding_day-part1"
);
const OUT_DIR = path.resolve("./public/gallery");
const HERO_DIR = path.resolve("./public/hero");
const LOGO_SRC = path.resolve("../לוגו brothers");
const LOGO_OUT = path.resolve("./public/logo");
const DATA_OUT = path.resolve("./src/data/gallery.generated.json");

const curated = JSON.parse(
  await readFile(path.resolve("./src/data/curated.json"), "utf8")
);

// Widths (max) for gallery items; sharp keeps aspect ratio, never upscales.
const GALLERY_WIDTHS = [600, 1000, 1600];
const HERO_WIDTHS = [1200, 1920, 2560];

sharp.cache(false);
sharp.concurrency(4);

function idFromFile(file) {
  return file.replace(/\.(jpe?g|png)$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function lqip(input) {
  const buf = await sharp(input)
    .rotate()
    .resize(24, 24, { fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

async function emit(input, outDir, id, widths, { jpgQ = 80, webpQ = 78 } = {}) {
  const meta = await sharp(input).rotate().metadata();
  const intrinsicW = meta.width;
  const intrinsicH = meta.height;
  const outputs = [];
  for (const w of widths) {
    if (w > intrinsicW * 1.02) continue; // don't upscale
    const base = `${id}-${w}`;
    await sharp(input)
      .rotate()
      .resize(w)
      .webp({ quality: webpQ })
      .toFile(path.join(outDir, `${base}.webp`));
    await sharp(input)
      .rotate()
      .resize(w)
      .jpeg({ quality: jpgQ, mozjpeg: true })
      .toFile(path.join(outDir, `${base}.jpg`));
    outputs.push(w);
  }
  // Guarantee at least one width even for smaller-than-min sources.
  if (outputs.length === 0) {
    const w = Math.min(widths[0], intrinsicW);
    const base = `${id}-${w}`;
    await sharp(input).rotate().resize(w).webp({ quality: webpQ }).toFile(path.join(outDir, `${base}.webp`));
    await sharp(input).rotate().resize(w).jpeg({ quality: jpgQ, mozjpeg: true }).toFile(path.join(outDir, `${base}.jpg`));
    outputs.push(w);
  }
  return { width: intrinsicW, height: intrinsicH, widths: outputs };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(HERO_DIR, { recursive: true });
  await mkdir(LOGO_OUT, { recursive: true });

  // ---- Logo (transparent PNG passthrough + a web-optimized copy) ----
  for (const [src, dst] of [
    ["noBgColor.png", "logo-color.png"],
    ["noBgWhite.png", "logo-white.png"],
    ["noBgBlack.png", "logo-black.png"],
  ]) {
    try {
      await copyFile(path.join(LOGO_SRC, src), path.join(LOGO_OUT, dst));
    } catch (e) {
      console.warn(`logo copy skip ${src}: ${e.message}`);
    }
  }

  const manifest = { hero: null, backgrounds: {}, items: [] };

  // ---- Hero ----
  {
    const file = curated.hero;
    const id = idFromFile(file);
    const info = await emit(path.join(SRC_DIR, file), HERO_DIR, id, HERO_WIDTHS, {
      jpgQ: 82,
      webpQ: 80,
    });
    manifest.hero = {
      id,
      dir: "hero",
      ...info,
      lqip: await lqip(path.join(SRC_DIR, file)),
    };
    console.log(`hero: ${file} -> ${info.widths.join(",")}`);
  }

  // ---- Section backgrounds ----
  for (const [key, file] of Object.entries(curated.sectionBackgrounds || {})) {
    const id = idFromFile(file);
    const info = await emit(path.join(SRC_DIR, file), HERO_DIR, id, HERO_WIDTHS, {
      jpgQ: 80,
      webpQ: 78,
    });
    manifest.backgrounds[key] = {
      id,
      dir: "hero",
      ...info,
      lqip: await lqip(path.join(SRC_DIR, file)),
    };
    console.log(`bg[${key}]: ${file} -> ${info.widths.join(",")}`);
  }

  // ---- Gallery ----
  let n = 0;
  for (const file of curated.gallery) {
    const id = idFromFile(file);
    const src = path.join(SRC_DIR, file);
    const info = await emit(src, OUT_DIR, id, GALLERY_WIDTHS);
    manifest.items.push({
      id,
      dir: "gallery",
      file,
      width: info.width,
      height: info.height,
      widths: info.widths,
      orientation: info.width >= info.height ? "landscape" : "portrait",
      lqip: await lqip(src),
    });
    n++;
    if (n % 10 === 0) console.log(`  ...${n}/${curated.gallery.length}`);
  }

  await writeFile(DATA_OUT, JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${manifest.items.length} gallery items. Manifest -> ${DATA_OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
