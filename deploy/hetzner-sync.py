"""Upload api package to Hetzner using docs/provider_configuration.json."""

from __future__ import annotations

import json
import os
import tarfile
import tempfile
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "docs" / "provider_configuration.json"
REMOTE_DIR = "/opt/evabot"
WIDGET_ORIGIN = "https://widget-xi-eight.vercel.app"


def load_cfg() -> dict:
    return json.loads(CFG.read_text(encoding="utf-8"))


def make_archive(dest: Path) -> None:
    def filter_tar(info: tarfile.TarInfo) -> tarfile.TarInfo | None:
        name = info.name.replace("\\", "/")
        parts = name.split("/")
        if "node_modules" in parts or ".git" in parts or ".mastra" in parts:
            return None
        if name.endswith(".env"):
            return None
        return info

    with tarfile.open(dest, "w:gz") as tar:
        tar.add(ROOT / "package.json", arcname="package.json")
        tar.add(ROOT / "package-lock.json", arcname="package-lock.json")
        tar.add(ROOT / "api", arcname="api", filter=filter_tar)
        tar.add(ROOT / "widget" / "package.json", arcname="widget/package.json")
        tar.add(ROOT / "deploy" / "evabot-api.service", arcname="deploy/evabot-api.service")


def connect(client: paramiko.SSHClient, server: dict) -> None:
    kwargs: dict = {
        "hostname": server["host"],
        "port": int(server["port"]),
        "username": server["username"],
        "timeout": 30,
    }
    key_path = str(server.get("key_path") or "").strip()
    password = str(server.get("password") or "")
    if key_path:
        kwargs["key_filename"] = os.path.expanduser(key_path)
    if password:
        kwargs["password"] = password
    client.connect(**kwargs)


def env_contents(cfg: dict) -> str:
    bitrix = str(cfg["bitrix24-webhook"]["url"]).rstrip("/") + "/"
    supabase = cfg["supabase-service-role-key"]
    deepseek = cfg["deepseek-api-key"]["api_key"]
    return "\n".join(
        [
            f"DEEPSEEK_API_KEY={deepseek}",
            f"BITRIX_WEBHOOK_URL={bitrix}",
            f"SUPABASE_URL={supabase['url']}",
            f"SUPABASE_SERVICE_ROLE_KEY={supabase['key']}",
            "PORT=3000",
            f"WIDGET_ORIGIN={WIDGET_ORIGIN}",
            "",
        ]
    )


def main() -> None:
    cfg = load_cfg()
    server = cfg["server-hetzner"]
    archive = Path(tempfile.gettempdir()) / "evabot-api.tgz"
    make_archive(archive)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connect(client, server)
    sftp = client.open_sftp()
    try:
        try:
            sftp.mkdir(REMOTE_DIR)
        except OSError:
            pass
        sftp.put(str(archive), f"{REMOTE_DIR}/bundle.tgz")
    finally:
        sftp.close()

    extract = f"set -e; mkdir -p {REMOTE_DIR}; cd {REMOTE_DIR}; tar -xzf bundle.tgz"
    stdin, stdout, stderr = client.exec_command(extract, timeout=120)
    if stdout.channel.recv_exit_status() != 0:
        raise SystemExit(stderr.read().decode("utf-8", errors="replace")[-1500:])

    sftp = client.open_sftp()
    try:
        with sftp.file(f"{REMOTE_DIR}/api/.env", "w") as handle:
            handle.write(env_contents(cfg))
    finally:
        sftp.close()

    commands = (
        "set -e\n"
        "if ! command -v node >/dev/null; then "
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs; "
        "fi\n"
        f"cd {REMOTE_DIR}\n"
        "npm ci\n"
        "npm run build --workspace api\n"
        f"cp {REMOTE_DIR}/deploy/evabot-api.service /etc/systemd/system/evabot-api.service\n"
        "systemctl daemon-reload\n"
        "systemctl enable --now evabot-api\n"
        "systemctl restart evabot-api\n"
        "sleep 2\n"
        "systemctl is-active evabot-api\n"
        "ss -ltnp | grep 3000 || true\n"
    )
    stdin, stdout, stderr = client.exec_command(commands, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    client.close()
    print(out[-2500:])
    if code != 0:
        print(err[-2500:])
        raise SystemExit(code)


if __name__ == "__main__":
    main()
