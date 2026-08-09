// Scrapes the couple-attached photos from the studio's mit4mit reviews,
// optimizes them into local webp derivatives, and writes a flat manifest the
// testimonials DepthCarousel consumes.
//
// For every review photo we emit (into public/reviews/):
//   <reviewid>-<n>-<w>.webp   at a card width + a full (lightbox) width
//   plus a tiny base64 LQIP for blur-up and the intrinsic aspect ratio.
//
// Source of truth for a review's full image set is the per-review gallery
// endpoint (the inline page markup truncates to 4 thumbnails):
//   /bizMobile/gallery.php?id=<BIZ>&reviewId=<id>
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BIZ = "100325";
const BIZ_URL = `https://www.mit4mit.co.il/biz/${BIZ}`;
const galleryUrl = (reviewId) =>
  `https://www.mit4mit.co.il/bizMobile/gallery.php?id=${BIZ}&firstPic=0&reviewId=${reviewId}`;

const OUT_DIR = path.resolve("./public/reviews");
const DATA_OUT = path.resolve("./src/data/review-photos.generated.json");

// Card ~300x380 @2x, full for the fullscreen lightbox. sharp never upscales.
const WIDTHS = [640, 1400];

sharp.cache(false);
sharp.concurrency(4);

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function getText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function getBuffer(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function stripTags(s) {
  return decodeEntities(
    s
      .replace(/<br\s*\/?>/gi, " ") // line breaks are real whitespace
      .replace(/<[^>]+>/g, "") // other tags join adjacent text directly
      .replace(/\s+/g, " ")
  );
}

// Parse the biz page into review blocks: { name, reviewid, text, date }.
function parseReviews(html) {
  const starts = [];
  const re = /<div[^>]*class="[^"]*displayEngine_review/g;
  let m;
  while ((m = re.exec(html))) starts.push(m.index);
  starts.push(html.length);

  const reviews = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const block = html.slice(starts[i], starts[i + 1]);
    const name = block.match(/itemprop="name">\s*([\s\S]*?)\s*</);
    const rid = block.match(/reviewid="([0-9a-f]+)"/);
    if (!rid) continue; // no attached photos on this review
    const text = block.match(/class="[^"]*reviewText[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const date = block.match(/class="[^"]*writeTime[^"]*"[^>]*>\s*([\s\S]*?)\s*</);
    // reviewText = <span>preview</span><span class="reviewTextDotDotDot">...</span>
    //              <span class="moreReviewText">remainder</span> — drop the "..."
    // marker so preview + remainder join into the full review.
    const rawText = text
      ? text[1].replace(/<span class="reviewTextDotDotDot">[\s\S]*?<\/span>/g, "")
      : "";
    reviews.push({
      name: name ? decodeEntities(name[1]) : "",
      reviewid: rid[1],
      text: stripTags(rawText),
      date: date ? decodeEntities(date[1]) : "",
    });
  }
  return reviews;
}

// Full, ordered image URL list for one review.
function parseGalleryImages(html) {
  const urls = [];
  const seen = new Set();
  const re =
    /https?:\/\/[^\s"')]+\/reviews\/big\/bizreview\d+_time\d+_rand\d+\.(?:jpe?g|webp)/g;
  let m;
  while ((m = re.exec(html))) {
    const u = m[0];
    // Normalize dupes that differ only by extension (jpg vs webp of same shot).
    const key = u.replace(/\.(?:jpe?g|webp)$/i, "");
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(u);
  }
  return urls;
}

async function lqip(input) {
  const buf = await sharp(input)
    .resize(24, 24, { fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

async function emit(input, id) {
  const meta = await sharp(input).rotate().metadata();
  const intrinsicW = meta.width;
  const intrinsicH = meta.height;
  const outputs = [];
  for (const w of WIDTHS) {
    const width = Math.min(w, intrinsicW); // never upscale
    if (outputs.includes(width)) continue; // small sources collapse to one
    await sharp(input)
      .rotate()
      .resize(width)
      .webp({ quality: 80 })
      .toFile(path.join(OUT_DIR, `${id}-${width}.webp`));
    outputs.push(width);
  }
  outputs.sort((a, b) => a - b);
  return { width: intrinsicW, height: intrinsicH, widths: outputs };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Curated, polished review copy (full text + nice dates) keyed by name.
  const curated = JSON.parse(
    await readFile(path.resolve("./src/data/reviews.json"), "utf8")
  );
  const curatedByName = new Map(
    curated.reviews.map((r) => [r.name.trim(), r])
  );

  console.log(`Fetching ${BIZ_URL} ...`);
  const html = await getText(BIZ_URL);
  const reviews = parseReviews(html);
  console.log(`${reviews.length} reviews with attached photos.`);

  const photos = [];
  const reviewsMap = {};
  for (const r of reviews) {
    let urls = [];
    try {
      const gal = await getText(galleryUrl(r.reviewid));
      urls = parseGalleryImages(gal);
    } catch (e) {
      console.warn(`  gallery fetch failed for ${r.reviewid}: ${e.message}`);
    }
    if (!urls.length) {
      console.warn(`  no images resolved for ${r.name || r.reviewid}`);
      continue;
    }

    // Prefer the polished curated text/date; fall back to what we scraped.
    const c = curatedByName.get(r.name.trim());
    reviewsMap[r.reviewid] = {
      name: r.name,
      text: c?.text || r.text,
      date: c?.date || r.date,
      stars: 5,
    };

    console.log(`  ${r.name || r.reviewid}: ${urls.length} photo(s)${c ? "" : " (scraped text)"}`);
    for (let n = 0; n < urls.length; n++) {
      const id = `${r.reviewid}-${n}`;
      try {
        const buf = await getBuffer(urls[n]);
        const info = await emit(buf, id);
        const cardW = info.widths[0];
        const fullW = info.widths[info.widths.length - 1];
        photos.push({
          id,
          reviewId: r.reviewid,
          name: r.name,
          card: `/reviews/${id}-${cardW}.webp`,
          full: `/reviews/${id}-${fullW}.webp`,
          w: info.width,
          h: info.height,
          lqip: await lqip(buf),
        });
      } catch (e) {
        console.warn(`    skip ${urls[n]}: ${e.message}`);
      }
    }
  }

  await writeFile(DATA_OUT, JSON.stringify({ photos, reviews: reviewsMap }, null, 2));
  console.log(`\nDone. ${photos.length} photos, ${Object.keys(reviewsMap).length} reviews. Manifest -> ${DATA_OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
