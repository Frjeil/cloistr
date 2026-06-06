import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, ensureCsrfCookie, HttpError, isHttpError } from './client'

function setCsrfCookie(value: string | null) {
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: value ? `cloistr_csrf=${value}` : '',
  })
}

describe('HttpError', () => {
  it('creates an error with status and body', () => {
    const error = new HttpError('Not found', { status: 404, body: { detail: 'missing' } })
    expect(error).toBeInstanceOf(HttpError)
    expect(error.message).toBe('Not found')
    expect(error.status).toBe(404)
    expect(error.body).toEqual({ detail: 'missing' })
    expect(error.name).toBe('HttpError')
  })
})

describe('isHttpError', () => {
  it('returns true for HttpError instances', () => {
    expect(isHttpError(new HttpError('err'))).toBe(true)
  })

  it('returns false for regular errors', () => {
    expect(isHttpError(new Error('err'))).toBe(false)
  })

  it('returns false for non-errors', () => {
    expect(isHttpError(null)).toBe(false)
    expect(isHttpError({})).toBe(false)
  })
})

describe('ensureCsrfCookie', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setCsrfCookie(null)
  })

  it('skips fetch when CSRF cookie already exists', async () => {
    setCsrfCookie('existing-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await ensureCsrfCookie()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches CSRF endpoint when cookie is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 200 }))
    await ensureCsrfCookie()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/csrf/'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})

describe('apiFetch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setCsrfCookie('csrf-token')
  })

  it('makes a GET request and parses JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const result = await apiFetch<{ data: string }>('/test/')
    expect(result).toEqual({ data: 'ok' })
  })

  it('includes CSRF token header when csrf option is true', async () => {
    let usedHeaders: HeadersInit | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, opts) => {
      usedHeaders = (opts as RequestInit).headers as HeadersInit
      return new Response(JSON.stringify({}), { status: 200 })
    })
    await apiFetch('/test/', { csrf: true })
    const headers = new Headers(usedHeaders)
    expect(headers.get('X-CSRFToken')).toBe('csrf-token')
  })

  it('sends JSON body for serializable payloads', async () => {
    let usedBody: string | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, opts) => {
      usedBody = (opts as RequestInit).body as string
      return new Response(JSON.stringify({}), { status: 200 })
    })
    await apiFetch('/test/', { method: 'POST', body: { key: 'value' } })
    expect(usedBody).toBe(JSON.stringify({ key: 'value' }))
  })

  it('sends FormData as-is without Content-Type', async () => {
    const formData = new FormData()
    formData.set('file', 'test')
    let usedHeaders: HeadersInit | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, opts) => {
      usedHeaders = (opts as RequestInit).headers as HeadersInit
      return new Response(JSON.stringify({}), { status: 200 })
    })
    await apiFetch('/upload/', { method: 'POST', body: formData })
    const headers = new Headers(usedHeaders)
    expect(headers.has('Content-Type')).toBe(false)
  })

  it('throws HttpError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'bad request' }), { status: 400 }),
    )
    await expect(apiFetch('/test/')).rejects.toThrow(HttpError)
  })

  it('throws HttpError with correct status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 404 }),
    )
    try {
      await apiFetch('/test/')
    } catch (error) {
      expect(isHttpError(error)).toBe(true)
      if (isHttpError(error)) {
        expect(error.status).toBe(404)
      }
    }
  })

  it('throws HttpError with error message from response body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'custom error' }), { status: 400 }),
    )
    await expect(apiFetch('/test/')).rejects.toThrow('custom error')
  })

  it('returns null for parse mode none', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('ignored', { status: 200 }))
    const result = await apiFetch<null>('/test/', { parse: 'none' })
    expect(result).toBeNull()
  })

  it('fetches CSRF cookie when ensureCsrf is true', async () => {
    setCsrfCookie(null)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    await apiFetch('/test/', { ensureCsrf: true })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/auth/csrf/')
  })
})
