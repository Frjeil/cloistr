import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatRegistrationError, registerUser } from '../api/auth'
import { isHttpError } from '../api/client'
import { useDelayedRedirect } from '../hooks/useDelayedRedirect'
import { type RegisterFormInput, type RegisterFormValues, registerSchema } from '../schemas/auth'

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput, undefined, RegisterFormValues>({
    defaultValues: {
      username: '',
      email: '',
      password1: '',
      password2: '',
    },
    mode: 'onChange',
    resolver: zodResolver(registerSchema),
  })

  useDelayedRedirect('/login', 1500, !!success)

  const onSubmit = async (values: RegisterFormValues) => {
    setError('')
    setSuccess('')

    try {
      await registerUser({
        username: values.username,
        email: values.email,
        password1: values.password1,
        password2: values.password2,
      })
      setSuccess(t('register.emailSuccess'))
    } catch (caughtError) {
      const message = isHttpError(caughtError)
        ? (formatRegistrationError(caughtError.body) ?? caughtError.message)
        : caughtError instanceof Error
          ? caughtError.message
          : t('register.networkError')
      setError(message)
    }
  }

  return (
    <Container size="xs" pt={48} pb={48}>
      <Title order={1} mb="sm">
        {t('register.title')}
      </Title>
      <Paper withBorder p="md" radius="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            {error ? (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            ) : null}
            {success ? (
              <Alert color="green" variant="light">
                {success}
              </Alert>
            ) : null}
            <TextInput
              label={t('register.username')}
              {...register('username')}
              error={errors.username?.message ? t(errors.username.message) : undefined}
              description={t('register.usernameDescription')}
              required
            />
            <TextInput
              label={t('register.email')}
              type="email"
              {...register('email')}
              error={errors.email?.message ? t(errors.email.message) : undefined}
              description={t('register.emailDescription')}
              required
            />
            <PasswordInput
              label={t('register.password')}
              {...register('password1')}
              error={errors.password1?.message ? t(errors.password1.message) : undefined}
              description={t('register.passwordDescription')}
              required
            />
            <PasswordInput
              label={t('register.confirmPassword')}
              {...register('password2')}
              error={errors.password2?.message ? t(errors.password2.message) : undefined}
              required
            />
            <Button type="submit" loading={isSubmitting}>
              {t('register.submit')}
            </Button>
            <Text size="sm" c="dimmed" ta="center">
              {t('register.hasAccount')}{' '}
              <Button variant="subtle" component={Link} to="/login" size="sm" p={0}>
                {t('register.login')}
              </Button>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
