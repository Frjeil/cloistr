import { beforeEach, describe, expect, it } from 'vitest'
import { getCsrfToken } from './csrf'

describe('getCsrfToken', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
  })

  it('returns null when no cookies exist', () => {
    expect(getCsrfToken()).toBeNull()
  })

  it('returns null when CSRF cookie is not present', () => {
    document.cookie = 'session=abc123'
    expect(getCsrfToken()).toBeNull()
  })

  it('reads the CSRF token from cookie', () => {
    document.cookie = 'cloistr_csrf=my-token-value'
    expect(getCsrfToken()).toBe('my-token-value')
  })

  it('ignores other cookies and finds the right one', () => {
    document.cookie = 'other=value'
    document.cookie = 'cloistr_csrf=csrf-token'
    expect(getCsrfToken()).toBe('csrf-token')
  })

  it('decodes URI-encoded tokens', () => {
    document.cookie = 'cloistr_csrf=token%20with%20spaces'
    expect(getCsrfToken()).toBe('token with spaces')
  })
})
