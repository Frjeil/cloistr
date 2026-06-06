import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Container, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { confirmPasswordReset } from '../api/auth'
import { useDelayedRedirect } from '../hooks/useDelayedRedirect'
import {
  type PasswordResetConfirmFormInput,
  type PasswordResetConfirmFormValues,
  passwordResetConfirmSchema,
} from '../schemas/auth'

export default function PasswordResetConfirmPage() {
  const { t } = useTranslation('auth')
  const { uid, token } = useParams<{ uid: string; token: string }>()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetConfirmFormInput, undefined, PasswordResetConfirmFormValues>({
    defaultValues: {
      password1: '',
      password2: '',
    },
    mode: 'onChange',
    resolver: zodResolver(passwordResetConfirmSchema),
  })

  useDelayedRedirect('/login', 2000, success)

  const onSubmit = async (values: PasswordResetConfirmFormValues) => {
    setError('')
    try {
      await confirmPasswordReset({
        uid: uid ?? '',
        token: token ?? '',
        new_password1: values.password1,
        new_password2: values.password2,
      })
      setSuccess(true)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : t('passwordResetConfirm.networkError'),
      )
    }
  }

  return (
    <Container size="xs" pt={48} pb={48}>
      <Title order={1} mb="sm">
        {t('passwordResetConfirm.title')}
      </Title>
      <Paper withBorder p="md" radius="md">
        {success ? (
          <Stack>
            <Alert color="green" variant="light">
              {t('passwordResetConfirm.success')}
            </Alert>
            <Text size="sm" c="dimmed" ta="center">
              {t('passwordResetConfirm.redirecting')}
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
              <PasswordInput
                label={t('passwordResetConfirm.password')}
                {...register('password1')}
                error={errors.password1?.message ? t(errors.password1.message) : undefined}
                required
              />
              <PasswordInput
                label={t('passwordResetConfirm.confirmPassword')}
                {...register('password2')}
                error={errors.password2?.message ? t(errors.password2.message) : undefined}
                required
              />
              <Button type="submit" loading={isSubmitting}>
                {t('passwordResetConfirm.submit')}
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  )
}
