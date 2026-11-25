# Contenu des pages (exécuté par build.py). Chaque texte : clé, français, arabe.
# 4.10 : 6 pages publiques (Accueil, Boutique, Services, Entreprises, L'atelier, Contact) + Panier et Mon espace.

AR.update({
    'cart_added': 'تزاد للسلة', 'cart_see': 'شوف السلة', 'shop_delai': 'الأجل', 'shop_from': 'ابتداءً من', 'shop_quote': 'حسب الطلب',
    'shop_compose': 'صمّم متاعك', 'shop_none': 'ما فماش منتجات في الصنف هذا توّا.', 'cart_qty': 'الكمية', 'cart_rm': 'نحّي',
    'co_need': 'اكتب رقم هاتف ولا بريد إلكتروني باش نأكدولك الطلبية.', 'co_need2': 'أدخل رقم هاتف أو بريداً إلكترونياً حتى نرد عليك.',
    'co_wa': 'الطلب على الخط ما يجاوبش توّا. ابعثو على واتساب بنقرة:', 'co_err': 'تعذر الإرسال. كلمنا على ',
    'cfg_aria': 'معاينة الكأس', 'cfg_each': 'للقطعة', 'cfg_qty_disc': 'من', 'cfg_pcs': 'قطعة',
    'f_ok': 'شكراً، تم استلام طلبك. سنرد عليك خلال 24 ساعة.', 'f_wa': 'أرسلوا طلبكم على واتساب بنقرة واحدة:', 'f_err': 'تعذر الإرسال. راسلونا على: ',
    'ref_ko': 'رمز غير معروف (تثبّت من 6 أحرف).', 'ref_ok': 'الرمز صحيح : أحالك ', 'nav_devis': 'اطلب عرض سعر', 'acc_label': 'حسابي', 'nav_compose': 'صمّم الكأس متاعك', 'nav_troph': 'كؤوس وميداليات', 'nav_laser': 'نقش وقص بالليزر', 'nav_3d': 'طباعة ثلاثية الأبعاد', 'nav_cadeaux': 'هدايا مخصصة', 'nav_cart': 'السلة', 'nav_tarifs': 'الأسعار', 'shop_add': 'زيد للسلة', 'from': 'من',
    'h3_print': 'طباعة ثلاثية الأبعاد جارية', 'h3_laser': 'نقش البلكسي بالليزر', 'h3_done': 'مراقبة الجودة: مقبول', 'h3_matF': 'PLA حريري أزرق ورمادي', 'h3_plexi': 'بلكسي 3 مم', 'h3_power': 'القوة 60%', 'h3_prog': 'التقدم',
})
ARROW = ic('arrow')

# ================= ACCUEIL =================
scene = open(os.path.join(SRC, 'legacy', 'hero-scene.html'), encoding='utf-8').read()
PRODS3D = [  # vitrine 3D de l'accueil : (clé, nom, technique, délai, prix) en français puis en arabe, lien
    ('medaille', ('Médaille personnalisée', 'Impression 3D, ruban aux couleurs du club', '4 à 7 jours', 'Sur devis'),
     ('ميدالية مخصصة', 'طباعة ثلاثية الأبعاد، شريط بألوان النادي', '4 إلى 7 أيام', 'حسب الطلب'), '/boutique/'),
    ('plaque', ('Plaque gravée en plexiglas', 'Gravure laser, socle en bois', '2 à 3 jours', 'dès 25 TND'),
     ('لوحة بلكسي منقوشة', 'نقش بالليزر، قاعدة خشب', '2 إلى 3 أيام', 'من 25 د'), '/boutique/'),
    ('lampe', ('Lampe avec votre photo', 'Lithophane imprimée en 3D, socle lumineux', '3 à 4 jours', 'dès 55 TND'),
     ('مصباح بصورتك', 'ليثوفان مطبوع ثلاثي الأبعاد، قاعدة مضيئة', '3 إلى 4 أيام', 'من 55 د'), '/boutique/'),
    ('trophee', ('Trophée hybride 25 cm', 'Socle imprimé en 3D, plaque plexi gravée', '4 à 7 jours', 'dès 60 TND'),
     ('كأس هجين 25 سم', 'قاعدة مطبوعة، لوحة بلكسي منقوشة', '4 إلى 7 أيام', 'من 60 د'), '/boutique/'),
]
H3D_TXT = [('e1', 'CHAMPION', 'البطل'), ('e2', 'Saison 2026', 'موسم 2026'), ('e3', 'MERCI', 'شكراً'), ('e4', 'Partenaire 2026', 'شريك 2026')]
for k, fr, ar, link in PRODS3D:
    for i, f in enumerate(['n', 't', 'd', 'p']):
        H3D_TXT.append((k + '_' + f, fr[i], ar[i]))
HERO = os.environ.get('HERO', 'logo')   # logo : le F imprimé ; vitrine : les 4 produits
hidden_txt = ''.join(t('h3d_' + k, fr, ar, 'span', f'id="h3d_{k}" hidden') for k, fr, ar in H3D_TXT)

PATHS = [
    ('pa1b2', 'Particuliers', 'للأفراد', 'pa1t', 'Un cadeau, une pièce, une idée', 'هدية، قطعة ولا فكرة',
     [('pa1a', 'Lampe avec votre photo', 'مصباح بصورتك'), ('pa1b', 'Porte-clés, plaques prénom', 'ميداليات، لوحات بالاسم'), ('pa1c', 'Pièce de rechange introuvable', 'قطعة غيار ما تتلقاش')],
     '5 TND', '/boutique/', 'pa1g', 'Voir la boutique', 'شوف المتجر'),
    ('pa2b2', 'Écoles, clubs et entreprises', 'المدارس، النوادي والشركات', 'pa2t', 'Trophées et cadeaux en série', 'كؤوس وهدايا بالجملة',
     [('pa2a', 'Trophées et médailles de fin d’année', 'كؤوس وميداليات آخر العام'), ('pa2b', 'Cadeaux clients gravés au logo', 'هدايا للحرفاء منقوشة بالشعار'), ('pa2c', 'Facture avec TVA, prix dégressifs', 'فاتورة بالأداء، أسعار تنازلية')],
     '60 TND', '/entreprises/', 'pa2g', 'Commandes en série', 'الطلبيات بالجملة'),
    ('pa3b2', 'Projets sur mesure', 'مشاريع حسب الطلب', 'pa3t', 'Prototypes, maquettes, fichiers 3D', 'نماذج أولية، مجسمات، ملفات 3D',
     [('pa3a', 'Votre fichier STL estimé en 10 s', 'ملف STL متاعك يتقدّر في 10 ثواني'), ('pa3b', 'Conception à partir d’un croquis', 'تصميم من رسم'), ('pa3c', 'Scan 3D et reproduction', 'مسح ثلاثي الأبعاد واستنساخ')],
     '', '/services/', 'pa3g', 'Estimer mon fichier', 'قدّر الملف متاعي'),
]
paths_html = ''.join(f'''<a class="path" href="{href}">
  {t(k, who, whoar, 'h3')}
  <ul>{''.join(f'<li>{t(a, b, c)}</li>' for a, b, c in items)}</ul>
  <div class="pfoot"><span class="pr">{(t('from', 'dès', 'من') + '<b>' + price + '</b>') if price else t('pa3p', 'devis sous 24 h', 'عرض سعر في 24 ساعة')}</span><span class="go">{t(kg, go, goar)}{ARROW}</span></div>
</a>''' for k, who, whoar, kt, title, titlear, items, price, href, kg, go, goar in PATHS)

# fiches techniques des quatre services (accueil + page Services)
SHEETS = {
    'trophees': [('sh_mat', 'Matières', 'المواد', 'sh_t_mat', 'PLA soie (or, argent, bronze, couleurs) + plexiglas gravé', 'PLA حريري (ذهبي، فضي، برونزي، ألوان) + بلكسي منقوش'),
                 ('sh_size', 'Hauteurs', 'الأطوال', 'sh_t_size', '20, 25 ou 30 cm, autres sur demande', '20، 25 ولا 30 سم، وغيرها حسب الطلب'),
                 ('sh_qty', 'Quantités', 'الكميات', 'sh_t_qty', 'Dès 1 pièce, −10 % dès 10, −15 % dès 30', 'من قطعة، −10% من 10، −15% من 30'),
                 ('sh_delay', 'Délai', 'الأجل', 'sh_t_delay', '4 à 7 jours', '4 إلى 7 أيام')],
    'laser': [('sh_mat', 'Matières', 'المواد', 'sh_l_mat', 'Plexiglas, MDF, contreplaqué, bois, cuir, carton', 'بلكسي، MDF، خشب معاكس، خشب، جلد، كرتون'),
              ('sh_files', 'Fichiers', 'الملفات', 'sh_l_files', 'SVG, DXF, AI, PDF ou simple logo PNG', 'SVG، DXF، AI، PDF ولا شعار PNG'),
              ('sh_use', 'Usages', 'الاستعمالات', 'sh_l_use', 'Plaques, signalétique, menus, présentoirs, décoration', 'لوحات، لافتات، قوائم، حوامل عرض، ديكور'),
              ('sh_delay', 'Délai', 'الأجل', 'sh_l_delay', '2 à 3 jours', '2 إلى 3 أيام')],
    'impression': [('sh_mach', 'Machines', 'الآلات', 'sh_i_mach', 'Bambu Lab P1S', 'Bambu Lab P1S'),
                   ('sh_vol', 'Volume max.', 'الحجم الأقصى', 'sh_i_vol', '256 × 256 × 256 mm par pièce (plus grand : en plusieurs parties)', '256 × 256 × 256 مم للقطعة (الأكبر: على أجزاء)'),
                   ('sh_mat', 'Matières', 'المواد', 'sh_i_mat', 'PLA, PETG, ABS', 'PLA، PETG، ABS'),
                   ('sh_layer', 'Couches', 'الطبقات', 'sh_i_layer', '0,08 à 0,28 mm', '0.08 إلى 0.28 مم'),
                   ('sh_files', 'Fichiers', 'الملفات', 'sh_i_files', 'STL, 3MF, OBJ, STEP', 'STL، 3MF، OBJ، STEP')],
    'cadeaux': [('sh_prod', 'Produits', 'المنتجات', 'sh_c_prod', 'Lampes photo, porte-clés, plaques prénom, coffrets gravés', 'مصابيح بالصور، ميداليات، لوحات بالاسم، علب منقوشة'),
                ('sh_perso', 'Personnalisation', 'التخصيص', 'sh_c_perso', 'Photo, prénom, date, logo', 'صورة، اسم، تاريخ، شعار'),
                ('sh_delay', 'Délai', 'الأجل', 'sh_c_delay', '2 à 4 jours', '2 إلى 4 أيام')],
}
PRICE = {'trophees': ('sh_t_p', 'dès 60 TND le trophée 25 cm', 'من 60 د الكأس 25 سم'), 'laser': ('sh_l_p', 'dès 25 TND la plaque A4', 'من 25 د اللوحة A4'),
         'impression': ('sh_i_p', 'dès 5 TND la pièce', 'من 5 د القطعة'), 'cadeaux': ('sh_c_p', 'dès 5 TND le porte-clés, 55 TND la lampe', 'من 5 د الميدالية، 55 د المصباح')}


def sheet(sv):
    rows = ''.join(f'<dt>{t(a, b, c)}</dt><dd>{t(d, e, f)}</dd>' for a, b, c, d, e, f in SHEETS[sv])
    pk, pfr, par = PRICE[sv]
    return f'<dl class="sheet">{rows}<dt>{t("sh_price", "Prix", "السعر")}</dt><dd class="p">{t(pk, pfr, par)}</dd></dl>'


SV = [('trophees', 'nav_troph', 'Trophées et médailles', 'sv_tr_p', 'Trophées hybrides imprimés en 3D avec plaque en plexiglas gravée, médailles et plaques de diplômes. Votre logo, vos couleurs, un nom différent sur chaque pièce.', 'كؤوس هجينة مطبوعة ثلاثية الأبعاد بلوحة بلكسي منقوشة، ميداليات ولوحات تخرج. شعارك، ألوانك، واسم مختلف على كل قطعة.'),
      ('laser', 'nav_laser', 'Gravure et découpe laser', 'sv_la_p', 'Plaques gravées, signalétique, menus et présentoirs en plexiglas ou en bois, à partir de votre logo ou d’un simple croquis.', 'لوحات منقوشة، لافتات، قوائم وحوامل عرض من البلكسي ولا الخشب، من الشعار متاعك ولا من رسم بسيط.'),
      ('impression', 'nav_3d', 'Impression 3D', 'sv_im_p', 'Pièces techniques et de rechange, maquettes, prototypes et objets déco. Sans peinture : la couleur vient de la matière.', 'قطع تقنية وقطع غيار، مجسمات، نماذج أولية وديكور. بلاش دهن: اللون جاي من المادة.'),
      ('cadeaux', 'nav_cadeaux', 'Cadeaux personnalisés', 'sv_ca_p', 'Un objet unique avec une photo, un prénom ou un logo, pour un anniversaire, un mariage, l’Aïd ou vos clients.', 'هدية فريدة بصورة، اسم ولا شعار، لعيد ميلاد، عرس، العيد ولا لحرفائك.')]
SHORTP = {'trophees': '60', 'laser': '25', 'impression': '5', 'cadeaux': '5'}
tabs = ''.join(f'<button role="tab" id="tab-{sv}" aria-controls="pan-{sv}" aria-selected="{"true" if i == 0 else "false"}" tabindex="{0 if i == 0 else -1}">{t(k, fr)}<small>{t("from", "dès")} {SHORTP[sv]} TND</small></button>' for i, (sv, k, fr, pk, pfr, par) in enumerate(SV))
panels = ''.join(f'''<div role="tabpanel" id="pan-{sv}" aria-labelledby="tab-{sv}"{"" if i == 0 else " hidden"}>
  {t(pk, pfr, par, 'p')}
  {sheet(sv)}
  <div class="acts"><a class="btn primary" href="/services/#{sv}">{t('sv_more', 'Tout sur ce service', 'كل شي على الخدمة هذي')}</a><a class="btn line" href="/contact/#devis">{t('nav_devis', 'Demander un devis')}</a></div>
</div>''' for i, (sv, k, fr, pk, pfr, par) in enumerate(SV))

STEPS = [('p1', 'Vous décrivez le projet', 'p1p', 'Par le formulaire, WhatsApp ou à l’atelier : une photo, un croquis, un fichier ou juste une idée.', 'p1s', '5 minutes'),
         ('p2', 'Nous chiffrons', 'p2p', 'Devis détaillé avec prix, délai et aperçu. Vous l’acceptez en ligne, en un clic.', 'p2s', 'Sous 24 h'),
         ('p3', 'Conception et validation', 'p3p', 'Nous préparons le modèle 3D ou le fichier de gravure et vous l’envoyons pour accord avant de lancer.', 'p3s', '1 à 2 jours'),
         ('p4', 'Fabrication et livraison', 'p4p', 'Impression, découpe, finition et contrôle qualité. Vous suivez l’avancement par un lien, puis retrait à l’atelier ou livraison.', 'p4s', '2 à 7 jours selon la quantité')]
steps_html = ''.join(f'<div class="step">{t(a, b, None, "b")}{t(c, d)}{t(e, f, None, "small")}</div>' for a, b, c, d, e, f in STEPS)

HUD_CARD = f'''  <div class="hud pcard">
    <div class="ph"><span id="pcIdx">1 / 4</span><span class="pnav"><button type="button" id="pcPrev" aria-label="Produit précédent">‹</button><button type="button" id="pcNext" aria-label="Produit suivant">›</button></span></div>
    <b class="pname" id="pcName">Médaille personnalisée</b>
    <div class="row"><span>{t('pc_t', 'Fabrication', 'التصنيع')}</span><b id="pcTech"></b></div>
    <div class="row"><span>{t('pc_d', 'Délai', 'الأجل')}</span><b id="pcDelay"></b></div>
    <div class="row"><span>{t('pc_p', 'Prix', 'السعر')}</span><b id="pcPrice" class="gold"></b></div>
    <a class="plink" id="pcLink" href="/boutique/">{t('pc_l', 'Voir le produit', 'شوف المنتج')}{ARROW}</a>
    <div class="bar"><i id="pcBar"></i></div>
  </div></div>'''
HUD_PRINT = f'''  <div class="hud" aria-hidden="true">
    <div class="ph"><i></i><span id="hudPhase">Impression 3D en cours</span></div>
    <div class="row"><span>{t('h3_mat', 'Matière', 'المادة')}</span><b id="hudMat">PLA soie bleu et gris</b></div>
    <div class="row"><span>{t('h3_layer', 'Couche', 'الطبقة')}</span><b id="hudLayer">1 / 154</b></div>
    <div class="row"><span>{t('h3_temp', 'Buse · plateau', 'الفوهة · الصفيحة')}</span><b id="hudTemp">220 °C · 55 °C</b></div>
    <div class="bar"><i id="hudBar"></i></div>
  </div></div>'''
HUD = HUD_PRINT if HERO == 'logo' else HUD_CARD


SVCARD_TXT = {'trophees': ('svc_tr', 'Trophées hybrides, médailles et plaques de diplômes, à votre nom et à vos couleurs.', 'كؤوس هجينة، ميداليات ولوحات تخرج، باسمك وبألوانك.'),
              'laser': ('svc_la', 'Plaques, signalétique, menus et décoration en plexiglas ou en bois.', 'لوحات، لافتات، قوائم وديكور من البلكسي ولا الخشب.'),
              'impression': ('svc_im', 'Pièces techniques, rechanges, maquettes et prototypes.', 'قطع تقنية، قطع غيار، مجسمات ونماذج أولية.'),
              'cadeaux': ('svc_ca', 'Lampes avec votre photo, porte-clés, plaques prénom, coffrets gravés.', 'مصابيح بصورتك، ميداليات، لوحات بالاسم، علب منقوشة.')}
SVCARDS = ''.join(f'<a class="svcard" href="/services/#{sv}"><span class="ico">{ic(icn)}</span>{t(k, fr, None, "h3")}{t(SVCARD_TXT[sv][0], SVCARD_TXT[sv][1], SVCARD_TXT[sv][2], "p")}<span class="pr">{t("from", "dès")} {SHORTP[sv]} TND</span></a>' for sv, k, fr, icn in [('trophees', 'nav_troph', 'Trophées et médailles', 'troph'), ('laser', 'nav_laser', 'Gravure et découpe laser', 'laser'), ('impression', 'nav_3d', 'Impression 3D', 'cube'), ('cadeaux', 'nav_cadeaux', 'Cadeaux personnalisés', 'gift')])


def devis_court(produit='Demande depuis le site'):
    return f'''<form class="form" id="devisForm">
  <div class="fgrid">
    <label><span data-t="f_name">Votre nom</span><input id="f_name" name="name" required maxlength="80" autocomplete="name"></label>
    <label><span data-t="f_phone">Téléphone ou WhatsApp</span><input id="f_phone" name="phone" type="tel" maxlength="20" autocomplete="tel" required></label>
    <label class="full"><span>{t('fs_msg', 'Votre demande', 'طلبك')}</span><textarea id="f_details" name="details" rows="4" maxlength="2000" {ph('fdet2', 'Ex. : 20 médailles pour un tournoi, avec le logo du club', 'مثال: 20 ميدالية لدورة، بشعار النادي')}></textarea></label>
    <input type="hidden" name="product" value="{produit}">
    <div class="hp" aria-hidden="true"><label>Site<input name="website" tabindex="-1" autocomplete="off"></label></div>
  </div>
  <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center"><button class="btn primary" id="send" type="submit">{t('f_send', 'Envoyer ma demande')}</button><span class="small">{t('fs_note', 'Réponse sous 24 h.', 'الجواب في 24 ساعة.')}</span></div>
  <div class="msg" id="msg" role="status"></div>
</form>'''


def contact_short():
    return f'''<div class="cinfo">
  <div><b>{t('d_wa', 'WhatsApp et téléphone')}</b><a class="v" href="tel:+21626435135" data-phone dir="ltr">+216 26 435 135</a><div style="margin-top:12px"><a class="btn wa small" data-wa href="/contact/">{WA_SVG}{t('d_wa_btn', 'Ouvrir WhatsApp')}</a></div></div>
  <div><b>{t('d_addr', 'Atelier')}</b><span class="v">{t('d_addr_v', 'Charguia 2, Ariana 2035, Tunisie')}</span><div class="small" style="margin-top:4px">{t('d_hours', 'Lundi à vendredi 9 h – 18 h, samedi 9 h – 13 h · retrait sur rendez-vous')}</div></div>
</div>'''


home = f'''
<section class="hero3d{' split' if VARIANT == 'b' else ''}" id="hero3d" data-mode="logo">
  <div class="stage"><canvas id="heroCanvas" aria-label="Logo FAZA 3D en relief, imprimé en 3D"></canvas>
  </div>
  {''.join(f'<span hidden id="pcl_{k}" data-href="{link}"></span>' for k, fr, ar, link in PRODS3D)}
  <div class="wrap">
    <div class="copy">
      <p class="where">{ic('pin')}{t('h_eye3', 'Charguia 2, Ariana', 'الشرقية 2، أريانة')}</p>
      {t('h_t3', 'Impression 3D et gravure laser', 'طباعة ثلاثية الأبعاد ونقش بالليزر', 'h1')}
      {t('h_lead3', 'Trophées, médailles, plaques gravées, cadeaux personnalisés et pièces sur mesure. Devis gratuit sous 24 h.', 'كؤوس، ميداليات، لوحات منقوشة، هدايا مخصصة وقطع حسب الطلب. عرض سعر مجاني في 24 ساعة.', 'p', 'class="lead"')}
      <div class="acts"><a class="btn primary" href="/boutique/">{t('hm_shop2', 'Voir la boutique', 'شوف المتجر')}</a><a class="btn line" href="#devis">{t('h_cta1', 'Demander un devis')}</a></div>
    </div>
  </div>
  {hidden_txt}
</section>

<section class="sec alt">
  <div class="wrap">
    <div class="sec-head"><div>{t('hm_pop', 'Produits populaires', 'منتجات مطلوبة', 'h2')}</div><a class="more" href="/boutique/">{t('hm_allshop', 'Toute la boutique', 'المتجر الكل')}{ARROW}</a></div>
    <div class="products" id="shopGrid" data-max="4"></div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head"><div>{t('p_title2', 'Comment ça marche', 'كيفاش تخدم', 'h2')}</div></div>
    <div class="steps">{steps_html}</div>
  </div>
</section>

<section class="sec avis-sec" id="avis" hidden>
  <div class="wrap">
    <div class="sec-head"><div>{t('av_title', 'Avis clients', 'آراء الحرفاء', 'h2')}</div><a class="more" id="avisAll" href="#" target="_blank" rel="noopener" hidden>{t('av_all', 'Tous les avis sur Google', 'الآراء الكل على جوجل')}{ARROW}</a></div>
    <div class="avis" id="avisGrid"></div>
    <p class="avis-act"><a class="btn line small" id="avisLeave" href="#" target="_blank" rel="noopener" hidden>{t('av_leave', 'Laisser un avis', 'اترك رأيك')}</a></p>
  </div>
</section>

<section class="sec alt big-cta" id="devis">
  <div class="wrap">
    <div class="contact">{{CONTACT}}{{FORM}}</div>
  </div>
</section>
{ADD_DLG}
{open(os.path.join(SRC, 'legacy', 'ai-box.html'), encoding='utf-8').read()}
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js"></script>'''
home = home.replace('{CONTACT}', contact_info()).replace('{FORM}', devis_form())
page('/', 'FAZA 3D · Impression 3D et découpe laser', 'FAZA 3D · طباعة ثلاثية الأبعاد وقص بالليزر',
     "FAZA 3D, atelier d'impression 3D, découpe et gravure laser et scan 3D à Tunis : trophées, plaques gravées, cadeaux personnalisés, maquettes et prototypes. Devis gratuit sous 24 h.",
     home, scripts=['hero3d-logo.js' if HERO == 'logo' else 'hero3d.js', 'assistant.js', 'boutique.js', 'devis.js'], ld=LD_BUSINESS,
     og_desc='Trophées, plaques gravées, cadeaux personnalisés, maquettes et prototypes. Devis gratuit sous 24 h.',
     head_extra='<link rel="alternate" hreflang="fr" href="https://faza3d.tn/"><link rel="alternate" hreflang="ar" href="https://faza3d.tn/ar/"><link rel="alternate" hreflang="x-default" href="https://faza3d.tn/">\n')

COLORS = [('or', 'Or', 'ذهبي', '#D9AC3F'), ('argent', 'Argent', 'فضي', '#C4CBD4'), ('bronze', 'Bronze', 'برونزي', '#B47442'), ('bleu', 'Bleu', 'أزرق', '#2B6CF0'), ('rouge', 'Rouge', 'أحمر', '#C93A3F'), ('noir', 'Noir', 'أسود', '#2B2F36'), ('blanc', 'Blanc', 'أبيض', '#F3F4F6')]


def radios(name, opts, checked):
    return '<div class="opts">' + ''.join(f'<label><input type="radio" name="{name}" value="{v}"{" checked" if v == checked else ""}>{sw}{t(k, fr, ar)}</label>' for v, k, fr, ar, sw in opts) + '</div>'


cfg = f'''<div class="plate cfg" id="composer">
    <div class="pv" id="cfgPv"></div>
    <form id="cfgForm">
      <fieldset><legend>{t('cfg_model', 'Modèle', 'الموديل')}</legend>{radios('modele', [('coupe', 'cm_coupe', 'Coupe', 'كأس', ''), ('etoile', 'cm_etoile', 'Étoile', 'نجمة', ''), ('plaque', 'cm_plaque', 'Plaque plexi', 'لوحة بلكسي', '')], 'coupe')}</fieldset>
      <fieldset><legend>{t('cfg_height', 'Hauteur', 'الطول')}</legend>{radios('hauteur', [('20', 'ch_20', '20 cm', '20 سم', ''), ('25', 'ch_25', '25 cm', '25 سم', ''), ('30', 'ch_30', '30 cm', '30 سم', '')], '25')}</fieldset>
      <fieldset><legend>{t('cfg_color', 'Couleur', 'اللون')}</legend>{radios('couleur', [(v, 'cc_' + v, fr, ar, f'<i class="sw" style="background:{c}"></i>') for v, fr, ar, c in COLORS], 'or')}</fieldset>
      <fieldset><legend>{t('cfg_base', 'Socle', 'القاعدة')}</legend>{radios('socle', [('noir', 'cs_noir', 'Noir', 'أسود', '<i class="sw" style="background:#1C1F25"></i>'), ('bois', 'cs_bois', 'Bois', 'خشب', '<i class="sw" style="background:#8B5B34"></i>'), ('blanc', 'cs_blanc', 'Blanc', 'أبيض', '<i class="sw" style="background:#E9EBEE"></i>')], 'noir')}</fieldset>
      <div class="two"><label class="fl">{t('cfg_l1', 'Texte gravé, ligne 1', 'النص المنقوش، السطر 1')}<input type="text" name="l1" maxlength="28" {ph('cl1', 'Champion 2026', 'بطل 2026')}></label><label class="fl">{t('cfg_l2', 'Ligne 2', 'السطر 2')}<input type="text" name="l2" maxlength="32" {ph('cl2', 'Tournoi de fin d’année', 'دورة آخر العام')}></label></div>
      <div class="two"><label class="fl">{t('b_qty', 'Quantité')}<input type="number" name="qty" min="1" max="9999" value="1"></label><span class="small" style="align-self:end;color:var(--night-mut)">{t('cfg_logo', 'Logo du club ou de l’école : envoyez-le après la commande, sur WhatsApp ou par e-mail.', 'شعار النادي ولا المدرسة: ابعثو بعد الطلبية على واتساب ولا بالبريد.')}</span></div>
      <div class="tot"><div><b id="cfgTotal"></b><small id="cfgUnit"></small></div><button class="btn primary">{t('shop_add', 'Ajouter au panier', 'زيد للسلة')}</button></div>
      <p class="small" style="color:var(--night-mut)">{t('cfg_note', 'Prix estimé TTC : confirmé par l’atelier avant fabrication. −10 % dès 10 pièces, −15 % dès 30.', 'سعر تقريبي بالأداء: تأكده الورشة قبل التصنيع. −10% من 10 قطع، −15% من 30.')}</p>
    </form>
  </div>'''


# ================= BOUTIQUE =================
FILTERS = [('all', 'fl_all', 'Tout', 'الكل'), ('trophees', 'fl_tr', 'Trophées', 'كؤوس'), ('gravure', 'fl_gr', 'Gravure', 'نقش'), ('cadeaux', 'fl_ca', 'Cadeaux', 'هدايا'), ('impression', 'fl_3d', 'Impression 3D', 'طباعة 3D')]
page('/boutique/', 'Boutique FAZA 3D · Trophées, plaques gravées et cadeaux à commander', 'متجر FAZA 3D · كؤوس، لوحات منقوشة وهدايا',
     'Commandez en ligne trophées, plaques gravées, lampes photo et porte-clés personnalisés, fabriqués à Tunis. Prix affichés, confirmation par l’atelier.',
     phead('nav_shop', 'Boutique', None, 'b_h1', 'Boutique', 'المتجر', 'b_lead2', 'Ajoutez vos produits au panier : l’atelier vous rappelle pour confirmer le prix et la date.', 'زيد المنتجات للسلة: الورشة تكلمك باش تأكد السعر والتاريخ.',
           f'<a class="btn primary" href="/panier/">{t("nav_cart", "Panier")}</a>') + f'''
<section class="sec"><div class="wrap">
  <div class="filters" role="group">{''.join(f'<button type="button" data-filter="{v}" aria-pressed="{"true" if v == "all" else "false"}">{t(k, fr, ar)}</button>' for v, k, fr, ar in FILTERS)}</div>
  <div class="products" id="shopGrid"></div>
  <p class="note" style="margin-top:28px">{t('shop_miss2', 'Vous ne trouvez pas votre produit ? Presque tout se fabrique sur mesure : <a href="/contact/#devis">demandez un devis</a>.', 'ما لقيتش المنتج متاعك؟ تقريباً كل شي يتصنع حسب الطلب: <a href="/contact/#devis">اطلب عرض سعر</a>.')}</p>
</div></section>
{ADD_DLG}''', scripts=['boutique.js'])

# ================= SERVICES (une page, quatre sections + configurateur + tarifs) =================
SVTXT = {
    'trophees': f'''{t('tp_h2', 'Pour quelles occasions ?', 'لأي مناسبات؟', 'h3')}
    {t('tp_p1', 'Tournois et championnats de clubs, fins d’année scolaire, remises de diplômes, concours internes d’entreprise, salons et événements. Chaque trophée porte le nom de la catégorie ou du gagnant.', 'دورات وبطولات النوادي، آخر السنة الدراسية، حفلات التخرج، مسابقات داخلية في الشركات، المعارض والتظاهرات. كل كأس عليه اسم الصنف ولا الفايز.', 'p')}
    {t('tp_h3a', 'Médailles', 'ميداليات', 'h3')}
    {t('tp_p2', 'Médailles imprimées en 3D aux couleurs du club ou gravées au laser, avec ruban. Idéales pour les séries de 20 à 500 pièces.', 'ميداليات مطبوعة بألوان النادي ولا منقوشة بالليزر، مع شريط. مناسبة للكميات من 20 حتى 500 قطعة.', 'p')}
    {t('tp_h3b', 'Plaques de diplômes et de remerciement', 'لوحات تخرج وشكر', 'h3')}
    {t('tp_p3', 'Plexiglas transparent, noir ou miroir, gravé avec le logo et le texte, livré avec support ou fixations murales.', 'بلكسي شفاف، أسود ولا مرآة، منقوش بالشعار والنص، مع حامل ولا تثبيت حائطي.', 'p')}''',
    'laser': f'''{t('gl_h2', 'Ce que nous réalisons', 'شنوّة نعملو', 'h3')}
    <ul>
      <li>{t('gl_l1', 'Plaques de bureau, de porte et de partenaires', 'لوحات مكتب، باب وشركاء')}</li>
      <li>{t('gl_l2', 'Signalétique et enseignes en plexiglas', 'لافتات ويافطات بلكسي')}</li>
      <li>{t('gl_l3', 'Menus, présentoirs, numéros de table, QR codes pour restaurants et commerces', 'قوائم، حوامل عرض، أرقام طاولات وQR للمطاعم والمحلات')}</li>
      <li>{t('gl_l4', 'Décorations de mariage, prénoms découpés, cake toppers', 'ديكور أعراس، أسماء مقصوصة، زينة الكعك')}</li>
      <li>{t('gl_l5', 'Coffrets et objets en bois gravés pour cadeaux d’entreprise', 'علب وأشياء خشبية منقوشة لهدايا الشركات')}</li>
      <li>{t('gl_l6', 'Gravure sur cuir : porte-cartes, étiquettes, porte-clés', 'نقش على الجلد: حاملات بطاقات، ملصقات، ميداليات مفاتيح')}</li>
    </ul>
    {t('gl_p1', 'Le métal ne se découpe pas au laser CO2 ; dans ce cas, nous vous proposons une alternative.', 'المعدن ما يتقصش بليزر CO2؛ في الحالة هذي نقترحولك بديل.', 'p')}''',
    'impression': f'''{t('i3_h2', 'Matières et finitions', 'المواد والتشطيب', 'h3')}
    <ul>
      <li>{t('i3_m1', '<b>PLA</b> : objets déco, maquettes, figurines. Nombreuses couleurs, aspect soie ou marbre.', '<b>PLA</b>: ديكور، مجسمات، تماثيل. ألوان برشا، شكل حريري ولا رخامي.')}</li>
      <li>{t('i3_m2', '<b>PETG</b> : pièces solides et résistantes à l’humidité, usage extérieur.', '<b>PETG</b>: قطع صلبة تقاوم الرطوبة، للاستعمال الخارجي.')}</li>
      <li>{t('i3_m3', '<b>ABS</b> : pièces techniques qui supportent la chaleur.', '<b>ABS</b>: قطع تقنية تتحمل الحرارة.')}</li>
    </ul>
    {t('i3_h3', 'Maquettes, prototypes, scan 3D', 'مجسمات، نماذج أولية، مسح ثلاثي الأبعاد', 'h3')}
    {t('i3_p2', 'Maquettes d’architecture, modèles pédagogiques et dentaires, boîtiers et prototypes. Une pièce cassée ou introuvable ? Apportez-la : nous la mesurons ou la scannons, puis nous la reproduisons.', 'مجسمات معمارية، نماذج تعليمية ونماذج أسنان، علب ونماذج أولية. قطعة مكسورة ولا ما تتلقاش؟ جيبها: نقيسوها ولا نمسحوها ونعاودو نصنعوها.', 'p')}
    <p><a class="more" href="#estimer">{t('i3_est', 'Estimer le prix de mon fichier', 'قدّر سعر الملف متاعي')}{ARROW}</a></p>''',
    'cadeaux': f'''{t('ca_h2', 'Idées selon l’occasion', 'أفكار حسب المناسبة', 'h3')}
    <ul>
      <li>{t('ca_o1p2', '<b>Anniversaire, fête des mères</b> : lampe avec une photo de famille, plaque prénom.', '<b>عيد ميلاد، عيد الأم</b>: مصباح بصورة العائلة، لوحة بالاسم.')}</li>
      <li>{t('ca_o2p2', '<b>Mariage</b> : prénoms découpés, cake toppers, cadeaux d’invités gravés à la date.', '<b>عرس</b>: أسماء مقصوصة، زينة الكعك، هدايا ضيوف منقوشة بالتاريخ.')}</li>
      <li>{t('ca_o3p2', '<b>Ramadan et Aïd</b> : décorations, coffrets et cadeaux personnalisés.', '<b>رمضان والعيد</b>: ديكور، علب وهدايا مخصصة.')}</li>
      <li>{t('ca_o4p2', '<b>Clients et équipes</b> : porte-clés au logo, coffrets bois gravés, objets de bureau.', '<b>الحرفاء والفريق</b>: ميداليات بالشعار، علب خشب منقوشة، أدوات مكتب.')}</li>
    </ul>
    <p><a class="more" href="/boutique/">{t('nav_shop', 'Boutique')}{ARROW}</a></p>''',
}
rows = [('t1', 't1s', '5 TND', 't1d'), ('t2', 't2s', '25 TND', 't2d'), ('t3', 't3s', '55 TND', 't3d'), ('t4', 't4s', '60 TND', 't4d'), ('t5', 't5s', None, 't5d'), ('t6', 't6s', None, 't6d')]
TFR = {'t1': 'Porte-clés ou goodies imprimés en 3D', 't1s': 'dégressif dès 20 pièces', 't1d': '2 à 3 jours', 't2': 'Plaque gravée en plexiglas (format A4)', 't2s': 'logo, texte, support au choix', 't2d': '2 à 3 jours', 't3': 'Lampe lithophane avec votre photo', 't3s': 'avec socle lumineux', 't3d': '3 à 4 jours', 't4': 'Trophée hybride 25 cm (3D + plexi gravé)', 't4s': 'dégressif dès 10 pièces', 't4d': '4 à 7 jours', 't5': 'Pièce technique ou pièce de rechange', 't5s': 'selon volume de matière et temps machine', 't5d': '2 à 5 jours', 't6': 'Maquette d’architecture ou prototype', 't6s': 'conception incluse', 't6d': '1 à 3 semaines'}
tb = ''.join(f'<tr><td>{t(a, TFR[a])}<small>{t(b, TFR[b])}</small></td><td class="p">{p if p else t(a + "p", "Sur devis")}</td><td>{t(d, TFR[d])}</td></tr>' for a, b, p, d in rows)

EST_HTML = f'''<div class="est" id="estimer" style="margin-top:64px">
    <div>
      <ul style="margin-top:0">
        <li><b>{t('es_k1', 'Fichiers', 'الملفات')}</b>{t('es_v1', 'STL, OBJ ou une image PNG / JPG', 'STL، OBJ ولا صورة PNG / JPG')}</li>
        <li><b>{t('es_k2', 'Résultat', 'النتيجة')}</b>{t('es_v2', 'Poids, durée, prix estimé', 'الوزن، المدة، السعر التقريبي')}</li>
        <li><b>{t('es_k3', 'Ensuite', 'من بعد')}</b>{t('es_v3', 'Un clic pour envoyer la demande avec le fichier', 'نقرة وحدة باش تبعث الطلب مع الملف')}</li>
      </ul>
      <div style="margin-top:22px">{t('es_send', 'Envoyer la demande avec l’estimation', 'ابعث الطلب مع التقدير', 'h3')}<div style="margin-top:12px">{devis_court('Pièce imprimée en 3D')}</div></div>
    </div>
    <div class="plate scene">
{scene}
    </div>
  </div>

'''
blocks = ''
for sv, k, fr, pk, pfr, par in SV:
    comp = ''
    if sv == 'impression':
        comp = EST_HTML
    if sv == 'trophees':
        comp = ('<div style="margin-top:72px">' + t('cfg_h2', 'Configurer un trophée', 'صمّم كأس', 'h2')
                + t('cfg_lead2', 'Choisissez le modèle, la couleur et le texte. Le prix s’affiche directement.', 'اختار الموديل واللون والنص. السعر يظهر مباشرة.', 'p', 'class="lead"')
                + cfg + '</div>')
    blocks += f'''<section class="svcblock" id="{sv}"><div class="wrap">
  <div class="split">
    <div class="prose">{t(k, fr, None, 'h2')}{t(pk, pfr, par, 'p', 'class="lead"')}{SVTXT[sv]}</div>
    <aside class="aside">{t('sh_title', 'Fiche technique', 'المواصفات', 'h3')}{sheet(sv)}<a class="btn primary block" href="/contact/#devis">{t('nav_devis', 'Demander un devis')}</a></aside>
  </div>
  {comp}
</div></section>'''
subnav = '<nav class="subnav" aria-label="Services"><div class="wrap">' + ''.join(f'<a href="#{sv}">{t(k, fr)}</a>' for sv, k, fr, *_ in SV) + f'<a href="#composer">{t("nav_compose", "Composer mon trophée")}</a><a href="#tarifs">{t("nav_tarifs", "Tarifs", "الأسعار")}</a></div></nav>'
EST_PAGE = EST_HTML.replace('<div class="est" id="estimer" style="margin-top:64px">', '<div class="est" id="estimer">')
services = phead('nav_est', 'Estimation 3D', None, 'es_h1', 'Estimer le prix d’un fichier 3D', 'قدّر سعر ملف 3D', 'es_lead1', 'Déposez votre fichier STL, une photo ou un logo : vous voyez l’aperçu en 3D, le poids, le temps d’impression et un prix estimé.', 'حط ملف STL، صورة ولا شعار: تشوف المعاينة 3D، الوزن، وقت الطباعة وسعر تقريبي.') + f'''
<section class="sec"><div class="wrap">{EST_PAGE}</div></section>'''
page('/services/', 'Estimation 3D · prix d’une impression 3D · FAZA 3D', 'تقدير سعر الطباعة ثلاثية الأبعاد · FAZA 3D',
     'Déposez votre fichier STL, une photo ou un logo et obtenez un aperçu 3D, le poids, le temps d’impression et un prix estimé. Atelier FAZA 3D, Charguia 2, Ariana.',
     services + '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js"></script>', scripts=['estimateur.js', 'devis.js'])

# ================= ENTREPRISES =================
PRO = [('pr_w1', 'Prix dégressifs', 'أسعار تنازلية', 'pr_w1p', 'Plus la série est grande, plus le prix unitaire baisse. Le devis détaille chaque palier.', 'كل ما الكمية تكبر، سعر القطعة ينقص. عرض السعر يفصّل كل مستوى.'),
       ('pr_w2', 'Facture avec TVA', 'فاتورة بالأداء', 'pr_w2p', 'Devis et factures au nom de votre société ou établissement, acceptés par les administrations.', 'عروض أسعار وفواتير باسم شركتك ولا مؤسستك، مقبولة في الإدارات.'),
       ('pr_w3', 'Bon à tirer avant production', 'موافقة قبل الإنتاج', 'pr_w3p', 'Vous validez l’aperçu (logo, couleurs, textes) avant le lancement de la série.', 'توافق على المعاينة (الشعار، الألوان، النصوص) قبل ما تبدا الكمية.'),
       ('pr_w4', 'Date tenue', 'التاريخ محترم', 'pr_w4p', 'Une date promise sur le devis et un lien de suivi pour voir l’avancement, étape par étape.', 'تاريخ مكتوب في عرض السعر ورابط متابعة تشوف بيه التقدم خطوة بخطوة.'),
       ('pr_w5', 'Noms et numéros variables', 'أسماء وأرقام مختلفة', 'pr_w5p', 'Un nom différent par trophée, badge ou plaque : envoyez simplement la liste.', 'اسم مختلف لكل كأس، شارة ولا لوحة: ابعث القائمة برك.'),
       ('pr_w6', 'Livraison dans toute la Tunisie', 'توصيل لكامل تونس', 'pr_w6p', 'Retrait à l’atelier dans le Grand Tunis ou envoi par transporteur.', 'استلام من الورشة في تونس الكبرى ولا إرسال بالناقل.')]
pro = phead('nav_pro', 'Entreprises et écoles', None, 'pr_h1b', 'Entreprises, écoles et clubs', 'الشركات والمدارس والنوادي', 'pr_lead2', 'Commandes en série de trophées, médailles, cadeaux et plaques, avec facture et prix dégressifs.', 'طلبيات بالجملة من كؤوس، ميداليات، هدايا ولوحات، بفاتورة وأسعار تنازلية.',
            f'<a class="btn primary" href="#devis">{t("pr_quote", "Demander un devis entreprise", "اطلب عرض سعر للشركة")}</a>') + f'''
<section class="sec"><div class="wrap">
  <div class="machines">{''.join(f'<div class="machine">{t(a, b, c, "h3")}{t(d, e, f, "p")}</div>' for a, b, c, d, e, f in PRO)}</div>
</div></section>
<section class="sec alt" id="devis"><div class="wrap split">
  <div class="prose">
    {t('pr_h2', 'Exemples de commandes', 'أمثلة طلبيات', 'h2')}
    <ul>
      <li>{t('pr_e1', 'Trophées et médailles de fin d’année pour une école ou un club', 'كؤوس وميداليات آخر العام لمدرسة ولا نادي')}</li>
      <li>{t('pr_e2', 'Cadeaux clients gravés au logo pour la fin d’année', 'هدايا للحرفاء منقوشة بالشعار لآخر العام')}</li>
      <li>{t('pr_e3', 'Plaques de bureau et signalétique pour de nouveaux locaux', 'لوحات مكاتب ولافتات للمقر الجديد')}</li>
      <li>{t('pr_e4', 'Présentoirs et PLV en plexiglas pour un salon', 'حوامل عرض بلكسي لمعرض')}</li>
      <li>{t('pr_e5', 'Maquettes pédagogiques et modèles pour l’enseignement', 'مجسمات تعليمية ونماذج للتدريس')}</li>
    </ul>
  </div>
  <div>{devis_form('Troph')}</div>
</div></section>'''
page('/entreprises/', 'Cadeaux d’entreprise, trophées et signalétique en série · FAZA 3D Tunis', 'هدايا الشركات وكؤوس ولافتات بالجملة · FAZA 3D',
     'Commandes en série pour entreprises, écoles et clubs en Tunisie : cadeaux clients gravés, trophées, médailles, plaques et signalétique. Prix dégressifs, facture avec TVA.',
     pro, scripts=['devis.js'], ld=service_ld('Commandes en série pour entreprises et écoles', '/entreprises/', 'Cadeaux d’entreprise, trophées, plaques et signalétique en série.'))

# ================= L'ATELIER =================
atelier = phead('nav_about', 'L’atelier', None, 'ab_h1b', 'L’atelier FAZA 3D', 'ورشة FAZA 3D', 'ab_lead2', 'Notre atelier se trouve à Charguia 2 (Ariana). Toutes les pièces y sont conçues et fabriquées.', 'الورشة متاعنا في الشرقية 2 (أريانة). كل القطع تتصمم وتتصنع غادي.') + f'''
<section class="sec" id="realisations"><div class="wrap">
  <div class="sec-head"><div>{t('r_h2', 'Nos réalisations', 'إنجازاتنا', 'h2')}</div></div>
  {gallery(8, True)}
</div></section>'''
page('/atelier/', 'L’atelier FAZA 3D · machines, réalisations et équipe à Charguia, Ariana', 'ورشة FAZA 3D · الشرقية، أريانة',
     'L’atelier FAZA 3D à Charguia 2, Ariana : imprimantes Bambu Lab P1S, découpe et gravure laser CO2, finitions à la main, réalisations et équipe.', atelier)

# ================= CONTACT (+ questions fréquentes) =================
QFR = {'q1': 'Je n’ai pas de fichier 3D, est-ce un problème ?', 'q1p': 'Non. Envoyez une photo, un croquis ou une description : nous concevons le modèle et vous l’envoyons pour validation avant fabrication. La conception est comptée dans le devis.',
       'q2': 'Quels formats de fichiers acceptez-vous ?', 'q2p': 'STL, 3MF, OBJ et STEP pour la 3D ; SVG, DXF, AI et PDF pour le laser ; PNG ou JPG en bonne qualité pour une gravure photo ou une lithophane.',
       'q3': 'Quel est le délai ?', 'q3p': 'Devis sous 24 h. Fabrication de 2 à 7 jours selon la quantité et la finition, plus longue pour les grandes séries et les maquettes. Nous vous donnons une date promise sur le devis et vous suivez l’avancement par un lien.',
       'q4': 'Comment payer ?', 'q4p': 'Acompte de 50 % à la commande, solde à la livraison. Espèces, virement, chèque ou D17. Facture avec TVA pour les entreprises et les administrations.',
       'q5': 'Livrez-vous ?', 'q5p': 'Retrait à l’atelier dans le Grand Tunis, livraison possible dans toute la Tunisie par transporteur (frais selon la destination).',
       'q6': 'Faites-vous des grandes séries ?', 'q6p': 'Oui : nos imprimantes tournent aussi la nuit et, avec le laser, nous produisons des séries de plusieurs centaines de pièces (trophées, médailles, goodies, plaques) avec un prix dégressif.'}
QNEW = {'q7': ('Comment fonctionne le panier ?', 'كيفاش تخدم السلة؟', 'Ajoutez vos produits, puis envoyez la commande avec votre nom et votre téléphone. Rien n’est payé en ligne : l’atelier vous rappelle pour confirmer le prix exact et la date, puis vous envoie un lien de suivi.', 'زيد المنتجات، ومن بعد ابعث الطلبية باسمك ونومرو تليفونك. ما تخلص شي على الخط: الورشة تكلمك باش تأكد السعر والتاريخ، ومن بعد تبعثلك رابط المتابعة.'),
        'q8': ('Comment créer mon espace client ?', 'كيفاش نعمل حسابي؟', 'Après votre premier devis ou votre première commande, vous recevez un lien de suivi. Ouvrez « Mon espace », collez ce lien, choisissez un mot de passe : vous y retrouvez commandes, devis et factures.', 'بعد أول عرض سعر ولا أول طلبية يوصلك رابط متابعة. حلّ «حسابي»، الصق الرابط واختار كلمة سر: تلقى فيه الطلبيات وعروض الأسعار والفواتير.'),
        'q9': ('Puis-je venir à l’atelier ?', 'نجم نجي للورشة؟', 'Oui, à Charguia 2 (Ariana), du lundi au vendredi de 9 h à 18 h et le samedi de 9 h à 13 h. Prévenez-nous sur WhatsApp pour que la bonne personne soit là.', 'إيه، في الشرقية 2 (أريانة)، من الإثنين للجمعة من 9 للـ 18 والسبت من 9 للـ 13. علّمنا على واتساب باش يكون الشخص المناسب موجود.')}


def qa(k):
    if k in QFR:
        return f'<details><summary>{t(k, QFR[k])}</summary>{t(k + "p", QFR[k + "p"], None, "p")}</details>'
    fr, ar, pfr, par = QNEW[k]
    return f'<details><summary>{t(k, fr, ar)}</summary>{t(k + "p", pfr, par, "p")}</details>'


GROUPS = [('fq_g1', 'Commander', 'الطلب', ['q1', 'q2', 'q7', 'q8']), ('fq_g2', 'Prix et paiement', 'الأسعار والخلاص', ['q4', 'q6']), ('fq_g3', 'Délais, livraison, visite', 'الآجال، التوصيل، الزيارة', ['q3', 'q5', 'q9'])]
faq_html = ''.join(t(g, fr, ar, 'h3') + ''.join(qa(k) for k in ks) for g, fr, ar, ks in GROUPS)
allq = [(QFR[k], QFR[k + 'p']) for k in ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']] + [(v[0], v[2]) for v in QNEW.values()]
contact = phead('nav_contact', 'Contact', None, 'ct_h1', 'Contactez-nous', 'اتصل بنا', 'ct_lead2', 'Téléphone, WhatsApp, e-mail ou visite à l’atelier. Réponse sous 24 h.', 'تليفون، واتساب، بريد ولا زيارة للورشة. الجواب في 24 ساعة.') + f'''
<section class="sec" id="devis"><div class="wrap"><div class="contact">{contact_info()}<div>{devis_form()}</div></div></div></section>
<section class="sec alt" id="faq"><div class="wrap">
  <div class="sec-head"><div>{t('q_title', 'Questions fréquentes', None, 'h2')}</div></div>
  <div class="faq">{faq_html}</div>
</div></section>'''
page('/contact/', 'Contact et devis · FAZA 3D, Charguia 2, Ariana', 'اتصل بنا · FAZA 3D',
     'Contactez l’atelier FAZA 3D à Charguia 2, Ariana : +216 26 435 135, WhatsApp, e-mail. Demande de devis gratuite, réponse sous 24 h, questions fréquentes.',
     contact, scripts=['devis.js'], ld={"@context": "https://schema.org", "@graph": [LD_BUSINESS["@graph"][0], {"@type": "FAQPage", "inLanguage": "fr", "mainEntity": [{"@type": "Question", "name": a, "acceptedAnswer": {"@type": "Answer", "text": b}} for a, b in allq]}]})

# ================= PANIER =================
page('/panier/', 'Panier · FAZA 3D', 'السلة · FAZA 3D', 'Votre panier FAZA 3D.', phead('nav_cart', 'Panier', None, 'cart_h1', 'Votre panier', 'السلة متاعك', '', '', '') + f'''
<section class="sec"><div class="wrap">
  <div id="cartDone" class="form empty" hidden>{t('co_done_t', 'Commande envoyée, merci !', 'تبعثت الطلبية، يعطيك الصحة!', 'h2')}{t('co_done', 'L’atelier vous appelle ou vous écrit sur WhatsApp pour confirmer le prix exact et la date. Vous recevrez ensuite un lien pour suivre la fabrication.', 'الورشة تكلمك ولا تبعثلك على واتساب باش تأكد السعر والتاريخ. من بعد يوصلك رابط باش تتابع التصنيع.', 'p')}<a class="btn primary" href="/boutique/">{t('co_back', 'Continuer mes achats', 'كمّل التسوق')}</a></div>
  <div id="cartEmpty" class="form empty" hidden>{t('cart_empty_t', 'Votre panier est vide', 'السلة فارغة', 'h2')}{t('cart_empty2', 'Ajoutez des produits depuis la boutique, ou demandez un devis pour une pièce sur mesure.', 'زيد منتجات من المتجر، ولا اطلب عرض سعر لقطعة حسب الطلب.', 'p')}<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn primary" href="/boutique/">{t('hm_allshop', 'Toute la boutique')}</a><a class="btn line" href="/#devis">{t('nav_devis', 'Demander un devis')}</a></div></div>
  <div class="cartpage" id="cartFull" hidden>
    <div>
      <div class="lines" id="cartLines"></div>
      <div class="sum"><span>{t('cart_total', 'Total estimé', 'المجموع التقريبي')}</span><b id="cartTotal"></b></div>
      <div class="paynote small">{t('cart_note', 'Les prix sont des estimations : l’atelier confirme le prix exact, la date et les frais de livraison avant de lancer la fabrication. Rien n’est payé maintenant.', 'الأسعار تقريبية: الورشة تأكد السعر الدقيق والتاريخ ومصاريف التوصيل قبل التصنيع. ما تخلص شي توّا.')}</div>
      <p class="paymodes small" id="payModes" hidden></p>{tx('pay_lead', 'Après confirmation, acompte par :', 'بعد التأكيد، العربون بـ :')[:0]}{tx('pay_card', 'carte bancaire en ligne', 'بطاقة بنكية على الخط')[:0]}{tx('pay_d17', 'D17', 'D17')[:0]}{tx('pay_vir', 'virement', 'تحويل بنكي')[:0]}{tx('pay_cash', 'espèces à l’atelier', 'كاش في الورشة')[:0]}{tx('av_src_Atelier', 'à l’atelier', 'في الورشة')[:0]}{tx('av_on', 'sur', 'على')[:0]}
    </div>
    <form class="form" id="checkout">
      {t('co_title', 'Vos coordonnées', 'معلوماتك', 'h2')}
      <div class="fgrid">
        <label class="full"><span>{t('f_name', 'Votre nom')}</span><input name="name" required maxlength="80" autocomplete="name"></label>
        <label><span>{t('f_phone', 'Téléphone ou WhatsApp')}</span><input name="phone" type="tel" maxlength="20" autocomplete="tel" required></label>
        <label><span>{t('f_email', 'E-mail')}</span><input name="email" type="email" maxlength="120" autocomplete="email"></label>
        <div class="full"><span class="small" style="font-weight:500">{t('co_mode', 'Réception', 'الاستلام')}</span><div class="radios" style="margin-top:6px"><label><input type="radio" name="mode" value="retrait" checked>{t('co_pick', 'Retrait à l’atelier', 'من الورشة')}</label><label><input type="radio" name="mode" value="livraison">{t('co_ship', 'Livraison', 'توصيل')}</label></div></div>
        <div class="full fgrid" id="shipWrap" hidden><label><span>{t('co_city', 'Ville', 'المدينة')}</span><input name="ville" maxlength="60" autocomplete="address-level2"></label><label><span>{t('co_addr', 'Adresse', 'العنوان')}</span><input name="adresse" maxlength="160" autocomplete="street-address"></label></div>
        <label><span>{t('f_deadline', 'Pour quelle date ?')}</span><input name="deadline" type="date"></label>
        <label><span>{t('b_ref', 'Code de parrainage (facultatif)')}</span><input name="ref" maxlength="12" placeholder="FZ-XXXXXX" style="text-transform:uppercase"></label>
        <label class="full"><span>{t('co_note', 'Remarque (facultatif)', 'ملاحظة (اختياري)')}</span><textarea name="note" rows="3" maxlength="1000"></textarea></label>
        <div class="hp" aria-hidden="true"><label>Site<input name="website" tabindex="-1" autocomplete="off"></label></div>
      </div>
      <button class="btn primary block" id="coSend" style="margin-top:18px">{t('co_send', 'Envoyer la commande', 'ابعث الطلبية')}</button>
      <div class="msg" id="coMsg" role="status"></div>
      <div class="paynote">{t('co_pay', 'Paiement après confirmation : acompte de 50 % (espèces, virement, chèque ou D17), solde à la livraison.', 'الخلاص بعد التأكيد: تسبقة 50% (نقداً، تحويل، شيك ولا D17)، والباقي عند التسليم.', 'span')}</div>
    </form>
  </div>
</div></section>''', scripts=['panier.js'], noindex=True)

# ================= MON ESPACE =================
compte = f'''
<section class="sec"><div class="wrap">
  <div class="espace" id="espaceBox">
    <div class="e-login" id="eLogin">
      <form id="eLoginForm" class="e-form">
        {t('e_login', 'Se connecter', None, 'h3')}
        <label><span data-t="e_id">Téléphone ou e-mail</span><input name="login" required autocomplete="username"></label>
        <label><span data-t="e_pw">Mot de passe</span><input name="password" type="password" required autocomplete="current-password"></label>
        <button class="btn primary" type="submit">{t('e_go', 'Entrer')}</button>
        <p class="e-msg" id="eLoginMsg"></p>
        {t('e_forgot', 'Mot de passe oublié ? Écrivez-nous sur WhatsApp : nous vous envoyons un accès temporaire.', None, 'p', 'class="small"')}
      </form>
      <form id="eCreateForm" class="e-form">
        {t('e_create', 'Créer mon espace', None, 'h3')}
        {t('e_create_h', 'Collez le lien de suivi ou de devis reçu par WhatsApp ou e-mail : c’est votre preuve de commande.', None, 'p', 'class="small"')}
        <label><span data-t="e_link">Lien de suivi ou de devis</span><input name="token" required placeholder="https://faza3d.tn/suivi/…"></label>
        <label><span data-t="e_id">Téléphone ou e-mail</span><input name="login" required placeholder="+216 …"></label>
        <label><span data-t="e_pw2">Choisir un mot de passe (8 caractères min.)</span><input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
        <button class="btn line" type="submit">{t('e_create_go', 'Créer')}</button>
        <p class="e-msg" id="eCreateMsg"></p>
        {t('e_first', 'Première commande ? L’espace se crée avec le lien reçu après votre premier devis ou votre première commande.', 'أول طلبية؟ الحساب يتعمل بالرابط اللي يوصلك بعد أول عرض سعر ولا أول طلبية.', 'p', 'class="small"')}
      </form>
    </div>
    <div class="e-area" id="eArea" hidden>
      <div class="e-head"><div><b id="eName"></b><span class="small" id="eLoginTxt"></span></div><div class="e-actions"><button class="btn ghost small" id="eMdpBtn">{t('e_mdp', 'Changer le mot de passe')}</button><button class="btn ghost small" id="eLogout">{t('e_logout', 'Se déconnecter')}</button></div></div>
      <form id="eMdpForm" class="e-form e-inline" hidden><label><span data-t="e_newpw">Nouveau mot de passe (8 caractères min.)</span><input name="password" type="password" minlength="8" required autocomplete="new-password"></label><button class="btn primary small" type="submit">{t('e_save', 'Enregistrer')}</button><p class="e-msg" id="eMdpMsg"></p></form>
      {t('e_orders', 'Mes commandes', None, 'h3')}
      <div id="eOrders"></div>
      {t('e_quotes', 'Mes devis', None, 'h3')}
      <div id="eQuotes"></div>
    </div>
  </div>
</div></section>'''
page('/compte/', 'Mon espace client · FAZA 3D', 'حسابي · FAZA 3D', 'Suivez vos commandes, acceptez vos devis et téléchargez vos factures FAZA 3D.',
     phead('acc_label', 'Mon espace', None, 'e_title', 'Suivez vos commandes, acceptez vos devis, téléchargez vos factures', None, '', '', '') + compte, scripts=['compte.js'], noindex=True)

# ================= 404 =================
p404 = f'''<section class="sec"><div class="wrap">{t('nf_h', 'Cette page n’existe pas (ou plus).', 'الصفحة هذي ما عادش موجودة.', 'h1')}{t('nf_p', 'Le site a changé : retrouvez nos services, la boutique et votre espace client depuis le menu.', 'الموقع تبدّل: تلقى الخدمات والمتجر وحسابك من القائمة.', 'p', 'class="lead"')}<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:26px"><a class="btn primary" href="/">{t('cr_home', 'Accueil', 'الرئيسية')}</a><a class="btn line" href="/boutique/">{t('nav_shop', 'Boutique')}</a><a class="btn line" href="/contact/">{t('nav_contact', 'Contact')}</a></div></div></section>'''
page('/404.html', 'Page introuvable · FAZA 3D', 'الصفحة غير موجودة · FAZA 3D', 'Page introuvable.', p404, noindex=True)
