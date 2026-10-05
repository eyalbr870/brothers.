# Questions for Yariv — the objections the FAQ can't answer yet (2026-09-19)

Send the Hebrew message below as-is (WhatsApp or mail). Everything above the divider is context
for whoever sends it; it is not part of the message.

## Why these

The homepage funnel pass (PR: `funnel/homepage-conversion-2026-09-19`) added an objection-handling
FAQ. Two items shipped because they trace to an approved source; the rest did not, and under
METHOD §7 an unverified claim is cut, not softened — so they are questions, not copy.

**Shipped** (no answer needed):

| Question | Source |
|---|---|
| האם יש תוספת תשלום על נסיעה? | `public/llms.txt` §"שאלות ותשובות קצרות" |
| איך סוגרים את התאריך? | `site.contactSection.thankYou.steps` — already live on the page |

**Blocked.** Each of these is a question couples hesitate on right before sending a form, and each
would sit in `site.faq.items` the day it is answered:

| # | Question | Why it matters |
|---|---|---|
| 1 | Backup equipment | The single most common "what if" in wedding-photography research. Competitors answer it on-page |
| 2 | Weather / outdoor fallback | Already answered for outdoor weddings only (`landing.js` FAQ on `/lp/weddings-outdoor/`). A general answer needs Yariv's words, not a copy-paste from a campaign page |
| 3 | Running past 01:00 | `llms.txt` says hours can be adjusted *in advance* but says nothing about overtime on the night |
| 4 | Cancellation / postponement | The deposit's existence is documented; its terms are not |
| 5 | Delivery in weeks | `llms.txt` says only "מספר שבועות". It must not be turned into "4-6 שבועות" without confirmation |
| 6 | Who actually shoots | `site.about.dnaIntro` says there is a vetted team, but not whether Yariv is always one of the two |

The highest-value three are **1, 2 and 4** — they are the objections that stop a couple mid-form.

## Also waiting on Yariv (not questions — actions)

- **Meta Pixel ID.** `src/data/site.js` → `analytics.metaPixelId` is still the placeholder
  `"XXXXXXXXXXXXXXX"`. Every CTA-click event in this PR already reports to GA4; pasting the numeric
  ID from Events Manager switches on the Meta half as well, with no further code changes.
- **A smaller gallery rendition.** `scripts/process-images.mjs` reads from
  `../brotherswedding-photo-download-1of2/`, which is outside the repo, so only Yariv's machine can
  run `npm run images`. Adding a ~360w tier (and AVIF) to `GALLERY_WIDTHS` would cut the gallery's
  transfer roughly in half on phones.
- **A privacy line for the form.** "הפרטים נשארים אצלנו ומשמשים רק ליצירת קשר" is a commitment
  Yariv makes, not a documented fact — one key in `site.js` once he confirms it.

---

היי יריב,

עשינו סבב על עמוד הבית כדי שזוגות יקבלו את כל המידע שהם צריכים לפני שהם משאירים פרטים. הוספנו
שאלות ותשובות, אבל יש כמה דברים שאי אפשר לכתוב בלעדיך — אנחנו לא מעלים לאתר שום דבר שלא אמרת.
תשובה שלילית עוזרת בדיוק כמו חיובית.

**1. ציוד גיבוי.** מה קורה אם מצלמה מפסיקה לעבוד באמצע האירוע? יש לך גוף מצלמה נוסף? הקבצים
נשמרים בשני מקומות? זאת השאלה הכי נפוצה שזוגות שואלים לפני שהם סוגרים, ואין לנו עליה תשובה באתר.

**2. מזג אוויר.** אם יורד גשם או שהתוכנית לצילומי חוץ משתנה ברגע האחרון — איך אתה נערך לזה? יש לנו
תשובה קצרה רק בעמוד של חתונות שטח, ורצינו משהו כללי שמתאים לכל חתונה.

**3. אירוע שנמשך אחרי 01:00.** הכיסוי הוא עד 01:00. אם האירוע נמשך יותר — אפשר להאריך במקום? יש
לזה תוספת תשלום, ואם כן איך היא נקבעת?

**4. ביטול או דחייה.** אם זוג צריך לדחות את התאריך או לבטל — מה הנוהל? המקדמה חוזרת, עוברת
לתאריך החדש, או משהו אחר? זה מה שהכי מלחיץ זוגות לפני שהם חותמים.

**5. כמה זמן עד הגלריה.** באתר כתוב "תוך מספר שבועות". אפשר לדייק? אם זה בדרך כלל בין X ל-Y
שבועות, עדיף לכתוב את זה — זוגות מחפשים את המספר הזה.

**6. מי מצלם בפועל.** אתה תמיד אחד משני הצלמים, או שיש אירועים שבהם מגיע הצוות בלעדיך? עדיף
להגיד את זה מראש מאשר שזוג יגלה ביום האירוע.

ועוד שני דברים טכניים קטנים:
- צריך את מספר ה-Pixel של פייסבוק (מתוך Events Manager) כדי שנוכל למדוד את הקמפיינים.
- כשיהיה לך רגע מול המחשב עם התמונות, נריץ גרסה מוקטנת של הגלריה — זה מה שהכי מאט את האתר בנייד.

אם נוח לך, אפשר פשוט להקליט הודעה קולית על כל סעיף.

תודה 🙏
