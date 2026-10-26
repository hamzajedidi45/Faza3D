#!/bin/bash
# Prépare un serveur Ubuntu 24.04 neuf : mises à jour, Docker, pare-feu, dossier /root/faza3d. À lancer une seule fois, en root.
set -e
apt-get update && apt-get -y upgrade
apt-get install -y ca-certificates curl rsync ufw unattended-upgrades
# Docker (dépôt officiel)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker
# Pare-feu : seul SSH entre ; le reste passe par le tunnel Cloudflare
ufw default deny incoming && ufw default allow outgoing && ufw allow OpenSSH && ufw --force enable
# Mises à jour de sécurité automatiques d'Ubuntu
dpkg-reconfigure -f noninteractive unattended-upgrades
timedatectl set-timezone Africa/Tunis
echo; echo "Serveur prêt. Copiez le dossier faza3d dans /root/faza3d puis suivez GUIDE-INSTALLATION.md (étape 3)."
