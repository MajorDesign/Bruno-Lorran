-- ============================================================
--  Data/hora do status da aula (editável manualmente).
--  status_at = quando o status foi definido. Um gatilho atualiza
--  automaticamente quando o STATUS muda, mas edições manuais da
--  data (sem mudar o status) são preservadas.
-- ============================================================

alter table public.student_lessons add column if not exists status_at timestamptz;
update public.student_lessons set status_at = updated_at where status_at is null;
alter table public.student_lessons alter column status_at set default now();

create or replace function public.set_status_at()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.status_at is null then NEW.status_at = now(); end if;
  elsif NEW.status is distinct from OLD.status then
    -- status mudou -> registra o momento da mudança
    NEW.status_at = now();
  end if;
  -- se só a data foi editada (status igual), mantém o valor informado
  return NEW;
end;
$$;

drop trigger if exists trg_student_lessons_status_at on public.student_lessons;
create trigger trg_student_lessons_status_at
  before insert or update on public.student_lessons
  for each row execute function public.set_status_at();
