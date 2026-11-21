# Contenu des pages (exécuté par build.py). Chaque texte : clé, français, arabe.

# textes utilisés par les scripts (pas dans les pages)
AR.update({
    'st_l1': 'البطل', 'st_l2': 'موسم 2026', 'st_layer': 'الطبقة', 'st_laser': 'النقش', 'st_done': 'جاهز للتسليم',
    'cart_added': 'تزاد للسلة', 'cart_see': 'شوف السلة', 'shop_delai': 'الأجل', 'shop_from': 'ابتداءً من', 'shop_quote': 'حسب الطلب',
    'shop_compose': 'صمّم متاعك', 'shop_none': 'ما فماش منتجات في الصنف هذا توّا.', 'cart_qty': 'الكمية', 'cart_rm': 'نحّي',
    'co_need': 'اكتب رقم هاتف ولا بريد إلكتروني باش نأكدولك الطلبية.', 'co_need2': 'أدخل رقم هاتف أو بريداً إلكترونياً حتى نرد عليك.',
    'co_wa': 'الطلب على الخط ما يجاوبش توّا. ابعثو على واتساب بنقرة:', 'co_err': 'تعذر الإرسال. كلمنا على ',
    'cfg_aria': 'معاينة الكأس', 'cfg_each': 'للقطعة', 'cfg_qty_disc': 'من', 'cfg_pcs': 'قطعة',
    'f_ok': 'شكراً، تم استلام طلبك. سنرد عليك خلال 24 ساعة.', 'f_wa': 'أرسلوا طلبكم على واتساب بنقرة واحدة:', 'f_err': 'تعذر الإرسال. راسلونا على: ',
    'ref_ko': 'رمز غير معروف (تثبّت من 6 أحرف).', 'ref_ok': 'الرمز صحيح : أحالك ',
})

TRUST = [('tr1', 'Devis gratuit sous 24 h', 'عرض سعر مجاني خلال 24 ساعة'), ('tr2', 'Aperçu validé avant fabrication', 'معاينة توافق عليها قبل التصنيع'),
         ('tr3', 'Suivi de commande en ligne', 'متابعة الطلبية على الخط'), ('tr4', 'Facture avec TVA', 'فاتورة بالأداء')]

# ================= ACCUEIL =================
scene = open(os.path.join(SRC, 'legacy', 'hero-scene.html'), encoding='utf-8').read()
home = f'''
<section class="hero">
  <div class="wrap">
    <div>
      <p class="where">{ic('pin')}{t('h_eye', 'Atelier FAZA 3D · Charguia 2, Ariana · Grand Tunis')}</p>
      {t('h_title', 'Impression 3D, découpe et gravure laser : vos idées <em>s’impriment</em>', None, 'h1')}
      {t('h_lead', 'Trophées, plaques gravées, cadeaux personnalisés, maquettes et prototypes : nous concevons et fabriquons vos pièces sur mesure, à l’unité ou en série, avec un devis sous 24 h.', None, 'p', 'class="lead"')}
      <div class="acts"><a class="btn primary" href="#devis">{t('h_cta1', 'Demander un devis')}</a><a class="btn line" href="/boutique/">{t('hm_shop', 'Voir la boutique', 'شوف المتجر')}</a></div>
      <ul class="trust">{''.join(f'<li>{ic("check")}{t(k, fr, ar)}</li>' for k, fr, ar in TRUST)}</ul>
    </div>
    <div class="plate scene" id="estimer">
{scene}
    </div>
  </div>
</section>
<div class="season" id="season" hidden><div class="wrap">
  {t('sz_fin', '<b>Fin d’année :</b> coffrets et cadeaux gravés pour vos clients et vos équipes. Commandez avant le 10 décembre.', '<b>آخر العام:</b> هدايا وعلب منقوشة لحرفائكم وفريقكم. اطلبوا قبل 10 ديسمبر.', 'span', 'hidden')}
  {t('sz_ecole', '<b>Fin d’année scolaire :</b> trophées, médailles et plaques de diplômes. Réservez votre date dès maintenant.', '<b>آخر السنة الدراسية:</b> كؤوس وميداليات ولوحات تخرج. احجزوا تاريخكم من توّا.', 'span', 'hidden')}
  {t('sz_mariage', '<b>Saison des mariages :</b> plaques prénoms, décorations et cadeaux d’invités gravés.', '<b>موسم الأعراس:</b> لوحات بالأسماء، ديكور وهدايا ضيوف منقوشة.', 'span', 'hidden')}
  {t('sz_ramadan', '<b>Ramadan et Aïd :</b> cadeaux personnalisés, lampes photo et coffrets gravés.', '<b>رمضان والعيد:</b> هدايا مخصصة، مصابيح بالصور وعلب منقوشة.', 'span', 'hidden')}
  <a href="/cadeaux-personnalises/">{t('szmore', 'Voir les idées', 'شوف الأفكار')}</a>
</div></div>

<section class="story" id="story">
  <div class="stick"><div class="wrap grid">
    <div class="txt">
      {t('st_h', 'Regardez votre trophée se fabriquer', 'شوف الكأس متاعك كيفاش يتصنع', 'h2')}
      <ol class="ssteps">
        <li data-step class="on"><b>{t('st_1', 'Impression 3D, couche par couche', 'طباعة ثلاثية الأبعاد، طبقة بطبقة')}</b>{t('st_1p', 'Le corps du trophée monte par couches de 0,2 mm, dans la couleur de filament que vous avez choisie.', 'جسم الكأس يطلع بطبقات 0.2 مم، بلون الفيلامنت اللي اخترتو.')}</li>
        <li data-step><b>{t('st_2', 'Gravure laser de la plaque', 'نقش اللوحة بالليزر')}</b>{t('st_2p', 'Votre texte et votre logo sont gravés dans le plexiglas, ligne après ligne.', 'النص والشعار متاعك يتنقشو في البلكسي، سطر بسطر.')}</li>
        <li data-step><b>{t('st_3', 'Assemblage et contrôle', 'التركيب والمراقبة')}</b>{t('st_3p', 'La plaque est fixée sur le socle, la pièce est contrôlée puis emballée. Prête à être remise.', 'اللوحة تتركب على القاعدة، القطعة تتراقب وتتغلف. جاهزة للتسليم.')}</li>
      </ol>
      <div class="acts"><a class="btn primary" href="/trophees-medailles/#composer">{t('nav_compose', 'Composer mon trophée', 'صمّم الكأس متاعك')}</a><a class="btn line" href="#devis">{t('h_cta1', 'Demander un devis')}</a></div>
      {t('st_hint', 'Faites défiler la page pour avancer la fabrication.', 'انزل في الصفحة باش تتقدم في التصنيع.', 'p', 'class="hint"')}
    </div>
    <div class="stage"><canvas id="storyCanvas" aria-hidden="true"></canvas><div class="shud"><span class="dot"></span><span id="storyHud"></span></div><div class="sbar"><i></i></div></div>
  </div></div>
  <span hidden id="story_l1" data-t="st_l1">CHAMPION</span><span hidden id="story_l2" data-t="st_l2">Saison 2026</span>
</section>

<section class="sec" id="services">
  <div class="wrap">
    <div class="sec-head"><div>{t('hm_cats', 'Ce que nous fabriquons', 'شنوّة نصنعو', 'h2')}{t('s_lead', 'De la conception du fichier à la pièce finie et emballée. Vous apportez une idée, un logo ou un fichier : nous faisons le reste.', None, 'p')}</div><a class="more" href="/tarifs/">{t('hm_prices', 'Voir les tarifs', 'شوف الأسعار')}</a></div>
    <div class="cats">
      <a class="cat big" href="/trophees-medailles/"><div class="txt">{t('s4t', 'Trophées et médailles', None, 'h3')}{t('s4p', 'Trophées hybrides 3D + plexi gravé, médailles, plaques de remise de diplômes. Pour écoles, clubs sportifs, entreprises et événements.', None, 'p')}</div><span class="pr">{t('s4f', 'Dès 60 TND le trophée')}</span><span class="art" data-art="trophee"></span></a>
      <a class="cat" href="/gravure-laser/"><div class="txt">{t('s2t', 'Découpe et gravure laser', None, 'h3')}{t('hm_c2', 'Plaques, signalétique, présentoirs, menus en plexi et en bois.', 'لوحات، لافتات، حوامل عرض وقوائم من البلكسي والخشب.', 'p')}</div><span class="pr">{t('s2f', 'Dès 25 TND la plaque')}</span><span class="art" data-art="plaque"></span></a>
      <a class="cat" href="/cadeaux-personnalises/"><div class="txt">{t('s5t', 'Cadeaux personnalisés', None, 'h3')}{t('hm_c3', 'Lampes photo, porte-clés, plaques prénom, coffrets gravés.', 'مصابيح بالصور، ميداليات مفاتيح، لوحات بالاسم، علب منقوشة.', 'p')}</div><span class="pr">{t('s5f', 'Dès 55 TND la lampe')}</span><span class="art" data-art="lampe"></span></a>
      <a class="cat" href="/impression-3d/"><div class="txt">{t('s1t', 'Impression 3D', None, 'h3')}{t('hm_c4', 'Pièces techniques, rechanges, maquettes, prototypes et scan 3D.', 'قطع تقنية، قطع غيار، مجسمات، نماذج أولية ومسح ثلاثي الأبعاد.', 'p')}</div><span class="pr">{t('s1f', 'Dès 5 TND la pièce')}</span><span class="art" data-art="piece"></span></a>
      <a class="cat" href="/entreprises-ecoles/"><div class="txt">{t('nav_pro', 'Entreprises et écoles', None, 'h3')}{t('hm_c5', 'Commandes en série, prix dégressifs, facture avec TVA.', 'طلبيات بالجملة، أسعار تنازلية، فاتورة بالأداء.', 'p')}</div><span class="pr">{t('hm_c5p', 'Devis sous 24 h', 'عرض سعر في 24 ساعة')}</span><span class="art" data-art="medaille"></span></a>
    </div>
  </div>
</section>

<section class="sec alt">
  <div class="wrap">
    <div class="sec-head"><div>{t('hm_ready', 'Prêts à commander', 'جاهزين للطلب', 'h2')}{t('b_lead', 'Choisissez, personnalisez, commandez en 2 clics : on vous rappelle pour confirmer le prix exact et la date.', None, 'p')}</div><a class="more" href="/boutique/">{t('hm_allshop', 'Toute la boutique', 'المتجر الكل')}</a></div>
    <div class="products" id="shopGrid" data-max="4"></div>
  </div>
</section>

<section class="sec" id="etapes">
  <div class="wrap">
    <div class="sec-head"><div>{t('p_title', 'De votre idée à la pièce livrée.', None, 'h2')}</div></div>
    <div class="steps">
      <div class="step"><b data-t="p1">Vous décrivez le projet</b><span data-t="p1p">Par le formulaire, WhatsApp ou à l’atelier : une photo, un croquis, un fichier ou juste une idée.</span><small data-t="p1s">5 minutes</small></div>
      <div class="step"><b data-t="p2">Nous chiffrons</b><span data-t="p2p">Devis détaillé avec prix, délai et aperçu. Vous l’acceptez en ligne, en un clic.</span><small data-t="p2s">Sous 24 h</small></div>
      <div class="step"><b data-t="p3">Conception et validation</b><span data-t="p3p">Nous préparons le modèle 3D ou le fichier de gravure et vous l’envoyons pour accord avant de lancer.</span><small data-t="p3s">1 à 2 jours</small></div>
      <div class="step"><b data-t="p4">Fabrication et livraison</b><span data-t="p4p">Impression, découpe, finition et contrôle qualité. Vous suivez l’avancement par un lien, puis retrait à l’atelier ou livraison.</span><small data-t="p4s">2 à 7 jours selon la quantité</small></div>
    </div>
  </div>
</section>

<section class="sec alt">
  <div class="wrap">
    <div class="sec-head"><div>{t('w_title', 'Des pièces utiles à chaque métier.', None, 'h2')}</div><a class="more" href="/entreprises-ecoles/">{t('hm_series', 'Commandes en série', 'طلبيات بالجملة')}</a></div>
    <div class="who">{''.join(f'<div><b data-t="w{i}"></b><span data-t="w{i}p"></span></div>' for i in range(1, 7))}</div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head"><div>{t('r_title', 'Ce qui sort de l’atelier.', None, 'h2')}</div><a class="more" href="/realisations/">{t('hm_allreal', 'Toutes les réalisations', 'الإنجازات الكل')}</a></div>
    {gallery(4)}
  </div>
</section>

<section class="sec alt" id="contact">
  <div class="wrap">
    <div class="sec-head"><div>{t('d_title', 'Parlez-nous de votre projet.', None, 'h2')}</div></div>
    <div class="contact">{contact_info()}{devis_form()}</div>
  </div>
</section>
{ADD_DLG}
{open(os.path.join(SRC, 'legacy', 'ai-box.html'), encoding='utf-8').read()}
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js" defer></script>'''
# textes « pour qui » (déjà traduits) : remplis depuis les valeurs françaises connues
WHO = {'w1': 'Écoles et universités', 'w1p': 'Trophées de fin d’année, plaques de diplômes, maquettes pédagogiques, goodies.', 'w2': 'Entreprises, banques, assurances', 'w2p': 'Cadeaux d’entreprise gravés, plaques de bureau, trophées internes, présentoirs.',
       'w3': 'Clubs et associations', 'w3p': 'Trophées, médailles, plaques de partenaires, porte-clés aux couleurs du club.', 'w4': 'Cliniques, dentistes, architectes', 'w4p': 'Modèles dentaires, maquettes d’architecture, signalétique en plexiglas.',
       'w5': 'Commerces et restaurants', 'w5p': 'Menus et présentoirs en plexi, enseignes, numéros de table, décorations.', 'w6': 'Particuliers', 'w6p': 'Cadeaux personnalisés, décorations de mariage, pièces de rechange, objets déco.'}
for k, v in WHO.items():
    home = home.replace(f'data-t="{k}"></', f'data-t="{k}">{v}</')
page('/', 'FAZA 3D · Impression 3D et découpe laser à Tunis', 'FAZA 3D · طباعة ثلاثية الأبعاد وقص بالليزر في تونس',
     "FAZA 3D, atelier d'impression 3D, découpe et gravure laser et scan 3D à Tunis : trophées, plaques gravées, cadeaux personnalisés, maquettes et prototypes. Devis gratuit sous 24 h.",
     home, scripts=['estimateur.js', 'atelier3d.js', 'assistant.js', 'boutique.js', 'devis.js'], ld=LD_BUSINESS,
     og_desc='Trophées, plaques gravées, cadeaux personnalisés, maquettes et prototypes. Devis gratuit sous 24 h.',
     head_extra='<link rel="alternate" hreflang="fr" href="https://faza3d.tn/"><link rel="alternate" hreflang="ar" href="https://faza3d.tn/ar/"><link rel="alternate" hreflang="x-default" href="https://faza3d.tn/">\n')

# ================= BOUTIQUE =================
FILTERS = [('all', 'fl_all', 'Tout', 'الكل'), ('trophees', 'fl_tr', 'Trophées', 'كؤوس'), ('gravure', 'fl_gr', 'Gravure', 'نقش'), ('cadeaux', 'fl_ca', 'Cadeaux', 'هدايا'), ('impression', 'fl_3d', 'Impression 3D', 'طباعة 3D')]
page('/boutique/', 'Boutique FAZA 3D · Trophées, plaques gravées et cadeaux à commander', 'متجر FAZA 3D · كؤوس، لوحات منقوشة وهدايا',
     'Commandez en ligne trophées, plaques gravées, lampes photo et porte-clés personnalisés, fabriqués à Tunis. Prix affichés, confirmation par l’atelier.',
     phead('nav_shop', 'Boutique', None, 'b_title', 'Nos produits prêts à commander.', None, 'b_lead', 'Choisissez, personnalisez, commandez en 2 clics : on vous rappelle pour confirmer le prix exact et la date.', None) + f'''
<section class="sec"><div class="wrap">
  <div class="filters" role="group">{''.join(f'<button type="button" data-filter="{v}" aria-pressed="{"true" if v == "all" else "false"}">{t(k, fr, ar)}</button>' for v, k, fr, ar in FILTERS)}</div>
  <div class="products" id="shopGrid"></div>
  <p class="note">{t('shop_miss', 'Vous ne trouvez pas votre produit ? Presque tout se fabrique sur mesure : <a href="/contact/#devis">demandez un devis</a> ou <a href="/trophees-medailles/#composer">composez votre trophée</a>.', 'ما لقيتش المنتج متاعك؟ تقريباً كل شي يتصنع حسب الطلب: <a href="/contact/#devis">اطلب عرض سعر</a> ولا <a href="/trophees-medailles/#composer">صمّم الكأس متاعك</a>.')}</p>
</div></section>
{ADD_DLG}''', scripts=['boutique.js'])

# ================= PANIER =================
page('/panier/', 'Panier · FAZA 3D', 'السلة · FAZA 3D', 'Votre panier FAZA 3D.', phead('nav_cart', 'Panier', None, 'cart_h1', 'Votre panier', 'السلة متاعك', '', '', '') + f'''
<section class="sec"><div class="wrap">
  <div id="cartDone" class="form empty" hidden>{t('co_done_t', 'Commande envoyée, merci !', 'تبعثت الطلبية، يعطيك الصحة!', 'h2')}{t('co_done', 'L’atelier vous appelle ou vous écrit sur WhatsApp pour confirmer le prix exact et la date. Vous recevrez ensuite un lien pour suivre la fabrication.', 'الورشة تكلمك ولا تبعثلك على واتساب باش تأكد السعر والتاريخ. من بعد يوصلك رابط باش تتابع التصنيع.', 'p')}<a class="btn primary" href="/boutique/">{t('co_back', 'Continuer mes achats', 'كمّل التسوق')}</a></div>
  <div id="cartEmpty" class="form empty" hidden>{t('cart_empty_t', 'Votre panier est vide', 'السلة فارغة', 'h2')}{t('cart_empty', 'Ajoutez des produits depuis la boutique, ou composez votre trophée en quelques clics.', 'زيد منتجات من المتجر، ولا صمّم الكأس متاعك في بضعة نقرات.', 'p')}<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn primary" href="/boutique/">{t('hm_allshop', 'Toute la boutique')}</a><a class="btn line" href="/trophees-medailles/#composer">{t('nav_compose', 'Composer mon trophée')}</a></div></div>
  <div class="cartpage" id="cartFull" hidden>
    <div>
      <div class="lines" id="cartLines"></div>
      <div class="sum"><span>{t('cart_total', 'Total estimé', 'المجموع التقريبي')}</span><b id="cartTotal"></b></div>
      <div class="paynote small">{t('cart_note', 'Les prix sont des estimations : l’atelier confirme le prix exact, la date et les frais de livraison avant de lancer la fabrication. Rien n’est payé maintenant.', 'الأسعار تقريبية: الورشة تأكد السعر الدقيق والتاريخ ومصاريف التوصيل قبل التصنيع. ما تخلص شي توّا.')}</div>
    </div>
    <form class="form" id="checkout">
      {t('co_title', 'Vos coordonnées', 'معلوماتك', 'h2')}
      <div class="fgrid">
        <label class="full"><span>{t('f_name', 'Votre nom')}</span><input name="name" required maxlength="80" autocomplete="name"></label>
        <label><span>{t('f_phone', 'Téléphone ou WhatsApp')}</span><input name="phone" type="tel" maxlength="20" autocomplete="tel" required></label>
        <label><span>{t('f_email', 'E-mail')}</span><input name="email" type="email" maxlength="120" autocomplete="email"></label>
        <div class="full"><span class="small" style="font-weight:600">{t('co_mode', 'Réception', 'الاستلام')}</span><div class="radios" style="margin-top:6px"><label><input type="radio" name="mode" value="retrait" checked>{t('co_pick', 'Retrait à l’atelier', 'من الورشة')}</label><label><input type="radio" name="mode" value="livraison">{t('co_ship', 'Livraison', 'توصيل')}</label></div></div>
        <div class="full fgrid" id="shipWrap" hidden><label><span>{t('co_city', 'Ville', 'المدينة')}</span><input name="ville" maxlength="60" autocomplete="address-level2"></label><label><span>{t('co_addr', 'Adresse', 'العنوان')}</span><input name="adresse" maxlength="160" autocomplete="street-address"></label></div>
        <label><span>{t('f_deadline', 'Pour quelle date ?')}</span><input name="deadline" type="date"></label>
        <label><span>{t('b_ref', 'Code de parrainage (facultatif)')}</span><input name="ref" maxlength="12" placeholder="FZ-XXXXXX" style="text-transform:uppercase"></label>
        <label class="full"><span>{t('co_note', 'Remarque (facultatif)', 'ملاحظة (اختياري)')}</span><textarea name="note" rows="3" maxlength="1000"></textarea></label>
        <div class="hp" aria-hidden="true"><label>Site<input name="website" tabindex="-1" autocomplete="off"></label></div>
      </div>
      <button class="btn primary block" id="coSend" style="margin-top:16px">{t('co_send', 'Envoyer la commande', 'ابعث الطلبية')}</button>
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

# ================= TROPHÉES =================
COLORS = [('or', 'Or', 'ذهبي', '#D9AC3F'), ('argent', 'Argent', 'فضي', '#C4CBD4'), ('bronze', 'Bronze', 'برونزي', '#B47442'), ('bleu', 'Bleu', 'أزرق', '#2B6CF0'), ('rouge', 'Rouge', 'أحمر', '#C93A3F'), ('noir', 'Noir', 'أسود', '#2B2F36'), ('blanc', 'Blanc', 'أبيض', '#F3F4F6')]


def radios(name, opts, checked):
    return '<div class="opts">' + ''.join(f'<label><input type="radio" name="{name}" value="{v}"{" checked" if v == checked else ""}>{sw}{t(k, fr, ar)}</label>' for v, k, fr, ar, sw in opts) + '</div>'


cfg = f'''
<section class="sec" id="composer"><div class="wrap">
  <div class="sec-head"><div>{t('cfg_h', 'Composez votre trophée', 'صمّم الكأس متاعك', 'h2')}{t('cfg_lead', 'Choisissez le modèle, la couleur et le texte : l’aperçu et le prix se mettent à jour. L’atelier vous envoie le fichier final pour accord avant fabrication.', 'اختار الموديل واللون والنص: المعاينة والسعر يتبدلو مباشرة. الورشة تبعثلك الملف النهائي للموافقة قبل التصنيع.', 'p')}</div></div>
  <div class="plate cfg">
    <div class="pv" id="cfgPv"></div>
    <form id="cfgForm">
      <fieldset><legend>{t('cfg_model', 'Modèle', 'الموديل')}</legend>{radios('modele', [('coupe', 'cm_coupe', 'Coupe', 'كأس', ''), ('etoile', 'cm_etoile', 'Étoile', 'نجمة', ''), ('plaque', 'cm_plaque', 'Plaque plexi', 'لوحة بلكسي', '')], 'coupe')}</fieldset>
      <fieldset><legend>{t('cfg_height', 'Hauteur', 'الطول')}</legend>{radios('hauteur', [('20', 'ch_20', '20 cm', '20 سم', ''), ('25', 'ch_25', '25 cm', '25 سم', ''), ('30', 'ch_30', '30 cm', '30 سم', '')], '25')}</fieldset>
      <fieldset><legend>{t('cfg_color', 'Couleur', 'اللون')}</legend>{radios('couleur', [(v, 'cc_' + v, fr, ar, f'<i class="sw" style="background:{c}"></i>') for v, fr, ar, c in COLORS], 'or')}</fieldset>
      <fieldset><legend>{t('cfg_base', 'Socle', 'القاعدة')}</legend>{radios('socle', [('noir', 'cs_noir', 'Noir', 'أسود', '<i class="sw" style="background:#1C1F25"></i>'), ('bois', 'cs_bois', 'Bois', 'خشب', '<i class="sw" style="background:#8B5B34"></i>'), ('blanc', 'cs_blanc', 'Blanc', 'أبيض', '<i class="sw" style="background:#E9EBEE"></i>')], 'noir')}</fieldset>
      <div class="two"><label class="fl">{t('cfg_l1', 'Texte gravé, ligne 1', 'النص المنقوش، السطر 1')}<input type="text" name="l1" maxlength="28" {ph('cl1', 'Champion 2026', 'بطل 2026')}></label><label class="fl">{t('cfg_l2', 'Ligne 2', 'السطر 2')}<input type="text" name="l2" maxlength="32" {ph('cl2', 'Tournoi de fin d’année', 'دورة آخر العام')}></label></div>
      <div class="two"><label class="fl">{t('b_qty', 'Quantité')}<input type="number" name="qty" min="1" max="9999" value="1"></label><span class="small" style="align-self:end;color:var(--night-mut)">{t('cfg_logo', 'Logo du club ou de l’école : envoyez-le après la commande, sur WhatsApp ou par e-mail.', 'شعار النادي ولا المدرسة: ابعثو بعد الطلبية على واتساب ولا بالبريد.')}</span></div>
      <div class="tot"><div><b id="cfgTotal"></b><small id="cfgUnit"></small></div><button class="btn primary">{t('shop_add', 'Ajouter au panier')}</button></div>
      <p class="small" style="color:var(--night-mut)">{t('cfg_note', 'Prix estimé TTC : confirmé par l’atelier avant fabrication. −10 % dès 10 pièces, −15 % dès 30.', 'سعر تقريبي بالأداء: تأكده الورشة قبل التصنيع. −10% من 10 قطع، −15% من 30.')}</p>
    </form>
  </div>
</div></section>'''

trophees = phead('nav_troph', 'Trophées et médailles', None, 'tp_h1', 'Trophées et médailles personnalisés à Tunis', 'كؤوس وميداليات مخصصة في تونس',
                 'tp_lead', 'Trophées hybrides imprimés en 3D avec plaque plexi gravée, médailles et plaques de diplômes, à l’unité ou par dizaines. Votre logo, vos couleurs, vos textes.', 'كؤوس هجينة مطبوعة ثلاثية الأبعاد بلوحة بلكسي منقوشة، ميداليات ولوحات تخرج، بالقطعة ولا بالعشرات. شعارك، ألوانك ونصوصك.',
                 f'<a class="btn primary" href="#composer">{t("nav_compose", "Composer mon trophée")}</a><a class="btn line" href="/contact/?produit=Troph#devis">{t("tp_quote", "Devis pour une série", "عرض سعر لكمية")}</a>') + cfg + f'''
<section class="sec alt"><div class="wrap split">
  <div class="prose">
    {t('tp_h2', 'Pour quelles occasions ?', 'لأي مناسبات؟', 'h2')}
    {t('tp_p1', 'Tournois et championnats de clubs, fins d’année scolaire, remises de diplômes, concours internes d’entreprise, salons et événements. Chaque trophée porte le nom de la catégorie ou du gagnant.', 'دورات وبطولات النوادي، آخر السنة الدراسية، حفلات التخرج، مسابقات داخلية في الشركات، المعارض والتظاهرات. كل كأس عليه اسم الصنف ولا الفايز.', 'p')}
    {t('tp_h3a', 'Médailles', 'ميداليات', 'h3')}
    {t('tp_p2', 'Médailles imprimées en 3D aux couleurs du club ou gravées au laser, avec ruban. Idéales pour les séries de 20 à 500 pièces.', 'ميداليات مطبوعة بألوان النادي ولا منقوشة بالليزر، مع شريط. مناسبة للكميات من 20 حتى 500 قطعة.', 'p')}
    {t('tp_h3b', 'Plaques de diplômes et de remerciement', 'لوحات تخرج وشكر', 'h3')}
    {t('tp_p3', 'Plexiglas transparent, noir ou miroir, gravé avec le logo et le texte, livré avec support ou fixations murales.', 'بلكسي شفاف، أسود ولا مرآة، منقوش بالشعار والنص، مع حامل ولا تثبيت حائطي.', 'p')}
    <div class="facts"><div><b>{t('tp_f1', 'Dès 60 TND', 'من 60 د')}</b>{t('tp_f1s', 'le trophée de 25 cm', 'الكأس 25 سم')}</div><div><b>4–7 j</b>{t('tp_f2s', 'selon la quantité', 'حسب الكمية')}</div><div><b>−15 %</b>{t('tp_f3s', 'dès 30 pièces', 'من 30 قطعة')}</div></div>
  </div>
  <aside class="aside">
    {t('tp_inc', 'Compris dans le prix', 'مشمول في السعر', 'h3')}
    {check_list([('tp_i1', 'Mise en page de votre logo et de vos textes', 'تنسيق الشعار والنصوص'), ('tp_i2', 'Aperçu envoyé pour accord avant fabrication', 'معاينة للموافقة قبل التصنيع'), ('tp_i3', 'Noms différents sur chaque trophée', 'أسماء مختلفة على كل كأس'), ('tp_i4', 'Emballage individuel', 'تغليف لكل قطعة'), ('tp_i5', 'Facture avec TVA pour écoles et clubs', 'فاتورة بالأداء للمدارس والنوادي')])}
    <a class="btn primary block" href="/contact/?produit=Troph#devis">{t('nav_devis', 'Demander un devis')}</a>
  </aside>
</div></section>''' + cta_band('tp_cta', 'Un tournoi ou une fin d’année à préparer ? Réservez votre date.', 'عندك دورة ولا آخر عام؟ احجز تاريخك.', 'Troph')
page('/trophees-medailles/', 'Trophées et médailles personnalisés à Tunis · FAZA 3D', 'كؤوس وميداليات مخصصة في تونس · FAZA 3D',
     'Trophées hybrides 3D + plexi gravé, médailles et plaques de diplômes personnalisés à Tunis. Composez votre trophée en ligne, prix dès 60 TND, dégressif dès 10 pièces.',
     trophees, scripts=['configurateur.js'], ld=service_ld('Trophées et médailles personnalisés', '/trophees-medailles/', 'Trophées hybrides 3D + plexi gravé, médailles et plaques de diplômes à Tunis.'))

# ================= GRAVURE LASER =================
laser = phead('nav_laser', 'Gravure laser', None, 'gl_h1', 'Découpe et gravure laser à Tunis', 'قص ونقش بالليزر في تونس',
              'gl_lead', 'Plaques gravées, signalétique, présentoirs, menus et décorations en plexiglas, MDF, contreplaqué, cuir ou carton. À partir de votre logo ou d’un simple croquis.', 'لوحات منقوشة، لافتات، حوامل عرض، قوائم وديكور من البلكسي، MDF، الخشب المعاكس، الجلد ولا الكرتون. من الشعار متاعك ولا من رسم بسيط.',
              f'<a class="btn primary" href="/contact/?produit=D%C3%A9coupe#devis">{t("nav_devis", "Demander un devis")}</a><a class="btn line" href="/boutique/">{t("nav_shop", "Boutique")}</a>') + f'''
<section class="sec"><div class="wrap split">
  <div class="prose">
    {t('gl_h2', 'Ce que nous réalisons', 'شنوّة نعملو', 'h2')}
    <ul>
      <li>{t('gl_l1', 'Plaques de bureau, de porte et de partenaires', 'لوحات مكتب، باب وشركاء')}</li>
      <li>{t('gl_l2', 'Signalétique et enseignes en plexiglas', 'لافتات ويافطات بلكسي')}</li>
      <li>{t('gl_l3', 'Menus, présentoirs, numéros de table, QR codes pour restaurants et commerces', 'قوائم، حوامل عرض، أرقام طاولات وQR للمطاعم والمحلات')}</li>
      <li>{t('gl_l4', 'Décorations de mariage, prénoms découpés, cake toppers', 'ديكور أعراس، أسماء مقصوصة، زينة الكعك')}</li>
      <li>{t('gl_l5', 'Coffrets et objets en bois gravés pour cadeaux d’entreprise', 'علب وأشياء خشبية منقوشة لهدايا الشركات')}</li>
      <li>{t('gl_l6', 'Gravure sur cuir : porte-cartes, étiquettes, porte-clés', 'نقش على الجلد: حاملات بطاقات، ملصقات، ميداليات مفاتيح')}</li>
    </ul>
    {t('gl_h3', 'Matières', 'المواد', 'h3')}
    {t('gl_p1', 'Plexiglas transparent, coloré ou miroir · MDF · contreplaqué · bois massif fin · cuir · carton. Le métal ne se découpe pas au laser CO2 ; nous vous proposons alors une alternative.', 'بلكسي شفاف، ملوّن ولا مرآة · MDF · خشب معاكس · خشب رقيق · جلد · كرتون. المعدن ما يتقصش بليزر CO2؛ نقترحولك بديل.', 'p')}
    {t('gl_h3b', 'Vos fichiers', 'الملفات متاعك', 'h3')}
    {t('gl_p2', 'SVG, DXF, AI ou PDF vectoriel de préférence. Un logo en PNG ou une photo de croquis suffit : nous redessinons le fichier.', 'يفضل SVG، DXF، AI ولا PDF. شعار PNG ولا صورة رسم يكفي: نعاودو الملف.', 'p')}
  </div>
  <aside class="aside">
    {t('gl_price', 'Repères de prix', 'مؤشرات الأسعار', 'h3')}
    {check_list([('gl_i1', 'Plaque plexi gravée A4 : dès 25 TND', 'لوحة بلكسي منقوشة A4: من 25 د'), ('gl_i2', 'Prix dégressif pour les séries', 'سعر تنازلي للكميات'), ('gl_i3', 'Aperçu avant découpe', 'معاينة قبل القص'), ('gl_i4', 'Délai habituel : 2 à 3 jours', 'الأجل العادي: 2 إلى 3 أيام')])}
    <a class="btn primary block" href="/contact/?produit=D%C3%A9coupe#devis">{t('nav_devis', 'Demander un devis')}</a>
  </aside>
</div></section>''' + cta_band('gl_cta', 'Envoyez votre logo : on vous répond avec un aperçu et un prix.', 'ابعث الشعار متاعك: نجاوبوك بمعاينة وسعر.', 'D%C3%A9coupe')
page('/gravure-laser/', 'Découpe et gravure laser à Tunis · plexiglas, bois, cuir · FAZA 3D', 'قص ونقش بالليزر في تونس · FAZA 3D',
     'Découpe et gravure laser à Tunis : plaques gravées en plexiglas, signalétique, menus, présentoirs, décorations de mariage et cadeaux en bois. Devis sous 24 h.',
     laser, ld=service_ld('Découpe et gravure laser', '/gravure-laser/', 'Découpe et gravure laser sur plexiglas, MDF, bois, cuir et carton à Tunis.'))

# ================= IMPRESSION 3D =================
i3d = phead('nav_3d', 'Impression 3D', None, 'i3_h1', 'Impression 3D à Tunis', 'طباعة ثلاثية الأبعاد في تونس',
            'i3_lead', 'Pièces techniques, pièces de rechange introuvables, maquettes, prototypes, figurines et objets déco. Avec ou sans fichier : nous pouvons concevoir ou scanner la pièce.', 'قطع تقنية، قطع غيار ما تلقاهاش، مجسمات، نماذج أولية، تماثيل صغيرة وديكور. بملف ولا بلاش: نجمو نصممو ولا نمسحو القطعة.',
            f'<a class="btn primary" href="/#estimer">{t("i3_est", "Estimer le prix de mon fichier", "قدّر سعر الملف متاعي")}</a><a class="btn line" href="/contact/?produit=Pi%C3%A8ce#devis">{t("nav_devis", "Demander un devis")}</a>') + f'''
<section class="sec"><div class="wrap split">
  <div class="prose">
    {t('i3_h2', 'Matières et finitions', 'المواد والتشطيب', 'h2')}
    <ul>
      <li>{t('i3_m1', '<b>PLA</b> : objets déco, maquettes, figurines. Nombreuses couleurs, aspect soie ou marbre.', '<b>PLA</b>: ديكور، مجسمات، تماثيل. ألوان برشا، شكل حريري ولا رخامي.')}</li>
      <li>{t('i3_m2', '<b>PETG</b> : pièces solides et résistantes à l’humidité, usage extérieur.', '<b>PETG</b>: قطع صلبة تقاوم الرطوبة، للاستعمال الخارجي.')}</li>
      <li>{t('i3_m3', '<b>ABS</b> : pièces techniques qui supportent la chaleur.', '<b>ABS</b>: قطع تقنية تتحمل الحرارة.')}</li>
    </ul>
    {t('i3_p1', 'Nous travaillons sans peinture : la couleur vient de la matière elle-même, ce qui donne des pièces propres et durables.', 'نخدمو بلاش دهن: اللون جاي من المادة في روحها، والقطع تجي نظيفة وتدوم.', 'p')}
    {t('i3_h3', 'Maquettes et prototypes', 'مجسمات ونماذج أولية', 'h3')}
    {t('i3_p2', 'Maquettes d’architecture, modèles pédagogiques, modèles dentaires, boîtiers et prototypes de produits pour startups et bureaux d’études.', 'مجسمات معمارية، نماذج تعليمية، نماذج أسنان، علب ونماذج أولية للشركات الناشئة ومكاتب الدراسات.', 'p')}
    {t('i3_h3b', 'Scan 3D et reproduction', 'مسح ثلاثي الأبعاد واستنساخ', 'h3')}
    {t('i3_p3', 'Une pièce cassée ou introuvable ? Apportez-la : nous la mesurons ou la scannons, puis nous la reproduisons, à l’identique ou améliorée.', 'قطعة مكسورة ولا ما تتلقاش؟ جيبها: نقيسوها ولا نمسحوها، ومن بعد نعاودو نصنعوها كيف ما هي ولا خير.', 'p')}
  </div>
  <aside class="aside">
    {t('i3_files', 'Formats acceptés', 'الصيغ المقبولة', 'h3')}
    {check_list([('i3_f1', 'STL, 3MF, OBJ, STEP', 'STL، 3MF، OBJ، STEP'), ('i3_f2', 'Une photo ou un croquis coté', 'صورة ولا رسم بالقياسات'), ('i3_f3', 'Estimation instantanée sur la page d’accueil', 'تقدير فوري في الصفحة الرئيسية'), ('i3_f4', 'Dès 5 TND la pièce', 'من 5 د القطعة')])}
    <a class="btn primary block" href="/#estimer">{t('i3_est', 'Estimer le prix de mon fichier')}</a>
  </aside>
</div></section>''' + cta_band('i3_cta', 'Pas de fichier ? Envoyez une photo de la pièce sur WhatsApp.', 'ما عندكش ملف؟ ابعث صورة القطعة على واتساب.', 'Pi%C3%A8ce')
page('/impression-3d/', 'Impression 3D à Tunis · pièces, maquettes, prototypes · FAZA 3D', 'طباعة ثلاثية الأبعاد في تونس · FAZA 3D',
     'Impression 3D à Tunis en PLA, PETG et ABS : pièces techniques, pièces de rechange, maquettes, prototypes et scan 3D. Estimation instantanée de votre fichier STL.',
     i3d, ld=service_ld('Impression 3D', '/impression-3d/', 'Impression 3D PLA, PETG, ABS, maquettes, prototypes et scan 3D à Tunis.'))

# ================= CADEAUX =================
cad = phead('nav_cadeaux', 'Cadeaux personnalisés', None, 'ca_h1', 'Cadeaux personnalisés fabriqués à Tunis', 'هدايا مخصصة مصنوعة في تونس',
            'ca_lead', 'Un cadeau unique avec une photo, un prénom ou un logo : lampes lithophanes, porte-clés, plaques, coffrets gravés. Pour un anniversaire, un mariage, l’Aïd ou vos clients.', 'هدية فريدة بصورة، اسم ولا شعار: مصابيح ليثوفان، ميداليات مفاتيح، لوحات، علب منقوشة. لعيد ميلاد، عرس، العيد ولا لحرفائك.',
            f'<a class="btn primary" href="/boutique/">{t("nav_shop", "Boutique")}</a><a class="btn line" href="/contact/?produit=Cadeaux#devis">{t("nav_devis", "Demander un devis")}</a>') + f'''
<section class="sec"><div class="wrap">
  <div class="products" id="shopGrid" data-max="4"></div>
</div></section>
<section class="sec alt"><div class="wrap split">
  <div class="prose">
    {t('ca_h2', 'Idées selon l’occasion', 'أفكار حسب المناسبة', 'h2')}
    {t('ca_o1', 'Anniversaire et fête des mères', 'عيد ميلاد وعيد الأم', 'h3')}{t('ca_o1p', 'Lampe lithophane avec une photo de famille, plaque prénom pour une chambre d’enfant.', 'مصباح ليثوفان بصورة العائلة، لوحة بالاسم لبيت الصغار.', 'p')}
    {t('ca_o2', 'Mariage et fiançailles', 'عرس وخطوبة', 'h3')}{t('ca_o2p', 'Prénoms découpés, cake toppers, plaques d’accueil, petits cadeaux d’invités gravés à la date.', 'أسماء مقصوصة، زينة الكعك، لوحات استقبال، هدايا صغيرة للضيوف منقوشة بالتاريخ.', 'p')}
    {t('ca_o3', 'Ramadan et Aïd', 'رمضان والعيد', 'h3')}{t('ca_o3p', 'Décorations, coffrets et cadeaux personnalisés pour la famille.', 'ديكور، علب وهدايا مخصصة للعائلة.', 'p')}
    {t('ca_o4', 'Cadeaux d’entreprise', 'هدايا الشركات', 'h3')}{t('ca_o4p', 'Porte-clés au logo, plaques de remerciement, coffrets bois gravés, objets de bureau. Voir <a href="/entreprises-ecoles/">Entreprises et écoles</a>.', 'ميداليات بالشعار، لوحات شكر، علب خشب منقوشة، أدوات مكتب. شوف <a href="/entreprises-ecoles/">الشركات والمدارس</a>.', 'p')}
  </div>
  <aside class="aside">
    {t('ca_how', 'Comment ça se passe', 'كيفاش تصير', 'h3')}
    {check_list([('ca_i1', 'Vous envoyez la photo ou le texte', 'تبعث الصورة ولا النص'), ('ca_i2', 'Nous vous montrons l’aperçu', 'نوريولك المعاينة'), ('ca_i3', 'Fabrication en 2 à 4 jours', 'التصنيع في 2 إلى 4 أيام'), ('ca_i4', 'Emballage cadeau sur demande', 'تغليف هدية عند الطلب')])}
    <a class="btn wa block" data-wa href="/contact/">{WA_SVG}{t('ca_wa', 'Envoyer ma photo sur WhatsApp', 'ابعث الصورة على واتساب')}</a>
  </aside>
</div></section>
{ADD_DLG}'''
page('/cadeaux-personnalises/', 'Cadeaux personnalisés à Tunis · lampe photo, gravure, prénom · FAZA 3D', 'هدايا مخصصة في تونس · FAZA 3D',
     'Cadeaux personnalisés fabriqués à Tunis : lampe lithophane avec votre photo, porte-clés, plaques prénom, coffrets gravés pour mariage, Aïd et entreprises.',
     cad, scripts=['boutique.js'], ld=service_ld('Cadeaux personnalisés', '/cadeaux-personnalises/', 'Lampes lithophanes, porte-clés, plaques et coffrets gravés personnalisés à Tunis.'))

# ================= ENTREPRISES ET ÉCOLES =================
pro = phead('nav_pro', 'Entreprises et écoles', None, 'pr_h1', 'Entreprises, écoles et clubs : vos commandes en série', 'الشركات والمدارس والنوادي: طلبياتكم بالجملة',
            'pr_lead', 'Trophées, médailles, cadeaux clients, plaques et signalétique en quantité, avec un interlocuteur unique, un devis sous 24 h et une facture conforme.', 'كؤوس، ميداليات، هدايا للحرفاء، لوحات ولافتات بالكمية، مع شخص واحد يتابعك، عرض سعر في 24 ساعة وفاتورة قانونية.',
            f'<a class="btn primary" href="#devis">{t("pr_quote", "Demander un devis entreprise", "اطلب عرض سعر للشركة")}</a>') + f'''
<section class="sec"><div class="wrap">
  <div class="who">
    <div><b>{t('pr_w1', 'Prix dégressifs', 'أسعار تنازلية')}</b><span>{t('pr_w1p', 'Plus la série est grande, plus le prix unitaire baisse. Le devis détaille chaque palier.', 'كل ما الكمية تكبر، سعر القطعة ينقص. عرض السعر يفصّل كل مستوى.')}</span></div>
    <div><b>{t('pr_w2', 'Facture avec TVA', 'فاتورة بالأداء')}</b><span>{t('pr_w2p', 'Devis et factures au nom de votre société ou établissement, acceptés par les administrations.', 'عروض أسعار وفواتير باسم شركتك ولا مؤسستك، مقبولة في الإدارات.')}</span></div>
    <div><b>{t('pr_w3', 'Bon à tirer avant production', 'موافقة قبل الإنتاج')}</b><span>{t('pr_w3p', 'Vous validez l’aperçu (logo, couleurs, textes) avant le lancement de la série.', 'توافق على المعاينة (الشعار، الألوان، النصوص) قبل ما تبدا الكمية.')}</span></div>
    <div><b>{t('pr_w4', 'Date tenue', 'التاريخ محترم')}</b><span>{t('pr_w4p', 'Une date promise sur le devis et un lien de suivi pour voir l’avancement, étape par étape.', 'تاريخ مكتوب في عرض السعر ورابط متابعة تشوف بيه التقدم خطوة بخطوة.')}</span></div>
    <div><b>{t('pr_w5', 'Noms et numéros variables', 'أسماء وأرقام مختلفة')}</b><span>{t('pr_w5p', 'Un nom différent par trophée, badge ou plaque : envoyez simplement la liste.', 'اسم مختلف لكل كأس، شارة ولا لوحة: ابعث القائمة برك.')}</span></div>
    <div><b>{t('pr_w6', 'Livraison dans toute la Tunisie', 'توصيل لكامل تونس')}</b><span>{t('pr_w6p', 'Retrait à l’atelier dans le Grand Tunis ou envoi par transporteur.', 'استلام من الورشة في تونس الكبرى ولا إرسال بالناقل.')}</span></div>
  </div>
</div></section>
<section class="sec alt"><div class="wrap split">
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
page('/entreprises-ecoles/', 'Cadeaux d’entreprise, trophées et signalétique en série · FAZA 3D Tunis', 'هدايا الشركات وكؤوس ولافتات بالجملة · FAZA 3D',
     'Commandes en série pour entreprises, écoles et clubs en Tunisie : cadeaux clients gravés, trophées, médailles, plaques et signalétique. Prix dégressifs, facture avec TVA.',
     pro, scripts=['devis.js'], ld=service_ld('Commandes en série pour entreprises et écoles', '/entreprises-ecoles/', 'Cadeaux d’entreprise, trophées, plaques et signalétique en série.'))

# ================= RÉALISATIONS =================
page('/realisations/', 'Réalisations · trophées, plaques gravées, impression 3D · FAZA 3D', 'إنجازات · FAZA 3D',
     'Photos des pièces fabriquées à l’atelier FAZA 3D : trophées, plaques gravées, lampes photo, maquettes et prototypes.',
     phead('nav_real', 'Réalisations', None, 'r_title', 'Ce qui sort de l’atelier.', None, 'rl_lead', 'Quelques pièces fabriquées à Charguia. Vous voulez la même, ou une variante ? Envoyez la photo sur WhatsApp avec votre idée.', 'شوية قطع صنعناهم في الشرقية. تحب نفسها ولا حاجة قريبة؟ ابعث الصورة على واتساب مع الفكرة متاعك.') +
     f'<section class="sec"><div class="wrap">{gallery(8, True)}</div></section>' + cta_band('rl_cta', 'Un projet en tête ? Parlons-en.', 'عندك مشروع؟ نحكيو عليه.'))

# ================= TARIFS =================
rows = [('t1', 't1s', '5 TND', 't1d'), ('t2', 't2s', '25 TND', 't2d'), ('t3', 't3s', '55 TND', 't3d'), ('t4', 't4s', '60 TND', 't4d'), ('t5', 't5s', None, 't5d'), ('t6', 't6s', None, 't6d')]
TFR = {'t1': 'Porte-clés ou goodies imprimés en 3D', 't1s': 'dégressif dès 20 pièces', 't1d': '2 à 3 jours', 't2': 'Plaque gravée en plexiglas (format A4)', 't2s': 'logo, texte, support au choix', 't2d': '2 à 3 jours', 't3': 'Lampe lithophane avec votre photo', 't3s': 'avec socle lumineux', 't3d': '3 à 4 jours', 't4': 'Trophée hybride 25 cm (3D + plexi gravé)', 't4s': 'dégressif dès 10 pièces', 't4d': '4 à 7 jours', 't5': 'Pièce technique ou pièce de rechange', 't5s': 'selon volume de matière et temps machine', 't5d': '2 à 5 jours', 't6': 'Maquette d’architecture ou prototype', 't6s': 'conception incluse', 't6d': '1 à 3 semaines'}
tb = ''.join(f'<tr><td>{t(a, TFR[a])}<small>{t(b, TFR[b])}</small></td><td class="p">{p if p else t(a + "p", "Sur devis")}</td><td>{t(d, TFR[d])}</td></tr>' for a, b, p, d in rows)
page('/tarifs/', 'Tarifs impression 3D et gravure laser à Tunis · FAZA 3D', 'أسعار الطباعة ثلاثية الأبعاد والنقش بالليزر · FAZA 3D',
     'Tarifs indicatifs FAZA 3D : porte-clés dès 5 TND, plaque plexi gravée dès 25 TND, lampe photo dès 55 TND, trophée dès 60 TND. Devis gratuit sous 24 h.',
     phead('nav_tarifs', 'Tarifs', None, 't_title', 'Des prix clairs, un devis gratuit.', None, 't_lead', 'Le prix dépend de la taille, de la matière, de la quantité et de la finition. Voici des repères ; le devis précis est gratuit et sans engagement.', None) + f'''
<section class="sec"><div class="wrap">
  <div class="prices"><table><thead><tr><th>{t('t_h1', 'Produit')}</th><th>{t('t_h2', 'À partir de')}</th><th>{t('t_h3', 'Délai habituel')}</th></tr></thead><tbody>{tb}</tbody></table></div>
  {t('t_note', 'Prix TTC indicatifs, hors livraison. Conception facturée à l’heure lorsque vous n’avez pas de fichier.', None, 'p', 'class="note"')}
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px"><a class="btn primary" href="/trophees-medailles/#composer">{t('nav_compose', 'Composer mon trophée')}</a><a class="btn line" href="/#estimer">{t('i3_est', 'Estimer le prix de mon fichier')}</a></div>
</div></section>''' + cta_band('tf_cta', 'Besoin d’un prix exact ? Réponse sous 24 h.', 'تحب سعر دقيق؟ الجواب في 24 ساعة.'))

# ================= L'ATELIER =================
page('/a-propos/', 'L’atelier FAZA 3D · impression 3D et laser à Charguia, Ariana', 'ورشة FAZA 3D · الشرقية، أريانة',
     'FAZA 3D est l’atelier d’impression 3D et de gravure laser de Copy Store SARL à Charguia 2, Ariana : machines, matières et équipe.',
     phead('nav_about', 'L’atelier', None, 'ab_h1', 'Un atelier de fabrication à Charguia', 'ورشة تصنيع في الشرقية',
           'ab_lead', 'FAZA 3D est l’atelier de Copy Store SARL, dans la zone industrielle de Charguia 2. Nous concevons et fabriquons sur place, et chaque commande est suivie de l’idée à l’emballage.', 'FAZA 3D هي ورشة شركة Copy Store SARL في المنطقة الصناعية بالشرقية 2. نصممو ونصنعو في البلاصة، وكل طلبية متابعة من الفكرة حتى التغليف.') + f'''
<section class="sec"><div class="wrap split">
  <div class="prose">
    {t('ab_h2', 'Les machines', 'الآلات', 'h2')}
    <ul>
      <li>{t('ab_m1', '<b>Imprimantes 3D Bambu Lab P1S</b> : rapides et précises, elles tournent aussi la nuit pour les séries.', '<b>طابعات Bambu Lab P1S</b>: سريعة ودقيقة، تخدم حتى في الليل للكميات.')}</li>
      <li>{t('ab_m2', '<b>Machine de découpe et gravure laser CO2</b> : plexiglas, bois, MDF, cuir et carton.', '<b>آلة قص ونقش بالليزر CO2</b>: بلكسي، خشب، MDF، جلد وكرتون.')}</li>
      <li>{t('ab_m3', '<b>Finitions à la main</b> : ponçage, assemblage, socles en marbre ou en MDF, résine époxy pour médailles et plaques.', '<b>تشطيب باليد</b>: صنفرة، تركيب، قواعد رخام ولا MDF، ريزين إيبوكسي للميداليات واللوحات.')}</li>
    </ul>
    {t('ab_h3', 'Notre façon de travailler', 'طريقة خدمتنا', 'h3')}
    {t('ab_p1', 'Pas de peinture : nous choisissons parmi une large gamme de couleurs de filament pour des pièces nettes et durables. Avant chaque série, vous validez un aperçu. Pendant la fabrication, vous suivez l’avancement par un lien.', 'بلاش دهن: نختارو من برشا ألوان فيلامنت باش القطع تجي نظيفة وتدوم. قبل كل كمية توافق على معاينة. وقت التصنيع تتابع التقدم برابط.', 'p')}
  </div>
  <aside class="aside">
    {t('ab_team', 'L’équipe', 'الفريق', 'h3')}
    <ul>
      <li>{ic('user')}<span><b>Hamza Jedidi</b><br>{t('ab_t1', 'Gérant : devis, suivi des projets', 'المسيّر: عروض الأسعار ومتابعة المشاريع')}</span></li>
      <li>{ic('user')}<span><b>Khalil Abdelkefi</b><br>{t('ab_t2', 'Commercial et marketing', 'تجاري وتسويق')}</span></li>
      <li>{ic('user')}<span><b>Mohamed Aroua</b><br>{t('ab_t3', 'Technicien : production et finitions', 'تقني: الإنتاج والتشطيب')}</span></li>
    </ul>
    <a class="btn line block" href="/contact/">{t('ab_visit', 'Passer à l’atelier', 'تعدّا للورشة')}</a>
  </aside>
</div></section>''')

# ================= FAQ =================
QFR = {'q1': 'Je n’ai pas de fichier 3D, est-ce un problème ?', 'q1p': 'Non. Envoyez une photo, un croquis ou une description : nous concevons le modèle et vous l’envoyons pour validation avant fabrication. La conception est comptée dans le devis.',
       'q2': 'Quels formats de fichiers acceptez-vous ?', 'q2p': 'STL, 3MF, OBJ et STEP pour la 3D ; SVG, DXF, AI et PDF pour le laser ; PNG ou JPG en bonne qualité pour une gravure photo ou une lithophane.',
       'q3': 'Quel est le délai ?', 'q3p': 'Devis sous 24 h. Fabrication de 2 à 7 jours selon la quantité et la finition, plus longue pour les grandes séries et les maquettes. Nous vous donnons une date promise sur le devis et vous suivez l’avancement par un lien.',
       'q4': 'Comment payer ?', 'q4p': 'Acompte de 50 % à la commande, solde à la livraison. Espèces, virement, chèque ou D17. Facture avec TVA pour les entreprises et les administrations.',
       'q5': 'Livrez-vous ?', 'q5p': 'Retrait à l’atelier dans le Grand Tunis, livraison possible dans toute la Tunisie par transporteur (frais selon la destination).',
       'q6': 'Faites-vous des grandes séries ?', 'q6p': 'Oui : nos imprimantes tournent aussi la nuit et, avec le laser, nous produisons des séries de plusieurs centaines de pièces (trophées, médailles, goodies, plaques) avec un prix dégressif.'}
QNEW = [('q7', 'Comment fonctionne le panier ?', 'كيفاش تخدم السلة؟', 'q7p', 'Ajoutez vos produits, puis envoyez la commande avec votre nom et votre téléphone. Rien n’est payé en ligne : l’atelier vous rappelle pour confirmer le prix exact et la date, puis vous envoie un lien de suivi.', 'زيد المنتجات، ومن بعد ابعث الطلبية باسمك ونومرو تليفونك. ما تخلص شي على الخط: الورشة تكلمك باش تأكد السعر والتاريخ، ومن بعد تبعثلك رابط المتابعة.'),
        ('q8', 'Comment créer mon espace client ?', 'كيفاش نعمل حسابي؟', 'q8p', 'Après votre premier devis ou votre première commande, vous recevez un lien de suivi. Ouvrez « Mon espace », collez ce lien, choisissez un mot de passe : vous y retrouvez commandes, devis et factures.', 'بعد أول عرض سعر ولا أول طلبية يوصلك رابط متابعة. حلّ «حسابي»، الصق الرابط واختار كلمة سر: تلقى فيه الطلبيات وعروض الأسعار والفواتير.'),
        ('q9', 'Puis-je venir à l’atelier ?', 'نجم نجي للورشة؟', 'q9p', 'Oui, à Charguia 2 (Ariana), du lundi au vendredi de 9 h à 18 h et le samedi de 9 h à 13 h. Prévenez-nous sur WhatsApp pour que la bonne personne soit là.', 'إيه، في الشرقية 2 (أريانة)، من الإثنين للجمعة من 9 للـ 18 والسبت من 9 للـ 13. علّمنا على واتساب باش يكون الشخص المناسب موجود.')]
faq_html = ''.join(f'<details><summary>{t(k, QFR[k])}</summary>{t(k + "p", QFR[k + "p"], None, "p")}</details>' for k in ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'])
faq_html += ''.join(f'<details><summary>{t(k, fr, ar)}</summary>{t(kp, pfr, par, "p")}</details>' for k, fr, ar, kp, pfr, par in QNEW)
allq = [(QFR[k], QFR[k + 'p']) for k in ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']] + [(fr, pfr) for k, fr, ar, kp, pfr, par in QNEW]
page('/faq/', 'Questions fréquentes · impression 3D, gravure laser, délais, paiement · FAZA 3D', 'أسئلة شائعة · FAZA 3D',
     'Fichiers acceptés, délais, paiement, livraison, grandes séries, panier et espace client : les réponses de l’atelier FAZA 3D à Tunis.',
     phead('nav_faq', 'Questions fréquentes', None, 'q_title', 'Questions fréquentes', None, '', '', '') + f'<section class="sec"><div class="wrap"><div class="faq">{faq_html}</div></div></section>' + cta_band('fq_cta', 'Une autre question ? Écrivez-nous.', 'عندك سؤال آخر؟ اكتبلنا.'),
     ld={"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": "fr", "mainEntity": [{"@type": "Question", "name": a, "acceptedAnswer": {"@type": "Answer", "text": b}} for a, b in allq]})

# ================= CONTACT =================
page('/contact/', 'Contact et devis · FAZA 3D, Charguia 2, Ariana', 'اتصل بنا · FAZA 3D',
     'Contactez l’atelier FAZA 3D à Charguia 2, Ariana : +216 26 435 135, WhatsApp, e-mail. Demande de devis gratuite, réponse sous 24 h.',
     phead('nav_contact', 'Contact', None, 'd_title', 'Parlez-nous de votre projet.', None, '', '', '') +
     f'<section class="sec"><div class="wrap" id="devis-wrap"><div class="contact">{contact_info()}<div id="devis-box">{devis_form()}</div></div></div></section>',
     scripts=['devis.js'], ld=LD_BUSINESS)

# ================= 404 =================
p404 = f'''<section class="sec"><div class="wrap empty" style="text-align:start">{t('nf_h', 'Cette page n’existe pas (ou plus).', 'الصفحة هذي ما عادش موجودة.', 'h1')}{t('nf_p', 'Le site a changé : retrouvez nos services, la boutique et votre espace client depuis le menu.', 'الموقع تبدّل: تلقى الخدمات والمتجر وحسابك من القائمة.', 'p', 'class="lead"')}<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px"><a class="btn primary" href="/">{t('cr_home', 'Accueil')}</a><a class="btn line" href="/boutique/">{t('nav_shop', 'Boutique')}</a><a class="btn line" href="/contact/">{t('nav_contact', 'Contact')}</a></div></div></section>'''
page('/404.html', 'Page introuvable · FAZA 3D', 'الصفحة غير موجودة · FAZA 3D', 'Page introuvable.', p404, noindex=True)
