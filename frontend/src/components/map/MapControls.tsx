import { IconFilter, IconSearch } from '@tabler/icons-react'
import { MapBtn } from './MapBtn'

type Props = {
  onSearchClick?: () => void
  onFilterClick?: () => void
  activeFilterCount: number
}

export function MapControls({ onSearchClick, onFilterClick, activeFilterCount }: Props) {
  return (
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
  )
}
