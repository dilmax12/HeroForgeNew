export type MonetizationConfig = {
  stripeEnabled: boolean;
  stripePublicKey: string;
  storeEnabled: boolean;
  adsenseClientId?: string;
  adSlotBannerTop?: string;
  adSlotInterstitial?: string;
};

export async function getMonetizationConfig(): Promise<MonetizationConfig> {
  const res = await fetch('/api/monetization/config');
  const data = await res.json();
  return data as MonetizationConfig;
}
