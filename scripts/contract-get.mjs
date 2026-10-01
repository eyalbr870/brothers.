#!/usr/bin/env node
// Download one archived contract PDF.
//   npm run contract:get -- c_20270618_a7f3c1

import { getStore } from "@netlify/blobs";
import { writeFileSync } from "node:fs";

const id = process.argv[2];
if (!id) {
  console.error("\n✗ שימוש: npm run contract:get -- <מזהה>\n");
  process.exit(1);
}

try {
  const store = getStore("contracts");
  const pdf = await store.get(`${id}.pdf`, { type: "arrayBuffer" });
  if (!pdf) {
    console.error(`\n✗ לא נמצא חוזה עם המזהה ${id}\n  לרשימה: npm run contract:list\n`);
    process.exit(1);
  }
  const out = `contract-${id}.pdf`;
  writeFileSync(out, Buffer.from(pdf));
  console.log(`\n✓ נשמר: ${out} (${Math.round(pdf.byteLength / 1024)}KB)\n`);
} catch (err) {
  console.error(`\n✗ ${err?.message ?? err}\n`);
  process.exit(1);
}
