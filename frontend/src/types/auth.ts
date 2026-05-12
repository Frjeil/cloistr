export type UserProfile = {
  discordHandle: string | null
  avatarUrl: string | null
  sharePresence: boolean | null
}

export type ActiveCheckin = {
  id: string
  spaceId: string
  spaceName: string | null
  spaceLatitude: number | null
  spaceLongitude: number | null
  spaceAddress: string | null
  usesPower: boolean
  startedAt: string | null
} | null

export type SessionUser = {
  id: string
  username: string
  email: string | null
  profile: UserProfile | null
}

export type SessionApiPayload = {
  id?: string | number
  _id?: string
  username?: string
  email?: string | null
  profile?: Record<string, unknown> | null
  user?: Record<string, unknown> | null
  active_checkin?: Record<string, unknown> | null
}

export type SessionPayload = {
  user: SessionUser | null
  activeCheckin: ActiveCheckin
}
