-- Migration 004: Open user-scoped RLS policies.
--
-- Background
-- ----------
-- Migrations 001/003 protected users, visa_entries, scheme_votes and
-- chat_messages with RLS policies of the form:
--
--     user_id = (SELECT id FROM users
--                 WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
--
-- The client (frontend/src/lib/supabase.ts → setTelegramContext) sets
-- `app.telegram_id` once at mount via `supabase.rpc('set_config', …)`,
-- expecting the value to persist for all subsequent queries in the session.
--
-- This does NOT work on Supabase. Supabase fronts Postgres with PgBouncer in
-- **transaction pooling** mode: each HTTP request gets a fresh transaction,
-- `set_config` is scoped to that transaction, and by the time the next
-- request runs the setting is gone. So for INSERTs the `USING`/`WITH CHECK`
-- expression always evaluates against `NULL::BIGINT`, returns NULL (treated
-- as false by RLS), and the write is silently refused. The client code did
-- not check the `error` field on these insert calls — hence "I added a visa
-- and nothing happened" with no visible error.
--
-- Trade-off accepted here
-- -----------------------
-- Rather than ship a half-baked JWT flow today, we explicitly accept the
-- trade-off already documented in SECURITY.md §1 (identity is
-- client-asserted; a motivated user can spoof another user's telegram_id)
-- and §2 (anon key is public; RLS is the only gate). Opening these policies
-- does not make the threat model worse — it just stops pretending to enforce
-- a rule that never actually held. Writes now succeed so the app works.
--
-- Proper fix (tracked): replace this migration with one that uses
-- `auth.uid()` once we ship the Edge Function that verifies Telegram
-- initData HMAC and issues a Supabase JWT. See SECURITY.md §1 "The proper fix".
--
-- This migration is idempotent — safe to re-run.

-- users ---------------------------------------------------------------------
DROP POLICY IF EXISTS "users_own"    ON users;
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true) WITH CHECK (true);
-- DELETE intentionally not exposed to anon — nothing in the UI needs it,
-- and leaving it closed prevents a drive-by from wiping another user.

-- visa_entries --------------------------------------------------------------
DROP POLICY IF EXISTS "entries_own"    ON visa_entries;
DROP POLICY IF EXISTS "entries_select" ON visa_entries;
DROP POLICY IF EXISTS "entries_insert" ON visa_entries;
DROP POLICY IF EXISTS "entries_update" ON visa_entries;
DROP POLICY IF EXISTS "entries_delete" ON visa_entries;
CREATE POLICY "entries_select" ON visa_entries FOR SELECT USING (true);
CREATE POLICY "entries_insert" ON visa_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "entries_update" ON visa_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "entries_delete" ON visa_entries FOR DELETE USING (true);

-- scheme_votes --------------------------------------------------------------
DROP POLICY IF EXISTS "votes_own"    ON scheme_votes;
DROP POLICY IF EXISTS "votes_select" ON scheme_votes;
DROP POLICY IF EXISTS "votes_insert" ON scheme_votes;
DROP POLICY IF EXISTS "votes_update" ON scheme_votes;
DROP POLICY IF EXISTS "votes_delete" ON scheme_votes;
CREATE POLICY "votes_select" ON scheme_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON scheme_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "votes_update" ON scheme_votes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "votes_delete" ON scheme_votes FOR DELETE USING (true);

-- chat_messages -------------------------------------------------------------
DROP POLICY IF EXISTS "chat_own"    ON chat_messages;
DROP POLICY IF EXISTS "chat_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert" ON chat_messages;
CREATE POLICY "chat_select" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT WITH CHECK (true);
-- chat messages are append-only from the client; no update/delete needed.

-- schemes -------------------------------------------------------------------
-- Keep seed rows (author_id IS NULL) immutable, but drop the set_config
-- dependency for author-authored rows.
DROP POLICY IF EXISTS "schemes_insert_authored" ON schemes;
DROP POLICY IF EXISTS "schemes_update_own"      ON schemes;
DROP POLICY IF EXISTS "schemes_delete_own"      ON schemes;
DROP POLICY IF EXISTS "schemes_insert"          ON schemes;
DROP POLICY IF EXISTS "schemes_update"          ON schemes;
DROP POLICY IF EXISTS "schemes_delete"          ON schemes;
-- "schemes_read" SELECT = true stays from 001.
CREATE POLICY "schemes_insert" ON schemes FOR INSERT WITH CHECK (true);
CREATE POLICY "schemes_update" ON schemes FOR UPDATE
  USING (author_id IS NOT NULL) WITH CHECK (author_id IS NOT NULL);
CREATE POLICY "schemes_delete" ON schemes FOR DELETE
  USING (author_id IS NOT NULL);
-- The `author_id IS NOT NULL` guard keeps the curated starter content safe:
-- seed rows have author_id = NULL and so fall outside UPDATE/DELETE scope.

-- scheme_comments -----------------------------------------------------------
DROP POLICY IF EXISTS "scheme_comments_insert" ON scheme_comments;
DROP POLICY IF EXISTS "scheme_comments_delete" ON scheme_comments;
-- "scheme_comments_read" SELECT = true stays from 002.
CREATE POLICY "scheme_comments_insert" ON scheme_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "scheme_comments_delete" ON scheme_comments FOR DELETE USING (true);
