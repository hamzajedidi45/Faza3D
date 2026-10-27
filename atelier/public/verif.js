(async function(){
  var root=document.getElementById('root'); var m=/^\/verif\/([a-f0-9]{32})$/.exec(location.pathname);
  var money=function(v){return (Math.round(v*1000)/1000).toLocaleString('fr-FR')+' DT'}; var date=function(ms){return new Date(ms).toLocaleDateString('fr-TN')};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  try{
    var r=await fetch('/api/public/verif/'+(m?m[1]:'x'),{headers:{'X-Faza':'1'}}); var d=await r.json(); if(!r.ok) throw new Error(d.error||'');
    root.innerHTML='<div class="hero"><div class="logo"></div><div><b>'+esc(d.issuer)+'</b><div class="small">'+(d.mf?'MF '+esc(d.mf):'')+'</div></div></div>'
     +'<div class="ok">✔ Document authentique · وثيقة أصلية</div>'
     +'<table><tr><td>Facture n°</td><td><b>'+esc(d.no)+'</b></td></tr><tr><td>Date</td><td>'+date(d.at)+'</td></tr><tr><td>Client</td><td>'+esc(d.client)+'</td></tr><tr><td>Objet</td><td>'+esc(d.product)+(d.qty?' × '+d.qty:'')+'</td></tr><tr><td>Total TTC</td><td><b>'+money(d.ttc)+'</b></td></tr><tr><td>Réglé</td><td>'+money(d.paid)+'</td></tr>'
     +(d.avoir?'<tr><td>Avoir n°</td><td>'+esc(d.avoir.no)+' · '+date(d.avoir.at)+(d.avoir.total?' · '+money(d.avoir.total):'')+'</td></tr>':'')
     +'<tr><td>PDF signé</td><td>'+(d.signed?'oui (signature électronique intégrée)':'non')+'</td></tr></table>'
     +'<p class="note">Comparez ces informations avec le document que vous avez reçu : numéro, date, client et montant doivent être identiques. En cas de différence, le document a été modifié — contactez-nous.<br><span class="ar">قارن هذه المعلومات مع الوثيقة اللي وصلتك : الرقم، التاريخ، الحريف والمبلغ لازم يكونوا كيف كيف.</span></p>';
  }catch(e){ root.innerHTML='<div class="bad">✖ Aucune facture ne correspond à ce code · ما فماش فاتورة بهذا الرمز</div><p class="note">'+esc(e.message)+'</p>'; }
})();
