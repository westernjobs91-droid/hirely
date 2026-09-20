-- READ ONLY: run in the Supabase SQL editor before and after migration.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('contacts','company_cache');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='public'
and tablename in ('contacts','company_cache') order by tablename, policyname;

select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in ('contacts','company_cache')
and grantee in ('anon','authenticated','PUBLIC') order by table_name, grantee, privilege_type;

select table_name, column_name, data_type from information_schema.columns
where table_schema='public' and table_name='contacts'
and column_name in ('id','user_id','deleted_at');

select tgname, pg_get_triggerdef(oid) as definition from pg_trigger
where tgrelid='public.contacts'::regclass and not tgisinternal;

select conname, pg_get_constraintdef(oid) as definition from pg_constraint
where conrelid='public.contacts'::regclass or confrelid='public.contacts'::regclass;
