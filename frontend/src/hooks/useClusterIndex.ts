import { useEffect, useRef } from 'react'
import Supercluster from 'supercluster'
import type { Point } from '../components/map/types'

export function useClusterIndex(points: Point[]) {
  const clusterIndexRef = useRef<Supercluster | null>(null)

  useEffect(() => {
    if (points.length === 0) {
      clusterIndexRef.current = null
      return
    }
    const index = new Supercluster({ radius: 60, maxZoom: 16, minPoints: 2 })
    index.load(
      points.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
        properties: p as unknown as Record<string, unknown>,
      })),
    )
    clusterIndexRef.current = index
  }, [points])

  return clusterIndexRef
}
