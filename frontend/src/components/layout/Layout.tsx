import {
  ActionIcon,
  Anchor,
  AppShell,
  Burger,
  Button,
  Container,
  Group,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconBrandDiscord, IconMoonStars, IconSun } from '@tabler/icons-react'
import type { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { appConfig } from '../../lib/config'
import { AppTooltip } from '../common/AppTooltip'
import { Footer } from './Footer'
import { MobileDrawer } from './MobileDrawer'

export default function Layout({ children }: PropsWithChildren) {
  const { t } = useTranslation(['common', 'nav', 'home'])
  const { isAuthenticated } = useAuth()
  const { language, toggleLanguage } = useLanguage()
  const [opened, { toggle, close }] = useDisclosure(false)
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  return (
    <AppShell header={{ height: 60 }} withBorder styles={{ main: { background: 'transparent' } }}>
      <AppShell.Header
        style={{
          zIndex: 1000,
          background: 'var(--app-surface-strong)',
          borderBottom: '1px solid var(--app-border)',
        }}
      >
        <Container size="xl" h="100%">
          <Group justify="space-between" align="center" h="100%" wrap="nowrap">
            <Group gap="sm" align="center" wrap="nowrap">
              <Burger
                opened={opened}
                onClick={toggle}
                aria-label="Toggle navigation"
                hiddenFrom="sm"
                size="sm"
              />
              <Anchor component={Link} to="/" underline="never">
                <Title order={3}>Cloistr</Title>
              </Anchor>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Button variant="subtle" component={NavLink} to="/" visibleFrom="sm">
                {t('map', { ns: 'nav' })}
              </Button>
              <Button variant="subtle" component={NavLink} to="/leaderboard" visibleFrom="sm">
                {t('leaderboard', { ns: 'nav' })}
              </Button>
              <Button variant="subtle" component={NavLink} to="/contacts" visibleFrom="sm">
                {t('contacts', { ns: 'nav' })}
              </Button>
              {isAuthenticated ? (
                <Button variant="light" component={NavLink} to="/profile" visibleFrom="sm">
                  {t('profile', { ns: 'nav' })}
                </Button>
              ) : (
                <Button variant="filled" component={NavLink} to="/login" visibleFrom="sm">
                  {t('login', { ns: 'nav' })}
                </Button>
              )}
              <Group gap="xs" wrap="nowrap" visibleFrom="sm">
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
                <AppTooltip label={t('theme', { ns: 'nav' })}>
                  <ActionIcon
                    variant="subtle"
                    aria-label="Toggle color scheme"
                    onClick={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
                  >
                    {colorScheme === 'light' ? <IconMoonStars size={18} /> : <IconSun size={18} />}
                  </ActionIcon>
                </AppTooltip>
                <AppTooltip
                  label={
                    language === 'it'
                      ? t('switchToEnglish', { ns: 'nav' })
                      : t('switchToItalian', { ns: 'nav' })
                  }
                >
                  <ActionIcon
                    variant="subtle"
                    aria-label="Toggle language"
                    onClick={toggleLanguage}
                  >
                    <Text size="sm" fw={600}>
                      {language.toUpperCase()}
                    </Text>
                  </ActionIcon>
                </AppTooltip>
              </Group>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <MobileDrawer opened={opened} onClose={close} />
      <AppShell.Main>
        <div style={{ minHeight: 'calc(100vh - 60px)' }}>{children}</div>
        <Footer />
      </AppShell.Main>
    </AppShell>
  )
}
