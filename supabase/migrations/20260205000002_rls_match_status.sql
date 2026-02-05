-- Phase 2 MVP: enforce wali approval before messaging

-- Replace message insert policy to require match.status='active'
drop policy if exists "Users can send messages to their matches" on public.messages;

create policy "Users can send messages to active matches"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
        and m.is_active = true
        and m.status = 'active'
    )
  );
