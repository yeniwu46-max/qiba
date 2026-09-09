#!/usr/bin/env bash
# 在已上传到 /opt/qiba 的服务器上安装并启动棋霸。
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/qiba}"
PORT="${PORT:-3000}"

if ! command -v node >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y nodejs
  elif command -v yum >/dev/null 2>&1; then
    yum install -y nodejs
  elif command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq nodejs npm
  else
    echo "需要先安装 Node.js"
    exit 1
  fi
fi

cd "$APP_DIR/server"
npm install --omit=dev

install -m 644 "$APP_DIR/deploy/qiba.service" /etc/systemd/system/qiba.service
systemctl daemon-reload
systemctl enable qiba
systemctl restart qiba

if [ -d /www/server/panel/vhost/nginx ]; then
  install -m 644 "$APP_DIR/deploy/nginx-qiba.conf" /www/server/panel/vhost/nginx/qiba.wuyeni.cn.conf
  nginx -t && nginx -s reload
fi

sleep 1
curl -sf "http://127.0.0.1:${PORT}/api/health"
echo
echo "棋霸已启动: http://127.0.0.1:${PORT}"
