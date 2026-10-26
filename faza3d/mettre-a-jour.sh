#!/bin/bash
# Mise à jour de la plateforme et du site à partir d'un nouveau dossier faza3d (copié dans /root/faza3d-nouveau)
set -e
cd /root/faza3d
NEW=${1:-/root/faza3d-nouveau}
[ -d "$NEW/atelier" ] || { echo "Dossier $NEW/atelier introuvable."; exit 1; }
echo "== Sauvegarde avant mise à jour"; ./sauvegarde.sh
echo "== Copie du code"; rsync -a --delete --exclude donnees --exclude node_modules "$NEW/atelier/" atelier/
cp "$NEW/site/index.html" site/index.html            # config.js (vos réglages) n'est pas touché
cp "$NEW/Dockerfile" "$NEW/docker-compose.yml" "$NEW/nginx-site.conf" .
echo "== Reconstruction et redémarrage"; docker compose up -d --build
docker compose ps
echo "Terminé. Journal : docker compose logs -f atelier"
