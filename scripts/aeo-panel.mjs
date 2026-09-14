// AEO prompt panel: runs each buyer prompt against ChatGPT (OpenAI Responses + web_search)
// and Gemini (google_search grounding), records the answer, cited sources and whether
// Brothers. is named. Real runs only; an engine error is recorded as an error, never filled in.
import fs from "node:fs";

const OUT = process.argv[2] ?? "panel-raw.json";
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
  const o = await (await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${OPENAI}` } })).json();
  const oIds = (o.data ?? []).map((m) => m.id);
  const openai = ["gpt-5", "gpt-5.1", "gpt-4.1", "gpt-4o"].find((m) => oIds.includes(m)) ?? oIds.find((m) => /^gpt-/.test(m));
  const g = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI}&pageSize=200`)).json();
  const gIds = (g.models ?? []).map((m) => m.name.replace("models/", "")).filter((n) => !/image|tts|embedding|audio|live|lite|preview-tts/.test(n));
  const gemini = ["gemini-2.5-pro", "gemini-2.5-flash"].find((m) => gIds.includes(m)) ?? gIds.find((n) => /^gemini-.*(pro|flash)$/.test(n));
  return { openai, gemini };
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
  return { answer, cites };
}

async function askGemini(model, text) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text }] }], tools: [{ google_search: {} }] }),
  });
  const j = await r.json();
  if (!r.ok) return { error: `${r.status} ${JSON.stringify(j.error ?? j).slice(0, 300)}` };
  const cand = j.candidates?.[0];
  const answer = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  // Grounding chunk URIs are Google redirectors; the title carries the source domain.
  const cites = (cand?.groundingMetadata?.groundingChunks ?? []).map((c) => ({ url: c.web?.uri ?? null, title: c.web?.title ?? null }));
  return { answer, cites };
}

const models = await pickModels();
console.log("models", models);
const runs = [];
for (const p of PROMPTS) {
  for (const [engine, fn, model] of [["chatgpt", askOpenAI, models.openai], ["gemini", askGemini, models.gemini]]) {
    let res;
    try { res = model ? await fn(model, p.text) : { error: "no model available" }; } catch (e) { res = { error: String(e).slice(0, 300) }; }
    const sourceDomains = [...new Set((res.cites ?? []).map((c) => (engine === "gemini" ? c.title : host(c.url))).filter(Boolean))];
    runs.push({
      promptId: p.id, engine, model, date: DATE, prompt: p.text,
      brandNamed: res.answer ? BRAND.test(res.answer) : null,
      brandCited: sourceDomains.some((d) => /brothers-photography/.test(d)),
      sourceDomains, cites: res.cites ?? [], answer: res.answer ?? null, error: res.error ?? null,
    });
    console.log(p.id, engine, res.error ? `ERROR ${res.error}` : `ok named=${BRAND.test(res.answer)} sources=${sourceDomains.join(",")}`);
  }
}
fs.writeFileSync(OUT, JSON.stringify({ date: DATE, models, prompts: PROMPTS, runs }, null, 2));
console.log("wrote", OUT, runs.length, "runs");
