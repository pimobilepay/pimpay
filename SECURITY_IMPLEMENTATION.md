# PimPay Security Implementation Guide

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Generate secure keys (if needed)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Fill in all security variables:
# - JWT_SECRET (32+ chars)
# - ENCRYPTION_KEY (32 chars exactly)
# - CSRF_SECRET (32+ chars)
# - UPSTASH_REDIS_REST_URL
# - UPSTASH_REDIS_REST_TOKEN
```

### 2. Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 3. Install Dependencies

```bash
npm install

# Verify security packages installed
npm list @upstash/redis jose bcryptjs validator
```

### 4. Test Security Features

```bash
# Get CSRF token
curl http://localhost:3000/api/csrf-token

# Test login (with CSRF token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: [token-from-above]" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Test logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: token=[your-token]" \
  -H "X-CSRF-Token: [csrf-token]"
```

## Authentication Flow

### Registration

1. User fills form with email, username, password
2. Frontend fetches CSRF token from `/api/csrf-token`
3. POST to `/api/auth/register` with CSRF token
4. Server validates:
   - CSRF token signature ✓
   - Email format ✓
   - Username format ✓
   - Password strength ✓
   - Email/username uniqueness ✓
5. Password hashed with bcrypt (12 rounds) ✓
6. User created with ACTIVE status ✓
7. Access token (15 min) + Refresh token (7 days) issued ✓
8. Session created in DB ✓

### Login

1. User submits credentials + CSRF token
2. Server validates:
   - CSRF token ✓
   - Rate limit (10/min per IP) ✓
   - IDS check (proxy/VPN/Tor) ✓
   - Account exists ✓
   - Password correct ✓
   - Account status (not locked/banned) ✓
3. If MFA required: Issue temp token (5 min) ✓
4. Otherwise: Issue tokens and create session ✓
5. Login event logged (without PII) ✓

### Logout

1. User clicks logout
2. Server receives logout request
3. Token JTI added to Redis blacklist ✓
4. Session marked as inactive ✓
5. Cookies cleared ✓
6. Audit event created ✓

## Token Management

### Token Types

```
Access Token:
  - Duration: 15 minutes
  - Used for: API requests
  - Contains: user ID, role, email
  - Revocable: Yes (via JTI blacklist)
  
Refresh Token:
  - Duration: 7 days
  - Used for: Refresh endpoint
  - Contains: user ID, role, email
  - Revocable: Yes (Session.isActive or JTI blacklist)
  - Stored: Session DB record
  
Temp Token (MFA):
  - Duration: 5 minutes
  - Used for: MFA verification
  - Purpose: "mfa_verification"
  - Revocable: Yes (but exempt from session check)
```

### Revocation Mechanism

```typescript
// On logout or security event:
import { revokeTokenJWT } from '@/lib/jwt';

await revokeTokenJWT(token, ttlSeconds);
// - Extracts JTI from token
// - Adds JTI to Redis blacklist
// - Sets expiration = token TTL
```

## Encryption & Keys

### Key Derivation

```
MASTER_KEY (32 chars from env)
     ↓
  scrypt(master_key, salt, N=32768, r=8, p=1)
     ↓
DERIVED_KEY (32 bytes)
     ↓
  AES-256-GCM(data, derived_key, random_iv)
     ↓
  v2:salt:iv:authTag:encrypted
```

### Migration Path

```
Old format: v1:iv:authTag:encrypted
     ↓
Detected during decrypt
     ↓
Decrypted with old method
     ↓
Re-encrypted with v2 (scrypt + salt)
     ↓
Stored in database
```

## Rate Limiting

### Distributed Rate Limits

All rate limits use Redis for multi-region consistency:

```typescript
import { checkDistributedRateLimit, RATE_LIMITS } from '@/lib/distributedRateLimit';

const rl = await checkDistributedRateLimit(
  `login:${ip}`,
  RATE_LIMITS.LOGIN.limit,  // 10
  RATE_LIMITS.LOGIN.window   // 60 seconds
);

if (rl.limited) {
  return NextResponse.json(
    { error: "Rate limited" },
    {
      status: 429,
      headers: {
        "Retry-After": String(rl.retryAfter),
      },
    }
  );
}
```

### Presets

```
LOGIN:          10 req/min
TRANSFER:       20 req/min
WITHDRAW:       20 req/min
DEPOSIT:        30 req/min
PASSWORD_RESET: 3 req/5min
MFA_VERIFY:     5 req/min
```

## CSRF Protection

### Implementation

```typescript
// 1. Get token
const token = generateCsrfToken(); // Returns: token.signature

// 2. Send with form
<form method="POST" action="/api/transfer">
  <input type="hidden" name="X-CSRF-Token" value="{token}" />
  ...
</form>

// 3. Server validates
const isValid = verifyCsrfToken(req); // Checks signature
```

## Logging

### Secure Logging

```typescript
import { logAuthEvent, logTransactionEvent, logSuspiciousActivity } from '@/lib/secureLogger';

// Authentication
await logAuthEvent('LOGIN', userId, email, ip, userAgent, 'SUCCESS');

// Transactions
await logTransactionEvent('TRANSFER', userId, 100, 'SDA', recipientId, 'SUCCESS');

// Security Events
await logSuspiciousActivity('CSRF_ATTACK', userId, ip, 'CSRF token mismatch');
```

All sensitive data is redacted:
- Emails: `u***@example.com`
- IPs: `192.168.1.xxx`
- Keys: `[REDACTED]`

## Transactional Integrity

### Atomic Transfers

```typescript
import { transferSidraTokensAtomic } from '@/lib/blockchainTransaction';

const result = await transferSidraTokensAtomic(
  fromUserId,
  toUserId,
  100,
  'SDA'
);

if (!result.success) {
  // Automatically rolled back
  console.error(result.error);
}
```

### Saga Pattern

Each transaction is a series of steps:

1. Create transaction record (PENDING)
2. Execute blockchain transfer
3. Update wallet balances
4. Mark SUCCESS

If any step fails, all previous steps are rolled back in reverse order.

## Input Validation

```typescript
import {
  validateEmail,
  validateUsername,
  validatePasswordStrength,
  validateAmount,
  validateWalletAddress,
  sanitizeString,
} from '@/lib/inputValidation';

// Examples
if (!validateEmail(email)) throw new Error('Invalid email');
if (!validateUsername(username)) throw new Error('Invalid username');

const passwordCheck = validatePasswordStrength(password);
if (!passwordCheck.valid) {
  throw new Error(passwordCheck.errors.join(', '));
}

if (!validateAmount(amount)) throw new Error('Invalid amount');
```

## IDS - Intrusion Detection

### Defense Guard

```typescript
import { guardRequest } from '@/lib/defenseGuard';

const guard = await guardRequest(req, { context: 'login' });

if (!guard.allowed) {
  // Blocked by:
  // - IP blocklist
  // - Proxy/VPN/Tor detection
  // - Datacenter detection
  // - Bot detection (suspicious User-Agent)
  return NextResponse.json({ error: guard.reason }, { status: guard.status });
}
```

### Detection Methods

1. **IP Blocklist:** Admin can manually block IPs
2. **Proxy Detection:** proxycheck.io API + local heuristics
3. **Bot Detection:** User-Agent pattern matching
4. **Risk Scoring:** 0-100, configurable threshold

## Production Checklist

- [ ] All environment variables set
- [ ] Redis connected and tested
- [ ] Database migrations run
- [ ] HTTPS enabled
- [ ] HSTS headers configured
- [ ] CSP headers validated
- [ ] Rate limiting tested across regions
- [ ] Token revocation tested
- [ ] Logging verified (no PII)
- [ ] Encryption key rotation schedule set
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented

## Troubleshooting

### Redis Connection Error

```
Error: UPSTASH_REDIS_REST_URL not configured
```

Fix:
```bash
vercel env add UPSTASH_REDIS_REST_URL https://...
vercel env add UPSTASH_REDIS_REST_TOKEN ...
```

### CSRF Token Invalid

```
Error: CSRF token validation failed
```

Ensure:
1. Token fetched from `/api/csrf-token` first
2. Token sent in `X-CSRF-Token` header or cookie
3. CSRF_SECRET environment variable set

### Token Revocation Not Working

Check Redis connectivity:
```bash
node -e "require('@upstash/redis').Redis.fromEnv().ping().then(console.log)"
```

## Support

For security issues, create a confidential issue or contact the security team.
Do NOT post security vulnerabilities publicly.
