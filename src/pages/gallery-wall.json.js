// Full photo payload for the drift wall + lightbox, served as a static file
// instead of an inline <script type="application/json"> in the homepage.
//
// It used to ship inline: ~15KB of srcset strings in every homepage response,
// needed only once a visitor taps a tile (lightbox) or asks for more photos.
// As a separate file it is fetched lazily and cached by the browser/CDN.
import manifest from "@/data/gallery.generated.json";
import { srcset, fallbackSrc, largestSrc } from "@/lib/images.js";

export function GET() {
  const items = manifest.items.map((it, i) => ({
    i,
    // Tile + lightbox share one srcset; `sizes` differs per use site.
    webp: srcset(it, "webp"),
    jpg: srcset(it, "jpg"),
    tile: fallbackSrc(it, "jpg"),
    src: largestSrc(it, "jpg"),
    w: it.width,
    h: it.height,
    lqip: it.lqip,
  }));
  return new Response(JSON.stringify({ items }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
