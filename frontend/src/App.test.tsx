import { MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import './i18n'
import { createQueryClient } from './lib/queryClient'
import { theme } from './theme'

describe('App shell', () => {
  it('renders the home shell', async () => {
    const queryClient = createQueryClient()
    queryClient.setDefaultOptions({
      queries: {
        ...queryClient.getDefaultOptions().queries,
        retry: false,
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <LanguageProvider>
            <AuthProvider>
              <MemoryRouter>
                <App />
              </MemoryRouter>
            </AuthProvider>
          </LanguageProvider>
        </MantineProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findAllByText('Cloistr')).not.toHaveLength(0)
  })
})
