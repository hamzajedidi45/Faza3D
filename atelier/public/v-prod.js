'use strict';
/* =====================================================================
   Production : Flux, Planning, Imprimantes, Stock, Qualité, fiche commande
   ===================================================================== */

/* ---------------- Flux ---------------- */
function advice(id){return {cmd:'Traitez les demandes chaque matin et fixez la date promise dès la réception.',cao:'Partez des produits du catalogue et limitez à deux allers-retours de design.',prod:'Remplissez les plateaux, lancez les longues impressions le soir (voir Planning) et répartissez sur les 4 imprimantes.',fin:'Préparez la finition pendant l’impression ; un second poste de ponçage et peinture aiderait.',qc:'Faites le contrôle au fil de l’eau avec une fiche de critères simple.',pack:'Préparez les emballages à l’avance pour les commandes en production.'}[id]||''}
function orderCard(o){
  const now=Date.now(),c=stageOf(o),i=STAGES.findIndex(s=>s.id===c);
  const late=c!=='done'&&o.due<now,soon=!late&&c!=='done'&&o.due-now<D;
  let l3='';
  if(c==='prod'&&o.printer){const s=pState(o.printer),n=printerName(o.printer);
    l3=busy(s)?`<div class="prog"><i style="width:${s.percent}%"></i></div><div class="meta">${esc(n)} : ${Math.round(s.percent)} %, encore ${dur(s.remainingMin*60000)}</div>`:
      s.state==='FINISH'?`<div class="meta okc"><b>${esc(n)} : pièce prête</b></div>`:`<div class="meta">${esc(n)} : ${stateLabel(s.state)}</div>`}
  const reste=(+o.price||0)-paid(o);
  const pay=isSales()&&o.price?(reste<=0.01?'<span class="chip pay">Payée</span>':`<span class="chip due">Reste ${fmt(reste,0)} TND</span>`):'';
  const ready=['pack','done'].includes(c);
  return `<div class="card ${late?'late':soon?'soon':''}">
    <button class="lnk top-r" data-edit="${esc(o.id)}">Ouvrir</button><div class="t">${esc(o.client)}</div>
    <div class="meta">${esc(o.id)} · ${esc(o.product)} × ${+o.qty}</div>
    <div>${o.proc!=='laser'?'<span class="chip">3D</span>':''}${o.proc!=='3d'?'<span class="chip">Laser</span>':''}${o.printer?`<span class="chip">${esc(printerName(o.printer))}</span>`:''}${pay}${o.invoice?'<span class="chip">Facturée</span>':''}</div>
    ${o.photos.length?`<div class="thumbs">${o.photos.slice(0,4).map(u=>`<img src="${esc(u)}" alt="Photo ${esc(o.id)}" data-photo="${esc(u)}">`).join('')}</div>`:''}
    ${l3}
    <div class="meta">${c==='done'?'Livrée '+dt(enteredAt(o)):`Ici depuis ${dur(now-enteredAt(o))} · ${late?'<b class="badc">en retard de '+dur(now-o.due)+'</b>':'promise '+dt(o.due)}`}</div>
    <div class="acts">${c!=='done'&&i>0?`<button class="lnk" data-back="${esc(o.id)}">Retour</button>`:''}${ready&&isSales()?`<button class="lnk" data-wa="${esc(o.id)}">WhatsApp</button>`:''}${c!=='done'?`<button class="btn small primary" data-next="${esc(o.id)}">${i===STAGES.length-2?'Marquer livrée':'Étape suivante'}</button>`:''}</div>
  </div>`;
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-next],[data-back],[data-edit],[data-wa],[data-new-order],[data-photo]');if(!t||!DB)return;
  if(t.dataset.newOrder!==undefined)return openOrder(null);
  if(t.dataset.photo){$('#imgBig').src=t.dataset.photo;$('#imgDlg').showModal();return}
  const o=DB.orders.find(x=>x.id===(t.dataset.next||t.dataset.back||t.dataset.edit||t.dataset.wa));if(!o)return toast('Commande introuvable.');
  if(t.dataset.next){const i=STAGES.findIndex(s=>s.id===stageOf(o)),nx=STAGES[i+1];o.hist.push({stage:nx.id,at:Date.now(),by:ME.name});if(nx.id==='prod')consume(o);save();renderSoon();toast(`${o.id} passe à « ${nx.name} »`)}
  else if(t.dataset.back){if(o.hist.length>1){o.hist.pop();save();renderSoon()}}
  else if(t.dataset.edit)openOrder(o);
  else if(t.dataset.wa){const c=clientOf(o);openWA(c&&c.phone,readyText(o))}
});
view({id:'flux',title:'Flux de production',group:'Production',icon:'flux',
 badge:()=>DB.orders.filter(o=>stageOf(o)!=='done'&&o.due<Date.now()).length,
 render(sec){
  const A=analyse(),now=Date.now(),neckName=A.neck?stageName(A.neck):'Aucun',ls=lowStock();
  const fs=failStats();
  const weeks=[];for(let i=5;i>=0;i--){const end=now-i*7*D,start=end-7*D;const tot={},cnt={};
    for(const o of DB.orders)for(let j=0;j<o.hist.length-1;j++){const a=o.hist[j],b=o.hist[j+1];if(b.at>start&&b.at<=end&&!['val','done'].includes(a.stage)){tot[a.stage]=(tot[a.stage]||0)+(b.at-a.at);cnt[a.stage]=(cnt[a.stage]||0)+1}}
    let w=null,bv=0;for(const k in tot){const v=tot[k]/cnt[k];if(v>bv){bv=v;w=k}}weeks.push({start,w,bv})}
  const n=A.neck?A.st[A.neck]:null;
  sec.innerHTML=`
   <div class="kpis">
    <div class="kpi"><b>${A.active.length}</b><span>commandes en cours</span></div>
    <div class="kpi ${A.late?'alert':''}"><b>${A.late}</b><span>en retard sur la date promise</span></div>
    <div class="kpi"><b>${A.lead?dur(A.lead):'—'}</b><span>délai moyen commande → livraison</span></div>
    <div class="kpi ${A.ontime!=null&&A.ontime<0.9?'alert':A.ontime!=null?'good':''}"><b>${A.ontime!=null?Math.round(A.ontime*100)+' %':'—'}</b><span>livrées à l’heure (30 jours)</span></div>
    <div class="kpi ${ls.length?'alert':''}"><b>${ls.length}</b><span>matière${ls.length>1?'s':''} sous le seuil</span></div>
    <div class="kpi alert"><b style="font-size:19px">${esc(neckName)}</b><span>goulot actuel</span></div></div>
   <div class="vsm"><div class="row between"><div><h2>Chaîne de valeur</h2><p class="muted small">Chaque bloc est une commande qui attend dans l’étape. Le goulot est l’étape qui retient le plus de travail.</p></div><button class="btn primary" data-new-order>Nouvelle commande</button></div>
    <div class="vsm-line">${STAGES.map(s=>{const x=A.st[s.id],lim=P().wip[s.id]||s.wip,isN=s.id===A.neck;
      const blocks=s.id==='done'?'':x.ids.map(o=>`<i class="${o.due<now?'late':''}" data-tip="${esc(o.id)} : ${esc(o.client)}"></i>`).join('');
      return `<div class="station ${isN?'neck':''}"><div class="box">${isN?'<span class="neck-tag">Goulot</span>':''}<div class="nm">${s.name}</div>
        <div class="q">${s.id==='done'?`<span class="muted small">${x.n} au total</span>`:blocks||'<span class="muted" style="font-size:12px">vide</span>'}</div>
        ${s.id==='done'?'':`<div class="wip ${x.n>lim?'over':''}">${x.n} / ${lim} encours max</div>`}
        <div class="stats">Temps moyen : <b>${x.avg!=null?dur(x.avg):'—'}</b>${s.id==='done'?'':`<br>Attente cumulée : <b>${dur(x.wait)}</b>`}</div></div></div>`}).join('')}</div>
    <div class="vsm-foot">${A.neck?`<span><b>Pourquoi ${esc(neckName)} :</b> ${n.n} commande(s) y attendent depuis ${dur(n.wait)} au total${n.avg?`, ${dur(n.avg)} en moyenne`:''}.</span><span>${advice(A.neck)}</span>`:'<span>Aucune commande en cours.</span>'}</div></div>
   <div class="board">${STAGES.map(s=>{const list=DB.orders.filter(o=>stageOf(o)===s.id).sort((a,b)=>a.due-b.due);const shown=s.id==='done'?list.sort((a,b)=>enteredAt(b)-enteredAt(a)).slice(0,6):list;
     return `<div class="col ${s.id===A.neck?'neck':''}"><h3><span>${s.name}</span><span class="muted">${list.length}</span></h3>${shown.map(orderCard).join('')||'<p class="empty">Rien ici.</p>'}</div>`}).join('')}</div>
   <div class="grid2">
    <div class="panel"><h2>Performance des machines (7 derniers jours)</h2><table class="t"><tr><th>Machine</th><th class="r">Utilisation</th><th class="r">Taux d’échec</th><th class="r">TRS simplifié</th></tr>
     ${P().printers.map(p=>{const u=utilisation(p.id),f=fs[p.id].rate;const trs=u!=null?u*(1-(f||0)):null;return `<tr><td>${esc(p.name)}</td><td class="r">${u!=null?Math.round(u*100)+' %':'—'}</td><td class="r">${f!=null?Math.round(f*100)+' %':'—'}</td><td class="r"><b>${trs!=null?Math.round(trs*100)+' %':'—'}</b></td></tr>`}).join('')}</table>
     <p class="note">Utilisation : heures d’impression ÷ 168 h. TRS simplifié : utilisation × (1 − taux d’échec).</p></div>
    <div class="panel"><h2>Goulot semaine par semaine</h2><table class="t"><tr><th>Semaine du</th><th>Goulot</th><th class="r">Temps moyen</th></tr>
     ${weeks.reverse().map(x=>`<tr><td>${new Date(x.start).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</td><td>${x.w?stageName(x.w):'<span class="muted">pas de données</span>'}</td><td class="r">${x.w?dur(x.bv):'—'}</td></tr>`).join('')}</table>
     <p class="note">L’étape où les commandes ont passé le plus de temps en moyenne.</p></div></div>`;
 }});

/* ---------------- Planning ---------------- */
view({id:'planning',title:'Planning des imprimantes',group:'Production',icon:'gantt',
 render(sec){
  const now=Date.now(),span=72*H,t0=now-2*H,t1=t0+span,sch=schedule();
  const x=t=>((t-t0)/span*100).toFixed(3)+'%';
  let axis='';for(let t=Math.ceil(t0/(6*H))*(6*H);t<t1;t+=6*H){const d=new Date(t);axis+=`<span style="left:${x(t)}">${d.getHours()===0?d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'}):d.getHours()+' h'}</span>`}
  let nights='';const d0=new Date(t0);d0.setHours(0,0,0,0);
  for(let d=d0.getTime();d<t1;d+=D){const day=new Date(d),open=P().shop.days.includes(day.getDay()),s=d+P().shop.start*H,e=d+P().shop.end*H;
    for(const [a,b] of (open?[[d,s],[e,d+D]]:[[d,d+D]])){const A=Math.max(a,t0),B=Math.min(b,t1);if(B>A)nights+=`<div class="g-night" style="left:${x(A)};width:${((B-A)/span*100).toFixed(3)}%"></div>`}}
  sec.innerHTML=`<div class="sec-h"><p class="ink2">Les 72 prochaines heures. Ordre de passage : par date promise.</p><button class="btn primary" data-new-order>Nouvelle commande</button></div>
   <div class="gantt"><div class="g-head"><div></div><div class="g-axis">${axis}</div></div>${P().printers.map(p=>{const r=sch[p.id],freeIn=r.free-now;
     const blocks=r.blocks.filter(b=>b.end>t0&&b.start<t1).map(b=>{const A=Math.max(b.start,t0),B=Math.min(b.end,t1);
       return `<div class="g-blk ${b.live?'':'plan'} ${b.late?'late':''}" style="left:${x(A)};width:calc(${((B-A)/span*100).toFixed(3)}% - 2px)" data-tip="<b>${esc(b.label)}</b> ${esc(b.sub||'')}<br>${esc(dt(b.start))} → ${esc(dt(b.end))}${b.late?'<br>Finira après la date promise':''}"><b>${esc(b.label)}</b>${esc(b.sub||'')}</div>`}).join('');
     const over=r.blocks.filter(b=>b.end>t1).length;
     return `<div class="g-row"><div class="g-name">${esc(p.name)}<small>${freeIn>60000?'libre dans '+dur(freeIn):'libre maintenant'}${over?` · ${over} au-delà`:''}</small></div><div class="g-track">${nights}${blocks}<div class="g-now" style="left:${x(now)}" data-tip="Maintenant"></div></div></div>`}).join('')}</div>
   <div class="g-legend"><span><i style="background:var(--teal)"></i>Impression en cours</span><span><i style="background:color-mix(in srgb,var(--teal) 16%,var(--panel));border:1.5px dashed var(--teal)"></i>Prévue</span><span><i style="background:var(--panel);border:2px solid var(--bad)"></i>Finira après la date promise</span><span><i style="background:var(--night);border:1px solid var(--line)"></i>Atelier fermé : idéal pour les longues impressions</span></div>
   <p class="note">Une commande pas encore validée par le client démarre au plus tôt après le délai de validation fixé dans Paramètres.</p>`;
 }});

/* ---------------- Imprimantes ---------------- */
view({id:'machines',title:'Imprimantes',group:'Production',icon:'printer',
 badge:()=>Object.values(LIVE).filter(s=>s.state==='FINISH'||s.state==='FAILED').length,
 render(sec){
  const sch=schedule(),fs=failStats();
  const anyConf=Object.values(LIVE).some(s=>s.configured);
  sec.innerHTML=`<div class="printers">${P().printers.map(p=>{const s=pState(p.id),q=(sch[p.id].free-Date.now())/H,u=utilisation(p.id);
    return `<div class="pr"><div class="row between"><h3>${esc(p.name)}</h3><span class="state ${s.state}">${stateLabel(s.state)}</span></div>
     ${busy(s)?`<div class="big">${Math.round(s.percent)} %</div><div class="prog"><i style="width:${s.percent}%"></i></div><div class="ink2">Reste <b>${dur(s.remainingMin*60000)}</b>, fin vers ${hm(Date.now()+s.remainingMin*60000)}</div>`:
       s.state==='FINISH'?`<div class="big okc">Prête</div><div class="ink2">Retirez la pièce du plateau.</div>`:`<div class="big muted">—</div>`}
     ${s.configured&&(s.online||s.camera)?`<div class="cam" data-cam="${esc(p.id)}"><span class="muted">Caméra…</span></div>`:''}
     <dl><dt>Travail</dt><dd>${esc(s.job)||'—'}</dd>${s.layers?`<dt>Couche</dt><dd>${s.layer} / ${s.layers}</dd>`:''}${s.hours?`<dt>Heures d’impression</dt><dd>${fmt(s.hours,0)} h</dd>`:''}
      <dt>Buse / plateau</dt><dd>${s.nozzle!=null?Math.round(s.nozzle)+' °C / '+Math.round(s.bed)+' °C':'—'}</dd>
      <dt>Planning</dt><dd>${q>0?fmt(q,1)+' h de travaux':'libre'}</dd><dt>Utilisation 7 j</dt><dd>${u!=null?Math.round(u*100)+' %':'—'}</dd>
      <dt>Taux d’échec</dt><dd>${fs[p.id].rate!=null?Math.round(fs[p.id].rate*100)+' %':'—'}</dd></dl></div>`}).join('')}
    <div class="pr"><div class="row between"><h3>${esc(P().laser.name)}</h3><span class="state">Suivi manuel</span></div>
     <div class="ink2">Le contrôleur du laser ne partage pas son état en réseau : les travaux laser se suivent dans le flux.</div>
     <dl><dt>Commandes laser en production</dt><dd>${DB.orders.filter(o=>o.proc!=='3d'&&stageOf(o)==='prod').length}</dd></dl></div></div>
   <p class="note">${anyConf?'Données reçues des imprimantes (Mode LAN'+(Object.values(LIVE).some(s=>s.source==='relais')?', via le relais du PC de l’atelier':'')+'). Une notification part dans Messages › Production quand une impression se termine ou échoue. Caméra : séries P1 et A1 en direct ; X1 avec ffmpeg sur le PC relais.':'Les imprimantes ne sont pas encore reliées. '+(isAdmin()?'Renseignez leur adresse IP, numéro de série et code d’accès dans <button class="lnk" data-go="connexions">Connexions</button>.':'L’administrateur peut les relier dans Connexions.')}</p>
   <div class="panel mt" id="maintPanel"></div>`;
  renderMaint($('#maintPanel',sec));startCams(sec);
 },
 update(sec){const m=$('#maintPanel',sec);if(m)renderMaint(m);$$('.pr',sec).forEach((card,i)=>{const p=P().printers[i];if(!p)return;const s=pState(p.id);const st=$('.state',card);if(st){st.className='state '+s.state;st.textContent=stateLabel(s.state)}})}});
let camT=null;
function startCams(sec){clearInterval(camT);const tick=()=>{if(cur!=='machines'||document.visibilityState!=='visible'){return}$$('[data-cam]',sec).forEach(async box=>{const id=box.dataset.cam;try{const r=await fetch(`/api/printers/${id}/camera.jpg?t=${Date.now()}`,{credentials:'same-origin',cache:'no-store'});if(!r.ok){const j=await r.json().catch(()=>({}));if(!box.querySelector('img'))box.innerHTML=`<span class="muted small">${esc(j.error||'Caméra indisponible')}</span>`;return}const b=await r.blob();let img=box.querySelector('img');if(!img){box.innerHTML='<img alt="Caméra"><span class="lbl"></span>';img=box.querySelector('img')}const u=URL.createObjectURL(b);img.onload=()=>URL.revokeObjectURL(u);img.src=u;box.querySelector('.lbl').textContent='Caméra · '+hm(+r.headers.get('X-Image-At')||Date.now())}catch(e){}})};tick();camT=setInterval(tick,5000)}

/* ---------------- Stock ---------------- */
function refName(ref){const m=(P().materials||[]).find(x=>x.id===ref)||(P().sheets||[]).find(x=>x.id===ref);return m?m.name:ref}
view({id:'stock',title:'Stock',group:'Production',icon:'stock',
 badge:()=>lowStock().length,
 render(sec){
  const low=lowStock();
  sec.innerHTML=`<div class="sec-h"><p class="ink2">${low.length?`${low.length} matière${low.length>1?'s':''} sous le seuil.`:'Stock au-dessus des seuils.'}</p><div class="row sales-only"><button class="btn ${low.length?'primary':''}" id="stockBon">Préparer un bon de commande</button><button class="btn" data-go="achats">Achats</button></div></div>
   <div class="panel"><div class="tbl-wrap"><table class="t"><tr><th>Matière</th><th class="r">En stock</th><th>Niveau</th><th class="r">Seuil</th><th></th></tr>
   ${DB.stock.length?DB.stock.map(s=>{const low=+s.qty<=+s.min,pct=Math.min(100,(+s.qty)/Math.max(+s.min*3,0.0001)*100);
    return `<tr><td><b>${esc(s.name)}</b>${low?' <span class="tag bad">À commander</span>':''}<br><span class="muted small">${s.ref?'Lié à : '+esc(refName(s.ref)):'Non lié au calculateur'}</span></td>
     <td class="r">${fmt(s.qty,s.kind==='plaque'?2:0)} ${unit(s)}</td><td><div class="bar ${low?'low':''}"><i style="width:${pct}%"></i></div></td><td class="r">${fmt(s.min,s.kind==='plaque'?2:0)} ${unit(s)}</td>
     <td class="r"><div class="row" style="gap:8px;justify-content:flex-end"><button class="btn small" data-restock="${esc(s.id)}">${s.kind==='fil'?'+ 1 bobine (1 kg)':s.kind==='plaque'?'+ 1 m²':'+ 10'}</button>
      <button class="lnk" data-adjust="${esc(s.id)}">Corriger</button>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" class="small">Commander</a>`:''}<button class="lnk badc admin-only" data-delstock="${esc(s.id)}">Retirer</button></div></td></tr>`}).join(''):'<tr><td colspan="5" class="empty">Aucune matière. Ajoutez vos bobines et plaques ci-dessous.</td></tr>'}</table></div>
   <p class="note">Le stock baisse tout seul quand une commande passe en production et quand un échec est enregistré dans Qualité.</p></div>
   <div class="panel"><h2>Ajouter une matière</h2><form class="inline-form" id="stockForm">
    <label>Nom<input name="name" required placeholder="PLA noir mat"></label>
    <label>Type<select name="kind"><option value="fil">Filament (g)</option><option value="plaque">Plaque (m²)</option><option value="autre">Autre (unités)</option></select></label>
    <label>Lié à la matière du calculateur<select name="ref">${optList([...(P().materials||[]),...(P().sheets||[])],'','Aucune')}</select></label>
    <label>Quantité<input name="qty" type="number" step="any" min="0" required></label>
    <label>Seuil d’alerte<input name="min" type="number" step="any" min="0" required></label>
    <label>Lien fournisseur<input name="url" type="url" placeholder="https://3dprint.tn/…"></label>
    <button class="btn primary">Ajouter</button></form></div>`;
  const sb=$('#stockBon',sec);if(sb)sb.onclick=()=>openPurchase(null,{fromLow:true});
  $('#stockForm',sec).addEventListener('submit',e=>{e.preventDefault();const f=e.target;
    DB.stock.push({id:uid('s'),name:f.name.value.trim(),kind:f.kind.value,ref:f.ref.value,qty:+f.qty.value,min:+f.min.value,url:f.url.value.trim()});save();renderView(true);toast('Matière ajoutée')});
  sec.onclick=e=>{
    const r=e.target.closest('[data-restock]'),a=e.target.closest('[data-adjust]'),d=e.target.closest('[data-delstock]');
    if(r){const s=DB.stock.find(x=>x.id===r.dataset.restock);s.qty=+(+s.qty+(s.kind==='fil'?1000:s.kind==='plaque'?1:10)).toFixed(3);save();renderView(true);toast(`${s.name} : ${fmt(s.qty,s.kind==='plaque'?2:0)} ${unit(s)}`)}
    if(a){const s=DB.stock.find(x=>x.id===a.dataset.adjust);const v=prompt(`Quantité réelle de « ${s.name} » (${unit(s)}) :`,s.qty);if(v!==null&&!isNaN(parseFloat(v.replace(',','.')))){s.qty=parseFloat(v.replace(',','.'));save();renderView(true)}}
    if(d){const s=DB.stock.find(x=>x.id===d.dataset.delstock);if(confirmAct(`Retirer « ${s.name} » du stock ?`)){DB.stock=DB.stock.filter(x=>x!==s);save();renderView(true)}}
  };
 }});

/* ---------------- Qualité ---------------- */
view({id:'qualite',title:'Qualité',group:'Production',icon:'quality',
 render(sec){
  const fs=failStats(),list=[...DB.failures].sort((a,b)=>b.at-a.at).slice(0,15);
  const causes={};DB.failures.forEach(f=>causes[f.cause]=(causes[f.cause]||0)+1);const top=Object.entries(causes).sort((a,b)=>b[1]-a[1])[0];
  const photos=DB.orders.flatMap(o=>o.photos.map(u=>({u,o})));
  sec.innerHTML=`<div class="grid2">
   <div class="panel"><h2>Taux d’échec par imprimante</h2><table class="t"><tr><th>Imprimante</th><th class="r">Travaux</th><th class="r">Échecs</th><th class="r">Taux</th><th class="r">Perdu</th></tr>
    ${P().printers.map(p=>{const x=fs[p.id];return `<tr><td>${esc(p.name)}</td><td class="r">${x.jobs}</td><td class="r">${x.fails}</td><td class="r"><b>${x.rate!=null?Math.round(x.rate*100)+' %':'—'}</b></td><td class="r">${fmt(x.g,0)} g · ${fmt(x.h,1)} h</td></tr>`}).join('')}</table>
    <p class="note">Le calculateur utilise ce taux dès qu’une imprimante a au moins 5 travaux.</p></div>
   <div class="panel"><h2>Enregistrer un échec d’impression</h2><form class="inline-form" id="failForm" style="grid-template-columns:1fr 1fr">
    <label>Imprimante<select name="printer">${optList(P().printers)}</select></label><label>Matière<select name="mat">${optList(P().materials||[])}</select></label>
    <label>Cause<select name="cause"><option>Décollement du plateau</option><option>Buse bouchée</option><option>Filament cassé ou emmêlé</option><option>Mauvais réglage</option><option>Coupure de courant</option><option>Autre</option></select></label>
    <label>Commande liée<select name="order">${optList(DB.orders.filter(o=>stageOf(o)!=='done'||Date.now()-enteredAt(o)<14*D).map(o=>({id:o.id,name:`${o.id} · ${o.client}`})),'','Aucune')}</select></label>
    <label>Filament perdu (g)<input name="g" type="number" min="0" value="0"></label><label>Heures perdues<input name="h" type="number" min="0" step="0.1" value="0"></label>
    <button class="btn warn" style="grid-column:1/-1;justify-content:center">Enregistrer l’échec</button></form></div></div>
   <div class="panel"><h2>Derniers échecs</h2>${top?`<p class="small ink2" style="margin-bottom:6px">Cause la plus fréquente : <b>${esc(top[0])}</b> (${top[1]} fois).</p>`:''}
    <table class="t"><tr><th>Date</th><th>Imprimante</th><th>Cause</th><th>Commande</th><th class="r">Perdu</th></tr>${list.length?list.map(f=>`<tr><td>${dday(f.at)}</td><td>${esc(printerName(f.printer))}</td><td>${esc(f.cause)}</td><td>${esc(f.order||'—')}</td><td class="r">${fmt(f.g,0)} g · ${fmt(f.h,1)} h</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Aucun échec enregistré.</td></tr>'}</table></div>
   <div class="panel"><div class="row between"><h2>Portfolio des réalisations</h2><span class="muted small">Ajoutez des photos depuis une commande.</span></div>
    <div class="gallery">${photos.length?photos.slice().reverse().map(({u,o})=>`<figure><img src="${esc(u)}" alt="${esc(o.product)}" data-photo="${esc(u)}" loading="lazy"><figcaption>${esc(o.product)} · ${esc(o.client)}</figcaption></figure>`).join(''):'<p class="empty" style="grid-column:1/-1">Pas encore de photo.</p>'}</div></div>`;
  $('#failForm',sec).addEventListener('submit',e=>{e.preventDefault();const f=e.target;
    const x={id:uid('f'),at:Date.now(),printer:f.printer.value,mat:f.mat.value,cause:f.cause.value,order:f.order.value,g:+f.g.value||0,h:+f.h.value||0,by:ME.name};
    DB.failures.push(x);const s=stockFor(x.mat);if(s&&x.g)s.qty=Math.max(0,+s.qty-x.g);save();renderView(true);toast('Échec enregistré, stock mis à jour')});
 }});

/* ---------------- Fiche commande ---------------- */
let editing=null,draftPhotos=[],draftPays=[],draftFiles=[],orderPreset=null;
function fillOrderSelects(){
  const f=$('#orderForm');
  setOpts(f.printer,optList(P().printers,'', 'Aucune'));setOpts(f.useMat,optList(P().materials||[],'','Aucun'));setOpts(f.useSheet,optList(P().sheets||[],'','Aucune'));
  setOpts(f.clientId,optList([...DB.clients].sort((a,b)=>a.name.localeCompare(b.name)),'','Choisir un client')+(isSales()?'<option value="__new">+ Nouveau client…</option>':''));
  setOpts(f.source,optList(SOURCES,'','Non renseignée'));
}
function openOrder(o,q){
  editing=o;orderPreset=q||null;const f=$('#orderForm');fillOrderSelects();
  $('#dlgTitle').textContent=o?`Commande ${o.id}`:'Nouvelle commande';
  f.clientId.value=o?.clientId||q?.clientId||'';f.product.value=o?.product||q?.name||'';f.qty.value=o?.qty||q?.qty||1;f.proc.value=o?.proc||q?.proc||'3d';
  f.printer.value=o?.printer??q?.printer??'';f.printH.value=o?.printH??q?.printH??0;f.laserMin.value=o?.laserMin??q?.laserMin??0;
  const u=o?.use||q?.use||{};f.useMat.value=u.mat||'';f.useG.value=u.g||0;f.useSheet.value=u.sheet||'';f.useM2.value=u.m2||0;
  f.due.value=toLocalInput(o?.due||q?.ready||Date.now()+72*H);f.price.value=o?.price??(q&&q.ttc!=null?(+q.ttc).toFixed(3):'');f.notes.value=o?.notes||q?.notes||'';
  f.source.value=o?.source||q?.source||'';
  const lines=o?.lines||q?.lines;
  $('#orderLines').innerHTML=lines&&lines.length?`Lignes du devis ${esc(o?.quoteNo||q?.quoteNo||'')} : ${lines.map(l=>`${esc(l.label)} × ${l.qty}`).join(' · ')}`:'';
  draftPhotos=[...(o?.photos||[])];draftPays=[...(o?.payments||[])];draftFiles=[...(o?.files||[])];setOpts($('#payMode'),optList(PAY_MODES));
  $('#delOrder').style.display=o?'':'none';
  for(const b of ['#invBtn','#invMail','#waBtn','#trackBtn','#avoirBtn'])$(b).disabled=!o;
  $('#avoirBtn').disabled=!(o&&o.invoice&&!o.creditNote);
  $('#invInfo').innerHTML=o&&o.invoice?`Facture ${esc(o.invoice.no)} du ${dday(o.invoice.at)}${o.creditNote?` · <b>Avoir ${esc(o.creditNote.no)}</b> de ${fmt(o.creditNote.amount,3)} TND <button type="button" class="lnk" id="avoirPdf">PDF</button>`:''}`:o?'Pas encore de facture.':'Enregistrez la commande pour pouvoir la facturer.';
  renderDraft();$('#orderDlg').showModal();
}
function renderDraft(){
  $('#fileList').innerHTML=draftFiles.length?draftFiles.map((f,i)=>`<div class="file"><span>📎</span><a class="nm" href="/fichiers/${esc(f.id)}" target="_blank" rel="noopener">${esc(f.name)}</a><span class="sz">${f.size>1048576?fmt(f.size/1048576,1)+' Mo':fmt(f.size/1024,0)+' Ko'} · ${esc(f.by||'')}</span><a class="lnk" href="/fichiers/${esc(f.id)}?dl=1">Télécharger</a><button type="button" class="lnk badc" data-rmfile="${i}">Retirer</button></div>`).join(''):'<span class="muted small">Aucun fichier. Joignez les STL, 3MF, SVG ou PDF du client.</span>';
  $('#photoList').innerHTML=draftPhotos.map((u,i)=>`<span><img src="${esc(u)}" alt="" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid var(--line);display:block" data-photo="${esc(u)}"><button type="button" class="lnk badc" data-rmphoto="${i}">Retirer</button></span>`).join('')||'<span class="muted small">Aucune photo.</span>';
  const tot=+$('#orderForm').price.value||0,pd=draftPays.reduce((a,p)=>a+(+p.amount||0),0);
  $('#payList').innerHTML=(draftPays.length?draftPays.map((p,i)=>`<div>${dday(p.at)} · ${esc(p.mode)} · <b>${fmt(p.amount,3)} TND</b> <button type="button" class="lnk badc" data-rmpay="${i}">Retirer</button></div>`).join(''):'<span class="muted">Aucun paiement.</span>')+
    (tot?`<div style="margin-top:4px">Payé ${fmt(pd,3)} sur ${fmt(tot,3)} TND · <b class="${tot-pd>0.01?'badc':'okc'}">${tot-pd>0.01?'reste '+fmt(tot-pd,3)+' TND':'soldée'}</b></div>`:'');
}
$('#orderDlg').addEventListener('click',async e=>{const r=e.target.closest('[data-rmphoto]'),p=e.target.closest('[data-rmpay]'),f=e.target.closest('[data-rmfile]');if(r){draftPhotos.splice(+r.dataset.rmphoto,1);renderDraft()}if(p){draftPays.splice(+p.dataset.rmpay,1);renderDraft()}
  if(f){const x=draftFiles[+f.dataset.rmfile];if(confirmAct(`Retirer le fichier « ${x.name} » ?`)){draftFiles.splice(+f.dataset.rmfile,1);renderDraft();try{await api('/api/fichiers/'+x.id,{method:'DELETE'})}catch(err){}}}
  if(e.target.id==='avoirPdf'&&editing)openPdf(`/api/orders/${encodeURIComponent(editing.id)}/avoir.pdf`)});
$('#fileIn').addEventListener('change',async e=>{for(const file of e.target.files){if(file.size>150e6){toast(`${file.name} : plus de 150 Mo`);continue}
  try{toast(`Envoi de ${file.name}…`,20000);const r=await fetch(`/api/fichiers?name=${encodeURIComponent(file.name)}&order=${encodeURIComponent(editing?editing.id:'')}`,{method:'PUT',body:file,credentials:'same-origin',headers:{'X-Faza':'1'}});const j=await r.json();if(!r.ok)throw new Error(j.error||'Envoi impossible');draftFiles.push(j);renderDraft();toast('Fichier joint')}catch(err){toast(err.message,6000)}}e.target.value=''});
$('#payRS').addEventListener('click',()=>{const tot=+$('#orderForm').price.value||0;const r=P().rates;if(!tot)return toast('Indiquez d’abord le prix.');if(tot<(+r.rsMin||0))return toast(`Pas de retenue à la source en dessous de ${fmt(r.rsMin,0)} TND TTC (règle à confirmer avec le comptable).`,6000);
  const a=+(tot*(+r.rs||0)/100).toFixed(3);draftPays.push({at:Date.now(),amount:a,mode:'Retenue à la source',by:ME.name});renderDraft();toast(`Retenue de ${fmt(a,3)} TND ajoutée : demandez l’attestation de retenue au client.`,6000)});
$('#trackBtn').addEventListener('click',async()=>{if(!editing)return;const l=await publicLink('suivi',editing.id);if(!l)return toast('Lien indisponible.');if(!l.public)toast('Adresse publique non réglée (Paramètres › Société › Adresse publique) : le lien ne marchera que dans l’atelier.',7000);copyText(l.url,'Lien de suivi copié : collez-le dans WhatsApp ou un e-mail')});
$('#avoirBtn').addEventListener('click',()=>{if(!editing||!editing.invoice)return;$('#avoirNo').textContent=editing.invoice.no;const f=$('#avoirForm');f.reset();$('#avoirTotal').checked=false;f.amount.value='';$('#avoirDlg').showModal()});
$('#avoirTotal').addEventListener('change',e=>{if(e.target.checked&&editing){$('#avoirForm').amount.value=((+editing.price||0)+(+P().rates.timbre||0)).toFixed(3)}});
$('#avoirDlg').addEventListener('close',async()=>{if($('#avoirDlg').returnValue!=='ok'||!editing)return;const f=$('#avoirForm');try{await flush();const r=await api(`/api/orders/${encodeURIComponent(editing.id)}/avoir`,{method:'POST',body:{amount:+f.amount.value,reason:f.reason.value}});await pull();const o=DB.orders.find(x=>x.id===editing.id);if(o){editing=o;openOrder(o)}toast(`Avoir ${r.creditNote.no} créé`)}catch(e){toast(e.message,6000)}});
$('#orderForm').price.addEventListener('input',renderDraft);
$('#orderForm').clientId.addEventListener('change',e=>{if(e.target.value==='__new'){e.target.value='';openClient(null,c=>{fillOrderSelects();$('#orderForm').clientId.value=c.id})}});
$('#payAdd').addEventListener('click',()=>{const a=+$('#payAmt').value;if(!(a>0))return toast('Saisissez un montant.');draftPays.push({at:Date.now(),amount:a,mode:$('#payMode').value,by:ME.name});$('#payAmt').value='';renderDraft()});
$('#photoIn').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;
  try{const data=await shrink(file,1600,0.82);const r=await api('/api/photo',{method:'POST',body:{data}});draftPhotos.push(r.url);renderDraft();toast('Photo ajoutée')}catch(err){toast('Photo non ajoutée : '+err.message)}e.target.value=''});
function shrink(file,max,q){return new Promise((ok,ko)=>{const img=new Image();img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);ok(c.toDataURL('image/jpeg',q))};
  img.onerror=()=>ko(new Error('format non lu'));img.src=URL.createObjectURL(file)})}
$('#delOrder').addEventListener('click',()=>{if(!editing)return;if(editing.invoice)return toast('Une commande facturée ne peut pas être supprimée.');if(confirmAct(`Supprimer définitivement ${editing.id} ?`)){DB.orders=DB.orders.filter(o=>o!==editing);editing=null;$('#orderDlg').close('cancel');save();renderSoon();toast('Commande supprimée')}});
$('#waBtn').addEventListener('click',()=>{if(!editing)return;const c=clientOf(editing);openWA(c&&c.phone,readyText(editing))});
async function makeInvoice(o){
  storeOrderForm();await flush();
  const r=await api(`/api/orders/${encodeURIComponent(o.id)}/facture`,{method:'POST'});
  await pull();return r.invoice;
}
$('#invBtn').addEventListener('click',()=>{if(!editing)return;const o=editing;openPdf(()=>`/api/orders/${encodeURIComponent(o.id)}/facture.pdf`,async()=>{const inv=await makeInvoice(o);$('#invInfo').textContent=`Facture ${inv.no} du ${dday(inv.at)}`})});
$('#invMail').addEventListener('click',async()=>{if(!editing)return;const o=editing;try{const inv=await makeInvoice(o);const c=clientOf(o)||{};$('#orderDlg').close('cancel');
  mailDialog({to:c.email||'',subject:`Facture ${inv.no} · ${P().company.brand||'FAZA 3D'}`,text:`Bonjour,\n\nVeuillez trouver ci-joint la facture ${inv.no} pour votre commande « ${o.product} ».\n\nMerci de votre confiance.\n${P().company.brand||'FAZA 3D'}${P().company.phone?'\n'+P().company.phone:''}`,attach:{kind:'facture',id:o.id},label:`Facture ${inv.no} (PDF)`})}catch(e){toast(e.message,5000)}});
function orderFormData(){
  const f=$('#orderForm');const c=DB.clients.find(x=>x.id===f.clientId.value);if(!c)return null;
  const d={clientId:c.id,client:c.name,product:f.product.value.trim(),qty:+f.qty.value||1,proc:f.proc.value,printer:f.proc.value==='laser'?'':f.printer.value,printH:+f.printH.value||0,laserMin:+f.laserMin.value||0,
    use:{mat:f.useMat.value,g:+f.useG.value||0,sheet:f.useSheet.value,m2:+f.useM2.value||0},due:new Date(f.due.value).getTime()||Date.now()+72*H,notes:f.notes.value,photos:draftPhotos,files:draftFiles};
  if(isSales()){d.price=+f.price.value||0;d.payments=draftPays;d.source=f.source.value}
  return d;
}
function storeOrderForm(){if(!editing)return;const d=orderFormData();if(d){Object.assign(editing,d);save()}}
$('#orderDlg').addEventListener('close',async()=>{
  if($('#orderDlg').returnValue!=='ok')return;
  const d=orderFormData();
  if(!d){toast('Choisissez un client.');return setTimeout(()=>$('#orderDlg').showModal(),50)}
  if(editing){Object.assign(editing,d);save();renderSoon();toast(`${editing.id} enregistrée`);return}
  const q=orderPreset;let id;
  try{id=(await api('/api/ids/order',{method:'POST'})).id}catch(e){id='C-'+Date.now().toString(36).toUpperCase()}
  const now=Date.now();
  const o=normOrder({id,...d,payments:d.payments||[],invoice:null,consumed:false,hist:[{stage:'cmd',at:now,by:ME.name}],created:now,createdBy:ME.name});
  if(q&&q.lines){o.lines=q.lines;o.discountPct=q.discountPct||0;o.quoteId=q.quoteId;o.quoteNo=q.quoteNo}
  if(q&&q.leadId)o.leadId=q.leadId;
  DB.orders.push(o);
  if(q&&q.quoteId){const qq=DB.quotes.find(x=>x.id===q.quoteId);if(qq){qq.orderId=id;qq.status='accepte'}}
  if(q&&q.leadId){const l=DB.leads.find(x=>x.id===q.leadId);if(l){setLeadStage(l,'gagne');l.orderId=id}}
  save();renderSoon();toast(`Commande ${id} créée`);
});
