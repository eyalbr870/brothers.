// Declarative click tracking for the homepage conversion surfaces.
//
// Before this, the homepage fired exactly one event - generate_lead, on form
// submit. Every WhatsApp tap, phone tap and CTA click was invisible, even
// though growth/goals.json counts a WhatsApp message as a qualified inquiry.
//
// Usage: add to any clickable element
//   data-track="contact"        -> Meta "Contact"        / GA4 "contact"
//   data-track="cta"            -> GA4 "cta"
//   data-track-loc="hero"       -> params.location
//   data-track-method="whatsapp"-> params.method
//   data-track-label="..."      -> params.label
//
// Only BaseLayout imports this. The /lp/* components already call lpTrack
// inline, so importing it in LandingLayout too would double-count.

// Event kinds that map to a standard Meta event; everything else is custom.
const STANDARD = { contact: "Contact" };

const PARAM_KEYS = ["method", "label", "target"];

document.addEventListener(
  "click",
  (e) => {
    const el = e.target.closest?.("[data-track]");
    if (!el) return;

    const kind = el.dataset.track;
    const params = { campaign: "homepage" };
    if (el.dataset.trackLoc) params.location = el.dataset.trackLoc;
    for (const key of PARAM_KEYS) {
      const val = el.dataset["track" + key[0].toUpperCase() + key.slice(1)];
      if (val) params[key] = val;
    }

    if (STANDARD[kind]) window.lpTrack?.(STANDARD[kind], params);
    else window.lpTrackCustom?.(kind, params);
  },
  { passive: true }
);
