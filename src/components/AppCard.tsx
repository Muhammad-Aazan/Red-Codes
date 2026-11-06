import { useState } from 'react'
import { AppRecord } from '../types'

interface AppCardProps {
  app: AppRecord
  onLaunch: (executable: string) => Promise<any>
  onDelete: (id: string) => void
}

export default function AppCard({ app, onLaunch, onDelete }: AppCardProps) {
  const [isLaunching, setIsLaunching] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const handleLaunch = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (isLaunching) return
    setIsLaunching(true)
    setLaunchError(null)

    try {
      const res = await onLaunch(app.executable)
      if (res && res.success === false) {
        setLaunchError(res.error || 'Launch failed')
        setTimeout(() => setLaunchError(null), 3000)
      }
    } catch (err: any) {
      setLaunchError(err?.message || 'Error launching')
      setTimeout(() => setLaunchError(null), 3000)
    } finally {
      setTimeout(() => setIsLaunching(false), 1200)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onDelete(app.id)
  }

  const categoryColors: Record<string, string> = {
    Development: 'text-blue-400',
    Gaming: 'text-purple-400',
    Productivity: 'text-green-400',
    Browser: 'text-yellow-400',
    Media: 'text-pink-400',
    Security: 'text-red-400',
    General: 'text-text-muted',
  }

  return (
    <div
      className="relative group bg-bg-card border border-border-subtle rounded-xl p-3.5 flex flex-col items-center gap-2.5 cursor-pointer hover:border-red-primary/50 hover:bg-bg-hover transition-all duration-200 hover:shadow-lg hover:shadow-red-primary/5 select-none"
      onClick={handleLaunch}
      onDoubleClick={handleLaunch}
      onContextMenu={(e) => { e.preventDefault(); setShowMenu(!showMenu) }}
    >
      {/* Icon with hover launch play button */}
      <div className="relative w-14 h-14 rounded-xl bg-bg-secondary border border-border-subtle flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
        {app.icon ? (
          <img src={app.icon} alt={app.name} className="w-10 h-10 object-contain" />
        ) : (
          <DefaultAppIcon name={app.name} />
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
          <div className="w-7 h-7 rounded-full bg-red-primary flex items-center justify-center text-white shadow-md">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Name & Category */}
      <div className="text-center w-full">
        <p className="text-text-primary text-xs font-medium leading-tight truncate px-1" title={app.name}>
          {app.name}
        </p>
        <p className={`text-[10px] mt-0.5 ${categoryColors[app.category] || 'text-text-muted'}`}>
          {app.category}
        </p>
      </div>

      {/* Quick Launch tag on hover */}
      <span className="text-[10px] text-red-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Click to Launch
      </span>

      {/* Launching Spinner */}
      {isLaunching && (
        <div className="absolute inset-0 rounded-xl bg-bg-primary/85 border border-red-primary/60 flex flex-col items-center justify-center gap-1.5 z-20">
          <div className="w-5 h-5 border-2 border-red-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-red-primary font-medium">Launching...</span>
        </div>
      )}

      {/* Error notification */}
      {launchError && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-30 bg-red-950 border border-red-800 text-red-300 text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
          {launchError}
        </div>
      )}

      {/* Context menu */}
      {showMenu && (
        <div
          className="absolute top-2 right-2 z-50 bg-bg-card border border-border-subtle rounded-lg shadow-xl min-w-[120px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleLaunch}
            className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Launch App
          </button>
          <div className="border-t border-border-subtle" />
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-primary/10 transition-colors flex items-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Remove
          </button>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={(e) => { e.stopPropagation(); setShowMenu(false) }}
        />
      )}
    </div>
  )
}

function DefaultAppIcon({ name }: { name: string }) {
  const colors = [
    'from-red-600 to-red-800',
    'from-blue-600 to-blue-800',
    'from-purple-600 to-purple-800',
    'from-emerald-600 to-emerald-800',
    'from-amber-600 to-amber-800',
    'from-rose-600 to-rose-800',
  ]
  const colorIndex = (name.charCodeAt(0) || 0) % colors.length
  const letter = (name.charAt(0) || 'A').toUpperCase()

  return (
    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center shadow-md`}>
      <span className="text-white font-bold text-lg select-none">{letter}</span>
    </div>
  )
}
