// Turns a verified link payload into the deal the contract actually renders:
// resolved service rows, derived balance, formatted amounts, and the clause
// text with every {{placeholder}} filled in.
//
// Shared by the page, the print/PDF DOM and the two emails. That is the point:
// the amount in clause 1.1, the amount in the deal card, the amount in the PDF
// and the amount in Yariv's email are all one computation, so they cannot
// drift apart.
//
// Dependency-free apart from contract.js (no "@/*" alias) - esbuild bundles it
// into the Netlify functions.

import {
  clauses as rawClauses,
  services as allServices,
  payMethods,
  balanceDueOptions,
} from "../data/contract.js";

/**
 * Deliberately NOT Intl.NumberFormat. The client renders the PDF and the
 * server renders the email; an ICU version difference between the browser and
 * the Node 20 lambda could print two different amounts for the same contract.
 * Plain grouping is identical everywhere, forever.
 */
export function formatAmount(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "18/06/2026" - the form the contract and the PDF both use. */
export function formatDateHe(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  if (!m) return String(iso ?? "");
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Normalise a verified payload into the shape everything downstream reads.
 * Never trusts the payload's own `balance` - it is always derived, so a link
 * cannot carry an internally inconsistent set of numbers.
 */
export function buildDeal(payload) {
  const total = Math.round(Number(payload.total) || 0);
  const deposit = Math.round(Number(payload.deposit) || 0);
  const balance = total - deposit;

  const chosen = new Set(Array.isArray(payload.services) ? payload.services : []);
  // Ordered by the contract's own table, not by the order in the link.
  const rows = allServices.filter((s) => chosen.has(s.id));
  const albumsIncluded = chosen.has("albums");

  const payMethod = payMethods[payload.payMethod] ?? payMethods.bit;
  const balanceDue = balanceDueOptions[payload.balanceDue] ?? balanceDueOptions["event-day"];

  return {
    id: String(payload.id ?? ""),
    couple: String(payload.couple ?? ""),
    date: String(payload.date ?? ""),
    dateHe: formatDateHe(payload.date),
    venue: String(payload.venue ?? ""),
    guests: Number.isFinite(Number(payload.guests)) ? Number(payload.guests) : null,
    notes: String(payload.notes ?? ""),
    email: String(payload.email ?? ""),
    phone: String(payload.phone ?? ""),
    signers: payload.signers === 2 ? 2 : 1,
    total,
    deposit,
    balance,
    totalText: formatAmount(total),
    depositText: formatAmount(deposit),
    balanceText: formatAmount(balance),
    services: rows,
    albumsIncluded,
    payMethodKey: payload.payMethod ?? "bit",
    payMethod,
    balanceDueKey: payload.balanceDue ?? "event-day",
    balanceDue,
    expiresAt: Number(payload.exp) || null,
  };
}

/** Fill {{total}} / {{deposit}} / {{balance}} / {{payMethod}} / {{balanceDue}}. */
export function fillPlaceholders(text, deal) {
  return String(text)
    .replace(/\{\{total\}\}/g, deal.totalText)
    .replace(/\{\{deposit\}\}/g, deal.depositText)
    .replace(/\{\{balance\}\}/g, deal.balanceText)
    .replace(/\{\{payMethod\}\}/g, deal.payMethod)
    .replace(/\{\{balanceDue\}\}/g, deal.balanceDue);
}

/**
 * The 13 clauses with placeholders resolved and clause 8.2's variant picked.
 * Returns plain data so the caller decides the markup.
 */
export function renderClauses(deal) {
  return rawClauses.map((c) => ({
    n: c.n,
    title: c.title,
    items: c.items.map((it) => {
      const text = it.variants
        ? it.variants[deal.albumsIncluded ? "included" : "extra"]
        : it.text;
      return {
        n: it.n ?? null,
        title: it.title ?? null,
        text: fillPlaceholders(text, deal),
      };
    }),
  }));
}
