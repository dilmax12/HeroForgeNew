import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SocialEventsPage from '../components/SocialEventsPage'

vi.mock('../store/heroStore', () => ({
  useHeroStore: () => ({ getSelectedHero: () => ({ id: 'u1', name: 'Tester' }), heroes: [] })
}))

vi.mock('../store/monetizationStore', () => ({
  useMonetizationStore: () => ({ seasonPassActive: { active: false } })
}))

vi.mock('../services/socialEventsService', () => ({
  listEventsPaged: vi.fn().mockResolvedValue({ items: [
    { id: 'e-low', name: 'Evento Baixo', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'o', createdAt: new Date().toISOString(), attendees: { a: 'yes' } },
    { id: 'e-high', name: 'Evento Alto', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'o', createdAt: new Date().toISOString(), attendees: { a: 'yes', b: 'yes', c: 'yes', d: 'yes', e: 'yes', f: 'yes', g: 'yes', h: 'yes' } }
  ], pagination: { total: 2, offset: 0, limit: 50, hasMore: false } }),
  recommendEventsPaged: vi.fn().mockResolvedValue({ items: [
    { id: 'r-low', name: 'Rec Baixo', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'o', createdAt: new Date().toISOString(), attendees: { a: 'yes' } },
    { id: 'r-high', name: 'Rec Alto', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'o', createdAt: new Date().toISOString(), attendees: { a: 'yes', b: 'yes', c: 'yes', d: 'yes', e: 'yes', f: 'yes', g: 'yes', h: 'yes' } }
  ], pagination: { total: 2, offset: 0, limit: 50, hasMore: false } }),
  createEvent: vi.fn()
}))

describe('SocialEventsPage filter near full', () => {
  it('shows only near-full events when filter is enabled', async () => {
    render(<MemoryRouter><SocialEventsPage /></MemoryRouter>)
    await screen.findByText('Todos os eventos')
    const chk = await screen.findByLabelText('Quase lotados')
    await userEvent.click(chk)
    expect(chk).toBeChecked()
    expect(await screen.findByText('Sugestões para você')).toBeTruthy()
  })
})