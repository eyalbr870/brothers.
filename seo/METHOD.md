# Brothers. — SEO & AEO engine: the method

The playbook for the growth loops on brothers-photography.com. Every loop reads it at the top of
every run and follows it. People edit this file; loops don't. Where a loop's instinct and this
file disagree, this file wins.

> **Site:** `https://brothers-photography.com`. Hebrew, RTL, Astro on Netlify.
> **Business:** Brothers., wedding photography and video by Yariv Baruch. Service-area business
> covering all of Israel, no studio address.
> **Price:** starting prices are public since 2026-09-16 (PR #14) and live in `public/llms.txt`,
> the package finder and the Service/Offer schema. A page may quote those starting prices, and only
> those; the final price is still quoted per event. Numbers that are not in `public/llms.txt` are
> not published.
> **Engagement:** agency client, scope in Netanel's `agency/clients/brothers/scope.md`.
> North star: qualified inquiries per month (`growth/goals.json`).

---

## 0. The loop

```
weekly   brothers-seo-strategist   research (Ahrefs REST, IL) + GSC when connected
                                    + the AI-answer panel → score → rewrite seo/backlog.json
                                    + seo/strategy.md + run log → PR
weekly   brothers-aeo-panel        re-run seo/panel.json prompts on AI engines (not yet installed)
2×/week  brothers-seo-publisher    top item → Hebrew draft → gate → PR (not yet installed)
weekly   brothers-scorecard        goals.json vs measured data → weekly note draft (not yet installed)
```

**Every loop works on a branch and opens a PR. Nothing is committed to `main`, and nothing is
sent.** Netanel reads every PR; the client merges. `growth/loops.json` is the kill switch: a
loop whose `enabled` is `false` exits in pre-flight.

## 1. Phases

- **Phase 1, discovery and build:** no measured impressions (GSC not connected, or connected
  and showing none), and Ahrefs `org_keywords == 0` for country `il`.
- **Phase 2, measure and refresh:** GSC shows impressions for any page, or Ahrefs
  `org_keywords > 0`.

As of 2026-09-14 the site is **Phase 1**: DR 0, `org_keywords` 0 (il), GSC access not yet granted.
Ahrefs models Google and misses small Hebrew queries, so a 0 means "no data" and never "ranks
for nothing" (§12).

## 2. Audience and topic map

The audience is Israeli couples planning a wedding, searching in Hebrew, usually 6–12 months
ahead. There are two intents:

1. **Hiring:** "צלם חתונות", "צלם לחתונה", service and type modifiers (video, stills, small,
   outdoor, center). These belong to the `/lp/*` pages (`src/data/landing.js`) and the
   homepage.
2. **Researching:** price, how to choose, what's included, timelines. These belong to the blog
   (`src/content/blog/`) and link to the matching `/lp/*` page.

The Hebrew market is small. Measured Ahrefs volumes on 2026-09-14:

| Search | Monthly searches |
|---|---|
| "צלם חתונות" | 450 |
| Price questions, combined | about 700 |
| Most city modifiers | 0–40 |

Win by **owning each cluster with one page**, not by producing many pages. Don't build city
pages without real demand and real work in that city.

## 3. Seed keyword universe (country `il`)

```
צלם חתונות, צלם לחתונה, צלמי חתונות, צילום חתונות,
צלם חתונות מחיר, כמה עולה צלם לחתונה, מחיר צלם לחתונה,
צלם וידאו לחתונה, צלם סטילס לחתונה, צלם לחתונה קטנה,
צלם חתונות במרכז, צלם לחתונה במרכז, צלם חתונות מומלץ,
צלם חתונות ב<עיר> (ראשון לציון, ירושלים, חיפה, באר שבע, אשדוד, נתניה, פתח תקווה, אילת)
```

Expand these with `keywords-explorer/matching-terms`, and record additions in `seo/strategy.md`.

## 4. Competitor set

Taken from the Ahrefs IL SERPs pulled on 2026-09-14 (`seo/data/ahrefs/2026-09-14/`):

- **Directories and aggregators** (compete for "מומלץ" and head terms; better treated as
  placements than as rivals):
  - mit4mit.co.il (DR 69; Brothers. already has a profile with 73 reviews)
  - midrag.co.il (DR 73, price pages)
  - engaged.co.il (DR 28)
  - urbanbridesmag.co.il (DR 54)
  - saveadate.co.il
  - eventsphotographers.co.il
  - prog.co.il
- **Studios that rank:** photoshot.co.il (homepage on "צלם חתונות", city pages), esposa.co.il,
  bereshitebara.com (local pack, price page), canfi.co.il (local pack), dafnatalmon.com (local
  pack), yaniveitan.co.il, kobi-art.com.

## 5. Opportunity scoring (v1, Phase 1)

`npm run seo:score` applies this to every backlog item and writes `score` and `scoreBreakdown`.
**Never hand-compute or hand-edit a score.** Change the inputs and re-run.

```
score = demand × winnability × validation × serp − coverage_penalty

demand            = log10(max(Σ volume of the item's keywords, 10))    Ahrefs IL volumes only
winnability       = KD of primaryKeyword: ≤20 → 1.0 · ≤40 → 0.7 · ≤60 → 0.4 · >60 → 0.15
                    KD unknown (null) → 0.7, flagged kdUnknown
validation        = 1.0 if GSC shows ≥ 5 impressions for the item's page/keywords, else 0.6
serp              = 0.5 if the checked SERP's top 3 organic results are all directories or
                    aggregators (§4), else 1.0; unchecked → 1.0, flagged serpUnchecked
coverage_penalty  = net-new pages only (not lp-refresh/home-refresh edits): 0.5 if a live page already targets the primary keyword
```

- A keyword with volume 0 or null adds nothing to demand. Keep it in `keywords[]` for the record.
- **Items with `needsClient` set are scored but skipped by the publisher** until the client
  answers.

**Statuses:**

| Status | Meaning |
|---|---|
| `todo` | Ready. |
| `blocked` | Waiting on `needsClient`. |
| `refresh` | Edit an existing page in place, never a new file. |
| `in-review` | A PR is open. |
| `published` | Merged and live. |
| `dead` | Dropped. |

## 6. The page contract

- **Blog post:** `src/content/blog/<slug>.md`, schema in `src/content/config.ts`. Required:
  `title`, `excerpt`, `seoTitle`, `seoDescription`, `coverId` (a real manifest id from
  `src/data/gallery.generated.json`; never invent one), `publishDate`, `keyword`. It links to
  the one `/lp/*` page that owns its hiring intent.
- **Landing page:** an object in `src/data/landing.js`, rendered by `src/pages/lp/[slug].astro`.
  A `refresh` edits `seo`, `hero`, `benefits`, `included`, `faq` and `whatsappText` in place,
  never the slug. Ads point at these URLs.
- **Schema** is emitted centrally (`src/lib/schema.js`). Don't hand-add JSON-LD in content.

## 7. Quality bar (Hebrew)

- **Real details only.** Venues, cities, team size, what is included, timelines: every factual
  claim about Brothers. traces to `src/data/site.js`, `public/llms.txt`, a review in
  `src/data/reviews.json`, or a written answer from Yariv. An unverified claim is cut, not
  softened.
- **Only the published starting prices** (see the header), copied from `public/llms.txt`, and
  always framed as "החל מ-" with the final price quoted per event. A guide may also cite *market*
  ranges from a named public source with the date read (e.g. midrag.co.il price pages).
- **No competitor names in copy.** No "הכי זול", no guarantees.
- **Natural Hebrew.** The English humanizer skill doesn't apply, so **Netanel's read is the
  gate**: no machine-translation phrasing, no filler openers.
- **Answer-first structure for AI engines:** the question as an H2, a 2–3 sentence direct answer,
  then detail. FAQ items belong in the page's `faq[]` so they reach the FAQPage schema.

## 8. Internal linking

- **Every blog post links** to its owning `/lp/*` page and to the homepage `#finder`.
- **Every `/lp/*` page is reachable** from the `ServiceLinks` hub.
- **One page per intent.** If a blog post and an LP target the same keyword, the LP owns the
  hiring phrasing ("צלם ל…") and the post owns the question phrasing ("איך / כמה / מה").

## 9. Off-page and AEO

- **AI answers cite directories, review sites and local results.** Placements on the §4
  directories, a complete Google Business Profile and fresh mit4mit reviews move them more than
  another page does.
- **Loops only surface these** (`backlog.json.offPageOpportunities`). A person does the outreach.
- **The panel** (`seo/panel.json`, `npm run aeo:panel`) records, per engine and prompt: whether
  Brothers. is named, whether brothers-photography.com is cited, and which domains are cited.
  Never summarize a run that errored as if it answered.

## 10. Data sources: trust order

1. **Google Search Console** (measured; not connected as of 2026-09-14).
2. **The AI-answer panel** (measured, but one run per prompt is a sample, not a rate; read it
   across prompts).
3. **Ahrefs API v3, country `il`** (modeled; blind to much Hebrew long-tail).
   - Called over REST with `AHREFS_MCP_KEY`, because the Ahrefs MCP server isn't connected in
     local sessions.
   - Use `date` = yesterday.
   - Save every response under `seo/data/ahrefs/<date>/`.
4. GA4 (`G-CR6R4R3H1F`), once the events in the measurement PR exist.

**Real data or nothing.** A number with no saved source reads "no data".

## 11. State files

| File | Owner | What |
|---|---|---|
| `seo/backlog.json` | strategist | The work queue, scored |
| `seo/strategy.md` | strategist | Phase, cluster coverage, decisions, open questions for the client |
| `seo/panel.json` | aeo-panel (the strategist on the first run) | AI-answer baseline |
| `seo/data/ahrefs/<date>/*.json` | strategist | Raw API responses behind every number |
| `seo/runs/<date>-strategy.md` | strategist | The run log |
| `growth/loops.json` | people | Kill switch and schedule per loop |
| `growth/goals.json` | people (numbers filled from measured data) | North star and supporting KPIs |

## 12. Expectations

- **Hebrew wedding search is small and local.** Hundreds of searches a month, not thousands.
- **The local pack** (Google Business Profile) and the directories take most clicks on head
  terms.
- **Organic pages win the long tail:** price, video, stills, small weddings, center.
- **Organic takes months;** Google Search ads (under ₪3,000/mo) carry inquiries in the meantime.
