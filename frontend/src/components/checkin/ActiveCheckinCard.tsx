import { Button, Group, Paper, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import type { ActiveCheckin } from '../../types/auth'

type Props = {
  activeCheckin: NonNullable<ActiveCheckin>
  onEnd: (id: string) => void
  isPending: boolean
}

export function ActiveCheckinCard({ activeCheckin, onEnd, isPending }: Props) {
  const { t } = useTranslation('spaces')

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      shadow="md"
      style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 3000, maxWidth: 360 }}
    >
      <Group gap="sm" wrap="nowrap">
        <div>
          <Text size="sm" fw={600} truncate maw={180}>
            {activeCheckin.spaceName || t('unknownSpace')}
          </Text>
          {activeCheckin.usesPower && (
            <Text size="xs" c="dimmed">
              {t('checkinUsesPower')}
            </Text>
          )}
        </div>
        <Button
          size="compact-sm"
          color="red"
          variant="light"
          onClick={() => onEnd(activeCheckin.id)}
          loading={isPending}
        >
          {t('endCheckin')}
        </Button>
      </Group>
    </Paper>
  )
}
