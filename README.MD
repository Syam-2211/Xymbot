<p align="center">
  <img src="banner.svg" alt="Sneha Bot Animated Banner">
</p>

# 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 WhatsApp Bot (XYMBOT)

Welcome to the official repository for **🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 (XYMBOT)**, a high-performance, modular, plugin-based WhatsApp assistant designed for group management, multi-platform media downloading, AI image manipulation, canvas logo generation, games, and advanced utilities.

Developed with ❤️ by **🤍⃞𝄟ꪶ𝑆ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓**.

---

## 🚀 Key Features

### 📥 Universal Media Downloader
* **Universal Downloader (`.dl`, `.download`)**: One unified command that automatically detects and downloads media from 13+ platforms.
* **Supported Platforms**:
  * **TikTok** (`.tiktok`, `.ttmp3`): No watermark HD video and audio extraction.
  * **Instagram** (`.instagram`, `.igstory`): Reels, photo carousels, and stories.
  * **Facebook** (`.facebook`, `.fb`): Public HD/SD videos and photos.
  * **Twitter / X** (`.twitter`, `.x`): Videos and photos.
  * **Pinterest** (`.pinterest`, `.pin`): Media download and keyword image search.
  * **MediaFire** (`.mediafire`, `.mf`): Direct file and document download.
  * **Spotify** (`.spotify`, `.spotifydl`): High quality track audio.
  * **YouTube** (`.play`, `.video`, `.ytmp3`, `.ytmp4`): MP3 songs and MP4 HD videos.
  * **Additional Platforms**: CapCut (`.capcut`), Reddit (`.reddit`), GitHub Repo ZIP (`.gitclone`), Videy (`.vd`), Threads (`.th`), Mega (`.mg`), SoundCloud (`.sc`), and Sfile (`.sf`).

### 🎨 Ultra HD Canvas Logo Maker
* **50+ Logo Styles (`.logo`, `.logomaker`)**: Generate custom HD canvas logos powered by Pixabay backgrounds and multi-color gradient typography.
* **Direct Commands**: `.neon`, `.fire`, `.cyber`, `.dragon`, `.blackpink`, `.3dneon`, `.glitch`, `.matrix`, `.hacker`, `.gaming`, `.metal`, `.gold`, `.silver`, `.galaxy`, `.retro`, `.pixel`, `.anime`, and 40+ more.
* **Usage**: `.neon Name|Tagline` or `.logo fire Name|Tagline`.

### 🔓 Anti-ViewOnce Recovery
* **View-Once Media Grabber (`.vv`, `.viewonce`, `.retrieve`)**: Automatically unwraps modern WhatsApp view-once wrappers (`viewOnceMessage`, `viewOnceMessageV2`, `viewOnceMessageV2Extension`, ephemeral wrappers).
* **Full Media Support**: Recovers view-once images, videos, voice notes (PTT audio), and view-once text messages cleanly.

### 🤖 Auto-Mention Reply & Testing
* **Clean Auto-Mention Responder (`.cmention`)**: Responds when the bot or sudo users are mentioned in groups or DMs—free of fake product quotes or hardcoded branding.
* **Custom Mention Manager**:
  * `.cmention set <text>`: Set custom text reply.
  * Reply to any media + `.cmention set`: Set image, video, audio (PTT), sticker, or document.
  * `.cmention get`: View currently active mention response.
  * `.cmention del`: Clear custom response and use default media pool.
  * `.cmention type <audio/video/both>`: Configure fallback media pool.
* **Mention Tester (`.me`)**: Mention the bot number directly in DMs or groups to instantly trigger and test the mention response.

### 🔍 Search & Knowledge Tools
* **Google Live Search** (`.google`)
* **Wikipedia Summary** (`.wiki`)
* **Live Weather Report** (`.weather`)
* **World News Headlines** (`.news`)
* **Song Lyrics Finder** (`.lyrics`)
* **English Dictionary & Phonetics** (`.define`)

### 🤖 AI Models & Vision Filters
* **AI Chat** (`.ai`, `.gpt`): Conversational AI assistant.
* **AI Image Generation** (`.aigen`): Create images from text prompts.
* **AI Vision Analyzer** (`.describe`): Detailed AI scene and object description.
* **OCR Text Extractor** (`.ocr`): Extract text from replied photos.
* **AI Photo Stylizers**: `.toanime`, `.toghibli`, `.tocartoon`, `.tochibi`, `.to3d`, `.tomanga`, `.faceswap`, `.colorize`.

### 🪄 Media Converters & Canvas
* **Sticker Maker & Tools**: `.sticker`, `.toimg`, `.tomp3`, `.tovideo`, `.togif`, `.tovn` (convert audio/video to voice note PTT).
* **Photo Background Removal**: `.nobg`.
* **Catbox Uploader & URL Shortener**: `.url`, `.short`.
* **Maker Suite**: `.brat`, `.bratvid`, `.qc` (Quotely cards), `.storyig`, `.balogo`, `.fakestory`, `.faketweet`, `.math`.

### 🎮 Games & Fun
* **Interactive Mini-Games**: `.tictactoe` (multiplayer 3x3), `.dungeon` (RPG raid), `.fishing` (rare fish catches), `.minecraft` (sandbox mining).
* **Quizzes & Riddles**: `.family100`, `.tebakgambar`, `.tebakbendera`, `.riddle`, `.joke`, `.quote`, `.meme`.

### 🛡️ Group Management & Moderation
* **Member Controls**: `.kick`, `.add`, `.promote`, `.demote`.
* **Mass Mentions**: `.tagall` (visible list), `.hidetag` (invisible mass mention).
* **Chat Control**: `.mute` / `.unmute`, `.setname`, `.setdesc`.
* **Security & Automation**:
  * Anti-Link (`.antilink on/off`)
  * Anti-Delete (`.antidelete on/off`)
  * Anti-Spam (`.antispam on/off`)
  * Bad-Word Filter (`.badword on/off`)
  * 3-Strike Warning System (`.warn @user`, `.resetwarn @user`)
  * Custom Welcome & Goodbye greetings (`.welcome`, `.goodbye`, `.setwelcome`, `.setgoodbye`)

### 👑 Owner & System Control
* **Access Modes**: `.mode public/private/sudo`
* **Sudo Operators**: `.sudo add/del/list`
* **Bot Control**: `.restart`, `.join <link>`, `.leave`, `.broadcast <msg>`, `.block`, `.unblock`, `.blockchat`
* **Audio Triggers**: `.setcmdaudio`, `.delcmdaudio` (attach custom voice notes to commands).
* **Dynamic Menu Engine**: `.setmenu <style>` (9 rotating aesthetics: Hydro, Nano, Ourin, Alya, Yori, Velynbot, Queen Anita, Trinity, Maochan) and `.setmenumethod <button/card/text>`.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
* Node.js (v20.x recommended)
* Git & FFmpeg installed

### 2. Installation
Clone this repository and install the dependencies:
```bash
git clone https://github.com/Syam-2211/Xymbot.git
cd Xymbot
npm install
```

### 3. Configuration
Copy `.env.example` to `.env` or edit `config.js` to set your credentials:
```env
SESSION_ID=
OWNER_NUMBER=919947121619
OWNER_NAME=Syam Ser
BOT_NAME=XYMBOT
PREFIX=.
WORKTYPE=public
```

### 4. Running the Bot
```bash
npm start
```
Scan the QR code printed in the terminal or enter your WhatsApp Pairing Code. Once connected, your bot is ready to serve!
