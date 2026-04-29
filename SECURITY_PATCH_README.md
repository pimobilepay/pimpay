# 🔐 PimPay — Guide d'application des corrections de sécurité

## Fichiers corrigés dans ce patch

| Fichier | Vulnérabilités corrigées |
|---|---|
| `middleware.ts` *(nouveau)* | [CRITIQUE] Pages admin non protégées côté serveur |
| `app/api/debug/transactions/route.ts` | [CRITIQUE] Route debug publique si DEBUG_API_KEY absente |
| `app/api/debug/run-worker/route.ts` | [CRITIQUE] Idem + stack trace dans réponse |
| `app/api/webhooks/mobile-money/route.ts` | [CRITIQUE] Webhook sans validation HMAC |
| `app/api/admin/config/route.ts` | [CRITIQUE] GET sans auth + POST AUTO_RESUME sans auth |
| `app/api/auth/pi-login/route.ts` | [CRITIQUE] JWT 30j → 7j + stack trace dans erreurs |
| `lib/jwt.ts` | [MOYEN] Refresh secret séparé obligatoire + session 24h |
| `next.config.js` | [ÉLEVÉ] CSP stricte + headers sécurité manquants + CORS |

---

## ⚠️  Actions manuelles OBLIGATOIRES

### 1. Supprimer la clé de validation exposée (CRITIQUE — À FAIRE IMMÉDIATEMENT)

```bash
# Supprimer le fichier
rm public/validation-key.txt

# L'ajouter au .gitignore pour éviter toute réintroduction accidentelle
echo "public/validation-key.txt" >> .gitignore

# Vérifier qu'il n'est plus tracké par git
git rm --cached public/validation-key.txt
git commit -m "security: remove exposed validation key from public dir"
```

**Puis révoquer et régénérer la clé auprès de Pi Network.**

---

### 2. Variables d'environnement à configurer

Ajoutez ces variables dans votre `.env` (local) et dans les secrets Vercel :

```env
# Obligatoire — clé refresh DISTINCTE de JWT_SECRET
JWT_REFRESH_SECRET=<générez une clé aléatoire de 64+ caractères>

# Obligatoire — secret pour valider les webhooks mobile money
# Cette valeur doit être communiquée à l'opérateur mobile money
MOBILE_MONEY_WEBHOOK_SECRET=<générez une clé aléatoire de 32+ caractères>

# Obligatoire en développement pour les routes /api/debug/*
# Ne PAS définir en production (les routes seront bloquées par le middleware)
DEBUG_API_KEY=<clé locale de dev uniquement>
```

Pour générer des clés aléatoires sécurisées :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 3. Configurer le secret webhook auprès de l'opérateur

Une fois `MOBILE_MONEY_WEBHOOK_SECRET` défini, communiquez cette valeur à
votre opérateur mobile money (MTN, Orange, etc.) afin qu'il signe ses
requêtes webhook avec `HMAC-SHA256(secret, rawBody)` dans le header
`X-Signature`.

---

### 4. Valider les clés XRP (ÉLEVÉ)

Dans `app/api/wallet/xrp/route.ts` et `app/api/wallet/balance/route.ts`,
la variable `secret` est initialisée à `'s'` avant d'être éventuellement
remplacée. **Recherchez** toutes les occurrences et remplacez-les par :

```typescript
// AVANT (dangereux)
let secret = 's';
// ... logique de récupération ...
if (!secret || secret === 's') {
  // BUG : clé fictive utilisée silencieusement
}

// APRÈS (sûr)
const walletData = await getXrpKeyFromDB(userId); // votre logique
if (!walletData?.encryptedSecret) {
  throw new Error('Clé XRP introuvable pour cet utilisateur');
}
const secret = decrypt(walletData.encryptedSecret);
```

---

### 5. Rate limiting sur les endpoints d'auth (ÉLEVÉ)

Installez et configurez Upstash Redis + `@upstash/ratelimit` ou Arcjet :

```bash
npm install @upstash/ratelimit @upstash/redis
```

Puis ajoutez en tête de `app/api/auth/login/route.ts` et
`app/api/admin/login/route.ts` :

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15m'), // 5 tentatives / 15 min
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429 }
    );
  }
  // ... reste du handler
}
```

Variables requises : `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.

---

### 6. Remplacer parseFloat par Decimal.js (ÉLEVÉ)

Dans `app/api/user/transfer/route.ts` (lignes 60, 77) :

```bash
npm install decimal.js
```

```typescript
// AVANT
const amount = parseFloat(body.amount);
const netAmount = amount - fee;

// APRÈS
import { Decimal } from 'decimal.js';
const amount = new Decimal(body.amount);
const fee = new Decimal(body.fee ?? 0);
const netAmount = amount.minus(fee);
// Pour stocker : netAmount.toNumber() ou en centimes : netAmount.times(100).toInteger()
```

---

### 7. Recherche ID par préfixe (MOYEN)

Dans `app/api/user/transfer/route.ts` :

```typescript
// AVANT (ambigu — plusieurs users avec même préfixe)
recipientUser = await tx.user.findFirst({
  where: { id: { startsWith: userIdPart } }
});

// APRÈS (exact)
recipientUser = await tx.user.findUnique({
  where: { id: userIdPart } // ID complet requis
});
// Si l'ID court doit rester supporté, validez qu'un seul résultat existe :
const matches = await tx.user.findMany({
  where: { id: { startsWith: userIdPart } }
});
if (matches.length !== 1) throw new Error('Identifiant ambigü ou introuvable');
```

---

## 💡 Question sur le middleware (Next.js 16)

**Pas de proxy.ts.** Next.js 16 utilise le même `middleware.ts` qu'avant,
placé à la **racine du projet** (à côté de `package.json`).

Le `middleware.ts` fourni dans ce patch est compatible Next.js 13/14/15/16 :
- Il s'exécute en **Edge Runtime** (pas de Prisma ici, uniquement `jose`)
- Il protège `/admin/*` et `/api/admin/*` via vérification JWT
- Il bloque `/api/debug/*` en production systématiquement

Structure attendue :
```
pimpay-main/
├── middleware.ts          ← ici, à la racine
├── app/
├── lib/
├── next.config.js
└── package.json
```

---

## ✅ Bonnes pratiques déjà en place (à conserver)

- Hachage bcrypt cost factor 12 ✅
- Transactions Prisma atomiques ✅
- Validation MIME/taille uploads KYC ✅
- Protection cron staking par Bearer token ✅
