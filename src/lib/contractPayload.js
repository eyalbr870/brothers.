// Building and validating a contract-link payload - the deal rules, in one place.
//
// Extracted from scripts/contract-link.mjs so the CLI and the /admin endpoint
// mint byte-identical payloads from byte-identical rules. There is no database
// behind a link: the payload IS the contract, so every rule that keeps a link
// honest (positive amounts, a deposit no larger than the total, an expiry that
// cannot outlive the wedding) has to be enforced before it is signed - once.
//
// Pure and dependency-light on purpose: no console, no process.exit, no "@/*"
// alias and no I/O. esbuild bundles this into the Netlify functions next to
// contractDeal.js, exactly as that file's own header describes.
//
// Errors come back as a `field -> Hebrew message` map, collected in the order
// the CLI used to check them. That ordering is load-bearing: the CLI died on
// the first failure, so `Object.values(errors)[0]` is precisely the message it
// printed before this module existed. The web admin shows them all at once.
//
// The wording is swappable (`options.messages`) because the CLI speaks in flags
// ("חסר --couple") and a form does not. Same codes, same checks, same order -
// only the sentence differs.

import { randomBytes } from "node:crypto";

import { services as allServices, payMethods, balanceDueOptions } from "../data/contract.js";
import { formatDateHe } from "./contractDeal.js";

/** A link may never outlive 90 days, whatever the caller asks for. */
export const MAX_DAYS = 90;

/** Service ids, in the contract's own table order. */
export const SERVICE_IDS = allServices.map((s) => s.id);

/**
 * Default (form-facing) wording, keyed by error code. A caller passing
 * `options.messages` overrides individual codes; anything it omits falls back
 * to here, so a code can never render as `undefined`.
 */
const MESSAGES = {
  "couple.missing": () => "חסר שם הזוג",
  "date.format": () => "תאריך האירוע חייב להיות בפורמט YYYY-MM-DD (למשל 2027-06-18)",
  "date.past": ({ dateHe }) =>
    `תאריך האירוע (${dateHe}) כבר עבר. תוקף הקישור נצמד לתאריך האירוע, ` +
    "ולכן הקישור היה נוצר פג-תוקף.",
  "venue.missing": () => "חסר מקום האירוע",
  "total.invalid": () => 'סה"כ תמורה חייב להיות מספר חיובי (בש"ח, כולל מע"מ)',
  "deposit.invalid": () => "המקדמה חייבת להיות מספר חיובי",
  "deposit.gtTotal": ({ deposit, total }) =>
    `המקדמה (${deposit}) גדולה מהתמורה הכוללת (${total})`,
  "guests.range": () => "כמות המוזמנים חייבת להיות מספר בין 0 ל-2000",
  "pay.invalid": ({ options }) => `אמצעי התשלום חייב להיות אחד מ: ${options.join(" | ")}`,
  "balanceDue.invalid": ({ options }) =>
    `מועד תשלום היתרה חייב להיות אחד מ: ${options.join(" | ")}`,
  "email.invalid": () => "האימייל אינו כתובת תקינה",
  "services.unknown": ({ id, available }) =>
    `שירות לא מוכר: "${id}"\nזמינים: ${available.join(", ")}`,
  "services.empty": () => "חייב להיכלל לפחות שירות אחד בהסכם",
  "days.invalid": () => "תוקף הקישור בימים חייב להיות מספר",
};

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? "")) && !Number.isNaN(Date.parse(s));
const isEmail = (s) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s));

/**
 * `in` would also match inherited keys, so `pay: "constructor"` from a public
 * endpoint would sail through and then resolve to a function. Own keys only.
 */
const isOption = (table, key) => Object.hasOwn(table, key);

/**
 * Resolve a services spec into ids, in the contract's table order.
 *
 * Accepts `"all"`, a list (`"stills1,video1"`), subtraction (`"all,-std"`) and
 * - because `String(["a","b"])` is `"a,b"` - a plain array, which is what the
 * admin form sends. An empty spec means "everything", as it always has.
 *
 * @returns {{ok: true, services: string[]} | {ok: false, code: string, params: object}}
 */
export function parseServices(spec) {
  const raw = String(spec ?? "all").trim();
  if (!raw) return { ok: true, services: [...SERVICE_IDS] };

  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let set = new Set();

  for (const part of parts) {
    if (part === "all") {
      set = new Set(SERVICE_IDS);
    } else if (part.startsWith("-")) {
      const id = part.slice(1);
      if (!SERVICE_IDS.includes(id)) {
        return { ok: false, code: "services.unknown", params: { id, available: SERVICE_IDS } };
      }
      set.delete(id);
    } else {
      if (!SERVICE_IDS.includes(part)) {
        return {
          ok: false,
          code: "services.unknown",
          params: { id: part, available: SERVICE_IDS },
        };
      }
      set.add(part);
    }
  }
  if (!set.size) return { ok: false, code: "services.empty", params: {} };
  // keep the contract's own row order
  return { ok: true, services: SERVICE_IDS.filter((id) => set.has(id)) };
}

/**
 * Validate a raw input bag and return the payload that gets HMAC-signed.
 *
 * @param {object} input  couple, date, venue, guests, total, deposit, services,
 *   signers, pay, balanceDue (or "balance-due"), notes, email, phone, days.
 * @param {{messages?: object, now?: number}} [options]
 * @returns {{ok: true, payload: object} | {ok: false, errors: Record<string,string>}}
 */
export function buildPayload(input, options = {}) {
  const a = input ?? {};
  const msg = { ...MESSAGES, ...(options.messages ?? {}) };
  const errors = {};
  // First message per field wins, so a field cannot be reported twice and the
  // insertion order stays the CLI's check order.
  const fail = (field, code, params = {}) => {
    if (Object.hasOwn(errors, field)) return;
    errors[field] = msg[code](params);
  };

  const couple = String(a.couple ?? "").trim();
  if (!couple) fail("couple", "couple.missing");

  const date = String(a.date ?? "").trim();
  if (!isDate(date)) fail("date", "date.format");

  const venue = String(a.venue ?? "").trim();
  if (!venue) fail("venue", "venue.missing");

  const total = Math.round(Number(a.total));
  const deposit = Math.round(Number(a.deposit));
  if (!Number.isFinite(total) || total <= 0) fail("total", "total.invalid");
  if (!Number.isFinite(deposit) || deposit <= 0) fail("deposit", "deposit.invalid");
  if (deposit > total) fail("deposit", "deposit.gtTotal", { deposit, total });

  const guests = a.guests == null ? null : Math.round(Number(a.guests));
  if (guests != null && (!Number.isFinite(guests) || guests < 0 || guests > 2000)) {
    fail("guests", "guests.range");
  }

  const payMethod = String(a.pay ?? "bit").trim();
  if (!isOption(payMethods, payMethod)) {
    fail("pay", "pay.invalid", { options: Object.keys(payMethods) });
  }

  const balanceDue = String(a.balanceDue ?? a["balance-due"] ?? "event-day").trim();
  if (!isOption(balanceDueOptions, balanceDue)) {
    fail("balanceDue", "balanceDue.invalid", { options: Object.keys(balanceDueOptions) });
  }

  const signers = Number(a.signers ?? 1) === 2 ? 2 : 1;

  const email = String(a.email ?? "").trim();
  if (!isEmail(email)) fail("email", "email.invalid");

  const parsed = parseServices(a.services);
  if (!parsed.ok) fail("services", parsed.code, parsed.params);

  // Expiry: requested days, capped at 90, and never past the wedding itself -
  // a link that still works after the event is a liability, not a convenience.
  const days = Math.min(Number(a.days ?? 30), MAX_DAYS);
  if (!Number.isFinite(days)) fail("days", "days.invalid");
  const now = options.now ?? Date.now();
  const byDays = now + days * 86400000;
  const eventEnd = Date.parse(`${date}T23:59:59+03:00`);

  // Because expiry is clamped to the event date, a past date would mint a link
  // that is dead on arrival - and silently, since the payload itself is valid.
  // Refuse instead of handing over a link that shows "פג תוקף" to the couple.
  if (Number.isFinite(eventEnd) && eventEnd <= now) {
    fail("date", "date.past", { date, dateHe: formatDateHe(date) });
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const exp = Math.floor(Math.min(byDays, eventEnd) / 1000);
  const id = `c_${date.replace(/-/g, "")}_${randomBytes(3).toString("hex")}`;

  return {
    ok: true,
    payload: {
      v: 1,
      id,
      iat: Math.floor(now / 1000),
      exp,
      couple,
      date,
      venue,
      guests,
      total,
      deposit,
      services: parsed.services,
      signers,
      payMethod,
      balanceDue,
      notes: String(a.notes ?? "").trim(),
      email,
      phone: String(a.phone ?? "").trim(),
    },
  };
}

/**
 * "18/06/2027" from a unix-seconds expiry - the form the CLI report and the
 * admin page both print. Shared so the two can never disagree.
 */
export function formatExpDate(exp) {
  const d = new Date(Number(exp) * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}/${d.getFullYear()}`;
}
