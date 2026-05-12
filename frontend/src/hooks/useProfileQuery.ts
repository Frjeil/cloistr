import { useQuery } from '@tanstack/react-query'
import { fetchProfile } from '../api/profile'

export const profileQueryKey = ['profile', 'me'] as const

export function useProfileQuery() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: fetchProfile,
    staleTime: 30_000,
  })
}
