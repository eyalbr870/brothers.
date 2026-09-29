#!/usr/bin/env node
// List the signed contracts in the archive.
//   npm run contract:list
//
// Reads Netlify Blobs directly, so it needs the site to be linked
// (`npx netlify link`) or NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN in the env.

import { getStore } from "@netlify/blobs";

const fmt = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

try {
  const store = getStore("contracts");
  const { blobs } = await store.list();
  const ids = blobs.filter((b) => b.key.endsWith(".json"));

  if (!ids.length) {
    console.log("\nאין עדיין חוזים חתומים בארכיון.\n");
    process.exit(0);
  }

  const rows = [];
  for (const b of ids) {
    const res = await store.getWithMetadata(b.key, { type: "json" });
    const m = res?.metadata ?? {};
    rows.push({
      id: b.key.replace(/\.json$/, ""),
      couple: m.couple ?? "—",
      event: fmt(m.date),
      signed: fmt(m.signedAt),
      mailed: m.emailed ? "✓" : "✗",
    });
  }
  rows.sort((a, b) => (a.signed < b.signed ? 1 : -1));

  console.log(`\n${rows.length} חוזים חתומים:\n`);
  console.log("  מזהה                  זוג                        אירוע        נחתם        מייל");
  console.log("  " + "─".repeat(86));
  for (const r of rows) {
    console.log(
      `  ${r.id.padEnd(22)}${r.couple.padEnd(27)}${r.event.padEnd(13)}${r.signed.padEnd(12)}${r.mailed}`,
    );
  }
  console.log(`\n  להורדה: npm run contract:get -- <מזהה>\n`);
} catch (err) {
  console.error(`\n✗ ${err?.message ?? err}`);
  console.error("  ודאו שהאתר מקושר: npx netlify link\n");
  process.exit(1);
}
