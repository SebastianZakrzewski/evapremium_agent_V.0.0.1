#!/bin/sh
set -eu

if [ -z "${MASTRA_STUDIO_TOKEN:-}" ]; then
  echo "missing MASTRA_STUDIO_TOKEN" >&2
  exit 1
fi

HOST="${MASTRA_STUDIO_PUBLIC_HOST:-localhost}"
PORT="${MASTRA_STUDIO_PUBLIC_PORT:-4111}"
export STUDIO_BASIC_HASH
STUDIO_BASIC_HASH="$(caddy hash-password --plaintext "$MASTRA_STUDIO_TOKEN")"

node <<'NODE'
const { writeFileSync } = require('node:fs');
const hash = process.env.STUDIO_BASIC_HASH;
if (!hash) {
  process.exit(1);
}
writeFileSync(
  '/tmp/Caddyfile',
  [
    ':4111 {',
    '\tbasic_auth {',
    '\t\teva ' + JSON.stringify(hash),
    '\t}',
    '',
    '\thandle /mastra* {',
    '\t\treverse_proxy host.docker.internal:3000 {',
    '\t\t\theader_up Authorization "Bearer {$MASTRA_STUDIO_TOKEN}"',
    '\t\t}',
    '\t}',
    '',
    '\thandle {',
    '\t\treverse_proxy 127.0.0.1:4112',
    '\t}',
    '}',
    '',
  ].join('\n'),
);
NODE

mastra studio \
  --port 4112 \
  --server-host "$HOST" \
  --server-port "$PORT" \
  --server-protocol http \
  --server-api-prefix /mastra \
  --request-context-presets /app/mastra-request-context-presets.json &

i=0
while [ "$i" -lt 30 ]; do
  if curl -fsS "http://127.0.0.1:4112" >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 1
done

exec caddy run --config /tmp/Caddyfile --adapter caddyfile
