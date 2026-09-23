const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
function load(file,deps={}){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:n=>deps[n]||require(n),URL,AbortSignal,fetch,process:{env:{}},console});return m.exports}
const patterns=load('lib/email-patterns.ts'),exa=load('lib/exa-email.ts',{'./email-patterns':patterns})
const person={firstName:'Jane',lastName:'Smith',domain:'example.com',company:'Example'}
test('accepts a supported address published beside the named employee on the company domain',()=>{
 const found=exa.extractPublishedEmail([{url:'https://www.example.com/team',highlights:['Director Jane Smith — jane.smith@example.com']}],person)
 assert.equal(found.email,'jane.smith@example.com');assert.equal(found.pattern,'{first}.{last}')
})
test('rejects off-domain, unnamed, guessed, insecure and ambiguous addresses',()=>{
 assert.equal(exa.extractPublishedEmail([{url:'https://directory.test/jane',text:'Jane Smith jane.smith@example.com'}],person),null)
 assert.equal(exa.extractPublishedEmail([{url:'https://example.com/team',text:'Contact jane.smith@example.com'}],person),null)
 assert.equal(exa.extractPublishedEmail([{url:'http://example.com/team',text:'Jane Smith jane.smith@example.com'}],person),null)
 assert.equal(exa.extractPublishedEmail([{url:'https://example.com/team',text:'Jane Smith jobs@example.com'}],person),null)
 assert.equal(exa.extractPublishedEmail([{url:'https://example.com/team',text:'Jane Smith jane.smith@example.com and Jane Smith jsmith@example.com'}],person),null)
})
test('accepts an official company subdomain and ignores a different requested domain',()=>{
 assert.equal(exa.extractPublishedEmail([{url:'https://people.example.com/jane',text:'Jane Smith jane.smith@example.com'}],person).email,'jane.smith@example.com')
 assert.equal(exa.extractPublishedEmail([{url:'https://example.net/jane',text:'Jane Smith jane.smith@example.net'}],person),null)
})
test('requires the requested company when discovering a domain from a company name',()=>{
 assert.equal(exa.extractPublishedEmail([{url:'https://example.com/jane',text:'Example leadership: Jane Smith jane.smith@example.com'}],{...person,domain:''}).domain,'example.com')
 assert.equal(exa.extractPublishedEmail([{url:'https://other.com/jane',text:'Other leadership: Jane Smith jane.smith@other.com'}],{...person,domain:''}),null)
})
