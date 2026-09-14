// Scores every item in seo/backlog.json with the formula in seo/METHOD.md §5 (v1) and writes
// `score` + `scoreBreakdown` back into the file. Language-agnostic: it sums the Ahrefs volumes
// recorded on each item, so it works on Hebrew keywords without tokenizing them.
// Usage: npm run seo:score [-- --check]   (--check prints the queue without writing)
import fs from "node:fs";

const FILE = new URL("../seo/backlog.json", import.meta.url);
const check = process.argv.includes("--check");
const backlog = JSON.parse(fs.readFileSync(FILE, "utf8"));

function winnability(kd) {
  if (kd == null) return 0.7;
  if (kd <= 20) return 1.0;
  if (kd <= 40) return 0.7;
  if (kd <= 60) return 0.4;
  return 0.15;
}

const round = (n) => Math.round(n * 1000) / 1000;

for (const item of backlog.items) {
  const keywords = item.keywords ?? [];
  const volume = keywords.reduce((sum, k) => sum + (Number.isFinite(k.volume) ? k.volume : 0), 0);
  const primary = keywords.find((k) => k.keyword === item.primaryKeyword);
  const kd = primary?.difficulty ?? null;
  const gscImpressions = item.measured?.gscImpressions ?? 0;

  const demand = Math.log10(Math.max(volume, 10));
  const win = winnability(kd);
  const validation = gscImpressions >= 5 ? 1.0 : 0.6;
  const serp = item.serp?.checked && item.serp?.directoryDominated ? 0.5 : 1.0;
  const coveragePenalty = item.status !== "refresh" && item.coverage?.existingPath ? 0.5 : 0;

  item.score = round(demand * win * validation * serp - coveragePenalty);
  item.scoreBreakdown = {
    volume, demand: round(demand), primaryKd: kd, winnability: win, validation, serp,
    coveragePenalty,
    flags: [kd == null && "kdUnknown", !item.serp?.checked && "serpUnchecked"].filter(Boolean),
  };
}

backlog.items.sort((a, b) => b.score - a.score);
backlog.scoring = { version: "v1", method: "seo/METHOD.md §5", lastScored: new Date().toISOString().slice(0, 10) };

console.log("score  status    volume  kd    slug  (primary keyword)");
for (const i of backlog.items) {
  console.log(
    String(i.score).padEnd(6), i.status.padEnd(9), String(i.scoreBreakdown.volume).padEnd(7),
    String(i.scoreBreakdown.primaryKd ?? "-").padEnd(5), i.slug, `(${i.primaryKeyword})`,
    i.needsClient ? " [needs client]" : "", i.scoreBreakdown.flags.length ? ` {${i.scoreBreakdown.flags.join(",")}}` : "",
  );
}

if (!check) {
  fs.writeFileSync(FILE, JSON.stringify(backlog, null, 2) + "\n");
  console.log("wrote seo/backlog.json");
}
