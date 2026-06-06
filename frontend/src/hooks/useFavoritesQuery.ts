import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addFavorite, fetchFavorites, removeFavorite } from '../api/profile'

const favoritesQueryKey = ['profile', 'favorites'] as const

export function useFavoritesQuery() {
  return useQuery({
    queryKey: favoritesQueryKey,
    queryFn: fetchFavorites,
    staleTime: 30_000,
  })
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ spaceId, isFavorite }: { spaceId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await removeFavorite(spaceId)
      } else {
        await addFavorite(spaceId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoritesQueryKey })
    },
  })
}
