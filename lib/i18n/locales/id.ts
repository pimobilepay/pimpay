import type { TranslationKeys } from "./fr";
import { fr } from "./fr";

export const id: TranslationKeys = {
  ...fr,
  common: { ...fr.common, loading: "Memuat...", error: "Kesalahan", success: "Berhasil", cancel: "Batal", confirm: "Konfirmasi", back: "Kembali", next: "Berikutnya", save: "Simpan", send: "Kirim", receive: "Terima", logout: "Keluar", close: "Tutup", search: "Cari...", amount: "Jumlah", currency: "Mata uang", date: "Tanggal", status: "Status", details: "Detail", total: "Total", fee: "Biaya", balance: "Saldo", available: "Tersedia", pending: "Menunggu", completed: "Selesai", failed: "Gagal" },
  nav: { ...fr.nav, home: "Beranda", wallet: "Dompet", deposit: "Setor", withdraw: "Tarik", transfer: "Kirim", menu: "Menu", card: "Kartu" },
  sidebar: { ...fr.sidebar, dashboard: "Dasbor", wallet: "Dompet", security: "Keamanan", settings: "Pengaturan", notifications: "Notifikasi", logout: "Keluar" },
};

export default id;
