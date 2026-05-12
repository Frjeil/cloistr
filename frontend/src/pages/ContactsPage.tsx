import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Container,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { isHttpError } from '../api/client'
import { sendContactMessage } from '../api/contacts'
import { type ContactFormValues, contactSchema } from '../schemas/contacts'

export default function ContactsPage() {
  const { t: tp } = useTranslation('pages')
  const { t: ta } = useTranslation('auth')
  const t = (key: string) => {
    const v = tp(key); return v !== key ? v : ta(key)
  }
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    mode: 'onChange',
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '' },
  })

  const mutation = useMutation({
    mutationFn: sendContactMessage,
    onSuccess: () => {
      reset()
    },
  })

  return (
    <Container size="sm" pt={48} pb={48}>
      <Title order={1} mb="sm">
        {t('contacts.title')}
      </Title>
      <Text c="dimmed" mb="md">
        {t('contacts.description')}
      </Text>

      {mutation.isSuccess ? (
        <Alert color="green" variant="light">
          {t('contacts.form.success')}
        </Alert>
      ) : null}

      {mutation.isError ? (
        <Alert color="red" variant="light" title={t('contacts.form.error')}>
          {isHttpError(mutation.error)
            ? (mutation.error.body as { detail?: string })?.detail ?? mutation.error.message
            : mutation.error instanceof Error
              ? mutation.error.message
              : t('contacts.form.error')}
        </Alert>
      ) : null}

      <Paper withBorder p="xl" radius="lg" shadow="sm">
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <Stack gap="md">
            <TextInput
              label={t('contacts.form.name')}
              placeholder={t('contacts.form.namePlaceholder')}
              {...register('name')}
              error={errors.name?.message ? t(errors.name.message) : undefined}
              required
            />
            <TextInput
              label={t('contacts.form.email')}
              placeholder={t('contacts.form.emailPlaceholder')}
              {...register('email')}
              error={errors.email?.message ? t(errors.email.message) : undefined}
              type="email"
              required
            />
            <Textarea
              label={t('contacts.form.message')}
              placeholder={t('contacts.form.messagePlaceholder')}
              {...register('message')}
              error={errors.message?.message ? t(errors.message.message) : undefined}
              minRows={4}
              autosize
              required
            />
            <Button type="submit" fullWidth loading={isSubmitting || mutation.isPending}>
              {mutation.isPending ? t('contacts.form.sending') : t('contacts.form.send')}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
