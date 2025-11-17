import { aiService } from './aiService';

import { StoryGenerationRequest } from '../types/ai';
import { Hero } from '../types/hero';

export class StoryAIService {
  private getSystemPrompt(): string {
    return `Você é um narrador mestre especializado em criar histórias épicas medievais. 
Suas histórias devem ser:
- Envolventes e imersivas
- Apropriadas para o contexto medieval fantástico
- Personalizadas para o herói específico
- Entre 100-200 palavras
- Escritas em português brasileiro
- Ricas em detalhes visuais e emocionais

Mantenha um tom épico mas acessível, criando narrativas que façam o jogador se sentir verdadeiramente heroico.`;
  }

  private buildStoryPrompt(request: StoryGenerationRequest): string {
    const { hero, context, storyType } = request;
    
    let prompt = `Crie uma história ${storyType} para o herói ${hero.name}, um ${hero.class} de nível ${hero.progression.level}.

Informações do herói:
- Nome: ${hero.name}
- Classe: ${hero.class}
- Nível: ${hero.progression.level}
- Alinhamento: ${hero.alignment}
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

    switch (storyType) {
      case 'origin':
        prompt += '\n\nConte a origem heroica deste personagem, como ele descobriu seus poderes e começou sua jornada.';
        break;
      case 'adventure':
        prompt += '\n\nNarre uma aventura épica recente, destacando as habilidades e conquistas do herói.';
        break;
      case 'legendary':
        prompt += '\n\nCrie uma lenda sobre este herói, uma história que será contada por gerações.';
        break;
      case 'achievement':
        prompt += '\n\nConte como o herói conquistou uma de suas maiores realizações.';
        break;
      default:
        prompt += '\n\nCrie uma história épica que capture a essência deste herói, com decisões, tom e consequências coerentes.';
    }

    return prompt;
  }

  async generateStory(request: StoryGenerationRequest): Promise<string> {
    try {
      const response = await aiService.generateText({
        prompt: this.buildStoryPrompt(request),
        systemMessage: this.getSystemPrompt(),
        maxTokens: 300,
        temperature: 0.8
      });

      return response.text.trim();
    } catch (error) {
      console.error('Error generating story:', error);
      // Fallback to a generic story if AI fails
      return this.generateFallbackStory(request.hero, request.storyType);
    }
  }

  async generateHeroDescription(hero: Hero): Promise<string> {
    try {
      const prompt = `Crie uma descrição física detalhada para ${hero.name}, um ${hero.class} de nível ${hero.progression.level}.

Considere:
- Classe: ${hero.class}
- Atributos: ${Object.entries(hero.attributes)
        .map(([attr, value]) => `${attr}: ${value}`)
        .join(', ')}

A descrição deve ter 50-80 palavras e focar na aparência física, vestimentas e presença do herói.`;

      const response = await aiService.generateText({
        prompt,
        systemMessage: 'Você é um especialista em criar descrições visuais detalhadas de personagens medievais fantásticos.',
        maxTokens: 150,
        temperature: 0.7
      });

      return response.text.trim();
    } catch (error) {
      console.error('Error generating hero description:', error);
      return this.generateFallbackDescription(hero);
    }
  }

  async generateQuestNarrative(hero: Hero, questType: string, difficulty: string): Promise<string> {
    try {
      const prompt = `Crie uma narrativa envolvente para uma missão ${questType} de dificuldade ${difficulty} para ${hero.name}.

Herói: ${hero.name} (${hero.class}, nível ${hero.progression.level})
Tipo de missão: ${questType}
Dificuldade: ${difficulty}

A narrativa deve:
- Estabelecer o contexto e urgência da missão
- Ser apropriada para o nível e classe do herói
- Ter entre 80-120 palavras
- Incluir detalhes sobre o local e desafios esperados`;

      const response = await aiService.generateText({
        prompt,
        systemMessage: 'Você é um mestre de RPG criando narrativas envolventes para missões medievais.',
        maxTokens: 200,
        temperature: 0.8
      });

      return response.text.trim();
    } catch (error) {
      console.error('Error generating quest narrative:', error);
      return `Uma nova missão ${questType} aguarda ${hero.name}. Os desafios à frente testarão suas habilidades como ${hero.class}.`;
    }
  }

  private generateFallbackStory(hero: Hero, storyType: string): string {
    const stories = {
      origin: `${hero.name} descobriu seu destino como ${hero.class} em uma noite tempestuosa. As antigas runas brilharam quando tocou a relíquia ancestral, revelando poderes há muito esquecidos. Desde então, sua jornada heroica começou, guiada pela sabedoria dos antigos e pela força de sua determinação.`,
      adventure: `Em sua última aventura, ${hero.name} enfrentou desafios que testaram cada aspecto de suas habilidades como ${hero.class}. Com coragem e estratégia, superou obstáculos impossíveis, provando mais uma vez por que é considerado um verdadeiro herói.`,
      legendary: `As lendas falam de ${hero.name}, o ${hero.class} cujos feitos ecoam através dos tempos. Sua história inspira novos heróis e atemoriza aqueles que ousam desafiar a justiça. Um nome que será lembrado por gerações.`,
      achievement: `${hero.name} alcançou uma conquista extraordinária, demonstrando a verdadeira essência de um ${hero.class}. Esta vitória não apenas elevou seu status, mas também inspirou outros a seguir o caminho da heroicidade.`
    };

    return stories[storyType as keyof typeof stories] || stories.adventure;
  }

  private generateFallbackDescription(hero: Hero): string {
    const descriptions = {
      Warrior: `Um guerreiro imponente com porte atlético e cicatrizes que contam histórias de batalhas. Veste armadura resistente e carrega armas com maestria.`,
      Mage: `Uma figura elegante envolta em vestes místicas, com olhos que brilham com conhecimento arcano. Runas antigas adornam seus trajes.`,
      Rogue: `Ágil e silencioso, move-se com graça felina. Veste roupas escuras que permitem movimento livre e carrega ferramentas especializadas.`,
      Paladin: `Nobre e radiante, sua presença inspira confiança. Armadura reluzente reflete sua devoção e determinação inabalável.`,
      Ranger: `Conectado com a natureza, veste roupas práticas em tons terrosos. Seus olhos alertas não perdem nenhum detalhe do ambiente.`
    };

    return descriptions[hero.class as keyof typeof descriptions] || 
           `${hero.name} possui a presença marcante de um verdadeiro ${hero.class}, com características únicas que refletem sua jornada heroica.`;
  }
}

export const storyAIService = new StoryAIService();


export function generateStorySeeds(worldState: WorldState): { context: string; tone: string; previousDecisions: string[] } {
  const decisions = worldState.decisionLog.slice(-5).map(d => d.choiceText);
  return { context: 'Estradas turbulentas e facções em conflito', tone: 'épico e sombrio', previousDecisions: decisions };
}

export function updateWorldMemory(worldState: WorldState, event: string): WorldState {
  const updated = { ...worldState };
  updated.activeEvents = [...(updated.activeEvents || []), event];
  return updated;
}