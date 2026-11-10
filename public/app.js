const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let last='',failed=false,liveRequested=false;
async function refresh(){
 try{
  const r=await fetch('/api/state',{cache:'no-store'}),s=await r.json();if(!r.ok)throw Error(s.error);
  failed=false;$('#item-count').textContent=s.items.length;$('#people-count').textContent=s.participants;
  $('#register button').disabled=s.phase!=='open';
  const live=$('#directo');live.hidden=!(liveRequested||s.phase==='drawing'||s.results.length);
  const version=JSON.stringify(s.results);
  if(version!==last){
   last=version;const latest=s.results.at(-1);
   if(latest){
    $('#stage').className='reveal';$('#stage').innerHTML=`<span class="eyebrow">PREMIO ${latest.item.number} · ${esc(latest.item.label)}</span><span class="confetti">✦ ✦ ✦</span><h3>${esc(latest.winner??'Sin adjudicar')}</h3>`;
    $('#results').innerHTML=s.results.map(r=>`<div><span>#${r.item.number}</span><span>${esc(r.item.label)}</span><strong>${esc(r.winner??'Sin adjudicar')}</strong></div>`).join('');
   }else if(s.phase==='drawing'){$('#stage').className='drawing';$('#stage').innerHTML='<span class="star">✦</span>';}
  }
 }catch{failed=true;$('#register button').disabled=true;}
 setTimeout(refresh,failed?4000:1000);
}
$('#register').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
 try{const data=new FormData(form);const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first:data.get('first'),last:data.get('last')})});if(!r.ok)throw Error();form.reset();}catch{}finally{button.disabled=false;}
});
$('#live-link').addEventListener('click',()=>{liveRequested=true;$('#directo').hidden=false;});
refresh();
