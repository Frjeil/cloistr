import { apiBase } from '../lib/config'
import { getCsrfToken } from '../utils/csrf'

type ParseMode = 'json' | 'text' | 'none'

type ApiOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: BodyInit | FormData | Record<string, unknown>
  headers?: HeadersInit
  parse?: ParseMode
  csrf?: boolean
  ensureCsrf?: boolean
  errorMessage?: string
}

type ApiError = Error & {
  status?: number
  body?: unknown
}

export class HttpError extends Error implements ApiError {
  status?: number
  body?: unknown

  constructor(message: string, options?: { status?: number; body?: unknown }) {
    super(message)
    this.name = 'HttpError'
    this.status = options?.status
    this.body = options?.body
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError
}

export async function ensureCsrfCookie(): Promise<void> {
  if (getCsrfToken()) {
    return
  }

  await fetch(`${apiBase}/api/auth/csrf/`, {
    credentials: 'include',
  })
}

function isSerializableBody(body: ApiOptions['body']): body is Record<string, unknown> {
  return Boolean(body) && !(body instanceof FormData) && typeof body !== 'string'
}

async function parseResponse(response: Response, parse: ParseMode): Promise<unknown> {
  if (parse === 'none') {
    return null
  }

  if (parse === 'text') {
    return response.text()
  }

  return response.json().catch(() => null)
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const {
    body,
    headers,
    parse = 'json',
    csrf = false,
    ensureCsrf = false,
    credentials = 'include',
    errorMessage,
    ...rest
  } = options

  if (ensureCsrf || csrf) {
    await ensureCsrfCookie()
  }

  const finalHeaders = new Headers(headers ?? {})
  if (csrf) {
    const csrfToken = getCsrfToken()
    if (csrfToken && !finalHeaders.has('X-CSRFToken')) {
      finalHeaders.set('X-CSRFToken', csrfToken)
    }
  }

  let requestBody: BodyInit | FormData | undefined
  if (body instanceof FormData || typeof body === 'string' || body === undefined) {
    requestBody = body
  } else if (isSerializableBody(body)) {
    requestBody = JSON.stringify(body)
    if (!finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json')
    }
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...rest,
    body: requestBody,
    credentials,
    headers: finalHeaders,
  })

  const payload = await parseResponse(response, parse)
  if (!response.ok) {
    const error = new HttpError(
      (payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : errorMessage) ||
        response.statusText ||
        'Request failed',
      {
        status: response.status,
        body: payload,
      },
    )
    throw error
  }

  return payload as T
}
