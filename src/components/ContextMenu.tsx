import { useEffect, useRef } from 'react'

export interface ContextMenuAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  separator?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  actions: ContextMenuAction[]
  onClose: () => void
}

export default function ContextMenu({ x, y, actions, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Adjust position to avoid overflowing window
  const adjustedX = Math.max(10, Math.min(x, window.innerWidth - 210))
  const adjustedY = Math.max(10, Math.min(y, window.innerHeight - actions.length * 40 - 20))

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-bg-card border border-border-subtle rounded-xl shadow-2xl min-w-[190px] overflow-hidden py-1 animate-fade-in"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {actions.map((action, i) => (
        action.separator ? (
          <div key={i} className="border-t border-border-subtle my-1" />
        ) : (
          <button
            key={i}
            onClick={() => { action.onClick(); onClose() }}
            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-3 ${
              action.danger
                ? 'text-red-400 hover:bg-red-primary/10'
                : 'text-text-primary hover:bg-bg-hover'
            }`}
          >
            {action.icon && <span className="flex-shrink-0 opacity-70">{action.icon}</span>}
            {action.label}
          </button>
        )
      ))}
    </div>
  )
}
