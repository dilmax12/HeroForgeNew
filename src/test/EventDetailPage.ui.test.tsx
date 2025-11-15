import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import EventDetailPage from '../components/EventDetailPage'

vi.mock('../store/heroStore', () => ({
  useHeroStore: () => ({ getSelectedHero: () => ({ id: 'u1', name: 'Tester' }) })
}))

vi.mock('../services/socialEventsService', () => ({
  getEvent: vi.fn().mockResolvedValue({ id: 'e1', name: 'Teste', description: '', dateTime: new Date().toISOString(), capacity: 2, tags: [], privacy: 'public', ownerId: 'o', createdAt: new Date().toISOString(), attendees: { a: 'yes', b: 'yes' } }),
  attendEvent: vi.fn(),
  fetchEventChat: vi.fn().mockResolvedValue([]),
  listEventMedia: vi.fn().mockResolvedValue([])
}))

describe('EventDetailPage UI', () => {
  it('shows occupancy and disables Vou when full', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/event/e1' }] }>
        <Routes>
          <Route path="/event/:id" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await screen.findByText('Ocupação')).toBeTruthy()
    const vouBtn = await screen.findByText('Vou')
    expect((vouBtn as HTMLButtonElement).disabled).toBe(true)
  })
})