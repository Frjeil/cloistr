export function getCsrfToken(): string | null {
  const name = 'cloistr_csrf'

  if (!document.cookie) {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim()
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.slice(name.length + 1))
    }
  }

  return null
}
