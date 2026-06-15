import { createContext, type PropsWithChildren, use, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

type SupportedLanguage = 'it' | 'en'

type LanguageContextValue = {
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: PropsWithChildren) {
  const { i18n } = useTranslation()
  const language: SupportedLanguage = i18n.language.startsWith('en') ? 'en' : 'it'

  const setLanguage = useCallback(
    (nextLanguage: SupportedLanguage) => {
      void i18n.changeLanguage(nextLanguage)
      document.documentElement.lang = nextLanguage
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [i18n.changeLanguage],
  )

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'it' ? 'en' : 'it')
  }, [language, setLanguage])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage }),
    [language, setLanguage, toggleLanguage],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = use(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
