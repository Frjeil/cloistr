import { useState } from 'react'

type Props = {
  icon: React.ReactNode
  label: string
  onClick: () => void
  top: boolean
  bottom: boolean
}

export function MapBtn({ icon, label, onClick, top, bottom }: Props) {
  const [h, setH] = useState(false)
  const className = [
    'space-map-btn',
    top ? 'space-map-btn--top' : '',
    bottom ? 'space-map-btn--bottom' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={className}
      data-hovered={h || undefined}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      {icon}
    </button>
  )
}
