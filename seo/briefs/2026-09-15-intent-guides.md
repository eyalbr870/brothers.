# Brief: intent guides for brothers-photography.com (2026-09-15)

Goal: when an Israeli couple asks Google, ChatGPT or Gemini a wedding-photography question, the
clearest, most quotable answer is on brothers-photography.com. Every page targets one intent
cluster measured in Ahrefs (country `il`, files in `seo/data/ahrefs/2026-09-14/` and
`seo/data/ahrefs/2026-09-15/`).

Read `seo/METHOD.md` §6–§8 and the voice model `src/content/blog/intimate-wedding-photography.md`
before writing.

## Hard rules (a draft that breaks one is rejected)

1. **Facts about Brothers. come only from the FACTS list below.** No venue names, no couple
   names except as quoted from `src/data/reviews.json`, no team members' names beyond Yariv
   Baruch, no numbers of weddings, years, photos or hours beyond what FACTS says, no delivery
   dates more specific than FACTS.
2. **No Brothers. price, ever.** Not a number, not a range, not "starting from". The only price
   figures allowed anywhere are the MARKET figures below, only in the price guide, attributed to
   midrag with the date read.
3. **No invented statistics** ("research shows", "80% of couples"). General professional advice
   is fine, written as advice, not as data.
4. **No competitor names** (studios or photographers), no "הכי זול", no guarantees, no emojis.
5. **Answer-first.** Every H2 is a question or a clear topic in the words couples use. The first
   paragraph under it answers in 2–3 sentences; detail comes after. This is what AI engines lift.
6. **Internal links only to the URLs in LINKS**, as normal markdown links. Never link to
   `/blog/wedding-photographer-price/` (it is a draft and will not exist on the live site).
7. **Natural Hebrew**, the voice of the existing post: "אנחנו" for the studio, warm and concrete,
   short paragraphs, no machine-translation phrasing, no filler openers ("בעולם של היום…"), no
   heavy em-dash use.
8. **Length:** 900–1,400 words of body. **FAQ:** 5–7 items in frontmatter, each answer 1–3
   sentences, consistent with the body, each answer standing on its own.
9. Only create the file you are assigned. Do not edit any other file. Do not run git.

## Frontmatter (exact fields; schema in `src/content/config.ts`)

```yaml
---
title: "…"                 # the H1, natural Hebrew, contains the primary keyword or its question
excerpt: "…"               # ≤ 160 chars
seoTitle: "… | Brothers."  # ≤ 60 chars where possible, primary keyword first
seoDescription: "…"        # ≤ 155 chars, answers the question
coverId: "…"               # the id given in your assignment, nothing else
publishDate: 2026-09-15
keyword: "…"               # primary keyword / main variants
readingMinutes: N
faq:
  - q: "…"
    a: "…"
draft: false               # true ONLY for the price guide
---
```

## FACTS (the only claims allowed about Brothers.)

Source: `public/llms.txt`, `src/data/site.js`, `src/data/landing.js`, `src/data/reviews.json`.

- Brothers. is a wedding photography and video studio led by photographer Yariv Baruch (יריב ברוך).
- Style: natural, documentary and cinematic ("טבעית, דוקומנטרית וקולנועית"); real moments, not staged poses; they guide couples who are not comfortable in front of the camera.
- 9+ years of experience; 400+ weddings documented.
- Rating 4.8 out of 5 from 73 couple reviews on mit4mit (https://www.mit4mit.co.il/biz/100325).
- Serves all of Israel, no travel surcharge: center and Gush Dan, Tel Aviv, Jerusalem, the Sharon, the Shfela, Haifa and the north, Ashdod and Ashkelon, Beer Sheva and the south, to Eilat. Service-area business, no studio address; they come to the couple.
- Three packages (no prices published):
  - **Basic**: one stills photographer for the whole day; suited to up to 100 guests.
  - **Classic** (the popular choice): two stills photographers (the second joins at the peak of the evening); suited to up to 450 guests.
  - **Premium**: two stills photographers for every angle; suited to large events up to 800 guests; with video, two videographers.
- Coverage: from the bride's getting-ready until 01:00, including the dance floor. Hours can be adjusted in advance if the event starts earlier or ends later.
- Video can be added to any package: a cinematic wedding film up to 90 minutes, and a Highlight film of 3–5 minutes ready to share. With video: one videographer usually; for large events a second videographer can be added.
- Stills and video are one coordinated team.
- Deliverables: all photos edited and filtered, in high quality; a digital gallery link to share with friends and family. An initial selection of photos is sent in the days after the wedding; the full gallery arrives within several weeks. The highlight film comes before the full film.
- Add-ons: a set of three printed albums (one 30×80 cm and two 24×50 cm); Save the Date pre-wedding shoot ("מפגש צילום מסוגנן עוד לפני החתונה"). Drone photography is available as an add-on.
- Price is quoted per event by event size, location, type of coverage (stills only or stills + video) and add-ons. No hidden costs, no travel surcharge.
- Booking: recommended 6–12 months ahead, especially for spring/summer season dates and Thursdays; nearer dates are worth checking.
- They are happy to meet or talk before the wedding to align expectations.
- If the date is taken they say so immediately and, where possible, recommend a colleague they trust.
- Also photograph intimate weddings, garden events, outdoor/nature weddings and concept weddings; also business events (conferences, launches, gala evenings).
- Reviews (quote only verbatim from `src/data/reviews.json` if you quote at all, with the first name as given).

## MARKET figures (price guide only; attribute to midrag)

Source: https://www.midrag.co.il/Content/Price/10381, read 2026-09-15 (the page shows no date; extract
in `seo/data/sources/midrag-price-10381-2026-09-15.md`). Quote as "לפי עמוד המחירים של מידרג (נבדק
בספטמבר 2026)" and say figures are indicative, vary by supplier, and may exclude VAT.

- A wedding photographer usually starts from ₪5,000 and can reach ₪11,000 and more.
- An additional stills photographer: ₪1,000–1,500.
- A videographer (edited film + clip): ₪1,500–3,000.
- Special cameras such as a drone: ₪1,000–2,500.
- A large digital album up to ₪1,000; two small albums for parents about ₪800.
- Each additional enlargement: ₪100–400.
- Magnets: ₪800–1,200.
- Couple / trash-the-dress shoots: ₪600–1,200.
- Travel to a distant region (some suppliers): ₪200–300. (Brothers. charges no travel surcharge.)
- Summer months are the busy season.

## LINKS (the only internal links allowed)

| URL | What it is |
|---|---|
| `/` and `/#finder` | Homepage; the package finder quiz |
| `/#contact` | Contact form |
| `/lp/stills/` | Stills photographer for weddings |
| `/lp/video/` | Wedding videographer: film + highlight |
| `/lp/video-stills/` | Stills + video package |
| `/lp/weddings-small/` | Photographer for small/intimate weddings |
| `/lp/weddings-big-center/` | Wedding photographer in the center, large weddings |
| `/lp/weddings-outdoor/` | Outdoor / nature weddings |
| `/lp/weddings-concept/` | Concept weddings |
| `/lp/wedding-photographer-israel/` | Wedding photographer across Israel |
| `/blog/intimate-wedding-photography/` | Guide: small / intimate wedding photography |
| `/blog/wedding-film-vs-clip/` | Guide: wedding film vs highlight clip |
| `/blog/wedding-album-guide/` | Guide: wedding albums |
| `/blog/how-to-choose-wedding-photographer/` | Guide: choosing a wedding photographer |
| `/blog/wedding-day-photography-plan/` | Guide: planning the photography on the day |
| `/blog/pre-wedding-couple-shoot/` | Guide: couple shoots before the wedding |

## Assignments

### 1. `src/content/blog/wedding-photographer-price.md` (draft: true)
- **coverId:** `YB-172`
- **Primary:** כמה עולה צלם לחתונה. Cluster (vol/mo): צלם חתונות מחיר 150, כמה עולה צלם חתונות 100, כמה עולה צלם לחתונה 100, צלם לחתונה מחיר 90, מחיר צלם לחתונה 80, חבילת צילום חתונה 80, עלות צלם לחתונה 60, צלם לחתונה השוואת מחירים 50, צלמים לחתונה מחירים 50, צלם וידאו לחתונה מחירים 40, צלם חתונות עד 5000 30, כמה עולה צלם סטילס/וידאו לחתונה 10 each.
- **Must answer:** the typical market range and what moves it (guests → number of photographers, video, drone, albums, magnets, season, travel); how to compare quotes line by line (what is included, hours covered, number of photographers, delivery, albums, VAT); stills only vs stills + video; red flags in a very cheap quote (as advice). Say plainly that Brothers. quotes per event and publishes no price, and invite them to get a quote (`/#contact`) or use the finder (`/#finder`).
- **Links:** `/#finder`, `/lp/video-stills/`, `/lp/stills/`, `/blog/wedding-album-guide/`, `/blog/how-to-choose-wedding-photographer/`.

### 2. `src/content/blog/wedding-film-vs-clip.md`
- **coverId:** `cYB-902`
- **Primary:** קליפ חתונה / סרט חתונה. Cluster: קליפ חתונה 350 (KD 0), צלם וידאו לחתונה 150, צלמי וידאו לחתונה 70, סרט חתונה 50, קליפ חתונה מרגש 40, קליפ חתונה מקורי 40, צילום וידאו חתונה 10.
- **Must answer:** what a full wedding film is vs a highlight clip (Brothers.: film up to 90 min, highlight 3–5 min); do you need a videographer if you have a stills photographer; one or two videographers; what makes a clip moving (real sound: vows, speeches, laughter; pacing; music) as advice; when you get each (highlight first, full film after, per FACTS); how stills and video work together without getting in each other's frame. (Note: "קליפ חתונה" searches also include clips made by friends; one short section can mention that the videographer's clip is different from a friends' clip.)
- **Links:** `/lp/video/`, `/lp/video-stills/`, `/blog/wedding-day-photography-plan/`, `/blog/intimate-wedding-photography/`.

### 3. `src/content/blog/wedding-album-guide.md`
- **coverId:** `cYB-505`
- **Primary:** אלבום חתונה. Cluster: אלבום חתונה 500 (KD 0), אלבום דיגיטלי חתונה 150, אלבום חתונה לדוגמא 150, עיצוב אלבום חתונה 150, אלבום חתונה מעוצב 150, אלבום חתונה דיגיטלי 90, הדפסת אלבום חתונה 90, אלבום תמונות חתונה 90, עיצוב אלבום חתונה דיגיטלי 80, אלבום חתונה דיגיטלי מעוצב 70, שיתוף תמונות חתונה 50, אלבום חתונה ייחודי 30, כמה תמונות יש באלבום חתונה 10.
- **Must answer:** what "אלבום דיגיטלי" means in Israel (a designed printed album laid out digitally, vs a digital gallery online); printed album vs online gallery and why couples want both; how photos are chosen for an album and how to approach the selection (as advice, no invented photo counts for Brothers.; say the number depends on album size and design); album sizes and parents' albums (Brothers.' set: one 30×80, two 24×50 cm, as an add-on); sharing wedding photos with family (the digital gallery link); tips for designing a timeless album. No prices in this guide.
- **Links:** `/lp/stills/`, `/#finder`, `/blog/how-to-choose-wedding-photographer/`, `/blog/pre-wedding-couple-shoot/`.

### 4. `src/content/blog/how-to-choose-wedding-photographer.md`
- **coverId:** `YB-1433`
- **Primary:** איך בוחרים צלם חתונות / צלמים מומלצים לחתונה. Cluster: צלמים מומלצים לחתונה 100 (KD 6), צלם חתונות מומלץ 80 (KD 3), צלמי חתונות מומלצים 70 (KD 3), צלם חתונות מקצועי 50, צלם מומלץ לחתונה 10.
- **Must answer:** a practical checklist: look at a full album from one wedding, not a highlight reel; consistent style (natural/documentary vs staged); where to read real reviews (mit4mit, Google) and how to read them; chemistry and a pre-wedding call; exact questions to ask (who actually shoots, how many photographers for your guest count, hours covered, what is delivered and when, backup equipment, albums, video coordination, travel costs); red flags; when to book (6–12 months). Mention Brothers.' own mit4mit rating as a fact, once, without boasting.
- **Links:** `/lp/wedding-photographer-israel/`, `/blog/wedding-day-photography-plan/`, `/blog/wedding-film-vs-clip/`, `/blog/wedding-album-guide/`, `/#contact`.

### 5. `src/content/blog/wedding-day-photography-plan.md`
- **coverId:** `cYB-823`
- **Primary:** לוח זמנים ליום החתונה (צילום). Cluster: לוח זמנים ליום החתונה 30; plus the questions couples ask assistants: כמה צלמים צריך לחתונה, מתי לסגור צלם, כמה זמן לוקח לקבל את התמונות.
- **Must answer:** a sample photography timeline for an Israeli wedding (getting ready, couple photos, family photos, reception/קבלת פנים, chuppah, dance floor, until 01:00) as a typical flow, clearly "for example"; how many photographers by guest count (map to Basic ≤100 one photographer, Classic ≤450 two with the second joining at the evening's peak, Premium ≤800 two stills and two video with video); golden-hour couple photos (advice); family photo list (advice); what to tell the photographer beforehand; when photos arrive (initial selection in days, full gallery within several weeks); booking 6–12 months ahead.
- **Links:** `/#finder`, `/lp/weddings-big-center/`, `/lp/weddings-small/`, `/blog/how-to-choose-wedding-photographer/`, `/blog/wedding-film-vs-clip/`.

### 6. `src/content/blog/pre-wedding-couple-shoot.md`
- **coverId:** `YB-807`
- **Primary:** צילומי זוגיות לפני החתונה. Cluster: צילומי זוגיות 100 (KD 0), צילומי טראש 100 (KD 0), צילומי זוגיות בים 70, צילומי טראש רעיונות 60, צילומי זוגיות בחורף 40, צילומי save the date 40, צילומי זוגיות לפני החתונה 20.
- **Must answer:** what a couple shoot / Save the Date shoot is and why it helps on the wedding day (getting used to the camera and the photographer); the difference between a Save the Date shoot, a couple shoot and a trash-the-dress shoot (trash is after the wedding, in the dress); location ideas (sea, nature, city, winter) as ideas, with golden-hour timing; what to wear; how the photos get used (Save the Date invitation, the wedding day, the album). Brothers. offers a Save the Date pre-wedding shoot as an add-on (FACTS); do NOT claim they offer trash-the-dress shoots.
- **Links:** `/lp/weddings-outdoor/`, `/lp/weddings-concept/`, `/#finder`, `/blog/wedding-album-guide/`, `/blog/wedding-day-photography-plan/`.

## Self-check before you finish

Print a list of every number in your file (digits and Hebrew number words that state a fact) with its
source line from FACTS or MARKET. Anything without a source gets removed.
