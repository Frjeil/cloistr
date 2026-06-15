import { Button, Checkbox, Chip, Group, Modal, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SpaceFilters } from '../../types/spaces'

type PendingFilters = {
  kind: SpaceFilters['kind']
  availability: SpaceFilters['availability']
  wifi: boolean
  power: boolean
  quiet: boolean
  airConditioning: boolean
}

type Props = {
  opened: boolean
  current: PendingFilters
  onCommit: (filters: PendingFilters) => void
  onClose: () => void
}

const kindOptions = [
  { value: '', labelKey: 'kindOptions.any' },
  { value: 'library', labelKey: 'kindOptions.library' },
  { value: 'cafe', labelKey: 'kindOptions.cafe' },
  { value: 'classroom', labelKey: 'kindOptions.classroom' },
  { value: 'coworking', labelKey: 'kindOptions.coworking' },
  { value: 'other', labelKey: 'kindOptions.other' },
]

const availabilityOptions = [
  { value: '', labelKey: 'availability.any' },
  { value: 'free', labelKey: 'availability.free' },
  { value: 'moderate', labelKey: 'availability.moderate' },
  { value: 'busy', labelKey: 'availability.busy' },
]

export function FilterModal({ opened, current, onCommit, onClose }: Props) {
  const { t } = useTranslation('spaces')
  const [pending, setPending] = useState<PendingFilters>({ ...current })

  const hasActiveFilters =
    pending.kind !== '' ||
    pending.availability !== '' ||
    pending.wifi ||
    pending.power ||
    pending.quiet ||
    pending.airConditioning

  const resetPendingFilters = () => {
    setPending({
      kind: '',
      availability: '',
      wifi: false,
      power: false,
      quiet: false,
      airConditioning: false,
    })
  }

  const commitFilters = () => {
    onCommit(pending)
    onClose()
  }

  const discardFilters = () => {
    setPending({ ...current })
    onClose()
  }

  return (
    <Modal
      opened={opened}
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
              value={pending.kind}
              onChange={(v) => setPending((prev) => ({ ...prev, kind: v as SpaceFilters['kind'] }))}
            >
              <Group gap="xs">
                {kindOptions.map((opt) => (
                  <Chip key={opt.value} value={opt.value} size="sm" variant="light">
                    {t(opt.labelKey)}
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
              value={pending.availability}
              onChange={(v) =>
                setPending((prev) => ({ ...prev, availability: v as SpaceFilters['availability'] }))
              }
            >
              <Group gap="xs">
                {availabilityOptions.map((opt) => (
                  <Chip key={opt.value} value={opt.value} size="sm" variant="light">
                    {t(opt.labelKey)}
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
              checked={pending.wifi}
              onChange={(event) =>
                setPending((prev) => ({ ...prev, wifi: event.currentTarget.checked }))
              }
            />
            <Checkbox
              label={t('amenities.power')}
              checked={pending.power}
              onChange={(event) =>
                setPending((prev) => ({ ...prev, power: event.currentTarget.checked }))
              }
            />
            <Checkbox
              label={t('amenities.quiet')}
              checked={pending.quiet}
              onChange={(event) =>
                setPending((prev) => ({ ...prev, quiet: event.currentTarget.checked }))
              }
            />
            <Checkbox
              label={t('amenities.airConditioning')}
              checked={pending.airConditioning}
              onChange={(event) =>
                setPending((prev) => ({ ...prev, airConditioning: event.currentTarget.checked }))
              }
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
  )
}
