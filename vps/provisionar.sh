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
# Idempotente: se rodar o script de novo (ex: depois de uma falha em etapa posterior), não
# tenta recriar usuário/banco que já existem.
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${POSTGRES_USER}'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};"
fi
# Banco separado pra Evolution API (versões recentes exigem banco configurado, não rodam
# mais sem persistência) — mesmo usuário, banco próprio.
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='evolution'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE DATABASE evolution OWNER ${POSTGRES_USER};"
fi

# A Evolution API roda em container Docker e precisa alcançar o Postgres do host via
# host.docker.internal — isso resolve pro gateway da rede padrão do Docker (172.17.0.1) e da
# rede própria do compose (172.18.0.1). Por padrão o Postgres só escuta em localhost.
PG_CONF="/etc/postgresql/18/main/postgresql.conf"
PG_HBA="/etc/postgresql/18/main/pg_hba.conf"
if [ -f "$PG_CONF" ] && ! grep -q "172.17.0.1" "$PG_CONF"; then
  sed -i "s/^#\?listen_addresses = .*/listen_addresses = 'localhost,172.17.0.1,172.18.0.1'\t\t# what IP address(es) to listen on;/" "$PG_CONF"
fi
if [ -f "$PG_HBA" ] && ! grep -q "172.17.0.0/16" "$PG_HBA"; then
  echo "host    all             all             172.17.0.0/16           scram-sha-256" >> "$PG_HBA"
  echo "host    all             all             172.18.0.0/16           scram-sha-256" >> "$PG_HBA"
fi
systemctl restart postgresql

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
# tenha sobrescrito ou não tivesse a pasta ainda) — nunca vem do próprio Git. Pula se já for
# o mesmo arquivo (ex: quando o script é rodado direto de dentro do repo já clonado).
if [ "$(readlink -f "$ARQUIVO_SEGREDOS")" != "$(readlink -f "${DIR_APP}/vps/segredos.env" 2>/dev/null || echo "")" ]; then
  cp "$ARQUIVO_SEGREDOS" "${DIR_APP}/vps/segredos.env"
fi

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

# .env do docker-compose da Evolution API — separado do .env.production.local porque o
# docker-compose só lê variáveis de um .env na mesma pasta que ele, não do api/. Este arquivo
# é lido pelo parser do docker-compose (não pelo bash), então os valores não precisam de aspas.
cat > "${DIR_APP}/vps/.env" <<EOF
EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
EOF
chmod 600 "${DIR_APP}/vps/.env"

echo "═══ 8/9 — Build da aplicação + migração do banco + Evolution API ═══"
cd "${DIR_APP}/api"
npm ci
# O Prisma CLI (diferente do Next.js) não lê .env.production.local automaticamente — só
# .env simples ou variável de ambiente já exportada. Exporta aqui só pra este comando.
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD_URL}@localhost:5432/${POSTGRES_DB}" npx prisma migrate deploy
npm run build

cd "${DIR_APP}/vps"
docker compose up -d

cd "${DIR_APP}/api"
if pm2 describe pedefacil > /dev/null 2>&1; then
  pm2 restart pedefacil
else
  pm2 start npm --name pedefacil -- start -- -p "${PORTA_APP}"
fi
pm2 save
# Versões recentes do PM2 já configuram o systemd sozinhas (o log mostra o symlink sendo
# criado); o "| tail -1 | bash" antigo às vezes captura uma linha vazia/formatada e quebra —
# não é crítico (o processo já está rodando), então não deixa isso derrubar o script inteiro.
pm2 startup systemd -u root --hp /root || true

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
# Postgres só liberado pra rede interna do Docker (onde a Evolution API roda) — nunca pra
# internet.
ufw allow from 172.17.0.0/16 to any port 5432 proto tcp
ufw allow from 172.18.0.0/16 to any port 5432 proto tcp
ufw --force enable

# A Evolution API sobe por último, depois do Postgres já aceitar conexão da rede do Docker e
# do firewall já estar configurado — senão ela erra a primeira tentativa de migração.
cd "${DIR_APP}/vps"
docker compose restart

echo ""
echo "✅ Provisionamento concluído."
echo "   App:        https://${DOMINIO}"
echo "   PM2:        pm2 status / pm2 logs pedefacil"
echo "   Evolution:  cd ${DIR_APP}/vps && docker logs evolution-api -f"
echo ""
echo "Próximo passo: siga vps/INSTALACAO.md a partir do passo 4 (criar instância e"
echo "escanear o QR Code do WhatsApp)."
