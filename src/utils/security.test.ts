import { describe, it, expect } from 'vitest'
import { sanitizeInput, validateId, sanitizePath, validateAndSanitizeObject } from './security'

describe('security utils', () => {
  it('sanitizeInput escapes dangerous characters', () => {
    const input = `<script>alert("x")</script>(test)`
    const out = sanitizeInput(input)
    expect(out).toContain('&lt;script&gt;')
    expect(out).toContain('&quot;x&quot;')
    expect(out).not.toContain('<')
    expect(out).not.toContain('>')
    expect(out).toContain('&#40;test&#41;')
  })

  it('validateId accepts alphanumeric, dash and underscore', () => {
    expect(validateId('abc123')).toBe(true)
    expect(validateId('abc-123_')).toBe(true)
    expect(validateId('abc!')).toBe(false)
    expect(validateId('')).toBe(false)
  })

  it('sanitizePath removes traversal tokens and invalid chars', () => {
    const p = '../../etc/passwd?x=1'
    const out = sanitizePath(p)
    expect(out).not.toContain('..')
    expect(out).not.toContain('?')
  })

  it('validateAndSanitizeObject deeply sanitizes strings', () => {
    const obj = { a: '<b>x</b>', nested: { y: 'ok', z: '"quote"' } }
    const out = validateAndSanitizeObject(obj)
    expect(out.a).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(out.nested.y).toBe('ok')
    expect(out.nested.z).toContain('&quot;quote&quot;')
  })
})