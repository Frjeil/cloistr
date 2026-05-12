import { describe, expect, it, vi } from 'vitest'
import { fetchLeaderboard } from './leaderboard'

vi.mock('./client', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    results: {
      xp: [{ rank: 1, username: 'alice', xp: 500 }],
      levels: [{ rank: 1, username: 'alice', level: { slug: 'sage', name: 'Sage', xp_to_next_level: 500, next_level: { slug: 'luminary', name: 'Luminary' } } }],
      checkins: [{ rank: 1, username: 'alice', total_checkins: 20 }],
      streak: [{ rank: 1, username: 'alice', activity_streak_days: 5 }],
    },
  }),
}))

describe('fetchLeaderboard', () => {
  it('normalizes the leaderboard response', async () => {
    const data = await fetchLeaderboard()
    expect(data.xp).toHaveLength(1)
    expect(data.xp[0].username).toBe('alice')
    expect(data.xp[0].xp).toBe(500)

    expect(data.levels[0].level!.slug).toBe('sage')
    expect(data.levels[0].level!.nextLevel!.slug).toBe('luminary')
  })

  it('returns empty arrays for missing sections', async () => {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValueOnce({ results: {} })
    const data = await fetchLeaderboard()
    expect(data.xp).toEqual([])
    expect(data.levels).toEqual([])
    expect(data.checkins).toEqual([])
    expect(data.streak).toEqual([])
  })
})
