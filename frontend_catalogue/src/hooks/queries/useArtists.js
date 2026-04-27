import { useQuery } from '@tanstack/react-query'
import { searchArtists } from '../../api/requests/artists'
import { queryKeys } from '../../queries/keys'

export const useArtistSearch = (query) => {
  return useQuery({
    queryKey: queryKeys.artists.search(query),
    queryFn: () => searchArtists(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData
  })
}