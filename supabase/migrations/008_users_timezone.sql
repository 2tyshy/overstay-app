-- Migration 008: add timezone column to users for locale-aware notifications
-- Stores IANA timezone string (e.g. 'Asia/Bangkok', 'Europe/Moscow').
-- Defaults to 'UTC' so existing users still get reminders at 10:00 UTC.
-- The bot scheduler reads this to send reminders at 10:00 in the user's
-- local time instead of a fixed UTC sweep.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';
