# Paleta de Cores ARIA - Frontend

![Preview da interface](docs/preview.png)

## Visao geral do frontend
O frontend do **Paleta de Cores ARIA** e uma aplicacao web focada em criacao, validacao e distribuicao de paletas com usabilidade profissional.

Objetivo principal:
- Permitir que designers e devs tomem decisoes de cor com base em contraste real, consistencia visual e handoff tecnico.

Publico-alvo:
- Designers de produto e UI.
- Desenvolvedores frontend que trabalham com design tokens.
- Times de produto que precisam reduzir retrabalho de interface.

## Fluxos principais
1. Montar ou gerar paleta no laboratorio.
2. Validar contraste no checker WCAG e na auditoria inteligente.
3. Salvar variacoes na biblioteca local (incluindo favoritos).
4. Exportar tokens ou sincronizar com API backend.

## Analise tecnica do frontend
### Arquitetura atual
- Frontend estatico em `index.html + assets/css/styles.css + assets/js/app.js`.
- Estado centralizado no `app.js` com persistencia em `localStorage`.
- UI organizada por secoes funcionais (laboratorio, biblioteca, nuvem, acessibilidade, componentes, tokens).

### Pontos criticos tratados
- Reducao de custo de atualizacao de UI durante edicao de paleta.
- Persistencia otimizada de estado para evitar excesso de escrita no `localStorage`.
- Evolucao da acessibilidade com labels, estados ARIA e suporte a teclado.
- Hierarquia visual revisada para priorizar leitura de fluxo e tomada de decisao.

## Otimizacoes e refactor aplicados
- Refactor de UI/UX completo com nova linguagem visual e melhor responsividade.
- Mapeamento de inputs de token cacheado para reduzir trabalho repetido em sincronizacao.
- Persistencia de paleta com debounce para minimizar operacoes intensivas durante drag em color inputs.
- SEO melhorado com metadados adicionais (`og:image:alt`, `twitter:image:alt`).

## Novas features implementadas
### 1. Auto correcao de contraste AA
- Acao: `Auto corrigir AA` no checker de contraste.
- Beneficio: ajusta automaticamente a cor de texto para atingir nivel AA quando possivel.
- Valor: acelera correcoes de acessibilidade sem tentativa manual iterativa.

### 2. Simulador de visao (acessibilidade avancada)
- Modos: padrao, protanopia, deuteranopia, tritanopia, acromatopsia.
- Aplicado em previews visuais para testar robustez da paleta em cenarios reais.
- Valor: melhora inclusao e qualidade de decisao para interfaces criticas.

### 3. Biblioteca local com favoritos (curadoria)
- Fluxo: marcar/desmarcar favoritas e filtrar `Todas`/`Favoritas`.
- Valor: melhora navegacao e produtividade em projetos com muitas variacoes.

### 4. Auditoria inteligente da paleta
- Score, grade e checks de contraste em tempo real.
- Exportacao de relatorio JSON para documentacao tecnica.
- Valor: padroniza criterio de qualidade para design system.

## Stack e tecnologias
- HTML5 sem framework
- CSS3 (tokens visuais, layout responsivo, motion control)
- JavaScript ES2020+ (estado, rendering e integracao)
- API integration via `fetch`
- Teste de sintaxe frontend via `node --check`

## Estrutura do frontend
```text
.
├─ index.html
├─ assets/
│  ├─ css/
│  │  └─ styles.css
│  └─ js/
│     └─ app.js
├─ docs/
│  └─ preview.png
└─ package.json
```

## Setup e execucao
### Pre-requisitos
- Node.js 20+
- npm 10+

### Instalar dependencias
```bash
npm install
```

### Rodar frontend local
```bash
npm run preview
```
A aplicacao fica disponivel em `http://localhost:4173`.

### Build
- O frontend e estatico e nao exige etapa de build obrigatoria.
- Deploy recomendado: GitHub Pages, Vercel ou Netlify.

### Validacao
```bash
npm run test:frontend
```

## Boas praticas adotadas
- Estado centralizado e previsivel.
- Tokens de design aplicados via CSS variables.
- Interface orientada a acessibilidade (ARIA, foco visivel, navegação por teclado).
- Responsividade mobile-first nas areas de maior interacao.
- Feedback instantaneo ao usuario (toast, score, status de auditoria).

## Melhorias futuras
- Quebrar `app.js` em modulos de dominio (`state`, `ui`, `a11y`, `api`).
- Testes e2e de fluxos criticos com Playwright.
- Suporte a importacao/exportacao para formatos de design token (Style Dictionary).
- Modo colaborativo com comparacao de versoes lado a lado.
- Internacionalizacao de interface (i18n).

---

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
