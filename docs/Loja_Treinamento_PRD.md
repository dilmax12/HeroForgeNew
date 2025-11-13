# PRD — Empório do Aventureiro & Campo dos Heróis

## Visão Geral
- Objetivo: tornar o ciclo Loja → Masmorra → Treinamento viciante e recompensador, com economia dinâmica, rotação diária, imersão narrativa e progressão visual.
- Âncoras: mecânica sólida, economia com múltiplas moedas, expectativa/raridade, feedback emocional e integração com reputação/glória.

## Loja — Empório do Aventureiro

### Categorias
- Consumíveis: poções, pergaminhos, chaves, ressurreições.
- Equipamentos: armas, armaduras, acessórios; raridades: comum, raro, épico, lendário.
- Artefatos únicos: bônus passivos/habilidades especiais.
- Itens de guilda: requer `rank`/reputação mínima.
- Ofertas temporárias: rotação limitada (mercador misterioso).

### Moedas
- `gold`: ganho em missões e eventos comuns.
- `glory`: ganho em rankings/andars altos da masmorra.
- `arcaneEssence`: drop raro de chefes; usada em artefatos mágicos.

### Rotação da Loja
- Troca diária ou por cidade visitada.
- Exemplo: `commonItems: getRandom(3)`, `rareItems: getRandom(1)`, `specialItem: chance(0.1) ? legendary : null`.
- Itens raros com baixa probabilidade geram expectativa e retorno recorrente.

### Economia Dinâmica
- Preço flutua por popularidade (vendidos ↑ preço; ignorados ↓ preço).
- Descontos de guilda e reputação.
- Registro de compras para telemetria (itens populares, ticket médio).

### Imersão e Narrativa
- Vendedor com frases aleatórias e personalidade.
- Micro-lore em itens: “artefatos com vontade própria”, “marcas do mestre ferreiro”.

### UI/Fluxos
- Painel de categorias com filtros e raridade.
- Destaque de moeda requerida (ouro/glória/essência).
- Tooltip com comparação de atributos vs item equipado.
- Botões: `Comprar`, `Equipar` imediato (se aplicável), e `Favoritar`.
- Mercador misterioso com contagem regressiva.

### Funções (Store)
- `generateShopRotation(cityId?: string): ShopRotation`
- `getShopOffers(): Offer[]` (inclui preço atual e moeda)
- `buyItem(heroId, itemId): boolean` (suporta múltiplas moedas)
- `sellItem(heroId, itemId, qty?): boolean`
- `applyDynamicPricing(itemId, direction: 'up'|'down')`
- `favoriteItem(heroId, itemId)`

## Treinamento — Campo dos Heróis

### Tipos de Treino
- Forja do Aço (Força) — pesos e combate a manequins.
- Campo de Agilidade (Destreza) — reflexos e precisão.
- Templo do Saber (Inteligência) — runas e meditação.
- Santuário Espiritual (Sabedoria/Espírito) — foco e resistência mental.
- Arena de Combate (Defesa) — mestres e escudos.

### Tempo e Recompensa
- Durações: 1h, 4h, 8h.
- Recompensas: XP, atributos, motivação.
- Falha parcial se herói cansado.

### Fadiga
- Treinar em excesso reduz rendimento (“próximo treino rende 50%”).
- Recuperação: descanso na taverna ou poções específicas.

### Treinos Especiais
- Missões de Treino da Guilda (hologramas/chefes simulados).
- Torres do Mestre: desafios personalizados (após nível X).
- Mentores: habilidades raras com alto custo.

### Progressão Visual
- Faixas, medalhas, cicatrizes, roupas melhores por patamares de treino.

### UI/Fluxos
- Selecionar tipo de treino e duração.
- Barra de progresso em tempo real (cronômetro, estado `active`/`completed`).
- Resumo de recompensa ao concluir, com feedback imersivo.
- Indicadores de fadiga e dicas de recuperação.

### Funções (Store)
- `startTraining(heroId, type, durationMinutes): boolean`
- `completeTraining(heroId, trainingId): Reward`
- `cancelTraining(heroId, trainingId): boolean`
- `getTrainingStatus(heroId): Training[]`
- `applyFatigue(heroId, amount)`, `recoverFatigue(heroId, amount)`

## Integração Loja + Treino + Masmorra
- Compra poções/equipamentos → usar na masmorra → ganhar glória.
- Usar glória para pagar treinos avançados → reforça atributos → voltar mais forte à masmorra.
- Gatilhos de reputação/títulos por marcos de treino e compras raras.

## Esquemas de Banco (Supabase)
- `shop_items`, `shop_rotations`, `purchases`.
- `trainings`, `training_types`.
- Campos com `available_until`, `currency`, `rarity`, `reward` (jsonb).

## Roadmap Técnico
1) Tipos e store: adicionar `glory`, `arcaneEssence`, `fatigue` e migração.
2) SQL: criar `supabase/shop.sql` e `supabase/trainings.sql`.
3) UI: 
   - Loja: filtros, comparação, mercador misterioso.
   - Treino: seleção, progresso, feedback imersivo.
4) Pricing e rotação: serviços utilitários.
5) Telemetria: eventos de compra/treino para ajustar preços e oferecer ofertas.

## Mensagens Imersivas (exemplos)
- “Seu herói ergue o escudo repetidas vezes, suando sob o sol inclemente.”
- “O mestre da guilda observa em silêncio... e acena com aprovação.”
- “Você sente que dominou algo novo dentro de si.”

