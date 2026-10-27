# Site client FAZA 3D : fichiers statiques servis par nginx (contexte de construction : le dossier site/)
FROM nginx:1.27-alpine

# adresse de la plateforme, utilisée dans config.js et dans la politique de sécurité (CSP)
ENV FAZA_PLATFORM_URL=""

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY 15-faza-config.envsh /docker-entrypoint.d/15-faza-config.envsh
COPY index.html config.js /usr/share/nginx/html/
RUN chmod +x /docker-entrypoint.d/15-faza-config.envsh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
