#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/opt/evabot-src}"
ENV_FILE="${EVA_API_ENV:-/opt/evabot/api/.env}"
IMAGE="${EVA_API_IMAGE:-evabot-api:git}"
NAME="${EVA_API_NAME:-evabot-api}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

docker build -t "$IMAGE" "$ROOT"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped \
  -p 3000:3000 --env-file "$ENV_FILE" "$IMAGE" >/dev/null

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/v1/health | grep -q '"status":"ok"'; then
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 1
done

echo "api did not become ready" >&2
exit 1
