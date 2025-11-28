import{j as e,A as P,m as l}from"./motion-3c015c26.js";import{r}from"./vendor-374d307f.js";import{b as G,s as D,r as c,m as s,c as F}from"./index-324810f8.js";import"./router-6c8d423a.js";import"./supabase-4349ac75.js";import"./icons-5fe8db7b.js";const H=({hero:i,className:v="",onRecommendationApply:d})=>{var y;const[f,j]=r.useState([]),[N,w]=r.useState([]),[o,k]=r.useState(null),[$,z]=r.useState([]),[m,u]=r.useState(!1),[b,x]=r.useState(null),[n,C]=r.useState("general"),[p,S]=r.useState(null),{activeSeasonalTheme:g}=G(),L=g&&((y=D[g])==null?void 0:y.border)||"border-white/20",h=r.useCallback(async()=>{u(!0),x(null);try{if(!i){x("Nenhum herói selecionado. Selecione um herói para gerar recomendações.");return}const[a,t,T,E]=await Promise.all([c.generateRecommendations({hero:i,maxRecommendations:5,context:{recentActivities:[],currentGoals:[],weaknesses:[],strengths:[],availableTime:"medium",preferredActivities:[]}}),c.analyzeHeroWeaknesses(i),c.suggestOptimalBuild(i),c.generateDailyGoals(i)]);j(a),w(t),k(T),z(E)}catch(a){x("Falha ao gerar recomendações. Tente novamente."),console.warn("Recommendations generation warning:",a)}finally{u(!1)}},[i]),A=r.useCallback(a=>{d==null||d(a)},[d]);r.useEffect(()=>{h()},[i]);const I=a=>{switch((a||"").toLowerCase()){case"critical":return"#dc2626";case"high":return"#f87171";case"medium":return"#fbbf24";case"low":return"#4ade80";default:return s.colors.text.secondary}},B=a=>{switch((a||"").toLowerCase()){case"critical":return"🚨";case"high":return"🔥";case"medium":return"⚡";case"low":return"💡";default:return"📝"}},R=a=>{switch((a||"").toLowerCase()){case"training":return"🎯";case"quest":return"🗺️";case"equipment":return"🛡️";case"strategy":return"🧠";case"social":return"👥";case"progression":return"📈";default:return"📋"}};return e.jsx("div",{className:v,children:e.jsxs("div",{className:`ai-recommendations-panel rounded-xl border ${L}`,children:[e.jsx("style",{children:`
        .ai-recommendations-panel {
          background: ${s.colors.background.secondary};
          border: 2px solid ${s.colors.accent.gold};
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
          border-bottom: 1px solid ${s.colors.accent.gold};
        }

        .panel-title {
          color: ${s.colors.text.primary};
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
          background: linear-gradient(135deg, ${s.colors.accent.gold}, #b8860b);
          color: ${s.colors.text.primary};
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
          color: ${s.colors.text.secondary};
          font-size: 12px;
          margin-bottom: 4px;
        }

        .summary-value {
          color: ${s.colors.text.primary};
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
          color: ${s.colors.text.secondary};
          cursor: pointer;
          transition: all 0.3s ease;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
          font-size: 14px;
        }

        .tab.active {
          color: ${s.colors.accent.gold};
          border-bottom-color: ${s.colors.accent.gold};
        }

        .content-section {
          min-height: 300px;
        }

        .recommendations-grid {
          display: grid;
          gap: 16px;
        }

        .recommendation-card {
          background: ${s.colors.background.primary};
          border: 1px solid ${s.colors.accent.gold};
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
          border-color: ${s.colors.accent.gold};
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.3);
        }

        .recommendation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .recommendation-title {
          color: ${s.colors.text.primary};
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
          color: ${s.colors.text.secondary};
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
          background: ${s.colors.background.secondary};
          color: ${s.colors.text.secondary};
          border: 1px solid ${s.colors.accent.gold};
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .details-button:hover {
          background: ${s.colors.accent.gold};
          color: ${s.colors.text.primary};
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
          color: ${s.colors.text.primary};
          font-size: 14px;
        }

        .build-suggestion {
          background: ${s.colors.background.primary};
          border: 1px solid ${s.colors.accent.gold};
          border-radius: 8px;
          padding: 20px;
        }

        .build-title {
          color: ${s.colors.text.primary};
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
          color: ${s.colors.text.secondary};
          font-size: 12px;
          margin-bottom: 4px;
        }

        .stat-value {
          color: ${s.colors.accent.gold};
          font-size: 16px;
          font-weight: bold;
        }

        .goals-list {
          display: grid;
          gap: 12px;
        }

        .goal-item {
          background: ${s.colors.background.primary};
          border: 1px solid ${s.colors.accent.gold};
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .goal-checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid ${s.colors.accent.gold};
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${s.colors.accent.gold};
        }

        .goal-text {
          color: ${s.colors.text.primary};
          font-size: 14px;
          flex: 1;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: ${s.colors.text.secondary};
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(218, 165, 32, 0.3);
          border-top: 2px solid ${s.colors.accent.gold};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          color: ${s.colors.accent.crimson};
          text-align: center;
          padding: 16px;
          background: rgba(220, 20, 60, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(220, 20, 60, 0.3);
        }
      `}),e.jsxs("div",{className:"panel-header",children:[e.jsxs("div",{className:"panel-title",children:["🧠 Recomendações IA",e.jsxs("div",{className:"ai-badge",children:[e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"})}),"IA"]})]}),e.jsx("button",{className:"refresh-button",onClick:h,disabled:m,style:{backgroundImage:(()=>{const{from:a,to:t}=F(g);return`linear-gradient(135deg, ${a}, ${t})`})()},children:m?"⏳ Analisando...":"🔄 Atualizar"})]}),e.jsxs("div",{className:"hero-summary",children:[e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Nível"}),e.jsx("div",{className:"summary-value",children:i.progression.level})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Classe"}),e.jsx("div",{className:"summary-value",children:i.class})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Força"}),e.jsx("div",{className:"summary-value",children:i.attributes.strength})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Agilidade"}),e.jsx("div",{className:"summary-value",children:i.attributes.agility})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Inteligência"}),e.jsx("div",{className:"summary-value",children:i.attributes.intelligence})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Vitalidade"}),e.jsx("div",{className:"summary-value",children:i.attributes.vitality})]})]}),e.jsx("div",{className:"tabs",children:["general","build","goals","weaknesses"].map(a=>e.jsxs("button",{className:`tab ${n===a?"active":""}`,onClick:()=>C(a),children:[a==="general"&&"📋 Geral",a==="build"&&"🛡️ Build Ideal",a==="goals"&&"🎯 Metas Diárias",a==="weaknesses"&&"⚠️ Fraquezas"]},a))}),e.jsx("div",{className:"content-section",children:m?e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"loading-spinner"}),e.jsx("div",{children:"Analisando seu herói e gerando recomendações..."})]}):b?e.jsx("div",{className:"error-message",children:b}):e.jsxs(P,{mode:"wait",children:[n==="general"&&e.jsx(l.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"recommendations-grid",children:f.map(a=>e.jsxs("div",{className:`recommendation-card ${p===a.id?"expanded":""}`,onClick:()=>S(p===a.id?null:a.id),children:[e.jsxs("div",{className:"recommendation-header",children:[e.jsxs("div",{className:"recommendation-title",children:[R(a.type),a.title]}),e.jsxs("div",{className:"priority-badge",style:{backgroundColor:I(a.priority),color:"white"},children:[B(a.priority),a.priority]})]}),e.jsx("div",{className:"recommendation-description",children:a.description}),p===a.id&&e.jsxs(l.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},className:"recommendation-actions",children:[e.jsx("button",{className:"apply-button",onClick:t=>{t.stopPropagation(),A(a)},children:"✅ Aplicar"}),e.jsx("button",{className:"details-button",children:"📖 Mais Detalhes"})]})]},a.id))},"general"),n==="build"&&o&&e.jsxs(l.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"build-suggestion",children:[e.jsxs("div",{className:"build-title",children:["🛡️ Build Recomendado para ",i.class]}),e.jsxs("div",{className:"build-stats",children:[e.jsxs("div",{className:"stat-item",children:[e.jsx("div",{className:"stat-name",children:"Força"}),e.jsx("div",{className:"stat-value",children:o.strength||25})]}),e.jsxs("div",{className:"stat-item",children:[e.jsx("div",{className:"stat-name",children:"Agilidade"}),e.jsx("div",{className:"stat-value",children:o.agility||20})]}),e.jsxs("div",{className:"stat-item",children:[e.jsx("div",{className:"stat-name",children:"Inteligência"}),e.jsx("div",{className:"stat-value",children:o.intelligence||15})]}),e.jsxs("div",{className:"stat-item",children:[e.jsx("div",{className:"stat-name",children:"Vitalidade"}),e.jsx("div",{className:"stat-value",children:o.vitality||30})]})]}),e.jsx("div",{style:{color:s.colors.text.secondary,fontSize:"14px"},children:"Esta distribuição de atributos é otimizada para sua classe e estilo de jogo atual. Considere redistribuir seus pontos de atributo para maximizar sua efetividade."})]},"build"),n==="goals"&&e.jsx(l.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"goals-list",children:$.map((a,t)=>e.jsxs("div",{className:"goal-item",children:[e.jsx("div",{className:"goal-checkbox",children:"☐"}),e.jsx("div",{className:"goal-text",children:a})]},t))},"goals"),n==="weaknesses"&&e.jsx(l.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"weaknesses-list",children:N.map((a,t)=>e.jsxs("div",{className:"weakness-item",children:[e.jsx("div",{className:"weakness-icon",children:"⚠️"}),e.jsx("div",{className:"weakness-text",children:a})]},t))},"weaknesses")]})})]})})};export{H as AIRecommendationsPanel,H as default};
//# sourceMappingURL=AIRecommendationsPanel-1dfb27be.js.map
