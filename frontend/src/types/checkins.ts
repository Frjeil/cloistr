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
