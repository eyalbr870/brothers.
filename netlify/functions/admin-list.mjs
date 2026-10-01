// GET (session required) -> the minted links, newest first.
//
// Reads the `contract-links` store for what was minted and the `contracts`
// archive for what was signed. The archive's records are opened only to learn
// whether a signedAt exists; nothing from inside one is returned.
//
// PRIVACY, and it is the whole point of this file: a signed record holds two
// Israeli ID numbers, plus the couple's email and phone. This endpoint returns
// metadata only - id, couple, date, venue, amount, status, timestamps - and the
// shape below is built field by field so a future change to the record cannot
// quietly widen it. Nothing is logged.

import { formatAmount } from "../../src/lib/contractDeal.js";
import { listMinted, getSignedMeta } from "./lib/store.mjs";
import { verify as verifySession } from "./lib/adminSession.mjs";
import { json, linkSecrets, misconfigured } from "./lib/http.mjs";

const MAX_ROWS = 200;

export default async (req) => {
  // guardPost is for the POST endpoints; this one is a read.
  if (req.method !== "GET") return json({ ok: false, reason: "method" }, 405);

  const secrets = linkSecrets();
  if (!secrets.length) return misconfigured("CONTRACT_LINK_SECRET");

  if (!verifySession(req.headers.get("cookie"), secrets).ok) {
    return json({ ok: false, reason: "auth" }, 401);
  }

  let records;
  try {
    records = await listMinted();
  } catch {
    console.error("[contract] minted-link list failed");
    return json({ ok: false, reason: "server" }, 500);
  }

  records.sort((a, b) => String(b?.createdAt ?? "").localeCompare(String(a?.createdAt ?? "")));

  const now = Date.now();
  const contracts = [];
  for (const rec of records.slice(0, MAX_ROWS)) {
    const id = String(rec?.id ?? "");
    if (!id) continue;

    const exp = Number(rec?.exp) || 0;
    const signed = await getSignedMeta(id);
    const signedAt = signed?.meta?.signedAt ? String(signed.meta.signedAt) : null;

    contracts.push({
      id,
      couple: String(rec?.couple ?? ""),
      date: String(rec?.date ?? ""),
      venue: String(rec?.venue ?? ""),
      totalText: formatAmount(rec?.total),
      // Signed beats expired: a signed contract stays signed forever.
      status: signedAt ? "signed" : exp * 1000 <= now ? "expired" : "sent",
      createdAt: String(rec?.createdAt ?? ""),
      signedAt,
      exp,
    });
  }

  return json({ ok: true, contracts });
};
