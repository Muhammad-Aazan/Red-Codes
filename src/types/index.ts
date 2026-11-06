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

export interface UserAccount {
  name: string
  email: string
  role: 'admin' | 'user'
  is_verified: boolean
}

export interface Settings {
  global_shortcut: string
  theme: string
  inactivity_timeout: string
  lock_on_windows_lock: string
  user_name?: string
  user_email?: string
  user_role?: 'admin' | 'user'
  onboarding_completed?: string
}

export type ThemeType = 'light-blue' | 'red' | 'cyber'

export type Page = 'dashboard' | 'settings' | 'onboarding'

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
}
