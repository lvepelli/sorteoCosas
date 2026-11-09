const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let last='', failed=false;
async function refresh(){
 try{
  const r=await fetch('/api/state',{cache:'no-store'}),s=await r.json();if(!r.ok)throw Error(s.error);
  failed=false;$('#connection').textContent='Conectado · actualización automática';
  $('#item-count').textContent=s.items.length;$('#people-count').textContent=s.participants;
  const labels={open:'Inscripción abierta',closed:'Inscripción cerrada',drawing:'Sorteo en curso',finished:'Sorteo finalizado'};
  $('#phase').textContent=labels[s.phase];$('#live-badge').textContent=labels[s.phase];
  $('#register button').disabled=s.phase!=='open';
  if(s.phase!=='open')$('#register-message').textContent='Las inscripciones están cerradas. Puedes seguir el sorteo aquí.';
  $('#repeat-rule').textContent=s.repeats?'Ganadores repetidos activados: cada artículo se sortea entre todas las personas inscritas.':'Sin ganadores repetidos: cada persona puede ganar como máximo un artículo.';
  const version=JSON.stringify(s.results)+JSON.stringify(s.items)+s.phase;
  if(version!==last){
   last=version;
   $('#items').innerHTML=s.items.length?s.items.map(i=>`<article><span class="item-number">${String(i.number).padStart(2,'0')}</span><span class="item-icon">${/radiador/i.test(i.label)?'▥':'⌁'}</span><h3>${esc(i.label)}</h3><small>Muestra de proveedor</small></article>`).join(''):'<p>La organización está preparando el inventario de 40 muestras.</p>';
   const latest=s.results.at(-1);
   if(latest)$('#stage').innerHTML=`<span class="eyebrow">ARTÍCULO ${latest.item.number} · ${esc(latest.item.label)}</span><h3>${esc(latest.winner??'Sin adjudicar')}</h3><p>${latest.winner?'¡Enhorabuena! Contacta con la organización para la recogida.':'No quedan participantes disponibles sin repetir ganadores.'}</p>`;
   else if(s.phase==='drawing')$('#stage').innerHTML='<span class="star">✳</span><h3>La suerte está en marcha…</h3><p>En unos segundos revelaremos el primer artículo.</p>';
   $('#results').innerHTML=s.results.length?s.results.map(r=>`<div><span>#${r.item.number}</span><span>${esc(r.item.label)}</span><strong>${esc(r.winner??'Sin adjudicar')}</strong></div>`).join(''):'<p>Todavía no hay resultados.</p>';
  }
  $('#progress').textContent=s.phase==='finished'?`Sorteo finalizado · ${s.results.filter(r=>r.winner).length} artículos adjudicados · ${s.results.filter(r=>!r.winner).length} sin adjudicar`:s.phase==='drawing'?`${s.results.length} de ${s.total} resultados publicados · siguiente en ${Math.max(1,Math.ceil((s.nextAt-s.serverTime)/1000))} s`:'';
 }catch(e){failed=true;$('#connection').textContent='Sin conexión · intentando reconectar';$('#register button').disabled=true;$('#progress').textContent=e.message;}
 setTimeout(refresh,failed?4000:1000);
}
$('#register').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
 try{const data=new FormData(form);const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first:data.get('first'),last:data.get('last'),consent:data.has('consent')})});const body=await r.json();if(!r.ok)throw Error(body.error);$('#register-message').textContent='¡Ya estás dentro! Tu inscripción ha quedado guardada. Mucha suerte.';form.reset();}catch(err){$('#register-message').textContent=err.message;}finally{button.disabled=false;}
});
refresh();
