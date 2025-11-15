import { describe, it, expect, vi } from 'vitest'
import { attendEvent } from '../services/socialEventsService'

describe('socialEventsService', () => {
  it('returns event on successful attend', async () => {
    const mockEvent = { event: { id: 'e-1', capacity: 100, attendees: { u1: 'yes' } } }
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => mockEvent } as any)
    const ev = await attendEvent('e-1', 'u2', 'yes')
    expect(ev.id).toBe('e-1')
    fetchSpy.mockRestore()
  })

  it('throws friendly error when capacity reached (409)', async () => {
    const resp = { ok: false, status: 409, json: async () => ({ error: 'Limite de participantes atingido' }) }
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue(resp as any)
    await expect(attendEvent('e-1', 'u2', 'yes')).rejects.toThrow('Limite de participantes atingido')
    fetchSpy.mockRestore()
  })
})