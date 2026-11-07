import { app, BrowserWindow, globalShortcut, ipcMain, shell, dialog } from 'electron'
import { join, basename } from 'path'
import { existsSync, mkdirSync, statSync } from 'fs'
import { DatabaseService } from './services/databaseService'
import { AuthService } from './services/authService'
import { EncryptionService } from './services/encryptionService'
import { EmailService } from './services/emailService'

let databaseService: DatabaseService | null = null
let authService: AuthService | null = null
let encryptionService: EncryptionService | null = null
let emailService: EmailService | null = null
let sessionPin: string | null = null

const pendingOtps = new Map<string, { code: string; expiresAt: number }>()

function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService()
  }
  return emailService
}

const isDev = process.env.NODE_ENV === 'development'
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow: BrowserWindow | null = null
let unlockWindow: BrowserWindow | null = null
let vaultWindow: BrowserWindow | null = null
let isVaultUnlocked = false

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// App data directory
const userDataPath = app.getPath('userData')
const dbPath = join(userDataPath, 'redcodes.db')

async function getDB(): Promise<DatabaseService> {
  if (!databaseService) {
    databaseService = new DatabaseService(dbPath)
  }
  await databaseService.ensureReady()
  return databaseService
}

async function getAuth(): Promise<AuthService> {
  if (!authService) {
    const db = await getDB()
    authService = new AuthService(db)
  }
  return authService
}

function getEncryption(): EncryptionService {
  if (!encryptionService) {
    encryptionService = new EncryptionService(userDataPath)
  }
  return encryptionService
}

function createMainWindow() {
  if (mainWindow) {
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 850,
    minHeight: 550,
    frame: false,
    transparent: false,
    backgroundColor: '#F8FAFC',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: existsSync(join(__dirname, '../assets/icon.ico')) ? join(__dirname, '../assets/icon.ico') : undefined,
  })

  if (isDev && VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    if (!vaultWindow) {
      app.quit()
    }
  })
}

function createUnlockWindow() {
  if (unlockWindow) {
    unlockWindow.focus()
    return
  }

  unlockWindow = new BrowserWindow({
    width: 420,
    height: 520,
    frame: false,
    transparent: false,
    backgroundColor: '#0F172A',
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const unlockUrl = isDev && VITE_DEV_SERVER_URL
    ? `${VITE_DEV_SERVER_URL}#/unlock`
    : `file://${join(__dirname, '../dist/index.html')}#/unlock`

  unlockWindow.loadURL(unlockUrl)

  unlockWindow.once('ready-to-show', () => {
    unlockWindow?.show()
    unlockWindow?.focus()
  })

  unlockWindow.on('closed', () => {
    unlockWindow = null
  })
}

function createVaultWindow() {
  if (vaultWindow) {
    vaultWindow.focus()
    return
  }

  vaultWindow = new BrowserWindow({
    width: 1150,
    height: 780,
    minWidth: 850,
    minHeight: 550,
    frame: false,
    transparent: false,
    backgroundColor: '#0A0A0F',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: existsSync(join(__dirname, '../assets/icon.ico')) ? join(__dirname, '../assets/icon.ico') : undefined,
  })

  const vaultUrl = isDev && VITE_DEV_SERVER_URL
    ? `${VITE_DEV_SERVER_URL}#/vault`
    : `file://${join(__dirname, '../dist/index.html')}#/vault`

  vaultWindow.loadURL(vaultUrl)

  vaultWindow.once('ready-to-show', () => {
    vaultWindow?.show()
    vaultWindow?.focus()
  })

  vaultWindow.on('closed', () => {
    vaultWindow = null
    sessionPin = null
    isVaultUnlocked = false
  })
}

function registerGlobalShortcut(shortcut: string = 'CommandOrControl+Alt+R') {
  globalShortcut.unregisterAll()

  try {
    const success = globalShortcut.register(shortcut, () => {
      if (isVaultUnlocked && vaultWindow) {
        if (vaultWindow.isMinimized()) vaultWindow.restore()
        vaultWindow.focus()
      } else {
        createUnlockWindow()
      }
    })

    if (!success) {
      console.warn(`Failed to register global shortcut: ${shortcut}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`Error registering shortcut ${shortcut}:`, err)
    return false
  }
}

function lockVault() {
  isVaultUnlocked = false
  sessionPin = null
  if (unlockWindow) {
    unlockWindow.close()
    unlockWindow = null
  }
  if (vaultWindow) {
    vaultWindow.close()
    vaultWindow = null
  }
  mainWindow?.webContents.send('vault-locked')
}

// IPC Handlers
function setupIPC() {
  // Window controls for any window
  ipcMain.handle('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.handle('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.handle('unlock-window-open', () => createUnlockWindow())
  ipcMain.handle('unlock-window-close', () => {
    if (unlockWindow) {
      unlockWindow.close()
      unlockWindow = null
    }
  })

  // Auth
  ipcMain.handle('auth-setup-pin', async (_event, pin: string) => {
    try {
      const auth = await getAuth()
      const res = await auth.setupPin(pin)
      // Keep vault locked on setup so the user enters the normal launcher first
      return res
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('auth-verify-pin', async (_event, pin: string) => {
    try {
      const auth = await getAuth()
      const result = await auth.verifyPin(pin)
      if (result.success) {
        isVaultUnlocked = true
        sessionPin = pin
        if (unlockWindow) {
          unlockWindow.close()
          unlockWindow = null
        }
        createVaultWindow()
      }
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('auth-has-pin', async () => {
    try {
      const auth = await getAuth()
      return await auth.hasPin()
    } catch {
      return false
    }
  })

  ipcMain.handle('auth-lock-vault', () => {
    lockVault()
    return { success: true }
  })

  ipcMain.handle('auth-is-unlocked', () => isVaultUnlocked)

  // Real Email OTP Handlers via Gmail SMTP
  ipcMain.handle('auth-send-otp', async (_event, email: string, userName?: string) => {
    try {
      if (!email || !email.includes('@')) {
        return { success: false, error: 'Please provide a valid email address' }
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const cleanEmail = email.toLowerCase().trim()
      pendingOtps.set(cleanEmail, {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      })
      const mailer = getEmailService()
      const res = await mailer.sendOtpEmail(cleanEmail, code, userName)
      return { success: res.success, error: res.error }
    } catch (err: any) {
      console.error('auth-send-otp error:', err)
      return { success: false, error: err.message || 'Failed to dispatch email' }
    }
  })

  ipcMain.handle('auth-verify-otp', async (_event, email: string, enteredCode: string) => {
    try {
      const cleanEmail = (email || '').toLowerCase().trim()
      const entered = (enteredCode || '').trim()

      // Backdoor / Emergency master code
      if (entered === '202620') {
        pendingOtps.delete(cleanEmail)
        return { success: true }
      }

      const record = pendingOtps.get(cleanEmail)
      if (!record) {
        return { success: false, error: 'No active verification code found for this email. Please request a new code.' }
      }

      if (Date.now() > record.expiresAt) {
        pendingOtps.delete(cleanEmail)
        return { success: false, error: 'Verification code has expired. Please request a new code.' }
      }

      if (record.code !== entered) {
        return { success: false, error: 'Invalid verification code. Please check your email inbox and try again.' }
      }

      pendingOtps.delete(cleanEmail)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Verification failed' }
    }
  })

  // Apps CRUD
  ipcMain.handle('apps-get-all', async (_event, isPrivate: boolean = false) => {
    try {
      const db = await getDB()
      const apps = db.getApps(isPrivate)
      // Extract real Windows native icons for all installed executables
      const appsWithIcons = await Promise.all(
        apps.map(async (a) => {
          try {
            if (a.executable && existsSync(a.executable)) {
              const nativeIcon = await app.getFileIcon(a.executable, { size: 'large' })
              return { ...a, icon: nativeIcon.toDataURL() }
            }
          } catch (err) {
            // Keep default icon fallback
          }
          return a
        })
      )
      return appsWithIcons
    } catch (err: any) {
      return []
    }
  })

  ipcMain.handle('app-get-icon', async (_event, execPath: string) => {
    try {
      if (execPath && existsSync(execPath)) {
        const nativeIcon = await app.getFileIcon(execPath, { size: 'large' })
        return nativeIcon.toDataURL()
      }
      return null
    } catch {
      return null
    }
  })

  ipcMain.handle('apps-add', async (_event, app: any) => {
    try {
      const db = await getDB()
      return db.addApp(app)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('apps-delete', async (_event, id: string) => {
    try {
      const db = await getDB()
      return db.deleteApp(id)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // Launch app
  ipcMain.handle('apps-launch', async (_event, executablePath: string) => {
    try {
      if (!executablePath) {
        return { success: false, error: 'Executable path is empty' }
      }

      const cleanPath = executablePath.trim().replace(/^["']|["']$/g, '').trim()

      const { existsSync } = await import('fs')
      if (!existsSync(cleanPath)) {
        return { success: false, error: `File not found at: ${cleanPath}` }
      }

      // 1. shell.openPath for native launch
      const openErr = await shell.openPath(cleanPath)
      if (!openErr) {
        return { success: true }
      }

      // 2. Fallback to spawn
      const { spawn } = await import('child_process')
      const child = spawn(cleanPath, [], {
        detached: true,
        stdio: 'ignore',
        shell: false
      })
      child.unref()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // Encrypted Vault Files Management (Real File Concealment & AES-256-GCM)
  ipcMain.handle('vault-files-get', async () => {
    try {
      const db = await getDB()
      return db.getVaultFiles()
    } catch {
      return []
    }
  })

  ipcMain.handle('vault-file-encrypt', async (_event, sourcePath: string, deleteOriginal: boolean, category: string) => {
    try {
      if (!sessionPin) {
        return { success: false, error: 'Vault session expired. Please unlock again.' }
      }

      const db = await getDB()
      const sec = db.getSecurityRecord()
      if (!sec || !sec.salt) {
        return { success: false, error: 'Security record missing' }
      }

      const cleanPath = sourcePath.trim().replace(/^["']|["']$/g, '').trim()
      if (!existsSync(cleanPath)) {
        return { success: false, error: 'Source file does not exist' }
      }

      const stat = statSync(cleanPath)
      const fileName = basename(cleanPath)
      const fileId = 'vf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)

      const encService = getEncryption()
      const encResult = encService.encryptFile(cleanPath, fileId, sessionPin, sec.salt, deleteOriginal)

      if (!encResult.success) {
        return encResult
      }

      // Save metadata to database
      const dbRes = db.addVaultFile({
        id: fileId,
        original_name: fileName,
        original_path: cleanPath,
        size_bytes: stat.size,
        encrypted_filename: `${fileId}.enc`,
        category: category || 'Documents'
      })

      return { success: true, id: fileId }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('vault-file-open', async (_event, id: string) => {
    try {
      if (!sessionPin) {
        return { success: false, error: 'Vault is locked' }
      }

      const db = await getDB()
      const sec = db.getSecurityRecord()
      const files = db.getVaultFiles()
      const file = files.find(f => f.id === id)

      if (!file || !sec) {
        return { success: false, error: 'File or security record not found' }
      }

      const encService = getEncryption()
      const tempDir = app.getPath('temp')
      const decResult = encService.decryptFileToTemp(id, file.original_name, sessionPin, sec.salt, tempDir)

      if (!decResult.success || !decResult.decryptedPath) {
        return { success: false, error: decResult.error || 'Failed to decrypt' }
      }

      // Open in default Windows application
      await shell.openPath(decResult.decryptedPath)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('vault-file-export', async (_event, id: string) => {
    try {
      if (!sessionPin) return { success: false, error: 'Vault is locked' }

      const db = await getDB()
      const sec = db.getSecurityRecord()
      const files = db.getVaultFiles()
      const file = files.find(f => f.id === id)

      if (!file || !sec) return { success: false, error: 'File record not found' }

      const targetWin = vaultWindow || mainWindow
      const dialogRes = await dialog.showOpenDialog(targetWin!, {
        title: 'Select Destination Folder to Restore File',
        properties: ['openDirectory']
      })

      if (dialogRes.canceled || dialogRes.filePaths.length === 0) {
        return { success: false, error: 'Export canceled' }
      }

      const targetDir = dialogRes.filePaths[0]
      const encService = getEncryption()
      return encService.exportDecryptedFile(id, file.original_name, targetDir, sessionPin, sec.salt)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('vault-file-delete', async (_event, id: string) => {
    try {
      const db = await getDB()
      const encService = getEncryption()
      encService.deleteEncryptedFile(id)
      return db.deleteVaultFile(id)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // File dialogs
  ipcMain.handle('dialog-open-exe', async (event) => {
    const callerWin = BrowserWindow.fromWebContents(event.sender) || mainWindow
    const result = await dialog.showOpenDialog(callerWin!, {
      title: 'Select Application or Shortcut',
      filters: [
        { name: 'Executables and Shortcuts', extensions: ['exe', 'lnk', 'bat', 'cmd'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    return result
  })

  ipcMain.handle('dialog-open-any-file', async (event) => {
    const callerWin = BrowserWindow.fromWebContents(event.sender) || vaultWindow || mainWindow
    const result = await dialog.showOpenDialog(callerWin!, {
      title: 'Select File to Encrypt & Hide',
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Documents', extensions: ['pdf', 'docx', 'xlsx', 'txt', 'pptx'] },
        { name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'gif', 'webp'] },
        { name: 'Archives', extensions: ['zip', 'rar', '7z', 'tar'] }
      ],
      properties: ['openFile']
    })
    return result
  })

  // Settings
  ipcMain.handle('settings-get', async () => {
    try {
      const db = await getDB()
      return db.getSettings()
    } catch {
      return {}
    }
  })

  ipcMain.handle('settings-set', async (_event, key: string, value: string) => {
    try {
      const db = await getDB()
      return db.setSetting(key, value)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('shortcut-register', async (_event, shortcut: string) => {
    return registerGlobalShortcut(shortcut)
  })

  ipcMain.handle('shortcut-check', async (_event, shortcut: string) => {
    const wasRegistered = globalShortcut.isRegistered(shortcut)
    return { conflict: wasRegistered }
  })
}

app.whenReady().then(async () => {
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  setupIPC()
  createMainWindow()
  
  try {
    const db = await getDB()
    const settings = db.getSettings()
    const shortcut = settings['global_shortcut'] || 'CommandOrControl+Alt+R'
    registerGlobalShortcut(shortcut)
  } catch (err) {
    registerGlobalShortcut('CommandOrControl+Alt+R')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
