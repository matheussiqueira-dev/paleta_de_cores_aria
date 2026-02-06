# Paleta de Cores ARIA - Backend

## Visao geral do backend
O backend do **Paleta de Cores ARIA** fornece uma API REST versionada para autenticacao, gestao de paletas, compartilhamento publico e auditoria de acessibilidade.

Objetivos de negocio:
- Permitir operacao segura de paletas por usuario.
- Garantir consistencia de dados entre sessao local e nuvem.
- Oferecer contrato estavel para integracao com frontend e automacoes.

Principais capacidades:
- Autenticacao JWT (access + refresh) com rotacao.
- CRUD de paletas com filtros, ordenacao e analytics.
- Compartilhamento publico por `shareId` com cache condicional.
- Auditoria de contraste da paleta (privada e publica).
- Controles de confiabilidade para retries e concorrencia otimista.

## Arquitetura adotada
Arquitetura modular em camadas, inspirada em Clean Architecture:

- `domain`: constantes e erros de dominio.
- `application`: servicos de negocio (`AuthService`, `PaletteService`, `MetricsService`).
- `infrastructure`: persistencia, repositorios e seguranca (hash/JWT).
- `interfaces/http`: controllers, middlewares, schemas e rotas.

Tipo de sistema:
- Monolito modular (Node.js + Express), preparado para evolucao por fronteiras de contexto.

## Tecnologias utilizadas
- Node.js 20+
- Express 4
- Zod (validacao)
- JWT (`jsonwebtoken`)
- Hash de senha (`bcryptjs`)
- Seguranca HTTP: `helmet`, `hpp`, `cors`, `express-rate-limit`
- Logs estruturados: `pino`
- Testes: `node:test` + `supertest`

## Recursos de seguranca e confiabilidade
### Autenticacao e autorizacao
- Access token curto + refresh token com rotacao.
- Deteccao de reuse de refresh token com revogacao de sessoes.
- Controle de role (`user`/`admin`) para endpoints sensiveis.

### Protecoes de API
- Validacao de payload e query com Zod.
- Rate limit global e rate limit especifico para login.
- Lockout progressivo para tentativas invalidas de login.
- Sanitizacao basica de entradas textuais.

### Confiabilidade operacional
- Escrita atomica do arquivo de dados.
- Idempotencia por `Idempotency-Key` em create/import de paletas.
- Concorrencia otimista com `ETag` + `If-Match` em update/delete.
- Cache condicional com `If-None-Match` em endpoints de leitura.
- `requestId` por requisicao e respostas de erro padronizadas.

## Endpoints principais
Base local: `http://localhost:3333`

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
- `POST /api/v1/auth/change-password`

### Palettes
- `GET /api/v1/palettes`
- `POST /api/v1/palettes`
- `POST /api/v1/palettes/import`
- `GET /api/v1/palettes/:paletteId`
- `PATCH /api/v1/palettes/:paletteId`
- `DELETE /api/v1/palettes/:paletteId`
- `GET /api/v1/palettes/:paletteId/audit`
- `POST /api/v1/palettes/:paletteId/share`
- `POST /api/v1/palettes/:paletteId/unshare`
- `GET /api/v1/palettes/analytics/summary`
- `GET /api/v1/palettes/public/:shareId`
- `GET /api/v1/palettes/public/:shareId/audit`

## Setup e execucao
### Pre-requisitos
- Node.js 20+
- npm 10+

### Instalacao
```bash
npm --prefix backend install
```

### Desenvolvimento
```bash
npm --prefix backend run dev
```

### Execucao em modo start
```bash
npm --prefix backend run start
```

### Testes
```bash
npm --prefix backend run test
```

## Variaveis de ambiente relevantes
Use `backend/.env.example` como base.

- `PORT`
- `NODE_ENV`
- `LOG_LEVEL`
- `DATA_FILE`
- `CORS_ORIGIN`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS`
- `AUTH_LOGIN_RATE_LIMIT_MAX`
- `AUTH_MAX_FAILED_ATTEMPTS`
- `AUTH_LOCKOUT_WINDOW_MS`
- `IDEMPOTENCY_TTL_MS`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_TTL`
- `REFRESH_TOKEN_TTL`
- `BCRYPT_ROUNDS`
- `ADMIN_BOOTSTRAP_EMAIL`

## Estrutura do projeto
```text
backend/
├─ data/
│  └─ database.json
├─ docs/
│  └─ openapi.json
├─ src/
│  ├─ app.js
│  ├─ server.js
│  ├─ application/
│  │  └─ services/
│  ├─ config/
│  ├─ domain/
│  ├─ infrastructure/
│  │  ├─ persistence/
│  │  ├─ repositories/
│  │  └─ security/
│  ├─ interfaces/
│  │  └─ http/
│  │     ├─ controllers/
│  │     ├─ middlewares/
│  │     ├─ routes/
│  │     └─ schemas/
│  └─ utils/
└─ tests/
```

## Boas praticas e padroes aplicados
- Separacao clara de responsabilidade por camada.
- Erros de dominio com codigo padronizado e HTTP consistente.
- Contratos de entrada validados e saneados antes da regra de negocio.
- Logs estruturados com correlacao por `requestId`.
- Testes automatizados cobrindo auth, health, CRUD, idempotencia e concorrencia.
- API versionada (`/api/v1`) com contrato OpenAPI atualizado.

## Melhorias futuras
- Migracao para banco relacional (PostgreSQL) com indices e migracoes.
- Fila assincroma para tarefas pesadas de analise e integracoes.
- Telemetria com Prometheus + tracing distribuido.
- RBAC com permissoes granulares por recurso.
- Testes de carga automatizados em pipeline CI.

---

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
