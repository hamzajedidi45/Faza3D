'use strict';
/* =====================================================================
   Ventes : Demandes et prospection, Clients, Calculateur, Devis, Réseaux, Finances
   ===================================================================== */
const SALES=['admin','commercial'];
const NET_COLORS={facebook:'var(--s1)',instagram:'var(--s2)',tiktok:'var(--s3)'};
const NET_NAMES={facebook:'Facebook',instagram:'Instagram',tiktok:'TikTok'};

/* ---------------- Demandes et prospection ---------------- */
function setLeadStage(l,stage){if(l.stage===stage)return;l.stage=stage;(l.history=l.history||[]).push({stage,at:Date.now(),by:ME.name});if(stage==='gagne'||stage==='perdu')l.closedAt=Date.now()}
const leadFilter={q:'',seg:'',src:'',who:''};
function leadCard(l){
  const now=Date.now(),late=l.nextAt&&l.nextAt<now&&!['gagne','perdu'].includes(l.stage);
  const last=(l.messages||[]).slice(-1)[0];
  return `<div class="card ${late?'late':l.stage==='perdu'?'grey':''} ${l.unread?'unread':''}" draggable="true" data-lead="${esc(l.id)}" data-leadcard="${esc(l.id)}">
   <div class="t">${esc(l.name)}${l.unread?' <span class="badge">nouveau</span>':''}</div>
   ${l.company?`<div class="meta">${esc(l.company)}</div>`:''}
   <div>${l.source?`<span class="chip src">${esc(l.source)}</span>`:''}${l.segment?`<span class="chip">${esc(l.segment)}</span>`:''}${l.value?`<span class="chip">${fmt(l.value,0)} TND</span>`:''}</div>
   ${last?`<div class="meta" style="margin-top:4px">« ${esc(last.text.slice(0,90))}${last.text.length>90?'…':''} »</div>`:''}
   <div class="meta">${l.nextAt&&!['gagne','perdu'].includes(l.stage)?`${late?'<b class="badc">Relance en retard</b> · ':'Prochaine action : '}${dt(l.nextAt)}`:l.lastAt?'Dernier échange '+ago(l.lastAt):''}${l.assignee?' · '+esc(l.assignee):''}</div></div>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-lead]');if(!b||!DB||e.defaultPrevented)return;if(b.closest('#leadDlg'))return;const l=DB.leads.find(x=>x.id===b.dataset.lead);if(l)openLead(l);else toast('Demande introuvable.')});
view({id:'demandes',title:'Demandes et prospection',group:'Ventes',icon:'leads',roles:SALES,
 badge:()=>DB.leads.filter(l=>l.unread).length,
 render(sec){
  const now=Date.now(),m0=new Date();m0.setDate(1);m0.setHours(0,0,0,0);
  const F=leadFilter,q=F.q.toLowerCase();
  const list=DB.leads.filter(l=>(!q||[l.name,l.company,l.phone,l.email,l.notes].join(' ').toLowerCase().includes(q))&&(!F.seg||l.segment===F.seg)&&(!F.src||l.source===F.src)&&(!F.who||l.assignee===F.who));
  const closed=DB.leads.filter(l=>l.closedAt&&l.closedAt>now-90*D),won=closed.filter(l=>l.stage==='gagne').length;
  const pipe=DB.leads.filter(l=>['contacte','rdv','devis'].includes(l.stage)).reduce((a,l)=>a+(+l.value||0),0);
  const lateN=DB.leads.filter(l=>l.nextAt&&l.nextAt<now&&!['gagne','perdu'].includes(l.stage)).length;
  sec.innerHTML=`
   <div class="kpis">
    <div class="kpi"><b>${DB.leads.filter(l=>l.created>=m0.getTime()).length}</b><span>demandes et prospects ce mois</span></div>
    <div class="kpi ${DB.leads.some(l=>l.unread)?'alert':''}"><b>${DB.leads.filter(l=>l.unread).length}</b><span>non lues</span></div>
    <div class="kpi ${lateN?'alert':''}"><b>${lateN}</b><span>relances en retard</span></div>
    <div class="kpi"><b>${fmt(pipe,0)} TND</b><span>valeur en cours de négociation</span></div>
    <div class="kpi"><b>${closed.length?Math.round(won/closed.length*100)+' %':'—'}</b><span>taux de réussite (90 jours)</span></div></div>
   <div class="row" style="margin-bottom:12px">
    <input id="lq" type="search" placeholder="Rechercher un nom, une entreprise, un téléphone…" value="${esc(F.q)}" style="max-width:300px">
    <select id="lseg" style="width:auto">${optList(SEGMENTS,F.seg,'Tous les segments')}</select>
    <select id="lsrc" style="width:auto">${optList(SOURCES,F.src,'Toutes les origines')}</select>
    <select id="lwho" style="width:auto">${optList(members(),F.who,'Toute l’équipe')}</select>
    <span class="grow"></span>
    <button class="btn" id="lImport">Importer des prospects</button>
    <button class="btn" id="lNewTarget">Nouveau prospect</button>
    <button class="btn primary" id="lNew">Nouvelle demande reçue</button></div>
   <div class="board" id="leadBoard">${LEAD_STAGES.map(s=>{let l=list.filter(x=>(x.stage||'nouveau')===s.id).sort((a,b)=>(b.unread-a.unread)||((a.nextAt||9e15)-(b.nextAt||9e15)));const n=l.length;if(['gagne','perdu'].includes(s.id))l=l.sort((a,b)=>(b.closedAt||0)-(a.closedAt||0)).slice(0,10);
     return `<div class="col" data-stage="${s.id}"><h3><span>${s.name}</span><span class="muted">${n}</span></h3>${l.map(leadCard).join('')||'<p class="empty">Glissez une fiche ici.</p>'}</div>`}).join('')}</div>
   <input type="file" id="lFile" accept=".csv,text/csv" hidden>
   <p class="note">Les messages Instagram, Facebook, WhatsApp, e-mail et du formulaire arrivent ici tout seuls une fois les connexions réglées. Glissez une fiche d’une colonne à l’autre pour changer son étape.</p>`;
  const rer=()=>{renderView(true);const i=$('#lq');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}};
  $('#lq',sec).addEventListener('input',e=>{F.q=e.target.value;clearTimeout(sec._t);sec._t=setTimeout(rer,250)});
  $('#lseg',sec).onchange=e=>{F.seg=e.target.value;renderView(true)};$('#lsrc',sec).onchange=e=>{F.src=e.target.value;renderView(true)};$('#lwho',sec).onchange=e=>{F.who=e.target.value;renderView(true)};
  $('#lNew',sec).onclick=()=>openLead(null,'nouveau');$('#lNewTarget',sec).onclick=()=>openLead(null,'cible');
  $('#lImport',sec).onclick=()=>{toast('Fichier CSV : nom ; entreprise ; téléphone ; e-mail ; segment (une ligne par prospect)',6000);$('#lFile',sec).click()};
  $('#lFile',sec).onchange=async e=>{const f=e.target.files[0];if(!f)return;const txt=await f.text();let n=0;
    for(const line of txt.split(/\r?\n/).slice(0)){const c=line.split(/;|\t/).map(x=>x.replace(/^"|"$/g,'').trim());if(!c[0]||/^nom$/i.test(c[0]))continue;
      DB.leads.push({id:uid('L-'),name:c[0],company:c[1]||'',phone:c[2]||'',email:c[3]||'',segment:SEGMENTS.find(s=>s.toLowerCase().startsWith((c[4]||'').toLowerCase().slice(0,5)))||'',source:'Terrain',stage:'cible',value:0,assignee:P().team.gestion||ME.name,created:Date.now(),history:[{stage:'cible',at:Date.now(),by:ME.name}],messages:[],log:[]});n++}
    save();renderView(true);toast(n+' prospect(s) importé(s)');e.target.value=''};
  // glisser-déposer
  const board=$('#leadBoard',sec);
  board.addEventListener('dragstart',e=>{const c=e.target.closest('[data-leadcard]');if(c){e.dataTransfer.setData('text/plain',c.dataset.leadcard);e.dataTransfer.effectAllowed='move'}});
  board.addEventListener('dragover',e=>{const col=e.target.closest('.col');if(col){e.preventDefault();$$('.col.drop',board).forEach(x=>x!==col&&x.classList.remove('drop'));col.classList.add('drop')}});
  board.addEventListener('dragleave',e=>{const col=e.target.closest('.col');if(col&&!col.contains(e.relatedTarget))col.classList.remove('drop')});
  board.addEventListener('drop',e=>{const col=e.target.closest('.col');if(!col)return;e.preventDefault();const l=DB.leads.find(x=>x.id===e.dataTransfer.getData('text/plain'));if(l){setLeadStage(l,col.dataset.stage);if(l.stage==='contacte'&&!l.nextAt)l.nextAt=Date.now()+3*D;save();renderView(true);toast(`${l.name} : ${LEAD_STAGES.find(s=>s.id===l.stage).name}`)}});
 }});

let editingLead=null;
function openLead(l,stage){
  editingLead=l;const f=$('#leadForm');
  if(l&&l.unread){l.unread=false;save()}
  $('#leadTitle').textContent=l?(l.stage==='cible'?'Prospect':'Demande')+' · '+l.name:stage==='cible'?'Nouveau prospect':'Nouvelle demande reçue';
  setOpts(f.segment,optList(SEGMENTS,'','—'));setOpts(f.source,optList(SOURCES,'','—'));setOpts(f.stage,optList(LEAD_STAGES));setOpts(f.assignee,optList(members(),'','Personne'));
  f.name.value=l?.name||'';f.company.value=l?.company||'';f.segment.value=l?.segment||'';f.phone.value=l?.phone||'';f.email.value=l?.email||'';
  f.source.value=l?.source||(stage==='cible'?'Terrain':'');f.stage.value=l?.stage||stage||'nouveau';f.value.value=l?.value||'';f.assignee.value=l?l.assignee||'':(P().team.gestion||ME.name);
  f.nextAt.value=toLocalInput(l?.nextAt||(l?null:Date.now()+(stage==='cible'?24:2)*H));f.notes.value=l?.notes||'';$('#leadLog').value='';
  const items=[...(l?.messages||[]).map(m=>({...m,kind:'msg'})),...(l?.log||[]).map(m=>({...m,kind:'log'}))].sort((a,b)=>a.at-b.at);
  $('#leadFiles').innerHTML=(l?.files||[]).length?'Fichiers reçus du site : '+l.files.map(f=>`<a href="/fichiers/${esc(f.id)}" target="_blank" rel="noopener">${esc(f.name)}</a> (${Math.round((f.size||0)/1024)} Ko)`).join(' · '):'';
  $('#leadMsgs').innerHTML=items.length?items.map(m=>`<div style="padding:6px 4px;border-bottom:1px solid var(--line)"><div class="small muted">${esc(dt(m.at))} · ${m.kind==='log'?'Note de '+esc(m.by||''):esc(m.channel||'')+' · '+esc(m.from||'')}</div><div style="white-space:pre-wrap;font-size:13.5px">${esc(m.text)}</div></div>`).join(''):'<p class="empty">Aucun échange enregistré.</p>';
  $('#leadDel').hidden=!l;
  for(const b of ['#leadQuote','#leadClient'])$(b).disabled=!l;
  $('#leadDlg').showModal();
  if(l)renderBadges();
}
function leadFromForm(){
  const f=$('#leadForm');
  const d={name:f.name.value.trim(),company:f.company.value.trim(),segment:f.segment.value,phone:f.phone.value.trim(),email:f.email.value.trim(),source:f.source.value,value:+f.value.value||0,assignee:f.assignee.value,nextAt:f.nextAt.value?new Date(f.nextAt.value).getTime():null,notes:f.notes.value};
  let l=editingLead;
  if(!l){l={id:uid('L-'),created:Date.now(),stage:'',history:[],messages:[],log:[],createdBy:ME.name};DB.leads.push(l);editingLead=l}
  Object.assign(l,d);setLeadStage(l,f.stage.value);
  const note=$('#leadLog').value.trim();if(note){(l.log=l.log||[]).push({at:Date.now(),by:ME.name,text:note});l.lastAt=Date.now();$('#leadLog').value='';if(l.stage==='nouveau'||l.stage==='cible')setLeadStage(l,'contacte')}
  return l;
}
$('#leadDlg').addEventListener('close',()=>{if($('#leadDlg').returnValue!=='ok')return;if(!$('#leadForm').name.value.trim())return;leadFromForm();save();renderSoon();toast('Fiche enregistrée')});
$('#leadDel').addEventListener('click',()=>{if(editingLead&&confirmAct(`Supprimer la fiche « ${editingLead.name} » ?`)){DB.leads=DB.leads.filter(x=>x!==editingLead);editingLead=null;$('#leadDlg').close('cancel');save();renderSoon()}});
$('#leadWA').addEventListener('click',()=>{const f=$('#leadForm');openWA(f.phone.value,`Bonjour ${f.name.value.split(' ')[0]||''}, ici ${P().company.brand||'FAZA 3D'} (impression 3D et découpe laser). `)});
$('#leadMail').addEventListener('click',()=>{const f=$('#leadForm');if(!f.email.value)return toast('Ajoutez d’abord une adresse e-mail.');mailDialog({to:f.email.value,subject:`${P().company.brand||'FAZA 3D'} : votre demande`,text:`Bonjour ${f.name.value},\n\nMerci pour votre demande. \n\nCordialement,\n${ME.name}\n${P().company.brand||'FAZA 3D'}${P().company.phone?'\n'+P().company.phone:''}`})});
function clientFromLead(l){
  let c=DB.clients.find(x=>x.id===l.clientId)||DB.clients.find(x=>(l.phone&&x.phone&&x.phone.replace(/\s/g,'')===l.phone.replace(/\s/g,''))||(l.email&&x.email&&x.email.toLowerCase()===l.email.toLowerCase()));
  if(!c){c={id:uid('c'),name:l.company||l.name,phone:l.phone||'',email:l.email||'',kind:segToKind(l.segment),source:l.source||'',contact:l.company?l.name:'',notes:'',created:Date.now()};DB.clients.push(c)}
  l.clientId=c.id;return c;
}
function segToKind(s){return {'École / université':'École / université','Club / association':'Club / association','Santé / architecture':'Clinique / cabinet','Commerce / restaurant':'Commerce / restaurant','Administration (TUNEPS)':'Administration','Particulier':'Particulier'}[s]||'Entreprise'}
$('#leadClient').addEventListener('click',()=>{const l=leadFromForm();const c=clientFromLead(l);save();$('#leadDlg').close('cancel');toast(`Fiche client « ${c.name} » prête`);openClient(c)});
$('#leadQuote').addEventListener('click',()=>{const l=leadFromForm();const c=clientFromLead(l);save();$('#leadDlg').close('cancel');openQuote(null,{clientId:c.id,leadId:l.id})});

/* ---------------- Clients ---------------- */
let editingClient=null,clientCb=null;
function openClient(c,cb){
  editingClient=c;clientCb=cb||null;const f=$('#clientForm');$('#clientTitle').textContent=c?'Fiche client':'Nouveau client';
  setOpts(f.kind,optList(CLIENT_KINDS));setOpts(f.month,'<option value="">—</option>'+MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join(''));setOpts(f.source,optList(SOURCES,'','—'));
  f.name.value=c?.name||'';f.phone.value=c?.phone||'';f.email.value=c?.email||'';f.kind.value=c?.kind||'Entreprise';f.mf.value=c?.mf||'';f.address.value=c?.address||'';
  f.event.value=c?.event||'';f.month.value=c?.month||'';f.day.value=c?.day||15;f.source.value=c?.source||'';f.notes.value=c?.notes||'';
  $('#clientAcces').hidden=!c;
  $('#clientDlg').showModal();
}
$('#clientDlg').addEventListener('close',()=>{
  if($('#clientDlg').returnValue!=='ok')return;const f=$('#clientForm');
  const d={name:f.name.value.trim(),phone:f.phone.value.trim(),email:f.email.value.trim(),kind:f.kind.value,mf:f.mf.value.trim(),address:f.address.value.trim(),event:f.event.value.trim(),month:+f.month.value||null,day:+f.day.value||15,source:f.source.value,notes:f.notes.value};
  let c=editingClient;if(c){Object.assign(c,d);DB.orders.filter(o=>o.clientId===c.id).forEach(o=>o.client=c.name);DB.quotes.filter(q=>q.clientId===c.id).forEach(q=>q.client=c.name)}else{c={id:uid('c'),...d,created:Date.now()};DB.clients.push(c)}
  save();renderSoon();toast('Client enregistré');if(clientCb)clientCb(c);
});
view({id:'clients',title:'Clients',group:'Ventes',icon:'clients',roles:SALES,
 badge:()=>reminders().length,
 render(sec){
  const rm=reminders();
  const rows=DB.clients.map(c=>{const os=DB.orders.filter(o=>o.clientId===c.id);const spent=os.reduce((a,o)=>a+(+o.price||0),0);const last=os.length?Math.max(...os.map(o=>o.created||0)):null;return {c,n:os.length,spent,last}}).sort((a,b)=>b.spent-a.spent||a.c.name.localeCompare(b.c.name));
  sec.innerHTML=`<div class="sec-h"><p class="ink2">${DB.clients.length} client${DB.clients.length>1?'s':''}</p><div class="row"><a class="btn" href="/api/export/clients.csv">Exporter (Excel)</a><button class="btn primary" id="newClient">Nouveau client</button></div></div>
   <div class="panel"><h2>À relancer (événements dans les 45 jours)</h2>${rm.length?`<table class="t">${rm.map(({c,at})=>`<tr><td><b>${esc(c.name)}</b> · ${esc(c.event)}</td><td>${dday(at)} (dans ${Math.max(0,Math.round((at-Date.now())/D))} j)</td><td class="r"><button class="btn small" data-relance="${esc(c.id)}">Relancer sur WhatsApp</button></td></tr>`).join('')}</table>`:'<p class="empty">Aucun événement client dans les 45 prochains jours.</p>'}</div>
   <div class="panel"><div class="tbl-wrap"><table class="t"><tr><th>Client</th><th>Téléphone</th><th class="r">Commandes</th><th class="r">Total TTC</th><th>Dernière commande</th><th>Événement</th><th>Origine</th><th></th></tr>
    ${rows.length?rows.map(({c,n,spent,last})=>`<tr><td><b>${esc(c.name)}</b><br><span class="muted small">${esc(c.kind||'')}</span></td><td>${esc(c.phone||'—')}</td><td class="r">${n}</td><td class="r">${fmt(spent,0)}</td><td>${last?dday(last):'—'}</td>
     <td>${c.month?`${esc(c.event||'Événement')} · ${c.day||15} ${MONTHS[c.month-1]}`:'—'}</td><td>${c.source?`<span class="chip src">${esc(c.source)}</span>`:'—'}</td><td class="r" style="white-space:nowrap"><button class="lnk" data-cquote="${esc(c.id)}">Devis</button> <button class="lnk" data-editclient="${esc(c.id)}">Modifier</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty">Aucun client.</td></tr>'}</table></div></div>`;
  $('#newClient',sec).onclick=()=>openClient(null);
  sec.onclick=e=>{const r=e.target.closest('[data-relance]'),ed=e.target.closest('[data-editclient]'),q=e.target.closest('[data-cquote]');
    if(r){const c=DB.clients.find(x=>x.id===r.dataset.relance);openWA(c.phone,`Bonjour ${c.name}, ici ${P().company.brand||'FAZA 3D'}. Votre ${c.event||'événement'} approche : nous pouvons préparer vos trophées, plaques ou cadeaux sur mesure. Souhaitez-vous un devis ?`)}
    if(ed)openClient(DB.clients.find(x=>x.id===ed.dataset.editclient));
    if(q)openQuote(null,{clientId:q.dataset.cquote})};
 }});

/* ---------------- Calculateur ---------------- */
function computePrice(x){
  const R=P().rates,qty=Math.max(1,+x.qty||1),use3d=x.proc!=='laser',useL=x.proc!=='3d';
  const p=P().printers.find(y=>y.id===x.printer)||P().printers[0],mat=(P().materials||[]).find(y=>y.id===x.mat)||P().materials[0],sh=(P().sheets||[]).find(y=>y.id===x.sheet)||P().sheets[0];
  const fail=1+(x.fail??R.fail)/100,waste=1+(+x.waste||0)/100;
  const plates=use3d?Math.ceil(qty/Math.max(1,+x.ppl||1)):0,printH=use3d?plates*(+x.h||0):0,laserMin=useL?(+x.lmin||0)*qty:0;
  const lines=[];let cost=0;const add=(k,v,d)=>{lines.push([k,v,d]);cost+=v};
  const gTot=use3d?(+x.g||0)*qty*fail:0,m2Tot=useL?(+x.cm2||0)*qty*waste/10000:0;
  if(use3d){add('Filament',gTot*mat.kg/1000,`${fmt(gTot,0)} g de ${mat.name} à ${mat.kg} TND/kg`);add('Machine 3D',printH*fail*rateFor(p),`${plates} plateau${plates>1?'x':''}, ${fmt(printH*fail,1)} h × ${fmt(rateFor(p))} TND/h (${p.name})`)}
  if(useL){add('Plaque',m2Tot*sh.m2,`${fmt(m2Tot,3)} m² de ${sh.name}`);add('Laser',laserMin/60*laserRate(),`${fmt(laserMin,0)} min`)}
  const finMin=(+x.fin||0)*qty+15;
  add('Conception',(+x.design||0)/60*R.design,`${+x.design||0} min à ${fmt(R.design)} TND/h`);
  add('Finition et contrôle',finMin/60*R.tech,`${fmt(finMin,0)} min à ${fmt(R.tech)} TND/h`);
  const mh=machineHoursUsed();add('Part des frais fixes',(printH*fail+laserMin/60)*fixedRate(),`${fmt(fixedRate())} TND par heure machine (${fmt(fixedMonthTotal(),0)} TND/mois ÷ ${fmt(mh.hours,0)} h ${mh.real?'réelles, moyenne 3 mois':'prévues'})`);
  add('Frais de préparation',+R.prepFee||0,'par commande : devis, réglages, lancement');
  add('Emballage et livraison',(+x.pack||0)*qty+(+x.ship||0),'');
  const ht=cost*(1+(+x.margin||0)/100)*(1-(+x.disc||0)/100),ttc=ht*(1+R.vat/100);
  const now=Date.now(),tl=[];let t=addWork(now,+x.design||0);tl.push(['Conception terminée',t]);t+=P().lead.val*H;tl.push(['Validation du client',t]);
  if(use3d){const free=schedule()[p.id].free;const start=Math.max(addWork(t,10),free);t=start+printH*fail*H;tl.push([`Impression sur ${p.name}${free>now+H?` (après le planning actuel, libre ${dt(free)})`:''}`,t])}
  if(useL){t=addWork(t,laserMin);tl.push(['Découpe et gravure laser',t])}
  t=addWork(t,finMin);tl.push(['Finition et contrôle qualité',t]);t=addWork(t,Math.min(60,5*qty+10));tl.push(['Emballée, prête à livrer',t]);
  return {qty,cost,ht,ttc,lines,tl,ready:t,p,use3d,useL,printH:+(printH*fail).toFixed(1),use:{mat:use3d?mat.id:'',g:Math.round(gTot),sheet:useL?sh.id:'',m2:+m2Tot.toFixed(3)}};
}
function workingDays(ms){return Math.max(1,Math.ceil(ms/D))}
let lastQuote=null;
const CALC_DEF={name:'Trophée hybride 25 cm',qty:10,proc:'both',printer:'x2d',mat:'pla',g:85,h:7,ppl:2,fail:null,sheet:'plx3',cm2:300,lmin:6,waste:15,design:60,fin:12,pack:2,ship:8,margin:50,disc:0};
let CALC=null;
function calcInputs(sec){const o={};$$('[data-c]',sec).forEach(el=>o[el.dataset.c]=el.type==='number'?num(el.value):el.value);return o}
function runCalc(sec){
  const x=calcInputs(sec);CALC=x;
  $('#fs3d',sec).style.display=x.proc!=='laser'?'':'none';$('#fsLaser',sec).style.display=x.proc!=='3d'?'':'none';
  const r=computePrice(x);
  $('#o_table',sec).innerHTML=r.lines.map(([k,v,d])=>`<tr><td>${k}<br><span class="muted small">${esc(d)}</span></td><td>${fmt(v)}</td></tr>`).join('')+
   `<tr class="sub"><td>Coût de revient total</td><td>${fmt(r.cost)}</td></tr><tr><td>Coût de revient par pièce</td><td>${fmt(r.cost/r.qty)}</td></tr>
    <tr><td>Marge (${x.margin} %)${x.disc?` puis remise ${x.disc} %`:''}</td><td>${fmt(r.ht-r.cost)}</td></tr><tr class="sub"><td>Prix total HT</td><td>${fmt(r.ht)}</td></tr><tr><td>TVA ${P().rates.vat} %</td><td>${fmt(r.ttc-r.ht)}</td></tr>`;
  $('#o_unit',sec).textContent=fmt(r.ht/r.qty)+' TND';$('#o_unitttc',sec).textContent=fmt(r.ttc/r.qty)+' TND TTC par pièce';
  $('#o_total',sec).textContent=fmt(r.ttc)+' TND';$('#o_totalht',sec).textContent=`${fmt(r.ht)} TND HT pour ${r.qty} pièce${r.qty>1?'s':''}`;
  $('#o_ready',sec).innerHTML=`Prête le <b>${dt(r.ready)}</b>, soit ${dur(r.ready-Date.now())} après la commande.`;
  $('#o_tl',sec).innerHTML=r.tl.map((y,i)=>`<li class="${i===r.tl.length-1?'end':''}">${esc(y[0])} · <span class="ink2">${dt(y[1])}</span></li>`).join('');
  const fs=failStats()[r.p.id];$('#failHint',sec).textContent=r.use3d&&fs&&fs.jobs>=5?`Taux d’échec mesuré sur ${r.p.name} : ${Math.round(fs.rate*100)} % (${fs.fails} sur ${fs.jobs} travaux).`:'';
  lastQuote={name:x.name,qty:r.qty,proc:x.proc,printer:r.use3d?r.p.id:'',printH:r.printH,ttc:r.ttc,ht:r.ht,ready:r.ready,use:r.use};
}
view({id:'calcul',title:'Calculateur de prix',group:'Ventes',icon:'calc',roles:SALES,
 update(sec){const s=$('#catPick',sec);if(s)setOpts(s,optList(DB.catalog,'','Partir d’un produit du catalogue…'));setOpts($('#qPick',sec),optList(DB.quotes.filter(q=>q.status==='brouillon').map(q=>({id:q.id,name:`${q.no||'Nouveau'} · ${q.client}`})),'','Nouveau devis'));runCalc(sec)},
 render(sec){
  const x=CALC||{...CALC_DEF,fail:P().rates.fail};
  const n=(k,label,attrs='')=>`<label>${label}<input data-c="${k}" type="number" value="${esc(x[k]??'')}" ${attrs}></label>`;
  sec.innerHTML=`<div class="calc">
   <div class="panel"><div class="row between"><h2>Pièce à chiffrer</h2><div class="row" style="gap:8px"><select id="catPick" style="width:auto">${optList(DB.catalog,'','Partir d’un produit du catalogue…')}</select><button class="btn small" id="catSave">Enregistrer au catalogue</button></div></div>
    <fieldset><legend>Commande</legend><label class="full">Produit<input data-c="name" value="${esc(x.name)}"></label>${n('qty','Quantité','min="1"')}
     <label>Procédé<select data-c="proc"><option value="3d">Impression 3D</option><option value="laser">Laser</option><option value="both">3D + laser</option></select></label></fieldset>
    <fieldset id="fs3d"><legend>Impression 3D (valeurs lues dans Bambu Studio)</legend><label>Imprimante<select data-c="printer">${optList(P().printers,x.printer)}</select></label>
     <label>Matière<select data-c="mat">${optList(P().materials||[],x.mat)}</select></label>${n('g','Filament par pièce (g)','min="0"')}${n('h','Temps par plateau (h)','min="0" step="0.1"')}${n('ppl','Pièces par plateau','min="1"')}${n('fail','Taux d’échec (%)','min="0"')}</fieldset>
    <fieldset id="fsLaser"><legend>Découpe et gravure laser (pour une pièce)</legend><label>Matière de plaque<select data-c="sheet">${optList(P().sheets||[],x.sheet)}</select></label>
     ${n('cm2','Surface utilisée (cm²)','min="0"')}${n('lmin','Temps laser (min)','min="0" step="0.5"')}${n('waste','Chutes (%)','min="0"')}</fieldset>
    <fieldset><legend>Travail et livraison</legend>${n('design','Conception, pour la commande (min)','min="0"')}${n('fin','Finition par pièce (min)','min="0"')}${n('pack','Emballage par pièce (TND)','min="0" step="0.1"')}${n('ship','Livraison (TND)','min="0"')}${n('margin','Marge (%)','min="0"')}${n('disc','Remise (%)','min="0"')}</fieldset>
    <p class="note" id="failHint"></p></div>
   <div class="panel res"><h2>Prix et délai</h2>
    <div class="price"><div><span>Prix unitaire HT</span><b id="o_unit">—</b><span id="o_unitttc"></span></div><div class="alt"><span>Total commande TTC</span><b id="o_total">—</b><span id="o_totalht"></span></div></div>
    <table id="o_table"></table><h3 style="font-size:15px;margin:18px 0 4px">Délai</h3><p id="o_ready"></p><ul class="timeline" id="o_tl"></ul>
    <p class="note">L’impression démarre à la fin du planning actuel de l’imprimante choisie. Les tâches manuelles suivent les horaires d’atelier ; les imprimantes tournent aussi la nuit.</p>
    <div class="row" style="margin-top:14px"><select id="qPick" style="width:auto">${optList(DB.quotes.filter(q=>q.status==='brouillon').map(q=>({id:q.id,name:`${q.no||'Nouveau'} · ${q.client}`})),'','Nouveau devis')}</select><button class="btn primary" id="toQuote">Ajouter au devis</button><button class="btn" id="toOrder">Créer la commande</button><button class="btn" id="copyQuote">Copier le prix</button></div></div></div>`;
  $('[data-c="proc"]',sec).value=x.proc;
  sec.addEventListener('input',e=>{if(e.target.dataset.c==='printer'){const fs=failStats()[e.target.value];$('[data-c="fail"]',sec).value=fs&&fs.jobs>=5?Math.round(fs.rate*100):P().rates.fail}if(e.target.closest('[data-c]'))runCalc(sec)});
  $('#catPick',sec).onchange=e=>{const k=DB.catalog.find(y=>y.id===e.target.value);if(!k)return;for(const [key,v] of Object.entries(k)){const el=$(`[data-c="${key}"]`,sec);if(el&&v!==undefined&&v!==null&&v!=='')el.value=v}runCalc(sec);e.target.value=''};
  $('#catSave',sec).onclick=()=>{const x=calcInputs(sec);if(!x.name.trim())return toast('Donnez un nom au produit.');const k={...x,id:uid('k')};delete k.qty;delete k.margin;delete k.disc;delete k.fail;delete k.pack;delete k.ship;
    k.price1=computePrice({...x,qty:1}).ht;const ex=DB.catalog.find(y=>y.name.toLowerCase()===x.name.trim().toLowerCase());if(ex)Object.assign(ex,k,{id:ex.id});else DB.catalog.push(k);save();setOpts($('#catPick',sec),optList(DB.catalog,'','Partir d’un produit du catalogue…'));toast(`« ${x.name} » enregistré au catalogue`)};
  $('#toOrder',sec).onclick=()=>{runCalc(sec);openOrder(null,lastQuote)};
  $('#toQuote',sec).onclick=()=>{runCalc(sec);const q=lastQuote;const line={label:q.name,qty:q.qty,pu:+(q.ht/q.qty).toFixed(3)};const lead=`${workingDays(q.ready-Date.now())} jours`;
    const id=$('#qPick',sec).value;if(id){const qq=DB.quotes.find(y=>y.id===id);openQuote(qq,{addLine:line})}else openQuote(null,{lines:[line],leadText:lead})};
  $('#copyQuote',sec).onclick=async()=>{runCalc(sec);const q=lastQuote;const t=`${P().company.brand||'FAZA 3D'} : ${q.name} × ${q.qty}\nPrix unitaire HT : ${fmt(q.ht/q.qty)} TND\nTotal TTC : ${fmt(q.ttc)} TND\nDisponible le : ${dt(q.ready)}`;
    try{await navigator.clipboard.writeText(t);toast('Prix copié : collez-le dans WhatsApp ou un e-mail')}catch(e){toast('Copie impossible dans ce navigateur')}};
  runCalc(sec);
 }});

/* ---------------- Devis ---------------- */
let qDraft=null,qOrig=null;
function qTotals(q){
  const lines=(q.lines||[]).map(l=>({qty:+l.qty||0,pu:+l.pu||0}));const brut=lines.reduce((a,l)=>a+l.qty*l.pu,0);
  const remise=brut*(+q.discountPct||0)/100,ht=brut-remise,tva=ht*(+q.vat||0)/100,timbre=+q.timbre||0;return {brut,remise,ht,tva,timbre,ttc:ht+tva+timbre,ttcSansTimbre:ht+tva};
}
const Q_STATUS={brouillon:['Brouillon',''],envoye:['Envoyé','warn'],accepte:['Accepté','ok'],refuse:['Refusé','bad']};
function openQuote(q,preset={}){
  qOrig=q;qDraft=q?clone(q):{id:uid('q'),no:'',clientId:preset.clientId||'',client:'',at:Date.now(),lines:preset.lines||[],discountPct:0,vat:P().rates.vat,timbre:P().rates.timbre,validityDays:30,leadText:preset.leadText||'',notes:'',status:'brouillon',leadId:preset.leadId||'',createdBy:ME.name};
  if(preset.addLine)qDraft.lines.push(preset.addLine);
  if(!qDraft.lines.length)qDraft.lines.push({label:'',qty:1,pu:0});
  const f=$('#quoteForm');
  setOpts(f.clientId,optList([...DB.clients].sort((a,b)=>a.name.localeCompare(b.name)),qDraft.clientId,'Choisir un client')+'<option value="__new">+ Nouveau client…</option>');
  f.clientId.value=qDraft.clientId||'';f.status.value=qDraft.status;f.validityDays.value=qDraft.validityDays;f.discountPct.value=qDraft.discountPct;f.leadText.value=qDraft.leadText||'';f.notes.value=qDraft.notes||'';
  setOpts($('#qCat'),optList(DB.catalog.map(k=>({id:k.id,name:k.name+(k.price1?` (${fmt(k.price1,3)} HT)`:'')})),'','Ajouter un produit du catalogue…'));
  $('#quoteTitle').textContent=qDraft.no?`Devis ${qDraft.no}`:'Nouveau devis';
  renderQuote();$('#quoteDlg').showModal();
}
function renderQuote(){
  const q=qDraft;const [sl,sc]=Q_STATUS[q.status]||Q_STATUS.brouillon;$('#quoteStatusTag').textContent=sl+(q.acceptedBy?' en ligne par '+q.acceptedBy:'')+(q.orderId?' · '+q.orderId:'');$('#quoteStatusTag').className='tag '+sc;
  $('#quoteLines').innerHTML='<tr><th style="width:55%">Désignation</th><th class="r">Qté</th><th class="r">P.U. HT</th><th class="r">Total HT</th><th></th></tr>'+q.lines.map((l,i)=>`<tr>
   <td><input data-ql="${i}" data-k="label" value="${esc(l.label)}" placeholder="Désignation"></td><td><input data-ql="${i}" data-k="qty" type="number" min="0" step="any" value="${esc(l.qty)}" style="text-align:right;max-width:90px"></td>
   <td><input data-ql="${i}" data-k="pu" type="number" min="0" step="0.001" value="${esc(l.pu)}" style="text-align:right;max-width:120px"></td><td class="r" data-qlt="${i}">${fmt((+l.qty||0)*(+l.pu||0),3)}</td><td><button type="button" class="lnk badc" data-qdel="${i}" aria-label="Retirer la ligne">✕</button></td></tr>`).join('');
  renderQTotals();
}
function renderQTotals(){
  const t=qTotals(qDraft);
  $('#quoteTotals').innerHTML=`${t.remise?`<tr><td>Total brut HT</td><td>${fmt(t.brut,3)}</td></tr><tr><td>Remise ${fmt(qDraft.discountPct,1)} %</td><td>-${fmt(t.remise,3)}</td></tr>`:''}<tr><td>Total HT</td><td>${fmt(t.ht,3)}</td></tr><tr><td>TVA ${fmt(qDraft.vat,0)} %</td><td>${fmt(t.tva,3)}</td></tr>${t.timbre?`<tr><td>Timbre fiscal</td><td>${fmt(t.timbre,3)}</td></tr>`:''}<tr class="sub"><td>Total TTC</td><td>${fmt(t.ttc,3)} TND</td></tr>`;
  qDraft.lines.forEach((l,i)=>{const c=$(`[data-qlt="${i}"]`);if(c)c.textContent=fmt((+l.qty||0)*(+l.pu||0),3)});
}
$('#quoteLines').addEventListener('input',e=>{const el=e.target.closest('[data-ql]');if(!el)return;const l=qDraft.lines[+el.dataset.ql];l[el.dataset.k]=el.dataset.k==='label'?el.value:num(el.value);renderQTotals()});
$('#quoteLines').addEventListener('click',e=>{const b=e.target.closest('[data-qdel]');if(!b)return;qDraft.lines.splice(+b.dataset.qdel,1);if(!qDraft.lines.length)qDraft.lines.push({label:'',qty:1,pu:0});renderQuote()});
$('#quoteForm').addEventListener('input',e=>{const f=$('#quoteForm');if(e.target===f.discountPct){qDraft.discountPct=num(f.discountPct.value);renderQTotals()}});
$('#quoteForm').clientId.addEventListener('change',e=>{if(e.target.value==='__new'){e.target.value='';const dlg=$('#quoteDlg');openClient(null,c=>{setOpts($('#quoteForm').clientId,optList([...DB.clients].sort((a,b)=>a.name.localeCompare(b.name)),c.id,'Choisir un client')+'<option value="__new">+ Nouveau client…</option>');$('#quoteForm').clientId.value=c.id;if(!dlg.open)dlg.showModal()})}});
$('#qAddLine').addEventListener('click',()=>{qDraft.lines.push({label:'',qty:1,pu:0});renderQuote()});
$('#qFromCalc').addEventListener('click',()=>{if(!lastQuote)return toast('Ouvrez d’abord le calculateur et chiffrez la pièce.');qDraft.lines=qDraft.lines.filter(l=>l.label||l.pu);qDraft.lines.push({label:lastQuote.name,qty:lastQuote.qty,pu:+(lastQuote.ht/lastQuote.qty).toFixed(3)});renderQuote()});
$('#qCat').addEventListener('change',e=>{const k=DB.catalog.find(x=>x.id===e.target.value);e.target.value='';if(!k)return;const r=computePrice({...CALC_DEF,...k,qty:1,fail:P().rates.fail,margin:CALC?.margin??50,disc:0,pack:CALC?.pack??2,ship:0});qDraft.lines=qDraft.lines.filter(l=>l.label||l.pu);qDraft.lines.push({label:k.name,qty:1,pu:+r.ht.toFixed(3)});renderQuote();toast('Prix calculé pour 1 pièce : ajustez la quantité (le prix par pièce baisse avec la quantité, à vérifier au calculateur).',6000)});
function commitQuote(){
  const f=$('#quoteForm');const q=qDraft;const c=DB.clients.find(x=>x.id===f.clientId.value);
  if(!c){toast('Choisissez un client.');return null}
  Object.assign(q,{clientId:c.id,client:c.name,status:f.status.value,validityDays:+f.validityDays.value||30,discountPct:num(f.discountPct.value),leadText:f.leadText.value.trim(),notes:f.notes.value});
  q.lines=q.lines.filter(l=>String(l.label).trim()||+l.pu);
  if(!q.lines.length){toast('Ajoutez au moins une ligne.');return null}
  const t=qTotals(q);q.totalHT=+t.ht.toFixed(3);q.totalTTC=+t.ttc.toFixed(3);
  if(q.status==='envoye'&&!q.sentAt)q.sentAt=Date.now();
  if(qOrig)Object.assign(qOrig,q);else{DB.quotes.push(q);qOrig=q}
  qDraft=clone(qOrig);
  if(q.leadId){const l=DB.leads.find(x=>x.id===q.leadId);if(l){if(['nouveau','cible','contacte','rdv'].includes(l.stage)&&q.status==='envoye')setLeadStage(l,'devis');if(!l.value)l.value=q.totalHT}}
  save();return qOrig;
}
async function committedQuote(){const q=commitQuote();if(!q)return null;await flush();if(!q.no){await pull();const r=DB.quotes.find(x=>x.id===q.id);if(r){qOrig=r;qDraft=clone(r);$('#quoteTitle').textContent=`Devis ${r.no}`}}return DB.quotes.find(x=>x.id===q.id)||q}
$('#quoteDlg').addEventListener('close',()=>{if($('#quoteDlg').returnValue==='ok'){if(commitQuote()){renderSoon();toast('Devis enregistré')}else setTimeout(()=>$('#quoteDlg').showModal(),50)}});
$('#qDel').addEventListener('click',()=>{if(!qOrig){$('#quoteDlg').close('cancel');return}if(qOrig.orderId)return toast('Ce devis est lié à une commande : changez plutôt son statut.');if(confirmAct('Supprimer ce devis ?')){DB.quotes=DB.quotes.filter(x=>x!==qOrig);qOrig=null;$('#quoteDlg').close('cancel');save();renderSoon()}});
$('#qPdf').addEventListener('click',()=>{let q=null;openPdf(()=>`/api/devis/${encodeURIComponent(q.id)}/pdf`,async()=>{q=await committedQuote();if(!q)throw new Error('Complétez le devis (client et lignes) avant le PDF.')})});
$('#qMail').addEventListener('click',async()=>{const q=await committedQuote();if(!q)return;const c=DB.clients.find(x=>x.id===q.clientId)||{};$('#quoteDlg').close('cancel');
  mailDialog({to:c.email||'',subject:`Devis ${q.no} · ${P().company.brand||'FAZA 3D'}`,text:`Bonjour,\n\nVeuillez trouver ci-joint notre devis ${q.no} d’un montant de ${fmt(q.totalTTC,3)} TND TTC${q.leadText?', réalisable en '+q.leadText:''}.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n${ME.name}\n${P().company.brand||'FAZA 3D'}${P().company.phone?'\n'+P().company.phone:''}`,attach:{kind:'devis',id:q.id},label:`Devis ${q.no} (PDF)`,onSent:()=>{const x=DB.quotes.find(y=>y.id===q.id);if(x&&x.leadId){const l=DB.leads.find(y=>y.id===x.leadId);if(l&&['nouveau','cible','contacte','rdv'].includes(l.stage)){setLeadStage(l,'devis');save()}}}})});
$('#qWA').addEventListener('click',async()=>{const q=await committedQuote();if(!q)return;const c=DB.clients.find(x=>x.id===q.clientId)||{};const l=await publicLink('devis',q.id);
  openWA(c.phone,`Bonjour ${c.name||''}, voici notre devis ${q.no} : ${q.lines.map(l=>`${l.label} × ${l.qty}`).join(', ')}. Total ${fmt(q.totalTTC,3)} TND TTC${q.leadText?', délai '+q.leadText:''}.${l&&l.public?` Pour le consulter et l’accepter en ligne : ${l.url}`:' Le devis en PDF suit (pièce jointe).'} ${P().company.brand||'FAZA 3D'}`);
  if(!(l&&l.public))toast('Ajoutez le PDF du devis dans WhatsApp (bouton PDF puis Enregistrer). Avec une adresse publique (Paramètres › Société), le lien d’acceptation est envoyé à la place.',8000)});
$('#qLink').addEventListener('click',async()=>{const q=await committedQuote();if(!q)return;const l=await publicLink('devis',q.id);if(!l)return toast('Lien indisponible.');if(!l.public)toast('Adresse publique non réglée (Paramètres › Société) : ce lien ne marche que dans l’atelier.',7000);copyText(l.url,'Lien d’acceptation copié')});
$('#qOrder').addEventListener('click',async()=>{const q=await committedQuote();if(!q)return;if(q.orderId)return toast(`Déjà transformé en commande ${q.orderId}.`);$('#quoteDlg').close('cancel');
  const t=qTotals(q),l=DB.leads.find(x=>x.id===q.leadId);
  const qty=q.lines.reduce((a,x)=>a+(+x.qty||0),0)||1;
  openOrder(null,{clientId:q.clientId,name:q.lines.length===1?q.lines[0].label:`${q.lines[0].label} et ${q.lines.length-1} autre${q.lines.length>2?'s':''}`,qty:q.lines.length===1?q.lines[0].qty:qty,proc:'3d',ttc:t.ttcSansTimbre,lines:q.lines,discountPct:q.discountPct,quoteId:q.id,quoteNo:q.no,leadId:q.leadId,source:l?l.source:'',notes:q.notes||''})});
document.addEventListener('click',e=>{const b=e.target.closest('[data-quote]');if(!b||!DB)return;const q=DB.quotes.find(x=>x.id===b.dataset.quote);if(q)openQuote(q)});
let quoteFilter='';
view({id:'devis',title:'Devis',group:'Ventes',icon:'quote',roles:SALES,
 badge:()=>DB.quotes.filter(q=>q.status==='envoye'&&q.sentAt&&Date.now()-q.sentAt>3*D).length,
 render(sec){
  const m0=new Date();m0.setDate(1);m0.setHours(0,0,0,0);
  const sent=DB.quotes.filter(q=>q.sentAt&&q.sentAt>=m0.getTime());
  const decided=DB.quotes.filter(q=>['accepte','refuse'].includes(q.status));
  const wait=DB.quotes.filter(q=>q.status==='envoye').reduce((a,q)=>a+(+q.totalTTC||0),0);
  const list=DB.quotes.filter(q=>!quoteFilter||q.status===quoteFilter).sort((a,b)=>(b.at||0)-(a.at||0));
  sec.innerHTML=`<div class="kpis"><div class="kpi"><b>${sent.length}</b><span>devis envoyés ce mois</span></div>
    <div class="kpi"><b>${fmt(wait,0)} TND</b><span>en attente de réponse (TTC)</span></div>
    <div class="kpi"><b>${decided.length?Math.round(decided.filter(q=>q.status==='accepte').length/decided.length*100)+' %':'—'}</b><span>devis acceptés</span></div>
    <div class="kpi ${DB.quotes.some(q=>q.status==='envoye'&&q.sentAt&&Date.now()-q.sentAt>3*D)?'alert':''}"><b>${DB.quotes.filter(q=>q.status==='envoye'&&q.sentAt&&Date.now()-q.sentAt>3*D).length}</b><span>à relancer (plus de 3 jours)</span></div></div>
   <div class="sec-h"><div class="seg" role="group" aria-label="Filtrer">${[['','Tous'],['brouillon','Brouillons'],['envoye','Envoyés'],['accepte','Acceptés'],['refuse','Refusés']].map(([v,l])=>`<button data-qf="${v}" aria-pressed="${quoteFilter===v}">${l}</button>`).join('')}</div>
    <div class="row"><a class="btn" href="/api/export/quotes.csv">Exporter (Excel)</a><button class="btn" data-go="calcul">Calculateur</button><button class="btn primary" id="newQuote">Nouveau devis</button></div></div>
   <div class="panel"><div class="tbl-wrap"><table class="t"><tr><th>Numéro</th><th>Client</th><th>Date</th><th>Contenu</th><th class="r">Total TTC</th><th>Statut</th><th></th></tr>
    ${list.length?list.map(q=>{const [sl,sc]=Q_STATUS[q.status]||Q_STATUS.brouillon;return `<tr class="click" data-quote="${esc(q.id)}"><td><b>${esc(q.no||'…')}</b></td><td>${esc(q.client)}</td><td>${dday(q.at)}</td><td class="small">${esc((q.lines||[]).map(l=>l.label).join(', ').slice(0,80))}</td><td class="r">${fmt(q.totalTTC,3)}</td><td><span class="tag ${sc}">${sl}</span>${q.orderId?` <span class="chip">${esc(q.orderId)}</span>`:''}</td><td class="r"><button class="lnk" data-qpdf="${esc(q.id)}">PDF</button></td></tr>`}).join(''):'<tr><td colspan="7" class="empty">Aucun devis. Créez-en un ici ou depuis le calculateur.</td></tr>'}</table></div></div>`;
  $('#newQuote',sec).onclick=()=>openQuote(null);
  sec.onclick=e=>{const f=e.target.closest('[data-qf]');if(f){quoteFilter=f.dataset.qf;renderView(true)}const p=e.target.closest('[data-qpdf]');if(p){e.stopPropagation();e.preventDefault();openPdf(`/api/devis/${encodeURIComponent(p.dataset.qpdf)}/pdf`)}};
 }});

/* ---------------- Réseaux sociaux ---------------- */
let socialMedia=null,connStatus=null;
async function loadSocialExtras(){try{socialMedia=await api('/api/social/media')}catch(e){}try{connStatus=(await api('/api/connecteurs/status')).status}catch(e){}if(cur==='reseaux')renderView(false)}
function socialSeries(net,days){
  const recs=DB.social.filter(s=>s.network===net).sort((a,b)=>a.day.localeCompare(b.day));
  const out=[];let lastF=null;
  for(const d of days){const r=recs.find(x=>x.day===d);if(r&&r.followers!=null)lastF=r.followers;out.push(r&&r.followers!=null?r.followers:null)}
  return {recs,values:out};
}
function latest(net){return DB.social.filter(s=>s.network===net&&s.followers!=null).sort((a,b)=>b.day.localeCompare(a.day))[0]}
function stChip(s,label){if(!s)return '';const m={ok:['ok','connecté'],pret:['teal','prêt'],attente:['warn','en cours'],erreur:['bad','erreur'],off:['','non configuré']}[s.state]||['',s.state];return `<span class="tag ${m[0]}" data-tip="${esc(s.note||'')}${s.at?' · '+esc(dt(s.at)):''}">${esc(label)} : ${m[1]}</span>`}
view({id:'reseaux',title:'Réseaux et marketing',group:'Ventes',icon:'social',roles:SALES,
 render(sec){
  if(!sec.dataset.loaded){sec.dataset.loaded='1';loadSocialExtras()}
  const now=Date.now(),days=[];for(let i=59;i>=0;i--)days.push(dkey(now-i*D));
  const nets=['instagram','facebook','tiktok'];
  const ser=nets.map(n=>({n,...socialSeries(n,days)}));
  const kpi=nets.map(n=>{const l=latest(n);const old=DB.social.filter(s=>s.network===n&&s.followers!=null&&s.day<=dkey(now-30*D)).sort((a,b)=>b.day.localeCompare(a.day))[0];
    const last7=DB.social.filter(s=>s.network===n&&s.day>dkey(now-7*D));const reach=last7.reduce((a,s)=>a+(+s.reach||+s.views||0),0),eng=last7.reduce((a,s)=>a+(+s.engagement||0),0);
    return `<div class="kpi"><span><i class="k" style="background:${NET_COLORS[n]};width:9px;height:9px;display:inline-block;border-radius:50%;margin-right:6px"></i>${NET_NAMES[n]}</span><b>${l?fmt(l.followers,0):'—'}</b><span>abonnés${l&&old?` · ${l.followers-old.followers>=0?'+':''}${fmt(l.followers-old.followers,0)} en 30 j`:''}${reach?` · ${fmt(reach,0)} vues ou portée (7 j)`:''}${eng?` · ${fmt(eng,0)} interactions`:''}</span></div>`}).join('');
  // demandes par origine
  const since=now-30*D,leads=DB.leads.filter(l=>l.created>=since);const bySrc={};for(const l of leads){const s=l.source||'Non renseignée';bySrc[s]=bySrc[s]||{n:0,won:0};bySrc[s].n++;if(l.stage==='gagne')bySrc[s].won++}
  const srcRows=Object.entries(bySrc).sort((a,b)=>b[1].n-a[1].n);const maxN=Math.max(1,...srcRows.map(x=>x[1].n));
  const caSrc={};for(const o of DB.orders.filter(o=>o.created>=now-90*D&&o.price)){const s=o.source||'Non renseignée';caSrc[s]=(caSrc[s]||0)+htOf(o)}
  const caRows=Object.entries(caSrc).sort((a,b)=>b[1]-a[1]);const maxCa=Math.max(1,...caRows.map(x=>x[1]));
  const base=(P().company.siteCommande||location.origin+'/commande').replace(/\/$/,'');
  const waNum=String(P().company.phone||'').replace(/\D/g,'');const waL=waNum?waLink(waNum,'Bonjour '+(P().company.brand||'FAZA 3D')+', je souhaite un devis pour '):null;
  const media=(socialMedia&&socialMedia.items)||[];
  const cs=connStatus||{};
  sec.innerHTML=`
   <div class="row" style="margin-bottom:12px">${stChip(cs.meta,'Facebook et Instagram')}${stChip(cs.whatsapp,'WhatsApp')}${stChip(cs.email,'E-mail entrant')}${stChip(cs.smtp,'Envoi d’e-mails')}<span class="tag">TikTok : saisie manuelle</span>${isAdmin()?'<button class="lnk" data-go="connexions">Régler les connexions</button>':''}</div>
   <div class="kpis">${kpi}<div class="kpi"><b>${leads.length}</b><span>demandes reçues en 30 jours</span></div></div>
   <div class="grid2">
    <div class="panel chart span2"><h2>Abonnés sur 60 jours</h2>${legend(nets.map(n=>({name:NET_NAMES[n],color:NET_COLORS[n]})))}
     ${lineChart({series:ser.map(s=>({name:NET_NAMES[s.n],color:NET_COLORS[s.n],values:s.values})),labels:days.map(d=>{const x=parseDay(d);return x.getDate()+' '+MONTHS[x.getMonth()].slice(0,4)}),aria:'Abonnés par réseau sur 60 jours'})}
     <p class="note">Facebook et Instagram : relevé automatique toutes les 15 minutes une fois la connexion Meta réglée. TikTok : saisie ci-dessous.</p></div>
    <div class="panel"><h2>D’où viennent les demandes (30 jours)</h2>${srcRows.length?srcRows.map(([s,x])=>`<div class="hbar" data-tip="<b>${esc(s)}</b><br>${x.n} demande(s), ${x.won} gagnée(s)"><span>${esc(s)}</span><div class="tr"><i style="width:${x.n/maxN*100}%"></i></div><span class="r small">${x.n}${x.won?` · ${Math.round(x.won/x.n*100)} %`:''}</span></div>`).join(''):'<p class="empty">Pas encore de demande sur cette période.</p>'}
     <h3>Chiffre d’affaires HT par origine (90 jours)</h3>${caRows.length?caRows.map(([s,v])=>`<div class="hbar" data-tip="<b>${esc(s)}</b><br>${esc(fmt(v,0))} TND HT"><span>${esc(s)}</span><div class="tr"><i style="width:${v/maxCa*100}%;background:var(--amber)"></i></div><span class="r small">${fmt(v,0)}</span></div>`).join(''):'<p class="empty">Renseignez l’origine dans chaque commande pour voir quel réseau rapporte.</p>'}</div>
    <div class="panel"><h2>Saisir des statistiques</h2><form class="inline-form" id="socForm">
      <label>Réseau<select name="network"><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option></select></label>
      <label>Date<input name="day" type="date" value="${dkey(now)}" required></label><label>Abonnés<input name="followers" type="number" min="0" required></label>
      <label>Vues (7 derniers jours)<input name="views" type="number" min="0"></label><label>Interactions (7 jours)<input name="engagement" type="number" min="0"></label>
      <button class="btn primary">Enregistrer</button></form>
      <p class="note">TikTok : profil › menu › Outils pour les créateurs › Statistiques. Une saisie par semaine suffit.</p></div>
    <div class="panel"><h2>Liens à mettre dans vos profils</h2>
      <p class="small ink2">Chaque lien indique d’où vient la demande : elle arrive dans Demandes avec la bonne origine.</p>
      ${[['instagram','Instagram (bio)'],['facebook','Facebook (bouton)'],['tiktok','TikTok (bio)'],['qr','QR code (atelier, cartes)']].map(([s,l])=>`<div class="linkrow"><div class="row between"><b>${l}</b><button class="lnk" data-copy="${esc(base)}?src=${s}">Copier</button></div><code>${esc(base)}?src=${s}</code></div>`).join('')}
       ${waL?`<div class="linkrow"><div class="row between"><b>WhatsApp (clic pour discuter)</b><button class="lnk" data-copy="${esc(waL)}">Copier</button></div><code>${esc(waL.split('?')[0])}</code></div>`:''}
      ${P().company.siteCommande?'':'<p class="note">Ce lien ne marche que dans l’atelier tant que le formulaire public n’est pas ouvert sur internet (voir Connexions › Formulaire public).</p>'}</div>
   </div>
   <div class="panel"><h2>Dernières publications Instagram</h2>${media.length?`<div class="tbl-wrap"><table class="t"><tr><th>Date</th><th>Type</th><th>Légende</th><th class="r">J’aime</th><th class="r">Commentaires</th><th></th></tr>${media.map(m=>`<tr><td>${dday(m.timestamp)}</td><td>${esc({IMAGE:'Photo',VIDEO:'Vidéo',CAROUSEL_ALBUM:'Carrousel'}[m.media_type]||m.media_type||'')}</td><td class="small">${esc(m.caption||'')}</td><td class="r">${m.like_count??'—'}</td><td class="r">${m.comments_count??'—'}</td><td class="r">${m.permalink?`<a href="${esc(m.permalink)}" target="_blank" rel="noopener noreferrer">Voir</a>`:''}</td></tr>`).join('')}</table></div>`:'<p class="empty">Apparaît une fois Instagram relié (compte professionnel lié à la page Facebook).</p>'}</div>`;
  $('#socForm',sec).addEventListener('submit',e=>{e.preventDefault();const f=e.target;const id=`${f.network.value}:${f.day.value}`;const old=DB.social.find(s=>s.id===id);
    const rec={...(old||{}),id,network:f.network.value,day:f.day.value,followers:+f.followers.value,auto:0,by:ME.name};if(f.views.value)rec.views=+f.views.value;if(f.engagement.value)rec.engagement=+f.engagement.value;
    if(old)Object.assign(old,rec);else DB.social.push(rec);save();renderView(true);toast('Statistiques enregistrées')});
  sec.onclick=async e=>{const c=e.target.closest('[data-copy]');if(c){try{await navigator.clipboard.writeText(c.dataset.copy);toast('Lien copié')}catch(err){toast(c.dataset.copy,6000)}}};
 }});

/* ---------------- Finances : fonctions partagées ---------------- */
function planFor(y,m){return PLAN2027[m]*(y<=2027?1:y===2028?1.4:1.75)}
function monthKey(t){const d=new Date(t);return d.getFullYear()*12+d.getMonth()}

$('#clientAcces').addEventListener('click',async()=>{if(!editingClient)return;if(!(editingClient.phone||editingClient.email))return toast('Renseignez un téléphone ou un e-mail avant de créer l’accès.');
  if(!confirm('Créer ou réinitialiser l’accès de ce client à son espace sur le site ? L’ancien mot de passe ne marchera plus.'))return;
  try{const r=await api(`/api/clients/${encodeURIComponent(editingClient.id)}/acces`,{method:'POST',body:{}});const site=(DB.params?.site?.url||'https://faza3d.tn').replace(/\/+$/,'');
    const txt=`Bonjour ${editingClient.name},\nVotre espace client FAZA 3D : ${site}/#espace\nIdentifiant : ${r.login}\nMot de passe temporaire : ${r.password}\nVous pourrez le changer après connexion.`;
    copyText(txt,'Accès créé : message copié, collez-le dans WhatsApp ou un e-mail');}catch(e){toast(e.message||'Erreur')}});
