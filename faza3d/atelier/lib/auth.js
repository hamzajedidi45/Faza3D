'use strict';
// Comptes, mots de passe et sessions (gardés dans la base SQLite)
const crypto = require('crypto');

const ROLES = ['admin', 'commercial', 'production'];
const SESSION_H = 12;

class Auth {
  constructor(base) {
    this.b = base;
    this.attempts = new Map(); // ip -> {n, until}
    setInterval(() => this.b.db.prepare('DELETE FROM sessions WHERE exp < ?').run(Date.now()), 3600e3).unref();
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
    if (!Auth.validName(name)) throw new Error('Nom invalide : 2 à 40 caractères, lettres, chiffres, espace, point, tiret (pas d\'adresse e-mail).');
    if (!Auth.validPw(pw)) throw new Error('Mot de passe : 8 caractères minimum.');
    if (!ROLES.includes(role)) throw new Error('Rôle inconnu.');
    name = name.trim();
    if (this.user(name)) throw new Error('Ce nom existe déjà.');
    const { salt, hash } = Auth.hash(pw);
    this.b.db.prepare('INSERT INTO users(name,role,salt,hash,created_at) VALUES (?,?,?,?,?)').run(name, role, salt, hash, Date.now());
    return name;
  }
  setPassword(name, pw) {
    if (!Auth.validPw(pw)) throw new Error('Mot de passe : 8 caractères minimum.');
    const { salt, hash } = Auth.hash(pw);
    this.b.db.prepare('UPDATE users SET salt=?, hash=? WHERE name=?').run(salt, hash, name);
    this.b.db.prepare('DELETE FROM sessions WHERE name=?').run(name);
  }
  setRole(name, role) {
    if (!ROLES.includes(role)) throw new Error('Rôle inconnu.');
    this.b.db.prepare('UPDATE users SET role=? WHERE name=?').run(role, name);
  }
  remove(name) {
    this.b.db.prepare('DELETE FROM users WHERE name=?').run(name);
    this.b.db.prepare('DELETE FROM sessions WHERE name=?').run(name);
  }
  admins() { return this.b.db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin'").get().n; }

  check(name, pw) {
    const u = typeof name === 'string' && this.user(name.trim());
    if (!u || typeof pw !== 'string') { crypto.scryptSync('x', 'y', 64); return null; }
    const h = crypto.scryptSync(pw, u.salt, 64);
    return crypto.timingSafeEqual(h, Buffer.from(u.hash, 'hex')) ? u : null;
  }
  blocked(ip) { const a = this.attempts.get(ip); return !!(a && a.until > Date.now()); }
  failed(ip) {
    const a = this.attempts.get(ip) || { n: 0, until: 0 };
    a.n++; if (a.n >= 5) { a.until = Date.now() + 15 * 60e3; a.n = 0; }
    this.attempts.set(ip, a);
  }
  cleared(ip) { this.attempts.delete(ip); }

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
