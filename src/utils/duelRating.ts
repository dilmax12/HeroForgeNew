export function updateElo(current: number, opponent: number, didWin: boolean, k = 32) {
  const expected = 1 / (1 + Math.pow(10, (opponent - current) / 400))
  const score = didWin ? 1 : 0
  const next = Math.round(current + k * (score - expected))
  return Math.max(0, next)
}

export function ratingTier(rating: number) {
  if (rating >= 1800) return 'Lendário'
  if (rating >= 1600) return 'Diamante'
  if (rating >= 1400) return 'Platina'
  if (rating >= 1200) return 'Ouro'
  if (rating >= 1000) return 'Prata'
  return 'Bronze'
}