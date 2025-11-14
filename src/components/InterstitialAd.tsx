import React, { useEffect } from 'react';
import { useMonetizationStore } from '../store/monetizationStore';
import { loadAdSense, pushAds } from '../services/adsenseLoader';
import { useHeroStore } from '../store/heroStore';
import { trackMetric } from '../utils/metricsSystem';

const InterstitialAd: React.FC = () => {
  const { interstitialVisible, hideInterstitial, adsEnabled, adsRemoved, adSenseClientId, adSlotInterstitial } = useMonetizationStore();

  const { getSelectedHero } = useHeroStore();
  const hero = getSelectedHero();
  useEffect(() => {
    if (!interstitialVisible) return;
    if (adsRemoved || !adsEnabled) return;
    loadAdSense(adSenseClientId);
    const t = setTimeout(() => pushAds(), 250);
    try { if (hero?.id) trackMetric.adImpression(hero.id, 'interstitial'); } catch {}
    return () => clearTimeout(t);
  }, [interstitialVisible, adsEnabled, adsRemoved, adSenseClientId, hero?.id]);

  if (!interstitialVisible) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center">
      <div className="w-[92vw] max-w-xl rounded-xl border border-white/20 bg-slate-900 shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-300">Apoie o projeto vendo um anúncio</div>
          <button onClick={() => { hideInterstitial(); try { if (hero?.id) trackMetric.adClick(hero.id, 'interstitial-close'); } catch {} }} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600">Fechar</button>
        </div>
        {adSenseClientId && adSlotInterstitial ? (
          <ins
            className="adsbygoogle block"
            style={{ display: 'block', width: '100%', minHeight: 250 }}
            data-ad-client={adSenseClientId}
            data-ad-slot={adSlotInterstitial}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 text-center text-sm py-14">Anúncio intersticial</div>
        )}
      </div>
    </div>
  );
};

export default InterstitialAd;