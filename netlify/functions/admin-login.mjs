// POST { password } -> a session cookie, or 401.
//
// One operator, one password, no user table. The password is compared against
// CONTRACT_ADMIN_PASSWORD; the session that follows is a signed cookie (see
// lib/adminSession.mjs), so nothing is stored.
//
// PRIVACY: never log the body. It is a password.

import { createHash, timingSafeEqual } from "node:crypto";

import { allow } from "./lib/store.mjs";
import { issue } from "./lib/adminSession.mjs";
import { json, guardPost, readJson, clientIp, linkSecrets, misconfigured } from "./lib/http.mjs";

/** Minimum for a single shared secret that guards every contract link. */
const MIN_PASSWORD = 12;

export default async (req) => {
  const bad = guardPost(req, { maxBytes: 2000 });
  if (bad) return bad;

  // 10 attempts per IP per hour. The password is the only gate here, so unlike
  // the verify endpoint this limiter is doing real work.
  if (!(await allow(clientIp(req), "admin-login", 10))) {
    return json({ ok: false, reason: "rate" }, 429);
  }

  const expected = process.env.CONTRACT_ADMIN_PASSWORD;
  if (typeof expected !== "string" || expected.length < MIN_PASSWORD) {
    return misconfigured("CONTRACT_ADMIN_PASSWORD");
  }
  const secrets = linkSecrets();
  if (!secrets.length) return misconfigured("CONTRACT_LINK_SECRET");

  const body = await readJson(req, 2000);
  const given = typeof body?.password === "string" ? body.password : "";

  // Hash both sides first: timingSafeEqual throws on a length mismatch, and
  // comparing raw strings would leak the password's length through that throw.
  const a = createHash("sha256").update(given, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  if (!timingSafeEqual(a, b)) return json({ ok: false, reason: "auth" }, 401);

  // Signed with the current link secret; verified against current + previous.
  return json({ ok: true }, 200, { "set-cookie": issue(secrets[0]) });
};
