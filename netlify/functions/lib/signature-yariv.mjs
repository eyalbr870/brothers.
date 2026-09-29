// Yariv's counter-signature, as a base64 PNG.
//
// It lives INSIDE the function bundle, never in public/. A file under public/
// would be a permanently downloadable copy of a real person's signature on a
// predictable URL. Bundled here, it never reaches a browser: the client leaves
// an empty box in the PDF and the server stamps it.
//
// Until the scan arrives, this exports null and the PDF prints the digital
// execution line on its own - the contract is still validly executed, it just
// carries text where the image will go. Replacing this is a one-line change:
//
//   node scripts/contract-signature.mjs ~/Desktop/signature.png
//
// which writes the base64 back into this file.

export const YARIV_SIGNATURE_PNG = null;
