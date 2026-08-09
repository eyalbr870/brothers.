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
    "יריב ברוך - צילום חתונות בגישה טבעית, רגשית וקולנועית. סטודיו Brothers. מלווה זוגות ביום המרגש בחייהם ומנציח את הרגעים האמיתיים.",

  // ---- Contact ----
  contact: {
    phoneDisplay: "050-819-3737",
    phoneIntl: "+972508193737",
    whatsapp: "972508193737", // digits only, country code, no +
    // Pre-filled WhatsApp message (customer's point of view). Editable before send.
    whatsappText:
      "היי יריב! ✨\nהגעתי דרך האתר ואשמח לשמוע פרטים על צילום החתונה שלנו.\nתאריך האירוע: \nמיקום: ",
    email: "yariv70@gmail.com",
    instagram: "brothers_photography_il", // handle (no @)
    instagramUrl: "https://www.instagram.com/brothers_photography_il",
    area: "צילום חתונות בכל הארץ",
  },

  // ---- Contact form ----
  // The form uses Netlify Forms (name="contact"). No endpoint/ID needed -
  // submissions appear in the Netlify dashboard under Forms once deployed.

  // ---- Analytics (landing pages) ----
  // Meta Pixel for ad-campaign landing pages under /lp/*. TODO: replace the
  // placeholder with the real Pixel ID from Meta Events Manager. While it
  // contains an "X", no tracking script loads (dev/build stay clean).
  analytics: {
    metaPixelId: "XXXXXXXXXXXXXXX", // TODO: paste the real Meta Pixel ID
  },

  nav: [
    { label: "בית", href: "#hero" },
    { label: "גלריה", href: "#gallery" },
    { label: "המלצות", href: "#testimonials" },
    { label: "אודות", href: "#about" },
    { label: "חבילות", href: "#finder" },
    { label: "צור קשר", href: "#contact" },
  ],

  hero: {
    eyebrow: "WEDDING PHOTOGRAPHY",
    title: "הרגעים\nהאמיתיים\nשלכם",
    subtitle:
      "צילום חתונות בגישה טבעית וקולנועית - כי הסיפור האמיתי נמצא ברגעים הקטנים שביניכם.",
    ctaPrimary: { label: "לגלריה", href: "#gallery" },
    ctaSecondary: { label: "לתיאום פגישה", href: "#contact" },
    scrollHint: "גללו למטה",
  },

  statement: {
    eyebrow: "BROTHERS.",
    text: "אני מאמין שתמונה טובה לא מבוימת - היא נתפסת. אני מלווה אתכם לאורך כל היום בשקט, קרוב מספיק כדי לתפוס כל מבט, צחוק ודמעה, ורחוק מספיק כדי לתת לרגע לקרות באמת.",
    signature: "יריב ברוך - צלם, אח.",
  },

  about: {
    eyebrow: "ABOUT",
    title: "הרבה מעבר לצלם.\nמשפחה.",
    lead: "Brothers הוא הרבה מעבר לשירות צילום חתונות. זו גישה, זו אנרגיה, וזו בחירה להגיע ליום שלכם לא כעוד ספק - אלא כמשפחה.",
    paragraphs: [
      "אנחנו מאמינים שצילום חתונה אמיתי לא מתחיל במצלמה - הוא מתחיל בחיבור. ביכולת להיכנס לאירוע, להרגיש את האנשים, להבין את הדינמיקה, ולתפוס את הרגעים הכי מדויקים - בלי לביים, בלי להפריע, פשוט להיות שם כמו אחים.",
      "מאחורי Brothers עומד יריב ברוך - שנים של ניסיון בצילום חתונות, הבנה עמוקה של אנשים, ויכולת להפוך כל אירוע לסיפור שמרגיש חי גם שנים אחרי.",
    ],
    pullquote: "ביום החתונה שלכם אנחנו לא עומדים מהצד - אנחנו נכנסים פנימה.",
    dnaIntro:
      "אבל Brothers זה כבר הרבה מעבר לאדם אחד - זו שיטה, זו רמה, זה צוות שנבחר בקפידה, עם אותו DNA:",
    dna: [
      "רגישות לאנשים",
      "עין חדה לפרטים",
      "אנרגיה שמרימה את האירוע",
      "סטנדרט שלא מתפשרים עליו",
    ],
    closing:
      "אנחנו יודעים שחתונה היא לא רק “אירוע” - זה רגע חד־פעמי, טעון ומרגש, עמוס בפרטים קטנים שחשובים לכם באמת. ולכן אנחנו שם כדי לתפוס לא רק איך זה נראה - אלא איך זה הרגיש.",
    closingStrong:
      "אם אתם רוצים אנשים שייכנסו ליום שלכם באמת, שיהיו חלק מהאנרגיה, ושיתעדו את הסיפור שלכם כמו שהוא - ברוכים הבאים ל־Brothers.",
    cta: { label: "לתיאום פגישה", href: "#contact" },
    image: "cYB-617.jpg", // gallery id used as the section portrait
  },

  gallery: {
    eyebrow: "PORTFOLIO",
    title: "יום החתונה",
    subtitle:
      "מבחר רגעים מתוך יום מלא באהבה - מהבוקר המרגש ועד ריקודי הלילה.",
    loadMore: "עוד תמונות",
  },

  // ---- Package finder (interactive, price-free) ----
  finder: {
    eyebrow: "PACKAGE FINDER",
    title: "איזו חבילה\nמתאימה לכם?",
    subtitle:
      "כמה שאלות קצרות, ונגלה יחד איזו חבילת צילום מתאימה בול ליום שלכם. בלי מחירים - רק התאמה.",
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
        tag: "לאירוע אינטימי וזורם",
        guests: "מתאים לעד 100 מוזמנים",
        stills: [
          "צלם סטילס אחד לאורך כל היום",
          "כיסוי מהתארגנות הכלה ועד השעה 01:00",
        ],
        video: [
          "בנוסף - צלם וידאו",
          "סרט חתונה באורך עד 90 דקות",
          "סרט תקציר Highlight (3-5 דקות)",
        ],
      },
      classic: {
        name: "Classic",
        tag: "הבחירה הפופולרית",
        guests: "מתאים לעד 450 מוזמנים",
        stills: [
          "שני צלמי סטילס (השני מצטרף בשיא הערב)",
          "כיסוי מהתארגנות הכלה ועד השעה 01:00",
        ],
        video: [
          "בנוסף - צלם וידאו",
          "סרט חתונה באורך עד 90 דקות",
          "סרט תקציר Highlight (3-5 דקות)",
        ],
      },
      premium: {
        name: "Premium",
        tag: "הכיסוי המלא ביותר",
        guests: "מתאים לאירועים גדולים, עד 800 מוזמנים",
        stills: [
          "שני צלמי סטילס לכיסוי מכל זווית",
          "כיסוי מלא מההתארגנות ועד השעה 01:00",
        ],
        video: [
          "בנוסף - שני צלמי וידאו",
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
        desc: "שלושה אלבומים מודפסים (30×80 ואחד 24×50 ס״מ)",
      },
      std: {
        name: "צילומי Save the Date",
        desc: "מפגש צילום מסוגנן עוד לפני החתונה",
      },
    },

    result: {
      eyebrow: "ההתאמה שלכם",
      lead: "על סמך מה שסימנתם, זו החבילה שהכי מתאימה לכם:",
      includesTitle: "מה כלול",
      addonsTitle: "התוספות שבחרתם",
      note: "המחיר הסופי נקבע לפי גודל האירוע, מיקום ותוספות. אשמח לבנות לכם הצעה אישית.",
      ctaHeading: "מוכנים להתחיל?",
      ctaText: "דברו איתנו לייעוץ אישי והצעה שמתאימה בדיוק ליום שלכם.",
      ctaWhatsapp: "לקבלת הצעה בוואטסאפ",
      ctaContact: "השאירו פרטים",
      noneLabel: "ללא",
      // {pkg} / {coverage} / {extras} get replaced before sending
      whatsappText:
        "היי יריב! ✨\nעשינו את שאלון החבילות באתר, והתוצאה שיצאה לנו:\nחבילה: {pkg}\nתיעוד: {coverage}{extras}\nתאריך האירוע: \nמיקום: \nנשמח לשמוע פרטים!",
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
      message: "ספרו לי על היום שלכם",
      submit: "שליחת פנייה",
      sending: "שולח…",
      success: "הפנייה נשלחה! אחזור אליכם בהקדם ✨",
      error: "משהו השתבש. נסו שוב או פנו אליי בוואטסאפ.",
    },
    directLabel: "או ישירות",
  },

  footer: {
    tagline: "צילום חתונות · יריב ברוך",
    rights: "כל הזכויות שמורות",
    credit: "Brothers. Photography",
  },
};

export default site;
