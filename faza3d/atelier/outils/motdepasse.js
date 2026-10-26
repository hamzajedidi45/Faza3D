// Mot de passe oublié : node outils/motdepasse.js "Nom du compte" "nouveau mot de passe"
// Si le compte n'existe pas, il est créé comme administrateur.
'use strict';
const path = require('path');
const { Base } = require('../lib/db');
const { Auth } = require('../lib/auth');
const [name, pw] = process.argv.slice(2);
if (!name || !pw) { console.log('Usage : node outils/motdepasse.js "Nom" "nouveau mot de passe"'); process.exit(1); }
const base = new Base(path.join(__dirname, '..', 'donnees'));
const auth = new Auth(base);
try {
  if (auth.user(name)) { auth.setPassword(auth.user(name).name, pw); console.log(`Mot de passe de « ${auth.user(name).name} » changé.`); }
  else { auth.create(name, 'admin', pw); console.log(`Compte administrateur « ${name} » créé.`); }
  base.audit('outil', 'mot de passe réinitialisé', 'users', name);
} catch (e) { console.log('Erreur : ' + e.message); process.exitCode = 1; }
process.exit();
