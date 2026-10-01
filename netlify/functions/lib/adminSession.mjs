// The /admin session cookie: `<exp>.<HMAC-SHA256(secret, "admin:" + exp)>`.
//
// Stateless on purpose. The alternative - a session row in Blobs - would mean a
// write on every login and a read on every request, to protect exactly one
// operator. The MAC already proves the cookie came from this site, and the exp
// baked into the signed string means it cannot be extended by editing it.
//
// Same secret as the links (`linkSecrets()` from http.mjs), and the same
// rotation story: verify against current-then-previous so rotating the secret
// does not kick Yariv out mid-session.
//
// Lives in lib/ because Netlify deploys every file at the ROOT of the functions
// directory as a public endpoint - "_"-prefixed ones included. A session helper
// reachable over HTTP is the one thing this must never be.
//
// NOTE: nothing here logs. A cookie value is a bearer credential.

import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "brothers_admin";

/** 8 hours: long enough for an evening of minting links, short enough to expire. */
export const TTL_SECONDS = 28800;

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const mac = (exp, secret) => b64url(createHmac("sha256", secret).update(`admin:${exp}`).digest());

const FLAGS = `HttpOnly; Secure; SameSite=Strict; Path=/`;

/**
 * A fresh Set-Cookie value. SameSite=Strict because /admin is only ever reached
 * by typing the URL - no cross-site navigation needs to carry this cookie, so
 * CSRF has nothing to ride on.
 *
 * @returns {string} the Set-Cookie header value.
 */
export function issue(secret, now = Date.now()) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("admin session secret is missing or shorter than 32 characters");
  }
  const exp = Math.floor(now / 1000) + TTL_SECONDS;
  return `${COOKIE_NAME}=${exp}.${mac(exp, secret)}; ${FLAGS}; Max-Age=${TTL_SECONDS}`;
}

/** Erase it. Max-Age=0 with the same flags, or the browser keeps the old one. */
export function clearCookie() {
  return `${COOKIE_NAME}=; ${FLAGS}; Max-Age=0`;
}

function readCookie(header, name) {
  if (typeof header !== "string" || !header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    return part.slice(eq + 1).trim();
  }
  return null;
}

/**
 * Verify a Cookie header. Every failure mode returns the same shape, so a
 * caller cannot accidentally tell a forged cookie from an expired one - the
 * endpoints answer `{ok:false,reason:"auth"}` either way.
 *
 * @param {string|null} cookieHeader  the raw `cookie` request header
 * @param {string[]} secrets          current first, then previous
 * @returns {{ok: true, exp: number} | {ok: false}}
 */
export function verify(cookieHeader, secrets, now = Date.now()) {
  const fail = { ok: false };

  const value = readCookie(cookieHeader, COOKIE_NAME);
  if (!value || value.length > 256) return fail;

  const dot = value.indexOf(".");
  if (dot <= 0 || dot === value.length - 1) return fail;

  const expRaw = value.slice(0, dot);
  const given = value.slice(dot + 1);
  if (!/^\d{1,12}$/.test(expRaw) || !/^[A-Za-z0-9\-_]+$/.test(given)) return fail;

  const keys = (Array.isArray(secrets) ? secrets : [secrets]).filter(
    (s) => typeof s === "string" && s.length >= 32,
  );
  if (!keys.length) return fail;

  const givenBuf = Buffer.from(given, "utf8");
  // timingSafeEqual throws on a length mismatch, so gate on length first.
  const matched = keys.some((key) => {
    const expected = Buffer.from(mac(expRaw, key), "utf8");
    return expected.length === givenBuf.length && timingSafeEqual(expected, givenBuf);
  });
  if (!matched) return fail;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 <= now) return fail;

  return { ok: true, exp };
}
