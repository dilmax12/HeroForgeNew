import { aiService } from './aiService';
import { MissionGenerationRequest } from '../types/ai';
import { Hero } from '../types/hero';

export interface DynamicMission {
  id: string;
  title: string;
  description: string;
  narrative: string;
  objectives: MissionObjective[];
  rewards: MissionReward[];
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  type: 'combat' | 'exploration' | 'social' | 'crafting' | 'rescue' | 'mystery';
  estimatedDuration: number; // in minutes
  prerequisites?: string[];
  location: string;
  npcDialogue?: NPCDialogue[];
}

export interface MissionObjective {
  id: string;
  description: string;
  type: 'kill' | 'collect' | 'interact' | 'reach' | 'survive' | 'solve';
  target?: string;
  quantity?: number;
  completed: boolean;
  optional: boolean;
}

export interface MissionReward {
  type: 'experience' | 'gold' | 'item' | 'achievement' | 'rank_points';
  amount: number;
  description: string;
}

export interface NPCDialogue {
  npcName: string;
  dialogue: string;
  responses?: string[];
}

export class DynamicMissionsAI {
  private getSystemPrompt(): string {
    return `Você é um mestre de RPG especializado em criar missões dinâmicas e envolventes para um jogo medieval fantástico.

Suas missões devem ser:
- Apropriadas para o nível e classe do herói
- Narrativamente coerentes e imersivas
- Balanceadas em dificuldade e recompensas
- Ricas em detalhes e contexto
- Escritas em português brasileiro

Sempre considere:
- O histórico e conquistas do herói
- A progressão natural da dificuldade
- Elementos de roleplay e narrativa
- Variedade nos tipos de objetivos
- Recompensas motivadoras e justas`;
  }

  private buildMissionPrompt(request: MissionGenerationRequest): string {
    const { hero, missionType, difficulty, context } = request;

    let prompt = `Crie uma missão ${missionType} de dificuldade ${difficulty} para ${hero.name}.

Informações do Herói:
- Nome: ${hero.name}
- Classe: ${hero.class}
- Nível: ${hero.level}
- Rank: ${hero.rank || 'F'}
- Atributos principais: ${Object.entries(hero.attributes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([attr, value]) => `${attr}: ${value}`)
      .join(', ')}`;

    if (hero.achievements && hero.achievements.length > 0) {
      prompt += `\n- Conquistas recentes: ${hero.achievements.slice(-3).map(a => a.title).join(', ')}`;
    }

    if (context) {
      prompt += `\n\nContexto adicional: ${context}`;
    }

    prompt += `\n\nA missão deve incluir:
1. Título épico e memorável
2. Descrição breve (1-2 frases)
3. Narrativa envolvente (100-150 palavras)
4. 2-4 objetivos específicos e claros
5. Recompensas apropriadas para o nível
6. Localização interessante
7. Duração estimada em minutos

Formato da resposta em JSON:
{
  "title": "Título da Missão",
  "description": "Descrição breve",
  "narrative": "Narrativa completa",
  "objectives": [
    {
      "description": "Objetivo 1",
      "type": "tipo_do_objetivo",
      "target": "alvo_se_aplicavel",
      "quantity": numero_se_aplicavel,
      "optional": false
    }
  ],
  "rewards": [
    {
      "type": "experience",
      "amount": 100,
      "description": "Experiência ganha"
    }
  ],
  "location": "Nome do Local",
  "estimatedDuration": 30,
  "npcDialogue": [
    {
      "npcName": "Nome do NPC",
      "dialogue": "Fala do NPC",
      "responses": ["Resposta 1", "Resposta 2"]
    }
  ]
}`;

    return prompt;
  }

  async generateMission(request: MissionGenerationRequest): Promise<DynamicMission> {
    try {
      const response = await aiService.generateText({
        prompt: this.buildMissionPrompt(request),
        systemMessage: this.getSystemPrompt(),
        maxTokens: 800,
        temperature: 0.8
      });

      // Parse the JSON response
      const missionData = JSON.parse(response.text);
      
      return {
        id: this.generateMissionId(),
        title: missionData.title,
        description: missionData.description,
        narrative: missionData.narrative,
        objectives: missionData.objectives.map((obj: any, index: number) => ({
          id: `obj_${index}`,
          description: obj.description,
          type: obj.type,
          target: obj.target,
          quantity: obj.quantity,
          completed: false,
          optional: obj.optional || false
        })),
        rewards: missionData.rewards,
        difficulty: request.difficulty,
        type: request.missionType,
        estimatedDuration: missionData.estimatedDuration,
        location: missionData.location,
        npcDialogue: missionData.npcDialogue
      };
    } catch (error) {
      console.error('Error generating dynamic mission:', error);
      return this.generateFallbackMission(request);
    }
  }

  async generateQuestChain(hero: Hero, theme: string, length: number = 3): Promise<DynamicMission[]> {
    const missions: DynamicMission[] = [];
    const difficulties: Array<'easy' | 'medium' | 'hard' | 'extreme'> = ['easy', 'medium', 'hard'];
    const types: Array<'combat' | 'exploration' | 'social' | 'crafting' | 'rescue' | 'mystery'> = 
      ['combat', 'exploration', 'social', 'crafting', 'rescue', 'mystery'];

    for (let i = 0; i < length; i++) {
      const difficulty = difficulties[Math.min(i, difficulties.length - 1)];
      const missionType = types[Math.floor(Math.random() * types.length)];
      
      const context = i === 0 
        ? `Primeira missão de uma cadeia temática sobre: ${theme}`
        : `Missão ${i + 1} de ${length} na cadeia "${theme}". Missões anteriores: ${missions.map(m => m.title).join(', ')}`;

      const mission = await this.generateMission({
        hero,
        missionType,
        difficulty,
        context
      });

      missions.push(mission);
    }

    return missions;
  }

  async generateNPCDialogue(hero: Hero, npcName: string, context: string): Promise<NPCDialogue> {
    try {
      const prompt = `Crie um diálogo para o NPC "${npcName}" falando com ${hero.name} (${hero.class}, nível ${hero.level}).

Contexto: ${context}

O diálogo deve:
- Ser apropriado para o contexto medieval fantástico
- Refletir a personalidade única do NPC
- Incluir 2-3 opções de resposta para o jogador
- Ter entre 50-100 palavras

Formato JSON:
{
  "npcName": "${npcName}",
  "dialogue": "Fala do NPC",
  "responses": ["Resposta 1", "Resposta 2", "Resposta 3"]
}`;

      const response = await aiService.generateText({
        prompt,
        systemMessage: 'Você é especialista em criar diálogos envolventes para NPCs em jogos de RPG.',
        maxTokens: 200,
        temperature: 0.7
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Error generating NPC dialogue:', error);
      return {
        npcName,
        dialogue: `Saudações, ${hero.name}! Como posso ajudá-lo hoje?`,
        responses: ['Preciso de uma missão', 'Conte-me sobre este lugar', 'Até logo']
      };
    }
  }

  private generateMissionId(): string {
    return `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFallbackMission(request: MissionGenerationRequest): DynamicMission {
    const { hero, missionType, difficulty } = request;
    
    const fallbackMissions = {
      combat: {
        title: 'Ameaça nas Sombras',
        description: 'Criaturas hostis ameaçam a região.',
        narrative: `${hero.name}, relatórios chegaram sobre criaturas perigosas rondando as proximidades. Como ${hero.class} experiente, sua ajuda é essencial para proteger os inocentes. Prepare-se para o combate!`,
        objectives: [
          { description: 'Eliminar 5 criaturas hostis', type: 'kill', target: 'criaturas', quantity: 5, optional: false }
        ]
      },
      exploration: {
        title: 'Ruínas Perdidas',
        description: 'Explore ruínas antigas em busca de tesouros.',
        narrative: `Antigas ruínas foram descobertas, ${hero.name}. Como ${hero.class}, você possui as habilidades necessárias para explorar estes locais perigosos e descobrir seus segredos.`,
        objectives: [
          { description: 'Explorar as ruínas antigas', type: 'reach', target: 'ruínas', optional: false },
          { description: 'Encontrar artefato antigo', type: 'collect', target: 'artefato', quantity: 1, optional: false }
        ]
      }
    };

    const template = fallbackMissions[missionType] || fallbackMissions.combat;
    
    return {
      id: this.generateMissionId(),
      title: template.title,
      description: template.description,
      narrative: template.narrative,
      objectives: template.objectives.map((obj, index) => ({
        id: `obj_${index}`,
        description: obj.description,
        type: obj.type as any,
        target: obj.target,
        quantity: obj.quantity,
        completed: false,
        optional: obj.optional
      })),
      rewards: [
        { type: 'experience', amount: hero.level * 50, description: 'Experiência de combate' },
        { type: 'gold', amount: hero.level * 25, description: 'Recompensa em ouro' }
      ],
      difficulty,
      type: missionType,
      estimatedDuration: 20,
      location: 'Região Próxima',
      npcDialogue: [{
        npcName: 'Capitão da Guarda',
        dialogue: `${hero.name}, precisamos de sua ajuda urgentemente!`,
        responses: ['Aceito a missão', 'Conte-me mais detalhes', 'Talvez mais tarde']
      }]
    };
  }
}

export const dynamicMissionsAI = new DynamicMissionsAI();