# 💳 PimPay - Protocol Sécurisé Elara

![PimPay Banner](https://img.shields.io/badge/Status-In_Development-blueviolet?style=for-the-badge)
![Sidra Chain](https://img.shields.io/badge/Blockchain-Sidra_Chain-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js_16-Black?style=for-the-badge&logo=next.js)
![Compliance](https://img.shields.io/badge/Compliance-SMIIC_%7C_AAOIFI-gold?style=for-the-badge)

**PimPay** est une solution fintech de banque virtuelle de pointe, désormais multi-chaînes, intégrée aux écosystèmes **Sidra Chain** et **Pi Network**. Notre mission est de combler le fossé entre les actifs numériques et les services financiers traditionnels (Fiat), tout en garantissant une conformité éthique et légale stricte.

---

## 🚀 Vision du Projet

PimPay évolue pour devenir une plateforme bancaire hybride et conforme :
* **Finance Islamique :** Intégration native des principes de la Sidra Chain (élimination du Riba et du Gharar).
* **P2P & Fiat :** Passer des actifs numériques vers les monnaies locales (CFA, EUR, USD).
* **Crypto Swap :** Échanges inter-chaînes entre Pi, Sidra, Bitcoin et Stablecoins.
* **Sécurité Elara :** Architecture ultra-sécurisée avec chiffrement de grade bancaire et authentification biométrique.

---

## ⚖️ Conformité & Gouvernance (Audit Ready)

Pour répondre aux standards **AAOIFI**, **SMIIC** et **Basel III**, PimPay intègre :
- **Conseil Sharia (SSB) :** Supervision pour la validation de chaque produit financier (SMIIC 1:2020).
- **Protection des Données :** Chiffrement **AES-256** au repos et TLS 1.3 en transit (SMIIC 8:2022).
- **Cadre Réglementaire :** Modèle **Banking-as-a-Service (BaaS)** pour opérer via des licences bancaires partenaires.
- **Géo-restriction :** Contrôle d'accès par juridiction pour respecter les lois bancaires locales.

---

## ✨ Fonctionnalités Clés

### 🔒 Authentification & Sécurité
- Intégration multi-SDK : **Sidra Chain Auth** & **Pi Network SDK v2.0**.
- Système de **PIN Code** secondaire pour la validation des transactions sensibles.
- Masquage dynamique des données sensibles sur l'interface (Système Show/Hide).

### 💰 Wallet & CashFlow
- **Wallet Virtuel :** Affichage en temps réel du solde Sidra/Pi, carte virtuelle et statut KYC.
- **Graphique de Flux :** Visualisation des revenus et dépenses via `Recharts`.
- **Système de Swap :** Conversion instantanée conforme aux règles éthiques.

---

## 🛠 Stack Technique

- **Frontend :** **Next.js 16 (App Router)**, TypeScript, Tailwind CSS.
- **Blockchain :** **Sidra Chain Mainnet**, SDK Pi Network.
- **Sécurité :** Web Crypto API (AES-256), JWT sécurisés.
- **Base de données :** PostgreSQL avec Prisma ORM.
- **UI Components :** Shadcn/UI, Lucide React (Icônes).

---

## 📁 Structure du Projet

```text
pimpay/
├── app/                # Routes Next.js 16 (Dashboard, Wallet, Auth)
├── components/         # Composants UI (Modals, Charts, WalletPage)
├── context/            # Logique d'authentification (Sidra & Pi)
├── docs/               # Documentation de conformité (Sharia, Legal)
├── lib/                # Utilitaires de géo-restriction et API
├── services/           # Logique de chiffrement et sécurité (AES-256)
└── prisma/             # Schéma de la base de données
