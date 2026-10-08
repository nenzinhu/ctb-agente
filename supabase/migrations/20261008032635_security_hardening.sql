-- Keep operational and user-derived data behind the server client.
-- These tables are never read directly by the browser.
drop policy if exists "public read" on public.cache_respostas;
drop policy if exists "public read" on public.ip_bloqueados;

revoke select on table public.cache_respostas from anon, authenticated;
revoke select on table public.ip_bloqueados from anon, authenticated;

-- SECURITY DEFINER functions bypass RLS. PostgreSQL grants EXECUTE to PUBLIC
-- by default, so restrict the optional migration-007 functions to the
-- privileged server role when they exist.
do $$
declare
  function_signature text;
begin
  foreach function_signature in array array[
    'public.register_query_and_check_limit(text,integer,text,text,boolean,text,boolean,integer)',
    'public.bump_corpus_version()',
    'public.purge_expired_cache()'
  ]
  loop
    if to_regprocedure(function_signature) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', function_signature);
      execute format('grant execute on function %s to service_role', function_signature);
    end if;
  end loop;
end
$$;
