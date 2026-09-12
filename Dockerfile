FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY widget/package.json widget/package.json
RUN npm ci
COPY api api
RUN npm run build --workspace api

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY widget/package.json widget/package.json
RUN npm ci --omit=dev --workspace api --include-workspace-root
COPY --from=build /app/api/dist api/dist
WORKDIR /app/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
