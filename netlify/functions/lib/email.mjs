// The two emails a signed contract produces, and the Resend call that sends
// them. Table-based, inline-styled, dir="rtl" - Gmail and Outlook will not
// load @font-face, so the design assumes Arial and treats Assistant as a
// bonus for the clients that do.
//
// Sent as two separate messages rather than one with two To: addresses. The
// audiences want different content, and a bounce on the couple's address must
// not take Yariv's copy down with it.
//
// PRIVACY: never log a rendered body. These contain two ID numbers.

const BRAND = "#453226";
const ACCENT = "#7d5844";
const SAND = "#e7d7c2";
const CREAM = "#f7f1e8";
const MUTED = "#6b5445";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const FONT = "'Assistant', Arial, Helvetica, sans-serif";

function shell(title, inner) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${SAND};">
${inner}
</table>
<p style="max-width:600px;margin:16px auto 0;font-family:${FONT};font-size:12px;color:${MUTED};text-align:center;">
Brothers Photography · יריב ברוך · 050-819-3737</p>
</td></tr></table></body></html>`;
}

function headerRow(title, sub) {
  return `<tr><td style="padding:26px 28px 18px;border-bottom:1px solid ${SAND};">
<div style="font-family:${FONT};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${ACCENT};">Brothers Photography</div>
<h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:${BRAND};">${esc(title)}</h1>
${sub ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:14px;color:${MUTED};">${esc(sub)}</p>` : ""}
</td></tr>`;
}

function kvTable(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:${FONT};font-size:14px;">
${rows
  .filter(Boolean)
  .map(
    ([k, v]) =>
      `<tr><th align="right" style="padding:7px 10px;border:1px solid ${SAND};background:${CREAM};color:${BRAND};font-weight:600;width:42%;">${esc(k)}</th>
<td align="right" style="padding:7px 10px;border:1px solid ${SAND};color:${BRAND};">${esc(v)}</td></tr>`,
  )
  .join("")}</table>`;
}

/** Operational copy: everything Yariv needs to file the deal and act on it. */
export function yarivEmail({ deal, form, meta, marketingLine }) {
  const inner =
    headerRow(`חוזה נחתם: ${deal.couple}`, `${deal.dateHe} · ${deal.venue}`) +
    `<tr><td style="padding:22px 28px;">
${kvTable([
  ["שם הזוג", deal.couple],
  ["תאריך האירוע", deal.dateHe],
  ["מקום", deal.venue],
  ["מוזמנים (מעודכן)", form.guests || "—"],
  ['סה"כ תמורה', `₪ ${deal.totalText}`],
  ["מקדמה", `₪ ${deal.depositText}`],
  ["יתרה", `₪ ${deal.balanceText}`],
  ["אמצעי תשלום", deal.payMethod],
  ["מועד היתרה", deal.balanceDue],
])}

<h2 style="margin:22px 0 8px;font-family:${FONT};font-size:15px;color:${BRAND};">החותמים</h2>
${kvTable([
  [`${form.nameA}`, `ת.ז. ${form.idA}`],
  deal.signers === 2 ? [`${form.nameB}`, `ת.ז. ${form.idB}`] : null,
  ["טלפון", form.phone],
  ["אימייל", form.email],
])}

<h2 style="margin:22px 0 8px;font-family:${FONT};font-size:15px;color:${BRAND};">שירותים בחבילה</h2>
<ul style="margin:0;padding-inline-start:18px;font-family:${FONT};font-size:14px;color:${BRAND};line-height:1.8;">
${deal.services.map((s) => `<li>${esc(s.label)}</li>`).join("")}
</ul>

<div style="margin:20px 0 0;padding:12px 14px;background:${CREAM};border-inline-start:3px solid ${ACCENT};font-family:${FONT};font-size:13px;color:${BRAND};">
<strong>${esc(marketingLine)}</strong>
</div>

${
  form.albumAddress || form.songs || form.notes
    ? `<h2 style="margin:22px 0 8px;font-family:${FONT};font-size:15px;color:${BRAND};">מה הזוג מילא</h2>
${kvTable([
  form.albumAddress ? ["כתובת למשלוח אלבומים", form.albumAddress] : null,
  form.songs ? ["העדפת שירים", form.songs] : null,
  form.notes ? ["הערות", form.notes] : null,
])}`
    : ""
}

<h2 style="margin:22px 0 8px;font-family:${FONT};font-size:15px;color:${BRAND};">ראיות חתימה</h2>
${kvTable([
  ["מזהה מסמך", deal.id],
  ["נחתם בשעה", meta.signedAt],
  ["גרסת חוזה", meta.contractVersion],
  ["כתובת IP", meta.ip],
  ["מדינה", meta.country || "—"],
  ["דפדפן", meta.ua],
  ["זמן בדף", `${Math.round((meta.dwellMs ?? 0) / 1000)} שניות`],
  ["הגעה לסוף ההסכם", meta.readEndMs != null ? `אחרי ${Math.round(meta.readEndMs / 1000)} שניות` : "—"],
  ["טביעת מסמך (SHA-256)", meta.sha256],
])}

<p style="margin:22px 0 0;font-family:${FONT};font-size:13px;color:${MUTED};">ההסכם החתום מצורף כקובץ PDF, ועותק נשמר בארכיון.</p>
</td></tr>`;

  return {
    subject: `חוזה נחתם: ${deal.couple} — ${deal.dateHe}`,
    html: shell("חוזה נחתם", inner),
    text:
      `חוזה נחתם\n\n${deal.couple}\n${deal.dateHe} · ${deal.venue}\n` +
      `סה"כ ₪${deal.totalText} · מקדמה ₪${deal.depositText} · יתרה ₪${deal.balanceText}\n` +
      `${form.nameA} (${form.idA})${deal.signers === 2 ? ` · ${form.nameB} (${form.idB})` : ""}\n` +
      `${form.phone} · ${form.email}\n${marketingLine}\nמזהה: ${deal.id}\n`,
  };
}

/** Warm copy: what the couple actually needs, with no evidence table. */
export function coupleEmail({ deal, form, testBanner }) {
  const inner =
    (testBanner
      ? `<tr><td style="padding:12px 16px;background:#fff4e5;border-bottom:1px solid #f0d9b5;font-family:${FONT};font-size:13px;color:#8a5a00;">${esc(testBanner)}</td></tr>`
      : "") +
    headerRow("ההסכם שלכם נחתם ✓", `${deal.couple} · ${deal.dateHe}`) +
    `<tr><td style="padding:22px 28px;">
<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.8;color:${BRAND};">
תודה! ההסכם נחתם ונשמר, ועותק מלא מצורף למייל הזה כקובץ PDF.</p>

${kvTable([
  ["תאריך האירוע", deal.dateHe],
  ["מקום", deal.venue],
  ['סה"כ תמורה', `₪ ${deal.totalText}`],
  ["מקדמה (בחתימה)", `₪ ${deal.depositText}`],
  ["יתרה", `₪ ${deal.balanceText}`],
  ["אמצעי תשלום", deal.payMethod],
  ["מועד תשלום היתרה", deal.balanceDue],
])}

<h2 style="margin:24px 0 8px;font-family:${FONT};font-size:15px;color:${BRAND};">מה קורה עכשיו</h2>
<ol style="margin:0;padding-inline-start:18px;font-family:${FONT};font-size:14px;color:${BRAND};line-height:1.9;">
<li><strong>מקדמה</strong> — תשלום המקדמה משריין את התאריך שלכם באופן בלעדי.</li>
<li><strong>שיחת תיאום</strong> — מדייקים שעות, מיקומים וצרכים מיוחדים.</li>
<li><strong>נשארים בקשר</strong> — כל שאלה, בוואטסאפ, בכל שלב.</li>
</ol>

<p style="margin:24px 0 0;font-family:${FONT};font-size:14px;color:${MUTED};line-height:1.8;">
שמרו את ה-PDF אצלכם. לכל שאלה: <a href="tel:+972508193737" style="color:${ACCENT};">050-819-3737</a>
או <a href="https://wa.me/972508193737" style="color:${ACCENT};">וואטסאפ</a>.</p>

<p style="margin:20px 0 0;font-family:Georgia,serif;font-size:15px;color:${BRAND};">
בברכת אירוע מוצלח ומרגש — מחכים ומתרגשים בשבילכם...</p>
</td></tr>`;

  return {
    subject: "ההסכם שלכם נחתם ✓ — Brothers Photography",
    html: shell("ההסכם שלכם נחתם", inner),
    text:
      `ההסכם שלכם נחתם.\n\n${deal.couple}\n${deal.dateHe} · ${deal.venue}\n` +
      `סה"כ ₪${deal.totalText} · מקדמה ₪${deal.depositText} · יתרה ₪${deal.balanceText}\n\n` +
      `עותק מלא מצורף כקובץ PDF.\nBrothers Photography · 050-819-3737\n`,
  };
}

/**
 * Resend over plain fetch - no SDK. It is one POST, Node 20 has global fetch,
 * and that is one fewer dependency for esbuild to bundle.
 */
export async function sendMail({ to, subject, html, text, attachment }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("mail-unconfigured");

  const body = {
    from: process.env.CONTRACT_MAIL_FROM || "Brothers Photography <onboarding@resend.dev>",
    to: [to],
    reply_to: [process.env.CONTRACT_NOTIFY_EMAIL || "yariv70@gmail.com"],
    subject,
    html,
    text,
  };
  if (attachment) body.attachments = [attachment];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Status only - the response can echo recipient addresses.
    throw new Error(`mail-${res.status}`);
  }
  return res.json().catch(() => ({}));
}
