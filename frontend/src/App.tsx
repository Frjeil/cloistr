import { Center, Loader } from '@mantine/core'
import { AnimatePresence, motion } from 'motion/react'
import { Component, lazy, type ReactElement, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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

class RouteErrorBoundary extends Component<{ children: ReactElement }, { hasError: boolean }> {
  constructor(props: { children: ReactElement }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <Center py="xl">
          <div style={{ textAlign: 'center' }}>
            <p>Something went wrong.</p>
            <button type="button" onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        </Center>
      )
    }
    return this.props.children
  }
}

function AnimatedPage({ children }: { children: ReactElement }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}

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

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <RouteErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <AnimatedPage>
                  <HomePage />
                </AnimatedPage>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <AnimatedPage>
                  <LeaderboardPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/contacts"
              element={
                <AnimatedPage>
                  <ContactsPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <AnimatedPage>
                    <LoginPage />
                  </AnimatedPage>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <AnimatedPage>
                    <RegisterPage />
                  </AnimatedPage>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/password-reset"
              element={
                <PublicOnlyRoute>
                  <AnimatedPage>
                    <PasswordResetPage />
                  </AnimatedPage>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/password-reset-confirm/:uid/:token"
              element={
                <AnimatedPage>
                  <PasswordResetConfirmPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/password-change"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <PasswordChangePage />
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/email-verified"
              element={
                <AnimatedPage>
                  <EmailVerifiedPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ProfilePage />
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <AnimatedPage>
                  <NotFoundPage />
                </AnimatedPage>
              }
            />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <Layout>
      <AnimatedRoutes />
    </Layout>
  )
}
