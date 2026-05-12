import type {
  LeaderboardApiResponse,
  LeaderboardData,
  LeaderboardEntry,
  LeaderboardSectionKey,
} from '../types/leaderboard'
import { readNumber, readString } from '../utils/normalizers'
import { apiFetch } from './client'

const leaderboardSections: LeaderboardSectionKey[] = ['xp', 'levels', 'checkins', 'streak']

function normalizeEntry(entry: unknown): LeaderboardEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const source = entry as Record<string, unknown>
  const username = readString(source.username)
  const rank = readNumber(source.rank)

  if (!username || rank === null) {
    return null
  }

  const levelSource =
    source.level && typeof source.level === 'object'
      ? (source.level as Record<string, unknown>)
      : null
  const nextLevelSource =
    levelSource?.next_level && typeof levelSource.next_level === 'object'
      ? (levelSource.next_level as Record<string, unknown>)
      : null

  return {
    rank,
    username,
    avatarUrl: readString(source.avatar_url),
    discordHandle: readString(source.discord_handle),
    xp: readNumber(source.xp),
    totalCheckins: readNumber(source.total_checkins),
    activityStreakDays: readNumber(source.activity_streak_days),
    level: levelSource
      ? {
          slug: readString(levelSource.slug),
          name: readString(levelSource.name),
          xpToNextLevel: readNumber(levelSource.xp_to_next_level),
          nextLevel: nextLevelSource
            ? {
                slug: readString(nextLevelSource.slug),
                name: readString(nextLevelSource.name),
              }
            : null,
        }
      : null,
  }
}

function normalizeSection(section: unknown): LeaderboardEntry[] {
  if (!Array.isArray(section)) {
    return []
  }

  return section
    .map(normalizeEntry)
    .filter((entry): entry is LeaderboardEntry => entry !== null)
    .sort((left, right) => left.rank - right.rank)
}

export async function fetchLeaderboard(): Promise<LeaderboardData> {
  const response = await apiFetch<LeaderboardApiResponse>('/api/leaderboard/', {
    errorMessage: 'Unable to load leaderboard',
  })

  const results = response.results ?? {}
  const normalizedData: LeaderboardData = {
    xp: [],
    levels: [],
    checkins: [],
    streak: [],
  }

  for (const section of leaderboardSections) {
    normalizedData[section] = normalizeSection(results[section])
  }

  return normalizedData
}
