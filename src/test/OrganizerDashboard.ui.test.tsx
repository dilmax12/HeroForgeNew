import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OrganizerDashboard from '../components/OrganizerDashboard'

vi.mock('../store/heroStore', () => ({
  useHeroStore: () => ({ getSelectedHero: () => ({ id: 'u1', name: 'Tester' }) })
}))

vi.mock('../services/socialEventsService', () => ({
  listEvents: vi.fn().mockResolvedValue([
    { id: 'e1', name: 'A', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'u1', createdAt: new Date().toISOString(), attendees: { a: 'yes' } },
    { id: 'e2', name: 'B', description: '', dateTime: new Date().toISOString(), capacity: 10, tags: [], privacy: 'public', ownerId: 'u1', createdAt: new Date().toISOString(), attendees: { a: 'yes', b: 'yes', c: 'yes', d: 'yes', e: 'yes' } }
  ]),
  updateEvent: vi.fn().mockResolvedValue({}),
  deleteEvent: vi.fn().mockResolvedValue(true)
}))

describe('OrganizerDashboard UI', () => {
  it('sorts by occupancy when selected', async () => {
    render(<MemoryRouter><OrganizerDashboard /></MemoryRouter>)
    const orderSelect = await screen.findByDisplayValue('Data')
    ;(orderSelect as HTMLSelectElement).value = 'occupancy'
    orderSelect.dispatchEvent(new Event('change', { bubbles: true }))
    const inputs = await screen.findAllByDisplayValue(/A|B/)
    // First input should be B (higher occupancy)
    expect(inputs[0].getAttribute('value')).toBe('B')
  })
})