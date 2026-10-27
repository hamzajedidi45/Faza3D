#!/bin/bash
# Restauration d'une sauvegarde dans le volume EasyPanel :  ./restaurer.sh /root/sauvegardes/faza3d-2026-11-01-0330.tar.gz
# 1. Dans EasyPanel, arrêtez le service « atelier » (bouton Stop).  2. Lancez ce script.  3. Redémarrez le service (Deploy).
# La plateforme repart de la copie de la base contenue dans sauvegardes/ (la plus récente).
PROJET="${PROJET:-faza3d}"
SERVICE="${SERVICE:-atelier}"
VOLUME="${VOLUME:-donnees}"
set -euo pipefail

[ -f "${1:-}" ] || { echo "Usage : ./restaurer.sh <fichier .tar.gz>"; exit 1; }
DST="/etc/easypanel/projects/$PROJET/$SERVICE/volumes/$VOLUME"
[ -d "$DST" ] || { echo "Volume introuvable : $DST"; exit 1; }
if docker ps --format '{{.Names}}' | grep -q "^${PROJET}_${SERVICE}\."; then
  echo "Le service $SERVICE tourne encore : arrêtez-le dans EasyPanel (Stop) avant de restaurer."; exit 1
fi

# la base actuelle est mise de côté, jamais effacée
[ -f "$DST/atelier.db" ] && mv "$DST/atelier.db" "$DST/atelier.db.avant-restauration-$(date +%F-%H%M)"
rm -f "$DST/atelier.db-wal" "$DST/atelier.db-shm"
tar -xzf "$1" -C "$DST"
LAST=$(ls -1 "$DST"/sauvegardes/atelier-*.db 2>/dev/null | sort | tail -n 1 || true)
[ -n "$LAST" ] || { echo "Aucune copie de base dans l'archive."; exit 1; }
cp "$LAST" "$DST/atelier.db"
echo "Restauré depuis $1 (base : $(basename "$LAST")). Redémarrez le service atelier dans EasyPanel."
