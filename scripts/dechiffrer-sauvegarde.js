#!/usr/bin/env node
// Relit une sauvegarde reçue par e-mail (fichier .db.gz.enc) et recrée atelier.db.
// Usage : node scripts/dechiffrer-sauvegarde.js faza3d-sauvegarde-2026-11-09.db.gz.enc
// Le mot de passe demandé est celui réglé dans Connexions › Sauvegarde hors serveur.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const readline = require('readline');

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('Indiquez le fichier .db.gz.enc à relire.'); process.exit(1); }
const buf = fs.readFileSync(file);
if (buf.subarray(0, 4).toString() !== 'FZB1') { console.error('Ce fichier n’est pas une sauvegarde FAZA 3D.'); process.exit(1); }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Mot de passe de sauvegarde : ', (pass) => {
  rl.close();
  try {
    const salt = buf.subarray(4, 20), iv = buf.subarray(20, 32), tag = buf.subarray(32, 48), enc = buf.subarray(48);
    const key = crypto.scryptSync(pass, salt, 32);
    const de = crypto.createDecipheriv('aes-256-gcm', key, iv); de.setAuthTag(tag);
    const db = zlib.gunzipSync(Buffer.concat([de.update(enc), de.final()]));
    const out = path.join(path.dirname(file), 'atelier.db');
    fs.writeFileSync(out, db);
    console.log('✔ Base restaurée : ' + out + ' (' + Math.round(db.length / 1024) + ' Ko). Copiez-la dans le dossier donnees/ du serveur, puis redémarrez la plateforme.');
  } catch (e) { console.error('✖ Impossible de relire la sauvegarde : mot de passe incorrect ou fichier abîmé.'); process.exit(1); }
});
