# Brothers. — אתר תדמית לצלם חתונות (יריב ברוך)

אתר Astro בעברית עם תמיכת RTL מלאה, בנוי סביב ה‑Brand Kit של **Brothers.**
עמוד יחיד: **Hero · גלריה · צור קשר**.

---

## הפעלה מקומית

```bash
cd site
npm install
npm run dev      # http://localhost:4321
```

בנייה לפרודקשן:

```bash
npm run build    # פלט סטטי בתיקיית dist/
npm run preview  # תצוגה מקדימה של הבנייה
```

---

## מבנה

```
site/
├─ public/
│  ├─ fonts/        פונטים WOFF2 (Frank Ruhl Libre, Assistant, Montserrat, Playfair)
│  ├─ gallery/      תמונות גלריה מעובדות (webp+jpg, 3 רזולוציות לכל תמונה)
│  ├─ hero/         תמונת Hero + רקעי סקשן
│  └─ logo/         גרסאות הלוגו
├─ src/
│  ├─ data/
│  │  ├─ site.js               ← כל הטקסטים ופרטי הקשר (עורכים כאן)
│  │  ├─ curated.json          ← רשימת 60 התמונות הנבחרות
│  │  └─ gallery.generated.json← מניפסט שנוצר אוטומטית (לא לערוך ידנית)
│  ├─ components/   Header, Hero, Statement, Gallery(+Lightbox), Contact, Footer
│  ├─ layouts/      BaseLayout (SEO, RTL, preloads)
│  ├─ lib/          images.js (srcset helpers)
│  └─ styles/       global.css, fonts.css
└─ scripts/         עיבוד תמונות והמרת פונטים
```

---

## ✏️ מה צריך להחליף לפני עלייה לאוויר

הכול מרוכז ב‑`src/data/site.js`. חפשו `TODO`:

| שדה | מה למלא |
|-----|---------|
| `contact.phoneDisplay` / `phoneIntl` / `whatsapp` | מספר טלפון אמיתי |
| `contact.email` | אימייל לקבלת פניות |
| `contact.instagram` / `instagramUrl` | שם המשתמש באינסטגרם |
| `contact.area` | אזור השירות |
| `formAction` | כתובת ה‑endpoint של טופס הקשר (ראו למטה) |

### חיבור טופס הקשר

הטופס שולח `POST` ל‑`formAction`. שתי אפשרויות פשוטות (ללא שרת):

1. **Formspree** — נרשמים ב‑formspree.io, יוצרים טופס, ומחליפים
   `https://formspree.io/f/FORM_ID` במזהה האמיתי. זהו.
2. **Netlify Forms** — אם מארחים ב‑Netlify: מוסיפים `netlify` ל‑`<form>`
   ב‑`src/components/Contact.astro` והטופס ייקלט אוטומטית.

עד שמחליפים את ה‑`FORM_ID`, הטופס יציג הודעת שגיאה ידידותית ולא ישלח.

---

## תמונות

- **בחירה:** רשימת 60 התמונות ב‑`src/data/curated.json`. להוספה/החלפה —
  עורכים את הרשימה (שמות קבצים מתוך תיקיית `wedding_day-part1`) ומריצים מחדש:

  ```bash
  npm run images
  ```

  הסקריפט מייצר לכל תמונה WebP + JPEG ב‑3 רוחבים, placeholder מטושטש (blur‑up),
  ושומר מידות למניעת קפיצות (CLS). התמונות נטענות ב‑lazy loading.

- **Hero ורקעים:** נקבעים ב‑`curated.json` תחת `hero` ו‑`sectionBackgrounds`.

> התמונות המקוריות (4000×6000) **לא** נכנסות ל‑repo — רק הגרסאות המעובדות מ‑`public/`.

---

## פונטים (לפי ה‑Brand Kit)

| שימוש | פונט |
|-------|------|
| כותרות עברית | **Frank Ruhl Libre** |
| גוף טקסט עברית | **Assistant** |
| תוויות / CTA (לטינית) | **Montserrat** |
| דיספליי לטיני | **Playfair Display** |

להמרה מחדש מ‑TTF ל‑WOFF2: `node scripts/convert-fonts.mjs`

---

## נגישות וביצועים

- HTML סמנטי, `lang="he"` + `dir="rtl"`, skip‑link, ARIA ל‑lightbox ולתפריט.
- תמונות רספונסיביות (`srcset`/`sizes`), lazy loading, blur‑up, preload ל‑Hero.
- פונטים self‑hosted עם `font-display: swap` ו‑preload.
- `prefers-reduced-motion` מכובד (מכבה אנימציות).

---

## פריסה (Deploy)

פלט סטטי — מתאים ל‑Netlify / Vercel / Cloudflare Pages:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Base directory:** `site`
