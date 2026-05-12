import { useQuery } from '@tanstack/react-query'
import { fetchSpaces } from '../api/spaces'
import type { SpaceFilters } from '../types/spaces'

export const spacesRootQueryKey = ['spaces'] as const

export function getSpacesQueryKey(filters: SpaceFilters) {
  return [
    ...spacesRootQueryKey,
    filters.q,
    filters.kind,
    filters.minCapacity,
    filters.availability,
    filters.wifi,
    filters.power,
    filters.quiet,
    filters.airConditioning,
  ] as const
}

export function useSpacesQuery(filters: SpaceFilters) {
  return useQuery({
    queryKey: getSpacesQueryKey(filters),
    queryFn: () => fetchSpaces(filters),
    staleTime: 30_000,
  })
}
