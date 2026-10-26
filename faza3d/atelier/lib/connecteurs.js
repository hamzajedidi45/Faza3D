'use strict';
// Connexions externes : e-mail (IMAP/SMTP), Facebook + Instagram (API Graph de Meta), WhatsApp Cloud (webhook)
// TikTok n'offre pas d'API utilisable pour ce besoin : statistiques saisies à la main dans l'interface.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const opt = (m) => { try { return require(m); } catch { return null; } };
const nodemailer = opt('nodemailer');
const imapflow = opt('imapflow');
const mailparser = opt('mailparser');

/* ---------- Secrets chiffrés (la clé reste dans donnees/, jamais dans la base ni dans les sauvegardes) ---------- */
class Secrets {
  constructor(base, keyFile) {
    this.b = base;
    if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32), { mode: 0o600 });
    this.key = fs.readFileSync(keyFile);
  }
  get() {
    const enc = this.b.setting('secrets');
    if (!enc) return {};
    try {
      const buf = Buffer.from(enc, 'base64');
      const d = crypto.createDecipheriv('aes-256-gcm', this.key, buf.subarray(0, 12));
      d.setAuthTag(buf.subarray(12, 28));
      return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString());
    } catch { return {}; }
  }
  set(obj, user) {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const body = Buffer.concat([c.update(JSON.stringify(obj)), c.final()]);
    this.b.setSetting('secrets', Buffer.concat([iv, c.getAuthTag(), body]).toString('base64'), user);
  }
}

const SECRET_FIELDS = ['pass', 'token', 'pageToken', 'appSecret', 'waToken', 'accessCode', 'apiKey', 'appToken'];
// Version affichable : les secrets sont remplacés par « enregistré »
function mask(obj) {
  if (Array.isArray(obj)) return obj.map(mask);
  if (!obj || typeof obj !== 'object') return obj;
  const o = {};
  for (const [k, v] of Object.entries(obj)) o[k] = SECRET_FIELDS.includes(k) ? (v ? '••••••' : '') : mask(v);
  return o;
}
// Fusion : un champ secret laissé à « •••••• » ou vide garde l'ancienne valeur
function mergeSecrets(old, incoming) {
  if (!incoming || typeof incoming !== 'object') return old;
  const o = { ...(old || {}) };
  for (const [k, v] of Object.entries(incoming)) {
    if (SECRET_FIELDS.includes(k)) { if (v && v !== '••••••') o[k] = String(v); else if (v === null) delete o[k]; }
    else if (v && typeof v === 'object' && !Array.isArray(v)) o[k] = mergeSecrets(o[k], v);
    else o[k] = v;
  }
  return o;
}

const clean = (s, n = 2000) => String(s || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
const today = () => new Date().toISOString().slice(0, 10);

class Connecteurs {
  constructor(ctx) {
    this.ctx = ctx;                 // { base, secrets, notify(channel, text), log(msg) }
    this.b = ctx.base;
    this.status = { email: { state: 'off' }, meta: { state: 'off' }, whatsapp: { state: 'off' }, smtp: { state: 'off' } };
    this.timers = [];
    this.restart();
  }
  cfg() { return this.ctx.secrets.get(); }
  restart() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    const c = this.cfg();
    this.status.smtp = c.smtp && c.smtp.host ? { state: 'pret' } : { state: 'off' };
    if (c.imap && c.imap.host && c.imap.user && c.imap.pass && c.imap.actif !== false) {
      this.status.email = { state: 'attente' };
      setTimeout(() => this.pollEmail(), 5e3);
      this.timers.push(setInterval(() => this.pollEmail(), 3 * 60e3));
    } else this.status.email = { state: 'off' };
    if (c.meta && c.meta.pageId && c.meta.pageToken && c.meta.actif !== false) {
      this.status.meta = { state: 'attente' };
      setTimeout(() => this.pollMeta(), 8e3);
      this.timers.push(setInterval(() => this.pollMeta(), 15 * 60e3));
    } else this.status.meta = { state: 'off' };
    this.status.whatsapp = c.meta && c.meta.appSecret && c.meta.verifyToken ? { state: 'pret', note: 'en attente de messages via le webhook' } : { state: 'off' };
    for (const t of this.timers) t.unref();
  }

  /* ---------- Demandes (leads) ---------- */
  findLead(where) {
    const db = this.b.db;
    let r = null;
    if (where.extId) r = db.prepare("SELECT data FROM leads WHERE deleted=0 AND json_extract(data,'$.extId')=? ORDER BY seq DESC LIMIT 1").get(where.extId);
    if (!r && where.email) r = db.prepare("SELECT data FROM leads WHERE deleted=0 AND lower(email)=lower(?) AND stage NOT IN ('gagne','perdu') ORDER BY seq DESC LIMIT 1").get(where.email);
    if (!r && where.phone) r = db.prepare("SELECT data FROM leads WHERE deleted=0 AND replace(phone,' ','')=? AND stage NOT IN ('gagne','perdu') ORDER BY seq DESC LIMIT 1").get(where.phone.replace(/\s/g, ''));
    return r ? JSON.parse(r.data) : null;
  }
  addLead({ source, name, email, phone, extId, text, subject, channel, company }) {
    const at = Date.now();
    const msg = { at, from: name || email || phone || 'Contact', text: clean(subject ? subject + '\n' + text : text, 3000), channel: channel || source };
    let lead = this.findLead({ extId, email, phone });
    const isNew = !lead;
    if (lead) {
      lead.messages = [...(lead.messages || []), msg].slice(-50);
      lead.unread = true; lead.lastAt = at;
      if (!lead.phone && phone) lead.phone = phone;
      if (!lead.email && email) lead.email = email;
    } else {
      lead = { id: 'L-' + crypto.randomBytes(5).toString('hex'), name: clean(name || email || phone || 'Contact', 80), company: clean(company, 80), email: email || '', phone: phone || '',
        source, stage: 'nouveau', value: 0, assignee: '', created: at, lastAt: at, nextAt: at + 2 * 3600e3, extId: extId || undefined, messages: [msg], unread: true, notes: '' };
    }
    this.b.put('leads', lead, 'connexion ' + source);
    this.ctx.notify('commercial', `${isNew ? 'Nouvelle demande' : 'Nouveau message'} (${source}) de ${lead.name} : « ${clean(text || subject, 140)} »  →  #${lead.id}`);
    if (this.ctx.push) this.ctx.push('sales', { title: (isNew ? 'Nouvelle demande · ' : 'Message · ') + source, body: lead.name + ' : ' + clean(text || subject, 120), tag: 'lead-' + lead.id, url: '/#demandes' });
    return lead;
  }

  /* ---------- E-mail entrant (IMAP) ---------- */
  async pollEmail() {
    if (this._mailBusy || !imapflow) return;
    this._mailBusy = true;
    const c = this.cfg().imap || {};
    const client = new imapflow.ImapFlow({ host: c.host, port: +c.port || 993, secure: c.secure !== false, auth: { user: c.user, pass: c.pass }, logger: false, socketTimeout: 60e3 });
    client.on('error', () => {});
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const box = client.mailbox;
        let last = +this.b.meta('email_uid') || 0;
        const lastV = this.b.meta('email_uidvalidity');
        if (!last || String(box.uidValidity) !== lastV) {
          // première connexion : on part des messages à venir, pas de l'historique
          last = Math.max(0, (box.uidNext || 1) - 1);
          this.b.setMeta('email_uid', last); this.b.setMeta('email_uidvalidity', String(box.uidValidity));
        }
        let n = 0;
        if (box.uidNext > last + 1) {
          for await (const m of client.fetch({ uid: `${last + 1}:*` }, { uid: true, envelope: true, source: true, size: true }, { uid: true })) {
            if (m.uid <= last) continue;
            last = Math.max(last, m.uid);
            if (m.size > 15e6) continue;
            const fromAddr = (m.envelope.from && m.envelope.from[0]) || {};
            const email = (fromAddr.address || '').toLowerCase();
            if (!email || email === String(c.user).toLowerCase() || /no-?reply|mailer-daemon|notification|newsletter/i.test(email)) continue;
            let text = '', bulk = false;
            if (mailparser) {
              const p = await mailparser.simpleParser(m.source);
              text = p.text || (p.html ? p.html.replace(/<[^>]+>/g, ' ') : '');
              bulk = !!(p.headers.get('list-unsubscribe') || /bulk|list/i.test(String(p.headers.get('precedence') || '')));
            }
            if (bulk) continue;
            text = text.split(/\n-{2,}\s*\n|\nLe .{5,80} a écrit :|\nOn .{5,80} wrote:/)[0];
            this.addLead({ source: 'E-mail', name: fromAddr.name || email, email, subject: m.envelope.subject || '', text, channel: 'E-mail' });
            n++;
          }
          this.b.setMeta('email_uid', last);
        }
        this.status.email = { state: 'ok', at: Date.now(), note: n ? n + ' nouveau(x) message(s)' : 'à jour' };
      } finally { lock.release(); }
      await client.logout();
    } catch (e) {
      this.status.email = { state: 'erreur', at: Date.now(), note: humanError(e) };
      try { client.close(); } catch {}
    } finally { this._mailBusy = false; }
  }

  /* ---------- Envoi d'e-mail (SMTP) ---------- */
  async sendMail({ to, subject, text, attachments }) {
    if (!nodemailer) throw new Error('Module nodemailer absent.');
    const c = this.cfg().smtp || {};
    if (!c.host || !c.user) throw new Error('Envoi d\'e-mail non configuré (Connexions › E-mail).');
    const port = +c.port || 465;
    const t = nodemailer.createTransport({ host: c.host, port, secure: port === 465, auth: { user: c.user, pass: c.pass } });
    const info = await t.sendMail({ from: c.from || c.user, to, subject, text, attachments });
    this.status.smtp = { state: 'ok', at: Date.now(), note: 'dernier envoi réussi' };
    return info.messageId;
  }

  async testEmail() {
    const out = {};
    const c = this.cfg();
    if (c.imap && c.imap.host) { await this.pollEmail(); out.reception = this.status.email; }
    if (c.smtp && c.smtp.host && nodemailer) {
      try {
        const port = +c.smtp.port || 465;
        await nodemailer.createTransport({ host: c.smtp.host, port, secure: port === 465, auth: { user: c.smtp.user, pass: c.smtp.pass } }).verify();
        out.envoi = this.status.smtp = { state: 'ok', at: Date.now(), note: 'connexion d\'envoi vérifiée' };
      } catch (e) { out.envoi = this.status.smtp = { state: 'erreur', at: Date.now(), note: humanError(e) }; }
    }
    return out;
  }

  /* ---------- Facebook + Instagram (API Graph) ---------- */
  async graph(pathq, token) {
    const c = this.cfg().meta || {};
    const v = c.apiVersion || 'v23.0';
    const url = `https://graph.facebook.com/${v}/${pathq}${pathq.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token || c.pageToken)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(20e3) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
    return j;
  }
  async pollMeta() {
    if (this._metaBusy) return;
    this._metaBusy = true;
    const c = this.cfg().meta || {};
    const notes = [];
    try {
      const page = await this.graph(`${c.pageId}?fields=name,fan_count,followers_count,instagram_business_account`);
      const igId = c.igUserId || (page.instagram_business_account && page.instagram_business_account.id);
      const fb = { network: 'facebook', day: today(), followers: page.followers_count ?? page.fan_count ?? null, auto: 1 };
      for (const metric of ['page_impressions_unique', 'page_post_engagements', 'page_media_view']) {
        try {
          const ins = await this.graph(`${c.pageId}/insights?metric=${metric}&period=day`);
          const v = ins.data && ins.data[0] && ins.data[0].values; const val = v && v[v.length - 1] && v[v.length - 1].value;
          if (typeof val === 'number') { if (metric === 'page_impressions_unique') fb.reach = val; else if (metric === 'page_post_engagements') fb.engagement = val; else fb.views = val; }
        } catch { /* indicateur non disponible pour cette page ou cette version */ }
      }
      this.saveSocial(fb);
      notes.push('Facebook : ' + (page.name || 'page') + ' ✔');

      if (igId) {
        const ig = await this.graph(`${igId}?fields=username,followers_count,media_count`);
        const rec = { network: 'instagram', day: today(), followers: ig.followers_count ?? null, posts: ig.media_count ?? null, auto: 1 };
        try {
          const ins = await this.graph(`${igId}/insights?metric=reach,views,total_interactions&period=day&metric_type=total_value`);
          for (const d of ins.data || []) {
            const val = d.total_value && d.total_value.value;
            if (d.name === 'reach') rec.reach = val; if (d.name === 'views') rec.views = val; if (d.name === 'total_interactions') rec.engagement = val;
          }
        } catch { /* insights indisponibles (compte trop petit ou droit manquant) */ }
        this.saveSocial(rec);
        try {
          const media = await this.graph(`${igId}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=12`);
          this.b.setSetting('social_media', { at: Date.now(), username: ig.username, items: (media.data || []).map(m => ({ ...m, caption: clean(m.caption, 160) })) });
        } catch {}
        notes.push('Instagram : @' + (ig.username || '') + ' ✔');
      } else notes.push('Instagram : aucun compte professionnel relié à la page');

      // Messages privés Instagram et Messenger → demandes
      let nmsg = 0;
      for (const platform of ['instagram', 'messenger']) {
        try {
          const since = +this.b.meta('meta_conv_' + platform) || (Date.now() - 3600e3);
          const conv = await this.graph(`${c.pageId}/conversations?platform=${platform}&fields=id,updated_time,participants,messages.limit(3){message,from,created_time}&limit=20`);
          let newest = since;
          for (const cv of conv.data || []) {
            const upd = Date.parse(cv.updated_time); if (!(upd > since)) continue;
            newest = Math.max(newest, upd);
            const msgs = ((cv.messages && cv.messages.data) || []).filter(m => Date.parse(m.created_time) > since && m.from && m.from.id !== c.pageId && m.from.id !== igId).reverse();
            for (const m of msgs) {
              this.addLead({ source: platform === 'instagram' ? 'Instagram' : 'Facebook', name: m.from.username || m.from.name || 'Contact', extId: platform + ':' + cv.id, text: m.message || '(pièce jointe)', channel: platform === 'instagram' ? 'Instagram DM' : 'Messenger' });
              nmsg++;
            }
          }
          this.b.setMeta('meta_conv_' + platform, newest);
        } catch (e) { notes.push((platform === 'instagram' ? 'Messages Instagram' : 'Messenger') + ' : ' + humanError(e)); }
      }
      if (nmsg) notes.push(nmsg + ' message(s) reçu(s)');
      this.status.meta = { state: 'ok', at: Date.now(), note: notes.join(' · ') };
    } catch (e) {
      this.status.meta = { state: 'erreur', at: Date.now(), note: humanError(e) };
    } finally { this._metaBusy = false; }
  }
  saveSocial(rec) {
    const id = `${rec.network}:${rec.day}`;
    const old = this.b.get('social', id) || {};
    for (const k of Object.keys(rec)) if (rec[k] === null || rec[k] === undefined) delete rec[k];
    this.b.put('social', { ...old, ...rec, id }, 'connexion ' + rec.network);
  }

  /* ---------- Webhook Meta (WhatsApp Cloud, Instagram, Messenger) ---------- */
  verifyWebhook(q) {
    const c = this.cfg().meta || {};
    if (q.get('hub.mode') === 'subscribe' && c.verifyToken && q.get('hub.verify_token') === c.verifyToken) return q.get('hub.challenge');
    return null;
  }
  receiveWebhook(raw, sigHeader) {
    const c = this.cfg().meta || {};
    if (!c.appSecret) return false;
    const exp = 'sha256=' + crypto.createHmac('sha256', c.appSecret).update(raw).digest('hex');
    if (!sigHeader || sigHeader.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(exp))) return false;
    let body; try { body = JSON.parse(raw.toString()); } catch { return true; }
    for (const entry of body.entry || []) {
      if (body.object === 'whatsapp_business_account') {
        for (const ch of entry.changes || []) {
          const v = ch.value || {};
          const names = Object.fromEntries((v.contacts || []).map(x => [x.wa_id, x.profile && x.profile.name]));
          for (const m of v.messages || []) {
            const text = m.text ? m.text.body : m.button ? m.button.text : m.interactive ? JSON.stringify(m.interactive).slice(0, 200) : `(${m.type})`;
            const phone = '+' + String(m.from || '').replace(/\D/g, '');
            this.addLead({ source: 'WhatsApp', name: names[m.from] || phone, phone, text, channel: 'WhatsApp' });
          }
          this.status.whatsapp = { state: 'ok', at: Date.now(), note: 'dernier message reçu' };
        }
      } else if (body.object === 'instagram' || body.object === 'page') {
        for (const ev of entry.messaging || []) {
          if (!ev.message || ev.message.is_echo) continue;
          const src = body.object === 'instagram' ? 'Instagram' : 'Facebook';
          this.addLead({ source: src, name: src + ' ' + String(ev.sender.id).slice(-4), extId: (body.object === 'instagram' ? 'igsid:' : 'psid:') + ev.sender.id, text: ev.message.text || '(pièce jointe)', channel: src === 'Instagram' ? 'Instagram DM' : 'Messenger' });
        }
      }
    }
    return true;
  }

  publicStatus() { return this.status; }
}

function humanError(e) {
  const m = String((e && (e.responseText || e.message)) || e);
  if (/AUTHENTICATIONFAILED|Invalid credentials|535|auth/i.test(m)) return 'identifiant ou mot de passe refusé (pour Gmail : mot de passe d\'application)';
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(m)) return 'serveur introuvable (adresse ou internet)';
  if (/ETIMEDOUT|timeout/i.test(m)) return 'pas de réponse du serveur (délai dépassé)';
  if (/Error validating access token|Session has expired|OAuthException/i.test(m)) return 'jeton Meta expiré ou invalide : régénérez-le';
  if (/permission|\(#10\)|\(#200\)/i.test(m)) return 'autorisation manquante dans l\'application Meta';
  return m.slice(0, 200);
}

module.exports = { Connecteurs, Secrets, mask, mergeSecrets };
