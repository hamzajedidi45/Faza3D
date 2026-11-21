/* Accueil : « L'atelier en 3D ». En faisant défiler la page, un trophée s'imprime couche par couche,
   sa plaque en plexiglas est gravée au laser, puis les deux pièces s'assemblent. Three.js (déjà chargé pour
   l'estimation 3D). Sans WebGL : les trois étapes restent lisibles en texte. */
(function () {
  var sec = document.getElementById('story'); if (!sec) return;
  var cv = document.getElementById('storyCanvas'), steps = sec.querySelectorAll('[data-step]'), hud = document.getElementById('storyHud');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tries = 0;
  function start() { if (window.THREE) init(); else if (tries++ < 80) setTimeout(start, 120); else sec.classList.add('nogl'); }
  function sm(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function init() {
    var T = THREE, renderer;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { sec.classList.add('nogl'); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.localClippingEnabled = true;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = T.SRGBColorSpace;
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(36, 1, 0.1, 100);
    scene.fog = new T.Fog(0x071226, 9, 22);

    // lumières
    scene.add(new T.HemisphereLight(0xcfe6ff, 0x0b1630, 0.9));
    var key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(4, 7, 5); scene.add(key);
    var rim = new T.DirectionalLight(0x4cb8ff, 1.1); rim.position.set(-5, 3, -4); scene.add(rim);
    var hot = new T.PointLight(0x4cb8ff, 0, 2.2); scene.add(hot);
    var spark = new T.PointLight(0xff6a3d, 0, 1.6); scene.add(spark);

    // imprimante : plateau, grille, cadre du caisson
    var printer = new T.Group(); scene.add(printer);
    var bed = new T.Mesh(new T.BoxGeometry(2.8, 0.08, 2.8), new T.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.6, metalness: 0.4 }));
    bed.position.y = -0.04; printer.add(bed);
    var grid = new T.GridHelper(2.8, 28, 0x2f6fb0, 0x1d3556); grid.position.y = 0.002; printer.add(grid);
    var frameMat = new T.LineBasicMaterial({ color: 0x4cb8ff, transparent: true, opacity: 0.35 });
    var frame = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(3.4, 3.2, 3.4)), frameMat); frame.position.y = 1.56; printer.add(frame);
    var railMat = new T.MeshStandardMaterial({ color: 0x8796af, metalness: 0.8, roughness: 0.3, transparent: true });
    var railX = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 3.3, 10), railMat); railX.rotation.z = Math.PI / 2; printer.add(railX);
    var railX2 = railX.clone(); printer.add(railX2);

    // le trophée : profil tourné (socle, tige, coupe) + deux anses
    var P = [[0, 0], [0.62, 0], [0.62, 0.07], [0.56, 0.1], [0.5, 0.27], [0.17, 0.31], [0.115, 0.42], [0.1, 0.84], [0.17, 0.95], [0.36, 1.1], [0.5, 1.33], [0.58, 1.66], [0.62, 2.0], [0.57, 2.0], [0.53, 1.68], [0.45, 1.37], [0.3, 1.2], [0, 1.16]];
    var H = 2.0, OUTER = P.slice(0, 13);
    function radiusAt(y) { for (var i = 1; i < OUTER.length; i++) if (y <= OUTER[i][1]) { var a = OUTER[i - 1], b = OUTER[i], t = b[1] === a[1] ? 1 : (y - a[1]) / (b[1] - a[1]); return lerp(a[0], b[0], t); } return 0.6; }
    var cut = new T.Plane(new T.Vector3(0, -1, 0), 0), under = new T.Plane(new T.Vector3(0, 1, 0), 0);
    var pla = new T.MeshStandardMaterial({ color: 0xd9ac3f, roughness: 0.5, metalness: 0.25, clippingPlanes: [cut], side: T.DoubleSide });
    var glow = new T.MeshBasicMaterial({ color: 0x7fd3ff, clippingPlanes: [cut, under], side: T.DoubleSide });
    var trophy = new T.Group(); scene.add(trophy);
    function part(geo, setup) { [pla, glow].forEach(function (m) { var mesh = new T.Mesh(geo, m); if (setup) setup(mesh); if (m === glow) mesh.scale.multiplyScalar(1.004); trophy.add(mesh); }); }
    part(new T.LatheGeometry(P.map(function (p) { return new T.Vector2(p[0], p[1]); }), 72));
    [-1, 1].forEach(function (s) { part(new T.TorusGeometry(0.25, 0.045, 14, 40, Math.PI), function (m) { m.rotation.z = -s * Math.PI / 2; m.position.set(s * 0.6, 1.56, 0); }); });

    // tête d'impression
    var head = new T.Group(); scene.add(head);
    var body = new T.Mesh(new T.BoxGeometry(0.34, 0.26, 0.34), new T.MeshStandardMaterial({ color: 0x232a36, roughness: 0.5, metalness: 0.3 })); body.position.y = 0.2; head.add(body);
    var fan = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.02, 24), new T.MeshStandardMaterial({ color: 0x4cb8ff, emissive: 0x0a3a66 })); fan.rotation.x = Math.PI / 2; fan.position.set(0, 0.2, 0.175); head.add(fan);
    var nozzle = new T.Mesh(new T.ConeGeometry(0.045, 0.1, 16), new T.MeshStandardMaterial({ color: 0xc8963e, metalness: 0.9, roughness: 0.25 })); nozzle.rotation.x = Math.PI; nozzle.position.y = 0.05; head.add(nozzle);

    // plaque en plexiglas + gravure laser (texture dessinée au fil de la gravure)
    var plate = new T.Group(); scene.add(plate);
    var plexi = new T.Mesh(new T.BoxGeometry(1.1, 0.04, 0.62), new T.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.42, roughness: 0.1, metalness: 0.1 })); plate.add(plexi);
    var tc = document.createElement('canvas'); tc.width = 1024; tc.height = 576; var tx = tc.getContext('2d');
    var tex = new T.CanvasTexture(tc); if ('colorSpace' in tex) tex.colorSpace = T.SRGBColorSpace;
    var engr = new T.Mesh(new T.PlaneGeometry(1.06, 0.6), new T.MeshBasicMaterial({ map: tex, transparent: true })); engr.rotation.x = -Math.PI / 2; engr.position.y = 0.022; plate.add(engr);
    var laserHead = new T.Mesh(new T.BoxGeometry(0.16, 0.14, 0.16), new T.MeshStandardMaterial({ color: 0x2b3342, metalness: 0.4, roughness: 0.4 })); scene.add(laserHead);
    var beam = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 1, 8), new T.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.85 })); scene.add(beam);
    var PLATE_FLAT = new T.Vector3(2.9, 0.06, 0.9), PLATE_ON = new T.Vector3(0, 0.3, 0.7);
    var lastEng = -1, lines = [];
    function engrave(k) {
      if (Math.abs(k - lastEng) < 0.004 && k !== 1) return; lastEng = k;
      lines = [txt('l1'), txt('l2')];
      tx.clearRect(0, 0, 1024, 576);
      tx.save(); tx.beginPath(); tx.rect(0, 0, 1024 * k, 576); tx.clip();
      tx.fillStyle = 'rgba(255,255,255,.92)'; tx.textAlign = 'center';
      tx.font = '800 150px "Bricolage Grotesque", Manrope, sans-serif'; tx.fillText(lines[0], 512, 270, 940);
      tx.font = '600 80px Manrope, sans-serif'; tx.fillText(lines[1], 512, 390, 940);
      tx.fillRect(312, 440, 400, 8);
      tx.restore(); tex.needsUpdate = true;
    }
    function txt(k) { var el = document.getElementById('story_' + k); return el ? el.textContent : ''; }

    // ---------- défilement → progression ----------
    var target = 0, cur = 0, visible = false, t0 = performance.now();
    var stick = sec.querySelector('.stick');
    function readScroll() { var r = sec.getBoundingClientRect(), top = parseFloat(getComputedStyle(stick).top) || 0, len = r.height - stick.offsetHeight; target = len > 0 ? Math.min(1, Math.max(0, (top - r.top) / len)) : 0; }
    window.addEventListener('scroll', readScroll, { passive: true });
    function size() { var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < 560 ? 46 : 36; cam.updateProjectionMatrix(); }
    window.addEventListener('resize', function () { size(); readScroll(); });
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) loop(); }, { rootMargin: '100px' }).observe(sec);
    window.addEventListener('faza-lang', function () { lastEng = -1; });

    var UP = new T.Vector3(0, 1, 0), onT = new T.Vector3(), idle = 0; plate.rotation.order = 'YXZ';
    var look = new T.Vector3(), camPos = new T.Vector3(), gold = new T.Color(0xd9ac3f), goldShine = new T.Color(0xf0c75a), last = -1;
    function frameAt(p, time) {
      var printK = sm(0.02, 0.5, p), engK = sm(0.52, 0.74, p), asm = sm(0.76, 0.95, p);
      // 1. impression
      var h = printK * H; cut.constant = printK >= 1 ? 99 : h; under.constant = -(h - 0.035);
      glow.visible = printK > 0 && printK < 1;
      var r = radiusAt(Math.min(h, 1.99)), a = time * (reduce ? 0 : 2.4);
      head.position.set(Math.cos(a) * r, h + 0.02, Math.sin(a) * r);
      head.visible = printK < 1 || p < 0.55; var hy = lerp(h + 0.22, 3.0, sm(0.5, 0.58, p)); head.position.y = hy - 0.2;
      railX.position.set(0, hy + 0.0, head.position.z - 0.2); railX2.position.set(0, hy + 0.0, head.position.z + 0.2);
      hot.position.copy(head.position); hot.intensity = printK > 0 && printK < 1 ? 1.4 : 0;
      // 2. gravure laser
      engrave(engK);
      var row = Math.floor(engK * 18), xx = (engK * 18 - row); xx = row % 2 ? 1 - xx : xx;
      var lx = PLATE_FLAT.x - 0.5 + xx * 1.0, lz = PLATE_FLAT.z - 0.26 + (row / 18) * 0.52;
      var lasing = engK > 0 && engK < 1;
      laserHead.position.set(lerp(PLATE_FLAT.x + 0.2, lx, sm(0.48, 0.53, p)), lerp(1.4, 0.75, sm(0.48, 0.53, p)), lasing ? lz : PLATE_FLAT.z);
      laserHead.visible = p > 0.5 && p < 0.8;
      beam.visible = lasing; beam.position.set(laserHead.position.x, (laserHead.position.y + PLATE_FLAT.y) / 2, laserHead.position.z); beam.scale.y = laserHead.position.y - PLATE_FLAT.y - 0.05;
      spark.position.set(laserHead.position.x, PLATE_FLAT.y + 0.05, laserHead.position.z); spark.intensity = lasing ? 1.2 + Math.sin(time * 40) * 0.5 : 0;
      // 3. assemblage
      if (p > 0.97 && !reduce) idle += 0.004; var spin = sm(0.86, 0.97, p) * Math.PI * 2 + idle;
      onT.copy(PLATE_ON).applyAxisAngle(UP, spin);
      plate.position.lerpVectors(PLATE_FLAT, onT, asm); plate.position.y += Math.sin(asm * Math.PI) * 0.9;
      plate.rotation.set(lerp(0, Math.PI / 2, asm), spin, 0); plate.scale.setScalar(lerp(1, 0.8, asm));
      frameMat.opacity = 0.35 * (1 - asm); railMat.opacity = 1 - asm; grid.material.opacity = 1 - asm; grid.material.transparent = true;
      bed.material.transparent = true; bed.material.opacity = 1 - asm * 0.85;
      pla.metalness = lerp(0.25, 0.5, asm); pla.roughness = lerp(0.5, 0.28, asm); key.intensity = lerp(1.6, 2.6, asm); pla.color.copy(gold).lerp(goldShine, asm);
      trophy.rotation.y = spin;
      // caméra : tour lent pendant l'impression, vers la plaque pour la gravure, face au trophée à la fin
      var orbit = lerp(0.5, 1.25, printK) + (reduce ? 0 : Math.sin(time * 0.15) * 0.04), rad = cv.clientWidth < 560 ? 7.6 : 6.4;
      var c1 = new T.Vector3(Math.sin(orbit) * rad, 3.1, Math.cos(orbit) * rad), l1 = new T.Vector3(0, Math.max(0.8, h * 0.6), 0);
      var c2 = new T.Vector3(PLATE_FLAT.x + 0.4, 2.4, PLATE_FLAT.z + 2.4), l2 = PLATE_FLAT.clone();
      var c3 = new T.Vector3(0.4, 1.9, cv.clientWidth < 560 ? 7.4 : 6.2), l3 = new T.Vector3(0, 1.0, 0);
      var k12 = sm(0.47, 0.56, p), k23 = sm(0.74, 0.86, p);
      camPos.copy(c1).lerp(c2, k12).lerp(c3, k23); look.copy(l1).lerp(l2, k12).lerp(l3, k23);
      cam.position.copy(camPos); cam.lookAt(look);
      // texte et compteur
      var st = p < 0.5 ? 0 : p < 0.75 ? 1 : 2;
      if (st !== last) { steps.forEach(function (s, i) { s.classList.toggle('on', i === st); }); last = st; }
      if (hud) hud.textContent = st === 0 ? tr('st_layer', 'Couche') + ' ' + Math.round(printK * 240) + ' / 240' : st === 1 ? tr('st_laser', 'Gravure') + ' ' + Math.round(engK * 100) + ' %' : tr('st_done', 'Prêt à livrer');
      sec.style.setProperty('--p', p.toFixed(3));
    }
    var running = false;
    function loop() {
      if (running) return; running = true;
      (function tick(now) {
        if (!visible) { running = false; return; }
        cur += (target - cur) * (reduce ? 1 : 0.1);
        frameAt(cur, now / 1000); renderer.render(scene, cam);
        requestAnimationFrame(tick);
      })(performance.now());
    }
    size(); readScroll(); cur = target; frameAt(cur, 0); renderer.render(scene, cam);
    sec.classList.add('ready');
  }
  start();
})();
