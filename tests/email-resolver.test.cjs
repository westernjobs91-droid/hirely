const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{module,exports:module.exports,require:n=>deps[n]||require(n),URL,URLSearchParams,Response,Request,AbortSignal,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'test',HUNTER_API_KEY:'test'}},fetch:deps.fetch,console,Date});return module.exports}
const patterns=load('lib/email-patterns.ts');
test('supports real company formats without accepting arbitrary templates',()=>{
 assert.equal(patterns.predictEmail('Jane','Smith','https://www.example.com/','{f}{last}'),'jsmith@example.com');
 assert.equal(patterns.predictEmail('José',"O’Neill",'example.com','{first}.{last}'),'jose.oneill@example.com');
 assert.equal(patterns.predictEmail('Jane','','example.com','{first}.{last}'),null);
 assert.equal(patterns.predictEmail('Jane','Smith','bad domain','{first}.{last}'),null);
 assert.equal(patterns.predictEmail('Jane','Smith','example.com','{unknown}'),null);
});
test('freshness and catch-all do not become verification',()=>{
 assert.equal(patterns.isFresh('2099-01-01'),false);
 assert.equal(patterns.isFresh('2020-01-01'),false);
 assert.equal(patterns.providerStatus('accept_all'),'accept_all');
 assert.equal(patterns.providerStatus('deliverable'),'unknown');
});
function harness({user=true,contact=null,cache=null,company=null,reserved=true,providerEmail="jane.smith@example.com",providerFail=false,providerThrows=false}={}){
 const writes=[],calls=[];let fetched=0,credits=0;
 const db={from(table){let action='read';const chain=new Proxy({}, {get(_,key){
  if(key==='update'||key==='upsert'||key==='insert')return data=>{action=key;writes.push({table,data});return chain};
  const result=()=>({data:table==='contacts'?(action==='read'?contact:{id:contact?.id}):table==='email_resolutions'?cache:table==='company_cache'?company:table==='hirely_limits'?{email_limit:reserved?10:0}:null,error:null});
  if(key==='then')return(resolve,reject)=>Promise.resolve(result()).then(resolve,reject);
  if(key==='single'||key==='maybeSingle')return async()=>result();
  return(...args)=>{calls.push([table,key,...args]);return chain}
 }});return chain},async rpc(){credits++;return {data:reserved,error:null}}};
 const resolver=load('lib/resolve-email.ts',{'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},'./server-auth':{authenticate:async()=>user?{db,user:{id:'u1'}}:null},'./email-patterns':patterns,'./company-data':{approvedCompanyPattern:async()=>company?.[0]?.data?{...company[0].data,evidence:'Test reviewed pattern'}:null,recordCompanySearch:async()=>{}},fetch:async()=>{fetched++;if(providerThrows)throw new Error('timeout');if(providerFail)return Response.json({}, {status:502});return Response.json({data:{email:providerEmail,status:'accept_all',score:93}})}}).resolveEmail;
 const run=body=>resolver(new Request('http://localhost/api/enrich',{method:'POST',body:JSON.stringify(body)}));
 return{run,writes,calls,get fetched(){return fetched},get credits(){return credits}};
}
const person={action:'find',allowPaid:true,firstName:'Jane',lastName:'Smith',company:'Example'};
test('anonymous callers cannot use providers',async()=>{const h=harness({user:false});assert.equal((await h.run(person)).status,401);assert.equal(h.fetched,0)});
test('another users contact cannot be enriched',async()=>{const h=harness();assert.equal((await h.run({...person,contactId:5})).status,404);assert.equal(h.fetched,0);assert.ok(h.calls.some(c=>c[1]==='eq'&&c[2]==='user_id'&&c[3]==='u1'))});
test('company pattern consumes one Hirely credit without a provider call',async()=>{const h=harness({company:[{data:{domain:'example.com',pattern:'{first}.{last}'}}]});const d=await(await h.run(person)).json();assert.equal(d.email,'jane.smith@example.com');assert.equal(d.emailStatus,'predicted');assert.equal(d.confidence,null);assert.equal(h.fetched,0);assert.equal(h.credits,1)});
test('database miss calls provider once, charges once and saves result',async()=>{const h=harness();const d=await(await h.run(person)).json();assert.equal(d.email,'jane.smith@example.com');assert.equal(h.fetched,1);assert.equal(h.credits,1);assert.ok(h.writes.some(w=>w.table==='email_resolutions'))});
test('paid lookup needs explicit opt-in and quota',async()=>{const h=harness({reserved:false});assert.equal((await h.run({...person,action:'find',allowPaid:false})).status,400);assert.equal((await h.run({...person,action:'find',allowPaid:true})).status,402);assert.equal(h.fetched,0)});
test('verification keeps accept-all separate from valid',async()=>{const h=harness({contact:{id:5,first_name:'Jane',last_name:'Smith',company:'Example',email:'jane.smith@example.com',email_status:'predicted'}});const d=await(await h.run({contactId:5,action:'verify',allowPaid:true})).json();assert.equal(d.emailStatus,'accept_all');assert.equal(h.fetched,1);assert.equal(h.writes.find(w=>w.table==='contacts').data.email_status,'accept_all')});
test('fresh cache avoids repeat paid calls',async()=>{const h=harness({cache:{email:'jane.smith@example.com',status:'valid',source:'hunter_verifier',created_at:new Date().toISOString(),checked_at:new Date().toISOString()}});const d=await(await h.run({...person,action:'find',allowPaid:true})).json();assert.equal(d.emailStatus,'valid');assert.equal(h.fetched,0);assert.equal(h.credits,1)});

test('cached results cannot bypass exhausted credits',async()=>{const h=harness({reserved:false,cache:{email:'jane@example.com',status:'valid',created_at:new Date().toISOString(),checked_at:new Date().toISOString()}});assert.equal((await h.run(person)).status,402);assert.equal(h.fetched,0);assert.equal(h.writes.length,0)});
test('legacy prediction action cannot bypass credit consent',async()=>{const h=harness();assert.equal((await h.run({...person,action:'predict',allowPaid:false})).status,400);assert.equal(h.credits,0);assert.equal(h.fetched,0)});
test('fresh unverified provider result is reused without claiming verification',async()=>{const h=harness({cache:{email:'jane@example.com',status:'unknown',source:'hunter_finder',created_at:new Date().toISOString()}});const d=await(await h.run(person)).json();assert.equal(d.emailStatus,'unknown');assert.equal(h.credits,1);assert.equal(h.fetched,0)});

test('no email from database or provider costs no credit',async()=>{const h=harness({providerEmail:null});const d=await(await h.run(person)).json();assert.equal(d.creditsUsed,0);assert.equal(h.credits,0);assert.equal(h.fetched,1);assert.equal(h.writes.length,0)});
test('provider failure costs no credit',async()=>{const h=harness({providerFail:true});assert.equal((await h.run(person)).status,502);assert.equal(h.credits,0)});
test('provider timeout costs no credit',async()=>{const h=harness({providerThrows:true});assert.equal((await h.run(person)).status,502);assert.equal(h.credits,0)});
