# ⚡ BlinkMsg — Ultra-Private Disappearing Encrypted Chat

> **No Number. No Account. No Chat History.**  
> Anonymous • E2E Encrypted • Ephemeral • Play Store Ready

---

## 🌟 Key Features

### 1. 📡 Blink Radar (World & Nearby Anonymous Discovery)
- **Live Presence Toggle:** Switch between "Visible (Live)" and "Invisible (Ghost)".
- **Location Filters:** Global 🌍, India 🇮🇳, and City/State 📍 filters.
- **Ghost Profile:** Unique `@handle`, Cyberpunk Avatar, and Vibe status with **zero personal data** (no phone, no email).
- **1-Tap Blink:** Instant connection request with peer.

### 2. 🔐 Secret Vault (Private Encrypted Rooms)
- **Zero-Trace Handshake:** Connect via 6-digit room code or QR code.
- **Client-Side AES-256-GCM:** Encryption keys stay in the URL fragment/hash `#key=...` and never touch server databases.

### 3. ⏱️ Spy-Grade Disappearing Messages
- **Custom Countdown Timers:** 10s, 30s, 1m, 5m auto-destruction.
- **🔥 Burn On Read Mode:** Content remains blurred until tap-to-hold; triggers a 6-second destruction countdown upon opening!
- **Disintegrating Particle Burn Effect:** Animated fiery smoke fade out when timer reaches zero.
- **Live Shrinking Progress Bar:** Visual countdown directly below every message bubble.

### 4. 🛡️ Native Android Security (Play Store Edge)
- **Android `FLAG_SECURE`:** Hardware-level screenshot and screen recording blocker built into `MainActivity.java`.
- **🚨 Panic Button:** Instant digital purge that nukes local memory and displays a disguised functional Calculator decoy!
- **Copy & Selection Restriction:** Prevents text leaks.

---

## 🚀 Quick Start

### 1. Local Testing
```bash
# Run local dev server
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. Build Web Production Assets
```bash
npm run build
```

### 3. Sync to Native Android
```bash
npx cap sync android
```

---

## ☁️ Automated GitHub Actions Cloud Build (No Local Android Studio Needed!)

Whenever you push this repository to GitHub:
1. GitHub Actions runner automatically sets up Node 20 + Java JDK 17 + Android SDK.
2. Builds the web bundle and syncs native Capacitor.
3. Automatically injects `FLAG_SECURE`.
4. Compiles:
   - **`BlinkMsg-PlayStore-Release-AAB`** (For Google Play Store Console)
   - **`BlinkMsg-Test-Release-APK`** (For testing on your phone)
5. Both download links appear in your GitHub repository's **Actions** tab as Artifacts!

---

## 🗄️ Supabase Backend Setup (Optional)
If you wish to use Supabase Realtime across different devices:
1. Create a free project on [supabase.com](https://supabase.com).
2. Go to SQL Editor and run `supabase/schema.sql`.
3. Create a `.env` file with:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
*(BlinkMsg also runs out-of-the-box in standalone/mock mode for instant testing!)*
