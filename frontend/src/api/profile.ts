import type {
  BadgeListResponse,
  PersonalStatsResponse,
  ProfileDetails,
  ProfileLevel,
} from '../types/profile'
import { readBoolean, readNumber, readString } from '../utils/normalizers'
import { formatApiError } from './auth'
import { apiFetch } from './client'

type ProfileApiPayload = {
  id?: string | number
  username?: string
  email?: string | null
  xp?: string | number | null
  total_checkins?: string | number | null
  activity_streak_days?: string | number | null
  last_checkin_date?: string | null
  avatar_url?: string | null
  share_presence?: boolean | null
  discord_handle?: string | null
  level?: Record<string, unknown> | null
  earned_badges?: unknown[] | null
}

export type UpdateProfilePayload = {
  username?: string
  email?: string
  current_password?: string
  discord_handle: string
  share_presence: boolean
}

function normalizeLevel(payload: unknown): ProfileLevel | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as Record<string, unknown>
  const nextLevelPayload =
    candidate.next_level && typeof candidate.next_level === 'object'
      ? (candidate.next_level as Record<string, unknown>)
      : null

  return {
    slug: readString(candidate.slug),
    name: readString(candidate.name),
    xpIntoLevel: readNumber(candidate.xp_into_level),
    xpRequiredForNextLevel: readNumber(candidate.xp_required_for_next_level),
    xpToNextLevel: readNumber(candidate.xp_to_next_level),
    progressPercentage: readNumber(candidate.progress_percentage),
    position: readNumber(candidate.position),
    totalLevels: readNumber(candidate.total_levels),
    isMaxLevel: readBoolean(candidate.is_max_level) ?? false,
    nextLevel: nextLevelPayload
      ? {
          slug: readString(nextLevelPayload.slug),
          name: readString(nextLevelPayload.name),
        }
      : null,
  }
}

export function normalizeProfileDetails(payload: unknown): ProfileDetails | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as ProfileApiPayload
  const id = candidate.id
  const username = readString(candidate.username)

  if ((typeof id !== 'number' && typeof id !== 'string') || !username) {
    return null
  }

  const earnedBadges = Array.isArray(candidate.earned_badges)
    ? candidate.earned_badges.filter((b): b is string => typeof b === 'string')
    : []

  return {
    id: String(id),
    username,
    email: readString(candidate.email),
    xp: readNumber(candidate.xp) ?? 0,
    totalCheckins: readNumber(candidate.total_checkins) ?? 0,
    activityStreakDays: readNumber(candidate.activity_streak_days) ?? 0,
    lastCheckinDate: readString(candidate.last_checkin_date),
    avatarUrl: readString(candidate.avatar_url),
    sharePresence: readBoolean(candidate.share_presence) ?? true,
    discordHandle: readString(candidate.discord_handle),
    level: normalizeLevel(candidate.level),
    earnedBadges,
  }
}

function ensureProfile(payload: unknown): ProfileDetails {
  const profile = normalizeProfileDetails(payload)

  if (!profile) {
    throw new Error('Unable to normalize profile response')
  }

  return profile
}

export async function fetchProfile(): Promise<ProfileDetails> {
  return ensureProfile(
    await apiFetch<unknown>('/api/profile/me/', {
      method: 'GET',
      ensureCsrf: true,
      errorMessage: 'Unable to load profile',
    }),
  )
}

export async function updateProfileSettings(
  payload: UpdateProfilePayload,
): Promise<ProfileDetails> {
  return ensureProfile(
    await apiFetch<unknown>('/api/profile/me/', {
      method: 'PATCH',
      body: payload,
      csrf: true,
      ensureCsrf: true,
      errorMessage: 'Unable to update profile',
    }),
  )
}

export async function uploadProfileAvatar(file: File): Promise<ProfileDetails> {
  const formData = new FormData()
  formData.set('avatar', file)

  return ensureProfile(
    await apiFetch<unknown>('/api/profile/avatar/', {
      method: 'POST',
      body: formData,
      csrf: true,
      ensureCsrf: true,
      errorMessage: 'Unable to upload avatar',
    }),
  )
}

export async function deleteProfileAvatar(): Promise<void> {
  await apiFetch<null>('/api/profile/avatar/', {
    method: 'DELETE',
    csrf: true,
    ensureCsrf: true,
    parse: 'none',
    errorMessage: 'Unable to remove avatar',
  })
}

export const formatProfileError = formatApiError

export type FavoriteSpace = {
  id: string
  name: string
  address: string | null
  kind: string | null
  latitude: number | null
  longitude: number | null
}

export async function fetchFavorites(): Promise<FavoriteSpace[]> {
  const data = await apiFetch<FavoriteSpace[] | null>('/api/profile/favorites/', {
    method: 'GET',
    ensureCsrf: true,
    errorMessage: 'Unable to load favorites',
  })
  return data ?? []
}

export async function addFavorite(spaceId: string): Promise<void> {
  await apiFetch(`/api/profile/favorites/${encodeURIComponent(spaceId)}/`, {
    method: 'POST',
    ensureCsrf: true,
    errorMessage: 'Unable to add favorite',
  })
}

export async function removeFavorite(spaceId: string): Promise<void> {
  await apiFetch(`/api/profile/favorites/${encodeURIComponent(spaceId)}/`, {
    method: 'DELETE',
    ensureCsrf: true,
    parse: 'none',
    errorMessage: 'Unable to remove favorite',
  })
}

export async function fetchBadges(): Promise<BadgeListResponse> {
  const data = await apiFetch<BadgeListResponse | null>('/api/profile/badges/', {
    method: 'GET',
    ensureCsrf: true,
    errorMessage: 'Unable to load badges',
  })
  if (!data) {
    return { earned: [], all: [] }
  }
  return data
}

function normalizeStatsResponse(payload: unknown): PersonalStatsResponse | null {
  if (!payload || typeof payload !== 'object') return null
  const d = payload as Record<string, unknown>
  const totalHoursStudied = typeof d.total_hours_studied === 'number' ? d.total_hours_studied : 0
  const longestSession = typeof d.longest_session === 'number' ? d.longest_session : 0
  const avgCheckinDuration = typeof d.avg_checkin_duration === 'number' ? d.avg_checkin_duration : 0
  const totalSpacesVisited = typeof d.total_spaces_visited === 'number' ? d.total_spaces_visited : 0
  const mostActiveDay = typeof d.most_active_day === 'number' ? d.most_active_day : 0
  const favoriteTimeSlot = (
    typeof d.favorite_time_slot === 'string' ? d.favorite_time_slot : 'morning'
  ) as PersonalStatsResponse['favoriteTimeSlot']

  let favoriteSpace: FavoriteSpaceRef | null = null
  if (d.favorite_space && typeof d.favorite_space === 'object') {
    const fs = d.favorite_space as Record<string, unknown>
    const fsId = typeof fs.id === 'string' ? fs.id : null
    const fsName = typeof fs.name === 'string' ? fs.name : null
    if (fsId || fsName) {
      favoriteSpace = { id: fsId, name: fsName }
    }
  }

  return {
    totalHoursStudied,
    longestSession,
    favoriteSpace,
    mostActiveDay,
    avgCheckinDuration,
    favoriteTimeSlot,
    totalSpacesVisited,
  }
}

export async function fetchStats(): Promise<PersonalStatsResponse> {
  const data = await apiFetch<unknown>('/api/profile/stats/', {
    method: 'GET',
    ensureCsrf: true,
    errorMessage: 'Unable to load stats',
  })
  return (
    normalizeStatsResponse(data) ?? {
      totalHoursStudied: 0,
      longestSession: 0,
      favoriteSpace: null,
      mostActiveDay: 0,
      avgCheckinDuration: 0,
      favoriteTimeSlot: 'morning',
      totalSpacesVisited: 0,
    }
  )
}
