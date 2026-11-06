import { useState, useEffect, useRef } from 'react'

export default function UnlockPage() {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [shake, setShake] = useState(false)
  const [isFirstSetup, setIsFirstSetup] = useState<boolean | null>(null)
  const [setupStep, setSetupStep] = useState<1 | 2>(1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check if PIN has been setup
    window.redcodes?.hasPin?.().then((has: boolean) => {
      setIsFirstSetup(!has)
    }).catch(() => {
      setIsFirstSetup(false)
    })
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [])

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 12)
    if (isFirstSetup && setupStep === 2) {
      setConfirmPin(digits)
    } else {
      setPin(digits)
    }
    setError('')
  }

  const handleFirstTimeSetup = async () => {
    if (setupStep === 1) {
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits')
        return
      }
      setSetupStep(2)
      return
    }

    if (pin !== confirmPin) {
      setError('PINs do not match')
      setConfirmPin('')
      return
    }

    setLoading(true)
    const res = await window.redcodes?.setupPin(pin)
    setLoading(false)

    if (!res?.success) {
      setError(res?.error || 'Failed to setup PIN')
    }
    // Main process will close this window and open vaultWindow automatically!
  }

  const handleUnlock = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (isFirstSetup) {
      handleFirstTimeSetup()
      return
    }

    if (!pin || loading) return

    setLoading(true)
    const result = await window.redcodes?.verifyPin?.(pin)
    setLoading(false)

    if (result?.success) {
      // Main process automatically closes this window and opens Vault window
      setPin('')
    } else {
      setPin('')
      setError(result?.error || 'Invalid PIN')
      if (result?.attemptsLeft !== undefined) {
        setAttemptsLeft(result.attemptsLeft)
      }
      setShake(true)
      setTimeout(() => setShake(false), 500)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock()
    if (e.key === 'Escape') window.redcodes?.closeUnlockWindow?.()
  }

  const activeValue = isFirstSetup && setupStep === 2 ? confirmPin : pin

  return (
    <div className="h-screen flex items-center justify-center bg-bg-primary select-none p-4">
      <div
        className={`bg-bg-card border border-border-subtle rounded-2xl p-6 w-80 shadow-2xl transition-all ${
          shake ? 'translate-x-[-10px] animate-pulse border-red-500' : ''
        }`}
        style={{
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8), 0 0 20px rgba(229,62,62,0.15)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-red-primary flex items-center justify-center mb-2 shadow-lg shadow-red-primary/30 glow-red">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h2 className="text-text-primary font-bold text-base tracking-wide">
            {isFirstSetup ? 'INITIALIZE VAULT' : 'RED CODES VAULT'}
          </h2>
          <p className="text-text-muted text-xs mt-0.5 text-center">
            {isFirstSetup
              ? setupStep === 1 ? 'Create your master PIN' : 'Confirm your master PIN'
              : 'Enter PIN to unlock vault'}
          </p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-5">
          {Array.from({ length: Math.max(4, activeValue.length || 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                i < activeValue.length
                  ? 'bg-red-primary scale-110 shadow-sm shadow-red-primary'
                  : 'bg-border-subtle'
              }`}
            />
          ))}
        </div>

        {/* Hidden input */}
        <form onSubmit={handleUnlock}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={activeValue}
            onChange={e => handlePinChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="sr-only"
            autoFocus
          />

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((num, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (num === '⌫') {
                    handlePinChange(activeValue.slice(0, -1))
                  } else if (num !== '') {
                    handlePinChange(activeValue + num.toString())
                  }
                }}
                disabled={num === ''}
                className={`h-11 rounded-xl text-base font-medium transition-all duration-150 ${
                  num === ''
                    ? 'opacity-0 cursor-default'
                    : num === '⌫'
                    ? 'bg-bg-secondary border border-border-subtle text-text-muted hover:text-red-400 hover:border-red-primary/40 active:scale-95'
                    : 'bg-bg-secondary border border-border-subtle text-text-primary hover:bg-bg-hover hover:border-red-primary/30 active:scale-95'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-3 text-center">
              <p className="text-red-400 text-xs">{error}</p>
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <p className="text-text-muted text-xs mt-0.5">{attemptsLeft} attempts remaining</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!activeValue || loading}
            className="w-full py-2.5 bg-red-primary hover:bg-red-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors shadow-md shadow-red-primary/20 text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : isFirstSetup ? (setupStep === 1 ? 'Next →' : 'Complete Setup') : 'Unlock Vault'}
          </button>
        </form>

        <button
          onClick={() => window.redcodes?.closeUnlockWindow?.()}
          className="w-full mt-2 py-1.5 text-text-muted hover:text-text-secondary text-xs transition-colors"
        >
          Cancel (ESC)
        </button>
      </div>
    </div>
  )
}
