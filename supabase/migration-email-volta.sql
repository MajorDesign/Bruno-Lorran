-- Reativa o e-mail do aluno (foi removido antes; usuário pediu de volta).
alter table public.students add column if not exists email text;
