#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/opt/evabot-src}"
ENV_FILE="${EVA_API_ENV:-/opt/evabot/api/.env}"
IMAGE="${EVA_API_IMAGE:-evabot-api:git}"
NAME="${EVA_API_NAME:-evabot-api}"
DATA_DIR="${EVA_MASTRA_DATA:-/opt/evabot/mastra}"
STUDIO_IMAGE="${EVA_STUDIO_IMAGE:-evabot-studio:git}"
STUDIO_NAME="${EVA_STUDIO_NAME:-evabot-studio}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$DATA_DIR"
docker build -t "$IMAGE" "$ROOT"
docker build -t "$STUDIO_IMAGE" -f "$ROOT/Dockerfile.studio" "$ROOT"
docker rm -f "$STUDIO_NAME" >/dev/null 2>&1 || true
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped \
  -p 3000:3000 \
  -v "$DATA_DIR:/data" \
  --env-file "$ENV_FILE" \
  -e MASTRA_STORAGE_URL=file:/data/mastra.db \
  -e MASTRA_OBSERVABILITY_PATH=/data/observability.duckdb \
  "$IMAGE" >/dev/null

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/v1/health | grep -q '"status":"ok"'; then
    docker run -d --name "$STUDIO_NAME" --restart unless-stopped \
      --add-host=host.docker.internal:host-gateway \
      -p 4111:4111 \
      --env-file "$ENV_FILE" \
      -e MASTRA_STUDIO_PUBLIC_HOST="${EVA_STUDIO_PUBLIC_HOST:-46.224.75.64}" \
      -e MASTRA_STUDIO_PUBLIC_PORT=4111 \
      "$STUDIO_IMAGE" >/dev/null
    studio_ok=
    for __ in $(seq 1 45); do
      code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4111 || true)"
      if [[ "$code" == "401" ]]; then
        studio_ok=1
        break
      fi
      sleep 1
    done
    docker image prune -f >/dev/null
    if [[ -n "$studio_ok" ]]; then
      exit 0
    fi
    echo "studio did not become ready" >&2
    exit 1
  fi
  sleep 1
done

echo "api did not become ready" >&2
exit 1
