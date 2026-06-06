import { ActionIcon, Avatar, Badge, Button, Group, Modal, Stack, Text, Title } from '@mantine/core'
import { IconBrandDiscord, IconExternalLink, IconHeart, IconHeartFilled } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useFavoritesQuery, useToggleFavoriteMutation } from '../../hooks/useFavoritesQuery'
import type { ActiveCheckinUser } from '../../types/checkins'
import { AVAILABILITY_COLORS, type SpaceSummary } from '../../types/spaces'

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
  activeCheckinUsers: ActiveCheckinUser[]
}

export function SpaceDetailModal({
  space,
  opened,
  onClose,
  isAuthenticated,
  isActiveCheckin,
  hasActiveCheckinElsewhere,
  onStartCheckin,
  onEndCheckin,
  activeCheckinId,
  activeCheckinUsers,
}: Props) {
  const { t } = useTranslation('spaces')
  const { data: favorites = [] } = useFavoritesQuery()
  const toggleFavorite = useToggleFavoriteMutation()

  if (!space) return null

  const kindLabel = space.kind ? t(`kindOptions.${space.kind}`) : t('kindOptions.other')
  const availLabel = space.availability
    ? t(`availability.${space.availability}`)
    : t('availability.unknown')
  const mapsUrl = space.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(space.address)}`
    : null
  const isFavorite = favorites.some((f) => f.id === space.id)

  return (
    <Modal opened={opened} onClose={onClose} size="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div style={{ flex: 1 }}>
            <Title order={3}>{space.name}</Title>
            {space.address && (
              <Text c="dimmed" size="sm">
                {space.address}
              </Text>
            )}
          </div>
          <ActionIcon
            variant={isFavorite ? 'filled' : 'light'}
            color={isFavorite ? 'red' : 'gray'}
            size="lg"
            onClick={() => toggleFavorite.mutate({ spaceId: space.id, isFavorite })}
            loading={toggleFavorite.isPending}
            aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
          >
            {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
          </ActionIcon>
        </Group>

        <Group gap="xs">
          <Badge variant="light" color="blue">
            {kindLabel}
          </Badge>
          <Badge
            variant="light"
            color={AVAILABILITY_COLORS[space.availability ?? 'free'] ?? 'gray'}
          >
            {availLabel}
          </Badge>
          {space.capacity ? (
            <Badge variant="outline">{t('capacityBadge', { value: space.capacity })}</Badge>
          ) : null}
          {space.powerCapacity ? (
            <Badge variant="outline">{t('powerSeatsBadge', { value: space.powerCapacity })}</Badge>
          ) : null}
        </Group>

        <Group gap="xs">
          {space.wifi ? (
            <Badge size="sm" variant="light">
              {t('amenities.wifi')}
            </Badge>
          ) : null}
          {space.power ? (
            <Badge size="sm" variant="light">
              {t('amenities.power')}
            </Badge>
          ) : null}
          {space.quiet ? (
            <Badge size="sm" variant="light">
              {t('amenities.quiet')}
            </Badge>
          ) : null}
          {space.airConditioning ? (
            <Badge size="sm" variant="light">
              {t('amenities.airConditioning')}
            </Badge>
          ) : null}
        </Group>

        {mapsUrl && (
          <Button
            component="a"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="light"
            fullWidth
            leftSection={<IconExternalLink size={16} />}
          >
            {t('details.openInMaps')}
          </Button>
        )}

        {activeCheckinUsers.length > 0 && (
          <div>
            <Text fw={600} size="sm" mb="xs">
              {t('details.activeCheckins')}
            </Text>
            <Stack gap="xs">
              {activeCheckinUsers.map((u) => (
                <Group key={u.id} gap="sm" wrap="nowrap">
                  <Avatar size="sm" src={u.avatarUrl || undefined} alt={u.username}>
                    {u.username.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {u.username}
                    </Text>
                    <Group gap={4}>
                      {u.levelName && (
                        <Badge size="xs" variant="light">
                          {u.levelName}
                        </Badge>
                      )}
                      {u.discordHandle && (
                        <Badge size="xs" color="grape" leftSection={<IconBrandDiscord size={10} />}>
                          {u.discordHandle}
                        </Badge>
                      )}
                    </Group>
                  </div>
                </Group>
              ))}
            </Stack>
          </div>
        )}

        {!isAuthenticated ? (
          <Button component="a" href="/login" fullWidth variant="light">
            {t('loginToCheckin')}
          </Button>
        ) : isActiveCheckin ? (
          <Button
            fullWidth
            color="red"
            onClick={() => activeCheckinId && onEndCheckin(activeCheckinId)}
          >
            {t('endCheckin')}
          </Button>
        ) : hasActiveCheckinElsewhere ? (
          <Button fullWidth disabled variant="light">
            {t('activeElsewhere')}
          </Button>
        ) : (
          <Button fullWidth onClick={() => onStartCheckin(space.id)}>
            {t('startCheckin')}
          </Button>
        )}
      </Stack>
    </Modal>
  )
}
