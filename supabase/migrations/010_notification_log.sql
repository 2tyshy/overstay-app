create table if not exists notification_log (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references users(id) on delete cascade,
  visa_entry_id uuid       not null references visa_entries(id) on delete cascade,
  threshold_days int       not null check (threshold_days in (1, 3, 7)),
  sent_at      timestamptz not null default now(),
  unique (user_id, visa_entry_id, threshold_days)
);

create index if not exists notification_log_user_idx on notification_log(user_id);
