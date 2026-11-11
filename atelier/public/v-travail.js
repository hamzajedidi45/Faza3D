'use strict';
/* =====================================================================
   Travail : Aujourd'hui, Plan de travail (stratégie jour par jour), Messages
   ===================================================================== */

/* ---------------- Stratégie de travail ---------------- */
const FN_LABEL={gestion:'Gérant : gestion et commercial',production:'Technicien : production',marketing:'Marketing et réseaux'};
const ROUTINE={
 gestion:[
  {key:'point',t:'09:00',k:'reunion',title:'Point d’équipe (10 min)',details:'Ouvrir « Aujourd’hui » ensemble : commandes en retard, goulot du jour, priorités de chacun.'},
  {key:'demandes',t:'09:15',k:'vente',title:'Traiter les nouvelles demandes',details:'Répondre à toutes les demandes (Instagram, Facebook, WhatsApp, e-mail, formulaire) en moins de 2 h. Noter le besoin, la quantité, la date et le budget dans la fiche.'},
  {key:'prospection',t:'10:00',k:'prospection',title:'Prospection : {theme}',details:'{themeDetails} Objectif du jour : {n} contacts (appel, visite ou message), chacun noté dans Demandes.'},
  {key:'devis',t:'14:00',k:'vente',title:'Devis et relances',details:'Envoyer les devis du jour depuis la plateforme. Relancer les devis envoyés depuis 3 jours ou plus.'},
  {key:'rdv',t:'15:30',k:'vente',title:'Rendez-vous, visites et livraisons',details:'Emporter les échantillons : trophée hybride, plaque gravée, porte-clés, lithophane.'},
  {key:'caisse',t:'17:30',k:'gestion',title:'Factures et encaissements',details:'Facturer les commandes livrées, enregistrer les paiements, suivre le reste à encaisser.'},
 ],
 production:[
  {key:'point',t:'09:00',k:'reunion',title:'Point d’équipe (10 min)',details:'Annoncer les impressions finies cette nuit et les commandes à livrer aujourd’hui.'},
  {key:'machines',t:'09:15',k:'production',title:'Retirer les pièces et relancer les imprimantes',details:'Suivre l’ordre du Planning, remplir les plateaux, vérifier le stock avant de lancer.'},
  {key:'finition',t:'10:00',k:'production',title:'Finitions et contrôle qualité',details:'Ponçage, peinture, assemblage 3D + laser. Contrôle avec la fiche de critères avant emballage.'},
  {key:'photos',t:'12:00',k:'contenu',title:'Photos et vidéos des réalisations',details:'2 photos et 1 vidéo courte des pièces du jour, envoyées à {marketing} dans Messages.'},
  {key:'cao',t:'14:00',k:'production',title:'Conception et préparation des fichiers',details:'Modèles 3D, Bambu Studio, fichiers laser. Envoyer les maquettes à valider au client.'},
  {key:'pack',t:'16:30',k:'production',title:'Emballage des commandes prêtes',details:'Passer chaque commande emballée à l’étape « Emballage » : le commercial est prévenu automatiquement.'},
  {key:'nuit',t:'17:45',k:'production',title:'Lancer les impressions de nuit',details:'Les impressions de plus de 6 h partent le soir (voir Planning).'},
 ],
 marketing:[
  {key:'point',t:'09:00',k:'reunion',title:'Point d’équipe (sur place ou en message)',details:'Récupérer les photos d’hier et les nouveautés de production.'},
  {key:'post',t:'10:00',k:'contenu',title:'Publication du jour : {edito}',details:'{editoDetails} Ajouter 3 stories (coulisses, sondage, produit) et le lien de commande en bio.',post:true},
  {key:'reponses',t:'11:00',k:'vente',title:'Répondre aux commentaires et messages',details:'Délai de réponse de moins d’1 h en journée. Chaque demande de prix devient une fiche dans Demandes.'},
  {key:'creation',t:'15:00',k:'contenu',title:'Préparer le contenu de demain',details:'Tournage à l’atelier, montage du reel, légende et hashtags (#impression3d #tunisie #cadeau…).'},
  {key:'stats',t:'17:00',k:'gestion',title:'Statistiques des réseaux',details:'Saisir les chiffres TikTok dans Réseaux (Facebook et Instagram se mettent à jour seuls une fois connectés). Choisir une action d’amélioration.'},
 ]
};
const WEEK={
 1:{theme:'écoles, universités et centres de formation',themeDetails:'Trophées de fin d’année, plaques de diplômes, maquettes pédagogiques, goodies.',edito:'réalisation client',editoDetails:'Photo ou vidéo d’une commande livrée (avec l’accord du client).'},
 2:{theme:'entreprises, banques et assurances',themeDetails:'Cadeaux d’entreprise gravés, plaques de bureau, trophées internes, présentoirs.',edito:'coulisses en timelapse',editoDetails:'Timelapse d’impression 3D ou de découpe laser.'},
 3:{theme:'clubs sportifs, associations et fédérations',themeDetails:'Trophées, médailles, plaques de partenaires, porte-clés de club.',edito:'astuce ou explication',editoDetails:'Comment on fabrique un trophée hybride, différence PLA et PETG, entretien d’une pièce…'},
 4:{theme:'cliniques, dentistes, architectes et promoteurs',themeDetails:'Modèles dentaires, maquettes d’architecture, signalétique en plexiglas.',edito:'produit du catalogue avec prix',editoDetails:'Un produit, son prix de départ et le délai.'},
 5:{theme:'commerces, restaurants, événementiel et partenaires',themeDetails:'Menus et présentoirs en plexi, enseignes, cadeaux de mariage. Partenariats avec imprimeries, agences et organisateurs de mariages.',edito:'reel tendance',editoDetails:'Son tendance et transformation avant / après en 10 secondes.'},
 6:{theme:'relances de la semaine',themeDetails:'Relancer tous les devis ouverts et les contacts restés sans réponse.',edito:'avant / après ou avis client',editoDetails:'Témoignage client ou comparaison fichier → pièce finie.'},
};
const SATURDAY={
 gestion:[{key:'bilan',t:'12:00',k:'reunion',title:'Bilan de la semaine (30 min, toute l’équipe)',details:'Objectifs de la semaine, CA, goulot, retards, meilleures publications. Une décision par personne pour la semaine suivante.'}],
 production:[{key:'maintenance',t:'15:00',k:'production',title:'Maintenance des machines',details:'Nettoyer les plateaux et les buses, graisser les axes, calibrer. Nettoyer la lentille et le miroir du laser.'}],
 marketing:[{key:'planif',t:'15:00',k:'contenu',title:'Planifier les publications de la semaine prochaine',details:'Choisir les 6 sujets, préparer les visuels, programmer les publications.'}],
};
const MONTHLY={
 gestion:[{key:'bilanmois',t:'11:00',k:'gestion',title:'Bilan du mois',details:'CA comparé au plan (Finances), palier 2 des salaires, trésorerie, clients à relancer. Fixer la campagne du mois.'}],
 production:[{key:'inventaire',t:'11:00',k:'production',title:'Inventaire et commande de matières',details:'Compter le stock réel, corriger dans Stock, commander chez 3dprint.tn ce qui est sous le seuil.'}],
 marketing:[{key:'calendrier',t:'11:00',k:'contenu',title:'Calendrier éditorial du mois',details:'Préparer la campagne du mois (voir Plan de travail) et les visuels principaux.'}],
};
const CAMPAIGNS={
 1:{t:'Lancement et vœux',i:['Offre de lancement : -10 % sur la première commande','Écoles : prendre les commandes de trophées de fin d’année dès maintenant','Contenu : présentation de l’atelier et des machines']},
 2:{t:'Saint-Valentin et Ramadan',i:['Cadeaux personnalisés (lithophanes, gravures) jusqu’au 14 février','Ramadan (début vers le 8 février 2027, date à confirmer) : décorations, lanternes, coffrets','Entreprises : cadeaux de l’Aïd pour les équipes']},
 3:{t:'Aïd el-Fitr et rendez-vous écoles',i:['Aïd el-Fitr (vers le 10 mars 2027, à confirmer) : coffrets et cadeaux','Rendez-vous avec écoles et universités : trophées et plaques de diplômes','Clubs : trophées de fin de saison']},
 4:{t:'Commandes de fin d’année scolaire',i:['Prendre les commandes de diplômes et trophées (livraison mai et juin)','Salons : stand ou visite avec échantillons','Contenu : coulisses de production en série']},
 5:{t:'Livraisons et Aïd el-Adha',i:['Pic de production : planifier les impressions de nuit','Aïd el-Adha (vers le 16 mai 2027, à confirmer) : prévoir la fermeture','Premiers salaires (palier 1) : suivre les encaissements de près']},
 6:{t:'Remises de diplômes et mariages',i:['Livrer à l’heure : point quotidien sur les retards','Mariages : cadeaux d’invités, plaques, décoration en plexi','Collecter avis et photos clients']},
 7:{t:'Mariages et été',i:['Organisateurs de mariages et salles des fêtes','Souvenirs personnalisés pour les zones touristiques','Contenu : meilleures réalisations de l’année scolaire']},
 8:{t:'Mois calme : maintenance et préparation',i:['Maintenance complète des machines','Catalogue de rentrée et kit de démarchage','Préparer 20 contenus d’avance']},
 9:{t:'Rentrée',i:['Écoles et universités : signalétique, maquettes, goodies','Entreprises : devis des cadeaux de fin d’année dès septembre','Relancer tous les clients de l’année précédente']},
 10:{t:'Prospection de fin d’année',i:['Tournée entreprises, banques et assurances : coffrets cadeaux','Salons professionnels d’automne (dates à vérifier)','Offre « commande avant le 15 novembre »']},
 11:{t:'Cadeaux d’entreprise',i:['Dernières commandes de cadeaux : date limite le 15 décembre','Production en série, impressions de nuit','Relancer tous les devis ouverts']},
 12:{t:'Livraisons et bilan de l’année',i:['Livrer les cadeaux d’entreprise','Bilan de l’année et objectifs de l’année suivante','Vœux aux clients, petite gravure offerte aux meilleurs']},
};
function fill(s,ctx){return String(s).replace(/\{(\w+)\}/g,(_,k)=>ctx[k]??'')}
function isFirstWorkday(d){const S=P().shop.days;const x=new Date(d.getFullYear(),d.getMonth(),1);while(!S.includes(x.getDay()))x.setDate(x.getDate()+1);return dkey(x)===dkey(d)}
function weekTasks(mon){
  const out=[],T=P().targets,team=P().team;
  const perDay=Math.max(1,Math.ceil((+T.contacts||20)/5));
  for(let i=0;i<7;i++){
    const day=new Date(mon);day.setDate(mon.getDate()+i);const dow=day.getDay();
    if(!P().shop.days.includes(dow))continue;
    const k=dkey(day),W=WEEK[dow]||WEEK[1];
    const ctx={...W,n:dow===6?'toutes les':perDay,marketing:team.marketing||'l’équipe marketing'};
    for(const fn of ['gestion','production','marketing']){
      const list=[...ROUTINE[fn],...(dow===6?SATURDAY[fn]:[]),...(isFirstWorkday(day)?MONTHLY[fn]:[])];
      for(const r of list)out.push({id:`T-${k}-${fn}-${r.key}`,date:k,time:r.t,assignee:team[fn]||'',fn,kind:r.k,title:fill(r.title,ctx),details:fill(r.details,ctx),status:'todo',source:'plan',post:!!r.post});
    }
  }
  return out;
}
function generateWeek(mon){
  const have=new Set(DB.tasks.map(t=>t.id));let n=0;
  for(const t of weekTasks(mon))if(!have.has(t.id)){DB.tasks.push(t);n++}
  if(n)save();
  return n;
}
const taskSort=(a,b)=>(a.date+(a.time||'99')).localeCompare(b.date+(b.time||'99'));
const myTask=t=>t.assignee===ME.name||(!t.assignee&&(!t.fn||P().team[t.fn]===''));

/* ---------------- Objectifs de la semaine ---------------- */
function weekStats(mon){
  const a=mon.getTime(),b=a+7*D,inW=t=>t>=a&&t<b;let contacts=0,rdv=0,gagnes=0;
  for(const l of DB.leads){
    const h=(l.history||[]).filter(x=>inW(x.at));
    if(h.some(x=>['contacte','rdv','devis','gagne'].includes(x.stage))||(l.log||[]).some(x=>inW(x.at)))contacts++;
    if(h.some(x=>x.stage==='rdv'))rdv++;
    if(h.some(x=>x.stage==='gagne'))gagnes++;
  }
  const devis=DB.quotes.filter(q=>q.sentAt&&inW(q.sentAt)).length;
  const posts=DB.tasks.filter(t=>t.post&&t.status==='done'&&inW(parseDay(t.date).getTime())).length;
  const inbound=DB.leads.filter(l=>inW(l.created)&&!['Terrain','Téléphone','Salon'].includes(l.source)).length;
  return {contacts,rdv,devis,gagnes,posts,inbound};
}
function targetsHTML(mon){
  const s=weekStats(mon),T=P().targets;
  const row=(label,v,t)=>{const p=Math.min(100,t?v/t*100:0);return `<div class="target"><span>${label}</span><b>${v} / ${t}</b><div class="prog"><i style="width:${p}%;${p>=100?'background:var(--ok)':''}"></i></div></div>`};
  return row('Contacts établis',s.contacts,T.contacts)+row('Rendez-vous',s.rdv,T.rdv)+row('Devis envoyés',s.devis,T.devis)+row('Demandes gagnées',s.gagnes,T.gagnes)+row('Publications',s.posts,T.posts)+
    `<p class="note">${s.inbound} demande${s.inbound>1?'s':''} reçue${s.inbound>1?'s':''} par les réseaux, le formulaire ou l’e-mail cette semaine.</p>`;
}

/* ---------------- Tâches ---------------- */
function taskHTML(t,showDate){
  return `<label class="task ${t.status==='done'?'done':''}"><input type="checkbox" data-task="${esc(t.id)}" ${t.status==='done'?'checked':''}>
   <span><time>${showDate?esc(new Date(parseDay(t.date)).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'}))+' · ':''}${esc(t.time||'')}</time><i class="k k-${esc(t.kind)}"></i><button type="button" class="lnk" style="text-decoration:none;color:inherit;font-size:inherit;text-align:left;padding:0" data-edittask="${esc(t.id)}">${esc(t.title)}</button>${t.details&&showDate===false?`<p>${esc(t.details)}</p>`:''}</span></label>`;
}
document.addEventListener('change',e=>{const c=e.target.closest('[data-task]');if(!c)return;const t=DB.tasks.find(x=>x.id===c.dataset.task);if(!t)return;t.status=c.checked?'done':'todo';t.doneAt=c.checked?Date.now():null;t.doneBy=c.checked?ME.name:null;save();renderSoon()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-edittask]');if(b){e.preventDefault();openTask(DB.tasks.find(t=>t.id===b.dataset.edittask))}
  const n=e.target.closest('[data-newtask]');if(n)openTask(null,n.dataset.newtask)});
let editingTask=null;
function openTask(t,date){
  editingTask=t;const f=$('#taskForm');
  $('#taskTitle').textContent=t?'Tâche':'Nouvelle tâche';
  setOpts(f.assignee,optList(members(),t?t.assignee:ME.name,'Toute l’équipe'));f.assignee.value=t?t.assignee:ME.name;
  f.title.value=t?.title||'';f.kind.value=t?.kind||'vente';f.date.value=t?.date||date||dkey(Date.now());f.time.value=t?.time||'';f.details.value=t?.details||'';
  $('#taskDel').hidden=!t;$('#taskDlg').showModal();
}
$('#taskDel').addEventListener('click',()=>{if(editingTask&&confirmAct('Supprimer cette tâche ?')){DB.tasks=DB.tasks.filter(x=>x!==editingTask);editingTask=null;$('#taskDlg').close('cancel');save();renderSoon()}});
$('#taskDlg').addEventListener('close',()=>{
  if($('#taskDlg').returnValue!=='ok')return;const f=$('#taskForm');
  const d={title:f.title.value.trim(),assignee:f.assignee.value,kind:f.kind.value,date:f.date.value,time:f.time.value,details:f.details.value};
  if(editingTask)Object.assign(editingTask,d);else DB.tasks.push({id:uid('T-'),...d,status:'todo',source:'manuel',createdBy:ME.name,created:Date.now()});
  save();renderSoon();toast('Tâche enregistrée');
});

/* ---------------- Vue : Aujourd'hui ---------------- */

/* ---------------- Dashboard : chiffres du jour, impayés, clients, qualité, site, propositions ---------------- */
const SUG_LABEL={projet:'Projet',rappel:'Rappel',prospection:'Prospection',marketing:'Marketing',production:'Production',finance:'Finance'};
const SUG_KIND={projet:'gestion',rappel:'vente',prospection:'prospection',marketing:'contenu',production:'production',finance:'gestion'};
function dashKPIs(now){
  const k=monthKey(now),cur=monthFin(k),prev=monthFin(k-1);
  const out=[];
  if(isAdmin()){
    const delta=prev.ca>0?Math.round((cur.ca-prev.ca)/prev.ca*100):null;
    out.push(`<div class="kpi"><b>${fmt(cur.ca,0)} TND</b><span>CA HT du mois${delta!=null?` · <b class="${delta>=0?'okc':'badc'}">${delta>=0?'+':''}${delta} %</b> vs ${MONTHS[prev.mm]}`:''}</span></div>`);
    const unpaid=unpaidOrders(now);const due=unpaid.reduce((a,x)=>a+x.rest,0);const late=unpaid.filter(x=>x.days>15);
    out.push(`<div class="kpi ${late.length?'alert':''}"><b>${fmt(due,0)} TND</b><span>à encaisser · ${late.length} facture${late.length>1?'s':''} en retard</span></div>`);
    const ser=cashSeries(2),cash=ser.at(-1).cash,ue=DB.expenses.filter(e=>!e.paid).reduce((a,e)=>a+(+e.amount||0),0);
    out.push(`<div class="kpi ${cash!=null&&cash-ue<2000?'alert':''}"><b>${cash!=null?fmt(cash-ue,0)+' TND':'—'}</b><span>trésorerie après les ${fmt(ue,0)} TND à payer</span></div>`);
  }
  const L=machineLoad(now);
  out.push(`<div class="kpi ${L.pct>90?'alert':L.pct>70?'':'good'}"><b>${L.pct} %</b><span>charge imprimantes cette semaine · ${fmt(L.hours,0)} h sur ${fmt(L.cap,0)} h</span></div>`);
  if(isSales()){
    const qs=DB.quotes.filter(q=>q.status==='envoye'&&q.sentAt&&now-q.sentAt>3*D);
    out.push(`<div class="kpi ${qs.length?'alert':''}"><b>${qs.length}</b><span>devis à relancer (plus de 3 jours)</span></div>`);
    const dec=DB.quotes.filter(q=>['accepte','refuse'].includes(q.status)&&(q.decidedAt||q.sentAt||q.at||0)>now-30*D);
    out.push(`<div class="kpi"><b>${dec.length?Math.round(dec.filter(q=>q.status==='accepte').length/dec.length*100)+' %':'—'}</b><span>devis acceptés sur 30 jours (${dec.length} décidés)</span></div>`);
    const slow=DB.leads.filter(l=>l.unread&&now-(l.created||0)>2*H);
    out.push(`<div class="kpi ${slow.length?'alert':'good'}"><b>${slow.length}</b><span>demande${slow.length>1?'s':''} sans réponse depuis plus de 2 h</span></div>`);
  }
  return `<div class="kpis">${out.join('')}</div>`;
}
function unpaidOrders(now){
  return DB.orders.filter(o=>stageOf(o)==='done'&&dueOf(o)-paid(o)>0.5&&!o.creditNote).map(o=>({o,rest:dueOf(o)-paid(o),days:Math.round((now-enteredAt(o))/D)})).sort((a,b)=>b.days-a.days);
}
function machineLoad(now){
  const shop=P().shop||{start:9,end:18,days:[1,2,3,4,5,6]};const mon=monday(now);const end=mon.getTime()+7*D;
  let days=0;for(let i=0;i<7;i++){const d=new Date(mon.getTime()+i*D);if(shop.days.includes(d.getDay())&&d.getTime()+D>now)days++}
  const cap=Math.max(1,(P().printers||[]).length*Math.max(1,(shop.end-shop.start))*days);
  const hours=DB.orders.filter(o=>o.proc!=='laser'&&['cmd','cao','val','prod'].includes(stageOf(o))&&o.due<end+7*D).reduce((a,o)=>a+(+o.printH||0),0);
  return {hours,cap,pct:Math.min(999,Math.round(hours/cap*100))};
}
function waText(name,kind,o){
  if(kind==='pay')return tpl('impaye_wa',{client:name,reste:fmt(o.rest,0),commande:o.o.id,produit:o.o.product});
  if(kind==='back')return tpl('retour_wa',{client:name});
  return tpl('anniversaire_wa',{client:name,produit:o.product});
}
function dashPanels(now){
  const h=[];
  if(isAdmin()){
    const list=unpaidOrders(now);
    h.push(`<div class="panel"><div class="row between"><h2>Impayés à relancer</h2><button class="lnk" data-go="finances">Finances</button></div>${list.length?`<table class="t"><tr><th>Commande</th><th>Client</th><th class="r">Reste</th><th class="r">Livrée il y a</th><th></th></tr>${list.slice(0,8).map(x=>`<tr><td>${esc(x.o.id)}</td><td>${esc(x.o.client)}</td><td class="r"><b>${fmt(x.rest,0)}</b></td><td class="r ${x.days>15?'badc':''}">${x.days} j</td><td class="r"><button class="lnk" data-dwa="pay" data-id="${esc(x.o.id)}">WhatsApp</button></td></tr>`).join('')}</table>${list.length>8?`<p class="note">et ${list.length-8} autre(s).</p>`:''}`:'<p class="empty">Toutes les commandes livrées sont payées.</p>'}</div>`);
  }
  if(isSales()){
    const q0=new Date(now);q0.setMonth(q0.getMonth()-3);
    const top=DB.clients.map(c=>{const os=DB.orders.filter(o=>o.clientId===c.id&&o.created>=q0.getTime()&&o.price);return {c,n:os.length,ca:os.reduce((a,o)=>a+htOf(o),0)}}).filter(x=>x.n).sort((a,b)=>b.ca-a.ca).slice(0,5);
    const dormant=DB.clients.map(c=>{const os=DB.orders.filter(o=>o.clientId===c.id);return {c,n:os.length,last:os.length?Math.max(...os.map(o=>o.created||0)):0,spent:os.reduce((a,o)=>a+(+o.price||0),0)}}).filter(x=>x.n&&now-x.last>90*D).sort((a,b)=>b.spent-a.spent).slice(0,6);
    const anniv=DB.orders.filter(o=>{const t=o.created||0;const d=new Date(t);d.setFullYear(d.getFullYear()+1);return Math.abs(d.getTime()-now)<15*D&&o.price>0}).sort((a,b)=>a.created-b.created).slice(0,5);
    h.push(`<div class="panel"><div class="row between"><h2>Clients à rappeler</h2><button class="lnk" data-go="clients">Clients</button></div>
      ${dormant.length?`<h3>Sans commande depuis 3 mois</h3>${dormant.map(x=>`<div class="alert-row"><div class="grow"><b>${esc(x.c.name)}</b> <span class="muted small">· ${x.n} commande${x.n>1?'s':''} · ${fmt(x.spent,0)} TND · dernière il y a ${Math.round((now-x.last)/D)} j</span></div><button class="lnk" data-dwa="back" data-cid="${esc(x.c.id)}">WhatsApp</button></div>`).join('')}`:''}
      ${anniv.length?`<h3 style="margin-top:10px">Il y a un an</h3>${anniv.map(o=>`<div class="alert-row"><div class="grow"><b>${esc(o.client)}</b> : ${esc(o.product)} <span class="muted small">(${dday(o.created)})</span></div><button class="lnk" data-dwa="anniv" data-id="${esc(o.id)}">Proposer</button></div>`).join('')}`:''}
      ${!dormant.length&&!anniv.length?'<p class="empty">Personne à rappeler pour le moment.</p>':''}</div>`);
    h.push(`<div class="panel"><h2>Top 5 clients du trimestre</h2>${top.length?`<table class="t"><tr><th>Client</th><th class="r">Commandes</th><th class="r">CA HT</th></tr>${top.map((x,i)=>`<tr><td>${i+1}. ${esc(x.c.name)}</td><td class="r">${x.n}</td><td class="r"><b>${fmt(x.ca,0)}</b></td></tr>`).join('')}</table>`:'<p class="empty">Aucune commande sur les 3 derniers mois.</p>'}</div>`);
  }
  {
    const f7=DB.failures.filter(f=>now-f.at<7*D),g=f7.reduce((a,f)=>a+(+f.g||0),0),hh=f7.reduce((a,f)=>a+(+f.h||0),0);
    const mats=P().materials||[];const cost=f7.reduce((a,f)=>{const m=mats.find(x=>x.id===f.mat)||mats[0]||{kg:80};return a+(+f.g||0)*m.kg/1000},0);
    const done7=DB.orders.filter(o=>stageOf(o)==='done'&&now-enteredAt(o)<7*D).length;
    const causes={};for(const f of f7)causes[f.cause]=(causes[f.cause]||0)+1;const topC=Object.entries(causes).sort((a,b)=>b[1]-a[1])[0];
    h.push(`<div class="panel"><div class="row between"><h2>Qualité, 7 jours</h2><button class="lnk" data-go="qualite">Qualité</button></div><div class="kpis" style="margin:0"><div class="kpi ${f7.length?'':'good'}"><b>${f7.length}</b><span>impression${f7.length>1?'s':''} ratée${f7.length>1?'s':''} · ${done7} livrée${done7>1?'s':''}</span></div><div class="kpi"><b>${fmt(g,0)} g</b><span>filament perdu · ${fmt(hh,1)} h machine</span></div><div class="kpi ${cost>50?'alert':''}"><b>${fmt(cost,0)} TND</b><span>coût matière perdu${topC?` · cause n°1 : ${esc(topC[0])}`:''}</span></div></div></div>`);
  }
  if(isSales()){
    const srcs={};for(const l of DB.leads.filter(l=>now-(l.created||0)<30*D))srcs[l.source||'Non renseignée']=(srcs[l.source||'Non renseignée']||0)+1;
    const nets=['instagram','facebook','tiktok'].map(n=>{const l=typeof latest==='function'?latest(n):null;return l?`${NET_NAMES[n]} <b>${fmt(l.followers,0)}</b>`:''}).filter(Boolean);
    h.push(`<div class="panel"><div class="row between"><h2>Site et réseaux</h2><button class="lnk" data-go="reseaux">Réseaux</button></div><div class="kpis" style="margin:0 0 10px"><div class="kpi" id="siteVisits"><b>…</b><span>visites du site, 7 jours</span></div><div class="kpi"><b>${Object.values(srcs).reduce((a,b)=>a+b,0)}</b><span>demandes en 30 jours</span></div></div>
      ${Object.keys(srcs).length?`<div class="small ink2"><b>Origine des demandes :</b> ${Object.entries(srcs).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([s,n])=>`${esc(s)} ${n}`).join(' · ')}</div>`:''}
      ${nets.length?`<div class="small ink2" style="margin-top:4px"><b>Abonnés :</b> ${nets.join(' · ')}</div>`:''}
      <div class="small muted" style="margin-top:6px">Les avis Google se suivent sur votre fiche Google Business Profile.</div></div>`);
  }
  return h.join('');
}

const REL_LABEL={devis:'Devis sans réponse',impaye:'Solde impayé',avis:'Avis Google'};
function relPanel(){return `<div class="panel" id="relPanel"><div class="row between"><h2>Relances à envoyer</h2><span class="small muted" id="relNote"></span></div><div id="relBody"><p class="empty">Chargement…</p></div></div>`}
async function loadRelances(sec){
  const body=$('#relBody',sec);if(!body)return;
  try{
    const r=await api('/api/relances');if(!document.body.contains(body))return;
    const note=$('#relNote',sec);if(note)note.textContent=r.auto?'e-mails automatiques activés · ici : les clients sans e-mail':'validation d’un clic';
    const items=r.items||[];
    body.innerHTML=items.length?items.map(it=>`<div class="alert-row" data-rel="${esc(it.kind)}:${esc(it.id)}"><span class="ic ${it.kind==='avis'?'teal':it.kind==='impaye'?'bad':'warn'}">${it.kind==='avis'?'★':it.kind==='impaye'?'TND':'✉'}</span><div class="grow"><b>${esc(it.client)}</b> · ${REL_LABEL[it.kind]} ${esc(it.no||it.id)} <span class="muted small">· ${it.kind==='avis'?'livrée il y a '+it.days+' j':it.step+(it.rest?' · reste '+fmt(it.rest,0)+' TND':'')}</span></div><span class="row" style="gap:6px;flex-wrap:wrap">${it.phone?`<button class="lnk" data-relwa>WhatsApp</button>`:''}${it.email&&r.smtp?`<button class="lnk" data-relmail>E-mail</button>`:''}<button class="lnk muted" data-reldone>Fait</button></span></div>`).join(''):'<p class="empty">Aucune relance en attente.</p>';
    body.onclick=async e=>{
      const row=e.target.closest('[data-rel]');const b=e.target.closest('button');if(!row||!b)return;
      const [kind,id]=row.dataset.rel.split(':');const it=items.find(x=>x.kind===kind&&x.id===id);if(!it)return;
      let mode='fait';
      if(b.hasAttribute('data-relwa')){mode='whatsapp';openWA(it.phone,it.wa)}
      else if(b.hasAttribute('data-relmail')){mode='email';b.disabled=true;b.textContent='Envoi…'}
      try{await api('/api/relances/fait',{method:'POST',body:{kind,id,mode}});row.remove();toast(mode==='email'?'E-mail envoyé':'Relance notée');if(!body.querySelector('[data-rel]'))body.innerHTML='<p class="empty">Aucune relance en attente.</p>'}
      catch(err){toast(err.message);b.disabled=false;b.textContent='E-mail'}
    };
  }catch(e){if(document.body.contains(body))body.innerHTML=`<p class="empty">${esc(e.message)}</p>`}
}
function sugPanel(){
  return `<div class="panel" id="sugPanel" style="grid-column:1/-1"><div class="row between"><h2>Propositions du jour</h2><span class="row" style="gap:8px"><span class="small muted" id="sugBy"></span>${isAdmin()?'<button class="lnk" id="sugRegen">Régénérer</button>':''}</span></div><div id="sugBody"><p class="empty">Chargement…</p></div></div>`;
}
async function loadSuggestions(sec,force){
  const body=$('#sugBody',sec);if(!body)return;
  try{
    const r=await api(force?'/api/suggestions/generer':'/api/suggestions',force?{method:'POST'}:undefined);
    if(!document.body.contains(body))return;
    const by=$('#sugBy',sec);if(by)by.textContent=(r.by==='gemini'?'par IA (Gemini, gratuit)':r.by==='assistant'?'par IA (assistant)':'règles intégrées, sans IA')+(r.err?' · IA indisponible : règles utilisées':'');
    const items=(r.items||[]).filter(it=>!(r.dismissed||[]).includes(it.id));
    body.innerHTML=items.length?`<div class="sug-grid">${items.map(it=>`<div class="sug ${it.type}"><span class="chip">${SUG_LABEL[it.type]||it.type}</span><b>${esc(it.title)}</b><p class="small ink2">${esc(it.text)}</p><div class="row" style="gap:6px;flex-wrap:wrap">${it.go&&VIEWS[it.go]&&allowed(it.go)?`<button class="lnk" data-go="${esc(it.go)}">Ouvrir</button>`:''}<button class="lnk" data-sugtask="${esc(it.id)}">Créer une tâche</button><button class="lnk muted" data-sugx="${esc(it.id)}">Ignorer</button></div></div>`).join('')}</div>`:'<p class="empty">Rien à proposer aujourd’hui.</p>';
    body.onclick=async e=>{
      const t=e.target.closest('[data-sugtask],[data-sugx]');if(!t)return;
      const it=items.find(x=>x.id===(t.dataset.sugtask||t.dataset.sugx));if(!it)return;
      if(t.dataset.sugtask){DB.tasks.push({id:uid('T-'),title:it.title,details:it.text,assignee:ME.name,kind:SUG_KIND[it.type]||'gestion',date:dkey(Date.now()),time:'',status:'todo',source:'proposition',createdBy:ME.name,created:Date.now()});save();toast('Tâche ajoutée à votre journée');renderSoon()}
      else{try{await api('/api/suggestions/ignorer',{method:'POST',body:{id:it.id}})}catch{}t.closest('.sug').remove()}
    };
  }catch(e){if(document.body.contains(body))body.innerHTML=`<p class="empty">${esc(e.message)}</p>`}
}
async function loadVisits(sec){
  const el=$('#siteVisits b',sec);if(!el)return;
  try{const r=await api('/api/site/visites');const days=r.days||{};const key=t=>new Date(t).toISOString().slice(0,10);let a=0,b=0;for(let i=0;i<7;i++){a+=days[key(Date.now()-i*D)]||0;b+=days[key(Date.now()-(i+7)*D)]||0}
    if(document.body.contains(el)){el.textContent=fmt(a,0);const sp=el.nextElementSibling;if(sp&&b)sp.innerHTML=`visites du site, 7 jours · <b class="${a>=b?'okc':'badc'}">${a>=b?'+':''}${Math.round((a-b)/b*100)} %</b> vs semaine passée`}}catch{if(document.body.contains(el))el.textContent='—'}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-dwa]');if(!b)return;
  const kind=b.dataset.dwa;
  if(kind==='back'){const c=DB.clients.find(x=>x.id===b.dataset.cid);if(c)openWA(c.phone,waText(c.contact||c.name,'back'));return}
  const o=DB.orders.find(x=>x.id===b.dataset.id);if(!o)return;const c=clientOf(o);
  if(kind==='pay')openWA(c&&c.phone,waText(o.client,'pay',{o,rest:dueOf(o)-paid(o)}));else openWA(c&&c.phone,waText(o.client,'anniv',o));
});
view({id:'aujourdhui',title:'Aujourd’hui',group:'Travail',icon:'today',
 badge:()=>{const k=dkey(Date.now());return DB.tasks.filter(t=>t.date===k&&t.status!=='done'&&myTask(t)).length},
 render(sec){
  const now=Date.now(),k=dkey(now),mon=monday(now),dow=new Date().getDay();
  const mine=DB.tasks.filter(t=>t.date===k&&myTask(t)).sort(taskSort);
  const overdue=DB.tasks.filter(t=>t.date<k&&t.date>=dkey(now-7*D)&&t.status!=='done'&&myTask(t)).sort(taskSort);
  const weekHas=DB.tasks.some(t=>t.source==='plan'&&t.date>=dkey(mon)&&t.date<dkey(mon.getTime()+7*D));
  const hour=new Date().getHours();
  const W=WEEK[dow];
  // alertes
  const al=[];const A=(cls,ic,html,act)=>al.push(`<div class="alert-row"><span class="ic ${cls}">${ic}</span><div class="grow">${html}</div>${act||''}</div>`);
  for(const o of DB.orders.filter(o=>stageOf(o)!=='done'&&o.due<now).sort((a,b)=>a.due-b.due))A('bad','!',`<b>${esc(o.id)}</b> ${esc(o.client)} · ${esc(o.product)} : en retard de ${dur(now-o.due)} (${stageName(stageOf(o))})`,`<button class="lnk" data-edit="${esc(o.id)}">Ouvrir</button>`);
  for(const o of DB.orders.filter(o=>stageOf(o)!=='done'&&o.due>=now&&o.due-now<D).sort((a,b)=>a.due-b.due))A('warn','⏱',`<b>${esc(o.id)}</b> ${esc(o.client)} : promise pour ${dt(o.due)} (${stageName(stageOf(o))})`,`<button class="lnk" data-edit="${esc(o.id)}">Ouvrir</button>`);
  for(const p of P().printers){const s=pState(p.id);if(s.state==='FINISH')A('ok','✓',`<b>${esc(p.name)}</b> : impression terminée${s.job?' ('+esc(s.job)+')':''}, pièce à retirer.`);if(s.state==='FAILED'||s.state==='PAUSE')A('bad','!',`<b>${esc(p.name)}</b> : ${stateLabel(s.state)}${s.job?' ('+esc(s.job)+')':''}.`)}
  if(typeof maintAlerts==='function')for(const t of maintAlerts())A('warn','🔧',t,`<button class="lnk" data-go="machines">Entretien</button>`);
  if(isAdmin()){const ue=DB.expenses.filter(e=>!e.paid);if(ue.length)A('warn','💸',`<b>${ue.length} dépense${ue.length>1?'s':''} à payer</b> : ${fmt(ue.reduce((s,e)=>s+(+e.amount||0),0),0)} TND`,`<button class="lnk" data-go="finances">Finances</button>`)}
  if(isSales()){const pe=DB.purchases.filter(a=>a.status==='envoye'&&a.sentAt&&now-a.sentAt>5*D);for(const a of pe)A('warn','🚚',`Bon de commande <b>${esc(a.no||'')}</b> (${esc((a.supplier||{}).name||'')}) envoyé il y a ${Math.round((now-a.sentAt)/D)} j : livraison à vérifier.`,`<button class="lnk" data-purchase="${esc(a.id)}">Ouvrir</button>`)}
  for(const s of lowStock())A('warn','▾',`Stock bas : <b>${esc(s.name)}</b> (${fmt(s.qty,s.kind==='plaque'?2:0)} ${unit(s)}, seuil ${fmt(s.min,s.kind==='plaque'?2:0)})`,`<button class="lnk" data-go="stock">Stock</button>`);
  if(isSales()){
    const nl=DB.leads.filter(l=>l.unread);if(nl.length)A('teal',String(nl.length),`<b>${nl.length} demande${nl.length>1?'s':''} non lue${nl.length>1?'s':''}</b> : ${nl.slice(0,3).map(l=>esc(l.name)+' ('+esc(l.source)+')').join(', ')}${nl.length>3?'…':''}`,`<button class="lnk" data-go="demandes">Voir</button>`);
    const due=DB.leads.filter(l=>l.nextAt&&l.nextAt<now&&!['gagne','perdu'].includes(l.stage)&&!l.unread&&(!l.assignee||l.assignee===ME.name));
    if(due.length)A('warn','↻',`<b>${due.length} relance${due.length>1?'s':''} à faire</b> : ${due.slice(0,3).map(l=>esc(l.name)).join(', ')}${due.length>3?'…':''}`,`<button class="lnk" data-go="demandes">Voir</button>`);
    const qs=DB.quotes.filter(q=>q.status==='envoye'&&q.sentAt&&now-q.sentAt>3*D);
    for(const q of qs.slice(0,5))A('warn','✉',`Devis <b>${esc(q.no||'')}</b> à ${esc(q.client)} envoyé il y a ${Math.round((now-q.sentAt)/D)} jours sans réponse : relancer.`,`<button class="lnk" data-quote="${esc(q.id)}">Ouvrir</button>`);
    for(const o of DB.orders.filter(o=>stageOf(o)==='pack'))A('ok','📦',`<b>${esc(o.id)}</b> ${esc(o.client)} est prête : prévenir le client.`,`<button class="lnk" data-wa="${esc(o.id)}">WhatsApp</button>`);
    for(const {c,at} of reminders().filter(x=>x.at-now<15*D))A('teal','★',`<b>${esc(c.name)}</b> : ${esc(c.event||'événement')} le ${dday(at)}. Proposer une offre.`,`<button class="lnk" data-go="clients">Clients</button>`);
  }
  sec.innerHTML=`
   <div class="sec-h"><div><h2>${hour<12?'Bonjour':hour<18?'Bon après-midi':'Bonsoir'} ${esc(ME.name)}</h2><p class="ink2">${esc(new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</p></div>
    <div class="row">${!weekHas?`<button class="btn primary" id="genWeek">Générer le plan de la semaine</button>`:''}<button class="btn" data-newtask="${k}">Nouvelle tâche</button></div></div>
   ${!weekHas?`<div class="callout" style="margin-bottom:16px">Le plan de travail de cette semaine n’est pas encore créé. Le bouton « Générer le plan de la semaine » crée les tâches de chaque membre jour par jour (prospection, contenu, production, gestion) d’après la stratégie.${isAdmin()&&!P().team.gestion?' Associez d’abord chaque fonction à un compte dans Paramètres › Équipe.':''}</div>`:''}
   ${dashKPIs(now)}
   <div class="grid2">
    ${isSales()?sugPanel():''}
    <div class="panel"><div class="row between"><h2>Mes tâches du jour</h2><span class="muted small">${mine.filter(t=>t.status==='done').length} / ${mine.length} faites</span></div>
      <div class="today-list">${mine.length?mine.map(t=>taskHTML(t,false)).join(''):'<p class="empty">Aucune tâche pour vous aujourd’hui.</p>'}</div>
      ${overdue.length?`<h3 class="ambc">Pas encore faites (jours précédents)</h3><div class="today-list">${overdue.slice(-6).map(t=>taskHTML(t,true)).join('')}</div>${overdue.length>6?`<p class="note">et ${overdue.length-6} autre(s) dans le <button class="lnk" data-go="plan">Plan de travail</button>.</p>`:''}`:''}
      ${W?`<div class="callout" style="margin-top:12px"><b>Prospection du jour :</b> ${esc(W.theme)}.<br><b>Publication du jour :</b> ${esc(W.edito)}.</div>`:''}
    </div>
    <div class="panel"><h2>À traiter maintenant</h2>${al.length?al.join(''):'<p class="empty">Rien d’urgent. Bon travail !</p>'}</div>
    ${isSales()?relPanel():''}
    ${isSales()?`<div class="panel"><div class="row between"><h2>Objectifs de la semaine</h2><button class="lnk" data-go="plan">Plan de travail</button></div>${targetsHTML(mon)}</div>`:''}
    <div class="panel"><h2>L’équipe</h2>${TEAM.map(u=>`<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="av ${ONLINE.includes(u.name)?'on':''}">${esc(initials(u.name))}</span><div class="grow"><b>${esc(u.name)}</b><div class="small muted">${esc(ROLE_LABEL[u.role]||u.role)} · ${ONLINE.includes(u.name)?'connecté':u.last_login?'vu '+ago(u.last_login):'jamais connecté'}</div></div>${u.name!==ME.name?`<button class="btn small" data-dm="${esc(u.name)}">Message</button>`:''}</div>`).join('')}</div>
    ${dashPanels(now)}
   </div>`;
  const g=$('#genWeek',sec);if(g)g.onclick=()=>{const n=generateWeek(mon);toast(n?`${n} tâches créées pour la semaine`:'Le plan de la semaine existe déjà');renderSoon()};
  if(isSales()){loadSuggestions(sec,false);loadVisits(sec);loadRelances(sec);const rg=$('#sugRegen',sec);if(rg)rg.onclick=()=>{rg.disabled=true;$('#sugBody',sec).innerHTML='<p class="empty">Génération en cours…</p>';loadSuggestions(sec,true).finally(()=>rg.disabled=false)}}
 }});

/* ---------------- Vue : Plan de travail ---------------- */
let planWeek=null;
view({id:'plan',title:'Plan de travail',group:'Travail',icon:'plan',
 render(sec){
  if(!planWeek)planWeek=monday(Date.now());
  const mon=planWeek,days=[];for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);if(P().shop.days.includes(d.getDay()))days.push(d)}
  const keys=days.map(dkey),inWeek=t=>keys.includes(t.date);
  const team=P().team;
  const rows=[];
  for(const fn of ['gestion','production','marketing'])rows.push({label:team[fn]||'(à associer)',sub:FN_LABEL[fn],match:t=>t.fn===fn||(!t.fn&&team[fn]&&t.assignee===team[fn])});
  const assigned=new Set(['gestion','production','marketing'].map(f=>team[f]).filter(Boolean));
  for(const m of members())if(!assigned.has(m))rows.push({label:m,sub:'Autres tâches',match:t=>!t.fn&&t.assignee===m});
  rows.push({label:'Toute l’équipe',sub:'Tâches communes',match:t=>!t.fn&&!t.assignee});
  const wt=DB.tasks.filter(inWeek);
  const today=dkey(Date.now());
  let grid=`<div></div>`+days.map(d=>`<div class="wh ${dkey(d)===today?'today':''}">${esc(d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'short'}))}<div class="small" style="font-weight:400">${esc((WEEK[d.getDay()]||{}).theme||'')}</div></div>`).join('');
  for(const r of rows){
    const list=wt.filter(r.match);if(!list.length&&r.label==='Toute l’équipe')continue;
    grid+=`<div class="wn">${esc(r.label)}<small>${esc(r.sub)}</small></div>`+keys.map(k=>`<div>${list.filter(t=>t.date===k).sort(taskSort).map(t=>taskHTML(t)).join('')}<button class="lnk no-print" data-newtask="${k}" style="font-size:12px">+ tâche</button></div>`).join('');
  }
  const done=wt.filter(t=>t.status==='done').length;
  const m=new Date(mon.getTime()+3*D).getMonth()+1,C=CAMPAIGNS[m],C2=CAMPAIGNS[m%12+1];
  sec.innerHTML=`
   <div class="sec-h no-print"><div class="row"><button class="btn small" id="pwPrev" aria-label="Semaine précédente">‹</button><h2>Semaine du ${esc(mon.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}))}</h2><button class="btn small" id="pwNext" aria-label="Semaine suivante">›</button><button class="btn small ghost" id="pwToday">Cette semaine</button></div>
    <div class="row"><span class="muted small">${done} / ${wt.length} tâches faites</span><button class="btn primary" id="pwGen">Générer les tâches de la semaine</button><button class="btn" id="pwPrint">Imprimer</button></div></div>
   <h2 style="display:none" class="print-only">Plan de travail : semaine du ${esc(mon.toLocaleDateString('fr-FR'))}</h2>
   ${!P().team.gestion||!P().team.production||!P().team.marketing?`<div class="callout warn no-print" style="margin-bottom:14px">Chaque fonction doit être associée à un compte pour que les tâches arrivent dans le bon « Aujourd’hui » : ${isAdmin()?'<button class="lnk" data-go="parametres">Paramètres › Équipe</button>':'demandez à l’administrateur (Paramètres › Équipe)'}.</div>`:''}
   <div class="week" style="grid-template-columns:150px repeat(${days.length},minmax(150px,1fr))">${grid}</div>
   <div class="grid2 mt">
    <div class="panel"><h2>Campagne de ${MONTHS[m-1]} : ${esc(C.t)}</h2><ul class="steps">${C.i.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <h3>Préparer ${MONTHS[m%12]} : ${esc(C2.t)}</h3><ul class="steps">${C2.i.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <p class="note">Dates des fêtes religieuses : approximatives, à confirmer chaque année.</p></div>
    <div class="panel"><h2>Objectifs de la semaine</h2>${targetsHTML(mon)}<p class="note">Objectifs modifiables dans Paramètres › Équipe.</p></div>
   </div>
   <div class="panel mt"><h2>Stratégie de travail : la journée type</h2>
    <div class="grid3">${['gestion','production','marketing'].map(fn=>`<div><h3>${esc(FN_LABEL[fn])}${team[fn]?' · '+esc(team[fn]):''}</h3>${ROUTINE[fn].map(r=>`<div class="task"><span><time>${r.t}</time><i class="k k-${r.k}"></i>${esc(fill(r.title,{theme:'thème du jour',edito:'sujet du jour'}))}</span></div>`).join('')}</div>`).join('')}</div>
    <h3>Les thèmes de la semaine</h3>
    <div class="tbl-wrap"><table class="t"><tr><th>Jour</th><th>Prospection</th><th>Cibles et produits</th><th>Publication</th></tr>${[1,2,3,4,5,6].map(d=>`<tr><td><b>${DAYS[d]}</b></td><td>${esc(WEEK[d].theme)}</td><td class="small">${esc(WEEK[d].themeDetails)}</td><td>${esc(WEEK[d].edito)}</td></tr>`).join('')}</table></div>
    <h3>Les rendez-vous fixes</h3>
    <ul class="steps"><li><b>Chaque jour, 9 h :</b> point d’équipe de 10 minutes devant « Aujourd’hui ».</li><li><b>Samedi midi :</b> bilan de la semaine (30 min) ; samedi après-midi : maintenance des machines et planification des publications.</li><li><b>Premier jour ouvré du mois :</b> bilan du mois, inventaire et commande de matières, calendrier éditorial.</li><li><b>Règles de réponse :</b> demande client traitée en moins de 2 h, message sur les réseaux en moins d’1 h, devis relancé après 3 jours.</li></ul>
   </div>`;
  $('#pwPrev',sec).onclick=()=>{planWeek=new Date(mon.getTime()-7*D);renderView(true)};
  $('#pwNext',sec).onclick=()=>{planWeek=new Date(mon.getTime()+7*D);planWeek.setHours(0,0,0,0);planWeek=monday(planWeek);renderView(true)};
  $('#pwToday',sec).onclick=()=>{planWeek=monday(Date.now());renderView(true)};
  $('#pwGen',sec).onclick=()=>{const n=generateWeek(mon);toast(n?`${n} tâches créées`:'Toutes les tâches de la semaine existent déjà');renderView(true)};
  $('#pwPrint',sec).onclick=()=>window.print();
 }});

/* ---------------- Vue : Messages ---------------- */
const CHAT={channels:[],active:'general',msgs:{},more:{},unread:{}};
async function loadChatSummary(){try{const r=await api('/api/chat/summary');CHAT.channels=r.channels;for(const c of r.channels)CHAT.unread[c.id]=c.unread;renderBadges();if(cur==='messages')renderChatList()}catch(e){}}
startHooks.push(loadChatSummary);
function chName(id){const c=CHAT.channels.find(x=>x.id===id);return c?c.name:id}
function dmWith(name){return 'dm:'+[ME.name,name].sort((a,b)=>a.localeCompare(b)).join('|')}
document.addEventListener('click',e=>{const b=e.target.closest('[data-dm]');if(!b)return;CHAT.active=dmWith(b.dataset.dm);go('messages')});
chatHandlers.push(m=>{
  if(CHAT.msgs[m.channel]&&!CHAT.msgs[m.channel].some(x=>x.id===m.id))CHAT.msgs[m.channel].push(m);
  if(!CHAT.channels.some(c=>c.id===m.channel))loadChatSummary();
  const c=CHAT.channels.find(x=>x.id===m.channel);if(c)c.last=m;
  const seeing=cur==='messages'&&CHAT.active===m.channel&&document.visibilityState==='visible';
  if(seeing){appendMsg(m);markRead(m.channel)}
  else if(m.author!==ME.name)CHAT.unread[m.channel]=(CHAT.unread[m.channel]||0)+1;
  if(cur==='messages')renderChatList();
  renderBadges();
  if(m.author!==ME.name&&(!seeing)&&'Notification' in window&&Notification.permission==='granted'&&LS.get('notif',true)){
    try{const n=new Notification((m.author===SYS_AUTHOR?'Atelier':m.author)+' · '+chName(m.channel),{body:m.body.slice(0,140),tag:'faza-'+m.channel,icon:'/icone.svg'});n.onclick=()=>{window.focus();CHAT.active=m.channel;go('messages');n.close()}}catch(e){}
  }
});
const SYS_AUTHOR='@système';

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&cur==='messages'){markRead(CHAT.active);renderChatList();renderBadges()}});
async function markRead(ch){const l=CHAT.msgs[ch];const last=l&&l.length?l[l.length-1].id:0;CHAT.unread[ch]=0;if(last)try{await api('/api/chat/read',{method:'POST',body:{channel:ch,id:last}})}catch(e){}}
function msgBody(t){
  let h=esc(t);
  h=h.replace(/https?:\/\/[^\s<]+/g,u=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
  h=h.replace(/#(C-\d+)\b/g,'<button class="ref" data-edit="$1">#$1</button>');
  h=h.replace(/#(L-[a-z0-9]+)\b/g,'<button class="ref" data-lead="$1">#$1</button>');
  h=h.replace(/#(D-\d{4}-\d{4})\b/g,(m,no)=>{const q=DB.quotes.find(x=>x.no===no);return q?`<button class="ref" data-quote="${esc(q.id)}">#${no}</button>`:m});
  for(const n of members())h=h.split('@'+esc(n)).join(`<span class="ment">@${esc(n)}</span>`);
  return h;
}
function msgHTML(m,prev){
  const sys=m.author===SYS_AUTHOR,cont=prev&&prev.author===m.author&&m.at-prev.at<5*60e3&&new Date(prev.at).getDate()===new Date(m.at).getDate();
  const sep=!prev||new Date(prev.at).toDateString()!==new Date(m.at).toDateString()?`<div class="day-sep">${esc(new Date(m.at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}))}</div>`:'';
  return sep+`<div class="msg ${cont&&!sep?'cont':''} ${sys?'sys':''}" data-id="${m.id}"><span class="av ${sys?'sys':''}">${sys?'⚙':esc(initials(m.author))}</span><div>${cont&&!sep?'':`<div class="who">${sys?'Atelier (automatique)':esc(m.author)}<time>${hm(m.at)}</time></div>`}<div class="body">${msgBody(m.body)}</div></div></div>`;
}
function appendMsg(m){const box=$('#msgs');if(!box)return;const l=CHAT.msgs[m.channel]||[];const prev=l[l.length-2];const nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<120;box.insertAdjacentHTML('beforeend',msgHTML(m,prev));if(nearBottom||m.author===ME.name)box.scrollTop=box.scrollHeight}
function renderChatList(){
  const el=$('#chList');if(!el)return;
  const pub=CHAT.channels.filter(c=>!c.dm),dms=CHAT.channels.filter(c=>c.dm);
  const item=c=>`<button class="ch" data-ch="${esc(c.id)}" ${c.id===CHAT.active?'aria-current="true"':''}>${c.dm?`<span class="av ${ONLINE.includes(c.name)?'on':''}" style="width:26px;height:26px;font-size:11px">${esc(initials(c.name))}</span>`:'<span class="hash">#</span>'}<span class="nm">${esc(c.name)}<small>${c.last?esc((c.last.author===SYS_AUTHOR?'Atelier':c.last.author)+' : '+c.last.body.slice(0,40)):c.dm?esc(ROLE_LABEL[c.role]||''):''}</small></span>${CHAT.unread[c.id]?`<span class="badge">${CHAT.unread[c.id]}</span>`:''}</button>`;
  el.innerHTML=`${isSales()?`<button class="ch" data-ch="assistant" ${CHAT.active==='assistant'?'aria-current="true"':''}><span class="hash">✦</span><span class="nm">Assistant</span></button>`:''}<h4>Canaux</h4>${pub.map(item).join('')}<h4>Messages privés</h4>${dms.map(item).join('')||'<p class="empty" style="padding:4px 8px">Créez les comptes de l’équipe pour discuter en privé.</p>'}`;
}
async function openChannel(ch){
  CHAT.active=ch;
  const sec=$('#v-messages');if(!sec)return;
  $('.chat',sec).classList.remove('list');
  if(ch==='assistant'){
    $('#chHead').innerHTML=`<button class="btn small menu-chat" id="chBack" style="display:none">‹</button><b>✦ Assistant</b><span class="muted small">Posez une question sur vos données : « combien de trophées vendus en octobre ? », « quels clients n’ont pas payé ? », « quel est mon meilleur mois ? »</span>`;
    CHAT.msgs.assistant=CHAT.msgs.assistant||JSON.parse(localStorage.getItem('faza_assistant')||'[]');
    renderAssistant();renderChatList();if(innerWidth<980)$('#chBack').style.display='inline-block';
    const ta=$('#composer textarea');if(ta){ta.placeholder='Votre question…';ta.focus({preventScroll:true})}return;
  }
  const ta0=$('#composer textarea');if(ta0)ta0.placeholder='Écrire un message… (#C-101 cite une commande, @nom mentionne)';
  const c=CHAT.channels.find(x=>x.id===ch);
  $('#chHead').innerHTML=`<button class="btn small menu-chat" id="chBack" style="display:none">‹</button><b>${c&&!c.dm?'# ':''}${esc(chName(ch))}</b><span class="muted small">${ch==='general'?'Toute l’équipe':ch==='production'?'Atelier, imprimantes, stock':ch==='commercial'?'Demandes, devis, clients':c&&ONLINE.includes(c.name)?'connecté':'hors ligne'}</span>`;
  if(!CHAT.msgs[ch]){$('#msgs').innerHTML='<p class="empty">Chargement…</p>';try{const r=await api('/api/chat?channel='+encodeURIComponent(ch));CHAT.msgs[ch]=r.messages;CHAT.more[ch]=r.messages.length>=80}catch(e){$('#msgs').innerHTML=`<p class="badc">${esc(e.message)}</p>`;return}}
  renderMsgs();markRead(ch);renderChatList();renderBadges();
  if(innerWidth<980)$('#chBack').style.display='inline-block';
  $('#composer textarea').focus({preventScroll:true});
}
function renderMsgs(){
  const l=CHAT.msgs[CHAT.active]||[],box=$('#msgs');
  box.innerHTML=(CHAT.more[CHAT.active]?'<button class="lnk" id="older" style="align-self:center">Voir les messages précédents</button>':'')+(l.length?l.map((m,i)=>msgHTML(m,l[i-1])).join(''):'<p class="empty">Aucun message. Écrivez le premier !</p>');
  box.scrollTop=box.scrollHeight;
}

/* ---------- Assistant : questions sur les données ---------- */
function renderAssistant(){
  const box=$('#msgs');if(!box)return;const l=CHAT.msgs.assistant||[];
  box.innerHTML=(l.length?l.map(m=>`<div class="msg ${m.me?'':'sys'}"><span class="av ${m.me?'':'sys'}">${m.me?esc(initials(ME.name)):'✦'}</span><div><div class="who">${m.me?esc(ME.name):'Assistant'}<time>${hm(m.at)}</time></div><div class="body" style="white-space:pre-wrap">${esc(m.body)}</div></div></div>`).join(''):`<p class="empty">Exemples : « CA de ce mois ? » · « quels devis attendent une réponse ? » · « combien de PLA reste-t-il ? » · « top 3 clients 2026 ».<br>Les réponses viennent de vos données ; l’assistant peut se tromper, vérifiez les chiffres importants.</p>`)+(l.length?'<button class="lnk muted" id="asClear" style="align-self:center">Effacer la conversation</button>':'');
  box.scrollTop=box.scrollHeight;
  const c=$('#asClear');if(c)c.onclick=()=>{CHAT.msgs.assistant=[];localStorage.removeItem('faza_assistant');renderAssistant()};
}
async function askAssistant(q){
  const l=CHAT.msgs.assistant=CHAT.msgs.assistant||[];l.push({me:true,body:q,at:Date.now()});renderAssistant();
  const box=$('#msgs');const w=document.createElement('p');w.className='empty';w.textContent='L’assistant réfléchit…';box.appendChild(w);box.scrollTop=box.scrollHeight;
  try{const r=await api('/api/assistant/question',{method:'POST',body:{q,hist:l.slice(-7,-1)}});l.push({me:false,body:r.answer,at:Date.now()})}
  catch(e){l.push({me:false,body:'⚠️ '+e.message,at:Date.now()})}
  while(l.length>40)l.shift();try{localStorage.setItem('faza_assistant',JSON.stringify(l))}catch{}
  if(CHAT.active==='assistant')renderAssistant();
}
view({id:'messages',title:'Messages',group:'Travail',icon:'chat',update:false,
 badge:()=>Object.values(CHAT.unread).reduce((a,b)=>a+(b||0),0),
 render(sec){
  sec.innerHTML=`<div class="chat"><div class="ch-list" id="chList"></div><div class="ch-main"><div class="ch-head" id="chHead"></div><div class="msgs" id="msgs"></div>
   <form class="composer" id="composer"><textarea rows="1" placeholder="Écrire un message… (#C-101 cite une commande, @nom mentionne)" aria-label="Message"></textarea><button class="btn primary">Envoyer</button></form></div></div>
   <p class="note">Les messages restent dans la base de l’atelier. ${'Notification' in window&&Notification.permission!=='granted'?'<button class="lnk" id="notifOn">Activer les notifications sur ce poste</button>':''}</p>`;
  renderChatList();openChannel(CHAT.active);loadChatSummary();
  const ta=$('#composer textarea',sec);
  ta.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=Math.min(160,ta.scrollHeight)+'px'});
  ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#composer',sec).requestSubmit()}});
  $('#composer',sec).addEventListener('submit',async e=>{e.preventDefault();const body=ta.value.trim();if(!body)return;ta.value='';ta.style.height='auto';
    if(CHAT.active==='assistant')return askAssistant(body);
    try{await api('/api/chat',{method:'POST',body:{channel:CHAT.active,body}})}catch(err){ta.value=body;toast(err.message)}});
  $('#chList',sec).addEventListener('click',e=>{const b=e.target.closest('[data-ch]');if(b)openChannel(b.dataset.ch)});
  sec.onclick=async e=>{
    if(e.target.id==='chBack'){$('.chat',sec).classList.add('list')}
    if(e.target.id==='notifOn'){try{await Notification.requestPermission();renderView(true)}catch(err){}}
    if(e.target.id==='older'){const l=CHAT.msgs[CHAT.active];try{const r=await api('/api/chat?channel='+encodeURIComponent(CHAT.active)+'&before='+(l[0]?l[0].id:0));CHAT.msgs[CHAT.active]=[...r.messages,...l];CHAT.more[CHAT.active]=r.messages.length>=80;const box=$('#msgs'),h=box.scrollHeight;renderMsgs();box.scrollTop=box.scrollHeight-h}catch(err){toast(err.message)}}
  };
 }});
