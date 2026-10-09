-- Auditoria somente leitura. Execute no SQL Editor e exporte a coluna `audit` como JSON.
with
required_tables(name) as (
  values ('dispositivos'), ('enquadramentos'), ('configuracoes'), ('cache_respostas'),
         ('ip_bloqueados'), ('uso_diario'), ('documentos'), ('documento_trechos')
),
table_state as (
  select jsonb_object_agg(name, to_regclass('public.' || name) is not null) value
  from required_tables
),
rls_state as (
  select jsonb_object_agg(r.name, coalesce(c.relrowsecurity, false)) value
  from required_tables r
  left join pg_class c on c.oid = to_regclass('public.' || r.name)
),
function_names(name) as (
  values ('rag_schema_version'), ('search_dispositivos_tsvector'), ('search_dispositivos_vector'),
         ('register_query_and_check_limit'), ('bump_corpus_version'), ('purge_expired_cache')
),
function_state as (
  select jsonb_object_agg(f.name, jsonb_build_object(
    'exists', p.oid is not null,
    'security_definer', coalesce(p.prosecdef, false),
    'public_execute', case when p.oid is null then false else
      has_function_privilege('public', p.oid, 'execute')
      or has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute') end
  )) value
  from function_names f
  left join lateral (
    select p.oid, p.prosecdef
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f.name
    order by p.oid limit 1
  ) p on true
),
estimated_counts as (
  select jsonb_build_object(
    'documentos', coalesce((select n_live_tup::bigint from pg_stat_user_tables where schemaname='public' and relname='documentos'), 0),
    'trechos', coalesce((select n_live_tup::bigint from pg_stat_user_tables where schemaname='public' and relname='documento_trechos'), 0),
    'dispositivos', coalesce((select n_live_tup::bigint from pg_stat_user_tables where schemaname='public' and relname='dispositivos'), 0),
    'enquadramentos', coalesce((select n_live_tup::bigint from pg_stat_user_tables where schemaname='public' and relname='enquadramentos'), 0),
    'vetores_pendentes', null
  ) value
),
rag_version as (
  select case
    when to_regprocedure('public.rag_schema_version()') is null then null
    else ((xpath('/table/row/rag_schema_version/text()', query_to_xml(
      'select public.rag_schema_version() as rag_schema_version', true, false, ''
    )))[1]::text)::integer
  end value
),
seed_state as (
  select case
    when to_regclass('public.enquadramentos') is null then '[]'::jsonb
    else coalesce((
      select jsonb_agg(value order by value)
      from unnest(xpath('/table/row/codigo_mbft/text()', query_to_xml(
        $$select codigo_mbft from public.enquadramentos where codigo_mbft in ('516-91','517-32','745-52','737-19','678-12')$$,
        true, false, ''
      ))) node
      cross join lateral (select node::text as value) parsed
    ), '[]'::jsonb)
  end value
)
select jsonb_build_object(
  'meta', jsonb_build_object('generated_at', now()),
  'extensions', jsonb_build_object(
    'vector', exists(select 1 from pg_extension where extname='vector'),
    'unaccent', exists(select 1 from pg_extension where extname='unaccent')
  ),
  'tables', (select value from table_state),
  'columns', jsonb_build_object(
    'embedding', exists(select 1 from information_schema.columns where table_schema='public' and table_name='dispositivos' and column_name='embedding'),
    'documento_id', exists(select 1 from information_schema.columns where table_schema='public' and table_name='dispositivos' and column_name='documento_id'),
    'corpus_version', exists(select 1 from information_schema.columns where table_schema='public' and table_name='configuracoes' and column_name='valor')
  ),
  'indexes', jsonb_build_object(
    'text_search', exists(select 1 from pg_indexes where schemaname='public' and indexname like '%tsvector%'),
    'vector_search', exists(select 1 from pg_indexes where schemaname='public' and indexname like '%embedding%')
  ),
  'bucket', coalesce((select jsonb_build_object('exists', true, 'public', public) from storage.buckets where id='documentos-pendentes'), jsonb_build_object('exists', false, 'public', false)),
  'rls', (select value from rls_state),
  'private_access', jsonb_build_object(
    'cache_anon', case when to_regclass('public.cache_respostas') is null then false else has_table_privilege('anon', 'public.cache_respostas', 'select') end,
    'ips_anon', case when to_regclass('public.ip_bloqueados') is null then false else has_table_privilege('anon', 'public.ip_bloqueados', 'select') end
  ),
  'functions', (select value from function_state),
  'rag_schema_version', (select value from rag_version),
  'counts', (select value from estimated_counts),
  'seed_examples', (select value from seed_state)
) as audit;
