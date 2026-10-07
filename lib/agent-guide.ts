export type GuideNoteType = "tip" | "warning";

export interface GuideNote {
  type: GuideNoteType;
  text: string;
}

export interface GuideLink {
  label: string;
  /** Absolute URL or app path starting with "/" (resolved against the current origin). */
  href: string;
}

export interface GuideSection {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  notes?: GuideNote[];
  image?: { src: string; caption: string };
  links?: GuideLink[];
}

export interface GuideReference {
  label: string;
  description: string;
  href: string;
}

export const GUIDE_VERSION = "v2.0";

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "prerequis",
    title: "Présentation et prérequis",
    summary:
      "Le Kit Terrain réunit tout ce dont un agent PIMOBIPAY a besoin pour servir ses clients : dépôts, retraits, inscription, parrainage et sécurité.",
    steps: [
      "Disposer d'un compte agent PIMOBIPAY validé (statut KYC « Vérifié »).",
      "Utiliser un smartphone à jour avec une connexion Internet stable (3G minimum).",
      "Activer l'authentification à deux facteurs (MFA) dans Paramètres > Sécurité.",
      "Approvisionner votre Float (solde agent) avant d'ouvrir votre point de service.",
      "Afficher votre Carte Officielle et votre Badge Agent de façon visible.",
    ],
    notes: [
      {
        type: "tip",
        text: "Imprimez la Grille Tarifaire depuis la section Visuels & Flyers et affichez-la au comptoir pour éviter les questions sur les frais.",
      },
    ],
    links: [
      { label: "Carte Officielle", href: "/hub/carte" },
      { label: "Badge Agent", href: "/hub/badge" },
      { label: "Paramètres", href: "/hub/settings" },
    ],
  },
  {
    id: "tableau-de-bord",
    title: "Découvrir le tableau de bord",
    summary:
      "Le tableau de bord du Hub est votre écran de travail principal. Il affiche votre Float, vos actions rapides et vos dernières opérations.",
    steps: [
      "Ouvrez l'application puis rendez-vous dans le Hub Agent.",
      "Consultez le solde Float en haut de l'écran : c'est la liquidité numérique disponible pour les dépôts.",
      "Utilisez les boutons d'action rapide : Dépôt, Retrait, Scanner QR et Clients.",
      "Faites défiler la liste des transactions récentes pour vérifier les opérations de la journée.",
      "Accédez au menu latéral pour l'Historique, les Rapports et le Support.",
    ],
    image: {
      src: "/guide/agent-dashboard.png",
      caption: "Figure 1 - Tableau de bord du Hub Agent",
    },
    links: [
      { label: "Tableau de bord", href: "/hub" },
      { label: "Transactions", href: "/hub/transactions" },
    ],
  },
  {
    id: "accueil-client",
    title: "Accueillir et identifier un client",
    summary:
      "Une identification rapide et fiable du client évite les erreurs de destinataire et sécurise chaque opération.",
    steps: [
      "Saluez le client et demandez s'il souhaite un dépôt (cash-in) ou un retrait (cash-out).",
      "Vérifiez que le client possède un compte PIMOBIPAY actif.",
      "Appuyez sur « Scanner QR » et scannez le code QR affiché sur le téléphone du client.",
      "Contrôlez le nom affiché à l'écran et demandez au client de le confirmer à voix haute.",
      "Si le client n'a pas de compte, aidez-le à s'inscrire avec votre code parrain.",
    ],
    notes: [
      {
        type: "warning",
        text: "Si le nom affiché ne correspond pas au client présent, interrompez l'opération immédiatement.",
      },
    ],
    image: {
      src: "/guide/scan-client.png",
      caption: "Figure 2 - Identification du client par QR code",
    },
    links: [
      { label: "Clients", href: "/hub/customers" },
      { label: "Parrainage & QR", href: "/hub/referral" },
    ],
  },
  {
    id: "cash-in",
    title: "Effectuer un dépôt (Cash-In)",
    summary:
      "Le dépôt convertit l'argent liquide du client en solde numérique. Votre Float est débité du même montant.",
    steps: [
      "Recevez l'argent liquide et comptez-le devant le client.",
      "Sélectionnez « Dépôt » puis identifiez le client (QR ou numéro).",
      "Saisissez le montant exact et vérifiez le récapitulatif des frais.",
      "Appuyez sur « Confirmer le dépôt ».",
      "Le client valide la transaction avec son code de sécurité (MFA).",
      "Remettez le reçu et vérifiez avec le client que son solde a bien été crédité.",
    ],
    notes: [
      {
        type: "tip",
        text: "Vérifiez toujours l'authenticité des billets avant de valider l'opération.",
      },
    ],
    image: {
      src: "/guide/cash-in.png",
      caption: "Figure 3 - Écran de dépôt (Cash-In)",
    },
  },
  {
    id: "cash-out",
    title: "Effectuer un retrait (Cash-Out)",
    summary:
      "Le retrait convertit le solde numérique du client en argent liquide. Votre Float est crédité du montant retiré.",
    steps: [
      "Vérifiez que vous disposez de suffisamment d'espèces en caisse.",
      "Sélectionnez « Retrait » puis identifiez le client.",
      "Saisissez le montant demandé.",
      "Le client confirme le retrait depuis son téléphone.",
      "Attendez l'écran « Retrait confirmé » avant de remettre l'argent.",
      "Comptez les espèces devant le client et remettez le reçu.",
    ],
    notes: [
      {
        type: "warning",
        text: "Ne remettez JAMAIS d'espèces avant d'avoir reçu la confirmation à l'écran.",
      },
    ],
    image: {
      src: "/guide/cash-out.png",
      caption: "Figure 4 - Écran de retrait (Cash-Out)",
    },
  },
  {
    id: "float",
    title: "Gérer son Float et sa liquidité",
    summary:
      "Un bon équilibre entre Float numérique et espèces en caisse vous permet de servir tous vos clients sans interruption.",
    steps: [
      "Consultez votre Float chaque matin et avant chaque opération importante.",
      "Rechargez votre Float depuis la page Float & Liquidité quand il devient bas.",
      "Déposez l'excédent d'espèces auprès de votre superviseur ou d'un point de collecte.",
      "Rapprochez chaque soir vos espèces en caisse avec l'historique des opérations.",
      "Téléchargez vos rapports hebdomadaires pour suivre vos commissions.",
    ],
    links: [
      { label: "Float & Liquidité", href: "/hub/float" },
      { label: "Historique", href: "/hub/history" },
      { label: "Rapports", href: "/hub/reports" },
    ],
  },
  {
    id: "securite",
    title: "Politiques de sécurité",
    summary:
      "La sécurité protège vos clients, votre Float et la réputation du réseau PIMOBIPAY.",
    steps: [
      "Ne demandez JAMAIS le code PIN ou le mot de passe d'un client.",
      "Vérifiez l'identité (KYC) avec une pièce officielle pour les montants élevés.",
      "Ne laissez jamais votre téléphone déverrouillé sans surveillance.",
      "En cas de doute ou de fraude suspectée, activez le Safe Mode et contactez le support.",
      "Conservez une trace écrite des opérations importantes.",
    ],
    notes: [
      {
        type: "warning",
        text: "PIMOBIPAY ne vous demandera jamais vos identifiants par téléphone, SMS ou WhatsApp.",
      },
    ],
    image: {
      src: "/guide/security-mfa.png",
      caption: "Figure 5 - Vérification MFA et Safe Mode",
    },
    links: [{ label: "Paramètres de sécurité", href: "/hub/settings" }],
  },
  {
    id: "faq",
    title: "Dépannage et FAQ terrain",
    summary: "Les réponses aux situations les plus fréquentes rencontrées sur le terrain.",
    steps: [
      "Transaction en attente : patientez 2 minutes puis vérifiez l'Historique avant de recommencer.",
      "Float insuffisant : rechargez votre Float ou orientez le client vers un autre agent.",
      "Client sans code MFA : aidez-le à l'activer dans ses paramètres avant l'opération.",
      "Erreur de montant : ne tentez pas de corriger vous-même, ouvrez un ticket au Support.",
      "Application bloquée : fermez-la, vérifiez la connexion puis reconnectez-vous.",
    ],
    links: [{ label: "Support", href: "/hub/support" }],
  },
];

export const GUIDE_REFERENCES: GuideReference[] = [
  { label: "Tableau de bord Hub", description: "Écran principal de l'agent", href: "/hub" },
  { label: "Transactions", description: "Dépôts et retraits", href: "/hub/transactions" },
  { label: "Clients", description: "Liste et recherche de clients", href: "/hub/customers" },
  { label: "Parrainage & QR", description: "Code parrain et QR agent", href: "/hub/referral" },
  { label: "Float & Liquidité", description: "Recharge et suivi du Float", href: "/hub/float" },
  { label: "Historique", description: "Toutes vos opérations", href: "/hub/history" },
  { label: "Rapports", description: "Commissions et statistiques", href: "/hub/reports" },
  { label: "Support", description: "Ouvrir un ticket", href: "/hub/support" },
  { label: "Groupe VIP WhatsApp", description: "Assistance agents 24/7", href: "https://wa.me/242065540305" },
  { label: "Canal Telegram Agents", description: "Annonces et mises à jour", href: "https://t.me/pimobipay" },
];

export function resolveGuideHref(href: string, origin: string) {
  return href.startsWith("/") ? `${origin}${href}` : href;
}
