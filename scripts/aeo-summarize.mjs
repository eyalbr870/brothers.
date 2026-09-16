// Turns a raw panel file (from scripts/aeo-panel.mjs) into seo/panel.json: per-run facts plus a
// summary, with full answers kept separately under seo/data/panel/<date>-raw.json.
// Errored runs are counted as errors and never as "not named".
// Usage: node scripts/aeo-summarize.mjs <raw.json>
import fs from "node:fs";

const RAW = process.argv[2];
if (!RAW) { console.error("usage: node scripts/aeo-summarize.mjs <raw.json>"); process.exit(1); }
const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));

fs.mkdirSync("seo/data/panel", { recursive: true });
const rawOut = `seo/data/panel/${raw.date}-raw.json`;
fs.writeFileSync(rawOut, JSON.stringify(raw, null, 2) + "\n");

const engines = [...new Set(raw.runs.map((r) => r.engine))];
const byEngine = {};
for (const e of engines) {
  const all = raw.runs.filter((r) => r.engine === e);
  const ok = all.filter((r) => !r.error);
  byEngine[e] = {
    model: ok[0]?.model ?? all[0]?.model ?? null,
    runs: all.length,
    answered: ok.length,
    errors: all.length - ok.length,
    brandNamed: ok.filter((r) => r.brandNamed).length,
    brandCited: ok.filter((r) => r.brandCited).length,
  };
}

const ok = raw.runs.filter((r) => !r.error);
const freq = {};
for (const r of ok) for (const d of r.sourceDomains) freq[d] = (freq[d] ?? 0) + 1;
const topCitedDomains = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([domain, runs]) => ({ domain, runs }));

const panel = {
  _comment: "AI-answer panel for Brothers. (seo/METHOD.md §9). One run per prompt per engine is a sample, not a rate: read it across prompts. Errored runs are errors, not 'not named'. Full answers: " + rawOut,
  date: raw.date,
  prompts: raw.prompts,
  summary: {
    runs: raw.runs.length,
    answered: ok.length,
    errors: raw.runs.length - ok.length,
    brandNamed: ok.filter((r) => r.brandNamed).length,
    brandCited: ok.filter((r) => r.brandCited).length,
    byEngine,
    topCitedDomains,
  },
  runs: raw.runs.map(({ promptId, engine, model, date, brandNamed, brandCited, sourceDomains, cites, error }) => ({
    promptId, engine, model, date, brandNamed, brandCited, sourceDomains,
    citedUrls: (cites ?? []).map((c) => c.url).filter(Boolean), error,
  })),
};

fs.writeFileSync("seo/panel.json", JSON.stringify(panel, null, 2) + "\n");
console.log(JSON.stringify(panel.summary, null, 1));
console.log("wrote seo/panel.json and", rawOut);
