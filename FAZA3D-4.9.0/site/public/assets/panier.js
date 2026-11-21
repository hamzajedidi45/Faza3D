/* Panier : les articles restent dans ce navigateur jusqu'à l'envoi ; la commande arrive dans la plateforme
   (Demandes, canal « Boutique ») avec la liste des articles et le total estimé. Rien n'est payé en ligne ici :
   l'atelier confirme le prix et la date, puis envoie le lien de suivi (acompte espèces, virement ou D17). */
(function () {
  var box = document.getElementById('cartLines'); if (!box) return;
  var form = document.getElementById('checkout'), msg = document.getElementById('coMsg');
  function draw() {
    var v = FazaCart.get();
    document.getElementById('cartFull').hidden = !v.length; document.getElementById('cartEmpty').hidden = !!v.length;
    box.innerHTML = v.map(function (x) {
      var th = x.photo ? '<img src="' + API + x.photo + '" alt="">' : (ART[x.art] || ART.piece);
      return '<div class="cline" data-k="' + esc(x.key) + '"><div class="th">' + th + '</div><div><b>' + esc(x.name) + '</b>' +
        (x.option ? '<div class="opt">' + esc(x.option) + '</div>' : '') + (x.texte ? '<div class="opt">« ' + esc(x.texte) + ' »</div>' : '') +
        '<div class="q"><button type="button" data-d="-1" aria-label="−">−</button><input type="number" min="1" max="9999" value="' + (+x.qty || 1) + '" aria-label="' + tr('cart_qty', 'Quantité') + '"><button type="button" data-d="1" aria-label="+">+</button></div></div>' +
        '<div class="end"><b>' + (x.price ? '≈ ' + money(x.price * x.qty) : tr('shop_quote', 'Sur devis')) + '</b><br><button type="button" class="rm">' + tr('cart_rm', 'Retirer') + '</button></div></div>';
    }).join('');
    var t = FazaCart.total(), q = v.some(function (x) { return !x.price; });
    document.getElementById('cartTotal').textContent = t ? '≈ ' + money(t) + (q ? ' +' : '') : tr('shop_quote', 'Sur devis');
  }
  function setQty(k, q) { var v = FazaCart.get(); v.forEach(function (x) { if (x.key === k) x.qty = Math.max(1, Math.min(9999, Math.round(q) || 1)); }); FazaCart.set(v); }
  box.addEventListener('click', function (e) {
    var line = e.target.closest('.cline'); if (!line) return; var k = line.dataset.k;
    if (e.target.closest('.rm')) { FazaCart.set(FazaCart.get().filter(function (x) { return x.key !== k; })); return; }
    var d = e.target.closest('[data-d]'); if (d) { var i = line.querySelector('input'); setQty(k, (+i.value || 1) + (+d.dataset.d)); }
  });
  box.addEventListener('change', function (e) { var line = e.target.closest('.cline'); if (line && e.target.tagName === 'INPUT') setQty(line.dataset.k, +e.target.value); });
  window.addEventListener('faza-cart', draw); window.addEventListener('faza-lang', draw);

  // livraison ou retrait
  function mode() { var r = form.querySelector('[name=mode]:checked'); return r ? r.value : 'retrait'; }
  form.addEventListener('change', function (e) { if (e.target.name === 'mode') document.getElementById('shipWrap').hidden = mode() !== 'livraison'; });
  try { var me = JSON.parse(localStorage.getItem('faza_shop_me') || '{}'); ['name', 'phone', 'email', 'ville', 'adresse'].forEach(function (k) { if (me[k] && form[k]) form[k].value = me[k]; }); } catch (e) {}

  form.addEventListener('submit', async function (e) {
    e.preventDefault(); msg.className = 'msg'; msg.textContent = '';
    var v = FazaCart.get(); if (!v.length) return;
    var d = { name: form.name.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim() };
    if (!d.phone && !d.email) { msg.className = 'msg err'; msg.textContent = tr('co_need', 'Indiquez un téléphone ou un e-mail pour que nous puissions confirmer la commande.'); return; }
    var liv = mode() === 'livraison' ? (L === 'ar' ? 'توصيل : ' : 'Livraison : ') + [form.ville.value.trim(), form.adresse.value.trim()].filter(Boolean).join(', ') : (L === 'ar' ? 'استلام من الورشة (الشرقية 2)' : 'Retrait à l’atelier (Charguia 2)');
    var lines = v.map(function (x) { return x.qty + ' × ' + x.name + (x.option ? ' (' + x.option + ')' : '') + (x.texte ? ' « ' + x.texte + ' »' : ''); });
    try { localStorage.setItem('faza_shop_me', JSON.stringify({ name: d.name, phone: d.phone, email: d.email, ville: form.ville.value.trim(), adresse: form.adresse.value.trim() })); } catch (x) {}
    var body = Object.assign(d, { boutique: true, panier: v.map(function (x) { return { name: x.name, option: x.option, texte: x.texte, qty: x.qty, price: x.price }; }),
      product: v.length === 1 ? v[0].name : v.length + ' articles', qty: String(FazaCart.count()), livraison: liv, deadline: form.deadline.value, note: form.note.value.trim(),
      details: (L === 'ar' ? 'طلب من السلة' : 'Commande panier') + ' :\n' + lines.join('\n') + '\n' + liv, ref: form.ref.value.trim().toUpperCase(), website: form.website.value, src: visitSrc(), lang: L });
    var b = document.getElementById('coSend'); b.disabled = true; var ok = false;
    if (API) { try { var r = await fetch(API + '/api/public/commande', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Faza': '1' }, body: JSON.stringify(body) }); ok = r.ok; if (!ok) { var j = {}; try { j = await r.json(); } catch (x) {} if (r.status === 429 || r.status === 400) { msg.className = 'msg err'; msg.textContent = j.error || ''; b.disabled = false; return; } } } catch (x) { ok = false; } }
    b.disabled = false;
    if (ok) { FazaCart.clear(); document.getElementById('cartFull').hidden = true; document.getElementById('cartEmpty').hidden = true; document.getElementById('cartDone').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (waBase) { var u = waBase + '?text=' + encodeURIComponent(waText() + (L === 'ar' ? 'نحب نطلب :\n' : 'je souhaite commander :\n') + lines.join('\n') + '\n' + liv + '\n' + d.name); msg.className = 'msg ok'; msg.innerHTML = esc(tr('co_wa', 'La commande en ligne ne répond pas pour le moment. Envoyez-la sur WhatsApp en un clic :')) + ' <a href="' + u + '" target="_blank" rel="noopener">WhatsApp</a>'; }
    else { msg.className = 'msg err'; msg.textContent = tr('co_err', 'Envoi impossible pour le moment. Appelez-nous au ') + CONFIG.phone; }
  });
  draw();
})();
