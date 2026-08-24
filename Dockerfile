# Stage 1: Build Frontend and dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm ci

COPY . .

# Build Vite frontend into dist/client
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend client from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create persistent data volume for SQLite
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["npm", "run", "start"]
