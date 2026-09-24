const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
function load(fetchImpl,env={}){const module={exports:{}};const patternsModule={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/email-patterns.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:patternsModule,exports:patternsModule.exports,require,URL,Date});vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/anymail-email.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>n==='./email-patterns'?patternsModule.exports:require(n),URL,AbortSignal,fetch:fetchImpl,process:{env},JSON,Number,Math,Error});return module.exports}
const input={firstName:'Jane',lastName:'Smith',company:'Example',domain:'example.com'}

test('Anymail Finder is enabled only with a key and positive cap',()=>{
 assert.equal(load(()=>{},{}).anymailEmailSearchConfigured(),false)
 assert.equal(load(()=>{},{ANYMAIL_FINDER_API_KEY:'secret',ANYMAIL_FINDER_CREDIT_LIMIT:'0'}).anymailEmailSearchConfigured(),false)
 assert.equal(load(()=>{},{ANYMAIL_FINDER_API_KEY:'secret',ANYMAIL_FINDER_CREDIT_LIMIT:'100'}).anymailEmailSearchConfigured(),true)
})

test('Anymail Finder sends server-side credentials and accepts only valid same-domain email',async()=>{
 let request
 const anymail=load(async(url,init)=>{request={url,init};return {ok:true,json:async()=>({credits_charged:1,email:'jane.smith@example.com',valid_email:'Jane.Smith@Example.com',email_status:'valid'})}},{ANYMAIL_FINDER_API_KEY:'secret',ANYMAIL_FINDER_CREDIT_LIMIT:'100'})
 assert.deepEqual(JSON.parse(JSON.stringify(await anymail.findVerifiedEmailWithAnymail(input))),{kind:'found',email:'jane.smith@example.com',domain:'example.com',creditsCharged:1})
 assert.equal(request.url,'https://api.anymailfinder.com/v5.1/find-email/person')
 assert.equal(request.init.headers.Authorization,'secret')
 assert.deepEqual(JSON.parse(request.init.body),{domain:'example.com',first_name:'Jane',last_name:'Smith'})
})

test('Anymail Finder rejects risky, malformed, and wrong-domain results',async()=>{
 for(const body of [
  {credits_charged:0,email_status:'risky',email:'jane@example.com',valid_email:null},
  {credits_charged:0,email_status:'valid',valid_email:'not-an-email'},
  {credits_charged:1,email_status:'valid',valid_email:'jane@other.com'},
 ]){
  const anymail=load(async()=>({ok:true,json:async()=>body}),{ANYMAIL_FINDER_API_KEY:'secret',ANYMAIL_FINDER_CREDIT_LIMIT:'100'})
  assert.equal((await anymail.findVerifiedEmailWithAnymail(input)).kind,'none')
 }
})
