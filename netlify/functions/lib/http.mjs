// Shared plumbing for the contract functions: env access, JSON responses,
// client IP, and the request guards every endpoint repeats.
//
// Lives in a subdirectory on purpose. Netlify turns every file at the ROOT of
// the functions directory into a deployed endpoint - "_"-prefixed ones too -
// so helpers must sit one level down, where the bundler follows the import
// but the deployer ignores the file.

/** Secrets, current first, so a rotated link still verifies against the old key. */
export function linkSecrets() {
  return [process.env.CONTRACT_LINK_SECRET, process.env.CONTRACT_LINK_SECRET_PREV].filter(
    (s) => typeof s === "string" && s.length >= 32,
  );
}

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // A signed contract is never cacheable, by anyone, anywhere.
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

/**
 * On Netlify the trustworthy client IP is the platform header, not anything
 * the caller can set. x-forwarded-for is the fallback and its first entry is
 * the original client.
 */
export function clientIp(req) {
  return (
    req.headers.get("x-nf-client-connection-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function userAgent(req) {
  return (req.headers.get("user-agent") ?? "unknown").slice(0, 400);
}

/**
 * Method + content-type + size guards, run before the body is parsed so a
 * huge or malformed request is rejected without being read into memory.
 * @returns {Response|null} a rejection, or null to proceed.
 */
export function guardPost(req, { maxBytes = 5_500_000 } = {}) {
  if (req.method !== "POST") return json({ ok: false, reason: "method" }, 405);

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return json({ ok: false, reason: "type" }, 415);

  const len = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(len) && len > maxBytes) {
    return json({ ok: false, reason: "too-large" }, 413);
  }
  return null;
}

export async function readJson(req, maxBytes = 5_500_000) {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Configured secrets missing => the endpoint is not deployable; say so once. */
export function misconfigured(what) {
  // Deliberately terse: never echo a secret name's value, and never log bodies.
  console.error(`[contract] misconfigured: ${what}`);
  return json({ ok: false, reason: "server" }, 500);
}
