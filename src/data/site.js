// ============================================================
// Brothers. - central site content (Hebrew).
// Edit copy + contact details here. PLACEHOLDER values are marked
// with TODO - swap them for the real details before going live.
// ============================================================

export const site = {
  brand: "Brothers.",
  photographer: "יריב ברוך",
  brandLatin: "Brothers.",
  taglineLatin: "Photography - By Yariv Baruch",
  lang: "he",
  dir: "rtl",

  // ---- SEO ----
  title: "Brothers. | צילום חתונות - יריב ברוך",
  description:
    "יריב ברוך, צילום חתונות בגישה טבעית, רגשית וקולנועית. סטודיו Brothers. מלווה זוגות ביום המרגש בחייהם ומנציח את הרגעים האמיתיים.",

  // ---- Contact ----
  contact: {
    phoneDisplay: "050-819-3737",
    phoneIntl: "+972508193737",
    whatsapp: "972508193737", // digits only, country code, no +
    // Pre-filled WhatsApp message (customer's point of view). Editable before send.
    whatsappText:
      "היי יריב,\nהגעתי דרך האתר ואשמח לשמוע פרטים על צילום החתונה שלנו.\nתאריך האירוע: \nמיקום: ",
    email: "yariv70@gmail.com",
    instagram: "brothers_photography_il", // handle (no @)
    instagramUrl: "https://www.instagram.com/brothers_photography_il",
    area: "צילום חתונות בכל הארץ",
  },

  // ---- Business entity (drives the LocalBusiness schema) ----
  // Service-area business: there is no storefront, so no street address is
  // published. Google supports this - areaServed carries the coverage instead
  // of a PostalAddress with a street.
  business: {
    serviceArea: true,
    addressCountry: "IL",
    // Optional base city/region. Leave "" to omit from the schema entirely.
    addressLocality: "",
    addressRegion: "",
    // Google Business Profile, in the stable ?cid= form rather than a
    // share.google shortlink (those are redirectors and can rotate).
    // CID 2471900934450046254 = FID 0x86892ceefc78d93d:0x224df4cd9dd9e52e.
    // Verified: resolves to "Brothers. צילום חתונות", category צלם חתונות,
    // phone 050-819-3737, linking back to brothers-photography.com.
    googleBusinessUrl: "https://maps.google.com/?cid=2471900934450046254",
    // Matches the profile: פתוח 24 שעות.
    openAllHours: true,
    // Named cities for areaServed - specific signals an AI engine can match
    // against "צלם חתונות ב<עיר>" queries.
    cities: [
      "תל אביב",
      "ירושלים",
      "חיפה",
      "באר שבע",
      "אשדוד",
      "ראשון לציון",
      "נתניה",
      "פתח תקווה",
      "אילת",
    ],
  },

  // ---- Contact form ----
  // The form uses Netlify Forms (name="contact"). No endpoint/ID needed -
  // submissions appear in the Netlify dashboard under Forms once deployed.

  // ---- Analytics ----
  // Loaded site-wide via src/components/Analytics.astro. Each id stays a
  // no-op while it still contains the placeholder "X" run, so dev/CI builds
  // never fire tracking. Paste the real values to switch each one on.
  analytics: {
    // GA4 - overall site traffic + behavior (homepage AND landing pages).
    // Get it from Google Analytics > Admin > Data Streams > Measurement ID.
    ga4Id: "G-CR6R4R3H1F", // GA4 Measurement ID (live)
    // Meta Pixel - ad conversions on the /lp/* campaign pages.
    // Get it from Meta Events Manager > Data Sources > your Pixel.
    metaPixelId: "XXXXXXXXXXXXXXX", // TODO: paste the real Meta Pixel ID (numeric)
  },

  nav: [
    { label: "בית", href: "#hero" },
    { label: "אודות", href: "#about" },
    { label: "גלריה", href: "#gallery" },
    { label: "המלצות", href: "#testimonials" },
    { label: "חבילות ומחירים", href: "#finder" },
    { label: "שאלות", href: "#faq" },
    { label: "צור קשר", href: "#contact" },
  ],

  hero: {
    eyebrow: "WEDDING PHOTOGRAPHY",
    title: "הרגעים\nהאמיתיים\nשלכם",
    subtitle:
      "צילום חתונות בגישה טבעית וקולנועית, כי הסיפור האמיתי נמצא ברגעים הקטנים שביניכם.",
    // Gallery photo id shown full-bleed behind the hero copy.
    imageId: "aa398",
    ctaWhatsapp: "בדיקת תאריך בוואטסאפ",
    ctaPrimary: { label: "איזו חבילה מתאימה לנו?", href: "#finder" },
    scrollHint: "גללו למטה",
  },

  statement: {
    eyebrow: "BROTHERS.",
    text: "אני מאמין שתמונה טובה לא מבוימת. היא נתפסת. אני מלווה אתכם לאורך כל היום בשקט, קרוב מספיק כדי לתפוס כל מבט, צחוק ודמעה, ורחוק מספיק כדי לתת לרגע לקרות באמת.",
    signature: "יריב ברוך - צלם, אח.",
  },

  about: {
    eyebrow: "ABOUT",
    title: "הרבה מעבר לצלם.\nמשפחה.",
    lead: "Brothers הוא הרבה מעבר לשירות צילום חתונות. זו גישה, זו אנרגיה, וזו בחירה להגיע ליום שלכם לא כעוד ספק, אלא כמשפחה.",
    paragraphs: [
      "אנחנו מאמינים שצילום חתונה אמיתי לא מתחיל במצלמה. הוא מתחיל בחיבור. ביכולת להיכנס לאירוע, להרגיש את האנשים, להבין את הדינמיקה, ולתפוס את הרגעים הכי מדויקים, בלי לביים, בלי להפריע, פשוט להיות שם כמו אחים.",
      "מאחורי Brothers עומד יריב ברוך, שנים של ניסיון בצילום חתונות, הבנה עמוקה של אנשים, ויכולת להפוך כל אירוע לסיפור שמרגיש חי גם שנים אחרי.",
    ],
    pullquote: "ביום החתונה שלכם אנחנו לא עומדים מהצד. אנחנו נכנסים פנימה.",
    dnaIntro:
      "אבל Brothers זה כבר הרבה מעבר לאדם אחד. זו שיטה, זו רמה, זה צוות שנבחר בקפידה, עם אותו DNA:",
    dna: [
      "רגישות לאנשים",
      "עין חדה לפרטים",
      "אנרגיה שמרימה את האירוע",
      "סטנדרט שלא מתפשרים עליו",
    ],
    closing:
      "אנחנו יודעים שחתונה היא לא רק “אירוע”. זה רגע חד־פעמי, טעון ומרגש, עמוס בפרטים קטנים שחשובים לכם באמת. ולכן אנחנו שם כדי לתפוס לא רק איך זה נראה, אלא איך זה הרגיש.",
    closingStrong:
      "אם אתם רוצים אנשים שייכנסו ליום שלכם באמת, שיהיו חלק מהאנרגיה, ושיתעדו את הסיפור שלכם כמו שהוא, ברוכים הבאים ל־Brothers.",
    cta: { label: "לחבילות ומחירים", href: "#finder" },
    image: "cYB-617.jpg", // gallery id used as the section portrait

    // ---- Extractable facts strip (GEO / AI search + trust) ----
    // The rating + couples count are pulled automatically from reviews.json.
    // Fill the values below with real numbers to add them; leave "" to hide.
    stats: [
      { value: "9", suffix: "+", label: "שנות ניסיון" },
      { value: "400", suffix: "+", label: "חתונות תועדו" },
    ],
  },

  gallery: {
    eyebrow: "PORTFOLIO",
    title: "יום החתונה",
    subtitle:
      "מבחר רגעים מתוך יום מלא באהבה, מהבוקר המרגש ועד ריקודי הלילה.",
    loadMore: "עוד תמונות",
  },

  // ---- Package finder (interactive, with "starting from" prices) ----
  // Prices mirror the latest quote PDF (הצעת מחיר brothers., Sep 2026). They are
  // starting prices - the final quote depends on event size, venue and extras.
  finder: {
    eyebrow: "PACKAGE FINDER",
    title: "איזו חבילה\nמתאימה לכם?",
    subtitle:
      "שלוש שאלות קצרות, ותראו מיד איזו חבילה מתאימה ליום שלכם, מה כלול בה וכמה היא עולה.",
    stepLabel: "שלב",
    ofLabel: "מתוך",
    backLabel: "חזרה",
    restartLabel: "להתחיל מחדש",
    continueLabel: "לתוצאה",
    skipLabel: "דלגו",

    steps: [
      {
        key: "guests",
        type: "slider",
        q: "כמה אורחים בערך מגיעים?",
        help: "גררו כדי לבחור את גודל האירוע.",
        min: 0,
        max: 800,
        step: 10,
        default: 300, // lands in the Classic zone
        unit: "מוזמנים",
        minLabel: "0",
        maxLabel: "800+", // shown at the max end and as the readout when at max
        thresholds: [100, 450], // <=100 -> tiers[0], <=450 -> tiers[1], else tiers[2]
        tiers: ["basic", "classic", "premium"],
      },
      {
        key: "coverage",
        q: "איזה תיעוד הכי מדבר אליכם?",
        help: "אפשר תמונות בלבד, ואפשר להוסיף גם סרט חתונה שנשאר לתמיד.",
        multi: false,
        options: [
          { id: "stills", label: "רק סטילס", note: "תמונות בלבד", value: "stills" },
          {
            id: "video",
            label: "סטילס + וידאו",
            note: "גם סרט חתונה וסרט תקציר",
            value: "video",
          },
        ],
      },
      {
        key: "extras",
        q: "רוצים להוסיף משהו?",
        help: "אפשר לבחור כמה שבא לכם, או פשוט לדלג.",
        multi: true,
        options: [
          { id: "albums", label: "סט אלבומים", note: "3 אלבומים מודפסים" },
          { id: "std", label: "Save the Date", note: "צילומי טרום-חתונה" },
        ],
      },
    ],

    packages: {
      basic: {
        name: "Basic",
        priceStills: 7000,
        priceVideoAdd: 5000,
        tag: "לאירוע אינטימי וזורם",
        guests: "מתאים לעד 100 מוזמנים",
        stills: [
          "צלם סטילס אחד לאורך כל היום",
          "כיסוי מהתארגנות הכלה ועד השעה 01:00",
        ],
        video: [
          "בנוסף, צלם וידאו",
          "סרט חתונה באורך עד 90 דקות",
          "סרט תקציר Highlight (3-5 דקות)",
        ],
      },
      classic: {
        name: "Classic",
        priceStills: 8000,
        priceVideoAdd: 5000,
        tag: "הבחירה הפופולרית",
        guests: "מתאים לעד 450 מוזמנים",
        stills: [
          "שני צלמי סטילס (השני מצטרף בשיא הערב)",
          "כיסוי מהתארגנות הכלה ועד השעה 01:00",
        ],
        video: [
          "בנוסף, צלם וידאו",
          "סרט חתונה באורך עד 90 דקות",
          "סרט תקציר Highlight (3-5 דקות)",
        ],
      },
      premium: {
        name: "Premium",
        priceStills: 8000,
        priceVideoAdd: 6000,
        tag: "הכיסוי המלא ביותר",
        guests: "מתאים לאירועים גדולים, עד 800 מוזמנים",
        stills: [
          "שני צלמי סטילס לכיסוי מכל זווית",
          "כיסוי מלא מההתארגנות ועד השעה 01:00",
        ],
        video: [
          "בנוסף, שני צלמי וידאו",
          "סרט חתונה באורך עד 90 דקות",
          "סרט תקציר Highlight (3-5 דקות)",
        ],
      },
    },

    // Included in every package
    common: [
      "כל התמונות ערוכות ומסוננות באיכות גבוהה",
      "גלריה דיגיטלית לשיתוף עם חברים ומשפחה",
    ],

    addons: {
      albums: {
        name: "סט אלבומים",
        desc: "שלושה אלבומים מודפסים (אחד 30×80 ושניים 24×50 ס״מ)",
        price: 1500,
      },
      std: {
        name: "צילומי Save the Date",
        desc: "מפגש צילום מסוגנן עוד לפני החתונה",
        price: 1500,
        from: true, // "starting from" - the session price varies
      },
    },

    result: {
      eyebrow: "ההתאמה שלכם",
      lead: "על סמך מה שסימנתם, זו החבילה שהכי מתאימה לכם:",
      includesTitle: "מה כלול",
      addonsTitle: "התוספות שבחרתם",
      priceTitle: "מחיר",
      priceFrom: "החל מ-",
      currency: "₪",
      priceNote: "מחירים התחלתיים, משתנים לפי גודל האירוע, מיקום ותוספות.",
      ctaHeading: "מתאים לכם?",
      ctaText: "השאירו פרטים עם החבילה שבחרתם, ונשריין לכם את התאריך.",
      ctaContact: "להמשך ושריון תאריך",
      ctaWhatsapp: "או שאלו אותי בוואטסאפ",
      noneLabel: "ללא",
      // {pkg} / {coverage} / {extras} get replaced before sending
      whatsappText:
        "היי יריב,\nעשינו את שאלון החבילות באתר, והתוצאה שיצאה לנו:\nחבילה: {pkg}\nתיעוד: {coverage}{extras}\nמחיר: {price}\nתאריך האירוע: \nמיקום: \nנשמח לשמוע פרטים!",
      coverageStills: "סטילס בלבד",
      coverageVideo: "סטילס + וידאו",
      extrasPrefix: "\nתוספות: ",
    },
  },

  contactSection: {
    eyebrow: "GET IN TOUCH",
    title: "בואו נצלם\nאת הסיפור שלכם",
    subtitle:
      "מתחתנים? אשמח לשמוע עליכם ועל היום שאתם מתכננים. מלאו את הטופס ואחזור אליכם בהקדם, או דברו איתי ישירות.",
    form: {
      name: "שם מלא",
      phone: "טלפון",
      email: "אימייל",
      date: "תאריך האירוע",
      guests: "כמות אורחים משוערת",
      message: "ספרו לי על היום שלכם",
      submit: "שליחת פנייה",
      sending: "שולח…",
      success: "הפנייה נשלחה! אחזור אליכם בהקדם ✨",
      error: "משהו השתבש. נסו שוב או פנו אליי בוואטסאפ.",
    },
    directLabel: "או ישירות",

    // Selection summary shown above the form (filled from the package finder).
    selection: {
      title: "הבחירה שלכם",
      change: "שינוי",
      empty: "עוד לא בחרתם חבילה?",
      emptyLink: "גלו מה מתאים לכם ומה המחיר",
    },

    // Replaces the form after a successful submission.
    thankYou: {
      eyebrow: "קיבלנו!",
      title: "תודה{name}, הפרטים אצלנו",
      lead: "יריב יחזור אליכם בהקדם. ככה זה ממשיך מכאן:",
      steps: [
        { title: "שיחה קצרה", text: "מדייקים פרטים: מיקום, שעות וצרכים מיוחדים." },
        { title: "חוזה + מקדמה", text: "חוזה דיגיטלי פשוט, ומקדמה בביט או בהעברה בנקאית." },
        { title: "התאריך שלכם", text: "משוריין רשמית, ואנחנו כבר מתרגשים." },
      ],
      urgency: "בעונת החתונות תאריכים נסגרים מהר. ההצעה תקפה ל-14 יום.",
      ctaWhatsapp: "רוצים לזרז? שלחו לי בוואטסאפ",
      // {name} {date} {summary} get replaced before sending
      whatsappText:
        "היי יריב, זה {name}.\nהשארתי עכשיו פרטים באתר.\nתאריך האירוע: {date}\n{summary}\nנשמח לשריין!",
    },
  },

  // ---- FAQ (homepage), answer-shaped content for Google + AI search ----
  faq: {
    eyebrow: "FAQ",
    title: "שאלות נפוצות",
    items: [
      {
        q: "כמה עולה צלם חתונות?",
        a: "צילום חתונה אצלנו מתחיל מ-7,000 ₪. יש שלוש חבילות: Basic (עד 100 מוזמנים) החל מ-7,000 ₪, Classic (עד 450 מוזמנים) החל מ-8,000 ₪ ו-Premium (עד 800 מוזמנים) החל מ-8,000 ₪. תוספת וידאו (סרט חתונה + Highlight) היא 5,000-6,000 ₪ לפי החבילה, וסט אלבומים 1,500 ₪. אלה מחירים התחלתיים, והמחיר הסופי נקבע לפי גודל האירוע, המיקום והתוספות, בלי עלויות נסתרות.",
      },
      {
        q: "לאילו אזורים אתם מגיעים?",
        a: "אנחנו מצלמים חתונות בכל הארץ, בלי תוספת נסיעה ובלי הגבלת אזור: מרכז וגוש דן, תל אביב, ירושלים, השרון והשפלה, חיפה והצפון, אשדוד ואשקלון, באר שבע והדרום ועד אילת.",
      },
      {
        q: "כמה זמן מראש כדאי להזמין צלם חתונות?",
        a: "מומלץ להזמין צלם חתונות בין חצי שנה לשנה מראש, במיוחד לתאריכים בעונת החתונות (אביב וקיץ) ולימי חמישי. עם זאת, תמיד שווה לבדוק גם לתאריכים קרובים, לפעמים נפתחות זמינויות. שלחו לי את התאריך שלכם ואענה מיד אם הוא פנוי.",
      },
      {
        q: "כמה צלמים מגיעים לחתונה?",
        a: "תלוי בחבילה: ב-Basic מגיע צלם סטילס אחד, וב-Classic וב-Premium שני צלמי סטילס לכיסוי מכל זווית. אפשר להוסיף צלם או צלמי וידאו לכל אחת מהחבילות.",
      },
      {
        q: "האם יש גם צילום וידאו לחתונה?",
        a: "כן, אפשר לשלב צילום סטילס ווידאו חתונה תחת צוות אחד מתואם. לכל חבילה אפשר להוסיף סרט חתונה קולנועי (עד 90 דקות) וסרט תקציר Highlight של 3-5 דקות, מוכן לשיתוף ברשתות החברתיות.",
      },
      {
        q: "עד איזו שעה מכוסה האירוע?",
        a: "הכיסוי מתחיל מהתארגנות הכלה ונמשך עד השעה 01:00 בלילה, כולל ריקודי הרחבה. אם האירוע שלכם מתחיל מוקדם או נמשך מאוחר יותר, נתאים את שעות הכיסוי מראש.",
      },
      {
        q: "כמה זמן לוקח לקבל את התמונות מהחתונה?",
        a: "גלריה דיגיטלית מלאה, ערוכה ומסוננת, מגיעה אליכם תוך מספר שבועות מהאירוע. מבחר תמונות ראשוני נשלח כבר בימים שאחרי החתונה, כדי שיהיה לכם מה לשתף בזמן שהמשפחה עוד מתרגשת.",
      },
      {
        q: "איך לבחור צלם חתונות?",
        a: "הסתכלו על אלבום שלם מחתונה אחת ולא רק על תמונות נבחרות, כדי לראות אם הסגנון עקבי לאורך כל האירוע. בדקו שהצלם מתעד גם רגעים ספונטניים ולא רק פוזות מבוימות, ודאו מה בדיוק כלול בחבילה ומתי מקבלים את התמונות, והכי חשוב, דברו איתו לפני. הכימיה עם הצלם מרגישה בתמונות.",
      },
      {
        q: "אפשר להיפגש לפני החתונה?",
        a: "בהחלט. נשמח להיפגש או לדבר לפני, להכיר, להבין את החזון שלכם ולתאם ציפיות. אפשר גם להוסיף צילומי Save the Date עוד לפני החתונה.",
      },
    ],
  },

  footer: {
    tagline: "צילום חתונות · יריב ברוך",
    rights: "כל הזכויות שמורות",
    credit: "Brothers. Photography",
  },
};

export default site;
