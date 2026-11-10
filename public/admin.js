const $=s=>document.querySelector(s);
async function api(path,body){const r=await fetch('/api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
const message=s=>$('#message').textContent=s;
async function load(){
 const s=await api('admin');$('#login').hidden=true;$('#panel').hidden=false;
 $('#summary').textContent=`${s.items.length} premios · ${s.participants} personas · ${{open:'abierto',closed:'cerrado',drawing:'en curso',finished:'finalizado'}[s.phase]}`;
 $('#inventory textarea').value=s.items.map(i=>i.number+';'+i.label).join('\n');$('#inventory input').checked=s.repeats;
 $('#inventory').querySelectorAll('input,textarea,button').forEach(el=>el.disabled=s.phase!=='open');$('#close').disabled=s.phase!=='open';$('#start').disabled=s.phase!=='closed'||!s.participants||!s.items.length;
 $('#people-form').querySelectorAll('textarea,button').forEach(el=>el.disabled=s.phase!=='open');
 $('#impact').textContent=s.repeats?'Repetición activada. Todos los premios tendrán ganador si hay participantes.':`${Math.max(0,s.items.length-s.participants)} premios quedarán sin adjudicar. ${Math.max(0,s.participants-s.items.length)} personas no recibirán premio.`;
 $('#people').replaceChildren(...s.people.map(p=>{const li=document.createElement('li');li.textContent=p.name;return li;}));
}
async function run(fn){try{await fn();}catch(e){message(e.message);}}
$('#login').onsubmit=e=>{e.preventDefault();run(async()=>{await api('login',{password:new FormData(e.target).get('password')});e.target.reset();await load();message('Sesión iniciada.');});};
$('#inventory').onsubmit=e=>{e.preventDefault();run(async()=>{const f=new FormData(e.target);const lines=f.get('items').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter((x,i)=>!(i===0&&/^numero;/i.test(x)));const items=lines.map(line=>{const index=line.indexOf(';');if(index<1)throw Error('Usa número;descripción en cada línea.');return {number:Number(line.slice(0,index)),label:line.slice(index+1)};});await api('admin/items',{items,repeats:f.has('repeats')});await load();message('Premios y reglas guardados.');});};
$('#people-form').onsubmit=e=>{e.preventDefault();run(async()=>{const textarea=e.currentTarget.elements.names;const names=textarea.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);await api('admin/addPeople',{names});textarea.value='';await load();message(names.length+' persona(s) añadida(s).');});};
$('#close').onclick=()=>{if(confirm('¿Cerrar las inscripciones? Ya no se podrán añadir personas ni cambiar premios.'))run(async()=>{await api('admin/close',{});await load();message('Inscripciones cerradas.');});};
$('#start').onclick=()=>{if(confirm('¿Iniciar el sorteo definitivo? No se podrá repetir ni modificar el reparto.'))run(async()=>{await api('admin/start',{});await load();message('Sorteo iniciado. Abre la página pública para seguir el directo.');});};
$('#logout').onclick=()=>run(async()=>{await api('logout',{});location.reload();});

const demoItems=['Experiencia sorpresa','Premio especial','Entrada doble','Kit de regalo','Plan para disfrutar'];
const demoPeople=['Lucía Martín','Javier Torres','Elena Navarro','Carlos Ruiz','Marta Gil'];
const demoVisual=()=>'<div class="draw-visual" aria-hidden="true"><div class="draw-glow"></div><div class="draw-drum"><span class="drum-ball ball-one"></span><span class="drum-ball ball-two"></span><span class="drum-ball ball-three"></span><span class="drum-ticket mini-one"></span><span class="drum-ticket mini-two"></span></div></div>';
let demoTimers=[],demoIndex=0,demoOrder=[];
const clearDemo=()=>{demoTimers.forEach(clearTimeout);demoTimers=[];};
const later=(fn,ms)=>demoTimers.push(setTimeout(fn,ms));
const demoStage=$('#demo-stage'),demoResults=$('#demo-results'),demoProgress=$('#demo-progress'),demoStart=$('#demo-start');
function demoReset(){clearDemo();demoIndex=0;demoOrder=[];demoStage.className='demo-stage draw-stage';demoStage.innerHTML=demoVisual();demoResults.replaceChildren();demoProgress.textContent='';demoStart.textContent='Iniciar prueba';demoStart.disabled=false;}
function demoPrepare(){demoStage.className='demo-stage draw-stage demo-drawing';demoStage.innerHTML=demoVisual();demoProgress.textContent='Revelación en 5 segundos';later(demoReveal,5000);}
function demoReveal(){const item=demoItems[demoIndex],winner=demoOrder[demoIndex];demoStage.className='demo-stage draw-stage demo-reveal reveal';demoStage.innerHTML=`${demoVisual()}<div class="winner-ticket"><span>PREMIO ${demoIndex+1}</span><strong>${winner}</strong><small>${item}</small></div>`;const row=document.createElement('div');row.innerHTML=`<span>${demoIndex+1}</span><span>${item}</span><strong>${winner}</strong>`;demoResults.prepend(row);demoIndex+=1;if(demoIndex===demoItems.length){demoProgress.textContent='Prueba terminada. Puedes repetirla cuando quieras.';demoStart.textContent='Repetir prueba';demoStart.disabled=false;return;}later(demoPrepare,100);}
$('#demo-open').onclick=()=>{$('#demo').hidden=false;demoReset();};
$('#demo-close').onclick=()=>{clearDemo();$('#demo').hidden=true;};
demoStart.onclick=()=>{clearDemo();demoIndex=0;demoOrder=[...demoPeople].sort(()=>Math.random()-.5);demoResults.replaceChildren();demoStart.disabled=true;demoPrepare();};
load().catch(()=>{});
