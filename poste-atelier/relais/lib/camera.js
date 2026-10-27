'use strict';
// Image des caméras Bambu Lab en Mode LAN.
// - Séries P1 / A1 (et modèles compatibles) : flux d'images JPEG sur le port 6000 (TLS), avec le code d'accès.
// - Séries X1 (flux RTSPS, port 322) : une image toutes les quelques secondes via ffmpeg, s'il est installé.
const tls = require('tls');
const { spawn, execFileSync } = require('child_process');

let ffmpegPath = null;
try { execFileSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], { stdio: 'pipe' }); ffmpegPath = 'ffmpeg'; } catch { ffmpegPath = null; }

function authPacket(user, code) {
  const b = Buffer.alloc(80);
  b.writeUInt32LE(0x40, 0); b.writeUInt32LE(0x3000, 4); b.writeUInt32LE(0, 8); b.writeUInt32LE(0, 12);
  b.write(String(user).slice(0, 32), 16, 'ascii'); b.write(String(code).slice(0, 32), 48, 'ascii');
  return b;
}

// Récupère une image JPEG sur le port 6000. Résout avec un Buffer, rejette après le délai.
function snapshot6000(ip, code, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let done = false, buf = Buffer.alloc(0), expect = -1;
    const sock = tls.connect({ host: ip, port: 6000, rejectUnauthorized: false }, () => sock.write(authPacket('bblp', code)));
    const finish = (err, img) => { if (done) return; done = true; clearTimeout(t); try { sock.destroy(); } catch {} err ? reject(err) : resolve(img); };
    const t = setTimeout(() => finish(new Error('pas de réponse de la caméra')), timeoutMs);
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (expect < 0) {
          if (buf.length < 16) return;
          expect = buf.readUInt32LE(0);
          buf = buf.subarray(16);
          if (expect <= 0 || expect > 8e6) return finish(new Error('image invalide'));
        }
        if (buf.length < expect) return;
        const img = buf.subarray(0, expect);
        if (img[0] === 0xFF && img[1] === 0xD8) return finish(null, Buffer.from(img));
        buf = buf.subarray(expect); expect = -1;
      }
    });
    sock.on('error', (e) => finish(e));
    sock.on('close', () => finish(new Error('connexion fermée')));
  });
}

// Une image depuis le flux RTSPS des X1 (ffmpeg requis).
function snapshotRtsps(ip, code, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('ffmpeg absent'));
    const url = `rtsps://bblp:${encodeURIComponent(code)}@${ip}:322/streaming/live/1`;
    const p = spawn(ffmpegPath, ['-loglevel', 'error', '-rtsp_transport', 'tcp', '-i', url, '-frames:v', '1', '-q:v', '5', '-f', 'image2', 'pipe:1'], { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = []; let err = '';
    p.stdout.on('data', c => chunks.push(c)); p.stderr.on('data', c => err += c);
    const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} reject(new Error('délai dépassé')); }, timeoutMs);
    p.on('close', (c) => { clearTimeout(t); const img = Buffer.concat(chunks); if (img.length > 1000 && img[0] === 0xFF) resolve(img); else reject(new Error(err.trim().slice(0, 160) || 'aucune image')); });
    p.on('error', (e) => { clearTimeout(t); reject(e); });
  });
}

// Choisit la méthode : 'auto' essaie le port 6000 puis RTSPS ; mémorise ce qui marche.
class Camera {
  constructor() { this.known = {}; }
  async snapshot(p) {
    const mode = p.camera || 'auto';
    if (mode === 'off') throw new Error('caméra désactivée');
    const order = mode === 'rtsps' ? ['rtsps'] : mode === '6000' ? ['6000'] : (this.known[p.id] ? [this.known[p.id]] : ['6000', 'rtsps']);
    let last = null;
    for (const m of order) {
      try {
        const img = m === '6000' ? await snapshot6000(p.ip, p.accessCode) : await snapshotRtsps(p.ip, p.accessCode);
        this.known[p.id] = m; return img;
      } catch (e) { last = e; }
    }
    throw last || new Error('caméra indisponible');
  }
  static get hasFfmpeg() { return !!ffmpegPath; }
}

module.exports = { Camera, snapshot6000, snapshotRtsps, authPacket };
