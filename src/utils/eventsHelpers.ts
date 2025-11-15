export function getYesCount(attendees?: Record<string, string>): number {
  return Object.values(attendees || {}).filter(v => v === 'yes').length;
}

export function computeOccupancyPercent(capacity?: number, attendees?: Record<string, string>): number {
  const cap = Math.max(1, Number(capacity || 1));
  const yes = getYesCount(attendees);
  return Math.min(100, Math.round((yes / cap) * 100));
}

export function isNearFull(capacity?: number, attendees?: Record<string, string>, threshold: number = 0.9): boolean {
  const cap = Math.max(1, Number(capacity || 1));
  const yes = getYesCount(attendees);
  return (yes / cap) >= threshold;
}