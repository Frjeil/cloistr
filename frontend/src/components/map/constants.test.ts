import type maplibregl from 'maplibre-gl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadView, persistView } from './constants'

describe('loadView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no saved view', () => {
    expect(loadView()).toBeNull()
  })

  it('returns parsed JSON when saved', () => {
    localStorage.setItem('cloistr_map_view', JSON.stringify({ center: [9.19, 45.46], zoom: 14 }))
    const view = loadView()
    expect(view).toEqual({ center: [9.19, 45.46], zoom: 14 })
  })

  it('returns null on parse error', () => {
    localStorage.setItem('cloistr_map_view', '{invalid')
    expect(loadView()).toBeNull()
  })
})

describe('persistView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves map view to localStorage', () => {
    const mockMap = {
      getCenter: () => ({ toArray: () => [9.2, 45.47] }),
      getZoom: () => 15,
    }
    persistView(mockMap as unknown as maplibregl.Map)
    const saved = localStorage.getItem('cloistr_map_view')
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved ?? '')
    expect(parsed.center).toEqual([9.2, 45.47])
    expect(parsed.zoom).toBe(15)
  })

  it('handles localStorage quota error gracefully', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const mockMap = {
      getCenter: () => ({ toArray: () => [9.19, 45.46] }),
      getZoom: () => 12,
    }
    expect(() => persistView(mockMap as unknown as maplibregl.Map)).not.toThrow()
    setItemSpy.mockRestore()
  })
})
