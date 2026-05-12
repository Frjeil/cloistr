import { createContext, type PropsWithChildren, useContext, useEffect } from 'react'
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
  const language = i18n.language.startsWith('en') ? 'en' : 'it'

  const setLanguage = (nextLanguage: SupportedLanguage) => {
    void i18n.changeLanguage(nextLanguage)
    document.documentElement.lang = nextLanguage
  }

  const toggleLanguage = () => {
    setLanguage(language === 'it' ? 'en' : 'it')
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
