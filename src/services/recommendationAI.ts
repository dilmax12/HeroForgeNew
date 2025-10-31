import { aiService } from './aiService';
import { AIRecommendationRequest } from '../types/ai';
import { Hero } from '../types/hero';

export interface Recommendation {
  id: string;
  type: 'training' | 'quest' | 'equipment' | 'social' | 'progression' | 'strategy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reasoning: string;
  actionSteps: string[];
  estimatedBenefit: string;
  estimatedTime: string;
  prerequisites?: string[];
  relatedAchievements?: string[];
}

export interface RecommendationContext {
  recentActivities: string[];
  currentGoals: string[];
  weaknesses: string[];
  strengths: string[];
  availableTime: 'short' | 'medium' | 'long';
  preferredActivities: string[];
}

export class RecommendationAI {
  private getSystemPrompt(): string {
    return `Você é um conselheiro especialista em RPG medieval fantástico, focado em ajudar heróis a otimizar sua progressão e experiência de jogo.

Suas recomendações devem ser:
- Personalizadas para o herói específico
- Baseadas em dados e análise inteligente
- Práticas e acionáveis
- Balanceadas entre eficiência e diversão
- Escritas em português brasileiro

Considere sempre:
- O nível atual e objetivos do herói
- Pontos fortes e fracos
- Atividades recentes e padrões
- Tempo disponível para jogar
- Progressão natural e sustentável`;
  }

  private buildRecommendationPrompt(request: AIRecommendationRequest): string {
    const { hero, context, maxRecommendations } = request;

    let prompt = `Analise o perfil do herói e forneça ${maxRecommendations || 3} recomendações personalizadas.

PERFIL DO HERÓI:
- Nome: ${hero.name}
- Classe: ${hero.class}
- Nível: ${hero.level}
- Rank: ${hero.rank || 'F'}
- Atributos: ${Object.entries(hero.attributes)
      .map(([attr, value]) => `${attr}: ${value}`)
      .join(', ')}`;

    if (hero.achievements && hero.achievements.length > 0) {
      prompt += `\n- Conquistas: ${hero.achievements.slice(-5).map(a => a.title).join(', ')}`;
    }

    if (context) {
      prompt += `\n\nCONTEXTO ADICIONAL:`;
      if (context.recentActivities?.length) {
        prompt += `\n- Atividades recentes: ${context.recentActivities.join(', ')}`;
      }
      if (context.currentGoals?.length) {
        prompt += `\n- Objetivos atuais: ${context.currentGoals.join(', ')}`;
      }
      if (context.weaknesses?.length) {
        prompt += `\n- Pontos fracos: ${context.weaknesses.join(', ')}`;
      }
      if (context.strengths?.length) {
        prompt += `\n- Pontos fortes: ${context.strengths.join(', ')}`;
      }
      if (context.availableTime) {
        prompt += `\n- Tempo disponível: ${context.availableTime}`;
      }
      if (context.preferredActivities?.length) {
        prompt += `\n- Atividades preferidas: ${context.preferredActivities.join(', ')}`;
      }
    }

    prompt += `\n\nFORNEÇA RECOMENDAÇÕES EM JSON:
{
  "recommendations": [
    {
      "type": "training|quest|equipment|social|progression|strategy",
      "priority": "low|medium|high|critical",
      "title": "Título da Recomendação",
      "description": "Descrição clara (50-80 palavras)",
      "reasoning": "Por que esta recomendação é importante (30-50 palavras)",
      "actionSteps": ["Passo 1", "Passo 2", "Passo 3"],
      "estimatedBenefit": "Benefício esperado",
      "estimatedTime": "Tempo necessário",
      "prerequisites": ["Pré-requisito 1", "Pré-requisito 2"],
      "relatedAchievements": ["Conquista relacionada"]
    }
  ]
}

TIPOS DE RECOMENDAÇÃO:
- training: Treino de atributos ou habilidades
- quest: Missões específicas para progressão
- equipment: Melhorias de equipamentos
- social: Interações sociais e guildas
- progression: Estratégias de progressão geral
- strategy: Táticas e estratégias de combate`;

    return prompt;
  }

  async generateRecommendations(request: AIRecommendationRequest): Promise<Recommendation[]> {
    try {
      const response = await aiService.generateText({
        prompt: this.buildRecommendationPrompt(request),
        systemMessage: this.getSystemPrompt(),
        maxTokens: 1000,
        temperature: 0.7
      });

      const data = JSON.parse(response.text);
      
      return data.recommendations.map((rec: any, index: number) => ({
        id: this.generateRecommendationId(),
        type: rec.type,
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        reasoning: rec.reasoning,
        actionSteps: rec.actionSteps || [],
        estimatedBenefit: rec.estimatedBenefit,
        estimatedTime: rec.estimatedTime,
        prerequisites: rec.prerequisites,
        relatedAchievements: rec.relatedAchievements
      }));
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this.generateFallbackRecommendations(request);
    }
  }

  async analyzeHeroWeaknesses(hero: Hero): Promise<string[]> {
    try {
      const prompt = `Analise os atributos do herói ${hero.name} e identifique pontos fracos:

Atributos:
${Object.entries(hero.attributes)
  .map(([attr, value]) => `- ${attr}: ${value}`)
  .join('\n')}

Classe: ${hero.class}
Nível: ${hero.level}

Identifique 2-3 pontos fracos principais baseados nos atributos mais baixos e na classe do herói.
Responda apenas com uma lista simples, uma fraqueza por linha.`;

      const response = await aiService.generateText({
        prompt,
        systemMessage: 'Você é um analista especializado em balanceamento de personagens de RPG.',
        maxTokens: 150,
        temperature: 0.5
      });

      return response.text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 3);
    } catch (error) {
      console.error('Error analyzing weaknesses:', error);
      return this.getFallbackWeaknesses(hero);
    }
  }

  async suggestOptimalBuild(hero: Hero): Promise<{
    attributePriorities: string[];
    skillRecommendations: string[];
    equipmentSuggestions: string[];
    playstyleAdvice: string;
  }> {
    try {
      const prompt = `Sugira um build otimizado para ${hero.name} (${hero.class}, nível ${hero.level}):

Atributos atuais:
${Object.entries(hero.attributes)
  .map(([attr, value]) => `- ${attr}: ${value}`)
  .join('\n')}

Forneça em JSON:
{
  "attributePriorities": ["Atributo mais importante", "Segundo mais importante", "Terceiro"],
  "skillRecommendations": ["Habilidade 1", "Habilidade 2", "Habilidade 3"],
  "equipmentSuggestions": ["Equipamento 1", "Equipamento 2", "Equipamento 3"],
  "playstyleAdvice": "Conselho sobre estilo de jogo (100-150 palavras)"
}`;

      const response = await aiService.generateText({
        prompt,
        systemMessage: 'Você é um especialista em builds otimizados para RPG medieval.',
        maxTokens: 400,
        temperature: 0.6
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Error suggesting optimal build:', error);
      return this.getFallbackBuild(hero);
    }
  }

  async generateDailyGoals(hero: Hero, context?: RecommendationContext): Promise<string[]> {
    try {
      const prompt = `Gere 3-5 objetivos diários personalizados para ${hero.name}:

Herói: ${hero.name} (${hero.class}, nível ${hero.level}, rank ${hero.rank || 'F'})

${context ? `
Contexto:
- Tempo disponível: ${context.availableTime}
- Atividades preferidas: ${context.preferredActivities?.join(', ') || 'Não especificado'}
- Objetivos atuais: ${context.currentGoals?.join(', ') || 'Não especificado'}
` : ''}

Os objetivos devem ser:
- Específicos e mensuráveis
- Apropriados para o nível do herói
- Variados e interessantes
- Realizáveis no tempo disponível

Responda apenas com uma lista simples, um objetivo por linha.`;

      const response = await aiService.generateText({
        prompt,
        systemMessage: 'Você cria objetivos diários motivadores para jogadores de RPG.',
        maxTokens: 200,
        temperature: 0.8
      });

      return response.text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 5);
    } catch (error) {
      console.error('Error generating daily goals:', error);
      return this.getFallbackDailyGoals(hero);
    }
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFallbackRecommendations(request: AIRecommendationRequest): Recommendation[] {
    const { hero } = request;
    const recommendations: Recommendation[] = [];

    // Training recommendation
    const weakestAttribute = Object.entries(hero.attributes)
      .sort(([,a], [,b]) => a - b)[0];

    recommendations.push({
      id: this.generateRecommendationId(),
      type: 'training',
      priority: 'medium',
      title: `Treinar ${weakestAttribute[0]}`,
      description: `Seu atributo ${weakestAttribute[0]} está abaixo da média. Focar no treinamento deste atributo melhorará significativamente sua performance geral.`,
      reasoning: `${weakestAttribute[0]} é seu atributo mais fraco e limitante.`,
      actionSteps: [
        'Encontre um instrutor especializado',
        'Complete exercícios de treinamento',
        'Pratique regularmente'
      ],
      estimatedBenefit: 'Melhoria significativa na performance',
      estimatedTime: '1-2 horas de jogo'
    });

    // Quest recommendation
    recommendations.push({
      id: this.generateRecommendationId(),
      type: 'quest',
      priority: 'high',
      title: 'Missão de Progressão',
      description: `Como ${hero.class} de nível ${hero.level}, você deveria focar em missões que desafiem suas habilidades atuais e ofereçam boa experiência.`,
      reasoning: 'Progressão constante é essencial para o desenvolvimento.',
      actionSteps: [
        'Procure missões apropriadas para seu nível',
        'Prepare equipamentos adequados',
        'Execute a missão com cuidado'
      ],
      estimatedBenefit: 'Experiência e recompensas valiosas',
      estimatedTime: '30-45 minutos'
    });

    return recommendations;
  }

  private getFallbackWeaknesses(hero: Hero): string[] {
    const sortedAttributes = Object.entries(hero.attributes)
      .sort(([,a], [,b]) => a - b);

    return sortedAttributes.slice(0, 2).map(([attr]) => 
      `${attr} baixo para a classe ${hero.class}`
    );
  }

  private getFallbackBuild(hero: Hero): {
    attributePriorities: string[];
    skillRecommendations: string[];
    equipmentSuggestions: string[];
    playstyleAdvice: string;
  } {
    const classPriorities = {
      Warrior: ['strength', 'constitution', 'agility'],
      Mage: ['intelligence', 'wisdom', 'constitution'],
      Rogue: ['agility', 'intelligence', 'strength'],
      Paladin: ['strength', 'charisma', 'constitution'],
      Ranger: ['agility', 'wisdom', 'strength'],
      Cleric: ['wisdom', 'charisma', 'constitution']
    };

    return {
      attributePriorities: classPriorities[hero.class as keyof typeof classPriorities] || 
                          ['strength', 'constitution', 'agility'],
      skillRecommendations: ['Habilidade de classe principal', 'Habilidade de sobrevivência', 'Habilidade social'],
      equipmentSuggestions: ['Arma principal melhorada', 'Armadura defensiva', 'Acessório de atributo'],
      playstyleAdvice: `Como ${hero.class}, foque em suas habilidades naturais enquanto desenvolve áreas complementares para um personagem bem equilibrado.`
    };
  }

  private getFallbackDailyGoals(hero: Hero): string[] {
    return [
      `Completar 2 missões apropriadas para nível ${hero.level}`,
      `Treinar atributo mais fraco por 30 minutos`,
      `Interagir com 3 NPCs diferentes`,
      `Coletar recursos para crafting`,
      `Participar de uma atividade social`
    ];
  }
}

export const recommendationAI = new RecommendationAI();