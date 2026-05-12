import { z } from 'zod'
import { sanitizeString } from '../utils/validation'

const requiredMessage = 'validation.required'

const sanitizedString = z.string().transform(sanitizeString)

const usernameSchema = sanitizedString
  .refine((value) => value.length > 0, { message: requiredMessage })
  .refine((value) => value.length >= 3 && value.length <= 150 && /^[a-zA-Z0-9_.-]+$/.test(value), {
    message: 'validation.username',
  })

const emailSchema = sanitizedString
  .refine((value) => value.length > 0, { message: requiredMessage })
  .refine((value) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'validation.email',
  })

const passwordSchema = z
  .string()
  .min(1, { message: requiredMessage })
  .refine(
    (value) =>
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(value),
    {
      message: 'validation.passwordStrength',
    },
  )

const passwordConfirmationSchema = z.string().min(1, { message: requiredMessage })

export const loginSchema = z.object({
  login: sanitizedString.refine((value) => value.length > 0, { message: requiredMessage }),
  password: z.string().min(1, { message: requiredMessage }),
})

export type LoginFormInput = z.input<typeof loginSchema>
export type LoginFormValues = z.output<typeof loginSchema>

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password1: passwordSchema,
    password2: passwordConfirmationSchema,
  })
  .refine((value) => value.password1 === value.password2, {
    message: 'validation.passwordMatch',
    path: ['password2'],
  })

export type RegisterFormInput = z.input<typeof registerSchema>
export type RegisterFormValues = z.output<typeof registerSchema>

export const passwordResetSchema = z.object({
  email: emailSchema,
})

export type PasswordResetFormInput = z.input<typeof passwordResetSchema>
export type PasswordResetFormValues = z.output<typeof passwordResetSchema>

export const passwordResetConfirmSchema = z
  .object({
    password1: passwordSchema,
    password2: passwordConfirmationSchema,
  })
  .refine((value) => value.password1 === value.password2, {
    message: 'validation.passwordMatch',
    path: ['password2'],
  })

export type PasswordResetConfirmFormInput = z.input<typeof passwordResetConfirmSchema>
export type PasswordResetConfirmFormValues = z.output<typeof passwordResetConfirmSchema>

export const passwordChangeSchema = z
  .object({
    oldPassword: z.string().min(1, { message: requiredMessage }),
    password1: passwordSchema,
    password2: passwordConfirmationSchema,
  })
  .refine((value) => value.password1 === value.password2, {
    message: 'validation.passwordMatch',
    path: ['password2'],
  })

export type PasswordChangeFormInput = z.input<typeof passwordChangeSchema>
export type PasswordChangeFormValues = z.output<typeof passwordChangeSchema>
