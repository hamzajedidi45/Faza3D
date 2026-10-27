'use strict';
(function(){
  try{document.documentElement.setAttribute('data-theme','light')}catch(e){}
  const q=new URLSearchParams(location.search);const src=q.get('src')||'';
  const T={
    fr:{tag:'Impression 3D, découpe et gravure laser sur mesure',title:'Demande de devis',intro:'Décrivez votre projet : nous vous répondons rapidement par téléphone, WhatsApp ou e-mail.',name:'Votre nom',phone:'Téléphone ou WhatsApp',email:'E-mail',company:'Entreprise, école ou club (facultatif)',product:'Produit souhaité',qty:'Quantité',qtyPh:'par exemple 30',deadline:'Pour quelle date ?',details:'Votre projet',detailsPh:'Taille, couleurs, texte à graver, logo…',link:'Lien vers un fichier ou un exemple (facultatif)',how:'Comment nous avez-vous connus ?',send:'Envoyer ma demande',privacy:'Vos coordonnées servent uniquement à répondre à votre demande.',okTitle:'Merci, votre demande est bien reçue.',okText:'Nous vous recontactons très vite.',urgent:' Pour une urgence : ',needContact:'Indiquez un téléphone ou un e-mail pour que nous puissions vous répondre.',fail:'Envoi impossible, réessayez.',
      products:['Trophées ou médailles','Plaques gravées, signalétique','Cadeaux personnalisés','Porte-clés, goodies','Maquette (architecture, prototype)','Pièce technique ou prototype','Découpe ou gravure laser','Autre'],hows:[['','—'],['instagram','Instagram'],['facebook','Facebook'],['tiktok','TikTok'],['google','Google'],['whatsapp','WhatsApp'],['salon','Salon'],['bouche','Bouche-à-oreille']]},
    ar:{tag:'طباعة ثلاثية الأبعاد، قص ونقش بالليزر حسب الطلب',title:'طلب عرض سعر',intro:'صف لنا مشروعك: نرد عليك بسرعة عبر الهاتف أو واتساب أو البريد الإلكتروني.',name:'الاسم',phone:'الهاتف أو واتساب',email:'البريد الإلكتروني',company:'الشركة أو المدرسة أو النادي (اختياري)',product:'المنتج المطلوب',qty:'الكمية',qtyPh:'مثلاً 30',deadline:'لأي تاريخ؟',details:'مشروعك',detailsPh:'الحجم، الألوان، النص المراد نقشه، الشعار…',link:'رابط ملف أو مثال (اختياري)',how:'كيف تعرفت علينا؟',send:'إرسال الطلب',privacy:'تُستعمل بياناتك فقط للرد على طلبك.',okTitle:'شكراً، تم استلام طلبك.',okText:'سنتصل بك في أقرب وقت.',urgent:' للحالات المستعجلة: ',needContact:'أدخل رقم هاتف أو بريداً إلكترونياً حتى نتمكن من الرد عليك.',fail:'تعذر الإرسال، حاول مجدداً.',
      products:['كؤوس أو ميداليات','لوحات منقوشة، لافتات','هدايا مخصصة','ميداليات مفاتيح، هدايا دعائية','مجسم (هندسة معمارية، نموذج)','قطعة تقنية أو نموذج أولي','قص أو نقش بالليزر','أخرى'],hows:[['','—'],['instagram','إنستغرام'],['facebook','فيسبوك'],['tiktok','تيك توك'],['google','جوجل'],['whatsapp','واتساب'],['salon','معرض'],['bouche','من معارف']]}
  };
  let L=q.get('lang')||(function(){try{return localStorage.getItem('faza_pub_lang')}catch(e){return null}})()||((navigator.language||'').startsWith('ar')?'ar':'fr');
  if(!T[L])L='fr';
  const f=document.getElementById('f');
  function apply(){
    const t=T[L];document.documentElement.lang=L;document.documentElement.dir=L==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-t]').forEach(el=>{el.textContent=t[el.dataset.t]});
    document.querySelectorAll('[data-ph]').forEach(el=>{el.placeholder=t[el.dataset.ph]});
    document.title=t.title+' · '+document.getElementById('brand').textContent;
    const ps=document.getElementById('productSel'),pv=ps.selectedIndex;ps.innerHTML=t.products.map((p,i)=>`<option value="${T.fr.products[i]}">${p}</option>`).join('');if(pv>=0)ps.selectedIndex=pv;
    const hs=document.getElementById('howSel'),hv=hs.value;hs.innerHTML=t.hows.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');hs.value=hv||'';
    if(src&&hs.querySelector(`option[value="${src}"]`))hs.value=src;
    document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===L));
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b){L=b.dataset.lang;try{localStorage.setItem('faza_pub_lang',L)}catch(x){}apply()}});
  apply();
  fetch('/api/public/info').then(r=>r.json()).then(i=>{if(i.brand){document.getElementById('brand').textContent=i.brand;apply()}if(i.phone)document.getElementById('okContact').textContent=T[L].urgent+i.phone+'.'}).catch(()=>{});
  f.addEventListener('submit',async e=>{
    e.preventDefault();const err=document.getElementById('err');err.textContent='';
    if(!f.phone.value.trim()&&!f.email.value.trim()){err.textContent=T[L].needContact;return}
    const b=document.getElementById('send');b.disabled=true;
    const data=Object.fromEntries(new FormData(f).entries());data.src=src||data.how;data.lang=L;
    try{
      const r=await fetch('/api/public/commande',{method:'POST',headers:{'Content-Type':'application/json','X-Faza':'1'},body:JSON.stringify(data)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||T[L].fail);
      document.getElementById('formBox').hidden=true;document.getElementById('okBox').hidden=false;
    }catch(x){err.textContent=x.message;b.disabled=false}
  });
})();
