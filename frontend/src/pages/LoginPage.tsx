import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { type LoginFormInput, type LoginFormValues, loginSchema } from '../schemas/auth'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [error, setError] = useState('')
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput, undefined, LoginFormValues>({
    defaultValues: {
      login: '',
      password: '',
    },
    mode: 'onChange',
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setError('')
    try {
      await loginUser({
        login: values.login.trim(),
        password: values.password,
      })
      await refreshSession()
      navigate('/profile', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('login.networkError'))
    }
  }

  return (
    <Container size="xs" pt={48} pb={48}>
      <Title order={1} mb="sm">
        {t('login.title')}
      </Title>
      <Paper withBorder p="md" radius="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            {error ? (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            ) : null}
            <TextInput
              label={t('login.username')}
              {...register('login')}
              error={errors.login?.message ? t(errors.login.message) : undefined}
              description={t('login.usernameDescription')}
              required
            />
            <PasswordInput
              label={t('login.password')}
              {...register('password')}
              error={errors.password?.message ? t(errors.password.message) : undefined}
              required
            />
            <Button type="submit" loading={isSubmitting}>
              {t('login.submit')}
            </Button>
            <Button variant="subtle" component={Link} to="/register">
              {t('login.noAccount')} {t('login.register')}
            </Button>
            <Button variant="subtle" component={Link} to="/password-reset">
              {t('login.forgotPassword')}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
