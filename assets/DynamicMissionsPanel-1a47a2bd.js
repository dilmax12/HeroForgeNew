import{j as e,A as z,m as v}from"./motion-3c015c26.js";import{r as o}from"./vendor-374d307f.js";import{d as g}from"./dynamicMissionsAI-cc3e32c1.js";import{b as O,s as R,m as i,c as X}from"./index-324810f8.js";import"./router-6c8d423a.js";import"./supabase-4349ac75.js";import"./icons-5fe8db7b.js";const W=({hero:a,className:S="",onMissionAccept:p,onMissionComplete:Z})=>{var M;const[L,T]=o.useState([]),[l,x]=o.useState(null),[u,m]=o.useState(null),[b,N]=o.useState(!1),[P,w]=o.useState(!1),[$,h]=o.useState(null),[G,I]=o.useState("available"),{activeSeasonalTheme:f}=O(),A=f&&((M=R[f])==null?void 0:M.border)||"border-white/20",k=o.useCallback(async()=>{N(!0),h(null);try{if(!a){h("Nenhum herói selecionado. Selecione um herói para gerar missões.");return}const s=await Promise.all([g.generateMission({hero:a,missionType:"combat",difficulty:"medium",context:"Missão principal focada em combate"}),g.generateMission({hero:a,missionType:"exploration",difficulty:"easy",context:"Missão secundária de exploração"}),g.generateMission({hero:a,missionType:"social",difficulty:"easy",context:"Objetivo diário com interação social"})]);T(s)}catch(s){h("Falha ao gerar missões. Tente novamente."),console.error("Mission generation error:",s)}finally{N(!1)}},[a]),B=o.useCallback(async s=>{var n,c;w(!0);try{if(!a)return;const t=((c=(n=s.npcDialogue)==null?void 0:n[0])==null?void 0:c.npcName)||"NPC",d=`${s.title}: ${s.description}`,y=await g.generateNPCDialogue(a,t,d);m(y)}catch(t){console.error("Dialogue generation error:",t)}finally{w(!1)}},[a]),E=o.useCallback(s=>{x(s),B(s)},[a]),Y=o.useCallback(s=>{p==null||p(s),x(null),m(null)},[p]);o.useEffect(()=>{k()},[a]);const F=s=>{switch(s.toLowerCase()){case"easy":return"#4ade80";case"medium":return"#fbbf24";case"hard":return"#f87171";case"legendary":return"#a855f7";default:return i.colors.text.secondary}},C=s=>{switch(s){case"main":return"⚔️";case"side":return"🗡️";case"daily":return"📅";default:return"📜"}};return e.jsx("div",{className:S,children:e.jsxs("div",{className:`dynamic-missions-panel rounded-xl border ${A}`,children:[e.jsx("style",{children:`
        .dynamic-missions-panel {
          background: ${i.colors.background.secondary};
          border: 2px solid ${i.colors.accent.gold};
          border-radius: 12px;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${i.colors.accent.gold};
        }

        .panel-title {
          color: ${i.colors.text.primary};
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

        .generate-button {
          background: linear-gradient(135deg, ${i.colors.accent.gold}, #b8860b);
          color: ${i.colors.text.primary};
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(218, 165, 32, 0.4);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(218, 165, 32, 0.3);
        }

        .tab {
          background: none;
          border: none;
          padding: 12px 20px;
          color: ${i.colors.text.secondary};
          cursor: pointer;
          transition: all 0.3s ease;
          border-bottom: 2px solid transparent;
        }

        .tab.active {
          color: ${i.colors.accent.gold};
          border-bottom-color: ${i.colors.accent.gold};
        }

        .missions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .mission-card {
          background: ${i.colors.background.primary};
          border: 1px solid ${i.colors.accent.gold};
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .mission-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.3);
          border-color: ${i.colors.accent.gold};
        }

        .mission-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .mission-title {
          color: ${i.colors.text.primary};
          font-size: 16px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mission-difficulty {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .mission-description {
          color: ${i.colors.text.secondary};
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .mission-objectives {
          margin-bottom: 12px;
        }

        .objective-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: ${i.colors.text.secondary};
          margin-bottom: 4px;
        }

        .mission-rewards {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .reward-item {
          background: rgba(218, 165, 32, 0.2);
          color: ${i.colors.accent.gold};
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: bold;
        }

        .mission-npc {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: ${i.colors.text.secondary};
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(218, 165, 32, 0.3);
          border-top: 2px solid ${i.colors.accent.gold};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          color: ${i.colors.accent.crimson};
          text-align: center;
          padding: 16px;
          background: rgba(220, 20, 60, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(220, 20, 60, 0.3);
        }

        .mission-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: ${i.colors.background.secondary};
          border: 2px solid ${i.colors.accent.gold};
          border-radius: 12px;
          padding: 24px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${i.colors.accent.gold};
        }

        .close-button {
          background: none;
          border: none;
          color: ${i.colors.text.secondary};
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dialogue-section {
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border-left: 4px solid ${i.colors.accent.gold};
        }

        .npc-name {
          color: ${i.colors.accent.gold};
          font-weight: bold;
          margin-bottom: 8px;
        }

        .dialogue-text {
          color: ${i.colors.text.primary};
          font-style: italic;
          line-height: 1.5;
        }

        .accept-button {
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          margin-top: 16px;
        }

        .accept-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
        }
      `}),e.jsxs("div",{className:"panel-header",children:[e.jsxs("div",{className:"panel-title",children:["🗡️ Missões Dinâmicas",e.jsxs("div",{className:"ai-badge",children:[e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"})}),"IA"]})]}),e.jsx("button",{className:"generate-button",onClick:k,disabled:b,style:{backgroundImage:(()=>{const{from:s,to:n}=X(f);return`linear-gradient(135deg, ${s}, ${n})`})()},children:b?"⏳ Gerando...":"🔄 Gerar Novas"})]}),e.jsx("div",{className:"tabs",children:["available","active","completed"].map(s=>e.jsxs("button",{className:`tab ${G===s?"active":""}`,onClick:()=>I(s),children:[s==="available"&&"📋 Disponíveis",s==="active"&&"⚔️ Ativas",s==="completed"&&"✅ Concluídas"]},s))}),b?e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"loading-spinner"}),e.jsx("div",{children:"Gerando missões personalizadas..."})]}):$?e.jsx("div",{className:"error-message",children:$}):e.jsx("div",{className:"missions-grid",children:e.jsx(z,{children:L.map((s,n)=>{var c;return e.jsxs(v.div,{className:"mission-card",initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{delay:n*.1},onClick:()=>E(s),children:[e.jsxs("div",{className:"mission-npc",children:[s.location?`📍 ${s.location}`:"📍 Local desconhecido",s.npcDialogue&&((c=s.npcDialogue[0])!=null&&c.npcName)?` • 👤 ${s.npcDialogue[0].npcName}`:""]}),e.jsxs("div",{className:"mission-header",children:[e.jsxs("div",{className:"mission-title",children:[C(s.type),s.title]}),e.jsx("div",{className:"mission-difficulty",style:{backgroundColor:F(s.difficulty),color:"white"},children:s.difficulty})]}),e.jsx("div",{className:"mission-description",children:s.description}),e.jsxs("div",{className:"mission-objectives",children:[s.objectives.slice(0,2).map((t,d)=>e.jsxs("div",{className:"objective-item",children:[e.jsx("span",{children:"•"}),e.jsx("span",{children:t.description})]},d)),s.objectives.length>2&&e.jsxs("div",{className:"objective-item",children:[e.jsx("span",{children:"•"}),e.jsxs("span",{children:["+",s.objectives.length-2," mais..."]})]})]}),e.jsx("div",{className:"mission-rewards",children:(()=>{const t=Array.isArray(s.rewards)?s.rewards:[],d=t.filter(r=>r.type==="gold").reduce((r,j)=>r+(j.amount||0),0),y=t.filter(r=>r.type==="experience").reduce((r,j)=>r+(j.amount||0),0),D=t.filter(r=>r.type==="item").length;return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"reward-item",children:["💰 ",d," ouro"]}),e.jsxs("div",{className:"reward-item",children:["⭐ ",y," XP"]}),D>0&&e.jsxs("div",{className:"reward-item",children:["🎁 ",D," itens"]})]})})()})]},s.id)})})}),e.jsx(z,{children:l&&e.jsx(v.div,{className:"mission-modal",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:s=>{s.target===s.currentTarget&&(x(null),m(null))},children:e.jsxs(v.div,{className:"modal-content",initial:{scale:.8,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.8,opacity:0},transition:{type:"spring",damping:20},children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("div",{className:"mission-title",children:[C(l.type),l.title]}),e.jsx("button",{className:"close-button",onClick:()=>{x(null),m(null)},children:"×"})]}),P?e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"loading-spinner"}),e.jsx("div",{children:"Gerando diálogo do NPC..."})]}):u&&e.jsxs("div",{className:"dialogue-section",children:[e.jsxs("div",{className:"npc-name",children:[u.npcName,":"]}),e.jsxs("div",{className:"dialogue-text",children:['"',u.dialogue,'"']})]}),e.jsx("div",{className:"mission-description",style:{marginBottom:"16px"},children:l.description}),e.jsxs("div",{className:"mission-objectives",style:{marginBottom:"16px"},children:[e.jsx("strong",{style:{color:i.colors.text.primary},children:"Objetivos:"}),l.objectives.map((s,n)=>e.jsxs("div",{className:"objective-item",children:[e.jsx("span",{children:"•"}),e.jsx("span",{children:s.description})]},n))]}),e.jsx("button",{className:"accept-button",onClick:()=>Y(l),children:"⚔️ Aceitar Missão"})]})})})]})})};export{W as DynamicMissionsPanel,W as default};
//# sourceMappingURL=DynamicMissionsPanel-1a47a2bd.js.map
