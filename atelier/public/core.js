'use strict';
/* =====================================================================
   FAZA 3D Atelier : noyau de l'interface
   (données, synchronisation entre postes, temps réel, navigation, outils)
   ===================================================================== */

/* ---------------- Constantes ---------------- */
const STAGES=[
 {id:'cmd',name:'Commande reçue',wip:10},{id:'cao',name:'Conception',wip:4},{id:'val',name:'Validation client',wip:8},
 {id:'prod',name:'Impression / laser',wip:6},{id:'fin',name:'Finition',wip:4},{id:'qc',name:'Contrôle qualité',wip:4},
 {id:'pack',name:'Emballage',wip:6},{id:'done',name:'Livré',wip:999}];
const MONTHS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const DAYS=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const PLAN2027=[2500,3500,4000,4500,6000,8000,6500,4000,5500,6000,6500,8500];
const LEAD_STAGES=[{id:'nouveau',name:'Nouvelles demandes'},{id:'cible',name:'À prospecter'},{id:'contacte',name:'Contactés'},{id:'rdv',name:'Rendez-vous'},{id:'devis',name:'Devis envoyé'},{id:'gagne',name:'Gagnés'},{id:'perdu',name:'Perdus'}];
const SEGMENTS=['École / université','Entreprise / banque / assurance','Club / association','Santé / architecture','Commerce / restaurant','Événementiel / partenaire','Administration (TUNEPS)','Particulier'];
const SOURCES=['Instagram','Facebook','TikTok','WhatsApp','E-mail','Formulaire','Téléphone','Terrain','Salon','Recommandation','Site web','Google','QR code','Autre'];
const CLIENT_KINDS=['Entreprise','École / université','Club / association','Clinique / cabinet','Architecte / promoteur','Commerce / restaurant','Administration','Particulier','Revendeur'];
const ROLE_LABEL={admin:'Administrateur',commercial:'Commercial et marketing',production:'Production'};
const H=36e5, D=24*H;
const COLLS=['clients','orders','stock','catalog','failures','tasks','leads','quotes','social','expenses','purchases','maintenance'];
const EXP_CATS=['Matières (filament, plaques)','Loyer','Salaires et charges sociales','Électricité et internet','Marketing et publicité','Équipement et outillage','Emballage et livraison','Transport et déplacements','Comptable, banque, administratif','Entretien et pièces','Autre'];
const PAY_MODES=['Espèces','Virement','Chèque','Carte','D17 / mobile','Retenue à la source'];
const DEF_PARAMS={
 printers:[{id:'x2d',name:'X2D Combo',price:4090,kw:0.35,life:10000},{id:'a2l',name:'A2L Combo',price:2290,kw:0.25,life:8000},
   {id:'p1s',name:'P1S',price:2190,kw:0.30,life:8000},{id:'a1',name:'A1',price:1380,kw:0.15,life:6000}],
 laser:{name:'Laser CO2 50 W',price:4680,kw:1.0,life:8000,tube:0.25},
 materials:[{id:'pla',name:'PLA',kg:80},{id:'petg',name:'PETG',kg:90},{id:'abs',name:'ABS',kg:90},{id:'plas',name:'PLA spécial (silk, marbre)',kg:120}],
 sheets:[{id:'mdf3',name:'MDF 3 mm',m2:30},{id:'plx3',name:'Plexi transparent 3 mm',m2:120},{id:'plxc',name:'Plexi couleur 3 mm',m2:140},{id:'bois',name:'Contreplaqué 3 mm',m2:45}],
 rates:{elec:0.465,maint:0.15,tech:4.8,design:8.2,fixedMonth:1900,machineHoursMonth:250,prepFee:5,fixed:{loyer:600,charges:240,internet:60,hebergement:35,domaine:1,salaires:1900,divers:400},vat:19,timbre:1,fail:8,rs:1,rsMin:1000},
 shop:{start:9,end:18,days:[1,2,3,4,5,6]},
 lead:{cmd:4,cao:2,val:24},
 company:{name:'Copy Store SARL',brand:'FAZA 3D',mf:'',rc:'',address:'Tunis',phone:'',email:'',bank:'',rib:'',
   devisConditions:'Acompte de 50 % à la commande, solde à la livraison. Prix en dinars tunisiens.',factureConditions:'Paiement à réception de la facture.',sitePublic:'',rapportEmails:''},
 finance:{tresorerieDepart:4500,dateDepart:''},
 site:{url:'',whatsapp:'',instagram:'',facebook:'',tiktok:'',hours:'Lun–Sam 9h–18h',tarif:{parGramme:0.35,parHeure:4,minimum:15,remplissage:0.2,lithophane:55,reliefMin:12}},
 suppliers:[{id:'f1',name:'3dprint.tn',url:'https://3dprint.tn/boutique/',email:'',phone:''}],
 maintenance:{plateau:50,buse:200,axes:300,ventilateurs:500,laserOptique:40,laserRails:150},
 team:{gestion:'',production:'',marketing:''},
 targets:{contacts:20,rdv:5,devis:4,gagnes:2,posts:6},
 wip:Object.fromEntries(STAGES.map(s=>[s.id,s.wip]))
};

/* ---------------- Outils ---------------- */
const LS={get(k,d){try{const v=localStorage.getItem('faza_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('faza_'+k,JSON.stringify(v))}catch(e){}}};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=2)=>Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
const uid=p=>p+Date.now().toString(36).slice(-4)+Math.random().toString(36).slice(2,7);
const clone=o=>JSON.parse(JSON.stringify(o));
function toast(t,ms=3200){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',ms)}
function dur(ms){if(!(ms>0))return '0 min';const h=ms/H;if(h<1)return Math.round(h*60)+' min';if(h<48)return fmt(h,1).replace(',0','')+' h';return fmt(h/24,1).replace(',0','')+' j'}
function dt(d){return new Date(d).toLocaleString('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
function dday(d){return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
function hm(d){return new Date(d).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
function ago(t){const m=(Date.now()-t)/60000;if(m<1)return 'à l’instant';if(m<60)return 'il y a '+Math.round(m)+' min';if(m<1440)return 'il y a '+Math.round(m/60)+' h';return 'il y a '+Math.round(m/1440)+' j'}
function toLocalInput(ms){if(!ms)return '';const d=new Date(ms);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
function dkey(d){d=new Date(d);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function parseDay(k){const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)}
function monday(d){d=new Date(d);d.setHours(0,0,0,0);const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return d}
const initials=n=>String(n||'?').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
const optList=(a,sel,blank)=>(blank!=null?`<option value="">${esc(blank)}</option>`:'')+a.map(x=>{const v=typeof x==='string'?x:x.id,l=typeof x==='string'?x:x.name;return `<option value="${esc(v)}"${String(v)===String(sel??'')?' selected':''}>${esc(l)}</option>`}).join('');
function setOpts(el,html){if(!el)return;const v=el.value;el.innerHTML=html;if([...el.options].some(o=>o.value===v))el.value=v}
function confirmAct(t){return window.confirm(t)}
function num(v){const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?0:n}

/* ---------------- État ---------------- */
let ME=null;                 // {name, role}
let DB=null;                 // {clients:[],orders:[],...,params}
let SEQ=0;
const SNAP=new Map();        // 'coll:id' -> JSON connu du serveur
let PSNAP='';
let LIVE={}, UTIL={}, ONLINE=[], TEAM=[];
let cur=null;
const isAdmin=()=>ME&&ME.role==='admin';
const isSales=()=>ME&&(ME.role==='admin'||ME.role==='commercial');
const P=()=>DB.params;

/* ---------------- Accès au serveur ---------------- */
async function api(path,opts={}){
  const o={...opts,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Faza':'1',...(opts.headers||{})}};
  if(o.body&&typeof o.body!=='string')o.body=JSON.stringify(o.body);
  let r;
  try{r=await fetch(path,o)}catch(e){const err=new Error('Le serveur de l’atelier ne répond pas.');err.status=0;throw err}
  let body=null;try{body=await r.json()}catch(e){}
  if(!r.ok){const err=new Error(body?.error||('Erreur '+r.status));err.status=r.status;err.body=body;if(r.status===401&&ME&&!path.startsWith('/api/login'))showLogin(false,true);throw err}
  return body;
}

/* ---------------- Paramètres ---------------- */
function normParams(p){
  p=p||{};const out=Object.assign(clone(DEF_PARAMS),p);
  for(const k of ['rates','shop','lead','company','wip','laser','team','targets','finance','maintenance','site'])out[k]=Object.assign(clone(DEF_PARAMS[k]),p[k]||{});
  out.site.tarif=Object.assign(clone(DEF_PARAMS.site.tarif),(p.site&&p.site.tarif)||{});
  out.rates.fixed=Object.assign(clone(DEF_PARAMS.rates.fixed),(p.rates&&p.rates.fixed)||{});
  if(p.rates&&p.rates.machineHoursMonth===600&&!p.rates.fixed)out.rates.machineHoursMonth=250; // ancienne valeur par défaut trop optimiste
  if(!Array.isArray(p.suppliers))out.suppliers=clone(DEF_PARAMS.suppliers);
  for(const k of ['printers','materials','sheets'])if(!Array.isArray(p[k])||!p[k].length)out[k]=clone(DEF_PARAMS[k]);
  return out;
}
function normOrder(o){o.payments=o.payments||[];o.photos=o.photos||[];o.files=o.files||[];o.use=o.use||{mat:'',g:0,sheet:'',m2:0};if(!Array.isArray(o.hist)||!o.hist.length)o.hist=[{stage:'cmd',at:o.created||Date.now()}];return o}

/* ---------------- Synchronisation ---------------- */
let dirty=false, saveT=null, flushing=null, pulling=false, pullAgain=false, offline=false, retryT=null;
function setSync(state,txt){
  const d=$('#syncDot'),t=$('#syncTxt');if(!d)return;
  d.className='dot '+(state==='ok'?'on':state==='saving'?'warn':'bad');t.textContent=txt;
}
function emptyDB(){const o={params:normParams({})};for(const c of COLLS)o[c]=[];return o}
function applyRemote(r){
  let changed=false;
  for(const [coll,list] of Object.entries(r.changes||{})){
    if(!DB[coll])DB[coll]=[];
    const byId=new Map(DB[coll].map(x=>[x.id,x]));
    for(const rec of list){
      const k=coll+':'+rec.id;
      if(rec._deleted){byId.delete(rec.id);SNAP.delete(k)}
      else{
        const local=byId.get(rec.id);
        // une modification locale pas encore envoyée garde la priorité ; elle partira au prochain envoi
        if(local&&SNAP.has(k)&&JSON.stringify(local)!==SNAP.get(k)&&dirty){SNAP.set(k,JSON.stringify(rec));continue}
        if(coll==='orders')normOrder(rec);
        byId.set(rec.id,rec);SNAP.set(k,JSON.stringify(rec));
      }
      changed=true;
    }
    DB[coll]=[...byId.values()];
  }
  if(r.params){DB.params=normParams(r.params);PSNAP=JSON.stringify(DB.params);changed=true}
  SEQ=Math.max(SEQ,r.seq||0);
  return changed;
}
async function loadAll(){
  const r=await api('/api/sync?since=0');
  DB=emptyDB();SNAP.clear();SEQ=0;
  applyRemote(r);
  if(!r.params){PSNAP='';if(isAdmin())save()} // première fois : enregistrer les paramètres du dossier
}
async function pull(){
  if(!DB)return;
  if(pulling){pullAgain=true;return}
  pulling=true;
  try{
    if(dirty)await flush();
    const r=await api('/api/sync?since='+SEQ);
    if(applyRemote(r))renderSoon();
    if(!dirty)setSync('ok','Synchronisé');
  }catch(e){if(e.status===0){setSync('bad','Hors ligne');scheduleRetry()}}
  finally{pulling=false;if(pullAgain){pullAgain=false;pull()}}
}
function save(){if(!DB)return;dirty=true;setSync('saving','Enregistrement…');clearTimeout(saveT);saveT=setTimeout(()=>flush(),300);renderBadges()}
function diff(){
  const changes={};let n=0;
  for(const c of COLLS){
    const seen=new Set();
    for(const rec of DB[c]||[]){
      const k=c+':'+rec.id;seen.add(k);const j=JSON.stringify(rec);
      if(SNAP.get(k)!==j){(changes[c]=changes[c]||{upsert:[],delete:[]}).upsert.push(rec);n++}
    }
    for(const k of SNAP.keys())if(k.startsWith(c+':')&&!seen.has(k)){(changes[c]=changes[c]||{upsert:[],delete:[]}).delete.push(k.slice(c.length+1));n++}
  }
  if(isAdmin()){const pj=JSON.stringify(DB.params);if(pj!==PSNAP){changes.params=DB.params;n++}}
  return {changes,n};
}
async function flush(){
  if(flushing)return flushing.then(()=>dirty?flush():null);
  clearTimeout(saveT);
  const {changes,n}=diff();
  if(!n){dirty=false;setSync('ok','Synchronisé');return}
  const sent=new Map();
  for(const [c,ch] of Object.entries(changes)){if(c==='params')continue;for(const r of ch.upsert)sent.set(c+':'+r.id,JSON.stringify(r));for(const id of ch.delete)sent.set(c+':'+id,null)}
  const pj=changes.params?JSON.stringify(changes.params):null;
  flushing=(async()=>{
    try{
      const r=await api('/api/sync',{method:'POST',body:{changes}});
      for(const [k,v] of sent){if(v===null)SNAP.delete(k);else SNAP.set(k,v)}
      if(pj)PSNAP=pj;
      offline=false;
      if(r.rejected){toast('Certaines modifications ne sont pas autorisées pour votre rôle : les données ont été rechargées.');await loadAll();renderSoon()}
      const again=diff().n>0;dirty=again;
      setSync(again?'saving':'ok',again?'Enregistrement…':'Synchronisé');
      if(again)saveT=setTimeout(()=>flush(),200);
    }catch(e){
      if(e.status===0){offline=true;setSync('bad','Hors ligne : nouvel essai…');scheduleRetry()}
      else if(e.status!==401){setSync('bad','Erreur d’enregistrement');toast('Enregistrement impossible : '+e.message)}
    }finally{flushing=null}
  })();
  return flushing;
}
function scheduleRetry(){clearTimeout(retryT);retryT=setTimeout(()=>{if(dirty)flush();pull()},5000)}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});

/* ---------------- Temps réel ---------------- */
let ES=null, pullT=null;
const chatHandlers=[];
function connectEvents(){
  if(ES)ES.close();
  ES=new EventSource('/api/events');
  ES.addEventListener('hello',e=>{const d=JSON.parse(e.data);ONLINE=d.online||[];renderPresence();if(d.seq!==SEQ)pull()});
  ES.addEventListener('change',e=>{const d=JSON.parse(e.data);if(d.seq>SEQ){clearTimeout(pullT);pullT=setTimeout(pull,120)}});
  ES.addEventListener('presence',e=>{ONLINE=JSON.parse(e.data).online||[];renderPresence()});
  ES.addEventListener('printers',e=>{const d=JSON.parse(e.data);LIVE=d.printers||{};UTIL=d.util||{};renderPrinterPill();if(['machines','flux','planning','aujourdhui'].includes(cur))renderSoon()});
  ES.addEventListener('chat',e=>{const m=JSON.parse(e.data);for(const f of chatHandlers)f(m)});
  ES.onerror=()=>{setSync(dirty?'saving':'bad',dirty?'Enregistrement…':'Reconnexion…');setTimeout(async()=>{try{await api('/api/session')}catch(e){}},1500)};
  ES.onopen=()=>{if(!dirty)setSync('ok','Synchronisé')};
}
// Présence : une page cachée (onglet en arrière-plan, app Android fermée) compte comme « absente »,
// pour que la plateforme envoie les notifications sur le téléphone au lieu de croire que la personne regarde l'écran.
let hideT=null;
function eventsAway(){clearTimeout(hideT);if(ES){ES.close();ES=null}}
function eventsBack(){clearTimeout(hideT);if(!ES&&typeof ME!=='undefined'&&ME)connectEvents()}
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(hideT);hideT=setTimeout(eventsAway,20000)}else eventsBack()});
window.__fazaAway=eventsAway;window.__fazaBack=eventsBack;   // appelés par l'app Android à la sortie et au retour
async function loadPrinters(){try{const r=await api('/api/printers');LIVE=r.printers||{};UTIL=r.util||{};renderPrinterPill()}catch(e){}}
async function loadTeam(){try{const r=await api('/api/team');TEAM=r.users||[];ONLINE=r.online||ONLINE;renderPresence()}catch(e){}}
function renderPresence(){
  const el=$('#teamAv');if(!el)return;
  el.innerHTML=ONLINE.map(n=>`<span class="av on" title="${esc(n)} est connecté">${esc(initials(n))}</span>`).join('');
  if(cur==='messages'||cur==='aujourdhui')renderSoon();
}
function renderPrinterPill(){
  const conf=Object.values(LIVE).filter(s=>s.configured),on=conf.filter(s=>s.online);
  $('#prDot').className='dot '+(!conf.length?'':on.length===conf.length?'on':'warn');
  $('#prTxt').textContent=conf.length?`${on.length}/${conf.length} imprimante${conf.length>1?'s':''}`:'Imprimantes non reliées';
  const fin=Object.values(LIVE).filter(s=>s.state==='FINISH').length;
  if(fin)$('#prTxt').textContent+=` · ${fin} prête${fin>1?'s':''}`;
}

/* ---------------- Connexion ---------------- */
let setupMode=false,setupCode=false;
function showLogin(setup,expired,needCode){
  setupMode=!!setup;setupCode=!!(setup&&needCode);$('#login').classList.add('on');$('#codeWrap').hidden=!setupCode;
  $('#loginIntro').textContent=setup?'Premier lancement : créez le compte administrateur. Choisissez un nom simple (par exemple Hamza), pas une adresse e-mail, et un mot de passe de 8 caractères minimum.':expired?'Votre session a expiré : reconnectez-vous. Vos dernières modifications seront enregistrées ensuite.':'Connectez-vous avec le nom de votre compte (pas l’adresse e-mail).';
  $('#pw2Wrap').hidden=!setup;
  $('#loginTitle').textContent=setup?'Créer le compte administrateur':'Connexion';
  $('#loginBtn').textContent=setup?'Créer le compte':'Se connecter';
  setTimeout(()=>$('#loginForm [name=name]').focus(),60);
}
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target;$('#loginErr').textContent='';
  if(setupMode&&f.password.value!==f.password2.value){$('#loginErr').textContent='Les deux mots de passe ne correspondent pas.';return}
  try{
    const r=await api(setupMode?'/api/setup':'/api/login',{method:'POST',body:{name:f.name.value,password:f.password.value,code:setupCode?f.code.value.trim():undefined}});
    f.reset();$('#login').classList.remove('on');
    if(ME&&DB&&ME.name===r.user.name){ME=r.user;connectEvents();if(dirty)flush();pull()}else{location.hash='';await startApp(r.user)}
  }catch(err){$('#loginErr').textContent=err.message}
});
$('#logoutBtn').addEventListener('click',async()=>{try{if(dirty)await flush();await api('/api/logout',{method:'POST'})}catch(e){}location.reload()});

async function boot(){
  for(let i=0;i<4;i++){
    try{const r=await api('/api/session');return await startApp(r.user)}
    catch(e){
      if(e.status===401){
        return showLogin(e.body&&e.body.setup,false,e.body&&e.body.code);
      }
      await new Promise(r=>setTimeout(r,1500));
    }
  }
  showLogin(false);$('#loginErr').textContent='Le serveur de l’atelier ne répond pas. Vérifiez que le PC de l’atelier est allumé, puis rechargez la page.';
}
async function startApp(user){
  ME=user;
  document.body.className='r-'+ME.role;
  $('#meName').textContent=ME.name;$('#meRole').textContent=ROLE_LABEL[ME.role]||ME.role;$('#meAv').textContent=initials(ME.name);
  await loadAll();
  $('#app').hidden=false;
  buildNav();
  await Promise.all([loadPrinters(),loadTeam()]);
  connectEvents();
  for(const f of startHooks)try{f()}catch(e){console.error(e)}
  go(viewFromHash()||'aujourdhui',true);
}
const startHooks=[];

/* ---------------- Navigation ---------------- */
const VIEWS={}, ORDER=[];
const GROUPS=['Travail','Production','Ventes','Gestion'];
const ICONS={
 today:'<path d="M3 10h18M7 3v4M17 3v4"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="m9 15 2 2 4-4"/>',
 plan:'<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/>',
 chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
 flux:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
 gantt:'<path d="M4 5h9M8 12h10M6 19h8"/>',
 printer:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 17h10v4H7z"/>',
 stock:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
 quality:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
 leads:'<path d="M3 4h18l-7 9v6l-4 2v-8z"/>',
 clients:'<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-5-6"/>',
 calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
 quote:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
 social:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
 money:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
 db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
 plug:'<path d="M9 7V2M15 7V2M6 7h12v4a6 6 0 0 1-12 0zM12 17v5"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'
};
function view(def){VIEWS[def.id]=def;if(!ORDER.includes(def.id)){const i=def.before?ORDER.indexOf(def.before):-1;if(i>=0)ORDER.splice(i,0,def.id);else ORDER.push(def.id)}}
const allowed=id=>{const v=VIEWS[id];return v&&(!v.roles||v.roles.includes(ME.role))};
function buildNav(){
  let h='';
  for(const g of GROUPS){
    const items=ORDER.filter(id=>VIEWS[id].group===g&&allowed(id));
    if(!items.length)continue;
    h+=`<div class="nav-g">${g}</div>`+items.map(id=>{const v=VIEWS[id];return `<button class="nav-i" data-go="${id}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[v.icon]||''}</svg><span>${esc(v.title)}</span><span class="badge" id="b-${id}" hidden></span></button>`}).join('');
  }
  $('#nav').innerHTML=h;
  const c=$('#content');
  c.innerHTML=ORDER.filter(allowed).map(id=>`<section class="view" id="v-${id}" aria-label="${esc(VIEWS[id].title)}"></section>`).join('');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){e.preventDefault();go(b.dataset.go);document.body.classList.remove('menu-open')}});
$('#menuBtn').addEventListener('click',()=>document.body.classList.toggle('menu-open'));
function viewFromHash(){const h=location.hash.slice(1).split('/')[0];return allowed(h)?h:null}
window.addEventListener('hashchange',()=>{const v=viewFromHash();if(v&&v!==cur)go(v,true)});
function go(id,fromHash){
  if(!allowed(id))id='aujourdhui';
  cur=id;
  if(!fromHash&&location.hash.slice(1)!==id)history.replaceState(null,'','#'+id);
  $$('#nav .nav-i').forEach(b=>{if(b.dataset.go===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  $$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+id));
  $('#viewTitle').textContent=VIEWS[id].title;
  const sec=$('#v-'+id);sec.dataset.ready='';
  renderView(true);
  window.scrollTo(0,0);
}
let rafPending=false, deferred=false;
function renderSoon(){if(rafPending)return;rafPending=true;requestAnimationFrame(()=>{rafPending=false;renderView(false)})}
function renderView(force){
  if(!DB||!cur)return;
  renderBadges();
  const v=VIEWS[cur],sec=$('#v-'+cur);if(!sec)return;
  if(!force){
    const ae=document.activeElement;
    if(ae&&sec.contains(ae)&&ae.matches('input,textarea,select')){deferred=true;return}
    if(sec.dataset.ready&&v.update){try{v.update(sec)}catch(e){console.error(e)}return}
    if(sec.dataset.ready&&v.update===false)return;
  }
  try{v.render(sec);sec.dataset.ready='1'}catch(e){console.error(e);sec.innerHTML=`<div class="panel"><p class="badc">Affichage impossible : ${esc(e.message)}</p></div>`}
}
document.addEventListener('focusout',()=>{if(!deferred)return;setTimeout(()=>{const ae=document.activeElement;if(!(ae&&ae.matches('input,textarea,select'))){deferred=false;renderView(false)}},250)});
function renderBadges(){
  for(const id of ORDER){const v=VIEWS[id];if(!v.badge||!allowed(id))continue;const el=$('#b-'+id);if(!el)continue;let n=0;try{n=v.badge()}catch(e){}el.hidden=!n;el.textContent=n}
}

/* ---------------- Infobulles ---------------- */
document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');const tip=$('#tip');if(!t){tip.style.display='none';return}tip.innerHTML=t.dataset.tip;tip.style.display='block'});
document.addEventListener('mousemove',e=>{const tip=$('#tip');if(tip.style.display!=='block')return;const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+h>innerHeight-8)y=e.clientY-h-14;tip.style.left=x+'px';tip.style.top=y+'px'});

/* ---------------- Calculs partagés ---------------- */
const stageOf=o=>o.hist[o.hist.length-1].stage;
const enteredAt=o=>o.hist[o.hist.length-1].at;
const paid=o=>(o.payments||[]).reduce((a,p)=>a+(+p.amount||0),0);
const htOf=o=>(+o.price||0)/(1+(P().rates?.vat??19)/100);
const clientOf=o=>DB.clients.find(c=>c.id===o.clientId);
const printerName=id=>(P().printers.find(p=>p.id===id)||{}).name||'';
const stageName=id=>(STAGES.find(s=>s.id===id)||{}).name||id;
function pState(id){const s=LIVE[id];if(!s||!s.configured)return {state:'NOTSET',online:false};return {...s,percent:Math.min(100,Math.max(0,+s.percent||0)),remainingMin:Math.max(0,+s.remainingMin||0)}}
const busy=s=>['RUNNING','PREPARE','PAUSE'].includes(s.state);
function stateLabel(s){return {RUNNING:'En impression',PREPARE:'Préparation',PAUSE:'En pause',FINISH:'Terminé, pièce prête',FAILED:'Échec',IDLE:'Libre',OFFLINE:'Hors ligne',NOTSET:'Non reliée',NOCONF:'Non reliée'}[s]||s}
function schedule(){
  const now=Date.now(),out={};
  for(const p of P().printers){
    const s=pState(p.id);let cursor=now;const blocks=[];
    let queue=DB.orders.filter(o=>o.printer===p.id&&o.proc!=='laser'&&['cmd','cao','val','prod'].includes(stageOf(o))&&(+o.printH>0)).sort((a,b)=>a.due-b.due);
    if(busy(s)){const c=queue.find(o=>stageOf(o)==='prod');const end=now+s.remainingMin*60000;
      blocks.push({start:now,end,label:c?c.id:(s.job||'Impression'),sub:c?c.client:s.job,live:true,late:c?end>c.due:false});if(c)queue=queue.filter(o=>o!==c);cursor=end}
    for(const o of queue){const st=stageOf(o);
      const earliest=st==='prod'?now:enteredAt(o)+(P().lead[st]||0)*H+(st==='cmd'?(P().lead.cao+P().lead.val)*H:st==='cao'?P().lead.val*H:0);
      const start=Math.max(cursor,earliest,now),end=start+o.printH*H;blocks.push({start,end,label:o.id,sub:o.client,live:false,late:end>o.due,order:o});cursor=end}
    out[p.id]={blocks,free:cursor};
  }
  return out;
}
function analyse(){
  const now=Date.now(),st={};STAGES.forEach(s=>st[s.id]={n:0,wait:0,times:[],ids:[]});
  for(const o of DB.orders){const c=stageOf(o);st[c].n++;st[c].ids.push(o);if(c!=='done')st[c].wait+=now-enteredAt(o);
    for(let i=0;i<o.hist.length-1;i++)st[o.hist[i].stage].times.push(o.hist[i+1].at-o.hist[i].at)}
  for(const k in st){const a=st[k].times;st[k].avg=a.length?a.reduce((x,y)=>x+y,0)/a.length:null}
  let neck=null,best=0;
  for(const s of STAGES){if(s.id==='done'||s.id==='val')continue;const x=st[s.id];const load=x.wait*(x.n>(P().wip[s.id]||s.wip)?1.5:1)+(x.avg||0)*x.n;if(load>best){best=load;neck=s.id}}
  const active=DB.orders.filter(o=>stageOf(o)!=='done'),done=DB.orders.filter(o=>stageOf(o)==='done');
  const leads=done.map(o=>enteredAt(o)-o.created).filter(x=>x>0);const recent=done.filter(o=>enteredAt(o)>now-30*D);
  const ontime=recent.length?recent.filter(o=>enteredAt(o)<=o.due).length/recent.length:null;
  return {st,neck,active,lead:leads.length?leads.reduce((a,b)=>a+b,0)/leads.length:null,late:active.filter(o=>o.due<now).length,week:done.filter(o=>enteredAt(o)>now-7*D).length,ontime};
}
function failStats(){
  const res={};
  for(const p of P().printers){const jobs=DB.orders.filter(o=>o.printer===p.id&&o.proc!=='laser'&&STAGES.findIndex(s=>s.id===stageOf(o))>=3).length;
    const f=DB.failures.filter(x=>x.printer===p.id);const total=jobs+f.length;
    res[p.id]={jobs:total,fails:f.length,rate:total?f.length/total:null,g:f.reduce((a,x)=>a+(+x.g||0),0),h:f.reduce((a,x)=>a+(+x.h||0),0)}}
  return res;
}
function utilisation(pid){const days=Object.keys(UTIL).sort().slice(-7);let m=0;for(const d of days)m+=(UTIL[d]||{})[pid]||0;return days.length?m/60/(days.length*24):null}
const stockFor=ref=>DB.stock.find(s=>s.ref===ref);
function consume(o){if(o.consumed)return;const u=o.use||{};
  if(u.mat&&+u.g>0){const s=stockFor(u.mat);if(s)s.qty=Math.max(0,+s.qty-(+u.g))}
  if(u.sheet&&+u.m2>0){const s=stockFor(u.sheet);if(s)s.qty=Math.max(0,+(+s.qty-(+u.m2)).toFixed(3))}
  o.consumed=true}
const lowStock=()=>DB.stock.filter(s=>+s.qty<=+s.min);
const unit=s=>s.kind==='fil'?'g':s.kind==='plaque'?'m²':'u.';
function nextEvent(c){if(!c.month)return null;const now=new Date();let d=new Date(now.getFullYear(),c.month-1,c.day||15,10);if(d<now-D)d=new Date(now.getFullYear()+1,c.month-1,c.day||15,10);return d.getTime()}
const reminders=()=>DB.clients.map(c=>({c,at:nextEvent(c)})).filter(x=>x.at&&x.at-Date.now()<=45*D&&x.at>Date.now()-D).sort((a,b)=>a.at-b.at);
function waLink(phone,text){let n=String(phone||'').replace(/\D/g,'');if(n.length===8)n='216'+n;if(n.startsWith('00'))n=n.slice(2);return n?`https://wa.me/${n}?text=${encodeURIComponent(text)}`:null}
function openWA(phone,text){const l=waLink(phone,text);if(!l)return toast('Ajoutez d’abord un numéro de téléphone.');window.open(l,'_blank','noopener')}
function readyText(o){const reste=(+o.price||0)-paid(o);return `Bonjour ${o.client}, votre commande « ${o.product} » (${o.id}) est prête chez ${P().company.brand||'FAZA 3D'}.${o.price&&reste>0.01?` Reste à payer : ${fmt(reste,3)} TND.`:''} Merci de votre confiance !`}
const rateFor=p=>(+p.price||0)/(+p.life||1)+(+p.kw||0)*P().rates.elec+P().rates.maint;
const laserRate=()=>{const L=P().laser;return (+L.price||0)/(+L.life||1)+(+L.kw||0)*P().rates.elec+(+L.tube||0)+P().rates.maint};
/* Frais fixes : total mensuel = loyer + charges + salaires fixes + divers ; répartis sur les heures machine
   prévues (Paramètres) tant que l'atelier n'a pas 3 mois d'historique, puis sur la moyenne réelle des 3 derniers mois. */
const fixedMonthTotal=()=>{const f=P().rates.fixed||{};const t=(+f.loyer||0)+(+f.charges||0)+(+f.internet||0)+(+f.hebergement||0)+(+f.domaine||0)+(+f.salaires||0)+(+f.divers||0);return t>0?t:(+P().rates.fixedMonth||0)};
function machineHoursOfMonth(kk){const yy=Math.floor(kk/12),mm=kk%12,a=new Date(yy,mm,1).getTime(),b=new Date(yy,mm+1,1).getTime();
  return (DB.orders||[]).filter(o=>stageOf(o)==='done'&&(()=>{const t=enteredAt(o);return t>=a&&t<b})()).reduce((s,o)=>s+(+o.printH||0)+(+o.laserMin||0)/60,0)}
function machineHoursUsed(){const now=new Date(),k=now.getFullYear()*12+now.getMonth();const hs=[1,2,3].map(i=>machineHoursOfMonth(k-i));const ok=hs.filter(h=>h>0);
  if(ok.length>=2){const avg=hs.reduce((a,b)=>a+b,0)/3;if(avg>=20)return {hours:avg,real:true}}return {hours:Math.max(1,+P().rates.machineHoursMonth||1),real:false}}
const fixedRate=()=>fixedMonthTotal()/machineHoursUsed().hours;
function addWork(t,min){
  let d=new Date(t),left=min,g=0;const S=P().shop;
  const inShop=x=>S.days.includes(x.getDay())&&x.getHours()>=S.start&&x.getHours()<S.end;
  while(left>0&&g++<5000){
    if(!inShop(d)){if(S.days.includes(d.getDay())&&d.getHours()<S.start)d.setHours(S.start,0,0,0);else{d.setDate(d.getDate()+1);d.setHours(S.start,0,0,0)}continue}
    const end=new Date(d);end.setHours(S.end,0,0,0);const use=Math.min((end-d)/60000,left);d=new Date(d.getTime()+use*60000);left-=use}
  return d.getTime();
}
function teamName(fn){return P().team[fn]||''}
function members(){return TEAM.map(u=>u.name)}

/* ---------------- Liens publics ---------------- */
async function publicLink(kind,id){try{const r=await api(`/api/public/liens/${kind}/${encodeURIComponent(id)}`);return r}catch(e){return null}}
async function copyText(t,msg){try{await navigator.clipboard.writeText(t);toast(msg||'Copié')}catch(e){prompt('Copiez ce texte :',t)}}

/* ---------------- PDF et e-mail ---------------- */
// Ouvre l'onglet tout de suite (sinon le navigateur peut le bloquer), puis y charge le PDF une fois prêt
async function openPdf(url,prep){
  const w=window.open('','_blank');
  if(w){try{w.document.title='PDF';w.document.body.innerHTML='<p style="font:15px system-ui,sans-serif;padding:24px;color:#4F6566">Préparation du PDF…</p>'}catch(e){}}
  try{if(prep)await prep();else await flush()}catch(e){if(w)w.close();toast(e.message,5000);return}
  const u=typeof url==='function'?url():url;
  if(w)w.location.href=u;else{toast('Autorisez l’ouverture des fenêtres pour voir le PDF.');location.href=u}
}
let mailCtx=null;
function mailDialog({to,subject,text,attach,label,onSent}){
  mailCtx={attach,onSent};const f=$('#mailForm');
  f.to.value=to||'';f.subject.value=subject||'';f.text.value=text||'';
  $('#mailAttach').textContent=label?('Pièce jointe : '+label):'';
  $('#mailDlg').showModal();
}
$('#mailDlg').addEventListener('close',async()=>{
  if($('#mailDlg').returnValue!=='ok'||!mailCtx)return;
  const f=$('#mailForm');const ctx=mailCtx;mailCtx=null;
  try{await flush();toast('Envoi en cours…');await api('/api/email/send',{method:'POST',body:{to:f.to.value.trim(),subject:f.subject.value,text:f.text.value,attach:ctx.attach}});toast('E-mail envoyé');if(ctx.onSent)ctx.onSent();pull()}
  catch(e){toast(e.message,6000)}
});

/* ---------------- Petits graphiques SVG ---------------- */
function lineChart({series,labels,height=220,fmtY=v=>fmt(v,0),aria}){
  const W=640,Hh=height,pl=44,pr=12,pt=12,pb=26;
  const all=series.flatMap(s=>s.values.filter(v=>v!=null));
  if(!all.length)return '<p class="empty">Pas encore de données.</p>';
  let min=Math.min(...all),max=Math.max(...all);if(min===max){min=Math.max(0,min-1);max=max+1}
  const padv=(max-min)*0.12;min=Math.max(0,min-padv);max=max+padv;
  const n=labels.length,X=i=>pl+(n<=1?0:(i/(n-1))*(W-pl-pr)),Y=v=>pt+(1-(v-min)/(max-min))*(Hh-pt-pb);
  let g=`<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(aria||'Graphique')}">`;
  for(let k=0;k<=4;k++){const v=min+(max-min)*k/4;g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl-6}" y="${Y(v)+4}" font-size="11" text-anchor="end" fill="var(--mut)">${esc(fmtY(v))}</text>`}
  const step=Math.max(1,Math.ceil(n/8));
  const lastShown=Math.floor((n-1)/step)*step;labels.forEach((l,i)=>{if(i%step===0||(i===n-1&&n-1-lastShown>=step*0.7))g+=`<text x="${X(i)}" y="${Hh-6}" font-size="11" text-anchor="middle" fill="var(--mut)">${esc(l)}</text>`});
  for(const s of series){
    let d='',started=false;s.values.forEach((v,i)=>{if(v==null)return;d+=(started?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)+' ';started=true});
    g+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.values.forEach((v,i)=>{if(v!=null)g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="${s.color}" stroke="var(--panel)" stroke-width="2"/>`});
  }
  // zones de survol
  labels.forEach((l,i)=>{const tip=`<b>${esc(l)}</b><br>`+series.map(s=>`${esc(s.name)} : ${s.values[i]!=null?esc(fmtY(s.values[i])):'—'}`).join('<br>');
    const x0=i===0?pl:(X(i-1)+X(i))/2,x1=i===n-1?W-pr:(X(i)+X(i+1))/2;g+=`<rect x="${x0}" y="${pt}" width="${Math.max(1,x1-x0)}" height="${Hh-pt-pb}" fill="transparent" data-tip="${esc(tip)}"/>`});
  return g+'</svg>';
}
function legend(items){return `<div class="legend">${items.map(x=>`<span><i style="background:${x.color}"${x.sq?' class="sq"':''}></i>${esc(x.name)}</span>`).join('')}</div>`}

/* ---------------- Application mobile : service worker, installation, notifications ---------------- */
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;const b=$('#installBtn');if(b)b.hidden=false});
window.addEventListener('appinstalled',()=>{installEvt=null;toast('Application installée')});
const isNativeApp=()=>/FAZA3DApp/.test(navigator.userAgent);
const isStandalone=()=>isNativeApp()||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)&&!window.MSStream;
async function registerSW(){if(!('serviceWorker' in navigator))return null;try{const r=await navigator.serviceWorker.register('/sw.js');return r}catch(e){return null}}
async function installApp(){
  if(installEvt){installEvt.prompt();const r=await installEvt.userChoice;installEvt=null;if(r.outcome==='accepted')toast('Application installée : retrouvez FAZA 3D sur l’écran d’accueil');return}
  if(isIOS())toast('Sur iPhone : bouton Partager (carré avec flèche) puis « Sur l’écran d’accueil ».',9000);
  else toast('Dans le menu du navigateur (⋮) choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».',9000);
}
function urlB64(b){const p='='.repeat((4-b.length%4)%4);const s=(b+p).replace(/-/g,'+').replace(/_/g,'/');const r=atob(s);return Uint8Array.from([...r].map(c=>c.charCodeAt(0)))}
async function enablePush(){
  if(!('PushManager' in window)||!('Notification' in window)){toast(isIOS()?'Sur iPhone, installez d’abord l’application sur l’écran d’accueil, puis activez les notifications depuis l’application.':'Ce navigateur ne gère pas les notifications.',8000);return false}
  const reg=await navigator.serviceWorker.ready;
  const perm=await Notification.requestPermission();if(perm!=='granted'){toast('Notifications refusées par le navigateur.');return false}
  try{const {key}=await api('/api/push/key');if(!key)throw new Error('Notifications non configurées sur le serveur.');
    let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64(key)});
    await api('/api/push/subscribe',{method:'POST',body:{sub:sub.toJSON(),ua:navigator.userAgent.slice(0,120)}});LS.set('push',true);toast('Notifications activées sur cet appareil');return true}
  catch(e){toast(e.message,6000);return false}
}
async function disablePush(){try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub){await api('/api/push/subscribe',{method:'DELETE',body:{endpoint:sub.endpoint}});await sub.unsubscribe()}LS.set('push',false);toast('Notifications désactivées sur cet appareil')}catch(e){toast(e.message)}}
async function pushState(){if(isNativeApp())return 'app';try{if(!('PushManager' in window))return 'non';const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();return sub?'oui':'non'}catch(e){return 'non'}}
startHooks.push(()=>{registerSW().then(async()=>{try{if(LS.get('push',false)&&Notification.permission==='granted'){const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub)api('/api/push/subscribe',{method:'POST',body:{sub:sub.toJSON(),ua:navigator.userAgent.slice(0,120)}}).catch(()=>{})}}catch(e){}})});
$('#tabMenu').addEventListener('click',()=>document.body.classList.toggle('menu-open'));
const _go=go;go=function(id,fromHash){_go(id,fromHash);$$('#tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.go===id))};
const _rb=renderBadges;renderBadges=function(){_rb();for(const id of ['aujourdhui','messages','flux','machines']){const src=$('#b-'+id),dst=$('#tb-'+id);if(src&&dst){dst.hidden=src.hidden;dst.textContent=src.textContent}}};

window.addEventListener('load',()=>boot());
