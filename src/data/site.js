// ============================================================
// Brothers. — central site content (Hebrew).
// Edit copy + contact details here. PLACEHOLDER values are marked
// with TODO — swap them for the real details before going live.
// ============================================================

export const site = {
  brand: "Brothers.",
  photographer: "יריב ברוך",
  brandLatin: "Brothers.",
  taglineLatin: "Photography — By Yariv Baruch",
  lang: "he",
  dir: "rtl",

  // ---- SEO ----
  title: "Brothers. | צילום חתונות — יריב ברוך",
  description:
    "יריב ברוך — צילום חתונות בגישה טבעית, רגשית וקולנועית. סטודיו Brothers. מלווה זוגות ביום המרגש בחייהם ומנציח את הרגעים האמיתיים.",

  // ---- Contact ----
  contact: {
    phoneDisplay: "050-819-3737",
    phoneIntl: "+972508193737",
    whatsapp: "972508193737", // digits only, country code, no +
    // Pre-filled WhatsApp message (customer's point of view). Editable before send.
    whatsappText:
      "היי יריב! 🤍\nהגעתי דרך האתר ואשמח לשמוע פרטים על צילום החתונה שלנו.\nתאריך האירוע: \nמיקום: ",
    email: "yariv70@gmail.com",
    instagram: "brothers_photography_il", // handle (no @)
    instagramUrl: "https://www.instagram.com/brothers_photography_il",
    area: "צילום חתונות בכל הארץ",
  },

  // ---- Contact form ----
  // The form uses Netlify Forms (name="contact"). No endpoint/ID needed —
  // submissions appear in the Netlify dashboard under Forms once deployed.

  nav: [
    { label: "בית", href: "#hero" },
    { label: "גלריה", href: "#gallery" },
    { label: "אודות", href: "#about" },
    { label: "המלצות", href: "#testimonials" },
    { label: "צור קשר", href: "#contact" },
  ],

  hero: {
    eyebrow: "WEDDING PHOTOGRAPHY",
    title: "הרגעים\nהאמיתיים\nשלכם",
    subtitle:
      "צילום חתונות בגישה טבעית וקולנועית — כי הסיפור האמיתי נמצא ברגעים הקטנים שביניכם.",
    ctaPrimary: { label: "לגלריה", href: "#gallery" },
    ctaSecondary: { label: "לתיאום פגישה", href: "#contact" },
    scrollHint: "גללו למטה",
  },

  statement: {
    eyebrow: "BROTHERS.",
    text: "אני מאמין שתמונה טובה לא מבוימת — היא נתפסת. אני מלווה אתכם לאורך כל היום בשקט, קרוב מספיק כדי לתפוס כל מבט, צחוק ודמעה, ורחוק מספיק כדי לתת לרגע לקרות באמת.",
    signature: "יריב ברוך — צלם, אח.",
  },

  about: {
    eyebrow: "ABOUT",
    title: "הרבה מעבר לצלם.\nמשפחה.",
    lead: "Brothers הוא הרבה מעבר לשירות צילום חתונות. זו גישה, זו אנרגיה, וזו בחירה להגיע ליום שלכם לא כעוד ספק — אלא כמשפחה.",
    paragraphs: [
      "אנחנו מאמינים שצילום חתונה אמיתי לא מתחיל במצלמה — הוא מתחיל בחיבור. ביכולת להיכנס לאירוע, להרגיש את האנשים, להבין את הדינמיקה, ולתפוס את הרגעים הכי מדויקים — בלי לביים, בלי להפריע, פשוט להיות שם כמו אחים.",
      "מאחורי Brothers עומד יריב ברוך — שנים של ניסיון בצילום חתונות, הבנה עמוקה של אנשים, ויכולת להפוך כל אירוע לסיפור שמרגיש חי גם שנים אחרי.",
    ],
    pullquote: "ביום החתונה שלכם אנחנו לא עומדים מהצד — אנחנו נכנסים פנימה.",
    dnaIntro:
      "אבל Brothers זה כבר הרבה מעבר לאדם אחד — זו שיטה, זו רמה, זה צוות שנבחר בקפידה, עם אותו DNA:",
    dna: [
      "רגישות לאנשים",
      "עין חדה לפרטים",
      "אנרגיה שמרימה את האירוע",
      "סטנדרט שלא מתפשרים עליו",
    ],
    closing:
      "אנחנו יודעים שחתונה היא לא רק “אירוע” — זה רגע חד־פעמי, טעון ומרגש, עמוס בפרטים קטנים שחשובים לכם באמת. ולכן אנחנו שם כדי לתפוס לא רק איך זה נראה — אלא איך זה הרגיש.",
    closingStrong:
      "אם אתם רוצים אנשים שייכנסו ליום שלכם באמת, שיהיו חלק מהאנרגיה, ושיתעדו את הסיפור שלכם כמו שהוא — ברוכים הבאים ל־Brothers.",
    cta: { label: "לתיאום פגישה", href: "#contact" },
    image: "cYB-617.jpg", // gallery id used as the section portrait
  },

  gallery: {
    eyebrow: "PORTFOLIO",
    title: "יום החתונה",
    subtitle:
      "מבחר רגעים מתוך יום מלא באהבה — מהבוקר המרגש ועד ריקודי הלילה.",
    loadMore: "עוד תמונות",
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
      success: "הפנייה נשלחה! אחזור אליכם בהקדם 🤍",
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
