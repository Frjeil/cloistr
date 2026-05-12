import {
  Alert,
  Avatar,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { IconBrandDiscord, IconTrophy } from '@tabler/icons-react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLeaderboardQuery } from '../hooks/useLeaderboardQuery'
import type { LeaderboardEntry, LeaderboardSectionKey } from '../types/leaderboard'

type SectionConfig = {
  key: LeaderboardSectionKey
  title: string
  valueLabel: string
  renderValue: (entry: LeaderboardEntry) => ReactNode
}

export default function LeaderboardPage() {
  const { t, i18n } = useTranslation('leaderboard')
  const { data, error, isError, isFetching, isPending, refetch } = useLeaderboardQuery()

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language ?? undefined, {
        maximumFractionDigits: 0,
      }),
    [i18n.language],
  )

  const formatInteger = useCallback(
    (value: number | null | undefined) => {
      if (value === null || value === undefined) {
        return '0'
      }

      return numberFormatter.format(value)
    },
    [numberFormatter],
  )

  const sections = useMemo<SectionConfig[]>(() => {
    const formatLevelValue = (entry: LeaderboardEntry) => {
      const levelName = entry.level
        ? t(`levels.${entry.level.slug || 'unknown'}`, {
            defaultValue: entry.level.name || t('levels.unknown'),
          })
        : t('levels.unknown')

      const xpToNext = entry.level?.xpToNextLevel
      const nextLevelName = entry.level?.nextLevel
        ? t(`levels.${entry.level.nextLevel.slug || 'unknown'}`, {
            defaultValue: entry.level.nextLevel.name || t('levels.unknown'),
          })
        : null

      const nextLevelLabel =
        xpToNext && xpToNext > 0
          ? nextLevelName
            ? t('nextLevelWithName', {
                xp: formatInteger(xpToNext),
                level: nextLevelName,
              })
            : t('nextLevel', { xp: formatInteger(xpToNext) })
          : t('maxLevel')

      return (
        <Stack gap={2} align="flex-end">
          <Text fw={600}>{levelName}</Text>
          <Text size="xs" c="dimmed">
            {nextLevelLabel}
          </Text>
        </Stack>
      )
    }

    return [
      {
        key: 'levels',
        title: t('sections.levels'),
        valueLabel: t('level'),
        renderValue: formatLevelValue,
      },
      {
        key: 'xp',
        title: t('sections.xp'),
        valueLabel: t('xp'),
        renderValue: (entry) => formatInteger(entry.xp),
      },
      {
        key: 'checkins',
        title: t('sections.checkins'),
        valueLabel: t('checkinsOver1h'),
        renderValue: (entry) => formatInteger(entry.totalCheckins),
      },
      {
        key: 'streak',
        title: t('sections.streak'),
        valueLabel: t('streakDays'),
        renderValue: (entry) => formatInteger(entry.activityStreakDays),
      },
    ]
  }, [formatInteger, t])

  const renderLevelBadge = (entry: LeaderboardEntry) => {
    if (!entry.level) {
      return null
    }

    return (
      <Badge size="sm" variant="light">
        {t(`levels.${entry.level.slug || 'unknown'}`, {
          defaultValue: entry.level.name || t('levels.unknown'),
        })}
      </Badge>
    )
  }

  const renderDiscordBadge = (entry: LeaderboardEntry) => {
    if (!entry.discordHandle) {
      return null
    }

    return (
      <Badge size="xs" color="grape" leftSection={<IconBrandDiscord size={12} />}>
        {entry.discordHandle}
      </Badge>
    )
  }

  const renderLoadingState = () => (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
      {sections.map((section) => (
        <Paper withBorder radius="md" key={section.key} p="md">
          <Skeleton height={24} mb="md" width="45%" />
          <Stack gap="sm">
            <Skeleton height={54} radius="md" />
            <Skeleton height={54} radius="md" />
            <Skeleton height={54} radius="md" />
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  )

  const renderRow = (entry: LeaderboardEntry, section: SectionConfig) => {
    const displayName = entry.username
    const valueContent = section.renderValue(entry)

    return (
      <Table.Tr key={`${section.key}-${entry.username}`}>
        <Table.Td w={72}>
          <Group gap="xs" wrap="nowrap">
            <IconTrophy
              size={16}
              color={entry.rank <= 3 ? 'var(--mantine-color-yellow-6)' : 'currentColor'}
            />
            <Text fw={600}>{entry.rank}</Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group wrap="nowrap" gap="sm" align="flex-start">
            <Avatar radius="xl" size="md" src={entry.avatarUrl || undefined} alt={displayName}>
              {(displayName ?? '?').slice(0, 1).toUpperCase()}
            </Avatar>
            <Stack gap={4} style={{ flex: 1 }}>
              <Group gap="xs" align="center">
                <Text fw={600}>{displayName}</Text>
                {renderLevelBadge(entry)}
              </Group>
              {renderDiscordBadge(entry)}
            </Stack>
          </Group>
        </Table.Td>
        <Table.Td style={{ textAlign: 'right' }}>
          {typeof valueContent === 'string' || typeof valueContent === 'number' ? (
            <Text fw={600}>{valueContent}</Text>
          ) : (
            valueContent
          )}
        </Table.Td>
      </Table.Tr>
    )
  }

  return (
    <Container size="xl" pt={48} pb={48}>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start" gap="md">
          <Stack gap="xs" style={{ flex: 1 }}>
            <Title order={1}>{t('title')}</Title>
            <Text c="dimmed">{t('description')}</Text>
            {isFetching && !isPending ? (
              <Text size="sm" c="dimmed">
                {t('refreshing')}
              </Text>
            ) : null}
          </Stack>
          <Button variant="light" onClick={() => void refetch()} loading={isFetching}>
            {t('refresh')}
          </Button>
        </Group>

        {isError ? (
          <Alert color="red" variant="light" title={t('errorTitle')}>
            {error instanceof Error && error.message ? error.message : t('error')}
          </Alert>
        ) : null}

        {isPending ? renderLoadingState() : null}

        {!isPending ? (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {sections.map((section) => {
              const entries = data?.[section.key] ?? []

              return (
                <Paper withBorder radius="md" key={section.key} p="md" style={{ height: '100%' }}>
                  <Title order={2} size="h4" mb="sm">
                    {section.title}
                  </Title>
                  <Table verticalSpacing="sm" striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('rank')}</Table.Th>
                        <Table.Th>{t('member')}</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>{section.valueLabel}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {entries.length ? (
                        entries.map((entry) => renderRow(entry, section))
                      ) : (
                        <Table.Tr>
                          <Table.Td colSpan={3}>
                            <Text c="dimmed">{t('noParticipants')}</Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Paper>
              )
            })}
          </SimpleGrid>
        ) : null}
      </Stack>
    </Container>
  )
}
