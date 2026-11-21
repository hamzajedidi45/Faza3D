(function(){
  if(typeof CONFIG==='undefined'||!CONFIG.plateforme){
    ['eLoginForm','eCreateForm'].forEach(function(id){ var f=document.getElementById(id); if(f) f.addEventListener('submit',function(e){ e.preventDefault(); var m=f.querySelector('.e-msg'); if(m) m.textContent=document.documentElement.lang==='ar'?'فضاء الحريف غير مفعّل بعد: لازم تربط الموقع بالمنصّة (CONFIG.plateforme).':'Espace client pas encore activé : il faut relier le site à la plateforme (CONFIG.plateforme dans index.html).'; }); });
    return;
  }
  var base=CONFIG.plateforme.replace(/\/+$/,''), K='faza_client_sid';
  var login=document.getElementById('eLogin'), area=document.getElementById('eArea'); if(!login) return;
  var isAr=function(){ return document.documentElement.lang==='ar'; };
  var T={fr:{rest:'Reste à payer',payAcompte:'Payer l’acompte :',paySolde:'Payer le solde :',steps:['Commande reçue','Conception','Validation','Fabrication','Finition','Contrôle qualité','Emballage','Livré'],due:'Date promise',qty:'Quantité',paid:'Payé',invoice:'Facture',track:'Suivi détaillé',none:'Aucune commande pour le moment.',noq:'Aucun devis.',open:'Voir / accepter',accepted:'Accepté',sent:'À valider',refused:'Refusé',total:'Total TTC',created:'Compte créé. Bienvenue !',err:'Erreur de connexion.'},
          ar:{rest:'الباقي',payAcompte:'خلّص التسبقة :',paySolde:'خلّص الباقي :',steps:['وصلت الطلبية','تصميم','مصادقة','تصنيع','تشطيب','مراقبة الجودة','تغليف','تم التسليم'],due:'تاريخ التسليم',qty:'الكمية',paid:'المدفوع',invoice:'الفاتورة',track:'المتابعة المفصّلة',none:'ما فماش طلبيات حالياً.',noq:'ما فماش عروض أسعار.',open:'عرض / قبول',accepted:'مقبول',sent:'في انتظار الموافقة',refused:'مرفوض',total:'المجموع',created:'تم إنشاء الحساب. مرحباً بيك !',err:'مشكل في الاتصال.'}};
  function t(){ return T[isAr()?'ar':'fr']; }
  function sid(){ try{ return localStorage.getItem(K)||''; }catch(e){ return ''; } }
  function setSid(v){ try{ v?localStorage.setItem(K,v):localStorage.removeItem(K); }catch(e){} }
  async function call(path,opt){ opt=opt||{}; var h={'Content-Type':'application/json','X-Faza':'1'}; if(sid()) h['Authorization']='Bearer '+sid(); var r=await fetch(base+path,{method:opt.method||'GET',headers:h,body:opt.body?JSON.stringify(opt.body):undefined}); var j={}; try{ j=await r.json(); }catch(e){} if(!r.ok) throw new Error(j.error||t().err); return j; }
  function fmtDate(ms){ return ms?new Date(ms).toLocaleDateString(isAr()?'ar-TN':'fr-TN'):'—'; }
  function fmtMoney(v){ return (Math.round(v*1000)/1000).toLocaleString('fr-FR')+' DT'; }
  async function load(){ var d; try{ d=await call('/api/public/compte'); }catch(e){ setSid(''); login.hidden=false; area.hidden=true; return; }
    login.hidden=true; area.hidden=false; document.getElementById('eName').textContent=d.client.name||''; document.getElementById('eLoginTxt').textContent=d.login;
    var L=t(); var eo=document.getElementById('eOrders');
    eo.innerHTML=d.orders.length?d.orders.map(function(o){ return '<div class="e-order"><div class="top"><b>'+esc(o.id)+' · '+esc(o.product||'')+'</b><span class="stage">'+esc(L.steps[o.stageIndex]||o.stageName)+'</span></div>'+
      '<div class="e-steps">'+L.steps.map(function(_,i){ return '<i class="'+(i<=o.stageIndex?'on':'')+'" title="'+esc(L.steps[i])+'"></i>'; }).join('')+'</div>'+
      '<div class="meta"><span>'+L.qty+' : '+esc(String(o.qty||1))+'</span><span>'+L.due+' : '+fmtDate(o.due)+'</span>'+(o.price?'<span>'+L.total+' : '+fmtMoney(o.price)+'</span>':'')+(o.paid?'<span>'+L.paid+' : '+fmtMoney(o.paid)+'</span>':'')+(o.pay&&o.pay.rest>0?'<span><b>'+L.rest+' : '+fmtMoney(o.pay.rest)+'</b></span>':'')+'</div>'+
      (o.photos.length?'<div class="ph">'+o.photos.map(function(u){ return '<img src="'+base+u+'" alt="">'; }).join('')+'</div>':'')+
      '<div class="acts">'+(o.token?'<a class="btn ghost small" target="_blank" rel="noopener" href="'+base+'/suivi/'+o.token+'">'+L.track+'</a>':'')+(o.invoice?'<a class="btn primary small" id="inv-'+esc(o.id)+'" href="#" data-inv="'+esc(o.id)+'">'+L.invoice+' '+esc(o.invoice.no)+'</a>':'')+(o.pay&&(o.pay.online||o.pay.d17)&&o.token?'<a class="btn primary small" target="_blank" rel="noopener" href="'+base+'/suivi/'+o.token+'#payBox">'+(o.pay.acompte>0?L.payAcompte+' '+fmtMoney(o.pay.acompte):L.paySolde+' '+fmtMoney(o.pay.rest))+(o.pay.online?'':' (D17)')+'</a>':'')+'</div></div>'; }).join(''):'<p class="small">'+L.none+'</p>';
    var eq=document.getElementById('eQuotes');
    eq.innerHTML=d.quotes.length?d.quotes.map(function(q){ var st=q.status==='accepte'?L.accepted:q.status==='refuse'?L.refused:L.sent; return '<div class="e-order"><div class="top"><b>'+esc(q.no||'')+' · '+fmtDate(q.at)+'</b><span class="stage">'+st+'</span></div><div class="meta"><span>'+L.total+' : '+fmtMoney(q.total||0)+'</span>'+(q.orderId?'<span>→ '+esc(q.orderId)+'</span>':'')+'</div><div class="acts">'+(q.token?'<a class="btn '+(q.status==='accepte'?'ghost':'primary')+' small" target="_blank" rel="noopener" href="'+base+'/devis/'+q.token+'">'+L.open+'</a>':'')+'</div></div>'; }).join(''):'<p class="small">'+L.noq+'</p>';
    eo.querySelectorAll('[data-inv]').forEach(function(a){ a.onclick=async function(e){ e.preventDefault(); var r=await fetch(base+'/api/public/compte/facture/'+encodeURIComponent(a.dataset.inv)+'/pdf',{headers:{'Authorization':'Bearer '+sid()}}); if(!r.ok) return; var b=await r.blob(); var u=URL.createObjectURL(b); window.open(u,'_blank'); }; });
  }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  document.getElementById('eLoginForm').addEventListener('submit',async function(e){ e.preventDefault(); var f=e.target, m=document.getElementById('eLoginMsg'); m.textContent='…'; try{ var j=await call('/api/public/compte/login',{method:'POST',body:{login:f.login.value,password:f.password.value}}); setSid(j.sid); m.textContent=''; f.reset(); load(); }catch(err){ m.textContent=err.message; } });
  document.getElementById('eCreateForm').addEventListener('submit',async function(e){ e.preventDefault(); var f=e.target, m=document.getElementById('eCreateMsg'); m.textContent='…'; try{ var j=await call('/api/public/compte/creer',{method:'POST',body:{token:f.token.value,login:f.login.value,password:f.password.value}}); setSid(j.sid); m.textContent=t().created; f.reset(); load(); }catch(err){ m.textContent=err.message; } });
  document.getElementById('eMdpBtn').onclick=function(){ var f=document.getElementById('eMdpForm'); f.hidden=!f.hidden; };
  document.getElementById('eMdpForm').addEventListener('submit',async function(e){ e.preventDefault(); var f=e.target, m=document.getElementById('eMdpMsg'); m.textContent='…'; try{ await call('/api/public/compte/mdp',{method:'POST',body:{password:f.password.value}}); m.textContent=isAr()?'تبدّلت كلمة السر.':'Mot de passe modifié.'; f.reset(); setTimeout(function(){ f.hidden=true; m.textContent=''; },1500); }catch(err){ m.textContent=err.message; } });
  document.getElementById('eLogout').onclick=async function(){ try{ await call('/api/public/compte/logout',{method:'POST',body:{}}); }catch(e){} setSid(''); load(); };
  if(sid()) load();
  // lien direct : site/#espace?suivi=TOKEN  → pré-remplit la création
  var mt=location.hash.match(/suivi=([a-f0-9]{32})/); if(mt){ document.querySelector('#eCreateForm [name=token]').value=mt[1]; }
  window.addEventListener('faza-lang',load);
})();
