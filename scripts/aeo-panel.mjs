// AEO prompt panel: runs each buyer prompt against ChatGPT (OpenAI Responses + web_search)
// and Gemini (google_search grounding), records the answer, cited sources and whether
// Brothers. is named. Real runs only; an engine error is recorded as an error, never filled in.
//
// Usage: node scripts/aeo-panel.mjs <out.json> [--engines=chatgpt,gemini] [--merge]
//   --engines  run only these engines
//   --merge    keep the other engines' runs already in <out.json>, replace only the engines run now
import fs from "node:fs";

const OUT = process.argv[2] ?? "panel-raw.json";
const flags = process.argv.slice(3);
const ENGINES = (flags.find((f) => f.startsWith("--engines="))?.split("=")[1] ?? "chatgpt,gemini").split(",");
const MERGE = flags.includes("--merge");
const DATE = new Date().toISOString().slice(0, 10);
const OPENAI = process.env.OPENAI_API_KEY;
const GEMINI = process.env.GEMINI_API_KEY;
const BRAND = /brothers|יריב\s*ברוך|brothers-photography/i;

export const PROMPTS = [
  { id: "p01", lang: "he", intent: "national", text: "מי צלם חתונות מומלץ בישראל? תן לי כמה שמות עם אתרים" },
  { id: "p02", lang: "he", intent: "region", text: "צלם חתונות מומלץ במרכז הארץ, מי הכי טובים?" },
  { id: "p03", lang: "he", intent: "city", text: "צלם חתונות מומלץ באשדוד" },
  { id: "p04", lang: "he", intent: "city", text: "צלם חתונות מומלץ בתל אביב" },
  { id: "p05", lang: "he", intent: "city", text: "צלם חתונות מומלץ בירושלים" },
  { id: "p06", lang: "he", intent: "region", text: "צלם חתונות מומלץ בחיפה והצפון" },
  { id: "p07", lang: "he", intent: "region", text: "צלם חתונות מומלץ בבאר שבע והדרום" },
  { id: "p08", lang: "he", intent: "style", text: "צלם חתונות בסגנון טבעי, דוקומנטרי וקולנועי, את מי כדאי לבדוק?" },
  { id: "p09", lang: "he", intent: "service", text: "צלם סטילס ווידאו לחתונה באותה חבילה, המלצות" },
  { id: "p10", lang: "he", intent: "type", text: "צלם לחתונה קטנה ואינטימית, המלצות" },
  { id: "p11", lang: "he", intent: "type", text: "צלם לחתונת שטח בטבע, המלצות" },
  { id: "p12", lang: "he", intent: "price", text: "כמה עולה צלם חתונות בישראל ב-2026?" },
  { id: "p13", lang: "he", intent: "howto", text: "איך בוחרים צלם חתונות? על מה להסתכל ואיפה לקרוא ביקורות" },
  { id: "p14", lang: "en", intent: "national", text: "Who are the best wedding photographers in Israel? Give names and websites." },
  { id: "p15", lang: "en", intent: "city", text: "Recommended wedding photographer and videographer in Tel Aviv for a wedding in Israel" },
];

async function pickModels() {
  const models = {};
  if (ENGINES.includes("chatgpt")) {
    const o = await (await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${OPENAI}` } })).json();
    const oIds = (o.data ?? []).map((m) => m.id);
    models.openai = ["gpt-5", "gpt-5.1", "gpt-4.1", "gpt-4o"].find((m) => oIds.includes(m)) ?? oIds.find((m) => /^gpt-/.test(m));
  }
  if (ENGINES.includes("gemini")) {
    // The model list can include models the key may no longer call (a 404 at generate time),
    // so keep an ordered candidate list and fall through on 404.
    const g = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI}&pageSize=200`)).json();
    const rank = (n) => (/^gemini-3.*pro/.test(n) ? 0 : /^gemini-3.*flash/.test(n) ? 1 : /^gemini-2\.5-pro/.test(n) ? 2 : /^gemini-2\.5-flash$/.test(n) ? 3 : 9);
    models.geminiCandidates = (g.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => m.name.replace("models/", ""))
      .filter((n) => rank(n) < 9 && !/image|tts|embedding|audio|live|lite/.test(n))
      .sort((a, b) => rank(a) - rank(b));
  }
  return models;
}

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };

async function askOpenAI(model, text) {
  const body = { model, input: text, tools: [{ type: "web_search", user_location: { type: "approximate", country: "IL" } }] };
  let r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (r.status === 400) {
    body.tools = [{ type: "web_search_preview", user_location: { type: "approximate", country: "IL" } }];
    r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  const j = await r.json();
  if (!r.ok) return { error: `${r.status} ${JSON.stringify(j.error ?? j).slice(0, 300)}` };
  let answer = ""; const cites = [];
  for (const item of j.output ?? []) for (const c of item.content ?? []) {
    if (c.type === "output_text") { answer += c.text; for (const a of c.annotations ?? []) if (a.url) cites.push({ url: a.url, title: a.title ?? null }); }
  }
  return { answer, cites, model };
}

async function askGeminiModel(model, text) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text }] }], tools: [{ google_search: {} }] }),
  });
  const j = await r.json();
  if (!r.ok) return { status: r.status, error: `${r.status} ${JSON.stringify(j.error ?? j).slice(0, 300)}` };
  const cand = j.candidates?.[0];
  const answer = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  // Grounding chunk URIs are Google redirectors; the title carries the source domain.
  const cites = (cand?.groundingMetadata?.groundingChunks ?? []).map((c) => ({ url: c.web?.uri ?? null, title: c.web?.title ?? null }));
  return { answer, cites, model };
}

let geminiWorking = null;
async function askGemini(candidates, text) {
  const tried = [];
  for (const m of geminiWorking ? [geminiWorking] : candidates) {
    const res = await askGeminiModel(m, text);
    if (res.status === 404) { tried.push(m); continue; }
    if (!res.error) geminiWorking = m;
    return res.error ? { ...res, model: m } : res;
  }
  return { error: `no callable Gemini model (404 on: ${tried.join(", ") || "none listed"})` };
}

const models = await pickModels();
console.log("models", models);
const runs = [];
for (const p of PROMPTS) {
  for (const engine of ENGINES) {
    let res;
    try {
      if (engine === "chatgpt") res = models.openai ? await askOpenAI(models.openai, p.text) : { error: "no OpenAI model available" };
      else if (engine === "gemini") res = await askGemini(models.geminiCandidates ?? [], p.text);
      else res = { error: `unknown engine ${engine}` };
    } catch (e) { res = { error: String(e).slice(0, 300) }; }
    const sourceDomains = [...new Set((res.cites ?? []).map((c) => (engine === "gemini" ? c.title : host(c.url))).filter(Boolean))];
    runs.push({
      promptId: p.id, engine, model: res.model ?? null, date: DATE, prompt: p.text,
      brandNamed: res.answer ? BRAND.test(res.answer) : null,
      brandCited: sourceDomains.some((d) => /brothers-photography/.test(d)),
      sourceDomains, cites: res.cites ?? [], answer: res.answer ?? null, error: res.error ?? null,
    });
    console.log(p.id, engine, res.error ? `ERROR ${res.error}` : `ok model=${res.model} named=${BRAND.test(res.answer)} sources=${sourceDomains.join(",")}`);
  }
}

let out = { date: DATE, models, prompts: PROMPTS, runs };
if (MERGE && fs.existsSync(OUT)) {
  const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  out = {
    date: DATE,
    models: { ...prev.models, ...models },
    prompts: PROMPTS,
    runs: [...prev.runs.filter((r) => !ENGINES.includes(r.engine)), ...runs],
  };
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log("wrote", OUT, out.runs.length, "runs");
