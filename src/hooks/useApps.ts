import { useState, useEffect, useCallback } from 'react'
import { AppRecord } from '../types'

declare global {
  interface Window {
    redcodes: any
  }
}

export function useApps(isPrivate: boolean) {
  const [apps, setApps] = useState<AppRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApps = useCallback(async () => {
    setLoading(true)
    try {
      if (window.redcodes?.getApps) {
        const data = await window.redcodes.getApps(isPrivate)
        setApps(data || [])
      } else {
        setApps([])
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err)
      setApps([])
    } finally {
      setLoading(false)
    }
  }, [isPrivate])

  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  const addApp = useCallback(async (app: Partial<AppRecord>) => {
    if (!window.redcodes?.addApp) return { success: false, error: 'API not available' }
    const result = await window.redcodes.addApp(app)
    if (result.success) {
      await fetchApps()
    }
    return result
  }, [fetchApps])

  const deleteApp = useCallback(async (id: string) => {
    if (window.redcodes?.deleteApp) {
      await window.redcodes.deleteApp(id)
      await fetchApps()
    }
  }, [fetchApps])

  const launchApp = useCallback(async (executable: string) => {
    if (window.redcodes?.launchApp) {
      return await window.redcodes.launchApp(executable)
    }
    return { success: false, error: 'API not available' }
  }, [])

  return { apps, loading, fetchApps, addApp, deleteApp, launchApp }
}
