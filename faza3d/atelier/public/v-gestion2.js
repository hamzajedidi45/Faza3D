'use strict';
/* =====================================================================
   Entretien des machines, achats fournisseurs, dépenses et trésorerie, rapports mensuels
   ===================================================================== */

/* ---------------- Entretien ---------------- */
const MAINT_TASKS={
 printer:[{id:'plateau',name:'Nettoyage du plateau',key:'plateau'},{id:'buse',name:'Contrôle ou remplacement de la buse',key:'buse'},{id:'axes',name:'Graissage des axes et courroies',key:'axes'},{id:'ventilateurs',name:'Nettoyage ventilateurs et filtre',key:'ventilateurs'}],
 laser:[{id:'laserOptique',name:'Nettoyage lentille et miroirs',key:'laserOptique'},{id:'laserRails',name:'Rails, courroies et pompe à eau',key:'laserRails'}]};
function machines(){return [...P().printers.map(p=>({id:p.id,name:p.name,kind:'printer'})),{id:'laser',name:P().laser.name,kind:'laser'}]}
function machineHours(id){if(id==='laser')return null;const s=LIVE[id];return s&&s.configured&&s.hours!=null?s.hours:null}
function maintStatus(){
  const out=[];
  for(const m of machines()){
    const hours=machineHours(m.id);
    for(const t of MAINT_TASKS[m.kind]){
      const interval=+P().maintenance[t.key]||0;if(!interval)continue;
      const last=DB.maintenance.filter(x=>x.machine===m.id&&x.task===t.id).sort((a,b)=>b.at-a.at)[0];
      let ratio=null,label='';
      if(m.kind==='printer'&&hours!=null){const base=last?+last.hours||0:0;const used=Math.max(0,hours-base);ratio=used/interval;label=`${fmt(used,0)} h sur ${interval} h`}
      else{const days=last?(Date.now()-last.at)/D:null;const everyDays=m.kind==='laser'?Math.round(interval/4):Math.round(interval/8);ratio=days==null?1:days/everyDays;label=last?`il y a ${Math.round(days)} j (tous les ${everyDays} j)`:`jamais fait (tous les ${everyDays} j)`}
      out.push({m,t,ratio,label,last,due:ratio>=1,soon:ratio>=0.8});
    }
  }
  return out;
}
function renderMaint(box){
  const st=maintStatus();
  const due=st.filter(x=>x.due).length;
  box.innerHTML=`<div class="row between"><h2>Entretien des machines${due?` <span class="badge">${due}</span>`:''}</h2><button class="btn small primary" id="maintAdd">Entretien effectué</button></div>
   <p class="small ink2">Compteur d’heures d’impression pour les imprimantes reliées, calendrier pour le laser et les machines non reliées. Intervalles réglables dans Paramètres.</p>
   <div class="grid3" style="margin-top:8px">${machines().map(m=>`<div><h3 style="margin:6px 0">${esc(m.name)}${m.kind==='printer'&&machineHours(m.id)!=null?` <span class="muted small">· ${fmt(machineHours(m.id),0)} h au total</span>`:''}</h3>${st.filter(x=>x.m.id===m.id).map(x=>`<div class="maint ${x.due?'due':''}"><span>${esc(x.t.name)}${x.due?' <span class="tag bad">à faire</span>':x.soon?' <span class="tag warn">bientôt</span>':''}</span><span class="small muted">${esc(x.label)}</span><div class="prog"><i style="width:${Math.min(100,Math.round((x.ratio||0)*100))}%"></i></div></div>`).join('')}</div>`).join('')}</div>
   ${DB.maintenance.length?`<h3>Historique</h3><table class="t">${[...DB.maintenance].sort((a,b)=>b.at-a.at).slice(0,10).map(x=>{const m=machines().find(y=>y.id===x.machine),t=[...MAINT_TASKS.printer,...MAINT_TASKS.laser].find(y=>y.id===x.task);return `<tr><td>${dday(x.at)}</td><td>${esc(m?m.name:x.machine)}</td><td>${esc(t?t.name:x.task)}${x.notes?`<div class="small muted">${esc(x.notes)}</div>`:''}</td><td>${esc(x.by||'')}</td></tr>`}).join('')}</table>`:''}`;
  $('#maintAdd',box).onclick=()=>openMaint();
}
function openMaint(){
  const f=$('#maintForm');setOpts(f.machine,optList(machines()));f.date.value=dkey(Date.now());f.cost.value=0;f.notes.value='';
  const fill=()=>{const m=machines().find(x=>x.id===f.machine.value);setOpts(f.task,optList(MAINT_TASKS[m?m.kind:'printer']))};fill();f.machine.onchange=fill;
  $('#maintDlg').showModal();
}
$('#maintDlg').addEventListener('close',()=>{if($('#maintDlg').returnValue!=='ok')return;const f=$('#maintForm');
  const rec={id:uid('mt'),at:parseDay(f.date.value).getTime()+12*H,machine:f.machine.value,task:f.task.value,hours:machineHours(f.machine.value)||0,by:ME.name,notes:f.notes.value,cost:+f.cost.value||0};
  DB.maintenance.push(rec);
  if(rec.cost>0&&isAdmin()){const m=machines().find(x=>x.id===rec.machine);DB.expenses.push({id:uid('e'),at:rec.at,category:'Entretien et pièces',label:`Entretien ${m?m.name:''} : ${[...MAINT_TASKS.printer,...MAINT_TASKS.laser].find(t=>t.id===rec.task)?.name||rec.task}`,supplier:'',amount:rec.cost,vat:19,paid:true,mode:'Espèces',by:ME.name})}
  save();renderSoon();toast('Entretien enregistré')});
function maintAlerts(){return maintStatus().filter(x=>x.due).map(x=>`<b>${esc(x.m.name)}</b> : ${esc(x.t.name.toLowerCase())} à faire (${esc(x.label)})`)}

/* ---------------- Achats fournisseurs ---------------- */
let purDraft=null,purOrig=null;
const PUR_STATUS={brouillon:['Brouillon',''],envoye:['Envoyé','warn'],recu:['Reçu','ok']};
function purTotal(a){return (a.lines||[]).reduce((s,l)=>s+(+l.qty||0)*(+l.pu||0),0)}
function lowLines(){return lowStock().map(s=>({stockId:s.id,label:s.name,unit:s.kind==='fil'?'kg':s.kind==='plaque'?'m²':'u.',qty:s.kind==='fil'?Math.max(1,Math.ceil((3*(+s.min)-(+s.qty))/1000)):+(Math.max(0.5,3*(+s.min)-(+s.qty))).toFixed(1),pu:priceGuess(s)}))}
function priceGuess(s){const m=(P().materials||[]).find(x=>x.id===s.ref);if(m&&s.kind==='fil')return m.kg;const sh=(P().sheets||[]).find(x=>x.id===s.ref);if(sh&&s.kind==='plaque')return sh.m2;return 0}
function openPurchase(a,preset={}){
  purOrig=a;purDraft=a?clone(a):{id:uid('a'),no:'',supplier:clone((P().suppliers||[])[0]||{name:''}),at:Date.now(),status:'brouillon',vat:19,lines:preset.fromLow?lowLines():[],notes:'',createdBy:ME.name};
  if(!purDraft.lines.length)purDraft.lines.push({label:'',qty:1,unit:'kg',pu:0});
  const f=$('#purForm');setOpts(f.supplier,optList((P().suppliers||[]).map(s=>({id:s.id,name:s.name})),(purDraft.supplier||{}).id||''));
  f.status.value=purDraft.status;f.vat.value=purDraft.vat??19;f.notes.value=purDraft.notes||'';
  $('#purTitle').textContent=purDraft.no?`Bon de commande ${purDraft.no}`:'Nouveau bon de commande';
  renderPur();$('#purDlg').showModal();
}
function renderPur(){
  const a=purDraft,[sl,sc]=PUR_STATUS[a.status]||PUR_STATUS.brouillon;$('#purStatus').textContent=sl;$('#purStatus').className='tag '+sc;
  $('#purLines').innerHTML='<tr><th style="width:45%">Article</th><th>Stock lié</th><th class="r">Qté</th><th>Unité</th><th class="r">P.U. HT</th><th class="r">Total</th><th></th></tr>'+a.lines.map((l,i)=>`<tr>
   <td><input data-pl="${i}" data-k="label" value="${esc(l.label)}"></td><td><select data-pl="${i}" data-k="stockId">${optList(DB.stock.map(s=>({id:s.id,name:s.name})),l.stockId||'','—')}</select></td>
   <td><input data-pl="${i}" data-k="qty" type="number" min="0" step="any" value="${esc(l.qty)}" style="text-align:right;max-width:80px"></td><td><input data-pl="${i}" data-k="unit" value="${esc(l.unit||'')}" style="max-width:60px"></td>
   <td><input data-pl="${i}" data-k="pu" type="number" min="0" step="0.001" value="${esc(l.pu)}" style="text-align:right;max-width:100px"></td><td class="r" data-plt="${i}">${fmt((+l.qty||0)*(+l.pu||0),3)}</td><td><button type="button" class="lnk badc" data-pdel="${i}">✕</button></td></tr>`).join('');
  $('#purTotal').textContent='Total HT : '+fmt(purTotal(a),3)+' TND';
  $('#purRecu').disabled=a.status==='recu';
}
$('#purLines').addEventListener('input',e=>{const el=e.target.closest('[data-pl]');if(!el)return;const l=purDraft.lines[+el.dataset.pl];l[el.dataset.k]=['qty','pu'].includes(el.dataset.k)?num(el.value):el.value;$(`[data-plt="${el.dataset.pl}"]`).textContent=fmt((+l.qty||0)*(+l.pu||0),3);$('#purTotal').textContent='Total HT : '+fmt(purTotal(purDraft),3)+' TND'});
$('#purLines').addEventListener('change',e=>{const el=e.target.closest('select[data-pl]');if(!el)return;const l=purDraft.lines[+el.dataset.pl];l.stockId=el.value;const s=DB.stock.find(x=>x.id===el.value);if(s&&!l.label){l.label=s.name;l.unit=s.kind==='fil'?'kg':s.kind==='plaque'?'m²':'u.';l.pu=priceGuess(s);renderPur()}});
$('#purLines').addEventListener('click',e=>{const b=e.target.closest('[data-pdel]');if(!b)return;purDraft.lines.splice(+b.dataset.pdel,1);if(!purDraft.lines.length)purDraft.lines.push({label:'',qty:1,unit:'kg',pu:0});renderPur()});
$('#purAdd').addEventListener('click',()=>{purDraft.lines.push({label:'',qty:1,unit:'kg',pu:0});renderPur()});
$('#purLow').addEventListener('click',()=>{purDraft.lines=purDraft.lines.filter(l=>l.label||l.pu);for(const l of lowLines())if(!purDraft.lines.some(x=>x.stockId===l.stockId))purDraft.lines.push(l);if(!purDraft.lines.length)purDraft.lines.push({label:'',qty:1,unit:'kg',pu:0});renderPur()});
function commitPurchase(){
  const f=$('#purForm'),a=purDraft;const sup=(P().suppliers||[]).find(s=>s.id===f.supplier.value);
  Object.assign(a,{supplier:sup?clone(sup):a.supplier,status:f.status.value,vat:+f.vat.value||0,notes:f.notes.value});
  a.lines=a.lines.filter(l=>String(l.label).trim());if(!a.lines.length){toast('Ajoutez au moins une ligne.');return null}
  a.total=+purTotal(a).toFixed(3);
  if(a.status==='envoye'&&!a.sentAt)a.sentAt=Date.now();
  if(purOrig)Object.assign(purOrig,a);else{DB.purchases.push(a);purOrig=a}
  purDraft=clone(purOrig);save();return purOrig;
}
function receivePurchase(a){
  if(a.status==='recu')return;
  for(const l of a.lines){const s=DB.stock.find(x=>x.id===l.stockId);if(!s)continue;const q=+l.qty||0;s.qty=+(+s.qty+(s.kind==='fil'&&/kg/i.test(l.unit||'kg')?q*1000:q)).toFixed(3)}
  a.status='recu';a.receivedAt=Date.now();a.receivedBy=ME.name;
  if(isAdmin()&&!DB.expenses.some(e=>e.purchaseId===a.id)){const ttc=a.total*(1+(+a.vat||0)/100);DB.expenses.push({id:uid('e'),at:Date.now(),category:'Matières (filament, plaques)',label:`Bon de commande ${a.no} · ${(a.supplier||{}).name||''}`,supplier:(a.supplier||{}).name||'',amount:+ttc.toFixed(3),vat:+a.vat||0,paid:false,mode:'Virement',purchaseId:a.id,by:ME.name})}
}
$('#purDlg').addEventListener('close',()=>{if($('#purDlg').returnValue==='ok'){if(commitPurchase()){renderSoon();toast('Bon de commande enregistré')}else setTimeout(()=>$('#purDlg').showModal(),50)}});
$('#purDel').addEventListener('click',()=>{if(!purOrig){$('#purDlg').close('cancel');return}if(purOrig.status==='recu')return toast('Un bon reçu ne se supprime pas.');if(confirmAct('Supprimer ce bon de commande ?')){DB.purchases=DB.purchases.filter(x=>x!==purOrig);purOrig=null;$('#purDlg').close('cancel');save();renderSoon()}});
$('#purPdf').addEventListener('click',()=>{let a=null;openPdf(()=>`/api/achats/${encodeURIComponent(a.id)}/pdf`,async()=>{a=commitPurchase();if(!a)throw new Error('Complétez le bon avant le PDF.');await flush();await pull()})});
$('#purMail').addEventListener('click',async()=>{const a=commitPurchase();if(!a)return;await flush();await pull();const x=DB.purchases.find(y=>y.id===a.id)||a;$('#purDlg').close('cancel');
  mailDialog({to:(x.supplier||{}).email||'',subject:`Bon de commande ${x.no} · ${P().company.brand||'FAZA 3D'}`,text:`Bonjour,\n\nVeuillez trouver ci-joint notre bon de commande ${x.no} :\n${x.lines.map(l=>`- ${l.label} : ${l.qty} ${l.unit||''}`).join('\n')}\n\nMerci de confirmer la disponibilité et le délai.\n\nCordialement,\n${ME.name}\n${P().company.brand||'FAZA 3D'}${P().company.phone?'\n'+P().company.phone:''}`,attach:{kind:'bon',id:x.id},label:`Bon de commande ${x.no} (PDF)`,onSent:()=>{const y=DB.purchases.find(z=>z.id===x.id);if(y&&y.status==='brouillon'){y.status='envoye';y.sentAt=Date.now();save()}}})});
$('#purRecu').addEventListener('click',()=>{$('#purForm').status.value='recu';const a=commitPurchase();if(!a)return;receivePurchase(a);save();$('#purDlg').close('cancel');renderSoon();toast('Stock mis à jour'+(isAdmin()?' et dépense créée (à marquer payée dans Finances)':''))});
document.addEventListener('click',e=>{const b=e.target.closest('[data-purchase]');if(!b||!DB)return;const a=DB.purchases.find(x=>x.id===b.dataset.purchase);if(a)openPurchase(a)});
view({id:'achats',title:'Achats fournisseurs',group:'Production',icon:'stock',roles:['admin','commercial'],before:'qualite',
 badge:()=>DB.purchases.filter(a=>a.status==='envoye').length,
 render(sec){
  const list=[...DB.purchases].sort((a,b)=>(b.at||0)-(a.at||0));
  const low=lowStock();
  sec.innerHTML=`<div class="sec-h"><p class="ink2">${low.length?`${low.length} matière${low.length>1?'s':''} sous le seuil : ${low.map(s=>esc(s.name)).join(', ')}.`:'Aucune matière sous le seuil.'}</p><div class="row"><a class="btn" href="/api/export/purchases.csv">Exporter (Excel)</a><button class="btn primary" id="purNew">Nouveau bon de commande</button></div></div>
   <div class="panel"><div class="tbl-wrap"><table class="t"><tr><th>Numéro</th><th>Fournisseur</th><th>Date</th><th>Contenu</th><th class="r">Total HT</th><th>Statut</th><th></th></tr>
    ${list.length?list.map(a=>{const [sl,sc]=PUR_STATUS[a.status]||PUR_STATUS.brouillon;return `<tr class="click" data-purchase="${esc(a.id)}"><td><b>${esc(a.no||'…')}</b></td><td>${esc((a.supplier||{}).name||'')}</td><td>${dday(a.at)}</td><td class="small">${esc((a.lines||[]).map(l=>`${l.label} × ${l.qty}`).join(', ').slice(0,90))}</td><td class="r">${fmt(a.total,3)}</td><td><span class="tag ${sc}">${sl}</span>${a.receivedAt?` <span class="small muted">${dday(a.receivedAt)}</span>`:''}</td><td class="r"><button class="lnk" data-ppdf="${esc(a.id)}">PDF</button></td></tr>`}).join(''):'<tr><td colspan="7" class="empty">Aucun bon de commande. Le bouton « Préparer un bon de commande » du Stock pré-remplit les matières sous le seuil.</td></tr>'}</table></div></div>
   <div class="panel"><h2>Fournisseurs</h2><table class="t">${(P().suppliers||[]).map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a>`:''}</td><td>${esc(s.email||'')} ${esc(s.phone||'')}</td></tr>`).join('')}</table><p class="note">Fournisseurs modifiables dans Paramètres › Fournisseurs.</p></div>`;
  $('#purNew',sec).onclick=()=>openPurchase(null);
  sec.onclick=e=>{const p=e.target.closest('[data-ppdf]');if(p){e.stopPropagation();openPdf(`/api/achats/${encodeURIComponent(p.dataset.ppdf)}/pdf`)}};
 }});

/* ---------------- Dépenses ---------------- */
let editingExp=null;
function openExpense(x,preset={}){
  editingExp=x;const f=$('#expForm');$('#expTitle').textContent=x?'Dépense':'Nouvelle dépense';
  setOpts(f.category,optList(EXP_CATS));setOpts(f.mode,optList(PAY_MODES.filter(m=>m!=='Retenue à la source')));
  $('#supList').innerHTML=[...new Set([...(P().suppliers||[]).map(s=>s.name),...DB.expenses.map(e=>e.supplier).filter(Boolean)])].map(s=>`<option value="${esc(s)}">`).join('');
  f.date.value=dkey(x?x.at:Date.now());f.category.value=x?.category||preset.category||EXP_CATS[0];f.label.value=x?.label||preset.label||'';f.supplier.value=x?.supplier||'';f.amount.value=x?.amount??'';f.vat.value=x?.vat??19;f.mode.value=x?.mode||'Espèces';f.paid.checked=x?!!x.paid:true;f.notes.value=x?.notes||'';
  $('#expDel').hidden=!x;$('#expDlg').showModal();
}
$('#expDlg').addEventListener('close',()=>{if($('#expDlg').returnValue!=='ok')return;const f=$('#expForm');
  const d={at:parseDay(f.date.value).getTime()+12*H,category:f.category.value,label:f.label.value.trim(),supplier:f.supplier.value.trim(),amount:+f.amount.value||0,vat:+f.vat.value||0,mode:f.mode.value,paid:f.paid.checked,notes:f.notes.value};
  if(editingExp)Object.assign(editingExp,d);else DB.expenses.push({id:uid('e'),...d,by:ME.name});
  save();renderSoon();toast('Dépense enregistrée')});
$('#expDel').addEventListener('click',()=>{if(editingExp&&confirmAct('Supprimer cette dépense ?')){DB.expenses=DB.expenses.filter(x=>x!==editingExp);editingExp=null;$('#expDlg').close('cancel');save();renderSoon()}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-exp]');if(!b||!DB)return;const x=DB.expenses.find(y=>y.id===b.dataset.exp);if(x)openExpense(x)});

/* ---------------- Finances : calculs ---------------- */
const PLAN_ROWS=[{ca:2500,var:750,fixed:1900,sal:0,cash:4200},{ca:3500,var:1050,fixed:1900,sal:0,cash:5050},{ca:4000,var:1200,fixed:1900,sal:0,cash:6400},{ca:4500,var:1350,fixed:1900,sal:0,cash:8100},{ca:6000,var:1800,fixed:1900,sal:2243,cash:7707},{ca:8000,var:2400,fixed:1900,sal:2243,cash:8564},{ca:6500,var:1950,fixed:1900,sal:2243,cash:9421},{ca:4000,var:1200,fixed:1900,sal:2243,cash:8828},{ca:5500,var:1650,fixed:1900,sal:2243,cash:8085},{ca:6000,var:1800,fixed:1900,sal:2243,cash:7992},{ca:6500,var:1950,fixed:1900,sal:2243,cash:8249},{ca:8500,var:2550,fixed:1900,sal:2243,cash:9456}];
function planRow(y,m){const r=PLAN_ROWS[m],k=y<=2027?1:y===2028?1.4:1.75;return {ca:r.ca*k,charges:(r.var+r.fixed+r.sal)*k,cash:y===2027?r.cash:null}}
const expHT=e=>(+e.amount||0)/(1+(+e.vat||0)/100);
function monthFin(kk){
  const yy=Math.floor(kk/12),mm=kk%12,a=new Date(yy,mm,1).getTime(),b=new Date(yy,mm+1,1).getTime(),inM=t=>t>=a&&t<b;
  const ca=DB.orders.filter(o=>stageOf(o)==='done'&&o.price&&inM(enteredAt(o))).reduce((s,o)=>s+htOf(o),0);
  const avoirs=DB.orders.filter(o=>o.creditNote&&inM(o.creditNote.at)).reduce((s,o)=>s+(+o.creditNote.amount||0)/(1+P().rates.vat/100),0);
  const exp=DB.expenses.filter(e=>inM(e.at));
  const dep=exp.reduce((s,e)=>s+expHT(e),0);
  const enc=DB.orders.flatMap(o=>o.payments||[]).filter(p=>inM(p.at)&&p.mode!=='Retenue à la source').reduce((s,p)=>s+(+p.amount||0),0);
  const rs=DB.orders.flatMap(o=>o.payments||[]).filter(p=>inM(p.at)&&p.mode==='Retenue à la source').reduce((s,p)=>s+(+p.amount||0),0);
  const dec=exp.filter(e=>e.paid).reduce((s,e)=>s+(+e.amount||0),0);
  const byCat={};for(const e of exp)byCat[e.category||'Autre']=(byCat[e.category||'Autre']||0)+expHT(e);
  return {yy,mm,ca:ca-avoirs,dep,res:ca-avoirs-dep,enc,dec,rs,byCat,plan:planRow(yy,mm)};
}
function cashSeries(n=12){
  const F=P().finance,k0=monthKey(Date.now());let start=F.dateDepart?monthKey(parseDay(F.dateDepart).getTime()):k0-n+1;
  const first=Math.min(start,k0-n+1);let cash=+F.tresorerieDepart||0;const out=[];
  for(let kk=first;kk<=k0;kk++){const m=monthFin(kk);if(kk>=start)cash+=m.enc-m.dec;out.push({...m,cash:kk>=start?cash:null})}
  return out.slice(-n);
}
let finTab='mois';
view({id:'finances',title:'Finances',group:'Gestion',icon:'money',roles:['admin'],before:'base',
 render(sec){
  const k=monthKey(Date.now()),cur=monthFin(k),prev=monthFin(k-1),y=new Date().getFullYear(),m=new Date().getMonth();
  const dueAll=DB.orders.reduce((a,o)=>a+Math.max(0,(+o.price||0)-paid(o)),0);
  const unpaidExp=DB.expenses.filter(e=>!e.paid).reduce((s,e)=>s+(+e.amount||0),0);
  const palier=monthFin(k-1).ca>=7500&&monthFin(k-2).ca>=7500;
  const series=cashSeries(12);
  const tabs=[['mois','Résultat du mois'],['tresorerie','Trésorerie'],['depenses','Dépenses'],['encaissements','Encaissements et factures'],['rapports','Rapports mensuels']];
  sec.innerHTML=`<div class="kpis">
    <div class="kpi"><b>${fmt(cur.ca,0)} TND</b><span>CA HT livré en ${MONTHS[m]}</span></div>
    <div class="kpi ${cur.ca>=cur.plan.ca?'good':''}"><b>${Math.round(cur.ca/cur.plan.ca*100)} %</b><span>du plan (${fmt(cur.plan.ca,0)} TND)</span></div>
    <div class="kpi"><b>${fmt(cur.dep,0)} TND</b><span>dépenses HT du mois</span></div>
    <div class="kpi ${cur.res<0?'alert':'good'}"><b>${cur.res>=0?'+':''}${fmt(cur.res,0)} TND</b><span>résultat du mois (avant impôts)</span></div>
    <div class="kpi ${series.at(-1).cash!=null&&series.at(-1).cash<3000?'alert':''}"><b>${series.at(-1).cash!=null?fmt(series.at(-1).cash,0)+' TND':'—'}</b><span>trésorerie estimée</span></div>
    <div class="kpi ${dueAll>0?'alert':''}"><b>${fmt(dueAll,0)} TND</b><span>reste à encaisser (clients)</span></div>
    <div class="kpi ${palier?'good':''}"><b>${palier?'Débloqué':'Pas encore'}</b><span>palier 2 des salaires</span></div></div>
   <div class="tabs" role="tablist">${tabs.map(([id,l])=>`<button role="tab" data-ftab="${id}" aria-selected="${finTab===id}">${l}</button>`).join('')}</div>
   <div id="finBody"></div>`;
  sec.onclick=e=>{const t=e.target.closest('[data-ftab]');if(t){finTab=t.dataset.ftab;renderView(true)}};
  const body=$('#finBody',sec);
  if(finTab==='mois'){
    const months=[];for(let i=5;i>=0;i--)months.push(monthFin(k-i));
    body.innerHTML=`<div class="grid2"><div class="panel chart"><h2>Chiffre d’affaires et dépenses HT, 6 mois</h2>${legend([{name:'CA HT livré',color:'var(--teal)'},{name:'Dépenses HT',color:'var(--s2)'},{name:'CA prévu au plan',color:'var(--mut)'}])}
      ${lineChart({series:[{name:'CA HT',color:'var(--teal)',values:months.map(x=>x.ca)},{name:'Dépenses HT',color:'var(--s2)',values:months.map(x=>x.dep)},{name:'Plan',color:'var(--mut)',values:months.map(x=>x.plan.ca)}],labels:months.map(x=>MONTHS[x.mm].slice(0,4)+'. '+String(x.yy).slice(2)),aria:'CA et dépenses sur 6 mois'})}</div>
     <div class="panel"><h2>${MONTHS[m]} ${y} en détail</h2><table class="t"><tr><td>CA HT livré (factures moins avoirs)</td><td class="r"><b>${fmt(cur.ca,0)}</b></td><td class="r muted small">plan ${fmt(cur.plan.ca,0)}</td></tr>
      ${Object.entries(cur.byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td class="small">${esc(c)}</td><td class="r">-${fmt(v,0)}</td><td></td></tr>`).join('')}
      <tr><td><b>Total dépenses HT</b></td><td class="r"><b>-${fmt(cur.dep,0)}</b></td><td class="r muted small">plan ${fmt(cur.plan.charges,0)}</td></tr>
      <tr><td><b>Résultat avant impôts</b></td><td class="r"><b class="${cur.res<0?'badc':'okc'}">${cur.res>=0?'+':''}${fmt(cur.res,0)}</b></td><td class="r muted small">plan ${fmt(cur.plan.ca-cur.plan.charges,0)}</td></tr>
      <tr><td class="small muted">Mois précédent : CA ${fmt(prev.ca,0)}, dépenses ${fmt(prev.dep,0)}, résultat ${prev.res>=0?'+':''}${fmt(prev.res,0)}</td><td></td><td></td></tr></table>
      ${(()=>{const hReal=machineHoursOfMonth(k),mh=machineHoursUsed(),used=fixedRate(),real=hReal>0?fixedMonthTotal()/hReal:null;const bad=real!=null&&real>used*1.25;
        return `<div class="panel2" style="margin-top:10px;padding:10px 12px;border-radius:9px;background:var(--panel2)"><b>Frais fixes par heure machine</b><div class="small ink2">Dans les devis : <b>${fmt(used)} TND/h</b> (${fmt(fixedMonthTotal(),0)} TND ÷ ${fmt(mh.hours,0)} h ${mh.real?'réelles':'prévues'}). Ce mois-ci : <b class="${bad?'badc':'okc'}">${real!=null?fmt(real)+' TND/h':'—'}</b> pour ${fmt(hReal,0)} h machine livrées.${bad?' <span class="badc">Les devis sous-estiment les frais fixes : augmentez le taux ou remplissez les machines.</span>':''}</div></div>`})()}
      <p class="note">Résultat indicatif (hors amortissements et impôts). Le plan vient du dossier : CA et charges mensuels 2027, puis +40 % en 2028 et +75 % en 2029.</p></div></div>`;
  }else if(finTab==='tresorerie'){
    const hasPlan=series.some(x=>x.plan.cash!=null);
    body.innerHTML=`<div class="grid2"><div class="panel chart"><h2>Trésorerie estimée, 12 mois</h2>${legend([{name:'Trésorerie (encaissé − décaissé)',color:'var(--teal)'},...(hasPlan?[{name:'Plan 2027',color:'var(--mut)'}]:[])])}
      ${lineChart({series:[{name:'Trésorerie',color:'var(--teal)',values:series.map(x=>x.cash)},...(hasPlan?[{name:'Plan',color:'var(--mut)',values:series.map(x=>x.plan.cash)}]:[])],labels:series.map(x=>MONTHS[x.mm].slice(0,4)+'. '+String(x.yy).slice(2)),aria:'Trésorerie sur 12 mois'})}
      <p class="note">Point de départ : ${fmt(P().finance.tresorerieDepart,0)} TND${P().finance.dateDepart?' au '+esc(P().finance.dateDepart):''} (Paramètres › Finances). Chaque mois : + paiements clients encaissés − dépenses marquées payées.</p></div>
     <div class="panel"><h2>Ce mois-ci</h2><table class="t"><tr><td>Encaissé (clients)</td><td class="r okc">+${fmt(cur.enc,0)}</td></tr><tr><td>Décaissé (dépenses payées)</td><td class="r badc">-${fmt(cur.dec,0)}</td></tr><tr><td>Retenue à la source subie</td><td class="r">${fmt(cur.rs,3)}</td></tr><tr><td><b>Variation</b></td><td class="r"><b>${cur.enc-cur.dec>=0?'+':''}${fmt(cur.enc-cur.dec,0)}</b></td></tr></table>
      <h3>À venir</h3><table class="t"><tr><td>Reste à encaisser (clients)</td><td class="r okc">+${fmt(dueAll,0)}</td></tr><tr><td>Dépenses pas encore payées</td><td class="r badc">-${fmt(unpaidExp,0)}</td></tr></table>
      <h3>Retenue à la source</h3><p class="small ink2">Total retenu par les clients cette année : <b>${fmt(DB.orders.flatMap(o=>o.payments||[]).filter(p=>p.mode==='Retenue à la source'&&new Date(p.at).getFullYear()===y).reduce((s,p)=>s+(+p.amount||0),0),3)} TND</b>. Conservez les attestations de retenue : elles se déduisent de l’impôt sur les sociétés (à voir avec le comptable).</p></div></div>`;
  }else if(finTab==='depenses'){
    const list=[...DB.expenses].sort((a,b)=>b.at-a.at).slice(0,100);
    body.innerHTML=`<div class="sec-h"><p class="ink2">${DB.expenses.length} dépense${DB.expenses.length>1?'s':''} · ${fmt(unpaidExp,0)} TND pas encore payées</p><div class="row"><a class="btn" href="/api/export/expenses.csv">Exporter (Excel)</a><button class="btn primary" id="expNew">Nouvelle dépense</button></div></div>
     <div class="panel"><div class="tbl-wrap"><table class="t"><tr><th>Date</th><th>Catégorie</th><th>Libellé</th><th>Fournisseur</th><th class="r">TTC</th><th>Mode</th><th></th></tr>
      ${list.length?list.map(e=>`<tr class="click" data-exp="${esc(e.id)}"><td>${dday(e.at)}</td><td class="small">${esc(e.category||'')}</td><td>${esc(e.label)}</td><td class="small">${esc(e.supplier||'')}</td><td class="r">${fmt(e.amount,3)}</td><td class="small">${esc(e.mode||'')}</td><td>${e.paid?'<span class="tag ok">payée</span>':'<span class="tag warn">à payer</span>'}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Aucune dépense. Ajoutez le loyer, les matières, l’électricité, les salaires… pour connaître le vrai résultat.</td></tr>'}</table></div></div>`;
    $('#expNew',body).onclick=()=>openExpense(null);
  }else if(finTab==='encaissements'){
    const due=DB.orders.filter(o=>(+o.price||0)-paid(o)>0.01).sort((a,b)=>((+b.price-paid(b))-(+a.price-paid(a))));
    const pays=DB.orders.flatMap(o=>(o.payments||[]).map(p=>({...p,o}))).sort((a,b)=>b.at-a.at).slice(0,15);
    const invs=DB.orders.filter(o=>o.invoice).sort((a,b)=>b.invoice.at-a.invoice.at).slice(0,20);
    body.innerHTML=`<div class="grid2"><div class="panel"><h2>Reste à encaisser</h2><table class="t"><tr><th>Commande</th><th>Étape</th><th class="r">Reste TTC</th><th></th></tr>${due.length?due.map(o=>`<tr><td><b>${esc(o.client)}</b><br><span class="muted small">${esc(o.id)} · ${esc(o.product)}</span></td><td>${stageName(stageOf(o))}</td><td class="r"><b>${fmt(+o.price-paid(o),3)}</b></td><td class="r"><button class="lnk" data-edit="${esc(o.id)}">Encaisser</button></td></tr>`).join(''):'<tr><td colspan="4" class="empty">Tout est encaissé.</td></tr>'}</table></div>
     <div class="panel"><h2>Derniers paiements</h2><table class="t"><tr><th>Date</th><th>Client</th><th>Mode</th><th class="r">Montant</th></tr>${pays.length?pays.map(p=>`<tr><td>${dday(p.at)}</td><td>${esc(p.o.client)} · ${esc(p.o.id)}</td><td>${esc(p.mode)}</td><td class="r">${fmt(p.amount,3)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">Aucun paiement enregistré.</td></tr>'}</table></div>
     <div class="panel" style="grid-column:1/-1"><div class="row between"><h2>Factures et avoirs</h2><a class="btn small" href="/api/export/orders.csv">Exporter les commandes (Excel)</a></div><table class="t"><tr><th>Facture</th><th>Client</th><th>Date</th><th class="r">TTC</th><th>Avoir</th><th></th></tr>${invs.length?invs.map(o=>`<tr><td><b>${esc(o.invoice.no)}</b></td><td>${esc(o.client)}</td><td>${dday(o.invoice.at)}</td><td class="r">${fmt((+o.price||0)+(+P().rates.timbre||0),3)}</td><td>${o.creditNote?`<span class="tag warn">${esc(o.creditNote.no)} · ${fmt(o.creditNote.amount,3)}</span> <button class="lnk" data-avoirpdf="${esc(o.id)}">PDF</button>`:''}</td><td class="r"><button class="lnk" data-inv="${esc(o.id)}">PDF</button> <button class="lnk" data-edit="${esc(o.id)}">Ouvrir</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Aucune facture.</td></tr>'}</table></div></div>`;
    body.onclick=e=>{const b=e.target.closest('[data-inv]');if(b)openPdf(`/api/orders/${encodeURIComponent(b.dataset.inv)}/facture.pdf`);const a=e.target.closest('[data-avoirpdf]');if(a)openPdf(`/api/orders/${encodeURIComponent(a.dataset.avoirpdf)}/avoir.pdf`)};
  }else if(finTab==='rapports'){
    body.innerHTML='<p class="empty">Chargement…</p>';
    api('/api/rapports').then(list=>{
      const opts=[];for(let i=0;i<24;i++){const kk=k-i;opts.push({id:`${Math.floor(kk/12)}-${kk%12}`,name:`${MONTHS[kk%12]} ${Math.floor(kk/12)}`})}
      body.innerHTML=`<div class="grid2"><div class="panel"><h2>Rapport mensuel automatique</h2><p class="small ink2">Le 1er de chaque mois, la plateforme crée le rapport du mois écoulé (CA, dépenses, résultat, demandes, réseaux, atelier) et l’envoie par e-mail aux associés si l’envoi d’e-mails est réglé.</p>
        <label class="mt">Adresses des associés (séparées par des virgules)<input id="rapMails" value="${esc(P().company.rapportEmails||'')}" placeholder="hamza@…, fatma@…"></label>
        <div class="row mt"><select id="rapMonth" style="width:auto">${optList(opts)}</select><button class="btn primary" id="rapGen">Générer maintenant</button><label class="chk"><input type="checkbox" id="rapSend"> et envoyer</label></div></div>
       <div class="panel"><h2>Rapports et fichiers Excel</h2><p class="small ink2">Chaque mois : le rapport PDF et un classeur Excel avec toutes les données du mois (commandes, paiements, factures et avoirs, dépenses, devis, demandes, clients, achats, stock, échecs et entretien, réseaux, tâches).</p>
        <div class="row" style="margin:8px 0"><a class="btn primary" href="/api/export/mois.xlsx">Excel du mois en cours</a></div>
        <table class="t"><tr><th>Mois</th><th class="r">Fichiers</th></tr>${(()=>{const by={};for(const r of list){const k=r.name.replace(/^(rapport|donnees)-/,'').replace(/\.(pdf|xlsx)$/,'');(by[k]=by[k]||[]).push(r)}const ks=Object.keys(by).sort().reverse();return ks.length?ks.map(k=>`<tr><td>${esc(k)}</td><td class="r">${by[k].map(r=>r.name.endsWith('.xlsx')?`<a href="/api/rapports/${esc(r.name)}">Excel</a>`:`<a href="/api/rapports/${esc(r.name)}" target="_blank" rel="noopener">PDF</a>`).join(' · ')}</td></tr>`).join(''):'<tr><td colspan="2" class="empty">Aucun fichier encore : le premier arrive le 1er du mois prochain, ou cliquez « Générer maintenant ».</td></tr>'})()}</table></div></div>`;
      $('#rapMails',body).onchange=e=>{P().company.rapportEmails=e.target.value.trim();save();toast('Adresses enregistrées')};
      $('#rapGen',body).onclick=async()=>{const [yy,mm]=$('#rapMonth',body).value.split('-').map(Number);try{await flush();toast('Génération…');const r=await api('/api/rapports/generer',{method:'POST',body:{y:yy,m:mm,envoyer:$('#rapSend',body).checked}});toast('Rapport et Excel prêts');openPdf('/api/rapports/'+r.name);renderView(true)}catch(e){toast(e.message,6000)}};
    }).catch(e=>{body.innerHTML=`<p class="badc">${esc(e.message)}</p>`});
  }
 }});
