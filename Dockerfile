FROM node:22-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma

# Install dependencies
RUN cd frontend && npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Copy frontend to server public folder
RUN mkdir -p server/public && cp -r frontend/dist/frontend/browser/* server/public/

# Build server
RUN cd server && npm run build

# Production stage
FROM node:22-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy prisma schema first (needed for postinstall)
COPY server/prisma ./prisma

# Copy server package files and install production dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy built assets
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/public ./public

EXPOSE 3000

CMD ["node", "dist/index.js"]
