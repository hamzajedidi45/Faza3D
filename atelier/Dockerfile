# FAZA 3D Atelier : image de la plateforme (contexte de construction : le dossier atelier/)
FROM node:24-bookworm-slim

# ffmpeg sert seulement aux caméras des Bambu Lab X1 reliées en direct au serveur.
# Avec le relais du PC de l'atelier (cas normal), il est inutile : laissez false pour une image plus légère.
ARG WITH_FFMPEG=false
RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata \
 && if [ "$WITH_FFMPEG" = "true" ]; then apt-get install -y --no-install-recommends ffmpeg; fi \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    TZ=Africa/Tunis \
    PORT=8787 \
    HOST=0.0.0.0 \
    FAZA_DATA_DIR=/app/donnees \
    FAZA_HTTPS=false \
    FAZA_BEHIND_PROXY=true

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node . .
RUN chmod +x docker-entrypoint.sh && mkdir -p /app/donnees && chown node:node /app/donnees

# base de données, fichiers, sauvegardes : hors de l'image, dans un volume
VOLUME ["/app/donnees"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/public/info').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# le script d'entrée donne le volume à l'utilisateur « node », puis lance la plateforme sans les droits root
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "--disable-warning=ExperimentalWarning", "pont.js"]
