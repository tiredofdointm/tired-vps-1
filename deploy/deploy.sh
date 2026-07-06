#!/usr/bin/env bash
# One-shot installer / updater for tired.events on a Debian/Ubuntu VPS.
#
# First run (as root):
#   curl -fsSL https://raw.githubusercontent.com/tiredofdointm/tired-vps-1/main/deploy/deploy.sh | sudo bash
# Updates (same command, or from a checkout):
#   sudo bash deploy/deploy.sh
#
# Overridable env: APP_DIR DATA_DIR REPO BRANCH RUN_USER PORT
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tired-events}"
DATA_DIR="${DATA_DIR:-/var/lib/tired-events}"
REPO="${REPO:-https://github.com/tiredofdointm/tired-vps-1.git}"
BRANCH="${BRANCH:-main}"
RUN_USER="${RUN_USER:-tired}"
SERVICE="tired-events"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/deploy.sh" >&2
  exit 1
fi

# Node 22+ (via NodeSource when missing or too old)
need_node=1
if command -v node >/dev/null 2>&1; then
  major="$(node -v | sed 's/^v//' | cut -d. -f1)"
  [[ "$major" -ge 20 ]] && need_node=0
fi
if [[ $need_node -eq 1 ]]; then
  echo "Installing Node.js 22…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v git >/dev/null 2>&1 || apt-get install -y git

id -u "$RUN_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$RUN_USER"

if [[ -d "$APP_DIR/.git" ]]; then
  echo "Updating $APP_DIR from $BRANCH…"
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  echo "Cloning $REPO → $APP_DIR…"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
npm ci --no-audit --no-fund
npm run build

mkdir -p "$DATA_DIR"
chown -R "$RUN_USER":"$RUN_USER" "$DATA_DIR" "$APP_DIR"

install -m 644 "$APP_DIR/deploy/tired-events.service" "/etc/systemd/system/$SERVICE.service"
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
systemctl restart "$SERVICE"
sleep 2
systemctl --no-pager --lines=6 status "$SERVICE" || true

ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "✔ tired.events is live → http://${ip:-localhost}:${PORT:-8787}"
echo "  photos: set TIRED_IMAGES_DIRS in /etc/systemd/system/$SERVICE.service, then: systemctl daemon-reload && systemctl restart $SERVICE"
