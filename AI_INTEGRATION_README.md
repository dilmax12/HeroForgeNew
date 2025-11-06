# 🤖 Integração de IA - Hero Forge

## 📋 Visão Geral

A integração de IA foi implementada com sucesso no Hero Forge, adicionando recursos inteligentes para:

- **🎭 Geração de Avatares**: Criação de avatares únicos usando DALL-E
- **🗡️ Missões Dinâmicas**: Geração procedural de missões personalizadas
- **🧠 Recomendações Inteligentes**: Análise e sugestões baseadas no perfil do herói
- **📖 Narrativas Adaptativas**: Histórias geradas dinamicamente com IA

## 🔧 Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# APIs de IA
VITE_OPENAI_API_KEY=sua_chave_openai_aqui
VITE_ANTHROPIC_API_KEY=sua_chave_anthropic_aqui

# Configurações de IA
VITE_AI_SERVICE_PROVIDER=openai
VITE_AI_MODEL=gpt-4
VITE_AI_IMAGE_MODEL=dall-e-3

# URLs das APIs (opcional)
VITE_OPENAI_API_URL=https://api.openai.com/v1
VITE_ANTHROPIC_API_URL=https://api.anthropic.com

# Configurações de desenvolvimento
VITE_AI_CACHE_ENABLED=true
VITE_AI_DEBUG_MODE=false
```

### 1.1 Configuração de Produção (Vercel)

- Defina `HF_TOKEN` e `HF_TEXT_MODEL` sem sufixo de provider. Exemplo: `HF_TEXT_MODEL=HuggingFaceH4/zephyr-7b-beta`.
- Para Groq, mantenha a chave apenas no backend: `GROQ_API_KEY=<sua_chave>`.
- Configure o proxy do frontend para o backend serverless: `VITE_GROQ_PROXY_URL=/api/groq-chat`.
- Mantenha `VITE_AI_SERVICE_PROVIDER=groq` e `VITE_AI_MODEL` conforme desejado.

Observações:
- O endpoint `https://router.huggingface.co/v1/chat/completions` não aceita `:auto` no nome do modelo; use o nome puro.
- O proxy `api/groq-chat` é compatível com OpenAI (`chat/completions`).

### 2. Obtenção das Chaves de API

#### OpenAI
1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie uma conta ou faça login
3. Vá para "API Keys" no menu
4. Clique em "Create new secret key"
5. Copie a chave e adicione ao `.env`

#### Anthropic (Claude)
1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Crie uma conta ou faça login
3. Vá para "API Keys"
4. Gere uma nova chave
5. Copie a chave e adicione ao `.env`

### 3. Instalação de Dependências

As dependências necessárias já estão configuradas no `package.json`. Execute:

```bash
npm install
```

## 🚀 Recursos Implementados

### 1. Geração de Avatares (AIAvatarGenerator)
- **Localização**: `/ai-avatar`
- **Funcionalidades**:
  - Geração de avatares baseados nos atributos do herói
  - Diferentes estilos: retrato, corpo inteiro, ação
  - Fallback para SVG quando IA não está disponível
  - Interface com preview e regeneração

### 2. Missões Dinâmicas (DynamicMissionsPanel)
- **Localização**: `/ai-missions`
- **Funcionalidades**:
  - Geração de missões personalizadas por IA
  - Tipos: principais, secundárias, diárias
  - Diálogos de NPCs gerados dinamicamente
  - Sistema de objetivos e recompensas

### 3. Recomendações Inteligentes (AIRecommendationsPanel)
- **Localização**: `/ai-recommendations`
- **Funcionalidades**:
  - Análise de fraquezas do herói
  - Sugestões de build otimizado
  - Metas diárias personalizadas
  - Recomendações gerais de gameplay

### 4. Sistema de Histórias Aprimorado
- **Funcionalidades**:
  - Narrativas geradas por IA baseadas no contexto
  - Fallback para templates estáticos
  - Descrições de heróis personalizadas
  - Narrativas de missões adaptativas

## 🛠️ Arquitetura Técnica

### Serviços Principais

1. **aiService.ts**: Serviço central para comunicação com APIs
2. **storyAIService.ts**: Especializado em geração de narrativas
3. **imageAIService.ts**: Focado em geração de imagens
4. **dynamicMissionsAI.ts**: Sistema de missões procedurais
5. **recommendationAI.ts**: Engine de recomendações

### Tipos TypeScript

Todos os tipos estão definidos em `src/types/ai.ts`:
- `AIProvider`, `AIConfig`
- `AITextRequest`, `AITextResponse`
- `AIImageRequest`, `AIImageResponse`
- Interfaces específicas para cada funcionalidade

### Cache e Performance

- Sistema de cache implementado para reduzir custos de API
- Fallbacks automáticos quando IA não está disponível
- Controle de uso e estatísticas

## 🔒 Segurança

- Chaves de API armazenadas como variáveis de ambiente
- Validação de entrada para prevenir injection
- Rate limiting implementado
- Logs de segurança para monitoramento

## 🧪 Testes

Para testar a integração:

1. Configure as variáveis de ambiente
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Navegue para as páginas de IA:
   - `/ai-avatar` - Teste geração de avatares
   - `/ai-missions` - Teste missões dinâmicas
   - `/ai-recommendations` - Teste recomendações

## 📊 Monitoramento

O sistema inclui:
- Contadores de uso de API
- Logs de erro detalhados
- Métricas de performance
- Cache hit/miss ratios

## 🔄 Fallbacks

Todos os recursos de IA incluem fallbacks:
- **Avatares**: SVG gerados programaticamente
- **Histórias**: Templates estáticos
- **Missões**: Geração baseada em regras
- **Recomendações**: Análise algorítmica

## 💰 Custos

Para otimizar custos:
- Use cache sempre que possível
- Configure `VITE_AI_CACHE_ENABLED=true`
- Monitore uso através dos logs
- Considere usar modelos mais baratos para desenvolvimento

## 🐛 Troubleshooting

### Problemas Comuns

1. **"API key not configured"**
   - Verifique se as variáveis de ambiente estão corretas
   - Reinicie o servidor de desenvolvimento

2. **"Failed to generate content"**
   - Verifique conectividade com internet
   - Confirme se as chaves de API são válidas
   - Verifique se há créditos disponíveis

3. **"Fallback content displayed"**
   - Normal quando IA não está configurada
   - Verifique logs para detalhes do erro

### Logs de Debug

Ative o modo debug:
```env
VITE_AI_DEBUG_MODE=true
```

## 🚀 Próximos Passos

Funcionalidades futuras planejadas:
- Integração com mais provedores de IA
- Sistema de treinamento personalizado
- Análise de sentimento em narrativas
- Geração de música ambiente
- Chat com NPCs em tempo real

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique este README
2. Consulte os logs de erro
3. Teste com fallbacks desabilitados
4. Verifique a documentação das APIs

---

**Status**: ✅ Implementação Completa
**Última Atualização**: Janeiro 2025
**Compatibilidade**: React 18+, TypeScript 5+
