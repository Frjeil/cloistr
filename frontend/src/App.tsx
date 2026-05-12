import { Alert, Button, Center, Loader, Stack } from '@mantine/core'
import { lazy, type ReactElement, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { useAuth } from './context/AuthContext'

const ContactsPage = lazy(() => import('./pages/ContactsPage'))
const EmailVerifiedPage = lazy(() => import('./pages/EmailVerifiedPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const PasswordChangePage = lazy(() => import('./pages/PasswordChangePage'))
const PasswordResetConfirmPage = lazy(() => import('./pages/PasswordResetConfirmPage'))
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RouteFallback() {
  return (
    <Center py="xl">
      <Loader />
    </Center>
  )
}

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <RouteFallback />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <RouteFallback />
  }

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />
  }

  return children
}

export default function App() {
  return (
    <Layout>
      <div className="page-enter">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/password-reset"
            element={
              <PublicOnlyRoute>
                <PasswordResetPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/password-reset-confirm/:uid/:token"
            element={<PasswordResetConfirmPage />}
          />
          <Route
            path="/password-change"
            element={
              <ProtectedRoute>
                <PasswordChangePage />
              </ProtectedRoute>
            }
          />
          <Route path="/email-verified" element={<EmailVerifiedPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Routes>
      </Suspense>
      </div>
    </Layout>
  )
}
