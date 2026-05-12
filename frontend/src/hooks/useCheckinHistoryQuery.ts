import { useQuery } from '@tanstack/react-query'
import { fetchCheckinHistory } from '../api/checkins'

export const checkinHistoryQueryKey = ['checkins', 'history'] as const

export function useCheckinHistoryQuery() {
  return useQuery({
    queryKey: checkinHistoryQueryKey,
    queryFn: () => fetchCheckinHistory(5),
    staleTime: 30_000,
  })
}
