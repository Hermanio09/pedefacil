#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
# Provisionamento da VPS Hostinger — PedeFacil (app + Postgres + Evolution API)
#
# Rode como root, uma vez, numa VPS Ubuntu 22.04 recém-criada.
#
# Este script NÃO contém nenhuma senha — ele lê de "vps/segredos.env" (arquivo
# ignorado pelo Git, nunca commitado). Antes de rodar:
#   1. cp vps/segredos.env.exemplo vps/segredos.env
#   2. Preencha vps/segredos.env com os valores reais (veja
#      credenciais-producao-NAO-COMMITAR.txt na raiz do projeto)
#   3. Copie a pasta vps/ inteira (com o segredos.env já preenchido) pro servidor,
#      ou copie só o segredos.env manualmente depois do git clone.
#
# Uso:  bash provisionar.sh
# ══════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARQUIVO_SEGREDOS="${SCRIPT_DIR}/segredos.env"

if [ ! -f "$ARQUIVO_SEGREDOS" ]; then
  echo "ERRO: ${ARQUIVO_SEGREDOS} não encontrado."
  echo "Copie vps/segredos.env.exemplo para vps/segredos.env e preencha os valores antes de rodar."
  exit 1
fi

# shellcheck disable=SC1090
source "$ARQUIVO_SEGREDOS"

for var in DOMINIO REPO_GIT EMAIL_CERTBOT JWT_SECRET POSTGRES_PASSWORD POSTGRES_USER POSTGRES_DB EVOLUTION_API_KEY NEXT_PUBLIC_VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "ERRO: variável ${var} está vazia em segredos.env. Preencha antes de rodar."
    exit 1
  fi
done

DIR_APP="/opt/pedefacil"
PORTA_APP="3001"

echo "═══ 1/9 — Atualizando sistema ═══"
apt update && apt upgrade -y
apt install -y curl git ufw

echo "═══ 2/9 — Instalando Node.js 20 LTS ═══"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

echo "═══ 3/9 — Instalando Postgres ═══"
apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';"
sudo -u postgres psql -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};"

echo "═══ 4/9 — Instalando Nginx + Certbot ═══"
apt install -y nginx certbot python3-certbot-nginx

echo "═══ 5/9 — Instalando Docker (para a Evolution API) ═══"
curl -fsSL https://get.docker.com | sh

echo "═══ 6/9 — Clonando o repositório ═══"
mkdir -p "$(dirname "$DIR_APP")"
if [ ! -d "$DIR_APP/.git" ]; then
  git clone "$REPO_GIT" "$DIR_APP"
else
  echo "Repositório já existe em $DIR_APP, pulando clone."
fi

# Garante que o segredos.env real está na pasta vps/ dentro do repo clonado (caso o clone
# tenha sobrescrito ou não tivesse a pasta ainda) — nunca vem do próprio Git.
cp "$ARQUIVO_SEGREDOS" "${DIR_APP}/vps/segredos.env"

echo "═══ 7/9 — Configurando variáveis de ambiente de produção ═══"
# URL-encode da senha do Postgres para a connection string (caracteres reservados de URL)
POSTGRES_PASSWORD_URL=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$POSTGRES_PASSWORD")

cat > "${DIR_APP}/api/.env.production.local" <<EOF
NODE_ENV=production
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD_URL}@localhost:5432/${POSTGRES_DB}
JWT_SECRET=${JWT_SECRET}
NEXT_PUBLIC_APP_URL=https://${DOMINIO}
GOOGLE_AI_KEY=${GOOGLE_AI_KEY:-}
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
EVOLUTION_INSTANCE=pedefacil
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM=${SMTP_FROM:-}
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
EOF
chmod 600 "${DIR_APP}/api/.env.production.local"
chmod 600 "${DIR_APP}/vps/segredos.env"

echo "═══ 8/9 — Build da aplicação + migração do banco + Evolution API ═══"
cd "${DIR_APP}/api"
npm ci
npx prisma migrate deploy
npm run build

cd "${DIR_APP}/vps"
docker compose up -d

cd "${DIR_APP}/api"
pm2 start npm --name pedefacil -- start -- -p "${PORTA_APP}"
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

echo "═══ 9/9 — Configurando Nginx + HTTPS ═══"
cat > /etc/nginx/sites-available/pedefacil <<EOF
server {
    listen 80;
    server_name ${DOMINIO};

    location / {
        proxy_pass http://localhost:${PORTA_APP};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
ln -sf /etc/nginx/sites-available/pedefacil /etc/nginx/sites-enabled/pedefacil
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

certbot --nginx -d "${DOMINIO}" --non-interactive --agree-tos -m "${EMAIL_CERTBOT}" --redirect

echo "═══ Firewall ═══"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "✅ Provisionamento concluído."
echo "   App:        https://${DOMINIO}"
echo "   PM2:        pm2 status / pm2 logs pedefacil"
echo "   Evolution:  cd ${DIR_APP}/vps && docker logs evolution-api -f"
echo ""
echo "Próximo passo: siga vps/INSTALACAO.md a partir do passo 4 (criar instância e"
echo "escanear o QR Code do WhatsApp)."
