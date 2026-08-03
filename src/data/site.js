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
    signature: "יריב ברוך",
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
