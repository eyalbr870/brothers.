// POST (session required) -> a freshly minted, HMAC-signed contract link.
//
// The browser equivalent of `npm run contract:link`, and deliberately not a
// second implementation of it: both call buildPayload() from
// src/lib/contractPayload.js, so the rules that make a link honest cannot drift
// between the terminal and the phone.
//
// PRIVACY: the request body carries the couple's email and phone, and the reply
// deliberately does NOT echo them back - only the terms the couple will see.
// Nothing here is logged.

import { signPayload } from "../../src/lib/contractToken.js";
import { buildDeal } from "../../src/lib/contractDeal.js";
import { buildPayload, formatExpDate } from "../../src/lib/contractPayload.js";
import { putMinted } from "./lib/store.mjs";
import { verify as verifySession } from "./lib/adminSession.mjs";
import { json, guardPost, readJson, linkSecrets, misconfigured } from "./lib/http.mjs";

/** The same message the CLI prints for pasting into WhatsApp. */
function waMessage(deal, url, expText) {
  return (
    `היי ${deal.couple.split(" ")[0]}, מצרף את ההסכם לחתימה דיגיטלית לתאריך ${deal.dateHe}.\n` +
    `אפשר לקרוא, למלא ולחתום ישירות מהטלפון:\n${url}\n` +
    `הקישור בתוקף עד ${expText}. כל שאלה — אני כאן.`
  );
}

export default async (req) => {
  const bad = guardPost(req, { maxBytes: 16000 });
  if (bad) return bad;

  const secrets = linkSecrets();
  if (!secrets.length) return misconfigured("CONTRACT_LINK_SECRET");

  // Identical answer for a missing, forged and expired cookie alike.
  if (!verifySession(req.headers.get("cookie"), secrets).ok) {
    return json({ ok: false, reason: "auth" }, 401);
  }

  // Unparseable or non-object bodies need no special case: buildPayload reports
  // the missing fields, which is the honest answer and the same shape.
  const body = await readJson(req, 16000);
  const input = body && typeof body === "object" ? { ...body } : {};

  // An empty form field means "not given", which for guests is null, not 0.
  // Transport-level coercion, kept out of the shared rules so the CLI's own
  // handling of `--guests ""` stays exactly as it was.
  if (input.guests === "") input.guests = null;

  const built = buildPayload(input);
  if (!built.ok) return json({ ok: false, reason: "validation", errors: built.errors }, 422);

  const payload = built.payload;
  const token = signPayload(payload, secrets[0]);

  // The request's own origin, so a deploy preview mints preview links and a
  // production deploy mints production ones - with no host hardcoded here.
  // Fragment, not query: the token never reaches a server log, an analytics
  // page_location, or a Referer header.
  const url = `${new URL(req.url).origin}/contract/#${token}`;

  const full = buildDeal(payload);
  const expText = formatExpDate(payload.exp);

  // Hand-picked, not `full`: buildDeal also carries the couple's email and
  // phone, and the admin screen has no use for them.
  const deal = {
    couple: full.couple,
    dateHe: full.dateHe,
    venue: full.venue,
    guests: full.guests,
    totalText: full.totalText,
    depositText: full.depositText,
    balanceText: full.balanceText,
    payMethod: full.payMethod,
    balanceDue: full.balanceDue,
    signers: full.signers,
    albumsIncluded: full.albumsIncluded,
    services: full.services.map((s) => ({ id: s.id, label: s.label })),
    notes: full.notes,
  };

  // Best effort: the link is already signed and valid. Losing its row in the
  // list is a cosmetic failure; refusing to hand over a working link because
  // Blobs blinked would be a real one.
  try {
    await putMinted(payload.id, {
      id: payload.id,
      couple: payload.couple,
      date: payload.date,
      venue: payload.venue,
      total: payload.total,
      deposit: payload.deposit,
      exp: payload.exp,
      createdAt: new Date(payload.iat * 1000).toISOString(),
    });
  } catch {
    // Terse and record-free on purpose - Netlify logs are retained.
    console.error("[contract] minted-link record failed");
  }

  return json({
    ok: true,
    url,
    id: payload.id,
    exp: payload.exp,
    expText,
    waMessage: waMessage(deal, url, expText),
    deal,
  });
};
