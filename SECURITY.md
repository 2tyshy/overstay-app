# Security

This document tracks known security limitations in Overstay, the rationale for
accepting them in the current phase, and the path to closing each one. It is
written so a future contributor (or the author on a Monday morning) can tell at
a glance which risks are live, which are mitigated, and what the proper fix
looks like.

Last reviewed: 2026-04-22.

---

## 1. Identity is client-asserted (auth debt)

### What's happening

Row-Level Security policies in Supabase key off `current_setting('app.telegram_id')`,
which is written by the client via `supabase.rpc('set_config', ...)` inside
`lib/supabase.ts` → `setTelegramContext()`. The value comes from
`WebApp.initDataUnsafe.user.id` (see `lib/telegram.ts`).

```ts
// lib/supabase.ts
await supabase.rpc('set_config', {
  setting_name: 'app.telegram_id',
  setting_value: String(telegramId),
})
```

`initDataUnsafe` is, as the name says, **unsafe**: it is unsigned data derived
from the Telegram WebApp `initData` query string, but with no HMAC verification.
A motivated user can:

1. Open the mini-app outside Telegram (the app falls back to `id: 'dev'` +
   `telegram_id: 12345` in `useUser.ts` when `getTelegramId()` returns `null`).
2. Run the mini-app inside Telegram, then call `set_config` directly from
   devtools with any `telegram_id` they like.
3. Point a script at the Supabase REST endpoint with the anon key (which is
   public-by-design) and set `app.telegram_id` to someone else's ID before
   any query.

All three bypass authentication. Anyone who knows (or guesses) another user's
telegram_id can read that user's visa entries, cast votes in their name, and
post scheme comments attributed to them.

### Why it is acceptable *right now*

- The app is a private beta with a handful of invited users (RU/UA/KZ digital
  nomads from the author's network). No sensitive PII is stored: the data is
  "I entered Vietnam on 2026-04-05 with an e-visa 90" — public-ish by nature.
- Impersonation grants read access to other people's stamps and the ability
  to vote on schemes. There is no payment flow, no chat DMs, no documents
  uploaded to storage, no passport scans retained (OCR runs client-side and
  sends cropped images to Gemini; results are not persisted).
- Scheme counters cannot be forged directly any more (see §4).

### The proper fix

Replace client-asserted identity with a server-verified JWT:

1. **Supabase Edge Function `verify-initdata`**: receives the raw `initData`
   query string from the client, validates the HMAC signature against the bot
   token (`TELEGRAM_BOT_TOKEN` secret), and on success returns a signed JWT
   whose `sub` is the `users.id` for that telegram_id (creating the row if
   absent).
2. **Client**: call the Edge Function once on mount, store the JWT in memory
   (not localStorage — see §5), attach it to the Supabase client via
   `supabase.auth.setSession()`.
3. **RLS**: rewrite every policy to use `auth.uid()` instead of
   `current_setting('app.telegram_id')`. Drop `set_config()` from the client
   entirely.
4. **Dev fallback**: keep the `id: 'dev'` escape hatch, but gate it behind
   `import.meta.env.DEV` so production builds don't ship an anonymous-user
   path.

Tracked as follow-up work. Every migration added since 001 assumes the RLS
model above, so the rewrite is mechanical — a new migration can replace each
`current_setting(...)` clause in one pass.

---

## 2. Anon key is public, RLS is the only gate

Supabase's anon key (`VITE_SUPABASE_ANON_KEY`) is embedded in the production
bundle and shipped to every browser. This is intended: Supabase's security
model puts the trust boundary at RLS, not at the key. The implication is that
**every policy matters** — a missing or loose policy exposes a table to the
whole internet.

Current policy inventory (after migration 003):

| Table            | SELECT      | INSERT                                  | UPDATE                            | DELETE                            |
| ---------------- | ----------- | --------------------------------------- | --------------------------------- | --------------------------------- |
| `users`          | own only    | own only                                | own only                          | own only                          |
| `visa_entries`   | own only    | own only                                | own only                          | own only                          |
| `schemes`        | everyone    | `author_id = current user`              | `author_id IS NOT NULL AND own`   | `author_id IS NOT NULL AND own`   |
| `scheme_votes`   | own only    | own only                                | own only                          | own only                          |
| `scheme_comments`| everyone    | `user_id = current user`                | (disabled — comments are immutable) | own only                          |
| `chat_messages`  | own only    | own only                                | own only                          | own only                          |
| `visa_rules`     | everyone    | — (managed by migrations, no client)    | —                                 | —                                 |

The `author_id IS NOT NULL` guard on `schemes` UPDATE/DELETE means seed rows
(which have `author_id = NULL`) are immutable even by the "current user" —
nobody can overwrite the curated starter content.

---

## 3. Vote counters cannot be forged from the client

Original design (migration 002) exposed an `apply_scheme_vote(...)` RPC marked
`SECURITY DEFINER` so the client could atomically adjust `works_count` /
`broken_count`. That opened a hole: a caller could invoke the RPC with any
scheme_id and skew the totals. Migration 003 removes that function.

Replacement (migration 003):

- Client writes only to `scheme_votes` (RLS: `user_id = current user`).
- AFTER INSERT/UPDATE/DELETE trigger `trg_recount_scheme_votes` recalculates
  the counters on the parent `schemes` row by `COUNT(*)` — not incremental
  math, so drift cannot accumulate.
- Client never has direct UPDATE on `schemes.works_count`; the column is
  read-only to the anon role by virtue of the `schemes_write` policy only
  covering INSERT.

The trigger's recount is a full count per vote event, which is fine at
current volume (tens of schemes × hundreds of votes). If scale demands it,
swap to incremental (`+1` / `-1` per row operation) with a periodic
reconcile job.

---

## 4. Input validation is enforced by the database

Migration 003 added CHECK constraints so junk payloads are rejected at the
schemes table regardless of client-side validation:

- `passport IN ('RU','UA','KZ')`
- `from_country ~ '^[A-Z]{2}$'`, `to_country ~ '^[A-Z]{2}$'`
- `cost_usd >= 0`, `duration_hours >= 0` (or NULL)
- `char_length(description) BETWEEN 1 AND 2000`
- `char_length(tip) <= 500`
- `char_length(border_crossing) <= 120`

And a BEFORE INSERT trigger on `scheme_comments` rejects writes less than 5
seconds after the same user's last comment (`enforce_comment_rate_limit`),
so a scripted client can't flood the thread.

Client-side validation (`SchemesPage`, `SchemeCommentsThread`) is still in
place for UX — the DB constraints are the authoritative check.

---

## 5. Gemini API key is exposed to the client

### What's happening

`lib/gemini.ts` resolves the Gemini API key from:

1. `localStorage['overstay_gemini_key']` (user-provided, "bring your own key")
2. `VITE_GEMINI_API_KEY` from the build env (baked into the bundle)

Path (2) means the deployed key is visible in devtools → Network on the first
request, and extractable from the JS bundle. A malicious user can pull it out
and run up Gemini bill against the deploy owner's Google Cloud quota.

### Why it is acceptable *right now*

- Single-user deploy: the envelope is the author's personal Gemini key with a
  spending cap set in Google Cloud Console. If usage spikes, the cap catches
  it and the app degrades gracefully to "OCR offline" rather than "bill
  shock."
- Gemini 2.5 Flash at current usage (a few OCRs + a few chat turns per user
  per day) costs pennies even in the worst credential-leak scenario before
  the cap trips.

### The proper fix

Proxy all Gemini calls through a Supabase Edge Function (`gemini-proxy`) that:

1. Verifies the caller's Supabase JWT (i.e., requires §1 to be done first).
2. Rate-limits per user_id (e.g., 20 requests/hour).
3. Holds the real Gemini key as a Supabase secret, never served to clients.
4. Returns the Gemini response body verbatim.

Client calls `/functions/v1/gemini-proxy` instead of `generativelanguage.googleapis.com`.
Remove `VITE_GEMINI_API_KEY` from the build. Keep the BYO-key localStorage
path for power users who want zero rate-limiting and will eat their own cost.

---

## 6. Telegram bot token — not in the web bundle

Confirm before every deploy: `TELEGRAM_BOT_TOKEN` exists only in the bot
service's env (Railway), **not** in the frontend `.env`. `VITE_` prefixed
variables are bundled into the client by Vite — a `VITE_TELEGRAM_BOT_TOKEN`
would leak the whole bot to anyone loading the app. Current frontend `.env`
contains only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
`VITE_GEMINI_API_KEY` (see §5). The bot token is correctly quarantined.

---

## 7. Things we decided not to do

- **Bot-side initData verify then pass user_id via deep-link param.** Looks
  tempting — the bot could sign a short-lived token in the `start_param` —
  but it still leaves the web client holding a bearer credential with no way
  to rotate. Proper JWT via Edge Function is strictly better for only a bit
  more work.
- **Row-level encryption of visa_entries.** No threat model currently
  justifies it. Entries are inherently shareable (users paste them into
  Telegram chats anyway). Revisit if we add something actually sensitive
  like passport photos.
- **CAPTCHA on scheme_comments.** The 5-second rate limit covers the spam
  vector we're most worried about. If automated abuse shows up, add hCaptcha
  at the Edge-Function layer when we add §1.

---

## Reporting

If you find an issue not covered here, email the project owner directly
rather than opening a public issue. This is a small beta app — we have time
to fix things quietly before users notice.
