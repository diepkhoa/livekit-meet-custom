# ── STAGE 1: BUILDER (Biên dịch dự án) ──
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── STAGE 2: RUNNER SIÊU NHẸ (CHỈ ~140MB) ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Tạo user bảo mật không có quyền root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# COPY ĐÚNG CÁC THƯ MỤC CẦN THIẾT CỦA BẢN STANDALONE:
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Chạy thẳng bằng Node.js thuần (Không cần pnpm, không cần mã nguồn gốc .tsx)
CMD ["node", "server.js"]