# Sprint 3: JWT Telegram Auth (tg-auth Edge Function)

**Date:** 2026-04-27  
**Scope:** Replace current telegram_id-based auth with JWT tokens via Edge Function  
**Approach:** JWT for authentication (Подход 2 — no RLS, check auth in code)

## Goals

1. Secure user authentication via JWT instead of relying on raw Telegram ID
2. Implement Edge Function `tg-auth` to exchange Telegram initData for JWT tokens
3. Integrate JWT into frontend auth flow (Supabase setSession)
4. Add auth checks in code for write operations (updateScheme, deleteScheme, etc)
5. Keep implementation simple: no RLS, no cryptographic verification of initData

## Architecture

### 1. Edge Function: `supabase/functions/tg-auth/index.ts`

**Purpose:** Exchange Telegram initData for JWT token.

**Input:** POST request with body `{ initData: string }`
- `initData` is the raw string from `window.Telegram.WebApp.initData`
- Example: `user=%7B%22id%22%3A...%7D&...`

**Processing:**
1. Parse initData as URL-encoded query string
2. Decode `user` param from JSON
3. Extract `user.id` (Telegram user ID)
4. Generate JWT with claims: `{ sub: user.id, iat: now, exp: now + 86400 }`
5. Sign JWT using HMAC-SHA256 with `SUPABASE_JWT_SECRET` from environment secrets

**Output:** JSON response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**Error cases:**
- Invalid/missing initData → 400 Bad Request
- Parse error → 400 Bad Request
- No user.id in initData → 400 Bad Request

### 2. Frontend: `useUser.ts` Changes

**Current flow:**
```
getTelegramId() → getOrCreateUser(telegramId) → setUser()
```

**New flow:**
```
getTelegramUser().initData → fetch(/tg-auth) → setSession(jwt) → getOrCreateUser() → setUser()
```

**Changes to `useUser.ts`:**
1. Import `getTelegramInitData` (new helper in telegram.ts)
2. On mount: fetch `supabase/functions/tg-auth` with initData
3. On success: call `supabase.auth.setSession({ access_token, user: { id: telegramId } })`
4. Continue with existing `getOrCreateUser()` flow
5. On error (token generation failed): show error, set user to dev fallback

**Key:** Supabase client automatically includes JWT in Authorization header for all requests once `setSession()` is called.

### 3. Frontend: `telegram.ts` Helper

Add new export:
```typescript
export function getTelegramInitData(): string | null {
  return WebApp?.initData ?? null
}
```

### 4. Code-Level Auth Checks

**Existing locations that need auth checks:**

- `useSchemes.ts` → `updateScheme()`: Check `author_id === userId`
- `useSchemes.ts` → `deleteScheme()`: Check `author_id === userId`
- Any future write operations on user-owned data

**Pattern:**
```typescript
const updateScheme = useCallback(async (id: string, input: NewSchemeInput): Promise<void> => {
  if (!isUuid(userId)) return  // dev fallback
  
  // Fetch scheme to verify author_id
  const { data: scheme } = await supabase
    .from('schemes')
    .select('author_id')
    .eq('id', id)
    .single()
  
  if (scheme?.author_id !== userId) {
    throw new Error('Not authorized to edit this scheme')
  }
  
  // Proceed with update
}, [userId])
```

### 5. Database: Migration 006

**Minimal migration** (can be empty or with comments).

Rationale: No RLS changes in this sprint. Auth checks happen in code.

### 6. Token Lifecycle

- **Lifetime:** 24 hours (86400 seconds)
- **Refresh:** None. When expired, user gets 401 and must reopen Mini App to get new token
- **Storage:** Handled by Supabase client (encrypted session storage in mobile WebView)

## Data Flow

### Auth Initialization (on app load)

```
Frontend starts
  ↓
useUser() hook runs
  ↓
getTelegramInitData() → fetch POST /tg-auth with initData
  ↓
Edge Function parses initData, extracts user.id, signs JWT
  ↓
Frontend receives { token, expiresIn }
  ↓
supabase.auth.setSession({ access_token: token, user: { id } })
  ↓
Supabase client ready, JWT in all requests
  ↓
getOrCreateUser(telegramId) reads from DB
  ↓
useUser returns { user, loading: false }
```

### Write Operation (update/delete scheme)

```
User clicks Edit Scheme
  ↓
Form submits with updateScheme(schemeId, input)
  ↓
Hook checks: isUuid(userId)? (pass dev fallback)
  ↓
Hook fetches scheme, verifies author_id === userId
  ↓
Supabase.from('schemes').update() with JWT in Authorization header
  ↓
Backend receives request (no RLS checks yet, just stored JWT)
  ↓
Frontend handles success/error
```

## Error Handling

| Scenario | Error | Handler |
|----------|-------|---------|
| No Telegram context (dev/browser) | getTelegramInitData() returns null | Set user to dev fallback, skip tg-auth call |
| tg-auth fails | 400 Bad Request | Log error, set user to dev fallback, app continues read-only |
| JWT expired | 401 Unauthorized on any Supabase query | User sees error, must reopen Mini App |
| User tries to edit/delete other's scheme | Code check fails | Throw error, show toast "Not authorized" |

## Testing Strategy

**Manual testing:**
1. Open Mini App in Telegram → verify JWT is generated and setSession works
2. Make a read request (fetch schemes) → verify it works
3. Edit own scheme → verify it works
4. Try to edit other user's scheme (via devtools spoofing) → verify it fails with auth error
5. Wait 24h (mock time) → verify JWT expires and 401 happens

**Dev mode (no Telegram):**
- App should continue to work with dev fallback user
- Writes should be disabled (isUuid check prevents write)

## Files to Create/Modify

**Create:**
- `supabase/functions/tg-auth/index.ts` — Edge Function
- `frontend/src/lib/telegram.ts` — new export `getTelegramInitData()`

**Modify:**
- `frontend/src/hooks/useUser.ts` — integrate JWT flow
- `frontend/src/lib/supabase.ts` — ensure setSession is available
- `supabase/migrations/006_jwt_comment.sql` — minimal migration (comment only)

**No changes needed:**
- `useSchemes.ts` — already has author_id checks in place from Sprint 2
- RLS policies — not touching in this sprint

## Dependencies & Constraints

- Requires Supabase project with service_role or custom JWT signing capability
- Telegram Mini App must pass initData to frontend (standard TWA SDK)
- Frontend must support Supabase auth.setSession() (already available)

## Success Criteria

1. ✅ JWT token generated on app startup in Telegram
2. ✅ Supabase queries include Authorization header with JWT
3. ✅ User can read/write own data
4. ✅ User cannot modify other users' schemes (auth check catches it)
5. ✅ Dev mode (no Telegram) continues to work read-only
6. ✅ 401 responses handled gracefully when JWT expires

## Out of Scope (Sprint 4+)

- RLS policies for tables
- Token refresh mechanism
- Cryptographic verification of initData signature
- FAQ page
- City Card on status screen
- Timezone-aware notifications
