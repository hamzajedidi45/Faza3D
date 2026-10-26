# FAZA 3D Atelier — image de la plateforme
FROM node:24-bookworm-slim
ENV NODE_ENV=production TZ=Africa/Tunis
# ffmpeg : caméras Bambu Lab X1 (optionnel, retirez la ligne pour une image plus petite)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates tzdata && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY atelier/package.json atelier/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY atelier/ ./
# les données (base, fichiers, sauvegardes, secrets) vivent hors de l'image
VOLUME ["/app/donnees"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/api/public/info').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "pont.js"]
