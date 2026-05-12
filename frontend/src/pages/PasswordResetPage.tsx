import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Container, Paper, Stack, Text, TextInput, Title } from '@mantine/core'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth'
import {
  type PasswordResetFormInput,
  type PasswordResetFormValues,
  passwordResetSchema,
} from '../schemas/auth'

export default function PasswordResetPage() {
  const { t } = useTranslation('auth')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetFormInput, undefined, PasswordResetFormValues>({
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
    resolver: zodResolver(passwordResetSchema),
  })

  const onSubmit = async (values: PasswordResetFormValues) => {
    setError('')
    try {
      await requestPasswordReset({ email: values.email })
      setSuccess(true)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('passwordReset.networkError'))
    }
  }

  return (
    <Container size="xs" pt={48} pb={48}>
      <Title order={1} mb="sm">
        {t('passwordReset.title')}
      </Title>
      <Paper withBorder p="md" radius="md">
        {success ? (
          <Stack>
            <Alert color="green" variant="light">
              {t('passwordReset.emailSent')}
            </Alert>
            <Text size="sm" c="dimmed">
              {t('passwordReset.checkInbox')}
            </Text>
          </Stack>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack>
              {error ? (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              ) : null}
              <Text size="sm" c="dimmed">
                {t('passwordReset.description')}
              </Text>
              <TextInput
                label={t('passwordReset.email')}
                type="email"
                {...register('email')}
                error={errors.email?.message ? t(errors.email.message) : undefined}
                description={t('passwordReset.emailDescription')}
                required
              />
              <Button type="submit" loading={isSubmitting}>
                {t('passwordReset.submit')}
              </Button>
              <Button variant="subtle" component={Link} to="/login">
                {t('passwordReset.backToLogin')}
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  )
}
