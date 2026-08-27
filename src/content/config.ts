import { defineCollection, z } from "astro:content";

// ============================================================
// Blog posts (Hebrew). One .md file per post in src/content/blog/.
// Rendered by src/pages/blog/[slug].astro, listed by blog/index.astro.
//
// Photos are referenced by manifest id (see gallery.generated.json) exactly
// like the landing pages do - NEVER invent an id.
// ============================================================
const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    // Shown in the post header + listing card. Keep it under ~160 chars:
    // it doubles as the <meta description> when seoDescription is absent.
    excerpt: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    // Manifest id for the hero / OG image.
    coverId: z.string(),
    publishDate: z.date(),
    updatedDate: z.date().optional(),
    // Primary keyword this post targets - documentation for future edits.
    keyword: z.string().optional(),
    readingMinutes: z.number().default(6),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
