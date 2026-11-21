(function(){
  var fab=document.getElementById('aiFab'), box=document.getElementById('aiBox'), msgs=document.getElementById('aiMsgs'), form=document.getElementById('aiForm'), inp=document.getElementById('aiIn'), chips=document.getElementById('aiChips');
  if(!fab||typeof CONFIG==='undefined'||!CONFIG.plateforme) return;
  var base=CONFIG.plateforme.replace(/\/+$/,''), hist=[], busy=false, pendingImage=null, pendingImgEl=null;
  var T={fr:{hello:'عسلامة 👋 أنا FAZA، المساعد متاع الورشة. نجم نعاونك بالتونسي ولا بالفرنسية : أسعار، آجال، كيفاش تطلب… شنوّة تحب تصنع ؟',chips:['قداش سعر الميدالية ؟','Combien coûte une plaque gravée ?','نحب نعمل هدية بصورة','Délais pour 20 trophées ?'],err:'Petit souci de connexion. Réessayez, ou écrivez-nous sur WhatsApp.',lead:'✅ Demande envoyée à l’atelier : on vous rappelle sous 24 h.'},
          ar:{hello:'عسلامة 👋 أنا FAZA، المساعد متاع الورشة. نجم نعاونك بالتونسي ولا بالفرنسية : أسعار، آجال، كيفاش تطلب… شنوّة تحب تصنع ؟',chips:['قداش سعر الميدالية ؟','قداش تكلف لوحة منقوشة ؟','نحب نعمل هدية بصورة','آجال 20 كأس ؟'],err:'مشكل صغير في الاتصال. عاود، ولا اكتبلنا على واتساب.',lead:'✅ طلبك وصل للورشة : نعاودو نكلموك في ظرف 24 ساعة.'}};
  function L(){ return document.documentElement.lang==='ar'?'ar':'fr'; }
  function isAr(t){ return /[؀-ۿ]/.test(t); }
  function add(role,text,cls){ var d=document.createElement('div'); d.className='ai-m '+(role==='user'?'u':'a')+(cls?' '+cls:'')+(role!=='user'&&isAr(text)?' rtl':''); d.textContent=text; msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight; return d; }
  function renderChips(){ chips.innerHTML=''; if(hist.length) return; T[L()].chips.forEach(function(c){ var b=document.createElement('button'); b.type='button'; b.textContent=c; b.onclick=function(){ send(c); }; chips.appendChild(b); }); }
  function open(){ box.classList.add('on'); if(!msgs.children.length){ add('assistant',T[L()].hello); renderChips(); } setTimeout(function(){ inp.focus(); },50); }
  async function send(text){ if(busy||(!text&&!pendingImage)) return; busy=true; text=text||(L()==='ar'?'هاذي الصورة متاعي':'Voici mon image'); add('user',text); hist.push({role:'user',content:text+(pendingImage?' [image jointe]':'')}); chips.innerHTML=''; inp.value=''; var ty=add('assistant','…','typing'); var img=pendingImage, imgEl=pendingImgEl; pendingImage=null;
    try{ var ctl=new AbortController(), tm=setTimeout(function(){ctl.abort()},40000); var r=await fetch(base+'/api/public/assistant',{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json','X-Faza':'1'},body:JSON.stringify({messages:hist.slice(-12),lang:L(),image:img})}); clearTimeout(tm); var j=await r.json(); if(!r.ok||!j.reply) throw new Error(j.error||'');
      ty.remove(); add('assistant',j.reply||''); hist.push({role:'assistant',content:j.reply||''}); if(j.lead) add('assistant',T[L()].lead);
      if(j.make&&(imgEl||lastImgEl)&&window.__makeFromImage){ window.__makeFromImage(imgEl||lastImgEl,j.make); add('assistant',L()==='ar'?'⬆️ النموذج ثلاثي الأبعاد والسعر موجودين فوق، في إطار المعاينة.':'⬆️ Le modèle 3D et le prix sont affichés plus haut, dans le cadre d’aperçu.'); }
      if(imgEl) lastImgEl=imgEl;
    }catch(e){ ty.remove(); add('assistant',T[L()].err); }
    busy=false; }
  var lastImgEl=null;
  document.getElementById('aiImgBtn').onclick=function(){ document.getElementById('aiImgIn').click(); };
  document.getElementById('aiImgIn').addEventListener('change',function(){ var f=this.files[0]; if(!f) return; var img=new Image(); img.onload=function(){ var c=document.createElement('canvas'); var k=Math.min(1,1024/Math.max(img.width,img.height)); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext('2d').drawImage(img,0,0,c.width,c.height); var data=c.toDataURL('image/jpeg',0.82); pendingImage={type:'image/jpeg',data:data.split(',')[1]}; pendingImgEl=img; var d=document.createElement('div'); d.className='ai-m u'; var im=document.createElement('img'); im.src=data; d.appendChild(im); msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight; inp.placeholder=L()==='ar'?'شنوّة تحب تعمل بيها ؟ (مثلاً: ليثوفان 15 سم)':'Que voulez-vous en faire ? (ex. : lithophane 15 cm)'; inp.focus(); }; img.src=URL.createObjectURL(f); this.value=''; });
  fetch(base+'/api/public/assistant').then(function(r){ return r.ok?r.json():null; }).then(function(j){ if(j&&j.actif) fab.classList.add('on'); }).catch(function(){});
  fab.onclick=function(){ box.classList.contains('on')?box.classList.remove('on'):open(); };
  document.getElementById('aiClose').onclick=function(){ box.classList.remove('on'); };
  form.addEventListener('submit',function(e){ e.preventDefault(); send(inp.value.trim()); });
})();
