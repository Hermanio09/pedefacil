# Instalação — VPS Hostinger (aplicação + Postgres + Evolution API)

> Atualizado: agora tudo roda numa VPS só (app Next.js, Postgres e Evolution API/WhatsApp).
> O plano recomendado subiu de KVM 1 para **KVM 2** porque os três serviços rodando juntos
> precisam de mais RAM do que só a Evolution API sozinha.

## 1. Contratar o VPS

- Acesse hostinger.com.br → VPS → plano **KVM 2** (2 vCPU / 8GB RAM / 100GB NVMe)
- Sistema operacional: **Ubuntu 22.04** (ou o template com Node.js/Docker pré-instalado, se
  disponível — economiza os passos 3 e 4 do script de provisionamento)
- Na criação, cole a chave pública SSH gerada (`~/.ssh/pedefacil_hostinger.pub`) no campo
  "SSH Key" — evita ter que usar senha de root
- Anote o **IP do servidor** que aparece no painel

---

## 2. Acessar o servidor

```bash
ssh -i ~/.ssh/pedefacil_hostinger root@SEU_IP_VPS
```

---

## 3. Rodar o script de provisionamento

Este repositório tem um script (`vps/provisionar.sh`) que instala e configura tudo de uma vez:
Node.js, PM2, Nginx, Certbot, Postgres, Docker, clona o projeto e sobe a Evolution API.

Veja `vps/provisionar.sh` para o passo a passo comentado — ele é feito para ser lido e
ajustado antes de rodar (tem placeholders para o domínio real, por exemplo).

---

## 4. Criar a instância da Evolution API e conectar o WhatsApp

A API key não é mais fixa no arquivo — vem do `vps/.env` (fora do Git). Depois que o
`docker compose up -d` estiver rodando (feito pelo script de provisionamento):

```bash
cd /opt/pedefacil/vps
source .env   # carrega EVOLUTION_API_KEY na sessão do terminal

curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d '{"instanceName":"pedefacil","qrcode":true}'
```

## 5. Escanear o QR Code

```bash
curl http://localhost:8080/instance/connect/pedefacil \
  -H "apikey: $EVOLUTION_API_KEY"
```

A resposta traz um QR Code em base64. Duas formas de ver:
- Cole o valor em https://base64.guru/converter/decode/image (mais simples)
- Ou baixe a imagem pro seu computador via `scp` e abra localmente

Escaneie com o WhatsApp do número que vai representar o restaurante/empresa.

---

## 6. Testar o envio

```bash
curl -X POST http://localhost:8080/message/sendText/pedefacil \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d '{"number":"5511999999999","text":"Teste PedeFacil ✅"}'
```

Se o WhatsApp receber a mensagem, está tudo funcionando — e como a aplicação Next.js roda na
mesma VPS, o `.env.production.local` dela já aponta `EVOLUTION_API_URL=http://localhost:8080`
(feito automaticamente pelo script de provisionamento).

---

## Por que a porta 8080 não fica exposta à internet

O `docker-compose.yml` publica a Evolution API só em `127.0.0.1:8080` (não em `0.0.0.0`).
Isso significa que só processos dentro da própria VPS conseguem chamá-la — inclusive a
aplicação Next.js, já que ela roda no mesmo servidor. Quem tiver a API key e conseguisse
acessar essa porta de fora poderia mandar mensagem por qualquer número conectado; manter
fechado evita esse risco sem precisar de nenhuma configuração extra de firewall.

---

## Manutenção

```bash
cd /opt/pedefacil/vps

# Ver logs
docker logs evolution-api -f

# Reiniciar
docker restart evolution-api

# Atualizar para nova versão
docker compose pull && docker compose up -d
```
