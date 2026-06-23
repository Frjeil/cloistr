import {
  Alert,
  Avatar,
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
import { IconTrophy } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLeaderboardQuery } from '../hooks/useLeaderboardQuery'
import type { LeaderboardEntry, LeaderboardSectionKey } from '../types/leaderboard'
import { DiscordBadge, LevelBadge } from '../utils/leaderboard'
import { fadeUp, fadeUpStagger } from '../utils/motion'

type SectionConfig = {
  key: LeaderboardSectionKey
  title: string
  valueLabel: string
  renderValue: (entry: LeaderboardEntry) => ReactNode
}

function LeaderboardRow({ entry, section }: { entry: LeaderboardEntry; section: SectionConfig }) {
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
      <Table.Td style={{ minWidth: 0, overflow: 'hidden' }}>
        <Group wrap="nowrap" gap="sm" align="flex-start">
          <Avatar radius="xl" size={44} src={entry.avatarUrl || undefined} alt={displayName}>
            {(displayName ?? '?').slice(0, 1).toUpperCase()}
          </Avatar>
          <Stack gap={4} style={{ minWidth: 0, overflow: 'hidden' }}>
            <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
              <Text fw={600} truncate="end" style={{ minWidth: 0 }}>
                {displayName}
              </Text>
              <DiscordBadge entry={entry} />
            </Group>
            <LevelBadge entry={entry} />
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

function LoadingState({ sections }: { sections: SectionConfig[] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      {sections.map((section) => (
        <Paper withBorder radius="md" key={section.key} p="sm">
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
    return [
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

        {isPending ? <LoadingState sections={sections} /> : null}

        {!isPending ? (
          <motion.div variants={fadeUpStagger} initial="hidden" animate="visible">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              {sections.map((section) => {
                const entries = data?.[section.key] ?? []

                return (
                  <motion.div key={section.key} variants={fadeUp}>
                    <Paper withBorder radius="md" p="sm" style={{ height: '100%' }}>
                      <Title order={2} size="h4" mb="sm">
                        {section.title}
                      </Title>
                      <Table verticalSpacing="sm" striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t('rank')}</Table.Th>
                            <Table.Th>{t('member')}</Table.Th>
                            <Table.Th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                              {section.valueLabel}
                            </Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {entries.length ? (
                            entries.map((entry) => (
                              <LeaderboardRow
                                key={`${section.key}-${entry.username}`}
                                entry={entry}
                                section={section}
                              />
                            ))
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
                  </motion.div>
                )
              })}
            </SimpleGrid>
          </motion.div>
        ) : null}
      </Stack>
    </Container>
  )
}
