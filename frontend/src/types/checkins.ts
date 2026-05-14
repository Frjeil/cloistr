export type CheckinHistoryEntry = {
  id: string
  spaceId: string
  spaceName: string | null
  spaceAddress: string | null
  usesPower: boolean
  startedAt: string
  endedAt: string
  durationMinutes: number
}

export type ActiveCheckinUser = {
  id: string
  username: string
  avatarUrl: string | null
  discordHandle: string | null
  levelSlug: string | null
  levelName: string | null
}
