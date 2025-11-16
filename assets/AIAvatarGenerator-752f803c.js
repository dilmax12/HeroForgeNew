import{j as a,A as C,m as b}from"./motion-3c015c26.js";import{r as p}from"./vendor-374d307f.js";import{a as v,b as f,s as A,m as i,c as j}from"./index-40f90f1d.js";import"./router-99079b6a.js";import"./supabase-4349ac75.js";class z{buildHeroImagePrompt(e,r="portrait"){const n={Warrior:"armored warrior with sword and shield, strong and battle-hardened",Mage:"mystical spellcaster with robes and magical staff, wise and powerful",Rogue:"agile assassin with dark leather armor and daggers, stealthy and cunning",Paladin:"holy knight with shining armor and blessed weapon, noble and righteous",Ranger:"forest guardian with bow and nature-themed gear, skilled and alert"},o={portrait:"detailed portrait, head and shoulders","full-body":"full body character illustration",action:"dynamic action pose in combat"},d=Object.entries(e.attributes).sort(([,g],[,m])=>m-g)[0][0],l={strength:"muscular and powerful build",intelligence:"wise eyes and scholarly appearance",agility:"lean and athletic physique",charisma:"commanding presence and attractive features",constitution:"robust and healthy appearance",wisdom:"serene expression and thoughtful demeanor"};let c=`${o[r]} of ${e.name}, a level ${e.progression.level} ${n[e.class]||e.class}`;if(l[d]&&(c+=`, with ${l[d]}`),c+=", medieval fantasy art style, highly detailed, digital painting, concept art, dramatic lighting",e.rank){const g={F:"novice adventurer",E:"apprentice hero",D:"skilled adventurer",C:"experienced hero",B:"veteran champion",A:"legendary hero with glowing aura",S:"mythical champion with divine radiance"};g[e.rank]&&(c+=`, ${g[e.rank]}`)}return c}async generateHeroAvatar(e,r="portrait"){try{const n=this.buildHeroImagePrompt(e,r);return(await v.generateImage({prompt:n,size:r==="portrait"?"512x512":"1024x1024",quality:"standard",style:"vivid"})).url}catch(n){return console.error("Error generating hero avatar:",n),this.getFallbackAvatar(e)}}async generateClassIcon(e){try{const n={Warrior:"crossed sword and shield icon, medieval fantasy style, golden metallic, simple design",Mage:"magical staff with crystal orb icon, mystical blue glow, arcane symbols",Rogue:"crossed daggers icon, dark steel with poison green accents, stealth design",Paladin:"holy hammer with divine light icon, silver and gold, sacred geometry",Ranger:"bow and arrow with leaf motifs icon, forest green and brown, nature theme"}[e]||`${e} class icon, medieval fantasy style, detailed emblem`;return(await v.generateImage({prompt:n+", icon design, transparent background, high contrast",size:"256x256",quality:"standard",style:"natural"})).url}catch(r){return console.error("Error generating class icon:",r),this.getFallbackClassIcon(e)}}async generateRankBadge(e){try{const n={F:"bronze rank badge, simple design, beginner level",E:"iron rank badge, sturdy metal, apprentice level",D:"silver rank badge, polished metal, skilled level",C:"gold rank badge, shining metal, experienced level",B:"platinum rank badge, precious metal with gems, veteran level",A:"diamond rank badge, crystalline with magical glow, legendary level",S:"mythril rank badge, ethereal glow with divine light, mythical level"}[e]||`${e} rank badge, medieval fantasy style`;return(await v.generateImage({prompt:n+", heraldic design, detailed emblem, transparent background",size:"256x256",quality:"standard",style:"natural"})).url}catch(r){return console.error("Error generating rank badge:",r),this.getFallbackRankBadge(e)}}async generateQuestIllustration(e,r,n){try{const o={combat:"epic battle scene with monsters",exploration:"mysterious dungeon or ancient ruins",social:"tavern or royal court scene",crafting:"workshop with magical items",rescue:"dramatic rescue scene"},d={easy:"peaceful atmosphere, bright lighting",medium:"moderate danger, balanced lighting",hard:"dangerous atmosphere, dramatic shadows",extreme:"epic scale, intense lighting and effects"};let l=`${o[r]||"fantasy adventure scene"}`;return d[n]&&(l+=`, ${d[n]}`),l+=", medieval fantasy art, detailed illustration, concept art style",(await v.generateImage({prompt:l,size:"1024x512",quality:"standard",style:"vivid"})).url}catch(o){return console.error("Error generating quest illustration:",o),this.getFallbackQuestImage(r)}}getFallbackAvatar(e){const n={Warrior:"#8B4513",Mage:"#4169E1",Rogue:"#2F4F4F",Paladin:"#FFD700",Ranger:"#228B22"}[e.class]||"#696969";return`data:image/svg+xml,${encodeURIComponent(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="${n}" stroke="#333" stroke-width="2"/>
        <text x="50" y="55" text-anchor="middle" fill="white" font-size="12" font-family="Arial">
          ${e.name.charAt(0)}
        </text>
      </svg>
    `)}`}getFallbackClassIcon(e){const n={Warrior:"⚔️",Mage:"🔮",Rogue:"🗡️",Paladin:"🛡️",Ranger:"🏹"}[e]||"⭐";return`data:image/svg+xml,${encodeURIComponent(`
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
        <text x="32" y="40" text-anchor="middle" font-size="24">${n}</text>
      </svg>
    `)}`}getFallbackRankBadge(e){const n={F:"#CD7F32",E:"#C0C0C0",D:"#C0C0C0",C:"#FFD700",B:"#E5E4E2",A:"#B9F2FF",S:"#FF6347"}[e]||"#696969";return`data:image/svg+xml,${encodeURIComponent(`
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="${n}" stroke="#333" stroke-width="2"/>
        <text x="32" y="38" text-anchor="middle" fill="white" font-size="20" font-weight="bold">
          ${e}
        </text>
      </svg>
    `)}`}getFallbackQuestImage(e){const n={combat:"⚔️",exploration:"🗺️",social:"👥",crafting:"🔨",rescue:"🛡️"}[e]||"⭐";return`data:image/svg+xml,${encodeURIComponent(`
      <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#f5f5f5" stroke="#ddd" stroke-width="1"/>
        <text x="100" y="60" text-anchor="middle" font-size="32">${n}</text>
      </svg>
    `)}`}}const I=new z,B=({hero:t,onAvatarGenerated:e,style:r="portrait",className:n=""})=>{var k,$;const[o,d]=p.useState(!1),[l,c]=p.useState(null),[g,m]=p.useState(null),[y,h]=p.useState(0);p.useEffect(()=>{t!=null&&t.image&&!l&&c(t.image)},[t==null?void 0:t.image]);const w=p.useCallback(async()=>{d(!0),m(null),h(0);try{if(!t){m("Herói não disponível para gerar avatar.");return}const s=setInterval(()=>{h(x=>Math.min(x+10,90))},200),u=await I.generateHeroAvatar(t,r);clearInterval(s),h(100),c(u),e==null||e(u),setTimeout(()=>h(0),1e3)}catch(s){m("Falha ao gerar avatar. Tente novamente."),console.error("Avatar generation error:",s)}finally{d(!1)}},[t,r,e]),F=p.useCallback(()=>{c(null),w()},[t,r]);return a.jsx("div",{className:n,children:a.jsx("div",{className:`rounded-xl border ${f().activeSeasonalTheme&&((k=A[f().activeSeasonalTheme])==null?void 0:k.border)||"border-white/20"}`,children:a.jsxs("div",{className:"ai-avatar-generator",children:[a.jsx("style",{children:`
        .ai-avatar-generator {
          background: linear-gradient(${i.gradients.backgrounds.secondary});
          border: 2px solid ${i.colors.gold[500]};
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .avatar-preview {
          width: 200px;
          height: 200px;
          margin: 0 auto 20px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid ${i.colors.accent.gold};
          background: ${i.colors.background.primary};
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder {
          color: ${i.colors.text.secondary};
          font-size: 14px;
          text-align: center;
        }

        .generate-button {
          background: linear-gradient(135deg, ${i.colors.accent.gold}, #b8860b);
          color: ${i.colors.text.primary};
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 0 8px;
          font-size: 14px;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.4);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .regenerate-button {
          background: linear-gradient(135deg, ${i.colors.accent.silver}, #a0a0a0);
          color: ${i.colors.text.primary};
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .regenerate-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(192, 192, 192, 0.4);
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: ${i.colors.background.primary};
          border-radius: 2px;
          overflow: hidden;
          margin: 16px 0;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${i.colors.accent.gold}, #ffd700);
          transition: width 0.3s ease;
        }

        .error-message {
          color: ${i.colors.accent.crimson};
          font-size: 14px;
          margin-top: 12px;
          padding: 8px;
          background: rgba(220, 20, 60, 0.1);
          border-radius: 6px;
          border: 1px solid rgba(220, 20, 60, 0.3);
        }

        .hero-info {
          margin-bottom: 16px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          font-size: 14px;
          color: ${i.colors.text.secondary};
        }

        .style-selector {
          margin-bottom: 16px;
        }

        .style-option {
          background: ${i.colors.background.primary};
          color: ${i.colors.text.secondary};
          border: 1px solid ${i.colors.accent.gold};
          padding: 6px 12px;
          margin: 0 4px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
        }

        .style-option.active {
          background: ${i.colors.accent.gold};
          color: ${i.colors.text.primary};
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          color: ${i.colors.text.primary};
          z-index: 10;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(218, 165, 32, 0.3);
          border-top: 3px solid ${i.colors.accent.gold};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .ai-badge {
          position: absolute;
          top: 8px;
          right: 8px;
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

        .ai-icon {
          width: 12px;
          height: 12px;
        }
      `}),a.jsxs("div",{className:"ai-badge",children:[a.jsx("svg",{className:"ai-icon",viewBox:"0 0 24 24",fill:"currentColor",children:a.jsx("path",{d:"M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"})}),"IA"]}),a.jsxs("div",{className:"hero-info",children:[a.jsx("strong",{children:(t==null?void 0:t.name)??"Herói"})," - ",(t==null?void 0:t.class)??"guerreiro"," Nível ",(($=t==null?void 0:t.progression)==null?void 0:$.level)??1]}),a.jsxs("div",{className:"avatar-preview",children:[a.jsx(C,{mode:"wait",children:l?a.jsx(b.img,{src:l,alt:`Avatar de ${t.name}`,className:"avatar-image",initial:{opacity:0,scale:.8},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.8},transition:{duration:.5},onError:()=>{m("Imagem remota indisponível, usando fallback.");const s=I.getFallbackAvatar(t);c(s)}},"avatar"):a.jsxs(b.div,{className:"placeholder",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[a.jsx("div",{style:{fontSize:"48px",marginBottom:"8px"},children:"🎭"}),"Clique para gerar avatar com IA"]},"placeholder")}),o&&a.jsxs("div",{className:"loading-overlay",children:[a.jsx("div",{className:"loading-spinner"}),a.jsx("div",{children:"Gerando avatar..."}),a.jsxs("div",{style:{fontSize:"12px",marginTop:"4px"},children:[y,"%"]})]})]}),o&&a.jsx("div",{className:"progress-bar",children:a.jsx(b.div,{className:"progress-fill",initial:{width:0},animate:{width:`${y}%`},transition:{duration:.3}})}),a.jsx("div",{className:"style-selector",children:["portrait","full-body","action"].map(s=>a.jsxs("button",{className:`style-option ${r===s?"active":""}`,onClick:()=>{},disabled:o,children:[s==="portrait"&&"Retrato",s==="full-body"&&"Corpo Inteiro",s==="action"&&"Ação"]},s))}),a.jsx("div",{children:l?a.jsx("div",{children:a.jsx("button",{className:"regenerate-button",onClick:F,style:{backgroundImage:(()=>{const{activeSeasonalTheme:s}=f(),{from:u,to:x}=j(s);return`linear-gradient(135deg, ${u}, ${x})`})()},disabled:o,children:"🔄 Regenerar"})}):a.jsx("button",{className:"generate-button",onClick:w,style:{backgroundImage:(()=>{const{activeSeasonalTheme:s}=f(),{from:u,to:x}=j(s);return`linear-gradient(135deg, ${u}, ${x})`})()},disabled:o,children:o?"Gerando...":"✨ Gerar Avatar com IA"})}),g&&a.jsx(b.div,{className:"error-message",initial:{opacity:0,y:10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},children:g})]})})})};export{B as AIAvatarGenerator,B as default};
//# sourceMappingURL=AIAvatarGenerator-752f803c.js.map
