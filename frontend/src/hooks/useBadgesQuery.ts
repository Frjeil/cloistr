import { useQuery } from '@tanstack/react-query'
import { fetchBadges } from '../api/profile'

export const badgesQueryKey = ['profile', 'badges'] as const

export function useBadgesQuery() {
  return useQuery({
    queryKey: badgesQueryKey,
    queryFn: fetchBadges,
    staleTime: 60_000,
  })
}
