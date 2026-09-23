begin;

create table if not exists public.provider_usage_monthly (
 provider text not null check(provider in ('hunter','exa')),
 month date not null,
 reserved_credits integer not null default 0 check(reserved_credits>=0),
 updated_at timestamptz not null default now(),
 primary key(provider,month)
);
alter table public.provider_usage_monthly enable row level security;
revoke all on public.provider_usage_monthly from public,anon,authenticated;
grant all on public.provider_usage_monthly to service_role;

create or replace function public.reserve_provider_credit(p_provider text,p_monthly_limit integer)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare period date:=date_trunc('month',now() at time zone 'UTC')::date; changed integer;
begin
 if p_provider not in ('hunter','exa') or p_monthly_limit<=0 then return false; end if;
 insert into public.provider_usage_monthly(provider,month,reserved_credits)
 values(p_provider,period,1)
 on conflict(provider,month) do update
 set reserved_credits=provider_usage_monthly.reserved_credits+1,updated_at=now()
 where provider_usage_monthly.reserved_credits<p_monthly_limit;
 get diagnostics changed=row_count;
 return changed>0;
end $$;

create or replace function public.release_provider_credit(p_provider text)
returns void language sql security definer set search_path=pg_catalog,public as $$
 update public.provider_usage_monthly
 set reserved_credits=greatest(0,reserved_credits-1),updated_at=now()
 where provider=p_provider and month=date_trunc('month',now() at time zone 'UTC')::date;
$$;

revoke all on function public.reserve_provider_credit(text,integer) from public,anon,authenticated;
revoke all on function public.release_provider_credit(text) from public,anon,authenticated;
grant execute on function public.reserve_provider_credit(text,integer) to service_role;
grant execute on function public.release_provider_credit(text) to service_role;

commit;
