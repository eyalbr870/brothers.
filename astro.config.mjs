import { defineConfig } from "astro/config";

// https://astro.build
export default defineConfig({
  site: "https://brothers-photography.example",
  compressHTML: true,
  build: {
    inlineStylesheets: "auto",
  },
  image: {
    // We pre-process photos ourselves (scripts/process-images.mjs) into
    // /public/gallery, so no remote domains are needed here.
  },
});
