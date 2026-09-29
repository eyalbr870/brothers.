// HMAC-signed contract links.
//
// One module, three consumers: scripts/contract-link.mjs mints tokens,
// netlify/functions/contract-verify and contract-sign verify them. Node-only
// (node:crypto) - the browser never touches it and never needs to: the page
// treats the token as an opaque string and asks the server what it means.
//
// Deviation from the plan, on purpose: this lives in src/lib/ rather than
// netlify/functions/_token.mjs. Netlify turns every top-level file in the
// functions directory into a deployed function, "_" prefix included, so a
// helper parked there would have shipped as a public endpoint. Relative
// imports from the functions avoid the "@/*" alias just as well.
//
// SECURITY: signPayload signs the ENCODED STRING, and verifyToken re-derives
// the MAC from that same string rather than from a re-serialised object. That
// removes any dependence on JSON key order matching between mint and verify.

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_TOKEN_BYTES = 4096; // a real payload is ~600; anything larger is junk

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");

/** Mint `payload.signature`. */
export function signPayload(payload, secret) {
  if (!secret || secret.length < 32) {
    throw new Error("CONTRACT_LINK_SECRET is missing or shorter than 32 characters");
  }
  const p = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(createHmac("sha256", secret).update(p).digest());
  return `${p}.${sig}`;
}

/**
 * Verify a token against one or more secrets (current, then previous — so the
 * secret can be rotated without stranding couples mid-signature).
 *
 * @returns {{ok: true, payload: object} | {ok: false, reason: "invalid"|"expired", expiredAt?: number}}
 *
 * Callers must answer "invalid" identically for every failure mode so an
 * attacker cannot tell a bad signature from a malformed payload.
 */
export function verifyToken(token, secrets, now = Date.now()) {
  const invalid = { ok: false, reason: "invalid" };

  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_BYTES) {
    return invalid;
  }

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return invalid;

  const p = token.slice(0, dot);
  const given = token.slice(dot + 1);
  if (!/^[A-Za-z0-9\-_]+$/.test(p) || !/^[A-Za-z0-9\-_]+$/.test(given)) return invalid;

  const givenBuf = fromB64url(given);
  const keys = (Array.isArray(secrets) ? secrets : [secrets]).filter(
    (s) => typeof s === "string" && s.length >= 32,
  );
  if (!keys.length) return invalid;

  const matched = keys.some((key) => {
    const expected = createHmac("sha256", key).update(p).digest();
    // timingSafeEqual throws on a length mismatch, so gate on length first.
    return expected.length === givenBuf.length && timingSafeEqual(expected, givenBuf);
  });
  if (!matched) return invalid;

  let payload;
  try {
    payload = JSON.parse(fromB64url(p).toString("utf8"));
  } catch {
    return invalid;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return invalid;

  // Signature is good; only now does expiry become a distinguishable answer.
  // An expired-but-authentic link gets friendlier copy than a forged one.
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp)) return invalid;
  if (exp * 1000 <= now) return { ok: false, reason: "expired", expiredAt: exp };

  return { ok: true, payload };
}

/** Short HMAC used to authorise downloading an archived PDF by its id. */
export function downloadToken(id, secret) {
  return b64url(createHmac("sha256", secret).update(`dl:${id}`).digest()).slice(0, 32);
}

export function checkDownloadToken(id, token, secrets) {
  const keys = (Array.isArray(secrets) ? secrets : [secrets]).filter(
    (s) => typeof s === "string" && s.length >= 32,
  );
  return keys.some((key) => {
    const expected = Buffer.from(downloadToken(id, key));
    const given = Buffer.from(String(token ?? ""));
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}
