'use strict';
// Pages publiques : devis en ligne (/devis/<lien>) et suivi de commande (/suivi/<lien>). Français et arabe.
(function(){
  try{document.documentElement.setAttribute('data-theme','light')}catch(e){}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(n,d=3)=>Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const dday=t=>new Date(t).toLocaleDateString(L==='ar'?'ar-TN':'fr-FR',{day:'numeric',month:'long',year:'numeric'});
  const root=document.getElementById('root');
  const m=/^\/(devis|suivi)\/([a-f0-9]{32})$/.exec(location.pathname);
  if(!m){root.innerHTML='<p class="empty">Lien invalide.</p>';return}
  const [,kind,token]=m;
  let L=(new URLSearchParams(location.search).get('lang')||localStorage.getItem('faza_pub_lang')||(navigator.language||'').startsWith('ar')?'ar':'fr');
  if(!['fr','ar'].includes(L))L='fr';
  const T={
    fr:{payNow:'Payer l’acompte en ligne maintenant',payTitle:'Paiement',paid:'Déjà réglé',rest:'Reste à payer',payOk:'Paiement reçu, merci ! Il est enregistré sur votre commande.',payKo:'Le paiement n’a pas abouti. Vous pouvez réessayer ou nous contacter.',payAcompte:'Payer l’acompte',paySolde:'Payer le solde',payNote:'Paiement sécurisé par carte bancaire, e-DINAR ou portefeuille mobile. Vous revenez ici automatiquement après le paiement.',payOffline:'Règlement à l’atelier (espèces, virement) ou à la livraison.',quote:'Devis',forYou:'Devis établi pour',date:'Date',valid:'Valable jusqu’au',expired:'Ce devis a expiré. Contactez-nous pour le mettre à jour.',item:'Désignation',qty:'Qté',pu:'P.U. HT',tot:'Total HT',ht:'Total HT',tva:'TVA',timbre:'Timbre fiscal',ttc:'Total TTC',lead:'Délai annoncé',terms:'Conditions',pdf:'Télécharger le PDF',accept:'J’accepte ce devis',name:'Votre nom et prénom',note:'Remarque (facultatif)',check:'J’ai lu le devis et j’accepte ses conditions.',send:'Confirmer l’acceptation',accepted:'Devis accepté. Merci !',acceptedBy:'Accepté en ligne par',track:'Suivre ma commande',contact:'Une question ? Appelez-nous :',refused:'Ce devis a été refusé.',order:'Commande',product:'Produit',promised:'Date promise',status:'État',ready:'Votre commande est prête ! Vous pouvez venir la récupérer.',delivered:'Commande livrée. Merci de votre confiance !',inprog:'Votre commande est en cours.',stages:['Reçue','Conception','Validation','Fabrication','Finition','Contrôle','Emballage','Livrée'],hist:'Historique',err:'Erreur'},
    ar:{payNow:'خلّص التسبقة أونلاين توّا',payTitle:'الخلاص',paid:'المدفوع',rest:'الباقي',payOk:'وصلنا الخلاص، شكرا ! تسجّل في طلبيتك.',payKo:'الخلاص ما تمّش. تنجم تعاود أو تتصل بينا.',payAcompte:'خلّص التسبقة',paySolde:'خلّص الباقي',payNote:'خلاص آمن بالبطاقة البنكية أو e-DINAR أو المحفظة. ترجع هنا وحدك بعد الخلاص.',payOffline:'الخلاص في الورشة (نقدا أو تحويل) أو عند التسليم.',quote:'عرض سعر',forYou:'عرض سعر لـ',date:'التاريخ',valid:'صالح حتى',expired:'انتهت صلاحية هذا العرض. اتصل بنا لتحديثه.',item:'البيان',qty:'الكمية',pu:'سعر الوحدة',tot:'المجموع',ht:'المجموع قبل الضريبة',tva:'الضريبة على القيمة المضافة',timbre:'طابع جبائي',ttc:'المجموع الإجمالي',lead:'المدة المعلنة',terms:'الشروط',pdf:'تحميل PDF',accept:'أوافق على هذا العرض',name:'الاسم واللقب',note:'ملاحظة (اختياري)',check:'قرأت العرض وأوافق على شروطه.',send:'تأكيد الموافقة',accepted:'تمت الموافقة على العرض. شكراً!',acceptedBy:'تمت الموافقة عبر الإنترنت من طرف',track:'متابعة طلبي',contact:'سؤال؟ اتصل بنا:',refused:'تم رفض هذا العرض.',order:'الطلب',product:'المنتج',promised:'تاريخ التسليم المتوقع',status:'الحالة',ready:'طلبك جاهز! يمكنك الحضور لاستلامه.',delivered:'تم تسليم الطلب. شكراً لثقتكم!',inprog:'طلبك قيد الإنجاز.',stages:['استلام','تصميم','موافقة','تصنيع','تشطيب','مراقبة','تغليف','تسليم'],hist:'السجل',err:'خطأ'}
  };
  const t=k=>T[L][k];
  const langBar=()=>`<span class="lang"><button data-lang="fr" aria-pressed="${L==='fr'}">Français</button><button data-lang="ar" aria-pressed="${L==='ar'}">العربية</button></span>`;
  document.addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b){L=b.dataset.lang;try{localStorage.setItem('faza_pub_lang',L)}catch(x){}load()}});
  const head=(c,title)=>`<div class="hero"><div class="b"><span class="logo">F3D</span><div><h1 style="font-size:20px">${esc(c.brand||'FAZA 3D')}</h1><p class="ink2 small">${esc(title)}</p></div></div>${langBar()}</div>`;
  function apply(){document.documentElement.lang=L;document.documentElement.dir=L==='ar'?'rtl':'ltr'}
  async function load(){
    apply();
    try{
      const r=await fetch(`/api/public/${kind}/${token}`,{cache:'no-store'});const d=await r.json();
      if(!r.ok)throw new Error(d.error||'Introuvable');
      kind==='devis'?renderQuote(d):renderTrack(d);
    }catch(e){root.innerHTML=`<div class="panel"><p class="badc">${esc(e.message)}</p></div>`}
  }
  function renderQuote(d){
    const c=d.company,tt=d.totals;
    const canAccept=!d.acceptedAt&&d.status!=='accepte'&&d.status!=='refuse'&&!d.expired;
    root.innerHTML=head(c,t('quote')+' '+d.no)+`<div class="panel">
      <div class="row between"><div><div class="small ink2">${t('forYou')}</div><b class="big">${esc(d.client)}</b></div><div class="small ink2" style="text-align:${L==='ar'?'left':'right'}">${t('date')} : ${dday(d.at)}<br>${t('valid')} ${dday(d.at+d.validityDays*864e5)}</div></div>
      ${d.expired&&!d.acceptedAt?`<div class="callout warn mt">${t('expired')}</div>`:''}
      <div class="tbl-wrap mt"><table class="t"><tr><th>${t('item')}</th><th class="r">${t('qty')}</th><th class="r">${t('pu')}</th><th class="r">${t('tot')}</th></tr>${d.lines.map(l=>`<tr><td>${esc(l.label)}</td><td class="r">${l.qty}</td><td class="r">${fmt(l.pu)}</td><td class="r">${fmt(l.qty*l.pu)}</td></tr>`).join('')}</table></div>
      <div class="res" style="max-width:340px;margin-${L==='ar'?'right':'left'}:auto"><table>${d.discountPct?`<tr><td>Remise ${d.discountPct} %</td><td>-${fmt(tt.ht/(1-d.discountPct/100)*d.discountPct/100)}</td></tr>`:''}<tr><td>${t('ht')}</td><td>${fmt(tt.ht)}</td></tr><tr><td>${t('tva')} ${d.vat} %</td><td>${fmt(tt.tva)}</td></tr>${tt.timbre?`<tr><td>${t('timbre')}</td><td>${fmt(tt.timbre)}</td></tr>`:''}<tr class="sub"><td>${t('ttc')}</td><td>${fmt(tt.ttc)} TND</td></tr></table></div>
      ${d.leadText?`<p class="mt"><b>${t('lead')} :</b> ${esc(d.leadText)}</p>`:''}${d.notes?`<p class="small ink2 mt">${esc(d.notes)}</p>`:''}${c.terms?`<p class="small muted mt"><b>${t('terms')} :</b> ${esc(c.terms)}</p>`:''}
      <div class="row mt"><a class="btn" href="/api/public/devis/${token}/pdf" target="_blank" rel="noopener">${t('pdf')}</a></div></div>
     ${d.acceptedAt||d.status==='accepte'?`<div class="callout mt" style="background:var(--ok-bg);color:var(--ok)"><b>${t('accepted')}</b>${d.acceptedBy?`<br>${t('acceptedBy')} ${esc(d.acceptedBy)}, ${dday(d.acceptedAt)}`:''}${d.orderId?`<br>${t('order')} ${esc(d.orderId)}`:''}</div>`:d.status==='refuse'?`<div class="callout warn mt">${t('refused')}</div>`:''}
     ${canAccept?`<div class="panel mt" id="acc"><h2>${t('accept')}</h2><form id="f"><fieldset style="grid-template-columns:1fr"><label>${t('name')}<input name="name" required maxlength="80"></label><label>${t('note')}<textarea name="note" rows="2" maxlength="500"></textarea></label><label class="chk"><input type="checkbox" required> ${t('check')}</label></fieldset><p class="small badc" id="err"></p><button class="btn primary" style="width:100%;justify-content:center">${t('send')}</button></form></div>`:''}
     <p class="note">${t('contact')} ${esc(c.phone||'')}${c.email?' · '+esc(c.email):''}</p>`;
    const f=document.getElementById('f');
    if(f)f.addEventListener('submit',async e=>{e.preventDefault();const b=f.querySelector('button');b.disabled=true;document.getElementById('err').textContent='';
      try{const r=await fetch(`/api/public/devis/${token}/accepter`,{method:'POST',headers:{'Content-Type':'application/json','X-Faza':'1'},body:JSON.stringify({name:f.name.value,note:f.note.value})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||t('err'));
        document.getElementById('acc').innerHTML=`<div class="callout" style="background:var(--ok-bg);color:var(--ok)"><b>${t('accepted')}</b>${j.orderId?`<br>${t('order')} ${esc(j.orderId)}`:''}${j.trackUrl?`<br><a href="${esc(j.trackUrl)}?lang=${L}">${t('track')}</a>`:''}${j.trackUrl&&j.payOnline?`<br><a class="btn primary mt" href="${esc(j.trackUrl)}?lang=${L}#payBox">${t('payNow')}</a>`:''}</div>`;window.scrollTo(0,document.body.scrollHeight)}
      catch(x){document.getElementById('err').textContent=x.message;b.disabled=false}});
  }
  function renderTrack(d){
    const c=d.company;
    root.innerHTML=head(c,t('order')+' '+d.id)+`<div class="panel"><div class="small ink2">${t('product')}</div><b class="big">${esc(d.product)}${d.qty>1?' × '+d.qty:''}</b>
      <div class="track">${t('stages').map((s,i)=>`<div class="${i<d.stageIndex||d.delivered?'done':i===d.stageIndex?'cur':''}"><i></i>${s}</div>`).join('')}</div>
      <div class="callout ${d.ready?'':'warn'}" style="${d.ready?'background:var(--ok-bg);color:var(--ok)':''}"><b>${d.delivered?t('delivered'):d.ready?t('ready'):t('inprog')}</b>${!d.delivered&&d.due?`<br>${t('promised')} : ${dday(d.due)}`:''}</div>
      ${d.photos.length?`<div class="photos">${d.photos.map(p=>`<img src="/api/public/photo/${token}/${esc(p.split('/').pop())}" alt="">`).join('')}</div>`:''}
      ${d.pay&&(d.pay.ttc>0)?`<div class="panel mt" id="payBox"><h3>${t('payTitle')}</h3><table class="t"><tr><td>${t('ttc')}</td><td class="r">${fmt(d.pay.ttc)}</td></tr><tr><td>${t('paid')}</td><td class="r">${fmt(d.pay.paid)}</td></tr><tr><td><b>${t('rest')}</b></td><td class="r"><b>${fmt(d.pay.rest)}</b></td></tr></table>
        ${new URLSearchParams(location.search).get('paiement')==='ok'?`<div class="callout mt" style="background:var(--ok-bg);color:var(--ok)"><b>${t('payOk')}</b></div>`:new URLSearchParams(location.search).get('paiement')==='echec'?`<div class="callout warn mt">${t('payKo')}</div>`:''}
        ${d.pay.online?`<div class="row mt">${d.pay.acompte>0?`<button class="btn primary" data-pay="acompte">${t('payAcompte')} ${d.pay.acomptePct} % · ${fmt(d.pay.acompte)}</button>`:''}<button class="btn ${d.pay.acompte>0?'':'primary'}" data-pay="solde">${t('paySolde')} · ${fmt(d.pay.rest)}</button></div><p class="small muted mt">${t('payNote')}</p><p class="badc small" id="payErr"></p>`:d.pay.rest>0?`<p class="small ink2 mt">${t('payOffline')}</p>`:''}</div>`:''}
      <h3 class="mt">${t('hist')}</h3><table class="t">${d.hist.map(h=>`<tr><td>${dday(h.at)}</td><td>${t('stages')[['cmd','cao','val','prod','fin','qc','pack','done'].indexOf(h.stage)]||h.stage}</td></tr>`).join('')}</table></div>
     <p class="note">${t('contact')} ${esc(c.phone||'')}${c.address?' · '+esc(c.address):''}</p>`;
    root.querySelectorAll('[data-pay]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;const er=document.getElementById('payErr');er.textContent='';
      try{const r=await fetch(`/api/public/suivi/${token}/payer`,{method:'POST',headers:{'Content-Type':'application/json','X-Faza':'1'},body:JSON.stringify({part:b.dataset.pay})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||t('err'));location.href=j.url}
      catch(x){er.textContent=x.message;b.disabled=false}}));
  }
  load();
})();
