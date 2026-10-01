// Israeli ID (תעודת זהות) check digit.
//
// Shared by the signing page and by netlify/functions/contract-sign - the
// client check is a courtesy, the server check is the one that counts. Keep
// this file dependency-free and free of the "@/*" alias: esbuild bundles it
// into the function without Astro's tsconfig paths.

/**
 * @param {string} raw - as typed; spaces, dashes and short forms are tolerated.
 * @returns {boolean} true when the number passes the official check digit.
 */
export function isValidIsraeliId(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  // Shorter numbers are legal and common (older IDs); they are left-padded to
  // 9 before the checksum, which is exactly what the official algorithm does.
  if (digits.length === 0 || digits.length > 9) return false;

  const padded = digits.padStart(9, "0");

  // A padded string of zeros passes the arithmetic but is never a real ID.
  if (/^0+$/.test(padded)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(padded[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9; // same as summing the two digits of the product
    sum += n;
  }
  return sum % 10 === 0;
}

/** Normalised 9-digit form, for storing and printing. */
export function normalizeIsraeliId(raw) {
  return String(raw ?? "").replace(/\D/g, "").padStart(9, "0");
}
