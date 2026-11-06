import { useState, useEffect } from 'react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (window.redcodes?.getSettings) {
      window.redcodes.getSettings().then((s: any) => {
        if (s?.user_role === 'admin' || s?.user_email === 'developermuhammadaazan@gmail.com') {
          setIsAdmin(true)
        }
      })
    }
  }, [])

  const handleMinimize = () => window.redcodes?.minimizeWindow()
  const handleMaximize = () => {
    window.redcodes?.maximizeWindow()
    setIsMaximized(!isMaximized)
  }
  const handleClose = () => window.redcodes?.closeWindow()

  return (
    <div className="drag-region flex items-center justify-between h-10 bg-bg-secondary border-b border-border-subtle px-4 flex-shrink-0 select-none">
      {/* Logo & Brand */}
      <div className="no-drag flex items-center gap-2">
        <div className="w-5 h-5 rounded-sm bg-red-primary flex items-center justify-center">
          <span className="text-white font-bold text-xs">R</span>
        </div>
        <span className="text-text-primary font-bold text-xs tracking-wider">RED CODES</span>
        {isAdmin && (
          <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black tracking-wide">
            👑 OWNER
          </span>
        )}
      </div>

      {/* Center - App info */}
      <div className="text-text-muted text-[11px] font-mono">Desktop Application Launcher</div>

      {/* Window Controls */}
      <div className="no-drag flex items-center gap-1">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        {/* Maximize */}
        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Maximize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        {/* Close */}
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-red-primary text-text-secondary hover:text-white transition-colors"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1L9 9M9 1L1 9" />
          </svg>
        </button>
      </div>
    </div>
  )
}
