import type maplibregl from 'maplibre-gl'

export const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
export const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark'
export const DEFAULT_CENTER: [number, number] = [9.19, 45.4642]

const STORAGE_KEY = 'cloistr_map_view'

export function loadView() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function persistView(map: maplibregl.Map) {
  const data = { center: map.getCenter().toArray() as [number, number], zoom: map.getZoom() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* */
  }
}
