# 🛒 SuchiQO — Voice-First Hyperlocal Kirana & Conversational AI Platform

> **India's Voice-First Hyperlocal Commerce Ecosystem** powered by the **Gnani.ai Vachana Voice AI Stack** (Prisma v3.0 STT & Timbre v3.0 Zero-Shot Neural TTS), Gemini 3.8 Flash Culinary Brain, Real-Time Google Maps Delivery Partner Tracking, Digital Udhaar Khata, and Creator-Only Hidden Backend Vault.

---

## 🌟 Overview & Key Features

**SuchiQO** bridges traditional Indian neighborhood Kirana stores with modern, hyper-localized e-commerce and conversational AI. Customers can converse naturally in **Hinglish, Hindi, and 9+ Indic languages** to check shelf stock, receive recipe recommendations based on what's available in the store, track delivery partners on an interactive Google Map, check their Digital Udhaar Khata balance, and place orders by voice.

### 🎙️ 1. Gnani.ai Vachana Voice Engine & Natural Indic Dialogue
- **Far-Field Code-Mixed STT**: Powered by Gnani Prisma v3.0 for natural Hinglish, Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali, and English speech recognition.
- **Zero-Shot Neural TTS**: Powered by Gnani Timbre v3.0 with natural human prosody, warm Indian accents, and speech humanization (converts `₹245` into *"245 rupaye"* and `2×` into *"2 packet"*).
- **Continuous Memory Recall**: Remembers past customer conversation turns, favorite items, and recommended recipes across sessions.

### 🍲 2. "Aaj Khane Mein Kya Banao?" AI Culinary Brain
- **Live Inventory-Gated Dish Recommendations**: Asking *"Aaj khane mein kya banao?"* recommends dish combos (e.g. **Pani Puri Kit**, **Dal Tadka**, **Paneer Butter Masala**, **Masala Chai & Biscuits**) strictly compiled from products currently in stock on the shopkeeper's shelf.
- **1-Tap Recipe Bundle Add**: Asking *"Pani puri ka saara saman add kar do"* adds all required recipe ingredients to the customer's bag in a single voice command.

### 📋 3. Order History Spoken Summary
- **Financial & Volume Insights**: Speaking *"Mere pichle orders ki summary batao"* calculates total lifetime order count and total spending (`₹${totalSpent}`) and speaks back a natural Hinglish summary.

### 💳 4. Digital Udhaar Khata & Balance Query
- **Voice Khata Inquiry**: Speaking *"Mera udhaar kitna hai?"* parses customer identity, calculates total credit issued minus repayments (`Net Dues = Udhaar - Jama`), and speaks the exact outstanding balance.
- **Digital Khata Ledger**: Integrated into the shopkeeper console and customer profile with automated ledger entries upon checkout.

### ⚡ 5. Voice Order Confirmation at Checkout
- **"Confirm" Keyword Trigger**: During checkout, customers can speak *"Confirm"*, *"Confirm order"*, or *"Haan confirm karo"* to finalize the order without tapping buttons.
- **Automated Workflow**: Deducts items from store shelf inventory, generates a handover OTP, clears the cart, and opens real-time delivery tracking.

### 📍 6. Real-Time Google Maps Delivery Partner Tracking
- **Interactive Delivery Tracking**: Uses Google Maps Platform (`@vis.gl/react-google-maps`) to visually animate delivery partner movement relative to the store location and customer address.
- **Live ETA & Status Stages**: Displays live distance, ETA minutes, phone call controls, and delivery OTP verification.

### ⭐ 7. Registered Kirana Directory & 5-Star Ratings
- **Customer Trust Directory**: Browse nearby registered stores with Bayesian-weighted 5-star rating components, owner contact details, GSTIN, and store timings.

### 👤 8. Mandatory Customer Registration
- **Address-First Onboarding**: Complete customer registration with full name, 10-digit mobile number, delivery address (Home, Work, Other), dietary preferences, and login verification.

### 🔐 9. Creator-Only Hidden Backend Vault
- **Local JSON Database (`data/suchiqo-db.json`)**: File-backed database persisting stores, customers, shelf stock, orders, cashbook, khata, and voice memory profiles.
- **Restricted Access**: Strictly hidden and accessible only to Creator (`aarushdixit2710@gmail.com`) via a secret key combination or hidden launcher button.

---

## 🗣️ Voice Commands Reference

| Voice Prompt | Action / Brain Resolution |
| :--- | :--- |
| `🍲 Aaj khane mein kya banao?` | Scans live shop shelf and recommends available recipes (e.g. Pani Puri kit). |
| `⚡ Pani puri ka saara saman add kar do` | Adds all required recipe bundle ingredients to the bag. |
| `📋 Mere pichle orders ki summary batao` | Speaks total orders placed and total money spent. |
| `💳 Mera udhaar kitna hai?` | Calculates net Udhaar Khata balance (`Udhaar - Jama`) and speaks dues. |
| `⚡ Confirm order` / `Haan confirm` | Finalizes order during checkout by voice. |
| `2 packet Aashirvaad Atta aur 1 Tata Salt add karo` | Multi-item cart addition from shelf inventory with unit parsing. |
| `💳 UPI payment mode lagao` | Selects UPI payment option. |
| `🕒 Shaam 7 baje deliver karo` | Schedules order delivery for 7:00 PM slot. |
| `📍 Home address select karo` | Chooses Home delivery address. |
| `🧠 Tumhe mera pichla conversation yaad hai?` | Recalls past conversation turns and customer preferences. |

---

## 🛠️ Technology Stack

- **Frontend Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 + Lucide React Icons + Motion
- **Server Runtime**: Node.js Express server (`server.ts`)
- **Persistence**: File-backed JSON Database Vault (`src/server/localDatabase.ts` -> `data/suchiqo-db.json`)
- **AI / Speech Stack**:
  - `@google/genai` TypeScript SDK (Gemini 3.8 Flash, Gemini 3.5 Transcribe, Gemini 3.8 Flash-Lite TTS)
  - Gnani.ai Vachana Voice AI Telemetry & API Integration (`api.vachana.ai`)
- **Maps Integration**: Google Maps Platform JS API (`@vis.gl/react-google-maps`)
- **Testing Engine**: Node Native Test Runner (`npx tsx --test src/utils/suchiqoLogic.test.ts`)

---

## 📁 Directory & File Architecture

```
.
├── server.ts                       # Express backend server with database sync & Gnani voice endpoints
├── vite.config.ts                  # Vite build configuration
├── package.json                    # Project metadata, dependencies, and start scripts
├── data/
│   └── suchiqo-db.json             # Persistent local JSON snapshot database
├── src/
│   ├── main.tsx                    # React client entry point
│   ├── App.tsx                     # Main SuchiQO application root & navigation
│   ├── index.css                   # Tailwind CSS v4 global styles
│   ├── components/
│   │   ├── BrandSvgDefs.tsx        # SuchiQO brand vector icons & illustrations
│   │   ├── CreatorBackendVault.tsx # Protected creator-only database management modal
│   │   ├── LiveOrderTrackingMap.tsx# Google Maps real-time delivery tracking component
│   │   ├── ProfileCommandCenter.tsx# Customer profile, orders, invoices & settings
│   │   ├── StoreFiveStarRating.tsx # 5-star Bayesian rating component for kirana stores
│   │   └── WaveformCanvas.tsx      # Real-time audio waveform visualizer canvas
│   └── utils/
│       ├── suchiqoLogic.ts         # Core Gnani voice brain, recipe advisor, ERP logic
│       └── suchiqoLogic.test.ts    # Unit tests for voice intent, cart, and ERP math
```

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Running in Development Mode
Start the full-stack development server running Express on port 3000:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Running Unit Tests
Execute the pure logic test suite:
```bash
npx tsx --test src/utils/suchiqoLogic.test.ts
```

### 4. Building for Production
Build the Vite frontend client:
```bash
npm run build
```

### 5. Starting in Production
Run the production Express server:
```bash
npm start
```

---

## 🔑 Environment Variables (`.env.example`)

Create a `.env` file in the root directory (never commit secrets):

```env
# Google Gemini API Key for AI recipe recommendations and neural TTS
GEMINI_API_KEY=your_gemini_api_key_here

# Google Maps API Key for interactive live delivery tracking map
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Optional: Gnani.ai Vachana Voice API Key
GNANI_API_KEY=your_gnani_vachana_api_key_here
GNANI_API_URL=https://api.vachana.ai
```

---

## 🔒 Creator Backend Vault Security

Access to the Backend Database Vault (`/api/creator/vault`) is restricted strictly to the Creator:
- **Creator Email**: `aarushdixit2710@gmail.com`
- **Default Access Passcode**: `SUCHIQO_VAULT_2026`
- **Hidden Launcher**: Click the **Creator Vault** button in the global header or press `Ctrl + Shift + K` to open the authentication modal.

---

## 📜 License & Credits

Built for the **SuchiQO Hyperlocal Kirana Network**. Designed for high-speed voice commerce, customer trust, and seamless shopkeeper ERP operations.
