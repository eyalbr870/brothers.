// Content gate for Hebrew blog posts (seo/METHOD.md §6–§8, brief rules).
// Checks each post for: allowed internal links only, a real coverId, no price
// outside the price guide, Brothers. prices in the guide matching
// src/data/site.js, no competitor names, banned phrases, FAQ count,
// body length. Prints every number in the text so a person can trace it to a
// source. Exit code 1 on any hard failure.
// Usage: node scripts/content-gate.mjs src/content/blog/a.md [b.md ...]
import fs from "node:fs";
import path from "node:path";
import { site } from "../src/data/site.js";

const ALLOWED_LINKS = new Set([
  "/", "/#finder", "/#contact", "/#faq", "/#gallery",
  "/lp/stills/", "/lp/video/", "/lp/video-stills/", "/lp/weddings-small/",
  "/lp/weddings-big-center/", "/lp/weddings-outdoor/", "/lp/weddings-concept/",
  "/lp/wedding-photographer-israel/", "/lp/weddings-ashdod/", "/lp/business-events/",
  "/blog/", "/blog/intimate-wedding-photography/", "/blog/wedding-film-vs-clip/",
  "/blog/wedding-album-guide/", "/blog/how-to-choose-wedding-photographer/",
  "/blog/wedding-day-photography-plan/", "/blog/pre-wedding-couple-shoot/",
]);
// External links allowed as sources.
const ALLOWED_EXTERNAL = [/^https:\/\/www\.mit4mit\.co\.il\/biz\/100325/, /^https:\/\/www\.midrag\.co\.il\/Content\/Price\/10381/];
const PRICE_GUIDE = "wedding-photographer-price.md";
// "שקל" only as a standalone word: JS \b doesn't see Hebrew letters, and the
// letters appear inside ordinary words ("שקליפ", "ושקלו").
const PRICE = /₪|ש"ח|ש״ח|(^|[^֐-׿])(ב|ו)?שקלים?(?![֐-׿])|\bNIS\b|\bILS\b/;
const COMPETITORS = /photoshot|פוטושוט|esposa|אספוסה|bereshit|בראשית\s*[|I]|פרסי|canfi|כנפי|dafna|דפנה טלמון|yaniveitan|יניב איתן|kobi-?art|קובי ארט|luz-?weddings|danielnotcake|דניאל נוט|antonmislawsky|bigpicturestories|yossioz|יוסי עוז|spicy-photo|studioayalon/i;
// Brothers.' own prices (site.finder) — the only ones copy may state for the studio.
const { packages, addons } = site.finder;
const STUDIO_PRICES = new Set([
  ...Object.values(packages).flatMap((p) => [p.priceStills, p.priceStills + p.priceVideoAdd, p.priceVideoAdd]),
  ...Object.values(addons).map((a) => a.price),
]);
// A line about a Brothers. package or add-on; its ₪ amounts must be in STUDIO_PRICES.
const STUDIO_LINE = /Basic|Classic|Premium|ב-Brothers\.|סט (של שלושה )?אלבומים|Save the Date/;
const BANNED = /הכי זול|מובטח|גרנטי|אחריות מלאה|מחקרים מראים|לפי מחקר|\d+%\s*מה?זוגות/;

const manifest = JSON.parse(fs.readFileSync("src/data/gallery.generated.json", "utf8"));
const coverIds = new Set(manifest.items.map((i) => i.id));

let failed = false;
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const errors = [];
  const warnings = [];
  if (!m) { console.log(`\n# ${file}\n  FAIL no frontmatter`); failed = true; continue; }
  const [, fm, body] = m;
  const base = path.basename(file);

  const cover = fm.match(/^coverId:\s*"([^"]+)"/m)?.[1];
  if (!cover || !coverIds.has(cover)) errors.push(`coverId "${cover}" is not in gallery.generated.json`);
  const draft = /^draft:\s*true/m.test(fm);
  if (base === PRICE_GUIDE && !draft) errors.push("price guide must be draft: true until Yariv approves citing market ranges");

  const faqCount = (fm.match(/^\s*-\s*q:/gm) ?? []).length;
  if (faqCount < 5 || faqCount > 7) warnings.push(`faq items: ${faqCount} (brief asks 5–7)`);

  const words = body.replace(/[#*>\-\[\]()`|]/g, " ").split(/\s+/).filter(Boolean).length;
  if (words < 800 || words > 1600) warnings.push(`body words: ${words} (brief asks 900–1,400)`);

  for (const [, href] of src.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (href.startsWith("http")) {
      if (!ALLOWED_EXTERNAL.some((re) => re.test(href))) errors.push(`external link not allowed: ${href}`);
    } else if (!ALLOWED_LINKS.has(href)) errors.push(`internal link not allowed: ${href}`);
    if (href.includes("wedding-photographer-price")) errors.push("links to the draft price guide");
  }

  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (base !== PRICE_GUIDE && PRICE.test(line)) errors.push(`price mention outside price guide (line ${i + 1}): ${line.trim().slice(0, 100)}`);
    if (base === PRICE_GUIDE && STUDIO_LINE.test(line) && !/מידרג/.test(line)) {
      for (const [, n] of line.matchAll(/(\d[\d,]*)\s*₪/g)) {
        const v = Number(n.replace(/,/g, ""));
        if (!STUDIO_PRICES.has(v)) errors.push(`Brothers. price ${n} ₪ is not in site.finder (line ${i + 1}): ${line.trim().slice(0, 100)}`);
      }
    }
    if (COMPETITORS.test(line)) errors.push(`competitor name (line ${i + 1}): ${line.trim().slice(0, 100)}`);
    if (BANNED.test(line)) errors.push(`banned phrase (line ${i + 1}): ${line.trim().slice(0, 100)}`);
  });

  const numbers = [];
  lines.forEach((line, i) => {
    if (/^(publishDate|updatedDate|readingMinutes|coverId):/.test(line)) return;
    const found = line.match(/[\d][\d,.:×x\-–]*\d|\d/g);
    if (found) numbers.push(`L${i + 1}: ${found.join(", ")}  ←  ${line.trim().slice(0, 90)}`);
  });

  console.log(`\n# ${file}  (${words} words, ${faqCount} faq${draft ? ", DRAFT" : ""})`);
  errors.forEach((e) => console.log(`  FAIL ${e}`));
  warnings.forEach((w) => console.log(`  warn ${w}`));
  console.log(`  numbers to trace (${numbers.length}):`);
  numbers.forEach((n) => console.log(`    ${n}`));
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
