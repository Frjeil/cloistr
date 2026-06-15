import 'maplibre-gl/dist/maplibre-gl.css'
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core'
import {
  IconFilter,
  IconPlug,
  IconSearch,
  IconSnowflake,
  IconVolume3,
  IconWifi,
  IconX,
} from '@tabler/icons-react'
import maplibregl from 'maplibre-gl'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { fetchActiveCheckinsBySpace } from '../../api/checkins'
import { useClusterIndex } from '../../hooks/useClusterIndex'
import { useMapTheme } from '../../hooks/useMapTheme'
import type { ActiveCheckin } from '../../types/auth'
import type { ActiveCheckinUser } from '../../types/checkins'
import type { SpaceSummary } from '../../types/spaces'
import { AVAILABILITY_COLORS } from '../../types/spaces'
import { DARK_STYLE, DEFAULT_CENTER, LIGHT_STYLE, loadView, persistView } from './constants'
import { MapBtn } from './MapBtn'
import { SpaceDetailModal } from './SpaceDetailModal'
import type { Point } from './types'

type PopupState = {
  space: Point | null
  container: HTMLDivElement | null
  users: ActiveCheckinUser[]
  loading: boolean
}

const INITIAL_POPUP: PopupState = {
  space: null,
  container: null,
  users: [],
  loading: false,
}

type PopupAction =
  | { type: 'OPEN'; space: Point; container: HTMLDivElement }
  | { type: 'CLOSE' }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; users: ActiveCheckinUser[] }
  | { type: 'FETCH_ERROR' }

function popupReducer(state: PopupState, action: PopupAction): PopupState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, space: action.space, container: action.container }
    case 'CLOSE':
      return INITIAL_POPUP
    case 'FETCH_START':
      return { ...state, loading: true, users: [] }
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, users: action.users }
    case 'FETCH_ERROR':
      return { ...state, loading: false, users: [] }
  }
}

type Props = {
  spaces: SpaceSummary[]
  activeCheckin: ActiveCheckin | null
  isAuthenticated?: boolean
  activeFilterCount?: number
  flyToTarget?: { longitude: number; latitude: number } | null
  onSearchClick?: () => void
  onFilterClick?: () => void
  onStartCheckin?: (spaceId: string, usesPower: boolean) => void
  onEndCheckin?: (checkinId: string) => void
}

export function SpacesMap({
  spaces,
  activeCheckin,
  isAuthenticated = false,
  activeFilterCount = 0,
  flyToTarget = null,
  onSearchClick,
  onFilterClick,
  onStartCheckin,
  onEndCheckin,
}: Props) {
  const { t } = useTranslation('spaces')
  const isLight = useMapTheme()

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const popupOpenRef = useRef(false)
  const renderClustersRef = useRef<() => void>(() => {})
  const prevPointsKeyRef = useRef('')
  const didRestoreViewRef = useRef(false)
  const [popup, dispatchPopup] = useReducer(popupReducer, INITIAL_POPUP)
  const [mapLoaded, _setMapLoaded] = useState(false)
  const mapLoadedRef = useRef(false)
  const setMapLoaded = useCallback((val: boolean) => {
    mapLoadedRef.current = val
    _setMapLoaded(val)
  }, [])
  const [detailSpace, setDetailSpace] = useState<SpaceSummary | null>(null)
  const [detailOpened, setDetailOpened] = useState(false)
  const lastFetchedSpaceIdRef = useRef<string | null>(null)
  const highlightedMarkerRef = useRef<string | null>(null)

  const points = useMemo<Point[]>(
    () =>
      spaces.reduce<Point[]>((acc, s) => {
        if (s.latitude !== null && s.longitude !== null) {
          acc.push({
            id: s.id,
            name: s.name,
            address: s.address,
            latitude: s.latitude,
            longitude: s.longitude,
            kind: s.kind,
            availability: s.availability,
            wifi: s.wifi,
            power: s.power,
            quiet: s.quiet,
            airConditioning: s.airConditioning,
          })
        }
        return acc
      }, []),
    [spaces],
  )

  const pointsKey = points.map((p) => `${p.id}:${p.latitude},${p.longitude}`).join('|')

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => {
      m.remove()
    })
    markersRef.current = []
  }, [])

  const closePopup = useCallback(() => {
    popupRef.current?.remove()
    popupRef.current = null
    popupOpenRef.current = false
    dispatchPopup({ type: 'CLOSE' })
    lastFetchedSpaceIdRef.current = null
  }, [])

  const clusterIndexRef = useClusterIndex(points)

  // Init map — once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const sv = loadView()
    if (sv) didRestoreViewRef.current = true
    const map = new maplibregl.Map({
      container: el,
      style: isLight ? LIGHT_STYLE : DARK_STYLE,
      center: sv?.center ?? DEFAULT_CENTER,
      zoom: sv?.zoom ?? 12,
      pitch: 0,
      bearing: 0,
      attributionControl: {},
    })
    mapRef.current = map
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }),
      'top-right',
    )
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserLocation: true,
      }),
      'top-right',
    )
    map.resize()
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(el)
    const onLoad = () => {
      map.resize()
      setMapLoaded(true)
    }
    map.on('load', onLoad)
    let ticking = false
    map.on('move', () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        renderClustersRef.current()
        ticking = false
      })
    })
    map.on('moveend', () => {
      ticking = false
      persistView(map)
      renderClustersRef.current()
    })
    return () => {
      ro.disconnect()
      if (mapRef.current) persistView(mapRef.current)
      clearMarkers()
      closePopup()
      popupRef.current = null
      setMapLoaded(false)
      map.remove()
      mapRef.current = null
    }
  }, [clearMarkers, closePopup, isLight, setMapLoaded])

  // Switch style on theme change — preserves view + tile cache
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    setMapLoaded(false)
    map.setStyle(isLight ? LIGHT_STYLE : DARK_STYLE)
    map.once('style.load', () => {
      map.resize()
      setMapLoaded(true)
    })
  }, [isLight, setMapLoaded])

  // Popup handlers
  const closePopupRef = useRef(closePopup)
  closePopupRef.current = closePopup

  const openPopupCb = useCallback((point: Point) => {
    const map = mapRef.current
    if (!map) return
    if (popupOpenRef.current) {
      closePopupRef.current()
    }
    popupOpenRef.current = true
    const container = document.createElement('div')
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 24 })
    popup.on('close', () => {
      popupOpenRef.current = false
      dispatchPopup({ type: 'CLOSE' })
      lastFetchedSpaceIdRef.current = null
    })
    popupRef.current = popup
    dispatchPopup({ type: 'OPEN', space: point, container })
    popup.setDOMContent(container).setLngLat([point.longitude, point.latitude]).addTo(map)
    dispatchPopup({ type: 'FETCH_START' })
    fetchActiveCheckinsBySpace(point.id)
      .then((users) => {
        dispatchPopup({ type: 'FETCH_SUCCESS', users })
        lastFetchedSpaceIdRef.current = point.id
      })
      .catch(() => dispatchPopup({ type: 'FETCH_ERROR' }))
  }, [])

  // Render clusters at current viewport — called from effect AND from move/moveend events
  const renderClusters = useCallback(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    clearMarkers()

    const index = clusterIndexRef.current
    if (!index || points.length === 0) return

    const bbox: [number, number, number, number] = [
      map.getBounds().getWest(),
      map.getBounds().getSouth(),
      map.getBounds().getEast(),
      map.getBounds().getNorth(),
    ]
    const zoom = Math.floor(map.getZoom())
    const features = index.getClusters(bbox, zoom)

    const newMarkers: maplibregl.Marker[] = []

    for (const feature of features) {
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]

      if (feature.properties && 'cluster' in feature.properties && feature.properties.cluster) {
        const raw = (feature.properties.point_count as number) || 0
        const count = String(raw)
        const clusterId = feature.properties.cluster_id as number
        const size = raw < 10 ? 'sm' : raw < 100 ? 'md' : 'lg'
        const el = document.createElement('div')
        el.className = 'space-map-cluster'
        el.dataset.size = size
        el.textContent = count
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          const expansionZoom = index.getClusterExpansionZoom(clusterId)
          map.flyTo({ center: coords, zoom: expansionZoom })
        })
        newMarkers.push(
          new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(coords).addTo(map),
        )
      } else {
        const point = feature.properties as unknown as Point
        const el = document.createElement('div')
        const isActive = activeCheckin?.spaceId === point.id
        const isHighlighted = highlightedMarkerRef.current === point.id
        const classes = ['space-map-marker']
        if (isActive) classes.push('space-map-marker--active')
        if (isHighlighted) classes.push('space-map-marker--highlighted')
        el.className = classes.join(' ')
        el.setAttribute('aria-label', point.name)
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          openPopupCb(point)
        })
        newMarkers.push(
          new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([point.longitude, point.latitude])
            .addTo(map),
        )
      }
    }

    markersRef.current = newMarkers
  }, [clearMarkers, openPopupCb, activeCheckin?.spaceId, points, clusterIndexRef.current])

  renderClustersRef.current = renderClusters

  // Re-render on data/theme/active-checkin changes — fitBounds first if data changed
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    map.resize()

    const pointsChanged = prevPointsKeyRef.current !== pointsKey && pointsKey !== ''

    if (pointsChanged) {
      prevPointsKeyRef.current = pointsKey
      const skipFly = didRestoreViewRef.current
      didRestoreViewRef.current = false
      if (points.length && !skipFly) {
        const lngs = points.map((p) => p.longitude)
        const lats = points.map((p) => p.latitude)
        const bounds = new maplibregl.LngLatBounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        )
        if (points.length === 1)
          map.flyTo({ center: [points[0].longitude, points[0].latitude], zoom: 14, duration: 650 })
        else map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 650 })
      }
    }

    renderClustersRef.current()
  }, [points, mapLoaded, pointsKey])

  // Fly to target when search result is selected
  useEffect(() => {
    if (!flyToTarget || !mapRef.current || !mapLoaded) return
    const map = mapRef.current
    map.flyTo({
      center: [flyToTarget.longitude, flyToTarget.latitude],
      zoom: 16,
      duration: 650,
    })
    const point = points.find(
      (p) => p.longitude === flyToTarget.longitude && p.latitude === flyToTarget.latitude,
    )
    if (point) {
      highlightedMarkerRef.current = point.id
      renderClustersRef.current()
      const highlightTimer = setTimeout(() => {
        highlightedMarkerRef.current = null
        renderClustersRef.current()
      }, 4000)
      map.once('moveend', () => {
        openPopupCb(point)
      })
      return () => clearTimeout(highlightTimer)
    }
  }, [flyToTarget, mapLoaded, openPopupCb, points])

  const openDetail = useCallback((space: SpaceSummary) => {
    setDetailSpace(space)
    setDetailOpened(true)
    closePopupRef.current()
  }, [])
  const closeDetail = useCallback(() => {
    setDetailOpened(false)
    setDetailSpace(null)
  }, [])
  const handleStart = useCallback(
    (sid: string) => {
      onStartCheckin?.(sid, false)
      closePopupRef.current()
      closeDetail()
    },
    [onStartCheckin, closeDetail],
  )
  const handleEnd = useCallback(
    (cid: string) => {
      onEndCheckin?.(cid)
      closePopupRef.current()
      closeDetail()
    },
    [onEndCheckin, closeDetail],
  )

  if (import.meta.env.MODE === 'test') {
    return (
      <div>
        {points.map((p) => (
          <div key={p.id}>
            <span>{p.name}</span>
            <button type="button" onClick={() => handleStart(p.id)}>
              {t('startCheckin')}
            </button>
          </div>
        ))}
        {!points.length && <div>No spaces</div>}
      </div>
    )
  }

  const activeSpaceId = popup.space?.id ?? detailSpace?.id
  const isActiveHere = !!activeCheckin && activeCheckin.spaceId === activeSpaceId
  const hasActiveElsewhere = !!activeCheckin && !isActiveHere

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>
      <div ref={containerRef} className="space-map-canvas" />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2000 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
          }}
        >
          {onSearchClick && (
            <MapBtn
              icon={<IconSearch size={16} />}
              label="Search"
              onClick={onSearchClick}
              top
              bottom={!onFilterClick}
            />
          )}
          {onFilterClick && (
            <div style={{ position: 'relative' }}>
              <MapBtn
                icon={<IconFilter size={16} />}
                label="Filter"
                onClick={onFilterClick}
                top={!onSearchClick}
                bottom
              />
              {activeFilterCount > 0 && (
                <span className="space-map-filter-badge">{activeFilterCount}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {popup.space &&
        popup.container &&
        (() => {
          const s = popup.space
          return createPortal(
            <Paper withBorder p="md" radius="md" shadow="md" style={{ width: 280 }}>
              <Stack gap={8}>
                <Group gap="xs" justify="space-between" wrap="nowrap">
                  <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
                    {s.name}
                  </Text>
                  <ActionIcon variant="subtle" size="sm" color="gray" onClick={closePopup}>
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
                {s.address && (
                  <Text size="xs" c="dimmed">
                    {s.address}
                  </Text>
                )}
                <Group gap={4}>
                  <Badge size="sm" variant="light" color="blue">
                    {s.kind ? t(`kindOptions.${s.kind}`) : t('kindOptions.other')}
                  </Badge>
                  <Badge
                    size="sm"
                    variant="light"
                    color={
                      AVAILABILITY_COLORS[
                        (s.availability ?? 'free') as 'free' | 'moderate' | 'busy'
                      ] ?? 'gray'
                    }
                  >
                    {s.availability
                      ? t(`availability.${s.availability}`)
                      : t('availability.unknown')}
                  </Badge>
                </Group>
                <Group gap={6}>
                  {s.wifi && <IconWifi size={14} />}
                  {s.power && <IconPlug size={14} />}
                  {s.quiet && <IconVolume3 size={14} />}
                  {s.airConditioning && <IconSnowflake size={14} />}
                </Group>
                {popup.loading ? (
                  <Group gap={4}>
                    <Skeleton height={28} width={28} radius="xl" />
                    <Skeleton height={28} width={28} radius="xl" />
                    <Skeleton height={28} width={28} radius="xl" />
                  </Group>
                ) : popup.users.length > 0 ? (
                  <Avatar.Group>
                    {popup.users.slice(0, 5).map((u) => (
                      <Avatar key={u.id} size="sm" src={u.avatarUrl || undefined} alt={u.username}>
                        {u.username.slice(0, 1).toUpperCase()}
                      </Avatar>
                    ))}
                    {popup.users.length > 5 && <Avatar size="sm">+{popup.users.length - 5}</Avatar>}
                  </Avatar.Group>
                ) : null}
                <Button
                  size="xs"
                  variant="light"
                  fullWidth
                  onClick={() => {
                    const full = spaces.find((sp) => sp.id === s.id)
                    if (full) openDetail(full)
                  }}
                >
                  {t('details.open')}
                </Button>
              </Stack>
            </Paper>,
            popup.container,
          )
        })()}
      <SpaceDetailModal
        space={detailSpace}
        opened={detailOpened}
        onClose={closeDetail}
        isAuthenticated={isAuthenticated}
        isActiveCheckin={isActiveHere}
        hasActiveCheckinElsewhere={hasActiveElsewhere}
        onStartCheckin={handleStart}
        onEndCheckin={handleEnd}
        activeCheckinId={activeCheckin?.id ?? null}
        activeCheckinUsers={popup.users}
      />
    </div>
  )
}
