import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LanguageProvider, useLanguage } from './LanguageContext'
import '../i18n'

describe('LanguageProvider', () => {
  it('renders children', () => {
    render(
      <LanguageProvider>
        <div>child content</div>
      </LanguageProvider>,
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('throws when useLanguage is used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow(
      'useLanguage must be used within LanguageProvider',
    )
  })
})

function TestConsumer() {
  useLanguage()
  return <div>test</div>
}
