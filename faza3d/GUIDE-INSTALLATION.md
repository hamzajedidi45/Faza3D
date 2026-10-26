# FAZA 3D — Mise en ligne (plateforme + site) sur un VPS

Durée : ~1 h la première fois. Il vous faut : un VPS Ubuntu 24.04 (Hostinger KVM 1 ou OVH VPS-1), le domaine
`faza3d.tn` chez un registrar, un compte Cloudflare (gratuit), et ce dossier `faza3d` sur votre PC.
Tout ce qui est en `code` se tape tel quel dans le terminal du serveur (PuTTY sur Windows, Terminal sur Mac).

## 0. Contenu du dossier
```
faza3d/
  Dockerfile, docker-compose.yml, nginx-site.conf, .dockerignore   → l'infrastructure (3 conteneurs)
  config.json          → réglages de la plateforme (port, imprimantes). derriereProxy = true (tunnel)
  .env.exemple         → modèle du fichier .env (jeton Cloudflare)
  atelier/             → la plateforme (code)
  site/index.html      → le site client ; site/config.js → VOS réglages du site (gardé aux mises à jour)
  donnees/             → base, fichiers, sauvegardes, secrets (créé/rempli par la plateforme) = À SAUVEGARDER
  installer-docker.sh  → prépare le serveur (Docker, pare-feu, mises à jour auto)   [1 fois]
  sauvegarde.sh / restaurer.sh / mettre-a-jour.sh
  poste-atelier/       → ce qui s'installe au PC de l'atelier, pas sur le serveur :
                         relais/ (lien imprimantes ↔ serveur), FAZA3D-Atelier.apk (Android), poste-equipe-mac.command
```

## 1. Le serveur (10 min)
1. Commandez le VPS avec **Ubuntu 24.04**, datacenter France/Allemagne/Pologne (le plus proche), connexion par **clé SSH**
   si l'hébergeur le propose (sinon mot de passe fort, puis on passera en clé).
2. Connectez-vous : `ssh root@ADRESSE_IP_DU_SERVEUR`
3. Copiez le dossier depuis votre PC (PowerShell Windows ou Terminal Mac, dans le dossier qui contient `faza3d`) :
   `scp -r faza3d root@ADRESSE_IP_DU_SERVEUR:/root/`
4. Sur le serveur : `cd /root/faza3d && bash installer-docker.sh`   (3-5 min ; redémarrez si demandé : `reboot`)

## 2. Cloudflare (15 min, dans le navigateur)
1. cloudflare.com → compte → **Add a domain** → `faza3d.tn` → plan Free → notez les 2 serveurs de noms.
2. Chez le registrar du domaine : remplacez les DNS par ces 2 serveurs de noms. (Activation : minutes à 24 h.)
3. **Zero Trust › Networks › Tunnels › Create a tunnel** (Cloudflared) → nom `faza3d` → copiez le **jeton** (après `--token`).
4. Onglet **Public hostnames** — 3 lignes, type HTTP :
   - `atelier` . faza3d.tn → `atelier:8787`
   - *(vide)* . faza3d.tn → `site:80`
   - `www` . faza3d.tn → `site:80`
5. **SSL/TLS** → Full ; Edge Certificates → Always Use HTTPS : On.
6. (Recommandé) **Zero Trust › Access › Applications › Add › Self-hosted** : domaine `atelier.faza3d.tn`,
   politique Allow → Emails = adresses de l'équipe. Chaque membre reçoit un code par e-mail avant la page de connexion.
   Ne protégez PAS `faza3d.tn` (site public).

## 3. Démarrer (5 min)
```
cd /root/faza3d
cp .env.exemple .env && nano .env        # collez le jeton : TUNNEL_TOKEN=eyJ...   (Ctrl+O, Entrée, Ctrl+X)
docker compose up -d --build             # 2-4 min la première fois
docker compose logs -f atelier           # notez le CODE D'INSTALLATION affiché, puis Ctrl+C
```
Dans Cloudflare, le tunnel passe en **Healthy**. Ouvrez `https://atelier.faza3d.tn` → créez le compte administrateur
avec le code. Ouvrez `https://faza3d.tn` → le site.

## 4. Réglages dans la plateforme (15 min)
- Paramètres › Société : nom, MF, RNE, adresse, téléphone, e-mail, **Adresse publique = https://atelier.faza3d.tn**,
  cachet (PNG), e-mails automatiques.
- Paramètres › Site client : horaires, réseaux, tarifs de l'estimation, Adresse du site = https://faza3d.tn.
- Paramètres › Comptes : les membres de l'équipe (rôles production / commercial).
- Connexions : E-mail (SMTP de contact@faza3d.tn), Assistant IA (clé Anthropic), Paiement en ligne (Konnect/Flouci),
  Meta (Facebook/Instagram) si souhaité.
- `site/config.js` est déjà réglé sur `https://atelier.faza3d.tn`.

## 5. Le PC de l'atelier (imprimantes) et les téléphones
- `poste-atelier/relais/` : installez-le sur le PC de l'atelier (installer-relais.bat) avec l'adresse
  `https://atelier.faza3d.tn` et le jeton créé dans Connexions › Imprimantes › Relais. Il relie les imprimantes
  (Bambu Lab) au serveur. Sans imprimante connectée, inutile.
- Android : `FAZA3D-Atelier.apk`, adresse `https://atelier.faza3d.tn`. iPhone / Mac / PC : navigateur → Installer l'app.

## 6. Sauvegardes (obligatoire, 5 min)
```
crontab -e      →  ajoutez :   30 3 * * * /root/faza3d/sauvegarde.sh >> /root/sauvegardes/journal.txt 2>&1
```
Puis une copie HORS du serveur : `apt install rclone && rclone config` (Google Drive ou OneDrive de la société),
décommentez la dernière ligne de `sauvegarde.sh` avec le nom du remote. Test : `./sauvegarde.sh`.
Restaurer : `./restaurer.sh /root/sauvegardes/faza3d-....tar.gz`.

## 7. Mettre à jour (quand un nouveau dossier est livré)
```
scp -r faza3d root@ADRESSE_IP:/root/faza3d-nouveau      (depuis le PC)
cd /root/faza3d && ./mettre-a-jour.sh                  (sur le serveur ; sauvegarde automatique avant)
```
Vos données (`donnees/`), `config.json`, `.env` et `site/config.js` ne sont jamais écrasés.

## 8. Dépannage
- `docker compose ps` (3 conteneurs « Up ») · `docker compose logs -f atelier` · `docker compose restart`
- Tunnel pas Healthy : jeton incorrect dans `.env` → corrigez puis `docker compose up -d`.
- « Code d'installation » perdu : `docker compose logs atelier | grep -i code`.
- Mot de passe admin oublié : `docker compose exec -it atelier node --disable-warning=ExperimentalWarning outils/motdepasse.js`
- Espace disque : `df -h` ; nettoyage images Docker : `docker system prune -f`.
