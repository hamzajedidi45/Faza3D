/* Configurateur de trophée : modèle, hauteur, couleur, socle, texte gravé, quantité → aperçu, prix estimé, panier.
   Prix de base par hauteur réglables ici (TND TTC, estimation : l'atelier confirme le prix exact). */
(function () {
  var f = document.getElementById('cfgForm'); if (!f) return;
  var PRIX = (CONFIG.trophee && CONFIG.trophee.prix) || { 20: 48, 25: 60, 30: 78 };
  var REMISE = [[30, 0.15], [10, 0.10]];           // à partir de 10 pièces −10 %, de 30 pièces −15 %
  var MODELE = { coupe: 1, etoile: 1, plaque: 0.9 };
  var COUL = { or: '#D9AC3F', argent: '#C4CBD4', bronze: '#B47442', bleu: '#2B6CF0', rouge: '#C93A3F', noir: '#2B2F36', blanc: '#F3F4F6' };
  var SOCLE = { noir: '#1C1F25', bois: '#8B5B34', blanc: '#E9EBEE' };
  var pv = document.getElementById('cfgPv');
  function v(n) { var r = f.querySelector('[name="' + n + '"]:checked'); return r ? r.value : (f[n] && f[n].value) || ''; }
  function lab(n) { var r = f.querySelector('[name="' + n + '"]:checked'); return r ? r.closest('label').textContent.trim() : ''; }
  function txt(s) { return esc(String(s || '').slice(0, 32)); }
  function draw() {
    var m = v('modele'), c = COUL[v('couleur')] || COUL.or, s = SOCLE[v('socle')] || SOCLE.noir, h = +v('hauteur') || 25;
    var k = h / 30, top = 260 - 200 * k, l1 = txt(f.l1.value), l2 = txt(f.l2.value), shade = 'rgba(0,0,0,.18)', body;
    if (m === 'etoile') {
      var cy = top + 70 * k + 20, R = 70 * k + 18, r = R * 0.45, pts = [];
      for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; pts.push((120 + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1)); }
      body = '<rect x="114" y="' + (cy + r) + '" width="12" height="' + (236 - cy - r) + '" fill="' + c + '"/><polygon points="' + pts.join(' ') + '" fill="' + c + '"/><polygon points="' + pts.slice(0, 3).join(' ') + ' 120,' + cy + '" fill="rgba(255,255,255,.18)"/>';
    } else if (m === 'plaque') {
      body = '<rect x="62" y="' + top + '" width="116" height="' + (236 - top) + '" rx="10" fill="rgba(190,225,255,.28)" stroke="rgba(190,225,255,.75)" stroke-width="2"/>' +
        '<text x="120" y="' + (top + (236 - top) * 0.42) + '" text-anchor="middle" font-family="Bricolage Grotesque,Manrope,sans-serif" font-weight="800" font-size="17" fill="#EAF4FF">' + (l1 || 'FAZA 3D') + '</text>' +
        '<text x="120" y="' + (top + (236 - top) * 0.42 + 22) + '" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="600" font-size="11" fill="#CFE4FF">' + l2 + '</text>' +
        '<rect x="84" y="' + (top + (236 - top) * 0.62) + '" width="72" height="2" fill="' + c + '"/>';
    } else {
      var w = 52 + 40 * k, y2 = top + 92 * k + 30;
      body = '<path d="M' + (120 - w) + ' ' + top + 'h' + (2 * w) + 'l-8 ' + (y2 - top - 20) + 'c-4 16-20 26-' + (w - 8) + ' 26s-' + (w - 16) + '-10-' + (w - 8) + '-26z" fill="' + c + '"/>' +
        '<path d="M' + (120 - w) + ' ' + (top + 10) + 'h-22c0 26 12 40 30 44M' + (120 + w) + ' ' + (top + 10) + 'h22c0 26-12 40-30 44" stroke="' + c + '" stroke-width="7" fill="none"/>' +
        '<path d="M' + (120 - w + 14) + ' ' + (top + 8) + 'h18l-6 ' + (y2 - top - 30) + 'h-8z" fill="rgba(255,255,255,.22)"/>' +
        '<rect x="110" y="' + (y2 + 6) + '" width="20" height="' + (236 - y2 - 6) + '" fill="' + c + '"/><rect x="96" y="' + (226) + '" width="48" height="10" fill="' + c + '"/>';
    }
    var plate = m === 'plaque' ? '' : '<rect x="84" y="246" width="72" height="26" rx="3" fill="rgba(190,225,255,.92)"/><text x="120" y="258" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="800" font-size="9.5" fill="#0B1A30">' + (l1 || 'FAZA 3D') + '</text><text x="120" y="268" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="600" font-size="7.5" fill="#0B1A30">' + l2 + '</text>';
    pv.innerHTML = '<svg viewBox="0 0 240 300" role="img" aria-label="' + esc(tr('cfg_aria', 'Aperçu du trophée')) + '"><ellipse cx="120" cy="288" rx="92" ry="7" fill="' + shade + '"/>' + body +
      '<path d="M60 236h120l10 50H50z" fill="' + s + '"/><path d="M60 236h120l2 10H58z" fill="rgba(255,255,255,.12)"/>' + plate + '</svg>';
    price();
  }
  function unit() { var h = +v('hauteur') || 25, q = Math.max(1, +f.qty.value || 1), p = (PRIX[h] || PRIX[25]) * (MODELE[v('modele')] || 1), d = 0; REMISE.forEach(function (r) { if (!d && q >= r[0]) d = r[1]; }); return { u: Math.round(p * (1 - d)), d: d, q: q }; }
  function price() {
    var x = unit();
    document.getElementById('cfgTotal').textContent = '≈ ' + money(x.u * x.q);
    document.getElementById('cfgUnit').textContent = money(x.u) + ' ' + tr('cfg_each', 'la pièce') + (x.d ? ' · −' + Math.round(x.d * 100) + ' % ' + tr('cfg_qty_disc', 'dès') + ' ' + (x.d >= 0.15 ? 30 : 10) + ' ' + tr('cfg_pcs', 'pièces') : '');
  }
  f.addEventListener('input', draw); f.addEventListener('change', draw);
  f.addEventListener('submit', function (e) {
    e.preventDefault(); var x = unit();
    FazaCart.add({ id: 'cfg-trophee', name: (L === 'ar' ? 'كأس مخصص ' : 'Trophée personnalisé ') + v('hauteur') + ' cm', option: [lab('modele'), lab('couleur'), (L === 'ar' ? 'قاعدة ' : 'socle ') + lab('socle')].join(', '),
      texte: [f.l1.value.trim(), f.l2.value.trim()].filter(Boolean).join(' / '), qty: x.q, price: x.u, art: 'trophee' });
  });
  window.addEventListener('faza-lang', draw);
  draw();
})();
