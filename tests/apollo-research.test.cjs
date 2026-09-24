const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
function loadApollo(fetchImpl,env={}){const m={exports:{}};const patterns=loadPatterns();vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/apollo-research.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:n=>n==='./email-patterns'?patterns:require(n),URL,URLSearchParams,AbortSignal,fetch:fetchImpl,process:{env},console});return m.exports}
function loadPatterns(){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/email-patterns.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require,URL,console});return m.exports}
const input={firstName:'Jane',lastName:'Smith',company:'Example',domain:'example.com',linkedinUrl:'https://www.linkedin.com/in/jane-smith'}
test('Apollo research is disabled until both a key and a positive ceiling exist',()=>{
 assert.equal(loadApollo(()=>{},{}).apolloResearchConfigured(),false)
 assert.equal(loadApollo(()=>{},{APOLLO_API_KEY:'key',APOLLO_MONTHLY_CREDIT_LIMIT:'0'}).apolloResearchConfigured(),false)
 assert.equal(loadApollo(()=>{},{APOLLO_API_KEY:'key',APOLLO_MONTHLY_CREDIT_LIMIT:'75'}).apolloResearchConfigured(),true)
})
test('accepts only a high-confidence verified work email on the requested employer domain',async()=>{
 let request
 const apollo=loadApollo(async(url,init)=>{request={url:String(url),init};return {ok:true,json:async()=>({match_confidence:'high',credits_consumed:1,person:{email:'Jane.Smith@example.com',email_status:'verified',organization:{primary_domain:'example.com'}}})}},{APOLLO_API_KEY:'secret',APOLLO_MONTHLY_CREDIT_LIMIT:'75'})
 const result=await apollo.researchWorkEmailWithApollo(input)
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{kind:'found',email:'jane.smith@example.com',billable:true})
 const url=new URL(request.url);assert.equal(url.searchParams.get('domain'),'example.com');assert.equal(url.searchParams.get('reveal_personal_emails'),'false');assert.equal(url.searchParams.get('reveal_phone_number'),'false');assert.equal(request.init.headers['x-api-key'],'secret')
})
test('rejects low-confidence, unverified and wrong-domain matches while tracking possible provider spend',async()=>{
 for(const body of [
  {match_confidence:'low',person:{email:'jane.smith@example.com',email_status:'verified',organization:{primary_domain:'example.com'}}},
  {match_confidence:'high',person:{email:'jane.smith@example.com',email_status:'extrapolated',organization:{primary_domain:'example.com'}}},
  {match_confidence:'high',person:{email:'jane.smith@other.com',email_status:'verified',organization:{primary_domain:'other.com'}}},
 ]){const apollo=loadApollo(async()=>({ok:true,json:async()=>body}),{APOLLO_API_KEY:'secret',APOLLO_MONTHLY_CREDIT_LIMIT:'75'});const result=await apollo.researchWorkEmailWithApollo(input);assert.equal(result.kind,'none');assert.equal(result.billable,true)}
})
test('a true no-match is not counted as consumed and provider errors fail closed',async()=>{
 const apollo=loadApollo(async()=>({ok:true,json:async()=>({match_confidence:'none',person:null,credits_consumed:0})}),{APOLLO_API_KEY:'secret',APOLLO_MONTHLY_CREDIT_LIMIT:'75'})
 assert.deepEqual(JSON.parse(JSON.stringify(await apollo.researchWorkEmailWithApollo(input))),{kind:'none',billable:false,reason:'no_match'})
 const broken=loadApollo(async()=>({ok:false}),{APOLLO_API_KEY:'secret',APOLLO_MONTHLY_CREDIT_LIMIT:'75'})
 await assert.rejects(broken.researchWorkEmailWithApollo(input),/Apollo request failed/)
})
test('customer resolver never imports or calls Apollo',()=>{
 const source=fs.readFileSync('lib/resolve-email.ts','utf8')
 assert.doesNotMatch(source,/apollo/i)
})
