FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY server/package*.json ./server/

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

WORKDIR /app

# Copy server package files and install production dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy built assets
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/public ./public
COPY --from=builder /app/server/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/index.js"]
