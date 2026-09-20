begin;

-- Billing authority is separate from editable profile information.
create table if not exists public.hirely_billing_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 plan text not null default 'free' check(plan in ('free','solo','pro')),
 status text not null default 'inactive',
 source text not null default 'stripe' check(source in ('stripe','manual')),
 customer_id text unique,
 subscription_id text unique,
 valid_until timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.hirely_plan_overrides (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email_limit integer check(email_limit>=0),
 meet_limit integer check(meet_limit>=0),
 draft_limit integer check(draft_limit>=0),
 reason text not null
);
-- A bounded lease serializes Stripe reads and writes across webhook workers.
create table if not exists public.hirely_billing_locks (
 user_id uuid primary key references auth.users(id) on delete cascade,
 token uuid not null,
 expires_at timestamptz not null
);
alter table public.hirely_billing_accounts enable row level security;
alter table public.hirely_plan_overrides enable row level security;
alter table public.hirely_billing_locks enable row level security;
revoke all on public.hirely_billing_accounts,public.hirely_plan_overrides,public.hirely_billing_locks from public,anon,authenticated;
grant all on public.hirely_billing_accounts,public.hirely_plan_overrides,public.hirely_billing_locks to service_role;

create or replace function public.hirely_entitlements_for(uid uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare a public.hirely_billing_accounts; o public.hirely_plan_overrides;
 p text:='free'; e integer:=5; m integer:=0; d integer:=0; c integer:=50;
 period date:=date_trunc('month',now() at time zone 'UTC')::date;
begin
 select * into a from public.hirely_billing_accounts where user_id=uid;
 if a.status in ('active','trialing') and (a.source='manual' or a.valid_until>now()) then p:=a.plan; end if;
 if p='solo' then e:=50; m:=25; d:=50; c:=1000; end if;
 if p='pro' then e:=200; m:=75; d:=200; c:=null; end if;
 select * into o from public.hirely_plan_overrides where user_id=uid;
 return jsonb_build_object('plan',p,'source',coalesce(a.source,'stripe'),'status',coalesce(a.status,'inactive'),
  'email_limit',coalesce(o.email_limit,e),'meet_limit',coalesce(o.meet_limit,m),'draft_limit',coalesce(o.draft_limit,d),'contact_limit',c,
  'email_used',coalesce((select used from public.hirely_usage where user_id=uid and month=period and feature='email'),0),
  'meet_used',coalesce((select used from public.hirely_usage where user_id=uid and month=period and feature='meet'),0),
  'draft_used',coalesce((select used from public.hirely_usage where user_id=uid and month=period and feature='draft'),0),
  'outlook',p in ('solo','pro'),'csv',p='pro','advanced_analytics',p='pro',
  'billing_managed',a.customer_id is not null and a.source='stripe');
end $$;
revoke all on function public.hirely_entitlements_for(uuid) from public,anon,authenticated;
grant execute on function public.hirely_entitlements_for(uuid) to service_role;

create or replace function public.get_hirely_entitlements() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return public.hirely_entitlements_for(auth.uid());
end $$;
revoke all on function public.get_hirely_entitlements() from public,anon;
grant execute on function public.get_hirely_entitlements() to authenticated;

alter table public.hirely_usage drop constraint if exists hirely_usage_feature_check;
alter table public.hirely_usage add constraint hirely_usage_feature_check check(feature in ('email','meet','draft'));
create or replace function public.reserve_hirely_credit(feature text) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); quota integer; period date:=date_trunc('month',now() at time zone 'UTC')::date; changed integer;
begin
 if uid is null or feature not in ('email','meet','draft') then return false; end if;
 quota:=(public.hirely_entitlements_for(uid)->>(case feature when 'email' then 'email_limit' when 'meet' then 'meet_limit' else 'draft_limit' end))::integer;
 if quota is null or quota<=0 then return false; end if;
 insert into public.hirely_usage(user_id,month,feature,used) values(uid,period,feature,1)
 on conflict on constraint hirely_usage_pkey do update set used=hirely_usage.used+1 where hirely_usage.used<quota;
 get diagnostics changed=row_count;
 return changed>0;
end $$;
revoke all on function public.reserve_hirely_credit(text) from public,anon;
grant execute on function public.reserve_hirely_credit(text) to authenticated;

create or replace function public.hirely_contact_capacity() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare capacity integer;
begin
 if tg_op='UPDATE' then
  if new.user_id is distinct from old.user_id then raise exception 'Contact ownership cannot be changed' using errcode='42501'; end if;
  if old.deleted_at is null or new.deleted_at is not null then return new; end if;
 elsif new.deleted_at is not null then return new;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('hirely-contacts:'||new.user_id::text,0));
 capacity:=(public.hirely_entitlements_for(new.user_id)->>'contact_limit')::integer;
 if capacity is not null and (select count(*) from public.contacts where user_id=new.user_id and deleted_at is null)>=capacity then
  raise exception 'Contact limit reached. Move a contact to Trash or upgrade your plan.' using errcode='P0001';
 end if;
 return new;
end $$;
revoke all on function public.hirely_contact_capacity() from public,anon,authenticated;
drop trigger if exists hirely_contact_capacity on public.contacts;
create trigger hirely_contact_capacity before insert or update on public.contacts for each row execute function public.hirely_contact_capacity();

create or replace function public.hirely_claim_billing_lock(uid uuid, lease uuid) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare changed integer;
begin
 insert into public.hirely_billing_locks values(uid,lease,now()+interval '90 seconds')
 on conflict(user_id) do update set token=excluded.token,expires_at=excluded.expires_at
 where hirely_billing_locks.expires_at<now();
 get diagnostics changed=row_count; return changed>0;
end $$;
revoke all on function public.hirely_claim_billing_lock(uuid,uuid) from public,anon,authenticated;
grant execute on function public.hirely_claim_billing_lock(uuid,uuid) to service_role;

-- Commit only while the same worker still owns the unexpired lease.
create or replace function public.hirely_sync_billing(uid uuid,lease uuid,customer text,subscription text,paid_plan text,paid_status text,expiry timestamptz) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 perform 1 from public.hirely_billing_locks where user_id=uid and token=lease and expires_at>now() for update;
 if not found then return false; end if;
 if paid_plan not in ('free','solo','pro') then raise exception 'Unknown plan'; end if;
 insert into public.hirely_billing_accounts(user_id,plan,status,source,customer_id,subscription_id,valid_until)
 values(uid,paid_plan,paid_status,'stripe',customer,subscription,expiry)
 on conflict(user_id) do update set plan=excluded.plan,status=excluded.status,
 customer_id=excluded.customer_id,subscription_id=excluded.subscription_id,valid_until=excluded.valid_until,updated_at=now()
 where hirely_billing_accounts.source='stripe' and (hirely_billing_accounts.customer_id is null or hirely_billing_accounts.customer_id=excluded.customer_id);
 if not found then return false; end if;
 return true;
end $$;
revoke all on function public.hirely_sync_billing(uuid,uuid,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.hirely_sync_billing(uuid,uuid,text,text,text,text,timestamptz) to service_role;
commit;
