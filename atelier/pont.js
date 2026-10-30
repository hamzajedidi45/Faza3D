// FAZA 3D Atelier : serveur de la plateforme (version 4)
// Base de données, comptes, synchronisation entre postes, messagerie, imprimantes, devis et factures, connexions externes.
// Lancement manuel : node pont.js   (l'installation Windows le lance toute seule au démarrage du PC)
'use strict';
const VERSION = '4.3.0';
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

process.on('uncaughtException', (e) => console.error('! Erreur inattendue :', e && e.stack || e));
process.on('unhandledRejection', (e) => console.error('! Erreur inattendue :', e && e.stack || e));

const DIR = __dirname;
const settings = require('./lib/config');
let config;
try { config = settings.load(DIR); } catch (e) { console.error('! Configuration invalide : ' + e.message); process.exit(1); }
const DATA = config.dataDir;
const PHOTOS = path.join(DATA, 'photos');
const CERTS = path.join(DATA, 'certificats');
const BACKUPS = path.join(DATA, 'sauvegardes');
const PUBLIC = path.join(DIR, 'public');
const FONTS = path.join(DIR, 'polices');
const FILES = path.join(DATA, 'fichiers');
const REPORTS = path.join(DATA, 'rapports');
for (const d of [DATA, PHOTOS, CERTS, BACKUPS, FILES, REPORTS]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });

const PORT = config.port;
const HOST = config.host;
const USE_HTTPS = config.https;
// Derrière un reverse proxy (Traefik d'EasyPanel, Cloudflare…) : l'adresse du visiteur est dans un en-tête, et le https est assuré par le proxy
const PROXY = config.behindProxy;

const { Base } = require('./lib/db');
const { Auth, ROLES, SESSION_H } = require('./lib/auth');
const { Printers } = require('./lib/printers');
const { Connecteurs, Secrets, mask, mergeSecrets } = require('./lib/connecteurs');
const pdf = require('./lib/pdf');
const rapport = require('./lib/rapport');
let webpush = null; try { webpush = require('web-push'); } catch { /* notifications indisponibles */ }

const base = new Base(DATA);
base.importLegacy(DATA);
const auth = new Auth(base);
const secrets = new Secrets(base, path.join(DATA, 'cle-secrets.bin'), { envKey: config.secretKey, envValues: settings.envSecrets() });
// Premier compte sur un serveur distant : un code d'installation (FAZA_INSTALL_CODE, sinon écrit dans donnees/code-installation.txt)
const CODE_FILE = path.join(DATA, 'code-installation.txt');
function installCode() {
  if (auth.count() > 0) { try { fs.unlinkSync(CODE_FILE); } catch {} return null; }
  if (config.installCode) return config.installCode;
  if (!fs.existsSync(CODE_FILE)) fs.writeFileSync(CODE_FILE, crypto.randomBytes(6).toString('hex').toUpperCase(), { mode: 0o600 });
  return fs.readFileSync(CODE_FILE, 'utf8').trim();
}
const safeEqual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

/* =================================================================== */
/*  Temps réel : flux d'événements (SSE) vers chaque poste connecté     */
/* =================================================================== */
const streams = new Map(); // id -> { res, name, role }
function sseWrite(res, event, data) { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {} }
function broadcast(event, data, filter) { for (const s of streams.values()) if (!filter || filter(s)) sseWrite(s.res, event, data); }
function online() { return [...new Set([...streams.values()].map(s => s.name))]; }
base.onChange((info) => broadcast('change', { seq: info.seq }));
setInterval(() => { for (const s of streams.values()) { try { s.res.write(': ok\n\n'); } catch {} } }, 25e3).unref();

/* =================================================================== */
/*  Messagerie interne                                                  */
/* =================================================================== */
const SYS = '@système';
function canRead(name, role, ch) {
  if (ch === 'general' || ch === 'production') return true;
  if (ch === 'commercial') return role === 'admin' || role === 'commercial';
  if (ch.startsWith('dm:')) return ch.slice(3).split('|').includes(name);
  return false;
}
function dmChannel(a, b) { return 'dm:' + [a, b].sort((x, y) => x.localeCompare(y)).join('|'); }
function validChannel(ch, me) {
  if (['general', 'production', 'commercial'].includes(ch)) return true;
  const m = /^dm:(.+)\|(.+)$/.exec(ch);
  if (!m || ![m[1], m[2]].includes(me) || m[1] === m[2]) return false;
  return !!(auth.user(m[1]) && auth.user(m[2])) && ch === dmChannel(m[1], m[2]);
}
function postMessage(channel, author, body) {
  body = String(body || '').trim().slice(0, 4000);
  if (!body) return null;
  const at = Date.now();
  const r = base.db.prepare('INSERT INTO messages(channel,author,body,at) VALUES (?,?,?,?)').run(channel, author, body, at);
  const msg = { id: Number(r.lastInsertRowid), channel, author, body, at };
  broadcast('chat', msg, s => canRead(s.name, s.role, channel));
  try {
    const onlineNow = new Set(online());
    const readers = readersOf(channel).filter(u => u !== author);
    const dm = channel.startsWith('dm:');
    const targets = readers.filter(u => dm || author === SYS || body.includes('@' + u) || !onlineNow.has(u));
    if (targets.length) push(targets, { title: (author === SYS ? 'Atelier' : author) + (dm ? '' : ' · #' + (channel === 'general' ? 'Général' : channel === 'production' ? 'Production' : 'Commercial')), body: body.slice(0, 160), tag: 'chat-' + channel, url: '/#messages' }, author);
  } catch {}
  return msg;
}
const notify = (channel, text) => postMessage(channel, SYS, text);

/* =================================================================== */
/*  Notifications sur téléphone (Web Push)                              */
/* =================================================================== */
function vapid() {
  if (!webpush) return null;
  const s = secrets.mutable();
  if (!s.vapid) { s.vapid = webpush.generateVAPIDKeys(); try { secrets.set(s, 'système'); } catch { return null; } }
  const subject = 'mailto:' + ((params().company || {}).email || 'contact@faza3d.tn');
  try { webpush.setVapidDetails(subject, s.vapid.publicKey, s.vapid.privateKey); } catch { return null; }
  return s.vapid;
}
// envoie une notification aux comptes donnés (sauf `except`), sur tous leurs appareils abonnés
async function push(users, payload, except) {
  // file d'attente pour l'application Android (interrogation périodique)
  try {
    const names = users === '*' ? auth.list().map(u => u.name) : users;
    const ins = base.db.prepare('INSERT INTO push_queue(user,data,at) VALUES (?,?,?)');
    for (const n of names) if (n !== except) ins.run(n, JSON.stringify(payload), Date.now());
    base.db.prepare('DELETE FROM push_queue WHERE at < ?').run(Date.now() - 3 * 86400e3);
    wakePush(names.filter(n => n !== except));
  } catch {}
  if (!webpush || !vapid()) return;
  const list = users === '*' ? base.db.prepare('SELECT * FROM push_subs').all() : base.db.prepare(`SELECT * FROM push_subs WHERE user IN (${users.map(() => '?').join(',') || "''"})`).all(...users);
  const body = JSON.stringify(payload);
  for (const row of list) {
    if (except && row.user === except) continue;
    try { await webpush.sendNotification(JSON.parse(row.data), body, { TTL: 3600 }); }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) base.db.prepare('DELETE FROM push_subs WHERE endpoint=?').run(row.endpoint); }
  }
}
function usersByRole(roles) { return auth.list().filter(u => roles.includes(u.role)).map(u => u.name); }
function readersOf(channel) { return auth.list().filter(u => canRead(u.name, u.role, channel)).map(u => u.name); }

/* =================================================================== */
/*  Imprimantes                                                         */
/* =================================================================== */
function printerList() {
  const conn = Object.fromEntries((secrets.stored().printers || []).map(p => [p.id, p]));
  return (config.printers || []).map(p => ({ ...p, ...(conn[p.id] || {}) }));
}
const printers = new Printers(base, printerList(), (p, st, before) => {
  if (!['RUNNING', 'PAUSE', 'PREPARE'].includes(before)) return;
  if (st.state === 'FINISH') notify('production', `✅ ${p.name} : impression terminée${st.job ? ' (' + st.job + ')' : ''}. La pièce peut être retirée.`);
  if (st.state === 'FAILED') notify('production', `⚠️ ${p.name} : impression en échec${st.job ? ' (' + st.job + ')' : ''}. À vérifier.`);
});
let lastPrinterJSON = '';
setInterval(() => {
  const snap = printers.snapshot();
  const j = JSON.stringify(snap.printers);
  if (j !== lastPrinterJSON) { lastPrinterJSON = j; broadcast('printers', snap); }
}, 4e3).unref();

/* =================================================================== */
/*  Connexions externes                                                 */
/* =================================================================== */
const conn = new Connecteurs({ base, secrets, notify, push: (who, payload) => push(who === 'sales' ? usersByRole(['admin', 'commercial']) : who, payload) });

/* =================================================================== */
/*  Droits par rôle                                                     */
/* =================================================================== */
const READ_HIDE = { production: ['leads', 'quotes', 'social', 'expenses', 'purchases'], commercial: ['expenses'] };
const WRITE = {
  admin: null, // tout
  commercial: ['clients', 'orders', 'stock', 'catalog', 'tasks', 'leads', 'quotes', 'social', 'purchases', 'maintenance'],
  production: ['orders', 'stock', 'failures', 'tasks', 'maintenance'],
};
const DELETE = {
  admin: null,
  commercial: ['tasks', 'leads', 'quotes', 'social', 'catalog', 'purchases', 'maintenance'],
  production: ['tasks', 'failures', 'maintenance'],
};
const FIN_FIELDS = ['price', 'payments', 'invoice', 'creditNote', 'lines', 'discountPct', 'quoteId', 'quoteNo'];
const SERVER_FIELDS = ['invoice', 'creditNote', 'token', 'verifToken'];

function forRole(payload, role) {
  if (role === 'admin') return payload;
  if (role === 'commercial') { const out = { ...payload, changes: {} }; for (const [coll, list] of Object.entries(payload.changes)) if (!READ_HIDE.commercial.includes(coll)) out.changes[coll] = list; return out; }
  const out = { seq: payload.seq, changes: {} };
  for (const [coll, list] of Object.entries(payload.changes)) {
    if (READ_HIDE.production.includes(coll)) continue;
    // les liens publics (suivi, vérification) ouvrent l'espace client : réservés aux rôles commerciaux
    if (coll === 'orders') out.changes.orders = list.map(o => { if (o._deleted) return o; const c = { ...o }; for (const k of [...FIN_FIELDS, 'token', 'verifToken']) delete c[k]; return c; });
    else if (coll === 'clients') out.changes.clients = list.map(c => c._deleted ? c : { id: c.id, name: c.name, phone: c.phone });
    else out.changes[coll] = list;
  }
  if (payload.params) {
    const p = JSON.parse(JSON.stringify(payload.params));
    delete p.rates; delete p.company; delete p.finance; delete p.targets; delete p.suppliers;
    if (Array.isArray(p.printers)) p.printers = p.printers.map(x => ({ id: x.id, name: x.name }));
    if (p.laser) p.laser = { name: p.laser.name };
    if (Array.isArray(p.materials)) p.materials = p.materials.map(x => ({ id: x.id, name: x.name }));
    if (Array.isArray(p.sheets)) p.sheets = p.sheets.map(x => ({ id: x.id, name: x.name }));
    out.params = p;
  }
  return out;
}
const stageOf = (o) => (o && Array.isArray(o.hist) && o.hist.length ? o.hist[o.hist.length - 1].stage : null);

function writer(user, role, events) {
  let rejected = 0;
  const fn = (op, coll, rec, old) => {
    if (op === 'params') { if (role === 'admin') return true; rejected++; return false; }
    if (WRITE[role] && !WRITE[role].includes(coll)) { rejected++; return null; }
    if (op === 'delete') {
      if (DELETE[role] && !DELETE[role].includes(coll)) { rejected++; return null; }
      if (coll === 'orders' && old && old.invoice) { rejected++; return null; } // une commande facturée reste en base
      return true;
    }
    if (JSON.stringify(rec).length > 300e3) { rejected++; return null; }
    if (coll === 'orders') {
      if (!Array.isArray(rec.hist) || !rec.hist.length) { rejected++; return null; }
      for (const k of SERVER_FIELDS) { if (old && old[k] != null) rec[k] = old[k]; else delete rec[k]; } // facture, avoir et lien de suivi : créés par le serveur seulement
      if (!old) rec.token = crypto.randomBytes(16).toString('hex');
      if (role === 'production') for (const k of FIN_FIELDS) { if (old && k in old) rec[k] = old[k]; else delete rec[k]; }
      if (Array.isArray(rec.files)) rec.files = rec.files.filter(f => f && /^[a-f0-9]{24}$/.test(String(f.id)));
      const a = stageOf(old), b = stageOf(rec);
      if (a !== b) setImmediate(() => clientStageMail(rec, b).catch(e => console.error('E-mail client :', e.message)));
      if (a !== b && b === 'pack') events.push(['commercial', `📦 ${rec.id} (${rec.client || ''}, ${rec.product || ''}) est emballée et prête : prévenir le client.`]);
      if (a !== b && b === 'done') events.push(['general', `🎉 ${rec.id} livrée à ${rec.client || 'client'}.`]);
    }
    if (coll === 'quotes') {
      if (old && old.no) rec.no = old.no;
      else rec.no = base.nextNumber('D', new Date().getFullYear(), true);
      rec.token = old && old.token ? old.token : crypto.randomBytes(16).toString('hex');
      if (old && old.acceptedAt) { rec.acceptedAt = old.acceptedAt; rec.acceptedBy = old.acceptedBy; }
    }
    if (coll === 'purchases') {
      if (old && old.no) rec.no = old.no; else rec.no = base.nextNumber('BC', new Date().getFullYear(), true);
      if (role !== 'admin' && old && old.status === 'recu' && rec.status !== 'recu') { rejected++; return null; }
    }
    if (coll === 'expenses' && role !== 'admin') { rejected++; return null; }
    if (coll === 'leads' && !old && rec.stage === 'gagne') events.push(['general', `🏆 Nouveau client gagné : ${rec.name}.`]);
    if (coll === 'leads' && old && old.stage !== 'gagne' && rec.stage === 'gagne') events.push(['general', `🏆 ${rec.name} : demande gagnée${rec.value ? ' (' + Math.round(rec.value) + ' DT)' : ''}.`]);
    return rec;
  };
  fn.rejected = () => rejected;
  return fn;
}

/* =================================================================== */
/*  Devis et factures                                                   */
/* =================================================================== */
const params = () => base.setting('params', {}) || {};
function clientInfo(id, fallback) {
  const c = id && base.get('clients', id);
  return c ? { name: c.name, phone: c.phone, email: c.email, address: c.address, mf: c.mf } : { name: fallback || '' };
}
function orderDoc(o) {
  const p = params(); const vat = +(p.rates && p.rates.vat) || 19; const timbre = +(p.rates && p.rates.timbre) || 0;
  let lines, discountPct = 0;
  if (Array.isArray(o.lines) && o.lines.length) { lines = o.lines.map(l => ({ label: l.label, qty: +l.qty || 0, pu: +l.pu || 0 })); discountPct = +o.discountPct || 0; }
  else { const ht = (+o.price || 0) / (1 + vat / 100); const q = Math.max(1, +o.qty || 1); lines = [{ label: o.product || 'Prestation', qty: q, pu: ht / q }]; }
  return { kind: 'facture', company: p.company || {}, client: clientInfo(o.clientId, o.client), lines, discountPct, vat, timbre,
    ref: 'Commande ' + o.id + (o.quoteNo ? ' · Devis ' + o.quoteNo : ''), terms: p.company && p.company.factureConditions };
}
function quoteDoc(q) {
  const p = params();
  return { kind: 'devis', no: q.no, at: q.at || Date.now(), company: p.company || {}, client: clientInfo(q.clientId, q.client),
    lines: q.lines || [], discountPct: +q.discountPct || 0, vat: q.vat != null ? +q.vat : (+(p.rates && p.rates.vat) || 19),
    timbre: q.timbre != null ? +q.timbre : (+(p.rates && p.rates.timbre) || 0), validityDays: +q.validityDays || 30, leadText: q.leadText,
    notes: q.notes, terms: q.terms || (p.company && p.company.devisConditions), logo: logoFile(), acceptUrl: publicBase() && q.token ? publicBase() + '/devis/' + q.token : undefined };
}
function logoFile() { const f = path.join(DATA, 'logo.png'); return fs.existsSync(f) ? f : null; }
function ensureInvoice(o, user, redo) {
  if (o.invoice && !redo) return o;
  if (!(+o.price > 0) && !(Array.isArray(o.lines) && o.lines.length)) throw httpErr(400, 'Indiquez d\'abord le prix de la commande.');
  const doc = orderDoc(o);
  const y = new Date().getFullYear();
  if (!o.invoice && !base.meta(`num_FAZA_${y}`)) {
    // reprise : ne jamais redonner un numéro déjà utilisé (factures de la version précédente)
    const max = base.db.prepare("SELECT invoice_no FROM orders WHERE invoice_no LIKE ?").all(`FAZA-${y}-%`).map(r => parseInt(String(r.invoice_no).split('-').pop(), 10)).filter(n => !isNaN(n));
    if (max.length) base.setMeta(`num_FAZA_${y}`, Math.max(...max));
  }
  const no = o.invoice ? o.invoice.no : base.nextNumber('FAZA', y);
  const at = o.invoice && redo ? o.invoice.at : Date.now();
  o.invoice = { no, at, doc };
  // code du QR de vérification : distinct du lien de suivi (une facture transmise ne donne pas accès à l'espace client)
  if (!o.verifToken) o.verifToken = crypto.randomBytes(16).toString('hex');
  base.put('orders', o, user);
  base.audit(user, redo ? 'facture refaite' : 'facture', 'orders', o.id, no);
  return o;
}
async function invoicePDF(o) {
  const paid = (o.payments || []).reduce((a, p) => a + (+p.amount || 0), 0);
  return renderPDF({ ...(o.invoice.doc || orderDoc(o)), no: o.invoice.no, at: o.invoice.at, paid, logo: logoFile(), verifToken: o.verifToken || o.token });
}

/* =================================================================== */
/*  Certificats (HTTPS) : autorité de l'atelier + certificat du serveur */
/* =================================================================== */
function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push(a.address);
  return [...new Set(out)];
}
async function certificates() {
  const selfsigned = require('selfsigned');
  const caKeyF = path.join(CERTS, 'autorite.key'), caCrtF = path.join(CERTS, 'autorite.crt');
  const keyF = path.join(CERTS, 'serveur.key'), crtF = path.join(CERTS, 'serveur.crt');
  if (!fs.existsSync(caKeyF) || !fs.existsSync(caCrtF)) {
    const ca = await selfsigned.generate([{ name: 'commonName', value: 'FAZA 3D Atelier - autorite locale' }, { name: 'organizationName', value: 'FAZA 3D' }], {
      keySize: 2048, algorithm: 'sha256', notAfterDate: new Date(Date.now() + 3650 * 864e5),
      extensions: [{ name: 'basicConstraints', cA: true, critical: true }, { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true }],
    });
    fs.writeFileSync(caKeyF, ca.private, { mode: 0o600 }); fs.writeFileSync(caCrtF, ca.cert);
    console.log('✔ Autorité de certification de l\'atelier créée.');
  }
  const host = os.hostname();
  const names = [...new Set(['localhost', host, host.toLowerCase(), host.toLowerCase() + '.local', ...(config.nomsSupplementaires || [])])];
  const ips = ['127.0.0.1', ...lanAddresses()];
  const sig = names.join(',') + '|' + ips.join(',');
  let regen = !fs.existsSync(keyF) || !fs.existsSync(crtF) || base.meta('cert_sig') !== sig;
  if (!regen) {
    try { const x = new crypto.X509Certificate(fs.readFileSync(crtF)); if (Date.parse(x.validTo) - Date.now() < 30 * 864e5) regen = true; } catch { regen = true; }
  }
  if (regen) {
    const srv = await selfsigned.generate([{ name: 'commonName', value: host }], {
      keySize: 2048, algorithm: 'sha256', notAfterDate: new Date(Date.now() + 800 * 864e5),
      ca: { key: fs.readFileSync(caKeyF, 'utf8'), cert: fs.readFileSync(caCrtF, 'utf8') },
      extensions: [{ name: 'basicConstraints', cA: false }, { name: 'keyUsage', digitalSignature: true, keyEncipherment: true }, { name: 'extKeyUsage', serverAuth: true },
        { name: 'subjectAltName', altNames: [...names.map(v => ({ type: 2, value: v })), ...ips.map(ip => ({ type: 7, ip }))] }],
    });
    fs.writeFileSync(keyF, srv.private, { mode: 0o600 }); fs.writeFileSync(crtF, srv.cert);
    base.setMeta('cert_sig', sig);
    console.log('✔ Certificat du serveur préparé pour : ' + [...names, ...ips].join(', '));
  }
  return { key: fs.readFileSync(keyF), cert: fs.readFileSync(crtF), ca: fs.readFileSync(caCrtF) };
}

/* =================================================================== */
/*  Outils HTTP                                                         */
/* =================================================================== */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const BASE_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'Content-Security-Policy': CSP,
  'Cross-Origin-Opener-Policy': 'same-origin', 'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=()' };
const HSTS = { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' };
function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  if (res.headersSent) return;
  res.writeHead(code, { 'Content-Type': type, ...BASE_HEADERS, ...(SECURE ? HSTS : {}), ...extra });
  res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body));
}
function httpErr(code, msg) { const e = new Error(msg); e.code = code; return e; }
function dec(s) { try { return decodeURIComponent(s); } catch { throw httpErr(400, 'Adresse invalide.'); } }
// coupe les flux temps réel d'un compte (rôle changé, compte supprimé) : il se reconnecte avec ses nouveaux droits
function dropStreams(name) { for (const [id, s] of streams) if (s.name === name) { try { s.res.end(); } catch {} streams.delete(id); } }
function readRaw(req, max = 1e6) {
  return new Promise((ok, ko) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > max) { ko(httpErr(413, 'Envoi trop volumineux.')); req.resume(); } else chunks.push(c); });
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', ko);
  });
}
// enregistre le corps de la requête directement sur le disque (un gros fichier STL ne passe pas par la mémoire)
function saveUpload(req, file, max) {
  return new Promise((ok, ko) => {
    if (+req.headers['content-length'] > max) return ko(httpErr(413, 'Envoi trop volumineux.'));
    let n = 0, done = false;
    const out = fs.createWriteStream(file, { flags: 'wx' });
    const fail = (e) => { if (done) return; done = true; req.unpipe(out); out.destroy(); fs.unlink(file, () => {}); ko(e); };
    req.on('data', c => { n += c.length; if (n > max) { fail(httpErr(413, 'Envoi trop volumineux.')); req.resume(); } });
    req.on('error', fail);
    req.on('aborted', () => fail(httpErr(400, 'Envoi interrompu.')));
    out.on('error', fail);
    out.on('finish', () => { if (done) return; done = true; if (!n) { fs.unlink(file, () => {}); return ko(httpErr(400, 'Fichier vide.')); } ok(n); });
    req.pipe(out);
  });
}
async function readJSON(req, max) { const b = await readRaw(req, max); try { return JSON.parse(b.toString() || '{}'); } catch { throw httpErr(400, 'Données illisibles.'); } }
const isLocal = (ip) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
let SECURE = PROXY;
const cookie = (sid, age) => `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${SECURE ? '; Secure' : ''}`;
// Adresse du visiteur derrière un proxy : on ne croit que les entrées ajoutées par nos proxys (les plus à droite de X-Forwarded-For),
// jamais la première, que le visiteur peut écrire lui-même.
function forwardedIp(req) {
  if (config.clientIpHeader) { const h = req.headers[config.clientIpHeader]; if (h) return String(h).split(',')[0].trim(); }
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return xff.length ? xff[Math.max(0, xff.length - config.trustedProxyHops)] : null;
}
function clientIp(req) { return (PROXY && forwardedIp(req)) || req.socket.remoteAddress; }
// « poste local » (création du premier compte sans code) : seulement sur le PC lui-même, jamais derrière un proxy
const localRequest = (req) => !PROXY && isLocal(req.socket.remoteAddress);

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/commande': ['commande.html', 'text/html; charset=utf-8'], '/poste': ['poste.html', 'text/html; charset=utf-8'],
};
const PUBLIC_PAGES = { devis: 'devis.html', suivi: 'suivi.html', verif: 'verif.html' };
function serveStatic(p, res) {
  let file, type;
  const pm = /^\/(devis|suivi|verif)\/[a-f0-9]{32}$/.exec(p);
  if (pm) { file = PUBLIC_PAGES[pm[1]]; type = 'text/html; charset=utf-8'; }
  else if (STATIC[p]) [file, type] = STATIC[p];
  else if (/^\/[a-z0-9-]+\.js$/.test(p)) { file = p.slice(1); type = 'text/javascript; charset=utf-8'; }
  else if (/^\/[a-z0-9-]+\.css$/.test(p)) { file = p.slice(1); type = 'text/css; charset=utf-8'; }
  else if (p === '/icone.svg') { file = 'icone.svg'; type = 'image/svg+xml'; }
  else if (p === '/manifest.webmanifest') { file = 'manifest.webmanifest'; type = 'application/manifest+json'; }
  else if (p === '/sw.js') { send(res, 200, fs.readFileSync(path.join(PUBLIC, 'sw.js')), 'text/javascript; charset=utf-8', { 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' }); return true; }
  else if (/^\/icones\/[a-z0-9-]+\.png$/.test(p)) { const f = path.join(PUBLIC, 'icones', path.basename(p)); if (!fs.existsSync(f)) return false; send(res, 200, fs.readFileSync(f), 'image/png', { 'Cache-Control': 'max-age=86400' }); return true; }
  else if (/^\/polices\/Inter-(Regular|SemiBold)\.otf$/.test(p)) {
    const f = path.join(FONTS, path.basename(p));
    if (fs.existsSync(f)) { send(res, 200, fs.readFileSync(f), 'font/otf', { 'Cache-Control': 'max-age=86400' }); return true; }
    return false;
  } else return false;
  const f = path.join(PUBLIC, file);
  if (!fs.existsSync(f)) return false;
  send(res, 200, fs.readFileSync(f), type, { 'Cache-Control': 'no-cache' });
  return true;
}

/* ---------- Petit routeur ---------- */
const routes = [];
function route(method, pattern, roles, fn) {
  const keys = []; const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, roles, fn });
}
const ALL = ROLES, ADM = ['admin'], SALES = ['admin', 'commercial'];

/* ---------- Session ---------- */
route('GET', '/api/session', null, (ctx) => {
  const s = ctx.session;
  if (!s) throw Object.assign(httpErr(401, 'Connexion requise.'), { body: { setup: auth.count() === 0, local: localRequest(ctx.req), code: auth.count() === 0 && !localRequest(ctx.req) } });
  ctx.headers['Set-Cookie'] = cookie(s.sid, (s.hours || SESSION_H) * 3600);   // le cookie suit la session prolongée
  return { user: { name: s.name, role: s.role }, version: VERSION, https: SECURE };
});
route('POST', '/api/setup', null, async (ctx) => {
  if (auth.count() > 0) throw httpErr(403, 'Le compte administrateur existe déjà.');
  if (auth.blocked(ctx.ip)) throw httpErr(429, 'Trop d\'essais. Réessayez dans 15 minutes.');
  const b = await readJSON(ctx.req);
  if (!localRequest(ctx.req)) {
    const code = installCode();
    if (!code || !safeEqual(String(b.code || '').trim().toUpperCase(), code)) { auth.failed(ctx.ip); throw httpErr(403, 'Code d\'installation incorrect : c\'est FAZA_INSTALL_CODE, ou le code affiché dans le journal du serveur au démarrage.'); }
  }
  if (auth.count() > 0) throw httpErr(403, 'Le compte administrateur existe déjà.');   // vérifié à nouveau après la lecture de la requête
  const name = auth.create(b.name, 'admin', b.password);
  try { fs.unlinkSync(CODE_FILE); } catch {}
  const sid = auth.open(auth.user(name), ctx.ip);
  ctx.headers['Set-Cookie'] = cookie(sid, 12 * 3600);
  postMessage('general', SYS, `Bienvenue sur la plateforme FAZA 3D, ${name}. Créez les comptes de l'équipe dans Paramètres › Équipe et accès.`);
  return { user: { name, role: 'admin' } };
});
route('POST', '/api/login', null, async (ctx) => {
  const b = await readJSON(ctx.req);
  const acct = 'compte:' + String(b.name || '').trim().toLowerCase().slice(0, 40);
  if (auth.blocked(ctx.ip, acct)) throw httpErr(429, 'Trop d\'essais. Réessayez dans 15 minutes.');
  const u = await auth.check(b.name, b.password);
  if (!u) {
    auth.failed(ctx.ip, acct);
    const hint = typeof b.name === 'string' && b.name.includes('@') ? ' Utilisez le nom du compte (par exemple Hamza), pas l\'adresse e-mail.' : '';
    throw httpErr(401, 'Nom ou mot de passe incorrect.' + hint);
  }
  auth.cleared(ctx.ip, acct);
  // l'app Android (FAZA3DApp) reste connectée 30 jours glissants ; un navigateur, 12 h
  const hours = /FAZA3DApp\//.test(String(ctx.req.headers['user-agent'] || '')) ? 24 * 30 : SESSION_H;
  ctx.headers['Set-Cookie'] = cookie(auth.open(u, ctx.ip, hours), hours * 3600);
  return { user: { name: u.name, role: u.role } };
});
route('POST', '/api/logout', ALL, (ctx) => { auth.close(ctx.session.sid); ctx.headers['Set-Cookie'] = cookie('', 0); return { ok: true }; });
route('POST', '/api/password', ALL, async (ctx) => {
  const b = await readJSON(ctx.req);
  if (auth.blocked('mdp:' + ctx.session.name)) throw httpErr(429, 'Trop d\'essais. Réessayez dans 15 minutes.');
  if (!(await auth.check(ctx.session.name, b.old))) { auth.failed('mdp:' + ctx.session.name); throw httpErr(400, 'Mot de passe actuel incorrect.'); }
  auth.setPassword(ctx.session.name, b.password);
  const hours = ctx.session.hours || SESSION_H;
  ctx.headers['Set-Cookie'] = cookie(auth.open(auth.user(ctx.session.name), ctx.ip, hours), hours * 3600);
  return { ok: true };
});

/* ---------- Données ---------- */
route('GET', '/api/sync', ALL, (ctx) => forRole(base.changesSince(+ctx.url.searchParams.get('since') || 0), ctx.session.role));
route('POST', '/api/sync', ALL, async (ctx) => {
  const b = await readJSON(ctx.req, 8e6);
  const events = [];
  const w = writer(ctx.session.name, ctx.session.role, events);
  const seq = base.apply(b.changes || {}, ctx.session.name, w);
  for (const [ch, t] of events) notify(ch, t);
  return { seq, rejected: w.rejected() };
});
route('POST', '/api/ids/order', ALL, () => ({ id: base.nextOrderId() }));
route('GET', '/api/printers', ALL, () => printers.snapshot());
route('POST', '/api/photo', ALL, async (ctx) => {
  const b = await readJSON(ctx.req, 8e6);
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.data || '');
  if (!m) throw httpErr(400, 'Image non reconnue.');
  const name = crypto.randomBytes(12).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  fs.writeFileSync(path.join(PHOTOS, name), Buffer.from(m[2], 'base64'));
  return { url: '/photos/' + name };
});

/* ---------- Temps réel ---------- */
route('GET', '/api/events', ALL, (ctx) => {
  const { res, session } = ctx;
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 4000\n\n');
  const id = crypto.randomBytes(8).toString('hex');
  // au plus 6 onglets ouverts par session : le plus ancien est fermé
  const mine = [...streams].filter(([, s]) => s.sid === session.sid);
  for (const [oid, s] of mine.slice(0, Math.max(0, mine.length - 5))) { try { s.res.end(); } catch {} streams.delete(oid); }
  streams.set(id, { res, name: session.name, role: session.role, sid: session.sid });
  sseWrite(res, 'hello', { seq: base.seq(), online: online() });
  broadcast('presence', { online: online() });
  ctx.req.on('close', () => { streams.delete(id); broadcast('presence', { online: online() }); });
  return ctx.KEEP;
});

/* ---------- Messagerie ---------- */
route('GET', '/api/chat', ALL, (ctx) => {
  const ch = ctx.url.searchParams.get('channel') || 'general';
  if (!canRead(ctx.session.name, ctx.session.role, ch)) throw httpErr(403, 'Canal non autorisé.');
  const before = +ctx.url.searchParams.get('before') || 1e15;
  const rows = base.db.prepare('SELECT * FROM messages WHERE channel=? AND id<? ORDER BY id DESC LIMIT 80').all(ch, before).reverse();
  return { channel: ch, messages: rows };
});
route('POST', '/api/chat', ALL, async (ctx) => {
  const b = await readJSON(ctx.req, 64e3);
  if (!validChannel(String(b.channel || ''), ctx.session.name) || !canRead(ctx.session.name, ctx.session.role, b.channel)) throw httpErr(403, 'Canal non autorisé.');
  const msg = postMessage(b.channel, ctx.session.name, b.body);
  if (!msg) throw httpErr(400, 'Message vide.');
  base.db.prepare('INSERT INTO chat_reads(user,channel,last_id) VALUES (?,?,?) ON CONFLICT(user,channel) DO UPDATE SET last_id=MAX(last_id,excluded.last_id)').run(ctx.session.name, b.channel, msg.id);
  return msg;
});
route('POST', '/api/chat/read', ALL, async (ctx) => {
  const b = await readJSON(ctx.req);
  if (!canRead(ctx.session.name, ctx.session.role, String(b.channel || ''))) throw httpErr(403, 'Canal non autorisé.');
  base.db.prepare('INSERT INTO chat_reads(user,channel,last_id) VALUES (?,?,?) ON CONFLICT(user,channel) DO UPDATE SET last_id=MAX(last_id,excluded.last_id)').run(ctx.session.name, b.channel, +b.id || 0);
  return { ok: true };
});
route('GET', '/api/chat/summary', ALL, (ctx) => {
  const me = ctx.session.name, role = ctx.session.role;
  const chans = [{ id: 'general', name: 'Général' }, { id: 'production', name: 'Production' }];
  if (role !== 'production') chans.push({ id: 'commercial', name: 'Commercial' });
  for (const u of auth.list()) if (u.name !== me) chans.push({ id: dmChannel(me, u.name), name: u.name, dm: true, role: u.role });
  const reads = Object.fromEntries(base.db.prepare('SELECT channel, last_id FROM chat_reads WHERE user=?').all(me).map(r => [r.channel, r.last_id]));
  for (const c of chans) {
    const last = base.db.prepare('SELECT id, author, body, at FROM messages WHERE channel=? ORDER BY id DESC LIMIT 1').get(c.id);
    c.last = last || null;
    c.unread = base.db.prepare('SELECT COUNT(*) n FROM messages WHERE channel=? AND id>? AND author<>?').get(c.id, reads[c.id] || 0, me).n;
  }
  return { channels: chans, online: online() };
});
route('GET', '/api/team', ALL, () => ({ users: auth.list().map(u => ({ name: u.name, role: u.role, last_login: u.last_login })), online: online() }));

/* ---------- Comptes (administrateur) ---------- */
route('GET', '/api/users', ADM, () => auth.list());
route('POST', '/api/users', ADM, async (ctx) => {
  const b = await readJSON(ctx.req);
  const name = auth.create(b.name, b.role, b.password);
  base.audit(ctx.session.name, 'compte créé', 'users', name, b.role);
  postMessage('general', SYS, `${name} rejoint la plateforme (${b.role === 'admin' ? 'administrateur' : b.role === 'commercial' ? 'commercial et marketing' : 'production'}).`);
  return { ok: true };
});
route('POST', '/api/users/:name/password', ADM, async (ctx) => {
  const b = await readJSON(ctx.req); const n = dec(ctx.params.name);
  if (!auth.user(n)) throw httpErr(404, 'Compte introuvable.');
  auth.setPassword(n, b.password); base.audit(ctx.session.name, 'mot de passe changé', 'users', n);
  return { ok: true };
});
route('POST', '/api/users/:name/role', ADM, async (ctx) => {
  const b = await readJSON(ctx.req); const n = dec(ctx.params.name);
  const u = auth.user(n); if (!u) throw httpErr(404, 'Compte introuvable.');
  if (u.role === 'admin' && b.role !== 'admin' && auth.admins() <= 1) throw httpErr(400, 'Il faut garder au moins un administrateur.');
  auth.setRole(n, b.role); base.db.prepare('DELETE FROM sessions WHERE name=?').run(n); dropStreams(n);
  base.audit(ctx.session.name, 'rôle changé', 'users', n, b.role);
  return { ok: true };
});
route('DELETE', '/api/users/:name', ADM, (ctx) => {
  const n = dec(ctx.params.name);
  if (n === ctx.session.name) throw httpErr(400, 'Vous ne pouvez pas supprimer votre propre compte.');
  const u = auth.user(n); if (!u) throw httpErr(404, 'Compte introuvable.');
  if (u.role === 'admin' && auth.admins() <= 1) throw httpErr(400, 'Il faut garder au moins un administrateur.');
  auth.remove(n); dropStreams(n); base.audit(ctx.session.name, 'compte supprimé', 'users', n);
  return { ok: true };
});

/* ---------- Base de données ---------- */
route('GET', '/api/info', ADM, () => {
  const backups = fs.readdirSync(BACKUPS).filter(f => f.endsWith('.db')).sort().reverse().map(f => { const st = fs.statSync(path.join(BACKUPS, f)); return { name: f, size: st.size, at: st.mtimeMs }; });
  const host = os.hostname();
  const proto = SECURE ? 'https' : 'http';
  return {
    version: VERSION, node: process.version, https: SECURE, port: PORT, accesReseau: HOST !== '127.0.0.1', hostname: host,
    addresses: [`${proto}://${host}:${PORT}`, ...lanAddresses().map(ip => `${proto}://${ip}:${PORT}`)],
    dbFile: base.file, dbSize: base.size(), counts: base.counts(), backups, seq: base.seq(), online: online(),
    publicForm: { actif: !!(config.public && config.public.actif), port: (config.public && config.public.port) || 8788, url: config.public && config.public.url },
    proxy: PROXY, relay: printers.snapshot().relay, relayToken: !!(process.env.FAZA_RELAY_TOKEN || secrets.stored().relaisToken), ffmpeg: require('./lib/camera').Camera.hasFfmpeg, sitePublic: publicBase(),
  };
});
route('GET', '/api/export/:file', SALES, (ctx) => {
  const f = ctx.params.file;
  if (f === 'mois.xlsx') {
    if (ctx.session.role !== 'admin') throw httpErr(403, 'Réservé à l\'administrateur.');
    const now = new Date(); const y = +ctx.url.searchParams.get('y') || now.getFullYear(); const m = ctx.url.searchParams.get('m') != null ? +ctx.url.searchParams.get('m') : now.getMonth();
    const buf = rapport.monthWorkbook(base, y, m);
    base.audit(ctx.session.name, 'export Excel', 'rapports', `${y}-${m + 1}`);
    send(ctx.res, 200, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', { 'Content-Disposition': `attachment; filename="faza3d-donnees-${y}-${String(m + 1).padStart(2, '0')}.xlsx"` }); return ctx.KEEP;
  }
  if (f === 'base.db') {
    if (ctx.session.role !== 'admin') throw httpErr(403, 'Réservé à l\'administrateur.');
    const tmp = path.join(os.tmpdir(), 'faza3d-export-' + crypto.randomBytes(6).toString('hex') + '.db');
    base.db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    const buf = fs.readFileSync(tmp); fs.unlinkSync(tmp);
    base.audit(ctx.session.name, 'export', 'base', 'base.db');
    send(ctx.res, 200, buf, 'application/octet-stream', { 'Content-Disposition': `attachment; filename="faza3d-base-${new Date().toISOString().slice(0, 10)}.db"` });
    return ctx.KEEP;
  }
  const m = /^([a-z_]+)\.csv$/.exec(f);
  if (!m) throw httpErr(404, 'Export inconnu.');
  const allowedSales = ['clients', 'leads', 'quotes', 'social', 'tasks', 'orders', 'catalog', 'purchases', 'maintenance'];
  if (ctx.session.role !== 'admin' && !allowedSales.includes(m[1])) throw httpErr(403, 'Réservé à l\'administrateur.');
  const csv = base.exportCSV(m[1]);
  base.audit(ctx.session.name, 'export', m[1], 'csv');
  send(ctx.res, 200, csv, 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="faza3d-${m[1]}-${new Date().toISOString().slice(0, 10)}.csv"` });
  return ctx.KEEP;
});
route('POST', '/api/backup', ADM, (ctx) => { const f = base.backup(BACKUPS, 30); base.audit(ctx.session.name, 'sauvegarde', 'base', path.basename(f)); return { file: path.basename(f) }; });
route('GET', '/api/audit', ADM, (ctx) => base.db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT ?').all(Math.min(1000, +ctx.url.searchParams.get('limit') || 300)));
route('POST', '/api/logo', ADM, async (ctx) => {
  const b = await readJSON(ctx.req, 4e6);
  if (b.data === null) { try { fs.unlinkSync(path.join(DATA, 'logo.png')); } catch {} return { ok: true }; }
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(b.data || '');
  if (!m) throw httpErr(400, 'Logo au format PNG attendu.');
  fs.writeFileSync(path.join(DATA, 'logo.png'), Buffer.from(m[1], 'base64'));
  return { ok: true };
});
route('GET', '/api/logo', ALL, (ctx) => {
  const f = logoFile(); if (!f) throw httpErr(404, 'Pas de logo.');
  send(ctx.res, 200, fs.readFileSync(f), 'image/png'); return ctx.KEEP;
});

/* ---------- Cachet, signature et certificat électronique ---------- */
function stampFile() { const f = path.join(DATA, 'cachet.png'); return fs.existsSync(f) ? f : null; }
function certFile() { const f = path.join(DATA, 'signature.p12'); return fs.existsSync(f) ? f : null; }
let signMods = null;
function loadSign() {
  if (signMods !== null) return signMods;
  try { signMods = { plain: require('@signpdf/placeholder-plain').plainAddPlaceholder, SignPdf: require('@signpdf/signpdf').SignPdf, P12Signer: require('@signpdf/signer-p12').P12Signer, forge: require('node-forge') }; }
  catch { signMods = false; }
  return signMods;
}
function certInfo(buf, pass) {
  const m = loadSign(); if (!m) throw new Error('Modules de signature absents : relancez installer.bat (npm install).');
  const p12 = m.forge.pkcs12.pkcs12FromAsn1(m.forge.asn1.fromDer(buf.toString('binary')), false, pass || '');
  const bags = p12.getBags({ bagType: m.forge.pki.oids.certBag })[m.forge.pki.oids.certBag] || [];
  const cert = bags.map(b => b.cert).filter(Boolean).find(c => !c.getExtension('basicConstraints') || !c.getExtension('basicConstraints').cA) || (bags[0] && bags[0].cert);
  if (!cert) throw new Error('Aucun certificat dans ce fichier.');
  const f = (n) => { const a = cert.subject.getField(n); return a ? a.value : ''; };
  const issuer = cert.issuer.getField('CN'); 
  return { cn: f('CN'), org: f('O'), country: f('C'), issuer: issuer ? issuer.value : '', validFrom: +cert.validity.notBefore, validTo: +cert.validity.notAfter, selfSigned: cert.issuer.hash === cert.subject.hash };
}
// certificat interne gratuit (auto-signé) : garantit l'intégrité du PDF ; un certificat TunTrust peut le remplacer plus tard
function ensureCert() {
  if (certFile()) return true; const m = loadSign(); if (!m) return false;
  if (secrets.get() && secrets.broken) return false;   // mot de passe du certificat impossible à enregistrer
  try {
    const co = params().company || {}; const pki = m.forge.pki; const keys = pki.rsa.generateKeyPair(2048); const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey; cert.serialNumber = Date.now().toString(16); cert.validity.notBefore = new Date(); cert.validity.notAfter = new Date(Date.now() + 10 * 365.25 * 86400e3);
    const attrs = [{ name: 'commonName', value: co.name || co.brand || 'FAZA 3D' }, { name: 'organizationName', value: co.name || 'FAZA 3D' }, { name: 'countryName', value: 'TN' }];
    cert.setSubject(attrs); cert.setIssuer(attrs); cert.setExtensions([{ name: 'basicConstraints', cA: false }, { name: 'keyUsage', digitalSignature: true, nonRepudiation: true }]);
    cert.sign(keys.privateKey, m.forge.md.sha256.create());
    const pass = crypto.randomBytes(12).toString('hex');
    const p12 = m.forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pass, { algorithm: '3des' });
    fs.writeFileSync(path.join(DATA, 'signature.p12'), Buffer.from(m.forge.asn1.toDer(p12).getBytes(), 'binary'));
    const sec = secrets.mutable(); sec.p12Pass = pass; secrets.set(sec, 'système'); console.log('✔ Certificat interne de signature créé (' + attrs[0].value + ').');
    return true;
  } catch (e) { console.error('Certificat interne impossible :', e.message); return false; }
}
function signActive() { return !!((params().company || {}).signPdf !== false && loadSign() && ensureCert()); }
async function signBuffer(buf, reason) {
  const m = loadSign(); const co = params().company || {};
  const ph = m.plain({ pdfBuffer: buf, reason: reason || 'Document FAZA 3D', contactInfo: co.email || '', name: co.name || 'FAZA 3D', location: co.city || co.address || 'Tunis', signatureLength: 16384 });
  return new m.SignPdf().sign(ph, new m.P12Signer(fs.readFileSync(certFile()), { passphrase: secrets.get().p12Pass || '' }));
}
// tous les PDF (facture, devis, avoir, bon) passent ici : cachet + signature électronique si réglés
async function renderPDF(doc) {
  const co = params().company || {}; const signed = signActive() && doc.kind !== 'bon';
  let verifyUrl, qr; const pub = publicBase();
  if (pub && doc.verifToken && (doc.kind === 'facture' || doc.kind === 'avoir')) {
    verifyUrl = pub + '/verif/' + doc.verifToken;
    try { qr = await require('qrcode').toBuffer(verifyUrl, { margin: 1, width: 240, color: { dark: '#0B1830', light: '#FFFFFF' } }); } catch {}
  }
  const buf = await pdf.render({ ...doc, stamp: co.stampPdf === false ? null : stampFile(), signedNote: signed, signedAt: Date.now(), verifyUrl, qr });
  if (!signed) return buf;
  try { return await signBuffer(buf, `${doc.kind === 'devis' ? 'Devis' : doc.kind === 'avoir' ? 'Avoir' : 'Facture'} ${doc.no}`); }
  catch (e) { console.error('Signature électronique impossible :', e.message); return buf; }
}
route('POST', '/api/cachet', ADM, async (ctx) => {
  const b = await readJSON(ctx.req, 4e6);
  if (b.data === null) { try { fs.unlinkSync(path.join(DATA, 'cachet.png')); } catch {} return { ok: true }; }
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(b.data || '');
  if (!m) throw httpErr(400, 'Cachet au format PNG attendu (fond transparent de préférence).');
  fs.writeFileSync(path.join(DATA, 'cachet.png'), Buffer.from(m[1], 'base64'));
  base.audit(ctx.session.name, 'cachet', 'params', 'cachet.png');
  return { ok: true };
});
route('GET', '/api/cachet', ALL, (ctx) => {
  const f = stampFile(); if (!f) throw httpErr(404, 'Pas de cachet.');
  send(ctx.res, 200, fs.readFileSync(f), 'image/png'); return ctx.KEEP;
});
route('GET', '/api/certificat', ADM, () => {
  const f = certFile(); const libs = !!loadSign();
  if (!f) return { present: false, libs };
  try { return { present: true, libs, ...certInfo(fs.readFileSync(f), secrets.get().p12Pass || '') }; }
  catch (e) { return { present: true, libs, error: e.message }; }
});
route('POST', '/api/certificat', ADM, async (ctx) => {
  const b = await readJSON(ctx.req, 2e6);
  if (b.data === null) { try { fs.unlinkSync(path.join(DATA, 'signature.p12')); } catch {} const s = secrets.mutable(); delete s.p12Pass; secrets.set(s, ctx.session.name, { force: true }); base.audit(ctx.session.name, 'certificat retiré', 'params', ''); return { ok: true }; }
  const m = /^data:[^;]*;base64,([A-Za-z0-9+/=]+)$/.exec(b.data || '');
  if (!m) throw httpErr(400, 'Fichier .p12 / .pfx attendu.');
  const buf = Buffer.from(m[1], 'base64'); const pass = String(b.password || '');
  let info; try { info = certInfo(buf, pass); } catch (e) { throw httpErr(400, /Invalid password|MAC could not be verified|PKCS#12 MAC/i.test(e.message) ? 'Mot de passe du certificat incorrect.' : 'Certificat illisible : ' + e.message); }
  if (info.validTo < Date.now()) throw httpErr(400, 'Ce certificat est expiré (' + new Date(info.validTo).toLocaleDateString('fr-TN') + ').');
  fs.writeFileSync(path.join(DATA, 'signature.p12'), buf);
  const s = secrets.mutable(); s.p12Pass = pass; secrets.set(s, ctx.session.name, { force: true });
  // essai de signature réel
  try { await signBuffer(await pdf.render({ kind: 'facture', no: 'TEST', at: Date.now(), company: params().company || {}, client: { name: 'Test' }, lines: [{ label: 'Test', qty: 1, pu: 1 }], vat: 19, timbre: 0 }), 'Test'); }
  catch (e) { try { fs.unlinkSync(path.join(DATA, 'signature.p12')); } catch {} throw httpErr(400, 'Signature impossible avec ce certificat : ' + e.message); }
  base.audit(ctx.session.name, 'certificat', 'params', info.cn);
  return { ok: true, ...info };
});

/* ---------- Factures et devis ---------- */
route('POST', '/api/orders/:id/facture', SALES, async (ctx) => {
  const o = base.get('orders', dec(ctx.params.id));
  if (!o) throw httpErr(404, 'Commande introuvable.');
  const redo = ctx.url.searchParams.get('refaire') === '1';
  if (redo && ctx.session.role !== 'admin') throw httpErr(403, 'Seul l\'administrateur peut refaire une facture.');
  const r = ensureInvoice(o, ctx.session.name, redo);
  return { invoice: { no: r.invoice.no, at: r.invoice.at } };
});
route('GET', '/api/orders/:id/facture.pdf', SALES, async (ctx) => {
  const o = base.get('orders', dec(ctx.params.id));
  if (!o || !o.invoice) throw httpErr(404, 'Facture introuvable : créez-la d\'abord.');
  const buf = await invoicePDF(o);
  send(ctx.res, 200, buf, 'application/pdf', { 'Content-Disposition': `inline; filename="Facture-${o.invoice.no}.pdf"` });
  return ctx.KEEP;
});
route('GET', '/api/devis/:id/pdf', SALES, async (ctx) => {
  const q = base.get('quotes', dec(ctx.params.id));
  if (!q) throw httpErr(404, 'Devis introuvable.');
  const buf = await renderPDF(quoteDoc(q));
  send(ctx.res, 200, buf, 'application/pdf', { 'Content-Disposition': `inline; filename="Devis-${q.no}.pdf"` });
  return ctx.KEEP;
});
route('POST', '/api/email/send', SALES, async (ctx) => {
  const b = await readJSON(ctx.req, 200e3);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.to || ''))) throw httpErr(400, 'Adresse e-mail du destinataire invalide.');
  const attachments = [];
  if (b.attach && b.attach.kind === 'facture') {
    let o = base.get('orders', b.attach.id); if (!o) throw httpErr(404, 'Commande introuvable.');
    o = ensureInvoice(o, ctx.session.name);
    attachments.push({ filename: `Facture-${o.invoice.no}.pdf`, content: await invoicePDF(o) });
  } else if (b.attach && b.attach.kind === 'bon') {
    const a = base.get('purchases', b.attach.id); if (!a) throw httpErr(404, 'Bon de commande introuvable.');
    const p = params(); const sup = a.supplier || {};
    attachments.push({ filename: `Bon-${a.no}.pdf`, content: await renderPDF({ kind: 'bon', no: a.no, at: a.at || Date.now(), company: p.company || {}, client: { name: sup.name || 'Fournisseur', phone: sup.phone, email: sup.email }, lines: (a.lines || []).map(l => ({ label: l.label + (l.unit ? ' (' + l.unit + ')' : ''), qty: +l.qty || 0, pu: +l.pu || 0 })), discountPct: 0, vat: +a.vat || 0, timbre: 0, notes: a.notes, logo: logoFile() }) });
  } else if (b.attach && b.attach.kind === 'devis') {
    const q = base.get('quotes', b.attach.id); if (!q) throw httpErr(404, 'Devis introuvable.');
    attachments.push({ filename: `Devis-${q.no}.pdf`, content: await renderPDF(quoteDoc(q)) });
    if (q.status === 'brouillon' || !q.status) base.put('quotes', { ...q, status: 'envoye', sentAt: Date.now() }, ctx.session.name);
  }
  try {
    await conn.sendMail({ to: b.to, subject: String(b.subject || '').slice(0, 200), text: String(b.text || '').slice(0, 20000), attachments });
  } catch (e) { throw httpErr(502, 'Envoi impossible : ' + e.message); }
  base.audit(ctx.session.name, 'e-mail envoyé', b.attach ? b.attach.kind : 'mail', b.attach ? b.attach.id : '', b.to);
  return { ok: true };
});

/* ---------- Réseaux et connexions ---------- */
route('GET', '/api/social/media', SALES, () => base.setting('social_media', { items: [] }));
route('GET', '/api/connecteurs/status', SALES, () => ({ status: conn.publicStatus() }));
route('GET', '/api/connecteurs', ADM, () => {
  const s = secrets.get();
  return { config: mask({ imap: s.imap || {}, smtp: s.smtp || {}, meta: s.meta || {}, assistant: s.assistant || {}, paiement: s.paiement || {} }), status: conn.publicStatus(), printers: printerList().map(p => ({ id: p.id, name: p.name, ip: p.ip || '', serial: p.serial || '', hasCode: !!p.accessCode })) };
});
route('POST', '/api/connecteurs', ADM, async (ctx) => {
  const b = await readJSON(ctx.req);
  const s = secrets.mutable();
  for (const k of ['imap', 'smtp', 'meta', 'assistant', 'paiement']) if (b[k]) s[k] = mergeSecrets(s[k], b[k]);
  secrets.set(s, ctx.session.name, { force: true });
  base.audit(ctx.session.name, 'connexions modifiées', 'connecteurs', Object.keys(b).join(','));
  conn.restart();
  return { ok: true, status: conn.publicStatus() };
});
route('POST', '/api/connecteurs/test', ADM, async () => {
  const out = await conn.testEmail();
  const s = secrets.get();
  if (s.meta && s.meta.pageId && s.meta.pageToken) { await conn.pollMeta(); out.meta = conn.status.meta; }
  return { result: out, status: conn.publicStatus() };
});
route('POST', '/api/printers/config', ADM, async (ctx) => {
  const b = await readJSON(ctx.req);
  const s = secrets.mutable();
  const old = Object.fromEntries((s.printers || []).map(p => [p.id, p]));
  s.printers = (Array.isArray(b.printers) ? b.printers : []).filter(p => (config.printers || []).some(c => c.id === p.id)).map(p => {
    const o = old[p.id] || {};
    return { id: p.id, ip: String(p.ip || '').trim(), serial: String(p.serial || '').trim(), accessCode: p.accessCode && p.accessCode !== '••••••' ? String(p.accessCode).trim() : (o.accessCode || '') };
  });
  secrets.set(s, ctx.session.name);
  printers.configure(printerList());
  base.audit(ctx.session.name, 'imprimantes configurées', 'printers', '');
  return { ok: true };
});


/* ---------- Notifications ---------- */
route('GET', '/api/push/key', ALL, () => { const v = vapid(); return { key: v ? v.publicKey : null }; });
route('POST', '/api/push/subscribe', ALL, async (ctx) => {
  const b = await readJSON(ctx.req, 20e3);
  const sub = b.sub; if (!sub || typeof sub.endpoint !== 'string' || !sub.keys) throw httpErr(400, 'Abonnement invalide.');
  // uniquement les services de notification des navigateurs (le serveur ne doit pas écrire vers une adresse quelconque)
  let host = ''; try { const u = new URL(sub.endpoint); if (u.protocol === 'https:') host = u.hostname; } catch {}
  if (!/(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)$/.test(host)) throw httpErr(400, 'Service de notification non reconnu.');
  const prev = base.db.prepare('SELECT user FROM push_subs WHERE endpoint=?').get(sub.endpoint);
  if (prev && prev.user !== ctx.session.name) base.db.prepare('DELETE FROM push_subs WHERE endpoint=?').run(sub.endpoint); // appareil passé à un autre compte
  base.db.prepare('INSERT INTO push_subs(endpoint,user,data,ua,at) VALUES (?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user=excluded.user, data=excluded.data, ua=excluded.ua, at=excluded.at').run(sub.endpoint, ctx.session.name, JSON.stringify(sub), String(b.ua || '').slice(0, 120), Date.now());
  return { ok: true };
});
route('GET', '/api/push/poll', ALL, (ctx) => {
  const since = Number(new URL(ctx.req.url, 'http://x').searchParams.get('since') || 0);
  const rows = base.db.prepare('SELECT id,data,at FROM push_queue WHERE user=? AND id>? ORDER BY id LIMIT 20').all(ctx.session.name, since);
  return { items: rows.map(r => ({ id: r.id, at: r.at, ...JSON.parse(r.data) })), last: rows.length ? rows[rows.length - 1].id : since };
});
// attente longue pour l'app Android (connexion en direct) : répond dès qu'une notification arrive, sinon après 45 s
const pushWaiters = new Map();
function wakePush(names) { for (const w of [...pushWaiters.values()]) if (names.includes(w.name)) w.done(); }
route('GET', '/api/push/wait', ALL, (ctx) => {
  const name = ctx.session.name;
  const since = Number(ctx.url.searchParams.get('since') || 0);
  const read = () => {
    const rows = base.db.prepare('SELECT id,data,at FROM push_queue WHERE user=? AND id>? ORDER BY id LIMIT 20').all(name, since);
    return { items: rows.map(r => ({ id: r.id, at: r.at, ...JSON.parse(r.data) })), last: rows.length ? rows[rows.length - 1].id : since };
  };
  const now = read(); if (now.items.length) return now;
  // au plus 3 attentes par compte (téléphones) : la plus ancienne répond tout de suite
  const mine = [...pushWaiters.values()].filter(w => w.name === name);
  for (const w of mine.slice(0, Math.max(0, mine.length - 2))) w.done();
  return new Promise((resolve) => {
    const id = crypto.randomBytes(8).toString('hex');
    const done = () => { if (!pushWaiters.has(id)) return; pushWaiters.delete(id); clearTimeout(t); resolve(read()); };
    const t = setTimeout(done, 45e3);
    pushWaiters.set(id, { name, done });
    ctx.req.on('close', done);
  });
});
route('DELETE', '/api/push/subscribe', ALL, async (ctx) => { const b = await readJSON(ctx.req); base.db.prepare('DELETE FROM push_subs WHERE endpoint=? AND user=?').run(String(b.endpoint || ''), ctx.session.name); return { ok: true }; });
route('POST', '/api/push/test', ALL, async (ctx) => { await push([ctx.session.name], { title: 'FAZA 3D Atelier', body: 'Les notifications fonctionnent sur cet appareil.', tag: 'test', force: true }); return { ok: true }; });

/* ---------- Fichiers joints aux commandes ---------- */
const FILE_EXT = /\.(stl|3mf|obj|step|stp|svg|dxf|pdf|png|jpe?g|webp|ai|zip|gcode|bgcode|f3d|skp|docx?|xlsx?)$/i;
route('PUT', '/api/fichiers', ALL, async (ctx) => {
  const name = String(ctx.url.searchParams.get('name') || '').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  if (!FILE_EXT.test(name)) throw httpErr(400, 'Type de fichier non accepté (STL, 3MF, OBJ, STEP, SVG, DXF, PDF, images, ZIP, G-code).');
  const id = crypto.randomBytes(12).toString('hex');
  const size = await saveUpload(ctx.req, path.join(FILES, id), 150e6);
  const order = String(ctx.url.searchParams.get('order') || '').slice(0, 40);
  fs.writeFileSync(path.join(FILES, id + '.json'), JSON.stringify({ name, size, by: ctx.session.name, at: Date.now(), order }));
  base.audit(ctx.session.name, 'fichier', 'orders', order, name);
  return { id, name, size, at: Date.now(), by: ctx.session.name };
});
// suppression : l'équipe commerciale, ou la personne qui a déposé le fichier
route('DELETE', '/api/fichiers/:id', ALL, (ctx) => {
  const id = ctx.params.id; if (!/^[a-f0-9]{24}$/.test(id)) throw httpErr(404, 'Fichier introuvable.');
  let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(FILES, id + '.json'), 'utf8')); } catch {}
  if (!SALES.includes(ctx.session.role) && meta.by !== ctx.session.name) throw httpErr(403, 'Seule la personne qui a déposé ce fichier (ou l\'équipe commerciale) peut le supprimer.');
  for (const f of [path.join(FILES, id), path.join(FILES, id + '.json')]) { try { fs.unlinkSync(f); } catch {} }
  base.audit(ctx.session.name, 'fichier supprimé', 'orders', meta.order || '', meta.name || id);
  return { ok: true };
});
function serveFile(ctx) {
  const id = ctx.params.id; if (!/^[a-f0-9]{24}$/.test(id)) throw httpErr(404, 'Fichier introuvable.');
  const f = path.join(FILES, id); if (!fs.existsSync(f)) throw httpErr(404, 'Fichier introuvable.');
  let meta = {}; try { meta = JSON.parse(fs.readFileSync(f + '.json', 'utf8')); } catch {}
  const ext = (meta.name || '').split('.').pop().toLowerCase();
  const types = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', zip: 'application/zip' };
  const inline = ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext) && ctx.url.searchParams.get('dl') !== '1';
  send(ctx.res, 200, fs.readFileSync(f), types[ext] || 'application/octet-stream', { 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(meta.name || id)}`, 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'" });
  return ctx.KEEP;
}
route('GET', '/fichiers/:id', ALL, serveFile);

/* ---------- Caméras ---------- */
route('GET', '/api/printers/:id/camera.jpg', ALL, (ctx) => {
  const id = ctx.params.id;
  if (!printers.list.some(p => p.id === id)) throw httpErr(404, 'Imprimante inconnue.');
  printers.wantImage(id);
  const img = printers.image(id);
  if (!img || Date.now() - img.at > 60e3) throw Object.assign(httpErr(404, printers.cameraError(id) || (printers.relayAlive() || printers.clients[id] ? 'Image en cours de chargement…' : 'Caméra non disponible : imprimante non reliée.')), { body: { pending: true } });
  send(ctx.res, 200, img.buf, 'image/jpeg', { 'Cache-Control': 'no-store', 'X-Image-At': String(img.at) });
  return ctx.KEEP;
});

/* ---------- Avoirs ---------- */
route('POST', '/api/orders/:id/avoir', ADM, async (ctx) => {
  const o = base.get('orders', dec(ctx.params.id));
  if (!o) throw httpErr(404, 'Commande introuvable.');
  if (!o.invoice) throw httpErr(400, 'Un avoir se fait sur une facture : facturez d\'abord la commande.');
  if (o.creditNote) throw httpErr(400, 'Cette facture a déjà un avoir (' + o.creditNote.no + ').');
  const b = await readJSON(ctx.req);
  const amount = +b.amount; const total = (+o.price || 0) + (+(params().rates && params().rates.timbre) || 0);
  if (!(amount > 0) || amount > total + 0.001) throw httpErr(400, 'Montant invalide : entre 0 et le total TTC de la facture.');
  const no = base.nextNumber('AV', new Date().getFullYear());
  o.creditNote = { no, at: Date.now(), amount: +amount.toFixed(3), reason: String(b.reason || '').slice(0, 300), total: amount >= total - 0.001 };
  base.put('orders', o, ctx.session.name);
  base.audit(ctx.session.name, 'avoir', 'orders', o.id, no + ' ' + amount);
  notify('commercial', `↩️ Avoir ${no} de ${pdf.fmt(amount)} DT sur la facture ${o.invoice.no} (${o.client}).`);
  return { creditNote: o.creditNote };
});
route('GET', '/api/orders/:id/avoir.pdf', SALES, async (ctx) => {
  const o = base.get('orders', dec(ctx.params.id));
  if (!o || !o.creditNote) throw httpErr(404, 'Avoir introuvable.');
  const p = params(); const vat = +(p.rates && p.rates.vat) || 19; const cn = o.creditNote;
  const lines = cn.total && Array.isArray(o.lines) && o.lines.length ? o.lines.map(l => ({ label: l.label, qty: +l.qty || 0, pu: +l.pu || 0 })) : [{ label: (cn.total ? 'Annulation de la facture ' : 'Avoir partiel sur la facture ') + o.invoice.no + (o.product ? ' : ' + o.product : ''), qty: 1, pu: (cn.amount - (cn.total ? (+(p.rates && p.rates.timbre) || 0) : 0)) / (1 + vat / 100) }];
  const buf = await renderPDF({ verifToken: o.verifToken || o.token, kind: 'avoir', no: cn.no, at: cn.at, company: p.company || {}, client: clientInfo(o.clientId, o.client), lines, discountPct: cn.total ? (+o.discountPct || 0) : 0, vat, timbre: cn.total ? (+(p.rates && p.rates.timbre) || 0) : 0, ref: o.invoice.no, reason: cn.reason, logo: logoFile() });
  send(ctx.res, 200, buf, 'application/pdf', { 'Content-Disposition': `inline; filename="Avoir-${cn.no}.pdf"` });
  return ctx.KEEP;
});

/* ---------- Bons de commande fournisseurs ---------- */
route('GET', '/api/achats/:id/pdf', SALES, async (ctx) => {
  const a = base.get('purchases', dec(ctx.params.id));
  if (!a) throw httpErr(404, 'Bon de commande introuvable.');
  const p = params(); const sup = a.supplier || {};
  const buf = await renderPDF({ kind: 'bon', no: a.no, at: a.at || Date.now(), company: p.company || {}, client: { name: sup.name || 'Fournisseur', phone: sup.phone, email: sup.email, address: sup.address },
    lines: (a.lines || []).map(l => ({ label: l.label + (l.unit ? ' (' + l.unit + ')' : ''), qty: +l.qty || 0, pu: +l.pu || 0 })), discountPct: 0, vat: a.vat != null ? +a.vat : 0, timbre: 0, notes: a.notes, deliverTo: p.company && p.company.address, logo: logoFile() });
  send(ctx.res, 200, buf, 'application/pdf', { 'Content-Disposition': `inline; filename="Bon-${a.no}.pdf"` });
  return ctx.KEEP;
});

/* ---------- Relais imprimantes (PC de l'atelier → serveur) ---------- */
function relayAuth(ctx) {
  const t = process.env.FAZA_RELAY_TOKEN || secrets.stored().relaisToken;
  const h = String(ctx.req.headers.authorization || '');
  if (!t || !safeEqual(h, 'Bearer ' + t)) throw httpErr(401, 'Jeton du relais invalide.');
}
route('POST', '/api/relais/etat', null, async (ctx) => {
  relayAuth(ctx);
  const b = await readJSON(ctx.req, 2e6);
  printers.fromRelay(b, String(b.name || '').slice(0, 60));
  return { ok: true, wanted: printers.list.filter(p => printers.wanted[p.id] && Date.now() - printers.wanted[p.id] < 30e3).map(p => p.id) };
});
route('POST', '/api/relais/camera/:id', null, async (ctx) => {
  relayAuth(ctx);
  const buf = await readRaw(ctx.req, 4e6);
  if (buf.length > 100 && buf[0] === 0xFF && printers.list.some(p => p.id === ctx.params.id)) printers.setImage(ctx.params.id, buf);
  return { ok: true };
});
route('POST', '/api/relais/token', ADM, (ctx) => {
  const s = secrets.mutable(); s.relaisToken = crypto.randomBytes(24).toString('hex'); secrets.set(s, ctx.session.name);
  base.audit(ctx.session.name, 'jeton relais', 'relais', '');
  return { token: s.relaisToken };
});

/* ---------- Rapports mensuels ---------- */
function hoursAll() { const o = {}; for (const p of printers.list) { const h = printers.hoursOf(p.id); if (h) o[p.name] = h; } return o; }
route('GET', '/api/rapports', ADM, () => rapport.list(REPORTS));
route('GET', '/api/rapports/:name', ADM, (ctx) => {
  const n = ctx.params.name; if (!/^(rapport|donnees)-\d{4}-\d{2}\.(pdf|xlsx)$/.test(n) || !fs.existsSync(path.join(REPORTS, n))) throw httpErr(404, 'Fichier introuvable.');
  const xl = n.endsWith('.xlsx');
  send(ctx.res, 200, fs.readFileSync(path.join(REPORTS, n)), xl ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf', { 'Content-Disposition': `${xl ? 'attachment' : 'inline'}; filename="${n}"` }); return ctx.KEEP;
});
route('POST', '/api/rapports/excel', ADM, async (ctx) => {
  const b = await readJSON(ctx.req);
  const y = +b.y, m = +b.m; if (!(y > 2020 && m >= 0 && m < 12)) throw httpErr(400, 'Mois invalide.');
  const r = rapport.generateExcel(base, REPORTS, y, m);
  base.audit(ctx.session.name, 'export Excel', 'rapports', r.name);
  return { name: r.name };
});
route('POST', '/api/rapports/generer', ADM, async (ctx) => {
  const b = await readJSON(ctx.req);
  const y = +b.y, m = +b.m; if (!(y > 2020 && m >= 0 && m < 12)) throw httpErr(400, 'Mois invalide.');
  const r = await rapport.generate(base, REPORTS, y, m, hoursAll());
  base.audit(ctx.session.name, 'rapport', 'rapports', r.name);
  try { r.excel = rapport.generateExcel(base, REPORTS, y, m); } catch (e) { console.log('! Excel : ' + e.message); }
  if (b.envoyer) await sendReport(r, y, m);
  return { name: r.name, excel: r.excel && r.excel.name };
});
async function sendReport(r, y, m) {
  const emails = String((params().company || {}).rapportEmails || '').split(/[;,\s]+/).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (!emails.length) return false;
  await conn.sendMail({ to: emails.join(', '), subject: `${(params().company || {}).brand || 'FAZA 3D'} : rapport de ${rapport.MONTHS[m]} ${y}`, text: `Bonjour,\n\nVeuillez trouver ci-joint le rapport mensuel de l'atelier pour ${rapport.MONTHS[m]} ${y}.\n\nCA HT livré : ${pdf.fmt(r.data.ca, 0)} DT (plan ${pdf.fmt(r.data.plan, 0)} DT) · dépenses HT : ${pdf.fmt(r.data.expHT, 0)} DT · encaissé : ${pdf.fmt(r.data.encaisse, 0)} DT.\n\nRapport généré automatiquement par la plateforme.`, attachments: [{ filename: r.name, content: r.buf }, ...(r.excel ? [{ filename: r.excel.name, content: r.excel.buf }] : [])] });
  return true;
}
async function monthlyReportJob() {
  const now = new Date();
  if (now.getDate() !== 1 || now.getHours() < 8) return;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const name = `rapport-${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}.pdf`;
  if (base.meta('rapport_auto') === name) return;
  try {
    const r = await rapport.generate(base, REPORTS, prev.getFullYear(), prev.getMonth(), hoursAll());
    try { r.excel = rapport.generateExcel(base, REPORTS, prev.getFullYear(), prev.getMonth()); } catch (e) { console.log('! Excel mensuel : ' + e.message); }
    base.setMeta('rapport_auto', name);
    let sent = false; try { sent = await sendReport(r, prev.getFullYear(), prev.getMonth()); } catch (e) { console.log('! Envoi du rapport : ' + e.message); }
    notify('general', `📊 Le rapport de ${rapport.MONTHS[prev.getMonth()]} ${prev.getFullYear()} est prêt, avec le fichier Excel du mois (Finances › Rapports mensuels)${sent ? ' et a été envoyé par e-mail aux associés' : ''}. CA HT livré : ${pdf.fmt(r.data.ca, 0)} DT.`);
  } catch (e) { console.log('! Rapport mensuel : ' + e.message); }
}
setInterval(monthlyReportJob, 15 * 60e3).unref();
setTimeout(monthlyReportJob, 60e3).unref();

/* ---------- Pages publiques : devis en ligne et suivi de commande ---------- */
const publicHits = new Map();
// limite par heure et par adresse IP ; chaque action sensible a son propre compteur (clé), le reste partage le compteur général (300/h)
function publicRate(ip, max = 300, key = 'g') { const k = key + ':' + ip; const now = Date.now(); const h = (publicHits.get(k) || []).filter(t => now - t < 3600e3); if (h.length >= max) throw httpErr(429, 'Trop de demandes, réessayez plus tard.'); h.push(now); publicHits.set(k, h); }
// compteurs des visiteurs partis : retirés chaque quart d'heure (la mémoire ne grossit pas)
setInterval(() => {
  const now = Date.now();
  for (const m of [publicHits, formHits]) for (const [k, h] of m) if (!h.length || now - h[h.length - 1] > 3600e3) m.delete(k);
}, 15 * 60e3).unref();
function publicQuote(q) {
  const t = pdf.totals({ lines: q.lines || [], discountPct: +q.discountPct || 0, vat: q.vat != null ? +q.vat : 19, timbre: q.timbre != null ? +q.timbre : 0 });
  const c = params().company || {};
  return { no: q.no, at: q.at, client: q.client, lines: (q.lines || []).map(l => ({ label: l.label, qty: +l.qty || 0, pu: +l.pu || 0 })), discountPct: +q.discountPct || 0, vat: q.vat != null ? +q.vat : 19, timbre: q.timbre != null ? +q.timbre : 0, totals: { ht: t.ht, tva: t.tva, timbre: t.timbre, ttc: t.ttc }, validityDays: +q.validityDays || 30, leadText: q.leadText, notes: q.notes, status: q.status, acceptedAt: q.acceptedAt || null, acceptedBy: q.acceptedBy || null, orderId: q.orderId || null, expired: (q.at || 0) + ((+q.validityDays || 30) * 864e5) < Date.now(), company: { brand: c.brand || 'FAZA 3D', name: c.name, phone: c.phone, email: c.email, address: c.address, terms: c.devisConditions } };
}
route('GET', '/api/public/devis/:token', null, (ctx) => { publicRate(ctx.realIp); const q = base.byToken('quotes', ctx.params.token); if (!q) throw httpErr(404, 'Devis introuvable.'); return publicQuote(q); });
route('GET', '/api/public/devis/:token/pdf', null, async (ctx) => {
  publicRate(ctx.realIp, 20, 'devis-token-pdf'); const q = base.byToken('quotes', ctx.params.token); if (!q) throw httpErr(404, 'Devis introuvable.');
  const buf = await renderPDF(quoteDoc(q)); send(ctx.res, 200, buf, 'application/pdf', { 'Content-Disposition': `inline; filename="Devis-${q.no}.pdf"` }); return ctx.KEEP;
});
route('POST', '/api/public/devis/:token/accepter', null, async (ctx) => {
  publicRate(ctx.realIp, 10, 'devis-token-accepter');
  if (!base.byToken('quotes', ctx.params.token)) throw httpErr(404, 'Devis introuvable.');
  const b = await readJSON(ctx.req, 20e3);
  // relu après la lecture du corps : deux clics simultanés ne créent qu'une commande (la suite est synchrone)
  const q = base.byToken('quotes', ctx.params.token); if (!q) throw httpErr(404, 'Devis introuvable.');
  if (!Array.isArray(q.lines) || !q.lines.length) throw httpErr(400, 'Ce devis est vide : contactez-nous.');
  const who = String(b.name || '').trim().slice(0, 80); if (who.length < 2) throw httpErr(400, 'Indiquez votre nom.');
  if (q.status === 'accepte' || q.orderId) return { ok: true, already: true, orderId: q.orderId || null };
  if (q.status === 'refuse') throw httpErr(400, 'Ce devis a été refusé : contactez-nous pour un nouveau devis.');
  const pq = publicQuote(q); if (pq.expired) throw httpErr(400, 'Ce devis a expiré : contactez-nous pour le mettre à jour.');
  // commande créée automatiquement, à l'étape « Commande reçue »
  const id = base.nextOrderId(); const now = Date.now();
  const qty = (q.lines || []).reduce((a, l) => a + (+l.qty || 0), 0) || 1;
  const order = { id, clientId: q.clientId, client: q.client, product: q.lines && q.lines.length === 1 ? q.lines[0].label : `${q.lines[0].label} et ${q.lines.length - 1} autre${q.lines.length > 2 ? 's' : ''}`, qty: q.lines.length === 1 ? (+q.lines[0].qty || 1) : qty, proc: '3d', printer: '', printH: 0,
    use: { mat: '', g: 0, sheet: '', m2: 0 }, due: now + 7 * 864e5, notes: 'Devis accepté en ligne par ' + who + (b.note ? '\n' + String(b.note).slice(0, 500) : ''), photos: [], files: [], payments: [], invoice: null, consumed: false,
    hist: [{ stage: 'cmd', at: now, by: 'client' }], created: now, createdBy: 'devis en ligne', lines: q.lines, discountPct: +q.discountPct || 0, quoteId: q.id, quoteNo: q.no, price: +(pq.totals.ttc - pq.totals.timbre).toFixed(3), source: 'Devis en ligne', token: crypto.randomBytes(16).toString('hex'), leadId: q.leadId || undefined };
  if (q.leadId) { const l0 = base.get('leads', q.leadId); if (l0 && l0.files && l0.files.length) order.files = l0.files.map(f => ({ ...f })); }
  base.tx(() => { base._upsert('orders', order, 'client', base.nextSeq()); base._upsert('quotes', { ...q, status: 'accepte', acceptedAt: now, acceptedBy: who, orderId: id }, 'client', base.nextSeq()); base.audit('client', 'devis accepté', 'quotes', q.id, who); });
  base.emit({ type: 'change', seq: base.seq() });
  if (q.leadId) { const l = base.get('leads', q.leadId); if (l && l.stage !== 'gagne') { l.stage = 'gagne'; (l.history = l.history || []).push({ stage: 'gagne', at: now, by: 'client' }); l.closedAt = now; l.orderId = id; base.put('leads', l, 'client'); } }
  notify('commercial', `✅ Devis ${q.no} accepté en ligne par ${who} (${q.client}) : commande ${id} créée, date promise à fixer.`);
  notify('production', `🆕 Nouvelle commande ${id} (${q.client}) venant du devis ${q.no}.`);
  return { ok: true, orderId: id, trackUrl: '/suivi/' + order.token, payOnline: !!(payCfg() && publicBase()) };
});
// vérification d'authenticité d'une facture (QR code imprimé sur le PDF)
route('GET', '/api/public/verif/:token', null, (ctx) => {
  publicRate(ctx.realIp);
  // factures récentes : code dédié ; anciennes factures (avant 4.3) : le QR porte encore le lien de suivi
  let o = base.byToken('orders', ctx.params.token, 'verifToken');
  if (!o) { const old = base.byToken('orders', ctx.params.token); if (old && !old.verifToken) o = old; }
  if (!o || !o.invoice) throw httpErr(404, 'Aucune facture ne correspond à ce code.');
  const co = params().company || {}; const t = pdf.totals(o.invoice.doc || orderDoc(o));
  const paid = (o.payments || []).reduce((a, p) => a + (+p.amount || 0), 0);
  const r = { no: o.invoice.no, at: o.invoice.at, client: o.client, ttc: +t.ttc.toFixed(3), paid: +paid.toFixed(3), issuer: co.name || 'FAZA 3D', mf: co.mf || '', signed: signActive(), order: o.id, product: o.product, qty: o.qty };
  if (o.creditNote) r.avoir = { no: o.creditNote.no, at: o.creditNote.at, total: o.creditNote.total };
  return r;
});
route('GET', '/api/public/suivi/:token', null, (ctx) => {
  publicRate(ctx.realIp); const o = base.byToken('orders', ctx.params.token); if (!o) throw httpErr(404, 'Commande introuvable.');
  const c = params().company || {}; const st = stageOf(o);
  const steps = ['cmd', 'cao', 'val', 'prod', 'fin', 'qc', 'pack', 'done'];
  return { pay: payInfo(o), id: o.id, product: o.product, qty: o.qty, client: o.client, stage: st, stageIndex: steps.indexOf(st), hist: (o.hist || []).map(h => ({ stage: h.stage, at: h.at })), due: o.due, ready: ['pack', 'done'].includes(st), delivered: st === 'done', photos: ['pack', 'done'].includes(st) ? (o.photos || []).slice(-3) : [], company: { brand: c.brand || 'FAZA 3D', phone: c.phone, address: c.address } };
});
route('GET', '/api/public/photo/:token/:name', null, (ctx) => {
  publicRate(ctx.realIp);
  const o = base.byToken('orders', ctx.params.token); if (!o || !(o.photos || []).includes('/photos/' + ctx.params.name)) throw httpErr(404, 'Introuvable.');
  const f = path.join(PHOTOS, path.basename(ctx.params.name)); if (!fs.existsSync(f)) throw httpErr(404, 'Introuvable.');
  send(ctx.res, 200, fs.readFileSync(f), f.endsWith('.png') ? 'image/png' : 'image/jpeg', { 'Cache-Control': 'private, max-age=3600' }); return ctx.KEEP;
});
route('GET', '/api/public/liens/:kind/:id', SALES, (ctx) => {
  // adresse publique d'un devis ou d'une commande (pour WhatsApp / e-mail)
  const base0 = publicBase();
  const rec = ctx.params.kind === 'devis' ? base.get('quotes', ctx.params.id) : base.get('orders', ctx.params.id);
  if (!rec || !rec.token) throw httpErr(404, 'Introuvable.');
  const pathq = (ctx.params.kind === 'devis' ? '/devis/' : '/suivi/') + rec.token;
  return { path: pathq, url: (base0 || '') + pathq, public: !!base0 };
});

/* ---------- E-mails automatiques au client (changement d'étape) ---------- */
const STAGE_MAIL = {
  cmd:  { fr: 'Nous avons bien reçu votre commande', ar: 'وصلتنا طلبيتك' },
  val:  { fr: 'Votre projet attend votre validation', ar: 'مشروعك في انتظار مصادقتك' },
  prod: { fr: 'Votre commande est en fabrication', ar: 'طلبيتك في التصنيع' },
  pack: { fr: 'Votre commande est prête', ar: 'طلبيتك جاهزة' },
  done: { fr: 'Votre commande a été livrée — merci !', ar: 'تم تسليم طلبيتك — شكرا !' },
};
// adresse publique de la plateforme : Paramètres › Société, sinon FAZA_PUBLIC_URL
function publicBase() { return String((params().company || {}).sitePublic || config.publicUrl || '').replace(/\/+$/, ''); }
async function clientStageMail(o, stage) {
  const co = params().company || {}; if (co.mailEtapes === false) return;
  const msg = STAGE_MAIL[stage]; if (!msg) return;
  const c = clientInfo(o.clientId, o.client); if (!c.email || !/^[^@\s]+@[^@\s]+$/.test(c.email)) return;
  const st = secrets.get().smtp || {}; if (!st.host || !st.user) return;
  const link = publicBase() && o.token ? publicBase() + '/suivi/' + o.token : '';
  const paid = (o.payments || []).reduce((a, p) => a + (+p.amount || 0), 0); const rest = Math.max(0, (+o.price || 0) - paid);
  const lines = [
    `Bonjour ${c.name || ''},`, '',
    `${msg.fr} : ${o.product || ''}${o.qty > 1 ? ' × ' + o.qty : ''} (commande ${o.id}).`,
    stage === 'cmd' && o.due ? `Date de livraison prévue : ${new Date(o.due).toLocaleDateString('fr-TN')}.` : '',
    stage === 'val' ? 'Merci de nous confirmer le visuel ou la maquette envoyée pour que la fabrication démarre.' : '',
    stage === 'pack' ? `Vous pouvez venir la récupérer à l'atelier${co.address ? ' (' + co.address + ')' : ''}${co.hours ? ', ' + co.hours : ''}, ou nous écrire pour la livraison.` + (rest > 0 ? ` Reste à régler : ${rest.toFixed(3)} TND.` : '') : '',
    stage === 'done' ? 'Merci pour votre confiance. Un avis ou une photo de la pièce en place nous ferait très plaisir !' : '',
    link ? `Suivi en ligne : ${link}` : '', '',
    `— ${co.brand || 'FAZA 3D'}${co.phone ? ' · ' + co.phone : ''}`, '', '——', '',
    `${msg.ar} : ${o.product || ''} (${o.id}).`, link ? `المتابعة : ${link}` : '',
  ].filter(l => l !== '' || true).join('\n').replace(/\n{3,}/g, '\n\n');
  await conn.sendMail({ to: c.email, subject: `${msg.fr} · ${o.id} · ${co.brand || 'FAZA 3D'}`, text: lines });
  base.audit('système', 'e-mail client', 'orders', o.id, stage);
}

/* ---------- Paiement en ligne (Konnect / Flouci) ---------- */
function payCfg() { const p = secrets.get().paiement || {}; const ok = p.actif !== false && ((p.provider === 'konnect' && p.apiKey && p.walletId) || (p.provider === 'flouci' && p.appToken && p.appSecret)); return ok ? p : null; }
function payInfo(o) {
  const p = payCfg(); const ttc = +o.price || 0; const paid = (o.payments || []).reduce((a, x) => a + (+x.amount || 0), 0); const rest = Math.max(0, +(ttc - paid).toFixed(3));
  const pct = Math.min(100, Math.max(10, +p?.acompte || 50));
  const acompte = paid <= 0 ? +Math.min(rest, Math.ceil(ttc * pct / 100 * 1000) / 1000).toFixed(3) : 0;
  return { ttc, paid, rest, online: !!(p && publicBase() && rest > 0 && !['done'].includes(stageOf(o))), provider: p ? p.provider : null, acompte, acomptePct: pct };
}
async function payFetch(url, opt) { const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(20e3) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || j.errors?.[0]?.message || j.result?.message || ('Réponse ' + r.status)); return j; }
async function payInit(o, amount, part, c) {
  const p = payCfg(); if (!p) throw httpErr(400, 'Paiement en ligne non configuré.');
  const id = crypto.randomBytes(12).toString('hex'); const pub = publicBase(); const millimes = Math.round(amount * 1000);
  const ret = `${pub}/api/public/paiement/retour/${id}`; let url, ref;
  if (p.provider === 'konnect') {
    const api = process.env.FAZA_KONNECT_URL || (p.sandbox ? 'https://api.preprod.konnect.network/api/v2' : 'https://api.konnect.network/api/v2');
    const [first, ...last] = String(c.name || 'Client').split(' ');
    const j = await payFetch(api + '/payments/init-payment', { method: 'POST', headers: { 'x-api-key': p.apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverWalletId: p.walletId, token: 'TND', amount: millimes, type: 'immediate', description: `${part === 'solde' ? 'Solde' : 'Acompte'} commande ${o.id} — ${o.product || ''}`.slice(0, 120), acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'], lifespan: 30, checkoutForm: false, addPaymentFeesToAmount: false, firstName: first, lastName: last.join(' ') || '-', phoneNumber: c.phone || '', email: c.email || '', orderId: o.id, webhook: ret, successUrl: ret, failUrl: ret, theme: 'light' }) });
    url = j.payUrl; ref = j.paymentRef;
  } else {
    const j = await payFetch('https://developers.flouci.com/api/generate_payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_token: p.appToken, app_secret: p.appSecret, amount: millimes, accept_card: 'true', session_timeout_secs: 1800, success_link: ret, fail_link: ret, developer_tracking_id: id }) });
    url = j.result && j.result.link; ref = j.result && j.result.payment_id;
  }
  if (!url || !ref) throw new Error('Le prestataire n’a pas renvoyé de lien de paiement.');
  base.db.prepare('INSERT INTO paiements_ligne (id, orderId, amount, part, provider, ref, status, created) VALUES (?,?,?,?,?,?,?,?)').run(id, o.id, amount, part, p.provider, ref, 'attente', Date.now());
  return { url, id };
}
async function payVerify(row) {
  const p = secrets.get().paiement || {};
  if (row.provider === 'konnect') {
    const api = process.env.FAZA_KONNECT_URL || (p.sandbox ? 'https://api.preprod.konnect.network/api/v2' : 'https://api.konnect.network/api/v2');
    const j = await payFetch(api + '/payments/' + row.ref, { headers: { 'x-api-key': p.apiKey } }); return (j.payment && j.payment.status) === 'completed';
  }
  const j = await payFetch('https://developers.flouci.com/api/verify_payment/' + row.ref, { headers: { apppublic: p.appToken, appsecret: p.appSecret } }); return (j.result && j.result.status) === 'SUCCESS';
}
async function paySettle(id) {
  if (!/^[a-f0-9]{24}$/.test(String(id))) throw httpErr(404, 'Paiement introuvable.');
  const row = base.db.prepare('SELECT * FROM paiements_ligne WHERE id=?').get(id); if (!row) throw httpErr(404, 'Paiement introuvable.');
  const o0 = base.get('orders', row.orderId); if (!o0) throw httpErr(404, 'Commande introuvable.');
  if (row.status === 'paye') return { ok: true, order: o0, already: true };
  let ok = false; try { ok = await payVerify(row); } catch (e) { console.error('Vérification paiement :', e.message); }
  if (!ok) { base.db.prepare("UPDATE paiements_ligne SET status='echec' WHERE id=? AND status='attente'").run(id); return { ok: false, order: o0 }; }
  const now = Date.now(); const label = row.provider === 'konnect' ? 'En ligne (Konnect)' : 'En ligne (Flouci)';
  // le prestataire appelle le webhook et le client revient en même temps : un seul des deux enregistre le paiement,
  // sur la version la plus récente de la commande (une modification de l'équipe pendant la vérification n'est pas perdue)
  let o = null;
  base.tx(() => {
    if (base.db.prepare("UPDATE paiements_ligne SET status='paye', paidAt=? WHERE id=? AND status<>'paye'").run(now, id).changes !== 1) return;
    o = base.get('orders', row.orderId);
    o.payments = [...(o.payments || []), { at: now, amount: +row.amount, mode: label, ref: row.ref, by: 'client' }];
    base._upsert('orders', o, 'client', base.nextSeq());
  });
  if (!o) return { ok: true, order: base.get('orders', row.orderId) || o0, already: true };
  base.emit({ type: 'change', seq: base.seq() }); base.audit('client', 'paiement en ligne', 'orders', o.id, row.ref);
  notify('commercial', `💳 ${(+row.amount).toFixed(3)} TND reçus en ligne (${label}) pour ${o.id} (${o.client || ''}) — ${row.part === 'solde' ? 'solde' : 'acompte'}.`);
  return { ok: true, order: o };
}
route('POST', '/api/public/suivi/:token/payer', null, async (ctx) => {
  publicRate(ctx.realIp, 20, 'suivi-token-payer'); const o = base.byToken('orders', ctx.params.token); if (!o) throw httpErr(404, 'Commande introuvable.');
  const b = await readJSON(ctx.req, 5e3); const info = payInfo(o); if (!info.online) throw httpErr(400, 'Paiement en ligne indisponible pour cette commande.');
  const amount = b.part === 'solde' || !info.acompte ? info.rest : info.acompte; if (amount < 1) throw httpErr(400, 'Montant trop faible.');
  const c = clientInfo(o.clientId, o.client);
  try { return await payInit(o, amount, b.part === 'solde' || !info.acompte ? 'solde' : 'acompte', c); } catch (e) { console.error('Paiement en ligne :', e.message); throw httpErr(502, 'Paiement indisponible pour le moment : réessayez plus tard ou contactez-nous.'); }
});
route('GET', '/api/public/paiement/retour/:id', null, async (ctx) => {
  publicRate(ctx.realIp, 60, 'paiement-retour-id'); const r = await paySettle(ctx.params.id);
  ctx.res.writeHead(302, { Location: `/suivi/${r.order.token}?paiement=${r.ok ? 'ok' : 'echec'}` }); ctx.res.end(); return ctx.KEEP;
});
route('POST', '/api/public/paiement/retour/:id', null, async (ctx) => { publicRate(ctx.realIp, 60, 'paiement-retour-id'); const r = await paySettle(ctx.params.id); return { ok: r.ok }; });
route('POST', '/api/paiement/test', ADM, async () => {
  const p = payCfg(); if (!p) throw httpErr(400, 'Renseignez le prestataire et ses clés.'); if (!publicBase()) throw httpErr(400, 'Adresse publique de la plateforme requise (Paramètres › Société).');
  const fake = { id: 'TEST', product: 'Test', price: 1, payments: [], token: 'x' };
  try { const r = await payInit(fake, 1, 'acompte', { name: 'Test Faza', phone: '', email: '' }); base.db.prepare('DELETE FROM paiements_ligne WHERE id=?').run(r.id); return { ok: true, note: 'Lien de paiement de 1 TND créé avec succès (' + p.provider + ') : les clés sont bonnes.' }; }
  catch (e) { throw httpErr(400, 'Échec : ' + e.message); }
});

/* ---------- Formulaire public de commande ---------- */
const formHits = new Map();
const SRC = { instagram: 'Instagram', ig: 'Instagram', facebook: 'Facebook', fb: 'Facebook', tiktok: 'TikTok', tt: 'TikTok', whatsapp: 'WhatsApp', wa: 'WhatsApp', site: 'Site web', google: 'Google', salon: 'Salon', qr: 'QR code', bouche: 'Recommandation' };
async function publicOrder(ctx) {
  const ip = ctx.realIp || ctx.ip;
  const now = Date.now(); const h = (formHits.get(ip) || []).filter(t => now - t < 3600e3);
  if (h.length >= 5) throw httpErr(429, 'Trop de demandes envoyées. Réessayez plus tard ou appelez-nous.');
  const b = await readJSON(ctx.req, 20e3);
  if (b.website) return { ok: true }; // piège à robots
  const name = String(b.name || '').trim().slice(0, 80), phone = String(b.phone || '').replace(/[^\d+ ]/g, '').trim().slice(0, 20), email = String(b.email || '').trim().slice(0, 120);
  if (name.length < 2 || (!phone && !email)) throw httpErr(400, 'Indiquez votre nom et un téléphone ou un e-mail.');
  h.push(now); formHits.set(ip, h);
  const src = SRC[String(b.src || '').toLowerCase()] || (b.how && SRC[String(b.how).toLowerCase()]) || 'Formulaire';
  const text = [b.product && 'Produit : ' + String(b.product).slice(0, 200), b.qty && 'Quantité : ' + String(b.qty).slice(0, 20), b.deadline && 'Pour le : ' + String(b.deadline).slice(0, 40), b.details && String(b.details).slice(0, 2000), b.link && 'Fichier ou exemple : ' + String(b.link).slice(0, 300), b.lang === 'ar' && 'Formulaire rempli en arabe'].filter(Boolean).join('\n');
  const files = [];
  for (const f of Array.isArray(b.files) ? b.files.slice(0, 10) : []) {
    const id = String(f && f.id || ''); if (!/^[a-f0-9]{24}$/.test(id)) continue;
    try {
      const mf = path.join(FILES, id + '.json'); const meta = JSON.parse(fs.readFileSync(mf, 'utf8'));
      if (meta.by !== 'site' || !meta.pending) continue;
      fs.writeFileSync(mf, JSON.stringify({ ...meta, pending: false }));   // rattaché : gardé
      files.push({ id, name: meta.name, size: meta.size, at: meta.at, by: 'site' });
    } catch {}
  }
  const lead = conn.addLead({ source: src, name, phone, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '', company: String(b.company || '').slice(0, 80), text: text + (files.length ? '\nFichier(s) joint(s) : ' + files.map(f => f.name).join(', ') : ''), channel: 'Formulaire' });
  if (files.length && lead) { lead.files = [...(lead.files || []), ...files].slice(-20); base.put('leads', lead, 'site'); }
  return { ok: true };
}
route('POST', '/api/public/commande', null, publicOrder);
// fichier envoyé depuis le site vitrine (STL/OBJ de l'estimation, plans…), rattaché ensuite à la demande
const PUBLIC_EXT = /\.(stl|obj|3mf|step|stp|svg|dxf|pdf|png|jpe?g|webp|zip|ai)$/i;
route('PUT', '/api/public/fichier', null, async (ctx) => {
  publicRate(ctx.realIp, 10, 'fichier');
  const name = String(ctx.url.searchParams.get('name') || '').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  if (!PUBLIC_EXT.test(name)) throw httpErr(400, 'Type de fichier non accepté.');
  publicUploadBudget(+ctx.req.headers['content-length'] || 0);
  const id = crypto.randomBytes(12).toString('hex');
  const size = await saveUpload(ctx.req, path.join(FILES, id), 60e6);
  publicUploads.bytes += size;
  fs.writeFileSync(path.join(FILES, id + '.json'), JSON.stringify({ name, size, by: 'site', at: Date.now(), order: '', pending: true }));
  return { id, name, size };
});
// volume quotidien des dépôts publics (FAZA_PUBLIC_UPLOAD_DAILY_MB) : le disque du serveur ne peut pas être rempli depuis le site
const publicUploads = { day: '', bytes: 0 };
function publicUploadBudget(incoming) {
  const day = new Date().toISOString().slice(0, 10);
  if (publicUploads.day !== day) { publicUploads.day = day; publicUploads.bytes = 0; }
  if (publicUploads.bytes + incoming > config.publicUploadDailyMB * 1e6) throw httpErr(503, 'Dépôt de fichiers momentanément indisponible : envoyez votre fichier par e-mail ou WhatsApp.');
}
// fichiers déposés depuis le site mais jamais rattachés à une demande : effacés après 48 h
function purgePendingUploads() {
  const limit = Date.now() - 48 * 3600e3;
  // les versions précédentes ne retiraient pas la marque « pending » : un fichier cité par une demande ou une commande est gardé
  const used = new Set();
  for (const c of ['leads', 'orders']) for (const r of base.all(c)) for (const x of r.files || []) used.add(x && x.id);
  for (const f of fs.readdirSync(FILES).filter(x => /^[a-f0-9]{24}\.json$/.test(x))) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(FILES, f), 'utf8'));
      if (meta.pending && meta.at < limit && !used.has(f.slice(0, -5))) for (const x of [f, f.slice(0, -5)]) fs.rmSync(path.join(FILES, x), { force: true });
    } catch { /* fichier en cours d'écriture : vu au prochain passage */ }
  }
}
setInterval(purgePendingUploads, 3600e3).unref();

/* ---------- Assistant IA du site (répond en tunisien, crée les demandes) ---------- */
const ASSIST_LANG = {
  fr: 'Réponds en français simple.',
  ar: 'جاوب بالدارجة التونسية (بالحروف العربية)، بأسلوب ودود ومختصر. إذا كتب الزائر بالفرنسية جاوب بالفرنسية، وإذا كتب بالتونسي بالحروف اللاتينية (مثلاً "chnoua") جاوب بنفس الطريقة.',
};
function assistantSystem(lang) {
  const p = params(); const c = p.company || {}; const st = p.site || {}; const t = st.tarif || {};
  const base = publicBase();
  return [
    `Tu es l'assistant de FAZA 3D, un atelier de fabrication numérique à Tunis (impression 3D, découpe et gravure laser CO2, scan 3D). Tu t'appelles « FAZA ». Tu parles comme un Tunisien chaleureux : ${lang === 'ar' ? ASSIST_LANG.ar : 'si le visiteur écrit en tunisien ou en arabe, réponds en darija tunisienne (حروف عربية) ; sinon en français simple.'} Réponses courtes (2 à 5 phrases), concrètes, sans inventer.`,
    `Ce que l'atelier fabrique : trophées et médailles (hybrides plexi + 3D), cadeaux d'entreprise au logo (porte-clés, supports, coffrets gravés), plaques et signalétique en plexiglas, cadeaux personnalisés (lithophanes, figurines à partir d'un scan 3D, cadres gravés, déco Ramadan), maquettes d'architecture, modèles anatomiques pour cabinets, prototypes et pièces techniques.`,
    `Prix de départ (HT, TVA 19 % en plus) : porte-clés 3D dès 5 TND (dégressif dès 20) ; plaque gravée plexi A4 dès 25 TND ; lampe lithophane avec socle ${t.lithophane || 55} TND ; trophée hybride 25 cm dès 60 TND (dégressif dès 10) ; maquettes et prototypes sur devis. Remises : -10 % dès 20 pièces, -20 % dès 100. Offre de lancement : -15 % sur la première commande. Conception incluse au-delà d'un seuil, sinon forfait 30 à 150 TND. Délais : goodies et plaques 2-3 jours, lithophanes 3-4 jours, trophées 4-7 jours. Acompte 50 % à la commande, solde à la livraison. Livraison Grand Tunis par coursier, ailleurs par transporteur, ou retrait à l'atelier.`,
    `Sur le site, le visiteur peut déposer un fichier 3D (STL/OBJ), une photo (lithophane) ou un logo (relief) pour voir un aperçu 3D et un prix estimé ; le devis exact arrive sous 24 h. Horaires : ${st.hours || 'Lun–Sam 9h–18h'}. Téléphone / WhatsApp : ${st.whatsapp || c.phone || '[non renseigné]'}. E-mail : ${c.email || '[non renseigné]'}. Adresse : ${c.address || 'Grand Tunis'}.`,
    `Image → objet 3D : quand le visiteur envoie une image (photo ou logo), décris en une phrase ce que tu vois, puis propose le mode : « lithophane » pour une photo (visages, paysages, souvenirs : la photo apparaît quand on éclaire la plaque) ou « relief » pour un logo, un dessin, un texte, une silhouette (le noir ressort en relief sur une plaque ou un porte-clés). Demande ou propose les dimensions réelles en millimètres (largeur ; la hauteur suit les proportions de l'image ; épaisseur 2 à 4 mm pour un relief). Dès que le mode et la largeur sont connus, termine ta réponse par une ligne EXACTEMENT de cette forme : <<MAKE {"mode":"litho"|"relief","width":120,"thickness":3}>> — le site génère alors le modèle 3D à ces dimensions et affiche le prix calculé (tu ne donnes pas de prix toi-même pour ces objets : dis que le prix s'affiche sous l'aperçu). Si le visiteur veut une vraie figurine ou un objet complet en volume à partir d'une photo, explique que ça se fait à l'atelier avec le scanner 3D (sur devis), pas automatiquement.`,
    `Ton objectif : aider, puis obtenir une demande de devis. Quand le visiteur veut un devis ou une commande, demande-lui (en une fois) son prénom, son numéro de téléphone ou WhatsApp, et ce qu'il veut (objet, quantité, date). Dès que tu as au moins un nom ET un téléphone ou e-mail, termine ta réponse par une ligne EXACTEMENT de cette forme, sur une seule ligne : <<LEAD {"name":"…","phone":"…","email":"…","text":"résumé du besoin, quantité, date"}>> — cette ligne est invisible pour le visiteur et crée la demande dans l'atelier ; dis-lui alors que l'équipe le rappelle sous 24 h. N'invente jamais de prix hors de ceux ci-dessus : pour tout le reste, dis « sur devis ». Ne parle pas d'autres sujets que l'atelier. Si on te demande si tu es un robot, dis que oui, tu es l'assistant automatique de FAZA 3D, et qu'un humain prend le relais dès la demande envoyée.`,
  ].join('\n\n');
}
// plafond quotidien global (FAZA_ASSISTANT_DAILY_LIMIT) : protège la facture de l'API même si les limites par IP sont contournées
function assistantBudget() {
  if (!config.assistantDailyLimit) return;
  const day = new Date().toISOString().slice(0, 10);
  const [d, n] = String(base.meta('assistant_jour') || '').split('|');
  const count = d === day ? +n || 0 : 0;
  if (count >= config.assistantDailyLimit) throw httpErr(503, 'L\'assistant a beaucoup travaillé aujourd\'hui : écrivez-nous sur WhatsApp ou via le formulaire.');
  base.setMeta('assistant_jour', `${day}|${count + 1}`);
}
route('POST', '/api/public/assistant', null, async (ctx) => {
  publicRate(ctx.realIp, 40, 'assistant');
  const a = secrets.get().assistant || {};
  if (!a.apiKey || a.actif === false) throw httpErr(503, 'Assistant non disponible.');
  const b = await readJSON(ctx.req, 2.5e6);
  const lang = b.lang === 'ar' ? 'ar' : 'fr';
  const msgs = (Array.isArray(b.messages) ? b.messages : []).filter(m => m && typeof m === 'object').slice(-16).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 2000) })).filter(m => m.content);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') throw httpErr(400, 'Message vide.');
  const clean = []; for (const m of msgs) { if (clean.length && clean[clean.length - 1].role === m.role) clean[clean.length - 1].content += '\n' + m.content; else clean.push({ ...m }); }
  if (clean[0].role !== 'user') clean.shift();
  // image jointe au dernier message (photo ou logo, jpeg/png/webp, ≤ 1,5 Mo en base64)
  if (b.image && typeof b.image.data === 'string' && /^image\/(jpeg|png|webp)$/.test(b.image.type || '') && b.image.data.length < 2e6 && /^[A-Za-z0-9+/]+={0,2}$/.test(b.image.data)) {
    const last = clean[clean.length - 1]; last.content = [{ type: 'image', source: { type: 'base64', media_type: b.image.type, data: b.image.data } }, { type: 'text', text: typeof last.content === 'string' ? last.content : 'Voici mon image.' }];
  }
  assistantBudget();
  const r = await fetch(process.env.FAZA_ASSISTANT_URL || 'https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(45e3), headers: { 'content-type': 'application/json', 'x-api-key': a.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: a.model || 'claude-haiku-5-5', max_tokens: 500, system: assistantSystem(lang), messages: clean }) });
  if (!r.ok) { const txt = await r.text().catch(() => ''); console.log('! assistant : erreur API ' + r.status + ' ' + txt.slice(0, 200)); throw httpErr(502, 'Assistant indisponible pour le moment.'); }
  const j = await r.json(); let text = (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('').trim();
  let lead = null; const m = text.match(/<<LEAD\s*(\{[\s\S]*?\})\s*>>/);
  if (m) { try { lead = JSON.parse(m[1]); } catch {} text = text.replace(m[0], '').trim(); }
  let make = null; const mk = text.match(/<<MAKE\s*(\{[\s\S]*?\})\s*>>/);
  if (mk) { try { make = JSON.parse(mk[1]); } catch {} text = text.replace(mk[0], '').trim(); }
  if (make && !['litho', 'relief'].includes(make.mode)) make = null;
  if (lead && lead.name && (lead.phone || lead.email)) {
    try { conn.addLead({ source: 'Site web', name: String(lead.name).slice(0, 80), phone: String(lead.phone || '').replace(/[^\d+ ]/g, '').slice(0, 20), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(lead.email || '')) ? String(lead.email) : '', text: 'Via l\'assistant IA du site : ' + String(lead.text || '').slice(0, 1500), channel: 'Assistant IA' }); } catch (e) { console.log('! assistant : demande non créée : ' + e.message); }
  }
  return { reply: text, lead: !!lead, make };
});
route('POST', '/api/assistant/test', ADM, async (ctx) => {
  const a = secrets.get().assistant || {}; if (!a.apiKey) throw httpErr(400, 'Enregistrez d\'abord la clé API.');
  const r = await fetch(process.env.FAZA_ASSISTANT_URL || 'https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(45e3), headers: { 'content-type': 'application/json', 'x-api-key': a.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: a.model || 'claude-haiku-5-5', max_tokens: 200, system: assistantSystem('ar'), messages: [{ role: 'user', content: 'عسلامة، قداش سعر الميدالية بالطباعة ثلاثية الأبعاد ؟' }] }) });
  if (!r.ok) throw httpErr(502, 'API : ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 200));
  const j = await r.json(); return { reply: (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('') };
});
route('GET', '/api/public/assistant', null, () => { const a = secrets.get().assistant || {}; return { actif: !!a.apiKey && a.actif !== false }; });

/* ---------- Espace client du site (suivi des commandes, devis, factures) ---------- */
const normLogin = (v) => { v = String(v || '').trim().toLowerCase(); return v.includes('@') ? v : v.replace(/[^\d]/g, '').replace(/^00216|^\+?216/, '').replace(/^0+/, ''); };
const scryptAsync = require('util').promisify(crypto.scrypt);
async function webHash(pw, salt) { return (await scryptAsync(pw, salt, 64)).toString('hex'); }
function webSession(ctx) {
  const h = String(ctx.req.headers['authorization'] || ''); const sid = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!/^[a-f0-9]{48}$/.test(sid)) throw httpErr(401, 'Connectez-vous.');
  const row = base.db.prepare('SELECT login, exp FROM web_sessions WHERE sid=?').get(sid);
  if (!row || row.exp < Date.now()) throw httpErr(401, 'Session expirée, reconnectez-vous.');
  const acc = base.db.prepare('SELECT * FROM web_clients WHERE login=?').get(row.login); if (!acc) throw httpErr(401, 'Compte introuvable.');
  return acc;
}
function clientMatches(c, login) { if (!c) return false; const l = normLogin(login); return (c.email && normLogin(c.email) === l) || (c.phone && normLogin(c.phone) === l); }
// création : preuve de propriété = lien de suivi ou de devis reçu par le client
route('POST', '/api/public/compte/creer', null, async (ctx) => {
  publicRate(ctx.realIp, 20, 'compte-creer');
  const b = await readJSON(ctx.req, 20e3);
  const token = String(b.token || '').match(/[a-f0-9]{32}/); const pw = String(b.password || '');
  if (!token) throw httpErr(400, 'Collez votre lien de suivi ou de devis (reçu par WhatsApp ou e-mail).');
  if (pw.length < 8 || pw.length > 200) throw httpErr(400, 'Mot de passe : 8 caractères minimum.');
  const o = base.byToken('orders', token[0]) || base.byToken('quotes', token[0]); if (!o || !o.clientId) throw httpErr(404, 'Lien inconnu.');
  const c = base.get('clients', o.clientId); if (!c) throw httpErr(404, 'Client introuvable.');
  const login = normLogin(b.login || c.phone || c.email); if (!login || !clientMatches(c, login)) throw httpErr(400, 'Utilisez le téléphone ou l\'e-mail donné à la commande.');
  if (base.db.prepare('SELECT 1 FROM web_clients WHERE login=?').get(login)) throw httpErr(409, 'Un compte existe déjà : connectez-vous (mot de passe oublié : contactez l\'atelier).');
  const salt = crypto.randomBytes(16).toString('hex');
  base.db.prepare('INSERT INTO web_clients(login,clientId,salt,hash,created,lastAt) VALUES (?,?,?,?,?,?)').run(login, c.id, salt, await webHash(pw, salt), Date.now(), Date.now());
  base.audit('client', 'espace client créé', 'clients', c.id, login);
  return webLogin(login);
});
function webLogin(login) { const sid = crypto.randomBytes(24).toString('hex'); base.db.prepare('INSERT INTO web_sessions(sid,login,exp) VALUES (?,?,?)').run(sid, login, Date.now() + 30 * 864e5); base.db.prepare('DELETE FROM web_sessions WHERE exp<?').run(Date.now()); return { sid, login }; }
route('POST', '/api/public/compte/login', null, async (ctx) => {
  publicRate(ctx.realIp, 30, 'compte-login');
  const b = await readJSON(ctx.req, 20e3); const login = normLogin(b.login); const pw = String(b.password || '');
  let acc = base.db.prepare('SELECT * FROM web_clients WHERE login=?').get(login);
  if (!acc && login) { // l'autre identifiant du même client (téléphone ou e-mail)
    const c = base.all('clients').find(x => clientMatches(x, login));
    if (c) acc = base.db.prepare('SELECT * FROM web_clients WHERE clientId=?').get(c.id);
  }
  // limite par compte en plus de la limite par adresse : le téléphone sert d'identifiant, il se devine
  if (auth.blocked('client:' + login)) throw httpErr(429, 'Trop d\'essais. Réessayez dans 15 minutes.');
  const okPw = acc && pw.length <= 200 && crypto.timingSafeEqual(Buffer.from(acc.hash, 'hex'), Buffer.from(await webHash(pw, acc.salt), 'hex'));
  if (!okPw) { if (!acc) await webHash('x', 'y'); auth.failed('client:' + login); throw httpErr(401, 'Identifiant ou mot de passe incorrect.'); }
  auth.cleared('client:' + login);
  base.db.prepare('UPDATE web_clients SET lastAt=? WHERE login=?').run(Date.now(), acc.login);
  return webLogin(acc.login);
});
route('POST', '/api/public/compte/logout', null, async (ctx) => { const h = String(ctx.req.headers['authorization'] || ''); if (h.startsWith('Bearer ')) base.db.prepare('DELETE FROM web_sessions WHERE sid=?').run(h.slice(7)); return { ok: true }; });
route('POST', '/api/public/compte/mdp', null, async (ctx) => {
  publicRate(ctx.realIp);
  const acc = webSession(ctx); const b = await readJSON(ctx.req, 20e3); const pw = String(b.password || ''); if (pw.length < 8 || pw.length > 200) throw httpErr(400, '8 caractères minimum.');
  const salt = crypto.randomBytes(16).toString('hex'); base.db.prepare('UPDATE web_clients SET salt=?, hash=?, reset=NULL WHERE login=?').run(salt, await webHash(pw, salt), acc.login);
  // les autres appareils connectés sont déconnectés (celui-ci garde sa session)
  base.db.prepare('DELETE FROM web_sessions WHERE login=? AND sid<>?').run(acc.login, String(ctx.req.headers['authorization'] || '').slice(7)); return { ok: true };
});
const STEP_NAMES = { cmd: 'Commande reçue', cao: 'Conception', val: 'Validation', prod: 'Fabrication', fin: 'Finition', qc: 'Contrôle qualité', pack: 'Emballage', done: 'Livré' };
route('GET', '/api/public/compte', null, (ctx) => {
  const acc = webSession(ctx); const c = base.get('clients', acc.clientId) || {}; const steps = ['cmd', 'cao', 'val', 'prod', 'fin', 'qc', 'pack', 'done'];
  const orders = base.all('orders').filter(o => o.clientId === acc.clientId).sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 50).map(o => { const st = stageOf(o); return {
    id: o.id, product: o.product, qty: o.qty, stage: st, stageName: STEP_NAMES[st] || st, stageIndex: steps.indexOf(st), due: o.due, created: o.created, price: o.price, token: o.token, pay: payInfo(o),
    ready: ['pack', 'done'].includes(st), photos: ['pack', 'done'].includes(st) ? (o.photos || []).slice(-3).map(p => '/api/public/photo/' + o.token + '/' + path.basename(p)) : [],
    invoice: o.invoice ? { no: o.invoice.no, at: o.invoice.at } : null, paid: (o.payments || []).reduce((s, p) => s + (+p.amount || 0), 0) }; });
  const quotes = base.all('quotes').filter(q => q.clientId === acc.clientId && q.status !== 'brouillon').sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 30).map(q => ({ id: q.id, no: q.no, at: q.at, status: q.status, token: q.token, total: publicQuote(q).totals.ttc, orderId: q.orderId || null }));
  return { login: acc.login, client: { name: c.name, phone: c.phone, email: c.email }, orders, quotes, steps: steps.map(s => STEP_NAMES[s]) };
});
route('GET', '/api/public/compte/facture/:id/pdf', null, async (ctx) => {
  const acc = webSession(ctx); const o = base.get('orders', dec(ctx.params.id));
  if (!o || o.clientId !== acc.clientId || !o.invoice) throw httpErr(404, 'Facture introuvable.');
  const buf = await invoicePDF(o); send(ctx.res, 200, buf, 'application/pdf', { ...ctx.headers, 'Content-Disposition': `inline; filename="Facture-${o.invoice.no}.pdf"` }); return ctx.KEEP;
});
// côté équipe : remettre un accès à un client (mot de passe temporaire)
route('POST', '/api/clients/:id/acces', SALES, async (ctx) => {
  const c = base.get('clients', ctx.params.id); if (!c) throw httpErr(404, 'Client introuvable.');
  const login = normLogin(c.phone || c.email); if (!login) throw httpErr(400, 'Le client n\'a ni téléphone ni e-mail.');
  const tmp = crypto.randomBytes(6).toString('base64url'); const salt = crypto.randomBytes(16).toString('hex');
  base.db.prepare('INSERT INTO web_clients(login,clientId,salt,hash,created,lastAt) VALUES (?,?,?,?,?,?) ON CONFLICT(login) DO UPDATE SET salt=excluded.salt, hash=excluded.hash, clientId=excluded.clientId').run(login, c.id, salt, await webHash(tmp, salt), Date.now(), Date.now());
  base.db.prepare('DELETE FROM web_sessions WHERE login=?').run(login);
  base.audit(ctx.session.name, 'accès client réinitialisé', 'clients', c.id, login);
  return { login, password: tmp };
});
route('GET', '/api/public/info', null, () => {
  const p = params(); const c = p.company || {}; const st = p.site || {};
  return { brand: c.brand || 'FAZA 3D', phone: c.phone || '', email: c.email || '', address: c.address || '', whatsapp: st.whatsapp || c.phone || '',
    instagram: st.instagram || '', facebook: st.facebook || '', tiktok: st.tiktok || '', hours: st.hours || '', tarif: st.tarif || null, plateforme: publicBase() };
});

/* ---------- Webhook Meta (WhatsApp, Instagram, Messenger) ---------- */
async function webhook(ctx) {
  if (ctx.req.method === 'GET') {
    const ch = conn.verifyWebhook(ctx.url.searchParams);
    if (ch) { send(ctx.res, 200, String(ch), 'text/plain'); return ctx.KEEP; }
    throw httpErr(403, 'Vérification refusée.');
  }
  const raw = await readRaw(ctx.req, 2e6);
  if (!conn.receiveWebhook(raw, ctx.req.headers['x-hub-signature-256'])) throw httpErr(401, 'Signature invalide.');
  return { ok: true };
}
route('GET', '/webhook/meta', null, webhook);
route('POST', '/webhook/meta', null, webhook);

/* =================================================================== */
/*  Traitement des requêtes                                             */
/* =================================================================== */
const KEEP = Symbol('keep');
async function handle(req, res, opts = {}) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  // le port public (ancien mode tunnel) est toujours derrière cloudflared : l'adresse vient des en-têtes du tunnel
  const ip = opts.public ? (forwardedIp(req) || req.socket.remoteAddress) : clientIp(req);
  const ctx = { req, res, url, ip, headers: {}, KEEP, realIp: ip };
  try {
    if (opts.public) {
      // accès depuis internet (tunnel) : uniquement le formulaire et le webhook
      if (!(p === '/commande' || p === '/commande.js' || p === '/public.js' || p === '/app.css' || p === '/icone.svg' || p.startsWith('/polices/') || p.startsWith('/api/public/') || p === '/webhook/meta' || /^\/(devis|suivi|verif)\/[a-f0-9]{32}$/.test(p) || p.startsWith('/api/relais/'))) return send(res, 404, { error: 'Introuvable.' });
    }
    // le site vitrine (hébergé ailleurs) peut envoyer des demandes au formulaire public
    if (p === '/api/public/commande' || p === '/api/public/info' || p === '/api/public/fichier' || p === '/api/public/assistant' || p.startsWith('/api/public/compte')) {
      // FAZA_CORS_ORIGINS : adresses du site client autorisées (« * » = toutes, pratique pour tester le site en local)
      const origin = String(req.headers.origin || '').replace(/\/+$/, '');
      const any = config.corsOrigins.includes('*');
      const allow = any ? '*' : (config.corsOrigins.includes(origin) ? origin : config.corsOrigins[0]);
      const cors = { 'Access-Control-Allow-Origin': allow, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Faza, Authorization', 'Access-Control-Max-Age': '86400', ...(any ? { 'Access-Control-Allow-Private-Network': 'true' } : {}) };
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
      Object.assign(ctx.headers, cors);
    }
    if (req.method === 'GET' && serveStatic(p, res)) return;
    if (p === '/certificat-faza3d.crt' && caCert) return send(res, 200, caCert, 'application/x-x509-ca-cert', { 'Content-Disposition': 'attachment; filename="certificat-faza3d.crt"' });
    if (p.startsWith('/photos/')) {
      if (!auth.session(req)) return send(res, 401, { error: 'Connexion requise.' });
      const f = path.join(PHOTOS, path.basename(p));
      if (!/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(path.basename(p)) || !fs.existsSync(f)) return send(res, 404, { error: 'Photo introuvable.' });
      return send(res, 200, fs.readFileSync(f), f.endsWith('.png') ? 'image/png' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg', { 'Cache-Control': 'private, max-age=86400' });
    }
    const r = routes.find(x => x.method === req.method && x.re.test(p));
    if (!r) return send(res, 404, { error: 'Introuvable.' });
    if (r.roles) {
      ctx.session = auth.session(req);
      if (!ctx.session) return send(res, 401, { error: 'Session expirée : reconnectez-vous.' });
      if (!r.roles.includes(ctx.session.role)) return send(res, 403, { error: 'Accès non autorisé pour votre rôle.' });
    } else if (p === '/api/session') ctx.session = auth.session(req);
    // protection contre les requêtes envoyées par d'autres sites
    if (req.method !== 'GET' && p.startsWith('/api/') && req.headers['x-faza'] !== '1') return send(res, 403, { error: 'Requête refusée.' });
    const m = r.re.exec(p); ctx.params = {}; r.keys.forEach((k, i) => ctx.params[k] = m[i + 1]);
    const out = await r.fn(ctx);
    if (out === KEEP) return;
    send(res, 200, out, undefined, ctx.headers);
  } catch (e) {
    const code = e.code && Number.isInteger(e.code) ? e.code : 500;
    if (code === 500) console.error('! ' + req.method + ' ' + p + ' : ' + (e.stack || e.message));
    // en production, le détail technique reste dans le journal du serveur
    const msg = code === 500 ? (config.production ? 'Erreur du serveur : réessayez, ou contactez l\'administrateur.' : 'Erreur du serveur : ' + e.message) : e.message;
    send(res, code, { error: msg, ...(e.body || {}) }, undefined, ctx.headers);
  }
}

// Requêtes en http:// sur un serveur https : page d'accueil des postes, certificat, puis redirection
function handlePlain(req, res) {
  const url = new URL(req.url, 'http://x');
  const host = (req.headers.host || 'localhost:' + PORT).replace(/[^a-zA-Z0-9.:\-\[\]]/g, '');
  // le site vitrine (ouvert en http ou en fichier local) appelle l'API publique : pas de redirection, sinon le navigateur bloque
  if (url.pathname.startsWith('/api/public/') || url.pathname.startsWith('/fichiers/')) return handle(req, res);
  if (url.pathname === '/certificat-faza3d.crt' && caCert) return send(res, 200, caCert, 'application/x-x509-ca-cert', { 'Content-Disposition': 'attachment; filename="certificat-faza3d.crt"' });
  if (url.pathname === '/poste') return send(res, 200, fs.readFileSync(path.join(PUBLIC, 'poste.html')), 'text/html; charset=utf-8');
  if (url.pathname === '/poste.js') return send(res, 200, fs.readFileSync(path.join(PUBLIC, 'poste.js')), 'text/javascript; charset=utf-8');
  res.writeHead(302, { Location: `https://${host}${url.pathname === '/' ? '/' : url.pathname}` }); res.end();
}

/* =================================================================== */
/*  Démarrage                                                           */
/* =================================================================== */
let caCert = null;
const servers = [];
async function start() {
  let tlsServer = null;
  if (USE_HTTPS) {
    try {
      const c = await certificates();
      caCert = c.ca;
      tlsServer = https.createServer({ key: c.key, cert: c.cert }, (q, s) => handle(q, s));
      SECURE = true;
      // si l'adresse du PC change (box redémarrée), le certificat est refait automatiquement
      setInterval(async () => {
        try { const n = await certificates(); tlsServer.setSecureContext({ key: n.key, cert: n.cert }); } catch (e) { console.log('! Certificat : ' + e.message); }
      }, 10 * 60e3).unref();
    } catch (e) {
      console.log('! HTTPS indisponible (' + e.message + ') : la plateforme démarre en http.');
    }
  }
  const plain = http.createServer(tlsServer ? handlePlain : (q, s) => handle(q, s));
  // 15 minutes pour envoyer une requête (un gros fichier sur une connexion lente) ; les flux temps réel (SSE) ne sont pas concernés,
  // le délai ne compte que jusqu'à la fin de la réception de la requête
  for (const srv of [plain, tlsServer].filter(Boolean)) { srv.keepAliveTimeout = 65e3; srv.headersTimeout = 70e3; srv.requestTimeout = 15 * 60e3; srv.maxHeadersCount = 100; }
  const front = net.createServer((sock) => {
    sock.on('error', () => {});
    sock.once('data', (buf) => {
      sock.pause();
      sock.unshift(buf);
      (tlsServer && buf[0] === 22 ? tlsServer : plain).emit('connection', sock);
      process.nextTick(() => sock.resume());
    });
  });
  servers.push(front);
  front.on('error', (e) => {
    if (e.code === 'EADDRINUSE') console.error(`\n! Le port ${PORT} est déjà utilisé : la plateforme tourne sans doute déjà (installation automatique). Ouvrez simplement https://localhost:${PORT}\n`);
    else console.error('! ' + e.message);
    process.exit(1);
  });
  front.listen(PORT, HOST, () => {
    const proto = tlsServer ? 'https' : 'http';
    console.log(`\nFAZA 3D Atelier ${VERSION} : plateforme démarrée.`);
    console.log(`  Sur ce PC :        ${proto}://localhost:${PORT}`);
    if (HOST !== '127.0.0.1') {
      console.log(`  Depuis les autres PC du réseau de l'atelier :`);
      console.log(`                     ${proto}://${os.hostname()}:${PORT}`);
      for (const ip of lanAddresses()) console.log(`                     ${proto}://${ip}:${PORT}`);
    } else console.log('  Accès réseau désactivé (config.json : "accesReseau": false).');
    console.log(`  Base de données :  ${base.file}`);
    if (auth.count()) console.log(`  Comptes : ${auth.count()}`);
    else {
      const code = installCode();
      console.log('  Premier lancement : ouvrez la plateforme pour créer le compte administrateur.');
      // un code fourni par FAZA_INSTALL_CODE n'est pas recopié dans le journal
      console.log(config.installCode ? '  Code d\'installation : celui de la variable FAZA_INSTALL_CODE.' : `  Code d'installation : ${code}`);
    }
    if (PROXY) console.log(`  Derrière un reverse proxy : adresse du visiteur lue dans ${config.clientIpHeader || 'X-Forwarded-For (' + config.trustedProxyHops + ' proxy de confiance)'}, cookies sécurisés.`);
    if (!publicBase()) console.log('  ! Adresse publique non réglée : définissez FAZA_PUBLIC_URL (liens de suivi, devis, QR des factures, paiement en ligne).');
    console.log('');
  });

  if (config.public && config.public.actif) {
    const pub = http.createServer((q, s) => handle(q, s, { public: true }));
    pub.on('error', (e) => console.log('! Formulaire public : ' + e.message));
    pub.listen(+config.public.port || 8788, '127.0.0.1', () => console.log(`  Formulaire public et webhook : http://127.0.0.1:${+config.public.port || 8788} (à relier au tunnel)`));
  }

  // Sauvegarde quotidienne de la base
  const daily = () => {
    const f = path.join(BACKUPS, `atelier-${new Date().toISOString().slice(0, 10)}.db`);
    if (!fs.existsSync(f)) { try { base.backup(BACKUPS, 30); console.log('✔ Sauvegarde du jour : ' + path.basename(f)); } catch (e) { console.log('! Sauvegarde : ' + e.message); } }
  };
  setTimeout(daily, 20e3).unref();
  setInterval(daily, 3600e3).unref();
}
start();

// arrêt propre (redéploiement EasyPanel, docker stop) : plus de nouvelles requêtes, flux fermés, base refermée sans perte
let stopping = false;
function shutdown() {
  if (stopping) return; stopping = true;
  console.log('Arrêt de la plateforme…');
  for (const s of servers) { try { s.close(); } catch {} }
  for (const s of streams.values()) { try { s.res.end(); } catch {} }
  for (const w of [...pushWaiters.values()]) { try { w.done(); } catch {} }
  setTimeout(() => {
    try { base.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); base.db.close(); } catch {}
    process.exit(0);
  }, 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
