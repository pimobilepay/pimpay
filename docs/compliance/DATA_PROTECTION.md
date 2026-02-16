# 🔒 Protocole de Protection des Données (SMIIC 8:2022)

## 1. Chiffrement des Données Sensibles
* **Données au repos** : Utilisation de l'algorithme AES-256 pour toutes les informations personnelles et soldes bancaires en base de données.
* **Données en transit** : Chiffrement TLS 1.3 obligatoire pour toutes les communications entre l'application mobile et les serveurs de PimPay.

## 2. Sécurité de l'Interface (UI)
* **Masquage Dynamique** : Les numéros de carte et les soldes sont masqués par défaut (système "Show/Hide") pour éviter l'espionnage visuel.
* **Authentification** : Gestion stricte des sessions via JWT sécurisés avec expiration rapide.

## 3. Audits de Cybersécurité
* Réalisation d'audits de vulnérabilité trimestriels pour identifier et corriger les failles potentielles conformément aux recommandations du rapport d'analyse de risque.
