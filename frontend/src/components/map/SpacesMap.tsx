import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'
import { IconFilter, IconPlug, IconSearch, IconSnowflake, IconVolume3, IconWifi, IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ActionIcon, Avatar, Badge, Button, Group, Paper, Stack, Text } from '@mantine/core'
import type { ActiveCheckin } from '../../types/auth'
import type { SpaceSummary } from '../../types/spaces'
import type { ActiveCheckinUser } from '../../types/checkins'
import { fetchActiveCheckinsBySpace } from '../../api/checkins'
import { useClusterIndex } from '../../hooks/useClusterIndex'
import { useMapTheme } from '../../hooks/useMapTheme'
import { DEFAULT_CENTER, loadView, LIGHT_STYLE, DARK_STYLE, persistView } from './constants'
import { MapBtn } from './MapBtn'
import { SpaceDetailModal } from './SpaceDetailModal'
import type { Point } from './types'

type Props = {
  spaces: SpaceSummary[]
  activeCheckin: ActiveCheckin | null
  activeLabel: string
  isAuthenticated?: boolean
  activeFilterCount?: number
  onSearchClick?: () => void
  onFilterClick?: () => void
  onStartCheckin?: (spaceId: string, usesPower: boolean) => void
  onEndCheckin?: (checkinId: string) => void
}

export function SpacesMap({
  spaces, activeCheckin, activeLabel, isAuthenticated = false,
  activeFilterCount = 0,
  onSearchClick, onFilterClick, onStartCheckin, onEndCheckin,
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
  const [popupState, setPopupState] = useState<{ space: Point; container: HTMLDivElement } | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [detailSpace, setDetailSpace] = useState<SpaceSummary | null>(null)
  const [detailOpened, setDetailOpened] = useState(false)
  const [popupActiveUsers, setPopupActiveUsers] = useState<ActiveCheckinUser[]>([])

  const points = useMemo<Point[]>(
    () => spaces
      .filter((s): s is Point => s.latitude !== null && s.longitude !== null)
      .map((s) => ({ id: s.id, name: s.name, address: s.address, latitude: s.latitude!, longitude: s.longitude!, kind: s.kind, availability: s.availability, wifi: s.wifi, power: s.power, quiet: s.quiet, airConditioning: s.airConditioning })),
    [spaces],
  )

  const pointsKey = points.map((p) => `${p.id}:${p.latitude},${p.longitude}`).join('|')

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
  }, [])

  const closePopup = useCallback(() => {
    popupRef.current?.remove(); popupRef.current = null
    popupOpenRef.current = false; setPopupState(null)
  }, [])

  const clusterIndexRef = useClusterIndex(points)

  // Fetch active check-in users when popup opens
  useEffect(() => {
    if (popupState?.space.id) {
      fetchActiveCheckinsBySpace(popupState.space.id).then(setPopupActiveUsers).catch(() => setPopupActiveUsers([]))
    }
  }, [popupState?.space.id])

  // Init map — once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const sv = loadView()
    if (sv) didRestoreViewRef.current = true
    const map = new maplibregl.Map({
      container: el, style: isLight ? LIGHT_STYLE : DARK_STYLE,
      center: sv?.center ?? DEFAULT_CENTER, zoom: sv?.zoom ?? 12, pitch: 0, bearing: 0,
      attributionControl: true,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }), 'top-right')
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showUserLocation: true }), 'top-right')
    map.resize()
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(el)
    const onLoad = () => { map.resize(); setMapLoaded(true) }
    map.on('load', onLoad)
    let ticking = false
    map.on('move', () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => { renderClustersRef.current(); ticking = false })
    })
    map.on('moveend', () => { ticking = false; persistView(map); renderClustersRef.current() })
    return () => {
      ro.disconnect()
      if (mapRef.current) persistView(mapRef.current)
      clearMarkers(); closePopup(); popupRef.current = null
      setMapLoaded(false); map.remove(); mapRef.current = null; setPopupState(null)
    }
  }, [])

  // Switch style on theme change — preserves view + tile cache
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    setMapLoaded(false)
    map.setStyle(isLight ? LIGHT_STYLE : DARK_STYLE)
    map.once('style.load', () => { map.resize(); setMapLoaded(true) })
  }, [isLight])

  // Popup handlers
  const closePopupRef = useRef(closePopup)
  closePopupRef.current = closePopup

  const openPopupCb = useCallback((point: Point) => {
    const map = mapRef.current
    if (!map || popupOpenRef.current) return
    popupOpenRef.current = true
    const container = document.createElement('div')
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 24 })
    popup.on('close', () => { popupOpenRef.current = false; setPopupState(null) })
    popupRef.current = popup
    setPopupState({ space: point, container })
    popup.setDOMContent(container).setLngLat([point.longitude, point.latitude]).addTo(map)
  }, [])

  // Render clusters at current viewport — called from effect AND from move/moveend events
  const renderClusters = useCallback(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
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
          new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(coords)
            .addTo(map),
        )
      } else {
        const point = feature.properties as unknown as Point
        const el = document.createElement('div')
        el.className = activeCheckin?.spaceId === point.id ? 'space-map-marker space-map-marker--active' : 'space-map-marker'
        el.setAttribute('aria-label', point.name)
        el.addEventListener('click', (e) => { e.stopPropagation(); openPopupCb(point) })
        newMarkers.push(
          new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([point.longitude, point.latitude])
            .addTo(map),
        )
      }
    }

    markersRef.current = newMarkers
  }, [clearMarkers, mapLoaded, openPopupCb, activeCheckin?.spaceId, points])

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
        const bounds = new maplibregl.LngLatBounds([Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)])
        if (points.length === 1) map.flyTo({ center: [points[0].longitude, points[0].latitude], zoom: 14, duration: 650 })
        else map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 650 })
      }
    }

    renderClustersRef.current()
  }, [points, activeCheckin?.spaceId, mapLoaded])

  const openDetail = useCallback((space: SpaceSummary) => { setDetailSpace(space); setDetailOpened(true); closePopupRef.current() }, [])
  const closeDetail = useCallback(() => { setDetailOpened(false); setDetailSpace(null) }, [])
  const handleStart = useCallback((sid: string) => { onStartCheckin?.(sid, false); closePopupRef.current(); closeDetail() }, [onStartCheckin])
  const handleEnd = useCallback((cid: string) => { onEndCheckin?.(cid); closePopupRef.current(); closeDetail() }, [onEndCheckin])

  if (import.meta.env.MODE === 'test') {
    return (
      <div>
        {points.map((p) => (<div key={p.id}><span>{p.name}</span><button type="button" onClick={() => handleStart(p.id)}>{t('startCheckin')}</button></div>))}
        {!points.length && <div>No spaces</div>}
      </div>
    )
  }

  const activeSpaceId = popupState?.space.id ?? detailSpace?.id
  const isActiveHere = !!activeCheckin && activeCheckin.spaceId === activeSpaceId
  const hasActiveElsewhere = !!activeCheckin && !isActiveHere

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>
      <div ref={containerRef} className="space-map-canvas" />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2000 }}>
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden', boxShadow: '0 0 0 2px rgba(0,0,0,0.1)' }}>
          {onSearchClick && <MapBtn icon={<IconSearch size={16} />} label="Search" onClick={onSearchClick} top bottom={!onFilterClick} />}
          {onFilterClick && (
            <div style={{ position: 'relative' }}>
              <MapBtn icon={<IconFilter size={16} />} label="Filter" onClick={onFilterClick} top={!onSearchClick} bottom />
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  background: 'var(--mantine-color-blue-filled)', color: '#fff',
                  fontSize: 10, fontWeight: 700, lineHeight: 1.2,
                  padding: '1px 5px', borderRadius: 10, minWidth: 16, textAlign: 'center',
                }}>
                  {activeFilterCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {popupState && createPortal(
        <Paper withBorder p="md" radius="md" shadow="md" style={{ width: 280 }}>
          <Stack gap={8}>
            <Group gap="xs" justify="space-between" wrap="nowrap">
              <Text fw={600} size="sm" truncate style={{ flex: 1 }}>{popupState.space.name}</Text>
              <ActionIcon variant="subtle" size="sm" color="gray" onClick={closePopup}>
                <IconX size={14} />
              </ActionIcon>
            </Group>
            {popupState.space.address && (
              <Text size="xs" c="dimmed">{popupState.space.address}</Text>
            )}
            <Group gap={4}>
              <Badge size="sm" variant="light" color="blue">
                {popupState.space.kind ? t(`kindOptions.${popupState.space.kind}`) : t('kindOptions.other')}
              </Badge>
              <Badge size="sm" variant="light" color={({ free: 'green', moderate: 'yellow', busy: 'red' } as Record<string, string>)[popupState.space.availability ?? ''] ?? 'gray'}>
                {popupState.space.availability ? t(`availability.${popupState.space.availability}`) : t('availability.unknown')}
              </Badge>
            </Group>
            <Group gap={6}>
              {popupState.space.wifi && <IconWifi size={14} />}
              {popupState.space.power && <IconPlug size={14} />}
              {popupState.space.quiet && <IconVolume3 size={14} />}
              {popupState.space.airConditioning && <IconSnowflake size={14} />}
            </Group>
            {popupActiveUsers.length > 0 && (
              <Avatar.Group>
                {popupActiveUsers.slice(0, 5).map((u) => (
                  <Avatar key={u.id} size="sm" src={u.avatarUrl || undefined} alt={u.username}>
                    {u.username.slice(0, 1).toUpperCase()}
                  </Avatar>
                ))}
                {popupActiveUsers.length > 5 && (
                  <Avatar size="sm">+{popupActiveUsers.length - 5}</Avatar>
                )}
              </Avatar.Group>
            )}
            <Button size="xs" variant="light" fullWidth onClick={() => openDetail(popupState.space)}>
              {t('details.open')}
            </Button>
          </Stack>
        </Paper>,
        popupState.container,
      )}
      <SpaceDetailModal
        space={detailSpace} opened={detailOpened} onClose={closeDetail}
        isAuthenticated={isAuthenticated} isActiveCheckin={isActiveHere}
        hasActiveCheckinElsewhere={hasActiveElsewhere}
        onStartCheckin={handleStart} onEndCheckin={handleEnd}
        activeCheckinId={activeCheckin?.id ?? null}
        activeCheckinUsers={popupActiveUsers}
      />
    </div>
  )
}
