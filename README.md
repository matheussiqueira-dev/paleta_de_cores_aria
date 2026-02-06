# Paleta de Cores ARIA

![Preview da interface](docs/preview.png)

## Visão geral do frontend
O **Paleta de Cores ARIA** é um laboratório visual para criação, validação e gestão de paletas de cores com foco em:
- qualidade de interface (UI moderna e consistente);
- usabilidade real para fluxos de design;
- acessibilidade com critérios WCAG;
- exportação prática de tokens para implementação em produto.

### Propósito do produto
Reduzir fricção entre design e desenvolvimento, permitindo que equipes definam, testem e compartilhem paletas de forma rápida, com feedback técnico de contraste e preview de componentes.

### Público-alvo
- Designers de produto e UI;
- Desenvolvedores frontend;
- Times de produto e branding;
- Profissionais/estudantes em design systems.

## Análise técnica

### Arquitetura frontend
Projeto estático, sem framework, com responsabilidades bem separadas:
- `index.html`: semântica, estrutura, SEO e pontos de ancoragem da aplicação.
- `assets/css/styles.css`: design system visual, layout responsivo e estados.
- `assets/js/app.js`: estado, regras de negócio, eventos e renderização dinâmica.

### Estado e escalabilidade
- Estado único centralizado (`palette`, `contrast`, `themeMode`, `history`, `savedPalettes`).
- Metadados declarativos (`TOKEN_META`, `PRESETS`) para reduzir duplicação.
- Persistência em `localStorage` com fallback seguro.
- Camada de utilitários para cor/contraste e serialização de estado compartilhável.

### Performance
- Carregamento leve (HTML/CSS/JS puro, sem runtime pesado).
- Script principal com `defer`.
- Renderização incremental para grid de swatches e biblioteca local.
- Atualizações visuais via CSS custom properties (baixo custo de repaint).

### SEO
- `title`, `description`, `canonical`, Open Graph e Twitter Cards.
- JSON-LD (`WebApplication`) para metadados estruturados.

### Acessibilidade e usabilidade
- Skip link.
- Foco visível consistente.
- Feedback de status com `aria-live`.
- Checker WCAG AA/AAA em tempo real.
- Navegação mobile acessível (menu colapsável + fechamento por teclado/click externo).
- Respeito a `prefers-reduced-motion`.

## UI/UX e Design System

### Melhorias de UX implementadas
- Jornada principal simplificada: editar tokens → validar contraste → testar preview → salvar/exportar.
- Navegação contextual com destaque da seção ativa.
- Biblioteca local de paletas para comparação e iteração.
- Ações de produtividade:
  - desfazer/refazer (botões + atalhos);
  - importação de JSON;
  - cópia/download de tokens.

### Sistema visual
- Tokens de cor e tipografia definidos em CSS custom properties.
- Componentes reutilizáveis:
  - botões (`primary`, `secondary`, `ghost`);
  - chips/presets;
  - cards (swatches e biblioteca);
  - toast de feedback;
  - estados (hover, focus, disabled, active).

## Funcionalidades principais
- Editor de paleta com 8 tokens (`primary`, `secondary`, `accent`, `background`, `surface`, `text`, `muted`, `border`).
- Presets prontos para aceleração de fluxo.
- Geração automática de harmonia por cor primária.
- Verificação de contraste WCAG (AA/AAA para texto normal e grande).
- Preview de componentes com aplicação dos tokens.
- Exportação para CSS vars e JSON.
- Importação de JSON de tokens.
- Link compartilhável com estado serializado.
- Biblioteca local de paletas:
  - salvar;
  - aplicar;
  - atualizar;
  - excluir;
  - limpar biblioteca.

## Stack e tecnologias
- HTML5
- CSS3 (Custom Properties / Design Tokens)
- JavaScript ES2020+
- Playwright (workflow de screenshot / validação visual)
- GitHub Actions + GitHub Pages

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

## Instalação e execução
1. Clone o repositório:
   ```bash
   git clone https://github.com/matheussiqueira-dev/paleta_de_cores_aria.git
   cd paleta_de_cores_aria
   ```
2. Instale dependências:
   ```bash
   npm install
   ```
3. Execute localmente:
   ```bash
   npm run preview
   ```
4. Acesse:
   - `http://localhost:4173`

## Scripts disponíveis
- `npm test`: valida sintaxe do JavaScript (`node --check assets/js/app.js`).
- `npm run preview`: sobe servidor estático local para desenvolvimento rápido.

## Boas práticas adotadas
- Separação de responsabilidades entre marcação, estilo e lógica.
- Estrutura orientada a reuso com design tokens.
- Tratamento defensivo de `localStorage` e clipboard.
- Fluxos com feedback imediato e acessível.
- Componentes com estados explícitos para previsibilidade de UX.

## Melhorias futuras
- Exportação em padrão W3C Design Tokens.
- Importação de formatos de ferramentas de design (Figma Tokens, Style Dictionary).
- Testes E2E automatizados no CI para fluxos críticos (save/import/share).
- Modo colaboração com múltiplas coleções de paleta.
- Auditoria automatizada de acessibilidade em pipeline.

---

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
