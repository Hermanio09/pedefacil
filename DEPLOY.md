# Deploy — PedeFacil na Hostinger

## Onde cada credencial vive

| Credencial | Onde fica | Por quê |
|---|---|---|
| `JWT_SECRET`, `DATABASE_URL`, `EVOLUTION_API_KEY`, chaves VAPID, `GOOGLE_AI_KEY`, SMTP | **Só no servidor** (`api/.env.production.local`) | A aplicação lê direto do disco do servidor. Nunca precisa sair de lá. |
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | **GitHub Actions Secrets** | É só o necessário pra pipeline conseguir entrar no servidor via SSH e mandar atualizar/reiniciar. Não são senhas de banco nem nada da aplicação. |
| Chave de deploy (`pedefacil_deploy_key`) | **GitHub → Deploy Keys do repositório** (só leitura) | Permite o servidor rodar `git pull` sem precisar da sua conta pessoal do GitHub. |

Isso significa: se alguém comprometer o GitHub Actions, não consegue ver a senha do banco.
Se alguém comprometer o servidor, o GitHub continua seguro (a chave de deploy só lê o
repositório, não escreve).

---

## Passo a passo — primeira vez

### 1. Repositório no GitHub
```bash
cd "/mnt/c/Users/Hermanio Santana/Documents/pedi-facil"
git init
git add .
git commit -m "Setup inicial"
git remote add origin git@github.com:SEU_USUARIO/SEU_REPO.git
git push -u origin main
```
(confirma comigo o nome do repositório antes de rodar isso — se ele já existir, ajusto o
comando)

### 2. Adicionar a chave de deploy no GitHub
No repositório → **Settings → Deploy keys → Add deploy key** → cole o conteúdo de
`~/.ssh/pedefacil_deploy_key.pub` → **NÃO marque** "Allow write access" (só leitura).

### 3. Criar a VPS na Hostinger
- Plano **KVM 2**, Ubuntu 22.04
- Cole `~/.ssh/pedefacil_hostinger.pub` no campo de chave SSH na criação
- Anote o IP

### 4. Configurar os 3 secrets do GitHub Actions
No repositório → **Settings → Secrets and variables → Actions → New repository secret**:
- `VPS_HOST` → IP da VPS
- `VPS_USER` → `root` (ou o usuário que a Hostinger criar)
- `VPS_SSH_KEY` → conteúdo de `~/.ssh/pedefacil_hostinger` (a chave **privada**, sem o `.pub`)

### 5. Preencher os segredos e provisionar
```bash
cp vps/segredos.env.exemplo vps/segredos.env
# edita vps/segredos.env com os valores reais (ver credenciais-producao-NAO-COMMITAR.txt)
```
Copia a pasta `vps/` (já com `segredos.env` preenchido) pro servidor, ou copia só esse
arquivo depois do clone. Então, na VPS:
```bash
ssh -i ~/.ssh/pedefacil_hostinger root@SEU_IP
cd /opt/pedefacil/vps   # depois do git clone
bash provisionar.sh
```
Isso instala Node, Postgres, Nginx, Certbot, Docker, builda a aplicação, sobe a Evolution
API e configura HTTPS — tudo de uma vez (leva uns 10-15 minutos).

### 6. Conectar o WhatsApp
Siga `vps/INSTALACAO.md` a partir do passo 4 (criar instância, escanear QR Code).

### 7. Preencher o que falta
`GOOGLE_AI_KEY` e as credenciais de SMTP não são geradas automaticamente — edite
`/opt/pedefacil/api/.env.production.local` no servidor e rode `pm2 restart pedefacil`.

---

## Deploys seguintes

Depois desse setup inicial, é só:
```bash
git push origin main
```
O GitHub Actions builda, testa e manda o servidor atualizar sozinho.

---

## Checklist antes da demonstração de domingo

- [ ] VPS criada e provisionada
- [ ] Domínio apontando pro IP da VPS (registro DNS tipo A)
- [ ] HTTPS funcionando (`https://seudominio...`)
- [ ] `GOOGLE_AI_KEY` preenchida (nota fiscal não funciona sem isso)
- [ ] WhatsApp conectado na Evolution API (QR Code escaneado)
- [ ] Teste de envio de pedido de ponta a ponta (Pedidos → Enviar Todos)
- [ ] Conta de admin criada via `/setup`
