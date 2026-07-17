-- ============================================================
--  Agenda baseada em EVENTOS (cada aula/compromisso é um evento
--  editável, com status e cor). Substitui o uso de "schedules".
-- ============================================================
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  student_id      uuid references public.students(id) on delete set null,
  group_id        uuid references public.groups(id)   on delete set null,
  status          text check (status in ('pendente','confirmada','cancelada')), -- null = sem status
  cor             text,
  anotacoes_prof  text,
  anotacoes_aluno text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_events_start on public.events(start_at);
create index if not exists idx_events_student on public.events(student_id);
create index if not exists idx_events_group on public.events(group_id);

alter table public.events enable row level security;
drop policy if exists "admin_all_events" on public.events;
create policy "admin_all_events" on public.events for all to authenticated using (true) with check (true);
