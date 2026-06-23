import { Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { fadeUp } from '../utils/motion'

export default function NotFoundPage() {
  const { t } = useTranslation('common')

  return (
    <Container size="xs" pt={80} pb={48}>
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Stack align="center" gap="lg">
          <Text size="xl" fw={800} style={{ fontSize: 72, lineHeight: 1, opacity: 0.15 }}>
            404
          </Text>
          <Title order={2}>{t('notFound')}</Title>
          <Text c="dimmed" ta="center" maw={320}>
            {t('notFoundDescription') ?? 'The page you are looking for does not exist.'}
          </Text>
          <Group>
            <Button component={Link} to="/" variant="light">
              {t('goHome') ?? 'Go home'}
            </Button>
          </Group>
        </Stack>
      </motion.div>
    </Container>
  )
}
