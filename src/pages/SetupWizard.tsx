import { useState } from 'react'

interface SetupWizardProps {
  onComplete: () => void
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSetPin = async () => {
    setError('')
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setLoading(true)
    const result = await window.redcodes?.setupPin(pin)
    setLoading(false)

    if (result?.success) {
      setStep(3)
    } else {
      setError(result?.error || 'Setup failed')
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-bg-primary p-8 select-none">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-primary flex items-center justify-center mb-4 shadow-lg shadow-red-primary/30 glow-red">
            <span className="text-white font-bold text-3xl">R</span>
          </div>
          <h1 className="text-text-primary font-bold text-2xl tracking-wide">RED CODES</h1>
          <p className="text-text-muted text-sm mt-1">Private Application Launcher</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s < step ? 'bg-green-500 text-white' :
                s === step ? 'bg-red-primary text-white shadow-md shadow-red-primary/30' :
                'bg-bg-card border border-border-subtle text-text-muted'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-500' : 'bg-border-subtle'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 animate-slide-up">
            <h2 className="text-text-primary font-semibold text-lg mb-2">Welcome to RED CODES</h2>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Your private application launcher with secure vault access. Set up your master PIN to secure your private workspace.
            </p>
            <div className="space-y-3 mb-6">
              {[
                { icon: '🚀', text: 'Launch any desktop EXE or shortcut easily' },
                { icon: '🔒', text: 'Private vault hidden from normal dashboard' },
                { icon: '⌨️', text: 'Global shortcut (Ctrl+Alt+R) to quick unlock' },
                { icon: '🛡️', text: 'Encrypted PIN security with brute-force lockout' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-text-secondary text-sm">
                  <span className="text-lg">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-red-primary hover:bg-red-dark rounded-xl text-white font-medium transition-colors shadow-lg shadow-red-primary/25"
            >
              Get Started →
            </button>
          </div>
        )}

        {/* Step 2: PIN Setup */}
        {step === 2 && (
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 animate-slide-up">
            <h2 className="text-text-primary font-semibold text-lg mb-2">Create Master PIN</h2>
            <p className="text-text-secondary text-sm mb-6">
              This PIN will be required to open your Private Vault.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">Enter PIN (4+ digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="••••••••"
                  className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-4 py-3 text-text-primary text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-red-primary/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-2">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="••••••••"
                  className="w-full bg-bg-secondary border border-border-subtle rounded-xl px-4 py-3 text-text-primary text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-red-primary/60 transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-secondary text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSetPin}
                  disabled={loading || !pin || !confirmPin}
                  className="flex-1 py-3 bg-red-primary hover:bg-red-dark disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
                >
                  {loading ? 'Setting up...' : 'Create PIN →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 animate-slide-up text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-text-primary font-semibold text-lg mb-2">Vault Ready!</h2>
            <p className="text-text-secondary text-sm mb-2">
              Use global shortcut <kbd className="px-2 py-0.5 bg-bg-secondary border border-border-subtle rounded text-xs font-mono text-red-primary">Ctrl + Alt + R</kbd> from anywhere to open the secret PIN unlocker.
            </p>
            <p className="text-text-muted text-xs mb-6">Your PIN is salted and hashed securely with AES/SHA-256 standard.</p>
            <button
              onClick={onComplete}
              className="w-full py-3 bg-red-primary hover:bg-red-dark rounded-xl text-white font-medium transition-colors shadow-lg shadow-red-primary/30"
            >
              Open RED CODES Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
