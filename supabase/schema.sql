-- ============================================================
--  Plataforma Bruno Lorran — Schema do banco (Supabase / Postgres)
--  Rode este SQL no painel do Supabase: SQL Editor > New query.
-- ============================================================

-- ---------- Tabela: alunos ----------
create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  email      text,
  nivel      text,                       -- ex.: Beginner, Intermediate, Advanced
  created_at timestamptz not null default now()
);

-- ---------- Tabela: vídeos ----------
create table if not exists public.videos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  nivel      text,                       -- nível ao qual o vídeo pertence
  ordem      integer not null default 0, -- ordem de exibição dentro do nível
  created_at timestamptz not null default now()
);

-- ---------- Tabela de vínculo: aluno × vídeo (controle manual) ----------
create table if not exists public.student_videos (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  video_id   uuid not null references public.videos(id)   on delete cascade,
  status     text not null default 'solicitado'
             check (status in ('solicitado', 'assistido')),
  updated_at timestamptz not null default now(),
  unique (student_id, video_id)          -- um vídeo aparece uma vez por aluno
);

create index if not exists idx_student_videos_student on public.student_videos(student_id);
create index if not exists idx_student_videos_video   on public.student_videos(video_id);

-- Mantém updated_at sempre atualizado quando o status muda
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_student_videos_touch on public.student_videos;
create trigger trg_student_videos_touch
  before update on public.student_videos
  for each row execute function public.touch_updated_at();

-- ============================================================
--  RLS — só usuários autenticados (o administrador) acessam os dados.
--  O aluno NÃO tem login, então não há acesso público.
-- ============================================================
alter table public.students       enable row level security;
alter table public.videos         enable row level security;
alter table public.student_videos enable row level security;

-- students
drop policy if exists "admin_all_students" on public.students;
create policy "admin_all_students" on public.students
  for all to authenticated using (true) with check (true);

-- videos
drop policy if exists "admin_all_videos" on public.videos;
create policy "admin_all_videos" on public.videos
  for all to authenticated using (true) with check (true);

-- student_videos
drop policy if exists "admin_all_student_videos" on public.student_videos;
create policy "admin_all_student_videos" on public.student_videos
  for all to authenticated using (true) with check (true);

-- ============================================================
--  Como criar o login do administrador:
--  Painel Supabase > Authentication > Users > "Add user"
--  Informe email e senha. Desative signups públicos em
--  Authentication > Providers > Email (Allow new users = off),
--  já que apenas o admin deve ter acesso.
-- ============================================================
