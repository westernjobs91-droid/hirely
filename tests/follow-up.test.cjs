const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const moduleValue={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/follow-up.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:moduleValue,exports:moduleValue.exports,Date});const {normalizeFollowUp:n,addDays,validDay,matchesPipelineFilter:f,localDay,pipelineMovePatch:m}=moduleValue.exports;
const today='2026-09-14',c={id:'1',column:'today',status:'due-today',statusLabel:'Due in 2 weeks',sentDate:'',createdAt:'2026-09-14T12:00:00'};
test('legacy two-week contact is recovered into Upcoming',()=>{const r=n(c,today);assert.equal(r.column,'upcoming');assert.equal(r.sentDate,'2026-09-28');assert.equal(r.status,'upcoming')});
test('explicit future date overrides old Today column',()=>{const r=n({...c,sentDate:'2026-09-28'},today);assert.equal(r.column,'upcoming')});
test('scheduled date wins over contact age',()=>{const r=n({...c,createdAt:'2020-01-01',sentDate:'2026-09-28'},today);assert.equal(r.column,'upcoming')});
test('today is due today and yesterday is overdue',()=>{assert.equal(n({...c,sentDate:today},today).status,'due-today');assert.equal(n({...c,sentDate:'2026-09-13'},today).status,'overdue')});
test('completed overdue contacts remain Done and leave due counters',()=>{const r=n({...c,column:'done',status:'overdue',sentDate:'2026-09-01'},today);assert.equal(r.column,'done');assert.equal(r.status,'no-response');assert.equal(f(r,'Overdue',today),false)});
test('completed replies retain reply status',()=>{assert.equal(n({...c,column:'done',status:'replied'},today).status,'replied')});
test('unscheduled old contacts do not auto-move to Today',()=>{const r=n({...c,column:'upcoming',statusLabel:'New',createdAt:'2020-01-01'},today);assert.equal(r.column,'upcoming');assert.equal(r.statusLabel,'No follow-up scheduled')});
test('manual Today contacts without dates remain in Today',()=>{assert.equal(n({...c,statusLabel:'Follow Up'},today).column,'today')});
test('invalid and relative date strings are not calendar dates',()=>{for(const value of ['2026-02-30','2 weeks ago','','2026-13-01'])assert.equal(validDay(value),false)});
test('calendar arithmetic handles month and daylight-saving boundaries',()=>{assert.equal(addDays('2026-09-28',7),'2026-10-05');assert.equal(addDays('2026-03-07',2),'2026-03-09')});
test('filters use the Monday to Sunday due-date week',()=>{assert.equal(f({...c,sentDate:'2026-09-20'},'This week',today),true);assert.equal(f({...c,sentDate:'2026-09-21'},'This week',today),false);assert.equal(f({...c,sentDate:'2026-09-28'},'This week',today),false)});
test('normalization is stable and updates on date rollover',()=>{const r=n({...c,sentDate:'2026-09-15'},today);assert.equal(JSON.stringify(n(r,today)),JSON.stringify(r));assert.equal(n(r,'2026-09-15').column,'today');assert.equal(n(r,'2026-09-16').status,'overdue')});
test('contacts can move between every pipeline stage with stable dates',()=>{
 const done={...c,column:'done',status:'no-response',statusLabel:'Done',sentDate:'2026-09-01'}
 const todayPatch=m(done,'today',today);assert.equal(todayPatch.column,'today');assert.equal(todayPatch.sentDate,today);assert.equal(todayPatch.status,'due-today')
 const upcomingPatch=m(done,'upcoming',today);assert.equal(upcomingPatch.column,'upcoming');assert.equal(upcomingPatch.sentDate,'2026-09-21');assert.equal(upcomingPatch.status,'upcoming')
 const future={...c,column:'today',sentDate:'2026-09-28'};assert.equal(m(future,'upcoming',today).sentDate,'2026-09-28')
 const donePatch=m(c,'done',today);assert.equal(donePatch.column,'done');assert.equal(donePatch.statusLabel,'Done')
})
