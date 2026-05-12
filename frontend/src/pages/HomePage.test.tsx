import { MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import { createQueryClient } from '../lib/queryClient'
import { theme } from '../theme'
import HomePage from './HomePage'

const mockUseSpacesQuery = vi.fn()
const mockRefreshSession = vi.fn()
const mockStartCheckin = vi.fn()

vi.mock('../hooks/useSpacesQuery', () => ({
  spacesRootQueryKey: ['spaces'],
  useSpacesQuery: (filters: unknown) => mockUseSpacesQuery(filters),
}))

vi.mock('../hooks/useProfileQuery', () => ({
  profileQueryKey: ['profile', 'me'],
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    activeCheckin: null,
    isAuthenticated: true,
    refreshSession: mockRefreshSession,
  }),
}))

vi.mock('../api/checkins', () => ({
  startCheckin: (...args: unknown[]) => mockStartCheckin(...args),
  endActiveCheckin: vi.fn(),
  formatCheckinError: () => null,
}))

const mockSpace = {
  id: '1',
  name: 'Biblioteca Centrale',
  address: 'Via Roma 1',
  latitude: 45.46,
  longitude: 9.19,
  kind: 'library',
  capacity: 120,
  powerCapacity: 80,
  wifi: true,
  power: true,
  quiet: true,
  airConditioning: false,
  availability: 'free',
}

function renderHomePage() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  afterEach(() => { cleanup() })

  beforeEach(() => {
    mockUseSpacesQuery.mockReset()
    mockRefreshSession.mockReset().mockResolvedValue(undefined)
    mockStartCheckin.mockReset().mockResolvedValue(undefined)
  })

  it('renders the map with space markers', async () => {
    mockUseSpacesQuery.mockReturnValue({
      data: [mockSpace],
      error: null, isError: false, isFetching: false, isPending: false,
    })
    renderHomePage()
    expect(await screen.findByText('Biblioteca Centrale')).toBeInTheDocument()
  })

  it('starts a check-in from the map popup', async () => {
    mockUseSpacesQuery.mockReturnValue({
      data: [{ ...mockSpace, id: '7', name: 'Studio Nord' }],
      error: null, isError: false, isFetching: false, isPending: false,
    })
    renderHomePage()

    fireEvent.click(await screen.findByRole('button', { name: 'Start check-in' }))

    await waitFor(() => {
      expect(mockStartCheckin).toHaveBeenCalled()
      expect(mockStartCheckin.mock.calls[0]?.[0]).toEqual({ spaceId: '7', usesPower: false })
    })
  }, 15000)
})
