/* Boutique : catalogue publié depuis la plateforme (Catalogue › « Publier sur le site »).
   Sans catalogue publié, des produits types (prix « à partir de » des tarifs) sont proposés. */
(function () {
  var grid = document.getElementById('shopGrid'); if (!grid) return;
  var max = +grid.dataset.max || 0, items = [], filter = 'all';
  var STD = [
    { id: 'std-trophee', name: 'Trophée hybride 25 cm', nameAr: 'كأس هجين 25 سم', desc: 'Corps imprimé en 3D + plaque plexi gravée à votre texte et logo.', descAr: 'جسم مطبوع ثلاثي الأبعاد + لوحة بلكسي منقوشة بنصك وشعارك.', price: 60, unit: 'pièce', options: ['Or', 'Argent', 'Bronze', 'Bleu', 'Noir'], delai: '4 à 7 jours', delaiAr: '4 إلى 7 أيام', link: '/trophees-medailles/#composer' },
    { id: 'std-plaque', name: 'Plaque gravée plexiglas A4', nameAr: 'لوحة بلكسي منقوشة A4', desc: 'Plaque de bureau, de remerciement ou de partenaire : logo et texte gravés.', descAr: 'لوحة مكتب أو شكر أو شراكة: شعار ونص منقوشين.', price: 25, unit: 'pièce', options: ['Transparent', 'Noir', 'Blanc', 'Miroir or'], delai: '2 à 3 jours', delaiAr: '2 إلى 3 أيام' },
    { id: 'std-lampe', name: 'Lampe lithophane avec votre photo', nameAr: 'مصباح ليثوفان بصورتك', desc: 'Votre photo apparaît quand la lampe s’allume. Socle lumineux inclus.', descAr: 'صورتك تظهر كي يشعل المصباح. القاعدة المضيئة مشمولة.', price: 55, unit: 'pièce', options: ['Socle blanc', 'Socle noir', 'Socle bois'], delai: '3 à 4 jours', delaiAr: '3 إلى 4 أيام' },
    { id: 'std-porte', name: 'Porte-clés personnalisés', nameAr: 'ميداليات مفاتيح مخصصة', desc: 'Avec votre logo, un prénom ou les couleurs du club. Prix dégressif dès 20 pièces.', descAr: 'بشعارك أو اسم أو ألوان النادي. سعر تنازلي من 20 قطعة.', price: 5, unit: 'pièce', options: [], delai: '2 à 3 jours', delaiAr: '2 إلى 3 أيام', minQty: 10 }
  ];
  var CATS = { trophees: /troph|m[ée]dail|coupe/i, gravure: /grav|plaque|plexi|laser|mdf|bois/i, cadeaux: /cadeau|lampe|litho|porte|pr[ée]nom|mariage/i, impression: /3d|impression|figurine|pi[eè]ce|prototype|maquette/i };
  function ar() { return L === 'ar'; }
  function nm(it) { return (ar() && it.nameAr) || it.name; }
  function render() {
    var list = items.filter(function (it) { return filter === 'all' || CATS[filter].test(it.name + ' ' + (it.desc || '')); });
    if (max) list = list.slice(0, max);
    grid.innerHTML = list.map(function (it) {
      var i = items.indexOf(it), ph = it.photo ? '<img src="' + API + it.photo + '" alt="" loading="lazy">' : ART[artFor(it.name)];
      return '<article class="prod"><div class="ph">' + ph + '</div><div class="bd"><h3>' + esc(nm(it)) + '</h3>' +
        (it.desc ? '<p class="desc">' + esc((ar() && it.descAr) || it.desc) + '</p>' : '') +
        (it.delai ? '<p class="meta">' + tr('shop_delai', 'Délai') + ' : ' + esc((ar() && it.delaiAr) || it.delai) + '</p>' : '') +
        '<p class="pr">' + (it.price ? '<small>' + tr('shop_from', 'à partir de') + '</small> ' + money(it.price) : tr('shop_quote', 'Sur devis')) + '</p>' +
        (it.link ? '<a class="btn line small" href="' + it.link + '">' + tr('shop_compose', 'Composer le mien') + '</a>' : '') +
        '<button type="button" class="btn primary small" data-add="' + i + '">' + tr('shop_add', 'Ajouter au panier') + '</button></div></article>';
    }).join('') || '<p class="small">' + tr('shop_none', 'Aucun produit dans cette catégorie pour le moment.') + '</p>';
  }
  document.querySelectorAll('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () { filter = b.dataset.filter; document.querySelectorAll('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); render(); });
  });
  function load() {
    items = STD.slice(); render();
    if (!API) return;
    fetch(API + '/api/public/catalogue', { headers: { 'X-Faza': '1' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.items && j.items.length) { items = j.items.length < 4 ? j.items.concat(STD) : j.items; render(); }
    }).catch(function () {});
  }

  /* dialogue : option, quantité, texte → panier */
  var dlg = document.getElementById('addDlg'), form = document.getElementById('addForm'), cur = null;
  function upd() { var q = Math.max(1, +form.qty.value || 1); document.getElementById('addTotal').textContent = cur && cur.price ? '≈ ' + money(cur.price * q) : tr('shop_quote', 'Sur devis'); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]'); if (!b || !dlg) return; cur = items[+b.dataset.add]; if (!cur) return;
    document.getElementById('addTitle').textContent = nm(cur);
    var ow = document.getElementById('addOptWrap'), os = form.option;
    if (cur.options && cur.options.length) { ow.hidden = false; os.innerHTML = cur.options.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join(''); } else { ow.hidden = true; os.innerHTML = ''; }
    form.qty.value = cur.minQty || 1; form.qty.min = 1; form.texte.value = ''; upd(); dlg.showModal();
  });
  if (form) {
    form.qty.addEventListener('input', upd);
    document.getElementById('addCancel').addEventListener('click', function () { dlg.close(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (!cur) return;
      FazaCart.add({ id: String(cur.id), name: cur.name, option: form.option.value || '', texte: form.texte.value.trim(), qty: +form.qty.value || 1, price: +cur.price || 0, photo: cur.photo || '', art: artFor(cur.name) });
      dlg.close();
    });
  }
  window.addEventListener('faza-lang', render);
  load();
})();
