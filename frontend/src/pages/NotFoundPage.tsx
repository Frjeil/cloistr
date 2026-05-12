import { Alert, Button, Container, Stack } from '@mantine/core'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation('common')

  return (
    <Container size="xs" pt={48} pb={48}>
      <Stack>
        <Alert color="yellow" variant="light">
          {t('notFound')}
        </Alert>
        <Button component="a" href="/">
          {t('goHome')}
        </Button>
      </Stack>
    </Container>
  )
}
