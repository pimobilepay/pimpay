import type { TranslationKeys } from "./fr";
import { fr } from "./fr";

export const ar: TranslationKeys = {
  ...fr,
  common: { ...fr.common, loading: "جار التحميل...", error: "خطأ", success: "نجاح", cancel: "إلغاء", confirm: "تأكيد", back: "رجوع", next: "التالي", save: "حفظ", send: "إرسال", receive: "استلام", logout: "تسجيل الخروج", close: "إغلاق", search: "بحث...", amount: "المبلغ", currency: "العملة", date: "التاريخ", status: "الحالة", details: "التفاصيل", total: "الإجمالي", fee: "الرسوم", balance: "الرصيد", available: "متاح", pending: "قيد الانتظار", completed: "مكتمل", failed: "فشل" },
  nav: { ...fr.nav, home: "الرئيسية", wallet: "المحفظة", deposit: "إيداع", withdraw: "سحب", transfer: "إرسال", menu: "القائمة", card: "البطاقة" },
  sidebar: { ...fr.sidebar, dashboard: "لوحة التحكم", wallet: "المحفظة", security: "الأمان", settings: "الإعدادات", notifications: "الإشعارات", logout: "تسجيل الخروج" },
};

export default ar;
