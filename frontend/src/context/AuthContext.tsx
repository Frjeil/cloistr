import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { fetchSessionUser, logoutUser, normalizeSessionPayload } from '../api/auth'
import type { ActiveCheckin, SessionPayload, SessionUser } from '../types/auth'

type AuthContextValue = {
  isAuthenticated: boolean
  isBootstrapping: boolean
  user: SessionUser | null
  activeCheckin: ActiveCheckin
  setSession: (payload: SessionPayload) => void
  refreshSession: () => Promise<SessionPayload | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [activeCheckin, setActiveCheckin] = useState<ActiveCheckin>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const setSession = useCallback((payload: SessionPayload) => {
    setUser(payload.user)
    setActiveCheckin(payload.activeCheckin)
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const payload = normalizeSessionPayload(await fetchSessionUser())
      if (!payload) {
        setSession({ user: null, activeCheckin: null })
        return null
      }

      setSession(payload)
      return payload
    } catch {
      setSession({ user: null, activeCheckin: null })
      return null
    }
  }, [setSession])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } catch {
      // Ignore logout network errors and clear local session anyway.
    } finally {
      setSession({ user: null, activeCheckin: null })
    }
  }, [setSession])

  useEffect(() => {
    const controller = new AbortController()

    const bootstrap = async () => {
      try {
        const payload = normalizeSessionPayload(await fetchSessionUser(controller.signal))
        if (!controller.signal.aborted) {
          setSession(payload ?? { user: null, activeCheckin: null })
        }
      } catch (error) {
        if (
          !controller.signal.aborted &&
          !(error instanceof DOMException && error.name === 'AbortError')
        ) {
          setSession({ user: null, activeCheckin: null })
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsBootstrapping(false)
        }
      }
    }

    void bootstrap()

    return () => {
      controller.abort()
    }
  }, [setSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user),
      isBootstrapping,
      user,
      activeCheckin,
      setSession,
      refreshSession,
      logout,
    }),
    [activeCheckin, isBootstrapping, logout, refreshSession, setSession, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = use(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
