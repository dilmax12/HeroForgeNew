import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    { id: 'e1', name: 'Evento 90', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'o', createdAt: new Date().toISOString(), attendees: { a: 'yes', b: 'yes', c: 'yes', d: 'yes', e: 'yes', f: 'yes', g: 'yes', h: 'yes', i: 'yes' } },
    { id: 'e2', name: 'Evento 10', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'o', createdAt: new Date().toISOString(), attendees: { a: 'yes' } }
  ], pagination: { total: 2, offset: 0, limit: 50, hasMore: false } })
}))

describe('SocialEventsPage bars & badges', () => {
  it('renders occupancy percent and near-full badge', async () => {
    render(<MemoryRouter><SocialEventsPage /></MemoryRouter>)
    await screen.findByText('Sugestões para você')
    expect(await screen.findByText('Ocupação: 90%')).toBeTruthy()
    expect(await screen.findByText('Quase lotado')).toBeTruthy()
    expect(await screen.findByText('Ocupação: 10%')).toBeTruthy()
  })
})