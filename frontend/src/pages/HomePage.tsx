import {
  Alert,
  Autocomplete,
  Button,
  Checkbox,
  Chip,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatApiError } from '../api/auth'
import { endActiveCheckin, formatCheckinError, startCheckin } from '../api/checkins'
import { isHttpError } from '../api/client'
import { fetchSpaces } from '../api/spaces'
import { SpacesMap } from '../components/map/SpacesMap'
import { useAuth } from '../context/AuthContext'
import { profileQueryKey } from '../hooks/useProfileQuery'
import { spacesRootQueryKey, useSpacesQuery } from '../hooks/useSpacesQuery'
import type { SpaceFilters } from '../types/spaces'

export default function HomePage() {
  const { t } = useTranslation('spaces')
  const queryClient = useQueryClient()
  const { activeCheckin, isAuthenticated, refreshSession } = useAuth()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<SpaceFilters['kind']>('')
  const [availability, setAvailability] = useState<SpaceFilters['availability']>('')
  const [wifi, setWifi] = useState(false)
  const [power, setPower] = useState(false)
  const [quiet, setQuiet] = useState(false)
  const [airConditioning, setAirConditioning] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<{ longitude: number; latitude: number } | null>(
    null,
  )
  const [searchOpened, { open: openSearch, close: closeSearch }] = useDisclosure(false)
  const [filtersOpened, filtersCtrl] = useDisclosure(false)

  const [pendingFilters, setPendingFilters] = useState({
    kind: '' as SpaceFilters['kind'],
    availability: '' as SpaceFilters['availability'],
    wifi: false,
    power: false,
    quiet: false,
    airConditioning: false,
  })

  const openFilters = () => {
    setPendingFilters({ kind, availability, wifi, power, quiet, airConditioning })
    filtersCtrl.open()
  }

  const filters = useMemo<SpaceFilters>(
    () => ({
      q: '',
      kind,
      availability,
      wifi,
      power,
      quiet,
      airConditioning,
    }),
    [airConditioning, availability, kind, power, quiet, wifi],
  )

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
    if (kind) c++
    if (availability) c++
    if (wifi) c++
    if (power) c++
    if (quiet) c++
    if (airConditioning) c++
    return c
  }, [kind, availability, wifi, power, quiet, airConditioning])

  const hasActiveFilters =
    pendingFilters.kind !== '' ||
    pendingFilters.availability !== '' ||
    pendingFilters.wifi ||
    pendingFilters.power ||
    pendingFilters.quiet ||
    pendingFilters.airConditioning

  const resetPendingFilters = () => {
    setPendingFilters({
      kind: '',
      availability: '',
      wifi: false,
      power: false,
      quiet: false,
      airConditioning: false,
    })
  }

  const commitFilters = () => {
    setKind(pendingFilters.kind)
    setAvailability(pendingFilters.availability)
    setWifi(pendingFilters.wifi)
    setPower(pendingFilters.power)
    setQuiet(pendingFilters.quiet)
    setAirConditioning(pendingFilters.airConditioning)
    filtersCtrl.close()
  }

  const discardFilters = () => {
    setPendingFilters({ kind, availability, wifi, power, quiet, airConditioning })
    filtersCtrl.close()
  }

  const handleStartCheckin = (spaceId: string, usesPower: boolean) => {
    void startMutation.mutateAsync({ spaceId, usesPower })
  }

  const handleEndCheckin = (checkinId: string) => {
    void endMutation.mutateAsync(checkinId)
  }

  const kindOptions = [
    { value: '', label: t('kindOptions.any') },
    { value: 'library', label: t('kindOptions.library') },
    { value: 'cafe', label: t('kindOptions.cafe') },
    { value: 'classroom', label: t('kindOptions.classroom') },
    { value: 'coworking', label: t('kindOptions.coworking') },
    { value: 'other', label: t('kindOptions.other') },
  ]

  const availabilityOptions = [
    { value: '', label: t('availability.any') },
    { value: 'free', label: t('availability.free') },
    { value: 'moderate', label: t('availability.moderate') },
    { value: 'busy', label: t('availability.busy') },
  ]

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

      <Modal
        opened={filtersOpened}
        onClose={discardFilters}
        title={t('filtersTitle')}
        size="md"
        scrollAreaComponent={undefined}
      >
        <Stack gap="xl">
          <Group grow align="flex-start" gap="lg">
            <div>
              <Text size="sm" fw={600} mb={6}>
                {t('kind')}
              </Text>
              <Chip.Group
                value={pendingFilters.kind}
                onChange={(v) =>
                  setPendingFilters((prev) => ({ ...prev, kind: v as SpaceFilters['kind'] }))
                }
              >
                <Group gap="xs">
                  {kindOptions.map((opt) => (
                    <Chip key={opt.value} value={opt.value} size="sm" variant="light">
                      {opt.label}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </div>
            <div>
              <Text size="sm" fw={600} mb={6}>
                {t('availabilityLabel')}
              </Text>
              <Chip.Group
                value={pendingFilters.availability}
                onChange={(v) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    availability: v as SpaceFilters['availability'],
                  }))
                }
              >
                <Group gap="xs">
                  {availabilityOptions.map((opt) => (
                    <Chip key={opt.value} value={opt.value} size="sm" variant="light">
                      {opt.label}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </div>
          </Group>

          <div>
            <Text size="sm" fw={600} mb={8}>
              {t('amenitiesLabel')}
            </Text>
            <Group gap="sm">
              <Checkbox
                label={t('amenities.wifi')}
                checked={pendingFilters.wifi}
                onChange={(event) => {
                  const checked = event.currentTarget.checked
                  setPendingFilters((prev) => ({ ...prev, wifi: checked }))
                }}
              />
              <Checkbox
                label={t('amenities.power')}
                checked={pendingFilters.power}
                onChange={(event) => {
                  const checked = event.currentTarget.checked
                  setPendingFilters((prev) => ({ ...prev, power: checked }))
                }}
              />
              <Checkbox
                label={t('amenities.quiet')}
                checked={pendingFilters.quiet}
                onChange={(event) => {
                  const checked = event.currentTarget.checked
                  setPendingFilters((prev) => ({ ...prev, quiet: checked }))
                }}
              />
              <Checkbox
                label={t('amenities.airConditioning')}
                checked={pendingFilters.airConditioning}
                onChange={(event) => {
                  const checked = event.currentTarget.checked
                  setPendingFilters((prev) => ({ ...prev, airConditioning: checked }))
                }}
              />
            </Group>
          </div>

          <Group gap="sm" justify="space-between">
            <Button variant="subtle" onClick={resetPendingFilters} disabled={!hasActiveFilters}>
              {t('clearFilters')}
            </Button>
            <Button onClick={commitFilters}>{t('filtersDone')}</Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}
