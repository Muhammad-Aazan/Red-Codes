import { useState, useEffect } from 'react'
import { ThemeType } from '../types'

const THEMES: Array<{ id: ThemeType; label: string; desc: string; previewBg: string; previewDot: string }> = [
  {
    id: 'light-blue',
    label: 'Icy White & Blue (Default)',
    desc: 'Clean, modern white with sky blue accents. Highly stealthy.',
    previewBg: 'bg-slate-100 border-slate-300',
    previewDot: 'bg-blue-600',
  },
  {
    id: 'red',
    label: 'RED CODES Crimson (Recommended)',
    desc: 'Signature deep black with glowing neon red accents.',
    previewBg: 'bg-neutral-900 border-neutral-700',
    previewDot: 'bg-red-600',
  },
  {
    id: 'cyber',
    label: 'Cyber Deep Navy',
    desc: 'Midnight navy blue with vibrant cyan accents.',
    previewBg: 'bg-slate-900 border-slate-700',
    previewDot: 'bg-cyan-500',
  },
]

export default function Settings() {
  const [theme, setTheme] = useState<ThemeType>('light-blue')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user')
  const [isVerified, setIsVerified] = useState(false)
  const [minimizeOnLaunch, setMinimizeOnLaunch] = useState('yes')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (window.redcodes?.getSettings) {
      window.redcodes.getSettings().then((settings: any) => {
        if (settings?.theme) {
          setTheme(settings.theme)
          document.documentElement.setAttribute('data-theme', settings.theme)
        }
        if (settings?.user_name) setUserName(settings.user_name)
        if (settings?.user_email) setUserEmail(settings.user_email)
        if (settings?.user_role) setUserRole(settings.user_role)
        if (settings?.is_verified === 'true') setIsVerified(true)
        if (settings?.minimize_on_launch) setMinimizeOnLaunch(settings.minimize_on_launch)
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleSave = async () => {
    if (window.redcodes?.setSetting) {
      await window.redcodes.setSetting('theme', theme)
      await window.redcodes.setSetting('user_name', userName.trim() || 'User')
      await window.redcodes.setSetting('minimize_on_launch', minimizeOnLaunch)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-red-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-y-auto select-none">
      <div className="px-6 py-4 border-b border-border-subtle bg-bg-secondary/40 flex-shrink-0">
        <h1 className="text-text-primary font-bold text-lg">Preferences</h1>
        <p className="text-text-muted text-xs mt-0.5">Customize your desktop application launcher</p>
      </div>

      <div className="flex-1 p-6 max-w-2xl space-y-6">
        {/* Account Details & Role */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-text-primary font-semibold text-sm flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-primary" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Account Information
            </h2>
            {userRole === 'admin' || userEmail === 'developermuhammadaazan@gmail.com' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-bold flex items-center gap-1">
                <span>👑</span> MASTER ADMIN
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 text-[11px] font-semibold">
                STANDARD USER
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 p-3.5 bg-bg-secondary rounded-xl border border-border-subtle">
            <div>
              <span className="text-[11px] text-text-muted block font-medium">REGISTERED EMAIL</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-semibold text-text-primary truncate">
                  {userEmail || 'Not registered'}
                </span>
                {isVerified && (
                  <span className="text-emerald-500 text-xs font-bold" title="Verified via OTP">✓</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-text-muted block font-medium">ACCOUNT STATUS</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-500">
                  {isVerified ? 'Verified & Secured' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm">
          <h2 className="text-text-primary font-semibold text-sm mb-1 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-primary" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Personalization
          </h2>
          <p className="text-text-muted text-xs mb-3">Your display name for greetings and titlebars</p>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-3.5 py-2.5 text-text-primary text-sm focus:outline-none focus:border-red-primary"
          />
        </div>

        {/* Appearance Themes */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm">
          <h2 className="text-text-primary font-semibold text-sm mb-1 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-primary" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20v-20z"/>
            </svg>
            Color Theme
          </h2>
          <p className="text-text-muted text-xs mb-4">Choose your preferred visual appearance</p>
          <div className="space-y-3">
            {THEMES.map(t => (
              <label
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  theme === t.id
                    ? 'border-red-primary bg-bg-secondary ring-1 ring-red-primary/20 shadow-sm'
                    : 'border-border-subtle bg-bg-secondary/40 hover:bg-bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${t.previewBg}`}>
                    <div className={`w-3 h-3 rounded-full ${t.previewDot}`} />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-text-primary block">{t.label}</span>
                    <span className="text-[11px] text-text-muted block mt-0.5">{t.desc}</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="theme"
                  value={t.id}
                  checked={theme === t.id}
                  onChange={() => handleThemeChange(t.id)}
                  className="accent-red-primary"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Launch Behavior */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm">
          <h2 className="text-text-primary font-semibold text-sm mb-1 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-primary" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Launch Behavior
          </h2>
          <p className="text-text-muted text-xs mb-3">Window reaction when opening an application</p>
          <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-xl border border-border-subtle">
            <div>
              <p className="text-text-primary text-xs font-semibold">Keep Launcher Open</p>
              <p className="text-text-muted text-[11px]">Keep launcher active in background when an application launches</p>
            </div>
            <select
              value={minimizeOnLaunch}
              onChange={e => setMinimizeOnLaunch(e.target.value)}
              className="bg-bg-card border border-border-subtle rounded-lg px-3 py-1.5 text-text-primary text-xs focus:outline-none focus:border-red-primary"
            >
              <option value="yes">Keep Open</option>
              <option value="minimize">Auto-Minimize</option>
            </select>
          </div>
        </div>

        {/* About Launcher */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm">
          <h2 className="text-text-primary font-semibold text-sm mb-1">About RED CODES</h2>
          <div className="text-text-muted text-xs space-y-1 mt-2">
            <p className="text-text-primary font-medium">RED CODES Desktop v1.0.0</p>
            <p>Windows 10/11 Standalone Application Launcher</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3 bg-red-primary hover:bg-red-dark rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-red-primary/20"
        >
          {saved ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Preferences Saved!
            </>
          ) : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}
