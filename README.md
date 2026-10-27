# FAZA 3D

The management platform and public website of the FAZA 3D workshop (3D printing, laser cutting and engraving, 3D scanning, Tunis).

| Folder | Contents |
|---|---|
| `atelier/` | The team platform: orders, production, Bambu Lab printers, quotes and invoices (PDF, signature), CRM, finances, chat. Node.js 22.13+ with built-in SQLite and no build step. |
| `site/` | The public website (a single HTML page, served by nginx), with an estimator, a client account area and an AI assistant. |
| `poste-atelier/` | What gets installed in the workshop: the printer relay (Windows), the Android app, and the Mac launcher. |
| `scripts/` | Backup and restore scripts for the server. |

## Production deployment

See **[DEPLOY-EASYPANEL.md](DEPLOY-EASYPANEL.md)** (Hostinger VPS + EasyPanel + GitHub). All settings are environment variables, listed in [.env.example](.env.example).

## Local test with Docker

```bash
cp .env.example .env
```

```bash
docker compose up -d --build
```

The platform is at http://localhost:8787 and the site at http://localhost:8080. To create the first account, use the install code: `FAZA_INSTALL_CODE` from `.env`, or the code shown by `docker compose logs atelier`.

## Running without Docker (one PC)

```bash
cd atelier && npm ci && npm start
```

Settings come from environment variables or from `atelier/config.json` (copy `config.example.json`).
