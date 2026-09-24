const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>deps[n]||require(n),Date,URL,console,process:{env:{}},AbortSignal,fetch});return module.exports}
const patterns=load('lib/email-patterns.ts'),review=load('lib/company-pattern-review.ts',{'./email-patterns':patterns});
const company={domain:'example.com',website:'https://www.example.com',domain_confirmed:true,pattern:'{first}.{last}'};
const evidence=[['Jane','Smith'],['David','Lee']].map(([first_name,last_name])=>({first_name,last_name,email:(first_name+'.'+last_name+'@example.com').toLowerCase(),source_url:'https://example.com/team',source_type:'official_website',observed_at:new Date().toISOString(),reuse_confirmed:true}));
test('two independent recent examples allow review approval',()=>assert.equal(review.approvalError(company,evidence),null));
test('unconfirmed domain and unsupported template cannot be approved',()=>{assert.ok(review.approvalError({...company,domain_confirmed:false},evidence));assert.ok(review.approvalError({...company,pattern:'{unknown}'},evidence))});
test('single or duplicated employee cannot establish a pattern',()=>{assert.ok(review.approvalError(company,[evidence[0]]));assert.ok(review.approvalError(company,[evidence[0],evidence[0]]))});
test('conflicting evidence blocks approval until explicitly excluded',()=>{const conflict={...evidence[0],email:'jsmith@example.com'};assert.ok(review.approvalError(company,[...evidence,conflict]));assert.equal(review.approvalError(company,[...evidence,{...conflict,excluded:true}]),null)});
test('old, future, generated and unauthorized licensed evidence cannot qualify',()=>{for(const patch of [{observed_at:'2020-01-01'},{observed_at:'2099-01-01'},{source_type:'prediction'},{source_type:'licensed_data',reuse_confirmed:false}])assert.ok(review.approvalError(company,evidence.map(e=>({...e,...patch}))))});
test('two matching provider results can confirm a pattern',()=>assert.equal(review.approvalError(company,evidence.map(e=>({...e,source_type:'provider_candidate',source_url:'https://app.apollo.io',reuse_confirmed:false}))),null));
test('off-domain official sources do not qualify',()=>assert.ok(review.approvalError(company,evidence.map(e=>({...e,source_url:'https://other.example/team'})))));
test('unsafe or missing official websites are rejected',()=>{assert.equal(review.publicSource('javascript:alert(1)'),false);assert.ok(review.approvalError({...company,website:''},evidence))});
test('a company may use separate official website and employee email domains',()=>{
 const separate={...company,website:'https://example-company.com'}
 const official=evidence.map(e=>({...e,source_url:'https://example-company.com/team'}))
 assert.equal(review.approvalError(separate,official),null)
})
test('company aliases normalize visually identical Unicode hyphens',()=>{
 assert.equal(review.companyKey('Flex‑N‑Gate'),review.companyKey('Flex-N-Gate'))
})
function adminHarness(user){let serviceCalls=0;const db={from(){throw new Error('Unexpected storage access')}};const route=load('app/api/admin/company-data/route.ts',{'next/server':{NextResponse:{json:(b,i)=>Response.json(b,i)}},'@/lib/server-auth':{authenticate:async()=>user?{user,db}:null},'@/lib/company-data':{companyService:()=>{serviceCalls++;return db}},'@/lib/company-pattern-review':review,'@/lib/email-patterns':patterns,'@/lib/apollo-research':{apolloResearchConfigured:()=>false,researchWorkEmailWithApollo:async()=>null},'@/lib/provider-budget':{reserveProviderCredit:async()=>'unavailable',releaseProviderCredit:async()=>{}}});return{route,get serviceCalls(){return serviceCalls}}}
test('anonymous callers cannot access company administration',async()=>{const h=adminHarness(null);assert.equal((await h.route.GET(new Request('http://test/api'))).status,401);assert.equal(h.serviceCalls,0)});
test('ordinary customers cannot use admin service-role access',async()=>{const h=adminHarness({id:'customer',email:'customer@example.com'});assert.equal((await h.route.POST(new Request('http://test/api',{method:'POST',body:'{"action":"seed"}'}))).status,403);assert.equal(h.serviceCalls,0)});
test('admin validates a company before attempting a write',async()=>{const h=adminHarness({id:'owner',email:'growwithjey@gmail.com'});assert.equal((await h.route.POST(new Request('http://test/api',{method:'POST',body:JSON.stringify({action:'save',name:'Example',domain:'example.com',website:'javascript:bad'})}))).status,400)});
function registryHarness(rows,proofs,{readError=false,legacy=[]}={}){
 const queries=[];const db={from(table){const result={data:table==='company_directory'?rows:table==='domain_patterns'?legacy:proofs,error:readError?{}:null};let chain;chain=new Proxy({}, {get(_,key){if(key==='then')return(resolve,reject)=>Promise.resolve(result).then(resolve,reject);return(...args)=>{queries.push([table,key,...args]);return chain}}});return chain}};
 const source=fs.readFileSync('lib/company-data.ts','utf8');const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>n==='@supabase/supabase-js'?{createClient:()=>db}:n==='./email-patterns'?patterns:review,Date,console,AbortSignal,fetch,process:{env:{SUPABASE_SERVICE_ROLE_KEY:'test',NEXT_PUBLIC_SUPABASE_URL:'https://test.invalid'}}});return{...module.exports,queries};
}
test('lookup reads only approved unexpired confirmed domains and rechecks evidence',async()=>{const h=registryHarness([{...company,id:'one'}],evidence);const result=await h.approvedCompanyPattern('Example','');assert.equal(result.pattern,'{first}.{last}');assert.ok(h.queries.some(q=>q[1]==='eq'&&q[2]==='status'&&q[3]==='approved'));assert.ok(h.queries.some(q=>q[1]==='gt'&&q[2]==='expires_at'))});
test('ambiguous company aliases do not generate an address',async()=>{const h=registryHarness([{...company,id:'one'},{...company,id:'two'}],evidence);assert.equal(await h.approvedCompanyPattern('Example',''),null)});
test('storage failure or newly conflicting evidence disables prediction',async()=>{assert.equal(await registryHarness([company],evidence,{readError:true}).approvedCompanyPattern('Example',''),null);assert.equal(await registryHarness([company],[...evidence,{...evidence[0],email:'wrong@example.com'}]).approvedCompanyPattern('Example',''),null)});
test('trusted sent-mail domain patterns are used for an exact domain without a provider call',async()=>{
 const h=registryHarness([],[],{legacy:[{domain:'example.com',pattern:'flast',sample_count:3,source:'sent_recipients_import',confidence:'high'}]})
 const result=await h.approvedCompanyPattern('Example','example.com')
 assert.equal(result.pattern,'{f}{last}')
 assert.match(result.evidence,/3 recipients/)
 assert.ok(h.queries.some(q=>q[0]==='domain_patterns'&&q[1]==='eq'&&q[2]==='domain'&&q[3]==='example.com'))
})
test('legacy patterns require exact domain, trusted source, high confidence and a supported unambiguous format',async()=>{
 assert.equal(await registryHarness([],[],{legacy:[{domain:'example.com',pattern:'first.last,flast',sample_count:9,source:'sent_recipients_import',confidence:'high'}]}).approvedCompanyPattern('Example','example.com'),null)
 assert.equal(await registryHarness([],[],{legacy:[{domain:'example.com',pattern:'first.last',sample_count:1,source:'sent_recipients_import',confidence:'high'}]}).approvedCompanyPattern('Example',''),null)
})
