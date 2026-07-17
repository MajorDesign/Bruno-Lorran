-- ============================================================
--  Ajusta os status de evento para: pendente | realizada | cancelada
--  (antes era 'confirmada'; vira 'realizada' para bater com a agenda).
-- ============================================================
alter table public.events drop constraint if exists events_status_check;
update public.events set status = 'realizada' where status = 'confirmada';
alter table public.events
  add constraint events_status_check check (status in ('pendente','realizada','cancelada'));
