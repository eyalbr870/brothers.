// First-touch attribution for the lead forms.
//
// The problem this solves: a visitor who arrives from an AI chat (ChatGPT,
// Perplexity, Gemini...) lands on the homepage or a blog post, reads, and only
// then reaches a form. By that point document.referrer is brothers' own domain
// and the original source is gone - so leads arrived with no idea where from.
//
// So the source is captured ONCE, on the first page of the session, and parked
// in sessionStorage. Every form then reports that, not whatever the referrer
// happens to be at submit time. A visitor who returns days later also carries
// their first-ever source (localStorage), because "how did they find me" is
// usually more interesting than "which tab did they come back from".
//
// Loaded from Analytics.astro, which every layout renders, so the capture runs
// on every page - including the blog posts that have no form of their own.

const SESSION_KEY = "brothers:source";
const FIRST_KEY = "brothers:source:first";

// Host -> display name. Checked before search/social so gemini.google.com
// doesn't read as plain Google, and x.ai (Grok) doesn't read as X (Twitter).
const AI_CHATS = [
  ["chatgpt.com", "ChatGPT"],
  ["chat.openai.com", "ChatGPT"],
  ["openai.com", "ChatGPT"],
  ["perplexity.ai", "Perplexity"],
  ["gemini.google.com", "Gemini"],
  ["bard.google.com", "Gemini"],
  ["claude.ai", "Claude"],
  ["copilot.microsoft.com", "Copilot"],
  ["grok.com", "Grok"],
  ["x.ai", "Grok"],
  ["meta.ai", "Meta AI"],
  ["you.com", "You.com"],
  ["poe.com", "Poe"],
  ["chat.mistral.ai", "Le Chat"],
];

const SEARCH = [
  ["google.", "Google"],
  ["bing.com", "Bing"],
  ["duckduckgo.com", "DuckDuckGo"],
  ["yahoo.", "Yahoo"],
  ["ecosia.org", "Ecosia"],
  ["yandex.", "Yandex"],
];

const SOCIAL = [
  ["instagram.com", "Instagram"],
  ["facebook.com", "Facebook"],
  ["fb.com", "Facebook"],
  ["tiktok.com", "TikTok"],
  ["youtube.com", "YouTube"],
  ["linkedin.com", "LinkedIn"],
  ["pinterest.", "Pinterest"],
  ["twitter.com", "X"],
  ["x.com", "X"],
  ["t.co", "X"],
  ["whatsapp.com", "WhatsApp"],
  ["wa.me", "WhatsApp"],
  ["t.me", "Telegram"],
];

// "google." and "pinterest." are prefixes on purpose - they cover the dozens of
// country domains (google.co.il, google.de...) without listing them.
const hostMatches = (host, needle) =>
  needle.endsWith(".")
    ? host === needle.slice(0, -1) || host.startsWith(needle) || host.includes("." + needle)
    : host === needle || host.endsWith("." + needle);

const lookup = (table, host) => table.find(([d]) => hostMatches(host, d))?.[1];

// Some AI engines pass themselves in utm_source instead of a referrer.
const utmAiName = (utmSource) => {
  const s = utmSource.toLowerCase();
  const hit = AI_CHATS.find(([d, name]) => s.includes(name.toLowerCase()) || s.includes(d.split(".")[0]));
  return hit?.[1];
};

function classify(referrer, params) {
  const utmSource = params.get("utm_source") || "";

  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : "";
  } catch {
    host = "";
  }

  const aiName = (host && lookup(AI_CHATS, host)) || (utmSource && utmAiName(utmSource));
  if (aiName) return `${aiName} (צ'אט AI)`;

  const searchName = host && lookup(SEARCH, host);
  if (searchName) return `${searchName} (חיפוש)`;

  const socialName = host && lookup(SOCIAL, host);
  if (socialName) return `${socialName} (רשת חברתית)`;

  if (host) return `${host} (הפניה)`;
  if (utmSource) return `${utmSource} (קמפיין)`;
  return "כניסה ישירה";
}

// The raw trail, kept alongside the friendly label so an odd case can always be
// read back by hand: ad click ids, utm set, and the untouched referrer URL.
function rawDetail(referrer, search) {
  return [search || "", referrer ? "ref:" + referrer : ""].filter(Boolean).join(" | ");
}

const read = (store, key) => {
  try {
    return JSON.parse(store.getItem(key) || "null");
  } catch {
    return null;
  }
};

const write = (store, key, val) => {
  try {
    store.setItem(key, JSON.stringify(val));
  } catch {
    /* private mode / storage full - attribution is never worth throwing over */
  }
};

// Capture runs once per session. An internal navigation (referrer is our own
// host) must never overwrite it - that is the bug this module exists to avoid.
function capture() {
  if (read(sessionStorage, SESSION_KEY)) return;

  const referrer = document.referrer || "";
  let sameSite = false;
  try {
    sameSite = !!referrer && new URL(referrer).hostname === location.hostname;
  } catch {
    sameSite = false;
  }

  const params = new URLSearchParams(location.search);
  const external = sameSite ? "" : referrer;

  const touch = {
    source: classify(external, params),
    detail: rawDetail(external, location.search),
    landing: location.pathname + location.search,
    at: new Date().toISOString(),
  };

  write(sessionStorage, SESSION_KEY, touch);

  // First-ever visit: remembered across sessions, and never overwritten.
  if (!read(localStorage, FIRST_KEY)) write(localStorage, FIRST_KEY, touch);
}

/**
 * Fill a lead form's hidden source fields (LeadSource.astro) right before the
 * visitor submits. Safe on forms that don't render them.
 */
export function applySource(form) {
  const session = read(sessionStorage, SESSION_KEY);
  if (!session) return;

  const first = read(localStorage, FIRST_KEY);
  // Only worth showing when the return visit came in some other way.
  const firstNote =
    first && first.source !== session.source ? ` · מקור ראשוני: ${first.source} (${first.at.slice(0, 10)})` : "";

  const set = (name, value) => {
    const el = form.querySelector(`[data-source-field="${name}"]`);
    if (el) el.value = value;
  };

  set("source", session.source + firstNote);
  set("referrer", session.detail);
  set("landing_page", session.landing);
}

/** The session's source label, for the GA4 / Pixel lead event. */
export const sessionSource = () => read(sessionStorage, SESSION_KEY)?.source || "";

capture();
