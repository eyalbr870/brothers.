// Orchestrates /admin: log in, fill the form, proof-read it, mint, list.
//
// Dependency-free on purpose, same as contractPage.js. The only imports are
// the project's own data and formatters - the service labels, the payment
// methods and the amount/date formatting must be the same ones the contract
// itself renders with, or the הגהה step is proof-reading a different document.
//
// Rules this file exists to keep:
//   - the password goes out in a POST body and is wiped from the field after.
//     Never a query string, never localStorage, never sessionStorage.
//   - every request carries credentials: "same-origin" so the HttpOnly session
//     cookie travels.
//   - a 401 from any authed endpoint means the session is gone: back to the
//     gate, mid-flow, with the form untouched.

import { services as allServices, payMethods, balanceDueOptions } from "@/data/contract.js";
import { formatAmount, formatDateHe } from "@/lib/contractDeal.js";

const LOGIN = "/.netlify/functions/admin-login";
const LOGOUT = "/.netlify/functions/admin-logout";
const CREATE = "/.netlify/functions/admin-create";
const LIST = "/.netlify/functions/admin-list";

const MAX_DAYS = 90; // same ceiling as scripts/contract-link.mjs

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------------------------------------------------------------- copy
const T = {
  needPassword: "נא להזין סיסמה",
  wrongPassword: "הסיסמה שגויה. נסו שוב.",
  rate: "יותר מדי נסיונות. המתינו דקה ונסו שוב.",
  misconfigured: "ההתחברות לא מוגדרת בשרת. דברו עם מי שמתחזק את האתר.",
  offline: "אין חיבור לשרת. בדקו את החיבור ונסו שוב.",
  sessionLost: "ההתחברות פגה. היכנסו שוב.",
  serverish: (s) => `אין מענה מהשרת (${s}). נסו שוב בעוד רגע.`,
  validationGeneral: "השרת החזיר שגיאה בפרטים. בדקו את השדות המסומנים.",
  copied: "הועתק ✓",
  copySelected: "הטקסט מסומן — הקישו ״העתק״ בתפריט כדי להעתיק.",
  listLoading: "טוען…",
  listFailed: "לא הצלחנו לטעון את הרשימה.",
  minting: "יוצרים קישור…",
};

const E = {
  couple: "נא למלא את שם הזוג",
  date: "נא לבחור תאריך אירוע",
  venue: "נא למלא את מקום האירוע",
  total: 'סה"כ תמורה חייב להיות מספר חיובי',
  deposit: "מקדמה חייבת להיות מספר חיובי",
  depositOver: 'המקדמה גדולה מסה"כ התמורה',
  guests: "מספר מוזמנים חייב להיות בין 0 ל-2000",
  services: "יש לבחור לפחות שירות אחד",
  email: "כתובת האימייל אינה תקינה",
  phone: "מספר הטלפון אינו תקין",
  days: `תוקף הקישור חייב להיות בין 1 ל-${MAX_DAYS} ימים`,
};

const STATUS = { sent: "נשלח", signed: "נחתם", expired: "פג תוקף" };

const SERVICE_LABEL = new Map(allServices.map((s) => [s.id, s.label]));

let listLoaded = false;

// ---------------------------------------------------------------- fetch
/**
 * One shape for every call: { ok, status, body }. A 404 (the functions not
 * deployed) or an HTML error page both land here as an empty body with a real
 * status, so the UI can say something true instead of going quiet.
 */
async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
    });
  } catch {
    return { ok: false, status: 0, body: {} };
  }
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body: body ?? {} };
}

function post(path, payload) {
  return api(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

function messageFor(r) {
  if (r.status === 0) return T.offline;
  if (r.status === 429 || r.body.reason === "rate") return T.rate;
  if (r.body.reason === "config" || r.body.reason === "misconfigured") return T.misconfigured;
  return T.serverish(r.status || "—");
}

// ---------------------------------------------------------------- states
function show(name) {
  for (const el of $$("[data-state]")) el.hidden = el.dataset.state !== name;
  $("[data-logout]").hidden = name !== "app";
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function step(name) {
  for (const el of $$("[data-step]")) el.hidden = el.dataset.step !== name;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function tab(name) {
  for (const btn of $$("[data-tab]")) {
    const on = btn.dataset.tab === name;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  }
  for (const panel of $$("[data-panel]")) panel.hidden = panel.dataset.panel !== name;
  if (name === "list" && !listLoaded) loadList();
}

function showGate(msg) {
  gateErr(msg ?? "");
  show("gate");
  $("#f-password").value = "";
  revealPassword(false);
}

/**
 * Leaves nothing from the session in the DOM: no minted link, no list of
 * deals, no half-finished form behind the gate.
 */
function wipe() {
  listLoaded = false;
  resetAll();
  $("[data-list]").textContent = "";
  $("[data-list-empty]").hidden = true;
  listStatus("");
  $("[data-result-url]").value = "";
  $("[data-result-wa]").value = "";
  $("[data-result-sub]").textContent = "";
  $("[data-result-wa-link]").hidden = true;
  for (const which of ["url", "wa"]) copyStatus(which, "");
  pending = null;
}

/** A 401 on an authed endpoint: the cookie is gone. */
function sessionLost() {
  wipe();
  showGate(T.sessionLost);
}

// ---------------------------------------------------------------- login
function gateErr(msg) {
  const el = $('[data-err-for="password"]');
  el.textContent = msg;
  $(".gate-form").classList.toggle("is-err", Boolean(msg));
}

/** The eye button. Always resets to hidden once the field is wiped. */
function revealPassword(on) {
  const btn = $("[data-pw-toggle]");
  $("#f-password").type = on ? "text" : "password";
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.setAttribute("aria-label", on ? "הסתרת הסיסמה" : "הצגת הסיסמה");
  $("[data-eye-open]", btn).hidden = on;
  $("[data-eye-shut]", btn).hidden = !on;
}

function gateBusy(on) {
  $("[data-login-submit]").disabled = on;
  $("[data-login-label]").textContent = on ? "מתחברים…" : "כניסה";
}

async function login(ev) {
  ev.preventDefault();
  const input = $("#f-password");
  const password = input.value;
  if (!password) {
    gateErr(T.needPassword);
    input.focus();
    return;
  }

  gateBusy(true);
  gateErr("");
  const r = await post(LOGIN, { password });
  // Out of the DOM the moment it has been sent, whatever the answer was.
  input.value = "";
  revealPassword(false);
  gateBusy(false);

  if (r.ok && r.body.ok) {
    show("app");
    step("form");
    tab("create");
    return;
  }
  // A missing or too-short CONTRACT_ADMIN_PASSWORD answers 500 + "server", the
  // same shape as any other server fault - the endpoint will not say which, on
  // purpose. Here it is worth naming: on the login call there is only one
  // plausible cause, and "nobody set the password yet" is a different problem
  // from "the page is broken". That is exactly the confusion docs/ADMIN.md
  // warns about for a deploy-preview, where the variable is easy to forget.
  gateErr(
    r.status === 401 ? T.wrongPassword : r.status === 500 ? T.misconfigured : messageFor(r),
  );
  input.focus();
}

async function logout() {
  const btn = $("[data-logout]");
  btn.disabled = true;
  await post(LOGOUT, {});
  btn.disabled = false;
  wipe();
  showGate();
}

// ---------------------------------------------------------------- form
function formEl() {
  return $('[data-step="form"]');
}

function setError(field, msg) {
  const el = $(`[data-err-for="${field}"]`);
  if (el) el.textContent = msg;
  const input = $(`[name="${field}"]`, formEl());
  input?.closest(".fld")?.classList.add("is-err");
}

function clearErrors() {
  for (const el of $$("[data-err-for]", formEl())) el.textContent = "";
  for (const el of $$(".fld.is-err", formEl())) el.classList.remove("is-err");
  const alert = $("[data-form-alert]");
  alert.textContent = "";
  alert.hidden = true;
}

function collect() {
  const fd = new FormData(formEl());
  const s = (k) => String(fd.get(k) ?? "").trim();
  const guests = s("guests");
  return {
    couple: s("couple"),
    date: s("date"),
    venue: s("venue"),
    guests: guests === "" ? null : Math.round(Number(guests)),
    total: Math.round(Number(s("total") || 0)),
    deposit: Math.round(Number(s("deposit") || 0)),
    services: fd.getAll("services").map(String),
    signers: s("signers") === "2" ? 2 : 1,
    pay: s("pay"),
    balanceDue: s("balanceDue"),
    notes: s("notes"),
    email: s("email"),
    phone: s("phone"),
    days: Math.round(Number(s("days") || 30)),
  };
}

/**
 * Local validation mirrors scripts/contract-link.mjs. The server validates
 * again through the shared payload module and wins any disagreement - this
 * pass exists so the obvious mistakes never cost a round trip.
 */
function validate(p) {
  const errs = [];
  if (!p.couple) errs.push(["couple", E.couple]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) errs.push(["date", E.date]);
  if (!p.venue) errs.push(["venue", E.venue]);
  if (!Number.isFinite(p.total) || p.total <= 0) errs.push(["total", E.total]);
  if (!Number.isFinite(p.deposit) || p.deposit <= 0) errs.push(["deposit", E.deposit]);
  else if (p.total > 0 && p.deposit > p.total) errs.push(["deposit", E.depositOver]);
  if (p.guests != null && (!Number.isInteger(p.guests) || p.guests < 0 || p.guests > 2000)) {
    errs.push(["guests", E.guests]);
  }
  if (!p.services.length) errs.push(["services", E.services]);
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) errs.push(["email", E.email]);
  if (p.phone && !/^[0-9+\-\s()]{9,}$/.test(p.phone)) errs.push(["phone", E.phone]);
  if (!Number.isInteger(p.days) || p.days < 1 || p.days > MAX_DAYS) errs.push(["days", E.days]);
  return errs;
}

function showErrors(errs) {
  for (const [field, msg] of errs) setError(field, msg);
  const first = $(`[data-err-for="${errs[0][0]}"]`);
  first?.scrollIntoView({ behavior: "smooth", block: "center" });
  $(`[name="${errs[0][0]}"]`, formEl())?.focus({ preventScroll: true });
}

/** 422 bodies name their own fields; anything we cannot place is still shown. */
function applyServerErrors(errors) {
  const placed = [];
  const orphans = [];
  for (const [field, msg] of Object.entries(errors ?? {})) {
    if ($(`[data-err-for="${field}"]`)) placed.push([field, String(msg)]);
    else orphans.push(String(msg));
  }
  if (placed.length) showErrors(placed);
  if (orphans.length || !placed.length) {
    const alert = $("[data-form-alert]");
    alert.textContent = orphans.join(" · ") || T.validationGeneral;
    alert.hidden = false;
  }
}

function derivedBalance() {
  const total = Math.round(Number($("#f-total").value || 0));
  const deposit = Math.round(Number($("#f-deposit").value || 0));
  const el = $("[data-derived-balance]");
  el.textContent = total > 0 && deposit >= 0 && deposit <= total ? formatAmount(total - deposit) : "—";
}

function resetAll() {
  formEl().reset();
  for (const box of $$('[name="services"]', formEl())) box.checked = true;
  clearErrors();
  derivedBalance();
  $("[data-proof-status]").textContent = "";
  step("form");
}

// ---------------------------------------------------------------- proof
let pending = null;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dmy(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function inDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return dmy(d);
}

function fill(key, text) {
  const el = $(`[data-proof="${key}"]`);
  if (el) el.textContent = text;
}

function proofRow(key, on) {
  const el = $(`[data-proof-row="${key}"]`);
  if (el) el.hidden = !on;
}

function paintProof(p) {
  fill("couple", p.couple);
  fill("date", formatDateHe(p.date));
  fill("venue", p.venue);
  fill("guests", p.guests == null ? "" : String(p.guests));
  proofRow("guests", p.guests != null);

  fill("total", formatAmount(p.total));
  fill("deposit", formatAmount(p.deposit));
  fill("balance", formatAmount(p.total - p.deposit));

  fill("pay", payMethods[p.pay] ?? p.pay);
  fill("balanceDue", balanceDueOptions[p.balanceDue] ?? p.balanceDue);
  fill("signers", p.signers === 2 ? "שני חותמים" : "חותם אחד");
  fill("expiry", `${p.days} ימים — עד ${inDays(p.days)}`);

  const ul = $("[data-proof-services]");
  ul.textContent = "";
  for (const id of p.services) {
    const li = document.createElement("li");
    li.textContent = SERVICE_LABEL.get(id) ?? id;
    ul.append(li);
  }

  fill("email", p.email);
  proofRow("email", Boolean(p.email));
  fill("phone", p.phone);
  proofRow("phone", Boolean(p.phone));
  fill("notes", p.notes);
  proofRow("notes", Boolean(p.notes));
}

function toProof(ev) {
  ev.preventDefault();
  clearErrors();
  const p = collect();
  const errs = validate(p);
  if (errs.length) {
    showErrors(errs);
    return;
  }
  pending = p;
  paintProof(p);
  $("[data-proof-status]").textContent = "";
  step("proof");
}

function mintBusy(on) {
  $("[data-proof-mint]").disabled = on;
  $("[data-proof-back]").disabled = on;
  $("[data-mint-label]").textContent = on ? T.minting : "צור קישור";
}

function proofStatus(msg, kind) {
  const el = $("[data-proof-status]");
  el.textContent = msg;
  el.classList.toggle("is-err", kind === "err");
  el.classList.toggle("is-ok", kind === "ok");
}

async function mint() {
  if (!pending) {
    step("form");
    return;
  }
  mintBusy(true);
  proofStatus("", null);

  const r = await post(CREATE, pending);
  mintBusy(false);

  if (r.status === 401) {
    sessionLost();
    return;
  }
  if (r.status === 422 || r.body.reason === "validation") {
    step("form");
    applyServerErrors(r.body.errors);
    return;
  }
  if (!r.ok || !r.body.ok) {
    proofStatus(messageFor(r), "err");
    return;
  }

  paintResult(r.body);
  listLoaded = false; // the new link belongs in the list
  step("result");
}

// ---------------------------------------------------------------- result
/** 050-819-3737 -> 972508193737, for a wa.me link. Digits only, no plus. */
function waNumber(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

function paintResult(body) {
  $("[data-result-url]").value = String(body.url ?? "");
  $("[data-result-wa]").value = String(body.waMessage ?? "");

  const exp = body.expText ? `הקישור בתוקף עד ${body.expText}.` : "";
  const couple = body.deal?.couple ? `${body.deal.couple} · ` : "";
  $("[data-result-sub]").textContent = `${couple}${exp}`.trim();

  const link = $("[data-result-wa-link]");
  const num = waNumber(pending?.phone);
  if (num && body.waMessage) {
    link.href = `https://wa.me/${num}?text=${encodeURIComponent(body.waMessage)}`;
    link.hidden = false;
  } else {
    link.hidden = true;
  }

  for (const which of ["url", "wa"]) copyStatus(which, "");
}

function copyStatus(which, msg, kind) {
  const el = $(`[data-copy-status="${which}"]`);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("is-err", kind === "err");
  el.classList.toggle("is-ok", kind === "ok");
}

/**
 * Copying a long signed URL on a phone is the whole job of this screen, so it
 * gets two paths and a safety net.
 *
 * navigator.clipboard first, as the modern one - but only when the document is
 * actually focused: otherwise it is certain to reject with NotAllowedError,
 * and awaiting that rejection spends the click's user gesture, which is what
 * execCommand needs. So the cheap synchronous check comes first and the
 * fallback stays inside the gesture.
 */
function copyViaExec(text) {
  const host = document.createElement("div");
  host.textContent = text;
  host.setAttribute("contenteditable", "true");
  // Selectable by the engine, invisible to the eye, and inside the viewport so
  // iOS does not scroll to it.
  host.style.cssText =
    "position:fixed;top:0;inset-inline-start:0;width:1px;height:1px;opacity:0;" +
    "overflow:hidden;white-space:pre;-webkit-user-select:text;user-select:text;";
  document.body.append(host);

  let ok = false;
  try {
    // Nothing else may hold focus: a focused input owns its own selection, and
    // execCommand("copy") would copy that instead - which is to say, nothing.
    const range = document.createRange();
    range.selectNodeContents(host);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    ok = document.execCommand("copy");
    sel?.removeAllRanges();
  } catch {
    ok = false;
  }
  host.remove();
  return ok;
}

/** Last resort: leave the text selected so one tap on the OS "Copy" finishes. */
function selectIn(field, text) {
  if (!field) return "fail";
  field.removeAttribute("readonly");
  field.focus({ preventScroll: true });
  field.setSelectionRange(0, text.length);
  field.setAttribute("readonly", "");
  return "selected";
}

async function copyText(text, field) {
  if (!text) return "fail";

  if (navigator.clipboard?.writeText && document.hasFocus()) {
    try {
      await navigator.clipboard.writeText(text);
      return "ok";
    } catch {
      /* fall through - the gesture may be spent, but it costs nothing to try */
    }
  }
  if (copyViaExec(text)) return "ok";
  return selectIn(field, text);
}

async function onCopy(btn) {
  const which = btn.dataset.copy;
  const field = which === "url" ? $("[data-result-url]") : $("[data-result-wa]");
  const how = await copyText(field.value, field);
  if (how === "ok") copyStatus(which, T.copied, "ok");
  else copyStatus(which, T.copySelected, "err");
}

// ---------------------------------------------------------------- list
function listStatus(msg, kind) {
  const el = $("[data-list-status]");
  el.textContent = msg;
  el.classList.toggle("is-err", kind === "err");
}

function fmtCreated(iso) {
  const d = new Date(String(iso ?? ""));
  return Number.isNaN(d.getTime()) ? "—" : dmy(d);
}

function renderList(items) {
  const ul = $("[data-list]");
  const tpl = $("[data-row]");
  ul.textContent = "";

  for (const c of items) {
    const li = tpl.content.firstElementChild.cloneNode(true);
    const cell = (k) => li.querySelector(`[data-cell="${k}"]`);
    cell("couple").textContent = String(c.couple ?? "");
    cell("date").textContent = formatDateHe(c.date);
    cell("venue").textContent = String(c.venue ?? "");
    cell("total").textContent = String(c.totalText ?? "—");
    cell("created").textContent = fmtCreated(c.createdAt);
    const badge = cell("status");
    badge.textContent = STATUS[c.status] ?? String(c.status ?? "");
    badge.dataset.status = String(c.status ?? "");
    ul.append(li);
  }

  $("[data-list-empty]").hidden = items.length > 0;
}

async function loadList() {
  const btn = $("[data-list-refresh]");
  btn.disabled = true;
  listStatus(T.listLoading);
  const r = await api(LIST);
  btn.disabled = false;

  if (r.status === 401) {
    sessionLost();
    return;
  }
  if (!r.ok || !r.body.ok) {
    listStatus(`${T.listFailed} ${messageFor(r)}`, "err");
    $("[data-list-empty]").hidden = true;
    return;
  }

  listStatus("");
  renderList(Array.isArray(r.body.contracts) ? r.body.contracts : []);
  listLoaded = true;
}

// ---------------------------------------------------------------- boot
async function boot() {
  $(".gate-form").addEventListener("submit", login);
  $("[data-pw-toggle]").addEventListener("click", () =>
    revealPassword($("#f-password").type === "password"),
  );
  $("[data-logout]").addEventListener("click", logout);
  formEl().addEventListener("submit", toProof);
  $("[data-proof-back]").addEventListener("click", () => step("form"));
  $("[data-proof-mint]").addEventListener("click", mint);
  $("[data-again]").addEventListener("click", resetAll);
  $("[data-list-refresh]").addEventListener("click", loadList);

  for (const btn of $$("[data-tab]")) btn.addEventListener("click", () => tab(btn.dataset.tab));
  for (const btn of $$("[data-copy]")) btn.addEventListener("click", () => onCopy(btn));
  for (const id of ["#f-total", "#f-deposit"]) $(id).addEventListener("input", derivedBalance);

  // Clear a field's error as soon as it is touched.
  formEl().addEventListener("input", (ev) => {
    const name = ev.target?.name;
    if (!name) return;
    const el = $(`[data-err-for="${name}"]`);
    if (el) el.textContent = "";
    ev.target.closest(".fld")?.classList.remove("is-err");
  });

  derivedBalance();
  step("form");

  // One silent probe: a live cookie skips the gate. A failure here is not an
  // error worth showing - it just means "log in".
  const r = await api(LIST);
  if (r.ok && r.body.ok) {
    show("app");
    renderList(Array.isArray(r.body.contracts) ? r.body.contracts : []);
    listLoaded = true;
    return;
  }
  showGate();
}

boot();
