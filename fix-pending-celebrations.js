const fs = require('fs');
const path = require('path');

// Função para aplicar correções em um arquivo
function fixFile(filePath, replacements) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    replacements.forEach(({ search, replace }) => {
      if (content.includes(search)) {
        content = content.replace(search, replace);
        modified = true;
        console.log(`✓ Aplicada correção em ${filePath}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Arquivo ${filePath} salvo com correções`);
    }
  } catch (error) {
    console.error(`Erro ao processar ${filePath}:`, error.message);
  }
}

// Correções para App.tsx
const appTsxPath = path.join(__dirname, 'src', 'App.tsx');
const appTsxReplacements = [
  {
    search: 'hero.rankData.pendingCelebrations.map((celebration, index) => ({',
    replace: '(hero.rankData?.pendingCelebrations || []).map((celebration, index) => ({'
  }
];

// Correções para heroStore.ts
const heroStorePath = path.join(__dirname, 'src', 'store', 'heroStore.ts');
const heroStoreReplacements = [
  {
    search: 'if (!hero || !hero.rankData.pendingCelebrations[celebrationIndex]) return;',
    replace: 'if (!hero || !hero.rankData?.pendingCelebrations?.[celebrationIndex]) return;'
  },
  {
    search: 'const updatedCelebrations = [...hero.rankData.pendingCelebrations];',
    replace: 'const updatedCelebrations = [...(hero.rankData?.pendingCelebrations || [])];'
  }
];

// Correções para EvolutionPanel.tsx
const evolutionPanelPath = path.join(__dirname, 'src', 'components', 'EvolutionPanel.tsx');
const evolutionPanelReplacements = [
  {
    search: '{rankProgress.rankData.pendingCelebrations.length > 0 && (',
    replace: '{(rankProgress.rankData?.pendingCelebrations?.length || 0) > 0 && ('
  },
  {
    search: '{rankProgress.rankData.pendingCelebrations.length} nova(s) conquista(s)!',
    replace: '{rankProgress.rankData?.pendingCelebrations?.length || 0} nova(s) conquista(s)!'
  }
];

console.log('🔧 Iniciando correções de pendingCelebrations...');

// Aplicar correções
fixFile(appTsxPath, appTsxReplacements);
fixFile(heroStorePath, heroStoreReplacements);
fixFile(evolutionPanelPath, evolutionPanelReplacements);

console.log('✅ Todas as correções foram aplicadas!');