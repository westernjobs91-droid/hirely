const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
const html=fs.readFileSync('public/outlook/taskpane.html','utf8')
const code=html.slice(html.indexOf('    async function findExisting('),html.indexOf('    // ── EMAIL DATA'))
for(const mode of ['trash','error'])test(`Outlook ${mode} lookup does not insert a duplicate`,async()=>{
 const requests=[]
 const ctx={HIRELY_CONFIG:{SUPABASE_URL:'https://db.example',SUPABASE_ANON_KEY:'public'},getSession:()=>({access_token:'token',user:{id:'owner'}}),refreshIfNeeded:async s=>s,Date,
 fetch:async(url,options={})=>{requests.push({url,options});return Response.json(mode==='trash'?[{id:1,deleted_at:'2026-09-19T00:00:00Z'}]:{}, {status:mode==='trash'?200:503})}}
 vm.createContext(ctx);vm.runInContext(code,ctx)
 await assert.rejects(vm.runInContext("saveContact({email:'jane@example.com',firstName:'Jane'})",ctx),mode==='trash'?/Trash/:/retry/)
 assert.equal(requests.some(r=>r.options.method==='POST'),false)
})
