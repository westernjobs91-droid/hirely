begin;
alter table public.contacts add column if not exists email_status text not null default 'unverified';
alter table public.contacts add column if not exists email_source text;
alter table public.contacts add column if not exists email_checked_at timestamptz;
alter table public.contacts add column if not exists email_evidence text;
alter table public.contacts add column if not exists email_confidence numeric;

create table if not exists public.email_resolutions (
 user_id uuid not null references auth.users(id) on delete cascade, identity_key text not null,
 email text not null, status text not null, source text not null, checked_at timestamptz,
 evidence text, provider_score numeric, created_at timestamptz not null default now(),
 primary key(user_id,identity_key)
);
alter table public.email_resolutions enable row level security;
drop policy if exists email_resolutions_owner on public.email_resolutions;
create policy email_resolutions_owner on public.email_resolutions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.email_resolutions to authenticated;

create table if not exists public.hirely_limits (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email_limit integer not null default 10 check(email_limit>=0),
 meet_limit integer not null default 10 check(meet_limit>=0)
);
alter table public.hirely_limits enable row level security;
drop policy if exists hirely_limits_owner_read on public.hirely_limits;
create policy hirely_limits_owner_read on public.hirely_limits for select to authenticated using(user_id=auth.uid());
grant select on public.hirely_limits to authenticated;
revoke insert,update,delete on public.hirely_limits from authenticated,anon;

create table if not exists public.hirely_usage (
 user_id uuid not null references auth.users(id) on delete cascade, month date not null,
 feature text not null check(feature in ('email','meet')), used integer not null default 0,
 primary key(user_id,month,feature)
);
alter table public.hirely_usage enable row level security;
drop policy if exists hirely_usage_owner_read on public.hirely_usage;
create policy hirely_usage_owner_read on public.hirely_usage for select to authenticated using(user_id=auth.uid());
grant select on public.hirely_usage to authenticated;
revoke insert,update,delete on public.hirely_usage from authenticated,anon;

create or replace function public.reserve_hirely_credit(feature text) returns boolean
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); quota integer; period date:=date_trunc('month',now() at time zone 'UTC')::date; changed integer;
begin
 if uid is null or feature not in ('email','meet') then return false; end if;
 select case when feature='meet' then meet_limit else email_limit end into quota from public.hirely_limits where user_id=uid;
 quota:=coalesce(quota,10);
 if quota<=0 then return false; end if;
 insert into public.hirely_usage(user_id,month,feature,used) values(uid,period,feature,1)
 on conflict on constraint hirely_usage_pkey do update set used=hirely_usage.used+1 where hirely_usage.used<quota;
 get diagnostics changed=row_count;
 return changed>0;
end $$;
revoke all on function public.reserve_hirely_credit(text) from public;
grant execute on function public.reserve_hirely_credit(text) to authenticated;

create table if not exists public.hirely_meetings (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 contact_id bigint references public.contacts(id) on delete set null, title text not null,
 meeting_type text not null check(meeting_type in ('client_intake','candidate_interview','internal_debrief')),
 raw_notes text not null, summary text, status text not null default 'draft',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.hirely_meetings enable row level security;
drop policy if exists hirely_meetings_owner on public.hirely_meetings;
create policy hirely_meetings_owner on public.hirely_meetings for all to authenticated using(user_id=auth.uid())
 with check(user_id=auth.uid() and (contact_id is null or exists(select 1 from public.contacts c where c.id=contact_id and c.user_id=auth.uid())));
grant select,insert,update,delete on public.hirely_meetings to authenticated;
commit;
