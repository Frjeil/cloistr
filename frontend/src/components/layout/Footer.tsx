import {
  ActionIcon,
  Anchor,
  Button,
  Container,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core'
import { IconBrandDiscord, IconHeart, IconMail, IconMoonStars, IconSun } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { appConfig } from '../../lib/config'
import { AppTooltip } from '../common/AppTooltip'

export function Footer() {
  const { t } = useTranslation(['common', 'nav', 'home'])
  const { isAuthenticated } = useAuth()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const { language, toggleLanguage } = useLanguage()

  return (
    <>
      <Divider />
      <Container size="xl" py="xl">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
          <Stack gap="xs">
            <Anchor component={Link} to="/" underline="never">
              <Title order={4}>Cloistr</Title>
            </Anchor>
            <Text size="sm" c="dimmed">
              {t('footer.tagline', { ns: 'home' })}
            </Text>
            <Group gap="xs">
              <AppTooltip label={t('discord', { ns: 'nav' })}>
                <ActionIcon
                  component="a"
                  href={appConfig.discordUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  variant="subtle"
                  aria-label="Discord"
                >
                  <IconBrandDiscord size={18} />
                </ActionIcon>
              </AppTooltip>
              <AppTooltip label={t('contacts', { ns: 'nav' })}>
                <ActionIcon
                  component={NavLink}
                  to="/contacts"
                  variant="subtle"
                  aria-label="Contacts"
                >
                  <IconMail size={18} />
                </ActionIcon>
              </AppTooltip>
              <AppTooltip label={t('donate', { ns: 'nav' })}>
                <ActionIcon
                  component="a"
                  href={appConfig.donateUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  variant="subtle"
                  aria-label="Donate"
                >
                  <IconHeart size={18} />
                </ActionIcon>
              </AppTooltip>
            </Group>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={600}>
              {t('footer.navigation', { ns: 'home' })}
            </Text>
            {[
              { to: '/', label: t('map', { ns: 'nav' }) },
              { to: '/leaderboard', label: t('leaderboard', { ns: 'nav' }) },
              { to: '/contacts', label: t('contacts', { ns: 'nav' }) },
              ...(isAuthenticated
                ? [{ to: '/profile', label: t('profile', { ns: 'nav' }) }]
                : [{ to: '/login', label: t('login', { ns: 'nav' }) }]),
            ].map((link) => (
              <Anchor key={link.to} component={NavLink} to={link.to} size="sm" c="dimmed">
                {link.label}
              </Anchor>
            ))}
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={600}>
              {t('footer.settings', { ns: 'home' })}
            </Text>
            <Group gap="xs">
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={
                  colorScheme === 'light' ? <IconMoonStars size={16} /> : <IconSun size={16} />
                }
                onClick={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
              >
                {colorScheme === 'light'
                  ? t('themeDark', { ns: 'nav' })
                  : t('themeLight', { ns: 'nav' })}
              </Button>
              <Button variant="subtle" size="compact-sm" onClick={toggleLanguage}>
                {language === 'it' ? 'English' : 'Italiano'}
              </Button>
            </Group>
          </Stack>
        </SimpleGrid>
        <Group justify="space-between" align="center" gap="xs" wrap="wrap" mt="xl">
          <Text size="xs" c="dimmed">
            {t('footer.copyright', { ns: 'home' })}
          </Text>
        </Group>
      </Container>
    </>
  )
}
