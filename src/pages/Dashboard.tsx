import { useState, useEffect, useCallback } from 'react'
import { useApps } from '../hooks/useApps'
import AppCard from '../components/AppCard'
import AddApplication from '../components/AddApplication'
import ContextMenu from '../components/ContextMenu'

export default function Dashboard() {
  const { apps, loading, fetchApps, addApp, deleteApp, launchApp } = useApps(false)
  const [showAdd, setShowAdd] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [userName, setUserName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    if (window.redcodes?.getSettings) {
      window.redcodes.getSettings().then((s: any) => {
        if (s?.user_name) setUserName(s.user_name)
        if (s?.user_role === 'admin' || s?.user_email === 'developermuhammadaazan@gmail.com') {
          setIsAdmin(true)
        }
      })
    }
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const categories = ['All', ...Array.from(new Set(apps.map(a => a.category).filter(Boolean)))]

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const contextActions = [
    {
      label: 'Add Application',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
      onClick: () => setShowAdd(true),
    },
    {
      label: 'Refresh',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
      onClick: fetchApps,
    },
  ]

  return (
    <div
      className="flex flex-col h-full bg-bg-primary overflow-hidden select-none"
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/40 flex-shrink-0">
        <div>
          <h1 className="text-text-primary font-bold text-lg flex items-center gap-2">
            {userName ? `${getGreeting()}, ${userName}` : 'Desktop Applications'}
            {isAdmin && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black tracking-wide">
                👑 MASTER ADMIN
              </span>
            )}
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            {apps.length} applications ready • Click to launch
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search apps..."
              className="w-48 bg-bg-card border border-border-subtle rounded-xl px-3 py-1.5 pl-8 text-text-primary text-xs focus:outline-none focus:border-red-primary transition-colors shadow-sm"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-primary hover:bg-red-dark rounded-xl text-white text-xs font-semibold transition-all shadow-md shadow-red-primary/20"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add App
          </button>
        </div>
      </div>

      {/* Category Filter Pills (if categories exist) */}
      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-border-subtle/50 bg-bg-secondary/20 overflow-x-auto flex-shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-red-primary text-white shadow-sm shadow-red-primary/20'
                  : 'bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Apps Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl shimmer" />
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <div className="w-16 h-16 rounded-2xl bg-bg-card border border-border-subtle flex items-center justify-center shadow-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-text-muted" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-text-secondary font-medium text-sm">
                {searchQuery ? 'No matching apps found' : 'No applications added yet'}
              </p>
              <p className="text-text-muted text-xs mt-1">
                {searchQuery ? 'Try clearing your search query' : 'Click "Add App" or right-click to add an application'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={() => setShowAdd(true)}
                className="px-5 py-2 bg-red-primary hover:bg-red-dark rounded-xl text-white text-xs font-medium transition-all shadow-md shadow-red-primary/20"
              >
                Add Your First Application
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4">
            {filteredApps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                onLaunch={launchApp}
                onDelete={deleteApp}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddApplication
          onAdd={addApp}
          onClose={() => setShowAdd(false)}
          isPrivate={false}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={contextActions}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
