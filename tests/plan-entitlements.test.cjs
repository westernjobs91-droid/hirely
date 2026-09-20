const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {PGlite}=require('@electric-sql/pglite')
const owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222'
test('plan migration enforces quotas, direct contact capacity, privileged billing and owner overrides',async()=>{
 const db=new PGlite()
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${other}');
   grant usage on schema public,auth to anon,authenticated,service_role;
   create table contacts(id bigint generated always as identity primary key,user_id uuid references auth.users(id),first_name text,notes text,deleted_at timestamptz);
   alter table contacts enable row level security;create policy owned on contacts for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
   grant select,insert,update on contacts to authenticated;grant usage,select on all sequences in schema public to authenticated;
   create table hirely_usage(user_id uuid,month date,feature text constraint hirely_usage_feature_check check(feature in ('email','meet')),used integer default 0,primary key(user_id,month,feature));
   alter table hirely_usage enable row level security;revoke all on hirely_usage from public,anon,authenticated;
  `)
  const sql=fs.readFileSync('supabase/migrations/202609200001_plan_entitlements.sql','utf8')
  await db.exec(sql);await db.exec(sql)
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${owner}'`)
  const ent=async()=> (await db.query('select get_hirely_entitlements() as e')).rows[0].e
  assert.equal((await ent()).plan,'free');assert.equal((await ent()).email_limit,5);assert.equal((await ent()).meet_limit,0)
  assert.equal((await db.query("select reserve_hirely_credit('meet') as ok")).rows[0].ok,false)
  assert.equal((await db.query("select reserve_hirely_credit('draft') as ok")).rows[0].ok,false)
  for(let i=0;i<5;i++)assert.equal((await db.query("select reserve_hirely_credit('email') as ok")).rows[0].ok,true)
  assert.equal((await db.query("select reserve_hirely_credit('email') as ok")).rows[0].ok,false)
  await assert.rejects(db.query(`insert into hirely_billing_accounts(user_id,plan,status,source) values('${owner}','pro','active','manual')`),/permission denied/)
  await assert.rejects(db.query(`select hirely_entitlements_for('${other}')`),/permission denied/)
  await assert.rejects(db.query(`select hirely_claim_billing_lock('${owner}','${other}')`),/permission denied/)
  await db.exec(`insert into contacts(user_id,first_name) select '${owner}','Contact '||n from generate_series(1,50)n`)
  await assert.rejects(db.exec(`insert into contacts(user_id,first_name) values('${owner}','over limit')`),/Contact limit/)
  await db.exec("update contacts set deleted_at=now() where id=1")
  await db.exec(`insert into contacts(user_id,first_name) values('${owner}','replacement')`)
  await assert.rejects(db.exec('update contacts set deleted_at=null where id=1'),/Contact limit/)
  await db.exec("update contacts set notes='Existing contacts remain editable' where id=2")
  await db.exec(`reset role;insert into hirely_billing_accounts(user_id,plan,status,source,valid_until) values('${owner}','solo','active','stripe',now()+interval '1 day');set role authenticated`)
  assert.equal((await ent()).contact_limit,1000);assert.equal((await ent()).email_limit,50);assert.equal((await ent()).meet_limit,25);assert.equal((await ent()).draft_limit,50)
  await db.exec('update contacts set deleted_at=null where id=1')
  assert.equal((await db.query("select reserve_hirely_credit('meet') as ok")).rows[0].ok,true)
  await db.exec(`reset role;update hirely_billing_accounts set plan='pro',source='manual',valid_until=null where user_id='${owner}';insert into hirely_plan_overrides(user_id,email_limit,reason) values('${owner}',500,'Owner grant');set role authenticated`)
  assert.equal((await ent()).email_limit,500);assert.equal((await ent()).contact_limit,null);assert.equal((await ent()).meet_limit,75);assert.equal((await ent()).email_used,5)
  await db.exec(`set request.jwt.claim.sub='${other}'`);assert.equal((await ent()).email_limit,5);assert.equal((await ent()).email_used,0)
  await db.exec(`reset role;update hirely_billing_accounts set source='stripe',valid_until=now()-interval '1 second' where user_id='${owner}';set role authenticated;set request.jwt.claim.sub='${owner}'`)
  assert.equal((await ent()).plan,'free')
  // Downgrade preserves over-limit rows and their edits but prevents new rows.
  assert.equal((await db.query('select count(*)::int n from contacts')).rows[0].n,51)
  await db.exec("update contacts set notes='Safe after downgrade' where id=2")
  await assert.rejects(db.exec(`insert into contacts(user_id,first_name) values('${owner}','after downgrade')`),/Contact limit/)
  await db.exec(`reset role;insert into hirely_usage values('${other}','2020-01-01','email',999);set role authenticated;set request.jwt.claim.sub='${other}'`)
  assert.equal((await ent()).email_used,0)
  await db.exec(`reset role;set role service_role`)
  assert.equal((await db.query(`select hirely_claim_billing_lock('${owner}','${owner}') as ok`)).rows[0].ok,true)
  assert.equal((await db.query(`select hirely_claim_billing_lock('${owner}','${other}') as ok`)).rows[0].ok,false)
  assert.equal((await db.query(`select hirely_sync_billing('${owner}','${other}','cus_x','sub_x','pro','active',now()+interval '1 day') as ok`)).rows[0].ok,false)
  assert.equal((await db.query(`select hirely_sync_billing('${owner}','${owner}','cus_x','sub_x','pro','active',now()+interval '1 day') as ok`)).rows[0].ok,true)
  await db.exec(`reset role;set role anon`)
  await assert.rejects(db.query('select get_hirely_entitlements()'),/permission denied/)
 }finally{await db.close()}
})
