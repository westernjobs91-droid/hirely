const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript')
const React=require('react'),{createRoot}=require('react-dom/client'),{parseHTML}=require('linkedom')
function load(file,mocks={}){
  const module={exports:{}}
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
  vm.runInNewContext(code,{module,exports:module.exports,require:n=>mocks[n]||require(n),console,Date})
  return module.exports
}
test('Trash survives remount and restores only after a confirmed database write',async()=>{
  const {document,window}=parseHTML('<html><body><div id="root"></div></body></html>')
  global.window=window;global.document=document;global.IS_REACT_ACT_ENVIRONMENT=true
  const original={id:1,user_id:'owner',first_name:'Jane',last_name:'Smith',company:'Example',deleted_at:'2026-09-19T12:00:00Z',notes:'Keep notes'}
  let row={...original},failWrite=true,restored=0
  const db={from(){let value=null,filters=[];const q={
    update(v){value=v;return q},select(){return q},eq(k,v){filters.push([k,v]);return q},not(){return q},is(){return q},order(){return q},range(){return q},
    then(resolve,reject){return Promise.resolve({data:row.deleted_at?[row]:[],count:row.deleted_at?1:0,error:null}).then(resolve,reject)},
    async maybeSingle(){assert.ok(filters.some(([k,v])=>k==='user_id'&&v==='owner'));if(failWrite)return {data:null,error:{message:'offline'}};row={...row,...value};return {data:{id:row.id},error:null}}
  };return q}}
  const helper=load('lib/contact-trash.ts')
  const View=load('components/TrashView.tsx',{'@/lib/supabase':{supabase:db},'@/lib/contact-trash':helper}).default
  const mount=async()=>{const root=createRoot(document.querySelector('#root'));await React.act(async()=>root.render(React.createElement(View,{userId:'owner',onRestored:()=>{restored++}})));return root}
  let root=await mount()
  assert.match(document.body.textContent,/Jane/)
  await React.act(async()=>root.unmount())
  root=await mount()
  const clickRestore=()=>document.querySelector('button[aria-label="Restore Jane Smith"]').dispatchEvent(new window.Event('click',{bubbles:true}))
  await React.act(async()=>clickRestore())
  assert.equal(restored,0);assert.equal(row.deleted_at,original.deleted_at);assert.match(document.body.textContent,/Could not change/)
  failWrite=false
  await React.act(async()=>clickRestore())
  assert.equal(restored,1);assert.equal(row.deleted_at,null);assert.equal(row.notes,'Keep notes');assert.match(document.body.textContent,/No contacts in Trash/)
  await React.act(async()=>root.unmount())
})
