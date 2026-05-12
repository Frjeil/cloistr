export const apiBase = import.meta.env.VITE_API_BASE ?? ''

export const appConfig = {
  apiBase,
  donateUrl: import.meta.env.VITE_DONATE_URL ?? 'https://ko-fi.com/frjeil',
  discordUrl: 'https://dsc.gg/cloistr',
} as const
