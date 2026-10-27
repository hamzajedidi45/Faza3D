# Deploying FAZA 3D on a Hostinger VPS with EasyPanel and GitHub

This guide puts both parts of FAZA 3D online:

| EasyPanel service | What it is | Domain (example) | Built from |
|---|---|---|---|
| `atelier` | The team platform (Node.js + SQLite) | `atelier.faza3d.tn` | `atelier/Dockerfile` |
| `site` | The public client website (nginx) | `faza3d.tn`, `www.faza3d.tn` | `site/Dockerfile` |

EasyPanel builds each service from your GitHub repository, issues free HTTPS certificates (Let's Encrypt), and redeploys automatically when you push.

**Time needed:** about 1 hour the first time.
**You need:** a Hostinger VPS (KVM 1 is enough), a domain (`faza3d.tn`), and a GitHub account.

---

## 1. Put the code on GitHub (5 min)

The deployment uses a **public** GitHub repository (for example `https://github.com/hamzajedidi45/Faza3D`), so EasyPanel needs no GitHub token.

This is safe because the repository contains **no secrets**:
- The encryption key, install code, e-mail passwords and API keys only go into EasyPanel's **Environment** tab (step 6).
- All data (database, client files, invoices) lives in the server volume, never in git.

Push these changes to the repository's `main` branch from this folder on your PC:

```bash
git push origin prod-ready:main
```

From now on, every `git push` to `main` can redeploy the app automatically (step 6).

> Because the repository is public, never commit a filled-in `.env` file, a database (`*.db`), a certificate (`*.p12`) or the `donnees/` folder. They are already blocked by `.gitignore`. Check `git status` before each commit.

---

## 2. Prepare the VPS with EasyPanel (10 min)

1. Hostinger panel › **VPS** › your server › **OS & Panel** › **Operating System**.
2. Choose **Application › Easypanel** (Ubuntu 24.04 + EasyPanel) and confirm. This reinstalls the server.
3. When it is ready, open `http://YOUR-VPS-IP:3000` and create the EasyPanel admin account with a strong password.
4. Hostinger panel › **VPS › Firewall**: allow ports **22** (SSH), **80**, **443** and **3000**.
   Once the EasyPanel panel itself has a domain (EasyPanel › Settings), you can close 3000.

---

## 3. Point the domain at the VPS (5 min, then wait)

At your domain registrar (or in Cloudflare DNS), create three **A** records pointing to the VPS IP:

| Name | Type | Value |
|---|---|---|
| `atelier` | A | `YOUR-VPS-IP` |
| `@` | A | `YOUR-VPS-IP` |
| `www` | A | `YOUR-VPS-IP` |

If you use Cloudflare, set these records to **DNS only (grey cloud)** at first, so EasyPanel can obtain its HTTPS certificates. See section 9 if you want the orange cloud later.

DNS changes for `.tn` domains can take from a few minutes up to 24 hours.

---

## 4. GitHub access (nothing to do)

The repository is public, so EasyPanel can download it without a token. In each service you will use the **Git** source with the repository URL (steps 6 and 7).

---

## 5. Create the secrets (2 min)

Generate the encryption key on your PC (Git Bash) or on the VPS:

```bash
openssl rand -hex 32
```

Use the output as **`FAZA_SECRET_KEY`**. It encrypts the saved e-mail passwords and API keys. Store it in a password manager. **If you lose it, those connections must be re-entered.** Do not change it later.

Also choose a **`FAZA_INSTALL_CODE`** (at least 8 characters). It is only used once, to create the first administrator account.

---

## 6. Create the `atelier` service (the platform) (15 min)

EasyPanel › **Create project** › name it `faza3d`. Then **+ Service › App** › name it `atelier`.

### Source tab
- Choose **Git**
- **Repository URL**: `https://github.com/hamzajedidi45/Faza3D.git` (your public repository)
- **Branch**: `main`
- **Build path**: `/atelier`
- Save

### Build tab
- **Dockerfile**, file: `Dockerfile`

### Environment tab
Paste this and replace the values. Every variable is explained in `.env.example`.

```
FAZA_PUBLIC_URL=https://atelier.faza3d.tn
FAZA_CORS_ORIGINS=https://faza3d.tn,https://www.faza3d.tn
FAZA_SECRET_KEY=paste-the-64-hex-characters
FAZA_INSTALL_CODE=choose-a-code
FAZA_PRINTERS=x2d:X2D Combo,a2l:A2L Combo,p1s:P1S,a1:A1
FAZA_BEHIND_PROXY=true
FAZA_TRUSTED_PROXY_HOPS=1
```

You can also set the optional connections here. If you do, they override what is typed in the platform's Connexions screen:

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=contact@faza3d.tn
SMTP_PASS=...
IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
IMAP_USER=contact@faza3d.tn
IMAP_PASS=...
ANTHROPIC_API_KEY=...
PAYMENT_PROVIDER=konnect
KONNECT_API_KEY=...
KONNECT_WALLET_ID=...
```

### Mounts tab (required: this is where all the data lives)
- **Add Volume**: name `donnees`, mount path **`/app/donnees`**

Without this volume, **all data is lost at every redeploy**.

### Domains tab
- Add `atelier.faza3d.tn`, **HTTPS on**, port **`8787`**
- Remove the default `*.easypanel.host` domain if you don't want it public.

### Resources (optional, recommended)
- Memory limit: `1024` MB

### Deploy
Click **Deploy** and watch the **Logs** tab. You should see:

```
FAZA 3D Atelier 4.3.0 : plateforme démarrée.
  Code d'installation : celui de la variable FAZA_INSTALL_CODE.
  Derrière un reverse proxy : adresse du visiteur lue dans X-Forwarded-For (1 proxy de confiance), cookies sécurisés.
```

### Auto-deploy on every git push
In the service's **Deployments** section, copy the **Deploy Webhook** URL. Add it in GitHub › repository › Settings › **Webhooks** › *Add webhook* (payload URL = that address, content type `application/json`, event: *Just the push event*). Every push to `main` now redeploys the service. Do the same for the `site` service.

Treat this webhook URL like a password. Anyone who has it can trigger a redeploy, but nothing else. GitHub keeps it hidden even on a public repository.

---

## 7. Create the `site` service (the public website) (5 min)

In the same project: **+ Service › App** › name it `site`.

- **Source**: **Git**, same repository URL and branch `main`, **Build path: `/site`**
- **Build**: Dockerfile, file `Dockerfile`
- **Environment**:
  ```
  FAZA_PLATFORM_URL=https://atelier.faza3d.tn
  ```
- **Domains**: add `faza3d.tn` and `www.faza3d.tn`, HTTPS on, port **`80`**
- No volume needed. Click **Deploy**.

---

## 8. First login and settings (15 min)

1. Open `https://atelier.faza3d.tn`, enter the **install code** (`FAZA_INSTALL_CODE`), and create the administrator account. Do this right after the first deploy.
2. **Paramètres › Société**: company name, MF, RNE, address, phone, e-mail, stamp (PNG).
   *Adresse publique* can stay empty, because `FAZA_PUBLIC_URL` is used automatically.
3. **Paramètres › Site client**: opening hours, social networks, estimator prices.
4. **Paramètres › Équipe et accès**: create one account per team member (roles *production* / *commercial*).
5. **Connexions**: test e-mail, the AI assistant and online payment (each has a **Tester** button).
6. Open `https://faza3d.tn`. The contact form and the AI assistant should work.
7. On each phone or PC: open the platform, then use the browser's **Install app** option. On Android you can also use `poste-atelier/FAZA3D-Atelier.apk`.

---

## 9. Optional: Cloudflare in front (orange cloud)

If you switch the DNS records to **Proxied (orange cloud)**:

1. Cloudflare › SSL/TLS › mode **Full (strict)**.
2. In the `atelier` service environment, add these, then redeploy:
   ```
   FAZA_TRUSTED_PROXY_HOPS=2
   FAZA_CLIENT_IP_HEADER=cf-connecting-ip
   ```
   Only set `FAZA_CLIENT_IP_HEADER` when Cloudflare really is in front. Otherwise visitors could fake their IP address and get around the login protections.
3. Optional: Cloudflare Zero Trust › Access can require a one-time e-mail code before anyone reaches `atelier.faza3d.tn`. Exclude `/api/public/*`, `/devis/*`, `/suivi/*`, `/verif/*` and `/webhook/*` from that rule, because clients and the website use them.

---

## 10. Printers (workshop PC)

The printers are on the workshop network, so a small relay program on a workshop PC sends their status to the server.

1. Create a relay token: platform › **Connexions › Relais imprimantes** › *Créer un jeton*. Or set `FAZA_RELAY_TOKEN` in the `atelier` environment (`openssl rand -hex 24`).
2. On the workshop PC, copy `poste-atelier/relais/` and follow `LISEZ-MOI-relais.txt`. In `config.json`, set `"serveur": "https://atelier.faza3d.tn"` and the token.

Skip this step if no printers are connected.

---

## 11. Backups (required)

The platform makes a copy of its database every day inside the volume (`sauvegardes/`, 30 days kept). That copy is on the same server, so also copy everything off the server in case the VPS is lost:

1. Connect to the VPS: `ssh root@YOUR-VPS-IP`
2. Copy `scripts/sauvegarde.sh` and `scripts/restaurer.sh` from this repository to `/root/faza3d/` and make them executable:
   ```bash
   chmod +x /root/faza3d/*.sh
   ```
3. Test it:
   ```bash
   /root/faza3d/sauvegarde.sh
   ```
   If the volume is not found, check the folder name with `ls /etc/easypanel/projects/` and adjust `PROJET`, `SERVICE` or `VOLUME` at the top of the script.
4. Schedule it every night with `crontab -e`, adding this line:
   ```
   30 3 * * * /root/faza3d/sauvegarde.sh >> /root/sauvegardes/journal.txt 2>&1
   ```
5. Off-site copy: `apt install rclone`, then `rclone config` (Google Drive or OneDrive), and set `REMOTE="gdrive:faza3d-sauvegardes"` in the script.

Keep `FAZA_SECRET_KEY` somewhere other than the backups (a password manager). The backups deliberately leave it out.

**Restore:** stop the `atelier` service in EasyPanel, run `/root/faza3d/restaurer.sh /root/sauvegardes/faza3d-....tar.gz`, then deploy the service again.

---

## 12. Updating the app

```bash
git add -A
```

```bash
git commit -m "describe the change"
```

```bash
git push
```

EasyPanel rebuilds and restarts the service (or click **Deploy**). Data in the `donnees` volume is kept. The platform shuts down cleanly, so a redeploy loses no data, and the platform is offline for a few seconds.

---

## 13. Troubleshooting

| Problem | Fix |
|---|---|
| `atelier` keeps restarting | Check the **Logs** tab. A line starting with `! Configuration invalide` names the wrong variable (for example, a `FAZA_SECRET_KEY` that is not 64 hex characters). |
| "Code d'installation incorrect" | Use exactly the value of `FAZA_INSTALL_CODE`. After 5 wrong tries, wait 15 minutes. |
| Data disappeared after a redeploy | The volume is missing or mounted at the wrong path. It must be **`/app/donnees`**. |
| Site form or assistant reports a network error | `FAZA_CORS_ORIGINS` must contain the exact site address (`https://faza3d.tn`, plus `https://www.faza3d.tn` if used). `FAZA_PLATFORM_URL` on the `site` service must be the platform address. |
| "Secrets illisibles" in the logs | `FAZA_SECRET_KEY` was changed. Put the old value back, or re-enter the connections in the platform. |
| HTTPS certificate not issued | DNS does not point at the VPS yet, or Cloudflare was set to orange during issuance. Use the grey cloud, wait, then redeploy. |
| Forgotten admin password | EasyPanel › `atelier` › **Console**, run: `node outils/motdepasse.js "Name" "new-password"` |
| Large file uploads fail on slow connections | EasyPanel's proxy (Traefik) has its own time limits. Ask the client to send very large files by e-mail, or upload them from the workshop. |

---

## What was changed to make this production-ready (v4.3.0)

**Layout**
- The repository was flattened (no more `faza3d/` subfolder).
- The Cloudflare-tunnel-only scripts were removed.
- Each service has its own `Dockerfile`.
- Runtime state files are no longer committed.
- Line endings are forced to LF, so the shell scripts run on Linux.

**Configuration**
- Everything is configurable through environment variables (`atelier/lib/config.js`, documented in `.env.example`).
- `config.json` still works for a Windows PC install.

**Security**
- Visitor IPs can no longer be faked through `X-Forwarded-For` or `CF-Connecting-IP`. This was a way to create the first admin account without the code and to get around every rate limit.
- The install code is protected against brute force.
- Logins lock out per account, and password hashing no longer blocks the server.
- CORS allow-list.
- HSTS and stricter headers on both services.
- Generic 500 error messages in production.
- The invoice QR code no longer reuses the order-tracking link, so a forwarded invoice cannot open the client's account.
- The production role no longer receives client links or treasury settings.
- Only browser push services are accepted for notifications.
- Token checks run in constant time.
- CSV exports are protected against spreadsheet formulas.
- A payment confirmation can no longer be counted twice.
- A quote can no longer be accepted twice.
- Client passwords must be at least 8 characters, and changing one logs out the other devices.
- The containers run without root.

**Limits**
- Daily cap on AI assistant calls.
- Daily cap on files uploaded from the website.
- Uploads that were never attached to a request are deleted after 48 h.
- Timeouts on payment and AI requests.
- Request time limits and caps on real-time connections.

**Performance**
- Uploads stream to disk instead of memory.
- Public-link lookups use indexes.
- Encrypted settings are cached.
- SQLite uses `synchronous=NORMAL` in WAL mode.
- The server shuts down cleanly and flushes the database.
- Smaller image: ffmpeg is optional (build argument `WITH_FFMPEG=true`).
