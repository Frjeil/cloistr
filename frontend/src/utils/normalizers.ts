export function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

export function readStrictBoolean(value: unknown): boolean {
  return value === true
}

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

export function readIdentifier(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return readString(value)
}
