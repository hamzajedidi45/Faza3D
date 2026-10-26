// Relais imprimantes FAZA 3D : tourne sur un PC de l'atelier et envoie l'état des imprimantes Bambu Lab
// (et l'image des caméras) à la plateforme hébergée sur le serveur.
'use strict';
const fs = require('fs');
const path = require('path');
const { Printers } = require('./lib/printers');

const DIR = __dirname;
let cfg;
try { cfg = JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8')); } catch { console.error('config.json absent ou illisible.'); process.exit(1); }
if (!cfg.serveur || !cfg.jeton) { console.error('Renseignez "serveur" et "jeton" dans config.json (jeton : Connexions › Relais imprimantes sur la plateforme).'); process.exit(1); }
const SERVER = String(cfg.serveur).replace(/\/+$/, '');
const META = path.join(DIR, 'relais-etat.json');
let meta = {}; try { meta = JSON.parse(fs.readFileSync(META, 'utf8')); } catch {}
const saveMeta = () => { try { fs.writeFileSync(META, JSON.stringify(meta)); } catch {} };
// petite "base" locale : compteurs d'heures et utilisation
const base = { meta: (k) => meta[k] ?? null, setMeta: (k, v) => { meta[k] = String(v); saveMeta(); }, addHours: (id, min) => { meta['hours_' + id] = (+meta['hours_' + id] || 0) + min / 60; }, hours: (id) => +meta['hours_' + id] || 0 };
const printers = new Printers(base, cfg.printers || [], (p, st, before) => console.log(`${p.name} : ${before} → ${st.state}`));

const headers = { 'Authorization': 'Bearer ' + cfg.jeton, 'Content-Type': 'application/json', 'X-Faza': '1' };
let fails = 0;
async function push() {
  try {
    const snap = printers.snapshot();
    const body = { name: cfg.nom || require('os').hostname(), printers: snap.printers, util: snap.util, hours: Object.fromEntries((cfg.printers || []).map(p => [p.id, base.hours(p.id)])) };
    const r = await fetch(SERVER + '/api/relais/etat', { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15e3) });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 120));
    const j = await r.json();
    if (fails) console.log('✔ Connexion au serveur rétablie.'); fails = 0;
    for (const id of j.wanted || []) {
      const p = printers.list.find(x => x.id === id); if (!p || !p.ip || !p.accessCode) continue;
      try {
        const img = await printers.camera.snapshot(p);
        await fetch(SERVER + '/api/relais/camera/' + encodeURIComponent(id), { method: 'POST', headers: { ...headers, 'Content-Type': 'image/jpeg' }, body: img, signal: AbortSignal.timeout(15e3) });
      } catch (e) { if (!meta['camwarn_' + id]) { console.log(`! Caméra ${p.name} : ${e.message}`); meta['camwarn_' + id] = '1'; } }
    }
  } catch (e) { if (++fails === 1 || fails % 60 === 0) console.log('! Serveur injoignable : ' + e.message); }
}
console.log(`Relais imprimantes FAZA 3D → ${SERVER}`);
console.log('Imprimantes : ' + (cfg.printers || []).map(p => p.name + (p.ip ? ' (' + p.ip + ')' : ' (non configurée)')).join(', '));
setInterval(push, 5000);
push();
