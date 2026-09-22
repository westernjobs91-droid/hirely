const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const code=fs.readFileSync('hirely-extension/content.js','utf8'), ctx={};vm.createContext(ctx);vm.runInContext(code.slice(0,code.indexOf('var HirelyScrape')),ctx);const engine=ctx.HirelyEngine;
const intro='<h2>Jane Smith, CHRP</h2><p>· 1st</p><p>Manager at Example</p><div aria-label="Profile photo"><img src="https://media.licdn.com/profile.jpg"></div>';
const jobs='<h2>Experience</h2><div componentkey="entity-collection-item-1"><p>Example</p><ul><li><p>Manager</p><p>Apr 2021 - Present</p></li><li><p>Analyst</p><p>Jun 2019 - Apr 2021</p></li></ul></div>';
const doc=html=>parseHTML(`<html><body><main>${html}<aside><h1>Wrong Person</h1></aside></main></body></html>`).document;
for(const tag of ['section','div']) test(`${tag} SDUI layout extracts identity, current grouped role, headline and photo`,()=>{
 const d=doc(`<${tag} componentkey="profileTopcard">${tag==='div'?`<section>${intro}</section>`:intro}</${tag}><${tag} componentkey="profileExperienceTopLevelSection">${jobs}</${tag}>`),r=engine.scrapeProfile(d);
 assert.equal(r.name,'Jane Smith');assert.equal(r.title,'Manager');assert.equal(r.company,'Example');assert.equal(r.headline,'Manager at Example');assert.equal(r.photo,'https://media.licdn.com/profile.jpg');assert.equal(r.experiences.length,2);
});
test('legacy h1 and experience anchor',()=>{
 const d=doc('<section><h1>Jane Smith</h1><div class="text-body-medium">Manager at Example</div></section><section><div id="experience"></div><ul><li><span class="t-bold">Manager</span><span class="t-14 t-normal">Example</span><span class="t-14 t-normal">Apr 2021 - Present</span></li></ul></section>'),r=engine.scrapeProfile(d);assert.equal(r.name,'Jane Smith');assert.equal(r.company,'Example');assert.equal(r.title,'Manager');
});
test('missing top card does not read About or sidebar',()=>{assert.equal(engine.scrapeProfile(doc('<section><h2>About</h2></section>')).name,'');});
test('later-rendered top card is discovered on retry',()=>{const d=doc('');assert.equal(engine.scrapeProfile(d).name,'');d.querySelector('main').insertAdjacentHTML('afterbegin',`<div componentkey="profileTopcard"><section>${intro}</section></div>`);assert.equal(engine.scrapeProfile(d).name,'Jane Smith');});
test('experience lookup retains exact component boundary',()=>{const d=doc(`<section><div componentkey="profileExperienceTopLevelSection">${jobs}</div><div componentkey="entity-collection-item-other"><p>Director</p><p>Other Company</p><p>Jan 2024 - Present</p></div></section>`);assert.equal(engine.parseExperience(d).length,2);});
test('unknown component names still use bounded contact/photo intro',()=>{const r=engine.safeScrapeProfile(doc(`<article componentkey="new-layout"><div>${intro}<a href="/in/jane/overlay/contact-info/">Contact info</a></div></article>`),'https://www.linkedin.com/in/jane/');assert.equal(r.name,'Jane Smith');assert.equal(r.title,'Manager');assert.equal(r.company,'Example');assert.equal(r.extractionStatus,'ready');});
test('ambiguous fallback is rejected instead of guessing',()=>{const r=engine.safeScrapeProfile(doc(`<div>${intro}<h2>Another person</h2><a href="/in/jane/overlay/contact-info/">Contact info</a></div>`),'https://www.linkedin.com/in/jane/');assert.equal(r.name,'');assert.equal(r.extractionStatus,'unavailable');assert.equal(engine.canSaveProfile(r),false);});
test('DOM exception returns empty recoverable result without profile data',()=>{const r=engine.safeScrapeProfile({querySelector(){throw new Error('changed DOM');}},'https://www.linkedin.com/in/jane/');assert.equal(r.extractionStatus,'error');assert.equal(r.firstName,'');assert.equal(r.company,'');assert.match(r.reviewReason,/manually/);assert.equal(engine.canSaveProfile(r),false);});
test('manual name enables fallback capture but placeholder names do not',()=>{assert.equal(engine.canSaveProfile({firstName:'Jane',extractionStatus:'error'}),true);for(const firstName of ['', ' ', 'Unknown','Profile unavailable'])assert.equal(engine.canSaveProfile({firstName}),false);assert.equal(engine.canSaveProfile({firstName:'Jane',publicProfile:true}),false);});
test('failed extraction clears automatic values, preserves manual drafts and disables save until named',()=>{
 const d=doc('<div id="panel"><div class="hirely-profile-name"></div><div class="hirely-profile-sub"></div><div class="hirely-profile-company"></div><p class="hirely-role-note"></p><div class="hirely-role-options"></div><input id="hfi"><input id="hli"><input id="hti"><input id="hci"><button id="hsb"></button></div>');
 const state={url:'https://www.linkedin.com/in/jane',tab:'save',dirty:new Set(['company']),data:{firstName:'Stale',lastName:'Person',title:'Old job',company:'Manually entered',name:'Stale Person'}};
 const panel=d.querySelector('#panel');
 const c={HirelyEngine:engine,document:d,panel,root:{},fieldMap:{hfi:'firstName',hli:'lastName',hti:'title',hci:'company'},liveProfile:()=>true,canonicalUrl:x=>x,profileIdentity:()=>'',navigationIdentity:null};vm.createContext(c);
 vm.runInContext(code.slice(code.indexOf('  function syncDraft(state)'),code.indexOf('  function experienceScrollTarget()'))+code.slice(code.indexOf('  function renderRoleOptions(state)'),code.indexOf('  function enhanceCapture(')),c);
 c.applyScrapeToForm({...engine.emptyResult(),url:state.url,extractionStatus:'error',reviewReason:'Retry or enter manually'},state);
 assert.equal(state.data.firstName,'');assert.equal(state.data.company,'Manually entered');assert.equal(panel.querySelector('#hsb').disabled,true);assert.match(panel.querySelector('.hirely-role-note').textContent,/Retry/);
 state.data.firstName='Jane';c.renderRoleOptions(state);assert.equal(panel.querySelector('#hsb').disabled,false);
 c.applyScrapeToForm({...engine.emptyResult(),url:state.url,name:'Jane Smith',firstName:'Jane',lastName:'Smith',extractionStatus:'ready'},state);assert.doesNotMatch(panel.querySelector('.hirely-role-note').textContent,/Retry/);
});
