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
  const version=JSON.stringify(s.results)+JSON.stringify(s.items)+s.phase;
  if(version!==last){
   last=version;
   const latest=s.results.at(-1);
   if(latest){$('#stage').className='reveal';$('#stage').innerHTML=`<span class="eyebrow">ARTÍCULO ${latest.item.number} · ${esc(latest.item.label)}</span><span class="confetti">✳ ✦ ✳</span><h3>${esc(latest.winner??'Sin adjudicar')}</h3><p>${latest.winner?'¡Enhorabuena!':'Sin adjudicar'}</p>`;}
   else if(s.phase==='drawing'){$('#stage').className='drawing';$('#stage').innerHTML=`<span class="star">✳</span><span class="eyebrow">PREPARANDO ARTÍCULO ${s.results.length+1}</span><h3>La suerte está en marcha…</h3>`;}
   $('#results').innerHTML=s.results.length?s.results.map(r=>`<div><span>#${r.item.number}</span><span>${esc(r.item.label)}</span><strong>${esc(r.winner??'Sin adjudicar')}</strong></div>`).join(''):'<p>Todavía no hay resultados.</p>';
  }
  $('#progress').textContent=s.phase==='finished'?`Sorteo finalizado · ${s.results.filter(r=>r.winner).length} artículos adjudicados · ${s.results.filter(r=>!r.winner).length} sin adjudicar`:s.phase==='drawing'?`${s.results.length} de ${s.total} resultados · siguiente revelación en ${Math.max(1,Math.ceil((s.nextAt-s.serverTime)/1000))} s`:'';
 }catch(e){failed=true;$('#connection').textContent='Sin conexión · intentando reconectar';$('#register button').disabled=true;$('#progress').textContent=e.message;}
 setTimeout(refresh,failed?4000:1000);
}
$('#register').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
 try{const data=new FormData(form);const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first:data.get('first'),last:data.get('last')})});const body=await r.json();if(!r.ok)throw Error(body.error);$('#register-message').textContent='¡Listo! Ya estás dentro.';form.reset();}catch(err){$('#register-message').textContent=err.message;}finally{button.disabled=false;}
});
refresh();
