-- ============================================================
--  Migração: Lições (dentro dos módulos) + status por aluno
--  Módulo agrupa Lições. Cada lição tem status Solicitado/Assistido
--  por aluno (igual ao dropdown da planilha).
-- ============================================================

-- ---------- Lições (pertencem a um módulo) ----------
create table if not exists public.lessons (
  id         uuid primary key default gen_random_uuid(),
  module_id  uuid not null references public.modules(id) on delete cascade,
  nome       text not null,
  ordem      integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_lessons_module on public.lessons(module_id);

-- ---------- Vínculo aluno × lição (status fixo) ----------
create table if not exists public.student_lessons (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id  uuid not null references public.lessons(id)  on delete cascade,
  status     text not null default 'solicitado'
             check (status in ('solicitado', 'assistido')),
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create index if not exists idx_student_lessons_student on public.student_lessons(student_id);
create index if not exists idx_student_lessons_lesson  on public.student_lessons(lesson_id);

-- updated_at automático
drop trigger if exists trg_student_lessons_touch on public.student_lessons;
create trigger trg_student_lessons_touch
  before update on public.student_lessons
  for each row execute function public.touch_updated_at();

-- ============================================================
--  RLS — só o administrador autenticado
-- ============================================================
alter table public.lessons         enable row level security;
alter table public.student_lessons enable row level security;

drop policy if exists "admin_all_lessons" on public.lessons;
create policy "admin_all_lessons" on public.lessons
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_student_lessons" on public.student_lessons;
create policy "admin_all_student_lessons" on public.student_lessons
  for all to authenticated using (true) with check (true);
