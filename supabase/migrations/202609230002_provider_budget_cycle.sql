begin;

create or replace function public.provider_billing_period(p_cycle_day integer)
returns date
language sql
stable
security definer
set search_path=pg_catalog,public
as $$
  with settings as (
    select
      (now() at time zone 'UTC')::date as today,
      least(28,greatest(1,coalesce(p_cycle_day,1))) as cycle_day
  ), current_cycle as (
    select
      today,
      make_date(extract(year from today)::integer,extract(month from today)::integer,cycle_day) as cycle_start
    from settings
  )
  select case
    when today>=cycle_start then cycle_start
    else (cycle_start-interval '1 month')::date
  end
  from current_cycle;
$$;

create or replace function public.reserve_provider_credit(
  p_provider text,
  p_monthly_limit integer,
  p_cycle_day integer
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  period date:=public.provider_billing_period(p_cycle_day);
  changed integer;
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

create or replace function public.release_provider_credit(p_provider text,p_cycle_day integer)
returns void
language sql
security definer
set search_path=pg_catalog,public
as $$
  update public.provider_usage_monthly
  set reserved_credits=greatest(0,reserved_credits-1),updated_at=now()
  where provider=p_provider and month=public.provider_billing_period(p_cycle_day);
$$;

revoke all on function public.provider_billing_period(integer) from public,anon,authenticated;
revoke all on function public.reserve_provider_credit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.release_provider_credit(text,integer) from public,anon,authenticated;
grant execute on function public.provider_billing_period(integer) to service_role;
grant execute on function public.reserve_provider_credit(text,integer,integer) to service_role;
grant execute on function public.release_provider_credit(text,integer) to service_role;

drop function if exists public.reserve_provider_credit(text,integer);
drop function if exists public.release_provider_credit(text);

commit;
