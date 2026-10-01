// Fast, dependency-free checks for the /admin endpoints and the payload rules
// they share with the CLI. Run: npm run admin:test
//
// Like contract.test.mjs these call the Netlify handlers directly with a
// synthetic Request - no netlify dev, no network. Unlike it they do need Blobs,
// so the suite starts @netlify/blobs' own BlobsServer against a temp directory
// and points the client at it. That is the same server `netlify dev` runs, so
// the store code under test is the real store code, unmocked.

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BlobsServer } from "@netlify/blobs/server";
import { setEnvironmentContext } from "@netlify/blobs";

const SECRET = "a".repeat(64);
const OTHER = "b".repeat(64);
const PASSWORD = "correct horse battery staple";
const ORIGIN = "https://deploy-preview-7--brothers.netlify.app";

// ---------------------------------------------------------------- blobs
const dir = await mkdtemp(join(tmpdir(), "brothers-admin-test-"));
const blobs = new BlobsServer({ directory: dir, token: "test-token" });
const { port } = await blobs.start();
setEnvironmentContext({
  edgeURL: `http://localhost:${port}`,
  uncachedEdgeURL: `http://localhost:${port}`,
  token: "test-token",
  siteID: "test-site",
});

process.env.CONTRACT_LINK_SECRET = SECRET;
delete process.env.CONTRACT_LINK_SECRET_PREV;
process.env.CONTRACT_ADMIN_PASSWORD = PASSWORD;

// Imported after the Blobs context is in place. getStore() is called lazily
// inside store.mjs, so this ordering is belt-and-braces rather than required.
const { buildPayload, parseServices, MAX_DAYS } = await import("../../src/lib/contractPayload.js");
const session = await import("../../netlify/functions/lib/adminSession.mjs");
const store = await import("../../netlify/functions/lib/store.mjs");
const { verifyToken } = await import("../../src/lib/contractToken.js");
const login = (await import("../../netlify/functions/admin-login.mjs")).default;
const logout = (await import("../../netlify/functions/admin-logout.mjs")).default;
const create = (await import("../../netlify/functions/admin-create.mjs")).default;
const list = (await import("../../netlify/functions/admin-list.mjs")).default;
const verify = (await import("../../netlify/functions/contract-verify.mjs")).default;

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

// A fresh IP per run keeps the login limiter from failing the suite by run
// order rather than by behaviour (see the same note in contract.test.mjs).
const ip = () => `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
const RUN_IP = ip();

const post = (fn, path, body, { cookie, from = RUN_IP, ct = "application/json" } = {}) =>
  fn(
    new Request(`${ORIGIN}/.netlify/functions/${path}`, {
      method: "POST",
      headers: {
        ...(ct ? { "content-type": ct } : {}),
        "x-nf-client-connection-ip": from,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body ?? {}),
    }),
  );

const get = (fn, path, { cookie } = {}) =>
  fn(
    new Request(`${ORIGIN}/.netlify/functions/${path}`, {
      method: "GET",
      headers: { "x-nf-client-connection-ip": RUN_IP, ...(cookie ? { cookie } : {}) },
    }),
  );

/** "brothers_admin=..." - the Cookie header a browser would send back. */
const asCookie = (setCookie) => String(setCookie).split(";")[0];

const future = "2027-06-18";
const goodBody = {
  couple: "דנה לוי ואורי כהן",
  date: future,
  venue: "אחוזת טל, קיסריה",
  guests: 300,
  total: 15000,
  deposit: 3000,
  services: ["stills1", "video1", "film", "photos", "gallery"],
  signers: 2,
  pay: "bit",
  balanceDue: "event-day",
  notes: "",
  email: "dana@example.com",
  phone: "0501234567",
  days: 30,
};

// ============================================================ payload rules
console.log("\npayload");
await t("builds a payload and an id of the documented shape", () => {
  const r = buildPayload(goodBody);
  assert.equal(r.ok, true);
  assert.match(r.payload.id, /^c_20270618_[0-9a-f]{6}$/);
  assert.equal(r.payload.v, 1);
  assert.equal(r.payload.total, 15000);
  assert.deepEqual(r.payload.services, ["stills1", "video1", "film", "photos", "gallery"]);
});
await t(`caps the link at ${MAX_DAYS} days`, () => {
  const far = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
  const r = buildPayload({ ...goodBody, date: far, days: 900 });
  assert.equal(r.ok, true);
  const days = (r.payload.exp * 1000 - Date.now()) / 86400000;
  assert.ok(days > MAX_DAYS - 1 && days <= MAX_DAYS, `got ${days} days`);
});
await t("clamps expiry to the event date", () => {
  const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const r = buildPayload({ ...goodBody, date: soon, days: 90 });
  assert.equal(r.ok, true);
  assert.equal(r.payload.exp, Math.floor(Date.parse(`${soon}T23:59:59+03:00`) / 1000));
});
await t("refuses a date that has already passed", () => {
  const r = buildPayload({ ...goodBody, date: "2020-06-18" });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors), ["date"]);
  assert.match(r.errors.date, /כבר עבר/);
});
await t("reports every bad field at once, as hebrew text", () => {
  const r = buildPayload({ couple: "", date: "nope", venue: "", total: 0, deposit: -1 });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors), ["couple", "date", "venue", "total", "deposit"]);
  for (const [field, m] of Object.entries(r.errors)) {
    assert.equal(typeof m, "string", field);
    assert.ok(/[֐-׿]/.test(m), `${field}: not hebrew (${m})`);
  }
});
await t("refuses a deposit larger than the total", () => {
  const r = buildPayload({ ...goodBody, total: 100, deposit: 200 });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors), ["deposit"]);
});
await t("rejects an inherited key as a payment method", () => {
  // `"toString" in payMethods` is true; Object.hasOwn is not.
  assert.equal(buildPayload({ ...goodBody, pay: "toString" }).ok, false);
  assert.equal(buildPayload({ ...goodBody, pay: "constructor" }).ok, false);
});
await t("parses services: all, a list, subtraction, an array", () => {
  assert.equal(parseServices("all").services.length, 9);
  assert.deepEqual(parseServices("gallery,stills1,film").services, ["stills1", "film", "gallery"]);
  assert.deepEqual(parseServices("all,-std,-albums").services.includes("std"), false);
  assert.deepEqual(parseServices(["stills1", "photos"]).services, ["stills1", "photos"]);
  assert.equal(parseServices("nope").ok, false);
  assert.equal(parseServices("all,-nope").ok, false);
  assert.equal(parseServices("all,-all").ok, false);
});

// ============================================================ session cookie
console.log("\nsession");
await t("issues a cookie that verifies, with the documented flags", () => {
  const setCookie = session.issue(SECRET);
  assert.match(setCookie, /^brothers_admin=\d+\.[A-Za-z0-9\-_]+; /);
  assert.ok(setCookie.includes("HttpOnly"));
  assert.ok(setCookie.includes("Secure"));
  assert.ok(setCookie.includes("SameSite=Strict"));
  assert.ok(setCookie.includes("Path=/"));
  assert.ok(setCookie.includes(`Max-Age=${session.TTL_SECONDS}`));
  assert.equal(session.verify(asCookie(setCookie), [SECRET]).ok, true);
});
await t("rejects a cookie signed with another secret", () => {
  assert.deepEqual(session.verify(asCookie(session.issue(OTHER)), [SECRET]), { ok: false });
});
await t("rejects a cookie whose exp was edited", () => {
  const value = asCookie(session.issue(SECRET)).split("=")[1];
  const [exp, mac] = value.split(".");
  const stretched = `brothers_admin=${Number(exp) + 86400}.${mac}`;
  assert.deepEqual(session.verify(stretched, [SECRET]), { ok: false });
});
await t("rejects an expired cookie", () => {
  const stale = session.issue(SECRET, Date.now() - (session.TTL_SECONDS + 60) * 1000);
  assert.deepEqual(session.verify(asCookie(stale), [SECRET]), { ok: false });
});
await t("rejects junk, absent and oversized cookies", () => {
  for (const bad of [null, "", "x", "brothers_admin=", "brothers_admin=1", "other=1.2",
    "brothers_admin=abc.def", `brothers_admin=1.${"x".repeat(400)}`]) {
    assert.equal(session.verify(bad, [SECRET]).ok, false, String(bad));
  }
});
await t("accepts the previous secret during rotation", () => {
  assert.equal(session.verify(asCookie(session.issue(OTHER)), [SECRET, OTHER]).ok, true);
});
await t("clearCookie expires it in place", () => {
  const c = session.clearCookie();
  assert.ok(c.startsWith("brothers_admin=;"));
  assert.ok(c.includes("Max-Age=0") && c.includes("HttpOnly") && c.includes("Path=/"));
});

// ============================================================ login / logout
console.log("\nlogin");
await t("401 and no cookie for the wrong password", async () => {
  const res = await post(login, "admin-login", { password: "not it" });
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { ok: false, reason: "auth" });
  assert.equal(res.headers.get("set-cookie"), null);
});
await t("401 identically for a missing or non-string password", async () => {
  for (const body of [{}, { password: null }, { password: 123 }, { password: [PASSWORD] }]) {
    const res = await post(login, "admin-login", body);
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { ok: false, reason: "auth" });
  }
});
await t("200 + a verifying cookie for the right password", async () => {
  const res = await post(login, "admin-login", { password: PASSWORD });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(session.verify(asCookie(res.headers.get("set-cookie")), [SECRET]).ok, true);
});
await t("500 when the admin password is not configured", async () => {
  const saved = process.env.CONTRACT_ADMIN_PASSWORD;
  try {
    for (const bad of [undefined, "short"]) {
      if (bad === undefined) delete process.env.CONTRACT_ADMIN_PASSWORD;
      else process.env.CONTRACT_ADMIN_PASSWORD = bad;
      const res = await post(login, "admin-login", { password: PASSWORD }, { from: ip() });
      assert.equal(res.status, 500);
      assert.deepEqual(await res.json(), { ok: false, reason: "server" });
    }
  } finally {
    process.env.CONTRACT_ADMIN_PASSWORD = saved;
  }
});
await t("405 on GET, 415 on the wrong content-type", async () => {
  const g = await login(new Request(`${ORIGIN}/x`, { method: "GET" }));
  assert.equal(g.status, 405);
  const f = await post(login, "admin-login", { password: PASSWORD }, { ct: "text/plain" });
  assert.equal(f.status, 415);
});
await t("429 after ten attempts from one address", async () => {
  const attacker = ip();
  for (let i = 0; i < 10; i++) {
    const res = await post(login, "admin-login", { password: "guess" }, { from: attacker });
    assert.equal(res.status, 401, `attempt ${i + 1}`);
  }
  // Even the RIGHT password is refused once the budget is gone.
  const res = await post(login, "admin-login", { password: PASSWORD }, { from: attacker });
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { ok: false, reason: "rate" });
  assert.equal(res.headers.get("set-cookie"), null);
});
await t("logout always clears the cookie", async () => {
  const res = await post(logout, "admin-logout", {});
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.ok(res.headers.get("set-cookie").includes("Max-Age=0"));
});

// A session for the rest of the suite.
const COOKIE = asCookie(
  (await post(login, "admin-login", { password: PASSWORD })).headers.get("set-cookie"),
);

// ============================================================ create
console.log("\ncreate");
await t("401 with no session at all", async () => {
  const res = await post(create, "admin-create", goodBody);
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { ok: false, reason: "auth" });
});
await t("401, identically, for a forged and for an expired session", async () => {
  const forged = asCookie(session.issue(OTHER));
  const stale = asCookie(session.issue(SECRET, Date.now() - (session.TTL_SECONDS + 60) * 1000));
  const bodies = [];
  for (const cookie of [forged, stale]) {
    const res = await post(create, "admin-create", goodBody, { cookie });
    assert.equal(res.status, 401);
    bodies.push(JSON.stringify(await res.json()));
  }
  assert.equal(bodies[0], bodies[1], "a forged and an expired session must look the same");
  assert.equal(bodies[0], JSON.stringify({ ok: false, reason: "auth" }));
});
await t("422 with per-field hebrew errors for a bad payload", async () => {
  const res = await post(
    create,
    "admin-create",
    { couple: "", date: "15/06/2027", venue: "", total: -5, deposit: 0, pay: "paypal" },
    { cookie: COOKIE },
  );
  assert.equal(res.status, 422);
  const b = await res.json();
  assert.equal(b.ok, false);
  assert.equal(b.reason, "validation");
  assert.deepEqual(Object.keys(b.errors).sort(), ["couple", "date", "deposit", "pay", "total", "venue"]);
  assert.equal(b.url, undefined, "a rejected payload must mint no link");
});
await t("422 for an empty body rather than a crash", async () => {
  const res = await post(create, "admin-create", {}, { cookie: COOKIE });
  assert.equal(res.status, 422);
  assert.equal((await res.json()).reason, "validation");
});

let minted;
await t("200 with a link, the terms, and the whatsapp message", async () => {
  const res = await post(create, "admin-create", goodBody, { cookie: COOKIE });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  minted = await res.json();
  assert.equal(minted.ok, true);
  assert.match(minted.id, /^c_20270618_[0-9a-f]{6}$/);
  // The request's own origin, so a deploy preview mints preview links.
  assert.ok(minted.url.startsWith(`${ORIGIN}/contract/#`), minted.url);
  // 30 days out, which for a 2027 wedding is well before the clamp bites.
  const d = new Date(minted.exp * 1000);
  const dd = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  assert.equal(minted.expText, dd);
  assert.ok(minted.exp < Date.parse(`${future}T00:00:00+03:00`) / 1000);
  assert.ok(minted.waMessage.includes(minted.url));
  assert.equal(minted.deal.couple, goodBody.couple);
  assert.equal(minted.deal.totalText, "15,000");
  assert.equal(minted.deal.balanceText, "12,000");
  assert.equal(minted.deal.albumsIncluded, false);
  assert.deepEqual(minted.deal.services.map((s) => s.id), goodBody.services);
});
await t("the link is short: a 10-character code, not the token", () => {
  const code = minted.url.split("#")[1];
  assert.match(code, /^[A-Za-z0-9]{10}$/);
  assert.ok(minted.url.length < 70, minted.url);
});
await t("the code resolves to a token that verifies against the link secret", async () => {
  const token = await store.resolveToken(minted.url.split("#")[1]);
  const r = verifyToken(token, [SECRET]);
  assert.equal(r.ok, true);
  assert.equal(r.payload.id, minted.id);
  assert.equal(r.payload.total, 15000);
  assert.equal(verifyToken(token, [OTHER]).ok, false);
});
await t("the real contract-verify handler accepts the minted token", async () => {
  const res = await verify(
    new Request("https://x/.netlify/functions/contract-verify", {
      method: "POST",
      headers: { "content-type": "application/json", "x-nf-client-connection-ip": RUN_IP },
      body: JSON.stringify({ token: minted.url.split("#")[1] }),
    }),
  );
  assert.equal(res.status, 200);
  const b = await res.json();
  assert.equal(b.ok, true);
  assert.equal(b.deal.id, minted.id);
  assert.equal(b.clauses.length, 13);
});
const verifyWith = (token) =>
  verify(
    new Request("https://x/.netlify/functions/contract-verify", {
      method: "POST",
      headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip() },
      body: JSON.stringify({ token }),
    }),
  );
await t("an unknown short code is rejected like a forgery", async () => {
  const res = await verifyWith("ZZZZZZZZZZ");
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { ok: false, reason: "invalid" });
});
await t("a full-length token (links minted before short codes) still verifies", async () => {
  const token = await store.resolveToken(minted.url.split("#")[1]);
  assert.ok(token.includes("."));
  const res = await verifyWith(token);
  assert.equal(res.status, 200);
});
await t("the reply never echoes the couple's email or phone", () => {
  const raw = JSON.stringify(minted);
  assert.ok(!raw.includes(goodBody.email), "email leaked");
  assert.ok(!raw.includes(goodBody.phone), "phone leaked");
  assert.deepEqual(Object.keys(minted.deal).sort(), [
    "albumsIncluded", "balanceDue", "balanceText", "couple", "dateHe", "depositText",
    "guests", "notes", "payMethod", "services", "signers", "totalText", "venue",
  ]);
});

// ============================================================ list
console.log("\nlist");
const ID_NUMBER = "039458567";
await t("401 with no session", async () => {
  const res = await get(list, "admin-list");
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { ok: false, reason: "auth" });
});
await t("405 on POST", async () => {
  const res = await post(list, "admin-list", {}, { cookie: COOKIE });
  assert.equal(res.status, 405);
});
await t("lists the minted link as sent", async () => {
  const res = await get(list, "admin-list", { cookie: COOKIE });
  assert.equal(res.status, 200);
  const b = await res.json();
  assert.equal(b.ok, true);
  const row = b.contracts.find((c) => c.id === minted.id);
  assert.ok(row, "the minted link is missing from the list");
  assert.equal(row.status, "sent");
  assert.equal(row.signedAt, null);
  assert.equal(row.couple, goodBody.couple);
  assert.equal(row.totalText, "15,000");
  assert.deepEqual(Object.keys(row).sort(), [
    "couple", "createdAt", "date", "exp", "id", "signedAt", "status", "totalText", "venue",
  ]);
});
await t("flips to signed once the archive has a record - and leaks nothing from it", async () => {
  // A realistic signed record: this is what the privacy rule is about.
  await store.putRecord(
    minted.id,
    {
      form: {
        nameA: "דנה לוי",
        idA: ID_NUMBER,
        phone: goodBody.phone,
        email: goodBody.email,
        signature: "data:image/png;base64,AAAA",
      },
      deal: { couple: goodBody.couple },
    },
    { couple: goodBody.couple, date: future, signedAt: "2026-10-01T09:00:00.000Z" },
  );

  const res = await get(list, "admin-list", { cookie: COOKIE });
  const raw = await res.text();
  for (const secret of [ID_NUMBER, goodBody.phone, goodBody.email, "signature", "data:image"]) {
    assert.ok(!raw.includes(secret), `admin-list leaked ${secret}`);
  }
  const row = JSON.parse(raw).contracts.find((c) => c.id === minted.id);
  assert.equal(row.status, "signed");
  assert.equal(row.signedAt, "2026-10-01T09:00:00.000Z");
});
await t("marks an unsigned link past its expiry as expired", async () => {
  const id = "c_20200101_aaaaaa";
  await store.putMinted(id, {
    couple: "זוג ותיק",
    date: "2020-01-01",
    venue: "אולם",
    total: 1000,
    deposit: 100,
    exp: Math.floor(Date.now() / 1000) - 10,
    createdAt: "2019-12-01T00:00:00.000Z",
  });
  const b = await (await get(list, "admin-list", { cookie: COOKIE })).json();
  assert.equal(b.contracts.find((c) => c.id === id).status, "expired");
});
await t("newest first", async () => {
  const b = await (await get(list, "admin-list", { cookie: COOKIE })).json();
  const dates = b.contracts.map((c) => c.createdAt);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

// ============================================================ store isolation
console.log("\nstore");
await t("putMinted writes outside the signed-contract archive", async () => {
  const id = "c_20271231_beef01";
  await store.putMinted(id, {
    couple: "זוג",
    date: "2027-12-31",
    venue: "אולם",
    total: 1,
    deposit: 1,
    exp: 1,
    createdAt: new Date().toISOString(),
  });
  const archived = await store.listContracts();
  assert.ok(!archived.includes(id), "a minted link reached the signed archive");
  // ...and contract-list.mjs reads that same archive, so it is unchanged too.
  assert.ok(archived.includes(minted.id), "the signed record is still in the archive");
  assert.ok((await store.listMinted()).some((r) => r.id === id));
});
await t("putMinted stores only the eight metadata fields", async () => {
  const id = "c_20271231_beef02";
  await store.putMinted(id, {
    couple: "זוג",
    date: "2027-12-31",
    venue: "אולם",
    total: 10,
    deposit: 1,
    exp: 1,
    createdAt: "2026-10-01T00:00:00.000Z",
    // everything below must be dropped on the floor
    email: goodBody.email,
    phone: goodBody.phone,
    idA: ID_NUMBER,
    token: "a.b",
  });
  const rec = (await store.listMinted()).find((r) => r.id === id);
  assert.deepEqual(Object.keys(rec).sort(), [
    "couple", "createdAt", "date", "deposit", "exp", "id", "total", "venue",
  ]);
  assert.ok(!JSON.stringify(rec).includes(ID_NUMBER));
});

await blobs.stop();
await rm(dir, { recursive: true, force: true });

console.log(`\n${pass} passed${process.exitCode ? " — WITH FAILURES" : ""}\n`);
