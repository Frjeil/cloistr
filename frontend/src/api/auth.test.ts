import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  changePassword,
  confirmPasswordReset,
  formatApiError,
  loginUser,
  logoutUser,
  normalizeSessionPayload,
  registerUser,
  requestPasswordReset,
} from './auth'

vi.mock('./client', () => ({
  apiFetch: vi.fn(),
  HttpError: class HttpError extends Error {
    status?: number
    body?: unknown
    constructor(message: string, options?: { status?: number; body?: unknown }) {
      super(message)
      this.name = 'HttpError'
      this.status = options?.status
      this.body = options?.body
    }
  },
  isHttpError: (error: unknown): error is HttpError => error instanceof HttpError,
}))

describe('normalizeSessionPayload', () => {
  it('returns null for non-object payload', () => {
    expect(normalizeSessionPayload(null)).toBeNull()
    expect(normalizeSessionPayload('string')).toBeNull()
    expect(normalizeSessionPayload(42)).toBeNull()
  })

  it('normalizes a direct user payload', () => {
    const result = normalizeSessionPayload({
      id: 'user1',
      username: 'testuser',
      email: 'test@example.com',
      profile: {
        discord_handle: '@test',
        avatar_url: 'https://example.com/avatar.png',
        share_presence: true,
      },
      active_checkin: {
        id: 'checkin1',
        space_id: 'space1',
        space_name: 'Library',
        space_latitude: 45.46,
        space_longitude: 9.19,
        space_address: 'Via Roma 1',
        uses_power: false,
        started_at: '2024-01-01T10:00:00Z',
      },
    })
    expect(result).not.toBeNull()
    expect(result?.user?.id).toBe('user1')
    expect(result?.user?.username).toBe('testuser')
    expect(result?.activeCheckin?.id).toBe('checkin1')
    expect(result?.activeCheckin?.spaceId).toBe('space1')
  })

  it('normalizes a nested user payload', () => {
    const result = normalizeSessionPayload({
      user: { id: 'user2', username: 'nested' },
    })
    expect(result).not.toBeNull()
    expect(result?.user?.id).toBe('user2')
    expect(result?.user?.username).toBe('nested')
    expect(result?.activeCheckin).toBeNull()
  })

  it('returns null when neither user structure is valid', () => {
    expect(normalizeSessionPayload({ unrelated: 'data' })).toBeNull()
  })

  it('handles missing profile gracefully', () => {
    const result = normalizeSessionPayload({ id: 'user1', username: 'testuser' })
    expect(result).not.toBeNull()
    expect(result?.user?.profile).toBeNull()
  })

  it('handles missing active_checkin gracefully', () => {
    const result = normalizeSessionPayload({ id: 'user1', username: 'testuser' })
    expect(result).not.toBeNull()
    expect(result?.activeCheckin).toBeNull()
  })

  it('handles partial active_checkin data', () => {
    const result = normalizeSessionPayload({
      id: 'user1',
      username: 'testuser',
      active_checkin: { id: 'c1', space_id: 's1' },
    })
    expect(result).not.toBeNull()
    expect(result?.activeCheckin?.id).toBe('c1')
    expect(result?.activeCheckin?.spaceName).toBeNull()
  })

  it('rejects active_checkin without id', () => {
    const result = normalizeSessionPayload({
      id: 'user1',
      username: 'testuser',
      active_checkin: { space_id: 's1' },
    })
    expect(result).not.toBeNull()
    expect(result?.activeCheckin).toBeNull()
  })
})

describe('formatApiError', () => {
  it('returns detail field', () => {
    expect(formatApiError({ detail: 'error detail' })).toBe('error detail')
  })

  it('returns error field', () => {
    expect(formatApiError({ error: 'error message' })).toBe('error message')
  })

  it('joins non_field_errors', () => {
    expect(formatApiError({ non_field_errors: ['err1', 'err2'] })).toBe('err1 err2')
  })

  it('returns first string value from object', () => {
    expect(formatApiError({ username: 'already exists' })).toBe('already exists')
    expect(formatApiError({ non_field_errors: [1, 'valid string'] })).toBe('1 valid string')
  })

  it('returns null for non-object', () => {
    expect(formatApiError(null)).toBeNull()
    expect(formatApiError('string')).toBeNull()
  })

  it('returns null for empty object', () => {
    expect(formatApiError({})).toBeNull()
  })

  it('returns null for object with only numeric values', () => {
    expect(formatApiError({ code: 400 })).toBeNull()
  })
})

describe('auth API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function mockClient(value: unknown) {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValue(value)
  }

  it('loginUser calls POST auth/login/', async () => {
    await mockClient({ id: 'u1', username: 'test' })
    const result = await loginUser({ login: 'test', password: 'pwd' })
    const { apiFetch } = await import('./client')
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      '/api/auth/login/',
      expect.objectContaining({ method: 'POST', body: { login: 'test', password: 'pwd' } }),
    )
    expect(result).toEqual({ id: 'u1', username: 'test' })
  })

  it('registerUser calls POST auth/register/', async () => {
    await mockClient({ id: 'u1', username: 'newuser' })
    const result = await registerUser({
      username: 'newuser',
      email: 'test@test.com',
      password1: 'pw1',
      password2: 'pw1',
    })
    const { apiFetch } = await import('./client')
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      '/api/auth/register/',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result).toEqual({ id: 'u1', username: 'newuser' })
  })

  it('logoutUser calls POST auth/logout/', async () => {
    await mockClient(null)
    await logoutUser()
    const { apiFetch } = await import('./client')
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      '/api/auth/logout/',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('requestPasswordReset handles 400 silently', async () => {
    const { apiFetch, HttpError } = await import('./client')
    vi.mocked(apiFetch).mockRejectedValue(new HttpError('bad request', { status: 400 }))
    await requestPasswordReset({ email: 'test@test.com' })
  })

  it('requestPasswordReset re-throws non-400 errors', async () => {
    const { apiFetch, HttpError } = await import('./client')
    vi.mocked(apiFetch).mockRejectedValue(new HttpError('server error', { status: 500 }))
    await expect(requestPasswordReset({ email: 'test@test.com' })).rejects.toThrow()
  })

  it('confirmPasswordReset calls POST', async () => {
    await mockClient(null)
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValue(null)
    await confirmPasswordReset({
      uid: 'u1',
      token: 'tok',
      new_password1: 'pw1',
      new_password2: 'pw1',
    })
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      '/api/auth/password/reset/confirm/',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('changePassword calls POST', async () => {
    await mockClient(null)
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValue(null)
    await changePassword({ old_password: 'old', new_password1: 'new1', new_password2: 'new2' })
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      '/api/auth/password/change/',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
