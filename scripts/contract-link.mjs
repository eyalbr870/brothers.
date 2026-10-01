#!/usr/bin/env node
// ============================================================
// contract-link - mint a signed, single-couple contract link.
//
//   npm run contract:link -- --couple "דנה לוי ואורי כהן" --date 2026-06-18 \
//     --venue "אחוזת טל, קיסריה" --guests 300 --total 15000 --deposit 3000 \
//     --services all --signers 2 --pay bit --balance-due event-day \
//     --email dana@example.com --days 30
//
// Missing required flags drop into prompts, so it works either way.
// Flags-first matches the other scripts in this folder (seo-score, aeo-panel).
//
// The link carries the whole deal, HMAC-signed. There is no database: the
// signature is what makes the terms tamper-proof. Edit one character of the
// payload and the page refuses to render anything at all.
// ============================================================

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { signPayload } from "../src/lib/contractToken.js";
import { services as allServices, payMethods, balanceDueOptions } from "../src/data/contract.js";
import { buildDeal } from "../src/lib/contractDeal.js";
import { buildPayload, formatExpDate } from "../src/lib/contractPayload.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROD_BASE = "https://brothers-photography.com";
const LOCAL_BASE = "http://localhost:8888"; // netlify dev, never astro's 4321

// ---------- env ----------
// npm run contract:link uses `node --env-file=.env`. This fallback keeps a
// bare `node scripts/contract-link.mjs` working too, instead of failing with a
// confusing "secret missing".
function loadEnvFallback() {
  if (process.env.CONTRACT_LINK_SECRET) return;
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

// ---------- argv ----------
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    if (eq > -1) {
      out[a.slice(2, eq)] = a.slice(eq + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      out[a.slice(2)] = argv[++i];
    } else {
      out[a.slice(2)] = true;
    }
  }
  return out;
}

const die = (msg) => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
};

// ---------- messages ----------
// The rules themselves live in src/lib/contractPayload.js, shared with the
// /admin endpoint. Only the wording is local: on the command line an error has
// to name the flag that caused it, which is no use to someone filling a form.
const CLI_MESSAGES = {
  "couple.missing": () => "חסר --couple (שם הזוג)",
  "date.format": () => "--date חייב להיות בפורמט YYYY-MM-DD (למשל 2026-06-18)",
  "venue.missing": () => "חסר --venue (מקום האירוע)",
  "total.invalid": () => '--total חייב להיות מספר חיובי (בש"ח, כולל מע"מ)',
  "deposit.invalid": () => "--deposit חייב להיות מספר חיובי",
  "deposit.gtTotal": ({ deposit, total }) =>
    `המקדמה (${deposit}) גדולה מהתמורה הכוללת (${total})`,
  "guests.range": () => "--guests חייב להיות מספר בין 0 ל-2000",
  "pay.invalid": ({ options }) => `--pay חייב להיות אחד מ: ${options.join(" | ")}`,
  "balanceDue.invalid": ({ options }) =>
    `--balance-due חייב להיות אחד מ: ${options.join(" | ")}`,
  "email.invalid": () => "--email אינו כתובת תקינה",
  "services.unknown": ({ id, available }) =>
    `שירות לא מוכר: "${id}"\nזמינים: ${available.join(", ")}`,
  "services.empty": () => "חייב להיכלל לפחות שירות אחד בהסכם",
  "days.invalid": () => "--days חייב להיות מספר",
  "date.past": ({ dateHe }) =>
    `תאריך האירוע (${dateHe}) כבר עבר.\n` +
      "תוקף הקישור נצמד לתאריך האירוע, ולכן הקישור היה נוצר פג-תוקף.\n" +
      "בדקו את --date.",
};

/**
 * One die() on the first problem, as before: a flag typo is fixed one flag at
 * a time, and a wall of errors would bury the first one.
 */
function validate(a) {
  const res = buildPayload(a, { messages: CLI_MESSAGES });
  if (!res.ok) die(Object.values(res.errors)[0]);
  return res.payload;
}

// ---------- interactive ----------
async function prompt(a) {
  const rl = createInterface({ input: stdin, output: stdout });
  const ask = async (q, def) => {
    const ans = (await rl.question(def ? `${q} [${def}]: ` : `${q}: `)).trim();
    return ans || def || "";
  };

  console.log("\n— יצירת קישור חוזה —\n(Enter מקבל את ברירת המחדל)\n");
  a.couple ??= await ask("שם הזוג");
  a.date ??= await ask("תאריך האירוע (YYYY-MM-DD)");
  a.venue ??= await ask("מקום האירוע");
  a.guests ??= await ask("כמות מוזמנים משוערת", "");
  a.total ??= await ask('סה"כ תמורה (₪)');
  a.deposit ??= await ask("מקדמה (₪)");
  a.services ??= await ask(`שירותים (all / רשימה / all,-std)`, "all");
  a.signers ??= await ask("כמה חותמים (1 או 2)", "1");
  a.pay ??= await ask(`אמצעי תשלום (${Object.keys(payMethods).join("/")})`, "bit");
  a["balance-due"] ??= await ask(
    `מועד תשלום היתרה (${Object.keys(balanceDueOptions).join("/")})`,
    "event-day",
  );
  a.email ??= await ask("אימייל הזוג (אפשר להשאיר ריק)", "");
  a.phone ??= await ask("טלפון הזוג (אפשר להשאיר ריק)", "");
  a.days ??= await ask("תוקף הקישור בימים", "30");

  rl.close();
  if (a.guests === "") a.guests = null;
  return a;
}

// ---------- output ----------
function report(deal, url, payload) {
  const expText = formatExpDate(payload.exp);

  const line = "─".repeat(64);
  console.log(`\n${line}`);
  console.log("  הקישור מוכן — הגיהו את הפרטים לפני שליחה");
  console.log(line);
  console.log(`  זוג            ${deal.couple}`);
  console.log(`  תאריך          ${deal.dateHe}`);
  console.log(`  מקום           ${deal.venue}`);
  if (deal.guests != null) console.log(`  מוזמנים        ${deal.guests}`);
  console.log(`  סה"כ תמורה     ₪ ${deal.totalText}`);
  console.log(`  מקדמה          ₪ ${deal.depositText}`);
  console.log(`  יתרה           ₪ ${deal.balanceText}`);
  console.log(`  אמצעי תשלום    ${deal.payMethod}`);
  console.log(`  מועד היתרה     ${deal.balanceDue}`);
  console.log(`  חותמים         ${deal.signers}`);
  console.log(`  אלבומים        ${deal.albumsIncluded ? "כלול בחבילה" : "בתוספת 1,500 ₪"}`);
  console.log(`  שירותים        ${deal.services.length}/${allServices.length}`);
  for (const s of deal.services) console.log(`                 ✓ ${s.label}`);
  if (deal.notes) console.log(`  הערות          ${deal.notes}`);
  console.log(`  תוקף עד        ${expText}`);
  console.log(`  מזהה           ${deal.id}`);
  console.log(line);
  console.log(`\n${url}\n`);

  const wa =
    `היי ${deal.couple.split(" ")[0]}, מצרף את ההסכם לחתימה דיגיטלית לתאריך ${deal.dateHe}.\n` +
    `אפשר לקרוא, למלא ולחתום ישירות מהטלפון:\n${url}\n` +
    `הקישור בתוקף עד ${expText}. כל שאלה — אני כאן.`;
  console.log("הודעת וואטסאפ מוכנה להעתקה:");
  console.log(line);
  console.log(wa);
  console.log(`${line}\n`);

  // macOS convenience: the link is the thing you actually need in the clipboard.
  const cp = spawnSync("pbcopy", { input: url });
  if (cp.status === 0) console.log("✓ הקישור הועתק ללוח\n");
}

// ---------- main ----------
async function main() {
  loadEnvFallback();

  const secret = process.env.CONTRACT_LINK_SECRET;
  if (!secret || secret.length < 32) {
    die(
      "CONTRACT_LINK_SECRET חסר או קצר מ-32 תווים.\n\n" +
        "  יצירת סוד חדש:\n" +
        `    node -e "console.log(crypto.randomBytes(32).toString('hex'))"\n\n` +
        "  ואז הוסיפו אותו ל-site/.env:\n" +
        "    CONTRACT_LINK_SECRET=<הערך>\n\n" +
        "  ואותו ערך ב-Netlify:\n" +
        "    netlify env:set CONTRACT_LINK_SECRET <הערך> --secret --scope functions",
    );
  }

  let a = parseArgs(process.argv.slice(2));

  if (a.help || a.h) {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(2, 16).join("\n"));
    process.exit(0);
  }

  const needsPrompt = !a.couple || !a.date || !a.venue || a.total == null || a.deposit == null;
  if (needsPrompt) a = await prompt(a);

  const payload = validate(a);
  const token = signPayload(payload, secret);

  const base = a.local ? LOCAL_BASE : String(a.base ?? PROD_BASE).replace(/\/+$/, "");
  // Fragment, not query: the token never reaches a server log, an analytics
  // page_location, or a Referer header.
  const url = `${base}/contract/#${token}`;

  const deal = buildDeal(payload);

  if (a.json) {
    console.log(JSON.stringify({ url, id: payload.id, exp: payload.exp, payload }, null, 2));
    return;
  }
  report(deal, url, payload);
}

main().catch((err) => die(err?.message ?? String(err)));
