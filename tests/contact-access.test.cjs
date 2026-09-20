const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { PGlite } = require('@electric-sql/pglite')

test('database migration enforces account isolation and reversible deletion, even with broad old policies', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      create table contacts(id bigint generated always as identity primary key, user_id uuid not null,
        first_name text, notes text, activity text[], ai_drafts jsonb);
      create table followups(id bigint primary key, contact_id bigint references contacts(id) on delete cascade, draft text);
      create table hirely_meetings(id bigint primary key, contact_id bigint references contacts(id) on delete set null, summary text);
      create table company_cache(id bigint primary key, data jsonb);
      grant all on contacts,company_cache to anon,authenticated,service_role;
      grant usage,select on all sequences in schema public to authenticated;
      alter table contacts enable row level security;
      create policy old_broad on contacts for all using(true) with check(true);
      alter table company_cache enable row level security;
      create policy old_cache_broad on company_cache for all using(true) with check(true);
      insert into contacts(user_id,first_name,notes,activity,ai_drafts) values
        ('11111111-1111-4111-8111-111111111111','Jane','Keep my notes',array['called'], '{"body":"draft"}'),
        ('22222222-2222-4222-8222-222222222222','John','Other account',array['emailed'], '{}');
      insert into followups values(1,1,'Keep follow-up');
      insert into hirely_meetings values(1,1,'Keep meeting');
      insert into company_cache values(1,'{}');
    `)
    const migration = fs.readFileSync('supabase/migrations/20260919_contact_trash_and_access.sql','utf8')
    await db.exec(migration)
    await db.exec(migration) // repeatable deployment
    await db.exec(`set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'`)
    assert.equal((await db.query('select count(*)::int as n from contacts')).rows[0].n,1)
    assert.equal((await db.query("update contacts set notes='bad' where id=2 returning id")).rows.length,0)
    await assert.rejects(db.query("insert into contacts(user_id,first_name) values('22222222-2222-4222-8222-222222222222','bad')"), /row-level security/i)
    await assert.rejects(db.query("update contacts set user_id='22222222-2222-4222-8222-222222222222' where id=1"), /ownership/i)
    await assert.rejects(db.query('delete from contacts where id=1'), /permission denied/i)
    await assert.rejects(db.query('truncate contacts cascade'), /permission denied/i)
    await assert.rejects(db.query('select * from company_cache'), /permission denied/i)
    await assert.rejects(db.query("insert into company_cache values(2,'{}')"), /permission denied/i)
    const before=(await db.query('select * from contacts where id=1')).rows[0]
    await db.exec('update contacts set deleted_at=now() where id=1 and deleted_at is null')
    assert.equal((await db.query('select * from contacts where deleted_at is null')).rows.length,0)
    assert.equal((await db.query('select * from contacts where deleted_at is not null')).rows.length,1)
    await assert.rejects(db.query("update contacts set notes='stale browser write' where id=1"), /Restore/i)
    await assert.rejects(db.query("update contacts set notes='sneaky',deleted_at=null where id=1"), /Restore/i)
    await db.exec(`set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'`)
    assert.equal((await db.query('update contacts set deleted_at=null where id=1 returning id')).rows.length,0)
    await db.exec(`set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'`)
    await db.exec('update contacts set deleted_at=null where id=1 and deleted_at is not null')
    assert.deepEqual((await db.query('select * from contacts where id=1')).rows[0],before)
    await db.exec('reset role')
    assert.equal((await db.query('select contact_id from followups where id=1')).rows[0].contact_id,1)
    assert.equal((await db.query('select contact_id from hirely_meetings where id=1')).rows[0].contact_id,1)
    await db.exec('set role anon')
    await assert.rejects(db.query('select * from contacts'), /permission denied/i)
    await assert.rejects(db.query('select * from company_cache'), /permission denied/i)
    await db.exec('reset role; set role service_role')
    assert.equal((await db.query('select * from company_cache')).rows.length,1)
  } finally { await db.close() }
})
