'use strict';
// Liaison avec les imprimantes Bambu Lab en Mode LAN (MQTT chiffré, port 8883) + caméras.
// Deux façons de recevoir l'état :
//  - en direct, quand le serveur est sur le réseau de l'atelier (adresses IP dans Connexions) ;
//  - par le relais, un petit programme sur un PC de l'atelier qui envoie l'état au serveur (serveur hébergé ailleurs).
let mqtt = null;
try { mqtt = require('mqtt'); } catch { /* module absent */ }
const { Camera } = require('./camera');

function merge(t, s) {
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) t[k] = merge(t[k] || {}, s[k]); else t[k] = s[k];
  }
  return t;
}
const PUBLIC_KEYS = ['online', 'state', 'percent', 'remainingMin', 'job', 'layer', 'layers', 'nozzle', 'bed', 'error', 'updated'];

class Printers {
  constructor(base, list, onUpdate) {
    this.b = base;
    this.state = {};        // id -> état courant (direct ou relais)
    this.clients = {};
    this.camera = new Camera();
    this.images = {};       // id -> { buf, at }
    this.wanted = {};       // id -> dernière demande d'image (pour ne lire la caméra que si quelqu'un regarde)
    this.relay = { at: 0, name: '' };
    this.onUpdate = onUpdate || (() => {});
    try { this.util = JSON.parse(base.meta('util') || '{}'); } catch { this.util = {}; }
    this.configure(list);
    setInterval(() => this.tick(), 60e3).unref();
    setInterval(() => this.refreshCameras(), 4e3).unref();
  }
  configure(list) {
    for (const c of Object.values(this.clients)) { try { c.end(true); } catch {} }
    this.clients = {};
    this.list = (list || []).map(p => ({ id: String(p.id), name: String(p.name || p.id), ip: String(p.ip || '').trim(), serial: String(p.serial || '').trim(), accessCode: String(p.accessCode || '').trim(), camera: p.camera || 'auto' }));
    for (const p of this.list) {
      const prev = this.state[p.id];
      if (p.ip && p.serial && p.accessCode && mqtt) this.connect(p);
      else if (!prev || prev.source !== 'relais') this.state[p.id] = { state: 'NOCONF', online: false };
    }
  }
  connect(p) {
    const st = this.state[p.id] = { state: 'OFFLINE', online: false, raw: {}, source: 'direct' };
    const client = mqtt.connect(`mqtts://${p.ip}:8883`, { username: 'bblp', password: p.accessCode, rejectUnauthorized: false, reconnectPeriod: 5000, connectTimeout: 10000 });
    this.clients[p.id] = client;
    const report = `device/${p.serial}/report`, request = `device/${p.serial}/request`;
    const pushall = () => client.publish(request, JSON.stringify({ pushing: { sequence_id: '0', command: 'pushall' } }));
    client.on('connect', () => { console.log(`✔ ${p.name} connectée (${p.ip})`); st.online = true; client.subscribe(report, () => pushall()); });
    client.on('message', (_t, buf) => {
      let msg; try { msg = JSON.parse(buf.toString()); } catch { return; }
      if (!msg.print) return;
      merge(st.raw, msg.print);
      this.applyRaw(p, st, st.raw);
    });
    client.on('close', () => { if (st.online) console.log(`✖ ${p.name} déconnectée`); st.online = false; st.state = 'OFFLINE'; });
    client.on('error', (e) => console.log(`! ${p.name} : ${e.message}`));
    const iv = setInterval(() => client.connected && pushall(), 5 * 60e3); iv.unref();
    client.on('end', () => clearInterval(iv));
  }
  applyRaw(p, st, r) {
    const before = st.state;
    st.online = true; st.state = r.gcode_state || 'IDLE';
    st.percent = Math.min(100, Math.max(0, Number(r.mc_percent ?? 0)));
    st.remainingMin = Math.max(0, Number(r.mc_remaining_time ?? 0));
    st.job = r.subtask_name || ''; st.layer = r.layer_num; st.layers = r.total_layer_num;
    st.nozzle = r.nozzle_temper; st.bed = r.bed_temper; st.error = r.print_error || 0; st.updated = Date.now();
    if (before !== st.state) this.onUpdate(p, st, before);
  }
  // État envoyé par le relais : { printers: { id: {state, percent, ...} }, name }
  fromRelay(payload, name) {
    this.relay = { at: Date.now(), name: name || '' };
    for (const p of this.list) {
      const r = payload.printers && payload.printers[p.id];
      if (!r) continue;
      if (this.clients[p.id]) continue; // déjà suivie en direct
      const st = this.state[p.id] = this.state[p.id] && this.state[p.id].source === 'relais' ? this.state[p.id] : { source: 'relais' };
      const before = st.state;
      for (const k of PUBLIC_KEYS) if (k in r) st[k] = r[k];
      st.source = 'relais'; st.configured = !!r.configured; st.updated = Date.now();
      if (before && before !== st.state) this.onUpdate(p, st, before);
    }
    if (payload.util) { for (const [day, m] of Object.entries(payload.util)) this.util[day] = { ...(this.util[day] || {}), ...m }; }
  }
  relayAlive() { return Date.now() - this.relay.at < 90e3; }
  tick() {
    const day = new Date().toISOString().slice(0, 10);
    const u = this.util[day] = this.util[day] || {};
    for (const p of this.list) {
      const s = this.state[p.id];
      if (!s || s.source === 'relais') continue; // le relais envoie son propre compteur
      if (s.state === 'RUNNING') { u[p.id] = (u[p.id] || 0) + 1; this.b.addHours(p.id, 1); }
    }
    if (new Date().getMinutes() % 5 === 0) {
      const keep = Object.keys(this.util).sort().slice(-120);
      for (const k of Object.keys(this.util)) if (!keep.includes(k)) delete this.util[k];
      this.b.setMeta('util', JSON.stringify(this.util));
    }
  }
  hoursOf(id) { return this.b.hours(id); }
  snapshot() {
    const out = {};
    const relayOk = this.relayAlive();
    for (const p of this.list) {
      const s = this.state[p.id] || {};
      const viaRelay = s.source === 'relais';
      const online = viaRelay ? (relayOk && !!s.online) : !!s.online;
      out[p.id] = { name: p.name, configured: viaRelay ? !!s.configured : !!(p.ip && p.serial && p.accessCode), online, state: viaRelay && !relayOk ? 'OFFLINE' : (s.state || 'NOCONF'),
        percent: s.percent, remainingMin: s.remainingMin, job: s.job, layer: s.layer, layers: s.layers, nozzle: s.nozzle, bed: s.bed, error: s.error, updated: s.updated,
        source: viaRelay ? 'relais' : 'direct', hours: Math.round(this.b.hours(p.id) * 10) / 10, camera: !!(this.images[p.id] && Date.now() - this.images[p.id].at < 60e3) };
    }
    return { printers: out, util: this.util, relay: { ok: relayOk, at: this.relay.at || null, name: this.relay.name } };
  }
  /* ---------- Caméras ---------- */
  wantImage(id) { this.wanted[id] = Date.now(); }
  image(id) { return this.images[id] || null; }
  setImage(id, buf) { this.images[id] = { buf, at: Date.now() }; }
  async refreshCameras() {
    for (const p of this.list) {
      if (!this.wanted[p.id] || Date.now() - this.wanted[p.id] > 30e3) continue;      // personne ne regarde
      if (!p.ip || !p.accessCode || !this.clients[p.id]) continue;                       // pas suivie en direct (le relais envoie l'image)
      if (this._busy && this._busy[p.id]) continue;
      (this._busy = this._busy || {})[p.id] = true;
      try { this.setImage(p.id, await this.camera.snapshot(p)); this.camErr = this.camErr || {}; delete this.camErr[p.id]; }
      catch (e) { (this.camErr = this.camErr || {})[p.id] = e.message; }
      finally { this._busy[p.id] = false; }
    }
  }
  cameraError(id) { return this.camErr && this.camErr[id] || null; }
  publicConfig() { return this.list.map(p => ({ id: p.id, name: p.name, ip: p.ip, serial: p.serial, hasCode: !!p.accessCode, camera: p.camera })); }
}

module.exports = { Printers };
