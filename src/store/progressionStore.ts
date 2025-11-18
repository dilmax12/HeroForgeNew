import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Hero } from '../types/hero'
import { rankSystem } from '../utils/rankSystem'
import { notificationBus } from '../components/NotificationSystem'
import { onboardingManager } from '../utils/onboardingSystem'

type FeatureKey = 'training_basic' | 'hunting_basic' | 'shop_basic' | 'crafting_simple' | 'stable_basic'

interface UnlockLogEntry {
  id: string
  feature: FeatureKey
  heroId?: string
  details?: string
  ts: number
}

interface GateStatus {
  enabled: boolean
  reason?: string
  nextHint?: string
}

interface ProgressionState {
  featuresUnlocked: Record<FeatureKey, boolean>
  basicTrainingOnly: boolean
  unlockLog: UnlockLogEntry[]
  requirements: {
    hunting_basic: { minLevel: number; minCompletedQuests?: number }
    shop_basic: { minRank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS'; minColetaQuests?: number }
    crafting_simple: { minRank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS'; minCompletedQuests?: number }
    stable_basic: { minLevel: number; requiresGuildQuestId?: string }
  }
  isFeatureEnabled: (feature: FeatureKey, hero?: Hero) => boolean
  getGateStatus: (feature: FeatureKey, hero?: Hero) => GateStatus
  setFeatureUnlocked: (feature: FeatureKey, hero?: Hero, details?: string) => void
  evaluateUnlocks: (hero: Hero, prev?: Hero) => void
  setBasicTrainingOnly: (value: boolean) => void
}

const initialFlags: Record<FeatureKey, boolean> = {
  training_basic: true,
  hunting_basic: false,
  shop_basic: false,
  crafting_simple: false,
  stable_basic: false
}

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set, get) => ({
      featuresUnlocked: initialFlags,
      basicTrainingOnly: true,
      unlockLog: [],
      requirements: {
        hunting_basic: { minLevel: 2, minCompletedQuests: 0 },
        shop_basic: { minRank: 'E', minColetaQuests: 5 },
        crafting_simple: { minRank: 'E', minCompletedQuests: 1 },
        stable_basic: { minLevel: 5, requiresGuildQuestId: 'guild-ovo-basico' }
      },
      
      
      isFeatureEnabled: (feature, hero) => {
        const flags = get().featuresUnlocked
        if (feature === 'training_basic') return true
        const enabled = !!flags[feature]
        if (!enabled) return false
        if (feature === 'hunting_basic') return true
        if (feature === 'shop_basic') return true
        if (feature === 'crafting_simple') return true
        if (feature === 'stable_basic') return true
        return enabled
      },
      getGateStatus: (feature, hero) => {
        const enabled = get().isFeatureEnabled(feature, hero)
        if (enabled) return { enabled }
        if (!hero) return { enabled: false }
        if (feature === 'hunting_basic') {
          const req = get().requirements.hunting_basic
          const lvl = hero.progression.level
          const qc = hero.stats.questsCompleted || 0
          const needLevel = lvl < req.minLevel
          const needQuests = (req.minCompletedQuests || 0) > 0 && qc < (req.minCompletedQuests || 0)
          const reason = needLevel ? `Requer nível ${req.minLevel}` : needQuests ? `Requer ${req.minCompletedQuests} missões concluídas` : 'Progresso insuficiente'
          const nextHint = needLevel ? `Nível atual ${lvl}` : needQuests ? `Missões concluídas ${qc}` : `Nível ${lvl}, Rank ${rankSystem.calculateRank(hero)}`
          return { enabled: false, reason, nextHint }
        }
        if (feature === 'shop_basic' || feature === 'crafting_simple') {
          const req = feature === 'shop_basic' ? get().requirements.shop_basic : get().requirements.crafting_simple
          const rank = rankSystem.calculateRank(hero)
          const order = ['F','E','D','C','B','A','S','SS','SSS']
          const okRank = order.indexOf(rank) >= order.indexOf(req.minRank)
          const coleta = (hero.stats as any).collectionQuestsCompleted || 0
          const qc = hero.stats.questsCompleted || 0
          const okQuests = feature === 'shop_basic' ? coleta >= (req.minColetaQuests || 0) : qc >= (req.minCompletedQuests || 0)
          const reason = !okRank ? `Requer rank ${req.minRank}` : !okQuests ? (feature === 'shop_basic' ? `Requer ${req.minColetaQuests} missões de coleta concluídas` : `Requer ${req.minCompletedQuests} missões concluídas`) : 'Progresso insuficiente'
          const nextHint = !okRank ? `Rank atual ${rank}` : !okQuests ? (feature === 'shop_basic' ? `Coletas concluídas ${coleta}` : `Missões concluídas ${qc}`) : `Rank ${rank}, Nível ${hero.progression.level}`
          return { enabled: false, reason, nextHint }
        }
        if (feature === 'stable_basic') {
          const req = get().requirements.stable_basic
          const lvl = hero.progression.level
          const okLevel = lvl >= req.minLevel
          const doneQuest = (hero.stats as any).stableUnlockQuestCompleted === true
          const reason = !okLevel ? `Requer nível ${req.minLevel}` : !doneQuest ? `Concluir missão da guilda para liberar o Estábulo` : 'Progresso insuficiente'
          const nextHint = !okLevel ? `Nível atual ${lvl}` : !doneQuest ? `Missão pendente: ${req.requiresGuildQuestId}` : `Nível ${lvl}`
          return { enabled: false, reason, nextHint }
        }
        return { enabled: false }
      },
      setFeatureUnlocked: (feature, hero, details) => {
        const now = Date.now()
        const flags = { ...get().featuresUnlocked, [feature]: true }
        const entry: UnlockLogEntry = {
          id: `${feature}-${now}`,
          feature,
          heroId: hero?.id,
          details,
          ts: now
        }
        set({ featuresUnlocked: flags, unlockLog: [...get().unlockLog, entry] })
        notificationBus.emit({ type: 'achievement', title: 'Nova funcionalidade desbloqueada!', message: feature.replace('_', ' ') })
      },
      evaluateUnlocks: (hero, prev) => {
        const flags = get().featuresUnlocked
        const prevLevel = prev?.progression.level ?? hero.progression.level
        const prevRank = prev ? rankSystem.calculateRank(prev) : rankSystem.calculateRank(hero)
        const newLevel = hero.progression.level
        const newRank = rankSystem.calculateRank(hero)
        if (!flags.hunting_basic) {
          const req = get().requirements.hunting_basic
          const qc = hero.stats.questsCompleted || 0
          if (prevLevel < req.minLevel && newLevel >= req.minLevel && qc >= (req.minCompletedQuests || 0)) {
            get().setFeatureUnlocked('hunting_basic', hero, 'Alcançou requisitos de caça básica')
          }
          try { onboardingManager.startFlow('unlock-hunting-basic') } catch {}
          set({ basicTrainingOnly: false })
        }
        const rankOrder = ['F','E','D','C','B','A','S','SS','SSS']
        const prevIdx = rankOrder.indexOf(prevRank)
        const newIdx = rankOrder.indexOf(newRank)
        if (prevIdx < 1 && newIdx >= 1) {
          const qc = hero.stats.questsCompleted || 0
          const reqShop = get().requirements.shop_basic
          const reqForge = get().requirements.crafting_simple
          const coleta = (hero.stats as any).collectionQuestsCompleted || 0
          if (!flags.shop_basic && coleta >= (reqShop.minColetaQuests || 0)) {
            get().setFeatureUnlocked('shop_basic', hero, 'Alcançou requisitos da loja básica')
            try { onboardingManager.startFlow('unlock-shop-basic') } catch {}
          }
          if (!flags.crafting_simple && qc >= (reqForge.minCompletedQuests || 0)) {
            get().setFeatureUnlocked('crafting_simple', hero, 'Alcançou requisitos de craft simples')
            try { onboardingManager.startFlow('unlock-crafting-simple') } catch {}
          }
        }
        if (!flags.stable_basic) {
          const reqSt = get().requirements.stable_basic
          const okLevel = hero.progression.level >= reqSt.minLevel
          const doneQuest = (hero.stats as any).stableUnlockQuestCompleted === true
          if (okLevel && doneQuest) {
            get().setFeatureUnlocked('stable_basic', hero, 'Missão da guilda concluída e nível alcançado')
          }
        }
      },
      setBasicTrainingOnly: (value) => set({ basicTrainingOnly: value })
    }),
    { name: 'hfn-progression-store' }
  )
)