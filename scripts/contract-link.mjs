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
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { signPayload } from "../src/lib/contractToken.js";
import { services as allServices, payMethods, balanceDueOptions } from "../src/data/contract.js";
import { buildDeal, formatDateHe } from "../src/lib/contractDeal.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROD_BASE = "https://brothers-photography.com";
const LOCAL_BASE = "http://localhost:8888"; // netlify dev, never astro's 4321
const MAX_DAYS = 90;

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

// ---------- services ----------
const SERVICE_IDS = allServices.map((s) => s.id);

/** "all" | "a,b,c" | "all,-std,-albums" */
function parseServices(spec) {
  const raw = String(spec ?? "all").trim();
  if (!raw) return [...SERVICE_IDS];

  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  let set = new Set();

  for (const part of parts) {
    if (part === "all") {
      set = new Set(SERVICE_IDS);
    } else if (part.startsWith("-")) {
      const id = part.slice(1);
      if (!SERVICE_IDS.includes(id)) die(`שירות לא מוכר: "${id}"\nזמינים: ${SERVICE_IDS.join(", ")}`);
      set.delete(id);
    } else {
      if (!SERVICE_IDS.includes(part)) die(`שירות לא מוכר: "${part}"\nזמינים: ${SERVICE_IDS.join(", ")}`);
      set.add(part);
    }
  }
  if (!set.size) die("חייב להיכלל לפחות שירות אחד בהסכם");
  // keep the contract's own row order
  return SERVICE_IDS.filter((id) => set.has(id));
}

// ---------- validation ----------
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? "")) && !Number.isNaN(Date.parse(s));
const isEmail = (s) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s));

function buildPayload(a) {
  const couple = String(a.couple ?? "").trim();
  if (!couple) die("חסר --couple (שם הזוג)");

  const date = String(a.date ?? "").trim();
  if (!isDate(date)) die("--date חייב להיות בפורמט YYYY-MM-DD (למשל 2026-06-18)");

  const venue = String(a.venue ?? "").trim();
  if (!venue) die("חסר --venue (מקום האירוע)");

  const total = Math.round(Number(a.total));
  const deposit = Math.round(Number(a.deposit));
  if (!Number.isFinite(total) || total <= 0) die('--total חייב להיות מספר חיובי (בש"ח, כולל מע"מ)');
  if (!Number.isFinite(deposit) || deposit <= 0) die("--deposit חייב להיות מספר חיובי");
  if (deposit > total) die(`המקדמה (${deposit}) גדולה מהתמורה הכוללת (${total})`);

  const guests = a.guests == null ? null : Math.round(Number(a.guests));
  if (guests != null && (!Number.isFinite(guests) || guests < 0 || guests > 2000)) {
    die("--guests חייב להיות מספר בין 0 ל-2000");
  }

  const payMethod = String(a.pay ?? "bit").trim();
  if (!(payMethod in payMethods)) {
    die(`--pay חייב להיות אחד מ: ${Object.keys(payMethods).join(" | ")}`);
  }

  const balanceDue = String(a["balance-due"] ?? "event-day").trim();
  if (!(balanceDue in balanceDueOptions)) {
    die(`--balance-due חייב להיות אחד מ: ${Object.keys(balanceDueOptions).join(" | ")}`);
  }

  const signers = Number(a.signers ?? 1) === 2 ? 2 : 1;

  const email = String(a.email ?? "").trim();
  if (!isEmail(email)) die("--email אינו כתובת תקינה");

  const services = parseServices(a.services);

  // Expiry: requested days, capped at 90, and never past the wedding itself -
  // a link that still works after the event is a liability, not a convenience.
  const days = Math.min(Number(a.days ?? 30), MAX_DAYS);
  if (!Number.isFinite(days)) die("--days חייב להיות מספר");
  const now = Date.now();
  const byDays = now + days * 86400000;
  const eventEnd = Date.parse(`${date}T23:59:59+03:00`);

  // Because expiry is clamped to the event date, a past date would mint a link
  // that is dead on arrival - and silently, since the payload itself is valid.
  // Refuse instead of handing over a link that shows "פג תוקף" to the couple.
  if (eventEnd <= now) {
    die(
      `תאריך האירוע (${formatDateHe(date)}) כבר עבר.\n` +
        "תוקף הקישור נצמד לתאריך האירוע, ולכן הקישור היה נוצר פג-תוקף.\n" +
        "בדקו את --date.",
    );
  }

  const exp = Math.floor(Math.min(byDays, eventEnd) / 1000);

  const id = `c_${date.replace(/-/g, "")}_${randomBytes(3).toString("hex")}`;

  return {
    v: 1,
    id,
    iat: Math.floor(now / 1000),
    exp,
    couple,
    date,
    venue,
    guests,
    total,
    deposit,
    services,
    signers,
    payMethod,
    balanceDue,
    notes: String(a.notes ?? "").trim(),
    email,
    phone: String(a.phone ?? "").trim(),
  };
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
  const expDate = new Date(payload.exp * 1000);
  const expText = `${String(expDate.getDate()).padStart(2, "0")}/${String(
    expDate.getMonth() + 1,
  ).padStart(2, "0")}/${expDate.getFullYear()}`;

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

  const payload = buildPayload(a);
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
