-- Migration 014: Restore proper JWT-scoped RLS policies.
--
-- Replaces the open USING(true) policies introduced in 004 with real
-- per-user scoping based on the custom JWT issued by the `tg-auth` edge
-- function.
--
-- HOW AUTH WORKS HERE
-- -------------------
-- The `tg-auth` edge function verifies Telegram initData HMAC and mints a
-- JWT with payload:
--   { sub: "<telegram_id>", aud: "authenticated", role: "authenticated", … }
--
-- The frontend calls supabase.auth.setSession({ access_token, refresh_token })
-- which wires the JWT into the Supabase client so every subsequent request
-- carries it as Authorization: Bearer <token>.
--
-- IMPORTANT: APP_JWT_SECRET (used to sign the JWT in tg-auth) MUST equal
-- the Supabase project's JWT secret (SUPABASE_JWT_SECRET / "JWT Secret" in
-- the project settings). If they differ, auth.jwt() will return NULL for
-- every request and all scoped policies will silently deny everything.
--
-- Because `sub` is a numeric telegram_id string (not a UUID), we cannot use
-- auth.uid(). Use (auth.jwt() ->> 'sub')::BIGINT instead.
--
-- This migration is idempotent — safe to re-run.


-- ========== users ==========================================================

DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

CREATE POLICY "users_select_own" ON users FOR SELECT
  USING (telegram_id = (auth.jwt() ->> 'sub')::BIGINT);

CREATE POLICY "users_insert_own" ON users FOR INSERT
  WITH CHECK (telegram_id = (auth.jwt() ->> 'sub')::BIGINT);

CREATE POLICY "users_update_own" ON users FOR UPDATE
  USING (telegram_id = (auth.jwt() ->> 'sub')::BIGINT)
  WITH CHECK (telegram_id = (auth.jwt() ->> 'sub')::BIGINT);

-- No DELETE policy — users cannot delete their own account from the client.


-- ========== visa_entries ===================================================

DROP POLICY IF EXISTS "entries_select" ON visa_entries;
DROP POLICY IF EXISTS "entries_insert" ON visa_entries;
DROP POLICY IF EXISTS "entries_update" ON visa_entries;
DROP POLICY IF EXISTS "entries_delete" ON visa_entries;
DROP POLICY IF EXISTS "entries_select_own" ON visa_entries;
DROP POLICY IF EXISTS "entries_insert_own" ON visa_entries;
DROP POLICY IF EXISTS "entries_update_own" ON visa_entries;
DROP POLICY IF EXISTS "entries_delete_own" ON visa_entries;

CREATE POLICY "entries_select_own" ON visa_entries FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));

CREATE POLICY "entries_insert_own" ON visa_entries FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));

CREATE POLICY "entries_update_own" ON visa_entries FOR UPDATE
  USING (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT))
  WITH CHECK (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));

CREATE POLICY "entries_delete_own" ON visa_entries FOR DELETE
  USING (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));


-- ========== scheme_votes ===================================================

DROP POLICY IF EXISTS "votes_select" ON scheme_votes;
DROP POLICY IF EXISTS "votes_insert" ON scheme_votes;
DROP POLICY IF EXISTS "votes_update" ON scheme_votes;
DROP POLICY IF EXISTS "votes_delete" ON scheme_votes;
DROP POLICY IF EXISTS "votes_select_own" ON scheme_votes;
DROP POLICY IF EXISTS "votes_insert_own" ON scheme_votes;
DROP POLICY IF EXISTS "votes_update_own" ON scheme_votes;
DROP POLICY IF EXISTS "votes_delete_own" ON scheme_votes;

CREATE POLICY "votes_select_own" ON scheme_votes FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));

CREATE POLICY "votes_insert_own" ON scheme_votes FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));

CREATE POLICY "votes_update_own" ON scheme_votes FOR UPDATE
  USING (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT))
  WITH CHECK (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));

CREATE POLICY "votes_delete_own" ON scheme_votes FOR DELETE
  USING (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));


-- ========== chat_messages ==================================================

DROP POLICY IF EXISTS "chat_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_select_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert_own" ON chat_messages;

CREATE POLICY "chat_select_own" ON chat_messages FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));

CREATE POLICY "chat_insert_own" ON chat_messages FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));

-- chat_messages is append-only from the client; no UPDATE/DELETE policies.


-- ========== schemes ========================================================
-- Public read; authenticated insert; author-only update/delete.
-- Seed rows are protected by author_id IS NOT NULL guards.

DROP POLICY IF EXISTS "schemes_read" ON schemes;
CREATE POLICY "schemes_read" ON schemes FOR SELECT USING (true);

DROP POLICY IF EXISTS "schemes_insert" ON schemes;
CREATE POLICY "schemes_insert" ON schemes FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') IS NOT NULL);

DROP POLICY IF EXISTS "schemes_update" ON schemes;
DROP POLICY IF EXISTS "schemes_update_own" ON schemes;
CREATE POLICY "schemes_update_own" ON schemes FOR UPDATE
  USING (
    author_id IS NOT NULL
    AND author_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT)
  )
  WITH CHECK (
    author_id IS NOT NULL
    AND author_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT)
  );

DROP POLICY IF EXISTS "schemes_delete" ON schemes;
DROP POLICY IF EXISTS "schemes_delete_own" ON schemes;
CREATE POLICY "schemes_delete_own" ON schemes FOR DELETE
  USING (
    author_id IS NOT NULL
    AND author_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT)
  );


-- ========== scheme_comments ================================================
-- SELECT policy ("scheme_comments_read") stays as USING(true) from 002.

DROP POLICY IF EXISTS "scheme_comments_insert" ON scheme_comments;
DROP POLICY IF EXISTS "scheme_comments_delete" ON scheme_comments;
DROP POLICY IF EXISTS "scheme_comments_insert_own" ON scheme_comments;
DROP POLICY IF EXISTS "scheme_comments_delete_own" ON scheme_comments;

CREATE POLICY "scheme_comments_insert_own" ON scheme_comments FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));

CREATE POLICY "scheme_comments_delete_own" ON scheme_comments FOR DELETE
  USING (user_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'sub')::BIGINT));
