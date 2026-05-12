import { z } from 'zod'
import { sanitizeString } from '../utils/validation'

const requiredMessage = 'validation.required'

const sanitizedString = z.string().transform(sanitizeString)

export const contactSchema = z.object({
  name: sanitizedString.refine((v) => v.length > 0, { message: requiredMessage }),
  email: sanitizedString
    .refine((v) => v.length > 0, { message: requiredMessage })
    .refine((v) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: 'validation.email',
    }),
  message: sanitizedString.refine((v) => v.length > 0, { message: requiredMessage }),
})

export type ContactFormValues = z.infer<typeof contactSchema>
