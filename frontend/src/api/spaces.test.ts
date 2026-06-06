import { describe, expect, it, vi } from 'vitest'
import { buildSpacesSearchParams, fetchSpaces } from './spaces'

vi.mock('./client', () => ({
  apiFetch: vi.fn(),
}))

describe('buildSpacesSearchParams', () => {
  const emptyFilters = {
    q: '',
    kind: '' as const,
    availability: '' as const,
    wifi: false,
    power: false,
    quiet: false,
    airConditioning: false,
  }

  it('returns empty params for default filters', () => {
    const params = buildSpacesSearchParams(emptyFilters)
    expect(params.toString()).toBe('')
  })

  it('includes query string', () => {
    const params = buildSpacesSearchParams({ ...emptyFilters, q: 'library' })
    expect(params.get('q')).toBe('library')
  })

  it('includes kind filter', () => {
    const params = buildSpacesSearchParams({ ...emptyFilters, kind: 'cafe' })
    expect(params.get('kind')).toBe('cafe')
  })

  it('includes availability filter', () => {
    const params = buildSpacesSearchParams({ ...emptyFilters, availability: 'free' })
    expect(params.get('availability')).toBe('free')
  })

  it('includes boolean flags as 1', () => {
    const params = buildSpacesSearchParams({
      ...emptyFilters,
      wifi: true,
      power: true,
      quiet: true,
      airConditioning: true,
    })
    expect(params.get('wifi')).toBe('1')
    expect(params.get('power')).toBe('1')
    expect(params.get('quiet')).toBe('1')
    expect(params.get('air_conditioning')).toBe('1')
  })

  it('combines multiple filters', () => {
    const params = buildSpacesSearchParams({
      ...emptyFilters,
      q: 'study',
      kind: 'library',
      wifi: true,
    })
    expect(params.get('q')).toBe('study')
    expect(params.get('kind')).toBe('library')
    expect(params.get('wifi')).toBe('1')
    expect(params.has('availability')).toBe(false)
  })
})

describe('fetchSpaces', () => {
  it('normalizes valid space results', async () => {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValueOnce({
      results: [
        {
          id: '1',
          name: 'Biblioteca',
          kind: 'library',
          wifi: true,
          power: false,
          quiet: true,
          air_conditioning: true,
          availability: 'free',
          latitude: 45.46,
          longitude: 9.19,
          address: 'Via Roma',
        },
        {
          id: '2',
          name: 'Cafe',
          kind: 'cafe',
          wifi: false,
          power: true,
          quiet: false,
          air_conditioning: false,
          availability: 'busy',
          capacity: 30,
          power_capacity: 10,
        },
      ],
    })
    const spaces = await fetchSpaces({
      q: '',
      kind: '',
      availability: '',
      wifi: false,
      power: false,
      quiet: false,
      airConditioning: false,
    })
    expect(spaces).toHaveLength(2)
    expect(spaces[0].id).toBe('1')
    expect(spaces[0].kind).toBe('library')
    expect(spaces[1].kind).toBe('cafe')
  })

  it('filters out invalid results', async () => {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValueOnce({
      results: [{ id: '1', name: 'Valid' }, { name: 'NoId' }, null, { id: '3' }],
    })
    const spaces = await fetchSpaces({
      q: '',
      kind: '',
      availability: '',
      wifi: false,
      power: false,
      quiet: false,
      airConditioning: false,
    })
    expect(spaces).toHaveLength(1)
    expect(spaces[0].id).toBe('1')
  })

  it('handles missing results field', async () => {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValueOnce({})
    const spaces = await fetchSpaces({
      q: '',
      kind: '',
      availability: '',
      wifi: false,
      power: false,
      quiet: false,
      airConditioning: false,
    })
    expect(spaces).toEqual([])
  })

  it('trims empty results', async () => {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValueOnce({ results: [] })
    const spaces = await fetchSpaces({
      q: '',
      kind: '',
      availability: '',
      wifi: false,
      power: false,
      quiet: false,
      airConditioning: false,
    })
    expect(spaces).toEqual([])
  })

  it('builds search URL from params', async () => {
    const { apiFetch } = await import('./client')
    vi.mocked(apiFetch).mockResolvedValueOnce({ results: [] })
    await fetchSpaces({
      q: 'test',
      kind: 'library',
      availability: '',
      wifi: false,
      power: false,
      quiet: false,
      airConditioning: false,
    })
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      expect.stringContaining('q=test'),
      expect.any(Object),
    )
  })
})
