# Reformulação Técnica da Taverna (Single‑Player)

## Objetivo
Focar a taverna na experiência single‑player, removendo chat/moderação/multiplayer e adicionando interações com NPCs e missões locais.

## Mudanças Principais
- Remoção de chat e moderação em `src/components/Tavern.tsx`.
- Navegação atualizada: removidas rotas/links de Messenger e Arena de Duelos.
- Aba “NPCs” com diálogos contextuais (`NPCPresenceLayer`, `npcDialogueService`) e simulação periódica (`runTick`).
- Aba “Eventos” recebe miniquadro de missões locais integradas com `availableQuests`/`acceptQuest`.

## Implementação
- `src/components/Tavern.tsx`: tabs `npcs | mural | eventos`; injeção de missões `tavern-delivery`, `tavern-help`, `tavern-bard` com `sticky` e `biomeHint: cidade`.
- `src/components/NPCPresenceLayer.tsx`: realce visual em diálogos (pulso, sombra, ring sutil).
- `src/App.tsx`, `src/components/Layout.tsx`, `src/components/QuickNavigation.tsx`, `src/components/EnhancedHUD.tsx`, `src/components/AdventurersGuildHub.tsx`: remoções de links/rotas obsoletos.

## Compatibilidade e Performance
- Reduz dependências de rede ao remover painéis de ranking da taverna.
- Mantém funcionalidades de descanso, rerrolagem e toasts de eventos locais.

## Testes/Validação
- Build verificado via HMR; busca confirma remoção de referências a Messenger/Arena.

## Próximos Incrementos
- Expandir missões locais com resultados narrativos e pequenas recompensas visuais.