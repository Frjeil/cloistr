import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../api/leaderboard'

export const leaderboardQueryKey = ['leaderboard'] as const

export function useLeaderboardQuery() {
  return useQuery({
    queryKey: leaderboardQueryKey,
    queryFn: fetchLeaderboard,
    staleTime: 60_000,
  })
}
