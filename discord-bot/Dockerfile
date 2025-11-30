# RankBot Discord Bot - Docker Image

FROM node:18-alpine

# Add labels
LABEL org.opencontainers.image.title="RankBot Discord"
LABEL org.opencontainers.image.description="Discord bot for Roblox group ranking"
LABEL org.opencontainers.image.version="1.0.0"

# Create non-root user
RUN addgroup -g 1001 -S rankbot && \
    adduser -S rankbot -u 1001 -G rankbot

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY src ./src
COPY deploy-commands.js ./

# Set ownership
RUN chown -R rankbot:rankbot /app

# Switch to non-root user
USER rankbot

# Environment
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Start the bot
CMD ["node", "src/index.js"]
