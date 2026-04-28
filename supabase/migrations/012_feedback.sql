create table if not exists feedback (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references users(id) on delete set null,
  content      text        not null,
  raw_transcript text,
  sentiment    text        check (sentiment in ('positive', 'neutral', 'negative')),
  category     text        check (category in ('bug', 'feature', 'praise', 'general')),
  created_at   timestamptz not null default now()
);

alter table feedback enable row level security;

-- Users can insert their own feedback; no read (admin only via service_role)
create policy "users can insert feedback"
  on feedback for insert
  to authenticated
  with check (true);
