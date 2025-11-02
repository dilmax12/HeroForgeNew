import { aiService } from './aiService';
import { AIImageRequest } from '../types/ai';
import { Hero } from '../types/hero';

export class ImageAIService {
  private buildHeroImagePrompt(hero: Hero, style: 'portrait' | 'full-body' | 'action' = 'portrait'): string {
    const classDescriptions = {
      Warrior: 'armored warrior with sword and shield, strong and battle-hardened',
      Mage: 'mystical spellcaster with robes and magical staff, wise and powerful',
      Rogue: 'agile assassin with dark leather armor and daggers, stealthy and cunning',
      Paladin: 'holy knight with shining armor and blessed weapon, noble and righteous',
      Ranger: 'forest guardian with bow and nature-themed gear, skilled and alert'
    };

    const styleDescriptions = {
      portrait: 'detailed portrait, head and shoulders',
      'full-body': 'full body character illustration',
      action: 'dynamic action pose in combat'
    };

    const dominantAttribute = Object.entries(hero.attributes)
      .sort(([,a], [,b]) => b - a)[0][0];

    const attributeDescriptions = {
      strength: 'muscular and powerful build',
      intelligence: 'wise eyes and scholarly appearance',
      agility: 'lean and athletic physique',
      charisma: 'commanding presence and attractive features',
      constitution: 'robust and healthy appearance',
      wisdom: 'serene expression and thoughtful demeanor'
    };

    let prompt = `${styleDescriptions[style]} of ${hero.name}, a level ${hero.progression.level} ${classDescriptions[hero.class as keyof typeof classDescriptions] || hero.class}`;
    
    if (attributeDescriptions[dominantAttribute as keyof typeof attributeDescriptions]) {
      prompt += `, with ${attributeDescriptions[dominantAttribute as keyof typeof attributeDescriptions]}`;
    }

    prompt += `, medieval fantasy art style, highly detailed, digital painting, concept art, dramatic lighting`;

    // Add rank-based enhancements
    if (hero.rank) {
      const rankEnhancements = {
        F: 'novice adventurer',
        E: 'apprentice hero',
        D: 'skilled adventurer',
        C: 'experienced hero',
        B: 'veteran champion',
        A: 'legendary hero with glowing aura',
        S: 'mythical champion with divine radiance'
      };
      
      if (rankEnhancements[hero.rank as keyof typeof rankEnhancements]) {
        prompt += `, ${rankEnhancements[hero.rank as keyof typeof rankEnhancements]}`;
      }
    }

    return prompt;
  }

  async generateHeroAvatar(hero: Hero, style: 'portrait' | 'full-body' | 'action' = 'portrait'): Promise<string> {
    try {
      const prompt = this.buildHeroImagePrompt(hero, style);
      
      const response = await aiService.generateImage({
        prompt,
        size: style === 'portrait' ? '512x512' : '1024x1024',
        quality: 'standard',
        style: 'vivid'
      });

      return response.url;
    } catch (error) {
      console.error('Error generating hero avatar:', error);
      // Return a fallback placeholder image
      return this.getFallbackAvatar(hero);
    }
  }

  async generateClassIcon(heroClass: string): Promise<string> {
    try {
      const classPrompts = {
        Warrior: 'crossed sword and shield icon, medieval fantasy style, golden metallic, simple design',
        Mage: 'magical staff with crystal orb icon, mystical blue glow, arcane symbols',
        Rogue: 'crossed daggers icon, dark steel with poison green accents, stealth design',
        Paladin: 'holy hammer with divine light icon, silver and gold, sacred geometry',
        Ranger: 'bow and arrow with leaf motifs icon, forest green and brown, nature theme'
      };

      const prompt = classPrompts[heroClass as keyof typeof classPrompts] || 
                    `${heroClass} class icon, medieval fantasy style, detailed emblem`;

      const response = await aiService.generateImage({
        prompt: prompt + ', icon design, transparent background, high contrast',
        size: '256x256',
        quality: 'standard',
        style: 'natural'
      });

      return response.url;
    } catch (error) {
      console.error('Error generating class icon:', error);
      return this.getFallbackClassIcon(heroClass);
    }
  }

  async generateRankBadge(rank: string): Promise<string> {
    try {
      const rankPrompts = {
        F: 'bronze rank badge, simple design, beginner level',
        E: 'iron rank badge, sturdy metal, apprentice level',
        D: 'silver rank badge, polished metal, skilled level',
        C: 'gold rank badge, shining metal, experienced level',
        B: 'platinum rank badge, precious metal with gems, veteran level',
        A: 'diamond rank badge, crystalline with magical glow, legendary level',
        S: 'mythril rank badge, ethereal glow with divine light, mythical level'
      };

      const prompt = rankPrompts[rank as keyof typeof rankPrompts] || 
                    `${rank} rank badge, medieval fantasy style`;

      const response = await aiService.generateImage({
        prompt: prompt + ', heraldic design, detailed emblem, transparent background',
        size: '256x256',
        quality: 'standard',
        style: 'natural'
      });

      return response.url;
    } catch (error) {
      console.error('Error generating rank badge:', error);
      return this.getFallbackRankBadge(rank);
    }
  }

  async generateQuestIllustration(questTitle: string, questType: string, difficulty: string): Promise<string> {
    try {
      const typePrompts = {
        combat: 'epic battle scene with monsters',
        exploration: 'mysterious dungeon or ancient ruins',
        social: 'tavern or royal court scene',
        crafting: 'workshop with magical items',
        rescue: 'dramatic rescue scene'
      };

      const difficultyEnhancements = {
        easy: 'peaceful atmosphere, bright lighting',
        medium: 'moderate danger, balanced lighting',
        hard: 'dangerous atmosphere, dramatic shadows',
        extreme: 'epic scale, intense lighting and effects'
      };

      let prompt = `${typePrompts[questType as keyof typeof typePrompts] || 'fantasy adventure scene'}`;
      
      if (difficultyEnhancements[difficulty as keyof typeof difficultyEnhancements]) {
        prompt += `, ${difficultyEnhancements[difficulty as keyof typeof difficultyEnhancements]}`;
      }

      prompt += ', medieval fantasy art, detailed illustration, concept art style';

      const response = await aiService.generateImage({
        prompt,
        size: '1024x512',
        quality: 'standard',
        style: 'vivid'
      });

      return response.url;
    } catch (error) {
      console.error('Error generating quest illustration:', error);
      return this.getFallbackQuestImage(questType);
    }
  }

  private getFallbackAvatar(hero: Hero): string {
    // Return a data URL for a simple SVG avatar based on hero class
    const colors = {
      Warrior: '#8B4513',
      Mage: '#4169E1',
      Rogue: '#2F4F4F',
      Paladin: '#FFD700',
      Ranger: '#228B22'
    };

    const color = colors[hero.class as keyof typeof colors] || '#696969';
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="${color}" stroke="#333" stroke-width="2"/>
        <text x="50" y="55" text-anchor="middle" fill="white" font-size="12" font-family="Arial">
          ${hero.name.charAt(0)}
        </text>
      </svg>
    `)}`;
  }

  private getFallbackClassIcon(heroClass: string): string {
    const icons = {
      Warrior: '⚔️',
      Mage: '🔮',
      Rogue: '🗡️',
      Paladin: '🛡️',
      Ranger: '🏹'
    };

    const icon = icons[heroClass as keyof typeof icons] || '⭐';
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
        <text x="32" y="40" text-anchor="middle" font-size="24">${icon}</text>
      </svg>
    `)}`;
  }

  private getFallbackRankBadge(rank: string): string {
    const colors = {
      F: '#CD7F32', E: '#C0C0C0', D: '#C0C0C0', C: '#FFD700',
      B: '#E5E4E2', A: '#B9F2FF', S: '#FF6347'
    };

    const color = colors[rank as keyof typeof colors] || '#696969';
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="${color}" stroke="#333" stroke-width="2"/>
        <text x="32" y="38" text-anchor="middle" fill="white" font-size="20" font-weight="bold">
          ${rank}
        </text>
      </svg>
    `)}`;
  }

  private getFallbackQuestImage(questType: string): string {
    const emojis = {
      combat: '⚔️',
      exploration: '🗺️',
      social: '👥',
      crafting: '🔨',
      rescue: '🛡️'
    };

    const emoji = emojis[questType as keyof typeof emojis] || '⭐';
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#f5f5f5" stroke="#ddd" stroke-width="1"/>
        <text x="100" y="60" text-anchor="middle" font-size="32">${emoji}</text>
      </svg>
    `)}`;
  }
}

export const imageAIService = new ImageAIService();