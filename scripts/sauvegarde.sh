#!/bin/bash
# Sauvegarde du volume de données FAZA 3D sur le serveur EasyPanel, puis copie hors du serveur si rclone est configuré.
# Contenu : copies quotidiennes de la base (faites par la plateforme), fichiers des commandes, photos, rapports, logo, cachet.
# Exclus : la base en cours d'écriture (sa copie du jour est dans sauvegardes/) et la clé des secrets (gardez FAZA_SECRET_KEY à part).
#
# Planification chaque nuit (sur le serveur, en root) :
#   crontab -e   →   30 3 * * * /root/faza3d/sauvegarde.sh >> /root/sauvegardes/journal.txt 2>&1
#
# Réglages (modifiez si votre projet ou votre service s'appelle autrement dans EasyPanel) :
PROJET="${PROJET:-faza3d}"
SERVICE="${SERVICE:-atelier}"
VOLUME="${VOLUME:-donnees}"
GARDER="${GARDER:-7}"                 # nombre d'archives gardées sur le serveur
REMOTE="${REMOTE:-}"                  # nom du remote rclone (ex. gdrive:faza3d-sauvegardes), vide = pas de copie externe
set -euo pipefail

SRC="/etc/easypanel/projects/$PROJET/$SERVICE/volumes/$VOLUME"
[ -d "$SRC" ] || { echo "Volume introuvable : $SRC (vérifiez PROJET, SERVICE, VOLUME)"; exit 1; }
DEST=/root/sauvegardes
mkdir -p "$DEST"
F="$DEST/faza3d-$(date +%F-%H%M).tar.gz"

tar -czf "$F" -C "$SRC" \
  --exclude='./atelier.db' --exclude='./atelier.db-wal' --exclude='./atelier.db-shm' \
  --exclude='./cle-secrets.bin' --exclude='./code-installation.txt' .
chmod 600 "$F"
ls -1t "$DEST"/faza3d-*.tar.gz | tail -n +"$((GARDER + 1))" | xargs -r rm --
echo "$(date '+%F %T') sauvegarde : $F ($(du -h "$F" | cut -f1))"

if [ -n "$REMOTE" ]; then
  rclone copy "$F" "$REMOTE" && echo "  copiée vers $REMOTE"
fi
