#!/bin/bash
# Restauration depuis une sauvegarde : ./restaurer.sh /root/sauvegardes/faza3d-2026-11-01-0330.tar.gz
set -e
[ -f "$1" ] || { echo "Usage : ./restaurer.sh <fichier .tar.gz>"; exit 1; }
cd /root/faza3d
docker compose stop atelier
tar -xzf "$1"
docker compose start atelier
echo "Restauré depuis $1"
