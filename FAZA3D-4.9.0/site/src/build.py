#!/usr/bin/env python3
"""Génère le site client FAZA 3D (dossier site/public/) : une page HTML par adresse, en-tête / menu ☰ / pied communs.
Lancer après toute modification :  python3 site/src/build.py
Les textes ont une clé (data-t) : le français est dans la page, l'arabe va dans public/assets/ar.js.
Les clés de l'ancienne page (h_title, s1t, q1…) restent modifiables depuis la plateforme (Paramètres › Site)."""
import json, os, re, shutil, html


def q(v):
    return str(v).replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')

V = '4.9.0'
SRC = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(SRC), 'public')
LEG = json.load(open(os.path.join(SRC, 'legacy', 'ar.json'), encoding='utf-8'))
AR = dict(LEG['ar'])
SITE = 'https://faza3d.tn'


def t(key, fr, ar=None, tag='span', attrs=''):
    """Texte traduisible. ar=None : traduction déjà connue (clé de l'ancienne page)."""
    if ar is not None:
        AR[key] = ar
    elif key not in AR:
        raise SystemExit('traduction arabe manquante : ' + key)
    a = (' ' + attrs) if attrs else ''
    return f'<{tag} data-t="{key}"{a}>{fr}</{tag}>'


def tx(key, fr, ar=None):
    """Clé traduite sans balise (pour l'insérer dans une balise existante via data-t)."""
    if ar is not None:
        AR[key] = ar
    return fr


def ph(key, fr, ar):
    AR['@p' + key] = ar
    return f'placeholder="{q(fr)}" data-tp="{key}"'


I = {  # icônes (traits 1.8)
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    'cart': '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
    'moon': '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    'x': '<path d="M6 6l12 12M18 6 6 18"/>',
    'pin': '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    'check': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    'phone': '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    'shop': '<path d="M4 9h16l-1 11H5zM8 9V7a4 4 0 0 1 8 0v2"/>',
    'troph': '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4c0 3 1.5 5 4 5M17 6h3c0 3-1.5 5-4 5M12 14v4M8 21h8l-1-3H9z"/>',
    'laser': '<path d="M4 20 20 4M9 9l6 6"/><circle cx="18" cy="6" r="2"/>',
    'cube': '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
    'gift': '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7S11 2 8 2s-3 5 4 5M12 7s1-5 4-5 3 5-4 5"/>',
    'pro': '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>',
    'img': '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5L5 20"/>',
    'tag': '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="8" cy="8" r="1.5"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    'help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.5"/>',
    'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    'edit': '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
}
WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'


def ic(name, extra=''):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{extra}>{I[name]}</svg>'


NAV = [  # (adresse, clé, français, arabe, icône)
    ('/boutique/', 'nav_shop', 'Boutique', 'المتجر', 'shop'),
    ('/trophees-medailles/', 'nav_troph', 'Trophées et médailles', 'كؤوس وميداليات', 'troph'),
    ('/gravure-laser/', 'nav_laser', 'Gravure laser', 'نقش بالليزر', 'laser'),
    ('/impression-3d/', 'nav_3d', 'Impression 3D', 'طباعة ثلاثية الأبعاد', 'cube'),
    ('/cadeaux-personnalises/', 'nav_cadeaux', 'Cadeaux personnalisés', 'هدايا مخصصة', 'gift'),
    ('/entreprises-ecoles/', 'nav_pro', 'Entreprises et écoles', 'الشركات والمدارس', 'pro'),
]
NAV2 = [
    ('/realisations/', 'nav_real', 'Réalisations', 'إنجازاتنا', 'img'),
    ('/tarifs/', 'nav_tarifs', 'Tarifs', 'الأسعار', 'tag'),
    ('/a-propos/', 'nav_about', 'L’atelier', 'الورشة', 'info'),
    ('/faq/', 'nav_faq', 'Questions fréquentes', 'أسئلة شائعة', 'help'),
    ('/contact/', 'nav_contact', 'Contact', 'اتصل بنا', 'mail'),
]


for _h, _k, _fr, _ar, _i in NAV + NAV2:
    AR.setdefault(_k, _ar)


def header():
    short = {'nav_troph': ('nav_troph_s', 'Trophées', 'كؤوس'), 'nav_cadeaux': ('nav_cad_s', 'Cadeaux', 'هدايا'), 'nav_pro': ('nav_pro_s', 'Entreprises', 'الشركات')}
    top = []
    for href, k, fr, ar, _ in NAV:
        if k == 'nav_cadeaux':
            continue  # en-tête : 5 liens (tous dans le menu ☰)
        kk, ff, aa = short.get(k, (k, fr, ar))
        top.append(f'<li><a href="{href}">{t(kk, ff, aa)}</a></li>')
    return f'''<a class="hp" href="#main">Aller au contenu</a>
<header class="hdr">
  <div class="wrap">
    <button class="ib" id="menuBtn" type="button" aria-controls="drawer" aria-expanded="false" aria-label="Menu">{ic('menu')}</button>
    <a class="brand" href="/"><img src="/icon-192.png" alt="" width="36" height="36">FAZA 3D</a>
    <ul class="mainnav">{''.join(top)}</ul>
    <span class="spacer"></span>
    <span class="langsw"><button type="button" data-lang="fr" aria-pressed="true">FR</button><button type="button" data-lang="ar">عربي</button></span>
    <a class="ib acc" href="/compte/" aria-label="Mon espace client">{ic('user')}<span data-acc-label>Mon espace</span></a>
    <a class="ib" href="/panier/" aria-label="Panier">{ic('cart')}<span class="n" data-cart-n hidden>0</span></a>
    <a class="btn primary small cta" href="/#devis">{t('cta', 'Devis gratuit')}</a>
  </div>
</header>
<div class="drawer" id="drawer" hidden>
  <div class="veil" data-close></div>
  <nav aria-label="Menu">
    <div class="dh"><a class="brand" href="/"><img src="/icon-192.png" alt="" width="32" height="32">FAZA 3D</a><button class="ib" type="button" data-close aria-label="Fermer">{ic('x')}</button></div>
    <h4>{t('dr_order', 'Commander', 'اطلب')}</h4>
    <ul>
      <li><a href="/boutique/">{ic('shop')}{t('nav_shop', 'Boutique')}</a></li>
      <li><a href="/trophees-medailles/#composer">{ic('edit')}{t('nav_compose', 'Composer mon trophée', 'صمّم الكأس متاعك')}</a></li>
      <li><a href="/panier/">{ic('cart')}{t('nav_cart', 'Panier', 'السلة')} <span class="small" data-cart-n hidden></span></a></li>
      <li><a href="/#devis">{ic('mail')}{t('nav_devis', 'Demander un devis', 'اطلب عرض سعر')}</a></li>
      <li><a href="/compte/">{ic('user')}{t('acc_label', 'Mon espace', 'حسابي')}</a></li>
    </ul>
    <h4>{t('dr_services', 'Nos services', 'خدماتنا')}</h4>
    <ul>{''.join(f'<li><a href="{h}">{ic(i)}{t(k, fr)}</a></li>' for h, k, fr, ar, i in NAV[1:])}</ul>
    <h4>{t('dr_atelier', 'L’atelier', 'الورشة')}</h4>
    <ul>{''.join(f'<li><a href="{h}">{ic(i)}{t(k, fr, ar)}</a></li>' for h, k, fr, ar, i in NAV2)}</ul>
    <div class="df">
      <a class="btn wa block" data-wa href="/contact/">{WA_SVG}{t('wa_write', 'Écrire sur WhatsApp', 'راسلنا على واتساب')}</a>
      <div class="row"><a href="tel:+21626435135" data-phone>+216 26 435 135</a><span class="langsw"><button type="button" data-lang="fr" aria-pressed="true">FR</button><button type="button" data-lang="ar">عربي</button></span></div>
      <div class="row"><span>{t('theme_dark', 'Mode sombre', 'الوضع الداكن')}</span><button class="ib" type="button" data-theme-btn aria-label="Mode sombre">{ic('moon')}</button></div>
    </div>
  </nav>
</div>'''


def footer():
    for h, k, fr, ar, i in NAV:
        AR.setdefault(k, ar)
    return f'''<footer class="foot">
  <div class="wrap">
    <div class="cols">
      <div>
        <a class="brand" href="/"><img src="/icon-192.png" alt="" width="36" height="36">FAZA 3D</a>
        <p>{t('d_addr_v', 'Charguia 2, Ariana 2035, Tunisie')}<br>{t('d_hours', 'Lundi à vendredi 9 h – 18 h, samedi 9 h – 13 h · retrait sur rendez-vous')}</p>
        <p style="margin-top:10px"><a href="tel:+21626435135" data-phone dir="ltr">+216 26 435 135</a><br><a href="mailto:contact@faza3d.tn" data-mail>contact@faza3d.tn</a></p>
      </div>
      <div><h4>{t('dr_services', 'Nos services')}</h4><ul>{''.join(f'<li><a href="{h}">{t(k, fr)}</a></li>' for h, k, fr, ar, i in NAV)}</ul></div>
      <div><h4>{t('dr_atelier', 'L’atelier')}</h4><ul>{''.join(f'<li><a href="{h}">{t(k, fr)}</a></li>' for h, k, fr, ar, i in NAV2)}</ul></div>
      <div><h4>{t('ft_follow', 'Suivez l’atelier', 'تابعونا')}</h4><ul><li><a data-social="ig" href="https://www.instagram.com/faza_3d/" target="_blank" rel="noopener">Instagram</a></li><li><a data-social="fb" href="https://www.facebook.com/profile.php?id=61596222977653" target="_blank" rel="noopener">Facebook</a></li><li><a data-social="tt" hidden href="#" target="_blank" rel="noopener">TikTok</a></li><li><a href="/compte/">{t('acc_label', 'Mon espace')}</a></li><li><a href="/panier/">{t('nav_cart', 'Panier')}</a></li></ul></div>
    </div>
    <div class="legal"><span>© <span id="year">2026</span> FAZA 3D · {t('ft1', 'Copy Store SARL · Charguia 2, Ariana')}</span><span>{t('ft2', 'Impression 3D · Découpe et gravure laser · Scan 3D')}</span></div>
  </div>
</footer>
<a class="wa-fab" data-wa href="/contact/" aria-label="WhatsApp">{WA_SVG}<span>WhatsApp</span></a>'''


FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap" rel="stylesheet">'
ICONS = '<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">'
THEME = "<script>try{var t=localStorage.getItem('faza_theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>"


def page(path, title, title_ar, desc, body, scripts=(), noindex=False, ld=None, head_extra='', og_desc=None):
    url = SITE + path
    robots = 'noindex,follow' if noindex else 'index,follow'
    ldj = f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>' if ld else ''
    js = ''.join(f'<script src="/assets/{s}?v={V}"></script>' for s in scripts)
    doc = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="faza-title-ar" content="{q(title_ar)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="{robots}">
<meta name="description" content="{q(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="{url}"><meta property="og:title" content="{q(title)}"><meta property="og:description" content="{q(og_desc or desc)}"><meta property="og:image" content="{SITE}/icon-512.png"><meta property="og:site_name" content="FAZA 3D"><meta property="og:locale" content="fr_TN">
<meta name="theme-color" content="#071226">
{ICONS}
{FONTS}
<link rel="stylesheet" href="/assets/site.css?v={V}">
{THEME}
{head_extra}{ldj}
</head>
<body>
{header()}
<main id="main">
{body}
</main>
{footer()}
<script src="/config.js"></script>
<script src="/assets/ar.js?v={V}"></script>
<script src="/assets/site.js?v={V}"></script>
{js}
</body>
</html>
'''
    write(path, doc)


def write(path, doc):
    f = os.path.join(OUT, path.strip('/'), 'index.html') if path.endswith('/') else os.path.join(OUT, path.strip('/'))
    os.makedirs(os.path.dirname(f), exist_ok=True)
    open(f, 'w', encoding='utf-8').write(doc)
    PAGES.append(path)


PAGES = []


def crumbs(key, fr, ar=None):
    return f'<ol class="crumbs"><li><a href="/">{t("cr_home", "Accueil", "الرئيسية")}</a></li><li>{t(key, fr, ar)}</li></ol>'


def phead(ck, cfr, car, h1k, h1, h1ar, leadk, lead, leadar, acts=''):
    return f'''<section class="phead"><div class="wrap">{crumbs(ck, cfr, car)}{t(h1k, h1, h1ar, 'h1')}{t(leadk, lead, leadar, 'p', 'class="lead"') if lead else ''}{f'<div class="acts">{acts}</div>' if acts else ''}</div></section>'''


def check_list(items):
    return '<ul>' + ''.join(f'<li>{ic("check")}{t(k, fr, ar)}</li>' for k, fr, ar in items) + '</ul>'


# ---------- blocs communs ----------
def devis_form(produit=''):
    dp = f' data-produit="{produit}"' if produit else ''
    return f'''<form class="form" id="devis"{dp}>
  {t('f_title', 'Demande de devis gratuit', None, 'h3')}
  <div class="fgrid">
    <label class="full"><span data-t="f_name">Votre nom</span><input id="f_name" name="name" required maxlength="80" autocomplete="name"></label>
    <label><span data-t="f_phone">Téléphone ou WhatsApp</span><input id="f_phone" name="phone" type="tel" maxlength="20" autocomplete="tel"></label>
    <label><span data-t="f_email">E-mail</span><input id="f_email" name="email" type="email" maxlength="120" autocomplete="email"></label>
    <label class="full"><span data-t="f_company">Entreprise, école ou club (facultatif)</span><input id="f_company" name="company" maxlength="80"></label>
    <label><span data-t="f_product">Produit souhaité</span><select id="f_product" name="product"></select></label>
    <label><span data-t="f_qty">Quantité</span><input id="f_qty" name="qty" maxlength="20" placeholder="30"></label>
    <label><span data-t="f_deadline">Pour quelle date ?</span><input id="f_deadline" name="deadline" type="date"></label>
    <label><span data-t="f_how">Comment nous avez-vous connus ?</span><select id="f_how" name="how"></select></label>
    <label class="full"><span data-t="f_details">Votre projet</span><textarea id="f_details" name="details" rows="4" maxlength="2000" {ph('fdet', 'Ex. : 25 trophées pour le tournoi de fin d’année, logo du club, noms des catégories…', 'مثال: 25 كأس لدورة آخر العام، شعار النادي، أسماء الأصناف…')}></textarea></label>
    <label class="full"><span data-t="f_link">Lien vers un fichier ou un exemple (facultatif)</span><input id="f_link" name="link" type="url" maxlength="300" placeholder="Google Drive, WeTransfer…"></label>
    <label class="full"><span data-t="b_ref">Code de parrainage (facultatif)</span><input id="f_ref" name="ref" maxlength="12" placeholder="FZ-XXXXXX" style="text-transform:uppercase"></label>
    <div class="hp" aria-hidden="true"><label>Site<input name="website" tabindex="-1" autocomplete="off"></label></div>
  </div>
  <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center"><button class="btn primary" id="send" type="submit">{t('f_send', 'Envoyer ma demande')}</button>{t('f_priv', 'Réponse sous 24 h. Vos coordonnées ne servent qu’à vous répondre.', None, 'span', 'class="small"')}</div>
  <div class="msg" id="msg" role="status"></div>
</form>'''


def contact_info():
    return f'''<div class="cinfo">
  <div><b>{t('d_wa', 'WhatsApp et téléphone')}</b><a class="v" href="tel:+21626435135" data-phone dir="ltr" style="color:inherit;text-decoration:none">+216 26 435 135</a><div style="margin-top:10px"><a class="btn wa small" data-wa href="/contact/">{WA_SVG}{t('d_wa_btn', 'Ouvrir WhatsApp')}</a></div></div>
  <div><b>{t('d_mail', 'E-mail')}</b><a class="v" data-mail href="mailto:contact@faza3d.tn" style="color:inherit;text-decoration:none">contact@faza3d.tn</a></div>
  <div><b>{t('d_addr', 'Atelier')}</b><span class="v">{t('d_addr_v', 'Charguia 2, Ariana 2035, Tunisie')}</span><div class="small" style="margin-top:4px">{t('d_hours', 'Lundi à vendredi 9 h – 18 h, samedi 9 h – 13 h · retrait sur rendez-vous')}</div><a class="more" style="display:inline-block;margin-top:8px" href="https://www.google.com/maps/search/?api=1&amp;query=FAZA+3D+Charguia+2+Ariana" target="_blank" rel="noopener">{t('d_map', 'Itinéraire Google Maps', 'الطريق على خرائط جوجل')}</a></div>
  <div><b>{t('d_social', 'Réseaux')}</b><div class="social"><a data-social="ig" href="https://www.instagram.com/faza_3d/" target="_blank" rel="noopener">Instagram</a><a data-social="fb" href="https://www.facebook.com/profile.php?id=61596222977653" target="_blank" rel="noopener">Facebook</a><a data-social="tt" hidden href="#" target="_blank" rel="noopener">TikTok</a></div></div>
</div>'''


ADD_DLG = f'''<dialog class="dlg" id="addDlg"><form id="addForm" method="dialog">
  <h3 id="addTitle"></h3>
  <div class="fgrid" style="margin-top:14px">
    <label class="full" id="addOptWrap"><span>{t('b_opt', 'Option')}</span><select name="option"></select></label>
    <label><span>{t('b_qty', 'Quantité')}</span><input name="qty" type="number" min="1" max="9999" value="1" required></label>
    <label><span>{t('b_total', 'Prix estimé')}</span><output id="addTotal" style="padding:10px 0;font-weight:800;font-size:18px;color:var(--ink)"></output></label>
    <label class="full"><span>{t('b_text', 'Texte à graver ou personnalisation (facultatif)')}</span><input name="texte" maxlength="200"></label>
  </div>
  <p class="small" style="margin-top:10px">{t('add_note', 'Prix estimé : l’atelier vous confirme le prix exact et la date avant de lancer la fabrication.', 'سعر تقريبي: الورشة تأكدلك السعر الدقيق والتاريخ قبل ما تبدا التصنيع.')}</p>
  <div class="acts"><button type="button" class="btn line" id="addCancel">{t('b_cancel', 'Annuler')}</button><button class="btn primary">{t('shop_add', 'Ajouter au panier', 'زيد للسلة')}</button></div>
</form></dialog>'''


def cta_band(k1, fr, ar, produit=''):
    q = f'?produit={produit}' if produit else ''
    return f'''<section class="sec tight alt"><div class="wrap" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">{t(k1, fr, ar, 'h2', 'style="font-size:clamp(22px,2.6vw,30px);max-width:30ch"')}<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn primary" href="/contact/{q}#devis">{t('nav_devis', 'Demander un devis')}</a><a class="btn wa" data-wa href="/contact/">{WA_SVG}WhatsApp</a></div></div></section>'''


ILLU = {  # illustrations des réalisations (remplacées par les photos publiées depuis la plateforme)
    'g1': 'trophee', 'g2': 'plaque', 'g3': 'lampe', 'g4': 'piece', 'g5': 'medaille', 'g6': 'porte', 'g7': 'piece', 'g8': 'piece'}


def gallery(n, big=False):
    tiles = ''.join(f'<figure class="tile"><span data-art="{ILLU[k]}"></span><figcaption data-t="{k}">{LEGFR[k]}</figcaption></figure>' for k in list(ILLU)[:n])
    return f'<div class="gallery{" big" if big else ""}" data-gallery="{24 if big else 8}">{tiles}</div>'


LEGFR = {'g1': 'Trophée hybride 3D + plexi', 'g2': 'Plaque gravée pour bureau', 'g3': 'Lampe lithophane photo', 'g4': 'Maquette d’architecture', 'g5': 'Médailles de club', 'g6': 'Porte-clés et goodies logo', 'g7': 'Modèle dentaire', 'g8': 'Boîtier prototype'}

LD_BUSINESS = {"@context": "https://schema.org", "@graph": [
    {"@type": ["LocalBusiness", "Organization"], "@id": SITE + "/#atelier", "name": "FAZA 3D", "url": SITE + "/",
     "description": "Atelier d'impression 3D, découpe et gravure laser et scan 3D à Tunis : trophées, plaques gravées, cadeaux personnalisés, maquettes et prototypes.",
     "areaServed": "Tunisie", "address": {"@type": "PostalAddress", "streetAddress": "50, rue de l'Artisanat, Charguia 2", "addressLocality": "Ariana", "postalCode": "2035", "addressCountry": "TN"},
     "logo": SITE + "/icon-512.png", "image": SITE + "/icon-512.png", "telephone": "+216 26 435 135", "email": "contact@faza3d.tn", "priceRange": "5 – 500 TND",
     "sameAs": ["https://www.instagram.com/faza_3d/", "https://www.facebook.com/profile.php?id=61596222977653"],
     "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "18:00"}, {"@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "13:00"}],
     "knowsLanguage": ["fr", "ar"],
     "makesOffer": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": n}} for n in ["Impression 3D", "Découpe et gravure laser", "Trophées et médailles personnalisés", "Plaques gravées", "Cadeaux personnalisés", "Scan 3D", "Maquettes et prototypes"]]},
    {"@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": "FAZA 3D", "inLanguage": ["fr", "ar"], "publisher": {"@id": SITE + "/#atelier"}}]}


def service_ld(name, path, desc):
    return {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "name": name, "description": desc, "provider": {"@id": SITE + "/#atelier"}, "areaServed": "Tunisie", "url": SITE + path},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"}, {"@type": "ListItem", "position": 2, "name": name, "item": SITE + path}]}]}


exec(open(os.path.join(SRC, 'pages.py'), encoding='utf-8').read())

# ---------- fichiers communs ----------
os.makedirs(os.path.join(OUT, 'assets'), exist_ok=True)
for f in ['site.css', 'site.js', 'boutique.js', 'panier.js', 'configurateur.js', 'devis.js', 'atelier3d.js']:
    shutil.copy(os.path.join(SRC, f), os.path.join(OUT, 'assets', f))
leg = os.path.join(SRC, 'legacy')
shutil.copy(os.path.join(leg, 'estimateur.js'), os.path.join(OUT, 'assets', 'estimateur.js'))
shutil.copy(os.path.join(leg, 'assistant.js'), os.path.join(OUT, 'assets', 'assistant.js'))
c = open(os.path.join(leg, 'compte.js'), encoding='utf-8').read()
c = c.replace("document.getElementById('eName').textContent=d.client.name||'';", "document.getElementById('eName').textContent=d.client.name||''; try{ localStorage.setItem('faza_client_name',d.client.name||''); }catch(e){} if(window.accountLabel) accountLabel();", 1)
c = c.replace("setSid(''); login.hidden=false; area.hidden=true; return; }", "setSid(''); try{ localStorage.removeItem('faza_client_name'); }catch(e){} if(window.accountLabel) accountLabel(); login.hidden=false; area.hidden=true; return; }", 1)
assert 'faza_client_name' in c
open(os.path.join(OUT, 'assets', 'compte.js'), 'w', encoding='utf-8').write(c)
open(os.path.join(OUT, 'assets', 'ar.js'), 'w', encoding='utf-8').write(
    '/* Traductions arabes du site (générées par src/build.py) */\nwindow.FAZA_AR=' + json.dumps({'t': AR, 'PRODUCTS': LEG['PRODUCTS'], 'HOWS': LEG['HOWS']}, ensure_ascii=False) + ';\n')

# plan du site
urls = [p for p in PAGES if p not in ('/panier/', '/compte/', '/404.html')]
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
for p in urls:
    if p == '/':
        for loc in ('/', '/ar/'):
            sm.append(f'  <url><loc>{SITE}{loc}</loc><xhtml:link rel="alternate" hreflang="fr" href="{SITE}/"/><xhtml:link rel="alternate" hreflang="ar" href="{SITE}/ar/"/><xhtml:link rel="alternate" hreflang="x-default" href="{SITE}/"/><priority>1.0</priority></url>')
    else:
        sm.append(f'  <url><loc>{SITE}{p}</loc><priority>0.8</priority></url>')
sm.append('</urlset>')
open(os.path.join(OUT, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(sm) + '\n')
print(len(PAGES), 'pages,', len(AR), 'traductions')
