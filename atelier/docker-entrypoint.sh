#!/bin/sh
# Lancement dans Docker : le volume de données appartient à « node », puis la plateforme tourne sans les droits root.
set -e
DATA="${FAZA_DATA_DIR:-/app/donnees}"
mkdir -p "$DATA"
if [ "$(id -u)" = "0" ]; then
  # seulement les fichiers qui ne sont pas encore à node (rapide même avec beaucoup de fichiers)
  find "$DATA" ! -user node -exec chown node:node {} +
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi
exec "$@"
