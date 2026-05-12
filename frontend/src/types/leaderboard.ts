export type LeaderboardSectionKey = 'xp' | 'levels' | 'checkins' | 'streak'

export type LeaderboardLevel = {
  slug: string | null
  name: string | null
  xpToNextLevel: number | null
  nextLevel: {
    slug: string | null
    name: string | null
  } | null
}

export type LeaderboardEntry = {
  rank: number
  username: string
  avatarUrl: string | null
  discordHandle: string | null
  xp: number | null
  totalCheckins: number | null
  activityStreakDays: number | null
  level: LeaderboardLevel | null
}

export type LeaderboardData = Record<LeaderboardSectionKey, LeaderboardEntry[]>

export type LeaderboardApiResponse = {
  results?: Partial<Record<LeaderboardSectionKey, unknown>>
}
