/* Accueil : le « F » du logo FAZA 3D imprimé en 3D, en boucle (≈ 14 s).
   1. la tête d'impression monte le F couche par couche sur le plateau (haut bleu, bas gris ardoise, comme le logo) ;
   2. la tête s'efface, le F tourne sous la lumière ; 3. il se « dissout » et le cycle repart.
   Glisser fait tourner la scène. Three.js r158 (global THREE). Sans WebGL : texte seul. */
(function () {
  var box = document.getElementById('hero3d'); if (!box) return;
  var cv = document.getElementById('heroCanvas');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tries = 0;
  function start() { if (window.THREE) { try { init(); } catch (e) { box.classList.add('nogl'); if (window.console) console.error(e); } } else if (tries++ < 100) setTimeout(start, 100); else box.classList.add('nogl'); }
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function sm(a, b, x) { var t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function $(id) { return document.getElementById(id); }

  function init() {
    var T = THREE, small = Math.min(innerWidth, innerHeight) < 700;
    var renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(small ? 1.5 : 1.75, devicePixelRatio || 1));
    renderer.localClippingEnabled = true;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = T.SRGBColorSpace;
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.1, 200);

    // ---------- studio (reflets) ----------
    (function () {
      var env = new T.Scene();
      env.add(new T.Mesh(new T.BoxGeometry(30, 16, 30), new T.MeshBasicMaterial({ color: 0x1a2333, side: T.BackSide })));
      function panel(w, h, c, k, x, y, z, ry, rx) { var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m); }
      panel(14, 6, 0xffffff, 3, 0, 7.9, 0, 0, Math.PI / 2);
      panel(3, 10, 0xffffff, 2.2, -14.9, 3, 2, Math.PI / 2);
      panel(2, 10, 0x4cb8ff, 1.6, 14.9, 2, -3, -Math.PI / 2);
      panel(12, 2, 0xffd8a0, 1.2, 0, 1, -14.9, 0);
      panel(10, 5, 0xffffff, 1.4, 2, 3, 14.9, Math.PI);
      var pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.035).texture; pm.dispose();
    })();
    var key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(3, 8, 6); scene.add(key);
    var hot = new T.PointLight(0x4cb8ff, 0, 2.5, 1.6); scene.add(hot);

    function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); if ('colorSpace' in t) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
    function radial(inner, outer) { return canvasTex(256, 256, function (g, w) { var r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, w, w); }); }

    // ---------- plateau d'impression (PEI texturé) ----------
    var plateTex = canvasTex(1024, 1024, function (g, w) {
      g.fillStyle = '#1b1f26'; g.fillRect(0, 0, w, w);
      for (var i = 0; i < 26000; i++) { var v = 24 + Math.random() * 22 | 0; g.fillStyle = 'rgb(' + v + ',' + (v + 3) + ',' + (v + 8) + ')'; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); }
      g.strokeStyle = 'rgba(120,150,190,.16)'; g.lineWidth = 1; for (var k = 1; k < 8; k++) { var p = k * w / 8; g.beginPath(); g.moveTo(p, 18); g.lineTo(p, w - 18); g.moveTo(18, p); g.lineTo(w - 18, p); g.stroke(); }
      g.strokeStyle = 'rgba(160,190,230,.35)'; g.lineWidth = 3; g.strokeRect(18, 18, w - 36, w - 36);
    });
    var floor = new T.Mesh(new T.PlaneGeometry(14, 14), new T.MeshBasicMaterial({ map: radial('rgba(50,110,190,0.32)', 'rgba(5,8,13,0)'), transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.4; scene.add(floor);
    var metal = new T.MeshStandardMaterial({ color: 0x8b96a8, metalness: 0.9, roughness: 0.35, transparent: true });
    var bedTop = new T.MeshStandardMaterial({ map: plateTex, metalness: 0.25, roughness: 0.75, transparent: true });
    var bed = new T.Mesh(new T.BoxGeometry(3.6, 0.07, 3.6), [metal, metal, bedTop, metal, metal, metal]); bed.position.y = -0.035; scene.add(bed);
    var bedBase = new T.Mesh(new T.BoxGeometry(3.8, 0.14, 3.8), new T.MeshStandardMaterial({ color: 0x14181f, metalness: 0.6, roughness: 0.5, transparent: true })); bedBase.position.y = -0.14; scene.add(bedBase);
    var shadow = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), new T.MeshBasicMaterial({ map: radial('rgba(0,0,0,0.75)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; scene.add(shadow);

    // ---------- matières : PLA avec lignes de couches ; haut du F en dégradé bleu ----------
    var cut = new T.Plane(new T.Vector3(0, -1, 0), 0), band = new T.Plane(new T.Vector3(0, 1, 0), 0);
    function pla(opt, grad) {
      opt.clippingPlanes = [cut]; opt.side = T.DoubleSide; var m = new T.MeshStandardMaterial(opt);
      m.onBeforeCompile = function (sh) {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <color_fragment>',
          '#include <color_fragment>\n' + (grad ? 'diffuseColor.rgb = mix(vec3(0.01,0.13,0.85), vec3(0.02,0.55,0.95), clamp((vWP.y - 1.2) / 1.9 + vWP.x * 0.12, 0.0, 1.0));\n' : '') +
          'float lf = fract(vWP.y / 0.016); diffuseColor.rgb *= 0.86 + 0.14 * smoothstep(0.0, 0.5, lf) * smoothstep(1.0, 0.5, lf);');
      };
      m.customProgramCacheKey = function () { return grad ? 'faza-grad' : 'faza-plain'; };   // sinon three.js réutilise le même shader pour les deux
      return m;
    }
    var blueMat = pla({ color: 0x1e7bff, metalness: 0.12, roughness: 0.3, envMapIntensity: 0.9 }, true);
    var slateMat = pla({ color: 0x3c4a63, metalness: 0.1, roughness: 0.42, envMapIntensity: 0.8 }, false);
    var glowMat = new T.MeshBasicMaterial({ color: 0x9ddcff, clippingPlanes: [cut, band], side: T.DoubleSide, toneMapped: false });

    // ---------- le F (profil du logo, extrudé) ----------
    function rounded(pts, r) {   // polygone aux coins arrondis
      var s = new T.Shape(), n = pts.length;
      for (var i = 0; i < n; i++) {
        var p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
        var d1 = Math.hypot(a[0] - p[0], a[1] - p[1]), d2 = Math.hypot(b[0] - p[0], b[1] - p[1]), rr = Math.min(r, d1 / 2, d2 / 2);
        var p1 = [p[0] + (a[0] - p[0]) / d1 * rr, p[1] + (a[1] - p[1]) / d1 * rr], p2 = [p[0] + (b[0] - p[0]) / d2 * rr, p[1] + (b[1] - p[1]) / d2 * rr];
        if (i === 0) s.moveTo(p1[0], p1[1]); else s.lineTo(p1[0], p1[1]);
        s.quadraticCurveTo(p[0], p[1], p2[0], p2[1]);
      }
      s.closePath(); return s;
    }
    var ext = { depth: 0.62, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 10 };
    // haut : barre du haut + dos (forme en C), barre du milieu à part, comme sur le logo
    var top = rounded([[0, 1.32], [0.62, 1.32], [0.62, 2.42], [2.2, 2.42], [2.2, 3.0], [0, 3.0]], 0.16);
    var mid = rounded([[0.78, 1.32], [2.2, 1.32], [2.2, 1.9], [0.78, 1.9]], 0.14);
    var low = rounded([[0, 0], [0.62, 0], [0.62, 0.62], [1.3, 0.9], [1.3, 1.18], [0, 1.18]], 0.12);
    var F = new T.Group(); scene.add(F);
    var inner = new T.Group(); inner.position.set(-1.1, 0.04, -0.31); F.add(inner);
    [[top, blueMat], [mid, blueMat], [low, slateMat]].forEach(function (p) {
      var g = new T.ExtrudeGeometry(p[0], ext);
      inner.add(new T.Mesh(g, p[1]));
      var gl = new T.Mesh(g, glowMat); gl.scale.setScalar(1.003); inner.add(gl);
    });
    var H = 3.08;

    // ---------- tête d'impression et portique ----------
    var dark = new T.MeshStandardMaterial({ color: 0x1e232b, metalness: 0.5, roughness: 0.4 });
    var head = new T.Group(); scene.add(head);
    var shell = new T.Mesh(new T.BoxGeometry(0.52, 0.5, 0.44), dark); shell.position.y = 0.42; head.add(shell);
    var led = new T.Mesh(new T.BoxGeometry(0.3, 0.025, 0.012), new T.MeshBasicMaterial({ color: 0x4cb8ff, toneMapped: false })); led.position.set(0, 0.3, 0.226); head.add(led);
    var block = new T.Mesh(new T.BoxGeometry(0.18, 0.12, 0.18), new T.MeshStandardMaterial({ color: 0xa7b0bd, metalness: 0.9, roughness: 0.3 })); block.position.y = 0.12; head.add(block);
    var noz = new T.Mesh(new T.ConeGeometry(0.05, 0.1, 20), new T.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.25 })); noz.rotation.x = Math.PI; noz.position.y = 0.03; head.add(noz);
    var rodMat = new T.MeshStandardMaterial({ color: 0x0f1216, metalness: 0.4, roughness: 0.35 });
    var rodA = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 4.4, 12), rodMat); rodA.rotation.z = Math.PI / 2; scene.add(rodA);
    var rodB = rodA.clone(); scene.add(rodB);
    var carL = new T.Mesh(new T.BoxGeometry(0.22, 0.2, 0.62), dark), carR = carL.clone(); scene.add(carL); scene.add(carR);

    // largeur de la couche en cours (pour le va-et-vient de la buse)
    function spanAt(y) { if (y < 1.18) return y < 0.62 ? [0, 0.62] : [0, 1.3]; if (y < 1.32) return [0, 0.62]; if (y < 1.9) return [0, 2.2]; if (y < 2.42) return [0, 0.62]; return [0, 2.2]; }

    // ---------- panneau « machine » ----------
    var hPh = $('hudPhase'), hMat = $('hudMat'), hLay = $('hudLayer'), hTmp = $('hudTemp'), hBar = $('hudBar'), lastHud = '';
    function hud(phase, k) {
      if (!hPh) return; var layer = Math.max(1, Math.round(k * 154)), s = phase + '|' + layer;
      if (s === lastHud) return; lastHud = s;
      hPh.textContent = phase === 0 ? tr('h3_print', 'Impression 3D en cours') : tr('h3_done', 'Contrôle qualité : validé');
      hMat.textContent = tr('h3_matF', 'PLA soie bleu et gris');
      hLay.textContent = (phase === 0 ? layer : 154) + ' / 154';
      hTmp.textContent = '220 °C · 55 °C';
      hBar.style.width = (phase === 0 ? Math.round(k * 100) : 100) + '%';
    }

    // ---------- interaction ----------
    var yaw = 0, yawT = 0, drag = null;
    cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, yaw: yawT, h: false }; });
    addEventListener('pointermove', function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.h && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) drag.h = true; if (drag.h) yawT = drag.yaw + dx * 0.007; });
    addEventListener('pointerup', function () { drag = null; }); addEventListener('pointercancel', function () { drag = null; });

    var stage = cv.parentElement, W = 0, Hh = 0, split = box.classList.contains('split');
    function size() { W = stage.clientWidth; Hh = stage.clientHeight; if (!W || !Hh) return; renderer.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix(); }
    addEventListener('resize', size); size();
    var visible = true; new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) loop(); }).observe(box);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loop(); });

    // ---------- une image du cycle ----------
    var D = 14, look = new T.Vector3();
    function frame(t, clock) {
      var printK = sm(0.03, 0.58, t), lift = sm(0.58, 0.64, t), show = sm(0.64, 0.96, t), out = sm(0.96, 1, t);
      var h = printK * H;
      cut.constant = out > 0 ? H * (1 - out) + 0.05 : (printK >= 1 ? 99 : h + 0.04); band.constant = -(h + 0.04 - 0.035);
      glowMat.visible = printK > 0 && printK < 1;
      // buse : va-et-vient sur la largeur de la couche en cours, puis la tête monte hors champ
      var sp = spanAt(Math.min(h, H - 0.01)), s = (Math.sin(clock * 9) + 1) / 2, zz = Math.sin(clock * 2.3) * 0.28;
      var lx = lerp(sp[0], sp[1], s), hx = -1.1 + lx, hz = zz;
      var base = new T.Vector3(hx, 0, hz).applyAxisAngle(new T.Vector3(0, 1, 0), F.rotation.y);
      var hy = lerp(h + 0.06, 5, lift);
      head.position.set(base.x, hy, base.z); head.visible = lift < 1;
      rodA.position.set(0, hy + 0.42, base.z - 0.12); rodB.position.set(0, hy + 0.42, base.z + 0.12);
      carL.position.set(-2.2, hy + 0.42, base.z); carR.position.set(2.2, hy + 0.42, base.z);
      [rodA, rodB, carL, carR].forEach(function (o) { o.visible = lift < 1; });
      hot.position.set(base.x, h + 0.15, base.z); hot.intensity = printK > 0 && printK < 1 ? 2.2 : 0;
      // présentation : le F tourne, le plateau s'efface un peu
      yaw += (yawT - yaw) * 0.08;
      F.rotation.y = -0.55 + show * Math.PI * 2 + yaw;
      var fade = 1 - 0.75 * sm(0.62, 0.7, t) * (1 - out);
      metal.opacity = bedTop.opacity = bedBase.material.opacity = fade;
      var narrow = innerWidth < 861, dist = (narrow ? 11 : split ? 11.2 : 9.8) - 1.2 * show * (1 - out), orb = 0.28 + (reduce ? 0 : Math.sin(clock * 0.15) * 0.15);
      cam.position.set(Math.sin(orb) * dist, 3.3 - 0.5 * show, Math.cos(orb) * dist);
      look.set(0, 1.45, 0); cam.lookAt(look);
      var rtl = document.documentElement.dir === 'rtl';
      cam.setViewOffset(W, Hh, narrow ? 0 : (split ? 0 : (rtl ? 1 : -1) * W * 0.17), narrow ? Hh * 0.04 : 0, W, Hh);
      cam.lookAt(look);
      hud(t < 0.6 ? 0 : 1, printK);
    }
    var t0 = performance.now(), running = false;
    function loop() {
      if (running || reduce) return; running = true;
      requestAnimationFrame(function tick(now) {
        if (!visible || document.hidden || window.__hero3dPaused) { running = false; return; }
        var el = (now - t0) / 1000; frame((el % D) / D, el); renderer.render(scene, cam); requestAnimationFrame(tick);
      });
    }
    if (reduce) { frame(0.8, 0); renderer.render(scene, cam); } else { frame(0.02, 0); renderer.render(scene, cam); loop(); }
    box.classList.add('ready');
    window.__hero3dFrame = function (k) { window.__hero3dPaused = true; frame(k, k * D); renderer.render(scene, cam); };
  }
  start();
})();
