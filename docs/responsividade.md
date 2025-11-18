# Documentação de Responsividade

## Objetivo
Garantir funcionamento perfeito em dispositivos móveis, com layout consistente entre 320–768px e experiência fluida.

## Breakpoints
- `xs: 320px` (adicionado)
- `sm: 640px`
- `md: 768px`

## Ajustes Principais
- Layout: menu superior com `overflow-x-auto` e `flex-nowrap` em telas pequenas (`src/components/Layout.tsx`).
- Galeria: espaçamentos reduzidos (`gap-4`) em mobile e grid adaptativo; correção de referência de container (`src/components/HeroGallery.tsx`).
- Tabs: navegação horizontal com `overflow-x-auto` e `flex-nowrap` (`src/components/ui/Tabs.tsx`).
- Imagens: `loading="lazy"`, `decoding="async"`, `sizes` e `srcSet` para melhor adaptação de largura (`src/components/HeroGalleryCard.tsx`).

## Padrões
- Evitar quebra de linhas em controles navegáveis em telas pequenas.
- Usar `container mx-auto px-3` como base e ampliar espaçamentos em `md+`.
- Preferir `content-visibility: auto` para seções longas e listas.

## Testes
- Validação visual em `http://localhost:5173/` via emulação de dispositivos (DevTools) nas larguras 320, 360, 414, 768.
- Orientação retrato e paisagem verificadas em componentes de navegação e galeria.