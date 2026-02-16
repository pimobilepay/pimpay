# PimPay - Plateforme Fintech Multi-Chain

![PimPay Banner](https://img.shields.io/badge/Status-In_Development-blueviolet?style=for-the-badge)
![Sidra Chain](https://img.shields.io/badge/Blockchain-Sidra_Chain-green?style=for-the-badge)
![Pi Network](https://img.shields.io/badge/Blockchain-Pi_Network-gold?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js_16-Black?style=for-the-badge&logo=next.js)
![Compliance](https://img.shields.io/badge/Compliance-SMIIC_%7C_AAOIFI-gold?style=for-the-badge)

**PimPay** est une solution fintech de banque virtuelle de pointe, multi-chaines, integree aux ecosystemes **Sidra Chain** et **Pi Network**. Notre mission est de combler le fosse entre les actifs numeriques et les services financiers traditionnels (Fiat), tout en garantissant une conformite ethique et legale stricte.

---

## Vision du Projet

PimPay evolue pour devenir une plateforme bancaire hybride et conforme :
* **Finance Islamique :** Integration native des principes de la Sidra Chain (elimination du Riba et du Gharar).
* **Pi Network :** Passerelle entre l'ecosysteme Pi et les services financiers traditionnels via le SDK Pi v2.0.
* **P2P & Fiat :** Passer des actifs numeriques vers les monnaies locales (XAF, EUR, USD, CDF).
* **Crypto Swap :** Echanges inter-chaines entre Pi, Sidra, Bitcoin, USDT et Stablecoins.
* **Securite Elara :** Architecture ultra-securisee avec chiffrement de grade bancaire et authentification multi-facteurs.

---

## Ecosystemes Blockchain Integres

### Sidra Chain

La Sidra Chain est une blockchain conforme aux principes de la finance islamique :

* **Mainnet RPC :** Connexion directe au noeud `node.sidrachain.com` via ethers.js.
* **Frais de gaz quasi-nuls :** Environ 0.0001 SDR par transaction, bases sur les couts reels de l'infrastructure.
* **Conformite Charia :** Elimination du Riba (interet usuraire) et du Gharar (incertitude) dans toutes les operations.
* **Conseil de Surveillance Sharia (SSB) :** Validation de chaque produit financier selon le standard SMIIC 1:2020.
* **Wallets SIDRA :** Type de wallet dedie pour stocker et echanger des tokens Sidra directement dans PimPay.
* **Adresses uniques :** Chaque utilisateur dispose d'une adresse Sidra (sidraAddress) avec cle privee chiffree AES-256.

### Pi Network

Pi Network est un ecosysteme de crypto-monnaie mobile avec une communaute mondiale :

* **SDK Pi v2.0 :** Integration officielle pour l'authentification et les paiements dans PimPay.
* **Pi User ID :** Chaque utilisateur peut lier son identifiant Pi (piUserId) a son compte PimPay.
* **Wallets PI :** Type de wallet dedie pour gerer le solde Pi directement depuis l'application.
* **Swap Pi/Fiat :** Conversion instantanee des Pi vers les devises locales (XAF, EUR, USD) via le taux de consensus PimPay.
* **Transferts P2P :** Transferts entre Pioneers directement dans PimPay sans intermediaire.
* **Frais reseau :** 0.01 Pi par operation de retrait ou de swap.
* **Bitcoin Wallet :** Support optionnel de l'adresse Bitcoin (walletAddress) pour les utilisateurs Pi.

---

## Conformite & Gouvernance (Audit Ready)

Pour repondre aux standards **AAOIFI**, **SMIIC** et **Basel III**, PimPay integre :
- **Conseil Sharia (SSB) :** Supervision pour la validation de chaque produit financier (SMIIC 1:2020).
- **Protection des Donnees :** Chiffrement **AES-256** au repos et TLS 1.3 en transit (SMIIC 8:2022).
- **Cadre Reglementaire :** Modele **Banking-as-a-Service (BaaS)** pour operer via des licences bancaires partenaires.
- **Geo-restriction :** Controle d'acces par juridiction (IP + geolocalisation) pour respecter les lois bancaires locales.
- **Basel III :** Modules de reporting pour le suivi des ratios de liquidite.
- **Anti-Riba :** Frais fixes bases sur les couts operationnels reels, sans marge d'interet.
- **Anti-Gharar :** Affichage clair et immediat des frais avant chaque transaction.

---

## Fonctionnalites Cles

### Authentification & Securite
- Integration multi-SDK : **Sidra Chain Auth** & **Pi Network SDK v2.0**.
- Authentification a deux facteurs (2FA) via TOTP.
- Code **PIN** secondaire pour la validation des transactions sensibles.
- Suivi des sessions avec IP, appareil, navigateur et geolocalisation.
- Journal de securite complet (SecurityLog) et journal d'audit (AuditLog).
- Masquage dynamique des donnees sensibles sur l'interface.
- Comptage des tentatives de connexion echouees avec gel automatique.

### Wallet & CashFlow
- **Wallets multi-devises :** XAF, EUR, USD, CDF, Pi, Sidra (un wallet par devise par utilisateur).
- **Solde gele :** Montants reserves pour les transactions en attente de confirmation.
- **Graphique de Flux :** Visualisation des revenus et depenses via Recharts.
- **Systeme de Swap :** Cotation (SwapQuote) avec taux et expiration pour proteger l'utilisateur.
- **Staking :** Bloquez des tokens pour gagner des recompenses (taux APY configurable).
- **Coffres (Vaults) :** Epargne avec objectif, taux d'interet et date de deblocage.

### Cartes Virtuelles
- **4 types :** CLASSIC, GOLD, BUSINESS, ULTRA.
- Numero unique, date d'expiration, CVV et code PIN optionnel.
- Limite quotidienne configurable et suivi des depenses totales.
- Gel/degel instantane de carte.
- Devises autorisees configurables par carte.

### Transactions
- **8 types :** TRANSFER, WITHDRAW, DEPOSIT, PAYMENT, EXCHANGE, STAKING_REWARD, AIRDROP, CARD_PURCHASE.
- Reference unique et identifiant blockchain optionnel.
- Frais transparents calcules en temps reel.
- Support des taux de change wholesale et retail.
- Historique complet avec statuts (PENDING, COMPLETED, SUCCESS, FAILED, CANCELLED).

### QR Payments & Marchands
- Generation de QR codes pour les paiements instantanes.
- Profils marchands verifies avec categorie, adresse et geolocalisation.
- Systeme de notation des marchands.

### Support & Notifications
- Systeme de tickets de support avec priorites et statuts.
- Messages dans un fil de discussion associe a chaque ticket.
- Notifications en temps reel (transactions, securite, promotions).

---

## Stack Technique

| Composant | Technologie |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| **Blockchain** | Sidra Chain Mainnet (ethers.js), Pi Network SDK v2.0 |
| **Crypto** | USDT TRC20, Bitcoin |
| **Securite** | Web Crypto API (AES-256), JWT, 2FA (TOTP), bcrypt |
| **Base de donnees** | PostgreSQL avec Prisma ORM |
| **UI** | Shadcn/UI, Lucide React, Recharts |
| **Deploiement** | Vercel |

---

## Structure du Projet

```text
pimpay/
├── app/                    # Routes Next.js 16 (Dashboard, Wallet, Auth, Cards, Swap, Support)
│   ├── api/                # Routes API (wallet, user, card, auth, transactions)
│   ├── auth/               # Pages d'authentification (login, register, reset-password)
│   ├── cards/              # Gestion des cartes virtuelles
│   ├── dashboard/          # Tableau de bord principal et commande de carte
│   ├── legal/              # Pages juridiques (privacy, terms)
│   ├── support/            # Centre d'aide
│   ├── swap/               # Echange de devises
│   ├── wallet/             # Gestion des wallets
│   └── transactions/       # Historique des transactions
├── components/             # Composants UI (Modals, Charts, Cards, BottomNav)
├── context/                # Logique d'authentification (Sidra & Pi)
├── docs/                   # Documentation de conformite (Sharia, Legal)
│   └── compliance/         # Gouvernance Sharia (SMIIC)
├── lib/                    # Utilitaires, geo-restriction et API blockchain
│   └── blockchain/         # Integration Sidra Chain (ethers.js)
├── services/               # Logique de chiffrement, conformite et securite (AES-256)
└── prisma/                 # Schema de la base de donnees
```

---

## Modeles de Donnees Principaux

| Modele | Description |
|---|---|
| **User** | Profil complet avec KYC, wallets multi-chain (Pi, Sidra, USDT, Bitcoin), referrals et roles |
| **Wallet** | Wallet multi-devises (XAF, EUR, USD, CDF, Pi, Sidra) avec solde et solde gele |
| **Transaction** | Tous types d'operations avec reference unique, frais et tracabilite blockchain |
| **VirtualCard** | Cartes VISA virtuelles (CLASSIC, GOLD, BUSINESS, ULTRA) avec limites et gel |
| **SwapQuote** | Cotations de swap avec taux, montant et expiration |
| **Staking** | Programmes de staking avec APY, duree et recompenses |
| **Vault** | Coffres d'epargne avec objectif et taux |
| **Session** | Sessions securisees avec geolocalisation et tracking d'appareil |
| **SupportTicket** | Tickets de support avec priorite et messages |
| **Notification** | Systeme de notifications en temps reel |
| **Merchant** | Profils marchands geolocalises et verifies |
| **QRPayment** | Paiements par QR code |
| **SystemConfig** | Configuration globale (frais, limites, taux, mode maintenance) |

---

## Enums Systeme

| Enum | Valeurs |
|---|---|
| **CardType** | CLASSIC, GOLD, BUSINESS, ULTRA |
| **UserRole** | ADMIN, USER, MERCHANT, AGENT |
| **UserStatus** | ACTIVE, BANNED, PENDING, FROZEN, SUSPENDED |
| **KycStatus** | NONE, PENDING, VERIFIED, REJECTED, APPROVED |
| **WalletType** | PI, FIAT, CRYPTO, SIDRA |
| **TransactionType** | TRANSFER, WITHDRAW, DEPOSIT, PAYMENT, EXCHANGE, STAKING_REWARD, AIRDROP, CARD_PURCHASE |
| **TransactionStatus** | PENDING, COMPLETED, SUCCESS, FAILED, CANCELLED |
| **SupportStatus** | OPEN, IN_PROGRESS, CLOSED |

---

## Plan de Developpement

1. **Phase 1 : Market Research** - Analyse des besoins et audit juridique des regulations locales.
2. **Phase 2 : Prototype Development** - Developpement du MVP avec integration Sidra Chain et Pi Network.
3. **Phase 3 : Alpha Testing** - Tests utilisateurs et Bug Tracking via GitHub.
4. **Phase 4 : Marketing Strategy** - Acquisition d'utilisateurs dans les ecosystemes Pi et Sidra.
5. **Phase 5 : Product Launch** - Deploiement officiel multi-chain.

---

## Contact

- **Support :** support@pimpay.pi
- **Juridique :** juridique@pimpay.pi
- **Confidentialite :** privacy@pimpay.pi
- **Telephone :** +242 065 540 305

---

*PimPay Protocol - Sidra Chain + Pi Network - Finance Ethique Conforme SMIIC / AAOIFI / Basel III*
