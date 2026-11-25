/* FAZA 3D · site client : réglages, langue, thème, menu ☰, panier, coordonnées venant de la plateforme.
   Chargé sur toutes les pages, après /config.js et /assets/ar.js. Les autres scripts (estimation 3D, assistant,
   espace client, boutique, panier, configurateur) utilisent CONFIG, T, L, apply() et FazaCart définis ici. */
'use strict';
var CONFIG = {
  phone: '+216 26 435 135', email: 'contact@faza3d.tn', whatsapp: '',
  instagram: 'https://www.instagram.com/faza_3d/', facebook: 'https://www.facebook.com/profile.php?id=61596222977653', tiktok: '',
  tarif: { parGramme: 0.35, parHeure: 4, minimum: 15, densite: 1.24, remplissage: 0.20, lithophane: 55, reliefMin: 12 },
  plateforme: ''
};
if (window.FAZA_CONFIG) { for (var k0 in window.FAZA_CONFIG) if (window.FAZA_CONFIG[k0] !== '' && window.FAZA_CONFIG[k0] != null) CONFIG[k0] = window.FAZA_CONFIG[k0]; }
var API = CONFIG.plateforme ? String(CONFIG.plateforme).replace(/\/+$/, '') : '';

/* ---------- langue ---------- */
var AR = window.FAZA_AR || {};
var T = { fr: {}, ar: AR.t || {} };
var PRODUCTS = AR.PRODUCTS || { fr: ['Autre'], ar: ['أخرى'] };
var HOWS = AR.HOWS || { fr: [['', '—']], ar: [['', '—']] };
document.querySelectorAll('[data-t]').forEach(function (el) { if (!(el.dataset.t in T.fr)) T.fr[el.dataset.t] = el.innerHTML; });
document.querySelectorAll('[data-tp]').forEach(function (el) { T.fr['@p' + el.dataset.tp] = el.getAttribute('placeholder') || ''; });
var AR_PAGE = /^\/ar\/?$/.test(location.pathname), HOME = location.pathname === '/' || AR_PAGE;
var L = 'fr';
try { L = localStorage.getItem('faza_site_lang') || ((navigator.language || '').indexOf('ar') === 0 ? 'ar' : 'fr'); } catch (e) {}
if (HOME) L = AR_PAGE ? 'ar' : 'fr';            // l'accueil a deux adresses : / (français) et /ar/ (arabe)
var qsLang = new URLSearchParams(location.search).get('lang'); if (qsLang) L = qsLang; if (!T[L]) L = 'fr';
var TITLE_FR = document.title;
function tr(k, fr) { return (L === 'ar' && T.ar[k] != null) ? T.ar[k] : fr; }
function apply() {
  document.documentElement.lang = L; document.documentElement.dir = L === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-t]').forEach(function (el) { var v = T[L][el.dataset.t]; if (v == null) v = T.fr[el.dataset.t]; if (v != null) el.innerHTML = v; });
  document.querySelectorAll('[data-tp]').forEach(function (el) { var v = L === 'ar' ? T.ar['@p' + el.dataset.tp] : T.fr['@p' + el.dataset.tp]; if (v != null) el.setAttribute('placeholder', v); });
  document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === L); });
  var ps = document.getElementById('f_product');
  if (ps) { var pv = ps.value; ps.innerHTML = PRODUCTS[L].map(function (p, i) { return '<option value="' + PRODUCTS.fr[i] + '">' + p + '</option>'; }).join(''); if (pv) ps.value = pv; }
  var hs = document.getElementById('f_how');
  if (hs) { var hv = hs.value; hs.innerHTML = HOWS[L].map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join(''); hs.value = hv || ''; }
  var tt = document.querySelector('meta[name="faza-title-ar"]'); document.title = (L === 'ar' && tt) ? tt.content : TITLE_FR;
  if (window.__fillSizes) window.__fillSizes();
  try { window.dispatchEvent(new Event('faza-lang')); } catch (e) {}
}
document.querySelectorAll('[data-lang]').forEach(function (b) {
  b.addEventListener('click', function () {
    L = b.dataset.lang; try { localStorage.setItem('faza_site_lang', L); } catch (e) {}
    if (HOME && L === 'ar' && !AR_PAGE) { location.href = '/ar/' + location.search + location.hash; return; }
    if (HOME && L === 'fr' && AR_PAGE) { location.href = '/' + location.search + location.hash; return; }
    apply();
  });
});

/* ---------- thème clair / sombre (le choix est lu dans <head> pour éviter un flash) ---------- */
/* sombre par défaut ; le choix « clair » est gardé dans ce navigateur */
function curTheme() { return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; }
function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('faza_theme', t); } catch (e) {} document.querySelectorAll('[data-theme-btn]').forEach(function (b) { b.setAttribute('aria-pressed', t === 'light'); }); }
document.querySelectorAll('[data-theme-btn]').forEach(function (b) { b.setAttribute('aria-pressed', curTheme() === 'light'); b.addEventListener('click', function () { setTheme(curTheme() === 'dark' ? 'light' : 'dark'); }); });

/* onglets (services sur l'accueil, questions par thème) */
document.querySelectorAll('[data-tabs]').forEach(function (box) {
  var tabs = box.querySelectorAll('[role="tab"]'), panels = box.querySelectorAll('[role="tabpanel"]');
  function show(i, focus) { tabs.forEach(function (t, j) { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; }); panels.forEach(function (p, j) { p.hidden = i !== j; }); if (focus) tabs[i].focus(); }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(i); });
    t.addEventListener('keydown', function (e) { var k = e.key, n = tabs.length, d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[k]; if (d) { e.preventDefault(); if (document.documentElement.dir === 'rtl' && (k === 'ArrowRight' || k === 'ArrowLeft')) d = -d; show((i + d + n) % n, true); } });
  });
});

/* ---------- menu ☰ ---------- */
(function () {
  var d = document.getElementById('drawer'), btn = document.getElementById('menuBtn'); if (!d || !btn) return;
  function open() { d.hidden = false; requestAnimationFrame(function () { d.classList.add('on'); }); document.body.classList.add('lock'); btn.setAttribute('aria-expanded', 'true'); var f = d.querySelector('nav a, nav button'); if (f) f.focus(); }
  function close() { d.classList.remove('on'); document.body.classList.remove('lock'); btn.setAttribute('aria-expanded', 'false'); setTimeout(function () { if (!d.classList.contains('on')) d.hidden = true; }, 250); }
  btn.addEventListener('click', open);
  d.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', close); });
  d.addEventListener('click', function (e) { if (e.target.closest('a[href]')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('on')) { close(); btn.focus(); } });
  var here = location.pathname.replace(/\/ar\/?$/, '/');
  document.querySelectorAll('.mainnav a, .drawer ul a').forEach(function (a) { var h = a.getAttribute('href'); if (h === here || (h.length > 1 && here.indexOf(h) === 0)) a.setAttribute('aria-current', 'page'); });
})();

/* ---------- panier (gardé dans ce navigateur) ---------- */
var FazaCart = (function () {
  var K = 'faza_cart';
  function get() { try { var v = JSON.parse(localStorage.getItem(K) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function save(v) { try { localStorage.setItem(K, JSON.stringify(v.slice(0, 40))); } catch (e) {} badge(); try { window.dispatchEvent(new Event('faza-cart')); } catch (e) {} }
  function same(a, b) { return a.id === b.id && (a.option || '') === (b.option || '') && (a.texte || '') === (b.texte || ''); }
  function add(it) {
    var v = get(); it.qty = Math.max(1, Math.round(+it.qty || 1));
    var ex = v.filter(function (x) { return same(x, it); })[0];
    if (ex) { ex.qty += it.qty; if (it.price) ex.price = it.price; } else { it.key = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); v.push(it); }
    save(v); toast(tr('cart_added', 'Ajouté au panier'), '/panier/', tr('cart_see', 'Voir le panier'));
  }
  function count() { return get().reduce(function (s, x) { return s + (+x.qty || 0); }, 0); }
  function total() { return get().reduce(function (s, x) { return s + (+x.price || 0) * (+x.qty || 0); }, 0); }
  function badge() { var n = count(); document.querySelectorAll('[data-cart-n]').forEach(function (b) { b.textContent = n; b.hidden = !n; }); }
  window.addEventListener('storage', function (e) { if (e.key === K) badge(); });
  badge();
  return { get: get, set: save, add: add, count: count, total: total, clear: function () { save([]); } };
})();

function toast(text, href, label) {
  var t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = ''; var s = document.createElement('span'); s.textContent = text; t.appendChild(s);
  if (href) { var a = document.createElement('a'); a.href = href; a.textContent = label; t.appendChild(a); }
  t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('on'); }, 3500);
}
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function money(v) { return Math.round(v).toLocaleString('fr-FR') + ' TND'; }

/* ---------- compte : prénom affiché dans l'en-tête quand le client est connecté ---------- */
function accountLabel() {
  var n = ''; try { if (localStorage.getItem('faza_client_sid')) n = localStorage.getItem('faza_client_name') || ''; } catch (e) {}
  document.querySelectorAll('[data-acc-label]').forEach(function (el) { el.textContent = n ? n.split(' ')[0] : tr('acc_label', 'Mon espace'); });
}
window.addEventListener('faza-lang', accountLabel);

/* ---------- origine de la visite (?src=carte, ?src=instagram…) : gardée pour les formulaires ---------- */
(function () { var s = new URLSearchParams(location.search).get('src'); if (s && /^[a-z0-9_-]{1,30}$/i.test(s)) { try { sessionStorage.setItem('faza_src', s.toLowerCase()); } catch (e) {} } })();
function visitSrc(fallback) { var s = ''; try { s = sessionStorage.getItem('faza_src') || ''; } catch (e) {} return fallback || s || 'site'; }

/* ---------- coordonnées et WhatsApp ---------- */
var waBase = null;
function waText() { return L === 'ar' ? 'مرحباً FAZA 3D، ' : 'Bonjour FAZA 3D, '; }
function applyConfig() {
  var num = CONFIG.whatsapp || CONFIG.phone, digits = String(num).replace(/\D/g, '');
  waBase = digits && !/X/i.test(num) ? 'https://wa.me/' + digits : null;
  document.querySelectorAll('[data-phone]').forEach(function (el) { el.textContent = CONFIG.phone; if (el.tagName === 'A') el.href = 'tel:' + String(CONFIG.phone).replace(/\s/g, ''); });
  document.querySelectorAll('[data-mail]').forEach(function (el) { el.textContent = CONFIG.email; if (el.tagName === 'A') el.href = 'mailto:' + CONFIG.email; });
  [['ig', CONFIG.instagram], ['fb', CONFIG.facebook], ['tt', CONFIG.tiktok]].forEach(function (x) { document.querySelectorAll('[data-social="' + x[0] + '"]').forEach(function (a) { if (x[1]) { a.href = x[1]; a.hidden = false; } else a.hidden = true; }); });
  document.querySelectorAll('[data-wa]').forEach(function (a) { var msg = a.dataset.wa ? tr(a.dataset.wa, a.dataset.waFr || '') : ''; if (waBase) { a.href = waBase + '?text=' + encodeURIComponent(waText() + (msg || (L === 'ar' ? 'عندي سؤال' : 'j’ai une question'))); a.target = '_blank'; a.rel = 'noopener'; a.hidden = false; } else if (a.classList.contains('wa-fab')) a.hidden = true; });
}

/* ---------- réalisations publiées depuis la plateforme (Qualité › Portfolio) ---------- */
function drawGallery() {
  var list = window.__realisations; if (!list || !list.length) return;
  document.querySelectorAll('[data-gallery]').forEach(function (g) {
    var max = +g.dataset.gallery || 12;
    g.innerHTML = list.slice(0, max).map(function (r) { var cap = (L === 'ar' && r.titleAr) || r.title || ''; return '<figure class="tile"><img src="' + API + r.photo + '" alt="' + esc(cap) + '" loading="lazy">' + (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>'; }).join('');
  });
}
window.addEventListener('faza-lang', drawGallery);

/* ---------- bandeau « en ce moment » selon la saison ---------- */
function season() {
  var el = document.getElementById('season'); if (!el) return;
  var m = new Date().getMonth() + 1, k;
  if (m >= 11 || m === 1) k = 'sz_fin'; else if (m >= 4 && m <= 6) k = 'sz_ecole'; else if (m >= 7 && m <= 9) k = 'sz_mariage'; else k = 'sz_ramadan';
  var map = { sz_fin: '/entreprises-ecoles/', sz_ecole: '/trophees-medailles/', sz_mariage: '/cadeaux-personnalises/', sz_ramadan: '/cadeaux-personnalises/' };
  el.querySelectorAll('[data-t^="sz_"]').forEach(function (s) { s.hidden = s.dataset.t !== k; });
  el.querySelector('a').href = map[k]; el.hidden = false;
}

/* ---------- textes et réglages venant de la plateforme (Paramètres › Site) ---------- */
function loadInfo() {
  if (!API) return;
  fetch(API + '/api/public/info').then(function (r) { return r.ok ? r.json() : null; }).then(function (i) {
    if (!i) return;
    ['phone', 'email', 'instagram', 'facebook', 'tiktok', 'whatsapp'].forEach(function (k) { if (i[k]) CONFIG[k] = i[k]; });
    var tx = i.textes || {}; for (var lg in tx) if (T[lg]) for (var k in tx[lg]) if (tx[lg][k]) T[lg][k] = tx[lg][k];
    if (i.address && !(tx.fr && tx.fr.d_addr_v)) { T.fr.d_addr_v = i.address; }
    if (i.hours && !(tx.fr && tx.fr.d_hours)) { T.fr.d_hours = i.hours; }
    if (i.realisations && i.realisations.length) window.__realisations = i.realisations;
    INFO = i; if (i.googleMaps) document.querySelectorAll('[data-gmaps]').forEach(function (a) { a.href = i.googleMaps; });
    drawAvis(); drawPay();
    if (i.machines > 0) document.querySelectorAll('[data-machines]').forEach(function (el) { el.textContent = i.machines; });
    if (i.tarif) CONFIG.tarif = Object.assign({}, CONFIG.tarif, i.tarif); if (i.calc) CONFIG.calc = i.calc;
    CONFIG.ia3d = !!i.ia3d; var ib = document.getElementById('iaModeBtn'); if (ib) ib.hidden = !i.ia3d;
    applyConfig(); apply(); drawGallery(); season();
    if (window.__refreshEstimate) window.__refreshEstimate();
  }).catch(function () {});
}

/* avis clients (Paramètres › Avis clients sur le site) et moyens de paiement, envoyés par la plateforme */
var INFO = null;
function drawAvis() {
  var sec = document.getElementById('avis'), g = document.getElementById('avisGrid'); if (!sec || !g || !INFO) return;
  var list = INFO.avis || [], all = document.getElementById('avisAll'), leave = document.getElementById('avisLeave');
  if (all) { all.hidden = !INFO.googleMaps; if (INFO.googleMaps) all.href = INFO.googleMaps; }
  if (leave) { leave.hidden = !INFO.googleReview; if (INFO.googleReview) leave.href = INFO.googleReview; }
  sec.hidden = !list.length; if (!list.length) return;
  g.innerHTML = list.map(function (a) {
    var d = ''; if (a.date) { try { d = new Date(a.date + '-15').toLocaleDateString(L === 'ar' ? 'ar-TN' : 'fr-FR', { month: 'long', year: 'numeric' }); } catch (e) {} }
    var src = a.source === 'Atelier' ? tr('av_src_Atelier', 'à l’atelier') : tr('av_on', 'sur') + ' ' + a.source;
    return '<article><div class="st" role="img" aria-label="' + a.note + '/5">' + '★★★★★'.slice(0, a.note) + '<span>' + '★★★★★'.slice(a.note) + '</span></div>' +
      '<p dir="auto">« ' + esc(a.texte) + ' »</p><div class="who">' + esc(a.nom) + '<small>' + esc(src) + (d ? ' · ' + esc(d) : '') + '</small></div></article>';
  }).join('');
}
function drawPay() {
  var el = document.getElementById('payModes'); if (!el || !INFO || !INFO.pay) return;
  var m = []; if (INFO.pay.online) m.push(tr('pay_card', 'carte bancaire en ligne')); if (INFO.pay.d17) m.push(tr('pay_d17', 'D17')); if (INFO.pay.virement) m.push(tr('pay_vir', 'virement')); m.push(tr('pay_cash', 'espèces à l’atelier'));
  el.textContent = tr('pay_lead', 'Après confirmation, acompte par :') + ' ' + m.join(L === 'ar' ? '، ' : ', ') + '.'; el.hidden = false;
}
window.addEventListener('faza-lang', function () { drawAvis(); drawPay(); });

/* anciennes adresses de l'accueil (faza3d.tn/#espace…) : vers les nouvelles pages */
(function () {
  if (!HOME) return; var h = location.hash, map = { '#espace': '/compte/', '#boutique': '/boutique/', '#tarifs': '/tarifs/', '#faq': '/faq/', '#process': '/#etapes' };
  for (var a in map) if (h.indexOf(a) === 0) { location.replace(map[a] + (a === '#espace' ? h.slice(a.length).replace(/^\?/, '#') : '')); return; }
})();
var yr = document.getElementById('year'); if (yr) yr.textContent = new Date().getFullYear();

applyConfig(); apply(); accountLabel(); season(); loadInfo();

/* petites illustrations (en attendant les photos des produits) */
var ART = {
  trophee: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 18h40l-4 30c-2 10-10 16-16 16s-14-6-16-16z" fill="#3BA4FF"/><path d="M30 24H20c0 10 5 16 12 17M70 24h10c0 10-5 16-12 17" stroke="#1557E0" stroke-width="4" fill="none"/><rect x="44" y="64" width="12" height="10" fill="#1557E0"/><rect x="30" y="74" width="40" height="10" rx="2" fill="#0E2A5A"/></svg>',
  plaque: '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="14" y="24" width="72" height="50" rx="4" fill="#BFE3FF" stroke="#3BA4FF" stroke-width="2"/><rect x="22" y="35" width="40" height="5" rx="2" fill="#1557E0"/><rect x="22" y="46" width="56" height="4" rx="2" fill="#1557E0" opacity=".6"/><rect x="22" y="56" width="30" height="4" rx="2" fill="#1557E0" opacity=".6"/><rect x="34" y="74" width="32" height="8" rx="2" fill="#0E2A5A"/></svg>',
  lampe: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 16c-18 0-28 14-28 30 0 12 8 20 14 26h28c6-6 14-14 14-26 0-16-10-30-28-30z" fill="#FFE3A8"/><circle cx="50" cy="42" r="12" fill="#F2B544" opacity=".55"/><rect x="34" y="72" width="32" height="10" rx="2" fill="#0E2A5A"/></svg>',
  medaille: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M34 12h12l8 26h-12zM66 12H54l-8 26h12z" fill="#1557E0"/><circle cx="50" cy="60" r="24" fill="#E8B23A"/><circle cx="50" cy="60" r="16" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/><path d="m50 50 3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" fill="#fff"/></svg>',
  porte: '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="22" r="9" fill="none" stroke="#8796AF" stroke-width="4"/><rect x="28" y="32" width="44" height="52" rx="10" fill="#1557E0"/><circle cx="50" cy="48" r="7" fill="#BFE3FF"/><rect x="38" y="62" width="24" height="4" rx="2" fill="#BFE3FF"/><rect x="38" y="70" width="24" height="4" rx="2" fill="#BFE3FF" opacity=".7"/></svg>',
  piece: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M20 70V38l30-18 30 18v32L50 86z" fill="#3BA4FF"/><path d="M20 38l30 18 30-18M50 56v30" stroke="#0E2A5A" stroke-width="2" fill="none"/></svg>'
};
function artFor(name) { var n = String(name || '').toLowerCase(); return /troph|coupe/.test(n) ? 'trophee' : /m[ée]dail/.test(n) ? 'medaille' : /lamp|litho/.test(n) ? 'lampe' : /porte|cl[ée]s|goodies/.test(n) ? 'porte' : /plaque|grav|plexi|laser/.test(n) ? 'plaque' : 'piece'; }
document.querySelectorAll('[data-art]').forEach(function (el) { el.innerHTML = ART[el.dataset.art] || ART.piece; });

/* code de parrainage : vérifié en direct (devis et panier) */
function refCheck(e) {
  var i = e.target; if (!i || i.name !== 'ref' || !i.value.trim() || !API) return; if (e.type === 'input' && i.value.trim().length < 9) return;
  var v = i.value.trim().toUpperCase(); i.value = v;
  fetch(API + '/api/public/parrain/' + encodeURIComponent(v), { headers: { 'X-Faza': '1' } }).then(function (r) { return r.json(); }).then(function (j) {
    var ko = tr('ref_ko', 'Code inconnu (vérifiez les 6 caractères).'); i.setCustomValidity(j.ok ? '' : ko); i.title = j.ok ? tr('ref_ok', 'Code valide : parrainé par ') + j.prenom : ko; i.style.borderColor = j.ok ? 'var(--ok)' : 'var(--err)';
  }).catch(function () {});
}
document.addEventListener('change', refCheck); document.addEventListener('input', refCheck);
