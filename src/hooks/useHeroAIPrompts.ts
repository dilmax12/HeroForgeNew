import { Hero, HeroClass, Element } from '../types/hero';

interface AIPromptConfig {
  basePrompt: string;
  classVariations: Record<HeroClass, string>;
  elementVariations: Record<Element, string>;
  standardRequirements: string;
}

export const useHeroAIPrompts = () => {
  const promptConfig: AIPromptConfig = {
    basePrompt: "Medieval fantasy hero card design, detailed digital painting, high fantasy style",
    
    classVariations: {
      guerreiro: "heroic warrior with detailed armor, sword and shield, battle-ready stance",
      mago: "wise sorcerer with mystical robes, staff with glowing crystal, arcane symbols",
      ladino: "stealthy rogue with dark clothing, dual daggers, nimble posture",
      clerigo: "holy cleric with sacred vestments, divine staff, peaceful aura",
      patrulheiro: "skilled ranger with nature-themed gear, bow and arrows, forest guardian",
      paladino: "noble paladin with shining armor, holy sword, divine presence",
      arqueiro: "agile archer with elegant bow, leather armor, precise stance"
    },

    elementVariations: {
      fire: "surrounded by flames and ember effects, warm orange-red lighting, fiery atmosphere",
      ice: "with frost and ice crystals, cool blue atmosphere, frozen magical effects",
      thunder: "with lightning and electric energy, dynamic blue-yellow glow, crackling electricity",
      earth: "with stone and nature elements, earthy brown-green tones, rocky textures",
      light: "bathed in radiant holy light, golden divine atmosphere, heavenly glow",
      dark: "shrouded in shadows and dark energy, purple-black aura, mysterious darkness",
      physical: "with metallic armor and weapons, neutral lighting, realistic materials"
    },

    standardRequirements: "vertical portrait 3:4 format, half-body view (torso up), parchment background mixed with light magical effects, golden or silver frame with subtle runic inscriptions, translucent lower panel with name, class and element, soft immersive cinematic atmosphere"
  };

  const generatePrompt = (hero: Hero): string => {
    const classPrompt = promptConfig.classVariations[hero.class];
    const elementPrompt = promptConfig.elementVariations[hero.element];
    
    return `${promptConfig.basePrompt}, ${classPrompt}, ${elementPrompt}, ${promptConfig.standardRequirements}`;
  };

  const generateDetailedPrompt = (hero: Hero): string => {
    const detailedClassPrompts = {
      guerreiro: {
        fire: "Fire warrior with blazing sword, red-orange armor with flame patterns, ember particles, warm battle atmosphere",
        ice: "Frost warrior with ice-covered armor, crystalline sword, cold breath visible, winter battlefield",
        thunder: "Storm warrior with lightning-charged weapons, electric blue armor accents, crackling energy",
        earth: "Earth guardian with stone armor, nature-infused weapons, rocky terrain background",
        light: "Holy warrior bathed in divine light, golden armor, radiant sword, heavenly atmosphere",
        dark: "Dark knight with shadow-infused armor, corrupted weapons, ominous purple glow",
        physical: "Classic warrior with polished steel armor, traditional weapons, realistic medieval setting"
      },
      
      mago: {
        fire: "Fire sorcerer with flame-wreathed robes, burning staff, magical fire orbs, warm magical glow",
        ice: "Ice mage with frost-covered robes, crystalline staff, frozen magical effects, cool atmosphere",
        thunder: "Storm wizard with lightning staff, electric robes, crackling magical energy, dynamic pose",
        earth: "Earth mage with nature-themed robes, wooden staff with crystal, earthy magical effects",
        light: "Light sorceress with radiant white robes, glowing staff, divine magical aura, heavenly light",
        dark: "Dark sorcerer with shadow robes, cursed staff, dark magical energy, mysterious atmosphere",
        physical: "Battle mage with practical robes, enchanted weapons, realistic magical effects"
      },

      ladino: {
        fire: "Fire rogue with flame-edged daggers, dark red leather, ember trails, stealthy fire effects",
        ice: "Frost assassin with ice daggers, blue-tinted leather, cold mist, winter stealth",
        thunder: "Lightning rogue with electric daggers, crackling energy, quick movement blur, storm effects",
        earth: "Earth scout with nature camouflage, wooden weapons, forest stealth, natural concealment",
        light: "Holy thief with blessed daggers, light leather armor, divine stealth, righteous glow",
        dark: "Shadow assassin cloaked in darkness, void daggers, purple smoke, mysterious stealth",
        physical: "Classic rogue with steel daggers, black leather, realistic stealth gear"
      },

      clerigo: {
        fire: "Fire cleric with flame-blessed robes, burning holy symbol, warm divine light, sacred fire",
        ice: "Frost priestess with ice-blue robes, crystalline holy symbol, cold divine aura, winter blessing",
        thunder: "Storm cleric with lightning staff, electric divine energy, dynamic holy power, storm blessing",
        earth: "Nature priest with earth-toned robes, wooden staff, natural divine connection, forest blessing",
        light: "Holy cleric bathed in radiant light, white and gold robes, glowing runes, heavenly atmosphere",
        dark: "Dark priestess with black and violet robes, faint ghostly aura, cursed runes, somber lighting",
        physical: "Traditional cleric with simple robes, wooden staff, realistic holy symbols"
      },

      patrulheiro: {
        fire: "Fire ranger with flame bow, red-brown leather, burning arrows, forest fire atmosphere",
        ice: "Frost ranger with ice bow, blue leather armor, frozen arrows, winter forest setting",
        thunder: "Storm ranger with lightning bow, electric arrows, dynamic weather effects, storm forest",
        earth: "Earth ranger with wooden bow, green leather, nature arrows, deep forest connection",
        light: "Light ranger with blessed bow, golden leather, radiant arrows, sacred forest guardian",
        dark: "Shadow ranger with dark bow, black leather, void arrows, mysterious forest depths",
        physical: "Classic ranger with traditional bow, brown leather, steel arrows, realistic forest"
      },

      paladino: {
        fire: "Fire paladin with blazing sword, red-gold armor, flame aura, righteous fire",
        ice: "Frost paladin with ice sword, blue-silver armor, cold divine power, winter justice",
        thunder: "Storm paladin with lightning sword, electric armor, divine thunder, righteous storm",
        earth: "Earth paladin with stone sword, brown-gold armor, nature blessing, grounded justice",
        light: "Noble paladin holding shining sword, silver and gold armor radiating holy energy, divine atmosphere",
        dark: "Fallen paladin with dark armor and corrupted aura, violet-black glow, cracks of red energy",
        physical: "Traditional paladin with polished armor, blessed sword, realistic holy warrior"
      },

      arqueiro: {
        fire: "Fire archer with flame bow, red leather armor, burning arrows, fiery precision",
        ice: "Frost archer with ice bow, blue leather, frozen arrows, cold precision",
        thunder: "Lightning archer with electric bow, crackling arrows, storm precision, dynamic energy",
        earth: "Earth archer with wooden bow, green leather, nature arrows, forest precision",
        light: "Light archer with blessed bow, golden leather, radiant arrows, divine precision",
        dark: "Shadow archer with dark bow, black leather, void arrows, mysterious precision",
        physical: "Classic archer with traditional bow, brown leather, steel arrows, realistic precision"
      }
    };

    const specificPrompt = detailedClassPrompts[hero.class]?.[hero.element];
    
    if (specificPrompt) {
      return `${promptConfig.basePrompt}, ${specificPrompt}, ${promptConfig.standardRequirements}`;
    }
    
    return generatePrompt(hero);
  };

  const getClassElementCombinations = () => {
    const combinations = [];
    
    for (const heroClass of Object.keys(promptConfig.classVariations) as HeroClass[]) {
      for (const element of Object.keys(promptConfig.elementVariations) as Element[]) {
        combinations.push({
          class: heroClass,
          element: element,
          prompt: generateDetailedPrompt({ class: heroClass, element: element } as Hero)
        });
      }
    }
    
    return combinations;
  };

  return {
    generatePrompt,
    generateDetailedPrompt,
    getClassElementCombinations,
    promptConfig
  };
};

export default useHeroAIPrompts;