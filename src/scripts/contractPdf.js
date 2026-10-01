// Builds the A4 print sheet and rasterises it, page by page.
//
// Why the browser draws the PDF and not the server: pdf-lib and pdfkit have no
// BIDI. This contract is full of mixed runs - ₪ 15,000, 18:30, 90 דק׳, DSLR,
// Save the Date, 30×80 ס"מ - and hand-reversing those is the single largest
// source of silent "the contract reads backwards" bugs. The browser has
// already solved BIDI, shaping and line breaking, using this site's own
// self-hosted fonts. We photograph its answer; the function staples the
// photographs into a PDF and stamps the counter-signature.
//
// The fonts being same-origin is what keeps the canvas untainted, so
// toDataURL works. A Google-Fonts site would need CORS gymnastics here.

import { header, servicesTable, ui } from "@/data/contract.js";

const PAGE_W = 794; // A4 @ 96dpi
const PAGE_H = 1123;
const PAD_Y = 56; // must match .pdf-page padding in contract-print.css
const PAD_X = 54;
const SAFETY = 12; // absorbs sub-pixel rounding rather than clipping a line
const CONTENT_H = PAGE_H - PAD_Y - 64 - SAFETY;

// Netlify's sync request cap is 6MB and counts the base64, not the bytes.
const SOFT_LIMIT = 4_500_000;
const HARD_LIMIT = 5_000_000;

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ltr = (s) => `<span class="pdf-ltr">${esc(s)}</span>`;

// ---------------------------------------------------------------- blocks
function headerBlock() {
  const b = el("div", "pdf-head");
  b.append(el("div", "pdf-head__brand", esc(header.brandLine)));
  b.append(el("div", "pdf-head__title", esc(header.title)));
  return b;
}

function detailsBlock(deal, form) {
  const rows = [
    ["שם הזוג", deal.couple],
    ["תאריך האירוע", deal.dateHe],
    ["מקום האירוע (אולם / גן אירועים)", deal.venue],
    ["כמות מוזמנים משוערת", form.guests || (deal.guests ?? "—")],
  ];
  const t = el("table", "pdf-details");
  t.innerHTML = `<tbody>${rows
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join("")}</tbody>`;
  return t;
}

function servicesBlock(deal) {
  const wrap = el("div");
  wrap.append(el("div", "pdf-h2", esc(servicesTable.eyebrow)));
  const t = el("table", "pdf-svc");
  t.innerHTML =
    `<thead><tr><th>${esc(servicesTable.colService)}</th>` +
    `<th class="qty">${esc(servicesTable.colQty)}</th></tr></thead>` +
    `<tbody>${deal.services
      .map((s) => `<tr><td>${esc(s.label)}</td><td class="qty">✓</td></tr>`)
      .join("")}</tbody>` +
    `<tfoot><tr><th>${esc(servicesTable.totalLabel)}</th>` +
    `<td class="qty">${ltr(`₪ ${deal.totalText}`)}</td></tr></tfoot>`;
  wrap.append(t);
  if (deal.notes) wrap.append(el("div", "pdf-note", esc(deal.notes)));
  return wrap;
}

/**
 * Clauses come from the LIVE page, already filled and already resolved (8.2's
 * variant picked, hidden service rows dropped). Cloning is what guarantees the
 * PDF says exactly what the couple read - not a second rendering that could
 * drift from it.
 */
function clauseBlocks() {
  const out = [];
  for (const section of document.querySelectorAll(".doc .clause")) {
    const b = el("div", "pdf-clause");
    const num = section.querySelector(".clause__num")?.textContent ?? "";
    const title = section.querySelector(".clause__title")?.textContent.trim() ?? "";
    b.append(el("div", "pdf-clause__title", `<span>${esc(num)}</span> ${esc(title.replace(num, "").trim())}`));

    for (const li of section.querySelectorAll(".clause__item")) {
      const n = li.querySelector(".clause__n")?.textContent ?? "";
      // innerText, not textContent: it respects `hidden`, so the unused
      // clause 8.2 variant does not sneak into the PDF.
      const textEl = li.querySelector(".clause__text");
      const text = (textEl?.innerText ?? "").replace(/\s+/g, " ").trim();
      const item = el("div", "pdf-clause__item");
      item.append(el("div", "pdf-clause__n", esc(n)));
      item.append(el("div", "", esc(text)));
      b.append(item);
    }
    out.push(b);
  }
  return out;
}

function signatureBlock(deal, form, signatures) {
  const wrap = el("div", "pdf-sign");
  wrap.append(el("div", "pdf-sign__witness", esc(header.witness)));

  const today = new Date();
  const dateText = `${String(today.getDate()).padStart(2, "0")}/${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}/${today.getFullYear()}`;

  const signer = (name, id, png) =>
    `<div class="pdf-sign__ink">${png ? `<img src="${png}" alt="" />` : ""}</div>` +
    `<div class="pdf-sign__who"><strong>${esc(name)}</strong><br>` +
    `<span>ת.ז. ${ltr(id)}</span></div>`;

  const clients =
    `<div class="pdf-sign__label">${esc(header.clientsSignLabel)}</div>` +
    signer(form.nameA, form.idA, signatures.a) +
    (deal.signers === 2
      ? `<div style="height:10px"></div>${signer(form.nameB, form.idB, signatures.b)}`
      : "") +
    `<div class="pdf-sign__digital">${esc(header.dateLabel)}: ${ltr(dateText)}</div>`;

  // The box the server stamps Yariv's scanned signature into. Left empty here
  // on purpose: the client must never hold a copy of his signature.
  const provider =
    `<div class="pdf-sign__label">${esc(header.providerSignLabel)}</div>` +
    `<div class="pdf-sign__ink" data-countersign></div>` +
    `<div class="pdf-sign__digital">${esc(ui.signature.digitalNote)}<br>` +
    `${esc(ui.signature.docIdLabel)}: ${ltr(deal.id)}<br>` +
    `${esc(header.dateLabel)}: ${ltr(dateText)}</div>`;

  const row = el("div", "pdf-sign__row");
  row.append(el("div", "pdf-sign__col", clients));
  row.append(el("div", "pdf-sign__col", provider));
  wrap.append(row);
  return wrap;
}

function evidenceBlock(deal, form, meta) {
  const marketing = form.marketingOptOut ? ui.consent.marketingNo : ui.consent.marketingYes;
  const lines = [
    `<strong>${esc(marketing)}</strong>`,
    `אישור קריאה: הזוג סימן שקרא את ההסכם במלואו.`,
    `זמן שהייה בעמוד: ${ltr(Math.round((meta.dwellMs ?? 0) / 1000) + "s")}` +
      (meta.readEndMs != null
        ? ` · הגעה לסוף ההסכם: ${ltr(Math.round(meta.readEndMs / 1000) + "s")}`
        : ""),
    `אימייל: ${ltr(form.email)} · טלפון: ${ltr(form.phone)}`,
    form.albumAddress ? `כתובת למשלוח אלבומים: ${esc(form.albumAddress)}` : "",
    form.songs ? `העדפת שירים: ${esc(form.songs)}` : "",
    form.notes ? `הערות הזוג: ${esc(form.notes)}` : "",
    `${esc(header.closing)}`,
  ].filter(Boolean);
  return el("div", "pdf-eviq", lines.map((l) => `<div>${l}</div>`).join(""));
}

// ---------------------------------------------------------------- paginate
/**
 * Fill fixed-height pages with atomic blocks, breaking BEFORE a block that
 * would overflow. Slicing one tall canvas instead would cut through glyphs
 * mid-line; this way a clause is never split across a page.
 */
function paginate(root, blocks) {
  const pages = [];
  let page = null;
  let used = 0;

  // getBoundingClientRect EXCLUDES margins, and every block here has a bottom
  // margin. Measuring without them under-counts by ~14px per block, which over
  // a page of clauses silently overflows the last one past the page edge.
  const outerHeight = (node) => {
    const cs = getComputedStyle(node);
    return (
      node.getBoundingClientRect().height +
      (parseFloat(cs.marginTop) || 0) +
      (parseFloat(cs.marginBottom) || 0)
    );
  };

  const newPage = () => {
    page = el("div", "pdf-page");
    root.append(page);
    pages.push(page);
    used = 0;
  };
  newPage();

  for (const block of blocks) {
    page.append(block);
    const h = outerHeight(block);

    if (used + h > CONTENT_H && used > 0) {
      block.remove();
      newPage();
      page.append(block);
      used = outerHeight(block);
    } else {
      used += h;
    }
  }

  pages.forEach((p, i) => {
    p.append(el("div", "pdf-page__num", `${i + 1} / ${pages.length}`));
  });
  return pages;
}

// ---------------------------------------------------------------- capture
async function ensureFonts() {
  // Skipping this is the number one cause of a PDF rendered in Times New Roman:
  // html2canvas clones the DOM into an iframe and paints whatever is ready.
  try {
    await Promise.all([
      document.fonts.load('600 16px "Frank Ruhl Libre"'),
      document.fonts.load('400 14px "Assistant"'),
      document.fonts.load('600 14px "Assistant"'),
      document.fonts.load('600 10px "Montserrat"'),
    ]);
    await document.fonts.ready;
  } catch {
    /* Font loading API missing: the page's own @font-face still applies. */
  }
}

/**
 * Every rule the page has already parsed, as one string. html2canvas clones
 * the DOM into an iframe, and the cloned <link rel=stylesheet> tags download
 * the CSS AGAIN - on a real phone network the capture fires before they
 * arrive, and the couple's PDF comes out as unstyled Times New Roman with a
 * half-page signature. (Reproduced with 600ms latency; localhost never shows
 * it.) Handing the clone the rules inline removes the race entirely.
 */
function inlineCss() {
  let css = "";
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) css += rule.cssText + "\n";
    } catch {
      /* cross-origin sheet: unreadable, and nothing on this page needs one */
    }
  }
  return css;
}

async function onclone(cssText, doc) {
  doc.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => n.remove());
  const style = doc.createElement("style");
  style.textContent = cssText;
  doc.head.append(style);
  // The @font-face rules just arrived with the inline sheet, so the clone's
  // fonts are only now starting to load. The files are in memory cache.
  try {
    await Promise.all([
      doc.fonts.load('600 16px "Frank Ruhl Libre"'),
      doc.fonts.load('400 14px "Assistant"'),
      doc.fonts.load('600 14px "Assistant"'),
      doc.fonts.load('600 10px "Montserrat"'),
    ]);
    await doc.fonts.ready;
  } catch {
    /* falls back to Arial, still laid out correctly */
  }
  // Last line of defence: refuse to photograph a sheet the print CSS never
  // reached. A failed submit the couple can retry beats a broken contract in
  // Yariv's inbox.
  const sheet = doc.querySelector(".pdf-page");
  if (sheet && doc.defaultView.getComputedStyle(sheet).paddingTop !== `${PAD_Y}px`) {
    throw new Error("unstyled");
  }
}

async function capture(html2canvas, pages, { scale, quality }) {
  const cssText = inlineCss();
  const out = [];
  for (const page of pages) {
    // One capture per A4 page keeps each canvas around 3.5M pixels. A single
    // tall canvas for the whole contract would be ~35M and blow past iOS
    // Safari's canvas area limit.
    const canvas = await html2canvas(page, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: PAGE_W,
      height: PAGE_H,
      windowWidth: PAGE_W,
      onclone: (doc) => onclone(cssText, doc),
    });
    out.push(canvas.toDataURL("image/jpeg", quality).split(",")[1]);
  }
  return out;
}

const totalBytes = (pages) => pages.reduce((n, p) => n + p.length, 0);

// ---------------------------------------------------------------- public
/**
 * @returns {{pages: string[], counterSignBox: {page:number,x:number,y:number,w:number,h:number}}}
 *   `pages` are base64 JPEGs. `counterSignBox` is the normalised rect the
 *   server draws Yariv's signature into, plus which page it lives on.
 */
export async function renderContractPages({ deal, form, signatures, meta = {} }) {
  const { default: html2canvas } = await import("html2canvas-pro");

  document.querySelector(".pdf-doc")?.remove();
  const root = el("div", "pdf-doc");
  document.body.append(root);

  try {
    const signBlock = signatureBlock(deal, form, signatures);
    const blocks = [
      headerBlock(),
      detailsBlock(deal, form),
      servicesBlock(deal),
      ...clauseBlocks(),
      signBlock,
      evidenceBlock(deal, form, meta),
    ];

    const pages = paginate(root, blocks);
    await ensureFonts();

    // Where the counter-signature goes, as a fraction of its page - so the
    // server can place it without knowing our pixel scale.
    const inkEl = signBlock.querySelector("[data-countersign]");
    const inkRect = inkEl.getBoundingClientRect();
    const ownerPage = inkEl.closest(".pdf-page");
    const pageRect = ownerPage.getBoundingClientRect();
    const counterSignBox = {
      page: pages.indexOf(ownerPage),
      x: (inkRect.left - pageRect.left) / pageRect.width,
      y: (inkRect.top - pageRect.top) / pageRect.height,
      w: inkRect.width / pageRect.width,
      h: inkRect.height / pageRect.height,
    };

    let shots = await capture(html2canvas, pages, { scale: 2, quality: 0.82 });

    // Downscale rather than fail: a long contract on a big-DPR phone can drift
    // over the request limit, and halving the resolution still reads cleanly.
    if (totalBytes(shots) > SOFT_LIMIT) {
      shots = await capture(html2canvas, pages, { scale: 1.5, quality: 0.75 });
    }
    if (totalBytes(shots) > HARD_LIMIT) {
      throw new Error("too-large");
    }

    return { pages: shots, counterSignBox };
  } finally {
    // Keep the sheet around for window.print() but out of the flow; remove it
    // only on failure so a retry rebuilds cleanly.
    root.dataset.built = "1";
  }
}
