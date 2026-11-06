import { useState } from 'react'
import { AppRecord } from '../types'

interface AddApplicationProps {
  onAdd: (app: Partial<AppRecord>) => Promise<any>
  onClose: () => void
  isPrivate?: boolean
}

const CATEGORIES = ['General', 'Development', 'Gaming', 'Productivity', 'Browser', 'Media', 'Security']

export default function AddApplication({ onAdd, onClose, isPrivate = false }: AddApplicationProps) {
  const [name, setName] = useState('')
  const [executable, setExecutable] = useState('')
  const [category, setCategory] = useState('General')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [icon, setIcon] = useState<string | null>(null)

  const handleBrowse = async () => {
    if (!window.redcodes?.openExeDialog) return
    const result = await window.redcodes.openExeDialog()
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      setExecutable(path)
      
      // Auto-fill name from path
      if (!name) {
        const parts = path.replace(/\\/g, '/').split('/')
        const filename = parts[parts.length - 1]
        setName(filename.replace(/\.(exe|lnk)$/i, ''))
      }

      // Get icon
      if (window.redcodes?.getAppIcon) {
        const iconData = await window.redcodes.getAppIcon(path)
        if (iconData) setIcon(iconData)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !executable.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    const cleanedPath = executable.trim().replace(/^["']|["']$/g, '').trim()
    const result = await onAdd({
      name: name.trim(),
      executable: cleanedPath,
      category,
      is_private: isPrivate ? 1 : 0,
      icon: icon || undefined,
    })

    setLoading(false)
    if (result?.success) {
      onClose()
    } else {
      setError(result?.error || 'Failed to add application')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-text-primary font-semibold text-lg">Add Application</h2>
            <p className="text-text-muted text-sm mt-0.5">
              {isPrivate ? 'Adding to Private Vault' : 'Adding to Launcher'}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Icon preview */}
          {icon && (
            <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg border border-border-subtle">
              <img src={icon} alt="App icon" className="w-10 h-10 object-contain" />
              <span className="text-text-secondary text-sm font-medium">{name || 'Application'}</span>
            </div>
          )}

          {/* Executable path */}
          <div>
            <label className="block text-text-secondary text-sm mb-2 font-medium">
              Executable Path <span className="text-red-primary">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={executable}
                onChange={e => setExecutable(e.target.value)}
                placeholder="C:\Program Files\..."
                className="flex-1 bg-bg-secondary border border-border-subtle rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-red-primary/50 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary hover:border-red-primary/50 transition-colors text-sm font-medium"
              >
                Browse
              </button>
            </div>
          </div>

          {/* App Name */}
          <div>
            <label className="block text-text-secondary text-sm mb-2 font-medium">
              App Name <span className="text-red-primary">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Visual Studio Code"
              className="w-full bg-bg-secondary border border-border-subtle rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-red-primary/50 transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-text-secondary text-sm mb-2 font-medium">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-bg-secondary border border-border-subtle rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-red-primary/50 transition-colors"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-bg-secondary">{cat}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-red-primary hover:bg-red-dark rounded-lg text-white transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
