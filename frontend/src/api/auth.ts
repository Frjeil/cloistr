import type { SessionApiPayload, SessionPayload, SessionUser, UserProfile } from '../types/auth'
import { readBoolean, readIdentifier, readNumber, readString } from '../utils/normalizers'
import { apiFetch, HttpError } from './client'

type LoginPayload = {
  login: string
  password: string
}

type RegisterPayload = {
  username: string
  email: string
  password1: string
  password2: string
}

type PasswordResetPayload = {
  email: string
}

type PasswordResetConfirmPayload = {
  uid: string
  token: string
  new_password1: string
  new_password2: string
}

type PasswordChangePayload = {
  old_password: string
  new_password1: string
  new_password2: string
}

type PasswordResetRequestResponse = {
  detail?: string
}

type ErrorBody = {
  detail?: string
  error?: string
  non_field_errors?: string[]
  [key: string]: unknown
}

export async function loginUser(payload: LoginPayload): Promise<unknown> {
  return apiFetch<unknown>('/api/auth/login/', {
    method: 'POST',
    body: payload,
    csrf: true,
    ensureCsrf: true,
    errorMessage: 'Unable to log in',
  })
}

export async function registerUser(payload: RegisterPayload): Promise<unknown> {
  return apiFetch<unknown>('/api/auth/register/', {
    method: 'POST',
    body: payload,
    csrf: true,
    ensureCsrf: true,
    errorMessage: 'Unable to register',
  })
}

export async function requestPasswordReset(payload: PasswordResetPayload): Promise<void> {
  try {
    await apiFetch<PasswordResetRequestResponse>('/api/auth/password/reset/request/', {
      method: 'POST',
      body: payload,
      csrf: true,
      ensureCsrf: true,
      errorMessage: 'Unable to request password reset',
    })
    return
  } catch (error) {
    if (error instanceof HttpError && error.status === 400) {
      return
    }
    throw error
  }
}

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<void> {
  await apiFetch<null>('/api/auth/password/reset/confirm/', {
    method: 'POST',
    body: payload,
    csrf: true,
    ensureCsrf: true,
    parse: 'none',
    errorMessage: 'Unable to confirm password reset',
  })
}

export async function changePassword(payload: PasswordChangePayload): Promise<void> {
  await apiFetch<null>('/api/auth/password/change/', {
    method: 'POST',
    body: payload,
    csrf: true,
    ensureCsrf: true,
    parse: 'none',
    errorMessage: 'Unable to change password',
  })
}

export async function logoutUser(): Promise<void> {
  await apiFetch<null>('/api/auth/logout/', {
    method: 'POST',
    csrf: true,
    ensureCsrf: true,
    parse: 'none',
  })
}

export async function fetchSessionUser(signal?: AbortSignal): Promise<unknown> {
  return apiFetch<unknown>('/api/auth/me/', {
    method: 'GET',
    ensureCsrf: true,
    signal,
  })
}

export function formatApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const body = payload as ErrorBody
  if (typeof body.detail === 'string' && body.detail.trim()) {
    return body.detail
  }
  if (typeof body.error === 'string' && body.error.trim()) {
    return body.error
  }
  if (Array.isArray(body.non_field_errors) && body.non_field_errors.length > 0) {
    return body.non_field_errors.join(' ')
  }

  const messages: string[] = []
  for (const value of Object.values(body)) {
    const items = Array.isArray(value) ? value : [value]
    for (const item of items) {
      if (typeof item === 'string' && item.trim().length > 0) messages.push(item)
    }
  }

  return messages[0] ?? null
}

export const formatRegistrationError = formatApiError

function normalizeProfile(payload: unknown): UserProfile | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as Record<string, unknown>
  return {
    discordHandle: readString(candidate.discord_handle ?? candidate.discordHandle),
    avatarUrl: readString(candidate.avatar_url ?? candidate.avatarUrl),
    sharePresence: readBoolean(candidate.share_presence ?? candidate.sharePresence),
  }
}

function normalizeUser(payload: unknown): SessionUser | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as SessionApiPayload
  const id = candidate.id ?? candidate._id
  const username = readString(candidate.username)
  if ((typeof id !== 'number' && typeof id !== 'string') || !username) {
    return null
  }

  return {
    id: String(id),
    username,
    email: readString(candidate.email),
    profile: normalizeProfile(candidate.profile),
  }
}

function normalizeActiveCheckin(payload: unknown): SessionPayload['activeCheckin'] {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as Record<string, unknown>
  const id = readIdentifier(candidate.id)
  const spaceId = readIdentifier(candidate.space_id)

  if (!id || !spaceId) {
    return null
  }

  return {
    id,
    spaceId,
    spaceName: readString(candidate.space_name),
    spaceLatitude: readNumber(candidate.space_latitude),
    spaceLongitude: readNumber(candidate.space_longitude),
    spaceAddress: readString(candidate.space_address),
    usesPower: readBoolean(candidate.uses_power) ?? false,
    startedAt: readString(candidate.started_at),
  }
}

export function normalizeSessionPayload(payload: unknown): SessionPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const directUser = normalizeUser(payload)
  if (directUser) {
    const candidate = payload as SessionApiPayload
    return {
      user: directUser,
      activeCheckin: normalizeActiveCheckin(candidate.active_checkin),
    }
  }

  const candidate = payload as SessionApiPayload
  const nestedUser = normalizeUser(candidate.user)
  if (nestedUser) {
    return {
      user: nestedUser,
      activeCheckin: normalizeActiveCheckin(candidate.active_checkin),
    }
  }

  return null
}
