import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useClusterIndex } from './useClusterIndex'

describe('useClusterIndex', () => {
  it('returns null ref for empty points', () => {
    const { result } = renderHook(() => useClusterIndex([]))
    expect(result.current.current).toBeNull()
  })

  it('returns a cluster index for non-empty points', () => {
    const { result } = renderHook(() =>
      useClusterIndex([
        {
          id: '1',
          latitude: 45.46,
          longitude: 9.19,
          name: 'A',
          address: null,
          kind: 'library',
          availability: 'free',
          capacity: null,
          powerCapacity: null,
          wifi: false,
          power: false,
          quiet: false,
          airConditioning: false,
        },
        {
          id: '2',
          latitude: 45.47,
          longitude: 9.2,
          name: 'B',
          address: null,
          kind: 'cafe',
          availability: 'busy',
          capacity: null,
          powerCapacity: null,
          wifi: false,
          power: false,
          quiet: false,
          airConditioning: false,
        },
      ]),
    )
    expect(result.current.current).not.toBeNull()
  })

  it('clears index when points change to empty', () => {
    const { result, rerender } = renderHook(({ points }) => useClusterIndex(points), {
      initialProps: {
        points: [
          {
            id: '1',
            latitude: 45.46,
            longitude: 9.19,
            name: 'A',
            address: null,
            kind: 'library',
            availability: 'free',
            capacity: null,
            powerCapacity: null,
            wifi: false,
            power: false,
            quiet: false,
            airConditioning: false,
          },
        ],
      },
    })
    expect(result.current.current).not.toBeNull()
    rerender({ points: [] })
    expect(result.current.current).toBeNull()
  })
})
