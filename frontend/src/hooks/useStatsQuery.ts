import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../api/profile'

export const statsQueryKey = ['profile', 'stats'] as const

export function useStatsQuery() {
  return useQuery({
    queryKey: statsQueryKey,
    queryFn: fetchStats,
    staleTime: 60_000,
  })
}
