import { zodResolver } from '@hookform/resolvers/zod'
import {
  ActionIcon,
  Alert,
  Button,
  Container,
  Divider,
  Group,
  Modal,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconBrandDiscord, IconPencil } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../api/auth'
import { isHttpError } from '../api/client'
import {
  deleteProfileAvatar,
  formatProfileError,
  updateProfileSettings,
  uploadProfileAvatar,
} from '../api/profile'
import { ProfileAvatar } from '../components/profile/ProfileAvatar'
import { ProfileStatsPanel } from '../components/profile/ProfileStatsPanel'
import { useAuth } from '../context/AuthContext'
import { useBadgesQuery } from '../hooks/useBadgesQuery'
import { useCheckinHistoryQuery } from '../hooks/useCheckinHistoryQuery'
import { profileQueryKey, useProfileQuery } from '../hooks/useProfileQuery'
import { useStatsQuery } from '../hooks/useStatsQuery'
import {
  type ProfileSettingsFormInput,
  type ProfileSettingsFormValues,
  profileSettingsSchema,
} from '../schemas/profile'

function validatePassword(val: string): string | null {
  if (!val) return null
  if (val.length < 8) return 'passwordTooWeak'
  if (!/[A-Z]/.test(val)) return 'passwordTooWeak'
  if (!/[a-z]/.test(val)) return 'passwordTooWeak'
  if (!/[0-9]/.test(val)) return 'passwordTooWeak'
  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(val)) return 'passwordTooWeak'
  return null
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation('profile')
  const { t: ta } = useTranslation('auth')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, activeCheckin, logout, refreshSession } = useAuth()
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const [locked, setLocked] = useState<'username' | 'email' | null>(null)
  const [pwdLocked, setPwdLocked] = useState(true)
  const usernameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const pwdSectionRef = useRef<HTMLDivElement>(null)
  const [identityPassword, setIdentityPassword] = useState('')
  const [identityPwdError, setIdentityPwdError] = useState<string | null>(null)
  const [identityModalOpen, { open: openIdentityModal, close: closeIdentityModal }] =
    useDisclosure(false)
  const [_pendingSave, setPendingSave] = useState(false)
  const pendingValuesRef = useRef<ProfileSettingsFormValues | null>(null)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword1, setNewPassword1] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [opwdErr, _setOpwdErr] = useState<string | null>(null)
  const [npwd1Err, setNpwd1Err] = useState<string | null>(null)
  const [npwd2Err, setNpwd2Err] = useState<string | null>(null)
  const profileQuery = useProfileQuery()
  const checkinHistoryQuery = useCheckinHistoryQuery()
  const badgesQuery = useBadgesQuery()
  const statsQuery = useStatsQuery()
  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<ProfileSettingsFormInput, undefined, ProfileSettingsFormValues>({
    mode: 'onChange',
    defaultValues: { username: '', email: '', discordHandle: '', sharePresence: true },
    resolver: zodResolver(profileSettingsSchema),
  })

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language ?? undefined, { maximumFractionDigits: 0 }),
    [i18n.language],
  )
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language ?? undefined, { dateStyle: 'medium' }),
    [i18n.language],
  )

  useEffect(() => {
    if (!profileQuery.data) return
    reset({
      username: profileQuery.data.username ?? '',
      email: profileQuery.data.email ?? '',
      discordHandle: profileQuery.data.discordHandle ?? '',
      sharePresence: profileQuery.data.sharePresence,
    })
  }, [profileQuery.data, reset])

  const syncSession = async () => {
    await refreshSession()
  }

  const settingsMutation = useMutation({
    mutationFn: (p: Parameters<typeof updateProfileSettings>[0]) => updateProfileSettings(p),
    onSuccess: async (nextProfile) => {
      setFormError(null)
      queryClient.setQueryData(profileQueryKey, nextProfile)
      await syncSession()
    },
    onError: (error: unknown) => {
      setFormError(
        isHttpError(error)
          ? (formatProfileError(error.body) ?? error.message)
          : error instanceof Error
            ? error.message
            : t('updateError'),
      )
    },
  })

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setOldPassword('')
      setNewPassword1('')
      setNewPassword2('')
      setPwdLocked(true)
    },
    onError: (error: unknown) => {
      setFormError(error instanceof Error ? error.message : t('updateError'))
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: uploadProfileAvatar,
    onSuccess: async (nextProfile) => {
      setAvatarError(null)
      setAvatarMessage(t('avatarUpdated'))
      queryClient.setQueryData(profileQueryKey, nextProfile)
      await syncSession()
    },
    onError: (error: unknown) => {
      setAvatarMessage(null)
      setAvatarError(
        isHttpError(error)
          ? (formatProfileError(error.body) ?? error.message)
          : error instanceof Error
            ? error.message
            : t('avatarUploadError'),
      )
    },
  })

  const deleteAvatarMutation = useMutation({
    mutationFn: deleteProfileAvatar,
    onSuccess: async () => {
      setAvatarError(null)
      setAvatarMessage(t('avatarRemoved'))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKey }),
        syncSession(),
      ])
    },
    onError: (error: unknown) => {
      setAvatarMessage(null)
      setAvatarError(
        isHttpError(error)
          ? (formatProfileError(error.body) ?? error.message)
          : error instanceof Error
            ? error.message
            : t('avatarRemoveError'),
      )
    },
  })

  useEffect(() => {
    if (locked === 'username') usernameRef.current?.focus()
    else if (locked === 'email') emailRef.current?.focus()
  }, [locked])

  useEffect(() => {
    if (pwdLocked) return
    const handler = (e: MouseEvent) => {
      const el = e.target as Node
      if (el instanceof Element && el.closest('[data-pwd-toggle]')) return
      if (pwdSectionRef.current && !pwdSectionRef.current.contains(el)) {
        setPwdLocked(true)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pwdLocked])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const doSaveIdentity = async () => {
    setFormError(null)
    setFormMessage(null)
    const vals = pendingValuesRef.current
    if (!vals) return
    try {
      await settingsMutation.mutateAsync({
        username: vals.username,
        email: vals.email,
        current_password: identityPassword,
        discord_handle: vals.discordHandle,
        share_presence: vals.sharePresence,
      } as Parameters<typeof updateProfileSettings>[0])
      setIdentityPassword('')
      setLocked(null)
      setPendingSave(false)
      closeIdentityModal()
      setFormMessage(t('updated'))
      queryClient.invalidateQueries({ queryKey: profileQueryKey })
      await syncSession()
    } catch {
      // handled in mutation
    }
  }

  const doSavePassword = async () => {
    if (newPassword1 !== newPassword2) {
      setNpwd2Err('passwordsDoNotMatch')
      return
    }
    await passwordMutation.mutateAsync({
      old_password: oldPassword,
      new_password1: newPassword1,
      new_password2: newPassword2,
    })
    if (!formError) setFormMessage(t('updated'))
  }

  const onSubmit = async (values: ProfileSettingsFormValues) => {
    setFormError(null)
    setFormMessage(null)
    const p = profileQuery.data
    const needsIdentity =
      (dirtyFields.username && values.username !== p?.username) ||
      (dirtyFields.email && values.email !== p?.email)
    const hasPwdChange = !pwdLocked && (oldPassword || newPassword1 || newPassword2)

    if (needsIdentity) {
      pendingValuesRef.current = values
      setPendingSave(true)
      openIdentityModal()
      return
    }

    try {
      if (isDirty) {
        await settingsMutation.mutateAsync({
          discord_handle: values.discordHandle,
          share_presence: values.sharePresence,
        })
      }
      if (hasPwdChange) await doSavePassword()
      setFormMessage(t('updated'))
      queryClient.invalidateQueries({ queryKey: profileQueryKey })
      await syncSession()
    } catch {
      /* handled */
    }
  }

  const profile = profileQuery.data
  const displayName = profile?.username || user?.username || '?'
  const avatarUrl = profile?.avatarUrl || user?.profile?.avatarUrl
  const levelName = profile?.level
    ? t(`levels.${profile.level.slug || 'unknown'}`, {
        defaultValue: profile.level.name || t('levels.unknown'),
      })
    : t('levels.unknown')
  const nextLevelName = profile?.level?.nextLevel
    ? t(`levels.${profile.level.nextLevel.slug || 'unknown'}`, {
        defaultValue: profile.level.nextLevel.name || t('levels.unknown'),
      })
    : null
  const progressValue = Math.max(0, Math.min(100, profile?.level?.progressPercentage ?? 0))
  const hasLevelProgress = Boolean(profile?.level)
  const formatInt = (v: number | null | undefined) => numberFormatter.format(v ?? 0)
  const formatDate = (v: string | null | undefined) => {
    if (!v) return t('stats.never')
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? t('stats.never') : dateFormatter.format(d)
  }
  const isSaving = settingsMutation.isPending || passwordMutation.isPending
  const hasPwdContent = !pwdLocked && (oldPassword || newPassword1 || newPassword2)
  const canSave = isDirty || hasPwdContent || locked !== null

  const onPwd1Change = (v: string) => {
    setNewPassword1(v)
    setNpwd1Err(validatePassword(v))
  }
  const onPwd2Change = (v: string) => {
    setNewPassword2(v)
    setNpwd2Err(v && v !== newPassword1 ? 'passwordsDoNotMatch' : null)
  }

  return (
    <Container size="lg" pt={48} pb={48}>
      <Title order={1} mb="lg">
        {t('title')}
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* == COLONNA SX == */}
        <Stack gap="md">
          <Paper withBorder p="md" radius="md">
            <Stack gap="lg">
              {profileQuery.isError ? (
                <Alert color="red" variant="light" title={t('errorTitle')}>
                  {profileQuery.error instanceof Error && profileQuery.error.message
                    ? profileQuery.error.message
                    : t('loadError')}
                </Alert>
              ) : null}

              {/* Avatar */}
              <ProfileAvatar
                avatarUrl={avatarUrl ?? undefined}
                displayName={displayName}
                isPending={profileQuery.isPending}
                uploadPending={uploadAvatarMutation.isPending}
                deletePending={deleteAvatarMutation.isPending}
                avatarError={avatarError}
                avatarMessage={avatarMessage}
                onUpload={(file) => {
                  setAvatarError(null)
                  setAvatarMessage(null)
                  void uploadAvatarMutation.mutateAsync(file)
                }}
                onDelete={() => void deleteAvatarMutation.mutateAsync()}
              />

              <Divider />

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="md">
                  {formError ? (
                    <Alert color="red" variant="light">
                      {formError}
                    </Alert>
                  ) : null}
                  {formMessage ? (
                    <Alert color="green" variant="light">
                      {formMessage}
                    </Alert>
                  ) : null}

                  {/* Username lock/unlock */}
                  <TextInput
                    label={t('username')}
                    ref={usernameRef}
                    disabled={locked !== 'username'}
                    value={
                      locked === 'username' ? (watch('username') ?? '') : (profile?.username ?? '')
                    }
                    onChange={(e) => {
                      if (locked === 'username') setValue('username', e.currentTarget.value)
                    }}
                    rightSection={
                      locked !== 'username' ? (
                        <ActionIcon
                          variant="subtle"
                          onClick={() => setLocked('username')}
                          size="sm"
                        >
                          <IconPencil size={14} />
                        </ActionIcon>
                      ) : undefined
                    }
                    error={errors.username?.message ? ta(errors.username.message) : undefined}
                    onBlur={() => {
                      if (locked === 'username') requestAnimationFrame(() => setLocked(null))
                    }}
                  />

                  {/* Email lock/unlock */}
                  <TextInput
                    label={t('email')}
                    type="email"
                    ref={emailRef}
                    disabled={locked !== 'email'}
                    value={locked === 'email' ? (watch('email') ?? '') : (profile?.email ?? '')}
                    onChange={(e) => {
                      if (locked === 'email') setValue('email', e.currentTarget.value)
                    }}
                    rightSection={
                      locked !== 'email' ? (
                        <ActionIcon variant="subtle" onClick={() => setLocked('email')} size="sm">
                          <IconPencil size={14} />
                        </ActionIcon>
                      ) : undefined
                    }
                    error={errors.email?.message ? ta(errors.email.message) : undefined}
                    onBlur={() => {
                      if (locked === 'email') requestAnimationFrame(() => setLocked(null))
                    }}
                  />

                  {/* Password change lock/unlock */}
                  <PasswordInput
                    data-pwd-toggle
                    label={t('changePassword')}
                    value="dummy-placeholder"
                    disabled
                    readOnly
                    rightSection={
                      <ActionIcon
                        variant="subtle"
                        onClick={() => setPwdLocked((v) => !v)}
                        size="sm"
                      >
                        <IconPencil size={14} />
                      </ActionIcon>
                    }
                    placeholder="••••••••"
                  />
                  {!pwdLocked ? (
                    <Paper withBorder p="md" radius="md" ref={pwdSectionRef}>
                      <Stack gap="xs">
                        <PasswordInput
                          label={t('currentPassword')}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.currentTarget.value)}
                          error={opwdErr ? t(opwdErr) : undefined}
                          data-autofocus
                        />
                        <PasswordInput
                          label={t('newPassword')}
                          value={newPassword1}
                          onChange={(e) => onPwd1Change(e.currentTarget.value)}
                          error={npwd1Err ? t(npwd1Err) : undefined}
                        />
                        <PasswordInput
                          label={t('confirmPassword')}
                          value={newPassword2}
                          onChange={(e) => onPwd2Change(e.currentTarget.value)}
                          error={npwd2Err ? t(npwd2Err) : undefined}
                        />
                      </Stack>
                    </Paper>
                  ) : null}

                  <Divider />

                  {/* Discord & share presence */}
                  <TextInput
                    label={t('discord')}
                    description={t('discordDescription')}
                    leftSection={<IconBrandDiscord size={16} />}
                    {...register('discordHandle')}
                    error={
                      errors.discordHandle?.message ? t(errors.discordHandle.message) : undefined
                    }
                  />
                  <Controller
                    name="sharePresence"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        label={t('sharePresence')}
                        description={t('sharePresenceHelp')}
                        checked={field.value}
                        onChange={(e) => field.onChange(e.currentTarget.checked)}
                      />
                    )}
                  />

                  <Group>
                    <Button type="submit" loading={isSaving} disabled={!canSave}>
                      {t('save')}
                    </Button>
                    <Button
                      type="button"
                      color="red"
                      variant="subtle"
                      onClick={() => void handleLogout()}
                    >
                      {t('logout')}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Stack>
          </Paper>
        </Stack>

        {/* == COLONNA DX == */}
        <ProfileStatsPanel
          profile={profile}
          activeCheckin={activeCheckin}
          levelName={levelName}
          nextLevelName={nextLevelName}
          progressValue={progressValue}
          hasLevelProgress={hasLevelProgress}
          formatInt={formatInt}
          formatDate={formatDate}
          statsQuery={statsQuery}
          badgesQuery={badgesQuery}
          checkinHistoryQuery={checkinHistoryQuery}
        />
      </SimpleGrid>

      {/* Modal per conferma identità */}
      <Modal
        opened={identityModalOpen}
        onClose={() => {
          closeIdentityModal()
          setPendingSave(false)
        }}
        title={t('confirmIdentity')}
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('confirmIdentityHelp')}
          </Text>
          <PasswordInput
            label={t('currentPassword')}
            value={identityPassword}
            onChange={(e) => {
              setIdentityPassword(e.currentTarget.value)
              setIdentityPwdError(null)
            }}
            error={identityPwdError}
            data-autofocus
          />
          <Group>
            <Button onClick={doSaveIdentity} loading={settingsMutation.isPending}>
              {t('confirm')}
            </Button>
            <Button
              variant="subtle"
              onClick={() => {
                closeIdentityModal()
                setPendingSave(false)
              }}
            >
              {t('cancel')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
