'use strict';
// Comptes, mots de passe et sessions (gardés dans la base SQLite)
const crypto = require('crypto');

const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const ROLES = ['admin', 'commercial', 'production'];
const SESSION_H = 12;
// erreurs de saisie : renvoyées telles quelles au navigateur (400), sans trace dans le journal
const bad = (msg) => Object.assign(new Error(msg), { code: 400 });

class Auth {
  constructor(base) {
    this.b = base;
    this.attempts = new Map(); // ip -> {n, until}
    setInterval(() => { this.b.db.prepare('DELETE FROM sessions WHERE exp < ?').run(Date.now()); this.prune(); }, 3600e3).unref();
  }
  static hash(pw, salt = crypto.randomBytes(16).toString('hex')) {
    return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') };
  }
  static validName(n) { return typeof n === 'string' && /^[\p{L}\p{N} ._-]{2,40}$/u.test(n.trim()); }
  static validPw(p) { return typeof p === 'string' && p.length >= 8 && p.length <= 200; }

  count() { return this.b.db.prepare('SELECT COUNT(*) n FROM users').get().n; }
  user(name) { return this.b.db.prepare('SELECT * FROM users WHERE name=?').get(name); }
  list() { return this.b.db.prepare('SELECT name, role, created_at, last_login FROM users ORDER BY name').all(); }

  create(name, role, pw) {
    if (!Auth.validName(name)) throw bad('Nom invalide : 2 à 40 caractères, lettres, chiffres, espace, point, tiret (pas d\'adresse e-mail).');
    if (!Auth.validPw(pw)) throw bad('Mot de passe : 8 caractères minimum.');
    if (!ROLES.includes(role)) throw bad('Rôle inconnu.');
    name = name.trim();
    if (this.user(name)) throw bad('Ce nom existe déjà.');
    const { salt, hash } = Auth.hash(pw);
    this.b.db.prepare('INSERT INTO users(name,role,salt,hash,created_at) VALUES (?,?,?,?,?)').run(name, role, salt, hash, Date.now());
    return name;
  }
  setPassword(name, pw) {
    if (!Auth.validPw(pw)) throw bad('Mot de passe : 8 caractères minimum.');
    const { salt, hash } = Auth.hash(pw);
    this.b.db.prepare('UPDATE users SET salt=?, hash=? WHERE name=?').run(salt, hash, name);
    this.b.db.prepare('DELETE FROM sessions WHERE name=?').run(name);
  }
  setRole(name, role) {
    if (!ROLES.includes(role)) throw bad('Rôle inconnu.');
    this.b.db.prepare('UPDATE users SET role=? WHERE name=?').run(role, name);
  }
  remove(name) {
    this.b.db.prepare('DELETE FROM users WHERE name=?').run(name);
    this.b.db.prepare('DELETE FROM sessions WHERE name=?').run(name);
  }
  admins() { return this.b.db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin'").get().n; }

  // scrypt asynchrone : un afflux de tentatives ne bloque pas le serveur pour les autres
  async check(name, pw) {
    const u = typeof name === 'string' && name.length <= 40 && this.user(name.trim());
    if (!u || typeof pw !== 'string' || pw.length > 200) { await scrypt('x', 'y', 64); return null; }
    const h = await scrypt(pw, u.salt, 64);
    return crypto.timingSafeEqual(h, Buffer.from(u.hash, 'hex')) ? u : null;
  }
  // limite par adresse IP et par compte (clé « compte:nom ») : 5 échecs = 15 minutes de pause
  blocked(...keys) { return keys.some(k => { const a = this.attempts.get(k); return !!(a && a.until > Date.now()); }); }
  failed(...keys) {
    for (const k of keys) {
      const a = this.attempts.get(k) || { n: 0, until: 0, at: 0 };
      a.n++; a.at = Date.now(); if (a.n >= 5) { a.until = Date.now() + 15 * 60e3; a.n = 0; }
      this.attempts.set(k, a);
    }
  }
  cleared(...keys) { for (const k of keys) this.attempts.delete(k); }
  prune() { const now = Date.now(); for (const [k, a] of this.attempts) if (a.until < now && now - a.at > 3600e3) this.attempts.delete(k); }

  open(u, ip) {
    const sid = crypto.randomBytes(32).toString('hex');
    this.b.db.prepare('INSERT INTO sessions(sid,name,exp,created_at,ip) VALUES (?,?,?,?,?)').run(sid, u.name, Date.now() + SESSION_H * 3600e3, Date.now(), ip || null);
    this.b.db.prepare('UPDATE users SET last_login=? WHERE name=?').run(Date.now(), u.name);
    return sid;
  }
  close(sid) { this.b.db.prepare('DELETE FROM sessions WHERE sid=?').run(sid); }
  session(req) {
    const m = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || '');
    if (!m) return null;
    const s = this.b.db.prepare('SELECT s.sid, s.name, s.exp, u.role FROM sessions s JOIN users u ON u.name=s.name WHERE s.sid=?').get(m[1]);
    if (!s || s.exp < Date.now()) { if (s) this.close(m[1]); return null; }
    // prolongée à chaque usage (au plus une écriture par minute)
    const exp = Date.now() + SESSION_H * 3600e3;
    if (exp - s.exp > 60e3) this.b.db.prepare('UPDATE sessions SET exp=? WHERE sid=?').run(exp, s.sid);
    return { sid: s.sid, name: s.name, role: s.role };
  }
}

module.exports = { Auth, ROLES, SESSION_H };
