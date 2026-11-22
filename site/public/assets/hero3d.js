/* Accueil : vitrine 3D des produits FAZA 3D sur un plateau tournant.
   Quatre produits défilent (médaille, plaque plexi gravée, lampe lithophane, trophée hybride) ; chacun apparaît
   de bas en haut, comme sorti de l'imprimante. La fiche à côté donne la fabrication, le délai et le prix.
   Glisser fait tourner la vitrine ; ‹ › change de produit. Three.js r158 (global THREE). Sans WebGL : texte seul. */
(function () {
  var box = document.getElementById('hero3d'); if (!box) return;
  var cv = document.getElementById('heroCanvas');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tries = 0;
  function start() { if (window.THREE) { try { init(); } catch (e) { box.classList.add('nogl'); if (window.console) console.error(e); } } else if (tries++ < 100) setTimeout(start, 100); else box.classList.add('nogl'); }
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function sm(a, b, x) { var t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function $(id) { return document.getElementById(id); }
  function txt(k, fb) { var el = $('h3d_' + k); return el ? el.textContent : fb; }
  var KEYS = ['medaille', 'plaque', 'lampe', 'trophee'];

  function init() {
    var T = THREE, small = Math.min(innerWidth, innerHeight) < 700;
    var renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(small ? 1.5 : 1.75, devicePixelRatio || 1));
    renderer.localClippingEnabled = true;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = T.SRGBColorSpace;
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.1, 200);

    // ---------- studio : reflets doux (environnement PMREM) ----------
    (function () {
      var env = new T.Scene();
      env.add(new T.Mesh(new T.BoxGeometry(30, 16, 30), new T.MeshBasicMaterial({ color: 0x1a2333, side: T.BackSide })));
      function panel(w, h, c, k, x, y, z, ry, rx) { var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m); }
      panel(14, 6, 0xffffff, 3, 0, 7.9, 0, 0, Math.PI / 2);
      panel(3, 10, 0xffffff, 2.2, -14.9, 3, 2, Math.PI / 2);
      panel(2, 10, 0x4cb8ff, 1.1, 14.9, 2, -3, -Math.PI / 2);
      panel(12, 2, 0xffd8a0, 1.5, 0, 1, -14.9, 0);
      panel(10, 5, 0xffffff, 1.4, 2, 3, 14.9, Math.PI);
      var pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.035).texture; pm.dispose();
    })();
    var key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(3, 8, 6); scene.add(key);
    var warm = new T.PointLight(0xffb066, 0, 3, 1.5); warm.position.set(0, 1.1, 0); scene.add(warm);

    // ---------- textures dessinées ----------
    function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); if ('colorSpace' in t) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
    function radial(inner, outer) { return canvasTex(256, 256, function (g, w) { var r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, w, w); }); }
    var AR = function () { return document.documentElement.lang === 'ar'; };
    function fontT(size, w) { return AR() ? (w || 700) + ' ' + size + 'px Cairo, sans-serif' : (w || 700) + ' ' + size + 'px Poppins, "Open Sans", sans-serif'; }

    // ---------- sol et plateau tournant ----------
    var floor = new T.Mesh(new T.PlaneGeometry(14, 14), new T.MeshBasicMaterial({ map: radial('rgba(50,110,190,0.32)', 'rgba(5,8,13,0)'), transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.3; scene.add(floor);
    var stand = new T.Group(); scene.add(stand);
    var disc = new T.Mesh(new T.CylinderGeometry(1.7, 1.78, 0.18, 96), new T.MeshStandardMaterial({ color: 0x15191f, metalness: 0.6, roughness: 0.35 })); disc.position.y = -0.09; stand.add(disc);
    var ring = new T.Mesh(new T.TorusGeometry(1.74, 0.012, 8, 160), new T.MeshBasicMaterial({ color: 0x4cb8ff, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.02; stand.add(ring);
    var top = new T.Mesh(new T.CircleGeometry(1.68, 96), new T.MeshStandardMaterial({ color: 0x1d222b, metalness: 0.3, roughness: 0.6 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.002; stand.add(top);
    var shadow = new T.Mesh(new T.PlaneGeometry(2.6, 2.6), new T.MeshBasicMaterial({ map: radial('rgba(0,0,0,0.8)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.006; scene.add(shadow);
    var turn = new T.Group(); scene.add(turn);   // ce qui tourne : le produit

    // ---------- apparition « imprimée » : plan de coupe + liseré lumineux ----------
    var cut = new T.Plane(new T.Vector3(0, -1, 0), 99), band = new T.Plane(new T.Vector3(0, 1, 0), -98);
    var glowMat = new T.MeshBasicMaterial({ color: 0x9ddcff, clippingPlanes: [cut, band], side: T.DoubleSide, toneMapped: false });
    function M(o) { o.clippingPlanes = [cut]; return o; }
    function pla(color, metal, rough) {   // PLA avec lignes de couches visibles
      var m = new T.MeshStandardMaterial(M({ color: color, metalness: metal, roughness: rough, side: T.DoubleSide }));
      m.onBeforeCompile = function (sh) {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWY;').replace('#include <color_fragment>', '#include <color_fragment>\nfloat lf = fract(vWY / 0.016); diffuseColor.rgb *= 0.88 + 0.12 * smoothstep(0.0, 0.5, lf) * smoothstep(1.0, 0.5, lf);');
      };
      return m;
    }
    function glowOf(group) { var g = []; group.traverse(function (o) { if (o.isMesh && !o.userData.noGlow) { var c = new T.Mesh(o.geometry, glowMat); c.position.copy(o.position); c.rotation.copy(o.rotation); c.scale.copy(o.scale).multiplyScalar(1.004); g.push([o.parent, c]); } }); g.forEach(function (p) { p[0].add(p[1]); }); }
    var plexiMat = function () { return new T.MeshStandardMaterial(M({ color: 0xd8efff, metalness: 0.05, roughness: 0.05, transparent: true, opacity: 0.34, envMapIntensity: 2.2, side: T.DoubleSide })); };
    function engraving(w, h, draw) { var t = canvasTex(w, h, function (g) { g.fillStyle = 'rgba(240,248,255,.94)'; g.strokeStyle = 'rgba(240,248,255,.94)'; g.textAlign = 'center'; g.textBaseline = 'middle'; draw(g, w, h); }); return new T.MeshBasicMaterial(M({ map: t, transparent: true, depthWrite: false, side: T.DoubleSide })); }
    function star(R, r, n) { var s = new T.Shape(); for (var i = 0; i < n * 2; i++) { var a = Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } s.closePath(); return s; }

    var P = {}, texts = [];   // produits ; « texts » : ce qui se redessine quand la langue change

    // 1. médaille : disque or, étoile en relief, ruban bleu
    (function () {
      var g = new T.Group(), gold = pla(0xe2a93b, 0.82, 0.24);
      var coin = new T.Mesh(new T.CylinderGeometry(0.78, 0.78, 0.1, 96), gold); coin.rotation.x = Math.PI / 2; coin.position.y = 1.0; g.add(coin);
      var rim = new T.Mesh(new T.TorusGeometry(0.78, 0.05, 16, 96), gold); rim.position.y = 1.0; g.add(rim);
      var st = new T.Mesh(new T.ExtrudeGeometry(star(0.34, 0.15, 5), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }), gold); st.position.set(0, 1.08, 0.04); g.add(st);
      var face = new T.Mesh(new T.CircleGeometry(0.7, 64), null); face.position.set(0, 1.0, 0.052); g.add(face);
      function drawFace() { face.material = engraving(512, 512, function (c, w) { c.fillStyle = 'rgba(120,80,10,.55)'; c.font = fontT(58, 700); c.fillText('2026', w / 2, w * 0.8); c.font = fontT(40, 600); c.fillText(txt('e1', 'CHAMPION'), w / 2, w * 0.19); }); face.userData.noGlow = true; }
      drawFace(); texts.push(drawFace);
      var ribMat = new T.MeshStandardMaterial(M({ color: 0x1f5fd6, roughness: 0.6, metalness: 0.05, side: T.DoubleSide }));
      [-1, 1].forEach(function (s) { var r = new T.Mesh(new T.BoxGeometry(0.26, 1.05, 0.02), ribMat); r.position.set(s * 0.2, 2.18, -0.03); r.rotation.z = -s * 0.32; g.add(r); });
      var loop = new T.Mesh(new T.TorusGeometry(0.1, 0.03, 12, 32), gold); loop.position.set(0, 1.83, 0); g.add(loop);
      var foot = new T.Mesh(new T.CylinderGeometry(0.45, 0.5, 0.12, 48), pla(0x16181c, 0.15, 0.55)); foot.position.y = 0.06; g.add(foot);
      var arm = new T.Mesh(new T.BoxGeometry(0.06, 2.6, 0.06), pla(0x16181c, 0.15, 0.55)); arm.position.set(0, 1.35, -0.2); g.add(arm);
      var hook = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 0.24), pla(0x16181c, 0.15, 0.55)); hook.position.set(0, 2.62, -0.1); g.add(hook);
      P.medaille = g;
    })();

    // 2. plaque plexi gravée sur socle bois
    (function () {
      var g = new T.Group();
      var wood = canvasTex(512, 128, function (c, w, h) { c.fillStyle = '#8a5a33'; c.fillRect(0, 0, w, h); for (var i = 0; i < 40; i++) { c.strokeStyle = 'rgba(' + (60 + Math.random() * 40 | 0) + ',35,15,' + (0.15 + Math.random() * 0.25) + ')'; c.lineWidth = 1 + Math.random() * 3; c.beginPath(); var y = Math.random() * h; c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + Math.random() * 20 - 10, w * 0.7, y + Math.random() * 20 - 10, w, y + Math.random() * 10 - 5); c.stroke(); } });
      var base = new T.Mesh(new T.BoxGeometry(2.0, 0.28, 0.62), new T.MeshStandardMaterial(M({ map: wood, roughness: 0.65, metalness: 0.05 }))); base.position.y = 0.14; g.add(base);
      var panel = new T.Group(); panel.position.set(0, 0.26, 0.02); panel.rotation.x = -0.12; g.add(panel);
      var pl = new T.Mesh(new T.BoxGeometry(1.8, 1.25, 0.05), plexiMat()); pl.position.y = 0.66; panel.add(pl);
      var edge = new T.LineSegments(new T.EdgesGeometry(pl.geometry), new T.LineBasicMaterial(M({ color: 0xbfe6ff, transparent: true, opacity: 0.8 }))); edge.position.copy(pl.position); panel.add(edge);
      var eng = new T.Mesh(new T.PlaneGeometry(1.74, 1.2), null); eng.position.set(0, 0.66, 0.027); eng.userData.noGlow = true; panel.add(eng);
      function draw() { eng.material = engraving(1024, 704, function (c, w, h) { c.lineWidth = 8; c.beginPath(); c.arc(w / 2, 170, 70, 0, Math.PI * 2); c.stroke(); c.font = fontT(84, 700); c.fillText('F', w / 2, 176); c.font = fontT(150, 700); c.fillText(txt('e3', 'MERCI'), w / 2, 380, 940); c.font = fontT(60, 500); c.fillText(txt('e4', 'Partenaire 2026'), w / 2, 500, 940); c.fillRect(w / 2 - 170, 580, 340, 6); }); }
      draw(); texts.push(draw);
      P.plaque = g;
    })();

    // 3. lampe lithophane allumée (paysage « photo » en relief, lumière chaude)
    (function () {
      var g = new T.Group();
      var photo = canvasTex(1024, 512, function (c, w, h) {
        var sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#fff1dc'); sky.addColorStop(1, '#f3c88f'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
        c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(w * 0.7, h * 0.34, 60, 0, Math.PI * 2); c.fill();
        function hills(y, amp, col, seed) { c.fillStyle = col; c.beginPath(); c.moveTo(0, h); for (var x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x / 90 + seed) * amp + Math.sin(x / 37 + seed * 2) * amp * 0.3); c.lineTo(w, h); c.fill(); }
        hills(h * 0.58, 30, '#d9a66a', 1); hills(h * 0.7, 26, '#b9824a', 3); hills(h * 0.84, 18, '#8e5d30', 5);
        c.fillStyle = '#6b4321'; [[0.3, 0.78], [0.36, 0.77]].forEach(function (p, i) { var x = w * p[0], y = h * p[1]; c.beginPath(); c.arc(x, y - 46 - i * 6, 13, 0, Math.PI * 2); c.fill(); c.fillRect(x - 12, y - 34 - i * 6, 24, 50 + i * 6); });
        c.strokeStyle = '#7a4c26'; c.lineWidth = 3; [[0.55, 0.25], [0.6, 0.2], [0.5, 0.3]].forEach(function (p) { var x = w * p[0], y = h * p[1]; c.beginPath(); c.moveTo(x - 12, y); c.quadraticCurveTo(x - 6, y - 7, x, y); c.quadraticCurveTo(x + 6, y - 7, x + 12, y); c.stroke(); });
      });
      photo.wrapS = T.RepeatWrapping; photo.repeat.x = 1;
      var shade = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 1.5, 96, 1, true), new T.MeshStandardMaterial(M({ map: photo, emissiveMap: photo, emissive: 0xffa94d, emissiveIntensity: 1.1, roughness: 0.8, side: T.DoubleSide })));
      shade.position.y = 1.05; g.add(shade);
      var cap = new T.Mesh(new T.TorusGeometry(0.62, 0.025, 10, 96), pla(0xf2efe8, 0.1, 0.6)); cap.rotation.x = Math.PI / 2; cap.position.y = 1.8; g.add(cap);
      var base = new T.Mesh(new T.CylinderGeometry(0.72, 0.78, 0.3, 96), pla(0x16181c, 0.2, 0.5)); base.position.y = 0.15; g.add(base);
      var lip = new T.Mesh(new T.TorusGeometry(0.66, 0.03, 10, 96), new T.MeshBasicMaterial(M({ color: 0xffc27a, toneMapped: false }))); lip.rotation.x = Math.PI / 2; lip.position.y = 0.31; g.add(lip);
      P.lampe = g; P.lampe.userData.light = true;
    })();

    // 4. trophée hybride : socle imprimé (octogones noirs), plaque plexi en écusson gravée, étoile or imprimée
    (function () {
      var g = new T.Group(), black = pla(0x16181c, 0.15, 0.55), gold = pla(0xe2a93b, 0.82, 0.24);
      var b1 = new T.Mesh(new T.CylinderGeometry(0.95, 1.0, 0.26, 8), black); b1.position.y = 0.13; b1.rotation.y = Math.PI / 8; g.add(b1);
      var b2 = new T.Mesh(new T.CylinderGeometry(0.7, 0.78, 0.22, 8), black); b2.position.y = 0.37; b2.rotation.y = Math.PI / 8; g.add(b2);
      var bandG = new T.Mesh(new T.CylinderGeometry(0.785, 0.785, 0.04, 8), gold); bandG.position.y = 0.3; bandG.rotation.y = Math.PI / 8; g.add(bandG);
      var sh = new T.Shape(); sh.moveTo(-0.62, 0); sh.lineTo(0.62, 0); sh.lineTo(0.62, 1.05); sh.quadraticCurveTo(0.62, 1.55, 0, 1.78); sh.quadraticCurveTo(-0.62, 1.55, -0.62, 1.05); sh.closePath();
      var shieldGeo = new T.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false });
      var shield = new T.Mesh(shieldGeo, plexiMat()); shield.position.set(0, 0.48, -0.025); g.add(shield);
      var edge = new T.LineSegments(new T.EdgesGeometry(shieldGeo, 30), new T.LineBasicMaterial(M({ color: 0xbfe6ff, transparent: true, opacity: 0.85 }))); edge.position.copy(shield.position); g.add(edge);
      var eng = new T.Mesh(new T.PlaneGeometry(1.16, 1.0), null); eng.position.set(0, 1.08, 0.03); eng.userData.noGlow = true; g.add(eng);
      function draw() { eng.material = engraving(700, 600, function (c, w) { c.font = fontT(98, 700); c.fillText(txt('e1', 'CHAMPION'), w / 2, 250, 660); c.font = fontT(54, 500); c.fillText(txt('e2', 'Saison 2026'), w / 2, 360, 660); c.fillRect(w / 2 - 120, 430, 240, 6); }); }
      draw(); texts.push(draw);
      var st = new T.Mesh(new T.ExtrudeGeometry(star(0.3, 0.13, 5), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), gold); st.position.set(0, 2.55, -0.06); g.add(st);
      P.trophee = g;
    })();
    KEYS.forEach(function (k) { glowOf(P[k]); P[k].visible = false; turn.add(P[k]); });

    // ---------- mode « logo » : le F de FAZA 3D en relief, imprimé sous les yeux du visiteur ----------
    var LOGO = box.dataset.mode === 'logo', logo = null;
    if (LOGO) {
      logo = new T.Group(); turn.add(logo);
      var S = 0.0058;   // tracé relevé sur l'icône (pixels 512 × 512) → unités de la scène
      function shp(pts) { var sh = new T.Shape(); pts.forEach(function (p, j) { sh[j ? 'lineTo' : 'moveTo']((p[0] - 255) * S, (456 - p[1]) * S); }); sh.closePath(); return sh; }
      function part(pts, color, metal, rough, z, depth) {
        var geo = new T.ExtrudeGeometry(shp(pts), { depth: depth, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: 3, curveSegments: 4 });
        var mat = pla(color, metal, rough); mat.emissive = new T.Color(color).multiplyScalar(0.18); var m = new T.Mesh(geo, mat); m.position.z = z; logo.add(m); return m;
      }
      part([[162, 398], [107, 364], [94, 346], [94, 178], [100, 161], [158, 124], [289, 52], [306, 56], [403, 108], [330, 150], [299, 132], [290, 132], [166, 204], [162, 210]], 0x2f80ff, 0.12, 0.3, -0.16, 0.32);
      part([[246, 298], [228, 296], [194, 277], [190, 263], [196, 242], [212, 228], [255, 214], [415, 126], [416, 193], [410, 207]], 0x3cc8ff, 0.12, 0.28, -0.12, 0.32);
      part([[190, 306], [352, 268], [352, 352], [262, 400], [262, 456], [244, 454], [198, 428], [190, 416]], 0x7a8db0, 0.15, 0.34, -0.2, 0.32);
      glowOf(logo); logo.position.y = 0.06;
    }
    window.addEventListener('faza-lang', function () { texts.forEach(function (f) { f(); }); card(cur, true); });

    // ---------- fiche produit ----------
    var cur = 0, shownCard = -1;
    function card(i, force) {
      if (i === shownCard && !force) return; shownCard = i; var k = KEYS[i];
      $('pcIdx').textContent = (i + 1) + ' / ' + KEYS.length;
      $('pcName').textContent = txt(k + '_n', ''); $('pcTech').textContent = txt(k + '_t', ''); $('pcDelay').textContent = txt(k + '_d', ''); $('pcPrice').textContent = txt(k + '_p', '');
      var l = $('pcl_' + k); if (l) $('pcLink').setAttribute('href', l.dataset.href);
    }

    // ---------- interaction : glisser pour tourner, ‹ › pour changer ----------
    var yaw = 0, yawT = 0, drag = null;
    cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, yaw: yawT, h: false }; });
    addEventListener('pointermove', function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.h && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) drag.h = true; if (drag.h) yawT = drag.yaw + dx * 0.008; });
    addEventListener('pointerup', function () { drag = null; }); addEventListener('pointercancel', function () { drag = null; });
    var D = 6.5, t0 = performance.now();   // durée d'un produit (s)
    function go(d) { var n = ((cur + d) % 4 + 4) % 4; t0 = performance.now() - n * D * 1000; if (reduce) { frame((n + 0.5) * D); renderer.render(scene, cam); } else loop(); }
    $('pcPrev').addEventListener('click', function () { go(-1); }); $('pcNext').addEventListener('click', function () { go(1); });

    // ---------- dimensions, visibilité ----------
    var stage = cv.parentElement, W = 0, Hh = 0, split = box.classList.contains('split');
    function size() { W = stage.clientWidth; Hh = stage.clientHeight; if (!W || !Hh) return; renderer.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix(); }
    addEventListener('resize', size); size();
    var visible = true; new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) loop(); }).observe(box);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loop(); });

    // ---------- une image ----------
    var look = new T.Vector3(0, 1.3, 0);
    var LC = 18;   // mode logo : un cycle (impression, présentation, effacement) en secondes
    function frameLogo(el) {
      var e = reduce ? 6 : el % LC, rise = sm(0.3, 3.6, e), fall = sm(LC - 0.9, LC, e), H = 2.45;
      var h = fall > 0 ? H * (1 - fall) : H * rise;
      cut.constant = (rise >= 1 && fall === 0) ? 99 : h + 0.06; band.constant = -(h + 0.06 - 0.035);
      glowMat.visible = (rise < 1 || fall > 0) && h > 0.01;
      logo.position.y = 0.06 + (rise >= 1 && !reduce ? Math.sin(el * 1.1) * 0.04 : 0);
      yaw += (yawT - yaw) * 0.08;
      turn.rotation.y = (reduce ? 0.35 : Math.sin(el * 0.42) * 0.55) + yaw;
      var narrow = innerWidth < 861, dist = narrow ? 8.6 : split ? 8.8 : 8.0, rtl = document.documentElement.dir === 'rtl';
      cam.position.set(Math.sin(0.18) * dist, 2.3, Math.cos(0.18) * dist);
      cam.setViewOffset(W, Hh, narrow || split ? 0 : (rtl ? 1 : -1) * W * 0.17, narrow ? Hh * 0.04 : 0, W, Hh);
      look.set(0, 1.25, 0); cam.lookAt(look);
    }
    function frame(el) {
      if (LOGO) return frameLogo(el);
      var n = Math.floor(el / D), k = (el % D) / D, i = ((n % 4) + 4) % 4; cur = i;
      KEYS.forEach(function (kk, j) { P[kk].visible = j === i; });
      var rise = reduce ? 1 : sm(0, 0.22, k), fall = reduce ? 0 : sm(0.9, 1, k), H = 2.95;
      // apparition : de bas en haut ; disparition : de haut en bas
      var h = fall > 0 ? H * (1 - fall) : H * rise;
      cut.constant = (rise >= 1 && fall === 0) ? 99 : h; band.constant = -(h - 0.035);
      glowMat.visible = (rise < 1 || fall > 0) && h > 0.01;
      warm.intensity = P[KEYS[i]].userData.light ? 2.2 * (rise >= 1 ? 1 : rise) * (1 - fall) : 0;
      yaw += (yawT - yaw) * 0.08;
      turn.rotation.y = (reduce ? 0.35 : Math.sin(el * 0.45) * 0.75) + yaw;
      var narrow = innerWidth < 861, dist = narrow ? 9.4 : split ? 10.4 : 8.6, orb = 0.22;
      cam.position.set(Math.sin(orb) * dist, 2.7, Math.cos(orb) * dist); cam.lookAt(look);
      var rtl = document.documentElement.dir === 'rtl';
      // grand écran : la scène s'écarte du texte (A) ou de la fiche produit (B) ; téléphone : elle remonte au-dessus de la fiche
      cam.setViewOffset(W, Hh, narrow ? 0 : (split ? (rtl ? -1 : 1) * W * 0.2 : (rtl ? 1 : -1) * W * 0.17), narrow ? Hh * 0.1 : 0, W, Hh);
      cam.lookAt(look);
      card(i); var bar = $('pcBar'); if (bar) bar.style.width = Math.round(k * 100) + '%';
    }
    var running = false;
    function loop() {
      if (running || reduce) { if (reduce) { frame((cur + 0.5) * D); renderer.render(scene, cam); } return; }
      running = true;
      requestAnimationFrame(function tick(now) {
        if (!visible || document.hidden || window.__hero3dPaused) { running = false; return; }
        frame((now - t0) / 1000); renderer.render(scene, cam); requestAnimationFrame(tick);
      });
    }
    if (LOGO) { frame(0); renderer.render(scene, cam); if (!reduce) { t0 = performance.now(); loop(); } }
    else { frame(0.5 * D); renderer.render(scene, cam); if (!reduce) { t0 = performance.now() - 0.3 * D * 1000; loop(); } }
    box.classList.add('ready');
    window.__hero3dFrame = function (k, c) { window.__hero3dPaused = true; frame(LOGO ? k * LC : ((c || 0) + k) * D); renderer.render(scene, cam); };   // pour les captures de test
  }
  start();
})();
