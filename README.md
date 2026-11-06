# RED CODES 🛡️
> **Private Application Launcher & Encrypted Stealth Vault for Windows 10/11**

Built with **Electron**, **React 18**, **TypeScript**, **Tailwind CSS**, and **SQLite**.

---

## 🌟 Key Features

### 1. 7-Step First-Launch Onboarding & Real Email OTP
- **Program & Vault Training**: Teaches the dual-mode architecture and secret access hotkey (`Ctrl + Alt + R`).
- **Real Email Verification**: Dispatches a confidential 6-digit one-time passcode (OTP) directly to your real email inbox using Gmail SMTP.
- **Master Admin Recognition**: Pre-configures master privileges and badges for `developermuhammadaazan@gmail.com` (`Muhammad Aazan`).
- **Live Theme Picker**: Interactive real-time theme preview (Icy White & Blue, RED CODES Crimson, Cyber Navy).
- **Master PIN Creation**: PBKDF2 key-derivation for military-grade AES-256-GCM file protection.

### 2. Preloaded Developer Workspace
Comes ready out-of-the-box with automatically detected tools:
- **Google Antigravity**
- **Cursor AI**
- **Visual Studio Code**
- **Google Chrome**
- **Microsoft Edge**
- **Git Bash**

### 3. Multi-Theme Engine
- **Icy White & Blue (Default & Recommended)**: Clean, innocent white background with sky-blue accents. Looks like an innocent modern Windows productivity tool.
- **RED CODES Crimson**: Signature dark obsidian background (`#0A0A0F`) with glowing neon crimson accents (`#E53E3E`).
- **Cyber Deep Navy**: Futuristic midnight slate with high-contrast cyan glow (`#06B6D4`).
- Switch themes live anytime in **Preferences** with zero page reload.

### 4. Real File Concealment & AES-256-GCM Encryption
- **"Encrypt & Hide File" System**: Import any confidential document, image, PDF, or video into the vault.
- **100% PC Concealment**: Option to safely shred and remove the original readable file from your PC upon encryption. The file exists **ONLY** inside the encrypted vault as an AES-256 binary blob (`.enc`).
- **In-Vault Decryption & Viewer**: Decrypts temporarily to memory/temp when you click *"View/Open"*.
- **One-Click Restore**: Click *"Restore to PC"* to extract and restore the original unencrypted file back to any folder on your PC.

### 5. 100% Stealth Normal Launcher (Public View)
- Normal launcher displays strictly public desktop apps.
- **Zero Vault Traces**: No "Private Vault" button in the sidebar, no locked padlock icons, no master PIN questions on boot.
- Robust execution: launch paths with spaces (`Microsoft VS Code`), quoted paths, and `.lnk` shortcuts seamlessly.

### 6. Secret Access System (`Ctrl + Alt + R`)
- Press **`Ctrl + Alt + R`** from any application or game in Windows.
- Always-on-top secret floating PIN dialpad appears.
- Correct PIN unlocks and opens the dedicated **Private Vault Window**.
- Contains Private Apps (e.g. Minecraft TLauncher), Encrypted Files, and Vault Security Settings.
- Lock button instantly clears memory keys and closes the vault window.

---

## 🚀 Running Locally

```powershell
# Install dependencies
npm install

# Run the app
npm start
```

---

## 📦 Building the Standalone Windows Desktop Installer (.exe)

To build the standalone offline installer:

```powershell
npm run dist
```

This compiles an NSIS installer executable inside the `dist/` or `release/` folder (e.g., `RED CODES Setup 1.0.0.exe`).
Running that `.exe` installs **RED CODES** on any Windows 10/11 machine with a desktop shortcut, Start Menu entry, and full uninstaller.

### 📦 Package Windows NSIS Installer (.exe)
```powershell
npm run dist
```
