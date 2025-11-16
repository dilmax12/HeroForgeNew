import{j as e,A as F,m as f}from"./motion-3c015c26.js";import{r as x}from"./vendor-374d307f.js";import{a as h,b as B,s as G,m as r,c as M}from"./index-40f90f1d.js";import"./router-99079b6a.js";import"./supabase-4349ac75.js";class L{parseJsonResponse(a){const s=n=>{let l=n.trim();return l=l.replace(/^```\s*json\s*/i,"").replace(/^```\s*/i,""),l=l.replace(/```\s*$/i,"").trim(),l},o=n=>{let l="",d=!1,u=null,p=!1;for(let b=0;b<n.length;b++){const c=n[b];if(!d){(c==='"'||c==="'")&&!p&&(d=!0,u=c),l+=c,p=c==="\\"?!p:!1;continue}if(!p&&c===u){d=!1,u=null,l+=c,p=!1;continue}if(!p&&(c===`
`||c==="\r")){l+=c===`
`?"\\n":"\\r",p=!1;continue}l+=c,p?p=!1:p=c==="\\"}return l},t=o(s(a));try{return JSON.parse(t)}catch{const n=t.indexOf("{"),l=t.lastIndexOf("}");if(n!==-1&&l!==-1&&l>n){const u=o(t.slice(n,l+1));return JSON.parse(u)}const d=o(t).split(`
`).filter(u=>!u.trim().startsWith("//")).join(`
`);return JSON.parse(d)}}getSystemPrompt(){return`Você é um conselheiro especialista em RPG medieval fantástico, focado em ajudar heróis a otimizar sua progressão e experiência de jogo.

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
- Progressão natural e sustentável`}buildRecommendationPrompt(a){var l,d,u,p,b;const{hero:s,context:o,maxRecommendations:t}=a;let n=`Analise o perfil do herói e forneça ${t||3} recomendações personalizadas.

PERFIL DO HERÓI:
- Nome: ${s.name}
- Classe: ${s.class}
- Nível: ${s.progression.level}
- Rank: ${s.rank||"F"}
- Atributos: ${Object.entries(s.attributes).map(([c,y])=>`${c}: ${y}`).join(", ")}`;return s.achievements&&s.achievements.length>0&&(n+=`
- Conquistas: ${s.achievements.slice(-5).map(c=>c.title).join(", ")}`),o&&(n+=`

CONTEXTO ADICIONAL:`,(l=o.recentActivities)!=null&&l.length&&(n+=`
- Atividades recentes: ${o.recentActivities.join(", ")}`),(d=o.currentGoals)!=null&&d.length&&(n+=`
- Objetivos atuais: ${o.currentGoals.join(", ")}`),(u=o.weaknesses)!=null&&u.length&&(n+=`
- Pontos fracos: ${o.weaknesses.join(", ")}`),(p=o.strengths)!=null&&p.length&&(n+=`
- Pontos fortes: ${o.strengths.join(", ")}`),o.availableTime&&(n+=`
- Tempo disponível: ${o.availableTime}`),(b=o.preferredActivities)!=null&&b.length&&(n+=`
- Atividades preferidas: ${o.preferredActivities.join(", ")}`)),n+=`

FORNEÇA RECOMENDAÇÕES EM JSON:
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
- strategy: Táticas e estratégias de combate`,n}async generateRecommendations(a){try{if(!h.isConfigured())return this.generateFallbackRecommendations(a);const s=await h.generateText({prompt:this.buildRecommendationPrompt(a),systemMessage:this.getSystemPrompt(),maxTokens:1e3,temperature:.7});return this.parseJsonResponse(s.text).recommendations.map(t=>({id:this.generateRecommendationId(),type:t.type,priority:t.priority,title:t.title,description:t.description,reasoning:t.reasoning,actionSteps:t.actionSteps||[],estimatedBenefit:t.estimatedBenefit,estimatedTime:t.estimatedTime,prerequisites:t.prerequisites,relatedAchievements:t.relatedAchievements}))}catch(s){return console.warn("Error generating recommendations, using fallback:",s),this.generateFallbackRecommendations(a)}}async analyzeHeroWeaknesses(a){try{if(!h.isConfigured())return this.getFallbackWeaknesses(a);const s=`Analise os atributos do herói ${a.name} e identifique pontos fracos:

Atributos:
${Object.entries(a.attributes).map(([t,n])=>`- ${t}: ${n}`).join(`
`)}

Classe: ${a.class}
Nível: ${a.progression.level}

Identifique 2-3 pontos fracos principais baseados nos atributos mais baixos e na classe do herói.
Responda apenas com uma lista simples, uma fraqueza por linha.`;return(await h.generateText({prompt:s,systemMessage:"Você é um analista especializado em balanceamento de personagens de RPG.",maxTokens:150,temperature:.5})).text.split(`
`).map(t=>t.trim()).filter(t=>t.length>0).slice(0,3)}catch(s){return console.error("Error analyzing weaknesses:",s),this.getFallbackWeaknesses(a)}}async suggestOptimalBuild(a){try{if(!h.isConfigured())return this.getFallbackBuild(a);const s=`Sugira um build otimizado para ${a.name} (${a.class}, nível ${a.progression.level}):

Atributos atuais:
${Object.entries(a.attributes).map(([t,n])=>`- ${t}: ${n}`).join(`
`)}

Forneça em JSON:
{
  "attributePriorities": ["Atributo mais importante", "Segundo mais importante", "Terceiro"],
  "skillRecommendations": ["Habilidade 1", "Habilidade 2", "Habilidade 3"],
  "equipmentSuggestions": ["Equipamento 1", "Equipamento 2", "Equipamento 3"],
  "playstyleAdvice": "Conselho sobre estilo de jogo (100-150 palavras)"
}`,o=await h.generateText({prompt:s,systemMessage:"Você é um especialista em builds otimizados para RPG medieval.",maxTokens:400,temperature:.6});return this.parseJsonResponse(o.text)}catch(s){return console.warn("Error suggesting optimal build, using fallback:",s),this.getFallbackBuild(a)}}async generateDailyGoals(a,s){var o,t;try{if(!h.isConfigured())return this.getFallbackDailyGoals(a);const n=`Gere 3-5 objetivos diários personalizados para ${a.name}:

Herói: ${a.name} (${a.class}, nível ${a.progression.level}, rank ${a.rank||"F"})

${s?`
Contexto:
- Tempo disponível: ${s.availableTime}
- Atividades preferidas: ${((o=s.preferredActivities)==null?void 0:o.join(", "))||"Não especificado"}
- Objetivos atuais: ${((t=s.currentGoals)==null?void 0:t.join(", "))||"Não especificado"}
`:""}

Os objetivos devem ser:
- Específicos e mensuráveis
- Apropriados para o nível do herói
- Variados e interessantes
- Realizáveis no tempo disponível

Responda apenas com uma lista simples, um objetivo por linha.`;return(await h.generateText({prompt:n,systemMessage:"Você cria objetivos diários motivadores para jogadores de RPG.",maxTokens:200,temperature:.8})).text.split(`
`).map(d=>d.trim()).filter(d=>d.length>0).slice(0,5)}catch(n){return console.warn("Error generating daily goals, using fallback:",n),this.getFallbackDailyGoals(a)}}generateRecommendationId(){return`rec_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}generateFallbackRecommendations(a){const{hero:s}=a,o=[],t=Object.entries(s.attributes).sort(([,n],[,l])=>n-l)[0];return o.push({id:this.generateRecommendationId(),type:"training",priority:"medium",title:`Treinar ${t[0]}`,description:`Seu atributo ${t[0]} está abaixo da média. Focar no treinamento deste atributo melhorará significativamente sua performance geral.`,reasoning:`${t[0]} é seu atributo mais fraco e limitante.`,actionSteps:["Encontre um instrutor especializado","Complete exercícios de treinamento","Pratique regularmente"],estimatedBenefit:"Melhoria significativa na performance",estimatedTime:"1-2 horas de jogo"}),o.push({id:this.generateRecommendationId(),type:"quest",priority:"high",title:"Missão de Progressão",description:`Como ${s.class} de nível ${s.progression.level}, você deveria focar em missões que desafiem suas habilidades atuais e ofereçam boa experiência.`,reasoning:"Progressão constante é essencial para o desenvolvimento.",actionSteps:["Procure missões apropriadas para seu nível","Prepare equipamentos adequados","Execute a missão com cuidado"],estimatedBenefit:"Experiência e recompensas valiosas",estimatedTime:"30-45 minutos"}),o}getFallbackWeaknesses(a){return Object.entries(a.attributes).sort(([,o],[,t])=>o-t).slice(0,2).map(([o])=>`${o} baixo para a classe ${a.class}`)}getFallbackBuild(a){return{attributePriorities:{Warrior:["strength","constitution","agility"],Mage:["intelligence","wisdom","constitution"],Rogue:["agility","intelligence","strength"],Paladin:["strength","charisma","constitution"],Ranger:["agility","wisdom","strength"],Cleric:["wisdom","charisma","constitution"]}[a.class]||["strength","constitution","agility"],skillRecommendations:["Habilidade de classe principal","Habilidade de sobrevivência","Habilidade social"],equipmentSuggestions:["Arma principal melhorada","Armadura defensiva","Acessório de atributo"],playstyleAdvice:`Como ${a.class}, foque em suas habilidades naturais enquanto desenvolve áreas complementares para um personagem bem equilibrado.`}}getFallbackDailyGoals(a){return[`Completar 2 missões apropriadas para nível ${a.progression.level}`,"Treinar atributo mais fraco por 30 minutos","Interagir com 3 NPCs diferentes","Coletar recursos para crafting","Participar de uma atividade social"]}}const j=new L,Y=({hero:m,className:a="",onRecommendationApply:s})=>{var R;const[o,t]=x.useState([]),[n,l]=x.useState([]),[d,u]=x.useState(null),[p,b]=x.useState([]),[c,y]=x.useState(!1),[w,$]=x.useState(null),[v,P]=x.useState("general"),[N,C]=x.useState(null),{activeSeasonalTheme:k}=B(),S=k&&((R=G[k])==null?void 0:R.border)||"border-white/20",A=x.useCallback(async()=>{y(!0),$(null);try{if(!m){$("Nenhum herói selecionado. Selecione um herói para gerar recomendações.");return}const[i,g,O,I]=await Promise.all([j.generateRecommendations({hero:m,maxRecommendations:5,context:{recentActivities:[],currentGoals:[],weaknesses:[],strengths:[],availableTime:"medium",preferredActivities:[]}}),j.analyzeHeroWeaknesses(m),j.suggestOptimalBuild(m),j.generateDailyGoals(m)]);t(i),l(g),u(O),b(I)}catch(i){$("Falha ao gerar recomendações. Tente novamente."),console.warn("Recommendations generation warning:",i)}finally{y(!1)}},[m]),z=x.useCallback(i=>{s==null||s(i)},[s]);x.useEffect(()=>{A()},[m]);const T=i=>{switch((i||"").toLowerCase()){case"critical":return"#dc2626";case"high":return"#f87171";case"medium":return"#fbbf24";case"low":return"#4ade80";default:return r.colors.text.secondary}},q=i=>{switch((i||"").toLowerCase()){case"critical":return"🚨";case"high":return"🔥";case"medium":return"⚡";case"low":return"💡";default:return"📝"}},E=i=>{switch((i||"").toLowerCase()){case"training":return"🎯";case"quest":return"🗺️";case"equipment":return"🛡️";case"strategy":return"🧠";case"social":return"👥";case"progression":return"📈";default:return"📋"}};return e.jsx("div",{className:a,children:e.jsxs("div",{className:`ai-recommendations-panel rounded-xl border ${S}`,children:[e.jsx("style",{children:`
        .ai-recommendations-panel {
          background: ${r.colors.background.secondary};
          border: 2px solid ${r.colors.accent.gold};
          border-radius: 12px;
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${r.colors.accent.gold};
        }

        .panel-title {
          color: ${r.colors.text.primary};
          font-size: 24px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-badge {
          background: linear-gradient(135deg, #4169e1, #1e90ff);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .refresh-button {
          background: linear-gradient(135deg, ${r.colors.accent.gold}, #b8860b);
          color: ${r.colors.text.primary};
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .refresh-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(218, 165, 32, 0.4);
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .hero-summary {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .summary-item {
          text-align: center;
        }

        .summary-label {
          color: ${r.colors.text.secondary};
          font-size: 12px;
          margin-bottom: 4px;
        }

        .summary-value {
          color: ${r.colors.text.primary};
          font-size: 16px;
          font-weight: bold;
        }

        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(218, 165, 32, 0.3);
          overflow-x: auto;
        }

        .tab {
          background: none;
          border: none;
          padding: 12px 16px;
          color: ${r.colors.text.secondary};
          cursor: pointer;
          transition: all 0.3s ease;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
          font-size: 14px;
        }

        .tab.active {
          color: ${r.colors.accent.gold};
          border-bottom-color: ${r.colors.accent.gold};
        }

        .content-section {
          min-height: 300px;
        }

        .recommendations-grid {
          display: grid;
          gap: 16px;
        }

        .recommendation-card {
          background: ${r.colors.background.primary};
          border: 1px solid ${r.colors.accent.gold};
          border-radius: 8px;
          padding: 16px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .recommendation-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.3);
        }

        .recommendation-card.expanded {
          border-color: ${r.colors.accent.gold};
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.3);
        }

        .recommendation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .recommendation-title {
          color: ${r.colors.text.primary};
          font-size: 16px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .priority-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .recommendation-description {
          color: ${r.colors.text.secondary};
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .recommendation-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .apply-button {
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .apply-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
        }

        .details-button {
          background: ${r.colors.background.secondary};
          color: ${r.colors.text.secondary};
          border: 1px solid ${r.colors.accent.gold};
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .details-button:hover {
          background: ${r.colors.accent.gold};
          color: ${r.colors.text.primary};
        }

        .weaknesses-list {
          display: grid;
          gap: 12px;
        }

        .weakness-item {
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.3);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .weakness-icon {
          font-size: 24px;
        }

        .weakness-text {
          color: ${r.colors.text.primary};
          font-size: 14px;
        }

        .build-suggestion {
          background: ${r.colors.background.primary};
          border: 1px solid ${r.colors.accent.gold};
          border-radius: 8px;
          padding: 20px;
        }

        .build-title {
          color: ${r.colors.text.primary};
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .build-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-item {
          text-align: center;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
        }

        .stat-name {
          color: ${r.colors.text.secondary};
          font-size: 12px;
          margin-bottom: 4px;
        }

        .stat-value {
          color: ${r.colors.accent.gold};
          font-size: 16px;
          font-weight: bold;
        }

        .goals-list {
          display: grid;
          gap: 12px;
        }

        .goal-item {
          background: ${r.colors.background.primary};
          border: 1px solid ${r.colors.accent.gold};
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .goal-checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid ${r.colors.accent.gold};
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${r.colors.accent.gold};
        }

        .goal-text {
          color: ${r.colors.text.primary};
          font-size: 14px;
          flex: 1;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: ${r.colors.text.secondary};
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(218, 165, 32, 0.3);
          border-top: 2px solid ${r.colors.accent.gold};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          color: ${r.colors.accent.crimson};
          text-align: center;
          padding: 16px;
          background: rgba(220, 20, 60, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(220, 20, 60, 0.3);
        }
      `}),e.jsxs("div",{className:"panel-header",children:[e.jsxs("div",{className:"panel-title",children:["🧠 Recomendações IA",e.jsxs("div",{className:"ai-badge",children:[e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"})}),"IA"]})]}),e.jsx("button",{className:"refresh-button",onClick:A,disabled:c,style:{backgroundImage:(()=>{const{from:i,to:g}=M(k);return`linear-gradient(135deg, ${i}, ${g})`})()},children:c?"⏳ Analisando...":"🔄 Atualizar"})]}),e.jsxs("div",{className:"hero-summary",children:[e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Nível"}),e.jsx("div",{className:"summary-value",children:m.progression.level})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Classe"}),e.jsx("div",{className:"summary-value",children:m.class})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Força"}),e.jsx("div",{className:"summary-value",children:m.attributes.strength})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Agilidade"}),e.jsx("div",{className:"summary-value",children:m.attributes.agility})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Inteligência"}),e.jsx("div",{className:"summary-value",children:m.attributes.intelligence})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Vitalidade"}),e.jsx("div",{className:"summary-value",children:m.attributes.vitality})]})]}),e.jsx("div",{className:"tabs",children:["general","build","goals","weaknesses"].map(i=>e.jsxs("button",{className:`tab ${v===i?"active":""}`,onClick:()=>P(i),children:[i==="general"&&"📋 Geral",i==="build"&&"🛡️ Build Ideal",i==="goals"&&"🎯 Metas Diárias",i==="weaknesses"&&"⚠️ Fraquezas"]},i))}),e.jsx("div",{className:"content-section",children:c?e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"loading-spinner"}),e.jsx("div",{children:"Analisando seu herói e gerando recomendações..."})]}):w?e.jsx("div",{className:"error-message",children:w}):e.jsxs(F,{mode:"wait",children:[v==="general"&&e.jsx(f.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"recommendations-grid",children:o.map(i=>e.jsxs("div",{className:`recommendation-card ${N===i.id?"expanded":""}`,onClick:()=>C(N===i.id?null:i.id),children:[e.jsxs("div",{className:"recommendation-header",children:[e.jsxs("div",{className:"recommendation-title",children:[E(i.type),i.title]}),e.jsxs("div",{className:"priority-badge",style:{backgroundColor:T(i.priority),color:"white"},children:[q(i.priority),i.priority]})]}),e.jsx("div",{className:"recommendation-description",children:i.description}),N===i.id&&e.jsxs(f.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},className:"recommendation-actions",children:[e.jsx("button",{className:"apply-button",onClick:g=>{g.stopPropagation(),z(i)},children:"✅ Aplicar"}),e.jsx("button",{className:"details-button",children:"📖 Mais Detalhes"})]})]},i.id))},"general"),v==="build"&&d&&e.jsxs(f.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"build-suggestion",children:[e.jsxs("div",{className:"build-title",children:["🛡️ Build Recomendado para ",m.class]}),e.jsxs("div",{className:"build-stats",children:[e.jsxs("div",{className:"stat-item",children:[e.jsx("div",{className:"stat-name",children:"Força"}),e.jsx("div",{className:"stat-value",children:d.strength||25})]}),e.jsxs("div",{className:"stat-item",children:[e.jsx("div",{className:"stat-name",children:"Agilidade"}),e.jsx("div",{className:"stat-value",children:d.agility||20})]}),e.jsxs("div",{className:"stat-item",children:[e.jsx("div",{className:"stat-name",children:"Inteligência"}),e.jsx("div",{className:"stat-value",children:d.intelligence||15})]}),e.jsxs("div",{className:"stat-item",children:[e.jsx("div",{className:"stat-name",children:"Vitalidade"}),e.jsx("div",{className:"stat-value",children:d.vitality||30})]})]}),e.jsx("div",{style:{color:r.colors.text.secondary,fontSize:"14px"},children:"Esta distribuição de atributos é otimizada para sua classe e estilo de jogo atual. Considere redistribuir seus pontos de atributo para maximizar sua efetividade."})]},"build"),v==="goals"&&e.jsx(f.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"goals-list",children:p.map((i,g)=>e.jsxs("div",{className:"goal-item",children:[e.jsx("div",{className:"goal-checkbox",children:"☐"}),e.jsx("div",{className:"goal-text",children:i})]},g))},"goals"),v==="weaknesses"&&e.jsx(f.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"weaknesses-list",children:n.map((i,g)=>e.jsxs("div",{className:"weakness-item",children:[e.jsx("div",{className:"weakness-icon",children:"⚠️"}),e.jsx("div",{className:"weakness-text",children:i})]},g))},"weaknesses")]})})]})})};export{Y as AIRecommendationsPanel,Y as default};
//# sourceMappingURL=AIRecommendationsPanel-f358f4ee.js.map
