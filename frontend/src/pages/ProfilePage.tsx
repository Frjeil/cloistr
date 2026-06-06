import { zodResolver } from '@hookform/resolvers/zod'
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Container,
  Divider,
  FileButton,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Progress,
  SimpleGrid,
  Skeleton,
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
              <Group align="flex-start" wrap="wrap" gap="lg">
                {profileQuery.isPending ? (
                  <Skeleton circle height={96} width={96} />
                ) : (
                  <Avatar radius="xl" size={96} src={avatarUrl || undefined} alt={displayName}>
                    {displayName.slice(0, 1).toUpperCase()}
                  </Avatar>
                )}
                <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="sm">
                    <FileButton
                      onChange={(file) => {
                        if (file) {
                          setAvatarError(null)
                          setAvatarMessage(null)
                          void uploadAvatarMutation.mutateAsync(file)
                        }
                      }}
                      accept="image/png,image/jpeg,image/webp"
                    >
                      {(props) => (
                        <Button
                          {...props}
                          type="button"
                          variant="light"
                          loading={uploadAvatarMutation.isPending}
                        >
                          {t('uploadAvatar')}
                        </Button>
                      )}
                    </FileButton>
                    <Button
                      type="button"
                      color="red"
                      variant="subtle"
                      onClick={() => void deleteAvatarMutation.mutateAsync()}
                      disabled={!avatarUrl}
                      loading={deleteAvatarMutation.isPending}
                    >
                      {t('removeAvatar')}
                    </Button>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {t('avatarHelp')}
                  </Text>
                  {avatarError ? (
                    <Alert color="red" variant="light">
                      {avatarError}
                    </Alert>
                  ) : null}
                  {avatarMessage ? (
                    <Alert color="green" variant="light">
                      {avatarMessage}
                    </Alert>
                  ) : null}
                </Stack>
              </Group>

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
        <Stack gap="md">
          {hasLevelProgress && profile ? (
            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text fw={600}>{t('levelProgressTitle')}</Text>
                  <Badge variant="light">{levelName}</Badge>
                </Group>
                {profile.level?.position && profile.level.totalLevels ? (
                  <Text size="sm" c="dimmed">
                    {t('levelPosition', {
                      position: formatInt(profile.level.position),
                      total: formatInt(profile.level.totalLevels),
                    })}
                  </Text>
                ) : null}
                <Group gap="xs" align="center">
                  <Text size="sm" fw={700}>
                    {formatInt(profile?.xp)} XP
                  </Text>
                </Group>
                <Progress value={progressValue} radius="xl" size="lg" />
                <Group justify="space-between" gap="sm" align="flex-start">
                  <Text size="sm" c="dimmed">
                    {t('levelProgressDetail', {
                      current: formatInt(profile.level?.xpIntoLevel),
                      total: formatInt(profile.level?.xpRequiredForNextLevel),
                    })}
                  </Text>
                  <Text size="sm" c="dimmed" ta="right">
                    {profile.level?.isMaxLevel
                      ? t('levelMax')
                      : t('levelNext', {
                          level: nextLevelName || t('levels.unknown'),
                          xp: formatInt(profile.level?.xpToNextLevel),
                        })}
                  </Text>
                </Group>
              </Stack>
            </Paper>
          ) : null}

          {statsQuery.data ? (
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Text fw={600}>{t('personalStats.title')}</Text>
                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                  <Stack gap={2}>
                    <Text size="sm" c="dimmed">
                      {t('personalStats.totalHoursStudied')}
                    </Text>
                    <Group gap={4} align="baseline">
                      <Text fw={700}>{(statsQuery.data.totalHoursStudied ?? 0).toFixed(1)}</Text>
                      <Text size="xs" c="dimmed">
                        {t('personalStats.hours')}
                      </Text>
                    </Group>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="sm" c="dimmed">
                      {t('personalStats.longestSession')}
                    </Text>
                    <Group gap={4} align="baseline">
                      <Text fw={700}>{statsQuery.data.longestSession ?? 0}</Text>
                      <Text size="xs" c="dimmed">
                        {t('personalStats.minutes')}
                      </Text>
                    </Group>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="sm" c="dimmed">
                      {t('personalStats.totalSpacesVisited')}
                    </Text>
                    <Text fw={700}>{statsQuery.data.totalSpacesVisited ?? 0}</Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="sm" c="dimmed">
                      {t('personalStats.favoriteSpace')}
                    </Text>
                    <Text fw={700} truncate="end">
                      {statsQuery.data.favoriteSpace?.name || t('personalStats.favoriteSpaceNone')}
                    </Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="sm" c="dimmed">
                      {t('personalStats.mostActiveDay')}
                    </Text>
                    <Text fw={700}>
                      {statsQuery.data.mostActiveDay
                        ? t(
                            `personalStats.day${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][statsQuery.data.mostActiveDay]}`,
                          )
                        : '—'}
                    </Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="sm" c="dimmed">
                      {t('personalStats.favoriteTimeSlot')}
                    </Text>
                    <Text fw={700}>
                      {statsQuery.data.favoriteTimeSlot
                        ? t(
                            `personalStats.slot${statsQuery.data.favoriteTimeSlot.charAt(0).toUpperCase() + statsQuery.data.favoriteTimeSlot.slice(1)}`,
                          )
                        : '—'}
                    </Text>
                  </Stack>
                </SimpleGrid>
              </Stack>
            </Paper>
          ) : null}

          {badgesQuery.data?.all?.length ? (
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={600}>{t('badges.title')}</Text>
                  <Text size="xs" c="dimmed">
                    {t('badges.earned')}: {badgesQuery.data.earned.length}/
                    {badgesQuery.data.all.length}
                  </Text>
                </Group>
                <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
                  {badgesQuery.data.all.map((badge) => {
                    const earned = badgesQuery.data?.earned.includes(badge.slug)
                    return (
                      <Stack
                        key={badge.slug}
                        align="center"
                        gap={4}
                        style={{ opacity: earned ? 1 : 0.4 }}
                      >
                        <Text size="xl">{badge.icon}</Text>
                        <Text
                          size="xs"
                          ta="center"
                          fw={earned ? 600 : 400}
                          truncate="end"
                          maw="100%"
                        >
                          {badge.name}
                        </Text>
                      </Stack>
                    )
                  })}
                </SimpleGrid>
              </Stack>
            </Paper>
          ) : null}

          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start" gap="sm">
                <Stack gap={2}>
                  <Text fw={600}>{t('recentCheckins.title')}</Text>
                  <Text size="sm" c="dimmed">
                    {t('activeCheckin')}
                  </Text>
                </Stack>
                <Badge variant="light" color={activeCheckin ? 'green' : 'gray'}>
                  {activeCheckin ? t('present') : t('none')}
                </Badge>
              </Group>

              {checkinHistoryQuery.isError ? (
                <Alert color="red" variant="light">
                  {checkinHistoryQuery.error instanceof Error && checkinHistoryQuery.error.message
                    ? checkinHistoryQuery.error.message
                    : t('recentCheckins.error')}
                </Alert>
              ) : null}

              {profile ? <Divider /> : null}

              {profile ? (
                <Stack gap="sm">
                  <Text fw={600}>{t('stats.title')}</Text>
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <Stack gap={2}>
                      <Text size="sm" c="dimmed">
                        {t('stats.totalCheckins')}
                      </Text>
                      <Text fw={700}>{formatInt(profile.totalCheckins)}</Text>
                    </Stack>
                    <Stack gap={2}>
                      <Text size="sm" c="dimmed">
                        {t('stats.activityStreakDays')}
                      </Text>
                      <Text fw={700}>{formatInt(profile.activityStreakDays)}</Text>
                    </Stack>
                    <Stack gap={2}>
                      <Text size="sm" c="dimmed">
                        {t('stats.lastCheckinDate')}
                      </Text>
                      <Text fw={700}>{formatDate(profile.lastCheckinDate)}</Text>
                    </Stack>
                  </SimpleGrid>
                </Stack>
              ) : null}

              {checkinHistoryQuery.isPending ? (
                <Stack gap="xs">
                  <Skeleton height={18} width="75%" />
                  <Skeleton height={18} width="60%" />
                </Stack>
              ) : checkinHistoryQuery.data?.length ? (
                <Stack gap="sm">
                  {checkinHistoryQuery.data.map((entry, index) => (
                    <Stack key={entry.id} gap={2}>
                      {index > 0 ? <Divider variant="dashed" /> : null}
                      <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                        <Stack gap={2} style={{ minWidth: 0 }}>
                          <Text fw={600}>{entry.spaceName || entry.spaceId}</Text>
                          <Text size="sm" c="dimmed">
                            {entry.spaceAddress || t('recentCheckins.unknownAddress')}
                          </Text>
                        </Stack>
                        <Text
                          size="sm"
                          fw={700}
                          c="dimmed"
                          ta="right"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {formatInt(entry.durationMinutes)} min
                        </Text>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {t('recentCheckins.details', {
                          duration: formatInt(entry.durationMinutes),
                          endedAt: formatDate(entry.endedAt),
                        })}
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">{t('recentCheckins.empty')}</Text>
              )}
            </Stack>
          </Paper>
        </Stack>
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
