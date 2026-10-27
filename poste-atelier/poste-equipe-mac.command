#!/bin/bash
# FAZA 3D Atelier : préparer un Mac de l'équipe (certificat de l'atelier + ouverture de la plateforme).
# Double-cliquez sur ce fichier. Si macOS refuse : clic droit > Ouvrir, ou dans Terminal : chmod +x poste-equipe-mac.command
PORT=8787
echo "FAZA 3D Atelier : installer ce Mac"
echo "Le nom et l'adresse du PC de l'atelier sont affichés sur ce PC-là (Paramètres > Ouvrir la plateforme sur les autres PC)."
read -p "Nom ou adresse IP du PC de l'atelier : " H
H=$(echo "$H" | sed -E 's#^https?://##; s#[:/].*$##' | tr -d ' ')
[ -z "$H" ] && { echo "Rien saisi."; exit 1; }
echo "Test de la connexion avec $H..."
if ! nc -z -w 4 "$H" $PORT 2>/dev/null; then echo "Impossible de joindre $H sur le port $PORT : même Wi-Fi que l'atelier ? PC de l'atelier allumé ? Essayez l'adresse IP."; exit 1; fi
TMP="/tmp/certificat-faza3d.crt"
curl -fsS "http://$H:$PORT/certificat-faza3d.crt" -o "$TMP" || { echo "Téléchargement du certificat impossible."; exit 1; }
echo "macOS va demander votre mot de passe de session pour faire confiance au certificat « FAZA 3D Atelier »."
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$TMP" && echo "Certificat installé." || { echo "Certificat non installé. Alternative : double-cliquez sur $TMP, puis dans Trousseaux d'accès > Système > FAZA 3D Atelier > Confiance > Toujours approuver."; exit 1; }
URL="https://$H:$PORT/"
printf '[InternetShortcut]\nURL=%s\n' "$URL" > "$HOME/Desktop/FAZA 3D Atelier.url"
cat > "$HOME/Desktop/FAZA 3D Atelier.webloc" <<W
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>URL</key><string>$URL</string></dict></plist>
W
rm -f "$HOME/Desktop/FAZA 3D Atelier.url"
echo "Icône « FAZA 3D Atelier » ajoutée sur le Bureau ($URL)."
echo "Fermez complètement Chrome ou Safari, rouvrez l'icône et connectez-vous. Pour une vraie app : Chrome > menu > Installer FAZA 3D Atelier (ou Safari > Fichier > Ajouter au Dock)."
open "$URL"
