/**
 * UUID helpers.
 *
 * Motivation: when the app runs outside Telegram (e.g. opened in a browser for
 * QA), `useUser` falls back to a synthetic user with `id: 'dev'`. Every hook
 * that reads or writes a row scoped by user_id / author_id then hits Postgres
 * with the string 'dev' and gets back:
 *
 *     invalid input syntax for type uuid: "dev"
 *
 * We can't just change the fallback to undefined — downstream UI (SchemeCommentsThread,
 * comment author avatars, etc.) relies on user.id being a non-empty string.
 * So the hooks instead guard their DB calls with `isUuid(userId)` and silently
 * no-op when the id is the dev sentinel. That keeps the read-only experience
 * working outside Telegram without scattering strangely-specific `=== 'dev'`
 * checks across the codebase.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(s: string | undefined | null): s is string {
  return !!s && UUID_RE.test(s)
}
