const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const id='12345678-1234-4234-8234-123456789012';
const body={id,title:'Food intake',notes:'Need ten workers.',meeting_type:'client_intake',contactId:7};
function harness({authenticated=true,old=null,contact=true,quota=true,key=true,failAI=false}={}){
 let row=old?{...old}:null,ai=0,credits=0;const filters=[];
 const db={from(table){let action='read',value,conditions=[];const chain=new Proxy({}, {get(_,k){
  if(['update','insert'].includes(k))return v=>{action=k;value=v;return chain};
  if(['eq','neq'].includes(k))return (col,val)=>{conditions.push([k,col,val]);filters.push([table,k,col,val]);return chain};
  const execute=()=>{if(table==='contacts')return {data:contact?{id:7}:null,error:null};
   const matches=row&&conditions.every(([op,col,val])=>op==='eq'?row[col]===val:row[col]!==val);
   if(action==='insert'){if(row)return {data:null,error:{message:'duplicate'}};row={...value,created_at:new Date().toISOString()};}
   if(action==='update'&&matches)row={...row,...value};
   return {data:action==='insert'||matches?row:null,error:null};};
  if(k==='then')return (r,j)=>Promise.resolve(execute()).then(r,j);
  if(k==='single'||k==='maybeSingle')return async()=>execute();return()=>chain;
 }});return chain},async rpc(){credits++;return {data:quota,error:null}}};
 class AI{constructor(){this.messages={create:async()=>{ai++;if(failAI)throw Error('Provider failure');return {content:[{type:'text',text:'Summary: Ten workers required.'}]}}}}}
 const module={exports:{}};const js=ts.transpileModule(fs.readFileSync('app/api/meet/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(js,{module,exports:module.exports,require:n=>({'next/server':{NextResponse:{json:(v,i)=>Response.json(v,i)}},'@anthropic-ai/sdk':AI,'@/lib/server-auth':{authenticate:async()=>authenticated?{db,user:{id:'u1'}}:null}}[n]),process:{env:{ANTHROPIC_API_KEY:key?'fake':undefined}},Date,console});
 return {run:async(b=body)=>module.exports.POST(new Request('http://localhost/api/meet',{method:'POST',body:JSON.stringify(b)})),get row(){return row},get ai(){return ai},get credits(){return credits},filters};
}
test('Meet rejects anonymous callers before saving or generating',async()=>{const h=harness({authenticated:false});assert.equal((await h.run()).status,401);assert.equal(h.row,null);assert.equal(h.ai,0)});
test('Meet rejects invalid notes and contacts outside the account',async()=>{const h=harness({contact:false});assert.equal((await h.run({...body,notes:''})).status,400);assert.equal((await h.run()).status,404);assert.equal(h.row,null);assert.ok(h.filters.some(f=>f[0]==='contacts'&&f[2]==='user_id'&&f[3]==='u1'))});
test('saving notes is free and persists the linked contact',async()=>{const h=harness();assert.equal((await h.run()).status,200);assert.equal(h.row.raw_notes,body.notes);assert.equal(h.row.contact_id,7);assert.equal(h.ai,0);assert.equal(h.credits,0)});
test('summary reserves a request and saves output',async()=>{const h=harness();const r=await h.run({...body,action:'summarize'});assert.equal(r.status,200);assert.equal(h.row.status,'complete');assert.match(h.row.summary,/Ten workers/);assert.equal(h.ai,1);assert.equal(h.credits,1)});
test('missing AI setup preserves notes without spending',async()=>{const h=harness({key:false});assert.equal((await h.run({...body,action:'summarize'})).status,503);assert.equal(h.row.raw_notes,body.notes);assert.equal(h.ai,0);assert.equal(h.credits,0)});
test('exhausted quota preserves notes and skips AI',async()=>{const h=harness({quota:false});assert.equal((await h.run({...body,action:'summarize'})).status,402);assert.equal(h.row.status,'draft');assert.equal(h.row.raw_notes,body.notes);assert.equal(h.ai,0)});
test('provider failures preserve notes without retry',async()=>{const h=harness({failAI:true});assert.equal((await h.run({...body,action:'summarize'})).status,502);assert.equal(h.row.status,'failed');assert.equal(h.row.raw_notes,body.notes);assert.equal(h.ai,1)});
const saved={id,user_id:'u1',title:'Old title',raw_notes:body.notes,meeting_type:body.meeting_type,contact_id:null,summary:'Existing summary',status:'complete',updated_at:new Date().toISOString()};
test('cached summary saves changed title and contact without another AI call',async()=>{const h=harness({old:saved});const d=await(await h.run({...body,action:'summarize'})).json();assert.equal(d.meeting.title,body.title);assert.equal(d.meeting.contact_id,7);assert.equal(d.summary,'Existing summary');assert.equal(h.ai,0);assert.equal(h.credits,0)});
test('editing notes clears obsolete summary',async()=>{const h=harness({old:saved});assert.equal((await h.run({...body,notes:'A different requirement'})).status,200);assert.equal(h.row.summary,null)});
test('active summary blocks duplicate requests',async()=>{const h=harness({old:{...saved,status:'processing'}});assert.equal((await h.run({...body,action:'summarize'})).status,409);assert.equal(h.ai,0)});
test('stale processing state can recover',async()=>{const h=harness({old:{...saved,summary:null,status:'processing',updated_at:'2020-01-01T00:00:00Z'}});assert.equal((await h.run({...body,action:'summarize'})).status,200);assert.equal(h.row.status,'complete');assert.equal(h.ai,1)});
