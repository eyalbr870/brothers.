// Phone carousels for [data-swipe] lists (see global.css). Adds a row of
// progress dots under each list and, the first time a row scrolls into view,
// nudges it sideways so the swipe is discovered rather than guessed at.
// Desktop keeps the plain grid: the dots are hidden there by CSS and the
// nudge only runs at phone width.

const phone = window.matchMedia("(max-width: 760px)");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

function setup(track) {
  const items = [...track.children].filter((el) => !el.hidden);
  if (items.length < 2) return;

  const dots = document.createElement("div");
  dots.className = "swipe-dots";
  dots.setAttribute("aria-hidden", "true");
  dots.innerHTML = items.map(() => "<span></span>").join("");
  dots.firstElementChild.classList.add("is-on");
  track.after(dots);

  // The card that is mostly inside the row is the current one. Observed
  // against the row itself, so this works the same in RTL and LTR.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.intersectionRatio < 0.6) return;
        const at = items.indexOf(e.target);
        [...dots.children].forEach((d, i) => d.classList.toggle("is-on", i === at));
      });
    },
    { root: track, threshold: 0.6 }
  );
  items.forEach((el) => io.observe(el));

  const nudge = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting || !phone.matches) return;
      nudge.disconnect();
      if (reduced.matches) return;
      // Toward the next card: leftward in RTL.
      const d = getComputedStyle(track).direction === "rtl" ? -1 : 1;
      setTimeout(() => {
        track.scrollBy({ left: 64 * d, behavior: "smooth" });
        setTimeout(() => track.scrollBy({ left: -64 * d, behavior: "smooth" }), 650);
      }, 500);
    },
    // Low: a row of review cards can be most of a screen tall.
    { threshold: 0.35 }
  );
  nudge.observe(track);
}

document.querySelectorAll("[data-swipe]").forEach(setup);
