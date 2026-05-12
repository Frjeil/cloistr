import { MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import { createQueryClient } from '../lib/queryClient'
import { theme } from '../theme'
import ProfilePage from './ProfilePage'

const mockUseProfileQuery = vi.fn()
const mockRefreshSession = vi.fn()
const mockLogout = vi.fn()
const mockUpdateProfileSettings = vi.fn()
const mockUploadProfileAvatar = vi.fn()
const mockDeleteProfileAvatar = vi.fn()
const mockUseCheckinHistoryQuery = vi.fn()

vi.mock('../hooks/useProfileQuery', () => ({
  profileQueryKey: ['profile', 'me'],
  useProfileQuery: () => mockUseProfileQuery(),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '7',
      username: 'cloistered',
      email: 'test@example.com',
      profile: {
        discordHandle: '@owl',
        avatarUrl: null,
        sharePresence: true,
      },
    },
    activeCheckin: null,
    logout: mockLogout,
    refreshSession: mockRefreshSession,
  }),
}))

vi.mock('../api/profile', () => ({
  updateProfileSettings: (...args: unknown[]) => mockUpdateProfileSettings(...args),
  uploadProfileAvatar: (...args: unknown[]) => mockUploadProfileAvatar(...args),
  deleteProfileAvatar: (...args: unknown[]) => mockDeleteProfileAvatar(...args),
  formatProfileError: () => null,
}))

vi.mock('../hooks/useCheckinHistoryQuery', () => ({
  checkinHistoryQueryKey: ['checkins', 'history'],
  useCheckinHistoryQuery: () => mockUseCheckinHistoryQuery(),
}))

function renderProfilePage() {
  const queryClient = createQueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  )
}

describe('ProfilePage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mockUseProfileQuery.mockReset()
    mockRefreshSession.mockReset().mockResolvedValue(null)
    mockLogout.mockReset().mockResolvedValue(undefined)
    mockUpdateProfileSettings.mockReset().mockResolvedValue({
      id: '7',
      username: 'cloistered',
      email: 'test@example.com',
      xp: 4200,
      totalCheckins: 12,
      activityStreakDays: 4,
      lastCheckinDate: '2026-04-22',
      avatarUrl: null,
      sharePresence: true,
      discordHandle: '@updated',
      level: null,
    })
    mockUploadProfileAvatar.mockReset().mockResolvedValue(undefined)
    mockDeleteProfileAvatar.mockReset().mockResolvedValue(undefined)
    mockUseCheckinHistoryQuery.mockReset().mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
    })
  })

  it('shows the profile query error state', async () => {
    mockUseProfileQuery.mockReturnValue({
      data: undefined,
      error: new Error('Profile unavailable'),
      isError: true,
      isFetching: false,
      isPending: false,
      refetch: vi.fn(),
    })

    renderProfilePage()

    const alert = await screen.findByRole('alert', {}, { timeout: 5000 })
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/Profile unavailable/i)
  })

  it('submits sanitized profile settings', async () => {
    const user = userEvent.setup()
    mockUseProfileQuery.mockReturnValue({
      data: {
        id: '7',
        username: 'cloistered',
        email: 'test@example.com',
        xp: 4200,
      totalCheckins: 12,
      activityStreakDays: 4,
      lastCheckinDate: '2026-04-22',
      avatarUrl: null,
        sharePresence: true,
        discordHandle: '@owl',
        level: null,
      },
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    })
    mockUseCheckinHistoryQuery.mockReturnValue({
      data: [
        {
          id: 'history-1',
          spaceId: '1',
          spaceName: 'Biblioteca Centrale',
          spaceAddress: 'Via Roma 1',
          usesPower: false,
          startedAt: '2026-04-22T08:00:00Z',
          endedAt: '2026-04-22T09:15:00Z',
          durationMinutes: 75,
        },
      ],
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
    })

    renderProfilePage()

    const discordInput = await screen.findByDisplayValue('@owl')
    await user.clear(discordInput)
    await user.type(discordInput, '@updated')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockUpdateProfileSettings).toHaveBeenCalled()
      const payload = mockUpdateProfileSettings.mock.calls[0]?.[0]
      expect(payload.discord_handle).toBe('@updated')
      expect(payload.share_presence).toBe(true)
    })

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalled()
    })

    expect(await screen.findByText('Recent check-ins')).toBeInTheDocument()
    expect(screen.getByText('Biblioteca Centrale')).toBeInTheDocument()
  })
})
