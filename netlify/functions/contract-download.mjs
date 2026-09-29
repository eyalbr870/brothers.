// GET ?id=...&t=<hmac> -> the archived signed PDF.
//
// Powers the success-screen download and the "send it to me again" button.
// The id alone is not authorisation: `t` is an HMAC over the id with the same
// secret that signs the links, so a guessed id gets nothing.

import { checkDownloadToken } from "../../src/lib/contractToken.js";
import { getPdf, allow } from "./lib/store.mjs";
import { json, clientIp, linkSecrets, misconfigured } from "./lib/http.mjs";

export default async (req) => {
  if (req.method !== "GET") return json({ ok: false, reason: "method" }, 405);

  const secrets = linkSecrets();
  if (!secrets.length) return misconfigured("CONTRACT_LINK_SECRET");

  if (!(await allow(clientIp(req), "download", 30))) {
    return json({ ok: false, reason: "rate" }, 429);
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const t = url.searchParams.get("t") ?? "";

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || !checkDownloadToken(id, t, secrets)) {
    return json({ ok: false, reason: "invalid" }, 403);
  }

  const pdf = await getPdf(id);
  if (!pdf) return json({ ok: false, reason: "not-found" }, 404);

  return new Response(pdf, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="contract-${id}.pdf"`,
      "cache-control": "no-store",
    },
  });
};
