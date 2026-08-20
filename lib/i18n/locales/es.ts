import type { TranslationKeys } from "./fr";
import { fr } from "./fr";

export const es: TranslationKeys = {
  ...fr,
  common: { ...fr.common, loading: "Cargando...", error: "Error", success: "Éxito", cancel: "Cancelar", confirm: "Confirmar", back: "Atrás", next: "Siguiente", save: "Guardar", send: "Enviar", receive: "Recibir", logout: "Cerrar sesión", close: "Cerrar", search: "Buscar...", amount: "Importe", currency: "Moneda", date: "Fecha", status: "Estado", details: "Detalles", total: "Total", fee: "Comisión", balance: "Saldo", available: "Disponible", pending: "Pendiente", completed: "Completado", failed: "Fallido" },
  nav: { ...fr.nav, home: "Inicio", wallet: "Billetera", deposit: "Depósito", withdraw: "Retiro", transfer: "Enviar", menu: "Menú", card: "Tarjeta" },
  sidebar: { ...fr.sidebar, dashboard: "Panel", wallet: "Billetera", security: "Seguridad", settings: "Configuración", notifications: "Notificaciones", logout: "Cerrar sesión" },
};

export default es;
