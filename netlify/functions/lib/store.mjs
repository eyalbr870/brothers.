// Netlify Blobs: the signed-contract archive, and the rate-limit counters.
//
// Why storage exists at all: without a durable record there is no way to
// answer "has this contract already been signed?", and a transient Resend 500
// would destroy a couple's signature. Both of those are requirements, so the
// store is not optional - see docs/CONTRACT.md.
//
// PRIVACY: records hold two Israeli ID numbers. Nothing in this module logs a
// record's contents, and callers must not either. Netlify function logs are
// retained and readable from the dashboard.

import { getStore } from "@netlify/blobs";
import { createHash, randomInt } from "node:crypto";

const contracts = () => getStore("contracts");
const limits = () => getStore("contract-limits");
// Minted-but-unsigned links. A SEPARATE store from `contracts` on purpose: the
// archive holds signed records (and two ID numbers each), this holds operator
// metadata. Mixing them would put unsigned rows in front of contract:list and
// the signed-contract archive behind an HTTP endpoint.
const minted = () => getStore("contract-links");
// Short code -> full signed token, so the link a couple gets on WhatsApp is
// /contract/#k3Fp9xQ2aB rather than 900 characters of base64. The code is only
// a lookup key: whatever comes back is still HMAC-verified like any token, so
// this store cannot be used to forge a contract. It does hold the token, and
// the token carries the couple's email and phone - which is why it is its own
// store, read by nothing but resolveToken().
const codes = () => getStore("contract-codes");

/** Metadata only - enough to decide "already signed?" without pulling the record. */
export async function getSignedMeta(id) {
  try {
    const res = await contracts().getWithMetadata(`${id}.json`, { type: "json" });
    if (!res) return null;
    return { meta: res.metadata ?? {}, record: res.data ?? null };
  } catch {
    return null;
  }
}

export async function putRecord(id, record, metadata) {
  await contracts().setJSON(`${id}.json`, record, { metadata });
}

export async function putPdf(id, bytes, metadata) {
  await contracts().set(`${id}.pdf`, bytes, { metadata });
}

export async function getPdf(id) {
  try {
    return await contracts().get(`${id}.pdf`, { type: "arrayBuffer" });
  } catch {
    return null;
  }
}

export async function markEmailed(id, record, metadata) {
  await contracts().setJSON(`${id}.json`, record, {
    metadata: { ...metadata, emailed: true, emailedAt: new Date().toISOString() },
  });
}

export async function listContracts() {
  const { blobs } = await contracts().list();
  return blobs.filter((b) => b.key.endsWith(".json")).map((b) => b.key.replace(/\.json$/, ""));
}

/**
 * Record a link the admin page just minted, so it can be listed later.
 *
 * The field list is not advice, it is enforced here: whatever the caller hands
 * over, only these eight keys are written. The couple's email, phone and the
 * token itself have no business in a store whose only reader is a list screen.
 */
export async function putMinted(id, rec) {
  const r = rec ?? {};
  await minted().setJSON(`${id}.json`, {
    id: String(id),
    couple: String(r.couple ?? ""),
    date: String(r.date ?? ""),
    venue: String(r.venue ?? ""),
    total: Number(r.total) || 0,
    deposit: Number(r.deposit) || 0,
    exp: Number(r.exp) || 0,
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  });
}

/** Every minted record, unsorted. The caller sorts and caps. */
export async function listMinted() {
  const store = minted();
  const { blobs } = await store.list();
  const keys = blobs.filter((b) => b.key.endsWith(".json")).map((b) => b.key);
  const out = [];
  for (const key of keys) {
    try {
      const rec = await store.get(key, { type: "json" });
      if (rec && typeof rec === "object") out.push(rec);
    } catch {
      // One unreadable row must not blank the whole list.
    }
  }
  return out;
}

// 62^10 ≈ 8e17 codes against a verify budget of 30 guesses per IP per hour.
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LEN = 10;
const CODE_RE = new RegExp(`^[A-Za-z0-9]{${CODE_LEN}}$`);

/** Store `token` under a fresh short code and return the code. */
export async function putShortCode(token) {
  let code = "";
  for (let i = 0; i < CODE_LEN; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  await codes().set(code, String(token));
  return code;
}

/**
 * What the couple's page sent -> the token to verify. A full token (it always
 * contains a ".") passes through untouched, so every link minted before short
 * codes existed keeps working. An unknown code resolves to "", which
 * verifyToken rejects exactly like a forgery.
 */
export async function resolveToken(raw) {
  const s = typeof raw === "string" ? raw : "";
  if (!CODE_RE.test(s)) return s;
  try {
    return (await codes().get(s)) ?? "";
  } catch {
    return "";
  }
}

/**
 * Fixed-window counter keyed by hashed IP. The HMAC on the link is the real
 * gate - nobody reaches PDF assembly or Resend without a valid token - so this
 * only has to stop someone hammering the verify endpoint with garbage.
 *
 * Fails OPEN: if Blobs is unavailable, a couple must still be able to sign.
 * A false lockout here costs more than a missed limit.
 *
 * @returns {Promise<boolean>} true when the caller is within budget.
 */
export async function allow(ip, bucket, max) {
  const hour = Math.floor(Date.now() / 3600000);
  const hashed = createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
  const key = `rl/${bucket}/${hashed}/${hour}`;
  try {
    const store = limits();
    const current = Number((await store.get(key)) ?? 0);
    if (current >= max) return false;
    await store.set(key, String(current + 1));
    return true;
  } catch {
    return true;
  }
}
