import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

export class EncryptionService {
  private vaultStorageDir: string

  constructor(userDataPath: string) {
    this.vaultStorageDir = join(userDataPath, 'encrypted_vault')
    if (!existsSync(this.vaultStorageDir)) {
      mkdirSync(this.vaultStorageDir, { recursive: true })
    }
  }

  private deriveKey(pin: string, salt: string): Buffer {
    return pbkdf2Sync(pin, salt + '_REDCODES_VAULT_KEY', 100000, 32, 'sha256')
  }

  encryptFile(
    sourcePath: string,
    id: string,
    pin: string,
    salt: string,
    deleteOriginal: boolean = false
  ): { success: boolean; encryptedPath?: string; error?: string } {
    try {
      if (!existsSync(sourcePath)) {
        return { success: false, error: 'Source file does not exist' }
      }

      const fileBuffer = readFileSync(sourcePath)
      const key = this.deriveKey(pin, salt)
      const iv = randomBytes(IV_LENGTH)

      const cipher = createCipheriv(ALGORITHM, key, iv)
      const encryptedData = Buffer.concat([cipher.update(fileBuffer), cipher.final()])
      const authTag = cipher.getAuthTag()

      // File structure: [12 bytes IV] + [16 bytes AuthTag] + [Encrypted Content]
      const packedBuffer = Buffer.concat([iv, authTag, encryptedData])

      const targetPath = join(this.vaultStorageDir, `${id}.enc`)
      writeFileSync(targetPath, packedBuffer)

      // If user requested to hide completely from PC, delete the original file
      if (deleteOriginal) {
        try {
          unlinkSync(sourcePath)
        } catch (e: any) {
          console.warn('Could not remove original file after encryption:', e.message)
        }
      }

      return { success: true, encryptedPath: targetPath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  decryptFileToTemp(
    id: string,
    originalName: string,
    pin: string,
    salt: string,
    tempDir: string
  ): { success: boolean; decryptedPath?: string; error?: string } {
    try {
      const encPath = join(this.vaultStorageDir, `${id}.enc`)
      if (!existsSync(encPath)) {
        return { success: false, error: 'Encrypted file not found' }
      }

      const packedBuffer = readFileSync(encPath)
      const iv = packedBuffer.subarray(0, IV_LENGTH)
      const authTag = packedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
      const encryptedData = packedBuffer.subarray(IV_LENGTH + TAG_LENGTH)

      const key = this.deriveKey(pin, salt)
      const decipher = createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()])

      const outPath = join(tempDir, `rc_${Date.now()}_${originalName}`)
      writeFileSync(outPath, decrypted)

      return { success: true, decryptedPath: outPath }
    } catch (err: any) {
      return { success: false, error: 'Decryption failed: ' + err.message }
    }
  }

  exportDecryptedFile(
    id: string,
    originalName: string,
    targetDirectory: string,
    pin: string,
    salt: string
  ): { success: boolean; outPath?: string; error?: string } {
    try {
      const encPath = join(this.vaultStorageDir, `${id}.enc`)
      if (!existsSync(encPath)) {
        return { success: false, error: 'Encrypted file not found' }
      }

      const packedBuffer = readFileSync(encPath)
      const iv = packedBuffer.subarray(0, IV_LENGTH)
      const authTag = packedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
      const encryptedData = packedBuffer.subarray(IV_LENGTH + TAG_LENGTH)

      const key = this.deriveKey(pin, salt)
      const decipher = createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()])

      const outPath = join(targetDirectory, originalName)
      writeFileSync(outPath, decrypted)

      return { success: true, outPath }
    } catch (err: any) {
      return { success: false, error: 'Export failed: ' + err.message }
    }
  }

  deleteEncryptedFile(id: string): boolean {
    try {
      const encPath = join(this.vaultStorageDir, `${id}.enc`)
      if (existsSync(encPath)) {
        unlinkSync(encPath)
      }
      return true
    } catch {
      return false
    }
  }
}
