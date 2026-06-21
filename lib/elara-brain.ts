import { generateText } from "ai";

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
  return PROBLEM_KEYWORDS.some((k) => m.includes(normalize(k)));
}

// ---------------------------------------------------------------------------
// 3. DÉTECTION « PARLER À UN AGENT HUMAIN » (multilingue)
// ---------------------------------------------------------------------------
const SUPPORT_PHRASES = [
  // FR
  "parler a un agent", "parler a un conseiller", "parler au support", "parler a un humain",
  "agent du support", "agent humain", "un vrai agent", "contacter le support",
  "contacter un agent", "joindre le support", "joindre un agent", "assistance humaine",
  "support humain", "service client", "un conseiller", "une personne reelle",
  // EN
  "speak to an agent", "talk to an agent", "talk to a human", "human agent",
  "real agent", "contact support", "customer service", "speak to support", "live agent",
  // ZH
  "与客服人员联系", "联系客服", "人工客服", "真人客服", "转人工",
];

export function detectSupportIntent(message: string): boolean {
  const m = normalize(message);
  // Les phrases chinoises ne sont pas affectées par normalize (pas d'accents).
  return SUPPORT_PHRASES.some((p) => m.includes(normalize(p)));
}

// Réponse quand l'utilisateur demande EXPLICITEMENT un agent humain :
// Elara collecte la préoccupation et rassure en attendant la prise en charge.
export function getSupportIntentReply(lang: Lang): string {
  return pick(lang, {
    fr: "Bien sûr, je transmets votre demande à un agent du support PimPay. 📩\n\nPour qu'il vous aide efficacement, pouvez-vous décrire précisément **votre préoccupation** ? Donnez le maximum de détails (service concerné, montant, message d'erreur…). Un conseiller vous répondra ici dès que possible.\n\n💬 Vous pouvez aussi le joindre via 📱 **MENU** ➡️ 🤝 **Communauté & Support** ➡️ bouton **WhatsApp**.",
    en: "Of course, I'm forwarding your request to a PimPay support agent. 📩\n\nSo they can help you efficiently, could you describe **your concern** precisely? Give as much detail as possible (the service involved, amount, any error message…). An advisor will reply here as soon as possible.\n\n💬 You can also reach them via 📱 **MENU** ➡️ 🤝 **Community & Support** ➡️ **WhatsApp** button.",
    zh: "当然，我正在将您的请求转发给 PimPay 客服人员。📩\n\n为了让他们能高效地帮助您，请您详细描述**您的问题**（涉及的服务、金额、任何错误信息……）。顾问将尽快在此回复您。\n\n💬 您也可以通过 📱 **MENU** ➡️ 🤝 **社区与支持** ➡️ **WhatsApp** 按钮联系他们。",
  });
}

// Conservé pour rétro-compatibilité (valeur FR par défaut).
export const SUPPORT_INTENT_REPLY = getSupportIntentReply("fr");

// Message de repli (section M) : aucune correspondance trouvée.
function getFallbackReply(lang: Lang): string {
  return pick(lang, {
    fr: "Je n'ai pas trouvé de réponse précise à votre question dans ma base de connaissances. 🤔\n\nReformulez votre demande ou écrivez **« parler à un agent du support »** (ou passez par WhatsApp via le 📱 **MENU**) pour qu'un conseiller prenne le relais.",
    en: "I couldn't find a specific answer to your question in my knowledge base. 🤔\n\nPlease rephrase your request or type **\"speak to an agent\"** (or use WhatsApp via the 📱 **MENU**) so an advisor can take over.",
    zh: "抱歉，未在我的知识库中找到确切答案。🤔\n\n请尝试重新表述您的请求，或者直接输入 **“与客服人员联系”**，或通过底部菜单 📱 **MENU** ➡️ 🤝 **社区与支持** 找到 💬 **WhatsApp** 按钮转接人工服务。",
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
  { id: "PI", label: "🥧 Pi Network (PI)", kw: ["pi network", "pi coin", " pi ", "pi)"] },
  { id: "SDA", label: "🌙 Sidra Chain (SDA)", kw: ["sidra", "sda"] },
  { id: "USDT", label: "🟢 Tether USD (USDT)", kw: ["usdt", "tether"] },
  { id: "TRX", label: "🪙 Tron (TRX)", kw: ["trx", "tron"] },
  { id: "BNB", label: "⚡ Binance Coin (BNB)", kw: ["bnb", "binance"] },
  { id: "SOL", label: "☀️ Solana (SOL)", kw: ["solana", "sol "] },
  { id: "XRP", label: "💥 Ripple (XRP)", kw: ["xrp", "ripple"] },
  { id: "XLM", label: "🚀 Stellar Lumens (XLM)", kw: ["xlm", "stellar", "lumens"] },
  { id: "BTC", label: "🌍 Bitcoin (BTC)", kw: ["btc", "bitcoin"] },
  { id: "ETH", label: "🌍 Ethereum (ETH)", kw: ["eth", "ethereum"] },
];

function detectAssets(message: string): string[] {
  const m = ` ${normalize(message)} `;
  return ASSETS.filter((a) => a.kw.some((k) => m.includes(normalize(k)))).map((a) => a.id);
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
    respond: (lang) =>
      pick(lang, {
        fr: "Si vous souhaitez parler à un conseiller humain sur WhatsApp, suivez ce chemin :\n\n📱 **MENU** ➡️ 🤝 **Communauté & Support** ➡️ bouton 💬 **WhatsApp**.\n\nCela ouvre instantanément une discussion privée cryptée 🔒 avec notre service client humain.",
        en: "If you'd like to talk to a human advisor on WhatsApp, follow this path:\n\n📱 **MENU** ➡️ 🤝 **Community & Support** ➡️ 💬 **WhatsApp** button.\n\nThis instantly opens a private encrypted chat 🔒 with our human customer service.",
        zh: "如果您想在 WhatsApp 上与人工顾问交谈，请按以下路径操作：\n\n📱 **MENU** ➡️ 🤝 **Communauté & Support（社区与支持）** ➡️ 💬 **WhatsApp** 按钮。\n\n这将立即开启与我们人工客服的私密加密聊天 🔒。",
      }),
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
      if (k && low.includes(k)) {
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

# Repli
Si une demande sort de cette base ou nécessite une action humaine, explique ce que tu sais puis invite l'utilisateur à écrire « parler à un agent du support » ou à passer par WhatsApp.`;

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

  // 3) Sans clé AI Gateway, on retombe sur le repli localisé.
  if (!process.env.AI_GATEWAY_API_KEY) {
    return getFallbackReply(lang);
  }

  // 4) Réponse IA enrichie par le système prompt complet.
  try {
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
    return reply && reply.length > 0 ? reply : getFallbackReply(lang);
  } catch (error) {
    console.error("[v0] Elara AI error, fallback:", error);
    return getFallbackReply(lang);
  }
}
