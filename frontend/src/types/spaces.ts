export type SpaceAvailability = 'free' | 'moderate' | 'busy' | null

export const AVAILABILITY_COLORS: Record<NonNullable<SpaceAvailability>, string> = {
  free: 'green',
  moderate: 'yellow',
  busy: 'red',
}

export type SpaceKind = 'library' | 'cafe' | 'classroom' | 'coworking' | 'other' | null

export type SpaceSummary = {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  kind: SpaceKind
  capacity: number | null
  powerCapacity: number | null
  wifi: boolean
  power: boolean
  quiet: boolean
  airConditioning: boolean
  availability: SpaceAvailability
}

export type SpaceFilters = {
  q: string
  kind: Exclude<SpaceKind, null> | ''
  availability: Exclude<SpaceAvailability, null> | ''
  wifi: boolean
  power: boolean
  quiet: boolean
  airConditioning: boolean
}
