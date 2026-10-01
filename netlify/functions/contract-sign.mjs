// POST -> validate, assemble the PDF, archive it, email both parties.
//
// Order matters and is deliberate: the record is written BEFORE the mail is
// sent. If Resend fails afterwards, the signature still exists and a retry
// re-sends from the archive instead of re-signing. A transient 500 must never
// destroy a couple's signature.
//
// PRIVACY: this body carries two Israeli ID numbers. Nothing here logs the
// request, the record or a rendered email. Netlify function logs are retained
// and readable from the dashboard - keep it that way.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHash } from "node:crypto";

import { verifyToken, downloadToken } from "../../src/lib/contractToken.js";
import { buildDeal } from "../../src/lib/contractDeal.js";
import { isValidIsraeliId, normalizeIsraeliId } from "../../src/lib/idnumber.js";
import { contractVersion, ui } from "../../src/data/contract.js";
import { YARIV_SIGNATURE_PNG } from "./lib/signature-yariv.mjs";
import { yarivEmail, coupleEmail, sendMail } from "./lib/email.mjs";
import { getSignedMeta, putRecord, putPdf, getPdf, markEmailed, allow, resolveToken } from "./lib/store.mjs";
import {
  json, guardPost, readJson, clientIp, userAgent, linkSecrets, misconfigured,
} from "./lib/http.mjs";

const A4 = [595.28, 841.89]; // points
const MAX_PAGES = 15;

// ---------------------------------------------------------------- validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const JPEG_MAGIC = "/9j/"; // base64 of FF D8 FF

function validateForm(form, deal) {
  const errs = [];
  const need = deal.signers === 2 ? ["A", "B"] : ["A"];

  for (const w of need) {
    const name = String(form[`name${w}`] ?? "").trim();
    if (!name || name.split(/\s+/).filter(Boolean).length < 2 || name.length > 80) {
      errs.push(`name${w}`);
    }
    if (!isValidIsraeliId(form[`id${w}`])) errs.push(`id${w}`);
  }

  if (!/^[0-9+\-\s()]{9,}$/.test(String(form.phone ?? ""))) errs.push("phone");
  if (!EMAIL_RE.test(String(form.email ?? ""))) errs.push("email");
  if (form.guests !== "" && form.guests != null) {
    const g = Number(form.guests);
    if (!Number.isInteger(g) || g < 0 || g > 2000) errs.push("guests");
  }
  // The read confirmation is the couple's affirmative act. No default.
  if (form.agreedRead !== true) errs.push("agreedRead");

  return errs;
}

function validatePages(pages) {
  if (!Array.isArray(pages) || pages.length < 1 || pages.length > MAX_PAGES) return false;
  return pages.every(
    (p) => typeof p === "string" && p.length > 500 && p.startsWith(JPEG_MAGIC),
  );
}

const isPngDataUrl = (s) => typeof s === "string" && s.startsWith("data:image/png;base64,");

// ---------------------------------------------------------------- pdf
async function assemblePdf({ pages, counterSignBox, deal, meta }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Brothers Photography - ${deal.id}`);
  pdf.setProducer("brothers-photography.com");
  pdf.setCreationDate(new Date());

  const placed = [];
  for (const b64 of pages) {
    const img = await pdf.embedJpg(Buffer.from(b64, "base64"));
    const page = pdf.addPage(A4);
    page.drawImage(img, { x: 0, y: 0, width: A4[0], height: A4[1] });
    placed.push(page);
  }

  // Stamp Yariv's signature into the box the client reserved. The client never
  // holds this image, so it cannot be lifted off the signing page.
  if (YARIV_SIGNATURE_PNG && counterSignBox && placed[counterSignBox.page]) {
    try {
      const sig = await pdf.embedPng(Buffer.from(YARIV_SIGNATURE_PNG, "base64"));
      const page = placed[counterSignBox.page];
      const boxW = counterSignBox.w * A4[0];
      const boxH = counterSignBox.h * A4[1];
      // Contain, so an oddly-proportioned scan is never stretched.
      const scale = Math.min(boxW / sig.width, boxH / sig.height);
      const w = sig.width * scale;
      const h = sig.height * scale;
      page.drawImage(sig, {
        x: counterSignBox.x * A4[0] + (boxW - w) / 2,
        // PDF origin is bottom-left; the box rect is top-left based.
        y: A4[1] - counterSignBox.y * A4[1] - boxH + (boxH - h) / 2,
        width: w,
        height: h,
      });
    } catch {
      // A bad signature asset must not block a signed contract.
    }
  }

  // ---- evidence page ----
  // Helvetica + ASCII only. pdf-lib cannot lay out Hebrew, so nothing Hebrew
  // is ever drawn here; the Hebrew evidence rides on the rasterised pages
  // where the browser already rendered it correctly.
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage(A4);
  const ink = rgb(0.27, 0.2, 0.15);
  const muted = rgb(0.42, 0.33, 0.27);

  let y = A4[1] - 64;
  page.drawText("SIGNATURE EVIDENCE", { x: 54, y, size: 13, font: bold, color: ink });
  y -= 10;
  page.drawLine({
    start: { x: 54, y },
    end: { x: A4[0] - 54, y },
    thickness: 0.7,
    color: rgb(0.85, 0.81, 0.75),
  });
  y -= 24;

  const rows = [
    ["Document ID", deal.id],
    ["Contract version", contractVersion],
    ["Signed at (UTC)", meta.signedAt],
    ["Signed at (Asia/Jerusalem)", meta.signedAtLocal],
    ["Client IP", meta.ip],
    ["Country", meta.country || "-"],
    ["User agent", meta.ua],
    ["Time on page (s)", String(Math.round((meta.dwellMs ?? 0) / 1000))],
    ["Reached end of contract (s)", meta.readEndMs != null ? String(Math.round(meta.readEndMs / 1000)) : "-"],
    ["Signature strokes", meta.strokeSummary],
    ["Event date", deal.date],
    ["Total / Deposit / Balance", `${deal.total} / ${deal.deposit} / ${deal.balance} ILS`],
    ["Signer A ID", meta.idA],
    ...(deal.signers === 2 ? [["Signer B ID", meta.idB]] : []),
    ["Email", meta.email],
    ["Phone", meta.phone],
    ["Marketing publication", meta.marketingAscii],
    ["Document SHA-256", meta.sha256],
  ];

  for (const [k, v] of rows) {
    page.drawText(`${k}:`, { x: 54, y, size: 9, font: bold, color: muted });
    // Wrap long values (user agent, hash) rather than running off the page.
    const text = String(v);
    const maxChars = 58;
    const lines = text.match(new RegExp(`.{1,${maxChars}}`, "g")) ?? [text];
    lines.forEach((line, i) => {
      page.drawText(line, { x: 230, y: y - i * 11, size: 9, font, color: ink });
    });
    y -= Math.max(16, lines.length * 11 + 5);
  }

  page.drawText(
    "This page is generated server-side. Hebrew evidence appears on the contract pages above.",
    { x: 54, y: 52, size: 7.5, font, color: muted },
  );

  return Buffer.from(await pdf.save());
}

// ---------------------------------------------------------------- mail
/**
 * Kept as its own exported step so that if the 10s sync timeout ever becomes
 * tight, moving it to a background function is a small refactor rather than a
 * rewrite.
 */
export async function deliver({ deal, form, meta, pdfBase64 }) {
  const mode = process.env.CONTRACT_MAIL_MODE === "live" ? "live" : "test";
  const yarivTo = process.env.CONTRACT_NOTIFY_EMAIL || "yariv70@gmail.com";
  const marketingLine = form.marketingOptOut ? ui.consent.marketingNo : ui.consent.marketingYes;

  const attachment = {
    filename: `contract-${deal.id}.pdf`,
    content: pdfBase64,
  };

  const results = { yariv: false, couple: false, mode };

  const y = yarivEmail({ deal, form, meta, marketingLine });
  await sendMail({ to: yarivTo, ...y, attachment });
  results.yariv = true;

  // Before the domain is verified Resend will only deliver to the account
  // owner, so the couple's copy would fail silently. Send it to Yariv with an
  // explicit banner instead of pretending it went out.
  const banner =
    mode === "test"
      ? `⚠️ מצב בדיקה — עותק זה היה אמור להישלח אל ${form.email}`
      : null;
  const c = coupleEmail({ deal, form, testBanner: banner });
  await sendMail({ to: mode === "live" ? form.email : yarivTo, ...c, attachment });
  results.couple = true;

  return results;
}

// ---------------------------------------------------------------- handler
export default async (req, context) => {
  const bad = guardPost(req);
  if (bad) return bad;

  const secrets = linkSecrets();
  if (!secrets.length) return misconfigured("CONTRACT_LINK_SECRET");

  const ip = clientIp(req);
  // Two buckets on purpose. A wide one here stops someone hammering the
  // endpoint, but must NOT punish a couple who mistypes an ID a few times -
  // rejected requests are cheap. The tight budget is charged further down,
  // only once a submission is about to do the expensive work.
  if (!(await allow(ip, "sign-attempt", 40))) return json({ ok: false, reason: "rate" }, 429);

  const body = await readJson(req);
  if (!body) return json({ ok: false, reason: "body" }, 400);

  // Step 2 of the page granted nothing. Verify from scratch.
  const v = verifyToken(await resolveToken(body.token), secrets);
  if (!v.ok) {
    return json(
      { ok: false, reason: v.reason, expiredAt: v.expiredAt },
      v.reason === "expired" ? 410 : 401,
    );
  }

  const deal = buildDeal(v.payload);
  const existing = await getSignedMeta(deal.id);

  // ---- resend path: no re-signing, just re-deliver from the archive ----
  if (body.resend === true) {
    if (!existing?.record) return json({ ok: false, reason: "not-signed" }, 404);
    const pdf = await getPdf(deal.id);
    if (!pdf) return json({ ok: false, reason: "not-signed" }, 404);
    try {
      await deliver({
        deal,
        form: existing.record.form,
        meta: existing.record.meta,
        pdfBase64: Buffer.from(pdf).toString("base64"),
      });
      return json({ ok: true, resent: true });
    } catch {
      return json({ ok: false, reason: "mail" }, 502);
    }
  }

  // ---- already signed ----
  if (existing?.meta?.signedAt && existing?.meta?.emailed) {
    return json({ ok: false, reason: "signed", signedAt: existing.meta.signedAt }, 409);
  }

  // ---- signed, archived, but the mail failed last time ----
  // Retry delivery from the archive. Do NOT re-assemble and do NOT re-stamp:
  // the moment of signature is evidence, and re-signing would quietly move it.
  if (existing?.meta?.signedAt && existing?.record) {
    const stored = await getPdf(deal.id);
    if (stored) {
      try {
        await deliver({
          deal,
          form: existing.record.form,
          meta: existing.record.meta,
          pdfBase64: Buffer.from(stored).toString("base64"),
        });
        await markEmailed(deal.id, existing.record, existing.meta);
        return json({
          ok: true,
          id: deal.id,
          signedAt: existing.meta.signedAt,
          downloadUrl: `/.netlify/functions/contract-download?id=${encodeURIComponent(
            deal.id,
          )}&t=${downloadToken(deal.id, secrets[0])}`,
        });
      } catch (err) {
        console.error(`[contract] mail retry failed for ${deal.id}: ${err?.message ?? "unknown"}`);
        return json({ ok: false, reason: "mail", signedAt: existing.meta.signedAt }, 502);
      }
    }
  }

  const form = body.form ?? {};
  const errs = validateForm(form, deal);
  if (errs.length) return json({ ok: false, reason: "invalid-form", fields: errs }, 422);

  if (!validatePages(body.pages)) return json({ ok: false, reason: "pages" }, 422);

  const sigs = body.signatures ?? {};
  const needSigs = deal.signers === 2 ? ["a", "b"] : ["a"];
  if (!needSigs.every((w) => isPngDataUrl(sigs[w]))) {
    return json({ ok: false, reason: "signature" }, 422);
  }

  // Validation passed: this request will assemble a PDF and send mail. That is
  // the expensive path, and the one worth rationing.
  if (!(await allow(ip, "sign-commit", 8))) return json({ ok: false, reason: "rate" }, 429);

  const now = new Date();
  const cm = body.clientMeta ?? {};
  const strokeSummary = Object.entries(cm.strokes ?? {})
    .map(([k, s]) => `${k}:${s?.strokes ?? 0} strokes/${s?.points ?? 0} pts/${s?.ms ?? 0}ms`)
    .join("  ");

  const meta = {
    signedAt: now.toISOString(),
    signedAtLocal: now.toLocaleString("en-GB", { timeZone: "Asia/Jerusalem" }),
    contractVersion,
    ip,
    country: context?.geo?.country?.code ?? "",
    ua: userAgent(req),
    dwellMs: Number(cm.dwellMs) || 0,
    readEndMs: cm.readEndMs == null ? null : Number(cm.readEndMs),
    strokeSummary: strokeSummary || "-",
    idA: normalizeIsraeliId(form.idA),
    idB: deal.signers === 2 ? normalizeIsraeliId(form.idB) : "",
    email: String(form.email),
    phone: String(form.phone),
    marketingAscii: form.marketingOptOut ? "OPTED OUT" : "permitted",
    sha256: "",
  };

  // Binds the wording, the terms, what the couple typed and what they drew.
  meta.sha256 = createHash("sha256")
    .update(
      JSON.stringify({
        contractVersion,
        deal,
        form,
        signatures: needSigs.map((w) => sigs[w]),
      }),
    )
    .digest("hex");

  let pdfBuf;
  try {
    pdfBuf = await assemblePdf({
      pages: body.pages,
      counterSignBox: body.counterSignBox,
      deal,
      meta,
    });
  } catch {
    return json({ ok: false, reason: "pdf" }, 500);
  }

  const record = { deal, form, meta, signatures: sigs };
  const blobMeta = {
    signedAt: meta.signedAt,
    couple: deal.couple,
    date: deal.date,
    emailed: false,
  };

  // Archive FIRST. Everything after this point is recoverable.
  try {
    await putPdf(deal.id, pdfBuf, { signedAt: meta.signedAt, couple: deal.couple });
    await putRecord(deal.id, record, blobMeta);
  } catch {
    return json({ ok: false, reason: "store" }, 500);
  }

  try {
    await deliver({ deal, form, meta, pdfBase64: pdfBuf.toString("base64") });
    await markEmailed(deal.id, record, blobMeta);
  } catch (err) {
    // Signed and stored, but not delivered. A retry lands here again and
    // re-sends - it never re-signs and never duplicates the record.
    console.error(`[contract] mail failed for ${deal.id}: ${err?.message ?? "unknown"}`);
    return json({ ok: false, reason: "mail", signedAt: meta.signedAt }, 502);
  }

  return json({
    ok: true,
    id: deal.id,
    signedAt: meta.signedAt,
    downloadUrl: `/.netlify/functions/contract-download?id=${encodeURIComponent(
      deal.id,
    )}&t=${downloadToken(deal.id, secrets[0])}`,
  });
};
