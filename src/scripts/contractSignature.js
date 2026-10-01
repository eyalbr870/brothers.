// Signature pad for the contract page.
//
// Pointer Events only: one code path covers mouse, finger and Apple Pencil.
// Strokes are kept as points (not just pixels) because a rotation or an iOS
// keyboard opening resizes the canvas and wipes its bitmap - we redraw from
// the stroke list instead of losing the signature.

const INK = "#453226"; // --espresso
const LINE_WIDTH = 2.2;
const MIN_POINTS = 12;
const MIN_WIDTH_RATIO = 0.15; // ink narrower than this reads as an accidental dot

export function createSignaturePad(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: false });

  /** @type {Array<Array<{x:number,y:number,t:number}>>} */
  let strokes = [];
  let drawing = null;
  let startedAt = 0;
  const listeners = new Set();

  // Some Androids report devicePixelRatio 4+; past 3 it only inflates the PNG.
  const dpr = () => Math.min(window.devicePixelRatio || 1, 3);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const r = dpr();
    canvas.width = Math.round(rect.width * r);
    canvas.height = Math.round(rect.height * r);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(r, r);
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
    redraw();
  }

  function cssSize() {
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function redraw() {
    const { w, h } = cssSize();
    ctx.clearRect(0, 0, w, h);
    for (const stroke of strokes) drawStroke(stroke);
  }

  // Quadratic curve through segment midpoints - cheap, and much smoother than
  // straight lineTo between raw samples.
  function drawStroke(pts) {
    if (!pts.length) return;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, LINE_WIDTH / 2, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  function pointFrom(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top, t: Date.now() };
  }

  function onDown(ev) {
    if (ev.button != null && ev.button !== 0 && ev.pointerType === "mouse") return;
    ev.preventDefault();
    // Capture so a stroke that leaves the canvas still ends cleanly.
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* not fatal */ }
    if (!startedAt) startedAt = Date.now();
    drawing = [pointFrom(ev)];
    strokes.push(drawing);
    redraw();
    notify();
  }

  function onMove(ev) {
    if (!drawing) return;
    ev.preventDefault();
    // Coalesced events give a much smoother line on 120Hz touchscreens.
    const evs =
      typeof ev.getCoalescedEvents === "function" ? ev.getCoalescedEvents() : [ev];
    for (const e of evs.length ? evs : [ev]) drawing.push(pointFrom(e));
    redraw();
  }

  function onUp(ev) {
    if (!drawing) return;
    try { canvas.releasePointerCapture(ev.pointerId); } catch { /* not fatal */ }
    drawing = null;
    notify();
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onUp);

  // ResizeObserver is the reliable signal here; orientationchange fires before
  // the new size settles. Guarded: it is absent on very old iOS.
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener("resize", resize);
  }
  resize();

  function notify() { for (const fn of listeners) fn(); }

  /** Ink bounding box in CSS pixels, or null when the pad is empty. */
  function bounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of strokes) {
      for (const p of s) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  }

  return {
    clear() {
      strokes = [];
      drawing = null;
      startedAt = 0;
      redraw();
      notify();
    },

    onChange(fn) { listeners.add(fn); },

    get isEmpty() { return strokes.length === 0; },

    /**
     * A stray tap is not a signature. Requires real strokes, enough sampled
     * points, and ink wide enough to be a mark rather than a dot.
     * @returns {"empty"|"short"|null} null when acceptable.
     */
    validity() {
      if (!strokes.length) return "empty";
      const points = strokes.reduce((n, s) => n + s.length, 0);
      if (points < MIN_POINTS) return "short";
      const b = bounds();
      const { w } = cssSize();
      if (!b || (b.maxX - b.minX) < w * MIN_WIDTH_RATIO) return "short";
      return null;
    },

    /** Evidence: proof a human drew this over time. Coordinates stay local. */
    meta() {
      const points = strokes.reduce((n, s) => n + s.length, 0);
      const end = strokes.at(-1)?.at(-1)?.t ?? startedAt;
      return { strokes: strokes.length, points, ms: startedAt ? end - startedAt : 0 };
    },

    /** Trimmed PNG data URL, 8px padding around the ink. Typically 6-20KB. */
    toDataURL() {
      const b = bounds();
      if (!b) return null;
      const pad = 8;
      const r = dpr();
      const w = Math.max(1, b.maxX - b.minX + pad * 2);
      const h = Math.max(1, b.maxY - b.minY + pad * 2);

      const out = document.createElement("canvas");
      out.width = Math.round(w * r);
      out.height = Math.round(h * r);
      const octx = out.getContext("2d");
      octx.scale(r, r);
      octx.translate(-b.minX + pad, -b.minY + pad);
      octx.lineWidth = LINE_WIDTH;
      octx.lineCap = "round";
      octx.lineJoin = "round";
      octx.strokeStyle = INK;
      octx.fillStyle = INK;

      // Same geometry as drawStroke, re-run against the output context.
      for (const stroke of strokes) {
        if (stroke.length === 1) {
          octx.beginPath();
          octx.arc(stroke[0].x, stroke[0].y, LINE_WIDTH / 2, 0, Math.PI * 2);
          octx.fill();
          continue;
        }
        octx.beginPath();
        octx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length - 1; i++) {
          const mx = (stroke[i].x + stroke[i + 1].x) / 2;
          const my = (stroke[i].y + stroke[i + 1].y) / 2;
          octx.quadraticCurveTo(stroke[i].x, stroke[i].y, mx, my);
        }
        const last = stroke[stroke.length - 1];
        octx.lineTo(last.x, last.y);
        octx.stroke();
      }
      return out.toDataURL("image/png");
    },
  };
}
