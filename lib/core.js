import { randomInt, randomUUID } from 'node:crypto';
export const initial = () => ({phase:'open', repeats:false, items:[], people:[], draws:[], startedAt:null});
export function fail(message, status=400) { throw Object.assign(new Error(message), {status}); }
export function name(value) {
  if(typeof value !== 'string') fail('Introduce tu nombre y apellidos.');
  const clean=value.normalize('NFKC').trim().replace(/\s+/g,' ');
  if(clean.length<2 || clean.length>80 || !/^[\p{L}\p{M} '\-]+$/u.test(clean)) fail('Usa entre 2 y 80 caracteres: letras, espacios, guiones o apóstrofos.');
  return clean;
}
export const key = value => value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[ '\-]/g,'');
function addPerson(s, full) {
  const display=name(full), normalized=key(display);
  if(s.people.some(p=>p.key===normalized)) fail('Una de las personas ya está inscrita: '+display,409);
  if(s.people.length>=2000) fail('Se ha alcanzado el límite de inscripciones.',409);
  s.people.push({id:randomUUID(),name:display,key:normalized});
}
export function shuffle(values, rand=randomInt) {
  const result=[...values];
  for(let i=result.length-1;i>0;i--){ const j=rand(i+1); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function change(s, action, data={}, now=Date.now()) {
  if(action==='register') {
    if(s.phase!=='open') fail('Las inscripciones están cerradas.',409);
    addPerson(s,name(data.first)+' '+name(data.last));
  } else if(action==='addPeople') {
    if(s.phase!=='open') fail('Las inscripciones están cerradas.',409);
    if(!Array.isArray(data.names)||data.names.length<1||data.names.length>500) fail('Pega entre 1 y 500 nombres.');
    const batch=new Set();
    for(const value of data.names) { const normalized=key(name(value)); if(batch.has(normalized)) fail('El listado contiene un nombre repetido.',409); batch.add(normalized); }
    for(const value of data.names) addPerson(s,value);
  } else if(action==='items') {
    if(s.phase!=='open') fail('Solo puedes modificar artículos con inscripciones abiertas.',409);
    if(!Array.isArray(data.items)||data.items.length<1||data.items.length>200) fail('Carga entre 1 y 200 artículos.');
    const ids=new Set();
    s.items=data.items.map(item=>{
      if(!Number.isInteger(item.number)||item.number<1||item.number>9999||ids.has(item.number)) fail('Cada artículo necesita un número único entre 1 y 9999.');
      ids.add(item.number);
      if(typeof item.label!=='string'||item.label.trim().length<2||item.label.length>120) fail('Revisa la descripción de los artículos.');
      return {number:item.number,label:item.label.trim()};
    }).sort((a,b)=>a.number-b.number);
    if(typeof data.repeats!=='boolean') fail('Indica si se permiten ganadores repetidos.');
    s.repeats=data.repeats;
  } else if(action==='close') {
    if(s.phase!=='open') fail('Las inscripciones ya están cerradas.',409);
    s.phase='closed';
  } else if(action==='start') {
    if(s.phase==='drawing') return s; // Retry never rerolls.
    if(s.phase!=='closed') fail('Cierra primero las inscripciones.',409);
    if(!s.items.length||!s.people.length) fail('Hace falta al menos un artículo y una persona.',409);
    const people=shuffle(s.people), items=shuffle(s.items);
    s.draws=items.map((item,i)=>({item,person:s.repeats?s.people[randomInt(s.people.length)]:people[i]??null,revealAt:now+(i+1)*5000}));
    s.startedAt=now; s.phase='drawing';
  } else fail('Acción desconocida.');
  return s;
}
export function publicState(s, now=Date.now()) {
  const results=s.draws.filter(d=>d.revealAt<=now).map(d=>({item:d.item,winner:d.person?.name??null,revealAt:d.revealAt}));
  return {phase:s.phase==='drawing'&&results.length===s.draws.length?'finished':s.phase,repeats:s.repeats,items:s.items,participants:s.people.length,results,total:s.draws.length,serverTime:now,nextAt:s.draws[results.length]?.revealAt??null};
}
export function csv(s) {
  const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
  return '\uFEFF'+[['Artículo','Descripción','Ganador'],...s.results.map(r=>[r.item.number,r.item.label,r.winner??'Sin adjudicar'])].map(row=>row.map(cell).join(';')).join('\r\n');
}
