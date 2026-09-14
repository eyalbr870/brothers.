# Brothers. — SEO & AEO strategy

- **Phase:** 1, discovery and build (seo/METHOD.md §1)
- **Last strategist run:** 2026-09-14 ([run log](runs/2026-09-14-strategy.md))
- **Seed keywords:** v1 (METHOD §3)

## Where the site stands (2026-09-14)

| Signal | Value | Source |
|---|---|---|
| Ahrefs Domain Rating | 0 | `data/ahrefs/2026-09-14/domain-rating.json` |
| Ranking keywords, Israel (Ahrefs model) | 0 | `data/ahrefs/2026-09-14/metrics.json` |
| Google Search Console | no data: access not granted | — |
| GA4 conversions | no data: page views only, no events | `src/components/Analytics.astro` |
| AI answers (ChatGPT, Gemini) | see [AI answers](#ai-answers) | `panel.json` |

Ahrefs is blind to much of the Hebrew long tail, so these zeros mean "no data", not "ranks for
nothing". The first real read comes from GSC once access is granted.

## The market is small

Monthly searches in Israel (Ahrefs, 2026-09-14):

| Search | Volume | KD |
|---|---|---|
| צלם חתונות | 450 | 39 |
| צלם לחתונה | 200 | 32 |
| צלמי חתונות | 150 | 30 |
| צלם וידאו לחתונה | 150 | 0 |
| Price questions (16 variants) | 800 | 0 |
| City modifiers | 0–40 each | mostly unknown |

The head terms are held by directories (mit4mit, midrag) and the Google local pack. The long
tail (price, video, stills, small weddings, the center) is winnable: small studios rank on it
with DR 0–12.

## Cluster coverage

| Cluster | Searches/mo | Page that owns it | Status |
|---|---|---|---|
| Head: צלם חתונות / צלם לחתונה / צלמי חתונות | 950 | `/` | refresh (long game, mostly GBP) |
| Price: כמה עולה צלם לחתונה… | 800 | none | **blocked**: needs client OK |
| Video: צלם וידאו לחתונה | 150 | `/lp/video/` | refresh: retitle |
| Stills: צלם סטילס לחתונה | 120 | `/lp/stills/` | refresh: retitle |
| Center: צלם חתונות במרכז / צלם לחתונה במרכז | 90 | `/lp/weddings-big-center/` | refresh: retitle now, venue copy later |
| Small weddings: צלם לחתונה קטנה | 70 | `/lp/weddings-small/` + blog post | refresh: fix the overlap |
| Rishon LeZion | 40 | none | **blocked**: needs real venues |
| Ashdod and other cities | 0–10 each | `/lp/weddings-ashdod/` only | parked; keep Ashdod for ads |
| Outdoor, concept, business events | no data | `/lp/weddings-outdoor/`, `/lp/weddings-concept/`, `/lp/business-events/` | no Ahrefs volume; serve paid, not SEO |

## Next up (scored, `npm run seo:score`)

1. **lp-weddings-big-center-retarget** (1.173). "צלם חתונות במרכז" KD 2. A DR-4 studio page sits
   at #2.
2. **lp-stills-retarget** (0.873). 120/mo, KD unknown, SERP not stored by Ahrefs.
3. **price-guide-wedding-photographer-2026** (0.871). 800/mo, KD 0. Blocked on the question
   below.
4. **lp-weddings-small-retarget** (0.775). Decides the overlap between the blog post and the LP.
5. **city-rishon-lezion** (0.673). Blocked on real venues.

## Questions for the client

Every answer unblocks backlog work. None of it goes live without Netanel's read and the
client's merge.

1. **Price guide.** May a Brothers. guide cite typical *market* price ranges for Israel from a
   public source (e.g. midrag.co.il), dated, while saying Brothers. quotes per event and
   publishes no price? This unblocks the biggest winnable cluster (800 searches/mo).
2. **Center venues.** Which halls and gardens in Gush Dan and the Sharon have you shot, with
   real photos? This unblocks unique copy for `/lp/weddings-big-center/`, the page the center
   ads will use.
3. **Rishon LeZion.** Have you shot weddings at venues there? Which ones?
4. **Magnet photos.** Do you offer them? "צלם מגנטים לחתונה" is 200/mo at KD 0.
5. **Religious and Haredi weddings with separate seating.** Do you shoot them? The cluster is
   about 290/mo, and competitors have dedicated pages.
6. **LGBTQ weddings.** Any in the portfolio that the couples would allow showing? 40/mo.
7. **Couple / trash-the-dress shoots**, beyond Save the Date. Competitors' second-biggest
   traffic pages.

## Off-page moves (a person does these; the loop never contacts anyone)

| Move | Why | Source |
|---|---|---|
| Complete the Google Business Profile (category "צלם חתונות", services, photos, posts, review replies) | The local pack shows on the head term, the center term and Rishon; Brothers. is in none of them | serp files |
| Find out how mit4mit's photographer "top" list is chosen | #1 on "צלם חתונות" and "צלם חתונות במרכז", cited by Google's AI Overview. Brothers. already has 73 reviews there. | `serp-צלם-חתונות.json` |
| Merge the three pending review PRs (#9–#11) | Keeps the on-site review count and schema current with mit4mit | repo PRs |
| Listing on engaged.co.il's photographers page | #2 on "צלם חתונות מומלץ", cited in its AI Overview | `serp-צלם-חתונות-מומלץ.json` |
| Presence on midrag.co.il | DR 73; #2 on the head and price terms, the AI Overview's main price source | `serp-כמה-עולה-צלם-לחתונה.json` |
| urbanbridesmag.co.il photographer guides | #1 on "צלם וידאו לחתונה", #3 on price | `serp-צלם-וידאו-לחתונה.json` |

## AI answers

**First panel: 2026-09-14.** Results in `panel.json`; full answers in
`data/panel/2026-09-14-raw.json`.

- **Setup:** 15 buyer prompts (13 Hebrew, 2 English), each asked once.
  - ChatGPT: `gpt-5` with web search, location IL.
  - Gemini: `gemini-3.1-pro-preview` with Google Search grounding.
  - Perplexity wasn't run (no API key).
- **Brothers. was named in 0 of 29 answered runs**, and brothers-photography.com was cited in 0.
  - ChatGPT: 0/15.
  - Gemini: 0/14. One more run failed with a 503 and counts as an error, not a miss.
  - For a DR-0 site this is the expected baseline.
- **Most-cited sources:**

  | Source | Runs citing it (of 29) |
  |---|---|
  | mit4mit.co.il | 14 |
  | midrag.co.il | 10 |
  | luz-weddings.com | 6 |
  | antonmislawsky.com | 5 |
  | engaged.co.il | 5 |
  | easy.co.il | 4 |
  | t.co.il | 4 |
  | bigpicturestories.com | 4 |
  | danielnotcake.com | 4 |

- **What gets a studio named:**
  - **mit4mit's ranking.** ChatGPT's answer for the center listed studios straight from mit4mit's
    photographer top list, each with its mit4mit score and review count.
  - **Business directories for city prompts.** The Ashdod, Jerusalem and South answers cite
    easy.co.il, t.co.il, d.co.il and b144.co.il.
  - **International rankings for English prompts:** mywed.com, topinisrael.com, wedaward.com.
- **The "how to choose" prompt (p13) produced no citations on either engine.** Nobody owns that
  answer, but it has no search volume either, so it stays parked.
- **What this means:** the fastest lever on AI answers is mit4mit, where Brothers. already has 73
  reviews at 4.8, plus directory listings. New pages come second. These moves are in the off-page
  list above and in `backlog.json`.

## Decisions (2026-09-14)

- **No new city pages without demand and real work.** Every city modifier except Rishon
  LeZion measured 0–10 searches/mo.
- **One page per intent.** LPs own the hiring phrasing ("צלם ל…"); blog posts own the question
  phrasing ("כמה / איך / מה"). `/lp/weddings-small/` and the intimate-wedding post are the
  first case.
- **The price guide never states a Brothers. price.** It cites market ranges with a source and
  a date, or it doesn't ship.
- **Head terms are a Google Business Profile and directory problem first,** and a copy problem
  second.
- **Outdoor, concept and business-events LPs** get no SEO investment until a keyword source
  shows demand; they serve ads.
