const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let last='',failed=false,liveRequested=false;
const drawVisual=()=>'<div class="draw-visual" aria-hidden="true"><div class="draw-glow"></div><div class="draw-drum"><span class="drum-ball ball-one"></span><span class="drum-ball ball-two"></span><span class="drum-ball ball-three"></span><span class="drum-ticket mini-one"></span><span class="drum-ticket mini-two"></span></div></div>';
async function refresh(){
 try{
  const r=await fetch('/api/state',{cache:'no-store'}),s=await r.json();if(!r.ok)throw Error(s.error);
  failed=false;$('#item-count').textContent=s.items.length;$('#people-count').textContent=s.participants;
  $('#register button').disabled=s.phase!=='open';
  const live=$('#directo');live.hidden=!(liveRequested||s.phase==='drawing'||s.results.length);
  const version=JSON.stringify(s.results)+s.phase;
  if(version!==last){
   last=version;const latest=s.results.at(-1);
   if(latest){
    $('#stage').className='reveal draw-stage';$('#stage').innerHTML=`${drawVisual()}<div class="winner-ticket"><span>PREMIO ${latest.item.number}</span><strong>${esc(latest.winner??'Sin adjudicar')}</strong><small>${esc(latest.item.label)}</small></div>`;
    $('#results').innerHTML=s.results.map(r=>`<div><span>#${r.item.number}</span><span>${esc(r.item.label)}</span><strong>${esc(r.winner??'Sin adjudicar')}</strong></div>`).join('');
   }else if(s.phase==='drawing'){$('#stage').className='drawing draw-stage';$('#stage').innerHTML=drawVisual();}
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
