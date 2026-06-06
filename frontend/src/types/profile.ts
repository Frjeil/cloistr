export type BadgeInfo = {
  slug: string
  name: string
  description: string
  icon: string
}

export type BadgeListResponse = {
  earned: string[]
  all: BadgeInfo[]
}

export type FavoriteSpaceRef = {
  id: string | null
  name: string | null
}

export type PersonalStatsResponse = {
  totalHoursStudied: number
  longestSession: number
  favoriteSpace: FavoriteSpaceRef | null
  mostActiveDay: number
  avgCheckinDuration: number
  favoriteTimeSlot: 'morning' | 'afternoon' | 'evening' | 'night'
  totalSpacesVisited: number
}

export type ProfileLevelReference = {
  slug: string | null
  name: string | null
}

export type ProfileLevel = {
  slug: string | null
  name: string | null
  xpIntoLevel: number | null
  xpRequiredForNextLevel: number | null
  xpToNextLevel: number | null
  progressPercentage: number | null
  position: number | null
  totalLevels: number | null
  isMaxLevel: boolean
  nextLevel: ProfileLevelReference | null
}

export type ProfileDetails = {
  id: string
  username: string
  email: string | null
  xp: number
  totalCheckins: number
  activityStreakDays: number
  lastCheckinDate: string | null
  avatarUrl: string | null
  sharePresence: boolean
  discordHandle: string | null
  level: ProfileLevel | null
  earnedBadges: string[]
}
