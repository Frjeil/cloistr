import {
  Alert,
  Badge,
  Divider,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import type { ActiveCheckin } from '../../types/auth'
import type { CheckinHistoryEntry } from '../../types/checkins'
import type { BadgeListResponse, PersonalStatsResponse, ProfileDetails } from '../../types/profile'

type Props = {
  profile: ProfileDetails | undefined
  activeCheckin: ActiveCheckin
  levelName: string
  nextLevelName: string | null
  progressValue: number
  hasLevelProgress: boolean
  formatInt: (v: number | null | undefined) => string
  formatDate: (v: string | null | undefined) => string
  statsQuery: { data: PersonalStatsResponse | undefined }
  badgesQuery: { data: BadgeListResponse | undefined }
  checkinHistoryQuery: {
    data: CheckinHistoryEntry[] | undefined
    isError: boolean
    error: Error | null
    isPending: boolean
  }
}

export function ProfileStatsPanel({
  profile,
  activeCheckin,
  levelName,
  nextLevelName,
  progressValue,
  hasLevelProgress,
  formatInt,
  formatDate,
  statsQuery,
  badgesQuery,
  checkinHistoryQuery,
}: Props) {
  const { t } = useTranslation('profile')

  return (
    <Stack gap="md">
      {hasLevelProgress && profile ? (
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text fw={600}>{t('levelProgressTitle')}</Text>
              <Badge variant="light">{levelName}</Badge>
            </Group>
            {profile.level?.position && profile.level.totalLevels ? (
              <Text size="sm" c="dimmed">
                {t('levelPosition', {
                  position: formatInt(profile.level.position),
                  total: formatInt(profile.level.totalLevels),
                })}
              </Text>
            ) : null}
            <Group gap="xs" align="center">
              <Text size="sm" fw={700}>
                {formatInt(profile?.xp)} XP
              </Text>
            </Group>
            <Progress value={progressValue} radius="xl" size="lg" />
            <Group justify="space-between" gap="sm" align="flex-start">
              <Text size="sm" c="dimmed">
                {t('levelProgressDetail', {
                  current: formatInt(profile.level?.xpIntoLevel),
                  total: formatInt(profile.level?.xpRequiredForNextLevel),
                })}
              </Text>
              <Text size="sm" c="dimmed" ta="right">
                {profile.level?.isMaxLevel
                  ? t('levelMax')
                  : t('levelNext', {
                      level: nextLevelName || t('levels.unknown'),
                      xp: formatInt(profile.level?.xpToNextLevel),
                    })}
              </Text>
            </Group>
          </Stack>
        </Paper>
      ) : null}

      {statsQuery.data ? (
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Text fw={600}>{t('personalStats.title')}</Text>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {t('personalStats.totalHoursStudied')}
                </Text>
                <Group gap={4} align="baseline">
                  <Text fw={700}>{(statsQuery.data.totalHoursStudied ?? 0).toFixed(1)}</Text>
                  <Text size="xs" c="dimmed">
                    {t('personalStats.hours')}
                  </Text>
                </Group>
              </Stack>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {t('personalStats.longestSession')}
                </Text>
                <Group gap={4} align="baseline">
                  <Text fw={700}>{statsQuery.data.longestSession ?? 0}</Text>
                  <Text size="xs" c="dimmed">
                    {t('personalStats.minutes')}
                  </Text>
                </Group>
              </Stack>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {t('personalStats.totalSpacesVisited')}
                </Text>
                <Text fw={700}>{statsQuery.data.totalSpacesVisited ?? 0}</Text>
              </Stack>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {t('personalStats.favoriteSpace')}
                </Text>
                <Text fw={700} truncate="end">
                  {statsQuery.data.favoriteSpace?.name || t('personalStats.favoriteSpaceNone')}
                </Text>
              </Stack>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {t('personalStats.mostActiveDay')}
                </Text>
                <Text fw={700}>
                  {statsQuery.data.mostActiveDay != null
                    ? t(
                        `personalStats.day${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][statsQuery.data.mostActiveDay]}`,
                      )
                    : '—'}
                </Text>
              </Stack>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {t('personalStats.favoriteTimeSlot')}
                </Text>
                <Text fw={700}>
                  {statsQuery.data.favoriteTimeSlot
                    ? t(
                        `personalStats.slot${statsQuery.data.favoriteTimeSlot.charAt(0).toUpperCase() + statsQuery.data.favoriteTimeSlot.slice(1)}`,
                      )
                    : '—'}
                </Text>
              </Stack>
            </SimpleGrid>
          </Stack>
        </Paper>
      ) : null}

      {badgesQuery.data?.all?.length ? (
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={600}>{t('badges.title')}</Text>
              <Text size="xs" c="dimmed">
                {t('badges.earned')}: {badgesQuery.data.earned.length}/{badgesQuery.data.all.length}
              </Text>
            </Group>
            <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
              {badgesQuery.data.all.map((badge) => {
                const earned = badgesQuery.data?.earned.includes(badge.slug)
                return (
                  <Stack
                    key={badge.slug}
                    align="center"
                    gap={4}
                    style={{ opacity: earned ? 1 : 0.4 }}
                  >
                    <Text size="xl">{badge.icon}</Text>
                    <Text size="xs" ta="center" fw={earned ? 600 : 400} truncate="end" maw="100%">
                      {badge.name}
                    </Text>
                  </Stack>
                )
              })}
            </SimpleGrid>
          </Stack>
        </Paper>
      ) : null}

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" gap="sm">
            <Stack gap={2}>
              <Text fw={600}>{t('recentCheckins.title')}</Text>
              <Text size="sm" c="dimmed">
                {t('activeCheckin')}
              </Text>
            </Stack>
            <Badge variant="light" color={activeCheckin ? 'green' : 'gray'}>
              {activeCheckin ? t('present') : t('none')}
            </Badge>
          </Group>

          {checkinHistoryQuery.isError ? (
            <Alert color="red" variant="light">
              {checkinHistoryQuery.error instanceof Error
                ? checkinHistoryQuery.error.message
                : t('recentCheckins.error')}
            </Alert>
          ) : null}

          {profile ? <Divider /> : null}

          {profile ? (
            <Stack gap="sm">
              <Text fw={600}>{t('stats.title')}</Text>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <Stack gap={2}>
                  <Text size="sm" c="dimmed">
                    {t('stats.totalCheckins')}
                  </Text>
                  <Text fw={700}>{formatInt(profile.totalCheckins)}</Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="sm" c="dimmed">
                    {t('stats.activityStreakDays')}
                  </Text>
                  <Text fw={700}>{formatInt(profile.activityStreakDays)}</Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="sm" c="dimmed">
                    {t('stats.lastCheckinDate')}
                  </Text>
                  <Text fw={700}>{formatDate(profile.lastCheckinDate)}</Text>
                </Stack>
              </SimpleGrid>
            </Stack>
          ) : null}

          {checkinHistoryQuery.isPending ? (
            <Stack gap="xs">
              <Skeleton height={18} width="75%" />
              <Skeleton height={18} width="60%" />
            </Stack>
          ) : checkinHistoryQuery.data?.length ? (
            <Stack gap="sm">
              {checkinHistoryQuery.data.map((entry, index) => (
                <Stack key={entry.id} gap={2}>
                  {index > 0 ? <Divider variant="dashed" /> : null}
                  <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Text fw={600}>{entry.spaceName || entry.spaceId}</Text>
                      <Text size="sm" c="dimmed">
                        {entry.spaceAddress || t('recentCheckins.unknownAddress')}
                      </Text>
                    </Stack>
                    <Text size="sm" fw={700} c="dimmed" ta="right" style={{ whiteSpace: 'nowrap' }}>
                      {formatInt(entry.durationMinutes)} min
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {t('recentCheckins.details', {
                      duration: formatInt(entry.durationMinutes),
                      endedAt: formatDate(entry.endedAt),
                    })}
                  </Text>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed">{t('recentCheckins.empty')}</Text>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
