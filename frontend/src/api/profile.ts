import type { ProfileDetails, ProfileLevel } from '../types/profile'
import { formatApiError } from './auth'
import { apiFetch } from './client'
import { readBoolean, readNumber, readString } from '../utils/normalizers'

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
