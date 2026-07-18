import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { searchPlatformContent } from "@/lib/elara-platform-search";
import { searchWeb, formatWebResults } from "@/lib/elara-web-search";

// ---------------------------------------------------------------------------
// Elara — Le cerveau IA de PimPay (Pi Mobile Pay)
// ---------------------------------------------------------------------------
// Modèle servi via le Vercel AI Gateway (zero-config avec AI_GATEWAY_API_KEY).
export const ELARA_MODEL = "google/gemini-3.5-flash";

// ---------------------------------------------------------------------------
// 1. ALGORITHME DE DÉTECTION MULTILINGUE DYNAMIQUE (FR, EN, ZH)
// ---------------------------------------------------------------------------
export type Lang = "fr" | "en" | "zh";

// Mots-clés anglais déclenchant le routage EN (le chinois est détecté par Regex,
// sinon le français reste la langue par défaut).
const EN_KEYWORDS = [
  "how to", "how do", "how can", "withdraw", "deposit", "balance", "transfer",
  "swap", "wallet", "card", "please", "help", "language", "screenshot",
  "send money", "receive", "airtime", "top up", "security", "settings",
  "i want", "i can't", "i cannot", "doesn't work", "not working",
];

/**
 * Routage linguistique instantané :
 *  - Chinois (ZH) : présence d'un sinogramme.
 *  - Anglais (EN) : présence d'un mot-clé anglais courant.
 *  - Par défaut   : Français (FR).
 */
export function detectLang(message: string): Lang {
  if (/[\u4e00-\u9fa5]/.test(message)) return "zh";
  const m = message.toLowerCase();
  if (EN_KEYWORDS.some((k) => m.includes(k))) return "en";
  return "fr";
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ---------------------------------------------------------------------------
// Correspondance de mot-clé « à bordures de mot ».
// ---------------------------------------------------------------------------
// PROBLÈME CORRIGÉ : une simple recherche de sous-chaîne (`includes`) faisait
// matcher le mot-clé "mpay" à l'intérieur même du mot "PimPay" (piMPAYay),
// ce qui déclenchait à tort la réponse MPAY sur n'importe quel message
// mentionnant juste le nom de l'app (ex: "I'd like to talk to a PimPay
// support agent", "does pimpay require KYC?"). Idem pour d'autres mots courts
// ("pi", "map", "kyc"...) qui pouvaient apparaître à l'intérieur d'autres mots.
// On exige désormais que le mot-clé soit isolé (bordure = début/fin de chaîne
// ou caractère non alphanumérique). Les idéogrammes chinois n'ayant pas
// d'espaces, ce garde-fou ne les affecte pas : ils continuent de matcher par
// sous-chaîne comme avant.
function containsKeyword(haystack: string, keyword: string): boolean {
  if (!keyword) return false;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i");
  return re.test(` ${haystack} `);
}

// Sélectionne la variante dans la bonne langue (repli FR puis EN).
function pick(lang: Lang, variants: Record<Lang, string>): string {
  return variants[lang] || variants.fr || variants.en;
}

// ---------------------------------------------------------------------------
// 2. SYSTÈME DE CAPTURES D'ÉCRAN
// ---------------------------------------------------------------------------
// Accusé de réception affiché dès qu'une image (capture d'écran) est reçue.
export function getImageAckReply(lang: Lang): string {
  return pick(lang, {
    fr: "Merci pour la capture d'écran ! 🖼️ Un conseiller PimPay va l'analyser très vite.",
    en: "Thank you for the screenshot! 🖼️ A PimPay advisor will analyze it very soon.",
    zh: "感谢您的截图！🖼️ PimPay 顾问将很快进行分析。",
  });
}

// Demande proactive d'une capture d'écran quand un bug est décrit sans image.
function getScreenshotPrompt(lang: Lang): string {
  return pick(lang, {
    fr: "Je comprends, cela semble être un souci technique. 🛠️\n\n📸 Pouvez-vous m'envoyer une **capture d'écran** de cet écran (via l'icône 🖼️ à côté de la zone de saisie) pour que je puisse vous guider pas à pas ?",
    en: "I understand, this looks like a technical issue. 🛠️\n\n📸 Could you send me a **screenshot** of this screen (using the 🖼️ icon next to the input field) so I can guide you step by step?",
    zh: "我明白了，这似乎是一个技术问题。🛠️\n\n📸 您能否通过输入框旁边的 🖼️ 图标，发送一张该屏幕的**截图**，以便我一步步指导您？",
  });
}

// Mots décrivant un bug / problème technique (déclencheur proactif).
const PROBLEM_KEYWORDS = [
  // FR
  "bug", "erreur", "probleme", "ne marche pas", "ne fonctionne pas", "marche pas",
  "fonctionne pas", "bloque", "bloquee", "plante", "echoue", "echec", "souci",
  "impossible", "ca bug", "ne s'affiche pas", "ne charge pas", "ne s'ouvre pas",
  // EN
  "error", "problem", "issue", "doesn't work", "does not work", "not working",
  "stuck", "failed", "fails", "crash", "glitch", "broken", "won't load", "can't open",
  // ZH
  "错误", "问题", "故障", "无法", "不能", "卡住", "崩溃", "失败", "打不开", "加载不了",
];

function describesProblem(message: string): boolean {
  const m = normalize(message);
  return PROBLEM_KEYWORDS.some((k) => containsKeyword(m, normalize(k)));
}

// ---------------------------------------------------------------------------
// 3. DÉTECTION « PARLER À UN AGENT HUMAIN » (multilingue) + LIEN WHATSAPP
// ---------------------------------------------------------------------------
const SUPPORT_PHRASES = [
  // FR
  "parler a un agent", "parler a un conseiller", "parler au support", "parler a un humain",
  "agent du support", "agent humain", "un vrai agent", "contacter le support",
  "contacter un agent", "joindre le support", "joindre un agent", "assistance humaine",
  "support humain", "service client", "un conseiller", "une personne reelle",
  "besoin d'aide", "besoin d aide", "elara aide moi", "parler a quelqu'un",
  "je veux un humain", "reclamation", "plainte",
  // EN
  "speak to an agent", "talk to an agent", "talk to a human", "human agent",
  "real agent", "contact support", "customer service", "speak to support", "live agent",
  "need help", "i need assistance", "complaint",
  // ZH
  "与客服人员联系", "联系客服", "人工客服", "真人客服", "转人工", "我需要帮助", "投诉",
];

export function detectSupportIntent(message: string): boolean {
  const m = normalize(message);
  // 1) Phrases exactes connues (bordures de mot pour éviter les faux positifs).
  if (SUPPORT_PHRASES.some((p) => containsKeyword(m, normalize(p)))) return true;

  // 2) Heuristique combinatoire : couvre les formulations non prévues dans la
  //    liste ci-dessus (ex : "I'd like to talk to a PimPay support agent").
  //    Un verbe de contact + un mot désignant un humain/support suffit.
  const contactVerbs = [
    "parler", "contacter", "joindre", "appeler", "discuter",
    "speak", "talk", "contact", "call", "chat with",
    "联系", "找",
  ];
  const humanNouns = [
    "agent", "conseiller", "support", "humain", "personne", "quelqu'un", "assistance",
    "human", "advisor", "representative", "someone",
    "客服", "人工", "顾问",
  ];
  const hasContactVerb = contactVerbs.some((k) => containsKeyword(m, normalize(k)));
  const hasHumanNoun = humanNouns.some((k) => containsKeyword(m, normalize(k)));
  return hasContactVerb && hasHumanNoun;
}

// Numéro de support PimPay — jamais affiché en clair dans les réponses.
// Il n'est utilisé que dans l'URL wa.me, dissimulé derrière un lien texte.
const WHATSAPP_URL = "https://wa.me/242065540305";

// Lien WhatsApp cliquable (format markdown [texte](url)), rendu par les bulles
// de chat côté client — jamais le numéro brut n'est exposé à l'utilisateur.
function getWhatsAppLink(lang: Lang): string {
  return pick(lang, {
    fr: `[💬 Discuter avec le support sur WhatsApp](${WHATSAPP_URL})`,
    en: `[💬 Chat with support on WhatsApp](${WHATSAPP_URL})`,
    zh: `[💬 通过 WhatsApp 联系客服](${WHATSAPP_URL})`,
  });
}

// Réponse quand l'utilisateur demande EXPLICITEMENT un agent humain :
// Elara collecte la préoccupation, rassure, et propose un lien direct vers WhatsApp.
export function getSupportIntentReply(lang: Lang): string {
  const wa = getWhatsAppLink(lang);
  return pick(lang, {
    fr: `Bien sûr, je transmets votre demande à un agent du support PimPay. 📩\n\nPour qu'il vous aide efficacement, pouvez-vous décrire précisément **votre préoccupation** ? Donnez le maximum de détails (service concerné, montant, message d'erreur…). Un conseiller vous répondra ici dès que possible.\n\nVous pouvez aussi obtenir une réponse plus rapide directement sur WhatsApp :\n${wa}`,
    en: `Of course, I'm forwarding your request to a PimPay support agent. 📩\n\nSo they can help you efficiently, could you describe **your concern** precisely? Give as much detail as possible (the service involved, amount, any error message…). An advisor will reply here as soon as possible.\n\nYou can also get a faster answer directly on WhatsApp:\n${wa}`,
    zh: `当然，我正在将您的请求转发给 PimPay 客服人员。📩\n\n为了让他们能高效地帮助您，请您详细描述**您的问题**（涉及的服务、金额、任何错误信息……）。顾问将尽快在此回复您。\n\n您也可以直接通过 WhatsApp 获得更快的回复：\n${wa}`,
  });
}

// Conservé pour rétro-compatibilité (valeur FR par défaut).
export const SUPPORT_INTENT_REPLY = getSupportIntentReply("fr");

// Message de repli (section M) : aucune correspondance trouvée. Propose
// systématiquement le lien WhatsApp pour ne jamais laisser l'utilisateur bloqué.
function getFallbackReply(lang: Lang): string {
  const wa = getWhatsAppLink(lang);
  return pick(lang, {
    fr: `Je n'ai pas trouvé de réponse précise à votre question dans ma base de connaissances. 🤔\n\nReformulez votre demande, ou parlez directement à un conseiller PimPay ici :\n${wa}`,
    en: `I couldn't find a specific answer to your question in my knowledge base. 🤔\n\nPlease rephrase your request, or talk directly to a PimPay advisor here:\n${wa}`,
    zh: `抱歉，未在我的知识库中找到确切答案。🤔\n\n请尝试重新表述您的请求，或直接在此联系 PimPay 顾问：\n${wa}`,
  });
}

// ---------------------------------------------------------------------------
// 4. BASE DE CONNAISSANCES ABSOLUE DE PIMPAY
// ---------------------------------------------------------------------------
// Chaque réponse est un guide pas-à-pas structuré (puces + émojis) indiquant le
// chemin d'accès exact dans l'interface. Certaines réponses sont DYNAMIQUES
// (variations selon l'actif, le protocole ou la paire mentionnés).

type Responder = (lang: Lang, message: string) => string;
interface KBEntry {
  keywords: string[];
  respond: Responder;
}

// --- Détection dynamique d'actifs (pour Wallet & Swap) ---
const ASSETS: { id: string; label: string; kw: string[] }[] = [
  { id: "PI", label: "🥧 Pi Network (PI)", kw: ["pi network", "pi coin", "pi"] },
  { id: "SDA", label: "🌙 Sidra Chain (SDA)", kw: ["sidra", "sda"] },
  { id: "USDT", label: "🟢 Tether USD (USDT)", kw: ["usdt", "tether"] },
  { id: "TRX", label: "🪙 Tron (TRX)", kw: ["trx", "tron"] },
  { id: "BNB", label: "⚡ Binance Coin (BNB)", kw: ["bnb", "binance"] },
  { id: "SOL", label: "☀️ Solana (SOL)", kw: ["solana", "sol"] },
  { id: "XRP", label: "💥 Ripple (XRP)", kw: ["xrp", "ripple"] },
  { id: "XLM", label: "🚀 Stellar Lumens (XLM)", kw: ["xlm", "stellar", "lumens"] },
  { id: "BTC", label: "🌍 Bitcoin (BTC)", kw: ["btc", "bitcoin"] },
  { id: "ETH", label: "🌍 Ethereum (ETH)", kw: ["eth", "ethereum"] },
];

function detectAssets(message: string): string[] {
  const m = normalize(message);
  return ASSETS.filter((a) => a.kw.some((k) => containsKeyword(m, normalize(k)))).map((a) => a.id);
}

const KNOWLEDGE_BASE: KBEntry[] = [
  // E. DÉPÔT (CASH IN) — placé en premier : restriction critique Vercel.
  {
    keywords: [
      "depot", "deposit", "deposer", "recharger compte", "recharger mon compte",
      "alimenter", "cash in", "vercel", "pimpay.vercel", "pi browser", "vibe-coded",
      "vibe coded", "充值", "存款", "存钱",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Pour recharger votre compte, allez sur 📥 **DEPOT** ➡️ sous-onglet ⚡ **CRYPTO**.\n\n⚠️ **ATTENTION (règle critique) :** l'adresse `pimpay.vercel.app` **bloque techniquement** l'initialisation du portefeuille Pi. **Ne tapez JAMAIS l'adresse Vercel !**\n\n✅ Vous devez obligatoirement :\n• Ouvrir votre **Pi Browser** 🌐\n• Aller sur l'onglet **vibe-coded** de l'écosystème, **ou** faire une recherche directe de **'pimpay'** dans le répertoire officiel.\n• Entrer le montant de Pi, puis cliquer sur **« VÉRIFIER LE DÉPÔT »** (chiffré en AES-256 🔒).\n\n📱 Les recharges **Mobile Money** (MTN MoMo, Airtel au Congo-Brazzaville) et 💳 **CARTE** sont **inactives pendant le Testnet**.",
        en: "To top up your account, go to 📥 **DEPOSIT** ➡️ ⚡ **CRYPTO** sub-tab.\n\n⚠️ **WARNING (critical rule):** the `pimpay.vercel.app` address **technically blocks** the Pi wallet initialization. **NEVER type the Vercel address!**\n\n✅ You MUST:\n• Open your **Pi Browser** 🌐\n• Go to the **vibe-coded** tab of the ecosystem, **or** search directly for **'pimpay'** in the official directory.\n• Enter the Pi amount, then tap **\"VERIFY DEPOSIT\"** (AES-256 encrypted 🔒).\n\n📱 **Mobile Money** top-ups (MTN MoMo, Airtel in Congo-Brazzaville) and 💳 **CARD** are **inactive during the Testnet**.",
        zh: "要为您的账户充值，请前往 📥 **DEPOT（充值）** ➡️ ⚡ **CRYPTO（加密货币）** 子标签。\n\n⚠️ **警告（关键规则）：** `pimpay.vercel.app` 地址会**从技术上阻止** Pi 钱包的初始化。**切勿输入 Vercel 地址！**\n\n✅ 您必须：\n• 打开您的 **Pi Browser** 🌐\n• 进入生态系统的 **vibe-coded** 标签，**或**在官方目录中直接搜索 **'pimpay'**。\n• 输入 Pi 数量，然后点击 **「VÉRIFIER LE DÉPÔT（验证存款）」**（AES-256 加密 🔒）。\n\n📱 **移动支付**充值（刚果-布拉柴维尔的 MTN MoMo、Airtel）和 💳 **银行卡**在**测试网期间不可用**。",
      }),
  },

  // F. RETRAIT (CASH OUT)
  {
    keywords: [
      "retrait", "withdraw", "retirer", "cash out", "m-pesa", "mpesa", "orange money",
      "airtel money", "africell", "提现", "取款", "取现",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Pour effectuer un retrait, allez sur 📤 **RETRAIT** dans le menu du bas.\n\n• Sélectionnez le **Congo (RDC)** 🇨🇩 pour envoyer vos fonds vers votre portefeuille local.\n• Opérateurs pris en charge : **M-Pesa**, **Orange Money**, **Airtel Money** et **Africell Money** 📲.\n\n⏳ Ces retraits seront **validés dès la fin de la phase de test (Testnet)**.",
        en: "To make a withdrawal, go to 📤 **WITHDRAW** in the bottom menu.\n\n• Select **Congo (DRC)** 🇨🇩 to send your funds to your local wallet.\n• Supported operators: **M-Pesa**, **Orange Money**, **Airtel Money** and **Africell Money** 📲.\n\n⏳ These withdrawals will be **validated once the test phase (Testnet) ends**.",
        zh: "要进行提现，请在底部菜单中点击 📤 **RETRAIT（提现）**。\n\n• 选择 **刚果（金）** 🇨🇩 将资金发送到您的本地钱包。\n• 支持的运营商：**M-Pesa**、**Orange Money**、**Airtel Money** 和 **Africell Money** 📲。\n\n⏳ 这些提现将在**测试网阶段结束后立即生效**。",
      }),
  },

  // H. MSWAP — routage dynamique selon la paire.
  {
    keywords: [
      "swap", "mswap", "echanger", "convertir", "conversion", "slippage", "sunswap",
      "soroban", "taux de change", "兑换", "交换", "汇率",
    ],
    respond: (lang, message) => {
      const assets = detectAssets(message);
      const has = (id: string) => assets.includes(id);
      const m = normalize(message);

      // Paire USDT / TRX → SunSwap V2.
      if ((has("USDT") && has("TRX")) || m.includes("sunswap")) {
        return pick(lang, {
          fr: "Pour la paire **USDT / TRX** 🔄, le protocole **MSwap** utilise un routage **décentralisé** exécuté en direct via l'agrégateur **SunSwap V2 (Sun.io sur Tron)** 🪙.\n\nChemin : 📱 **MENU** ➡️ 🔄 **Swap**. Frais réseau fixes : **0.01 USDT** • Taux actualisés toutes les **30 s** • Slippage ajustable (0.5 % / 1 % / 3 %).",
          en: "For the **USDT / TRX** pair 🔄, the **MSwap** protocol uses **decentralized** routing executed live via the **SunSwap V2 (Sun.io on Tron)** aggregator 🪙.\n\nPath: 📱 **MENU** ➡️ 🔄 **Swap**. Fixed network fee: **0.01 USDT** • Rates refreshed every **30 s** • Adjustable slippage (0.5% / 1% / 3%).",
          zh: "对于 **USDT / TRX** 交易对 🔄，**MSwap** 协议通过 **SunSwap V2（Tron 上的 Sun.io）** 聚合器进行实时**去中心化**路由 🪙。\n\n路径：📱 **MENU** ➡️ 🔄 **Swap**。固定网络费：**0.01 USDT** • 汇率每 **30 秒**刷新 • 可调滑点（0.5% / 1% / 3%）。",
        });
      }

      // Paire Pi / SDA → Soroban Protocol (Stellar).
      if ((has("PI") && has("SDA")) || m.includes("soroban")) {
        return pick(lang, {
          fr: "L'échange entre **Pi Network** et **Sidra Chain (SDA)** 🌙 est exécuté de manière sécurisée via le **Soroban Protocol** (réseau **Stellar**) ⭐.\n\nChemin : 📱 **MENU** ➡️ 🔄 **Swap**. Frais réseau fixes : **0.01 USDT** • Taux en direct (30 s) • Protégé par *PimPay Ledger Technology*.",
          en: "The swap between **Pi Network** and **Sidra Chain (SDA)** 🌙 is executed securely via the **Soroban Protocol** (**Stellar** network) ⭐.\n\nPath: 📱 **MENU** ➡️ 🔄 **Swap**. Fixed network fee: **0.01 USDT** • Live rates (30 s) • Protected by *PimPay Ledger Technology*.",
          zh: "**Pi Network** 与 **Sidra Chain (SDA)** 🌙 之间的兑换通过 **Soroban Protocol**（**Stellar** 网络）⭐ 安全执行。\n\n路径：📱 **MENU** ➡️ 🔄 **Swap**。固定网络费：**0.01 USDT** • 实时汇率（30 秒）• 由 *PimPay Ledger Technology* 保护。",
        });
      }

      // Général + autres actifs (pools cross-chain internes).
      return pick(lang, {
        fr: "Pour convertir vos actifs, allez dans 📱 **MENU** ➡️ 🔄 **Swap**.\n\n• Taux du marché actualisés toutes les **30 s** ⏱️\n• Frais réseau fixes : **0.01 USDT** 💸\n• Slippage au choix : **0.5 %**, **1 %** ou **3 %**\n• Protégé par *PimPay Ledger Technology* 🔒\n\n🔀 Routage : **USDT/TRX** via **SunSwap V2** (Tron) • **Pi/SDA** via **Soroban** (Stellar) • autres actifs (BTC, ETH, BNB, SOL, XRP, XLM, XAF) via les **pools cross-chain internes PimPay**.",
        en: "To convert your assets, go to 📱 **MENU** ➡️ 🔄 **Swap**.\n\n• Market rates refreshed every **30 s** ⏱️\n• Fixed network fee: **0.01 USDT** 💸\n• Adjustable slippage: **0.5%**, **1%** or **3%**\n• Protected by *PimPay Ledger Technology* 🔒\n\n🔀 Routing: **USDT/TRX** via **SunSwap V2** (Tron) • **Pi/SDA** via **Soroban** (Stellar) • other assets (BTC, ETH, BNB, SOL, XRP, XLM, XAF) via **PimPay internal cross-chain pools**.",
        zh: "要兑换您的资产，请前往 📱 **MENU** ➡️ 🔄 **Swap**。\n\n• 市场汇率每 **30 秒**刷新 ⏱️\n• 固定网络费：**0.01 USDT** 💸\n• 可调滑点：**0.5%**、**1%** 或 **3%**\n• 由 *PimPay Ledger Technology* 保护 🔒\n\n🔀 路由：**USDT/TRX** 通过 **SunSwap V2**（Tron）• **Pi/SDA** 通过 **Soroban**（Stellar）• 其他资产（BTC、ETH、BNB、SOL、XRP、XLM、XAF）通过 **PimPay 内部跨链资金池**。",
      });
    },
  },

  // I. TRANSFERT & ENVOI — interne (P2P) vs externe (blockchain).
  {
    keywords: [
      "transfert", "envoi", "envoyer", "transferer", "p2p", "username", "@",
      "externe", "interne", "adresse blockchain", "转账", "发送", "转给",
    ],
    respond: (lang, message) => {
      const m = normalize(message);
      const external = ["externe", "external", "blockchain", "adresse", "address", "trc20", "外部", "区块链"].some((k) => m.includes(normalize(k)));
      const internal = ["interne", "internal", "username", "@", "p2p", "ami", "contact", "内部"].some((k) => m.includes(normalize(k)));

      if (external && !internal) {
        return pick(lang, {
          fr: "Pour un **Transfert Externe** 📤 (sortant / blockchain), allez dans l'onglet ✈️ **ENVOI** du menu inférieur.\n\n• Envoyez vos crypto-actifs vers une **adresse de portefeuille blockchain publique externe** (ex : USDT TRC20, adresse Pi, Tron, Stellar…).\n• Ou vers un **numéro de compte Mobile Money externe** régional.\n\n⚠️ Vérifiez toujours l'adresse de destination avant de valider.",
          en: "For an **External Transfer** 📤 (outgoing / blockchain), go to the ✈️ **SEND** tab in the bottom menu.\n\n• Send your crypto assets to an **external public blockchain wallet address** (e.g. USDT TRC20, Pi address, Tron, Stellar…).\n• Or to an **external regional Mobile Money** account number.\n\n⚠️ Always double-check the destination address before confirming.",
          zh: "进行**外部转账** 📤（出账/区块链），请在底部菜单中点击 ✈️ **ENVOI（发送）** 标签。\n\n• 将加密资产发送到**外部公共区块链钱包地址**（如 USDT TRC20、Pi 地址、Tron、Stellar……）。\n• 或发送到**外部区域性移动支付**账号。\n\n⚠️ 确认前请务必核对收款地址。",
        });
      }

      if (internal && !external) {
        return pick(lang, {
          fr: "Pour un **Transfert Interne (P2P gratuit)** 🔄, allez dans l'onglet ✈️ **ENVOI**.\n\n• Saisissez l'identifiant du destinataire PimPay dans le champ de recherche : `@username` (ex : `@aimard`, `@243newtech`), son **email** ou son **téléphone** 📞.\n• Envoi **instantané** et **sans frais** ✅.\n• Sécurisé par le *PimPay Secure Protocol* (transaction chiffrée de bout-en-bout 🔒).",
          en: "For an **Internal Transfer (free P2P)** 🔄, go to the ✈️ **SEND** tab.\n\n• Enter the PimPay recipient's ID in the search field: `@username` (e.g. `@aimard`, `@243newtech`), their **email** or **phone** 📞.\n• **Instant** and **fee-free** transfer ✅.\n• Secured by the *PimPay Secure Protocol* (end-to-end encrypted transaction 🔒).",
          zh: "进行**内部转账（免费 P2P）** 🔄，请前往 ✈️ **ENVOI（发送）** 标签。\n\n• 在搜索框中输入 PimPay 收款人的标识：`@username`（如 `@aimard`、`@243newtech`）、**电子邮件**或**电话** 📞。\n• **即时**且**免费**转账 ✅。\n• 由 *PimPay Secure Protocol* 保护（端到端加密交易 🔒）。",
        });
      }

      return pick(lang, {
        fr: "Pour effectuer un transfert, accédez à l'onglet ✈️ **ENVOI** du menu inférieur. Deux choix s'offrent à vous :\n\n• 🔄 **Transfert Interne (Gratuit)** : entrez le `@username` (ex : `@aimard`), l'email ou le téléphone de votre destinataire PimPay pour un envoi **instantané chiffré de bout-en-bout** 🔒.\n• 📤 **Transfert Externe** : envoyez vos crypto-actifs vers une **adresse blockchain externe publique** (Tron, Stellar) ou vers un **numéro Mobile Money externe**.",
        en: "To make a transfer, go to the ✈️ **SEND** tab in the bottom menu. You have two options:\n\n• 🔄 **Internal Transfer (Free)**: enter the `@username` (e.g. `@aimard`), email or phone of your PimPay recipient for an **instant, end-to-end encrypted** transfer 🔒.\n• 📤 **External Transfer**: send your crypto assets to an **external public blockchain address** (Tron, Stellar) or to an **external Mobile Money number**.",
        zh: "要进行转账，请前往底部菜单的 ✈️ **ENVOI（发送）** 标签。您有两种选择：\n\n• 🔄 **内部转账（免费）**：输入 PimPay 收款人的 `@username`（如 `@aimard`）、电子邮件或电话，即可进行**即时端到端加密**转账 🔒。\n• 📤 **外部转账**：将加密资产发送到**外部公共区块链地址**（Tron、Stellar）或**外部移动支付号码**。",
      });
    },
  },

  // F2. MOBILE MONEY (général) & DISPONIBILITÉ PAR PAYS.
  {
    keywords: [
      "mobile money", "mobile mony", "mobil money", "momo", "paiement mobile", "mobile payment",
      "disponible dans mon pays", "disponible dans quel pays", "quel pays", "quels pays",
      "pays disponible", "pays couverts", "which countries", "available in my country",
      "available in", "not available in", "n'es pas disponible", "n'est pas disponible",
      "pas disponible dans", "geniuspay", "pawapay",
      "mali", "senegal", "cote d'ivoire", "cameroun", "gabon", "benin", "togo",
      "niger", "burkina", "guinee", "nigeria", "ghana", "kenya", "tchad",
      "centrafrique", "congo brazzaville", "rdc", "congo kinshasa",
      "afrique du sud", "maroc", "algerie", "tunisie", "egypte", "rwanda", "burundi",
      "tanzanie", "tanzania", "ouganda", "uganda", "zambie", "zambia", "ethiopie", "ethiopia",
      "mozambique", "malawi", "lesotho", "sierra leone", "guinee-bissau",
      "移动支付", "哪些国家", "国家",
    ],
    respond: (lang, message) => {
      const m = normalize(message);
      // Pays actuellement actifs pour le Mobile Money : couverts par l'agrégateur
      // GeniusPay (zone UEMOA/XOF native) et/ou PawaPay, ET activés côté app.
      const ACTIVE_COUNTRIES: Record<Lang, string> = {
        fr: "🇳🇬 Nigeria, 🇬🇭 Ghana, 🇬🇦 Gabon, 🇨🇲 Cameroun, 🇲🇱 Mali, 🇧🇫 Burkina Faso, 🇧🇯 Bénin, 🇨🇬 Congo-Brazzaville, 🇨🇩 RDC, 🇨🇮 Côte d'Ivoire, 🇸🇳 Sénégal, 🇰🇪 Kenya, 🇹🇿 Tanzanie, 🇺🇬 Ouganda, 🇷🇼 Rwanda, 🇪🇹 Éthiopie, 🇿🇲 Zambie, 🇲🇿 Mozambique",
        en: "🇳🇬 Nigeria, 🇬🇭 Ghana, 🇬🇦 Gabon, 🇨🇲 Cameroon, 🇲🇱 Mali, 🇧🇫 Burkina Faso, 🇧🇯 Benin, 🇨🇬 Congo-Brazzaville, 🇨🇩 DRC, 🇨🇮 Côte d'Ivoire, 🇸🇳 Senegal, 🇰🇪 Kenya, 🇹🇿 Tanzania, 🇺🇬 Uganda, 🇷🇼 Rwanda, 🇪🇹 Ethiopia, 🇿🇲 Zambia, 🇲🇿 Mozambique",
        zh: "🇳🇬 尼日利亚, 🇬🇭 加纳, 🇬🇦 加蓬, 🇨🇲 喀麦隆, 🇲🇱 马里, 🇧🇫 布基纳法索, 🇧🇯 贝宁, 🇨🇬 刚果（布）, 🇨🇩 刚果（金）, 🇨🇮 科特迪瓦, 🇸🇳 塞内加尔, 🇰🇪 肯尼亚, 🇹🇿 坦桑尼亚, 🇺🇬 乌干达, 🇷🇼 卢旺达, 🇪🇹 埃塞俄比亚, 🇿🇲 赞比亚, 🇲🇿 莫桑比克",
      };
      const COMING_SOON: Record<Lang, string> = {
        fr: "Malawi, Lesotho, Sierra Leone, Togo, Niger, Guinée-Bissau",
        en: "Malawi, Lesotho, Sierra Leone, Togo, Niger, Guinea-Bissau",
        zh: "马拉维、莱索托、塞拉利昂、多哥、尼日尔、几内亚比绍",
      };
      const NAMED_COUNTRIES = ["mali", "senegal", "cote d'ivoire", "cameroun", "gabon", "benin",
        "burkina", "nigeria", "ghana", "kenya", "rwanda", "tanzanie", "tanzania", "ouganda",
        "uganda", "zambie", "zambia", "ethiopie", "ethiopia", "mozambique",
        "congo brazzaville", "rdc", "congo kinshasa"];
      const COMING_SOON_COUNTRIES = ["togo", "niger", "malawi", "lesotho", "sierra leone", "guinee-bissau", "guinee bissau"];
      const namedActive = NAMED_COUNTRIES.some((k) => containsKeyword(m, k));
      const namedComingSoon = COMING_SOON_COUNTRIES.some((k) => containsKeyword(m, k));

      const countryNote = namedActive
        ? pick(lang, {
            fr: "\n\n✅ Bonne nouvelle : ce pays fait partie des pays actuellement pris en charge pour le Mobile Money.",
            en: "\n\n✅ Good news: this country is among those currently supported for Mobile Money.",
            zh: "\n\n✅ 好消息：该国家目前支持移动支付。",
          })
        : namedComingSoon
        ? pick(lang, {
            fr: "\n\n🔜 Ce pays est déjà couvert techniquement par nos agrégateurs mais n'est pas encore activé dans l'application — son ouverture est prévue prochainement.",
            en: "\n\n🔜 This country is already technically covered by our aggregators but not yet enabled in the app — it's scheduled to open soon.",
            zh: "\n\n🔜 该国家已在我们的支付聚合商技术覆盖范围内，但尚未在应用中开放，即将上线。",
          })
        : "";

      return pick(lang, {
        fr: `Le **Mobile Money** sur PimPay est traité via deux agrégateurs de paiement : **GeniusPay** (prioritaire) et **PawaPay** (en secours) 📲.\n\n✅ **Pays actuellement pris en charge** (dépôt & retrait) :\n${ACTIVE_COUNTRIES.fr}.\n\n🔜 **Bientôt disponibles** (déjà couverts techniquement, activation prochaine) : ${COMING_SOON.fr}.\n\nSi votre pays n'apparaît pas encore, l'ouverture se poursuit progressivement. Pour toute question ou demande d'extension, contactez le support :\n${getWhatsAppLink(lang)}${countryNote}`,
        en: `**Mobile Money** on PimPay is processed through two payment aggregators: **GeniusPay** (primary) and **PawaPay** (fallback) 📲.\n\n✅ **Currently supported countries** (deposit & withdrawal):\n${ACTIVE_COUNTRIES.en}.\n\n🔜 **Coming soon** (already covered technically, activation pending): ${COMING_SOON.en}.\n\nIf your country isn't listed yet, coverage keeps expanding. For any question or request, contact support:\n${getWhatsAppLink(lang)}${countryNote}`,
        zh: `PimPay 上的**移动支付**通过两个支付聚合商处理：**GeniusPay**（主要）和 **PawaPay**（备用）📲。\n\n✅ **当前支持的国家**（充值与提现）：\n${ACTIVE_COUNTRIES.zh}。\n\n🔜 **即将开放**（已获技术覆盖，等待启用）：${COMING_SOON.zh}。\n\n如果您的国家尚未上线，覆盖范围仍在持续扩展。如有任何问题，请联系客服：\n${getWhatsAppLink(lang)}${countryNote}`,
      });
    },
  },


  // G. AIRTIME (recharge télécom).
  {
    keywords: [
      "airtime", "recharge mobile", "credit telephonique", "credit telephone",
      "forfait", "unites", "recharge telephone", "top up", "话费", "手机充值", "充话费",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Pour acheter du crédit téléphonique, allez dans 📱 **MENU** ➡️ 📱 **Recharge Mobile** (Airtime).\n\n• Convertissez votre **solde Pi disponible** pour recharger instantanément n'importe quel numéro en **RDC** 🇨🇩.\n• Réseaux pris en charge : **M-Pesa, Orange, Airtel et Africell Money** 📲.\n\n⚡ Crédit, unités ou forfaits : la recharge est instantanée.",
        en: "To buy phone credit, go to 📱 **MENU** ➡️ 📱 **Mobile Top-up** (Airtime).\n\n• Convert your **available Pi balance** to instantly top up any number in the **DRC** 🇨🇩.\n• Supported networks: **M-Pesa, Orange, Airtel and Africell Money** 📲.\n\n⚡ Credit, units or bundles: the top-up is instant.",
        zh: "要购买话费，请前往 📱 **MENU** ➡️ 📱 **Recharge Mobile（手机充值 / Airtime）**。\n\n• 使用您的**可用 Pi 余额**即时为**刚果（金）** 🇨🇩 的任意号码充值。\n• 支持的网络：**M-Pesa、Orange、Airtel 和 Africell Money** 📲。\n\n⚡ 话费、流量或套餐：充值即时到账。",
      }),
  },

  // C. MPAY & MAP OF PI.
  {
    keywords: [
      "mpay", "m-pay", "map of pi", "map", "scanner", "payer marchand", "recevoir",
      "qr code", "qr", "commerce", "boutique physique", "商家", "扫描", "二维码",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Cliquez sur le bouton central bleu 📱 **MPAY** du menu inférieur.\n\n• 🔍 **Scanner** un QR Code\n• 🛍️ **Payer** un marchand\n• ✈️ **Envoyer** des Pi\n• 📥 **Recevoir** (afficher votre code)\n\n🗺️ Utilisez la **Map of Pi** intégrée pour localiser les boutiques physiques partenaires qui acceptent vos Pi : *Pi Cafe Dakar, TechPi Store, Pi Market Express, Pi Fashion Boutique, Pi Gas Station, Pi Pharmacy Plus*.",
        en: "Tap the central blue 📱 **MPAY** button in the bottom menu.\n\n• 🔍 **Scan** a QR Code\n• 🛍️ **Pay** a merchant\n• ✈️ **Send** Pi\n• 📥 **Receive** (show your code)\n\n🗺️ Use the built-in **Map of Pi** to locate partner physical stores that accept your Pi: *Pi Cafe Dakar, TechPi Store, Pi Market Express, Pi Fashion Boutique, Pi Gas Station, Pi Pharmacy Plus*.",
        zh: "点击底部菜单中央的蓝色 📱 **MPAY** 按钮。\n\n• 🔍 **扫描** 二维码\n• 🛍️ **支付**给商家\n• ✈️ **发送** Pi\n• 📥 **接收**（显示您的收款码）\n\n🗺️ 使用内置的 **Map of Pi** 查找接受 Pi 的合作实体店：*Pi Cafe Dakar、TechPi Store、Pi Market Express、Pi Fashion Boutique、Pi Gas Station、Pi Pharmacy Plus*。",
      }),
  },

  // D. M-CARD (Mastercard Gold virtuelle).
  {
    keywords: [
      "carte", "card", "mastercard", "carte virtuelle", "virtual card", "reveler",
      "cvv", "m-card", "numero de carte", "银行卡", "虚拟卡", "万事达",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Pour gérer votre carte, allez dans 📱 **MENU** ➡️ 💳 **Carte virtuelle** (ou via le raccourci carte depuis l'Accueil).\n\n• Votre **M-Card** est une carte virtuelle internationale liée à votre solde **USD** 💵, disponible en **Mastercard** 🟠 comme en **Visa** 🔵.\n• 👁️ **RÉVÉLER** : afficher le numéro complet et le CVV en toute sécurité.\n• 🔄 **VERSO** : retourner la carte • 📋 **COPIER** : copier le numéro pour vos achats en ligne.",
        en: "To manage your card, go to 📱 **MENU** ➡️ 💳 **Virtual Card** (or via the card shortcut from Home).\n\n• Your **M-Card** is an international virtual card linked to your **USD** balance 💵, available as both **Mastercard** 🟠 and **Visa** 🔵.\n• 👁️ **REVEAL**: securely display the full number and CVV.\n• 🔄 **FLIP**: turn the card over • 📋 **COPY**: copy the number for your online purchases.",
        zh: "要管理您的银行卡，请前往 📱 **MENU** ➡️ 💳 **Carte virtuelle（虚拟卡）**（或通过首页的卡片快捷方式）。\n\n• 您的 **M-Card** 是一张关联 **USD** 余额 💵 的国际虚拟卡，提供 **Mastercard** 🟠 和 **Visa** 🔵 两种选择。\n• 👁️ **RÉVÉLER（显示）**：安全显示完整卡号和 CVV。\n• 🔄 **VERSO（翻转）**：翻转卡片 • 📋 **COPIER（复制）**：复制卡号用于网上购物。",
      }),
  },

  // B. M-WALLET & LISTE DES ACTIFS — réponse enrichie si un actif est cité.
  {
    keywords: [
      "wallet", "m-wallet", "portefeuille", "mes cryptos", "mes actifs",
      "liste des actifs", "assets", "crypto", "pi network", "sidra", "sda", "usdt",
      "tether", "tron", "trx", "bnb", "binance", "solana", "xrp", "ripple", "stellar",
      "xlm", "lumens", "bitcoin", "btc", "ethereum", "eth", "钱包", "资产", "加密货币",
    ],
    respond: (lang, message) => {
      const assets = detectAssets(message);
      const base = pick(lang, {
        fr: "Pour voir le détail de vos cryptomonnaies, accédez à l'onglet 💳 **WALLET** dans le menu du bas.\n\nPimPay supporte nativement ces actifs majeurs :\n• 🥧 Pi Network (PI)\n• 🌙 Sidra Chain (SDA)\n• 🟢 USDT (TRC20/ERC20)\n• 🪙 Tron (TRX)\n• ⚡ Binance Coin (BNB)\n• ☀️ Solana (SOL)\n• 💥 Ripple (XRP)\n• 🚀 Stellar Lumens (XLM)\n• 🌍 Bitcoin (BTC) & Ethereum (ETH)",
        en: "To see the details of your cryptocurrencies, open the 💳 **WALLET** tab in the bottom menu.\n\nPimPay natively supports these major assets:\n• 🥧 Pi Network (PI)\n• 🌙 Sidra Chain (SDA)\n• 🟢 USDT (TRC20/ERC20)\n• 🪙 Tron (TRX)\n• ⚡ Binance Coin (BNB)\n• ☀️ Solana (SOL)\n• 💥 Ripple (XRP)\n• 🚀 Stellar Lumens (XLM)\n• 🌍 Bitcoin (BTC) & Ethereum (ETH)",
        zh: "要查看您加密货币的详情，请打开底部菜单的 💳 **WALLET（钱包）** 标签。\n\nPimPay 原生支持以下主要资产：\n• 🥧 Pi Network (PI)\n• 🌙 Sidra Chain (SDA)\n• 🟢 USDT (TRC20/ERC20)\n• 🪙 Tron (TRX)\n• ⚡ Binance Coin (BNB)\n• ☀️ Solana (SOL)\n• 💥 Ripple (XRP)\n• 🚀 Stellar Lumens (XLM)\n• 🌍 Bitcoin (BTC) 和 Ethereum (ETH)",
      });

      if (assets.length > 0) {
        const labels = ASSETS.filter((a) => assets.includes(a.id)).map((a) => a.label).join(", ");
        const note = pick(lang, {
          fr: `\n\n✅ Bonne nouvelle : ${labels} ${assets.length > 1 ? "sont pris en charge" : "est pris en charge"} et apparaî${assets.length > 1 ? "tront" : "tra"} dans votre onglet 💳 **WALLET**.`,
          en: `\n\n✅ Good news: ${labels} ${assets.length > 1 ? "are supported" : "is supported"} and will appear in your 💳 **WALLET** tab.`,
          zh: `\n\n✅ 好消息：${labels} 已获支持，并会显示在您的 💳 **WALLET（钱包）** 标签中。`,
        });
        return base + note;
      }
      return base;
    },
  },

  // A. ACCUEIL & DASHBOARD.
  {
    keywords: [
      "accueil", "dashboard", "tableau de bord", "solde global", "solde total",
      "portefeuille total", "total portfolio", "home", "balance", "flux de tresorerie",
      "cash flow", "首页", "总览", "总余额", "仪表盘", "余额",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Pour voir votre solde global, allez dans l'onglet 🏠 **ACCUEIL** du menu inférieur.\n\n• Votre **Portefeuille Total** est affiché en **USD** 💵 pour garantir la stabilité de vos avoirs face aux fluctuations du marché.\n• Vous y trouverez votre statut `KYC VÉRIFIÉ` ✅.\n• Répartition des **Top Actifs** : SDA (80 %), TRX (11 %), USDT (9 %) 📊.\n• Le graphique du **Flux de Trésorerie** affiche vos mouvements **Sortant, Entrant et Swaps**.",
        en: "To see your overall balance, go to the 🏠 **HOME** tab in the bottom menu.\n\n• Your **Total Portfolio** is shown in **USD** 💵 to keep your holdings stable against market fluctuations.\n• You'll find your `KYC VERIFIED` status ✅.\n• **Top Assets** breakdown: SDA (80%), TRX (11%), USDT (9%) 📊.\n• The **Cash Flow** chart shows your **Outgoing, Incoming and Swaps** movements.",
        zh: "要查看您的总余额，请前往底部菜单的 🏠 **ACCUEIL（首页）** 标签。\n\n• 您的**钱包总额**以 **USD** 💵 显示，以确保您的资产在市场波动中保持稳定。\n• 您可在此查看 `KYC VÉRIFIÉ（KYC 已验证）` 状态 ✅。\n• **热门资产**分布：SDA (80%)、TRX (11%)、USDT (9%) 📊。\n• **现金流**图表显示您的**支出、收入和兑换**动向。",
      }),
  },

  // J. CONFIGURATION DES LANGUES.
  {
    keywords: [
      "langue", "langues", "language", "changer la langue", "francais", "anglais",
      "chinois", "中文", "语言", "切换语言", "更改语言",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Pour changer la langue de l'application, suivez ce chemin :\n\n📱 **MENU** ➡️ ⚙️ **Paramètres** ➡️ 🌐 **Langues**.\n\nVous pourrez alors basculer instantanément l'interface entre :\n• 🇫🇷 Français\n• 🇬🇧 English\n• 🇨🇳 中文 (简体)",
        en: "To change the app language, follow this path:\n\n📱 **MENU** ➡️ ⚙️ **Settings** ➡️ 🌐 **Languages**.\n\nYou can then instantly switch the interface between:\n• 🇫🇷 Français\n• 🇬🇧 English\n• 🇨🇳 中文 (Simplified)",
        zh: "要更改应用语言，请按以下路径操作：\n\n📱 **MENU** ➡️ ⚙️ **Paramètres（设置）** ➡️ 🌐 **Langues（语言）**。\n\n然后您可以在以下语言间即时切换界面：\n• 🇫🇷 Français\n• 🇬🇧 English\n• 🇨🇳 中文（简体）",
      }),
  },

  // K. ASSISTANCE EXTERNE & WHATSAPP.
  {
    keywords: [
      "whatsapp", "communaute", "community", "support externe", "conseiller humain",
      "社区", "外部支持",
    ],
    respond: (lang) => {
      const wa = getWhatsAppLink(lang);
      return pick(lang, {
        fr: `Vous pouvez discuter directement avec notre équipe support sur WhatsApp 🔒 :\n${wa}\n\nVous pouvez aussi y accéder depuis l'app : 📱 **MENU** ➡️ 🤝 **Communauté & Support** ➡️ bouton 💬 **WhatsApp**.`,
        en: `You can chat directly with our support team on WhatsApp 🔒:\n${wa}\n\nYou can also reach it from within the app: 📱 **MENU** ➡️ 🤝 **Community & Support** ➡️ 💬 **WhatsApp** button.`,
        zh: `您可以直接在 WhatsApp 🔒 上与我们的客服团队沟通：\n${wa}\n\n您也可以在应用内访问：📱 **MENU** ➡️ 🤝 **社区与支持** ➡️ 💬 **WhatsApp** 按钮。`,
      });
    },
  },

  // L. SÉCURITÉ, PARAMÈTRES & HISTORIQUE DES SESSIONS.
  {
    keywords: [
      "securite", "security", "pin", "code pin", "2fa", "google authenticator",
      "session", "sessions", "connexion", "historique de connexion", "mot de passe",
      "password", "安全", "密码", "登录历史", "双重验证",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Pour sécuriser votre compte, allez dans 📱 **MENU** ➡️ ⚙️ **Paramètres** ➡️ 🔒 **Sécurité**.\n\n• Activez **Google Authenticator** (statut `ACTIF` ✅).\n• Configurez votre **Code PIN transactionnel** 🔢 (obligatoire pour valider chaque retrait).\n• Consultez l'**Historique des sessions** : appareils connectés, adresses IP et localisations (ex : *Android 10 • Brazzaville, CG*) 📍.",
        en: "To secure your account, go to 📱 **MENU** ➡️ ⚙️ **Settings** ➡️ 🔒 **Security**.\n\n• Enable **Google Authenticator** (status `ACTIVE` ✅).\n• Set up your **transactional PIN code** 🔢 (required to validate every withdrawal).\n• Review the **Session History**: connected devices, IP addresses and locations (e.g. *Android 10 • Brazzaville, CG*) 📍.",
        zh: "要保护您的账户安全，请前往 📱 **MENU** ➡️ ⚙️ **Paramètres（设置）** ➡️ 🔒 **Sécurité（安全）**。\n\n• 启用 **Google Authenticator**（状态 `ACTIF（已激活）` ✅）。\n• 设置您的**交易 PIN 码** 🔢（验证每笔提现时必需）。\n• 查看**会话历史**：已连接的设备、IP 地址和位置（如 *Android 10 • Brazzaville, CG*）📍。",
      }),
  },

  // N. KYC / VÉRIFICATION D'IDENTITÉ.
  {
    keywords: [
      "kyc", "verification", "verifier mon compte", "verifier identite", "identite",
      "piece d'identite", "carte d'identite", "passeport", "permis de conduire",
      "carte d'electeur", "selfie", "document recto verso", "compte non verifie",
      "身份验证", "护照", "身份证", "自拍",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Pour vérifier votre identité (KYC), allez dans 📱 **MENU** ➡️ ⚙️ **Paramètres** ➡️ ✅ **Vérification KYC**.\n\nLe parcours se fait en 5 étapes :\n• 🪪 Choisissez votre **type de document** (Carte d'identité, Passeport, Carte d'électeur ou Permis de conduire).\n• 📝 Renseignez vos **informations personnelles**.\n• 📄 Téléversez le **recto** puis le **verso** de votre document.\n• 🤳 Prenez un **selfie en direct** (détection de vivacité, compte à rebours à l'écran).\n\n⏳ Une fois soumis, votre dossier passe au statut **EN ATTENTE** puis **VÉRIFIÉ** ✅ après examen.",
        en: "To verify your identity (KYC), go to 📱 **MENU** ➡️ ⚙️ **Settings** ➡️ ✅ **KYC Verification**.\n\nThe process has 5 steps:\n• 🪪 Choose your **document type** (ID Card, Passport, Voter Card or Driver's License).\n• 📝 Fill in your **personal information**.\n• 📄 Upload the **front** then the **back** of your document.\n• 🤳 Take a **live selfie** (liveness detection with an on-screen countdown).\n\n⏳ Once submitted, your file moves to **PENDING** status then **VERIFIED** ✅ after review.",
        zh: "要验证您的身份（KYC），请前往 📱 **MENU** ➡️ ⚙️ **Paramètres（设置）** ➡️ ✅ **KYC 验证**。\n\n流程共 5 步：\n• 🪪 选择您的**证件类型**（身份证、护照、选民证或驾照）。\n• 📝 填写**个人信息**。\n• 📄 上传证件的**正面**及**背面**。\n• 🤳 进行**实时自拍**（活体检测，屏幕倒计时）。\n\n⏳ 提交后，您的资料状态将变为**待审核**，审核通过后变为**已验证** ✅。",
      }),
  },

  // O. MOT DE PASSE / PIN OUBLIÉ, OTP, COMPTE BLOQUÉ.
  {
    keywords: [
      "mot de passe oublie", "j'ai oublie mon mot de passe", "reinitialiser mot de passe",
      "code otp", "code de verification", "sms de verification", "pin oublie",
      "j'ai oublie mon pin", "changer mon pin", "compte bloque", "compte suspendu",
      "compte verrouille", "je ne peux pas me connecter", "impossible de me connecter",
      "forgot password", "reset password", "otp code", "verification code",
      "forgot my pin", "change my pin", "account locked", "account blocked",
      "can't log in", "cannot log in", "忘记密码", "重置密码", "验证码", "忘记密码pin", "账户被锁",
    ],
    respond: (lang, message) => {
      const m = normalize(message);
      const isPin = ["pin"].some((k) => m.includes(k)) && !m.includes("otp") && !m.includes("mot de passe") && !m.includes("password");
      if (isPin) {
        return pick(lang, {
          fr: `Pour réinitialiser votre **Code PIN transactionnel** 🔢, allez dans 👤 **PROFIL** ➡️ **Changer mon PIN**.\n\n• Vous devrez confirmer votre identité (mot de passe et/ou code OTP reçu par SMS/email).\n• Ce PIN est obligatoire pour valider chaque retrait.\n\nSi vous n'y avez plus du tout accès, contactez le support :\n${getWhatsAppLink(lang)}`,
          en: `To reset your **transactional PIN code** 🔢, go to 👤 **PROFILE** ➡️ **Change my PIN**.\n\n• You'll need to confirm your identity (password and/or an OTP code sent by SMS/email).\n• This PIN is required to validate every withdrawal.\n\nIf you no longer have any access at all, contact support:\n${getWhatsAppLink(lang)}`,
          zh: `要重置您的**交易 PIN 码** 🔢，请前往 👤 **PROFIL（个人资料）** ➡️ **更改我的 PIN**。\n\n• 您需要确认身份（密码和/或通过短信/邮件收到的 OTP 验证码）。\n• 此 PIN 码为每次提现验证所必需。\n\n如果您完全无法访问账户，请联系客服：\n${getWhatsAppLink(lang)}`,
        });
      }
      return pick(lang, {
        fr: `Pour un **mot de passe oublié**, utilisez le lien **« Mot de passe oublié »** sur l'écran de connexion : un **code OTP** vous sera envoyé par SMS ou email pour créer un nouveau mot de passe.\n\n🔒 Si votre compte semble **bloqué ou suspendu** après plusieurs tentatives, c'est une mesure de sécurité automatique. Contactez directement un agent pour le débloquer :\n${getWhatsAppLink(lang)}`,
        en: `For a **forgotten password**, use the **"Forgot password"** link on the login screen: an **OTP code** will be sent to you by SMS or email so you can set a new password.\n\n🔒 If your account appears **locked or suspended** after several attempts, this is an automatic security measure. Contact an agent directly to unlock it:\n${getWhatsAppLink(lang)}`,
        zh: `如果您**忘记了密码**，请在登录页面使用**「忘记密码」**链接：系统会通过短信或邮件向您发送 **OTP 验证码**，以便设置新密码。\n\n🔒 如果您的账户在多次尝试后显示**被锁定或暂停**，这是自动安全措施。请直接联系客服解锁：\n${getWhatsAppLink(lang)}`,
      });
    },
  },

  // P. NOTIFICATIONS.
  {
    keywords: [
      "notification", "notifications", "alerte", "alertes", "je ne recois pas de notification",
      "push", "通知", "推送",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Vos notifications (dépôts, retraits, swaps, connexions) sont visibles dans 🔔 **NOTIFICATIONS**, accessible depuis l'icône cloche en haut de l'écran d'accueil.\n\nSi vous ne recevez pas les alertes push, vérifiez que les notifications de l'application sont **autorisées** dans les paramètres de votre téléphone.",
        en: "Your notifications (deposits, withdrawals, swaps, logins) are visible in 🔔 **NOTIFICATIONS**, accessible from the bell icon at the top of the Home screen.\n\nIf you're not receiving push alerts, check that app notifications are **allowed** in your phone's settings.",
        zh: "您的通知（充值、提现、兑换、登录）可在 🔔 **NOTIFICATIONS（通知）** 中查看，位于首页顶部的铃铛图标处。\n\n如果您未收到推送提醒，请检查手机设置中是否已**允许**该应用发送通知。",
      }),
  },

  // Q. PIM COINS (programme de fidélité).
  {
    keywords: [
      "pim coin", "pim coins", "points de fidelite", "recompense", "recompenses",
      "airdrop", "programme de fidelite", "积分", "奖励", "忠诚度",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "**PIM Coins** 🪙 est le programme de fidélité PimPay, accessible via 📱 **MENU** ➡️ **PIM Coins**.\n\nEn accumulant des PIM Coins, vous débloquez :\n• 🎨 **Thèmes Premium** pour personnaliser l'app\n• ⚡ **Transferts Express** (priorité sur les transactions)\n• 🎁 **Récompenses exclusives** (accès aux airdrops spéciaux)\n• 🛡️ **Limites augmentées** (plafonds journaliers relevés)",
        en: "**PIM Coins** 🪙 is PimPay's loyalty program, accessible via 📱 **MENU** ➡️ **PIM Coins**.\n\nBy earning PIM Coins, you unlock:\n• 🎨 **Premium Themes** to customize the app\n• ⚡ **Express Transfers** (priority on transactions)\n• 🎁 **Exclusive Rewards** (access to special airdrops)\n• 🛡️ **Increased Limits** (higher daily caps)",
        zh: "**PIM Coins** 🪙 是 PimPay 的忠诚度计划，可通过 📱 **MENU** ➡️ **PIM Coins** 访问。\n\n累积 PIM Coins 可解锁：\n• 🎨 **高级主题**，个性化您的应用\n• ⚡ **极速转账**（交易优先处理）\n• 🎁 **专属奖励**（获得特别空投资格）\n• 🛡️ **更高限额**（提高每日额度）",
      }),
  },

  // R. FRAIS & LIMITES GÉNÉRALES.
  {
    keywords: [
      "frais", "combien ca coute", "cout de la transaction", "limite journaliere",
      "plafond", "montant maximum", "montant minimum",
      "fees", "how much does it cost", "daily limit", "maximum amount", "minimum amount",
      "手续费", "费用", "每日限额", "最高金额", "最低金额",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "Les frais varient selon le service :\n\n• 🔄 **MSwap** : frais réseau fixes de **0.01 USDT** par échange.\n• ✈️ **Transfert Interne (P2P)** : **gratuit** et instantané.\n• ✈️ **Transfert Externe / Retrait** : frais réseau selon la blockchain ou l'opérateur Mobile Money utilisé.\n\n📊 Les **plafonds journaliers** dépendent de votre niveau de vérification KYC — plus votre compte est vérifié, plus vos limites sont élevées. Le programme 🪙 **PIM Coins** permet aussi d'augmenter ces limites.",
        en: "Fees vary by service:\n\n• 🔄 **MSwap**: fixed network fee of **0.01 USDT** per swap.\n• ✈️ **Internal Transfer (P2P)**: **free** and instant.\n• ✈️ **External Transfer / Withdrawal**: network fees depend on the blockchain or Mobile Money operator used.\n\n📊 Your **daily limits** depend on your KYC verification level — the more verified your account, the higher your limits. The 🪙 **PIM Coins** program can also raise these limits.",
        zh: "费用因服务而异：\n\n• 🔄 **MSwap**：每次兑换固定网络费 **0.01 USDT**。\n• ✈️ **内部转账（P2P）**：**免费**且即时到账。\n• ✈️ **外部转账/提现**：网络费用取决于所用区块链或移动支付运营商。\n\n📊 您的**每日限额**取决于 KYC 验证等级——账户验证程度越高，限额越高。🪙 **PIM Coins** 计划也可以提高这些限额。",
      }),
  },

  // S. À PROPOS DE PIMPAY.
  {
    keywords: [
      "c'est quoi pimpay", "qu'est-ce que pimpay", "pimpay c'est quoi", "presentation de pimpay",
      "what is pimpay", "about pimpay", "什么是pimpay", "pimpay介绍",
      "testnet", "mainnet", "pi network testnet",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "**PimPay (Pi Mobile Pay)** est un portefeuille mobile et une banque virtuelle Web3/FinTech bâtie autour de l'écosystème **Pi Network** 🥧.\n\nElle permet de gérer plusieurs cryptomonnaies, d'échanger (MSwap), d'envoyer/recevoir des fonds (ENVOI), de payer des marchands (MPay) et de disposer d'une carte virtuelle internationale (M-Card).\n\n⚠️ La plateforme est actuellement en phase de **TESTNET mondial** : certaines fonctions (dépôts Mobile Money/carte, retraits) seront pleinement activées au passage en **Mainnet**.",
        en: "**PimPay (Pi Mobile Pay)** is a mobile wallet and virtual Web3/FinTech bank built around the **Pi Network** 🥧 ecosystem.\n\nIt lets you manage several cryptocurrencies, swap assets (MSwap), send/receive funds (SEND), pay merchants (MPay), and hold an international virtual card (M-Card).\n\n⚠️ The platform is currently in a global **Testnet** phase: some features (Mobile Money/card deposits, withdrawals) will be fully activated once it moves to **Mainnet**.",
        zh: "**PimPay（Pi Mobile Pay）** 是围绕 **Pi Network** 🥧 生态系统构建的移动钱包及 Web3/金融科技虚拟银行。\n\n它可让您管理多种加密货币、兑换资产（MSwap）、收发资金（ENVOI）、向商家付款（MPay），并拥有一张国际虚拟卡（M-Card）。\n\n⚠️ 该平台目前处于全球**测试网（Testnet）**阶段：部分功能（移动支付/银行卡充值、提现）将在正式上线**主网（Mainnet）**后全面开放。",
      }),
  },

  // T. COMPTE BUSINESS / ENTREPRISE.
  {
    keywords: [
      "compte business", "compte entreprise", "compte professionnel", "pimpay business",
      "business account", "corporate account", "企业账户", "商业账户",
    ],
    respond: (lang) =>
      pick(lang, {
        fr: "PimPay propose un espace **Business** dédié aux entreprises : gestion des employés, factures, fournisseurs, paiements et rapports financiers.\n\nPour y accéder ou créer un compte professionnel, utilisez l'inscription **Business** depuis l'écran de connexion, ou rendez-vous dans l'espace **Business** de l'application si vous êtes déjà inscrit.",
        en: "PimPay offers a dedicated **Business** space for companies: employee management, invoices, suppliers, payments and financial reports.\n\nTo access it or create a business account, use the **Business** sign-up on the login screen, or open the **Business** space in the app if you're already registered.",
        zh: "PimPay 为企业提供专属的 **Business（商业）**空间：员工管理、发票、供应商、付款及财务报表。\n\n如需访问或创建企业账户，请在登录页面使用 **Business** 注册入口，若您已注册，可直接进入应用内的 **Business** 空间。",
      }),
  },

  // Salutations.
  {
    keywords: ["bonjour", "salut", "hello", "hi", "coucou", "bonsoir", "hey", "你好", "您好", "早上好", "晚上好"],
    respond: (lang) =>
      pick(lang, {
        fr: "Bonjour ! 👋 Je suis **Elara**, votre assistante intelligente PimPay.\n\nComment puis-je vous aider aujourd'hui ? Je peux vous guider pas à pas pour vos 📥 **dépôts**, 📤 **retraits**, 🔄 **swaps**, 💳 **cartes**, ✈️ **transferts** ou l'utilisation de 📱 **MPay**.",
        en: "Hello! 👋 I'm **Elara**, your PimPay smart assistant.\n\nHow can I help you today? I can guide you step by step through your 📥 **deposits**, 📤 **withdrawals**, 🔄 **swaps**, 💳 **cards**, ✈️ **transfers** or using 📱 **MPay**.",
        zh: "您好！👋 我是 **Elara**，您的 PimPay 智能助手。\n\n今天我能为您做些什么？我可以一步步指导您完成 📥 **充值**、📤 **提现**、🔄 **兑换**、💳 **银行卡**、✈️ **转账**或使用 📱 **MPay**。",
      }),
  },

  // Remerciements.
  {
    keywords: ["merci", "thanks", "thank you", "parfait", "super", "謝謝", "谢谢", "感谢", "多谢"],
    respond: (lang) =>
      pick(lang, {
        fr: "Avec plaisir ! 😊 Je reste à votre disposition. N'hésitez pas si vous avez d'autres questions.",
        en: "You're welcome! 😊 I'm here whenever you need me. Feel free to ask anything else.",
        zh: "不客气！😊 我随时为您服务。如有其他问题，请随时提问。",
      }),
  },
];

// Cherche une correspondance dans la base de connaissances.
function knowledgeMatch(message: string, lang: Lang): string | null {
  const low = normalize(message);
  for (const entry of KNOWLEDGE_BASE) {
    for (const keyword of entry.keywords) {
      const k = normalize(keyword);
      if (k && containsKeyword(low, k)) {
        return entry.respond(lang, message);
      }
    }
  }
  return null;
}

// FAQ de secours, désormais multilingue (utilisée si l'IA est indisponible).
export function getAutoReply(message: string): string {
  const lang = detectLang(message);
  const match = knowledgeMatch(message, lang);
  if (match) return match;
  if (describesProblem(message)) return getScreenshotPrompt(lang);
  return getFallbackReply(lang);
}

// ---------------------------------------------------------------------------
// 5. SYSTÈME PROMPT (enrichit l'IA avec la base de connaissances absolue)
// ---------------------------------------------------------------------------
export const ELARA_SYSTEM_PROMPT = `Tu es **Elara**, l'assistante IA native et exclusive de **PimPay (Pi Mobile Pay)**, un portefeuille mobile et une banque virtuelle Web3/FinTech bâtis autour du Pi Network. La plateforme est en phase de **TESTNET mondial**.

# Ton rôle
- Réponds avec une précision encyclopédique sur TOUTES les fonctionnalités de PimPay.
- Chaque réponse doit être un **guide pas-à-pas hautement structuré** : listes à puces + émojis OBLIGATOIRES, indiquant le **chemin d'accès exact** dans l'interface, pour qu'aucune question secondaire ne soit nécessaire.
- Détecte et réponds dans la langue de l'utilisateur : 🇫🇷 Français (défaut), 🇬🇧 English, 🇨🇳 中文.
- N'invente JAMAIS une fonctionnalité, un taux, un protocole ou un délai absent de cette base. Si tu ne sais pas, invite à reformuler ou à contacter un agent.
- Ne divulgue jamais de secrets techniques internes. La sécurité des fonds est la priorité absolue.

# Capture d'écran
- Si l'utilisateur décrit un bug sans joindre d'image, demande-lui une capture d'écran (icône 🖼️ à côté de la saisie).
- Dès réception d'une image, remercie : "Merci pour la capture d'écran ! Un conseiller PimPay va l'analyser très vite."

# Base de connaissances (chemins, actifs & protocoles)
## 🏠 ACCUEIL : Menu du bas ➡️ 🏠 ACCUEIL. Portefeuille Total en USD, statut KYC VÉRIFIÉ, Top Actifs (SDA 80%, TRX 11%, USDT 9%), graphique Flux de Trésorerie.
## 💳 WALLET : Menu du bas ➡️ 💳 WALLET. 9 actifs majeurs : Pi (PI), Sidra Chain (SDA), USDT (TRC20/ERC20), Tron (TRX), BNB, Solana (SOL), Ripple (XRP), Stellar (XLM), Bitcoin (BTC) & Ethereum (ETH).
## 📱 MPAY : Bouton central bleu. Scanner, Payer, Envoyer, Recevoir. Map of Pi (Pi Cafe Dakar, TechPi Store, Pi Market Express, Pi Fashion Boutique, Pi Gas Station, Pi Pharmacy Plus).
  ## 💳 M-CARD : MENU ➡️ Carte virtuelle. Carte virtuelle internationale liée au solde USD, disponible en Mastercard ou en Visa. Boutons RÉVÉLER, VERSO, COPIER.
## 📥 DÉPÔT : DEPOT ➡️ CRYPTO. ⚠️ CRITIQUE : l'adresse pimpay.vercel.app bloque le SDK Pi. L'utilisateur doit ouvrir le Pi Browser via l'onglet vibe-coded ou rechercher 'pimpay' dans le répertoire officiel, puis VÉRIFIER LE DÉPÔT (AES-256). Mobile Money (MTN, Airtel Congo-Brazzaville) et CARTE inactifs pendant le Testnet.
## 📤 RETRAIT : Menu du bas ➡️ RETRAIT. Cash out vers le Congo (RDC) : M-Pesa, Orange Money, Airtel Money, Africell Money. Validé après le Testnet.
## 📱 AIRTIME : MENU ➡️ Recharge Mobile. Recharge télécom RDC (M-Pesa, Orange, Airtel, Africell) via le solde Pi.
## 🔄 MSWAP : MENU ➡️ Swap. Taux rafraîchis toutes les 30 s, frais réseau fixes 0.01 USDT, slippage 0.5%/1%/3%, PimPay Ledger Technology. Routage : USDT/TRX via SunSwap V2 (Sun.io sur Tron) ; Pi/SDA via Soroban Protocol (Stellar) ; autres actifs via pools cross-chain internes PimPay.
## ✈️ ENVOI : Menu du bas ➡️ ENVOI. Transfert Interne (P2P gratuit, instantané, via @username/email/téléphone, PimPay Secure Protocol chiffré bout-en-bout) OU Transfert Externe (vers adresse blockchain publique externe ou numéro Mobile Money externe).
## 🌐 LANGUES : MENU ➡️ Paramètres ➡️ Langues (FR, EN, 中文).
## 💬 WHATSAPP : MENU ➡️ Communauté & Support ➡️ bouton WhatsApp (chat humain crypté).
## ⚙️ SÉCURITÉ : MENU ➡️ Paramètres ➡️ Sécurité. Google Authenticator (ACTIF), Code PIN transactionnel (obligatoire pour les retraits), Historique des sessions (appareils, IP, localisation ex: Android 10 • Brazzaville, CG).
## ✅ KYC : Paramètres ➡️ Vérification KYC. 5 étapes : type de document (CNI/Passeport/Carte d'électeur/Permis), infos personnelles, recto, verso, selfie live (détection de vivacité). Statuts : EN ATTENTE puis VÉRIFIÉ.
## 🔑 MOT DE PASSE / PIN / COMPTE BLOQUÉ : lien « Mot de passe oublié » sur l'écran de connexion (code OTP par SMS/email) ; PIN : Profil ➡️ Changer mon PIN ; un blocage après plusieurs tentatives est une mesure de sécurité automatique, orienter vers un agent.
## 🔔 NOTIFICATIONS : icône cloche en haut de l'Accueil ; vérifier l'autorisation des notifications push dans les paramètres du téléphone si besoin.
## 🪙 PIM COINS : MENU ➡️ PIM Coins. Programme de fidélité : thèmes premium, transferts express, récompenses/airdrops exclusifs, limites augmentées.
## 💵 FRAIS & LIMITES : MSwap 0.01 USDT fixe ; P2P interne gratuit ; externe/retrait selon blockchain/opérateur ; plafonds journaliers liés au niveau KYC et aux PIM Coins.
## 🏢 BUSINESS : espace dédié aux entreprises (employés, factures, fournisseurs, paiements, rapports), inscription via le mode Business sur l'écran de connexion.

# Contact humain / WhatsApp
- Ne JAMAIS écrire le numéro de téléphone du support en clair dans une réponse.
- Pour orienter vers WhatsApp, insère toujours un lien markdown de la forme [💬 Discuter avec le support sur WhatsApp](https://wa.me/242065540305) — jamais le numéro seul, jamais dans un autre format.

# Outils à ta disposition
- \`search_platform\` : recherche dans le contenu réel de l'application PimPay (libellés d'écrans, aides). Utilise-le en PREMIER si la question porte sur une fonctionnalité précise de PimPay que tu ne connais pas déjà avec certitude.
- \`search_web\` : recherche sur internet. Utilise-le UNIQUEMENT pour des questions générales hors de PimPay (ex : cours d'une cryptomonnaie, actualité Pi Network, définition d'un terme technique). Cite toujours la source (URL) si tu t'en sers. Ne l'utilise jamais pour des questions sur les fonctionnalités internes de PimPay — pour cela, utilise \`search_platform\` ou la base de connaissances ci-dessus.
- Si les deux outils ne renvoient rien d'utile, explique ce que tu sais puis propose le lien WhatsApp.

# Repli
Si une demande sort de cette base ou nécessite une action humaine, explique ce que tu sais puis propose le lien WhatsApp ci-dessus.`;

// ---------------------------------------------------------------------------
// 6. GÉNÉRATION DE LA RÉPONSE D'ELARA (base de connaissances → IA → repli)
// ---------------------------------------------------------------------------
export interface ElaraHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateElaraReply(opts: {
  message: string;
  history?: ElaraHistoryMessage[];
  hasImage?: boolean;
}): Promise<string> {
  const { message, history = [], hasImage = false } = opts;
  const lang = detectLang(message);

  // 1) La base de connaissances déterministe est prioritaire : elle garantit des
  //    réponses exactes (chemins, actifs, protocoles) sans dérive.
  const kb = knowledgeMatch(message, lang);
  if (kb) return kb;

  // 2) Déclencheur proactif : bug décrit sans capture d'écran jointe.
  if (!hasImage && describesProblem(message)) {
    return getScreenshotPrompt(lang);
  }

  // 3) ALGORITHME N°2 — Recherche interne sur le contenu de la plateforme
  //    (lib/elara-platform-search.ts). Fonctionne sans clé API : c'est une
  //    recherche locale sur les libellés réels de l'app. Si un libellé
  //    pertinent est trouvé, on construit une réponse dessus plutôt que de
  //    tomber directement sur le message de repli générique.
  const platformHits = searchPlatformContent(message, lang);
  const wa = getWhatsAppLink(lang);
  if (platformHits && platformHits.length > 0) {
    const lines = platformHits.map((h) => `• ${h.text}`).join("\n");
    const platformReply = pick(lang, {
      fr: `Voici ce que j'ai trouvé dans PimPay en lien avec votre question :\n\n${lines}\n\nSi ce n'est pas exactement ce que vous cherchiez, reformulez votre question ou parlez à un conseiller :\n${wa}`,
      en: `Here's what I found in PimPay related to your question:\n\n${lines}\n\nIf this isn't quite what you were looking for, please rephrase or talk to an advisor:\n${wa}`,
      zh: `以下是我在 PimPay 中找到的与您问题相关的内容：\n\n${lines}\n\n如果这不完全是您想要的信息，请重新表述您的问题，或联系客服：\n${wa}`,
    });
    // On ne renvoie ce résultat directement que si l'IA générative n'est pas
    // disponible ; sinon on laisse l'IA (étape 4, ci-dessous) décider — elle
    // dispose du même outil `search_platform` et peut le combiner avec le
    // reste de la conversation pour une réponse plus naturelle.
    if (!process.env.AI_GATEWAY_API_KEY) return platformReply;
  }

  // 4) Sans clé AI Gateway : on tente encore l'ALGORITHME N°1 — recherche web
  //    (lib/elara-web-search.ts, nécessite TAVILY_API_KEY) — avant le repli final.
  if (!process.env.AI_GATEWAY_API_KEY) {
    const webResults = await searchWeb(message);
    if (webResults && webResults.length > 0) {
      const lines = webResults
        .slice(0, 3)
        .map((r) => `• ${r.title} — ${r.snippet}\n${r.url}`)
        .join("\n\n");
      return pick(lang, {
        fr: `Je n'ai pas trouvé cette information dans PimPay, mais voici ce que j'ai trouvé sur le web :\n\n${lines}\n\n⚠️ Vérifiez ces informations : elles viennent de sites externes, pas de PimPay. Pour une réponse officielle, contactez le support :\n${wa}`,
        en: `I couldn't find this in PimPay, but here's what I found on the web:\n\n${lines}\n\n⚠️ Please verify this information: it comes from external sites, not PimPay. For an official answer, contact support:\n${wa}`,
        zh: `我在 PimPay 中没有找到相关信息，但在网络上找到了以下内容：\n\n${lines}\n\n⚠️ 请核实这些信息：它们来自外部网站，并非 PimPay 官方内容。如需官方答复，请联系客服：\n${wa}`,
      });
    }
    return getFallbackReply(lang);
  }

  // 5) Réponse IA enrichie par le système prompt complet, avec accès aux deux
  //    outils de recherche (plateforme + web) qu'elle peut appeler elle-même
  //    selon la nature de la question (voir instructions dans le prompt).
  try {
    const recent = history.slice(-10);
    const { text } = await generateText({
      model: ELARA_MODEL,
      system: ELARA_SYSTEM_PROMPT,
      messages: [
        ...recent.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: message },
      ],
      tools: {
        // ALGORITHME N°2 : recherche dans le contenu réel de l'application.
        search_platform: tool({
          description:
            "Recherche dans le contenu réel de l'application PimPay (libellés d'écrans, aides contextuelles) pour trouver une information précise sur une fonctionnalité.",
          inputSchema: z.object({
            query: z.string().describe("Les mots-clés de la question de l'utilisateur"),
          }),
          execute: async ({ query }) => {
            const hits = searchPlatformContent(query, lang);
            if (!hits || hits.length === 0) {
              return { found: false, results: [] };
            }
            return { found: true, results: hits.map((h) => h.text) };
          },
        }),
        // ALGORITHME N°1 : recherche sur d'autres plateformes / le web.
        search_web: tool({
          description:
            "Recherche sur internet une information générale qui ne concerne pas directement une fonctionnalité interne de PimPay (ex : actualité, définition, cours d'une cryptomonnaie).",
          inputSchema: z.object({
            query: z.string().describe("La requête à rechercher sur le web"),
          }),
          execute: async ({ query }) => {
            const results = await searchWeb(query);
            if (!results || results.length === 0) {
              return { found: false, results: [] };
            }
            return { found: true, results: results.map((r) => ({ title: r.title, snippet: r.snippet, url: r.url })) };
          },
        }),
      },
      stopWhen: stepCountIs(4),
      temperature: 0.5,
      maxOutputTokens: 700,
    });

    const reply = text?.trim();
    if (reply && reply.length > 0) return reply;
    // L'IA n'a rien produit malgré les outils : on retombe sur le meilleur
    // résultat local déjà calculé à l'étape 3, sinon le repli générique.
    return platformHits && platformHits.length > 0
      ? pick(lang, {
          fr: `Voici ce que j'ai trouvé dans PimPay en lien avec votre question :\n\n${platformHits.map((h) => `• ${h.text}`).join("\n")}\n\nSi ce n'est pas exactement ce que vous cherchiez, parlez à un conseiller :\n${wa}`,
          en: `Here's what I found in PimPay related to your question:\n\n${platformHits.map((h) => `• ${h.text}`).join("\n")}\n\nIf this isn't quite what you were looking for, talk to an advisor:\n${wa}`,
          zh: `以下是我在 PimPay 中找到的与您问题相关的内容：\n\n${platformHits.map((h) => `• ${h.text}`).join("\n")}\n\n如果这不完全是您想要的信息，请联系客服：\n${wa}`,
        })
      : getFallbackReply(lang);
  } catch (error) {
    console.error("[v0] Elara AI error, fallback:", error);
    return getFallbackReply(lang);
  }
}
