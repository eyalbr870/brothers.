// Helpers to build srcset strings from the generated image manifest.
// Files live at /{dir}/{id}-{w}.{webp,jpg}

export function srcset(item, ext) {
  return item.widths.map((w) => `/${item.dir}/${item.id}-${w}.${ext} ${w}w`).join(", ");
}

// The smallest rendition, used as the <img> src fallback.
export function fallbackSrc(item, ext = "jpg") {
  const w = item.widths[0];
  return `/${item.dir}/${item.id}-${w}.${ext}`;
}

// The largest rendition (lightbox / hero full).
export function largestSrc(item, ext = "jpg") {
  const w = item.widths[item.widths.length - 1];
  return `/${item.dir}/${item.id}-${w}.${ext}`;
}

export function aspect(item) {
  return `${item.width} / ${item.height}`;
}

// Find a gallery item object by its id (e.g. "cYB-823").
export function itemById(manifest, id) {
  return manifest.items.find((i) => i.id === id);
}

// Resolve a photo reference to a manifest item object. Accepts a background
// key ("contact"/"intro"), the hero id, or any gallery item id.
export function resolveItem(manifest, ref) {
  if (!ref) return manifest.hero;
  return (
    manifest.backgrounds[ref] ??
    (manifest.hero.id === ref ? manifest.hero : itemById(manifest, ref)) ??
    manifest.hero
  );
}
