import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MonetizationState {
  adsEnabled: boolean;
  adsRemoved: boolean;
  adSenseClientId?: string;
  adSlotBannerTop?: string;
  adSlotInterstitial?: string;
  interstitialVisible: boolean;
  lastInterstitialAt?: number;
  interstitialMinIntervalMinutes: number;
  interstitialOnChapterMilestones: boolean;
  ownedProducts: Record<string, { purchasedAt: string }>;
  receipts: Record<string, { id: string; purchasedAt: string; payload?: any }>; 
  ownedFrames: string[];
  activeFrameId?: string;
  ownedThemes: string[];
  activeThemeId?: string;
  activeSeasonalTheme?: 'natal' | 'pascoa' | 'ano_novo' | 'carnaval';
  seasonalAutoEnabled: boolean;
  ownedDLCs: string[];
  seasonPassActive?: { active: boolean; expiresAt?: string };
  tipJarLevel?: 'none' | 'bronze' | 'silver' | 'gold';
  setConfig: (cfg: Partial<MonetizationState>) => void;
  setAdSenseClient: (clientId?: string) => void;
  triggerInterstitial: (reason: 'chapter' | 'manual') => void;
  hideInterstitial: () => void;
  markPurchase: (productId: string, receipt: { id: string; payload?: any }) => void;
  removeAdsForever: () => void;
  setActiveFrame: (frameId?: string) => void;
  setActiveTheme: (themeId?: string) => void;
  setActiveSeasonalTheme: (themeId?: 'natal' | 'pascoa' | 'ano_novo' | 'carnaval') => void;
  autoApplySeasonal: () => void;
}

export const useMonetizationStore = create<MonetizationState>()(
  persist(
    (set, get) => ({
      adsEnabled: true,
      adsRemoved: false,
      adSenseClientId: undefined,
      adSlotBannerTop: undefined,
      adSlotInterstitial: undefined,
      interstitialVisible: false,
      lastInterstitialAt: undefined,
      interstitialMinIntervalMinutes: 15,
      interstitialOnChapterMilestones: true,
      ownedProducts: {},
      receipts: {},
      ownedFrames: [],
      activeFrameId: undefined,
      ownedThemes: [],
      activeThemeId: undefined,
      ownedDLCs: [],
      seasonPassActive: { active: false },
      tipJarLevel: 'none',
      seasonalAutoEnabled: true,
      setConfig: (cfg) => set({ ...(get()), ...cfg }),
      setAdSenseClient: (clientId) => set({ adSenseClientId: clientId }),
      triggerInterstitial: (reason) => {
        const s = get();
        if (!s.adsEnabled || s.adsRemoved) return;
        const now = Date.now();
        const last = s.lastInterstitialAt || 0;
        const minMs = Math.max(1, s.interstitialMinIntervalMinutes) * 60_000;
        if (now - last < minMs) return;
        set({ interstitialVisible: true, lastInterstitialAt: now });
      },
      hideInterstitial: () => set({ interstitialVisible: false }),
      markPurchase: (productId, receipt) => {
        const currentOwned = { ...(get().ownedProducts) };
        const currentReceipts = { ...(get().receipts) };
        currentOwned[productId] = { purchasedAt: new Date().toISOString() };
        currentReceipts[productId] = { id: receipt.id, purchasedAt: new Date().toISOString(), payload: receipt.payload };
        const next: Partial<MonetizationState> = { ownedProducts: currentOwned, receipts: currentReceipts };
        if (productId.startsWith('frame-')) {
          const frameId = productId.replace('frame-', '');
          const frames = new Set([...(get().ownedFrames || [])]);
          frames.add(frameId);
          next.ownedFrames = Array.from(frames);
        } else if (productId.startsWith('theme-')) {
          const themeId = productId.replace('theme-', '');
          const themes = new Set([...(get().ownedThemes || [])]);
          themes.add(themeId);
          next.ownedThemes = Array.from(themes);
        } else if (productId === 'remove-ads') {
          next.adsRemoved = true; next.adsEnabled = false; next.interstitialVisible = false;
        } else if (productId === 'season-pass') {
          next.seasonPassActive = { active: true };
        }
        set(next as any);
      },
      removeAdsForever: () => set({ adsRemoved: true, adsEnabled: false, interstitialVisible: false }),
      setActiveFrame: (frameId) => set({ activeFrameId: frameId })
      ,setActiveTheme: (themeId) => set({ activeThemeId: themeId })
      ,setActiveSeasonalTheme: (themeId) => set({ activeSeasonalTheme: themeId })
      ,autoApplySeasonal: () => {
        const now = new Date();
        const m = now.getMonth();
        const d = now.getDate();
        let theme: 'natal' | 'pascoa' | 'ano_novo' | 'carnaval' | undefined;
        if (m === 11 && d >= 1) theme = 'natal';
        else if ((m === 3 && d >= 1) || (m === 4 && d <= 30)) theme = 'pascoa';
        else if (m === 0 && d <= 7) theme = 'ano_novo';
        else if (m === 1 && d >= 10 && d <= 28) theme = 'carnaval';
        if (theme) set({ activeSeasonalTheme: theme });
      }
    }),
    {
      name: 'heroforge-monetization',
      version: 1,
      partialize: (state) => ({
        adsEnabled: state.adsEnabled,
        adsRemoved: state.adsRemoved,
        adSenseClientId: state.adSenseClientId,
        adSlotBannerTop: state.adSlotBannerTop,
        adSlotInterstitial: state.adSlotInterstitial,
        interstitialMinIntervalMinutes: state.interstitialMinIntervalMinutes,
        interstitialOnChapterMilestones: state.interstitialOnChapterMilestones,
        ownedProducts: state.ownedProducts,
        receipts: state.receipts,
        ownedFrames: state.ownedFrames,
        activeFrameId: state.activeFrameId,
        ownedThemes: state.ownedThemes,
        activeThemeId: state.activeThemeId,
        ownedDLCs: state.ownedDLCs,
        seasonPassActive: state.seasonPassActive,
        tipJarLevel: state.tipJarLevel,
        activeSeasonalTheme: state.activeSeasonalTheme,
        seasonalAutoEnabled: state.seasonalAutoEnabled
      })
    }
  )
);

export const getMonetization = () => useMonetizationStore.getState();