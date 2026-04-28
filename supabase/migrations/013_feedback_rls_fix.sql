-- Fix: policy was restricted to authenticated role but frontend uses anon key
drop policy if exists "users can insert feedback" on feedback;

create policy "anyone can insert feedback"
  on feedback for insert
  to anon, authenticated
  with check (true);
