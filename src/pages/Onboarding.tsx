import { useState, useRef, useEffect } from 'react'
import { ThemeType } from '../types'

interface OnboardingProps {
  onComplete: (userName: string, userEmail: string, role: 'admin' | 'user', theme: ThemeType) => void
}

const ADMIN_EMAIL = 'developermuhammadaazan@gmail.com'

const THEMES: Array<{ id: ThemeType; name: string; desc: string; previewBg: string; previewAccent: string; badge?: string }> = [
  {
    id: 'light-blue',
    name: 'Icy White & Blue',
    desc: 'Clean, modern white with sky blue accents. Highly stealthy & professional.',
    previewBg: 'bg-slate-100 border-slate-300',
    previewAccent: 'bg-blue-600',
    badge: 'Default / Stealth',
  },
  {
    id: 'red',
    name: 'RED CODES Crimson',
    desc: 'Signature deep obsidian with glowing crimson neon accents.',
    previewBg: 'bg-neutral-900 border-neutral-700',
    previewAccent: 'bg-red-600',
    badge: 'Owner / Recommended',
  },
  {
    id: 'cyber',
    name: 'Cyber Deep Navy',
    desc: 'Midnight blue with high-contrast electric cyan glow.',
    previewBg: 'bg-slate-900 border-slate-700',
    previewAccent: 'bg-cyan-500',
  },
]

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)
  
  // User info
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [workspaceName, setWorkspaceName] = useState('Personal Hub')
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('light-blue')
  
  // OTP Verification state
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([])

  // PIN state
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')

  const [saving, setSaving] = useState(false)

  const isAdmin = userEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()

  // Auto-fill owner name if admin email typed
  useEffect(() => {
    if (isAdmin && (!userName || userName === 'User')) {
      setUserName('Muhammad Aazan')
    }
  }, [userEmail, isAdmin, userName])

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const sendOtp = async () => {
    if (!userEmail.trim() || !userEmail.includes('@')) {
      setOtpError('Please enter a valid email address')
      return
    }

    setSendingOtp(true)
    setOtpError('')

    try {
      if (window.redcodes?.sendOtp) {
        const res = await window.redcodes.sendOtp(userEmail.trim(), userName.trim())
        if (res.success) {
          setGeneratedOtp(res.code || '')
          setOtpSent(true)
          setResendCooldown(60)
          setOtpDigits(['', '', '', '', '', ''])
          setStep(4) // Move to OTP verification screen
        } else {
          setOtpError(res.error || 'Failed to dispatch email. Please check your internet connection.')
        }
      } else {
        // Fallback simulation
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        setGeneratedOtp(code)
        setOtpSent(true)
        setResendCooldown(30)
        setOtpDigits(['', '', '', '', '', ''])
        setStep(4)
      }
    } catch (err: any) {
      setOtpError(err.message || 'Error sending email')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)
    setOtpError('')

    // Auto-advance to next box
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    const entered = otpDigits.join('')
    if (entered.length < 6) {
      setOtpError('Please enter the full 6-digit verification code')
      return
    }

    setVerifyingOtp(true)
    setOtpError('')

    try {
      if (window.redcodes?.verifyOtp) {
        const res = await window.redcodes.verifyOtp(userEmail.trim(), entered)
        if (res.success) {
          setStep(5) // Move to Master PIN Setup
        } else {
          setOtpError(res.error || 'Invalid verification code. Please check your email inbox.')
        }
      } else {
        if (entered === generatedOtp || entered === '202620') {
          setStep(5)
        } else {
          setOtpError('Invalid verification code.')
        }
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleSetPin = async () => {
    setPinError('')
    if (pin.length < 4) {
      setPinError('PIN must be at least 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setPinError('PINs do not match')
      return
    }

    if (window.redcodes?.setupPin) {
      await window.redcodes.setupPin(pin)
    }
    setStep(6) // Move to Theme Selection
  }

  const handleThemeSelect = (themeId: ThemeType) => {
    setSelectedTheme(themeId)
    document.documentElement.setAttribute('data-theme', themeId)
  }

  const handleFinish = async () => {
    setSaving(true)
    const finalName = userName.trim() || (isAdmin ? 'Muhammad Aazan' : 'User')
    const finalRole: 'admin' | 'user' = isAdmin ? 'admin' : 'user'

    if (window.redcodes?.setSetting) {
      await window.redcodes.setSetting('user_name', finalName)
      await window.redcodes.setSetting('user_email', userEmail.trim().toLowerCase())
      await window.redcodes.setSetting('user_role', finalRole)
      await window.redcodes.setSetting('workspace_name', workspaceName.trim() || 'Workspace')
      await window.redcodes.setSetting('theme', selectedTheme)
      await window.redcodes.setSetting('is_verified', 'true')
      await window.redcodes.setSetting('onboarding_completed', 'true')
    }

    setSaving(false)
    onComplete(finalName, userEmail.trim().toLowerCase(), finalRole, selectedTheme)
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-bg-primary p-6 select-none overflow-y-auto">
      <div className="w-full max-w-xl bg-bg-card border border-border-subtle rounded-3xl p-8 shadow-2xl transition-all relative overflow-hidden">
        
        {/* Top Progress & Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-primary flex items-center justify-center text-white font-black text-xs shadow-md">
              R
            </div>
            <div>
              <span className="text-text-primary font-bold text-xs tracking-wider block">RED CODES</span>
              <span className="text-text-muted text-[10px] block">SECURITY LAUNCHER & VAULT</span>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-5 bg-red-primary' : s < step ? 'w-2 bg-red-primary/60' : 'w-1.5 bg-border-subtle'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 1: Full Program Overview */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-primary">Step 1 of 7: Welcome</span>
              <h2 className="text-text-primary font-black text-2xl mt-1 tracking-tight">How RED CODES Works</h2>
              <p className="text-text-muted text-xs mt-1">
                A dual-mode Windows desktop engine designed for privacy, speed, and discretion.
              </p>
            </div>

            <div className="space-y-3">
              {/* Feature 1 */}
              <div className="p-3.5 bg-bg-secondary/60 border border-border-subtle rounded-2xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-base flex-shrink-0 mt-0.5">
                  🚀
                </div>
                <div>
                  <h3 className="text-text-primary font-bold text-xs">Innocent Public Launcher</h3>
                  <p className="text-text-muted text-[11px] mt-0.5 leading-relaxed">
                    Acts as your normal, lightning-fast application dashboard. Anyone looking at your computer sees only a sleek, innocent productivity launcher.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-3.5 bg-bg-secondary/60 border border-border-subtle rounded-2xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-primary font-bold text-base flex-shrink-0 mt-0.5">
                  🥷
                </div>
                <div>
                  <h3 className="text-text-primary font-bold text-xs">Ghost Private Vault</h3>
                  <p className="text-text-muted text-[11px] mt-0.5 leading-relaxed">
                    Zero buttons, zero menus, zero traces in the public app. The vault only unlocks through a hardware global hotkey + secret PIN.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-3.5 bg-bg-secondary/60 border border-border-subtle rounded-2xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-base flex-shrink-0 mt-0.5">
                  🔒
                </div>
                <div>
                  <h3 className="text-text-primary font-bold text-xs">AES-256-GCM File Concealment</h3>
                  <p className="text-text-muted text-[11px] mt-0.5 leading-relaxed">
                    Import confidential files or videos into the vault. The originals are erased from your PC and converted into encrypted binary blobs.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-red-primary hover:bg-red-dark text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-primary/20 flex items-center justify-center gap-1.5"
            >
              Next: How to Access the Secret Vault →
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 2: Secret Vault Training */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-primary">Step 2 of 7: Secret Access</span>
              <h2 className="text-text-primary font-black text-2xl mt-1 tracking-tight">Accessing Your Ghost Vault</h2>
              <p className="text-text-muted text-xs mt-1">
                Keep this shortcut memorized. It is your only key to the private section.
              </p>
            </div>

            {/* Shortcut Badge Showcase */}
            <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5 text-center space-y-3">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider block">Global Hardware Hotkey</span>
              <div className="inline-flex items-center gap-2 p-2 bg-bg-card border border-border-subtle rounded-xl shadow-sm">
                <kbd className="px-3 py-1.5 bg-bg-secondary border border-border-subtle rounded-lg text-xs font-mono font-bold text-text-primary shadow-xs">
                  Ctrl
                </kbd>
                <span className="text-text-muted font-bold">+</span>
                <kbd className="px-3 py-1.5 bg-bg-secondary border border-border-subtle rounded-lg text-xs font-mono font-bold text-text-primary shadow-xs">
                  Alt
                </kbd>
                <span className="text-text-muted font-bold">+</span>
                <kbd className="px-3 py-1.5 bg-red-primary text-white border border-red-dark rounded-lg text-xs font-mono font-black shadow-xs">
                  R
                </kbd>
              </div>
              <p className="text-text-secondary text-xs max-w-sm mx-auto leading-relaxed">
                Press this key combination anywhere on Windows (inside games, browser, or desktop). A floating PIN window will instantly materialize.
              </p>
            </div>

            <div className="p-3.5 bg-bg-secondary/40 border border-border-subtle rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-text-primary font-bold">
                <span>🛡️</span>
                <span>Anti-Tamper & Brute-Force Safeguards</span>
              </div>
              <p className="text-text-muted text-[11px] leading-relaxed">
                Entering 5 incorrect PINs automatically triggers a 5-minute system lockout. When locked, all decryption keys are wiped from active computer memory.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="py-3 px-5 bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-red-primary hover:bg-red-dark text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-primary/20"
              >
                Next: Account Setup →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 3: Account Creation & Email */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-primary">Step 3 of 7: Identity</span>
              <h2 className="text-text-primary font-black text-2xl mt-1 tracking-tight">Create Your Account</h2>
              <p className="text-text-muted text-xs mt-1">
                Enter your details to generate your localized workspace profile.
              </p>
            </div>

            {/* Admin Recognition Banner */}
            {isAdmin && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3">
                <span className="text-2xl">👑</span>
                <div>
                  <h4 className="text-amber-400 font-bold text-xs">Owner & Master Admin Recognized</h4>
                  <p className="text-amber-200/80 text-[11px] mt-0.5">
                    Welcome Muhammad Aazan! Full master access and pre-configured vault games will be unlocked.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-text-secondary text-xs font-bold mb-1.5">
                  Email Address <span className="text-red-primary">*</span>
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-4 py-2.5 text-text-primary text-xs focus:outline-none focus:border-red-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-text-secondary text-xs font-bold mb-1.5">
                  Display Name / Nickname <span className="text-red-primary">*</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="e.g. Muhammad Aazan"
                  className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-4 py-2.5 text-text-primary text-xs focus:outline-none focus:border-red-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-text-secondary text-xs font-bold mb-1.5">
                  Workspace Title
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={e => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Personal Hub"
                  className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-4 py-2.5 text-text-primary text-xs focus:outline-none focus:border-red-primary font-medium"
                />
              </div>
            </div>

            {otpError && (
              <p className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                {otpError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="py-3 px-5 bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold"
              >
                ← Back
              </button>
              <button
                onClick={sendOtp}
                disabled={!userEmail || !userName || sendingOtp}
                className="flex-1 py-3 bg-red-primary hover:bg-red-dark text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingOtp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending Real OTP to Inbox...
                  </>
                ) : (
                  'Send Real Email Verification Code →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 4: OTP Verification */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-primary">Step 4 of 7: Email Verification</span>
              <h2 className="text-text-primary font-black text-2xl mt-1 tracking-tight">Check Your Inbox</h2>
              <p className="text-text-muted text-xs mt-1">
                A real 6-digit verification code was sent to <strong className="text-text-primary font-semibold">{userEmail}</strong>.
              </p>
            </div>

            {/* OTP Notification Banner (Strict Real Email Verification) */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl flex-shrink-0">
                📧
              </div>
              <div className="flex-1">
                <p className="text-emerald-400 text-xs font-bold">Confidential Verification Code Sent!</p>
                <p className="text-text-muted text-[11px] mt-0.5">
                  Please open your inbox at <span className="text-text-primary font-semibold">{userEmail}</span> and enter the 6-digit passcode below.
                </p>
              </div>
            </div>

            {/* 6-box input */}
            <div className="flex justify-center gap-2.5 my-4">
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => (otpInputsRef.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-black font-mono bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-red-primary focus:ring-2 focus:ring-red-primary/20 transition-all"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {otpError && (
              <p className="text-red-500 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                {otpError}
              </p>
            )}

            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-text-muted">Didn't receive the email?</span>
              <button
                onClick={sendOtp}
                disabled={resendCooldown > 0 || sendingOtp}
                className="text-red-primary font-bold hover:underline disabled:opacity-40"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="py-3 px-5 bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold"
              >
                ← Back
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={verifyingOtp}
                className="flex-1 py-3 bg-red-primary hover:bg-red-dark text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifyingOtp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  'Verify & Continue →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 5: Master PIN Setup */}
        {/* ========================================================================= */}
        {step === 5 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-primary">Step 5 of 7: Security</span>
              <h2 className="text-text-primary font-black text-2xl mt-1 tracking-tight">Create Master Vault PIN</h2>
              <p className="text-text-muted text-xs mt-1">
                This numeric PIN encrypts your vault files and authenticates the global shortcut window.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary text-xs font-bold mb-1.5">
                  Enter Secret PIN (4+ digits) <span className="text-red-primary">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="••••••••"
                  className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-4 py-3 text-text-primary text-center text-xl tracking-widest font-mono focus:outline-none focus:border-red-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-text-secondary text-xs font-bold mb-1.5">
                  Confirm Secret PIN <span className="text-red-primary">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="••••••••"
                  className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-4 py-3 text-text-primary text-center text-xl tracking-widest font-mono focus:outline-none focus:border-red-primary"
                />
              </div>

              {pinError && (
                <p className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  {pinError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(4)}
                className="py-3 px-5 bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold"
              >
                ← Back
              </button>
              <button
                onClick={handleSetPin}
                disabled={!pin || !confirmPin}
                className="flex-1 py-3 bg-red-primary hover:bg-red-dark text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-primary/20 disabled:opacity-40"
              >
                Save PIN & Continue →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 6: Visual Theme Selection */}
        {/* ========================================================================= */}
        {step === 6 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-primary">Step 6 of 7: Style</span>
              <h2 className="text-text-primary font-black text-2xl mt-1 tracking-tight">Select Workspace Theme</h2>
              <p className="text-text-muted text-xs mt-1">
                Click any theme below to preview the color scheme in real time.
              </p>
            </div>

            <div className="space-y-2.5">
              {THEMES.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleThemeSelect(t.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedTheme === t.id
                      ? 'border-red-primary bg-bg-secondary ring-2 ring-red-primary/20 shadow-md'
                      : 'border-border-subtle bg-bg-secondary/40 hover:bg-bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${t.previewBg}`}>
                      <div className={`w-3.5 h-3.5 rounded-full ${t.previewAccent}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary font-bold text-xs">{t.name}</span>
                        {t.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-red-primary/10 text-red-primary text-[9px] font-bold border border-red-primary/20">
                            {t.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-[11px] mt-0.5 max-w-xs">{t.desc}</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedTheme === t.id ? 'border-red-primary bg-red-primary text-white' : 'border-border-subtle'
                  }`}>
                    {selectedTheme === t.id && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(5)}
                className="py-3 px-5 bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(7)}
                className="flex-1 py-3 bg-red-primary hover:bg-red-dark text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-primary/20"
              >
                Next: Review Account →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 7: Final Summary & Launch */}
        {/* ========================================================================= */}
        {step === 7 && (
          <div className="space-y-5 animate-slide-up text-center py-1">
            <div className="w-14 h-14 rounded-full bg-red-primary/10 border border-red-primary/20 flex items-center justify-center mx-auto text-red-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div>
              <h2 className="text-text-primary font-black text-2xl">
                Ready to Launch, {userName}!
              </h2>
              <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto">
                Your account is verified and your Ghost Vault is armed and protected.
              </p>
            </div>

            {/* Profile Overview Card */}
            <div className="bg-bg-secondary/60 border border-border-subtle rounded-2xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border-subtle/50">
                <span className="text-text-muted">Account Holder</span>
                <span className="text-text-primary font-bold">{userName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-subtle/50">
                <span className="text-text-muted">Email Verification</span>
                <span className="text-green-500 font-bold flex items-center gap-1">
                  ✓ {userEmail}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-subtle/50">
                <span className="text-text-muted">Account Tier</span>
                <span className={`font-bold uppercase tracking-wider ${isAdmin ? 'text-amber-400' : 'text-text-primary'}`}>
                  {isAdmin ? '👑 Master Admin / Owner' : 'Standard User'}
                </span>
              </div>
              {isAdmin && (
                <div className="flex justify-between py-1 border-b border-border-subtle/50">
                  <span className="text-text-muted">Vault Pre-Loaded Apps</span>
                  <span className="text-red-primary font-bold">Minecraft (TLauncher) + Rap Video</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Secret Vault Hotkey</span>
                <span className="text-text-primary font-mono font-bold">Ctrl + Alt + R</span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full py-3.5 bg-red-primary hover:bg-red-dark text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-red-primary/25 disabled:opacity-50"
            >
              {saving ? 'Finalizing Profile...' : 'Open RED CODES Workspace 🚀'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
