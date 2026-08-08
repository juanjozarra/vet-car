# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Runs `prisma migrate deploy` as a one-shot compose service
FROM deps AS migrate
COPY prisma.config.ts ./
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

FROM deps AS builder
COPY . .
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time,
# so the Maps key must arrive as a build arg, not a runtime env var
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# prisma.config.ts requires DATABASE_URL to be set; the build never connects
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
# lib/email.ts constructs the Resend client at module load, so Next's build-time
# page-data collection needs a non-empty value here; the real key is supplied at
# container runtime via docker-compose (this ENV doesn't carry into the runner stage)
ENV RESEND_API_KEY="build-time-placeholder"
RUN npx prisma generate
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
