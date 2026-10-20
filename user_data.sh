#!/bin/bash
set -Eeuo pipefail
trap 'echo "Contoso bootstrap failed at line $LINENO" >&2' ERR
export DEBIAN_FRONTEND=noninteractive

echo "Starting Contoso Web deployment..."
apt-get update
apt-get install -y ca-certificates curl awscli
curl --fail --silent --show-error --location https://deb.nodesource.com/setup_22.x -o /tmp/contoso-node-setup.sh
bash /tmp/contoso-node-setup.sh
apt-get install -y nodejs
rm /tmp/contoso-node-setup.sh

mkdir -p /opt/${app_name}
cd /opt/${app_name}

echo "Downloading application archive..."
aws s3 cp "s3://${artifact_bucket}/${artifact_key}" /tmp/contoso-app.tar.gz
echo "${artifact_sha256}  /tmp/contoso-app.tar.gz" | sha256sum --check -
tar -xzf /tmp/contoso-app.tar.gz --strip-components=1
rm /tmp/contoso-app.tar.gz

npm ci --include=dev --no-fund --no-audit
NEXT_TELEMETRY_DISABLED=1 npm run build
npm prune --omit=dev --no-fund --no-audit

useradd --system --home-dir /opt/${app_name} --shell /usr/sbin/nologin ${app_name}
chown -R ${app_name}:${app_name} /opt/${app_name}

cat > /etc/systemd/system/${app_name}.service << EOF
[Unit]
Description=Contoso Web
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${app_name}
WorkingDirectory=/opt/${app_name}
Environment=NODE_ENV=${node_env}
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=/usr/bin/npm start -- --hostname 0.0.0.0 --port 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now ${app_name}.service

for attempt in $(seq 1 60); do
  if curl --fail --silent http://127.0.0.1:3000/ > /dev/null; then
    echo "Contoso Web is healthy on port 3000. Chat is disabled."
    exit 0
  fi
  sleep 2
done

echo "Application did not become healthy. Recent service logs:" >&2
journalctl -u ${app_name}.service --no-pager -n 100
exit 1
