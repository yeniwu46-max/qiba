"""Upload Qiba to the Aliyun host and start it. Uses QIBA_SSH_PASS or ~/.ssh/qiba_deploy."""
from __future__ import annotations

import os
import posixpath
import time
from pathlib import Path

import paramiko

HOST = os.environ.get("QIBA_HOST", "47.102.108.137")
USER = os.environ.get("QIBA_SSH_USER", "root")
REMOTE = "/opt/qiba"
ROOT = Path(__file__).resolve().parents[1]
KEY_PATH = Path.home() / ".ssh" / "qiba_deploy"
PUB_PATH = Path.home() / ".ssh" / "qiba_deploy.pub"

SKIP_DIRS = {".git", "node_modules", ".vercel", "miniprogram", ".vscode"}
SKIP_FILES = {".DS_Store"}


def connect() -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    password = os.environ.get("QIBA_SSH_PASS")
    if KEY_PATH.exists():
        try:
            client.connect(
                HOST,
                username=USER,
                key_filename=str(KEY_PATH),
                timeout=15,
                allow_agent=False,
                look_for_keys=False,
            )
            return client
        except Exception:
            if not password:
                raise
    if not password:
        raise SystemExit("需要 QIBA_SSH_PASS 或可用的 ~/.ssh/qiba_deploy")
    client.connect(
        HOST,
        username=USER,
        password=password,
        timeout=15,
        allow_agent=False,
        look_for_keys=False,
    )
    return client


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 180) -> str:
    print(">>", cmd)
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip())
    if code != 0:
        raise RuntimeError(f"remote command failed ({code}): {cmd}")
    return out


def should_skip(path: Path) -> bool:
    if path.name in SKIP_FILES:
        return True
    return any(part in SKIP_DIRS for part in path.parts)


def ensure_remote_dir(sftp: paramiko.SFTPClient, remote: str) -> None:
    parts = [p for p in remote.split("/") if p]
    cur = ""
    for part in parts:
        cur += "/" + part
        try:
            sftp.stat(cur)
        except FileNotFoundError:
            sftp.mkdir(cur)


def upload_tree(sftp: paramiko.SFTPClient, local: Path, remote: str) -> int:
    count = 0
    ensure_remote_dir(sftp, remote)
    for root, dirs, files in os.walk(local):
        root_path = Path(root)
        rel = root_path.relative_to(local)
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        remote_dir = remote if str(rel) == "." else posixpath.join(remote, rel.as_posix())
        ensure_remote_dir(sftp, remote_dir)
        for name in files:
            src = root_path / name
            if should_skip(src):
                continue
            dest = posixpath.join(remote_dir, name)
            sftp.put(str(src), dest)
            count += 1
    return count


def install_pubkey(client: paramiko.SSHClient) -> None:
    if not PUB_PATH.exists():
        return
    pub = PUB_PATH.read_text(encoding="utf-8").strip()
    run(
        client,
        "mkdir -p /root/.ssh && chmod 700 /root/.ssh && "
        "touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys",
    )
    _, stdout, _ = client.exec_command("cat /root/.ssh/authorized_keys", timeout=15)
    existing = stdout.read().decode("utf-8", "replace")
    if pub not in existing:
        run(client, f"printf '%s\\n' '{pub}' >> /root/.ssh/authorized_keys")
        print("installed deploy public key")


def main() -> None:
    client = connect()
    install_pubkey(client)
    run(client, f"mkdir -p {REMOTE}/server {REMOTE}/web {REMOTE}/deploy")
    if not run(client, "command -v node || true").strip():
        run(client, "dnf install -y nodejs", timeout=240)
    run(client, "node -v && npm -v")

    sftp = client.open_sftp()
    uploaded = 0
    uploaded += upload_tree(sftp, ROOT / "web", f"{REMOTE}/web")
    uploaded += upload_tree(sftp, ROOT / "server" / "src", f"{REMOTE}/server/src")
    uploaded += upload_tree(sftp, ROOT / "server" / "data", f"{REMOTE}/server/data")
    uploaded += upload_tree(sftp, ROOT / "deploy", f"{REMOTE}/deploy")
    sftp.put(str(ROOT / "server" / "package.json"), f"{REMOTE}/server/package.json")
    if (ROOT / "server" / "package-lock.json").exists():
        sftp.put(str(ROOT / "server" / "package-lock.json"), f"{REMOTE}/server/package-lock.json")
    uploaded += 1
    sftp.close()
    print(f"uploaded {uploaded} files")

    run(client, f"chmod +x {REMOTE}/deploy/setup.sh")
    run(client, f"cd {REMOTE}/server && npm install --omit=dev", timeout=180)
    run(client, f"install -m 644 {REMOTE}/deploy/qiba.service /etc/systemd/system/qiba.service")
    run(client, "systemctl daemon-reload && systemctl enable qiba && systemctl restart qiba")
    run(
        client,
        f"install -m 644 {REMOTE}/deploy/nginx-qiba.conf "
        "/www/server/panel/vhost/nginx/qiba.wuyeni.cn.conf",
    )
    run(client, "nginx -t && nginx -s reload")
    time.sleep(1)
    run(client, "systemctl is-active qiba")
    run(client, "curl -sf http://127.0.0.1:3000/api/health")
    client.close()
    print("OK http://47.102.108.137:3000")


if __name__ == "__main__":
    main()
