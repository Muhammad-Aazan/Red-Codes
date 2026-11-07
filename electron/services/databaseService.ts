import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { randomUUID } from 'crypto'

export interface AppRecord {
  id: string
  name: string
  executable: string
  icon?: string
  category: string
  is_private: number
  sort_order: number
  created_at: string
}

export interface VaultFileRecord {
  id: string
  original_name: string
  original_path: string
  mime_type: string
  size_bytes: number
  encrypted_filename: string
  category: string
  created_at: string
}

let SQLInstance: SqlJsStatic | null = null

export class DatabaseService {
  private db: Database | null = null
  private dbPath: string
  private isReady: boolean = false
  private initPromise: Promise<void> | null = null
  private lastMtime: number = 0

  constructor(dbPath: string) {
    this.dbPath = dbPath
    this.initPromise = this.init()
  }

  private reloadIfDiskChanged() {
    if (!this.db || !SQLInstance) return
    try {
      if (existsSync(this.dbPath)) {
        const currentMtime = statSync(this.dbPath).mtimeMs
        if (currentMtime > this.lastMtime + 50) {
          const buffer = readFileSync(this.dbPath)
          this.db = new SQLInstance.Database(buffer)
          this.lastMtime = currentMtime
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async ensureReady() {
    if (this.initPromise) {
      await this.initPromise
    }
  }

  private async init() {
    try {
      if (!SQLInstance) {
        SQLInstance = await initSqlJs()
      }

      if (existsSync(this.dbPath)) {
        try {
          const buffer = readFileSync(this.dbPath)
          this.db = new SQLInstance.Database(buffer)
        } catch (err) {
          console.warn('Could not load existing db, creating new one:', err)
          this.db = new SQLInstance.Database()
        }
      } else {
        this.db = new SQLInstance.Database()
      }

      this.initTables()
      if (existsSync(this.dbPath)) {
        this.lastMtime = statSync(this.dbPath).mtimeMs
      }
      this.isReady = true
    } catch (err) {
      console.error('Failed to init DatabaseService:', err)
    }
  }

  private save() {
    if (!this.db) return
    try {
      const data = this.db.export()
      writeFileSync(this.dbPath, Buffer.from(data))
      if (existsSync(this.dbPath)) {
        this.lastMtime = statSync(this.dbPath).mtimeMs
      }
    } catch (err) {
      console.error('Failed to save SQLite database to disk:', err)
    }
  }

  private initTables() {
    if (!this.db) return
    this.db.run(`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        executable TEXT NOT NULL,
        icon TEXT,
        category TEXT DEFAULT 'General',
        is_private INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS vault_files (
        id TEXT PRIMARY KEY,
        original_name TEXT NOT NULL,
        original_path TEXT,
        mime_type TEXT,
        size_bytes INTEGER,
        encrypted_filename TEXT NOT NULL,
        category TEXT DEFAULT 'Documents',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS security (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        pin_hash TEXT,
        salt TEXT,
        failed_attempts INTEGER DEFAULT 0,
        lockout_until TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO settings (key, value) VALUES ('global_shortcut', 'CommandOrControl+Alt+R');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'light-blue');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('inactivity_timeout', '300');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('lock_on_windows_lock', '1');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_completed', 'false');
    `)

    // Auto-discover common dev apps & browsers if installed (without duplicates)
    try {
      const localAppData = process.env.LOCALAPPDATA || 'C:\\Users\\progr\\AppData\\Local'
      const commonApps = [
        { name: 'Antigravity', cat: 'Development', path: join(localAppData, 'Programs', 'antigravity', 'Antigravity.exe') },
        { name: 'Cursor AI', cat: 'Development', path: join(localAppData, 'Programs', 'cursor', 'Cursor.exe') },
        { name: 'Visual Studio Code', cat: 'Development', path: join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe') },
        { name: 'Google Chrome', cat: 'Browsers', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
        { name: 'Microsoft Edge', cat: 'Browsers', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
        { name: 'Git Bash', cat: 'Terminal', path: 'C:\\Program Files\\Git\\git-bash.exe' },
      ]
      for (const ca of commonApps) {
        if (existsSync(ca.path)) {
          const checkStmt = this.db.prepare('SELECT id FROM applications WHERE executable = ? OR name = ?')
          checkStmt.bind([ca.path, ca.name])
          const exists = checkStmt.step()
          checkStmt.free()
          if (!exists) {
            this.db.run(
              `INSERT INTO applications (id, name, executable, category, is_private, sort_order)
               VALUES (?, ?, ?, ?, 0, 0)`,
              [`app_${ca.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, ca.name, ca.path, ca.cat]
            )
          }
        }
      }
    } catch (e) {
      // ignore
    }

    this.save()
  }

  getApps(isPrivate: boolean): AppRecord[] {
    this.reloadIfDiskChanged()
    if (!this.db) return []
    try {
      const stmt = this.db.prepare('SELECT * FROM applications WHERE is_private = :priv ORDER BY sort_order ASC, name ASC')
      stmt.bind({ ':priv': isPrivate ? 1 : 0 })
      const results: AppRecord[] = []
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as AppRecord)
      }
      stmt.free()
      return results
    } catch (err) {
      console.error('getApps error:', err)
      return []
    }
  }

  addApp(app: Partial<AppRecord>): { success: boolean; id?: string; error?: string } {
    if (!this.db) return { success: false, error: 'Database not ready' }
    try {
      const id = randomUUID()
      this.db.run(
        `INSERT INTO applications (id, name, executable, icon, category, is_private, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          app.name || 'Unknown',
          app.executable || '',
          app.icon || null,
          app.category || 'General',
          app.is_private ? 1 : 0,
          app.sort_order || 0
        ]
      )
      this.save()
      return { success: true, id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  deleteApp(id: string): { success: boolean } {
    if (!this.db) return { success: false }
    try {
      this.db.run('DELETE FROM applications WHERE id = ?', [id])
      this.save()
      return { success: true }
    } catch (err) {
      return { success: false }
    }
  }

  // Vault Files (Encrypted & Hidden Storage)
  getVaultFiles(): VaultFileRecord[] {
    this.reloadIfDiskChanged()
    if (!this.db) return []
    try {
      // Auto-heal / sync with encrypted_vault folder if there are files on disk
      const vaultDir = join(dirname(this.dbPath), 'encrypted_vault')
      if (existsSync(vaultDir)) {
        const diskFiles = readdirSync(vaultDir).filter(f => f.endsWith('.enc'))
        for (const encFile of diskFiles) {
          const id = encFile.replace(/\.enc$/, '')
          const checkStmt = this.db.prepare('SELECT id FROM vault_files WHERE id = ?')
          checkStmt.bind([id])
          const exists = checkStmt.step()
          checkStmt.free()
          if (!exists) {
            const stat = statSync(join(vaultDir, encFile))
            let name = 'Encrypted_File'
            if (id.includes('rap_video')) name = 'Untitled design.mp4'
            this.db.run(
              `INSERT INTO vault_files (id, original_name, original_path, mime_type, size_bytes, encrypted_filename, category)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [id, name, '', 'video/mp4', stat.size, encFile, 'Rap / Video']
            )
            this.save()
          }
        }
      }

      const stmt = this.db.prepare('SELECT * FROM vault_files ORDER BY created_at DESC')
      const results: VaultFileRecord[] = []
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as VaultFileRecord)
      }
      stmt.free()
      return results
    } catch (err) {
      console.error('getVaultFiles error:', err)
      return []
    }
  }

  addVaultFile(file: Partial<VaultFileRecord>): { success: boolean; id?: string; error?: string } {
    if (!this.db) return { success: false, error: 'Database not ready' }
    try {
      const id = file.id || randomUUID()
      this.db.run(
        `INSERT INTO vault_files (id, original_name, original_path, mime_type, size_bytes, encrypted_filename, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          file.original_name || 'unnamed',
          file.original_path || '',
          file.mime_type || 'application/octet-stream',
          file.size_bytes || 0,
          file.encrypted_filename || `${id}.enc`,
          file.category || 'Documents'
        ]
      )
      this.save()
      return { success: true, id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  deleteVaultFile(id: string): { success: boolean } {
    if (!this.db) return { success: false }
    try {
      this.db.run('DELETE FROM vault_files WHERE id = ?', [id])
      this.save()
      return { success: true }
    } catch (err) {
      return { success: false }
    }
  }

  getSettings(): Record<string, string> {
    this.reloadIfDiskChanged()
    if (!this.db) return {}
    try {
      const stmt = this.db.prepare('SELECT key, value FROM settings')
      const result: Record<string, string> = {}
      while (stmt.step()) {
        const row = stmt.getAsObject() as { key: string; value: string }
        result[row.key] = row.value
      }
      stmt.free()
      return result
    } catch (err) {
      console.error('getSettings error:', err)
      return {}
    }
  }

  setSetting(key: string, value: string): { success: boolean } {
    if (!this.db) return { success: false }
    try {
      this.db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        [key, value]
      )
      this.save()
      return { success: true }
    } catch (err) {
      return { success: false }
    }
  }

  getSecurityRecord(): any {
    this.reloadIfDiskChanged()
    if (!this.db) return null
    try {
      const stmt = this.db.prepare('SELECT * FROM security WHERE id = 1')
      let record: any = null
      if (stmt.step()) {
        record = stmt.getAsObject()
      }
      stmt.free()
      return record
    } catch (err) {
      console.error('getSecurityRecord error:', err)
      return null
    }
  }

  upsertSecurity(data: Partial<{ pin_hash: string; salt: string; failed_attempts: number; lockout_until: string | null }>): void {
    if (!this.db) return
    try {
      const existing = this.getSecurityRecord()
      if (existing) {
        const sets: string[] = []
        const vals: any[] = []
        for (const [k, v] of Object.entries(data)) {
          sets.push(`${k} = ?`)
          vals.push(v)
        }
        sets.push("updated_at = datetime('now')")
        this.db.run(`UPDATE security SET ${sets.join(', ')} WHERE id = 1`, vals)
      } else {
        this.db.run(
          `INSERT INTO security (id, pin_hash, salt, failed_attempts, lockout_until)
           VALUES (1, ?, ?, ?, ?)`,
          [data.pin_hash || null, data.salt || null, data.failed_attempts || 0, data.lockout_until || null]
        )
      }
      this.save()
    } catch (err) {
      console.error('upsertSecurity error:', err)
    }
  }
}
