import { generateText } from "ai";

// ---------------------------------------------------------------------------
// Elara — Le cerveau IA de PimPay
// ---------------------------------------------------------------------------
// Modèle servi via le Vercel AI Gateway (zero-config avec AI_GATEWAY_API_KEY).
export const ELARA_MODEL = "google/gemini-3.5-flash";

// Message renvoyé quand l'utilisateur demande explicitement un agent humain.
// Elara ne tente PAS de répondre à la place du support : elle collecte la
// préoccupation et rassure l'utilisateur en attendant la prise en charge.
export const SUPPORT_INTENT_REPLY =
  "Bien sûr, je transmets votre demande à un agent du support PimPay. " +
  "Pour qu'il puisse vous aider efficacement, pouvez-vous me décrire précisément **quelle est votre préoccupation** ? " +
  "Donnez-moi le maximum de détails (le service concerné, le montant, un message d'erreur éventuel...). " +
  "Un conseiller vous répondra ici dès que possible.";

// ---------------------------------------------------------------------------
// Base de connaissances — décrit TOUTES les fonctionnalités de la plateforme
// pour que les réponses soient précises et exactes.
// ---------------------------------------------------------------------------
export const ELARA_SYSTEM_PROMPT = `Tu es **Elara**, l'assistante IA native et exclusive de **PimPay (Pi Mobile Pay)**, un portefeuille mobile et une banque virtuelle bâtis autour du Pi Network.

# Ton rôle
- Répondre avec précision et exactitude aux questions des utilisateurs sur TOUTES les fonctionnalités de PimPay.
- Guider l'utilisateur pas à pas, de façon claire, professionnelle, rassurante et directe.
- Tu réponds dans la langue de l'utilisateur (français par défaut). Reste concise : phrases courtes et listes à puces.
- Utilise le formatage Markdown (gras avec **, listes avec des tirets) pour la lisibilité.

# Règles strictes
- Ne JAMAIS inventer une fonctionnalité, un taux, un délai ou une information qui n'est pas dans cette base de connaissances. Si tu ne sais pas, dis-le honnêtement et invite l'utilisateur à reformuler ou à contacter le support.
- Ne JAMAIS divulguer d'informations système sensibles, de clés, de secrets techniques ou de détails d'implémentation interne.
- La sécurité des fonds et des données de l'utilisateur est ta priorité absolue.
- La devise de référence de la plateforme est le **USD**. Les portefeuilles natifs sont **PI** et **XAF**.
- Statut réseau : PimPay fonctionne actuellement sur le **Testnet** Pi Network. Les opérations de cash-out réelles (retraits en argent réel, recharges Mobile Money directes) seront pleinement actives au passage au **Mainnet**.

# Fonctionnalités de la plateforme

## Dépôt (page Dépôt)
- Onglet **CRYPTO** : alimenter le compte via **PI NETWORK GCV BRIDGE** (Pi, actuellement en Testnet).
- Les recharges directes via Mobile Money (MTN, Airtel, etc.) seront activées au Mainnet.
- Onglet **Card** : aperçu des cartes virtuelles bientôt disponibles.

## Retrait (page Retrait)
- Onglet **MOBILE** : retrait vers Mobile Money (M-Pesa, Orange, Airtel, Africell).
- Onglet **VIREMENT BANCAIRE** : retrait vers un compte bancaire.
- Saisir le numéro/compte bénéficiaire et le montant en Pi. Cash-out réel disponible au Mainnet.

## Swap / Échange (page Swap)
- Convertir le Pi vers d'autres devises ou cryptos.
- Taux calculé en temps réel. Frais de swap : **0,1 %**.

## Transfert P2P (entre utilisateurs)
- Envoyer des fonds à un autre utilisateur PimPay via ses contacts récents ou son identifiant.
- Frais de transfert P2P : **1 %**.

## MPay (hub d'utilisation)
- **Map of Pi** : visualiser les commerçants qui acceptent le Pi (ex. Dakar).
- **Scanner / Payer** : effectuer des paiements marchands en un clic via QR code.
- **P2P** : retrouver les contacts récents pour des transferts rapides.

## Cartes virtuelles
- Gammes : **Classic, Gold, Business, Ultra**.
- Utilisables partout où Visa est acceptée. Disponibles depuis l'onglet **Card** de la page Dépôt (bientôt).

## Vérification KYC
- Nécessaire pour augmenter les limites de retrait.
- Aller dans **Profil > Vérification** pour téléverser ses documents d'identité. Validation généralement en moins de 24 h.

## Sécurité du compte
- Protection par **code PIN** (6 chiffres) et **authentification à deux facteurs (2FA)**.
- Gestion des sessions actives, déconnexion à distance, journaux de sécurité dans les paramètres.
- En cas d'activité suspecte, l'utilisateur reçoit une notification et peut sécuriser son compte.

## Frais (récapitulatif)
- Transfert P2P : 1 %
- Swap : 0,1 %
- Dépôt / Retrait : 2 à 3,5 % selon l'opérateur.
- Tous les frais sont affichés avant chaque validation.

## Comptes Business & Banque
- PimPay propose des portails dédiés pour les entreprises (Business) et la Banque Centrale (Bank), avec leurs propres tableaux de bord.

# Comportement
- Si l'utilisateur te salue, présente-toi brièvement et propose ton aide.
- Si une demande sort de ta base de connaissances ou nécessite une action humaine (litige, blocage de compte, remboursement), explique ce que tu sais puis invite l'utilisateur à demander un agent du support.`;

// ---------------------------------------------------------------------------
// Détection d'intention « parler à un agent humain »
// ---------------------------------------------------------------------------
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function detectSupportIntent(message: string): boolean {
  const m = normalize(message);

  // Combinaisons explicites de demande d'agent humain
  const phrases = [
    "parler a un agent",
    "parler a un conseiller",
    "parler au support",
    "parler a un humain",
    "agent du support",
    "agent humain",
    "un vrai agent",
    "contacter le support",
    "contacter un agent",
    "joindre le support",
    "joindre un agent",
    "assistance humaine",
    "support humain",
    "service client",
    "un conseiller",
    "une personne reelle",
  ];

  return phrases.some((p) => m.includes(p));
}

// ---------------------------------------------------------------------------
// FAQ de secours (utilisée si l'IA est indisponible)
// ---------------------------------------------------------------------------
interface FAQEntry {
  keywords: string[];
  response: string;
}

const ELARA_FAQ: FAQEntry[] = [
  {
    keywords: ["depot", "deposit", "deposer", "alimenter", "recharger", "ajouter argent"],
    response:
      "Pour alimenter votre compte PimPay :\n\n1. Allez sur la page **Dépôt**.\n2. Cliquez sur l'onglet **CRYPTO**.\n3. Utilisez l'option **PI NETWORK GCV BRIDGE** pour vos Pi (actuellement en Testnet).\n\n*Note : Les recharges directes via Mobile Money seront actives au Mainnet.*",
  },
  {
    keywords: ["retrait", "withdraw", "retirer", "recuperer", "sortir argent"],
    response:
      "Pour effectuer un retrait :\n\n1. Allez sur la page **Retrait**.\n2. Choisissez **MOBILE** (M-Pesa, Orange, Airtel, Africell) ou **VIREMENT BANCAIRE**.\n3. Entrez le bénéficiaire et le montant en Pi.\n\nLe cash-out réel sera disponible au Mainnet.",
  },
  {
    keywords: ["mpay", "m-pay", "map", "boutique", "magasin", "marchand", "scanner"],
    response:
      "La page **MPay** est votre hub d'utilisation :\n\n- **Map of Pi** : visualisez les commerçants acceptant le Pi.\n- **Scanner / Payer** : paiements marchands en un clic.\n- **P2P** : transferts rapides vers vos contacts récents.",
  },
  {
    keywords: ["swap", "echanger", "convertir", "conversion"],
    response:
      "Pour échanger vos devises, allez dans **Swap**. Vous pouvez convertir vos Pi vers d'autres devises ou cryptos. Le taux est calculé en temps réel (0,1 % de frais).",
  },
  {
    keywords: ["carte", "card", "visa", "virtuelle"],
    response:
      "Les cartes virtuelles PimPay (Classic, Gold, Business, Ultra) sont utilisables partout où Visa est acceptée. Rendez-vous dans l'onglet **Card** de la page Dépôt pour voir les options bientôt disponibles.",
  },
  {
    keywords: ["kyc", "verification", "identite"],
    response:
      "La validation KYC (< 24h) est nécessaire pour augmenter vos limites de retrait. Allez dans **Profil > Vérification** pour téléverser vos documents.",
  },
  {
    keywords: ["transfert", "envoyer", "p2p", "transferer"],
    response:
      "Pour un transfert P2P, envoyez des fonds à un autre utilisateur PimPay via ses contacts récents ou son identifiant. Frais : 1 %.",
  },
  {
    keywords: ["frais", "fees", "commission", "tarif"],
    response:
      "**Tarifs PimPay :**\n- Transfert P2P : 1 %\n- Swap : 0,1 %\n- Dépôt / Retrait : 2 à 3,5 % selon l'opérateur.\n\nTous les frais sont détaillés avant chaque validation.",
  },
  {
    keywords: ["securite", "pin", "2fa", "mot de passe", "session"],
    response:
      "Votre compte est protégé par un **code PIN** et l'**authentification à deux facteurs (2FA)**. Vous pouvez gérer vos sessions actives et consulter vos journaux de sécurité dans les paramètres.",
  },
  {
    keywords: ["merci", "thanks", "ok", "parfait", "super"],
    response:
      "Avec plaisir ! Je suis là pour vous aider. N'hésitez pas si vous avez d'autres questions.",
  },
  {
    keywords: ["bonjour", "salut", "hello", "hi", "coucou"],
    response:
      "Bonjour ! Je suis **Elara**, votre assistante intelligente PimPay.\n\nComment puis-je vous aider aujourd'hui ? Je peux vous guider pour vos dépôts, retraits, swaps, cartes ou l'utilisation de MPay.",
  },
];

export function getAutoReply(msg: string): string {
  const low = normalize(msg);
  for (const faq of ELARA_FAQ) {
    for (const keyword of faq.keywords) {
      if (low.includes(normalize(keyword))) {
        return faq.response;
      }
    }
  }
  return (
    "Je n'ai pas trouvé de réponse précise à votre question dans ma base de connaissances.\n\n" +
    "Reformulez votre demande ou écrivez « parler à un agent du support » pour qu'un conseiller PimPay vous réponde ici."
  );
}

// ---------------------------------------------------------------------------
// Génération de la réponse d'Elara (IA réelle + repli FAQ)
// ---------------------------------------------------------------------------
export interface ElaraHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateElaraReply(opts: {
  message: string;
  history?: ElaraHistoryMessage[];
}): Promise<string> {
  const { message, history = [] } = opts;

  // Sans clé AI Gateway, on bascule directement sur la FAQ.
  if (!process.env.AI_GATEWAY_API_KEY) {
    return getAutoReply(message);
  }

  try {
    // On garde les derniers échanges pour le contexte (max 10 messages).
    const recent = history.slice(-10);

    const { text } = await generateText({
      model: ELARA_MODEL,
      system: ELARA_SYSTEM_PROMPT,
      messages: [
        ...recent.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: message },
      ],
      temperature: 0.5,
      maxOutputTokens: 700,
    });

    const reply = text?.trim();
    return reply && reply.length > 0 ? reply : getAutoReply(message);
  } catch (error) {
    console.error("[v0] Elara AI error, fallback FAQ:", error);
    return getAutoReply(message);
  }
}
