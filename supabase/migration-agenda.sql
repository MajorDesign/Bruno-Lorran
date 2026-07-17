-- ============================================================
--  Agenda: campos do aluno, grupos e agendamentos recorrentes.
-- ============================================================

-- ---------- Aluno: foto, telefone, observações ----------
alter table public.students add column if not exists telefone    text;
alter table public.students add column if not exists foto_url    text;
alter table public.students add column if not exists observacoes text;

-- ---------- Grupos (aulas em grupo) ----------
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id   uuid not null references public.groups(id)   on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (group_id, student_id)
);

-- ---------- Agendamentos (regra de aula recorrente) ----------
create table if not exists public.schedules (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references public.students(id) on delete cascade,
  group_id     uuid references public.groups(id)   on delete cascade,
  start_at     timestamptz not null,                 -- primeiro dia + hora
  duration_min integer not null default 60,
  recurrence   text not null default 'semanal'
               check (recurrence in ('nenhuma','semanal','quinzenal','mensal')),
  repeat_until date,
  created_at   timestamptz not null default now(),
  check (student_id is not null or group_id is not null)
);

create index if not exists idx_schedules_student on public.schedules(student_id);
create index if not exists idx_schedules_group   on public.schedules(group_id);

-- ---------- RLS (só admin autenticado) ----------
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.schedules     enable row level security;

drop policy if exists "admin_all_groups" on public.groups;
create policy "admin_all_groups" on public.groups for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_group_members" on public.group_members;
create policy "admin_all_group_members" on public.group_members for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_schedules" on public.schedules;
create policy "admin_all_schedules" on public.schedules for all to authenticated using (true) with check (true);

-- ============================================================
--  Storage: bucket público "avatars" para as fotos dos alunos.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read"   on storage.objects;
drop policy if exists "avatars_insert" on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
drop policy if exists "avatars_delete" on storage.objects;

create policy "avatars_read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_insert" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy "avatars_update" on storage.objects for update to authenticated using (bucket_id = 'avatars');
create policy "avatars_delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars');
