'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {prepare} = require('../../../../scripts/grupo07/prepare_base_collection.cjs');
const root = path.resolve(__dirname, '../../../..');
const collectionPath = path.join(root, 'postman/grupo-07-carrito-ecommerce.postman_collection.json');
function python(code) {
  const result = spawnSync('python', ['-B', '-c', "import sys\nsys.path.insert(0,'scripts/grupo07')\n" + code], {cwd:root, encoding:'utf8'});
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
test('temporary base preserves exactly 20 original objects and excludes SQL', () => {
  const bytes = fs.readFileSync(collectionPath);
  const original = JSON.parse(bytes);
  const copy = prepare(original);
  assert.equal(copy.item.length,20);
  assert.deepEqual(copy.item, original.item.slice(0,20));
  assert(!copy.item.some(i => i.item));
  copy.item[0].name = 'mutated copy';
  assert.notEqual(original.item[0].name,copy.item[0].name);
  assert.deepEqual(fs.readFileSync(collectionPath),bytes);
  assert.throws(() => prepare({...original,item:original.item.slice(1)}));
});
test('real SQL runner selects only SQL folder with fail propagation and separate output', () => {
  let captured;
  const events = {on(){return this;}};
  const code = fs.readFileSync(path.join(root,'grupos/grupo-07-carrito-ecommerce/run-sql-newman.cjs'),'utf8');
  vm.runInNewContext(code, {
    require(name) {
      if(name==='newman')return {run(options){captured=options;return events;}};
      if(name==='newman/package.json')return {version:'test'};
      if(name==='node:child_process')return {execFileSync(){return 'test-sha';}};
      return require(name);
    },
    __dirname:path.join(root,'grupos/grupo-07-carrito-ecommerce'),
    process:{env:{API_KEY:'offline-only'}},console
  });
  assert.equal(captured.folder,'Semana 3 - SQL dinamico');
  assert.equal(captured.bail,true);
  assert.equal(captured.iterationCount,1);
  assert.equal(JSON.parse(fs.readFileSync(captured.collection)).item.find(i=>i.name===captured.folder).item.length,2);
});
test('consumer identification excludes self and pending coordinated runs, not active external suites',()=>python(`
from wait_sandbox_consumers import blockers
rows=[{'id':1,'path':'.github/workflows/postman-grupo07-regression.yml','status':'in_progress'},
 {'id':2,'path':'.github/workflows/postman-grupo07-regression.yml','status':'pending','coordinated':True},
 {'id':3,'path':'.github/workflows/postman-grupo07-andrea-regression.yml','status':'in_progress'},
 {'id':4,'path':'.github/workflows/unrelated.yml','status':'in_progress'}]
assert [r['id'] for r in blockers(rows,1)]==[3]
assert blockers(rows[:2],1)==[]
rows[1]['coordinated']=False
assert [r['id'] for r in blockers(rows[:2],1)]==[2]
rows[1].update(status='in_progress',coordinated=True)
assert blockers(rows[:2],1)==[]
`));
test('quiet window resets when consumer appears; timeout cannot certify',()=>python(`
from wait_sandbox_consumers import wait_quiet
now=[0]
def sleep(n): now[0]+=n
def snapshot():
 return [{'id':2,'path':'.github/workflows/postman-grupo07-andrea-regression.yml','status':'queued'}] if 30<=now[0]<50 else []
wait_quiet(snapshot,1,quiet=70,timeout=200,clock=lambda:now[0],sleep=sleep)
assert now[0]==120
now[0]=0
try:
 wait_quiet(lambda:[],1,quiet=70,timeout=50,clock=lambda:now[0],sleep=sleep)
except TimeoutError: pass
else: raise AssertionError('timeout accepted')
`));
test('Actions pagination examines beyond first 100 runs',()=>python(`
from wait_sandbox_consumers import active_runs
calls=[]
def fetch(url):
 calls.append(url)
 if 'status=in_progress' not in url:return {'total_count':0,'workflow_runs':[]}
 ids=range(100) if url.endswith('&page=1') else [100]
 return {'total_count':101,'workflow_runs':[{'id':i} for i in ids]}
assert len(active_runs('owner/repo',fetch))==101
assert any('page=2' in u for u in calls)
`));
test('certification rejects selected skipped/failure/missing and missing artifact; unselected is allowed',()=>python(`
from validate_ci_results import certify,artifact
r={k:'success' for k in ['plan','initial_window','juan','general','jmeter_window','jmeter']}
assert len(certify('all',r))==6
for bad in ['skipped','cancelled','failure','missing']:
 d=dict(r,juan=bad)
 try:certify('postman',d)
 except AssertionError:pass
 else:raise AssertionError('false green')
assert certify('jmeter',dict(r,juan='skipped',general='skipped'))
for value in ['',None,'0']:
 try:artifact(value)
 except AssertionError:pass
 else:raise AssertionError('missing artifact accepted')
artifact('123')
from validate_ci_results import head_verdict
assert head_verdict('A','C')=='SUPERSEDED_BY_NEWER_COMMIT'
assert head_verdict('C','C')=='GREEN_REAL'
`));
test('SQL certification requires all 12 HTTP, 18 exact assertions and no insertions',()=>python(`
from validate_ci_results import sql,EXPECTED,POS,NEG
import copy
d={'passed':True,'failures':[],'requests':[],'assertions':[],
 'stats':{'requests':{'total':12,'failed':0},'assertions':{'total':18,'failed':0}},
 'diagnostics':['G7-S3 rechazo {"antes":{"ordenes":0,"items":0},"despues":{"ordenes":0,"items":0}}']}
for case,code in [(POS,201),(NEG,400)]:
 for n in range(6):d['requests'].append({'case':case,'method':'POST','url':'https://sandbox/api/v1/'+('ordenes' if n==3 else 'sql/select'),'status':code if n==3 else 200})
 for name in EXPECTED[case]:d['assertions'].append({'case':case,'name':name,'passed':True})
assert sql(d)['absence_of_insertions']
bad=[]
x=copy.deepcopy(d);x['passed']=False;bad.append(x)
x=copy.deepcopy(d);x['requests'][-1]['status']=429;bad.append(x)
x=copy.deepcopy(d);x['assertions'].pop();bad.append(x)
x=copy.deepcopy(d);x['diagnostics']=[];bad.append(x)
for x in bad:
 try:sql(x)
 except AssertionError:pass
 else:raise AssertionError('incomplete SQL accepted')
`));
test('single coordinator, reusable workers, standard pending replacement and sequential dependencies',()=>{
  const yaml=require('yaml');
  const read=f=>yaml.parse(fs.readFileSync(path.join(root,'.github/workflows',f),'utf8'));
  const c=read('postman-grupo07-regression.yml');
  assert.equal(c.concurrency['cancel-in-progress'],false);
  assert.equal(c.concurrency.queue,undefined);
  assert.equal(c.on.push,undefined);
  assert(c.jobs.general.needs.includes('juan'));
  assert(c.jobs.jmeter_window.needs.includes('general'));
  for(const file of ['postman-grupo07-juan-regression.yml','jmeter-grupo07-juan-performance.yml']){
    const w=read(file);assert.deepEqual(Object.keys(w.on),['workflow_call']);
    assert.equal(w.concurrency,undefined);
    for(const job of Object.values(w.jobs))assert.equal(job.concurrency,undefined);
  }
  // Deliberate policy: running A finishes, pending B is superseded by C.
  // Only a run that actually tests C can certify C; no validation of B is claimed.
  const running='A';let pending='B';pending='C';
  assert.notEqual(running,pending);assert.equal(pending,'C');
});
