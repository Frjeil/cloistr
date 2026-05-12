import { Badge, Button, Group, Modal, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import type { SpaceSummary } from '../../types/spaces'

type Props = {
  space: SpaceSummary | null
  opened: boolean
  onClose: () => void
  isAuthenticated: boolean
  isActiveCheckin: boolean
  hasActiveCheckinElsewhere: boolean
  onStartCheckin: (spaceId: string) => void
  onEndCheckin: (checkinId: string) => void
  activeCheckinId: string | null
}

export function SpaceDetailModal({
  space, opened, onClose, isAuthenticated, isActiveCheckin,
  hasActiveCheckinElsewhere, onStartCheckin, onEndCheckin, activeCheckinId,
}: Props) {
  const { t } = useTranslation('spaces')

  if (!space) return null

  const kindLabel = space.kind ? t(`kindOptions.${space.kind}`) : t('kindOptions.other')
  const availLabel = space.availability ? t(`availability.${space.availability}`) : t('availability.unknown')
  const availColor: Record<string, string> = { free: 'green', moderate: 'yellow', busy: 'red' }

  return (
    <Modal opened={opened} onClose={onClose} size="lg" yOffset={80}>
      <Stack gap="md">
        <div>
          <Title order={3}>{space.name}</Title>
          {space.address && <Text c="dimmed" size="sm">{space.address}</Text>}
        </div>

        <Group gap="xs">
          <Badge variant="light" color="blue">{kindLabel}</Badge>
          <Badge variant="light" color={availColor[space.availability ?? ''] ?? 'gray'}>{availLabel}</Badge>
          {space.capacity ? <Badge variant="outline">{t('capacityBadge', { value: space.capacity })}</Badge> : null}
          {space.powerCapacity ? <Badge variant="outline">{t('powerSeatsBadge', { value: space.powerCapacity })}</Badge> : null}
        </Group>

        <Group gap="xs">
          {space.wifi ? <Badge size="sm" variant="light">{t('amenities.wifi')}</Badge> : null}
          {space.power ? <Badge size="sm" variant="light">{t('amenities.power')}</Badge> : null}
          {space.quiet ? <Badge size="sm" variant="light">{t('amenities.quiet')}</Badge> : null}
          {space.airConditioning ? <Badge size="sm" variant="light">{t('amenities.airConditioning')}</Badge> : null}
        </Group>

        {!isAuthenticated ? (
          <Button component="a" href="/login" fullWidth variant="light">{t('loginToCheckin')}</Button>
        ) : isActiveCheckin ? (
          <Button fullWidth color="red" onClick={() => activeCheckinId && onEndCheckin(activeCheckinId)}>
            {t('endCheckin')}
          </Button>
        ) : hasActiveCheckinElsewhere ? (
          <Button fullWidth disabled variant="light">{t('activeElsewhere')}</Button>
        ) : (
          <Button fullWidth onClick={() => onStartCheckin(space.id)}>
            {t('startCheckin')}
          </Button>
        )}
      </Stack>
    </Modal>
  )
}
