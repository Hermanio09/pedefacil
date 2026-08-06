# Como rodar o Pedi Fácil

## Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn
- Expo Go instalado no celular (Play Store)

---

## 1. Configurar o banco de dados (Supabase)

1. Crie uma conta gratuita em https://supabase.com
2. Crie um novo projeto
3. Vá em: Settings > Database > Connection string > URI
4. Copie a connection string

---

## 2. Configurar a API

```bash
cd api
cp .env.example .env
# Cole a connection string do Supabase no arquivo .env

npm install
npm run db:push        # Cria as tabelas no banco
npm run dev            # Inicia a API na porta 3001
```

---

## 3. Rodar o app mobile

```bash
cd mobile
npm install
npm start              # Abre o QR code do Expo
```

Escaneie o QR code com o app Expo Go no celular.

**Atenção:** No arquivo `src/services/api.ts`, troque `localhost`
pelo IP da sua máquina na rede local (ex: `192.168.0.10`).

---

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/produtos | Lista todos os produtos |
| POST | /api/produtos | Cria novo produto |
| PUT | /api/produtos/:id | Atualiza produto |
| DELETE | /api/produtos/:id | Remove produto |
| POST | /api/movimentacoes | Registra entrada ou saída |
| GET | /api/movimentacoes | Histórico de movimentações |
| POST | /api/fechamento | Processa fechamento do dia |
| GET | /api/relatorio?de=&ate= | Relatório por período |
