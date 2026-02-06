# Paleta de Cores ARIA

![Preview da interface](docs/preview.png)

## Visão geral do frontend
O **Paleta de Cores ARIA** é um laboratório frontend para criação e validação de paletas de cor com foco em:
- design system e tokens visuais;
- acessibilidade (WCAG) aplicada desde a prototipação;
- exportação rápida para implementação em produto.

### Público-alvo
- designers e desenvolvedores frontend;
- times de produto que precisam padronizar linguagem visual;
- estudantes e profissionais que praticam acessibilidade e UI moderna.

### Fluxos principais
1. Escolher um preset ou editar tokens manualmente.
2. Validar contraste no checker WCAG.
3. Testar a paleta em componentes de preview.
4. Exportar tokens (`CSS`/`JSON`) ou compartilhar por URL.
5. Importar JSON para continuar trabalho existente.

## Análise técnica do frontend

### Arquitetura e organização
Projeto estático, sem framework, organizado por responsabilidades:
- `index.html`: estrutura semântica e SEO;
- `assets/css/styles.css`: design system visual, layout e responsividade;
- `assets/js/app.js`: estado, regras de negócio e interações.

Essa divisão evita acoplamento e facilita evolução incremental.

### Padrões e escalabilidade
- estado centralizado em objeto único (`palette`, `theme`, `contrast`, `history`);
- tokens declarativos (`TOKEN_META`) para reduzir duplicação;
- funções utilitárias puras para cor/contraste (reuso e previsibilidade);
- ações de UI desacopladas de renderização.

### Performance e renderização
- `script` principal com `defer`;
- atualização incremental de DOM;
- sem dependências pesadas de runtime para manter carregamento rápido;
- persistência local com fallback seguro para ambientes restritos.

### Acessibilidade, SEO e responsividade
- landmarks semânticos, `aria-live`, skip-link, foco visível;
- checker de contraste com feedback AA/AAA;
- suporte a `prefers-reduced-motion`;
- navegação mobile acessível com menu colapsável;
- metadados sociais (Open Graph/Twitter), canonical e JSON-LD.

## Stack e tecnologias
- HTML5
- CSS3 (Custom Properties / tokens)
- JavaScript ES2020+
- Playwright (captura de screenshot em workflow)
- GitHub Actions + GitHub Pages

## Funcionalidades implementadas
- Editor de paleta com 8 tokens (`primary`, `secondary`, `accent`, `background`, `surface`, `text`, `muted`, `border`)
- Presets prontos (Base ARIA, Oceano, Pôr do sol, Floresta)
- Geração automática de harmonia por cor primária
- Checker de contraste WCAG (AA/AAA, texto normal/grande)
- Preview de componentes com tokens aplicados
- Copiar token individual, copiar `:root` CSS e copiar JSON
- Download de JSON de tokens
- **Importação de tokens via arquivo JSON**
- **Histórico de edição com desfazer/refazer + atalhos**
- **Navegação mobile acessível**
- Persistência de tema e paleta no `localStorage`
- Link compartilhável com estado serializado

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
├─ index.html
├─ package.json
└─ README.md
```

## Setup e execução
1. Clone o repositório:
   ```bash
   git clone https://github.com/matheussiqueira-dev/paleta_de_cores_aria.git
   cd paleta_de_cores_aria
   ```
2. Instale dependências:
   ```bash
   npm install
   ```
3. Rode localmente:
   ```bash
   npm run preview
   ```
4. Abra `http://localhost:4173`.

Também é possível abrir `index.html` diretamente no navegador.

## Scripts
- `npm test`: valida sintaxe do JavaScript (`node --check assets/js/app.js`)
- `npm run preview`: servidor estático local (`http-server`)

## Boas práticas adotadas
- separação clara entre estrutura, estilo e comportamento;
- tokens de design centralizados e reutilizáveis;
- componentes com estados visuais consistentes;
- acessibilidade tratada como requisito funcional;
- fallback seguro para APIs do navegador;
- documentação de uso orientada a produto.

## Melhorias futuras
- exportação no formato W3C Design Tokens;
- geração automática de escalas tonais (50-900);
- suíte de testes E2E para fluxos críticos;
- modo de colaboração com múltiplas paletas salvas;
- pipeline com auditoria de acessibilidade automatizada.

---

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
