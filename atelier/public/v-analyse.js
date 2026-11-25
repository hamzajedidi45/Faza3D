/* ---------------- Analyse de l'activité + propositions de Claude ---------------- */
// Les chiffres viennent du serveur (base de l'atelier) ; Claude ne reçoit que des totaux, jamais de nom ni de téléphone.
let ANA_JOURS=90,ANA_LAST=null;
const ANA_TEND={hausse:['hausse','ok'],baisse:['baisse','bad'],stable:['stable',''],alerte:['alerte','warn']};
const ANA_NIV={'élevé':'ok',moyen:'teal',faible:''};
function anaEvo(v){if(v===null||v===undefined)return '';const s=v>0?'+':'';return ` <span class="tag ${v>0?'ok':v<0?'bad':''}">${s}${v} %</span>`}
function anaBars(rows){if(!rows.length)return '<p class="empty">Pas encore de commandes sur 12 mois.</p>';const mx=Math.max(1,...rows.map(r=>r.ca));
  return `<div class="ana-bars">${rows.map(r=>`<div class="ana-bar" title="${esc(r.mois)} : ${fmt(r.ca,0)} TND, ${r.commandes} commande(s)"><i style="height:${Math.max(3,Math.round(r.ca/mx*100))}%"></i><span>${esc(r.mois.slice(5))}/${esc(r.mois.slice(2,4))}</span></div>`).join('')}</div>`}
function anaSpark(arr){const mx=Math.max(1,...arr),w=240,h=40;const pts=arr.map((v,i)=>`${(i/(arr.length-1||1)*w).toFixed(1)},${(h-v/mx*(h-4)-2).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--teal)" stroke-width="2"/></svg>`}
function anaTable(head,rows){return rows.length?`<table class="t small"><tr>${head.map(h=>`<th${h.r?' class="r"':''}>${esc(h.t)}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${head[i].r?' class="r"':''}>${c}</td>`).join('')}</tr>`).join('')}</table>`:'<p class="empty">Aucune donnée sur la période.</p>'}
function anaRender(a){
  if(!a)return '<p class="empty">Aucune analyse pour le moment : cliquez « Analyser avec Claude ».</p>';
  return `<p class="ink2 small">Analyse du ${dday(a.at)} · ${a.jours} jours (${esc(a.du||'')} → ${esc(a.au||'')}) · ${esc(a.modele||'')} · par ${esc(a.by||'')}${a.consigne?` · question : « ${esc(a.consigne)} »`:''}</p>
   <div class="callout mt"><b>En résumé</b><br>${esc(a.resume)}</div>
   <h3 style="font-size:15px;margin:18px 0 8px">Constats</h3>
   <div class="ana-grid">${(a.constats||[]).map(c=>{const t=ANA_TEND[c.tendance]||[c.tendance,''];return `<div class="ana-card"><div class="row between"><b>${esc(c.titre)}</b>${t[0]?`<span class="tag ${t[1]}">${esc(t[0])}</span>`:''}</div><p class="small ink2" style="margin-top:6px">${esc(c.detail)}</p></div>`}).join('')}</div>
   <h3 style="font-size:15px;margin:18px 0 8px">Propositions</h3>
   <div class="ana-grid">${(a.propositions||[]).map((p,i)=>`<div class="ana-card"><b>${i+1}. ${esc(p.titre)}</b>
      <div class="row mt" style="gap:6px;flex-wrap:wrap"><span class="tag ${ANA_NIV[p.impact]||''}">impact ${esc(p.impact)}</span><span class="tag">effort ${esc(p.effort)}</span>${p.quand?`<span class="tag warn">${esc(p.quand)}</span>`:''}</div>
      <p class="small ink2" style="margin-top:8px"><b>Pourquoi :</b> ${esc(p.pourquoi)}</p>
      ${(p.actions||[]).length?`<ol class="small" style="margin:6px 0 0;padding-left:18px">${p.actions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}
      ${p.mesure?`<p class="small muted" style="margin-top:6px">À suivre : ${esc(p.mesure)}</p>`:''}
      <div class="row mt"><button class="btn small" data-anatask="${i}">Ajouter au plan de travail</button></div></div>`).join('')}</div>
   ${(a.a_surveiller||[]).length?`<h3 style="font-size:15px;margin:18px 0 8px">À surveiller</h3><ul class="small">${a.a_surveiller.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`}
view({id:'analyse',title:'Analyse et propositions',group:'Gestion',icon:'ia',roles:SALES,before:'base',update:false,
 async render(sec){
  sec.innerHTML='<p class="empty">Calcul des chiffres…</p>';
  let r;try{r=await api('/api/analyse?jours='+ANA_JOURS)}catch(e){sec.innerHTML=`<p class="empty">${esc(e.message)}</p>`;return}
  const c=r.chiffres,v=c.ventes,dv=c.devis,dm=c.demandes,cl=c.clients,pr=c.production,st=c.site;ANA_LAST=ANA_LAST&&ANA_LAST.at>=(r.derniere||{}).at?ANA_LAST:r.derniere;
  sec.innerHTML=`<div class="sec-h"><p class="ink2">Du ${esc(c.du)} au ${esc(c.au)}, comparé aux ${c.periode_jours} jours précédents</p>
    <div class="row"><select id="anaJours" style="width:auto">${[[30,'30 derniers jours'],[90,'3 derniers mois'],[180,'6 derniers mois'],[365,'12 derniers mois']].map(([d,t])=>`<option value="${d}" ${d===c.periode_jours?'selected':''}>${t}</option>`).join('')}</select></div></div>
   <div class="kpis">
    <div class="kpi"><b>${fmt(v.ca,0)} TND</b><span>chiffre d’affaires${anaEvo(v.evolution_ca_pct)}</span></div>
    <div class="kpi"><b>${v.commandes}</b><span>commandes (avant : ${v.commandes_periode_precedente})</span></div>
    <div class="kpi"><b>${fmt(v.panier_moyen,0)} TND</b><span>panier moyen</span></div>
    <div class="kpi"><b>${dv.taux_acceptation_pct??'—'}${dv.taux_acceptation_pct!=null?' %':''}</b><span>devis acceptés (${dv.acceptes} sur ${dv.acceptes+dv.refuses+dv.en_attente})</span></div>
    <div class="kpi"><b>${dm.total}</b><span>demandes (avant : ${dm.periode_precedente}) · ${dm.taux_transformation_pct??0} % gagnées</span></div>
    <div class="kpi"><b>${st.visites}</b><span>visites du site${anaEvo(st.evolution_pct)}</span></div>
    <div class="kpi${v.impayes>0?' alert':''}"><b>${fmt(v.impayes,0)} TND</b><span>reste à encaisser (toutes commandes)</span></div>
    <div class="kpi"><b>${pr.delai_moyen_jours??'—'}${pr.delai_moyen_jours!=null?' j':''}</b><span>délai moyen · ${pr.livrees_en_retard} livrée(s) en retard</span></div>
   </div>
   <div class="grid2">
    <div class="panel"><h2>Chiffre d’affaires par mois</h2>${anaBars(c.ventes_par_mois)}</div>
    <div class="panel"><h2>Visites du site (30 jours)</h2>${anaSpark(st.visites_30_derniers_jours)}<p class="small ink2 mt">${st.visites} visites sur la période · ${st.demandes_venues_du_site} demande(s) venue(s) du site · ${cl.nouveaux} nouveau(x) client(s), ${cl.clients_fideles_2_commandes_ou_plus} client(s) fidèle(s) (2 commandes ou plus)</p></div>
    <div class="panel"><h2>Produits qui rapportent</h2>${anaTable([{t:'Produit'},{t:'Commandes',r:1},{t:'CA (TND)',r:1}],c.produits.map(p=>[esc(p.produit),p.commandes,fmt(p.ca,0)]))}</div>
    <div class="panel"><h2>D’où viennent les clients</h2>${anaTable([{t:'Source'},{t:'Demandes',r:1},{t:'Gagnées',r:1}],dm.par_source.map(s=>[esc(s.source),s.demandes,s.gagnees]))}
      ${c.commandes_par_source.length?`<div class="mt">${anaTable([{t:'Source des commandes'},{t:'Commandes',r:1},{t:'CA (TND)',r:1}],c.commandes_par_source.map(s=>[esc(s.source),s.commandes,fmt(s.ca,0)]))}</div>`:''}</div>
    <div class="panel"><h2>Réseaux sociaux</h2>${anaTable([{t:'Réseau'},{t:'Abonnés',r:1},{t:'Gain',r:1},{t:'Portée',r:1}],c.reseaux.map(n=>[esc(n.reseau),n.abonnes??'—',n.gain_abonnes!=null?(n.gain_abonnes>0?'+':'')+n.gain_abonnes:'—',n.portee||'—']))}</div>
    <div class="panel"><h2>Production et dépenses</h2><p class="small">${pr.livrees} commande(s) livrée(s), ${pr.en_cours} en cours · ${pr.echecs_impression} échec(s) d’impression (${pr.filament_perdu_g} g de filament perdu)</p>
      ${anaTable([{t:'Dépenses'},{t:'TND',r:1}],c.depenses.par_categorie.map(d=>[esc(d.categorie),fmt(d.montant,0)]))}${c.depenses.total?`<p class="small mt"><b>Total : ${fmt(c.depenses.total,0)} TND</b></p>`:''}</div>
   </div>
   <div class="panel mt" id="anaIA"><div class="row between"><h2>✨ Analyse et propositions de Claude</h2>${r.ia?`<span class="small muted">${esc(r.modele)}</span>`:''}</div>
    ${r.ia?`<div class="row" style="gap:10px;align-items:end;flex-wrap:wrap"><label style="flex:1;min-width:260px">Question ou objectif (facultatif)<input id="anaQ" maxlength="600" placeholder="Ex. : comment vendre plus de trophées aux clubs ? · préparer la rentrée · réduire les impayés"></label>
      <button class="btn primary" id="anaGo">Analyser avec Claude</button></div><p class="small muted mt">Claude reçoit seulement les totaux affichés sur cette page (aucun nom ni téléphone de client). Compter environ 30 secondes à 1 minute.</p>`
      :'<p class="small">Ajoutez la clé Anthropic dans <a href="#connexions">Connexions › Claude</a> pour obtenir l’analyse et les propositions.</p>'}
    <div id="anaOut" class="mt">${anaRender(ANA_LAST)}</div>
    ${r.historique.length>1?`<details class="mt"><summary class="small">Analyses précédentes</summary><table class="t small mt">${r.historique.map(h=>`<tr><td>${dday(h.at)}</td><td>${h.jours} j</td><td>${esc((h.resume||'').slice(0,140))}</td><td class="r"><button class="lnk" data-anaold="${h.at}">Ouvrir</button></td></tr>`).join('')}</table></details>`:''}</div>`;
  $('#anaJours',sec).onchange=e=>{ANA_JOURS=+e.target.value;renderView(true)};
  const go=$('#anaGo',sec);
  if(go)go.onclick=async()=>{go.disabled=true;const out=$('#anaOut',sec);out.innerHTML='<p class="small">Claude analyse les chiffres…</p>';
    try{ANA_LAST=await api('/api/analyse/ia',{method:'POST',body:{jours:ANA_JOURS,consigne:$('#anaQ',sec).value.trim()}});out.innerHTML=anaRender(ANA_LAST)}
    catch(e){out.innerHTML=`<p class="small">${esc(e.message)}</p>`}go.disabled=false};
  sec.onclick=async e=>{
    const o=e.target.closest('[data-anaold]');if(o){try{ANA_LAST=await api('/api/analyse/'+o.dataset.anaold);$('#anaOut',sec).innerHTML=anaRender(ANA_LAST);$('#anaIA',sec).scrollIntoView({behavior:'smooth'})}catch(err){toast(err.message)}}
    const t=e.target.closest('[data-anatask]');if(t&&ANA_LAST){const p=ANA_LAST.propositions[+t.dataset.anatask];if(!p)return;
      DB.tasks.push({id:uid('T-'),title:p.titre.slice(0,120),details:[p.pourquoi,...(p.actions||[]).map((x,i)=>`${i+1}. ${x}`),p.mesure?'À suivre : '+p.mesure:''].filter(Boolean).join('\n'),assignee:ME.name,kind:'gestion',date:dkey(Date.now()),time:'',status:'todo',source:'analyse',createdBy:ME.name,created:Date.now()});
      save();t.disabled=true;t.textContent='Ajoutée au plan de travail';toast('Tâche ajoutée à votre journée (Plan de travail)')}};
 }});
