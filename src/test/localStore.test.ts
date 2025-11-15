import { describe, it, expect } from 'vitest'
import { exportLocalData, importLocalData, clearLocalData, encryptLocalJson, decryptLocalJson, appendSyncHistory, loadSyncHistory, saveLocalHeroes, saveLocalQuests, loadLocalHeroes, loadLocalQuests } from '../services/localStore'

describe('localStore', () => {
  it('export/import maintains structure', () => {
    const uid = 'test-user'
    clearLocalData(uid)
    const heroes = [{ id: 'h1', name: 'Hero' }]
    const quests = [{ heroId: 'h1', status: 'active' }]
    saveLocalHeroes(uid, heroes as any)
    saveLocalQuests(uid, quests as any)
    const data = exportLocalData(uid)
    expect(data.heroes.length).toBe(1)
    expect(data.quests.length).toBe(1)
    clearLocalData(uid)
    importLocalData(uid, data)
    expect(loadLocalHeroes(uid).length).toBe(1)
    expect(loadLocalQuests(uid).length).toBe(1)
  })

  it('encrypt/decrypt roundtrip', async () => {
    const payload = { a: 1, b: 'x' }
    const enc = await encryptLocalJson(payload, 'pass')
    const dec = await decryptLocalJson(enc, 'pass')
    expect(dec).toEqual(payload)
  })

  it('decrypt fails with wrong pass', async () => {
    const payload = { a: 1 }
    const enc = await encryptLocalJson(payload, 'secret')
    let failed = false
    try {
      await decryptLocalJson(enc, 'wrong')
    } catch {
      failed = true
    }
    expect(failed).toBe(true)
  })

  it('sync history capped at 10', () => {
    const uid = 'test-user'
    clearLocalData(uid)
    for (let i = 0; i < 12; i++) {
      appendSyncHistory(uid, { ts: new Date().toISOString(), heroesImported: i, questsImported: i, heroesIgnored: 0 })
    }
    const arr = loadSyncHistory(uid)
    expect(arr.length).toBe(10)
  })
})