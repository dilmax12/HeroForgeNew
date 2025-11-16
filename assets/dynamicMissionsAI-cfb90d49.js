var v=Object.defineProperty;var f=(l,s,o)=>s in l?v(l,s,{enumerable:!0,configurable:!0,writable:!0,value:o}):l[s]=o;var d=(l,s,o)=>(f(l,typeof s!="symbol"?s+"":s,o),o);import{a as c}from"./index-40f90f1d.js";class h{constructor(){d(this,"inflightMission",null);d(this,"lastCallTs",0);d(this,"minIntervalMs",8e3)}getSystemPrompt(){return`Você é um mestre de RPG criando missões no mundo "A Balada do Véu Partido".

Diretrizes:
- Missões sempre devem se conectar ao Véu Partido: fendas na realidade, ecos de luz e sombra.
 - Integre a Foja dos Herois de Altharion como contexto para convites, patronos e recompensas.
- Utilize elementos de lore: artefatos do Véu, guardiões espectrais, zonas instáveis, facções Ordem e Sombra.
- Adapte ao nível e classe do herói, mantendo coerência narrativa e equilíbrio de recompensas.
- Escreva em português brasileiro, com tom épico acessível e rico em detalhes.

Considere:
- Histórico e conquistas do herói
- Progressão natural de dificuldade
- Elementos de roleplay (diálogos de NPCs, escolhas)
- Variedade de tipos de objetivos
- Recompensas justas e motivadoras`}buildMissionPrompt(s){const{hero:o,missionType:r,difficulty:t,context:e}=s;let a=`Crie uma missão ${r} de dificuldade ${t} para ${o.name}.

Informações do Herói:
- Nome: ${o.name}
- Classe: ${o.class}
- Nível: ${o.progression.level}
- Rank: ${o.rank||"F"}
- Alinhamento: ${o.alignment}
- Atributos principais: ${Object.entries(o.attributes).sort(([,i],[,n])=>n-i).slice(0,3).map(([i,n])=>`${i}: ${n}`).join(", ")}`;return o.achievements&&o.achievements.length>0&&(a+=`
- Conquistas recentes: ${o.achievements.slice(-3).map(i=>i.title).join(", ")}`),e&&(a+=`

Contexto adicional: ${e}`),a+=`

Lore do Mundo (use como pano de fundo):
- O Véu (fronteira entre o mundo mortal e o além) foi quebrado.
- Fendas do Véu surgem com instabilidade mágica, liberando criaturas e anomalias.
 - A Foja dos Herois de Altharion coordena esforços para investigar e selar fendas.
- Facções Ordem e Sombra disputam influência; decisões podem alterar a reputação.
- Artefatos do Véu amplificam magia e podem estabilizar ou agravar fendas.`,a+=`

A missão deve incluir (integrada à lore acima quando possível):
1. Título épico e memorável
2. Descrição breve (1-2 frases)
3. Narrativa envolvente (100-150 palavras)
4. 2-4 objetivos específicos e claros
5. Recompensas apropriadas para o nível
6. Localização interessante
7. Duração estimada em minutos
  8. Se relevante, impacto em reputação com Ordem e/ou Sombra
  9. O alinhamento do herói deve influenciar tom, escolhas e consequências (ex.: leal favorece dever; caótico favorece risco; bom prioriza proteção; mal favorece poder)

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
}`,a}async generateMission(s){const o=Date.now();if(this.inflightMission&&o-this.lastCallTs<this.minIntervalMs)return this.inflightMission;this.lastCallTs=o,this.inflightMission=(async()=>{var r;try{if(!c.isConfigured())return this.generateFallbackMission(s);console.debug("[AI][Missions] GenerateMission dispatch",{provider:c.getProvider(),hero:{id:s.hero.id,name:s.hero.name,class:s.hero.class,level:s.hero.progression.level},missionType:s.missionType,difficulty:s.difficulty});const t=await c.generateText({prompt:this.buildMissionPrompt(s),systemMessage:this.getSystemPrompt(),maxTokens:600,temperature:.8});console.debug("[AI][Missions] GenerateMission response",{textLen:((r=t.text)==null?void 0:r.length)||0,provider:t.provider,model:t.model});let e=null;try{e=JSON.parse(t.text)}catch{const a=t.text.match(/\{[\s\S]*\}/);if(a)try{e=JSON.parse(a[0])}catch{}}return!e||!e.title||!e.description||!e.objectives||!e.rewards?this.generateFallbackMission(s):{id:this.generateMissionId(),title:e.title,description:e.description,narrative:e.narrative,objectives:e.objectives.map((a,i)=>({id:`obj_${i}`,description:a.description,type:a.type,target:a.target,quantity:a.quantity,completed:!1,optional:a.optional||!1})),rewards:e.rewards,difficulty:s.difficulty,type:s.missionType,estimatedDuration:e.estimatedDuration,location:e.location,npcDialogue:e.npcDialogue}}catch(t){const e=t;return console.error("[AI][Missions] GenerateMission failed",{code:e==null?void 0:e.code,message:e==null?void 0:e.message,provider:e==null?void 0:e.provider,retryable:e==null?void 0:e.retryable}),this.generateFallbackMission(s)}})();try{return await this.inflightMission}finally{this.inflightMission=null}}async generateQuestChain(s,o,r=3){const t=[],e=["easy","medium","hard"],a=["combat","exploration","social","crafting","rescue","mystery"];for(let i=0;i<r;i++){const n=e[Math.min(i,e.length-1)],m=a[Math.floor(Math.random()*a.length)],p=i===0?`Primeira missão de uma cadeia temática sobre: ${o}`:`Missão ${i+1} de ${r} na cadeia "${o}". Missões anteriores: ${t.map(g=>g.title).join(", ")}`,u=await this.generateMission({hero:s,missionType:m,difficulty:n,context:p});t.push(u)}return t}async generateNPCDialogue(s,o,r){var t;try{if(!c.isConfigured())return{npcName:o,dialogue:`Saudações, ${s.name}! Como posso ajudá-lo hoje?`,responses:["Preciso de uma missão","Conte-me sobre este lugar","Até logo"]};console.debug("[AI][Missions] GenerateNPCDialogue dispatch",{provider:c.getProvider(),hero:{name:s.name,class:s.class,level:s.progression.level},npcName:o,contextLen:(r==null?void 0:r.length)||0});const e=`Crie um diálogo para o NPC "${o}" falando com ${s.name} (${s.class}, nível ${s.progression.level}, alinhamento ${s.alignment}).

Contexto: ${r}

O diálogo deve:
- Ser apropriado para o contexto medieval fantástico
- Refletir a personalidade única do NPC
- Incluir 2-3 opções de resposta para o jogador
- Ter entre 50-100 palavras
 - Refletir o alinhamento do herói nas respostas sugeridas e na postura do NPC

Formato JSON:
{
  "npcName": "${o}",
  "dialogue": "Fala do NPC",
  "responses": ["Resposta 1", "Resposta 2", "Resposta 3"]
}`,a=await c.generateText({prompt:e,systemMessage:"Você é especialista em criar diálogos envolventes para NPCs em jogos de RPG.",maxTokens:200,temperature:.7});console.debug("[AI][Missions] GenerateNPCDialogue response",{textLen:((t=a.text)==null?void 0:t.length)||0,provider:a.provider,model:a.model});try{return JSON.parse(a.text)}catch{const i=a.text.match(/\{[\s\S]*\}/);if(i)try{return JSON.parse(i[0])}catch{}return{npcName:o,dialogue:`Saudações, ${s.name}! Como posso ajudá-lo hoje?`,responses:["Preciso de uma missão","Conte-me sobre este lugar","Até logo"]}}}catch(e){const a=e;return console.error("[AI][Missions] GenerateNPCDialogue failed",{code:a==null?void 0:a.code,message:a==null?void 0:a.message,provider:a==null?void 0:a.provider,retryable:a==null?void 0:a.retryable}),{npcName:o,dialogue:`Saudações, ${s.name}! Como posso ajudá-lo hoje?`,responses:["Preciso de uma missão","Conte-me sobre este lugar","Até logo"]}}}generateMissionId(){return`mission_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}generateFallbackMission(s){const{hero:o,missionType:r,difficulty:t}=s,e={combat:{title:"Ameaça nas Sombras",description:"Criaturas hostis ameaçam a região.",narrative:`${o.name}, relatórios chegaram sobre criaturas perigosas rondando as proximidades. Como ${o.class} experiente, sua ajuda é essencial para proteger os inocentes. Prepare-se para o combate!`,objectives:[{description:"Eliminar 5 criaturas hostis",type:"kill",target:"criaturas",quantity:5,optional:!1}]},exploration:{title:"Ruínas Perdidas",description:"Explore ruínas antigas em busca de tesouros.",narrative:`Antigas ruínas foram descobertas, ${o.name}. Como ${o.class}, você possui as habilidades necessárias para explorar estes locais perigosos e descobrir seus segredos.`,objectives:[{description:"Explorar as ruínas antigas",type:"reach",target:"ruínas",optional:!1},{description:"Encontrar artefato antigo",type:"collect",target:"artefato",quantity:1,optional:!1}]}},a=e[r]||e.combat;return{id:this.generateMissionId(),title:a.title,description:a.description,narrative:a.narrative,objectives:a.objectives.map((i,n)=>({id:`obj_${n}`,description:i.description,type:i.type,target:i.target,quantity:i.quantity,completed:!1,optional:i.optional})),rewards:[{type:"experience",amount:o.progression.level*50,description:"Experiência de combate"},{type:"gold",amount:o.progression.level*25,description:"Recompensa em ouro"}],difficulty:t,type:r,estimatedDuration:20,location:"Região Próxima",npcDialogue:[{npcName:"Capitão da Guarda",dialogue:`${o.name}, precisamos de sua ajuda urgentemente!`,responses:["Aceito a missão","Conte-me mais detalhes","Talvez mais tarde"]}]}}}const M=new h;export{M as d};
//# sourceMappingURL=dynamicMissionsAI-cfb90d49.js.map
