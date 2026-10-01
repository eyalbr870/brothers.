// POST -> clears the session cookie.
//
// Always 200, with or without a session: "you are logged out" is true either
// way, and a 401 here would only tell a prober that a cookie was absent.
//
// Requires `content-type: application/json` like every other POST endpoint
// (guardPost), so the client must send that header even with no body.

import { clearCookie } from "./lib/adminSession.mjs";
import { json, guardPost } from "./lib/http.mjs";

export default async (req) => {
  const bad = guardPost(req, { maxBytes: 2000 });
  if (bad) return bad;

  return json({ ok: true }, 200, { "set-cookie": clearCookie() });
};
