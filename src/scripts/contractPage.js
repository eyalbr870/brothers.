// Orchestrates /contract/: read the token, ask the server what it means,
// reveal one state, validate, sign, submit.
//
// NOTE for anyone copying from src/scripts/leadForm.js: that file
// short-circuits on localhost because Netlify *Forms* genuinely do not run in
// dev. Netlify *Functions* do. There is deliberately no localhost bypass here
// - the whole flow must be testable through `netlify dev` on :8888.

import { ui } from "@/data/contract.js";
import { isValidIsraeliId } from "@/lib/idnumber.js";
import { createSignaturePad } from "@/scripts/contractSignature.js";

const VERIFY = "/.netlify/functions/contract-verify";
const SIGN = "/.netlify/functions/contract-sign";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let deal = null;
let token = null;
const pads = {};
const openedAt = Date.now();
let readEndAt = null;

// ---------------------------------------------------------------- token
/**
 * The token belongs in the fragment: it never reaches a server log, an
 * analytics page_location or a Referer header. A ?c= link is tolerated
 * (some clients mangle "#") but is rewritten into the fragment immediately,
 * before anything else runs.
 */
function readToken() {
  const url = new URL(location.href);
  const q = url.searchParams.get("c");
  if (q) {
    url.searchParams.delete("c");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash || `#${q}`}`);
    return q;
  }
  return location.hash.startsWith("#") ? location.hash.slice(1) : "";
}

// ---------------------------------------------------------------- states
function show(name) {
  for (const el of $$("[data-state]")) el.hidden = el.dataset.state !== name;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? "");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ---------------------------------------------------------------- render
function paint(payload) {
  deal = payload.deal;

  for (const el of $$("[data-fill]")) {
    const key = el.dataset.fill;
    const map = {
      couple: deal.couple,
      dateHe: deal.dateHe,
      venue: deal.venue,
      total: deal.totalText,
      deposit: deal.depositText,
      balance: deal.balanceText,
      payMethod: deal.payMethod,
      balanceDue: deal.balanceDue,
    };
    if (key in map) el.textContent = map[key];
  }

  // Only the services actually in the package. An unchecked row invites
  // "can we add that?" in the middle of a signature.
  const included = new Set(deal.services.map((s) => s.id));
  for (const row of $$("[data-service]")) row.hidden = !included.has(row.dataset.service);

  // Clause 8.2 has two lawful wordings; the package picks one.
  for (const v of $$("[data-variant]")) {
    v.hidden = v.dataset.variant !== (deal.albumsIncluded ? "included" : "extra");
  }

  const notes = $("[data-deal-notes]");
  if (deal.notes) {
    notes.textContent = deal.notes;
    notes.hidden = false;
  }

  // Second signer only when the link says so.
  const blockB = $('[data-sign-block="b"]');
  if (deal.signers !== 2) blockB.hidden = true;

  // Prefills the couple may correct.
  if (deal.guests != null) $("#c-guests").value = String(deal.guests);
  if (deal.email) $("#c-email").value = deal.email;
  if (deal.phone) $("#c-phone").value = deal.phone;

  const wrong = $("[data-wrong-link]");
  if (wrong) {
    const msg = `היי יריב, בהסכם לתאריך ${deal.dateHe} יש טעות בפרטים:`;
    wrong.href = `${wrong.href.split("?")[0]}?text=${encodeURIComponent(msg)}`;
  }

  initPads();
  initGate();
  show("ready");
}

// ---------------------------------------------------------------- signature
function initPads() {
  for (const canvas of $$("[data-canvas]")) {
    const which = canvas.dataset.canvas;
    if (which === "b" && deal.signers !== 2) continue;
    pads[which] = createSignaturePad(canvas);
    pads[which].onChange(() => clearError(`sig_${which}`));
  }
  for (const btn of $$("[data-clear]")) {
    btn.addEventListener("click", () => pads[btn.dataset.clear]?.clear());
  }
}

// ---------------------------------------------------------------- read gate
/**
 * Two independent signals, because neither is worth much alone: reaching the
 * end of clause 13, and an explicit checkbox. Both are recorded as evidence.
 */
function initGate() {
  const form = $(".signform");
  const gate = $("[data-gate]");
  const sentinel = $("[data-read-end]");
  form.classList.add("is-locked");
  gate.classList.add("is-locked");

  const unlock = () => {
    if (readEndAt) return;
    readEndAt = Date.now();
    form.classList.remove("is-locked");
    gate.classList.remove("is-locked");
  };

  if (typeof IntersectionObserver === "function" && sentinel) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          unlock();
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(sentinel);
  } else {
    unlock(); // no observer: do not trap the couple behind a missing API
  }

  // Accessibility escape hatch: keyboard and screen-reader users may never
  // scroll at all. Focusing a field is intent enough; the checkbox still gates.
  form.addEventListener("focusin", () => setTimeout(unlock, 60000), { once: true });
}

// ---------------------------------------------------------------- validation
function setError(name, msg) {
  const el = $(`[data-err-for="${name}"]`);
  if (el) el.textContent = msg;
  const input = $(`[name="${name}"]`);
  input?.closest(".field")?.classList.add("is-err");
  if (name.startsWith("sig_")) {
    $(`[data-canvas="${name.slice(4)}"]`)?.closest(".pad")?.classList.add("is-err");
  }
}

function clearError(name) {
  const el = $(`[data-err-for="${name}"]`);
  if (el) el.textContent = "";
  const input = $(`[name="${name}"]`);
  input?.closest(".field")?.classList.remove("is-err");
  if (name.startsWith("sig_")) {
    $(`[data-canvas="${name.slice(4)}"]`)?.closest(".pad")?.classList.remove("is-err");
  }
}

function collect() {
  const form = $(".signform");
  const fd = new FormData(form);
  const val = (k) => String(fd.get(k) ?? "").trim();
  return {
    nameA: val("name_a"),
    idA: val("id_a"),
    nameB: deal.signers === 2 ? val("name_b") : "",
    idB: deal.signers === 2 ? val("id_b") : "",
    phone: val("phone"),
    email: val("email"),
    guests: val("guests"),
    albumAddress: val("albumAddress"),
    songs: val("songs"),
    notes: val("notes"),
    marketingOptOut: fd.get("marketingOptOut") === "on",
    agreedRead: fd.get("agreedRead") === "on",
  };
}

const E = ui.errors;

function validate(form) {
  const errs = [];
  const need = deal.signers === 2 ? ["a", "b"] : ["a"];

  for (const w of need) {
    clearError(`name_${w}`);
    clearError(`id_${w}`);
    clearError(`sig_${w}`);

    const name = form[w === "a" ? "nameA" : "nameB"];
    if (!name) errs.push([`name_${w}`, E.nameRequired]);
    else if (name.split(/\s+/).filter(Boolean).length < 2) errs.push([`name_${w}`, E.nameTooShort]);

    const id = form[w === "a" ? "idA" : "idB"];
    if (!id) errs.push([`id_${w}`, E.idRequired]);
    else if (!isValidIsraeliId(id)) errs.push([`id_${w}`, E.idInvalid]);

    const v = pads[w]?.validity();
    if (v === "empty") errs.push([`sig_${w}`, E.signatureRequired]);
    else if (v === "short") errs.push([`sig_${w}`, E.signatureTooShort]);
  }

  clearError("phone");
  if (!/^[0-9+\-\s()]{9,}$/.test(form.phone)) errs.push(["phone", E.phoneInvalid]);

  clearError("email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) errs.push(["email", E.emailInvalid]);

  clearError("guests");
  if (form.guests !== "") {
    const g = Number(form.guests);
    if (!Number.isInteger(g) || g < 0 || g > 2000) errs.push(["guests", E.guestsInvalid]);
  }

  clearError("agreedRead");
  if (!form.agreedRead) errs.push(["agreedRead", E.readRequired]);

  return errs;
}

// ---------------------------------------------------------------- submit
function status(msg, kind) {
  const el = $("[data-status]");
  el.textContent = msg;
  el.classList.toggle("is-ok", kind === "ok");
  el.classList.toggle("is-err", kind === "err");
}

function busy(on, label) {
  const btn = $("[data-submit]");
  btn.disabled = on;
  $("[data-submit-label]").textContent = label ?? ui.submit.cta;
}

async function submit(ev) {
  ev.preventDefault();
  const form = collect();
  const errs = validate(form);

  if (errs.length) {
    for (const [name, msg] of errs) setError(name, msg);
    status("", null);
    const first = $(`[data-err-for="${errs[0][0]}"]`);
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
    $(`[name="${errs[0][0]}"]`)?.focus({ preventScroll: true });
    return;
  }

  const signatures = {};
  for (const w of deal.signers === 2 ? ["a", "b"] : ["a"]) {
    signatures[w] = pads[w].toDataURL();
  }

  busy(true, ui.submit.preparing);
  status("", null);

  try {
    // Loaded only now: ~200KB of rasteriser has no business in first paint.
    const { renderContractPages } = await import("@/scripts/contractPdf.js");
    const { pages, counterSignBox } = await renderContractPages({ deal, form, signatures });

    busy(true, ui.submit.sending);

    const res = await fetch(SIGN, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        form,
        signatures,
        pages,
        counterSignBox,
        clientMeta: {
          ts: new Date().toISOString(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screen: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
          dwellMs: Date.now() - openedAt,
          readEndMs: readEndAt ? readEndAt - openedAt : null,
          strokes: Object.fromEntries(
            Object.entries(pads).map(([k, p]) => [k, p.meta()]),
          ),
        },
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (res.status === 409) {
      $("[data-signed-body]").textContent = ui.states.signed.body.replace(
        "{date}",
        fmtDate(body.signedAt),
      );
      show("signed");
      return;
    }
    if (!res.ok || !body.ok) throw new Error(body.reason ?? "server");

    if (body.downloadUrl) {
      const dl = $("[data-download]");
      dl.href = body.downloadUrl;
      dl.hidden = false;
    }
    show("done");
  } catch (err) {
    // Never clear the form or the canvases on failure - that is the couple's
    // work, and they would have to draw again.
    const known = { "too-large": E.pdfTooLarge };
    status(known[err?.message] ?? ui.states.error.body, "err");
    busy(false);
  }
}

// ---------------------------------------------------------------- resend
async function resend() {
  const btn = $("[data-resend]");
  const el = $("[data-resend-status]");
  btn.disabled = true;
  el.textContent = "שולחים…";
  try {
    const res = await fetch(SIGN, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, resend: true }),
    });
    const body = await res.json().catch(() => ({}));
    el.textContent = body.ok ? "נשלח ✓ בדקו גם בספאם." : ui.states.error.body;
    el.className = `form__status ${body.ok ? "is-ok" : "is-err"}`;
  } catch {
    el.textContent = E.network;
    el.className = "form__status is-err";
  } finally {
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------- boot
async function boot() {
  token = readToken();
  if (!token) {
    show("invalid");
    return;
  }

  let res;
  try {
    res = await fetch(VERIFY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    show("invalid");
    return;
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 410) {
    $("[data-expired-body]").textContent = ui.states.expired.body.replace(
      "{date}",
      fmtDate((body.expiredAt ?? 0) * 1000),
    );
    show("expired");
    return;
  }
  if (res.status === 409) {
    $("[data-signed-body]").textContent = ui.states.signed.body.replace(
      "{date}",
      fmtDate(body.signedAt),
    );
    show("signed");
    return;
  }
  if (!res.ok || !body.ok) {
    show("invalid");
    return;
  }

  paint(body);
  $(".signform").addEventListener("submit", submit);
  $("[data-resend]")?.addEventListener("click", resend);
  $("[data-print]")?.addEventListener("click", () => window.print());
}

boot();
