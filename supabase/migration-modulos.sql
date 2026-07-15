-- ============================================================
--  Migração: Módulos + status personalizados
--  Rode este SQL no Supabase (SQL Editor > New query) UMA VEZ.
--  Complementa o supabase/schema.sql já executado.
-- ============================================================

-- ---------- Módulos (agrupam os vídeos) ----------
create table if not exists public.modules (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  nivel      text,
  ordem      integer not null default 0,
  created_at timestamptz not null default now()
);

-- Vídeo passa a pertencer (opcionalmente) a um módulo
alter table public.videos
  add column if not exists module_id uuid references public.modules(id) on delete set null;

create index if not exists idx_videos_module on public.videos(module_id);

-- ---------- Status personalizados (para módulos) ----------
create table if not exists public.module_statuses (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  cor        text not null default '#1d4ed8',   -- hex
  ordem      integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Vínculo aluno × módulo (com status personalizado) ----------
create table if not exists public.student_modules (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  module_id  uuid not null references public.modules(id)  on delete cascade,
  status_id  uuid references public.module_statuses(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, module_id)
);

create index if not exists idx_student_modules_student on public.student_modules(student_id);
create index if not exists idx_student_modules_module  on public.student_modules(module_id);

-- updated_at automático (reaproveita a função criada no schema.sql)
drop trigger if exists trg_student_modules_touch on public.student_modules;
create trigger trg_student_modules_touch
  before update on public.student_modules
  for each row execute function public.touch_updated_at();

-- ============================================================
--  RLS — só o administrador autenticado
-- ============================================================
alter table public.modules         enable row level security;
alter table public.module_statuses enable row level security;
alter table public.student_modules enable row level security;

drop policy if exists "admin_all_modules" on public.modules;
create policy "admin_all_modules" on public.modules
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_module_statuses" on public.module_statuses;
create policy "admin_all_module_statuses" on public.module_statuses
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_student_modules" on public.student_modules;
create policy "admin_all_student_modules" on public.student_modules
  for all to authenticated using (true) with check (true);
