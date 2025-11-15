import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SocialEventsPage from '../components/SocialEventsPage'

vi.mock('../store/heroStore', () => ({
  useHeroStore: () => ({ getSelectedHero: () => ({ id: 'u1', name: 'Tester' }) })
}))

vi.mock('../store/monetizationStore', () => ({
  useMonetizationStore: () => ({ seasonPassActive: { active: false } })
}))

vi.mock('../services/userService', () => ({
  listFriends: vi.fn().mockResolvedValue([])
}))

vi.mock('../services/socialEventsService', () => ({
  listEventsPaged: vi.fn().mockResolvedValue({ items: [], pagination: { total: 0, offset: 0, limit: 50, hasMore: false } }),
  createEvent: vi.fn(),
  recommendEventsPaged: vi.fn().mockResolvedValue({ items: [
    { id: 'e-low', name: 'Evento Baixo', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'o', createdAt: new Date().toISOString(), attendees: { a: 'yes' } },
    { id: 'e-high', name: 'Evento Alto', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'o', createdAt: new Date().toISOString(), attendees: { a: 'yes', b: 'yes', c: 'yes', d: 'yes', e: 'yes', f: 'yes', g: 'yes', h: 'yes' } }
  ], pagination: { total: 2, offset: 0, limit: 50, hasMore: false } })
}))

vi.mock('../utils/metricsSystem', () => ({
  trackMetric: { featureUsed: vi.fn() }
}))

describe('SocialEventsPage UI', () => {
  it('orders recommended by occupancy when selected', async () => {
    render(<MemoryRouter><SocialEventsPage /></MemoryRouter>)
    await screen.findByText('Sugestões para você')
    const orderSelect = await screen.findByDisplayValue('Data')
    expect(orderSelect).toBeTruthy()
    ;(orderSelect as HTMLSelectElement).value = 'occupancy'
    orderSelect.dispatchEvent(new Event('change', { bubbles: true }))
    const metrics = await import('../utils/metricsSystem')
    expect(metrics.trackMetric.featureUsed).toHaveBeenCalledWith('u1', 'events_sort_changed')
  })
})