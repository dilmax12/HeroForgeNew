# Redesign da página HeroForm (Minimalista)

## Objetivos
- Remover elementos visuais desnecessários
- Focar em informações essenciais para novos jogadores
- Manter consistência com o design system atual

## Mudanças principais
- Remoção do botão "Aplicar atributos base da classe" por duplicação com "Aplicar preset de classe"
- Ações primárias consolidadas: "Aplicar preset de classe" e "Aplicar recomendações" em destaque
- Opções menos utilizadas movidas para seção "Opções avançadas" expansível
- Transições suaves adicionadas a botões e containers
- Melhorias de acessibilidade: foco visível, `aria-live` para avisos, `aria-expanded` no toggle

## Impacto funcional
- Todas funcionalidades críticas preservadas
- Melhor fluxo para iniciantes com recomendações aplicáveis em um clique

## Performance
- DOM inicial reduzido; opções avançadas renderizadas sob demanda
- Meta de carregamento: ≤ 2s em dispositivos médios (rede normal)

## Acessibilidade
- Diretrizes WCAG AA seguidas
- Contraste adequado, estados de foco, navegação por teclado

## Artefatos
- Mockup: `docs/mockups/hero-form-minimal.html`
- Protótipo: página `HeroForm` atualizada
- Guia de estilo: `docs/style-guide-update.md`