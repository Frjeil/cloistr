import { useEffect, useState } from 'react'

export function useMapTheme() {
  const [isLight, setIsLight] = useState(() => {
    return document.documentElement.getAttribute('data-mantine-color-scheme') !== 'dark'
  })

  useEffect(() => {
    const obs = new MutationObserver(() => {
      const s = document.documentElement.getAttribute('data-mantine-color-scheme')
      setIsLight(s !== 'dark')
    })
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mantine-color-scheme'],
    })
    return () => obs.disconnect()
  }, [])

  return isLight
}
