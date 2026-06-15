import { Alert, Avatar, Button, FileButton, Group, Skeleton, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

type Props = {
  avatarUrl: string | undefined
  displayName: string
  isPending: boolean
  uploadPending: boolean
  deletePending: boolean
  avatarError: string | null
  avatarMessage: string | null
  onUpload: (file: File) => void
  onDelete: () => void
}

export function ProfileAvatar({
  avatarUrl,
  displayName,
  isPending,
  uploadPending,
  deletePending,
  avatarError,
  avatarMessage,
  onUpload,
  onDelete,
}: Props) {
  const { t } = useTranslation('profile')

  return (
    <Group align="flex-start" wrap="wrap" gap="lg">
      {isPending ? (
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
              if (file) onUpload(file)
            }}
            accept="image/png,image/jpeg,image/webp"
          >
            {(props) => (
              <Button {...props} type="button" variant="light" loading={uploadPending}>
                {t('uploadAvatar')}
              </Button>
            )}
          </FileButton>
          <Button
            type="button"
            color="red"
            variant="subtle"
            onClick={onDelete}
            disabled={!avatarUrl}
            loading={deletePending}
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
  )
}
