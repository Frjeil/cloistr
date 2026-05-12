import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import enAuth from './locales/en/auth.json'
import enCommon from './locales/en/common.json'
import enHome from './locales/en/home.json'
import enLeaderboard from './locales/en/leaderboard.json'
import enNav from './locales/en/nav.json'
import enPages from './locales/en/pages.json'
import enProfile from './locales/en/profile.json'
import enSpaces from './locales/en/spaces.json'
import itAuth from './locales/it/auth.json'
import itCommon from './locales/it/common.json'
import itHome from './locales/it/home.json'
import itLeaderboard from './locales/it/leaderboard.json'
import itNav from './locales/it/nav.json'
import itPages from './locales/it/pages.json'
import itProfile from './locales/it/profile.json'
import itSpaces from './locales/it/spaces.json'

const namespaces = [
  'common',
  'nav',
  'home',
  'pages',
  'auth',
  'profile',
  'leaderboard',
  'spaces',
] as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        nav: enNav,
        home: enHome,
        pages: enPages,
        auth: enAuth,
        profile: enProfile,
        leaderboard: enLeaderboard,
        spaces: enSpaces,
      },
      it: {
        common: itCommon,
        nav: itNav,
        home: itHome,
        pages: itPages,
        auth: itAuth,
        profile: itProfile,
        leaderboard: itLeaderboard,
        spaces: itSpaces,
      },
    },
    ns: namespaces,
    defaultNS: 'common',
    fallbackNS: 'common',
    fallbackLng: 'it',
    supportedLngs: ['it', 'en'],
    load: 'languageOnly',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

export default i18n
