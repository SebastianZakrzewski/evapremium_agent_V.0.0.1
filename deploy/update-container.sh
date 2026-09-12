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

docker image prune -f >/dev/null
