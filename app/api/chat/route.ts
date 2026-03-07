import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET  — List all tickets OR load a single ticket with messages
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const user = await auth().catch(() => null);
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

    if (ticketId) {
      const ticket = await prisma.supportTicket.findFirst({
        where: isAdmin
          ? { id: ticketId }
          : user?.id
            ? { id: ticketId, userId: user.id }
            : { id: ticketId, userId: null },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          user: { select: { name: true, email: true, avatar: true } },
        },
      });
      return NextResponse.json({ ticket });
    }

    // List tickets
    const tickets = await prisma.supportTicket.findMany({
      where: isAdmin ? {} : user?.id ? { userId: user.id } : { userId: null },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error("CHAT_GET_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Send a message (create ticket if needed) + Elara auto-reply
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const user = await auth().catch(() => null);
    const body = await req.json();
    const { ticketId, message, subject } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    const sanitizedMessage = message.trim();
    const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

    // ---- 1. Resolve or create ticket ----
    let ticket;

    if (!ticketId) {
      // New ticket
      ticket = await prisma.supportTicket.create({
        data: {
          userId: user?.id || null,
          subject: subject || sanitizedMessage.slice(0, 50),
          messages: {
            create: {
              senderId: isAdmin ? "SUPPORT" : (user?.id || "GUEST"),
              content: sanitizedMessage,
            },
          },
        },
      });
    } else {
      // Existing ticket — verify ownership (admin can access any)
      ticket = await prisma.supportTicket.findFirst({
        where: isAdmin
          ? { id: ticketId }
          : user?.id
            ? { id: ticketId, userId: user.id }
            : { id: ticketId, userId: null },
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
      }

      // Add user/admin message
      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          senderId: isAdmin ? "SUPPORT" : (user?.id || "GUEST"),
          content: sanitizedMessage,
        },
      });
    }

    // ---- 2. Elara AI auto-reply (only when the *user* writes, not admin) ----
    if (!isAdmin) {
      const allMsgs = await prisma.message.findMany({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: "asc" },
      });

      // Count user messages (everything except ELARA_AI and SUPPORT)
      const userMsgs = allMsgs.filter(
        (m) => m.senderId !== "ELARA_AI" && m.senderId !== "SUPPORT"
      );

      let elaraReply = "";

      if (userMsgs.length === 1) {
        elaraReply =
          "Bonjour ! Je suis Elara, votre assistante PimPay. Pour mieux vous aider, pouvez-vous me donner votre **Nom complet** ?";
      } else if (userMsgs.length === 2) {
        elaraReply =
          "Merci ! Quelle est votre **adresse email** pour le suivi de ce ticket ?";
      } else if (userMsgs.length === 3) {
        elaraReply =
          "C'est note. Je transmets votre dossier au support PimPay. Comment puis-je vous aider en attendant ?";
      } else {
        elaraReply = getAutoReply(sanitizedMessage);
      }

      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          senderId: "ELARA_AI",
          content: elaraReply,
        },
      });
    }

    // ---- 3. Return updated ticket ----
    const updated = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ ticket: updated });
  } catch (error: any) {
    console.error("CHAT_POST_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Elara keyword-based auto-reply helper with enhanced FAQ
// ---------------------------------------------------------------------------
interface FAQEntry {
  keywords: string[];
  response: string;
  category: string;
}

const ELARA_FAQ: FAQEntry[] = [
  // Depot
  {
    keywords: ["depot", "deposit", "deposer", "alimenter", "recharger", "ajouter argent"],
    response: "Pour effectuer un depot:\n\n1. Allez dans **Portefeuille** > **Deposer**\n2. Choisissez votre methode: Mobile Money (Orange/MTN/Moov) ou Carte bancaire\n3. Entrez le montant et confirmez\n\nLe traitement est generalement effectue en moins de 5 minutes. Des frais de 2-3.5% s'appliquent selon la methode.",
    category: "depot"
  },
  // Retrait
  {
    keywords: ["retrait", "withdraw", "retirer", "recuperer", "sortir argent"],
    response: "Pour effectuer un retrait:\n\n1. Allez dans **Portefeuille** > **Retirer**\n2. Selectionnez la destination: Mobile Money ou Compte bancaire\n3. Entrez le montant (minimum 1.0 unite)\n4. Confirmez avec votre PIN\n\nLes retraits sont traites sous 15-30 minutes. Les frais varient de 2-2.5% selon la methode.",
    category: "retrait"
  },
  // Swap/Exchange
  {
    keywords: ["swap", "echanger", "convertir", "conversion", "exchange", "changer"],
    response: "Pour echanger vos devises:\n\n1. Allez dans **Swap**\n2. Selectionnez la devise source et destination\n3. Entrez le montant a echanger\n4. Verifiez le taux et les frais (0.1%)\n5. Confirmez l'echange\n\nLe taux est calcule en temps reel avec protection contre la volatilite.",
    category: "swap"
  },
  // Carte virtuelle
  {
    keywords: ["carte", "card", "visa", "virtuelle", "paiement carte"],
    response: "Concernant les cartes virtuelles PimPay:\n\n**4 types disponibles:**\n- CLASSIC: Limite 500$/mois\n- GOLD: Limite 2000$/mois\n- BUSINESS: Limite 10000$/mois\n- ULTRA: Limite illimitee\n\nPour generer une carte: Cartes > Creer une carte. Utilisable partout ou Visa est acceptee.",
    category: "carte"
  },
  // KYC
  {
    keywords: ["kyc", "verification", "identite", "verifier", "document"],
    response: "Pour la verification KYC:\n\n1. Allez dans **Profil** > **Verification**\n2. Uploadez votre piece d'identite (recto/verso)\n3. Prenez un selfie avec votre document\n4. Attendez la validation (< 24h)\n\n**Avantages:** Limites augmentees, acces a toutes les fonctionnalites.",
    category: "kyc"
  },
  // Transfert
  {
    keywords: ["transfert", "envoyer", "transfer", "send", "p2p", "envoi"],
    response: "Pour envoyer des fonds:\n\n**Transfert PimPay (P2P):**\n1. Allez dans **Envoyer**\n2. Entrez l'ID ou scannez le QR du destinataire\n3. Choisissez le montant et la devise\n4. Confirmez (frais: 1%)\n\n**Vers wallet externe:**\nAllez dans Portefeuille > Retirer vers wallet externe.",
    category: "transfert"
  },
  // Solde
  {
    keywords: ["solde", "balance", "combien", "avoir", "montant"],
    response: "Votre solde est visible sur votre tableau de bord principal. Pour voir le detail par devise, allez dans **Portefeuille**.\n\nVous pouvez consulter:\n- Solde total en FCFA\n- Solde par crypto (Pi, SDA, BTC...)\n- Historique des transactions",
    category: "solde"
  },
  // Sidra
  {
    keywords: ["sidra", "sda", "sidra chain"],
    response: "**Sidra Chain** est une blockchain conforme a la Charia integree dans PimPay.\n\n**Avantages:**\n- Frais de gaz quasi-nuls (~0.0001 SDA)\n- Transactions rapides\n- Compatible Halal\n\nVous pouvez stocker et echanger des SDA directement depuis votre portefeuille.",
    category: "crypto"
  },
  // Pi Network
  {
    keywords: ["pi", "pioneer", "pi network", "pi coin"],
    response: "**Pi Network** est integre a PimPay via le SDK v2.0.\n\n**Fonctionnalites:**\n- Gerer votre solde Pi\n- Faire des swaps Pi <-> autres devises\n- Transferts entre Pioneers\n- Paiements en Pi\n\nConnectez votre wallet Pi dans Parametres > Connexions.",
    category: "crypto"
  },
  // Staking
  {
    keywords: ["staking", "stake", "apy", "recompenses"],
    response: "Le **Staking** vous permet de bloquer des tokens pour recevoir des recompenses.\n\n**Comment ca marche:**\n1. Allez dans **Staking**\n2. Choisissez le token et la duree\n3. Verifiez le taux APY\n4. Confirmez le blocage\n\nLes recompenses sont calculees quotidiennement et creditees automatiquement.",
    category: "staking"
  },
  // Frais
  {
    keywords: ["frais", "fees", "commission", "cout", "tarif"],
    response: "**Grille tarifaire PimPay:**\n\n- Transfert P2P: 1%\n- Depot Mobile: 2%\n- Depot Carte: 3.5%\n- Retrait Mobile: 2.5%\n- Retrait Banque: 2%\n- Swap/Exchange: 0.1%\n- Carte virtuelle: 1.5%/transaction\n\nTous les frais sont affiches avant confirmation.",
    category: "frais"
  },
  // Securite
  {
    keywords: ["securite", "security", "pin", "mot de passe", "proteger", "2fa"],
    response: "**Securisez votre compte:**\n\n1. **PIN**: Definissez un code PIN 6 chiffres\n2. **2FA**: Activez l'authentification a deux facteurs\n3. **Biometrie**: Activez Face ID / Touch ID\n\nAllez dans **Parametres** > **Securite** pour configurer.",
    category: "securite"
  },
  // Support
  {
    keywords: ["support", "agent", "humain", "parler", "contacter"],
    response: "Je transfere votre demande a un agent du support PimPay. Un membre de notre equipe va vous repondre ici dans les plus brefs delais (generalement < 15 min pendant les heures ouvrables).\n\nEn attendant, puis-je vous aider avec autre chose ?",
    category: "support"
  },
  // Remerciements
  {
    keywords: ["merci", "thanks", "ok", "d'accord", "parfait", "super", "genial"],
    response: "Avec plaisir ! Je suis la pour vous aider. N'hesitez pas si vous avez d'autres questions - l'equipe PimPay et moi sommes a votre service 24/7.",
    category: "politesse"
  },
  // Salutations
  {
    keywords: ["bonjour", "salut", "hello", "hi", "bonsoir", "coucou"],
    response: "Bonjour ! Je suis **Elara**, votre assistante intelligente PimPay.\n\nComment puis-je vous aider aujourd'hui ? Vous pouvez me poser des questions sur:\n- Depots et retraits\n- Cartes virtuelles\n- Swaps et transferts\n- Verification KYC\n- Et bien plus !",
    category: "politesse"
  },
  // Problemes
  {
    keywords: ["probleme", "erreur", "bug", "marche pas", "bloque", "echec", "impossible"],
    response: "Je suis desolee pour ce desagrement. Pour mieux vous aider, pouvez-vous me preciser:\n\n1. **Quelle action** vous essayez de faire ?\n2. **Quel message d'erreur** s'affiche ?\n3. **Depuis quand** ce probleme persiste ?\n\nJe vais transmettre votre cas a un agent humain pour une resolution rapide.",
    category: "support"
  },
];

function getAutoReply(msg: string): string {
  const low = msg.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Find matching FAQ entry
  for (const faq of ELARA_FAQ) {
    for (const keyword of faq.keywords) {
      const normalizedKeyword = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (low.includes(normalizedKeyword)) {
        return faq.response;
      }
    }
  }

  // Default — escalate to human agent
  return "Je n'ai pas trouve de reponse precise a votre question dans ma base de connaissances.\n\nUn agent du support PimPay va vous repondre ici tres bientot (generalement < 15 min). En attendant, n'hesitez pas a preciser votre demande ou a poser une autre question !";
}
