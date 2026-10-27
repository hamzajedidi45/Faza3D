'use strict';
/* =====================================================================
   Gestion : Base de données, Connexions, Paramètres, Mon compte
   ===================================================================== */
const kb=n=>n>1048576?fmt(n/1048576,1)+' Mo':fmt(n/1024,0)+' Ko';
const TABLES=[['clients','Clients'],['orders','Commandes'],['order_payments','Paiements'],['order_events','Étapes des commandes'],['quotes','Devis'],['leads','Demandes et prospects'],['tasks','Tâches'],['stock','Stock'],['catalog','Catalogue'],['failures','Échecs d’impression'],['social','Statistiques réseaux'],['messages','Messages'],['audit','Journal']];

/* ---------------- Base de données ---------------- */
view({id:'base',title:'Base de données',group:'Gestion',icon:'db',roles:['admin'],update:false,
 async render(sec){
  sec.innerHTML='<p class="empty">Chargement…</p>';
  let info,audit=[];
  try{[info,audit]=await Promise.all([api('/api/info'),api('/api/audit?limit=200')])}catch(e){sec.innerHTML=`<div class="panel"><p class="badc">${esc(e.message)}</p></div>`;return}
  const c=info.counts;
  sec.innerHTML=`<div class="kpis">
    <div class="kpi"><b>${kb(info.dbSize)}</b><span>taille de la base</span></div>
    <div class="kpi"><b>${c.orders}</b><span>commandes</span></div><div class="kpi"><b>${c.clients}</b><span>clients</span></div>
    <div class="kpi"><b>${c.leads}</b><span>demandes et prospects</span></div><div class="kpi"><b>${c.quotes}</b><span>devis</span></div><div class="kpi"><b>${c.messages}</b><span>messages</span></div></div>
   <div class="grid2">
    <div class="panel"><h2>Sauvegardes</h2>
     <p class="small ink2">Une copie complète de la base est faite chaque jour automatiquement ; les 30 dernières sont gardées sur le PC de l’atelier, dans <code>donnees\\sauvegardes</code>.</p>
     <div class="row" style="margin:12px 0"><button class="btn primary" id="bkNow">Sauvegarder maintenant</button><a class="btn" href="/api/export/base.db">Télécharger toute la base (.db)</a></div>
     <div class="callout warn small">Gardez aussi une copie hors de l’atelier chaque semaine (clé USB rangée ailleurs ou Google Drive) : en cas de vol ou de panne du PC, c’est elle qui sauve les données.</div>
     <table class="t mt"><tr><th>Sauvegarde</th><th class="r">Taille</th></tr>${info.backups.slice(0,8).map(b=>`<tr><td>${esc(b.name)}</td><td class="r">${kb(b.size)}</td></tr>`).join('')||'<tr><td colspan="2" class="empty">Première sauvegarde dans quelques secondes.</td></tr>'}</table></div>
    <div class="panel"><h2>Exporter vers Excel</h2><p class="small ink2">Un classeur Excel du mois est créé automatiquement le 1er de chaque mois (Finances › Rapports mensuels). Vous pouvez aussi le télécharger à tout moment :</p>
     <div class="row" style="margin:10px 0"><a class="btn primary" href="/api/export/mois.xlsx">Excel du mois en cours (.xlsx)</a><button class="btn" data-go="finances" onclick="finTab='rapports'">Mois précédents</button></div>
     <p class="small ink2">Tables complètes, en CSV (séparateur point-virgule) :</p>
     <table class="t">${TABLES.map(([t,l])=>`<tr><td>${l}</td><td class="r muted small">${c[t]!=null?c[t]+' lignes':''}</td><td class="r"><a href="/api/export/${t}.csv">Télécharger</a></td></tr>`).join('')}</table></div>
   </div>
   <div class="panel"><div class="row between"><h2>Journal des modifications</h2><input id="auQ" type="search" placeholder="Filtrer (nom, commande…)" style="max-width:260px"></div>
    <div class="tbl-wrap"><table class="t" id="auT"></table></div><p class="note">Qui a modifié quoi et quand : 200 dernières opérations.</p></div>
   <div class="panel"><h2>Où sont les données</h2><p class="small">Base : <code>${esc(info.dbFile)}</code></p><p class="small ink2" style="margin-top:6px">Base SQLite : un seul fichier, lisible avec des outils gratuits (DB Browser for SQLite). Les mots de passe y sont chiffrés ; les codes des connexions sont chiffrés avec une clé gardée à part.</p></div>`;
  const drawAudit=()=>{const q=($('#auQ',sec).value||'').toLowerCase();$('#auT',sec).innerHTML='<tr><th>Date</th><th>Qui</th><th>Action</th><th>Élément</th></tr>'+audit.filter(a=>!q||[a.user,a.action,a.coll,a.rec_id,a.detail].join(' ').toLowerCase().includes(q)).slice(0,200).map(a=>`<tr><td class="small">${esc(dt(a.at))}</td><td>${esc(a.user||'')}</td><td>${esc(a.action)}</td><td class="small">${esc(a.coll||'')} ${esc(a.rec_id||'')}${a.detail?' · '+esc(a.detail):''}</td></tr>`).join('')};
  drawAudit();$('#auQ',sec).addEventListener('input',drawAudit);
  $('#bkNow',sec).onclick=async()=>{try{const r=await api('/api/backup',{method:'POST'});toast('Sauvegarde faite : '+r.file);renderView(true)}catch(e){toast(e.message)}};
 }});

/* ---------------- Connexions ---------------- */
const STATE_TXT={ok:['ok','Connecté'],pret:['teal','Prêt'],attente:['warn','Connexion en cours'],erreur:['bad','Erreur'],off:['','Non configuré']};
function stTag(s){const [c,t]=STATE_TXT[(s||{}).state]||['',s?s.state:'—'];return `<span class="tag ${c}">${t}</span>${s&&s.note?` <span class="small ink2">${esc(s.note)}</span>`:''}${s&&s.at?` <span class="small muted">· ${esc(ago(s.at))}</span>`:''}`}
view({id:'connexions',title:'Connexions',group:'Gestion',icon:'plug',roles:['admin'],update:false,
 async render(sec){
  sec.innerHTML='<p class="empty">Chargement…</p>';
  let r,info;try{[r,info]=await Promise.all([api('/api/connecteurs'),api('/api/info')])}catch(e){sec.innerHTML=`<div class="panel"><p class="badc">${esc(e.message)}</p></div>`;return}
  const C=r.config,S=r.status,im=C.imap||{},sm=C.smtp||{},me=C.meta||{};
  const pub=(P().company.siteCommande||'').replace(/\/commande\/?$/,'');
  sec.innerHTML=`
  <div class="callout" style="margin-bottom:16px">Les codes et mots de passe saisis ici sont gardés chiffrés sur le PC de l’atelier et ne sont jamais renvoyés à l’écran (affichés « •••••• »). Laissez un champ « •••••• » tel quel pour garder la valeur enregistrée.</div>
  <div class="grid2">
   <div class="panel"><div class="row between"><h2>E-mail</h2><span>${stTag(S.email)}</span></div>
    <p class="small ink2">Réception : chaque e-mail reçu (hors publicités) devient une demande dans « Demandes ». Envoi : devis et factures partent en PDF depuis la plateforme.</p>
    <form id="mailCfg"><fieldset>
     <label class="full">Messagerie<select name="preset"><option value="">Choisir…</option><option value="gmail">Gmail</option><option value="autre">Autre (hébergeur, domaine)</option></select></label>
     <label>Adresse e-mail<input name="user" type="email" value="${esc(im.user||sm.user||'')}" autocomplete="off"></label>
     <label>Mot de passe d’application<input name="pass" type="password" value="${esc(im.pass||'')}" autocomplete="new-password"></label>
     <label>Serveur de réception (IMAP)<input name="ihost" value="${esc(im.host||'')}" placeholder="imap.gmail.com"></label><label>Port<input name="iport" type="number" value="${esc(im.port||993)}"></label>
     <label>Serveur d’envoi (SMTP)<input name="shost" value="${esc(sm.host||'')}" placeholder="smtp.gmail.com"></label><label>Port<input name="sport" type="number" value="${esc(sm.port||465)}"></label>
     <label class="full">Nom affiché à l’envoi<input name="from" value="${esc(sm.from||'')}" placeholder="FAZA 3D &lt;contact@…&gt;"></label>
     <label class="chk full"><input type="checkbox" name="actif" ${im.actif===false?'':'checked'}> Transformer les e-mails reçus en demandes</label></fieldset>
     <div class="row"><button class="btn primary">Enregistrer</button><button type="button" class="btn" id="testMail">Tester</button></div></form>
    <details class="mt"><summary class="small"><b>Gmail : comment obtenir le mot de passe d’application</b></summary><ol class="steps small mt"><li>Compte Google › Sécurité : activez la <b>validation en deux étapes</b>.</li><li>Cherchez « Mots de passe des applications », créez-en un nommé « FAZA Atelier ».</li><li>Collez les 16 lettres ici (sans espaces). Le vrai mot de passe Gmail ne sert jamais.</li><li>Serveurs : <code>imap.gmail.com</code> port 993 et <code>smtp.gmail.com</code> port 465.</li></ol></details></div>

   <div class="panel"><div class="row between"><h2>Facebook et Instagram</h2><span>${stTag(S.meta)}</span></div>
    <p class="small ink2">Relevé automatique toutes les 15 minutes : abonnés, portée, interactions, dernières publications Instagram, et messages privés Instagram et Messenger qui deviennent des demandes.</p>
    <form id="metaCfg"><fieldset>
     <label>Identifiant de la page Facebook<input name="pageId" value="${esc(me.pageId||'')}" placeholder="1234567890"></label>
     <label>Version de l’API<input name="apiVersion" value="${esc(me.apiVersion||'v23.0')}"></label>
     <label class="full">Jeton d’accès de la page (longue durée)<input name="pageToken" type="password" value="${esc(me.pageToken||'')}" autocomplete="off"></label>
     <label>Identifiant Instagram (facultatif)<input name="igUserId" value="${esc(me.igUserId||'')}" placeholder="trouvé tout seul"></label>
     <label class="chk"><input type="checkbox" name="actif" ${me.actif===false?'':'checked'}> Activer le relevé</label></fieldset>
     <div class="row"><button class="btn primary">Enregistrer</button><button type="button" class="btn" id="testMeta">Tester</button></div></form>
    <details class="mt"><summary class="small"><b>Mise en place (une fois, environ 30 minutes)</b></summary><ol class="steps small mt">
     <li>Passez le compte Instagram en <b>compte professionnel</b> et reliez-le à la page Facebook FAZA 3D.</li>
     <li>Sur <b>developers.facebook.com</b>, créez une application de type « Entreprise », avec le compte qui administre la page.</li>
     <li>Dans l’Explorateur de l’API Graph, générez un jeton d’utilisateur avec les autorisations <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>read_insights</code>, <code>instagram_basic</code>, <code>instagram_manage_insights</code>, <code>pages_messaging</code>, <code>instagram_manage_messages</code>.</li>
     <li>Échangez-le contre un jeton de longue durée, puis demandez le jeton de la page (<code>/me/accounts</code>) : c’est lui qu’on colle ici, avec l’identifiant de la page.</li>
     <li>Cliquez « Tester » : le résultat s’affiche en haut de ce cadre.</li></ol></details></div>

   <div class="panel"><div class="row between"><h2>WhatsApp</h2><span>${stTag(S.whatsapp)}</span></div>
    <p class="small"><b>Sans réglage (recommandé pour démarrer) :</b> l’application WhatsApp Business sur le téléphone de l’atelier. Les boutons « WhatsApp » de la plateforme ouvrent la conversation avec le message prêt, et chaque demande reçue se note en un clic dans « Demandes ».</p>
    <p class="small mt"><b>Réception automatique dans la plateforme :</b> passe par l’API WhatsApp Cloud de Meta. Elle demande un numéro dédié (qui ne peut plus servir dans l’application WhatsApp du téléphone) et l’ouverture du formulaire public (ci-dessous), car Meta doit pouvoir joindre la plateforme depuis internet.</p>
    <form id="waCfg"><fieldset>
     <label>Clé secrète de l’application Meta<input name="appSecret" type="password" value="${esc(me.appSecret||'')}" autocomplete="off"></label>
     <label>Code de vérification du webhook<input name="verifyToken" value="${esc(me.verifyToken||'')}" placeholder="choisi par vous"></label>
     <p class="full small ink2">Adresse du webhook à donner à Meta (WhatsApp, Instagram, Messenger) : <code>${pub?esc(pub)+'/webhook/meta':'https://VOTRE-ADRESSE-PUBLIQUE/webhook/meta'}</code></p></fieldset>
     <div class="row"><button class="btn primary">Enregistrer</button><button type="button" class="btn" id="genVerify">Générer un code</button></div></form></div>

   <div class="panel"><div class="row between"><h2>Formulaire public de commande</h2><span class="tag ${info.publicForm.actif?'ok':''}">${info.publicForm.actif?'Ouvert':'Atelier seulement'}</span></div>
    <p class="small ink2">Une page simple où les clients décrivent leur besoin ; chaque envoi arrive dans « Demandes » avec son origine (Instagram, TikTok…). Dans l’atelier : <a href="/commande" target="_blank" rel="noopener">${esc(location.origin)}/commande</a></p>
    <label class="mt">Adresse publique du formulaire (une fois le tunnel ouvert)<input id="siteCommande" value="${esc(P().company.siteCommande||'')}" placeholder="https://commande.faza3d.tn/commande"></label>
    <details class="mt"><summary class="small"><b>Ouvrir le formulaire sur internet sans exposer la plateforme</b></summary><ol class="steps small mt">
     <li>Dans <code>config.json</code>, mettez <code>"public": { "actif": true, "port": 8788 }</code> puis redémarrez (redemarrer.bat). Seuls le formulaire et le webhook répondent sur ce port ; le reste de la plateforme y est invisible.</li>
     <li>Créez un compte gratuit Cloudflare, ajoutez votre nom de domaine, puis installez <b>cloudflared</b> sur le PC de l’atelier.</li>
     <li>Créez un tunnel vers <code>http://localhost:8788</code> avec un nom du type <code>commande.votre-domaine.tn</code>.</li>
     <li>Collez l’adresse obtenue ci-dessus. Ne redirigez jamais le port 8787 sur la box internet.</li></ol></details></div>

   <div class="panel"><div class="row between"><h2>Relais imprimantes</h2><span class="tag ${info.relay&&info.relay.ok?'ok':''}">${info.relay&&info.relay.ok?'connecté : '+esc(info.relay.name||'')+' · '+ago(info.relay.at):info.relayToken?'en attente du relais':'non configuré'}</span></div>
    <p class="small ink2">Quand la plateforme est hébergée hors de l’atelier (serveur cloud), les imprimantes ne sont pas joignables directement. Le <b>relais</b> est un petit programme sur un PC de l’atelier qui envoie l’état des imprimantes et l’image des caméras au serveur, toutes les 5 secondes, tant que ce PC est allumé.</p>
    <ol class="steps small mt"><li>Cliquez « Créer un jeton » et copiez-le (il ne sera plus affiché).</li><li>Sur le PC de l’atelier, ouvrez le dossier <code>relais</code> du zip, collez le jeton et l’adresse de la plateforme dans <code>config.json</code>, avec l’adresse IP, le numéro de série et le code d’accès de chaque imprimante.</li><li>Double-cliquez sur <code>installer-relais.bat</code> : le relais démarre avec Windows.</li></ol>
    <div class="row mt"><button class="btn primary" id="relayTok">Créer un jeton</button><code id="relayTokOut" hidden></code></div>
    <p class="note">Caméras : séries P1 et A1 directement ; X1 (flux RTSPS) si ffmpeg est installé sur le PC relais.${info.ffmpeg?' ffmpeg est présent sur ce serveur.':''}</p></div>
   <div class="panel wide" style="grid-column:1/-1"><h2>Imprimantes Bambu Lab</h2>
    <p class="small ink2">Sur chaque imprimante : Paramètres › Réseau, activez le <b>Mode LAN uniquement</b> puis le <b>Mode développeur</b>, et notez l’adresse IP, le code d’accès et le numéro de série. Réservez l’adresse IP de chaque imprimante dans la box pour qu’elle ne change pas.${info.proxy?' <b>Plateforme hébergée hors de l’atelier : laissez ces champs vides et utilisez le relais ci-dessus.</b>':''}</p>
    <form id="prCfg"><div class="tbl-wrap"><table class="t"><tr><th>Imprimante</th><th>Adresse IP</th><th>Numéro de série</th><th>Code d’accès</th><th>État</th></tr>
     ${r.printers.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td><input data-pr="${esc(p.id)}" data-k="ip" value="${esc(p.ip)}" placeholder="192.168.1.50"></td><td><input data-pr="${esc(p.id)}" data-k="serial" value="${esc(p.serial)}"></td><td><input data-pr="${esc(p.id)}" data-k="accessCode" type="password" value="${p.hasCode?'••••••':''}" autocomplete="off"></td><td>${(()=>{const s=LIVE[p.id];return s&&s.configured?`<span class="state ${s.online?s.state:'OFFLINE'}">${stateLabel(s.online?s.state:'OFFLINE')}</span>`:'<span class="state">Non reliée</span>'})()}</td></tr>`).join('')}</table></div>
     <div class="row mt"><button class="btn primary">Enregistrer et reconnecter</button></div></form></div>
  </div>
  <div class="panel mt"><h2>Assistant IA du site (répond en tunisien)</h2>
    <p class="small ink2">Un assistant automatique sur faza3d.tn répond aux visiteurs en darija tunisienne (ou en français), explique les produits, les prix et les délais, et crée la demande dans Demandes et prospection dès qu’il a un nom et un téléphone. Il utilise l’API Claude d’Anthropic : créez une clé sur <code>console.anthropic.com</code> (facturation à l’usage, de l’ordre de quelques millimes par conversation).</p>
    <form id="aiCfg"><div class="grid3">
      <label>Clé API Anthropic<input name="apiKey" type="password" value="${esc((r.config.assistant||{}).apiKey||'')}" placeholder="sk-ant-…" autocomplete="off"></label>
      <label>Modèle<select name="model"><option value="claude-haiku-5-5" ${(r.config.assistant||{}).model==='claude-haiku-5-5'||!(r.config.assistant||{}).model?'selected':''}>Claude Haiku 5.5 (rapide, économique)</option><option value="claude-sonnet-5-5" ${(r.config.assistant||{}).model==='claude-sonnet-5-5'?'selected':''}>Claude Sonnet 5.5 (plus fin)</option></select></label>
      <label class="chk" style="align-self:end"><input type="checkbox" name="actif" ${(r.config.assistant||{}).actif===false?'':'checked'}> Assistant actif sur le site</label>
    </div><div class="row mt"><button class="btn primary">Enregistrer</button><button class="btn" type="button" id="aiTest">Tester</button><span id="aiOut" class="small muted"></span></div></form></div>
  <div class="panel mt"><h2>Paiement en ligne (acompte et solde)</h2><p class="small ink2">Le client paie par carte, e-DINAR ou portefeuille mobile depuis sa page de suivi ou son espace client ; le règlement est enregistré tout seul sur la commande. Nécessite l’adresse publique de la plateforme (Paramètres › Société). Prestataires tunisiens : <b>Konnect</b> (konnect.network : compte entreprise, clé API et identifiant de portefeuille) ou <b>Flouci</b> (flouci.com : jeton et secret d’application).</p>
    <form id="payCfg"><div class="grid3">
      <label>Prestataire<select name="provider"><option value="">— désactivé —</option><option value="konnect" ${(r.config.paiement||{}).provider==='konnect'?'selected':''}>Konnect</option><option value="flouci" ${(r.config.paiement||{}).provider==='flouci'?'selected':''}>Flouci</option></select></label>
      <label>Acompte demandé (%)<input name="acompte" type="number" min="10" max="100" value="${esc((r.config.paiement||{}).acompte||50)}"></label>
      <label class="chk" style="align-self:end"><input type="checkbox" name="sandbox" ${(r.config.paiement||{}).sandbox?'checked':''}> Mode test (Konnect preprod)</label>
      <label>Konnect · clé API<input name="apiKey" type="password" value="${esc((r.config.paiement||{}).apiKey||'')}" autocomplete="off"></label>
      <label>Konnect · identifiant du portefeuille (wallet)<input name="walletId" value="${esc((r.config.paiement||{}).walletId||'')}"></label>
      <label></label>
      <label>Flouci · jeton d’application (app_token)<input name="appToken" type="password" value="${esc((r.config.paiement||{}).appToken||'')}" autocomplete="off"></label>
      <label>Flouci · secret (app_secret)<input name="appSecret" type="password" value="${esc((r.config.paiement||{}).appSecret||'')}" autocomplete="off"></label>
    </div><div class="row mt"><button class="btn primary">Enregistrer</button><button class="btn" type="button" id="payTest">Tester</button><span id="payOut" class="small muted"></span></div></form></div>
  <div class="panel mt"><h2>TikTok</h2><p class="small ink2">TikTok ne propose pas d’accès automatique utilisable pour une petite entreprise (ni messages, ni statistiques). Les chiffres se saisissent en 1 minute par semaine dans « Réseaux », et le lien de commande <code>?src=tiktok</code> en bio permet de compter les demandes venues de TikTok.</p></div>`;
  $('#relayTok',sec).onclick=async()=>{if(info.relayToken&&!confirmAct('Un jeton existe déjà : en créer un nouveau coupera le relais actuel jusqu’à sa mise à jour. Continuer ?'))return;try{const r=await api('/api/relais/token',{method:'POST'});const o=$('#relayTokOut',sec);o.hidden=false;o.textContent=r.token;copyText(r.token,'Jeton copié : collez-le dans relais\\config.json')}catch(e){toast(e.message)}};
  const PY=$('#payCfg',sec);
  PY.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/connecteurs',{method:'POST',body:{paiement:{provider:PY.provider.value,acompte:+PY.acompte.value||50,sandbox:PY.sandbox.checked,apiKey:PY.apiKey.value,walletId:PY.walletId.value.trim(),appToken:PY.appToken.value,appSecret:PY.appSecret.value,actif:!!PY.provider.value}}});toast('Paiement en ligne enregistré')}catch(err){toast(err.message)}});
  $('#payTest',sec).onclick=async()=>{const o=$('#payOut',sec);o.textContent='…';try{const r=await api('/api/paiement/test',{method:'POST'});o.textContent=r.note}catch(err){o.textContent=err.message}};
  const AI=$('#aiCfg',sec);
  AI.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/connecteurs',{method:'POST',body:{assistant:{apiKey:AI.apiKey.value,model:AI.model.value,actif:AI.actif.checked}}});toast('Assistant enregistré')}catch(err){toast(err.message)}});
  $('#aiTest',sec).onclick=async()=>{const o=$('#aiOut',sec);o.textContent='Test en cours…';try{const r=await api('/api/assistant/test',{method:'POST',body:{}});o.textContent='Réponse : « '+r.reply.slice(0,160)+' »'}catch(err){o.textContent='Erreur : '+err.message}};
  const F=$('#mailCfg',sec);
  F.preset.onchange=()=>{if(F.preset.value==='gmail'){F.ihost.value='imap.gmail.com';F.iport.value=993;F.shost.value='smtp.gmail.com';F.sport.value=465}};
  F.addEventListener('submit',async e=>{e.preventDefault();const body={imap:{host:F.ihost.value.trim(),port:+F.iport.value||993,user:F.user.value.trim(),pass:F.pass.value,actif:F.actif.checked},smtp:{host:F.shost.value.trim(),port:+F.sport.value||465,user:F.user.value.trim(),pass:F.pass.value,from:F.from.value.trim()}};
    try{await api('/api/connecteurs',{method:'POST',body});toast('E-mail enregistré');setTimeout(()=>renderView(true),1500)}catch(err){toast(err.message)}});
  const M=$('#metaCfg',sec);
  M.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/connecteurs',{method:'POST',body:{meta:{pageId:M.pageId.value.trim(),apiVersion:M.apiVersion.value.trim()||'v23.0',pageToken:M.pageToken.value,igUserId:M.igUserId.value.trim(),actif:M.actif.checked}}});toast('Connexion Meta enregistrée');setTimeout(()=>renderView(true),1500)}catch(err){toast(err.message)}});
  const WA=$('#waCfg',sec);
  $('#genVerify',sec).onclick=()=>{const a=new Uint8Array(12);crypto.getRandomValues(a);WA.verifyToken.value=[...a].map(x=>x.toString(16).padStart(2,'0')).join('')};
  WA.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/connecteurs',{method:'POST',body:{meta:{appSecret:WA.appSecret.value,verifyToken:WA.verifyToken.value.trim()}}});toast('Réglages WhatsApp enregistrés');renderView(true)}catch(err){toast(err.message)}});
  const test=async()=>{toast('Test en cours (jusqu’à 30 secondes)…',30000);try{const t=await api('/api/connecteurs/test',{method:'POST'});const msg=Object.entries(t.result||{}).map(([k,v])=>`${{reception:'Réception',envoi:'Envoi',meta:'Meta'}[k]||k} : ${(STATE_TXT[v.state]||[])[1]||v.state}${v.note?' ('+v.note+')':''}`).join(' · ');toast(msg||'Rien à tester : enregistrez d’abord.',9000);renderView(true)}catch(err){toast(err.message,8000)}};
  $('#testMail',sec).onclick=test;$('#testMeta',sec).onclick=test;
  $('#siteCommande',sec).addEventListener('change',e=>{P().company.siteCommande=e.target.value.trim();save();toast('Adresse publique enregistrée')});
  $('#prCfg',sec).addEventListener('submit',async e=>{e.preventDefault();const list={};$$('[data-pr]',sec).forEach(i=>{(list[i.dataset.pr]=list[i.dataset.pr]||{id:i.dataset.pr})[i.dataset.k]=i.value.trim()});
    try{await api('/api/printers/config',{method:'POST',body:{printers:Object.values(list)}});toast('Imprimantes enregistrées : connexion en cours…');setTimeout(()=>{loadPrinters().then(()=>renderView(true))},6000)}catch(err){toast(err.message)}});
 }});

/* ---------------- Paramètres ---------------- */
let usersCache=[],infoCache=null;
view({id:'parametres',title:'Paramètres',group:'Gestion',icon:'gear',roles:['admin'],
 render(sec){
  const num=(path,v,step='0.01')=>`<input type="number" step="${step}" data-p="${path}" value="${esc(v)}">`;
  const txt=(path,v,ph='')=>`<input type="text" data-p="${path}" value="${esc(v)}" placeholder="${esc(ph)}">`;
  const p=P();
  sec.innerHTML=`
  <div class="grid2">
   <div class="panel"><h2>Équipe et plan de travail</h2><p class="small ink2">Associez chaque fonction à un compte : les tâches du plan arrivent dans son « Aujourd’hui ».</p>
    <table class="t">${['gestion','production','marketing'].map(fn=>`<tr><td>${esc(FN_LABEL[fn])}</td><td><select data-p="team.${fn}">${optList(members(),p.team[fn],'À choisir')}</select></td></tr>`).join('')}</table>
    <h3>Objectifs de chaque semaine</h3><table class="t">
     <tr><td>Contacts de prospection</td><td>${num('targets.contacts',p.targets.contacts,'1')}</td></tr><tr><td>Rendez-vous</td><td>${num('targets.rdv',p.targets.rdv,'1')}</td></tr>
     <tr><td>Devis envoyés</td><td>${num('targets.devis',p.targets.devis,'1')}</td></tr><tr><td>Demandes gagnées</td><td>${num('targets.gagnes',p.targets.gagnes,'1')}</td></tr><tr><td>Publications</td><td>${num('targets.posts',p.targets.posts,'1')}</td></tr></table></div>
   <div class="panel" id="usersPanel"><h2>Comptes</h2><p class="empty">Chargement…</p></div>
   <div class="panel" id="postesPanel"><h2>Ouvrir la plateforme sur les autres PC</h2><p class="empty">Chargement…</p></div>
   <div class="panel"><h2>Site client (faza3d.tn)</h2>
    <p class="small ink2">Le site vitrine lit ces réglages tout seul (téléphone, réseaux, tarif de l’estimation instantanée) et envoie ses demandes et fichiers STL ici, dans Demandes et prospection. Dans le fichier <code>site/index.html</code>, bloc <code>CONFIG</code>, mettez seulement : <code>plateforme: '${esc(p.company.sitePublic||'https://atelier.faza3d.tn')}'</code>.</p>
    <table class="t">
    <tr><td>Adresse du site client<div class="small muted">utilisée dans le message d’accès à l’espace client</div></td><td>${txt('site.url',p.site.url,'https://faza3d.tn')}</td></tr>
    <tr><td>WhatsApp (numéro affiché sur le site)</td><td>${txt('site.whatsapp',p.site.whatsapp,'+216 …')}</td></tr>
    <tr><td>Instagram</td><td>${txt('site.instagram',p.site.instagram,'https://instagram.com/faza3d.tn')}</td></tr>
    <tr><td>Facebook</td><td>${txt('site.facebook',p.site.facebook,'https://facebook.com/faza3d.tn')}</td></tr>
    <tr><td>TikTok</td><td>${txt('site.tiktok',p.site.tiktok,'https://tiktok.com/@faza3d.tn')}</td></tr>
    <tr><td>Horaires</td><td>${txt('site.hours',p.site.hours,'Lun–Sam 9h–18h')}</td></tr>
    <tr><td>Estimation instantanée<div class="small muted">prix affiché au client quand il dépose un STL</div></td><td><div class="row" style="gap:8px;flex-wrap:wrap">
      <label class="small">DT / gramme <input type="number" step="0.01" data-p="site.tarif.parGramme" value="${esc(p.site.tarif.parGramme)}" style="width:90px"></label>
      <label class="small">DT / heure <input type="number" step="0.5" data-p="site.tarif.parHeure" value="${esc(p.site.tarif.parHeure)}" style="width:90px"></label>
      <label class="small">Minimum DT <input type="number" step="1" data-p="site.tarif.minimum" value="${esc(p.site.tarif.minimum)}" style="width:90px"></label>
      <label class="small">Remplissage <input type="number" step="0.05" min="0.05" max="1" data-p="site.tarif.remplissage" value="${esc(p.site.tarif.remplissage)}" style="width:90px"></label>
      <label class="small">Lithophane 10 × 7,5 cm (DT) <input type="number" step="1" data-p="site.tarif.lithophane" value="${esc(p.site.tarif.lithophane)}" style="width:90px"></label>
      <label class="small">Relief / porte-clés minimum (DT) <input type="number" step="1" data-p="site.tarif.reliefMin" value="${esc(p.site.tarif.reliefMin)}" style="width:90px"></label></div></td></tr>
    </table></div>
   <div class="panel"><h2>Société (devis et factures)</h2><table class="t">
    <tr><td>Raison sociale</td><td>${txt('company.name',p.company.name)}</td></tr><tr><td>Nom commercial</td><td>${txt('company.brand',p.company.brand)}</td></tr>
    <tr><td>Matricule fiscal</td><td>${txt('company.mf',p.company.mf,'0000000/X/A/M/000')}</td></tr><tr><td>Registre (RNE)</td><td>${txt('company.rc',p.company.rc)}</td></tr>
    <tr><td>Adresse</td><td>${txt('company.address',p.company.address)}</td></tr><tr><td>Téléphone</td><td>${txt('company.phone',p.company.phone,'+216 …')}</td></tr>
    <tr><td>E-mail</td><td>${txt('company.email',p.company.email)}</td></tr><tr><td>Banque</td><td>${txt('company.bank',p.company.bank)}</td></tr><tr><td>RIB</td><td>${txt('company.rib',p.company.rib)}</td></tr>
    <tr><td>Adresse publique de la plateforme<div class="small muted">pour les liens de devis et de suivi envoyés aux clients</div></td><td>${txt('company.sitePublic',p.company.sitePublic,'https://atelier.faza3d.tn')}</td></tr>
    <tr><td>E-mails automatiques au client<div class="small muted">à la réception de la commande, à la validation, en fabrication, quand c’est prêt et à la livraison (français + arabe, avec le lien de suivi). Nécessite Connexions › E-mail (envoi) et l’e-mail du client dans sa fiche.</div></td><td><label class="chk"><input type="checkbox" data-p="company.mailEtapes" ${p.company.mailEtapes===false?'':'checked'}> Activés</label></td></tr>
    <tr><td>Conditions des devis</td><td><textarea data-p="company.devisConditions" rows="2">${esc(p.company.devisConditions)}</textarea></td></tr>
    <tr><td>Conditions des factures</td><td><textarea data-p="company.factureConditions" rows="2">${esc(p.company.factureConditions)}</textarea></td></tr>
    <tr><td>Logo (PNG)</td><td><div class="row"><img id="logoPrev" alt="" style="max-height:44px;display:none"><input type="file" id="logoIn" accept="image/png" style="width:auto"><button class="lnk badc" id="logoDel" type="button">Retirer</button></div></td></tr>
    <tr><td>Cachet et signature (PNG, fond transparent)<div class="small muted">imprimés en bas des factures, devis et avoirs</div></td><td><div class="row"><img id="stampPrev" alt="" style="max-height:60px;display:none"><input type="file" id="stampIn" accept="image/png" style="width:auto"><button class="lnk badc" id="stampDel" type="button">Retirer</button></div></td></tr>
    <tr><td>Signature électronique (certificat .p12 / .pfx)<div class="small muted">par défaut : certificat interne gratuit, créé tout seul. Optionnel : importer un certificat TunTrust (.p12) à la place. Chaque facture porte aussi un QR code de vérification (adresse publique de la plateforme requise)</div></td><td><div id="certBox" class="small muted">…</div><div class="row" style="margin-top:6px"><input type="file" id="certIn" accept=".p12,.pfx" style="width:auto"><input type="password" id="certPass" placeholder="Mot de passe du certificat" autocomplete="new-password" style="width:200px"><button class="btn small" id="certGo" type="button">Enregistrer</button><button class="lnk badc" id="certDel" type="button">Retirer</button></div></td></tr></table>
    <p class="note">Faites valider le modèle de devis et de facture par votre comptable avant la première utilisation.</p></div>
   <div class="panel"><h2>Taux et charges</h2><table class="t">
    <tr><td>Électricité (TND/kWh TTC)</td><td>${num('rates.elec',p.rates.elec,'0.001')}</td></tr><tr><td>Maintenance (TND/h machine)</td><td>${num('rates.maint',p.rates.maint)}</td></tr>
    <tr><td>Usure du tube laser (TND/h)</td><td>${num('laser.tube',p.laser.tube)}</td></tr><tr><td>Technicien (TND/h, charges comprises)</td><td>${num('rates.tech',p.rates.tech)}</td></tr>
    <tr><td>Conception (TND/h, charges comprises)</td><td>${num('rates.design',p.rates.design)}</td></tr><tr><td>Taux d’échec par défaut (%)</td><td>${num('rates.fail',p.rates.fail,'1')}</td></tr>
    <tr><td colspan="2"><b>Frais fixes mensuels</b> <span class="small muted">répartis sur les heures machine dans chaque devis</span></td></tr>
    <tr><td>Loyer (TND/mois)</td><td>${num('rates.fixed.loyer',p.rates.fixed.loyer,'10')}</td></tr><tr><td>Charges du local : électricité de base, eau, assurance (TND/mois)</td><td>${num('rates.fixed.charges',p.rates.fixed.charges,'10')}</td></tr>
    <tr><td>Abonnement internet (TND/mois)</td><td>${num('rates.fixed.internet',p.rates.fixed.internet,'1')}</td></tr>
    <tr><td>Hébergement de la plateforme et du site : serveur VPS (TND/mois)</td><td>${num('rates.fixed.hebergement',p.rates.fixed.hebergement,'1')}</td></tr>
    <tr><td>Nom de domaine faza3d.tn (TND/mois, soit 12 TND/an)</td><td>${num('rates.fixed.domaine',p.rates.fixed.domaine,'0.5')}</td></tr>
    <tr><td>Salaires fixes et charges sociales (TND/mois)</td><td>${num('rates.fixed.salaires',p.rates.fixed.salaires,'10')}</td></tr><tr><td>Divers : comptable, marketing, amortissement PC et scanner (TND/mois)</td><td>${num('rates.fixed.divers',p.rates.fixed.divers,'10')}</td></tr>
    <tr><td>Heures machine prévues par mois<div class="small muted">utilisées tant qu’il n’y a pas 3 mois d’historique</div></td><td>${num('rates.machineHoursMonth',p.rates.machineHoursMonth,'10')}</td></tr>
    <tr><td>Frais de préparation par commande (TND)<div class="small muted">devis, réglages, lancement : ajoutés une fois par commande</div></td><td>${num('rates.prepFee',p.rates.prepFee,'0.5')}</td></tr>
    <tr><td class="small muted" colspan="2">${(()=>{const mh=machineHoursUsed();return `Taux appliqué aujourd’hui : <b>${fmt(fixedRate())} TND par heure machine</b> = ${fmt(fixedMonthTotal(),0)} TND ÷ ${fmt(mh.hours,0)} h ${mh.real?'(moyenne réelle des 3 derniers mois)':'(prévues)'}.`})()}</td></tr>
    <tr><td>TVA (%)</td><td>${num('rates.vat',p.rates.vat,'1')}</td></tr><tr><td>Timbre fiscal (TND)</td><td>${num('rates.timbre',p.rates.timbre,'0.001')}</td></tr></table>
    <p class="note">Frais fixes répartis : ${fmt(fixedRate())} TND par heure machine.</p></div>
   <div class="panel"><h2>Machines</h2><table class="t"><tr><th></th><th>Prix TND</th><th>kW</th><th>Durée de vie (h)</th></tr>
    ${p.printers.map((m,i)=>`<tr><td>${esc(m.name)}</td><td>${num(`printers.${i}.price`,m.price,'1')}</td><td>${num(`printers.${i}.kw`,m.kw)}</td><td>${num(`printers.${i}.life`,m.life,'100')}</td></tr>`).join('')}
    <tr><td>${esc(p.laser.name)}</td><td>${num('laser.price',p.laser.price,'1')}</td><td>${num('laser.kw',p.laser.kw)}</td><td>${num('laser.life',p.laser.life,'100')}</td></tr></table>
    <p class="note">Coût machine : ${p.printers.map(m=>`${esc(m.name)} ${fmt(rateFor(m))} TND/h`).join(', ')}, laser ${fmt(laserRate())} TND/h.</p></div>
   <div class="panel"><h2>Finances</h2><table class="t">
    <tr><td>Trésorerie de départ (TND)</td><td>${num('finance.tresorerieDepart',p.finance.tresorerieDepart,'1')}</td></tr>
    <tr><td>Date de départ du suivi<div class="small muted">les paiements et dépenses à partir de cette date comptent</div></td><td><input type="date" data-p="finance.dateDepart" value="${esc(p.finance.dateDepart||'')}"></td></tr>
    <tr><td>Retenue à la source (%)</td><td>${num('rates.rs',p.rates.rs,'0.5')}</td></tr><tr><td>À partir de (TND TTC)</td><td>${num('rates.rsMin',p.rates.rsMin,'1')}</td></tr></table>
    <p class="note">Taux et seuil de retenue à la source : à confirmer avec le comptable (la loi change).</p></div>
   <div class="panel"><h2>Fournisseurs</h2><table class="t" id="supTable">${(p.suppliers||[]).map((s,i)=>`<tr><td>${txt(`suppliers.${i}.name`,s.name,'Nom')}</td><td>${txt(`suppliers.${i}.email`,s.email||'','e-mail')}</td><td>${txt(`suppliers.${i}.phone`,s.phone||'','téléphone')}</td><td>${txt(`suppliers.${i}.url`,s.url||'','site')}</td><td><button class="lnk badc" data-delsup="${i}">✕</button></td></tr>`).join('')}</table>
    <div class="row mt"><button class="btn small" id="supAdd">Ajouter un fournisseur</button></div></div>
   <div class="panel"><h2>Entretien des machines</h2><p class="small ink2">Intervalles en heures d’impression (imprimantes reliées) ; sinon convertis en jours.</p><table class="t">
    <tr><td>Nettoyage du plateau</td><td>${num('maintenance.plateau',p.maintenance.plateau,'10')}</td></tr><tr><td>Contrôle ou remplacement de la buse</td><td>${num('maintenance.buse',p.maintenance.buse,'10')}</td></tr>
    <tr><td>Graissage des axes et courroies</td><td>${num('maintenance.axes',p.maintenance.axes,'10')}</td></tr><tr><td>Ventilateurs et filtre</td><td>${num('maintenance.ventilateurs',p.maintenance.ventilateurs,'10')}</td></tr>
    <tr><td>Laser : lentille et miroirs</td><td>${num('maintenance.laserOptique',p.maintenance.laserOptique,'10')}</td></tr><tr><td>Laser : rails, courroies, pompe</td><td>${num('maintenance.laserRails',p.maintenance.laserRails,'10')}</td></tr></table></div>
   <div class="panel"><h2>Matières</h2><table class="t">${p.materials.map((m,i)=>`<tr><td>${esc(m.name)}</td><td>${num(`materials.${i}.kg`,m.kg,'1')}</td><td class="muted">TND/kg</td></tr>`).join('')}
    ${p.sheets.map((m,i)=>`<tr><td>${esc(m.name)}</td><td>${num(`sheets.${i}.m2`,m.m2,'1')}</td><td class="muted">TND/m²</td></tr>`).join('')}</table><p class="note">Prix des plaques indicatifs : mettez ceux de votre fournisseur.</p></div>
   <div class="panel"><h2>Atelier et flux</h2><table class="t">
    <tr><td>Ouverture (h)</td><td>${num('shop.start',p.shop.start,'1')}</td></tr><tr><td>Fermeture (h)</td><td>${num('shop.end',p.shop.end,'1')}</td></tr>
    <tr><td>Délai de validation client (h)</td><td>${num('lead.val',p.lead.val,'1')}</td></tr>
    ${STAGES.filter(s=>s.id!=='done').map(s=>`<tr><td>Encours max : ${s.name}</td><td>${num('wip.'+s.id,p.wip[s.id]??s.wip,'1')}</td></tr>`).join('')}</table></div>
  </div>
  <div class="row end mt"><button class="btn" id="resetParams">Revenir aux coûts du dossier</button></div>`;
  sec.onchange=e=>{const el=e.target.closest('[data-p]');if(!el)return;const path=el.dataset.p.split('.');let o=P();for(let i=0;i<path.length-1;i++)o=o[path[i]];o[path.at(-1)]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value.trim();save();toast('Enregistré')};
  sec.addEventListener('click',e=>{const d=e.target.closest('[data-delsup]');if(d){P().suppliers.splice(+d.dataset.delsup,1);save();renderView(true)}if(e.target.id==='supAdd'){P().suppliers.push({id:uid('f'),name:'',email:'',phone:'',url:''});save();renderView(true)}});
  $('#resetParams',sec).onclick=()=>{if(!confirmAct('Remettre les coûts, taux et machines aux valeurs du dossier ? (la société et l’équipe sont gardées)'))return;const keep={company:P().company,team:P().team,targets:P().targets};DB.params=normParams({...clone(DEF_PARAMS),...keep});save();renderView(true);toast('Valeurs du dossier rétablies')};
  // logo
  const prev=$('#logoPrev',sec);fetch('/api/logo',{credentials:'same-origin'}).then(r=>r.ok?r.blob():null).then(b=>{if(b){prev.src=URL.createObjectURL(b);prev.style.display='block'}}).catch(()=>{});
  $('#logoIn',sec).onchange=async e=>{const f=e.target.files[0];if(!f)return;const data=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(f)});try{await api('/api/logo',{method:'POST',body:{data}});toast('Logo enregistré : il apparaît sur les devis et factures');renderView(true)}catch(err){toast(err.message)}};
  $('#logoDel',sec).onclick=async()=>{try{await api('/api/logo',{method:'POST',body:{data:null}});toast('Logo retiré');renderView(true)}catch(err){toast(err.message)}};
  const sprev=$('#stampPrev',sec);fetch('/api/cachet',{credentials:'same-origin'}).then(r=>r.ok?r.blob():null).then(b=>{if(b){sprev.src=URL.createObjectURL(b);sprev.style.display='block'}}).catch(()=>{});
  $('#stampIn',sec).onchange=async e=>{const f=e.target.files[0];if(!f)return;const data=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(f)});try{await api('/api/cachet',{method:'POST',body:{data}});toast('Cachet enregistré : il apparaît sur les factures, devis et avoirs');renderView(true)}catch(err){toast(err.message)}};
  $('#stampDel',sec).onclick=async()=>{try{await api('/api/cachet',{method:'POST',body:{data:null}});toast('Cachet retiré');renderView(true)}catch(err){toast(err.message)}};
  const certBox=$('#certBox',sec);const showCert=async()=>{try{const c=await api('/api/certificat');if(!c.libs)certBox.innerHTML='<span class="badc">Modules de signature absents : relancez installer.bat.</span>';else if(!c.present)certBox.textContent='Certificat interne créé automatiquement au premier PDF.';else if(c.error)certBox.innerHTML='<span class="badc">Certificat illisible : '+esc(c.error)+'</span>';else certBox.innerHTML='<b>Actif</b> · '+esc(c.cn||'')+(c.org?' ('+esc(c.org)+')':'')+' · émis par '+esc(c.issuer||'?')+' · valable jusqu’au '+new Date(c.validTo).toLocaleDateString('fr-TN')+(c.selfSigned?' · certificat interne gratuit (intégrité du PDF garantie ; un certificat TunTrust peut le remplacer si un client l’exige)':' · certificat externe')}catch(e){certBox.textContent=e.message}};showCert();
  $('#certGo',sec).onclick=async()=>{const f=$('#certIn',sec).files[0];if(!f)return toast('Choisissez le fichier .p12');const data=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(f)});try{const r=await api('/api/certificat',{method:'POST',body:{data,password:$('#certPass',sec).value}});toast('Certificat enregistré : '+(r.cn||''));$('#certPass',sec).value='';$('#certIn',sec).value='';showCert()}catch(err){toast(err.message,6000)}};
  $('#certDel',sec).onclick=async()=>{if(!confirm('Retirer le certificat ? Les prochains PDF ne seront plus signés numériquement.'))return;try{await api('/api/certificat',{method:'POST',body:{data:null}});toast('Certificat retiré');showCert()}catch(err){toast(err.message)}};
  renderUsers(sec);renderPostes(sec);
 }});
async function renderUsers(sec){
  const box=$('#usersPanel',sec);if(!box)return;
  try{usersCache=await api('/api/users')}catch(e){box.innerHTML='<p class="badc">'+esc(e.message)+'</p>';return}
  box.innerHTML=`<h2>Comptes</h2><table class="t"><tr><th>Nom</th><th>Rôle</th><th></th></tr>${usersCache.map(u=>`<tr><td><b>${esc(u.name)}</b>${u.name===ME.name?' <span class="tag">vous</span>':''}<div class="small muted">${u.last_login?'dernière connexion '+ago(u.last_login):'jamais connecté'}</div></td>
    <td><select data-role="${esc(u.name)}" ${u.name===ME.name?'disabled':''}>${optList(Object.entries(ROLE_LABEL).map(([id,name])=>({id,name})),u.role)}</select></td>
    <td class="r" style="white-space:nowrap"><button class="lnk" data-pw="${esc(u.name)}">Mot de passe</button>${u.name!==ME.name?` <button class="lnk badc" data-deluser="${esc(u.name)}">Supprimer</button>`:''}</td></tr>`).join('')}</table>
   <form class="inline-form" id="userForm"><label>Nom (sans e-mail)<input name="name" required minlength="2" autocomplete="off" placeholder="Khalil"></label><label>Rôle<select name="role"><option value="commercial">Commercial et marketing</option><option value="production">Production</option><option value="admin">Administrateur</option></select></label>
    <label>Mot de passe (8 caractères min.)<input name="password" type="password" required minlength="8" autocomplete="new-password"></label><button class="btn primary">Créer le compte</button></form>
   <p class="note"><b>Administrateur</b> : tout. <b>Commercial et marketing</b> : demandes, clients, devis, factures, réseaux, production en lecture et écriture, sans Finances ni réglages. <b>Production</b> : flux, planning, imprimantes, stock, qualité, plan de travail et messages, sans aucun prix ni coordonnées complètes des clients (retirés par le serveur).</p>`;
  $('#userForm',box).onsubmit=async e=>{e.preventDefault();const f=e.target;try{await api('/api/users',{method:'POST',body:{name:f.name.value,role:f.role.value,password:f.password.value}});toast('Compte créé');await loadTeam();renderUsers(sec);loadChatSummary()}catch(err){toast(err.message,5000)}};
  box.onchange=async e=>{const s=e.target.closest('[data-role]');if(!s)return;try{await api(`/api/users/${encodeURIComponent(s.dataset.role)}/role`,{method:'POST',body:{role:s.value}});toast('Rôle changé : la personne doit se reconnecter');loadTeam()}catch(err){toast(err.message);renderUsers(sec)}};
  box.onclick=async e=>{const pw=e.target.closest('[data-pw]'),del=e.target.closest('[data-deluser]');
    try{if(pw){const v=prompt(`Nouveau mot de passe pour ${pw.dataset.pw} (8 caractères minimum) :`);if(v){await api(`/api/users/${encodeURIComponent(pw.dataset.pw)}/password`,{method:'POST',body:{password:v}});toast('Mot de passe changé')}}
      if(del&&confirmAct(`Supprimer le compte ${del.dataset.deluser} ?`)){await api(`/api/users/${encodeURIComponent(del.dataset.deluser)}`,{method:'DELETE'});toast('Compte supprimé');await loadTeam();renderUsers(sec)}}catch(err){toast(err.message)}};
}
async function renderPostes(sec){
  const box=$('#postesPanel',sec);if(!box)return;
  try{infoCache=await api('/api/info')}catch(e){box.innerHTML='<p class="badc">'+esc(e.message)+'</p>';return}
  const i=infoCache;
  box.innerHTML=`<h2>Ouvrir la plateforme sur les autres PC</h2>
   ${i.accesReseau?`<p class="small ink2">Les autres PC doivent être sur le même réseau (Wi-Fi ou câble) que ce PC. Adresses de la plateforme :</p>
   <ul class="steps small">${i.addresses.map(a=>`<li><code>${esc(a)}</code></li>`).join('')}</ul>
   <h3>Sur le PC de Khalil ou de Mohamed (une seule fois)</h3>
   <ol class="steps small"><li>Copiez le fichier <code>poste-equipe.bat</code> (dans le dossier de la plateforme) sur une clé USB, puis sur le bureau de l’autre PC.</li>
    <li>Double-cliquez dessus et tapez le nom de ce PC : <b>${esc(i.hostname)}</b> (ou l’adresse IP).</li>
    <li>Il installe le certificat de l’atelier (Windows demande de confirmer : « Oui ») et crée l’icône <b>FAZA 3D Atelier</b> sur le bureau.</li>
    <li>Créez le compte de la personne ci-contre, puis elle se connecte avec son nom.</li></ol>
   <p class="note">Téléphone ou tablette : ouvrez <code>http://${esc(i.hostname)}:${i.port}/poste</code> et suivez les instructions. Ce PC doit rester allumé (et sans mise en veille) pendant les heures de travail. Pour travailler depuis l’extérieur, installez Tailscale sur ce PC et sur les autres (gratuit) : n’ouvrez jamais le port ${i.port} sur la box.</p>`
   :`<div class="callout warn">L’accès depuis les autres PC est désactivé (<code>"accesReseau": false</code> dans config.json).</div>`}`;
}

/* ---------------- Mon compte ---------------- */
view({id:'compte',title:'Mon compte',group:'Gestion',icon:'user',update:false,
 render(sec){
  const theme=(()=>{try{return localStorage.getItem('faza_theme')||'light'}catch(e){return 'light'}})();
  sec.innerHTML=`<div class="grid2">
   <div class="panel"><h2>${esc(ME.name)}</h2><p class="ink2">${esc(ROLE_LABEL[ME.role]||ME.role)}</p>
    <h3>Apparence</h3><div class="seg" role="group" aria-label="Thème">${[['light','Clair'],['dark','Sombre'],['auto','Comme Windows']].map(([v,l])=>`<button data-theme="${v}" aria-pressed="${theme===v}">${l}</button>`).join('')}</div>
    <h3>Application mobile</h3>
    ${isNativeApp()?'<p class="small okc">Vous utilisez l’application FAZA 3D Atelier.</p>':isStandalone()?'<p class="small okc">Vous utilisez la plateforme en application installée.</p>':`<div class="install"><span>Installez la plateforme comme une application : icône sur l’écran d’accueil, plein écran, notifications.</span><button class="btn primary small" id="installBtn">Installer l’application</button></div><p class="note">Android (Chrome) : le bouton ci-dessus ou menu ⋮ › « Installer l’application ». iPhone (Safari) : Partager › « Sur l’écran d’accueil ».</p>`}
    <h3>Notifications</h3>
    <div id="pushBox"><p class="small muted">Vérification…</p></div>
    ${'Notification' in window&&Notification.permission==='granted'?`<label class="chk" style="margin-top:8px"><input type="checkbox" id="notifChk" ${LS.get('notif',true)?'checked':''}> Notification quand la plateforme est ouverte dans un onglet (nouveaux messages)</label>`:''}
    <div class="row mt"><button class="btn" id="logout2">Se déconnecter</button></div></div>
   <div class="panel"><h2>Changer mon mot de passe</h2><form id="pwForm"><fieldset style="grid-template-columns:1fr">
    <label>Mot de passe actuel<input name="old" type="password" required autocomplete="current-password"></label>
    <label>Nouveau mot de passe (8 caractères min.)<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
    <label>Confirmer<input name="password2" type="password" required minlength="8" autocomplete="new-password"></label></fieldset><button class="btn primary">Changer le mot de passe</button></form></div></div>`;
  sec.onclick=async e=>{
    const t=e.target.closest('[data-theme]');if(t){try{localStorage.setItem('faza_theme',t.dataset.theme)}catch(err){}if(t.dataset.theme==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',t.dataset.theme);renderView(true)}
    if(e.target.id==='notifAsk'){try{await Notification.requestPermission()}catch(err){}renderView(true)}
    if(e.target.id==='installBtn')installApp();
    if(e.target.id==='pushOn'){await enablePush();renderView(true)}
    if(e.target.id==='pushOff'){await disablePush();renderView(true)}
    if(e.target.id==='logout2')$('#logoutBtn').click();
  };
  const nc=$('#notifChk',sec);if(nc)nc.onchange=()=>LS.set('notif',nc.checked);
  pushState().then(st=>{const b=$('#pushBox',sec);if(!b)return;b.innerHTML=st==='app'?`<p class="small">Notifications gérées par l’application (messages privés, mentions, impressions terminées, nouvelles demandes). Si elles n’arrivent pas : réglages Android › Applications › FAZA 3D Atelier › Notifications.</p>`:st==='oui'?`<p class="small">Notifications <b class="okc">activées</b> sur cet appareil : messages qui vous mentionnent, messages privés, impressions terminées, nouvelles demandes.</p><button class="btn small" id="pushOff">Désactiver sur cet appareil</button>`:`<p class="small ink2">Recevez les messages privés, les mentions @${esc(ME.name)}, les impressions terminées et les nouvelles demandes, même quand la plateforme est fermée.</p><button class="btn primary small" id="pushOn">Activer les notifications</button>${isIOS()&&!isStandalone()?'<p class="note">Sur iPhone, installez d’abord l’application sur l’écran d’accueil.</p>':''}`});
  $('#pwForm',sec).onsubmit=async e=>{e.preventDefault();const f=e.target;if(f.password.value!==f.password2.value)return toast('Les deux mots de passe ne correspondent pas.');
    try{await api('/api/password',{method:'POST',body:{old:f.old.value,password:f.password.value}});f.reset();toast('Mot de passe changé')}catch(err){toast(err.message)}};
 }});
