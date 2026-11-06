import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { DatabaseService } from './databaseService'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export class AuthService {
  private db: DatabaseService

  constructor(dbOrPath: DatabaseService | string) {
    if (typeof dbOrPath === 'string') {
      this.db = new DatabaseService(dbOrPath)
    } else {
      this.db = dbOrPath
    }
  }

  private hashPin(pin: string, salt: string): string {
    return createHash('sha256')
      .update(salt + pin + 'REDCODES_SALT_2024')
      .digest('hex')
  }

  async hasPin(): Promise<boolean> {
    await this.db.ensureReady()
    const record = this.db.getSecurityRecord()
    return !!(record && record.pin_hash)
  }

  async setupPin(pin: string): Promise<{ success: boolean; error?: string }> {
    await this.db.ensureReady()
    if (!pin || pin.length < 4) {
      return { success: false, error: 'PIN must be at least 4 digits' }
    }
    if (!/^\d+$/.test(pin)) {
      return { success: false, error: 'PIN must contain only numbers' }
    }

    const salt = randomBytes(32).toString('hex')
    const hash = this.hashPin(pin, salt)

    this.db.upsertSecurity({ pin_hash: hash, salt, failed_attempts: 0, lockout_until: null })
    return { success: true }
  }

  async verifyPin(pin: string): Promise<{ success: boolean; error?: string; attemptsLeft?: number }> {
    await this.db.ensureReady()
    const record = this.db.getSecurityRecord()
    
    if (!record || !record.pin_hash) {
      return { success: false, error: 'No PIN configured' }
    }

    // Check lockout
    if (record.lockout_until) {
      const lockoutTime = new Date(record.lockout_until).getTime()
      if (Date.now() < lockoutTime) {
        const remaining = Math.ceil((lockoutTime - Date.now()) / 1000)
        return { success: false, error: `Too many attempts. Try again in ${remaining}s` }
      } else {
        // Lockout expired
        this.db.upsertSecurity({ failed_attempts: 0, lockout_until: null })
      }
    }

    const hash = this.hashPin(pin, record.salt)
    
    // Timing-safe comparison
    const hashBuf = Buffer.from(hash, 'hex')
    const storedBuf = Buffer.from(record.pin_hash, 'hex')
    
    let isCorrect = false
    if (hashBuf.length === storedBuf.length) {
      isCorrect = timingSafeEqual(hashBuf, storedBuf)
    }

    if (isCorrect) {
      this.db.upsertSecurity({ failed_attempts: 0, lockout_until: null })
      return { success: true }
    } else {
      const newAttempts = (record.failed_attempts || 0) + 1
      let lockoutUntil: string | null = null
      
      if (newAttempts >= MAX_ATTEMPTS) {
        lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
        this.db.upsertSecurity({ failed_attempts: newAttempts, lockout_until: lockoutUntil })
        return { success: false, error: 'Too many wrong attempts. Locked for 5 minutes.', attemptsLeft: 0 }
      }
      
      this.db.upsertSecurity({ failed_attempts: newAttempts })
      return { 
        success: false, 
        error: 'Incorrect PIN', 
        attemptsLeft: MAX_ATTEMPTS - newAttempts 
      }
    }
  }
}
