# Paleta de Cores ARIA

![Preview da interface](docs/preview.png)

## Visão geral do backend
Este projeto agora inclui um **backend completo e versionado** para o domínio de paletas de cores, com foco em:
- autenticação segura;
- gestão de paletas por usuário;
- compartilhamento público controlado;
- qualidade operacional (logging, validação, tratamento de erro e testes).

O backend atende ao cenário de produto digital onde usuários criam, editam e compartilham tokens de cor de forma confiável e escalável.

## Domínio e regras principais
- Cada usuário autenticado gerencia suas próprias paletas.
- Uma paleta contém metadados (`name`, `description`, `tags`) e 8 tokens obrigatórios de cor.
- Paletas podem ser publicadas via `shareId` para consumo público.
- Tokens seguem validação estrita de cor hexadecimal.
- Sessões usam JWT com **access token + refresh token** e rotação de refresh.

## Arquitetura adotada
Backend organizado em arquitetura modular inspirada em Clean Architecture:

- `domain`: constantes e erros de domínio.
- `application`: casos de uso/regras de negócio (`AuthService`, `PaletteService`).
- `infrastructure`: persistência, repositórios e segurança (hash/JWT).
- `interfaces/http`: controllers, schemas, middlewares e rotas.
- `docs`: contrato OpenAPI.

Essa separação reduz acoplamento, facilita testes e melhora evolução incremental.

## Stack e tecnologias
- Node.js 20+
- Express 4
- Zod (validação de entrada)
- JWT (`jsonwebtoken`)
- Bcrypt (`bcryptjs`)
- Pino (logging estruturado)
- Helmet, CORS, HPP, Rate Limiter
- Supertest + Node Test Runner (`node:test`)
- Persistência em arquivo JSON com escrita serializada

## Estrutura do projeto
```text
.
├─ assets/                         # frontend
├─ docs/                           # screenshot da interface
├─ backend/
│  ├─ data/
│  │  └─ database.json
│  ├─ docs/
│  │  └─ openapi.json
│  ├─ src/
│  │  ├─ app.js
│  │  ├─ server.js
│  │  ├─ config/
│  │  ├─ domain/
│  │  ├─ application/
│  │  ├─ infrastructure/
│  │  ├─ interfaces/http/
│  │  └─ utils/
│  ├─ tests/
│  ├─ .env.example
│  └─ package.json
├─ index.html
├─ package.json
└─ README.md
```

## Endpoints da API
Base URL local: `http://localhost:3333`

Versionamento: `\`/api/v1\``

### Health
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- `GET /api/v1/health/info`
- `GET /api/v1/health/metrics` (admin)
- `GET /api/v1/docs/openapi.json`

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/me`

### Palettes
- `GET /api/v1/palettes/public/:shareId` (público)
- `GET /api/v1/palettes`
- `GET /api/v1/palettes/:paletteId`
- `POST /api/v1/palettes`
- `POST /api/v1/palettes/import`
- `PATCH /api/v1/palettes/:paletteId`
- `DELETE /api/v1/palettes/:paletteId`
- `POST /api/v1/palettes/:paletteId/share`
- `POST /api/v1/palettes/:paletteId/unshare`
- `GET /api/v1/palettes/analytics/summary`

## Setup e execução
### 1) Frontend
```bash
npm install
npm run preview
```

### 2) Backend
```bash
npm --prefix backend install
npm --prefix backend run dev
```

Servidor backend padrão: `http://localhost:3333`

### Variáveis de ambiente
Copie `backend/.env.example` e ajuste os valores sensíveis:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `DATA_FILE`
- `ADMIN_BOOTSTRAP_EMAIL` (opcional para bootstrap de usuário admin)

## Segurança e confiabilidade implementadas
- Senhas com hash `bcrypt`.
- Access/refresh JWT com rotação e revogação de refresh token.
- Autorização por usuário dono do recurso + suporte a role (`admin`).
- Validação de payload, params e query com Zod.
- Sanitização defensiva de texto e arrays.
- Helmet, CORS configurável, HPP e rate limit.
- Tratamento global de exceções com resposta padronizada e `requestId`.
- Logging estruturado por request com latência e status.

## Performance e escalabilidade
- Escrita serializada em persistência para evitar corrida em I/O local.
- Paginação e busca no endpoint de listagem de paletas.
- Limites de payload e limitação de taxa para reduzir abuso.
- Arquitetura preparada para troca futura de persistência (DB relacional/NoSQL) sem romper camada HTTP.

## Testes e qualidade
Scripts:
- `npm test` (frontend + backend)
- `npm run backend:test`
- `npm --prefix backend run test`

Cobertura atual:
- fluxo de autenticação (registro, login, refresh, logout-all);
- fluxo de paletas (CRUD, share e endpoint público).

## Boas práticas e padrões aplicados
- separação de responsabilidades por camada;
- princípios DRY e baixo acoplamento entre serviços e transporte HTTP;
- contratos de API versionados;
- respostas consistentes (`success`, `data` ou `error`);
- documentação de contrato OpenAPI disponível no próprio backend.

## Melhorias futuras
- migração para banco relacional com índices e auditoria;
- observabilidade avançada (tracing, métricas Prometheus e dashboards);
- fila assíncrona para tarefas de processamento de paletas;
- testes de carga e chaos engineering;
- CI com lint, segurança SAST e cobertura mínima obrigatória.

---

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
