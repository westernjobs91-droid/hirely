const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {PGlite}=require('@electric-sql/pglite')

test('provider budget migration enforces a service-role-only monthly ceiling and release',async()=>{
 const db=new PGlite()
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;')
  const base=fs.readFileSync('supabase/migrations/202609230001_provider_budget.sql','utf8')
  const cycle=fs.readFileSync('supabase/migrations/202609230002_provider_budget_cycle.sql','utf8')
  await db.exec(base);await db.exec(base);await db.exec(cycle);await db.exec(cycle)
  await db.exec('set role authenticated')
  await assert.rejects(db.query("select reserve_provider_credit('hunter',2,2)"),/permission denied/)
  await assert.rejects(db.query('select * from provider_usage_monthly'),/permission denied/)
  await db.exec('reset role;set role service_role')
  assert.equal((await db.query("select reserve_provider_credit('hunter',2,2) ok")).rows[0].ok,true)
  assert.equal((await db.query("select reserve_provider_credit('hunter',2,2) ok")).rows[0].ok,true)
  assert.equal((await db.query("select reserve_provider_credit('hunter',2,2) ok")).rows[0].ok,false)
  await db.query("select release_provider_credit('hunter',2)")
  assert.equal((await db.query("select reserve_provider_credit('hunter',2,2) ok")).rows[0].ok,true)
  assert.equal((await db.query("select reserve_provider_credit('unknown',2,2) ok")).rows[0].ok,false)
  assert.equal((await db.query("select extract(day from provider_billing_period(2))::integer as cycle_day")).rows[0].cycle_day,2)
 }finally{await db.close()}
})
