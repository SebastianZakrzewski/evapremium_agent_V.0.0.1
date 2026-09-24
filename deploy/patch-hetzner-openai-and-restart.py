"""Patch OPENAI_API_KEY on Hetzner api .env and recreate API container (no image rebuild)."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "docs" / "provider_configuration.json"
LOCAL_ENV = ROOT / "api" / ".env"
REMOTE_ENV = "/opt/evabot/api/.env"
IMAGE = "evabot-api:git"
NAME = "evabot-api"
DATA_DIR = "/opt/evabot/mastra"


def load_openai_from_local() -> str:
    if not LOCAL_ENV.exists():
        raise SystemExit(f"missing {LOCAL_ENV}")
    for line in LOCAL_ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith("OPENAI_API_KEY="):
            value = line.split("=", 1)[1].strip()
            if value:
                return value
    raise SystemExit("OPENAI_API_KEY missing or empty in api/.env")


def merge_env(text: str, openai_key: str) -> str:
    lines = text.splitlines()
    out: list[str] = []
    found = False
    for line in lines:
        if line.startswith("OPENAI_API_KEY="):
            out.append(f"OPENAI_API_KEY={openai_key}")
            found = True
        else:
            out.append(line)
    if not found:
        if out and out[-1].strip():
            out.append("")
        out.append(f"OPENAI_API_KEY={openai_key}")
    return "\n".join(out).rstrip() + "\n"


def connect(client: paramiko.SSHClient, server: dict) -> None:
    kwargs: dict = {
        "hostname": server["host"],
        "port": int(server["port"]),
        "username": server["username"],
        "timeout": 30,
    }
    key_path = str(server.get("key_path") or "").strip()
    password = str(server.get("password") or "")
    if key_path and Path(os.path.expanduser(key_path)).exists():
        kwargs["key_filename"] = os.path.expanduser(key_path)
    if password:
        kwargs["password"] = password
    client.connect(**kwargs)


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 120) -> tuple[int, str, str]:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return code, out, err


def main() -> None:
    import json

    cfg = json.loads(CFG.read_text(encoding="utf-8"))
    openai_key = load_openai_from_local()
    server = cfg["server-hetzner"]

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connect(client, server)

    sftp = client.open_sftp()
    try:
        with sftp.file(REMOTE_ENV, "r") as handle:
            remote_text = handle.read().decode("utf-8")
    except OSError as exc:
        raise SystemExit(f"cannot read {REMOTE_ENV}: {exc}") from exc

    merged = merge_env(remote_text, openai_key)
    had_openai = bool(re.search(r"^OPENAI_API_KEY=.+", remote_text, re.M))
    with sftp.file(REMOTE_ENV, "w") as handle:
        handle.write(merged)
    sftp.close()

    recreate = f"""set -e
docker rm -f {NAME} >/dev/null 2>&1 || true
docker run -d --name {NAME} --restart unless-stopped \\
  -p 3000:3000 \\
  -v {DATA_DIR}:/data \\
  --env-file {REMOTE_ENV} \\
  -e MASTRA_STORAGE_URL=file:/data/mastra.db \\
  -e MASTRA_OBSERVABILITY_PATH=/data/observability.duckdb \\
  {IMAGE}
for i in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:3000/v1/health | grep -q '"status":"ok"'; then
    echo api_ready=1
    exit 0
  fi
  sleep 1
done
echo api_ready=0
exit 1
"""
    code, out, err = run(client, recreate, timeout=90)
    code_check, out_check, _ = run(
        client,
        f"docker exec {NAME} sh -c 'test -n \"$OPENAI_API_KEY\" && echo openai_set=1 || echo openai_set=0'",
        timeout=30,
    )

    client.close()

    print(
        {
            "remote_had_openai": had_openai,
            "recreate_exit": code,
            "recreate_tail": out.strip()[-200:],
            "openai_in_container": "openai_set=1" in out_check,
        }
    )
    if code != 0:
        print(err[-1500:], file=sys.stderr)
        raise SystemExit(code)
    if "openai_set=1" not in out_check:
        raise SystemExit("OPENAI_API_KEY not visible inside container")


if __name__ == "__main__":
    main()
