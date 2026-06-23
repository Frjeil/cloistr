import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core'
import { IconPlug, IconSnowflake, IconVolume3, IconWifi, IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { ActiveCheckinUser } from '../../types/checkins'
import { AVAILABILITY_COLORS } from '../../types/spaces'
import type { Point } from './types'

type Props = {
  space: Point
  container: HTMLDivElement
  loading: boolean
  users: ActiveCheckinUser[]
  onClose: () => void
  onDetail: (space: Point) => void
}

export function MapPopupContent({ space, loading, users, onClose, onDetail }: Props) {
  const { t } = useTranslation('spaces')

  return (
    <Paper withBorder p="md" radius="md" shadow="md" style={{ width: 280 }}>
      <Stack gap={8}>
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
            {space.name}
          </Text>
          <ActionIcon variant="subtle" size="sm" color="gray" onClick={onClose}>
            <IconX size={14} />
          </ActionIcon>
        </Group>
        {space.address && (
          <Text size="xs" c="dimmed">
            {space.address}
          </Text>
        )}
        <Group gap={4}>
          <Badge size="sm" variant="light" color="blue">
            {space.kind ? t(`kindOptions.${space.kind}`) : t('kindOptions.other')}
          </Badge>
          <Badge
            size="sm"
            variant="light"
            color={
              AVAILABILITY_COLORS[(space.availability ?? 'free') as 'free' | 'moderate' | 'busy'] ??
              'gray'
            }
          >
            {space.availability
              ? t(`availability.${space.availability}`)
              : t('availability.unknown')}
          </Badge>
        </Group>
        <Group gap={6}>
          {space.wifi && <IconWifi size={14} />}
          {space.power && <IconPlug size={14} />}
          {space.quiet && <IconVolume3 size={14} />}
          {space.airConditioning && <IconSnowflake size={14} />}
        </Group>
        {loading ? (
          <Group gap={4}>
            <Skeleton height={28} width={28} radius="xl" />
            <Skeleton height={28} width={28} radius="xl" />
            <Skeleton height={28} width={28} radius="xl" />
          </Group>
        ) : users.length > 0 ? (
          <Avatar.Group>
            {users.slice(0, 5).map((u) => (
              <Avatar key={u.id} size="sm" src={u.avatarUrl || undefined} alt={u.username}>
                {u.username.slice(0, 1).toUpperCase()}
              </Avatar>
            ))}
            {users.length > 5 && <Avatar size="sm">+{users.length - 5}</Avatar>}
          </Avatar.Group>
        ) : null}
        <Button size="xs" variant="light" fullWidth onClick={() => onDetail(space)}>
          {t('details.open')}
        </Button>
      </Stack>
    </Paper>
  )
}
