let adsenseLoaded = false;

export function loadAdSense(clientId?: string) {
  if (adsenseLoaded) return;
  if (!clientId) return;
  const scriptId = 'adsense-script';
  if (document.getElementById(scriptId)) { adsenseLoaded = true; return; }
  const s = document.createElement('script');
  s.id = scriptId;
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  (s as any).crossOrigin = 'anonymous';
  s.onload = () => { adsenseLoaded = true; };
  s.onerror = () => { adsenseLoaded = true; };
  document.head.appendChild(s);
}

export function pushAds() {
  try { (window as any).adsbygoogle = (window as any).adsbygoogle || []; (window as any).adsbygoogle.push({}); } catch {}
}