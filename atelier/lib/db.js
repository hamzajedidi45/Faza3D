'use strict';
// Base de données SQLite de l'atelier (module node:sqlite intégré à Node.js, aucune compilation nécessaire)
const fs = require('fs');
const path = require('path');

let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); }
catch (e) {
  console.error('\nCette version de Node.js est trop ancienne : installez Node.js 22.13 ou plus récent (version LTS) depuis nodejs.org.\n');
  process.exit(1);
}

// Collections synchronisées avec l'interface. Chaque enregistrement est gardé en entier (colonne data)
// et ses champs principaux sont recopiés dans des colonnes pour les recherches et les exports Excel.
const COLLS = {
  clients:  { name: 'TEXT', phone: 'TEXT', email: 'TEXT', kind: 'TEXT', created: 'INTEGER' },
  orders:   { client_id: 'TEXT', client: 'TEXT', product: 'TEXT', qty: 'INTEGER', proc: 'TEXT', printer: 'TEXT', stage: 'TEXT',
              due: 'INTEGER', price: 'REAL', paid: 'REAL', created: 'INTEGER', delivered: 'INTEGER', invoice_no: 'TEXT', source: 'TEXT', credit_no: 'TEXT' },
  stock:    { name: 'TEXT', kind: 'TEXT', ref: 'TEXT', qty: 'REAL', min: 'REAL' },
  catalog:  { name: 'TEXT', proc: 'TEXT' },
  failures: { at: 'INTEGER', printer: 'TEXT', mat: 'TEXT', cause: 'TEXT', order_id: 'TEXT', g: 'REAL', h: 'REAL' },
  tasks:    { date: 'TEXT', time: 'TEXT', assignee: 'TEXT', kind: 'TEXT', status: 'TEXT', title: 'TEXT', source: 'TEXT' },
  leads:    { name: 'TEXT', company: 'TEXT', phone: 'TEXT', email: 'TEXT', source: 'TEXT', stage: 'TEXT', value: 'REAL',
              assignee: 'TEXT', created: 'INTEGER', next_at: 'INTEGER', order_id: 'TEXT' },
  quotes:   { no: 'TEXT', client_id: 'TEXT', client: 'TEXT', at: 'INTEGER', total_ht: 'REAL', total_ttc: 'REAL', status: 'TEXT', order_id: 'TEXT' },
  social:   { network: 'TEXT', day: 'TEXT', followers: 'REAL', reach: 'REAL', views: 'REAL', engagement: 'REAL', auto: 'INTEGER' },
  expenses: { at: 'INTEGER', category: 'TEXT', label: 'TEXT', supplier: 'TEXT', amount: 'REAL', vat: 'REAL', paid: 'INTEGER', mode: 'TEXT', purchase_id: 'TEXT' },
  purchases:{ no: 'TEXT', supplier: 'TEXT', at: 'INTEGER', status: 'TEXT', total: 'REAL', received_at: 'INTEGER' },
  maintenance:{ at: 'INTEGER', machine: 'TEXT', task: 'TEXT', hours: 'REAL', by_user: 'TEXT' },
};

const num = (v) => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : +v;
function columnsFor(coll, r) {
  const o = {};
  switch (coll) {
    case 'clients': Object.assign(o, { name: r.name, phone: r.phone, email: r.email, kind: r.kind, created: num(r.created) }); break;
    case 'orders': {
      const hist = Array.isArray(r.hist) ? r.hist : [];
      const last = hist[hist.length - 1] || {};
      const paid = (r.payments || []).reduce((a, p) => a + (+p.amount || 0), 0);
      Object.assign(o, { client_id: r.clientId, client: r.client, product: r.product, qty: num(r.qty), proc: r.proc, printer: r.printer,
        stage: last.stage, due: num(r.due), price: num(r.price), paid, created: num(r.created),
        delivered: last.stage === 'done' ? num(last.at) : null, invoice_no: r.invoice && r.invoice.no, source: r.source, credit_no: r.creditNote && r.creditNote.no });
      break;
    }
    case 'stock': Object.assign(o, { name: r.name, kind: r.kind, ref: r.ref, qty: num(r.qty), min: num(r.min) }); break;
    case 'catalog': Object.assign(o, { name: r.name, proc: r.proc }); break;
    case 'failures': Object.assign(o, { at: num(r.at), printer: r.printer, mat: r.mat, cause: r.cause, order_id: r.order, g: num(r.g), h: num(r.h) }); break;
    case 'tasks': Object.assign(o, { date: r.date, time: r.time, assignee: r.assignee, kind: r.kind, status: r.status, title: r.title, source: r.source }); break;
    case 'leads': Object.assign(o, { name: r.name, company: r.company, phone: r.phone, email: r.email, source: r.source, stage: r.stage,
      value: num(r.value), assignee: r.assignee, created: num(r.created), next_at: num(r.nextAt), order_id: r.orderId }); break;
    case 'quotes': Object.assign(o, { no: r.no, client_id: r.clientId, client: r.client, at: num(r.at), total_ht: num(r.totalHT), total_ttc: num(r.totalTTC), status: r.status, order_id: r.orderId }); break;
    case 'social': Object.assign(o, { network: r.network, day: r.day, followers: num(r.followers), reach: num(r.reach), views: num(r.views), engagement: num(r.engagement), auto: r.auto ? 1 : 0 }); break;
    case 'expenses': Object.assign(o, { at: num(r.at), category: r.category, label: r.label, supplier: r.supplier, amount: num(r.amount), vat: num(r.vat), paid: r.paid ? 1 : 0, mode: r.mode, purchase_id: r.purchaseId }); break;
    case 'purchases': Object.assign(o, { no: r.no, supplier: r.supplier && (r.supplier.name || r.supplier), at: num(r.at), status: r.status, total: num(r.total), received_at: num(r.receivedAt) }); break;
    case 'maintenance': Object.assign(o, { at: num(r.at), machine: r.machine, task: r.task, hours: num(r.hours), by_user: r.by }); break;
  }
  for (const k of Object.keys(o)) if (o[k] === undefined) o[k] = null;
  for (const k of Object.keys(o)) if (typeof o[k] === 'object' && o[k] !== null) o[k] = JSON.stringify(o[k]);
  return o;
}

class Base {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'atelier.db');
    this.db = new DatabaseSync(this.file);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    this.schema();
    this.listeners = [];
  }

  schema() {
    const d = this.db;
    d.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER, updated_by TEXT, seq INTEGER);
      CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY COLLATE NOCASE, role TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, created_at INTEGER, last_login INTEGER);
      CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, name TEXT NOT NULL, exp INTEGER NOT NULL, created_at INTEGER, ip TEXT);
      CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS messages_channel ON messages(channel, id);
      CREATE TABLE IF NOT EXISTS chat_reads (user TEXT NOT NULL, channel TEXT NOT NULL, last_id INTEGER NOT NULL, PRIMARY KEY (user, channel));
      CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, user TEXT NOT NULL, data TEXT NOT NULL, ua TEXT, at INTEGER);
      CREATE TABLE IF NOT EXISTS push_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT NOT NULL, data TEXT NOT NULL, at INTEGER);
      CREATE TABLE IF NOT EXISTS web_clients (login TEXT PRIMARY KEY, clientId TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, created INTEGER, lastAt INTEGER, reset TEXT);
      CREATE TABLE IF NOT EXISTS web_sessions (sid TEXT PRIMARY KEY, login TEXT NOT NULL, exp INTEGER);
      CREATE TABLE IF NOT EXISTS paiements_ligne (id TEXT PRIMARY KEY, orderId TEXT NOT NULL, amount REAL NOT NULL, part TEXT, provider TEXT, ref TEXT, status TEXT DEFAULT 'attente', created INTEGER, paidAt INTEGER);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, user TEXT, action TEXT, coll TEXT, rec_id TEXT, detail TEXT);
      CREATE TABLE IF NOT EXISTS order_payments (order_id TEXT NOT NULL, idx INTEGER NOT NULL, at INTEGER, amount REAL, mode TEXT, PRIMARY KEY (order_id, idx));
      CREATE TABLE IF NOT EXISTS order_events (order_id TEXT NOT NULL, idx INTEGER NOT NULL, stage TEXT, at INTEGER, PRIMARY KEY (order_id, idx));
    `);
    for (const [coll, cols] of Object.entries(COLLS)) {
      const extra = Object.entries(cols).map(([c, t]) => `${c} ${t}`).join(', ');
      d.exec(`CREATE TABLE IF NOT EXISTS ${coll} (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER, updated_by TEXT, seq INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, ${extra});
              CREATE INDEX IF NOT EXISTS ${coll}_seq ON ${coll}(seq);`);
      // colonnes ajoutées dans une version plus récente
      const have = new Set(d.prepare(`PRAGMA table_info(${coll})`).all().map(r => r.name));
      for (const [c, t] of Object.entries(cols)) if (!have.has(c)) d.exec(`ALTER TABLE ${coll} ADD COLUMN ${c} ${t}`);
    }
    // durée propre à chaque session (l'app Android reste connectée plus longtemps)
    if (!new Set(d.prepare('PRAGMA table_info(sessions)').all().map(r => r.name)).has('hours')) d.exec('ALTER TABLE sessions ADD COLUMN hours INTEGER');
    // liens publics (suivi, devis, vérification de facture) : recherche indexée au lieu de parcourir toute la table
    d.exec(`CREATE INDEX IF NOT EXISTS orders_token ON orders(json_extract(data,'$.token'));
            CREATE INDEX IF NOT EXISTS orders_verif ON orders(json_extract(data,'$.verifToken'));
            CREATE INDEX IF NOT EXISTS quotes_token ON quotes(json_extract(data,'$.token'));`);
    if (!this.meta('seq')) this.setMeta('seq', '0');
    if (!this.meta('schema')) this.setMeta('schema', '3');
  }

  meta(k) { const r = this.db.prepare('SELECT value FROM meta WHERE key=?').get(k); return r ? r.value : null; }
  setMeta(k, v) { this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v)); }
  nextSeq() { const s = (+this.meta('seq') || 0) + 1; this.setMeta('seq', s); return s; }
  seq() { return +this.meta('seq') || 0; }

  tx(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const r = fn(); this.db.exec('COMMIT'); return r; }
    catch (e) { try { this.db.exec('ROLLBACK'); } catch {} throw e; }
  }
  onChange(fn) { this.listeners.push(fn); }
  emit(info) { for (const f of this.listeners) { try { f(info); } catch {} } }

  /* ---------- Enregistrements ---------- */
  get(coll, id) {
    const r = this.db.prepare(`SELECT data, deleted FROM ${coll} WHERE id=?`).get(id);
    return r && !r.deleted ? JSON.parse(r.data) : null;
  }
  all(coll) { return this.db.prepare(`SELECT data FROM ${coll} WHERE deleted=0`).all().map(r => JSON.parse(r.data)); }
  byToken(coll, token, field = 'token') {
    if (!/^[a-f0-9]{32}$/.test(String(token || '')) || !['token', 'verifToken'].includes(field)) return null;
    const r = this.db.prepare(`SELECT data FROM ${coll} WHERE deleted=0 AND json_extract(data,'$.${field}')=?`).get(token);
    return r ? JSON.parse(r.data) : null;
  }

  _upsert(coll, rec, user, seq) {
    if (!COLLS[coll]) throw new Error('collection inconnue');
    if (!rec || typeof rec.id !== 'string' || !rec.id || rec.id.length > 80) throw new Error('identifiant invalide');
    const cols = columnsFor(coll, rec);
    const names = Object.keys(cols);
    const sql = `INSERT INTO ${coll} (id, data, updated_at, updated_by, seq, deleted, ${names.join(',')})
                 VALUES (?, ?, ?, ?, ?, 0, ${names.map(() => '?').join(',')})
                 ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at, updated_by=excluded.updated_by,
                 seq=excluded.seq, deleted=0, ${names.map(n => `${n}=excluded.${n}`).join(',')}`;
    this.db.prepare(sql).run(rec.id, JSON.stringify(rec), Date.now(), user, seq, ...names.map(n => cols[n]));
    if (coll === 'orders') {
      this.db.prepare('DELETE FROM order_payments WHERE order_id=?').run(rec.id);
      this.db.prepare('DELETE FROM order_events WHERE order_id=?').run(rec.id);
      (rec.payments || []).forEach((p, i) => this.db.prepare('INSERT INTO order_payments VALUES (?,?,?,?,?)').run(rec.id, i, num(p.at), num(p.amount), p.mode || null));
      (rec.hist || []).forEach((h, i) => this.db.prepare('INSERT INTO order_events VALUES (?,?,?,?)').run(rec.id, i, h.stage || null, num(h.at)));
    }
  }
  _remove(coll, id, user, seq) {
    this.db.prepare(`UPDATE ${coll} SET deleted=1, seq=?, updated_at=?, updated_by=? WHERE id=?`).run(seq, Date.now(), user, id);
    if (coll === 'orders') {
      this.db.prepare('DELETE FROM order_payments WHERE order_id=?').run(id);
      this.db.prepare('DELETE FROM order_events WHERE order_id=?').run(id);
    }
  }
  audit(user, action, coll, id, detail) {
    this.db.prepare('INSERT INTO audit(at,user,action,coll,rec_id,detail) VALUES (?,?,?,?,?,?)').run(Date.now(), user, action, coll, id, detail ? String(detail).slice(0, 300) : null);
  }

  // Applique un lot de modifications venant d'un poste : { coll: { upsert:[...], delete:[ids] }, params }
  apply(changes, user, transform) {
    const res = this.tx(() => {
      let n = 0;
      for (const [coll, ch] of Object.entries(changes || {})) {
        if (coll === 'params') continue;
        if (!COLLS[coll]) throw new Error('collection inconnue : ' + coll);
        for (const rec of (ch.upsert || [])) {
          const old = this.get(coll, rec.id);
          const final = transform ? transform('upsert', coll, rec, old) : rec;
          if (!final) continue;
          const seq = this.nextSeq(); this._upsert(coll, final, user, seq); n++;
          this.audit(user, old ? 'modif' : 'ajout', coll, rec.id);
        }
        for (const id of (ch.delete || [])) {
          if (transform && !transform('delete', coll, { id }, this.get(coll, id))) continue;
          const seq = this.nextSeq(); this._remove(coll, id, user, seq); n++;
          this.audit(user, 'suppression', coll, id);
        }
      }
      if (changes && changes.params && (!transform || transform('params', 'params', changes.params))) {
        this.setSetting('params', changes.params, user, true); n++;
        this.audit(user, 'modif', 'parametres', 'params');
      }
      return n;
    });
    if (res) this.emit({ type: 'change', seq: this.seq() });
    return this.seq();
  }

  // Écriture faite par le serveur lui-même (facture, demande reçue par e-mail…)
  put(coll, rec, user = 'système') {
    this.tx(() => { const seq = this.nextSeq(); this._upsert(coll, rec, user, seq); this.audit(user, 'auto', coll, rec.id); });
    this.emit({ type: 'change', seq: this.seq() });
    return rec;
  }

  changesSince(since) {
    const out = {};
    for (const coll of Object.keys(COLLS)) {
      const rows = this.db.prepare(`SELECT id, data, deleted FROM ${coll} WHERE seq > ?${since ? '' : ' AND deleted=0'}`).all(since || 0);
      if (rows.length) out[coll] = rows.map(r => r.deleted ? { id: r.id, _deleted: true } : JSON.parse(r.data));
    }
    const p = this.db.prepare('SELECT value, seq FROM settings WHERE key=?').get('params');
    const params = p && (!since || p.seq > since) ? JSON.parse(p.value) : undefined;
    return { seq: this.seq(), changes: out, params };
  }

  /* ---------- Réglages ---------- */
  setting(key, def = null) { const r = this.db.prepare('SELECT value FROM settings WHERE key=?').get(key); return r ? JSON.parse(r.value) : def; }
  setSetting(key, value, user = 'système', inTx = false) {
    const go = () => {
      const seq = this.nextSeq();
      this.db.prepare('INSERT INTO settings(key,value,updated_at,updated_by,seq) VALUES(?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by, seq=excluded.seq')
        .run(key, JSON.stringify(value), Date.now(), user, seq);
    };
    if (inTx) go(); else { this.tx(go); if (key === 'params') this.emit({ type: 'change', seq: this.seq() }); }
  }

  /* ---------- Numéros ---------- */
  nextOrderId() {
    return this.tx(() => {
      let n = +this.meta('order_next') || 0;
      if (!n) {
        const ids = this.db.prepare('SELECT id FROM orders').all().map(r => parseInt(String(r.id).replace(/\D/g, ''), 10)).filter(x => !isNaN(x));
        n = Math.max(100, ...ids) + 1;
      }
      this.setMeta('order_next', n + 1);
      return 'C-' + n;
    });
  }
  nextNumber(prefix, year, inTx = false) {
    const go = () => {
      const k = `num_${prefix}_${year}`; const n = (+this.meta(k) || 0) + 1; this.setMeta(k, n);
      return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
    };
    return inTx ? go() : this.tx(go);
  }

  /* ---------- Exports et sauvegardes ---------- */
  exportCSV(table) {
    const allowed = [...Object.keys(COLLS), 'order_payments', 'order_events', 'audit', 'messages'];
    if (!allowed.includes(table)) throw new Error('table inconnue');
    const hasDeleted = !!COLLS[table];
    const rows = this.db.prepare(`SELECT * FROM ${table}${hasDeleted ? ' WHERE deleted=0' : ''}`).all();
    const cols = rows.length ? Object.keys(rows[0]).filter(c => c !== 'data' && c !== 'deleted' && c !== 'seq') : [];
    const dateCols = /^(at|due|created|delivered|updated_at|next_at)$/;
    const cell = (c, v) => {
      if (v === null || v === undefined) return '';
      if (dateCols.test(c) && typeof v === 'number' && v > 1e11) v = new Date(v).toLocaleString('fr-FR');
      if (typeof v === 'number') v = String(v).replace('.', ',');
      v = String(v);
      // texte venant du public (formulaire, messages) : pas de formule exécutée à l'ouverture dans Excel
      // (sauf les nombres et téléphones « +216 20 000 000 », sans danger)
      if (/^[=+\-@\t\r]/.test(v) && !/^[+-]?[\d\s.,()]+$/.test(v)) v = "'" + v;
      return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    return '﻿' + [cols.join(';'), ...rows.map(r => cols.map(c => cell(c, r[c])).join(';'))].join('\r\n');
  }
  backup(dir, keep = 30) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, `atelier-${new Date().toISOString().slice(0, 10)}.db`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
    this.db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`);
    const list = fs.readdirSync(dir).filter(x => /^atelier-\d{4}-\d{2}-\d{2}\.db$/.test(x)).sort();
    while (list.length > keep) fs.unlinkSync(path.join(dir, list.shift()));
    return f;
  }
  addHours(id, minutes) { const k = 'hours_' + id; this.setMeta(k, (+this.meta(k) || 0) + minutes / 60); }
  hours(id) { return +this.meta('hours_' + id) || 0; }
  size() { let n = 0; for (const f of [this.file, this.file + '-wal']) { try { n += fs.statSync(f).size; } catch {} } return n; }
  counts() {
    const o = {};
    for (const c of Object.keys(COLLS)) o[c] = this.db.prepare(`SELECT COUNT(*) n FROM ${c} WHERE deleted=0`).get().n;
    o.messages = this.db.prepare('SELECT COUNT(*) n FROM messages').get().n;
    return o;
  }

  /* ---------- Reprise des données de la version précédente (fichiers JSON) ---------- */
  importLegacy(dataDir) {
    const done = this.meta('legacy_import');
    if (done) return;
    const uf = path.join(dataDir, 'utilisateurs.json');
    if (fs.existsSync(uf)) {
      try {
        for (const u of JSON.parse(fs.readFileSync(uf, 'utf8'))) {
          this.db.prepare('INSERT OR IGNORE INTO users(name,role,salt,hash,created_at) VALUES (?,?,?,?,?)').run(u.name, u.role, u.salt, u.hash, Date.now());
        }
        fs.renameSync(uf, uf + '.importe');
      } catch (e) { console.log('! Comptes de la version précédente non repris :', e.message); }
    }
    const df = path.join(dataDir, 'atelier.json');
    if (fs.existsSync(df)) {
      try {
        const st = JSON.parse(fs.readFileSync(df, 'utf8'));
        const d = st && st.data;
        if (d) {
          this.tx(() => {
            for (const coll of ['clients', 'orders', 'stock', 'catalog', 'failures']) {
              for (const rec of (d[coll] || [])) if (rec && rec.id) this._upsert(coll, rec, 'reprise', this.nextSeq());
            }
            if (d.params) this.setSetting('params', d.params, 'reprise', true);
            const inv = d.seq && d.seq.invoice;
            if (inv && typeof inv === 'object') for (const [y, n] of Object.entries(inv)) if (+n > (+this.meta(`num_FAZA_${y}`) || 0)) this.setMeta(`num_FAZA_${y}`, +n);
          });
        }
        fs.renameSync(df, df + '.importe');
        console.log('✔ Données de la version précédente reprises dans la base.');
      } catch (e) { console.log('! Données de la version précédente non reprises :', e.message); }
    }
    this.setMeta('legacy_import', String(Date.now()));
  }
}

module.exports = { Base, COLLS };
