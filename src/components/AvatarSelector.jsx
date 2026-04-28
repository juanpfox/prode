import { useState } from 'react'
import './AvatarSelector.css'

export const AVATAR_CATEGORIES = [
  { id: 'people', label: 'Personas', icon: '👤', sheets: ['people', 'people2'] },
  { id: 'animals', label: 'Animales', icon: '🐶', sheets: ['animals'] },
  { id: 'players', label: 'Jugadores', icon: '⚽', sheets: ['players', 'players2'] },
  { id: 'teams', label: 'Clubes', icon: '🏟️', sheets: ['teams'] },
  { id: 'celebs', label: 'Famosos', icon: '🌟', sheets: ['celebs', 'celebs2'] },
  { id: 'others', label: 'Otros', icon: '🎭', sheets: ['others'] }
]

// All sprite sheets are 1024x1024 with a 4x4 grid.
// background-position percentage: X% means the point at X% of the image
// aligns with X% of the container.
// For 4 columns: 0%, 33.33%, 66.67%, 100%
// For 4 rows:    0%, 33.33%, 66.67%, 100%
// background-size: 400% = each cell is exactly the container size.
// CSS transform: scale(1.15) on .avatar-img zooms in slightly to crop
// any bleed from neighboring icons, while overflow:hidden on .avatar-item clips it.
const BG_SIZE = 400

const SHEET_CONFIG = {
  others: { xOffset: 0.1, yOffset: 1.3 }
}

export const getAvatarStyle = (avatarId) => {
  if (!avatarId || !avatarId.includes(':')) return {}
  
  const [sheet, indexStr] = avatarId.split(':')
  const index = parseInt(indexStr)
  
  const col = index % 4
  const row = Math.floor(index / 4)
  
  const config = SHEET_CONFIG[sheet] || { xOffset: 0, yOffset: 0 }
  
  // For N items across, position values are: 0, 100/(N-1), 200/(N-1), 300/(N-1) = 100
  const x = (col * (100 / 3)) + config.xOffset
  const y = (row * (100 / 3)) + config.yOffset
  
  return {
    backgroundImage: `url(/avatars/${sheet}.png)`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: `${BG_SIZE}% ${BG_SIZE}%`
  }
}

export function Avatar({ id, size = 'md', className = '', placeholder = '👤' }) {
  if (!id) {
    return (
      <div className={`avatar-item avatar-size-${size} ${className}`}>
        <div className="avatar-placeholder">{placeholder}</div>
      </div>
    )
  }

  return (
    <div className={`avatar-item avatar-size-${size} ${className}`}>
      <div className="avatar-img" style={getAvatarStyle(id)} />
    </div>
  )
}

export default function AvatarSelector({ selectedId, onSelect, categories = null }) {
  const filteredCategories = categories 
    ? AVATAR_CATEGORIES.filter(cat => categories.includes(cat.id))
    : AVATAR_CATEGORIES

  const [activeCategoryId, setActiveCategoryId] = useState(filteredCategories[0]?.id || 'people')

  const activeCategory = filteredCategories.find(c => c.id === activeCategoryId)

  if (filteredCategories.length === 0) return null

  return (
    <div className="avatar-selector">
      {filteredCategories.length > 1 && (
        <div className="avatar-categories">
          {filteredCategories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`avatar-category-btn ${activeCategoryId === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategoryId(cat.id)}
            >
              <span className="avatar-cat-icon">{cat.icon}</span><span className="avatar-cat-label">{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="avatar-grid">
        {activeCategory?.sheets.map(sheet => {
          // Fix for animals sheet where Row 3 is a duplicate of Row 2.
          // We use indices 0-7 (Rows 1-2) and 12-15 (Row 4).
          let indices = Array.from({ length: 12 }, (_, i) => i)
          if (sheet === 'animals') {
            indices = [0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15]
          } else if (['celebs', 'celebs2', 'players', 'players2', 'people', 'people2', 'teams', 'others'].includes(sheet)) {
            indices = Array.from({ length: 16 }, (_, i) => i)
          }
          
          return indices.map(i => {
            const avatarId = `${sheet}:${i}`
            return (
              <div
                key={avatarId}
                className={`avatar-item avatar-size-lg ${selectedId === avatarId ? 'active' : ''}`}
                onClick={() => onSelect(avatarId)}
              >
                <div className="avatar-img" style={getAvatarStyle(avatarId)} />
              </div>
            )
          })
        })}
      </div>
    </div>
  )
}

