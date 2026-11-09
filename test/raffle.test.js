import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import {initial,change,publicState,csv,shuffle} from '../lib/core.js';
import {init,store} from '../lib/store.js';
import {createApp} from '../lib/http.js';
const items=n=>Array.from({length:n},(_,i)=>({number:i+1,label:'Radiador '+(i+1)}));
const setup=(n=40,p=10,repeats=false)=>{const s=initial();change(s,'items',{items:items(n),repeats});for(let i=0;i<p;i++)change(s,'register',{first:'Persona',last:'Apellido'+String.fromCharCode(65+i)});change(s,'close');return s;};
test('40 artículos, 10 personas: 10 ganadores únicos y 30 sin adjudicar',()=>{const s=setup();change(s,'start',{},1000);assert.equal(new Set(s.draws.filter(d=>d.person).map(d=>d.person.id)).size,10);assert.equal(s.draws.filter(d=>!d.person).length,30);assert.equal(new Set(s.draws.map(d=>d.item.number)).size,40);});
test('más participantes: no se repiten ganadores',()=>{const s=setup(5,12);change(s,'start');assert.equal(s.draws.length,5);assert.equal(new Set(s.draws.map(d=>d.person.id)).size,5);});
test('repetición explícita asigna todos los artículos',()=>{const s=setup(40,1,true);change(s,'start');assert.ok(s.draws.every(d=>d.person));});
test('no revela resultados futuros y termina según reloj servidor',()=>{const s=setup(2,2);change(s,'start',{},1000);assert.equal(publicState(s,5999).results.length,0);assert.equal(publicState(s,6000).results.length,1);assert.equal(publicState(s,11000).phase,'finished');assert.ok(!JSON.stringify(publicState(s,1000)).includes('Apellido'));});
test('segundo inicio no modifica reparto ni fecha',()=>{const s=setup();change(s,'start',{},1000);const saved=JSON.stringify(s);change(s,'start',{},9000);assert.equal(JSON.stringify(s),saved);});
test('normalización impide duplicados y valida nombres',()=>{const s=initial();change(s,'register',{first:'José',last:'García López'});assert.throws(()=>change(s,'register',{first:' JOSE ',last:'GARCIA   LOPEZ'}));assert.throws(()=>change(s,'register',{first:'<script>',last:'García'}));});
test('validación de inventario y estados',()=>{assert.throws(()=>change(initial(),'start'));assert.throws(()=>change(initial(),'items',{items:[...items(1),...items(1)],repeats:false}));const s=setup();assert.throws(()=>change(s,'register',{first:'Ana',last:'López'}));assert.throws(()=>change(s,'items',{items:items(1),repeats:false}));assert.throws(()=>change(setup(1,0),'start'));});
test('shuffle conserva elementos, admite todas las permutaciones de 3',()=>{const set=new Set();for(let a=0;a<3;a++)for(let b=0;b<2;b++){let i=0;set.add(shuffle([1,2,3],()=>[a,b][i++]).join(''));}assert.equal(set.size,6);});
test('CSV escapa comillas e impide fórmulas',()=>{const result=csv({results:[{item:{number:1,label:'=HYPERLINK("bad")'},winner:'Ana'}]});assert.ok(result.includes("'=HYPERLINK"));assert.ok(result.includes('""bad""'));});
test('configuración incompleta bloquea API sin exponer información',async()=>{await request(createApp({},{})).get('/api/state').expect(503);});
test('transacciones: altas simultáneas únicas, rollback y dos inicios consistentes',async()=>{
 const db=new PGlite();await init(db);const repo=store(db);
 try{
  const results=await Promise.allSettled(Array.from({length:8},()=>repo.act('register',{first:'Ana',last:'García'})));
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  await repo.act('items',{items:items(2),repeats:false});
  await assert.rejects(repo.act('items',{items:items(1),repeats:'invalid'}));
  assert.equal((await repo.read()).items.length,2);
  await repo.act('close');
  const [a,b]=await Promise.all([repo.act('start',{}),repo.act('start',{})]);assert.deepEqual(a,b);
 }finally{await db.close();}
});
test('API con PostgreSQL embebido: autenticación, persistencia, límites, cierre y exportación',async()=>{
 const db=new PGlite();await init(db);const repo=store(db);
 const config={origin:'http://localhost:3000',password:'test-password-very-long',secret:'a'.repeat(48)};
 const app=createApp(repo,config),agent=request.agent(app);
 const post=(url,body)=>agent.post(url).set('Origin',config.origin).send(body);
 try{
  await agent.get('/api/admin').expect(401);
  await agent.post('/api/login').send({password:config.password}).expect(403);
  await post('/api/admin/start',{}).expect(401);
  await post('/api/login',{password:'wrong'}).expect(401);
  await post('/api/login',{password:config.password}).expect(200);
  await post('/api/admin/items',{items:items(40),repeats:false}).expect(200);
  await post('/api/register',{first:'Ana',last:'López'}).expect(201);
  await post('/api/register',{first:'ANA',last:'LOPEZ'}).expect(409);
  assert.equal((await store(db).read()).people.length,1);
  await post('/api/admin/close',{}).expect(200);
  await post('/api/register',{first:'Luis',last:'Pérez'}).expect(409);
  await post('/api/admin/start',{}).expect(200);
  const before=JSON.stringify(await repo.read());await post('/api/admin/start',{}).expect(200);assert.equal(JSON.stringify(await repo.read()),before);
  const state=(await agent.get('/api/state').expect(200)).body;assert.equal(state.results.length,0);assert.equal(state.people,undefined);
  const exported=await agent.get('/api/results.csv').expect(200);assert.ok(!exported.text.includes('Ana'));
  await post('/api/logout',{}).expect(200);await agent.get('/api/admin').expect(401);
  for(let i=0;i<3;i++)await repo.limit('test',3);await assert.rejects(repo.limit('test',3),e=>e.status===429);
 }finally{await db.close();}
});
