<p align="center">
  <img src="banner.svg" alt="Sneha Bot Animated Banner">
</p>

# 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 WhatsApp Bot

Welcome to the official repository for **🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊**, a high-performance, plugin-based WhatsApp assistant designed for group management, AI interaction, media downloading, and overall utility. 

Developed with ❤️ by **🤍⃞𝄟ꪶ𝑆ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓**.

---

## 🚀 Key Features

### 🛡️ Advanced Group Management
* **Auto-Admin**: Automatically promotes the owner.
* **Anti-Link**: Detects and removes users sending unauthorized links.
* **Anti-Delete**: Captures and logs deleted messages so you never miss a thing.
* **Mute/Unmute**: Manually control group chat permissions.
* **Auto-Open/Close**: Schedule specific times for the group to be active.
* **Manual Moderation**: `kick`, `promote`, `demote`, and `warn` (with a 3-strike auto-kick system).

### 👋 Greetings & Social
* **Custom Welcome**: Greet new members with personalized messages.
* **Custom Goodbye**: Send a parting message when someone leaves.
* **Tag All / Hide Tag**: Easily notify everyone in the group at once.

### 🤖 Artificial Intelligence
* Chat with AI using the `.ai` command (powered by Gemini & fallback GPT-4 APIs).

### 📥 Media Downloaders & Tools
* Download Audio/Video from YouTube (`.play`, `.video`).
* Download from TikTok, Instagram, and Facebook (`.tiktok`, `.instagram`, `.facebook`).
* Create custom stickers (`.sticker`).
* Edit Audio files (`.bass`, `.slow`, `.chipmunk`, etc.).

### ⚙️ Owner & System Features
* **Login Notifications**: Automatically messages the owner with detailed latency and plugin stats upon startup.
* **Safe Restart**: Use `.restart` to securely reboot the bot directly from WhatsApp.
* **Public/Private Modes**: Lock down the bot to owner-only commands using `.mode`.
* **Sudo Management**: Add or remove sudo users dynamically.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
* Node.js (v18 or higher recommended)
* A WhatsApp account for pairing.

### 2. Installation
Clone this repository and install the dependencies:
```bash
git clone https://github.com/Syam-2211/Xymbot.git
cd Xymbot
npm install
```

### 3. Configuration
Edit `config.js` to set your Owner Number, Bot Name, and (optional) API Keys.

### 4. Running the Bot
```bash
npm start
```
Scan the QR code printed in the terminal using your WhatsApp "Linked Devices" feature. Once connected, you will receive a startup message directly to your owner number!
