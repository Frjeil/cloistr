import { describe, expect, it } from 'vitest'
import { readBoolean, readIdentifier, readNumber, readStrictBoolean, readString } from './normalizers'

describe('readString', () => {
  it('returns trimmed string for valid input', () => {
    expect(readString('  hello  ')).toBe('hello')
  })

  it('returns null for empty string', () => {
    expect(readString('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(readString('   ')).toBeNull()
  })

  it('returns null for non-string types', () => {
    expect(readString(123)).toBeNull()
    expect(readString(null)).toBeNull()
    expect(readString(undefined)).toBeNull()
    expect(readString({})).toBeNull()
    expect(readString([])).toBeNull()
  })
})

describe('readBoolean', () => {
  it('returns true for true', () => {
    expect(readBoolean(true)).toBe(true)
  })

  it('returns false for false', () => {
    expect(readBoolean(false)).toBe(false)
  })

  it('returns null for non-boolean', () => {
    expect(readBoolean('true')).toBeNull()
    expect(readBoolean(1)).toBeNull()
    expect(readBoolean(null)).toBeNull()
    expect(readBoolean(undefined)).toBeNull()
  })

  it('returns null for truthy/falsy values', () => {
    expect(readBoolean(0)).toBeNull()
    expect(readBoolean('')).toBeNull()
    expect(readBoolean({})).toBeNull()
  })
})

describe('readStrictBoolean', () => {
  it('returns true only for true', () => {
    expect(readStrictBoolean(true)).toBe(true)
    expect(readStrictBoolean(false)).toBe(false)
    expect(readStrictBoolean(1)).toBe(false)
    expect(readStrictBoolean('true')).toBe(false)
    expect(readStrictBoolean(null)).toBe(false)
    expect(readStrictBoolean(undefined)).toBe(false)
  })
})

describe('readNumber', () => {
  it('returns finite numbers as-is', () => {
    expect(readNumber(42)).toBe(42)
    expect(readNumber(0)).toBe(0)
    expect(readNumber(-1)).toBe(-1)
    expect(readNumber(3.14)).toBe(3.14)
  })

  it('parses numeric strings', () => {
    expect(readNumber('42')).toBe(42)
    expect(readNumber('3.14')).toBe(3.14)
    expect(readNumber('  100  ')).toBe(100)
  })

  it('returns null for NaN', () => {
    expect(readNumber(NaN)).toBeNull()
  })

  it('returns null for Infinity', () => {
    expect(readNumber(Infinity)).toBeNull()
    expect(readNumber(-Infinity)).toBeNull()
  })

  it('returns null for non-numeric strings', () => {
    expect(readNumber('abc')).toBeNull()
    expect(readNumber('')).toBeNull()
  })

  it('returns null for non-numeric types', () => {
    expect(readNumber(null)).toBeNull()
    expect(readNumber(undefined)).toBeNull()
    expect(readNumber({})).toBeNull()
    expect(readNumber([])).toBeNull()
  })
})

describe('readIdentifier', () => {
  it('returns string for numeric id', () => {
    expect(readIdentifier(42)).toBe('42')
    expect(readIdentifier(0)).toBe('0')
  })

  it('returns trimmed string for string id', () => {
    expect(readIdentifier('abc-123')).toBe('abc-123')
    expect(readIdentifier('  hello  ')).toBe('hello')
  })

  it('returns null for missing values', () => {
    expect(readIdentifier(null)).toBeNull()
    expect(readIdentifier(undefined)).toBeNull()
  })

  it('returns null for NaN', () => {
    expect(readIdentifier(NaN)).toBeNull()
  })
})
