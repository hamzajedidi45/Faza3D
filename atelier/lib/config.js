'use strict';
// Réglages de la plateforme : variables d'environnement d'abord (Docker / EasyPanel), puis config.json (installation sur un PC).
// Toutes les variables sont décrites dans .env.example à la racine du dépôt.
const fs = require('fs');
const path = require('path');

const DEFAULT_PRINTERS = [
  { id: 'x2d', name: 'X2D Combo' },
  { id: 'a2l', name: 'A2L Combo' },
  { id: 'p1s', name: 'P1S' },
  { id: 'a1', name: 'A1' },
];

const env = (k) => { const v = process.env[k]; return v === undefined || String(v).trim() === '' ? undefined : String(v).trim(); };
function bool(v, def) {
  if (v === undefined || v === null) return def;
  if (typeof v === 'boolean') return v;
  return /^(1|true|yes|oui|on)$/i.test(String(v).trim());
}
function int(v, def) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; }

// « x2d:X2D Combo, p1s:P1S » ou du JSON [{"id":"x2d","name":"X2D Combo"}]
function parsePrinters(v) {
  if (!v) return null;
  if (v.startsWith('[')) {
    const list = JSON.parse(v);
    if (!Array.isArray(list)) throw new Error('FAZA_PRINTERS : tableau JSON attendu.');
    return list.map(p => ({ id: String(p.id), name: String(p.name || p.id) }));
  }
  return v.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const [id, ...rest] = s.split(':');
    return { id: id.trim(), name: (rest.join(':') || id).trim() };
  });
}

function load(appDir) {
  const file = env('FAZA_CONFIG_FILE') || path.join(appDir, 'config.json');
  let json = {};
  if (fs.existsSync(file)) {
    try { json = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { throw new Error(`${file} illisible : ${e.message}`); }
  }
  const printers = parsePrinters(env('FAZA_PRINTERS')) || (Array.isArray(json.printers) ? json.printers : DEFAULT_PRINTERS);
  for (const p of printers) if (!/^[a-z0-9_-]{1,32}$/i.test(p.id)) throw new Error(`Identifiant d'imprimante invalide : « ${p.id} » (lettres, chiffres, - et _).`);
  const secretKey = env('FAZA_SECRET_KEY');
  if (secretKey && !/^[a-f0-9]{64}$/i.test(secretKey)) throw new Error('FAZA_SECRET_KEY : 64 caractères hexadécimaux attendus (openssl rand -hex 32).');
  const installCode = env('FAZA_INSTALL_CODE');
  if (installCode && installCode.length < 8) throw new Error('FAZA_INSTALL_CODE : 8 caractères minimum.');
  return {
    port: int(env('PORT'), +json.port || 8787),
    host: env('HOST') || (json.accesReseau === false ? '127.0.0.1' : '0.0.0.0'),
    dataDir: path.resolve(env('FAZA_DATA_DIR') || path.join(appDir, 'donnees')),
    https: bool(env('FAZA_HTTPS'), json.https !== false),
    behindProxy: bool(env('FAZA_BEHIND_PROXY'), json.derriereProxy === true),
    // nombre de proxys de confiance qui ajoutent une entrée à X-Forwarded-For (Traefik d'EasyPanel = 1 ; Cloudflare + Traefik = 2)
    trustedProxyHops: Math.max(1, int(env('FAZA_TRUSTED_PROXY_HOPS'), int(json.proxysDeConfiance, 1))),
    // en-tête qui porte l'adresse du visiteur quand un proxy de confiance la fournit (ex. cf-connecting-ip derrière Cloudflare)
    clientIpHeader: (env('FAZA_CLIENT_IP_HEADER') || json.enteteIp || '').toLowerCase(),
    publicUrl: (env('FAZA_PUBLIC_URL') || '').replace(/\/+$/, ''),
    corsOrigins: (env('FAZA_CORS_ORIGINS') || '*').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean),
    installCode: installCode ? installCode.toUpperCase() : null,
    secretKey: secretKey ? Buffer.from(secretKey, 'hex') : null,
    assistantDailyLimit: Math.max(0, int(env('FAZA_ASSISTANT_DAILY_LIMIT'), 500)),
    publicUploadDailyMB: Math.max(1, int(env('FAZA_PUBLIC_UPLOAD_DAILY_MB'), 1024)),
    production: process.env.NODE_ENV === 'production',
    printers,
    nomsSupplementaires: json.nomsSupplementaires || [],
    public: json.public || null,
  };
}

// Connexions fournies par l'environnement : elles priment sur celles saisies dans l'interface.
function envSecrets() {
  const out = {};
  const set = (section, key, v) => { if (v !== undefined) (out[section] = out[section] || {})[key] = v; };
  set('smtp', 'host', env('SMTP_HOST'));
  set('smtp', 'port', env('SMTP_PORT'));
  set('smtp', 'user', env('SMTP_USER'));
  set('smtp', 'pass', env('SMTP_PASS'));
  set('smtp', 'from', env('SMTP_FROM'));
  set('imap', 'host', env('IMAP_HOST'));
  set('imap', 'port', env('IMAP_PORT'));
  set('imap', 'user', env('IMAP_USER'));
  set('imap', 'pass', env('IMAP_PASS'));
  if (env('IMAP_SECURE') !== undefined) set('imap', 'secure', bool(env('IMAP_SECURE'), true));
  set('assistant', 'apiKey', env('ANTHROPIC_API_KEY'));
  set('assistant', 'model', env('ANTHROPIC_MODEL'));
  set('paiement', 'provider', env('PAYMENT_PROVIDER') && env('PAYMENT_PROVIDER').toLowerCase());
  set('paiement', 'apiKey', env('KONNECT_API_KEY'));
  set('paiement', 'walletId', env('KONNECT_WALLET_ID'));
  if (env('KONNECT_SANDBOX') !== undefined) set('paiement', 'sandbox', bool(env('KONNECT_SANDBOX'), false));
  set('paiement', 'appToken', env('FLOUCI_APP_TOKEN'));
  set('paiement', 'appSecret', env('FLOUCI_APP_SECRET'));
  return out;
}

module.exports = { load, envSecrets, DEFAULT_PRINTERS };
