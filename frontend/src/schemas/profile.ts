import { z } from 'zod'
import { sanitizeString } from '../utils/validation'

const sanitizedString = z.string().transform(sanitizeString)

const safeDiscordHandle = sanitizedString.refine(
  (value) => value.length <= 120 && !/<[^>]*>|javascript:|on\w+\s*=|<script|<iframe/i.test(value),
  {
    message: 'discordInvalid',
  },
)

export const profileSettingsSchema = z.object({
  username: sanitizedString.refine(
    (v) => v.length >= 3 && v.length <= 150 && /^[a-zA-Z0-9_.-]+$/.test(v),
    { message: 'validation.username' },
  ),
  email: sanitizedString.refine(
    (v) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { message: 'validation.email' },
  ),
  discordHandle: safeDiscordHandle,
  sharePresence: z.boolean(),
})

export type ProfileSettingsFormInput = z.input<typeof profileSettingsSchema>
export type ProfileSettingsFormValues = z.output<typeof profileSettingsSchema>
