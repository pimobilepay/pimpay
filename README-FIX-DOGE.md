# Correctif DOGE (dépôt + retrait) — PimPay

## Problème
DOGE n'avait aucune vraie infrastructure de portefeuille :
- Pas d'adresse Dogecoin dédiée en base (le champ n'existait pas)
- L'app affichait par erreur l'**adresse EVM (0x...)** comme "adresse de
  dépôt DOGE" — format invalide sur Dogecoin → tout dépôt réel était
  irrécupérable
- Aucune lecture de solde on-chain, aucune route de synchronisation
- Aucune validation du format d'adresse au retrait (faille de sécurité)
- Aucun broadcast on-chain implémenté pour les retraits DOGE

## Comment appliquer ce correctif
1. Copiez ces fichiers dans votre projet en respectant l'arborescence
   (ils remplacent les fichiers existants du même nom).
2. Appliquez la migration Prisma :
   ```
   npx prisma migrate deploy
   # ou en dev :
   npx prisma migrate dev
   ```
3. Régénérez le client Prisma si besoin : `npx prisma generate`
4. Vérifiez que ces variables/dépendances sont déjà présentes (elles le
   sont normalement dans le projet d'origine) :
   - `bitcoinjs-lib`, `ecpair`, `tiny-secp256k1`, `axios` (déjà dans
     `package.json`)
   - La clé de chiffrement utilisée par `lib/crypto.ts` (`ENCRYPTION_KEY`
     ou équivalent) pour stocker `dogePrivateKey` en base

## Fichiers inclus
- `prisma/schema.prisma` — ajout des colonnes `dogeAddress`, `dogePrivateKey`
- `prisma/migrations/20260821_add_doge_wallet/migration.sql` — migration SQL
- `lib/blockchain/dogecoin.ts` — génération d'adresse, lecture de solde,
  UTXO, signature et diffusion de transaction Dogecoin (nouveau fichier)
- `lib/crypto-config.ts` — DOGE enregistré dans `CRYPTO_ASSETS`,
  `SYNC_ENDPOINTS`, `WITHDRAW_ONCHAIN_SUPPORTED`
- `lib/crypto-validator.ts` — règle de validation d'adresse DOGE
- `app/api/wallet/doge/sync/route.ts` — synchronisation du solde de dépôt
  (nouveau fichier, génère l'adresse au premier appel)
- `app/api/wallet/doge/transfer/route.ts` — endpoint de retrait dédié
  (nouveau fichier)
- `app/api/wallet/balance/route.ts` — auto-génération de la vraie adresse
  DOGE, sync automatique, correction de l'adresse affichée
- `app/api/wallet/sync-all/route.ts` — DOGE ajouté à la sync globale
- `app/api/worker/withdraw/route.ts` — broadcast DOGE ajouté au worker
  générique de retrait
- `app/api/swap/simpleswap/route.ts` / `app/api/swap/changenow/route.ts`
  — correction de l'adresse de destination DOGE (utilisait aussi l'adresse
  EVM par erreur)
- `app/api/user/transfer/route.ts` — ajout du broadcast réel DOGE dans le
  flux d'envoi principal (bouton "Envoyer" de la page wallet)

## ⚠️ Recommandation avant mise en production
Ce code effectue de vrais transferts de fonds Dogecoin (signature de
transactions, diffusion on-chain). Avant déploiement :
- Testez sur un petit montant réel ou un environnement de test dédié
- Vérifiez les clés API tierces utilisées (BlockCypher / dogechain.info)
  et leurs limites de taux
- Faites relire le code de signature/diffusion par quelqu'un de l'équipe
  avant toute mise en production, comme pour tout code touchant à la
  custody de fonds
