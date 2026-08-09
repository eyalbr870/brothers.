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
  integrations: [sitemap()],
  build: {
    inlineStylesheets: "auto",
  },
  image: {
    // We pre-process photos ourselves (scripts/process-images.mjs) into
    // /public/gallery, so no remote domains are needed here.
  },
});
