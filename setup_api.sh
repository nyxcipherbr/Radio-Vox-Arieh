#!/bin/bash
# ==============================================================================
# SCRIPT DE ATIVAÇÃO DO SERVIÇO DE PERSISTÊNCIA ADM — RÁDIO VOX ARIEH
# Executar como root no servidor DigitalOcean
# ==============================================================================

set -e

echo "🦁 [1/4] Verificando ambiente e Node.js no servidor..."
if ! command -v node >/dev/null 2>&1; then
    echo "Instalando Node.js..."
    apt-get update -y && apt-get install -y nodejs
fi
echo "Node.js versão: $(node -v)"

APP_DIR="/var/www/radio-vox-arieh"
cd "$APP_DIR"

echo "🦁 [2/4] Configurando permissões do banco de dados (data.json)..."
if [ ! -f "$APP_DIR/data.json" ]; then
    echo "Criando data.json inicial..."
    node -e "
    const fs = require('fs');
    const vm = require('vm');
    const cfgCode = fs.readFileSync('$APP_DIR/config.js', 'utf8');
    const sandbox = {};
    vm.createContext(sandbox);
    const cfg = vm.runInContext(cfgCode + '\nRADIO_CONFIG;', sandbox);
    fs.writeFileSync('$APP_DIR/data.json', JSON.stringify({
      dailyDevotional: cfg.dailyDevotional,
      podcastEpisodes: cfg.podcast.episodes,
      sponsors: cfg.sponsors,
      schedule: cfg.schedule,
      contact: cfg.contact,
      streamUrl: cfg.streamUrl,
      updatedAt: new Date().toISOString()
    }, null, 2));
    "
fi
chmod 664 "$APP_DIR/data.json"

echo "🦁 [3/4] Instalando e iniciando o serviço systemd (vox-api)..."
cat << 'EOF' > /etc/systemd/system/vox-api.service
[Unit]
Description=Serviço Backend de Persistência ADM - Rádio Vox Arieh
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/radio-vox-arieh
ExecStart=/usr/bin/node /var/www/radio-vox-arieh/api.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vox-api
systemctl restart vox-api

echo "🦁 [4/4] Configurando roteamento da API no Nginx..."
NGINX_CONF=""
if [ -f "/etc/nginx/sites-available/default" ]; then
    NGINX_CONF="/etc/nginx/sites-available/default"
elif [ -f "/etc/nginx/conf.d/default.conf" ]; then
    NGINX_CONF="/etc/nginx/conf.d/default.conf"
fi

if [ -n "$NGINX_CONF" ]; then
    if ! grep -q "location /api/" "$NGINX_CONF"; then
        # Insere o bloco do proxy /api/ antes de location /
        sed -i '/location \/ {/i \    location /api/ {\n        proxy_pass http://127.0.0.1:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    }\n' "$NGINX_CONF"
    fi
fi

nginx -t
systemctl reload nginx

echo "=========================================================="
echo "✅ SUCESSO TOTAL! API ADM DA RÁDIO VOX ARIEH ATIVA!"
echo "Status do Serviço:"
systemctl status vox-api --no-pager | head -n 8
echo "=========================================================="
echo "Agora tudo o que você salvar no celular ficará gravado para sempre!"
