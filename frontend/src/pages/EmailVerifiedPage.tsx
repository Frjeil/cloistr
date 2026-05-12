import { Anchor, Button, Container, Paper, Stack, Text, Title } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { appConfig } from '../lib/config'

export default function EmailVerifiedPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')

  return (
    <Container size="xs" pt={48} pb={48}>
      <Paper withBorder p="xl" radius="lg">
        <Stack align="center" gap="md">
          <IconCheck size={48} />
          <Title order={2} ta="center">
            {t('emailVerified.title')}
          </Title>
          <Text c="dimmed" ta="center">
            {t('emailVerified.description')}
          </Text>
          <Button fullWidth onClick={() => navigate('/login')}>
            {t('emailVerified.login')}
          </Button>
          <Text size="sm" c="dimmed" ta="center">
            {t('emailVerified.help')}{' '}
            <Anchor href={appConfig.discordUrl} target="_blank" rel="noreferrer">
              Discord
            </Anchor>
            .
          </Text>
        </Stack>
      </Paper>
    </Container>
  )
}
