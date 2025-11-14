import React, { useEffect } from 'react';
import { useMonetizationStore } from '../store/monetizationStore';
import { loadAdSense, pushAds } from '../services/adsenseLoader';
import { useHeroStore } from '../store/heroStore';
import { trackMetric } from '../utils/metricsSystem';

interface Props {
  slot?: string;
  style?: React.CSSProperties;
}

const AdBanner: React.FC<Props> = ({ slot, style }) => {
  const { adsEnabled, adsRemoved, adSenseClientId, adSlotBannerTop } = useMonetizationStore();
  const slotId = slot || adSlotBannerTop;

  const { getSelectedHero } = useHeroStore();
  const hero = getSelectedHero();
  useEffect(() => {
    if (adsRemoved || !adsEnabled) return;
    loadAdSense(adSenseClientId);
    const t = setTimeout(() => pushAds(), 250);
    try { if (hero?.id) trackMetric.adImpression(hero.id, 'banner-top'); } catch {}
    return () => clearTimeout(t);
  }, [adsEnabled, adsRemoved, adSenseClientId, hero?.id]);

  if (!adsEnabled || adsRemoved) return null;

  if (!adSenseClientId || !slotId) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 text-center text-xs py-2" style={style}>
        Espaço de anúncio
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle block"
      style={style || { display: 'block', height: 60 }}
      data-ad-client={adSenseClientId}
      data-ad-slot={slotId}
      data-ad-format="horizontal"
      data-full-width-responsive="true"
    />
  );
};

export default AdBanner;
