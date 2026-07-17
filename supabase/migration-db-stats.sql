-- ============================================================
--  Função get_db_stats(): tamanho do banco e por tabela.
--  SECURITY DEFINER (roda como owner) para ler pg_database_size,
--  liberada só para usuários autenticados (admin).
-- ============================================================
create or replace function public.get_db_stats()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'tables', (
      select coalesce(json_agg(t order by t.bytes desc), '[]'::json)
      from (
        select
          c.relname as name,
          pg_total_relation_size(c.oid) as bytes,
          coalesce(s.n_live_tup, 0)::bigint as rows
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        left join pg_stat_user_tables s on s.relid = c.oid
        where n.nspname = 'public' and c.relkind = 'r'
      ) t
    )
  );
$$;

revoke all on function public.get_db_stats() from public, anon;
grant execute on function public.get_db_stats() to authenticated;
