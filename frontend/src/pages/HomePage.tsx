import {
  Autocomplete,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatApiError } from '../api/auth'
import { endActiveCheckin, formatCheckinError, startCheckin } from '../api/checkins'
import { isHttpError } from '../api/client'
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
  const [minCapacity, setMinCapacity] = useState(0)
  const [wifi, setWifi] = useState(false)
  const [power, setPower] = useState(false)
  const [quiet, setQuiet] = useState(false)
  const [airConditioning, setAirConditioning] = useState(false)
  const [usePower, setUsePower] = useState(false)
  const [searchOpened, { open: openSearch, close: closeSearch }] = useDisclosure(false)
  const [filtersOpened, { open: openFilters, close: closeFilters }] = useDisclosure(false)
  const deferredSearch = useDeferredValue(search)

  const filters = useMemo<SpaceFilters>(
    () => ({
      q: deferredSearch,
      kind,
      minCapacity,
      availability,
      wifi,
      power,
      quiet,
      airConditioning,
    }),
    [airConditioning, availability, deferredSearch, kind, minCapacity, power, quiet, wifi],
  )

  const spacesQuery = useSpacesQuery(filters)

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
      notifications.show({ color: 'red', title: t('checkinErrorTitle'), message: msg, autoClose: 6000 })
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
      notifications.show({ color: 'red', title: t('checkinErrorTitle'), message: msg, autoClose: 6000 })
    },
  })

  const hasActiveFilters = Boolean(
    search.trim() ||
      kind ||
      availability ||
      minCapacity ||
      wifi ||
      power ||
      quiet ||
      airConditioning,
  )

  const resetFilters = () => {
    setSearch('')
    setKind('')
    setAvailability('')
    setMinCapacity(0)
    setWifi(false)
    setPower(false)
    setQuiet(false)
    setAirConditioning(false)
    setUsePower(false)
  }

  const handleStartCheckin = (spaceId: string, usesPower: boolean) => {
    void startMutation.mutateAsync({ spaceId, usesPower })
  }

  const handleEndCheckin = (checkinId: string) => {
    void endMutation.mutateAsync(checkinId)
  }

  const searchSuggestions = useMemo(() => {
    if (!spacesQuery.data) return []
    const names = spacesQuery.data.map((s) => s.name)
    return [...new Set(names)].filter(Boolean).slice(0, 10)
  }, [spacesQuery.data])

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
    <div style={{ position: 'relative', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {activeCheckin ? (
        <Paper
          shadow="md" p="sm" radius="md" withBorder
          style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 3000, maxWidth: 380 }}
        >
          <Group gap="sm" wrap="nowrap">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Group gap={4} mb={2}>
                <Badge size="sm" variant="dot" color="blue" />
                <Text size="sm" fw={600} truncate>{activeCheckin.spaceName || t('unknownSpace')}</Text>
              </Group>
              {activeCheckin.usesPower ? (
                <Text size="xs" c="dimmed">{t('checkinUsesPower')}</Text>
              ) : null}
            </div>
            <Button size="xs" color="red" variant="light" onClick={() => void endMutation.mutateAsync(activeCheckin.id)} loading={endMutation.isPending}>
              {t('endCheckin')}
            </Button>
          </Group>
        </Paper>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <SpacesMap
          spaces={spacesQuery.data ?? []}
          activeCheckin={activeCheckin}
          activeLabel={t('activeHere')}
          isAuthenticated={isAuthenticated}
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
        yOffset={80}
        scrollAreaComponent={undefined}
      >
        <Autocomplete
          label={t('searchPlaceholder')}
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={setSearch}
          onOptionSubmit={(value) => { setSearch(value); closeSearch() }}
          data={searchSuggestions}
          limit={5}
          data-autofocus
        />
      </Modal>

      <Modal
        opened={filtersOpened}
        onClose={closeFilters}
        title={t('filtersTitle')}
        size="sm"
        yOffset={80}
        scrollAreaComponent={undefined}
      >
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="sm" fw={500}>{t('kind')}</Text>
            <SegmentedControl
              value={kind}
              onChange={(v) => setKind(v as SpaceFilters['kind'] | '')}
              data={kindOptions}
              fullWidth
            />
          </Stack>

          <Stack gap={4}>
            <Text size="sm" fw={500}>{t('availabilityLabel')}</Text>
            <SegmentedControl
              value={availability}
              onChange={(v) => setAvailability(v as SpaceFilters['availability'] | '')}
              data={availabilityOptions}
              fullWidth
            />
          </Stack>

          <Stack gap={2}>
            <Text size="sm" fw={500}>
              {t('minCapacity')}: {minCapacity || t('availability.any')}
            </Text>
            <Slider
              value={minCapacity}
              onChange={setMinCapacity}
              min={0}
              max={200}
              step={10}
              marks={[
                { value: 0, label: t('availability.any') },
                { value: 100, label: '100' },
                { value: 200, label: '200' },
              ]}
              label={(v) => (v === 0 ? t('availability.any') : `${v}`)}
            />
          </Stack>

          <Checkbox
            label={t('amenities.wifi')}
            checked={wifi}
            onChange={(event) => setWifi(event.currentTarget.checked)}
          />
          <Checkbox
            label={t('amenities.power')}
            checked={power}
            onChange={(event) => setPower(event.currentTarget.checked)}
          />
          <Checkbox
            label={t('amenities.quiet')}
            checked={quiet}
            onChange={(event) => setQuiet(event.currentTarget.checked)}
          />
          <Checkbox
            label={t('amenities.airConditioning')}
            checked={airConditioning}
            onChange={(event) => setAirConditioning(event.currentTarget.checked)}
          />

          <Paper withBorder p="md" radius="md">
            <Stack gap="xs">
              <Text fw={600}>{t('checkinOptionsTitle')}</Text>
              <Checkbox
                label={t('checkinUsesPower')}
                checked={usePower}
                onChange={(event) => setUsePower(event.currentTarget.checked)}
              />
            </Stack>
          </Paper>

          <Button variant="subtle" onClick={resetFilters} disabled={!hasActiveFilters}>
            {t('clearFilters')}
          </Button>
        </Stack>
      </Modal>
    </div>
  )
}
