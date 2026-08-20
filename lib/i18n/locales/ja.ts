import type { TranslationKeys } from "./fr";
import { fr } from "./fr";

export const ja: TranslationKeys = {
  ...fr,
  common: { ...fr.common, loading: "読み込み中...", error: "エラー", success: "成功", cancel: "キャンセル", confirm: "確認", back: "戻る", next: "次へ", save: "保存", send: "送信", receive: "受け取る", logout: "ログアウト", close: "閉じる", search: "検索...", amount: "金額", currency: "通貨", date: "日付", status: "ステータス", details: "詳細", total: "合計", fee: "手数料", balance: "残高", available: "利用可能", pending: "保留中", completed: "完了", failed: "失敗" },
  nav: { ...fr.nav, home: "ホーム", wallet: "ウォレット", deposit: "入金", withdraw: "出金", transfer: "送信", menu: "メニュー", card: "カード" },
  sidebar: { ...fr.sidebar, dashboard: "ダッシュボード", wallet: "ウォレット", security: "セキュリティ", settings: "設定", notifications: "通知", logout: "ログアウト" },
};

export default ja;
