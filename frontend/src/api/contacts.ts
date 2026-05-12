import { apiFetch } from './client'

export type ContactPayload = {
  name: string
  email: string
  message: string
}

export async function sendContactMessage(payload: ContactPayload): Promise<void> {
  await apiFetch<null>('/api/contacts/', {
    method: 'POST',
    body: payload,
    parse: 'none',
    errorMessage: 'Unable to send message',
  })
}
