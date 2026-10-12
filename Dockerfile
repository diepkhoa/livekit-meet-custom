# ── STAGE 1: BUILDER (Biên dịch dự án) ──
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

# 🔥 BỔ SUNG CÁC BIẾN MÔI TRƯỜNG BUILD-TIME ĐỂ KHÔNG BỊ MẤT BACKGROUND FILTER:
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SHOW_SETTINGS_MENU=true

RUN pnpm build

# ── STAGE 2: RUNNER (Tối ưu ~250MB chuẩn production) ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Tạo user bảo mật
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 1. Copy server standalone trước
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 2. Sau đó mới nạp các thư mục tĩnh vào đúng vị trí
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]