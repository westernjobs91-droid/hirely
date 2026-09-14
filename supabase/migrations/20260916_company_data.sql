begin;
create table if not exists public.company_directory (
 id uuid primary key default gen_random_uuid(), name text not null, domain text not null unique,
 aliases text[] not null default '{}', country text not null default '', industry text not null default '',
 website text not null, domain_confirmed boolean not null default false,
 pattern text, status text not null default 'needs_evidence' check(status in ('needs_evidence','approved','paused')),
 approved_at timestamptz, expires_at timestamptz, updated_at timestamptz not null default now()
);
create index if not exists company_directory_aliases on public.company_directory using gin(aliases);
create table if not exists public.company_pattern_evidence (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.company_directory(id) on delete cascade,
 first_name text not null, last_name text not null, email text not null, source_url text not null,
 source_type text not null check(source_type in ('official_website','licensed_data')),
 observed_at timestamptz not null, reuse_confirmed boolean not null default false,
 excluded boolean not null default false, created_at timestamptz not null default now(),
 unique(company_id,email)
);
create table if not exists public.company_requests (
 company_key text primary key, company_name text not null, requested_domain text not null default '',
 requests bigint not null default 0, api_calls bigint not null default 0,
 api_avoided bigint not null default 0, results bigint not null default 0,
 last_requested_at timestamptz not null default now()
);
create index if not exists company_requests_demand on public.company_requests(requests desc);
alter table public.company_directory enable row level security;
alter table public.company_pattern_evidence enable row level security;
alter table public.company_requests enable row level security;
revoke all on public.company_directory,public.company_pattern_evidence,public.company_requests from anon,authenticated;
grant all on public.company_directory,public.company_pattern_evidence,public.company_requests to service_role;
create or replace function public.record_company_search(p_key text,p_name text,p_domain text,p_api boolean,p_result boolean)
returns void language sql security definer set search_path=public as $$
 insert into public.company_requests(company_key,company_name,requested_domain,requests,api_calls,api_avoided,results)
 values(left(p_key,250),left(p_name,250),left(coalesce(p_domain,''),250),1,p_api::integer,(p_result and not p_api)::integer,p_result::integer)
 on conflict(company_key) do update set requests=company_requests.requests+1,
 api_calls=company_requests.api_calls+excluded.api_calls,api_avoided=company_requests.api_avoided+excluded.api_avoided,
 results=company_requests.results+excluded.results,last_requested_at=now(),
 requested_domain=case when excluded.requested_domain<>'' then excluded.requested_domain else company_requests.requested_domain end;
$$;
revoke all on function public.record_company_search(text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.record_company_search(text,text,text,boolean,boolean) to service_role;
create or replace function public.company_data_stats() returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object('domains',(select count(*) from company_directory),
 'supported',(select count(*) from company_directory where status='approved' and domain_confirmed and expires_at>now()),
 'requests',coalesce(sum(requests),0),'apiCalls',coalesce(sum(api_calls),0),'apiAvoided',coalesce(sum(api_avoided),0)) from company_requests;
$$;
revoke all on function public.company_data_stats() from public,anon,authenticated;
grant execute on function public.company_data_stats() to service_role;
create or replace function public.merge_company_requests(p_domain text,p_name text,p_aliases text[])
returns void language sql security definer set search_path=public as $$
 with moved as (
  delete from public.company_requests where company_key=any(array(select 'name:'||unnest(p_aliases))) returning *
 ), totals as (
  select coalesce(sum(requests),0) requests,coalesce(sum(api_calls),0) api_calls,
  coalesce(sum(api_avoided),0) api_avoided,coalesce(sum(results),0) results,
  coalesce(max(last_requested_at),now()) last_requested_at from moved
 )
 insert into public.company_requests(company_key,company_name,requested_domain,requests,api_calls,api_avoided,results,last_requested_at)
 select 'domain:'||p_domain,p_name,p_domain,requests,api_calls,api_avoided,results,last_requested_at from totals
 on conflict(company_key) do update set requests=company_requests.requests+excluded.requests,
 api_calls=company_requests.api_calls+excluded.api_calls,api_avoided=company_requests.api_avoided+excluded.api_avoided,
 results=company_requests.results+excluded.results,last_requested_at=greatest(company_requests.last_requested_at,excluded.last_requested_at);
$$;
revoke all on function public.merge_company_requests(text,text,text[]) from public,anon,authenticated;
grant execute on function public.merge_company_requests(text,text,text[]) to service_role;
commit;
