import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build
export default defineConfig({
  // Honor a PORT assigned by the environment (e.g. the preview harness);
  // fall back to Astro's default 4321 for normal local dev.
  server: { port: process.env.PORT ? Number(process.env.PORT) : 4321 },
  // Production domain - drives canonical URLs on the landing pages and the
  // generated sitemap so Google indexes /lp/* correctly.
  site: "https://brothers-photography.com",
  compressHTML: true,
  // Without <lastmod> every sitemap entry looks equally stale to a crawler.
  // Stamped at build time, so each deploy refreshes the recrawl signal.
  // /contract/ is a per-couple signing page reached only by a signed link.
  // It must never appear in the sitemap - filter it out at the source rather
  // than relying on the noindex alone.
  integrations: [
    sitemap({
      lastmod: new Date(),
      filter: (page) => !page.includes("/contract"),
    }),
  ],
  build: {
    inlineStylesheets: "auto",
  },
  image: {
    // We pre-process photos ourselves (scripts/process-images.mjs) into
    // /public/gallery, so no remote domains are needed here.
  },
});
