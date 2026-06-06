import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Container, Paper, PasswordInput, Stack, Title } from '@mantine/core'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../api/auth'
import { useDelayedRedirect } from '../hooks/useDelayedRedirect'
import {
  type PasswordChangeFormInput,
  type PasswordChangeFormValues,
  passwordChangeSchema,
} from '../schemas/auth'

export default function PasswordChangePage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeFormInput, undefined, PasswordChangeFormValues>({
    defaultValues: {
      oldPassword: '',
      password1: '',
      password2: '',
    },
    mode: 'onChange',
    resolver: zodResolver(passwordChangeSchema),
  })

  useDelayedRedirect('/profile', 2000, success)

  const onSubmit = async (values: PasswordChangeFormValues) => {
    setError('')
    try {
      await changePassword({
        old_password: values.oldPassword,
        new_password1: values.password1,
        new_password2: values.password2,
      })
      setSuccess(true)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : t('passwordChange.networkError'),
      )
    }
  }

  return (
    <Container size="xs" pt={48} pb={48}>
      <Title order={1} mb="sm">
        {t('passwordChange.title')}
      </Title>
      <Paper withBorder p="md" radius="md">
        {success ? (
          <Stack>
            <Alert color="green" variant="light">
              {t('passwordChange.success')}
            </Alert>
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
                label={t('passwordChange.oldPassword')}
                {...register('oldPassword')}
                error={errors.oldPassword?.message ? t(errors.oldPassword.message) : undefined}
                required
              />
              <PasswordInput
                label={t('passwordChange.newPassword')}
                {...register('password1')}
                error={errors.password1?.message ? t(errors.password1.message) : undefined}
                required
              />
              <PasswordInput
                label={t('passwordChange.confirmPassword')}
                {...register('password2')}
                error={errors.password2?.message ? t(errors.password2.message) : undefined}
                required
              />
              <Button type="submit" loading={isSubmitting}>
                {t('passwordChange.submit')}
              </Button>
              <Button variant="subtle" onClick={() => navigate('/profile')}>
                {t('passwordChange.cancel')}
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  )
}
