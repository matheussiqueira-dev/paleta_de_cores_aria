# Paleta de Cores ARIA

![Preview da página](docs/preview.png)

## Visão geral
O **Paleta de Cores ARIA** evoluiu de um exemplo estático para um **laboratório de design tokens** focado em:
- construção de paletas consistentes;
- validação de contraste com critérios WCAG;
- exportação de tokens para uso em projetos reais;
- preview visual de componentes para decisão rápida de UI.

É um projeto front-end leve (sem framework), ideal para prototipação, estudos de acessibilidade e base inicial de design system.

## Tecnologias utilizadas
- HTML5 semântico
- CSS3 com Custom Properties (Design Tokens)
- JavaScript (ES2020+)
- Playwright (workflow de screenshot no GitHub Actions)
- GitHub Pages (deploy estático)

## Funcionalidades principais
- Editor de paleta em tempo real com 8 tokens:
  - `primary`, `secondary`, `accent`, `background`, `surface`, `text`, `muted`, `border`
- Presets prontos (`Base ARIA`, `Oceano`, `Pôr do sol`, `Floresta`)
- Geração automática de harmonia a partir da cor primária
- Verificador de contraste WCAG com status para:
  - AA/AAA texto normal
  - AA/AAA texto grande
- Preview de componentes com aplicação direta dos tokens
- Exportação de tokens em:
  - bloco CSS (`:root`)
  - JSON
- Cópia rápida para área de transferência (token individual, CSS e JSON)
- Persistência local (tema e paleta em `localStorage`)
- Link compartilhável com estado da paleta serializado na URL
- Tema claro/escuro/sistema com atualização de favicon e `theme-color`

## Estrutura do projeto
```text
paleta_de_cores_aria-main/
├─ .github/
│  └─ workflows/
│     ├─ pages.yml
│     └─ screenshot.yml
├─ assets/
│  ├─ css/
│  │  └─ styles.css
│  └─ js/
│     └─ app.js
├─ docs/
│  └─ preview.png
├─ favicon-dark.svg
├─ favicon-light.svg
├─ index.html
├─ package.json
└─ README.md
```

## Instalação e uso
1. Clone o repositório:
   ```bash
   git clone https://github.com/matheussiqueira-dev/paleta_de_cores_aria.git
   cd paleta_de_cores_aria
   ```
2. Abra `index.html` diretamente no navegador  
ou rode um servidor local:
   ```bash
   npm install
   npm run preview
   ```
3. Acesse:
   - `http://localhost:4173` (quando usando `preview`)

## Scripts disponíveis
- `npm test`  
  Valida sintaxe do JavaScript (`node --check assets/js/app.js`).
- `npm run preview`  
  Sobe servidor HTTP local estático na porta `4173`.

## Boas práticas adotadas
- Separação de responsabilidades:
  - marcação em `index.html`
  - estilos em `assets/css/styles.css`
  - lógica em `assets/js/app.js`
- Uso de tokens de cor com custom properties para escalabilidade
- Semântica HTML e landmarks acessíveis
- Elementos interativos com foco visível e suporte a teclado
- Feedback não intrusivo com `aria-live` (`toast`)
- Persistência resiliente com fallback para falhas de `localStorage`
- Código JavaScript modular por função (fácil manutenção e extensão)

## Qualidade técnica (resumo do refactor)
- **Arquitetura**: removido CSS/JS inline e criado layout organizado por camadas.
- **Performance**: script com `defer`, renderização direta de tokens, baixo custo de execução.
- **Manutenibilidade**: centralização de metadados de tokens/presets e utilitários reutilizáveis.
- **Acessibilidade**:
  - skip link
  - checker WCAG em tempo real
  - estados e feedback com ARIA
  - respeito a `prefers-reduced-motion`
- **Consistência visual**: nova hierarquia, tipografia dedicada e componentes responsivos.

## Possíveis melhorias futuras
- Importação/exportação de tokens em formato W3C Design Tokens
- Suporte a múltiplos namespaces de tema (por produto/marca)
- Geração automática de escala tonal (50-900) por token
- Testes E2E com Playwright para fluxos de edição/exportação
- Pipeline de lint/format e validação de acessibilidade automatizada em CI

---

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
