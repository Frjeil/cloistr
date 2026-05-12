import {
  ActionIcon,
  Anchor,
  AppShell,
  Burger,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconBrandDiscord, IconHeart, IconMail, IconMoonStars, IconSun } from '@tabler/icons-react'
import type { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { appConfig } from '../../lib/config'
import { AppTooltip } from '../common/AppTooltip'

export default function Layout({ children }: PropsWithChildren) {
  const { t } = useTranslation(['common', 'nav', 'home'])
  const { isAuthenticated } = useAuth()
  const { language, toggleLanguage } = useLanguage()
  const [opened, { toggle, close }] = useDisclosure(false)
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  return (
    <AppShell
      header={{ height: 60 }}
      withBorder
      styles={{
        main: {
          background: 'transparent',
        },
      }}
    >
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
      <Drawer
        opened={opened}
        onClose={close}
        size="xs"
        title={t('menu', { ns: 'common' })}
        hiddenFrom="sm"
        zIndex={1100}
        overlayProps={{ zIndex: 1050 }}
      >
        <Stack>
          <Divider my="xs" />
          <Button variant="subtle" component={NavLink} to="/" onClick={close}>
            {t('map', { ns: 'nav' })}
          </Button>
          <Button variant="subtle" component={NavLink} to="/leaderboard" onClick={close}>
            {t('leaderboard', { ns: 'nav' })}
          </Button>
          <Button variant="subtle" component={NavLink} to="/contacts" onClick={close}>
            {t('contacts', { ns: 'nav' })}
          </Button>
          {isAuthenticated ? (
            <Button variant="light" component={NavLink} to="/profile" onClick={close}>
              {t('profile', { ns: 'nav' })}
            </Button>
          ) : (
            <Button variant="filled" component={NavLink} to="/login" onClick={close}>
              {t('login', { ns: 'nav' })}
            </Button>
          )}
          <Button
            variant="subtle"
            component="a"
            href={appConfig.discordUrl}
            target="_blank"
            rel="noreferrer"
            onClick={close}
          >
            {t('discord', { ns: 'nav' })}
          </Button>
          <Divider my="xs" />
          <Button
            variant="light"
            fullWidth
            leftSection={
              colorScheme === 'light' ? <IconMoonStars size={18} /> : <IconSun size={18} />
            }
            onClick={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
          >
            {colorScheme === 'light'
              ? t('themeDark', { ns: 'nav' })
              : t('themeLight', { ns: 'nav' })}
          </Button>
          <Button variant="light" fullWidth onClick={toggleLanguage}>
            {language === 'it' ? 'English' : 'Italiano'}
          </Button>
        </Stack>
      </Drawer>
      <AppShell.Main>
        <div style={{ minHeight: 'calc(100vh - 60px)' }}>
          {children}
        </div>
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
                  <ActionIcon component={NavLink} to="/contacts" variant="subtle" aria-label="Contacts">
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
              <Anchor component={NavLink} to="/" size="sm" c="dimmed">
                {t('map', { ns: 'nav' })}
              </Anchor>
              <Anchor component={NavLink} to="/leaderboard" size="sm" c="dimmed">
                {t('leaderboard', { ns: 'nav' })}
              </Anchor>
              <Anchor component={NavLink} to="/contacts" size="sm" c="dimmed">
                {t('contacts', { ns: 'nav' })}
              </Anchor>
              {isAuthenticated ? (
                <Anchor component={NavLink} to="/profile" size="sm" c="dimmed">
                  {t('profile', { ns: 'nav' })}
                </Anchor>
              ) : (
                <Anchor component={NavLink} to="/login" size="sm" c="dimmed">
                  {t('login', { ns: 'nav' })}
                </Anchor>
              )}
            </Stack>

            <Stack gap="xs">
              <Text size="sm" fw={600}>
                {t('footer.settings', { ns: 'home' })}
              </Text>
              <Group gap="xs">
                <Button
                  variant="subtle"
                  size="compact-sm"
                  leftSection={colorScheme === 'light' ? <IconMoonStars size={16} /> : <IconSun size={16} />}
                  onClick={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
                >
                  {colorScheme === 'light' ? t('themeDark', { ns: 'nav' }) : t('themeLight', { ns: 'nav' })}
                </Button>
                <Button variant="subtle" size="compact-sm" onClick={toggleLanguage}>
                  {language === 'it' ? 'English' : 'Italiano'}
                </Button>
              </Group>
            </Stack>
          </SimpleGrid>

          <Divider my="md" />

          <Group justify="space-between" align="center" gap="xs" wrap="wrap">
            <Text size="xs" c="dimmed">
              {t('footer.copyright', { ns: 'home' })}
            </Text>
            <Text size="xs" c="dimmed">
              {t('footer.madeWith', { ns: 'home' })} <IconHeart size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Text>
          </Group>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
