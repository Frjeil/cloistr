import {
  Alert,
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
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
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
      setActionError(null)
      setActionMessage(t('startSuccess'))
      await syncSessionState()
    },
    onError: (error: unknown) => {
      setActionMessage(null)
      setActionError(
        isHttpError(error)
          ? (formatCheckinError(error.body) ?? error.message)
          : error instanceof Error
            ? error.message
            : t('checkinError'),
      )
    },
  })

  const endMutation = useMutation({
    mutationFn: endActiveCheckin,
    onSuccess: async () => {
      setActionError(null)
      setActionMessage(t('endSuccess'))
      await syncSessionState()
    },
    onError: (error: unknown) => {
      setActionMessage(null)
      setActionError(
        isHttpError(error)
          ? (formatApiError(error.body) ?? error.message)
          : error instanceof Error
            ? error.message
            : t('checkinError'),
      )
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
    setActionError(null)
    setActionMessage(null)
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
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 3000, maxWidth: 420 }}>
          <Alert color="blue" variant="light" title={t('currentCheckinTitle')} withCloseButton={false}>
            <Stack gap="sm">
              <Text>
                {t('currentCheckinBody', { space: activeCheckin.spaceName || t('unknownSpace') })}
              </Text>
              {activeCheckin.usesPower ? (
                <Badge variant="light" color="blue">{t('checkinUsesPower')}</Badge>
              ) : null}
              <Button onClick={() => void endMutation.mutateAsync(activeCheckin.id)} loading={endMutation.isPending}>
                {t('endCheckin')}
              </Button>
            </Stack>
          </Alert>
        </div>
      ) : null}

      {actionError ? (
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 3000, maxWidth: 420 }}>
          <Alert color="red" variant="light" title={t('checkinErrorTitle')}>
            {actionError}
          </Alert>
        </div>
      ) : null}

      {actionMessage ? (
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 3000, maxWidth: 420 }}>
          <Alert color="green" variant="light">
            {actionMessage}
          </Alert>
        </div>
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
