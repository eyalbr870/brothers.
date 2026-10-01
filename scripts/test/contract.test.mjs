// Fast, dependency-free checks for the security-critical pieces of the
// contract flow. Run: node --env-file=.env scripts/test/contract.test.mjs
//
// These call the Netlify handler directly with a synthetic Request, so they
// need no netlify dev, no network and no Blobs.

import assert from "node:assert/strict";
import { signPayload, verifyToken, downloadToken, checkDownloadToken } from "../../src/lib/contractToken.js";
import { isValidIsraeliId, normalizeIsraeliId } from "../../src/lib/idnumber.js";
import { buildDeal, renderClauses, formatAmount, formatDateHe } from "../../src/lib/contractDeal.js";
import verify from "../../netlify/functions/contract-verify.mjs";

const SECRET = "a".repeat(64);
const OTHER = "b".repeat(64);
let pass = 0;
const t = async (name, fn) => {
  try {
    await fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
};

const future = Math.floor(Date.now() / 1000) + 86400;
const basePayload = {
  v: 1,
  id: "c_20270618_test01",
  exp: future,
  couple: "דנה לוי ואורי כהן",
  date: "2027-06-18",
  venue: "אחוזת טל, קיסריה",
  guests: 300,
  total: 15000,
  deposit: 3000,
  services: ["stills1", "video1", "film", "photos", "gallery"],
  signers: 2,
  payMethod: "bit",
  balanceDue: "event-day",
};

// A unique client IP per run. Without it every synthetic request lands in the
// rate limiter's "unknown" bucket, so the fourth run of the suite within an
// hour starts getting 429s and the tests fail by run order rather than by
// behaviour. (That the counter bites at all is the limiter working.)
const RUN_IP = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;

const post = (body) =>
  new Request("https://x/.netlify/functions/contract-verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nf-client-connection-ip": RUN_IP,
    },
    body: JSON.stringify(body),
  });

console.log("\ntoken");
await t("round-trips a payload", () => {
  const r = verifyToken(signPayload(basePayload, SECRET), [SECRET]);
  assert.equal(r.ok, true);
  assert.equal(r.payload.total, 15000);
});
await t("rejects a tampered payload", () => {
  const tok = signPayload(basePayload, SECRET);
  const [p, s] = tok.split(".");
  // flip one character of the encoded payload
  const flipped = (p[10] === "A" ? "B" : "A");
  const evil = p.slice(0, 10) + flipped + p.slice(11) + "." + s;
  assert.deepEqual(verifyToken(evil, [SECRET]), { ok: false, reason: "invalid" });
});
await t("rejects a tampered signature", () => {
  const tok = signPayload(basePayload, SECRET);
  assert.deepEqual(verifyToken(tok.slice(0, -1) + "X", [SECRET]), { ok: false, reason: "invalid" });
});
await t("rejects a token signed with another secret", () => {
  assert.deepEqual(verifyToken(signPayload(basePayload, OTHER), [SECRET]), { ok: false, reason: "invalid" });
});
await t("accepts the previous secret during rotation", () => {
  assert.equal(verifyToken(signPayload(basePayload, OTHER), [SECRET, OTHER]).ok, true);
});
await t("reports expiry separately from forgery", () => {
  const past = { ...basePayload, exp: Math.floor(Date.now() / 1000) - 10 };
  const r = verifyToken(signPayload(past, SECRET), [SECRET]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "expired");
});
await t("rejects junk, empty and oversized input", () => {
  for (const bad of ["", "no-dot", ".", "a.", ".b", null, undefined, 42, "x".repeat(5000)]) {
    assert.equal(verifyToken(bad, [SECRET]).ok, false);
  }
});
await t("rejects when no usable secret is configured", () => {
  assert.equal(verifyToken(signPayload(basePayload, SECRET), ["short"]).ok, false);
});
await t("download token is secret-bound", () => {
  const dt = downloadToken("c_1", SECRET);
  assert.equal(checkDownloadToken("c_1", dt, [SECRET]), true);
  assert.equal(checkDownloadToken("c_1", dt, [OTHER]), false);
  assert.equal(checkDownloadToken("c_2", dt, [SECRET]), false);
});

console.log("\nisraeli id");
await t("accepts known-valid numbers", () => {
  for (const id of ["039458567", "000000018", "12345674"]) {
    assert.equal(isValidIsraeliId(id), true, id);
  }
});
await t("rejects bad check digits and junk", () => {
  for (const id of ["123456789", "039458568", "", "abc", "0000000000", "000000000"]) {
    assert.equal(isValidIsraeliId(id), false, id);
  }
});
await t("tolerates spaces and dashes, normalises to 9", () => {
  assert.equal(isValidIsraeliId("03-945 8567"), true);
  assert.equal(normalizeIsraeliId("12345674"), "012345674");
});

console.log("\ndeal");
await t("derives balance rather than trusting the link", () => {
  const d = buildDeal({ ...basePayload, balance: 999999 });
  assert.equal(d.balance, 12000);
  assert.equal(d.balanceText, "12,000");
});
await t("keeps the contract's own service order", () => {
  const d = buildDeal({ ...basePayload, services: ["gallery", "stills1", "film"] });
  assert.deepEqual(d.services.map((s) => s.id), ["stills1", "film", "gallery"]);
});
await t("formats amounts identically to the server", () => {
  assert.equal(formatAmount(15000), "15,000");
  assert.equal(formatAmount(1500000), "1,500,000");
  assert.equal(formatDateHe("2027-06-18"), "18/06/2027");
});
await t("fills clause placeholders with the real numbers", () => {
  const d = buildDeal(basePayload);
  const c = renderClauses(d);
  const c11 = c[0].items[0].text;
  assert.ok(c11.includes("15,000"), c11);
  assert.ok(!c11.includes("{{"), "placeholder left unfilled");
  const c22 = c[1].items[1].text;
  assert.ok(c22.includes("12,000") && c22.includes("ביט") && c22.includes("ביום האירוע"), c22);
});
await t("picks clause 8.2 by whether albums are in the package", () => {
  const withAlbums = renderClauses(buildDeal({ ...basePayload, services: [...basePayload.services, "albums"] }));
  const without = renderClauses(buildDeal(basePayload));
  const pick = (cs) => cs.find((c) => c.n === 8).items.find((i) => i.n === "8.2").text;
  assert.ok(pick(withAlbums).includes("כלול בחבילה"));
  assert.ok(pick(without).includes("1,500"));
});

console.log("\nverify endpoint");
process.env.CONTRACT_LINK_SECRET = SECRET;
await t("200 with the deal for a good token", async () => {
  const res = await verify(post({ token: signPayload(basePayload, SECRET) }));
  assert.equal(res.status, 200);
  const b = await res.json();
  assert.equal(b.ok, true);
  assert.equal(b.deal.total, 15000);
  assert.equal(b.clauses.length, 13);
});
await t("401 and NO deal for a forged token", async () => {
  const res = await verify(post({ token: signPayload(basePayload, OTHER) }));
  assert.equal(res.status, 401);
  const b = await res.json();
  assert.equal(b.ok, false);
  assert.equal(b.reason, "invalid");
  assert.equal(b.deal, undefined, "a rejected token must leak no terms");
});
await t("410 for an expired token", async () => {
  const past = { ...basePayload, exp: Math.floor(Date.now() / 1000) - 10 };
  const res = await verify(post({ token: signPayload(past, SECRET) }));
  assert.equal(res.status, 410);
});
await t("405 on GET, 415 on the wrong content-type", async () => {
  const get = await verify(new Request("https://x", { method: "GET" }));
  assert.equal(get.status, 405);
  const form = await verify(
    new Request("https://x", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" }),
  );
  assert.equal(form.status, 415);
});
await t("never caches a response", async () => {
  const res = await verify(post({ token: signPayload(basePayload, SECRET) }));
  assert.equal(res.headers.get("cache-control"), "no-store");
});

console.log(`\n${pass} passed${process.exitCode ? " — WITH FAILURES" : ""}\n`);
