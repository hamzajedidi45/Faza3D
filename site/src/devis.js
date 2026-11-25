/* Formulaire de demande de devis (accueil et page Contact). ?produit=… présélectionne le produit. */
(function () {
  var f = document.getElementById('devisForm'); if (!f) return;
  var msg = document.getElementById('msg');
  var pre = new URLSearchParams(location.search).get('produit') || f.dataset.produit;
  if (pre) { var ps = document.getElementById('f_product'); var i = PRODUCTS.fr.findIndex(function (p) { return p.toLowerCase().indexOf(pre.toLowerCase()) === 0; }); if (ps && i >= 0) ps.value = PRODUCTS.fr[i]; }
  var src = visitSrc(''); if (src && src !== 'site') { var hw = document.getElementById('f_how'); if (hw && [].some.call(hw.options, function (o) { return o.value === src; })) hw.value = src; }
  f.addEventListener('submit', async function (e) {
    e.preventDefault(); msg.className = 'msg'; msg.textContent = '';
    var d = Object.fromEntries(new FormData(f).entries());
    if (!String(d.phone || '').trim() && !String(d.email || '').trim()) { msg.className = 'msg err'; msg.textContent = tr('co_need2', 'Indiquez un téléphone ou un e-mail pour que nous puissions vous répondre.'); return; }
    var b = document.getElementById('send'); b.disabled = true;
    var summary = d.name + ' · ' + d.product + (d.qty ? ' × ' + d.qty : '') + (d.deadline ? ' · ' + d.deadline : '') + '\n' + (d.details || '') + (d.link ? '\n' + d.link : '');
    var sent = false, err = '';
    if (API) {
      var files = [];
      try { var lf = window.__lastFile; if (lf && lf.size <= 60e6) { var up = await fetch(API + '/api/public/fichier?name=' + encodeURIComponent(lf.name), { method: 'PUT', headers: { 'X-Faza': '1' }, body: lf }); if (up.ok) { var j = await up.json(); files.push({ id: j.id, name: j.name }); } } } catch (x) {}
      try { var r = await fetch(API + '/api/public/commande', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Faza': '1' }, body: JSON.stringify(Object.assign({}, d, { src: d.how || visitSrc(), lang: L, files: files })) }); sent = r.ok; if (!r.ok && (r.status === 400 || r.status === 429)) { try { err = (await r.json()).error || ''; } catch (x) {} } } catch (x) { sent = false; }
    }
    b.disabled = false;
    if (sent) { msg.className = 'msg ok'; msg.textContent = tr('f_ok', 'Merci, votre demande est bien reçue. Nous vous répondons sous 24 h.'); f.reset(); apply(); }
    else if (err) { msg.className = 'msg err'; msg.textContent = err; }
    else if (waBase) { var u = waBase + '?text=' + encodeURIComponent(waText() + summary); msg.className = 'msg ok'; msg.innerHTML = esc(tr('f_wa', 'Envoyez votre demande sur WhatsApp en un clic :')) + ' <a href="' + u + '" target="_blank" rel="noopener">WhatsApp</a>'; }
    else { msg.className = 'msg err'; msg.textContent = tr('f_err', 'Envoi impossible pour le moment. Écrivez-nous à : ') + CONFIG.email; }
  });
})();
