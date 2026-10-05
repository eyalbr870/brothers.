// Shared behaviour for the lead forms (homepage Contact + landing-page
// LpLeadForm):
//   1. Mirrors the package finder's selection into the form (summary card,
//      hidden fields, guest count).
//   2. Submits to Netlify Forms in the background.
//   3. On success swaps the form for the "what happens now" panel with a
//      pre-filled WhatsApp message, and fires the lead conversion events.
//   4. Forms marked data-wa-handoff (the homepage finder) go one step further:
//      after saving they open WhatsApp to Yariv with the message already
//      written, so the couple only has to press send.
//
// Markup contract: <form data-lead-form data-sending data-error
// [data-campaign]> containing LeadSelection, followed (inside the same
// [data-lead-scope] wrapper) by LeadThankYou.

import { applySource, sessionSource } from "@/scripts/leadSource.js";

const STORAGE_KEY = "brothers:selection";

const isLocal = () =>
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

const readSelection = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

const detailsLine = (sel) =>
  [sel.coverage, ...(sel.extras || []), sel.discount].filter(Boolean).join(" · ");

const summaryText = (sel) =>
  sel
    ? [
        sel.names && `שמות: ${sel.names}`,
        `חבילה: ${sel.pkgName}`,
        `תיעוד: ${detailsLine(sel)}`,
        `מחיר: ${sel.priceText}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

// Fill a form field from the finder only while the visitor hasn't typed their
// own value (the dataset flag marks values we put there).
const prefill = (input, value) => {
  if (!input || !value || (input.value && !input.dataset.autofilled)) return;
  input.value = String(value);
  input.dataset.autofilled = "1";
};

function applySelection(form, sel) {
  if (!sel) return;

  form.querySelectorAll("[data-sel-field]").forEach((input) => {
    const key = input.getAttribute("data-sel-field");
    const val = sel[key];
    input.value = Array.isArray(val) ? val.join(", ") : (val ?? "");
  });

  prefill(form.querySelector('[name="guests"]'), sel.guests);
  // Only a date the form's own min (today) accepts.
  const date = form.querySelector('[name="event_date"]');
  if (date && (!date.min || sel.date >= date.min)) prefill(date, sel.date);

  const card = form.querySelector("[data-lead-selection]");
  if (!card) return;
  card.querySelector("[data-sel-filled]").hidden = false;
  card.querySelector("[data-sel-empty]").hidden = true;
  card.querySelector("[data-sel-name]").textContent = sel.pkgName;
  card.querySelector("[data-sel-details]").textContent = detailsLine(sel);
  card.querySelector("[data-sel-price]").textContent = sel.priceText;
}

// yyyy-mm-dd -> dd.mm.yyyy, the way people write dates in a chat.
const chatDate = (d) => (d ? d.split("-").reverse().join(".") : "");

// The handoff message: form.dataset.waText with {name} {summary} {guests}
// {date} {venue} filled in. A line whose placeholders all came out empty is
// dropped, so a couple who skipped the date doesn't send Yariv an empty
// "תאריך האירוע:".
function handoffUrl(form, sel) {
  const val = (name) => (form.querySelector(`[name="${name}"]`)?.value || "").trim();
  // "זה נועה ודניאל" already names them; skip the summary's "שמות:" repeat.
  const summarySel = sel && sel.names === val("name") ? { ...sel, names: "" } : sel;
  const values = {
    name: val("name"),
    summary: summaryText(summarySel),
    guests: sel?.guestsText || val("guests"),
    date: chatDate(sel?.date || val("event_date")),
    venue: val("venue"),
  };
  const msg = form.dataset.waText
    .split("\n")
    .filter((line) => {
      const keys = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      return !keys.length || keys.some((k) => values[k]);
    })
    .map((line) => line.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? ""))
    .join("\n");
  return `https://wa.me/${form.dataset.waNumber}?text=${encodeURIComponent(msg)}`;
}

// Same-tab navigation on phones: after an await, iOS Safari blocks
// window.open as a popup but never a navigation, and wa.me hands straight over
// to the app. On desktop a new tab keeps the site open behind WhatsApp Web.
function openWhatsapp(url) {
  if (isLocal()) {
    console.info("[leadForm] WhatsApp handoff:", url);
    return;
  }
  const phone = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  // Not the "noopener" feature: with it window.open always returns null, and
  // the fallback below would navigate this tab as well.
  const win = phone ? null : window.open(url, "_blank");
  if (win) win.opener = null;
  else location.href = url;
}

function showThanks(scope, form, sel, waUrl) {
  const thanks = scope.querySelector("[data-lead-thanks]");
  if (!thanks) return false;

  const name = (form.querySelector('[name="name"]')?.value || "").trim();
  const firstName = name.split(/\s+/)[0] || "";
  const date = form.querySelector('[name="event_date"]')?.value || "";
  const venue = form.querySelector('[name="venue"]')?.value || "";

  thanks.querySelector("[data-thanks-title]").textContent = thanks.dataset.title.replace(
    "{name}",
    firstName ? ` ${firstName}` : ""
  );

  const summaryNode = thanks.querySelector("[data-thanks-summary]");
  if (sel) {
    summaryNode.textContent = summaryText(sel);
    summaryNode.hidden = false;
  }

  const msg = thanks.dataset.waText
    .replace("{name}", name)
    .replace("{date}", date)
    .replace("{venue}", venue)
    .replace("{summary}", summaryText(sel))
    .replace(/\n{2,}/g, "\n");
  thanks
    .querySelector("[data-thanks-wa]")
    .setAttribute(
      "href",
      waUrl || `https://wa.me/${thanks.dataset.waNumber}?text=${encodeURIComponent(msg)}`
    );

  form.hidden = true;
  thanks.hidden = false;
  thanks.scrollIntoView({ behavior: "smooth", block: "start" });
  thanks.focus({ preventScroll: true });
  return true;
}

function trackLead(form, sel) {
  const campaign = form.dataset.campaign || "homepage";
  // One call, both destinations. lpTrack dual-fires to GA4 and the Pixel
  // (src/components/Analytics.astro), so calling gtag here as well - which this
  // used to do - would double-count generate_lead.
  window.lpTrack?.("Lead", {
    form: form.getAttribute("name"),
    campaign,
    lead_source: sessionSource() || undefined,
    package: sel?.pkgName || "none",
    content_name: sel?.pkgName, // Meta's name for the same thing
    value: sel?.price || undefined,
    currency: "ILS",
  });
}

// Save to Netlify, then hand over to WhatsApp. WhatsApp is the channel that
// matters, so a slow or failed save never holds the couple back: the POST gets
// 2.5s (keepalive lets it finish after the page navigates away) and the
// handoff happens either way.
async function handoff(scope, form, sel, { submit, label, status }) {
  const url = handoffUrl(form, sel);
  const local = isLocal();
  if (local && !new URLSearchParams(location.search).has("testlead")) {
    status.classList.add("is-err");
    status.textContent = "בסביבת פיתוח הטופס אינו נשלח - יעבוד לאחר פריסה ל‑Netlify.";
    console.info("[leadForm] WhatsApp handoff:", url);
    return;
  }

  submit.disabled = true;
  const original = label.textContent;
  label.textContent = form.dataset.sending;
  if (!local) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(),
        keepalive: true,
        signal: ctrl.signal,
      });
    } catch {
      // Timed out or offline: WhatsApp still carries the lead.
    } finally {
      clearTimeout(timer);
    }
  }
  trackLead(form, sel);
  showThanks(scope, form, sel, url);
  window.dispatchEvent(new CustomEvent("brothers:lead-sent"));
  submit.disabled = false;
  label.textContent = original;
  openWhatsapp(url);
}

function setup(form) {
  const scope = form.closest("[data-lead-scope]") || form.parentElement;
  const status = form.querySelector("[data-status]");
  const submit = form.querySelector("[data-submit]");
  const label = form.querySelector("[data-submit-label]");

  ["guests", "event_date"].forEach((name) => {
    const input = form.querySelector(`[name="${name}"]`);
    input?.addEventListener("input", () => delete input.dataset.autofilled);
  });

  // Pages without a package finder (e.g. business events) never render the
  // summary card, and must not inherit a wedding package picked elsewhere.
  // The finder form carries the selection fields without the summary card
  // (it IS the finder), so it says so explicitly.
  const usesFinder =
    form.hasAttribute("data-uses-finder") || !!form.querySelector("[data-lead-selection]");
  const selection = () => (usesFinder ? readSelection() : null);

  applySelection(form, selection());
  if (usesFinder) {
    window.addEventListener("brothers:selection", (e) => applySelection(form, e.detail));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form__status";
    status.textContent = "";
    applySource(form);
    const sel = selection();

    if (form.hasAttribute("data-wa-handoff")) {
      await handoff(scope, form, sel, { submit, label, status });
      return;
    }

    // Local dev has no Netlify backend - the POST to "/" won't record a
    // submission. Add ?testlead to the URL to preview the thank-you panel.
    if (isLocal()) {
      if (new URLSearchParams(location.search).has("testlead")) {
        showThanks(scope, form, sel);
        return;
      }
      status.classList.add("is-err");
      status.textContent = "בסביבת פיתוח הטופס אינו נשלח - יעבוד לאחר פריסה ל‑Netlify.";
      return;
    }

    submit.disabled = true;
    const original = label.textContent;
    label.textContent = form.dataset.sending;
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error("bad response");
      trackLead(form, sel);
      if (!showThanks(scope, form, sel)) {
        form.reset();
        status.classList.add("is-ok");
        status.textContent = form.dataset.success || "";
      }
    } catch {
      status.classList.add("is-err");
      status.textContent = form.dataset.error;
    } finally {
      submit.disabled = false;
      label.textContent = original;
    }
  });
}

document.querySelectorAll("form[data-lead-form]").forEach(setup);
