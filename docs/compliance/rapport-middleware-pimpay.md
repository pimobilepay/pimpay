# Rapport d'Audit — Middleware Next.js PimPay
## Analyse de sécurité approfondie · Architecture proxy · Plan de remédiation complet

**Date :** 03 Mai 2026  
**Scope :** middleware.ts (absent) · next.config.js · lib/auth.ts · lib/adminAuth.ts · app/api/admin/*  
**Criticité :** BLOQUANT — Aucun déploiement production acceptable sans correction  
**Contexte proxy :** Rewrites Next.js vers `https://api.minepi.com` via `/proxy-api-pi/:path*`

---

## 1. Résumé exécutif

L'application PimPay ne possède **aucun fichier `middleware.ts`** à la racine du projet.  
Cette absence est la **cause racine** d'au moins 3 vulnérabilités critiques ou élevées :

| # | Vulnérabilité | Niveau | Lien causal |
|---|---|---|---|
| #23 | Bypass auth — `await` manquant sur `reset-password` | CRITIQUE | Résultat direct de l'absence de middleware centralisé |
| #24 | Middleware Next.js absent | ÉLEVÉE | Vulnérabilité principale documentée ici |
| #25 | Validation Pi token via API Pi Network non implémentée | ÉLEVÉE | Aucun interception possible des tokens sans middleware |
| #7 | Absence totale de rate limiting | ÉLEVÉE | Rate limiting impossible à centraliser sans middleware |

Sans middleware, chaque route est une **île isolée** qui doit implémenter sa propre sécurité.
Un seul oubli (comme un `await` manquant sur `verifyAuth()`) expose l'intégralité de la plateforme.

---

## 2. Architecture actuelle — état des lieux

### 2.1 Ce qui existe dans next.config.js

```javascript
// EXTRAIT ACTUEL — next.config.js
async rewrites() {
  return [
    {
      source: '/proxy-api-pi/:path*',
      destination: 'https://api.minepi.com/:path*',
    },
  ];
},
```

**Analyse :**  
Le proxy Pi Network est bien configuré via les `rewrites()` de Next.js.  
Cela signifie que toute requête vers `/proxy-api-pi/v2/me` est redirigée vers `https://api.minepi.com/v2/me`.  
⚠️ Ce proxy ne remplace **pas** un middleware de sécurité. Il route des requêtes, il ne les protège pas.

### 2.2 Ce qui manque — fichier middleware.ts

```
pimpay-main/
├── app/
│   ├── api/
│   │   ├── admin/         ← 10+ routes non protégées de manière centralisée
│   │   ├── user/
│   │   └── ...
├── lib/
│   ├── auth.ts            ← Validation Pi token partiellement implémentée
│   └── adminAuth.ts       ← Vérification admin route-par-route
├── middleware.ts           ← ❌ FICHIER ABSENT
└── next.config.js         ← Proxy Pi configuré ici
```

### 2.3 Analyse des routes admin existantes

Toutes les routes `/api/admin/*` appellent `adminAuth(req)` individuellement :

```typescript
// PATTERN ACTUEL — répété dans CHAQUE route admin
export async function POST(req: NextRequest) {
  const payload = await adminAuth(req); // ← Chaque route doit s'en souvenir
  if (!payload) return NextResponse.json({ error: "..." }, { status: 403 });
  // ... logique métier
}
```

**Routes admin identifiées :**
- `app/api/admin/database/route.ts`
- `app/api/admin/route.ts`
- `app/api/admin/online-users-geo/route.ts`
- `app/api/admin/history/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/[id]/sessions/route.ts`
- `app/api/admin/users/reset-password/route.ts` ← **Vulnérabilité #23**
- `app/api/admin/users/action/route.ts`
- `app/api/admin/transactions/route.ts`
- `app/api/admin/transactions/update/route.ts`

**Risque :** Chacune de ces routes est un point de défaillance potentiel si `adminAuth()` est mal appelée.

---

## 3. Impact détaillé — Vulnérabilité #24 (Middleware absent)

### 3.1 Scénario d'attaque sans middleware

```
Attaquant non authentifié
        │
        ▼
POST /api/admin/users/reset-password
        │
        ▼
route.ts reçoit la requête
        │
        ▼
const payload = verifyAuth(req);  ← Si await manquant : Promise = truthy !
        │
        ▼
if (!payload) return 403;         ← Cette condition n'est JAMAIS évaluée correctement
        │
        ▼
Réinitialisation du mot de passe admin ← COMPROMISSION TOTALE
```

### 3.2 Avec middleware centralisé

```
Attaquant non authentifié
        │
        ▼
Requête interceptée par middleware.ts
        │
        ▼
Vérification JWT admin AVANT que la route s'exécute
        │
        ▼
Token invalide → 401 Unauthorized ← BLOQUÉ DÉFINITIVEMENT
        │
        ▼
La route reset-password ne s'exécute jamais
```

### 3.3 Principe fondamental violé

L'architecture actuelle est **"opt-in security"** : chaque route doit activement choisir de se protéger.  
L'architecture cible doit être **"opt-out security"** : toutes les routes sont protégées par défaut, seules les routes publiques sont explicitement exemptées.

---

## 4. Impact sur le proxy Pi Network

### 4.1 Le proxy actuel ne valide pas les tokens

```javascript
// next.config.js — PROXY ACTUEL
{
  source: '/proxy-api-pi/:path*',
  destination: 'https://api.minepi.com/:path*',
}
```

Ce proxy **route** les requêtes vers Pi Network mais :
- ✗ Ne valide pas que le token Bearer est authentique
- ✗ Ne vérifie pas que l'utilisateur est authentifié côté PimPay
- ✗ N'ajoute pas de headers de sécurité côté Pi
- ✗ Ne rate-limite pas les appels vers l'API Pi

**Risque concret :** Un attaquant peut appeler `/proxy-api-pi/v2/me` avec n'importe quel token et le proxy le transmettra tel quel à Pi Network — PimPay n'est qu'un relais transparent sans contrôle.

### 4.2 Ce que le middleware doit faire pour le proxy

Le middleware doit intercepter les requêtes vers `/proxy-api-pi/*` et :

1. Vérifier que l'utilisateur est authentifié avec un JWT PimPay valide
2. Ajouter les headers `Authorization: Bearer {PI_API_KEY}` côté serveur (jamais exposé côté client)
3. Logger les appels pour détecter les abus
4. Appliquer un rate limit spécifique (ex: 60 appels/minute/user vers l'API Pi)

---

## 5. Solution complète — middleware.ts à implémenter

### 5.1 Architecture recommandée

```
middleware.ts
├── Matcher : /api/admin/:path*  → Vérification JWT + rôle ADMIN
├── Matcher : /api/user/:path*   → Vérification JWT utilisateur
├── Matcher : /api/cards/:path*  → Vérification JWT utilisateur
├── Matcher : /proxy-api-pi/*    → Auth PimPay + proxy sécurisé vers Pi
└── Matcher : /api/auth/*        → Rate limiting uniquement (pas d'auth)
```

### 5.2 Implémentation recommandée — middleware.ts

```typescript
// middleware.ts — À CRÉER À LA RACINE DU PROJET
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// ─── Configuration ────────────────────────────────────────────────────────────

const ADMIN_ROUTES = /^\/api\/admin(\/.*)?$/;
const USER_ROUTES  = /^\/api\/user(\/.*)?$/;
const CARD_ROUTES  = /^\/api\/cards(\/.*)?$/;
const PROXY_ROUTES = /^\/proxy-api-pi(\/.*)?$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyJWT(token: string): Promise<{ id: string; role: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jose.jwtVerify(token, secret);
    return { id: payload.id as string, role: payload.role as string };
  } catch {
    return null;
  }
}

function getTokenFromRequest(req: NextRequest): string | null {
  // 1. Cookie token (priorité)
  const cookieToken = req.cookies.get('token')?.value;
  if (cookieToken) return cookieToken;

  // 2. Header Authorization Bearer (fallback pour API clients)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

function unauthorizedResponse(message: string = 'Non autorisé'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbiddenResponse(message: string = 'Accès refusé'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

// ─── Rate limiting (simplifié — utiliser @upstash/ratelimit en production) ─────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // Autorisé
  }

  if (entry.count >= maxRequests) return false; // Bloqué

  entry.count++;
  return true;
}

// ─── Middleware principal ──────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  // ── 1. Routes admin — Authentification admin obligatoire ────────────────────
  if (ADMIN_ROUTES.test(pathname)) {
    const token = getTokenFromRequest(req);
    if (!token) return unauthorizedResponse('Token manquant');

    const payload = await verifyJWT(token);
    if (!payload) return unauthorizedResponse('Token invalide ou expiré');

    // Vérification du rôle admin
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN') {
      return forbiddenResponse('Accès réservé aux administrateurs');
    }

    // Injecter l'identité dans les headers pour la route
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.id);
    requestHeaders.set('x-user-role', payload.role);

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── 2. Routes utilisateur — Authentification requise ───────────────────────
  if (USER_ROUTES.test(pathname) || CARD_ROUTES.test(pathname)) {
    const token = getTokenFromRequest(req);
    if (!token) return unauthorizedResponse();

    const payload = await verifyJWT(token);
    if (!payload) return unauthorizedResponse('Session expirée');

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.id);
    requestHeaders.set('x-user-role', payload.role);

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── 3. Proxy Pi Network — Auth PimPay + sécurisation du proxy ──────────────
  if (PROXY_ROUTES.test(pathname)) {
    // Vérifier que l'appelant est authentifié côté PimPay
    const token = getTokenFromRequest(req);
    if (!token) return unauthorizedResponse();

    const payload = await verifyJWT(token);
    if (!payload) return unauthorizedResponse();

    // Rate limiting sur le proxy Pi (60 req/min par utilisateur)
    const rateLimitKey = `proxy-pi:${payload.id}`;
    if (!checkRateLimit(rateLimitKey, 60, 60_000)) {
      return NextResponse.json(
        { error: 'Trop de requêtes vers Pi Network' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      );
    }

    // Ajouter l'API Key Pi côté serveur (jamais exposée côté client)
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.id);

    // Note : L'ajout du header Authorization Pi Network se fait dans la route proxy dédiée,
    // pas dans le middleware (pour ne pas exposer PI_API_KEY dans les logs middleware).

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── 4. Routes auth — Rate limiting uniquement (pas d'auth requise) ──────────
  if (pathname.startsWith('/api/auth/')) {
    const rateLimitKey = `auth:${ip}`;
    if (!checkRateLimit(rateLimitKey, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans 60 secondes.' },
        {
          status: 429,
          headers: { 'Retry-After': '60', 'X-RateLimit-Limit': '10' },
        }
      );
    }
  }

  // Toutes les autres routes passent librement
  return NextResponse.next();
}

// ─── Matcher — Routes sur lesquelles le middleware s'exécute ──────────────────
// IMPORTANT : Exclure les assets statiques et _next pour éviter les surcharges

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/user/:path*',
    '/api/cards/:path*',
    '/api/auth/:path*',
    '/api/withdraw/:path*',
    '/api/transfer/:path*',
    '/proxy-api-pi/:path*',
    // Exclure les fichiers statiques
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)',
  ],
};
```

### 5.3 Adaptation requise — Proxy Pi sécurisé

Puisque PimPay utilise les `rewrites()` de next.config.js pour le proxy Pi, une route dédiée est recommandée pour contrôler les headers sensibles :

```typescript
// app/api/proxy-pi/[...path]/route.ts — NOUVEAU FICHIER RECOMMANDÉ
import { NextRequest, NextResponse } from 'next/server';

// Cette route remplace le rewrite next.config.js pour le proxy Pi.
// L'authentification est déjà vérifiée par middleware.ts.
// x-user-id est injecté par le middleware → pas besoin de re-vérifier.

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Middleware bypass detected' }, { status: 401 });
  }

  const piPath = params.path.join('/');
  const piApiUrl = process.env.PI_API_URL || 'https://api.minepi.com';
  const piApiKey = process.env.PI_API_KEY; // Clé serveur, JAMAIS exposée côté client

  const body = await req.text();

  const piResponse = await fetch(`${piApiUrl}/${piPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization côté serveur uniquement
      ...(piApiKey ? { 'Authorization': `Key ${piApiKey}` } : {}),
      // Transmettre le token Pi de l'utilisateur si présent dans le body
    },
    body,
  });

  const data = await piResponse.json();

  return NextResponse.json(data, { status: piResponse.status });
}
```

---

## 6. Corrections associées dans les routes existantes

### 6.1 Simplification des routes admin après middleware

Une fois le middleware en place, les routes admin peuvent **se fier aux headers injectés** au lieu de refaire la vérification :

```typescript
// AVANT (pattern actuel — chaque route)
export async function POST(req: NextRequest) {
  const payload = await adminAuth(req); // Vérification dans chaque route
  if (!payload) return NextResponse.json({ error: "..." }, { status: 403 });
  // ...
}

// APRÈS (avec middleware centralisé)
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');

  // Le middleware garantit déjà que userId et userRole sont valides et admin.
  // Cette vérification est une défense en profondeur (defense-in-depth).
  if (!userId || userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }
  // ...
}
```

### 6.2 Correction #23 — reset-password (maintenu comme défense en profondeur)

Même avec le middleware, le `await` manquant doit être corrigé :

```typescript
// app/api/admin/users/reset-password/route.ts
// CORRECTION MINIMALE (déjà appliquée selon le code source actuel) :
const payload = await adminAuth(req); // ← await obligatoire
if (!payload) return NextResponse.json({ error: "Accès réservé" }, { status: 403 });
```

Le middleware empêche d'arriver jusqu'à cette ligne sans être admin.  
Le `await` correct empêche le bypass si quelqu'un contourne le middleware.  
**Ces deux protections sont complémentaires et doivent coexister.**

---

## 7. Checklist de validation

### 7.1 Tests à exécuter après implémentation

```bash
# Test 1 — Accès admin sans token → doit retourner 401
curl -X POST https://pimpay.vercel.app/api/admin/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{"userId":"any","newPassword":"hacked123"}'
# Résultat attendu : {"error":"Token manquant"} — HTTP 401

# Test 2 — Token utilisateur normal sur route admin → doit retourner 403
curl -X POST https://pimpay.vercel.app/api/admin/users \
  -H "Cookie: token=<USER_JWT>"
# Résultat attendu : {"error":"Accès réservé aux administrateurs"} — HTTP 403

# Test 3 — Proxy Pi sans auth PimPay → doit retourner 401
curl -X POST https://pimpay.vercel.app/proxy-api-pi/v2/me \
  -H "Authorization: Bearer <PI_TOKEN>"
# Résultat attendu : {"error":"Non autorisé"} — HTTP 401

# Test 4 — Rate limit login → 11e tentative bloquée
for i in {1..11}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://pimpay.vercel.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Résultat attendu : 10 × 400/401, 11e = 429

# Test 5 — Middleware injecte x-user-id dans les headers
# (à tester côté serveur en loggant req.headers.get('x-user-id') dans une route)
```

### 7.2 Checklist de déploiement

```
□ middleware.ts créé à la racine du projet
□ Matcher configuré pour /api/admin/:path*, /api/user/:path*, /api/cards/:path*
□ Tests unitaires de chaque cas (voir §7.1)
□ Variable JWT_SECRET vérifiée au démarrage (fail-fast si absente)
□ Rate limiting @upstash/ratelimit intégré (remplacer la Map en mémoire)
□ Logs structurés JSON pour chaque décision d'accès refusé
□ Proxy Pi sécurisé : PI_API_KEY côté serveur uniquement
□ Rewrite next.config.js /proxy-api-pi/* pointant vers la route dédiée (si migration)
□ Audit complet de tous les `await` dans les routes admin
□ Tests de régression sur toutes les routes admin existantes
```

---

## 8. Note sur le proxy next.config.js existant

Le rewrite actuel dans `next.config.js` :

```javascript
{
  source: '/proxy-api-pi/:path*',
  destination: 'https://api.minepi.com/:path*',
}
```

**Deux options sont possibles :**

**Option A — Maintenir le rewrite + ajouter le middleware** _(plus rapide à implémenter)_  
Le middleware protège `/proxy-api-pi/*`, le rewrite route ensuite.  
⚠️ Inconvénient : Impossible d'ajouter des headers serveur (PI_API_KEY) via le rewrite.

**Option B — Remplacer le rewrite par une route dédiée** _(recommandé pour la production)_  
Créer `app/api/proxy-pi/[...path]/route.ts` qui gère le proxy avec contrôle total.  
Le middleware protège la route, qui ajoute les headers PI_API_KEY côté serveur.  
✅ Avantage : Contrôle total, possibilité de logger, de modifier les headers, de valider les payloads.

**Recommandation : Option B** pour une application fintech en production.

---

## 9. Conformité après correction

| Critère | Avant | Après middleware |
|---|---|---|
| OWASP A01 — Access Control | ❌ FAIL | ✅ PASS |
| OWASP A07 — Identification & Auth | ❌ FAIL | ✅ PASS |
| Defense in Depth | ❌ Opt-in sécurité | ✅ Opt-out sécurité |
| Single Point of Truth auth | ❌ Dispersé dans chaque route | ✅ Centralisé dans middleware.ts |
| Audit trail des accès refusés | ❌ Aucun | ✅ Log structuré JSON |
| Protection proxy Pi Network | ❌ Proxy transparent | ✅ Auth + rate limit |
| Rate limiting centralise | ❌ Absent | ✅ Présent sur auth + proxy |

---

## 10. Estimation effort

| Tâche | Effort | Priorité |
|---|---|---|
| Créer middleware.ts (routes admin + user + cards) | 2-3h | 🔴 IMMÉDIAT |
| Tester les cas de refus (§7.1) | 1h | 🔴 IMMÉDIAT |
| Migrer le proxy vers route dédiée (Option B) | 3-4h | 🟠 J+3 |
| Intégrer @upstash/ratelimit | 2h | 🟠 J+7 |
| Logs structurés JSON sur les refus d'accès | 1h | 🟡 J+14 |

**Total : ~10h de développement pour une sécurité de niveau production.**

---

*Rapport généré le 03/05/2026 — CONFIDENTIEL — Usage exclusif équipe PimPay*
