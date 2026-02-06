# Paleta de Cores ARIA

![Preview da interface](docs/preview.png)

## Visão geral
O **Paleta de Cores ARIA** é uma aplicação fullstack para criação, validação e gestão de paletas de cores com foco em:
- design system e tokens reutilizáveis;
- acessibilidade (WCAG) em tempo real;
- colaboração entre frontend e backend via API versionada.

O produto atende designers e desenvolvedores que precisam criar paletas consistentes, validar contraste e publicar versões em nuvem com segurança.

## Objetivos de negócio
- Reduzir retrabalho de design/frontend com tokens padronizados.
- Aumentar qualidade de acessibilidade desde a fase de definição visual.
- Permitir histórico local e sincronização com backend para continuidade entre sessões e ambientes.

## Arquitetura e decisões técnicas
### Frontend
- Aplicação web estática (HTML + CSS + JS) orientada a performance e baixo custo operacional.
- Estado centralizado no `assets/js/app.js` com persistência local e sincronização com API.
- UI modular por seções: laboratório, biblioteca local, nuvem/API, contraste, preview e exportação.

### Backend
- API REST versionada em `\`/api/v1\`` com arquitetura modular inspirada em Clean Architecture:
  - `domain`: regras e contratos centrais;
  - `application`: casos de uso e serviços de negócio;
  - `infrastructure`: persistência, criptografia e JWT;
  - `interfaces/http`: controllers, middlewares, rotas e validação.
- Persistência em arquivo JSON com escrita serializada (preparado para troca futura por banco relacional/NoSQL sem quebrar camada HTTP).

### Segurança e confiabilidade
- JWT access + refresh com rotação.
- Detecção de reuso de refresh token com revogação global de sessões.
- Alteração de senha com invalidação de sessões anteriores.
- Validação de entrada com Zod, sanitização, `helmet`, `hpp`, CORS configurável e rate limit global.
- Rate limit específico para `login`.
- Observabilidade básica com `requestId`, logs estruturados e métricas.

## Stack e tecnologias
- **Frontend:** HTML5, CSS3, JavaScript (ES2020+)
- **Backend:** Node.js 20+, Express 4
- **Segurança:** `bcryptjs`, `jsonwebtoken`, `helmet`, `hpp`, `cors`, `express-rate-limit`
- **Validação e utilitários:** `zod`
- **Logging:** `pino`
- **Testes:** `node:test`, `supertest`
- **CI:** GitHub Actions (`.github/workflows/ci.yml`)

## Funcionalidades principais
### Frontend
- Editor de 8 tokens de cor com presets e geração de harmonia.
- Undo/redo e biblioteca local de paletas.
- Importação/exportação JSON e cópia de tokens CSS/JSON.
- Checker de contraste WCAG AA/AAA em tempo real.
- Tema claro/escuro/sistema.
- Nova seção de sincronização com API:
  - login/cadastro/logout;
  - publicação de paleta atual na nuvem;
  - sincronização e aplicação de paletas remotas;
  - cópia de link público para paletas compartilhadas.

### Backend
- Autenticação completa:
  - `register`, `login`, `refresh`, `logout`, `logout-all`, `me`, `change-password`.
- Gestão de paletas por usuário:
  - CRUD, importação, analytics, share/unshare.
- Endpoint público de paleta por `shareId` com cache (`ETag` + `304`).
- Health/readiness/info e métricas protegidas por role `admin`.
- Contrato OpenAPI atualizado em `backend/docs/openapi.json`.

## Endpoints (resumo)
Base local: `http://localhost:3333`

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- `GET /api/v1/health/info`
- `GET /api/v1/health/metrics` (admin)
- `GET /api/v1/docs/openapi.json`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`
- `GET /api/v1/palettes/public/:shareId`
- `GET /api/v1/palettes`
- `POST /api/v1/palettes`
- `POST /api/v1/palettes/import`
- `GET /api/v1/palettes/:paletteId`
- `PATCH /api/v1/palettes/:paletteId`
- `DELETE /api/v1/palettes/:paletteId`
- `POST /api/v1/palettes/:paletteId/share`
- `POST /api/v1/palettes/:paletteId/unshare`
- `GET /api/v1/palettes/analytics/summary`

## Estrutura do projeto
```text
.
├─ .github/workflows/ci.yml
├─ assets/
│  ├─ css/styles.css
│  └─ js/app.js
├─ backend/
│  ├─ data/database.json
│  ├─ docs/openapi.json
│  ├─ src/
│  │  ├─ application/
│  │  ├─ config/
│  │  ├─ domain/
│  │  ├─ infrastructure/
│  │  ├─ interfaces/http/
│  │  ├─ utils/
│  │  ├─ app.js
│  │  └─ server.js
│  ├─ tests/
│  ├─ .env.example
│  └─ package.json
├─ docs/preview.png
├─ index.html
├─ package.json
└─ README.md
```

## Setup e execução
### Pré-requisitos
- Node.js 20+
- npm 10+

### Instalação
```bash
npm install
npm --prefix backend install
```

### Rodar frontend (preview estático)
```bash
npm run preview
```
Frontend local: `http://localhost:4173`

### Rodar backend
```bash
npm --prefix backend run dev
```
Backend local: `http://localhost:3333`

### Variáveis de ambiente
Use `backend/.env.example` como base.
Campos importantes:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `DATA_FILE`
- `ADMIN_BOOTSTRAP_EMAIL`
- `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS`
- `AUTH_LOGIN_RATE_LIMIT_MAX`

## Testes e qualidade
```bash
npm test
```
Cobertura atual inclui:
- autenticação (registro, login, refresh, logout-all);
- segurança de sessão (reuso de refresh token);
- troca de senha;
- rate limit de login;
- métricas com autorização por role;
- fluxo de paletas (CRUD, share, endpoint público e cache condicional).

## Boas práticas adotadas
- separação clara de responsabilidades por camada;
- contratos HTTP versionados;
- validação defensiva e respostas padronizadas;
- acessibilidade e responsividade como requisitos de interface;
- CI automatizada para regressão rápida.

## Deploy
### Frontend
- pode ser hospedado em GitHub Pages, Vercel ou Netlify.

### Backend
- pode ser executado em VPS/container com Node.js.
- recomendado colocar reverse proxy (Nginx/Caddy), TLS e armazenamento persistente.

## Melhorias futuras
- migração da persistência para PostgreSQL com índices e auditoria.
- observabilidade avançada (métricas Prometheus + tracing).
- suporte a times/organizações e colaboração multiusuário.
- política de RBAC mais granular.
- testes e2e de interface em pipeline CI.

---

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
