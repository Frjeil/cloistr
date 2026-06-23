import { Button, Divider, Drawer, Stack, useMantineColorScheme } from '@mantine/core'
import { IconMoonStars, IconSun } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { appConfig } from '../../lib/config'

type Props = {
  opened: boolean
  onClose: () => void
}

export function MobileDrawer({ opened, onClose }: Props) {
  const { t } = useTranslation(['common', 'nav'])
  const { isAuthenticated } = useAuth()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const { language, toggleLanguage } = useLanguage()

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="xs"
      title={t('menu', { ns: 'common' })}
      hiddenFrom="sm"
      zIndex={1100}
      overlayProps={{ zIndex: 1050 }}
    >
      <Stack>
        <Divider my="xs" />
        <Button variant="subtle" component={NavLink} to="/" onClick={onClose}>
          {t('map', { ns: 'nav' })}
        </Button>
        <Button variant="subtle" component={NavLink} to="/leaderboard" onClick={onClose}>
          {t('leaderboard', { ns: 'nav' })}
        </Button>
        <Button variant="subtle" component={NavLink} to="/contacts" onClick={onClose}>
          {t('contacts', { ns: 'nav' })}
        </Button>
        {isAuthenticated ? (
          <Button variant="light" component={NavLink} to="/profile" onClick={onClose}>
            {t('profile', { ns: 'nav' })}
          </Button>
        ) : (
          <Button variant="filled" component={NavLink} to="/login" onClick={onClose}>
            {t('login', { ns: 'nav' })}
          </Button>
        )}
        <Button
          variant="subtle"
          component="a"
          href={appConfig.discordUrl}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
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
          {colorScheme === 'light' ? t('themeDark', { ns: 'nav' }) : t('themeLight', { ns: 'nav' })}
        </Button>
        <Button variant="light" fullWidth onClick={toggleLanguage}>
          {language === 'it' ? 'English' : 'Italiano'}
        </Button>
      </Stack>
    </Drawer>
  )
}
