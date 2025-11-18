# Guidelines de Contribuição (Guild Hub)

## Padrões de Código
- Seguir Tailwind utility-first, evitar estilos inline complexos
- Componentizar blocos reutilizáveis (cards, abas)
- Manter acessibilidade: foco visível, `aria-live`, `aria-label`

## Fluxo de Trabalho
- Abrir PR com descrição clara e screenshots
- Atualizar `docs/guild-hub/changelog.md` ao modificar UI/fluxo
- Incrementar `GUILD_HUB_VERSION` quando houver mudanças relevantes

## Boas Práticas
- Evitar duplicações de componentes ou imports
- Preferir lazy-loading para painéis pesados
- Testar em mobile e desktop