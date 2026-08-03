// Converts the brand-kit TTF weights we actually use into WOFF2 for the web.
import ttf2woff2 from "ttf2woff2";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const FONTS = path.resolve("../Assistant,Frank_Ruhl_Libre,Montserrat,Playfair_Display");
const OUT = path.resolve("./public/fonts");

const jobs = [
  // Frank Ruhl Libre — Hebrew headings
  ["Frank_Ruhl_Libre/static/FrankRuhlLibre-Medium.ttf", "FrankRuhlLibre-Medium.woff2"],
  ["Frank_Ruhl_Libre/static/FrankRuhlLibre-SemiBold.ttf", "FrankRuhlLibre-SemiBold.woff2"],
  ["Frank_Ruhl_Libre/static/FrankRuhlLibre-Bold.ttf", "FrankRuhlLibre-Bold.woff2"],
  ["Frank_Ruhl_Libre/static/FrankRuhlLibre-Black.ttf", "FrankRuhlLibre-Black.woff2"],
  // Assistant — Hebrew body
  ["Assistant/static/Assistant-Light.ttf", "Assistant-Light.woff2"],
  ["Assistant/static/Assistant-Regular.ttf", "Assistant-Regular.woff2"],
  ["Assistant/static/Assistant-Medium.ttf", "Assistant-Medium.woff2"],
  ["Assistant/static/Assistant-SemiBold.ttf", "Assistant-SemiBold.woff2"],
  ["Assistant/static/Assistant-Bold.ttf", "Assistant-Bold.woff2"],
  // Montserrat — Latin labels / CTA
  ["Montserrat/static/Montserrat-Regular.ttf", "Montserrat-Regular.woff2"],
  ["Montserrat/static/Montserrat-Medium.ttf", "Montserrat-Medium.woff2"],
  ["Montserrat/static/Montserrat-SemiBold.ttf", "Montserrat-SemiBold.woff2"],
  // Playfair Display — Latin display (brand wordmark feel)
  ["Playfair_Display/static/PlayfairDisplay-Regular.ttf", "PlayfairDisplay-Regular.woff2"],
  ["Playfair_Display/static/PlayfairDisplay-Medium.ttf", "PlayfairDisplay-Medium.woff2"],
  ["Playfair_Display/static/PlayfairDisplay-SemiBold.ttf", "PlayfairDisplay-SemiBold.woff2"],
];

await mkdir(OUT, { recursive: true });
for (const [src, dst] of jobs) {
  try {
    const ttf = await readFile(path.join(FONTS, src));
    const woff2 = ttf2woff2(ttf);
    await writeFile(path.join(OUT, dst), woff2);
    console.log(`  ${dst}  (${(woff2.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.warn(`  SKIP ${dst}: ${e.message}`);
  }
}
console.log("Fonts converted.");
