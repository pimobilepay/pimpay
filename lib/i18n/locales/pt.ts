import type { TranslationKeys } from "./fr";
import { fr } from "./fr";

export const pt: TranslationKeys = {
  ...fr,
  common: { ...fr.common, loading: "Carregando...", error: "Erro", success: "Sucesso", cancel: "Cancelar", confirm: "Confirmar", back: "Voltar", next: "Próximo", save: "Salvar", send: "Enviar", receive: "Receber", logout: "Sair", close: "Fechar", search: "Pesquisar...", amount: "Valor", currency: "Moeda", date: "Data", status: "Status", details: "Detalhes", total: "Total", fee: "Taxa", balance: "Saldo", available: "Disponível", pending: "Pendente", completed: "Concluído", failed: "Falhou" },
  nav: { ...fr.nav, home: "Início", wallet: "Carteira", deposit: "Depósito", withdraw: "Saque", transfer: "Enviar", menu: "Menu", card: "Cartão" },
  sidebar: { ...fr.sidebar, dashboard: "Painel", wallet: "Carteira", security: "Segurança", settings: "Configurações", notifications: "Notificações", logout: "Sair" },
};

export default pt;
