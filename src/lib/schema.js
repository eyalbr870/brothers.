// Single source of truth for the LocalBusiness JSON-LD.
//
// This lived twice - once in BaseLayout and once in LandingLayout - which is
// how the landing pages ended up emitting a relative `image` URL while the
// homepage emitted an absolute one. Build it here, use it in both.

import site from "@/data/site.js";
import reviews from "@/data/reviews.json";

// reviews.score is out of scoreMax (mit4mit publishes /100); convert to the
// 5-star value schema.org expects.
export const ratingValue =
  Math.round((reviews.score / reviews.scoreMax) * 5 * 10) / 10;

/**
 * Service + Offer markup for the three packages, mirroring the comparison
 * table on the homepage. No price is published (a deliberate business
 * decision), so each Offer carries availability and currency but no value -
 * an Offer with a fabricated or 0 price would be worse than none.
 *
 * @param {string} siteUrl Absolute site root, with trailing slash.
 */
export function packagesServiceSchema(siteUrl) {
  const pkgs = site.finder.packages;
  const tiers = [pkgs.basic, pkgs.classic, pkgs.premium];

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${siteUrl}#photography-service`,
    serviceType: "צילום ווידאו לחתונות ואירועים",
    provider: { "@id": `${siteUrl}#business` },
    areaServed: { "@type": "Country", name: "ישראל" },
    inLanguage: "he-IL",
    offers: tiers.map((t) => ({
      "@type": "Offer",
      name: t.name,
      description: [t.tag, t.guests, ...t.stills].join(". "),
      priceCurrency: "ILS",
      availability: "https://schema.org/InStock",
      // Quoted per event; see the note above on why no price is emitted.
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "ILS",
        valueAddedTaxIncluded: true,
      },
      seller: { "@id": `${siteUrl}#business` },
    })),
  };
}

/**
 * @param {object}  opts
 * @param {string}  opts.siteUrl      Absolute site root, with trailing slash.
 * @param {string}  opts.description  Page-level description.
 * @param {string}  opts.image        ABSOLUTE image URL (relative paths get dropped).
 * @param {boolean} [opts.withReviews] Include individual Review nodes (homepage only -
 *                                     each one must appear as visible text on the page).
 */
export function localBusinessSchema({
  siteUrl,
  description,
  image,
  withReviews = false,
}) {
  const b = site.business;

  // A service-area business has no street address. Emitting the country (plus
  // a base city/region when one is configured) keeps the property valid
  // instead of inventing a storefront.
  const address = {
    "@type": "PostalAddress",
    addressCountry: b.addressCountry,
    ...(b.addressLocality && { addressLocality: b.addressLocality }),
    ...(b.addressRegion && { addressRegion: b.addressRegion }),
  };

  const areaServed = [
    { "@type": "Country", name: "ישראל" },
    ...b.cities.map((name) => ({ "@type": "City", name })),
  ];

  const sameAs = [
    site.contact.instagramUrl,
    reviews.source,
    b.googleBusinessUrl, // "" until the profile URL is filled in
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}#business`,
    name: `${site.brand} - ${site.photographer}`,
    image,
    url: siteUrl,
    description,
    email: site.contact.email,
    telephone: site.contact.phoneIntl,
    priceRange: "$$",
    founder: { "@type": "Person", name: site.photographer },
    address,
    areaServed,
    // Points at the verified Google Business Profile, so the site and the map
    // listing resolve to one entity rather than two.
    ...(b.googleBusinessUrl && { hasMap: b.googleBusinessUrl }),
    ...(b.serviceArea && {
      // Explicitly declares the "we travel to you" model.
      serviceArea: { "@type": "Country", name: "ישראל" },
    }),
    ...(b.openAllHours && {
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "00:00",
        closes: "23:59",
      },
    }),
    sameAs,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue,
      bestRating: 5,
      ratingCount: reviews.count,
    },
    ...(withReviews && {
      review: reviews.reviews.slice(0, 6).map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.name },
        // isoDate is the ISO 8601 form; r.date is the Hebrew string shown on
        // the page. Non-ISO values here are discarded by parsers.
        ...(r.isoDate && { datePublished: r.isoDate }),
        reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
        reviewBody: r.text,
      })),
    }),
  };
}
