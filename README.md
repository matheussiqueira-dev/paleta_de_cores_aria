# Paleta de Cores ARIA

## Visão geral
**Paleta de Cores ARIA** é um studio fullstack para criação, validação e operação de paletas com foco em acessibilidade WCAG, handoff técnico e sincronização em nuvem.

Objetivos de negócio:
- Reduzir retrabalho entre design e desenvolvimento.
- Aumentar consistência visual com tokens versionáveis.
- Garantir contraste e qualidade de UI antes da publicação.

Público-alvo:
- Product Designers
- Frontend Engineers
- Times de Design System

## Arquitetura e decisões técnicas
Arquitetura geral:
- **Frontend**: SPA estática (HTML/CSS/JS vanilla) com design system local, simulação de visão, auditoria WCAG e integração com API.
- **Backend**: API REST versionada (`/api/v1`) em Node.js + Express, com camadas inspiradas em Clean Architecture.
- **Persistência**: banco em arquivo JSON com escrita atômica e repositórios.

Decisões principais:
- **Monolito modular** no backend para simplicidade operacional e evolução incremental.
- **Separação por camadas** (`domain`, `application`, `infrastructure`, `interfaces/http`) para manter responsabilidades claras.
- **Contratos validados com Zod** para reduzir risco de input inválido e facilitar manutenção.
- **Confiabilidade em produção** com idempotência, ETag/concorrência otimista, lockout de login e rate limit.

## Stack e tecnologias
Frontend:
- HTML5 semântico
- CSS moderno com tokens visuais e componentes reutilizáveis
- JavaScript vanilla (estado local, auditoria, integração API)

Backend:
- Node.js 20+
- Express 4
- Zod
- JWT (`jsonwebtoken`)
- `bcryptjs`
- Segurança HTTP: `helmet`, `hpp`, `cors`, `express-rate-limit`
- Logging estruturado: `pino`
- Testes: `node:test` + `supertest`

## Funcionalidades principais
Laboratório de paletas:
- Edição de 8 tokens centrais (primary, secondary, accent, background, surface, text, muted, border)
- Presets e geração automática de harmonia
- Histórico com undo/redo

Acessibilidade e UX:
- Checker de contraste manual
- Auditoria automática da paleta com score/grade
- Auto correção de contraste para nível AA
- Simulação de deficiência de visão (protanopia, deuteranopia, tritanopia, acromatopsia)

Biblioteca local:
- Salvar, atualizar, favoritar e remover paletas localmente
- Filtro por favoritas

Nuvem (API):
- Cadastro/login/logout com sessão JWT e refresh token
- Publicação e sincronização de paletas
- Controle de visibilidade pública/privada
- Exclusão remota de paletas
- Filtros cloud por busca, visibilidade e ordenação
- Analytics cloud com score médio de auditoria, distribuição por grade e riscos recorrentes

Confiabilidade e segurança backend:
- Idempotency-Key para criação/importação
- ETag + If-None-Match em leituras
- If-Match para concorrência otimista em atualização/exclusão
- Lockout progressivo após falhas de login
- Rate limiting global e específico para autenticação

## Estrutura do projeto
```text
.
├─ assets/
│  ├─ css/
│  │  └─ styles.css
│  └─ js/
│     └─ app.js
├─ backend/
│  ├─ data/
│  ├─ docs/
│  │  └─ openapi.json
│  ├─ src/
│  │  ├─ application/
│  │  ├─ config/
│  │  ├─ domain/
│  │  ├─ infrastructure/
│  │  ├─ interfaces/http/
│  │  ├─ utils/
│  │  ├─ app.js
│  │  └─ server.js
│  └─ tests/
├─ docs/
├─ index.html
├─ package.json
└─ README.md
```

## Instalação e execução
Pré-requisitos:
- Node.js 20+
- npm 10+

Instalação de dependências:
```bash
npm install
npm --prefix backend install
```

Executar backend (desenvolvimento):
```bash
npm run backend:dev
```

Executar backend (produção local):
```bash
npm run backend:start
```

Executar frontend estático local:
```bash
npm run preview
```

## Testes e qualidade
Executar todos os testes do projeto:
```bash
npm test
```

Executar apenas backend:
```bash
npm run backend:test
```

Checagem de sintaxe frontend:
```bash
npm run test:frontend
```

## API e documentação
- Base local padrão: `http://localhost:3333`
- OpenAPI: `http://localhost:3333/api/v1/docs/openapi.json`
- Racional UX/UI: `docs/ux-ui-rationale.md`

Endpoints principais:
- Auth: `/api/v1/auth/*`
- Paletas: `/api/v1/palettes/*`
- Health: `/api/v1/health/*`

## Deploy
Frontend:
- Pode ser publicado em GitHub Pages/Vercel/Netlify como site estático.

Backend:
- Pode ser executado em VPS/container (Node.js) com variáveis de ambiente configuradas.
- Recomenda-se reverse proxy (Nginx/Caddy), TLS e monitoramento.

Checklist recomendado de produção:
- Definir segredos JWT fortes (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
- Restringir `CORS_ORIGIN`
- Ajustar limites/rate limit para o tráfego esperado
- Habilitar logs centralizados e alertas
- Planejar migração de persistência para banco relacional em escala

## Boas práticas adotadas
- Código orientado a responsabilidade única e baixo acoplamento
- Contratos de API com validação de entrada e erros padronizados
- Segurança defensiva por padrão (headers, rate limit, autenticação robusta)
- Experiência de usuário acessível e responsiva
- Evolução orientada por testes de integração

## Melhorias futuras
- Migração para PostgreSQL + migrations
- Paginação cursor-based para grandes volumes
- Feature flags para rollout gradual de funcionalidades
- Observabilidade avançada (tracing distribuído + dashboards)
- Pipeline CI/CD com gates de segurança e cobertura
- Testes E2E de interface com Playwright

---

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
