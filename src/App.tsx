import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import PrivateVault from './pages/PrivateVault'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import UnlockPage from './pages/UnlockPage'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import { ThemeType } from './types'

function MainLayout() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'settings'>('dashboard')

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden select-none">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          currentPage={currentPage} 
          onNavigate={(page) => setCurrentPage(page as 'dashboard' | 'settings')}
        />
        <main className="flex-1 overflow-hidden">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    const handleHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handleHash)

    // Load initial theme and onboarding status
    if (window.redcodes?.getSettings) {
      window.redcodes.getSettings().then((s: any) => {
        const theme = s?.theme || 'light-blue'
        document.documentElement.setAttribute('data-theme', theme)

        if (s?.onboarding_completed === 'true') {
          setNeedsOnboarding(false)
        } else {
          setNeedsOnboarding(true)
        }
      }).catch(() => {
        document.documentElement.setAttribute('data-theme', 'light-blue')
        setNeedsOnboarding(false)
      })
    } else {
      document.documentElement.setAttribute('data-theme', 'light-blue')
      setNeedsOnboarding(false)
    }

    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // 1. Secret Dedicated Unlock Window (Triggered ONLY via Ctrl+Alt+R)
  if (hash === '#/unlock') {
    return <UnlockPage />
  }

  // 2. Secret Dedicated Private Vault Window
  if (hash === '#/vault') {
    return <PrivateVault />
  }

  // Loading state while checking onboarding
  if (needsOnboarding === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="w-8 h-8 border-2 border-red-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 3. Complete First-Launch Onboarding
  if (needsOnboarding) {
    return (
      <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
        <TitleBar />
        <Onboarding onComplete={() => setNeedsOnboarding(false)} />
      </div>
    )
  }

  // 4. Normal Desktop Launcher
  return <MainLayout />
}
