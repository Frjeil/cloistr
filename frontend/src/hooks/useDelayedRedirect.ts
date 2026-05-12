import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export function useDelayedRedirect(to: string, delay: number, active: boolean) {
  const navigate = useNavigate()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active) return

    timeoutRef.current = setTimeout(() => {
      navigate(to, { replace: true })
    }, delay)

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [to, delay, active, navigate])
}
