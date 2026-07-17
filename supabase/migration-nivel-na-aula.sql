-- ============================================================
--  Ajuste: nível passa a ficar na AULA (lessons).
--  Aluno não tem mais nível nem e-mail; módulo não tem mais nível.
-- ============================================================

alter table public.students drop column if exists nivel;
alter table public.students drop column if exists email;
alter table public.modules  drop column if exists nivel;

alter table public.lessons  add column if not exists nivel text;
