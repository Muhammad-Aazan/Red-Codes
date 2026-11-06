import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  openUnlockWindow: () => ipcRenderer.invoke('unlock-window-open'),
  closeUnlockWindow: () => ipcRenderer.invoke('unlock-window-close'),

  // Auth
  setupPin: (pin: string) => ipcRenderer.invoke('auth-setup-pin', pin),
  verifyPin: (pin: string) => ipcRenderer.invoke('auth-verify-pin', pin),
  hasPin: () => ipcRenderer.invoke('auth-has-pin'),
  lockVault: () => ipcRenderer.invoke('auth-lock-vault'),
  isVaultUnlocked: () => ipcRenderer.invoke('auth-is-unlocked'),
  sendOtp: (email: string, userName?: string) => ipcRenderer.invoke('auth-send-otp', email, userName),
  verifyOtp: (email: string, code: string) => ipcRenderer.invoke('auth-verify-otp', email, code),

  // Apps
  getApps: (isPrivate: boolean) => ipcRenderer.invoke('apps-get-all', isPrivate),
  addApp: (app: any) => ipcRenderer.invoke('apps-add', app),
  deleteApp: (id: string) => ipcRenderer.invoke('apps-delete', id),
  launchApp: (executablePath: string) => ipcRenderer.invoke('apps-launch', executablePath),
  getAppIcon: (execPath: string) => ipcRenderer.invoke('app-get-icon', execPath),

  // File dialogs
  openExeDialog: () => ipcRenderer.invoke('dialog-open-exe'),
  openAnyFileDialog: () => ipcRenderer.invoke('dialog-open-any-file'),

  // Encrypted Vault Files (Concealed & Encrypted Storage)
  vaultGetFiles: () => ipcRenderer.invoke('vault-files-get'),
  vaultEncryptFile: (filePath: string, deleteOriginal: boolean, category: string) =>
    ipcRenderer.invoke('vault-file-encrypt', filePath, deleteOriginal, category),
  vaultOpenFile: (id: string) => ipcRenderer.invoke('vault-file-open', id),
  vaultExportFile: (id: string) => ipcRenderer.invoke('vault-file-export', id),
  vaultDeleteFile: (id: string) => ipcRenderer.invoke('vault-file-delete', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings-get'),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings-set', key, value),
  registerShortcut: (shortcut: string) => ipcRenderer.invoke('shortcut-register', shortcut),
  checkShortcut: (shortcut: string) => ipcRenderer.invoke('shortcut-check', shortcut),

  // Events
  onVaultUnlocked: (callback: () => void) => {
    ipcRenderer.on('vault-unlocked', callback)
    return () => ipcRenderer.removeListener('vault-unlocked', callback)
  },
  onVaultLocked: (callback: () => void) => {
    ipcRenderer.on('vault-locked', callback)
    return () => ipcRenderer.removeListener('vault-locked', callback)
  },
}

contextBridge.exposeInMainWorld('redcodes', api)

export type RedCodesAPI = typeof api
