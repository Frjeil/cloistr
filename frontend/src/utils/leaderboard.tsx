import { Badge } from '@mantine/core'
import { IconBrandDiscord } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { LeaderboardEntry } from '../types/leaderboard'

export function LevelBadge({ entry }: { entry: LeaderboardEntry }) {
  const { t } = useTranslation('leaderboard')
  if (!entry.level) return null
  return (
    <Badge size="sm" variant="light">
      {t(`levels.${entry.level.slug || 'unknown'}`, {
        defaultValue: entry.level.name || t('levels.unknown'),
      })}
    </Badge>
  )
}

export function DiscordBadge({ entry }: { entry: LeaderboardEntry }) {
  if (!entry.discordHandle) return null
  return (
    <Badge size="xs" color="grape" leftSection={<IconBrandDiscord size={12} />}>
      {entry.discordHandle}
    </Badge>
  )
}
