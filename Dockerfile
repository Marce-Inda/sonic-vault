# ⚡ SonicVault (SpotiMP4) Dockerfile for Hugging Face Spaces & Production Deployments
FROM node:20-bullseye-slim

# Install ffmpeg, python3, yt-dlp, and essential utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package descriptors & install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build Vite client & TypeScript server
RUN npm run build

# Default Hugging Face Spaces port is 7860
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

# Create music directory for cloud downloads
RUN mkdir -p /app/musica/Descargas

# Start Express server & static asset handler
CMD ["npm", "start"]
