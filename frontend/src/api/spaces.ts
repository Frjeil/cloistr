import type { SpaceFilters, SpaceSummary } from '../types/spaces'
import { readIdentifier, readNumber, readString, readStrictBoolean } from '../utils/normalizers'
import { apiFetch } from './client'

type SpacesApiResponse = {
  results?: unknown[]
}

function normalizeAvailability(value: unknown): SpaceSummary['availability'] {
  const availability = readString(value)

  return availability === 'free' || availability === 'moderate' || availability === 'busy'
    ? availability
    : null
}

function normalizeKind(value: unknown): SpaceSummary['kind'] {
  const kind = readString(value)

  return kind === 'library' ||
    kind === 'cafe' ||
    kind === 'classroom' ||
    kind === 'coworking' ||
    kind === 'other'
    ? kind
    : null
}

function normalizeSpaceSummary(payload: unknown): SpaceSummary | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as Record<string, unknown>
  const id = readIdentifier(candidate.id)
  const name = readString(candidate.name)

  if (!id || !name) {
    return null
  }

  return {
    id,
    name,
    address: readString(candidate.address),
    latitude: readNumber(candidate.latitude),
    longitude: readNumber(candidate.longitude),
    kind: normalizeKind(candidate.kind),
    capacity: readNumber(candidate.capacity),
    powerCapacity: readNumber(candidate.power_capacity),
    wifi: readStrictBoolean(candidate.wifi),
    power: readStrictBoolean(candidate.power),
    quiet: readStrictBoolean(candidate.quiet),
    airConditioning: readStrictBoolean(candidate.air_conditioning),
    availability: normalizeAvailability(candidate.availability),
  }
}

export function buildSpacesSearchParams(filters: SpaceFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.q.trim()) {
    params.set('q', filters.q.trim())
  }
  if (filters.kind) {
    params.set('kind', filters.kind)
  }
  if (filters.availability) {
    params.set('availability', filters.availability)
  }
  if (filters.wifi) {
    params.set('wifi', '1')
  }
  if (filters.power) {
    params.set('power', '1')
  }
  if (filters.quiet) {
    params.set('quiet', '1')
  }
  if (filters.airConditioning) {
    params.set('air_conditioning', '1')
  }

  return params
}

export async function fetchSpaces(filters: SpaceFilters): Promise<SpaceSummary[]> {
  const query = buildSpacesSearchParams(filters).toString()
  const path = query ? `/api/spaces/search/?${query}` : '/api/spaces/search/'
  const response = await apiFetch<SpacesApiResponse>(path, {
    method: 'GET',
    ensureCsrf: true,
    errorMessage: 'Unable to load spaces',
  })

  return (response.results ?? [])
    .map(normalizeSpaceSummary)
    .filter((space): space is SpaceSummary => space !== null)
}
