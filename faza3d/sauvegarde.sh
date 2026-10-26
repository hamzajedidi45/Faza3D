#!/bin/bash
# Sauvegarde complète (base, fichiers, secrets, réglages) dans /root/sauvegardes, puis copie externe si rclone est configuré.
# À planifier chaque nuit : crontab -e  →  30 3 * * * /root/faza3d/sauvegarde.sh >> /root/sauvegardes/journal.txt 2>&1
set -e
cd /root/faza3d
mkdir -p /root/sauvegardes
F=/root/sauvegardes/faza3d-$(date +%F-%H%M).tar.gz
tar -czf "$F" donnees config.json site/config.js .env 2>/dev/null || tar -czf "$F" donnees config.json site/config.js
ls -t /root/sauvegardes/faza3d-*.tar.gz | tail -n +31 | xargs -r rm --      # garde 30 sauvegardes
echo "$(date '+%F %T') sauvegarde : $F ($(du -h "$F" | cut -f1))"
# Copie hors du serveur (recommandé) : installez rclone (apt install rclone), configurez un "remote" (rclone config : Google Drive, OneDrive...)
# puis décommentez la ligne suivante en mettant le nom de votre remote :
# rclone copy "$F" monremote:faza3d-sauvegardes/ && echo "  copiée sur le cloud"
