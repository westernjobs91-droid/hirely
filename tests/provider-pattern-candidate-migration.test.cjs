const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {PGlite}=require('@electric-sql/pglite')

test('provider pattern candidates are stored for review but remain service-role only',async()=>{
 const db=new PGlite()
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;')
  await db.exec(fs.readFileSync('supabase/migrations/20260916_company_data.sql','utf8'))
  const migration=fs.readFileSync('supabase/migrations/202609230003_provider_pattern_candidates.sql','utf8')
  await db.exec(migration);await db.exec(migration)
  await db.exec("set role service_role;insert into company_directory(name,domain,website) values('Example','example.com','https://example.com')")
  await db.exec("insert into company_pattern_evidence(company_id,first_name,last_name,email,source_url,source_type,observed_at) select id,'Jane','Smith','jane.smith@example.com','https://hunter.io','provider_candidate',now() from company_directory where domain='example.com'")
  assert.equal((await db.query("select source_type,reuse_confirmed from company_pattern_evidence where email='jane.smith@example.com'")).rows[0].source_type,'provider_candidate')
  await assert.rejects(db.exec("insert into company_pattern_evidence(company_id,first_name,last_name,email,source_url,source_type,observed_at) select id,'John','Smith','john.smith@example.com','https://example.com','prediction',now() from company_directory where domain='example.com'"),/check constraint/)
  await db.exec('reset role;set role authenticated')
  await assert.rejects(db.query('select * from company_pattern_evidence'),/permission denied/)
 }finally{await db.close()}
})
