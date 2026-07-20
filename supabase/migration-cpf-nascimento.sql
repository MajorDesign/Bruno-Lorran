-- Campos adicionais do aluno: CPF e data de nascimento.
alter table public.students add column if not exists cpf text;
alter table public.students add column if not exists nascimento date;
