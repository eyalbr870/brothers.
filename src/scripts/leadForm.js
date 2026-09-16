// Shared behaviour for the lead forms (homepage Contact + landing-page
// LpLeadForm):
//   1. Mirrors the package finder's selection into the form (summary card,
//      hidden fields, guest count).
//   2. Submits to Netlify Forms in the background.
//   3. On success swaps the form for the "what happens now" panel with a
//      pre-filled WhatsApp message, and fires the lead conversion events.
//
// Markup contract: <form data-lead-form data-sending data-error
// [data-campaign]> containing LeadSelection, followed (inside the same
// [data-lead-scope] wrapper) by LeadThankYou.

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
  [sel.coverage, ...(sel.extras || [])].filter(Boolean).join(" · ");

const summaryText = (sel) =>
  sel
    ? `חבילה: ${sel.pkgName}\nתיעוד: ${detailsLine(sel)}\nמחיר: ${sel.priceText}`
    : "";

function applySelection(form, sel) {
  if (!sel) return;

  form.querySelectorAll("[data-sel-field]").forEach((input) => {
    const key = input.getAttribute("data-sel-field");
    const val = sel[key];
    input.value = Array.isArray(val) ? val.join(", ") : (val ?? "");
  });

  // Pre-fill guests only while the visitor hasn't typed their own number.
  const guests = form.querySelector('[name="guests"]');
  if (guests && (!guests.value || guests.dataset.autofilled) && sel.guests) {
    guests.value = String(sel.guests);
    guests.dataset.autofilled = "1";
  }

  const card = form.querySelector("[data-lead-selection]");
  if (!card) return;
  card.querySelector("[data-sel-filled]").hidden = false;
  card.querySelector("[data-sel-empty]").hidden = true;
  card.querySelector("[data-sel-name]").textContent = sel.pkgName;
  card.querySelector("[data-sel-details]").textContent = detailsLine(sel);
  card.querySelector("[data-sel-price]").textContent = sel.priceText;
}

function showThanks(scope, form, sel) {
  const thanks = scope.querySelector("[data-lead-thanks]");
  if (!thanks) return false;

  const name = (form.querySelector('[name="name"]')?.value || "").trim();
  const firstName = name.split(/\s+/)[0] || "";
  const date = form.querySelector('[name="event_date"]')?.value || "";

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
    .replace("{summary}", summaryText(sel))
    .replace(/\n{2,}/g, "\n");
  thanks
    .querySelector("[data-thanks-wa]")
    .setAttribute("href", `https://wa.me/${thanks.dataset.waNumber}?text=${encodeURIComponent(msg)}`);

  form.hidden = true;
  thanks.hidden = false;
  thanks.scrollIntoView({ behavior: "smooth", block: "start" });
  thanks.focus({ preventScroll: true });
  return true;
}

function trackLead(form, sel) {
  const campaign = form.dataset.campaign || "homepage";
  try {
    window.gtag?.("event", "generate_lead", {
      form: form.getAttribute("name"),
      campaign,
      package: sel?.pkgName || "none",
      value: sel?.price || undefined,
      currency: "ILS",
    });
  } catch {}
  window.lpTrack?.("Lead", {
    campaign,
    content_name: sel?.pkgName,
    value: sel?.price,
    currency: "ILS",
  });
}

function setup(form) {
  const scope = form.closest("[data-lead-scope]") || form.parentElement;
  const status = form.querySelector("[data-status]");
  const submit = form.querySelector("[data-submit]");
  const label = form.querySelector("[data-submit-label]");

  const guests = form.querySelector('[name="guests"]');
  guests?.addEventListener("input", () => delete guests.dataset.autofilled);

  // Pages without a package finder (e.g. business events) never render the
  // summary card, and must not inherit a wedding package picked elsewhere.
  const usesFinder = !!form.querySelector("[data-lead-selection]");
  const selection = () => (usesFinder ? readSelection() : null);

  applySelection(form, selection());
  if (usesFinder) {
    window.addEventListener("brothers:selection", (e) => applySelection(form, e.detail));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form__status";
    status.textContent = "";
    const sel = selection();

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
