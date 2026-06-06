import { describe, expect, it, vi } from 'vitest'
import {
  deleteProfileAvatar,
  normalizeProfileDetails,
  updateProfileSettings,
  uploadProfileAvatar,
} from './profile'

vi.mock('./client', () => ({
  apiFetch: vi.fn(),
}))

describe('normalizeProfileDetails', () => {
  it('maps a profile payload into frontend-safe types', () => {
    expect(
      normalizeProfileDetails({
        id: 7,
        username: 'cloistered',
        email: 'test@example.com',
        xp: '4200',
        total_checkins: '12',
        activity_streak_days: '4',
        last_checkin_date: '2024-12-15',
        avatar_url: 'https://example.com/avatar.png',
        share_presence: false,
        discord_handle: '@owl',
        level: {
          slug: 'scribe',
          name: 'Scribe',
          xp_into_level: '200',
          xp_required_for_next_level: '500',
          xp_to_next_level: '300',
          progress_percentage: '40',
          position: '3',
          total_levels: '12',
          is_max_level: false,
          next_level: { slug: 'archivist', name: 'Archivist' },
        },
      }),
    ).toEqual({
      id: '7',
      username: 'cloistered',
      email: 'test@example.com',
      xp: 4200,
      totalCheckins: 12,
      activityStreakDays: 4,
      lastCheckinDate: '2024-12-15',
      avatarUrl: 'https://example.com/avatar.png',
      sharePresence: false,
      discordHandle: '@owl',
      level: {
        slug: 'scribe',
        name: 'Scribe',
        xpIntoLevel: 200,
        xpRequiredForNextLevel: 500,
        xpToNextLevel: 300,
        progressPercentage: 40,
        position: 3,
        totalLevels: 12,
        isMaxLevel: false,
        nextLevel: { slug: 'archivist', name: 'Archivist' },
      },
      earnedBadges: [],
    })
  })

  it('returns null for incomplete payloads', () => {
    expect(normalizeProfileDetails({ username: 'missing-id' })).toBeNull()
  })

  it('returns null for non-object payload', () => {
    expect(normalizeProfileDetails(null)).toBeNull()
    expect(normalizeProfileDetails(42)).toBeNull()
  })

  it('handles missing level', () => {
    const result = normalizeProfileDetails({ id: '1', username: 'test', level: null })
    expect(result).not.toBeNull()
    expect(result?.level).toBeNull()
  })

  it('handles max level without next_level', () => {
    const result = normalizeProfileDetails({
      id: '1',
      username: 'test',
      level: {
        slug: 'mythic',
        name: 'Mythic',
        xp_into_level: 5000,
        xp_required_for_next_level: null,
        xp_to_next_level: null,
        progress_percentage: 100,
        position: '12',
        total_levels: '12',
        is_max_level: true,
        next_level: null,
      },
    })
    expect(result).not.toBeNull()
    expect(result?.level?.isMaxLevel).toBe(true)
    expect(result?.level?.nextLevel).toBeNull()
  })

  it('converts string numbers to numbers', () => {
    const result = normalizeProfileDetails({
      id: '1',
      username: 'test',
      xp: '100',
      total_checkins: '5',
      activity_streak_days: '3',
    })
    expect(result).not.toBeNull()
    expect(result?.xp).toBe(100)
    expect(result?.totalCheckins).toBe(5)
    expect(result?.activityStreakDays).toBe(3)
  })

  it('returns null for missing username', () => {
    expect(normalizeProfileDetails({ id: '1' })).toBeNull()
  })
})

describe('updateProfileSettings', () => {
  it('sends snake_case payload', async () => {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValue({
      id: '1',
      username: 'test',
      discord_handle: '@updated',
      share_presence: false,
    })
    const result = await updateProfileSettings({
      discord_handle: '@updated',
      share_presence: false,
    })
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      '/api/profile/me/',
      expect.objectContaining({
        method: 'PATCH',
        body: { discord_handle: '@updated', share_presence: false },
      }),
    )
    expect(result.username).toBe('test')
    expect(result.discordHandle).toBe('@updated')
  })
})

describe('uploadProfileAvatar', () => {
  it('sends FormData with avatar file', async () => {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValue({
      id: '1',
      username: 'test',
      avatar_url: 'data:image/png;base64,xxx',
    })
    const file = new File(['fake-png'], 'avatar.png', { type: 'image/png' })
    const result = await uploadProfileAvatar(file)
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      '/api/profile/avatar/',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )
    expect(result.avatarUrl).toBe('data:image/png;base64,xxx')
  })
})

describe('deleteProfileAvatar', () => {
  it('calls DELETE endpoint', async () => {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValue(null)
    await deleteProfileAvatar()
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      '/api/profile/avatar/',
      expect.objectContaining({ method: 'DELETE', parse: 'none' }),
    )
  })
})
