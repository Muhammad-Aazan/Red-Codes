import { useState, useEffect } from 'react'
import { useApps } from '../hooks/useApps'
import AppCard from '../components/AppCard'
import AddApplication from '../components/AddApplication'
import ContextMenu from '../components/ContextMenu'
import { VaultFileRecord } from '../types'

const SHORTCUT_OPTIONS = [
  'CommandOrControl+Alt+R',
  'CommandOrControl+Alt+V',
  'CommandOrControl+Shift+R',
  'CommandOrControl+Shift+V',
  'Alt+Shift+R',
  'Alt+F12',
]

export default function PrivateVault() {
  const [activeTab, setActiveTab] = useState<'apps' | 'files' | 'security'>('apps')
  const { apps, loading: appsLoading, fetchApps, addApp, deleteApp, launchApp } = useApps(true)
  
  // Encrypted Files State
  const [files, setFiles] = useState<VaultFileRecord[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [showAddApp, setShowAddApp] = useState(false)
  const [showAddFileModal, setShowAddFileModal] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Add File Modal Form State
  const [selectedFilePath, setSelectedFilePath] = useState('')
  const [deleteOriginal, setDeleteOriginal] = useState(true)
  const [fileCategory, setFileCategory] = useState('Documents')
  const [encrypting, setEncrypting] = useState(false)
  const [encryptError, setEncryptError] = useState('')

  // Vault Security Settings State
  const [shortcut, setShortcut] = useState('CommandOrControl+Alt+R')
  const [inactivityTimeout, setInactivityTimeout] = useState('300')
  const [savedSettings, setSavedSettings] = useState(false)
  const [shortcutConflict, setShortcutConflict] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // PIN Change State
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)

  const loadVaultFiles = async () => {
    setFilesLoading(true)
    try {
      if (window.redcodes?.vaultGetFiles) {
        const res = await window.redcodes.vaultGetFiles()
        setFiles(res || [])
      }
    } catch (err) {
      console.error('Failed to load vault files:', err)
    } finally {
      setFilesLoading(false)
    }
  }

  useEffect(() => {
    loadVaultFiles()
    if (window.redcodes?.getSettings) {
      window.redcodes.getSettings().then((settings: any) => {
        if (settings?.global_shortcut) setShortcut(settings.global_shortcut)
        if (settings?.inactivity_timeout) setInactivityTimeout(settings.inactivity_timeout)
        if (settings?.user_role === 'admin' || settings?.user_email === 'developermuhammadaazan@gmail.com') {
          setIsAdmin(true)
        }
      })
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'files') {
      loadVaultFiles()
    } else if (activeTab === 'apps') {
      fetchApps()
    }
  }, [activeTab])

  const handleLockVault = async () => {
    if (window.redcodes?.lockVault) {
      await window.redcodes.lockVault()
    }
  }

  const handleBrowseAnyFile = async () => {
    if (window.redcodes?.openAnyFileDialog) {
      const res = await window.redcodes.openAnyFileDialog()
      if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
        setSelectedFilePath(res.filePaths[0])
      }
    }
  }

  const handleEncryptFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFilePath) {
      setEncryptError('Please select a file to encrypt')
      return
    }

    setEncrypting(true)
    setEncryptError('')

    const result = await window.redcodes?.vaultEncryptFile(selectedFilePath, deleteOriginal, fileCategory)
    setEncrypting(false)

    if (result?.success) {
      setSelectedFilePath('')
      setShowAddFileModal(false)
      loadVaultFiles()
    } else {
      setEncryptError(result?.error || 'Encryption failed')
    }
  }

  const handleOpenFile = async (id: string) => {
    const res = await window.redcodes?.vaultOpenFile(id)
    if (!res?.success) {
      alert(res?.error || 'Could not decrypt file')
    }
  }

  const handleExportFile = async (id: string) => {
    const res = await window.redcodes?.vaultExportFile(id)
    if (res?.success) {
      alert(`File restored successfully to:\n${res.outPath}`)
    } else if (res?.error && res.error !== 'Export canceled') {
      alert(res.error)
    }
  }

  const handleDeleteFile = async (id: string) => {
    if (confirm('Are you sure you want to delete this encrypted file permanently?')) {
      await window.redcodes?.vaultDeleteFile(id)
      loadVaultFiles()
    }
  }

  const handleShortcutChange = async (newShortcut: string) => {
    setShortcut(newShortcut)
    if (window.redcodes?.checkShortcut) {
      const res = await window.redcodes.checkShortcut(newShortcut)
      setShortcutConflict(Boolean(res?.conflict))
    }
  }

  const handleSaveSecurity = async () => {
    if (window.redcodes) {
      await window.redcodes.setSetting('global_shortcut', shortcut)
      await window.redcodes.setSetting('inactivity_timeout', inactivityTimeout)
      await window.redcodes.registerShortcut(shortcut)
    }
    setSavedSettings(true)
    setTimeout(() => setSavedSettings(false), 2000)
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError('')
    if (newPin.length < 4) {
      setPinError('New PIN must be at least 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('New PINs do not match')
      return
    }

    const verify = await window.redcodes?.verifyPin(currentPin)
    if (!verify?.success) {
      setPinError('Current PIN is incorrect')
      return
    }

    const setup = await window.redcodes?.setupPin(newPin)
    if (setup?.success) {
      setPinSuccess(true)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setTimeout(() => setPinSuccess(false), 3000)
    } else {
      setPinError(setup?.error || 'Failed to update PIN')
    }
  }

  const filteredApps = apps.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredFiles = files.filter(f => f.original_name.toLowerCase().includes(searchQuery.toLowerCase()))

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden select-none">
      {/* Vault Custom TitleBar */}
      <div className="drag-region flex items-center justify-between h-11 bg-bg-secondary border-b border-border-subtle px-4 flex-shrink-0">
        <div className="no-drag flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-red-primary flex items-center justify-center glow-red">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <span className="text-text-primary font-bold text-sm tracking-wider flex items-center gap-2">
            RED CODES <span className="text-red-primary font-mono text-xs">// PRIVATE VAULT</span>
          </span>
          <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/40 rounded text-green-500 text-[10px] font-bold tracking-wider">
            AES-256 ENCRYPTED
          </span>
          {isAdmin && (
            <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded text-amber-500 text-[10px] font-bold tracking-wider flex items-center gap-1">
              <span>👑</span> OWNER: MUHAMMAD AAZAN
            </span>
          )}
        </div>

        {/* Center Tabs */}
        <div className="no-drag flex items-center gap-1 bg-bg-card border border-border-subtle rounded-xl p-0.5 shadow-sm">
          <button
            onClick={() => setActiveTab('apps')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'apps' ? 'bg-red-primary text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Private Apps ({apps.length})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'files' ? 'bg-red-primary text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Hidden Files ({files.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'security' ? 'bg-red-primary text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Security Settings
          </button>
        </div>

        {/* Lock Vault & Window Controls */}
        <div className="no-drag flex items-center gap-2">
          <button
            onClick={handleLockVault}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-primary/10 hover:bg-red-primary border border-red-primary/40 hover:text-white rounded-lg text-red-primary text-xs font-semibold transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Lock Vault
          </button>

          <div className="w-[1px] h-4 bg-border-subtle mx-1" />

          {/* Minimize */}
          <button
            onClick={() => window.redcodes?.minimizeWindow()}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"/></svg>
          </button>
          {/* Maximize */}
          <button
            onClick={() => window.redcodes?.maximizeWindow()}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
          </button>
          {/* Close / Lock */}
          <button
            onClick={handleLockVault}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-primary text-text-secondary hover:text-white"
            title="Lock & Close Vault"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1L9 9M9 1L1 9"/></svg>
          </button>
        </div>
      </div>

      {/* Tab 1: Private Apps */}
      {activeTab === 'apps' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-subtle bg-bg-secondary/40 flex-shrink-0">
            <div>
              <h2 className="text-text-primary font-bold text-sm">Secret Applications & Games</h2>
              <p className="text-text-muted text-xs">Completely isolated from the public dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search private apps..."
                className="w-48 bg-bg-card border border-border-subtle rounded-xl px-3 py-1.5 text-text-primary text-xs focus:outline-none focus:border-red-primary"
              />
              <button
                onClick={() => setShowAddApp(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-primary hover:bg-red-dark rounded-xl text-white text-xs font-semibold transition-all shadow-md shadow-red-primary/20"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add Private App
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {appsLoading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl shimmer" />
                ))}
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                <div className="w-16 h-16 rounded-2xl bg-red-primary/10 border border-red-primary/20 flex items-center justify-center glow-red text-red-primary">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-text-secondary font-medium text-sm">Private Vault is Empty</p>
                  <p className="text-text-muted text-xs mt-1">Add confidential applications, private games or tools</p>
                </div>
                <button
                  onClick={() => setShowAddApp(true)}
                  className="px-5 py-2 bg-red-primary hover:bg-red-dark rounded-xl text-white text-xs font-semibold transition-all shadow-md shadow-red-primary/20"
                >
                  Add Private Application
                </button>
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
        </div>
      )}

      {/* Tab 2: Encrypted & Hidden Files (Complete File Concealment) */}
      {activeTab === 'files' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-subtle bg-bg-secondary/40 flex-shrink-0">
            <div>
              <h2 className="text-text-primary font-bold text-sm">Encrypted & Hidden Files (AES-256-GCM)</h2>
              <p className="text-text-muted text-xs">Files stored here are encrypted into binary blobs and completely hidden from Windows Explorer</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search hidden files..."
                className="w-48 bg-bg-card border border-border-subtle rounded-xl px-3 py-1.5 text-text-primary text-xs focus:outline-none focus:border-red-primary"
              />
              <button
                onClick={() => setShowAddFileModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-primary hover:bg-red-dark rounded-xl text-white text-xs font-semibold transition-all shadow-md shadow-red-primary/20"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Encrypt & Hide File
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {filesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl shimmer" />
                ))}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                <div className="w-16 h-16 rounded-2xl bg-bg-card border border-border-subtle flex items-center justify-center text-text-muted">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-text-secondary font-medium text-sm">No Hidden Files Yet</p>
                  <p className="text-text-muted text-xs mt-1 max-w-sm">
                    Encrypt documents, photos, or confidential files. When encrypted, the original file is removed from your PC and cannot be opened without your secret PIN.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddFileModal(true)}
                  className="px-5 py-2 bg-red-primary hover:bg-red-dark rounded-xl text-white text-xs font-semibold transition-all shadow-md shadow-red-primary/20"
                >
                  Encrypt First File
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3.5 bg-bg-card border border-border-subtle rounded-xl hover:border-red-primary/50 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center text-red-primary font-bold">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-text-primary text-xs font-semibold leading-tight">{file.original_name}</p>
                        <p className="text-text-muted text-[11px] mt-0.5">
                          {formatBytes(file.size_bytes)} • {file.category} • Encrypted with AES-256-GCM
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenFile(file.id)}
                        className="px-3 py-1.5 bg-bg-secondary hover:bg-bg-hover text-text-primary border border-border-subtle rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View/Open
                      </button>
                      <button
                        onClick={() => handleExportFile(file.id)}
                        className="px-3 py-1.5 bg-bg-secondary hover:bg-bg-hover text-text-primary border border-border-subtle rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                        title="Restore file back onto PC"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Restore to PC
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1.5 bg-red-primary/10 hover:bg-red-primary text-red-400 hover:text-white rounded-lg transition-colors"
                        title="Delete encrypted file"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Security Settings */}
      {activeTab === 'security' && (
        <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full space-y-6">
          <div className="border-b border-border-subtle pb-4">
            <h2 className="text-text-primary font-bold text-lg">Vault Security & Access Settings</h2>
            <p className="text-text-muted text-xs mt-1">These settings are hidden and only accessible from within the unlocked vault.</p>
          </div>

          {/* Global Secret Shortcut */}
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm">
            <h3 className="text-text-primary font-semibold text-sm mb-1 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-primary" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h4"/></svg>
              Global Secret Hotkey
            </h3>
            <p className="text-text-muted text-xs mb-4">Background key combination that triggers the PIN unlock window across Windows</p>
            <div className="grid grid-cols-2 gap-2">
              {SHORTCUT_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-2.5 p-2 rounded-xl bg-bg-secondary border border-border-subtle cursor-pointer hover:border-red-primary/40 transition-colors">
                  <input
                    type="radio"
                    name="vault_shortcut"
                    value={opt}
                    checked={shortcut === opt}
                    onChange={() => handleShortcutChange(opt)}
                    className="accent-red-primary"
                  />
                  <code className="text-xs font-mono text-text-primary">
                    {opt.replace('CommandOrControl', 'Ctrl')}
                  </code>
                </label>
              ))}
            </div>
            {shortcutConflict && (
              <p className="mt-3 text-yellow-500 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5">
                ⚠️ This shortcut combination might conflict with another application.
              </p>
            )}
          </div>

          {/* Auto-Lock Timer */}
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm">
            <h3 className="text-text-primary font-semibold text-sm mb-1 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-primary" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Inactivity Auto-Lock
            </h3>
            <p className="text-text-muted text-xs mb-3">Automatically close and lock vault when idle</p>
            <select
              value={inactivityTimeout}
              onChange={e => setInactivityTimeout(e.target.value)}
              className="bg-bg-secondary border border-border-subtle rounded-xl px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-red-primary"
            >
              <option value="60">Lock after 1 minute</option>
              <option value="300">Lock after 5 minutes</option>
              <option value="600">Lock after 10 minutes</option>
              <option value="1800">Lock after 30 minutes</option>
              <option value="0">Never auto-lock</option>
            </select>
          </div>

          {/* Change PIN */}
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm">
            <h3 className="text-text-primary font-semibold text-sm mb-1 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-primary" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Change Secret Master PIN
            </h3>
            <p className="text-text-muted text-xs mb-4">Update your master security PIN</p>

            {pinSuccess && (
              <p className="mb-3 text-green-500 text-xs bg-green-500/10 border border-green-500/30 rounded-lg p-2.5">
                ✓ Master PIN successfully changed!
              </p>
            )}

            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="block text-text-muted text-xs mb-1">Current PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-3 py-2 text-text-primary text-sm font-mono tracking-widest focus:outline-none focus:border-red-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted text-xs mb-1">New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-3 py-2 text-text-primary text-sm font-mono tracking-widest focus:outline-none focus:border-red-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-muted text-xs mb-1">Confirm New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-3 py-2 text-text-primary text-sm font-mono tracking-widest focus:outline-none focus:border-red-primary"
                  />
                </div>
              </div>

              {pinError && (
                <p className="text-red-500 text-xs bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                  {pinError}
                </p>
              )}

              <button
                type="submit"
                disabled={!currentPin || !newPin || !confirmPin}
                className="px-4 py-2 bg-red-primary hover:bg-red-dark disabled:opacity-40 rounded-xl text-white text-xs font-semibold transition-all shadow-md shadow-red-primary/20"
              >
                Update PIN
              </button>
            </form>
          </div>

          {/* Save Security Settings */}
          <button
            onClick={handleSaveSecurity}
            className="w-full py-3 bg-red-primary hover:bg-red-dark rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-red-primary/20"
          >
            {savedSettings ? '✓ Security Settings Saved!' : 'Save Hotkey & Timeout Settings'}
          </button>
        </div>
      )}

      {/* Modal: Add Application */}
      {showAddApp && (
        <AddApplication
          onAdd={addApp}
          onClose={() => setShowAddApp(false)}
          isPrivate={true}
        />
      )}

      {/* Modal: Encrypt & Hide File */}
      {showAddFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-text-primary font-bold text-base">Encrypt & Hide File</h3>
                <p className="text-text-muted text-xs">AES-256-GCM zero-knowledge encryption</p>
              </div>
              <button
                onClick={() => setShowAddFileModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEncryptFileSubmit} className="space-y-4">
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  Select File from PC <span className="text-red-primary">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedFilePath}
                    onChange={e => setSelectedFilePath(e.target.value)}
                    placeholder="C:\Users\...\file.pdf"
                    className="flex-1 bg-bg-secondary border border-border-subtle rounded-xl px-3 py-2 text-text-primary text-xs font-mono focus:outline-none focus:border-red-primary"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseAnyFile}
                    className="px-3 py-2 bg-bg-secondary border border-border-subtle hover:bg-bg-hover text-text-primary text-xs font-medium rounded-xl transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">Category</label>
                <select
                  value={fileCategory}
                  onChange={e => setFileCategory(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-red-primary"
                >
                  <option value="Documents">Documents & PDFs</option>
                  <option value="Photos">Confidential Photos & Images</option>
                  <option value="Archives">Archives & ZIPs</option>
                  <option value="Financial">Financial / Personal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Complete Concealment Checkbox */}
              <label className="flex items-start gap-3 p-3 bg-red-primary/5 border border-red-primary/20 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteOriginal}
                  onChange={e => setDeleteOriginal(e.target.checked)}
                  className="mt-0.5 accent-red-primary"
                />
                <div>
                  <span className="text-text-primary text-xs font-bold block">
                    Delete Original File (100% Concealment)
                  </span>
                  <span className="text-text-muted text-[11px] block mt-0.5 leading-relaxed">
                    Safely removes the readable file from your PC. It will exist <b>ONLY</b> inside this encrypted vault and can be restored back anytime.
                  </span>
                </div>
              </label>

              {encryptError && (
                <p className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  {encryptError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFileModal(false)}
                  className="flex-1 py-2.5 bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={encrypting || !selectedFilePath}
                  className="flex-1 py-2.5 bg-red-primary hover:bg-red-dark disabled:opacity-40 rounded-xl text-white text-xs font-semibold transition-all shadow-md shadow-red-primary/20 flex items-center justify-center gap-1.5"
                >
                  {encrypting ? 'Encrypting & Hiding...' : 'Lock into Vault 🔒'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
