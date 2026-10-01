// POST { token } -> the canonical deal terms, or a reason the link is no good.
//
// This is the ONLY way the page learns what the contract says. The token is
// base64, not encryption: anyone can decode it, and more to the point anyone
// can edit it and re-encode. So the page never reads it - it hands it here and
// renders whatever comes back. A forged token renders nothing at all.
//
// Idempotent and side-effect free apart from the rate-limit counter.

import { verifyToken } from "../../src/lib/contractToken.js";
import { buildDeal, renderClauses } from "../../src/lib/contractDeal.js";
import { contractVersion } from "../../src/data/contract.js";
import { getSignedMeta, allow } from "./lib/store.mjs";
import { json, guardPost, readJson, clientIp, linkSecrets, misconfigured } from "./lib/http.mjs";

export default async (req) => {
  const bad = guardPost(req, { maxBytes: 8000 });
  if (bad) return bad;

  const secrets = linkSecrets();
  if (!secrets.length) return misconfigured("CONTRACT_LINK_SECRET");

  if (!(await allow(clientIp(req), "verify", 30))) {
    return json({ ok: false, reason: "rate" }, 429);
  }

  const body = await readJson(req, 8000);
  const result = verifyToken(body?.token, secrets);

  // One indistinguishable answer for every forgery mode, so an attacker cannot
  // learn whether it was the signature, the encoding or the JSON that failed.
  if (!result.ok && result.reason === "invalid") {
    return json({ ok: false, reason: "invalid" }, 401);
  }
  // Expired-but-authentic is the common, innocent case and earns kinder copy.
  if (!result.ok) {
    return json({ ok: false, reason: "expired", expiredAt: result.expiredAt }, 410);
  }

  const deal = buildDeal(result.payload);

  const existing = await getSignedMeta(deal.id);
  if (existing?.meta?.signedAt) {
    return json({ ok: false, reason: "signed", signedAt: existing.meta.signedAt }, 409);
  }

  return json({
    ok: true,
    contractVersion,
    deal,
    clauses: renderClauses(deal),
  });
};
