# Relatório de Otimização (Mobile)

## Resumo
- Foco: Responsividade 320–768px, lazy loading de componentes não essenciais e economia de recursos em dispositivos móveis.
- Resultado: Bundle principal reduzido e criação de chunks separados; imagens otimizadas com `srcset`; animações condicionais por rede/usuário.

## Mudanças Implementadas
- Breakpoint `xs (320px)` adicionado ao Tailwind (`tailwind.config.js`).
- Layout com menu rolável em telas pequenas (`src/components/Layout.tsx`).
- `HeroGallery` ajustada: grid com `gap-4` em mobile e correção de referência do container (`listContainerRef`).
- Imagens dos heróis com `loading="lazy"`, `decoding="async"`, `sizes` e `srcSet` dinâmico para AI (`HeroGalleryCard.tsx`).
- Lazy loading via `React.lazy/Suspense` em componentes não essenciais: `SeasonalDecor`, `AdBanner`, `InterstitialAd`, `EnhancedHUD`, `GalleryLightbox`, `QuickNavigation`.
- Flags globais de desempenho: `prefers-reduced-motion`, `save-data` e `effectiveType` aplicadas nas animações do card.
- Ajustes de `manualChunks` no Vite para separar libs pesadas (icons/stripe/ai).

## Medições (Build de Produção)
- Antes: `index-5a7d871a.js` ≈ 1,047.20 kB (gzip ≈ 275.49 kB).
- Depois: `index-cbfeaa50.js` ≈ 1,034.28 kB (gzip ≈ 271.88 kB).
- Novos chunks:
  - `SeasonalDecor-*` ≈ 1.19 kB (gzip ≈ 0.69 kB)
  - `AdBanner-*` ≈ 1.15 kB (gzip ≈ 0.72 kB)
  - `ai-*` e `stripe-*` (vazios ou mínimos, preparados para futura divisão real)

Observação: a divisão adicional reduz o custo do carregamento inicial quando esses componentes não são necessários no primeiro paint.

## Impacto em Recursos
- CPU/Memória: Menos trabalho inicial por lazy loading e menor re-render em mobile.
- Bateria: Animações e efeitos visuais desativados automaticamente em redes lentas e dispositivos com economia de dados.
- Rede: `srcset/sizes` envia imagens menores em telas pequenas; divisão de código evita baixar partes não essenciais.

## Próximos Passos (opcional)
- Dividir `framer-motion` por uso específico e avaliar remoção de efeitos em telas `xs`.
- Adicionar compressão de imagens estáticas (build pipeline) e `responsive images` para recursos fora da AI.