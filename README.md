# 💳 Pimpay - Protocol Sécurisé Elara

![Pimpay Banner](https://img.shields.io/badge/Status-In_Development-blueviolet?style=for-the-badge)
![Pi Network](https://img.shields.io/badge/Pi_Network-Ecosystem-orange?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js_14-Black?style=for-the-badge&logo=next.js)

**Pimpay** est une solution fintech de pointe intégrée à l'écosystème **Pi Network**. Notre mission est de combler le fossé entre la cryptomonnaie Pi et les services financiers traditionnels (Fiat), tout en offrant des capacités de swap inter-chaînes (BTC, USDT, etc.).

---

## 🚀 Vision du Projet

Pimpay ne se contente pas d'être un simple wallet. C'est une plateforme hybride :
* **P2P & Fiat :** Passer du Pi Network vers les monnaies locales (CFA, EUR, USD).
* **Crypto Swap :** Échanger vos actifs nativement entre Pi, Bitcoin, et Stablecoins.
* **Staking :** Faire fructifier vos actifs avec des protocoles sécurisés.
* **Sécurité Elara :** Une interface ultra-sécurisée avec authentification biométrique (PIN) et intégration directe du SDK Pi.

---

## ✨ Fonctionnalités Clés

### 🔒 Authentification & Sécurité
- Intégration complète du **SDK Pi Network v2.0**.
- Système de **PIN Code** secondaire pour la validation des transactions sensibles.
- Gestion des rôles (Admin / User) avec redirection dynamique.

### 💰 Wallet & CashFlow
- **Wallet Virtuel :** Affichage en temps réel du solde, numéro de carte virtuelle et statut KYC.
- **Graphique de Flux :** Visualisation des revenus et dépenses via `Recharts`.
- **Système de Swap :** Interface intuitive pour convertir vos Pi en d'autres cryptos.

### 📊 Historique Multi-Catégories
Suivi détaillé de toutes les activités :
- 📥 Dépôts
- 📤 Retraits
- 🔄 Swaps
- 🥩 Staking

---

## 🛠 Stack Technique

- **Frontend :** Next.js 16 (App Router), TypeScript, Tailwind CSS.
- **UI Components :** Shadcn/UI, Lucide React (Icônes).
- **State Management :** React Context API (PiAuthContext).
- **Base de données :** PostgreSQL avec Prisma ORM.
- **Blockchain :** SDK Pi Network.

---

## 📁 Structure du Projet

```text
pimpay/
├── app/                # Routes Next.js (Dashboard, Wallet, Auth)
├── components/         # Composants réutilisables (Modals, Charts, UI)
├── context/            # Logique d'authentification Pi
├── hooks/              # Hooks personnalisés
├── lib/                # Configuration API et utilitaires
└── prisma/             # Schéma de la base de données

