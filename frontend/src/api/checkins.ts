import { formatApiError } from './auth'
import { apiFetch } from './client'
import type { ActiveCheckinUser, CheckinHistoryEntry } from '../types/checkins'

export type StartCheckinPayload = {
  spaceId: string
  usesPower?: boolean
}

export async function startCheckin(payload: StartCheckinPayload): Promise<void> {
  await apiFetch<unknown>('/api/checkins/start/', {
    method: 'POST',
    body: {
      space_id: payload.spaceId,
      uses_power: payload.usesPower ?? false,
    },
    csrf: true,
    ensureCsrf: true,
    errorMessage: 'Unable to start check-in',
  })
}

export async function endActiveCheckin(checkinId: string): Promise<void> {
  await apiFetch<unknown>('/api/checkins/end/', {
    method: 'POST',
    body: {
      checkin_id: checkinId,
    },
    csrf: true,
    ensureCsrf: true,
    errorMessage: 'Unable to end check-in',
  })
}

type CheckinHistoryApiResponse = {
  results?: unknown[]
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readBoolean(value: unknown): boolean {
  return value === true
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function normalizeCheckinHistoryEntry(payload: unknown): CheckinHistoryEntry | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as Record<string, unknown>
  const id = readString(candidate.id)
  const spaceId = readString(candidate.space_id)
  const startedAt = readString(candidate.started_at)
  const endedAt = readString(candidate.ended_at)
  const durationMinutes = readNumber(candidate.duration_minutes)

  if (!id || !spaceId || !startedAt || !endedAt || durationMinutes === null) {
    return null
  }

  return {
    id,
    spaceId,
    spaceName: readString(candidate.space_name),
    spaceAddress: readString(candidate.space_address),
    usesPower: readBoolean(candidate.uses_power),
    startedAt,
    endedAt,
    durationMinutes,
  }
}

export async function fetchCheckinHistory(limit = 5): Promise<CheckinHistoryEntry[]> {
  const response = await apiFetch<CheckinHistoryApiResponse>(
    `/api/checkins/history/?limit=${limit}`,
    {
      method: 'GET',
      ensureCsrf: true,
      errorMessage: 'Unable to load check-in history',
    },
  )

  return (response.results ?? [])
    .map(normalizeCheckinHistoryEntry)
    .filter((entry): entry is CheckinHistoryEntry => entry !== null)
}

export const formatCheckinError = formatApiError

type ActiveCheckinUsersApiResponse = {
  results?: unknown[]
}

function normalizeActiveCheckinUser(payload: unknown): ActiveCheckinUser | null {
  if (!payload || typeof payload !== 'object') return null
  const candidate = payload as Record<string, unknown>
  const id = readString(candidate.id)
  const username = readString(candidate.username)
  if (!id || !username) return null
  return {
    id,
    username,
    avatarUrl: readString(candidate.avatar_url),
    discordHandle: readString(candidate.discord_handle),
    levelSlug: readString(candidate.level_slug),
    levelName: readString(candidate.level_name),
  }
}

export async function fetchActiveCheckinsBySpace(spaceId: string): Promise<ActiveCheckinUser[]> {
  const response = await apiFetch<ActiveCheckinUsersApiResponse>(
    `/api/checkins/active-by-space/${encodeURIComponent(spaceId)}/`,
    {
      method: 'GET',
      ensureCsrf: true,
      errorMessage: 'Unable to load active check-ins',
    },
  )

  return (response.results ?? [])
    .map(normalizeActiveCheckinUser)
    .filter((u): u is ActiveCheckinUser => u !== null)
}
