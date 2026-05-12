export function sanitizeString(input: string): string {
  const withoutTags = input.replace(/<[^>]*>/g, '')
  return withoutTags.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
}
