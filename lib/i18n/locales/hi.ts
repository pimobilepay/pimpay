import type { TranslationKeys } from "./fr";
import { fr } from "./fr";

export const hi: TranslationKeys = {
  ...fr,
  common: { ...fr.common, loading: "लोड हो रहा है...", error: "त्रुटि", success: "सफलता", cancel: "रद्द करें", confirm: "पुष्टि करें", back: "वापस", next: "आगे", save: "सहेजें", send: "भेजें", receive: "प्राप्त करें", logout: "लॉग आउट", close: "बंद करें", search: "खोजें...", amount: "राशि", currency: "मुद्रा", date: "तारीख", status: "स्थिति", details: "विवरण", total: "कुल", fee: "शुल्क", balance: "शेष राशि", available: "उपलब्ध", pending: "लंबित", completed: "पूर्ण", failed: "विफल" },
  nav: { ...fr.nav, home: "होम", wallet: "वॉलेट", deposit: "जमा", withdraw: "निकासी", transfer: "भेजें", menu: "मेनू", card: "कार्ड" },
  sidebar: { ...fr.sidebar, dashboard: "डैशबोर्ड", wallet: "वॉलेट", security: "सुरक्षा", settings: "सेटिंग्स", notifications: "सूचनाएं", logout: "लॉग आउट" },
};

export default hi;
