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
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 29,
        height: 29,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 0,
        cursor: 'pointer',
        borderRadius: top ? '4px 4px 0 0' : bottom ? '0 0 4px 4px' : 0,
        borderBottom: bottom ? 0 : '1px solid rgba(0,0,0,0.1)',
        background: h ? '#f4f4f4' : '#fff',
        color: '#222',
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      {icon}
    </button>
  )
}
