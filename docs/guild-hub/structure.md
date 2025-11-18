# Estrutura do Guild Hub

## Diretórios
- `src/features/guild/Hub.tsx` — Componente principal do Guild Hub
- `src/features/guild/version.ts` — Versionamento do Guild Hub
- Componentes de apoio: `src/components/*` (PartyHUD, ParametersPanel, etc.)

## Rotas
- `'/guild-hub'` em `src/App.tsx` aponta para `GuildHub`

## Convenções
- Nomes em português claro, kebab-case para slugs
- Layout minimalista com `bg-gray-800` e texto `text-gray-100`
- Abas com estados ativos/hover consistentes