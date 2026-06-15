import { Alert, Autocomplete, Button, Group, Modal, Paper, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatApiError } from '../api/auth'
import { endActiveCheckin, formatCheckinError, startCheckin } from '../api/checkins'
import { isHttpError } from '../api/client'
import { fetchSpaces } from '../api/spaces'
import { FilterModal } from '../components/filters/FilterModal'
import { SpacesMap } from '../components/map/SpacesMap'
import { useAuth } from '../context/AuthContext'
import { profileQueryKey } from '../hooks/useProfileQuery'
import { spacesRootQueryKey, useSpacesQuery } from '../hooks/useSpacesQuery'
import type { SpaceFilters } from '../types/spaces'

type FiltersState = {
  kind: SpaceFilters['kind']
  availability: SpaceFilters['availability']
  wifi: boolean
  power: boolean
  quiet: boolean
  airConditioning: boolean
}

const INITIAL_FILTERS: FiltersState = {
  kind: '',
  availability: '',
  wifi: false,
  power: false,
  quiet: false,
  airConditioning: false,
}

export default function HomePage() {
  const { t } = useTranslation('spaces')
  const queryClient = useQueryClient()
  const { activeCheckin, isAuthenticated, refreshSession } = useAuth()
  const [search, setSearch] = useState('')
  const [filtersState, setFiltersState] = useState<FiltersState>(INITIAL_FILTERS)
  const [flyToTarget, setFlyToTarget] = useState<{ longitude: number; latitude: number } | null>(
    null,
  )
  const [searchOpened, { open: openSearch, close: closeSearch }] = useDisclosure(false)
  const [filtersOpened, filtersCtrl] = useDisclosure(false)

  const openFilters = () => filtersCtrl.open()

  const filters = useMemo<SpaceFilters>(() => ({ q: '', ...filtersState }), [filtersState])

  const spacesQuery = useSpacesQuery(filters)

  const { data: allSpaces } = useQuery({
    queryKey: ['spaces', 'all'],
    queryFn: () =>
      fetchSpaces({
        q: '',
        kind: '',
        availability: '',
        wifi: false,
        power: false,
        quiet: false,
        airConditioning: false,
      }),
    staleTime: 120_000,
  })

  const searchSuggestions = useMemo(() => {
    if (!allSpaces) return []
    const names = allSpaces.map((s) => s.name)
    return [...new Set(names)].filter(Boolean).slice(0, 10)
  }, [allSpaces])

  const confirmSearch = (value: string) => {
    setSearch(value)
    const match = allSpaces?.find(
      (s) =>
        s.name.toLowerCase() === value.toLowerCase() && s.latitude !== null && s.longitude !== null,
    )
    if (match && match.latitude !== null && match.longitude !== null) {
      setFlyToTarget({ longitude: match.longitude, latitude: match.latitude })
    }
    closeSearch()
  }

  const syncSessionState = async () => {
    await Promise.all([
      refreshSession(),
      queryClient.invalidateQueries({ queryKey: spacesRootQueryKey }),
      queryClient.invalidateQueries({ queryKey: profileQueryKey }),
    ])
  }

  const startMutation = useMutation({
    mutationFn: startCheckin,
    onSuccess: async () => {
      notifications.show({ color: 'green', message: t('startSuccess'), autoClose: 4000 })
      await syncSessionState()
    },
    onError: (error: unknown) => {
      const msg = isHttpError(error)
        ? (formatCheckinError(error.body) ?? error.message)
        : error instanceof Error
          ? error.message
          : t('checkinError')
      notifications.show({
        color: 'red',
        title: t('checkinErrorTitle'),
        message: msg,
        autoClose: 6000,
      })
    },
  })

  const endMutation = useMutation({
    mutationFn: endActiveCheckin,
    onSuccess: async () => {
      notifications.show({ color: 'green', message: t('endSuccess'), autoClose: 4000 })
      await syncSessionState()
    },
    onError: (error: unknown) => {
      const msg = isHttpError(error)
        ? (formatApiError(error.body) ?? error.message)
        : error instanceof Error
          ? error.message
          : t('checkinError')
      notifications.show({
        color: 'red',
        title: t('checkinErrorTitle'),
        message: msg,
        autoClose: 6000,
      })
    },
  })

  const activeFilterCount = useMemo(() => {
    let c = 0
    if (filtersState.kind) c++
    if (filtersState.availability) c++
    if (filtersState.wifi) c++
    if (filtersState.power) c++
    if (filtersState.quiet) c++
    if (filtersState.airConditioning) c++
    return c
  }, [filtersState])

  const handleCommitFilters = (f: FiltersState) => setFiltersState(f)

  const handleStartCheckin = (spaceId: string, usesPower: boolean) => {
    void startMutation.mutateAsync({ spaceId, usesPower })
  }

  const handleEndCheckin = (checkinId: string) => {
    void endMutation.mutateAsync(checkinId)
  }

  return (
    <div
      style={{
        position: 'relative',
        height: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {activeCheckin ? (
        <Paper
          withBorder
          p="md"
          radius="md"
          shadow="md"
          style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 3000, maxWidth: 360 }}
        >
          <Group gap="sm" wrap="nowrap">
            <div>
              <Text size="sm" fw={600} truncate maw={180}>
                {activeCheckin.spaceName || t('unknownSpace')}
              </Text>
              {activeCheckin.usesPower && (
                <Text size="xs" c="dimmed">
                  {t('checkinUsesPower')}
                </Text>
              )}
            </div>
            <Button
              size="compact-sm"
              color="red"
              variant="light"
              onClick={() => void endMutation.mutateAsync(activeCheckin.id)}
              loading={endMutation.isPending}
            >
              {t('endCheckin')}
            </Button>
          </Group>
        </Paper>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {spacesQuery.isError ? (
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000 }}>
            <Alert
              color="red"
              variant="filled"
              title={t('fetchErrorTitle')}
              withCloseButton
              onClose={() => void spacesQuery.refetch()}
            >
              {spacesQuery.error instanceof Error ? spacesQuery.error.message : t('fetchError')}
            </Alert>
          </div>
        ) : null}
        <SpacesMap
          spaces={spacesQuery.data ?? []}
          activeCheckin={activeCheckin}
          isAuthenticated={isAuthenticated}
          activeFilterCount={activeFilterCount}
          flyToTarget={flyToTarget}
          onStartCheckin={handleStartCheckin}
          onEndCheckin={handleEndCheckin}
          onSearchClick={openSearch}
          onFilterClick={openFilters}
        />
      </div>

      <Modal
        opened={searchOpened}
        onClose={closeSearch}
        title={t('search')}
        size="sm"
        scrollAreaComponent={undefined}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            confirmSearch(search)
          }}
        >
          <Autocomplete
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={setSearch}
            onOptionSubmit={confirmSearch}
            data={search.trim() ? searchSuggestions : []}
            limit={5}
            autoFocus
          />
        </form>
      </Modal>

      <FilterModal
        opened={filtersOpened}
        current={filtersState}
        onCommit={handleCommitFilters}
        onClose={filtersCtrl.close}
      />
    </div>
  )
}
