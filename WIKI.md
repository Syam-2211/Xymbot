# 📖 XYMBOT (Sneha Bot) GitHub Wiki Documentation

This document contains the complete, ready-to-copy-paste pages for your **GitHub Repository Wiki**. You can create pages on GitHub (`https://github.com/Syam-2211/Xymbot/wiki`) and copy-paste each section directly into its corresponding Wiki page.

---

# 📑 Table of Contents for GitHub Wiki
1. [Page 1: Home (Wiki Homepage)](#-page-1-home)
2. [Page 2: Commands-List (Complete Reference)](#-page-2-commands-list)
3. [Page 3: Configuration-&-Customization](#-page-3-configuration--customization)
4. [Page 4: Deployment-Guide](#-page-4-deployment-guide)
5. [Page 5: Troubleshooting-&-FAQ](#-page-5-troubleshooting--faq)

---

# 🏠 Page 1: Home
*(Create a page named `Home` or edit the default Wiki page and paste the content below)*

```markdown
# Welcome to the XYMBOT (Sneha Bot) Wiki!

**XYMBOT** (🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊) is an enterprise-grade, modular, plugin-powered WhatsApp Multi-Device assistant built on `@whiskeysockets/baileys`. It provides automated group moderation, universal media downloading across 13+ services, AI vision & generation tools, Ultra HD canvas logo makers, interactive multiplayer games, and customizable mention responses.

---

## ⚡ Quick Navigation

| Wiki Page | Description |
| :--- | :--- |
| [Commands List](Commands-List) | Comprehensive index of all 127+ commands with arguments & permissions |
| [Configuration & Customization](Configuration-&-Customization) | Guide to `.env`, `config.js`, auto-mentions, and dynamic menu styles |
| [Deployment Guide](Deployment-Guide) | Run locally, on VPS (PM2), Docker, Railway, or Render |
| [Troubleshooting & FAQ](Troubleshooting-&-FAQ) | Fix pairing issues, FFmpeg dependencies, canvas, and anti-ban limits |

---

## 🌟 Architecture Highlights

* **Modular Plugin System**: Every feature is an isolated plugin in `/plugins/`, enabling dynamic reloading and zero-downtime additions.
* **Anti-Ban Protection Engine**:
  * Command burst rate-limiting (maximum 4 commands per 10 seconds per user).
  * Auto-cooldown on mass mentions (`.tagall` and `.hidetag` capped at safe member quotas with 45s intervals).
  * Safe mention reply interval (8 seconds per chat) preventing automated flood bans.
* **Multi-Platform Universal Downloader**:
  * Unified `.dl <url>` engine auto-detects and extracts content from TikTok, Instagram, Facebook, Twitter/X, Pinterest, MediaFire, Spotify, YouTube, Threads, Mega, SoundCloud, Videy, and Sfile.
* **Ultra HD Canvas Graphics**:
  * Over 50 unique styles (`.neon`, `.fire`, `.cyber`, `.dragon`, etc.) rendered via `@napi-rs/canvas` and Pixabay photo backdrops.
* **Anti-ViewOnce Recovery**:
  * Seamless unwrapping of modern WhatsApp ephemeral stubs (`viewOnceMessage`, `viewOnceMessageV2`, `viewOnceMessageV2Extension`, audio voice notes, text).
* **Multi-Style Dynamic Menu**:
  * 9 rotating visual designs (Hydro, Nano, Ourin, Alya, Yori, Velynbot, Queen Anita, Trinity, Maochan).
  * 3 interactive delivery methods (Button list, rich card with newsletter context, and image banner text).

---

## 👤 Author & Support
* **Developer**: Syam Ser (複| xʏᴀᴍツ)
* **GitHub**: [github.com/Syam-2211](https://github.com/Syam-2211)
* **WhatsApp**: [wa.me/919947121619](https://wa.me/919947121619)
```

---

# 📜 Page 2: Commands-List
*(Create a new page named `Commands-List` on your GitHub Wiki and paste the content below)*

```markdown
# 📜 Complete Command Reference

> **Permission Legend:**
> * `Ⓕ` = **Free for All** (usable by anyone in group or private chat)
> * `Ⓐ` = **Group Admin Only** (requires group admin or bot owner)
> * `Ⓞ` = **Bot Owner Only** (restricted to developer and sudo users)

---

## 1. 📥 Downloader (`download`)

| Command | Arguments | Tag | Description |
| :--- | :--- | :--- | :--- |
| `.dl` / `.download` | `<url>` | `Ⓕ` | Universal media downloader for all 13+ platforms |
| `.play` | `<song name>` | `Ⓕ` | Search and download MP3 audio from YouTube |
| `.ytmp3` | `<link>` | `Ⓕ` | Direct YouTube to MP3 audio converter |
| `.video` | `<link/query>`| `Ⓕ` | Search and download YouTube video |
| `.ytmp4` | `<link>` | `Ⓕ` | Download YouTube HD MP4 video |
| `.spotify` | `<track link>`| `Ⓕ` | Download Spotify track audio (320kbps) |
| `.spotifydl`| `<link>` | `Ⓕ` | Alternative Spotify downloader |
| `.tiktok` | `<link>` | `Ⓕ` | Download TikTok video without watermark |
| `.ttmp3` | `<link>` | `Ⓕ` | Extract MP3 audio from TikTok |
| `.instagram`| `<link>` | `Ⓕ` | Download Instagram Reels, Posts, and Carousels |
| `.igstory` | `<user/link>`| `Ⓕ` | Download Instagram Story media |
| `.facebook` | `<link>` | `Ⓕ` | Download Facebook public HD/SD video |
| `.twitter` / `.x` | `<link>` | `Ⓕ` | Download Twitter/X video or image |
| `.pinterest`| `<query/link>`| `Ⓕ` | Download Pinterest media or search pins |
| `.mediafire`| `<link>` | `Ⓕ` | Download files directly from MediaFire |
| `.capcut` | `<link>` | `Ⓕ` | Download CapCut template video without watermark |
| `.reddit` | `<link>` | `Ⓕ` | Download Reddit video or photo post |
| `.gitclone` | `<github url>`| `Ⓕ` | Download GitHub repository as a ZIP archive |

---

## 2. 🔍 Search Tools (`search`)

| Command | Arguments | Tag | Description |
| :--- | :--- | :--- | :--- |
| `.google` | `<query>` | `Ⓕ` | Real-time Google search results |
| `.wiki` | `<topic>` | `Ⓕ` | Wikipedia article summary & thumbnail |
| `.weather` | `<city>` | `Ⓕ` | Live temperature, humidity, and forecast |
| `.news` | `[topic]` | `Ⓕ` | Latest world and regional headlines |
| `.lyrics` | `<song name>`| `Ⓕ` | Full song lyrics search |
| `.define` | `<word>` | `Ⓕ` | English dictionary definitions and phonetics |

---

## 3. 🤖 AI & Filters (`ai`)

| Command | Arguments | Tag | Description |
| :--- | :--- | :--- | :--- |
| `.ai` / `.gpt` | `<question>` | `Ⓕ` | Chat with conversational AI assistant |
| `.aigen` | `<prompt>` | `Ⓕ` | Generate AI images from text descriptions |
| `.describe` | `(reply photo)`| `Ⓕ` | AI vision analyzes and describes photo |
| `.ocr` | `(reply photo)`| `Ⓕ` | Extract printed/handwritten text from photo |
| `.toanime` | `(reply photo)`| `Ⓕ` | Convert image into Japanese anime style |
| `.toghibli` | `(reply photo)`| `Ⓕ` | Convert image into Studio Ghibli art style |
| `.tocartoon`| `(reply photo)`| `Ⓕ` | Apply vibrant cartoon filter |
| `.tochibi` | `(reply photo)`| `Ⓕ` | Render photo as cute Chibi avatar |
| `.to3d` | `(reply photo)`| `Ⓕ` | 3D avatar CGI conversion |
| `.tomanga` | `(reply photo)`| `Ⓕ` | Black and white manga line art |
| `.faceswap` | `(reply photo)`| `Ⓕ` | AI face swap stylizer |
| `.colorize` | `(reply photo)`| `Ⓕ` | Restore color to black & white photo |

---

## 4. 🪄 Converters & Tools (`tools`)

| Command | Arguments | Tag | Description |
| :--- | :--- | :--- | :--- |
| `.sticker` | `(reply media)`| `Ⓕ` | Convert photo/video/GIF to WhatsApp sticker |
| `.toimg` | `(reply sticker)`| `Ⓕ` | Convert sticker to high-res image |
| `.tomp3` | `(reply video)`| `Ⓕ` | Extract MP3 audio track from video |
| `.tovideo` | `(reply sticker)`| `Ⓕ` | Convert animated sticker into MP4 video |
| `.togif` | `(reply sticker)`| `Ⓕ` | Convert sticker/video to playable GIF |
| `.tovn` | `(reply audio)`| `Ⓕ` | Convert audio or music into voice note (PTT) |
| `.nobg` | `(reply photo)`| `Ⓕ` | Remove photo background cleanly |
| `.url` | `(reply media)`| `Ⓕ` | Upload media to Catbox and return public URL |
| `.short` | `<long url>` | `Ⓕ` | Shorten long URL via TinyURL |
| `.translate`| `<lang> <text>`| `Ⓕ` | Translate text into target language |
| `.tts` | `<lang> <text>`| `Ⓕ` | Text-to-speech voice audio generator |
| `.fancy` | `<text>` | `Ⓕ` | Convert text into stylish Unicode fonts |
| `.vv` | `(reply viewonce)`| `Ⓕ` | Recover & download view-once media/text |
| `.bass` | `(reply audio)`| `Ⓕ` | Apply bass boost audio filter |
| `.slow` | `(reply audio)`| `Ⓕ` | Apply slowed + reverb audio filter |
| `.robot` | `(reply audio)`| `Ⓕ` | Apply robotic voice modulation |

---

## 5. 🎨 Maker & Canvas (`canvas`)

| Command | Arguments | Tag | Description |
| :--- | :--- | :--- | :--- |
| `.logo` | `<style> <Text>`| `Ⓕ` | Generate canvas logo (over 50 styles available) |
| `.neon` | `<Name\|Tag>` | `Ⓕ` | Cyberpunk glowing neon sign logo |
| `.fire` | `<Name\|Tag>` | `Ⓕ` | Molten flaming text logo |
| `.blackpink`| `<Name\|Tag>` | `Ⓕ` | K-pop black & pink aesthetic logo |
| `.3dneon` | `<Name\|Tag>` | `Ⓕ` | 3D neon city night logo |
| `.dragon` | `<Name\|Tag>` | `Ⓕ` | Mythical dragon flame logo |
| `.matrix` | `<Name\|Tag>` | `Ⓕ` | Hacker digital code rain logo |
| `.brat` | `<text>` | `Ⓕ` | Brat aesthetic green sticker |
| `.bratvid` | `<text>` | `Ⓕ` | Brat kinetic typography video |
| `.qc` | `[text/reply]` | `Ⓕ` | Quotely card sticker with sender avatar |
| `.storyig` | `<text>` | `Ⓕ` | Instagram story aesthetic card |
| `.balogo` | `<Left\|Right>`| `Ⓕ` | Blue Archive cross-title logo |
| `.fakestory`| `<text>` | `Ⓕ` | Fake WhatsApp status quote card |
| `.faketweet`| `<text>` | `Ⓕ` | Fake Twitter tweet generator |
| `.math` | `<expression>` | `Ⓕ` | Calculate mathematical formulas |

---

## 6. 🎯 Games & Fun (`game`)

| Command | Arguments | Tag | Description |
| :--- | :--- | :--- | :--- |
| `.tictactoe`| `<1-9 / join>` | `Ⓕ` | Play interactive 2-player Tic-Tac-Toe in chat |
| `.dungeon` | `none` | `Ⓕ` | RPG monster raid with combat damage & loot |
| `.fishing` | `none` | `Ⓕ` | Cast fishing rod to catch rare fish & treasure |
| `.minecraft`| `none` | `Ⓕ` | Sandbox mining expedition for ores & gems |
| `.werewolf` | `[start]` | `Ⓕ` | Werewolf roleplay village party game |
| `.family100`| `none` | `Ⓕ` | Family 100 survey trivia challenge |
| `.tebakgambar`| `none` | `Ⓕ` | Picture riddle quiz with hints |
| `.tebakbendera`| `none` | `Ⓕ` | Guess the country flag quiz |
| `.riddle` | `none` | `Ⓕ` | Brain teaser riddles with spoiler answers |
| `.joke` | `none` | `Ⓕ` | Comedy jokes & punchlines |
| `.quote` | `none` | `Ⓕ` | Inspiring quotes from famous figures |
| `.meme` | `none` | `Ⓕ` | Random trending memes from Reddit |

---

## 7. 👥 Group Commands (`group`)

| Command | Arguments | Tag | Description |
| :--- | :--- | :--- | :--- |
| `.kick` | `@user` | `Ⓐ` | Remove member from group |
| `.add` | `<number>` | `Ⓐ` | Add phone number to group |
| `.promote` | `@user` | `Ⓐ` | Promote member to admin role |
| `.demote` | `@user` | `Ⓐ` | Demote admin back to regular member |
| `.tagall` | `[message]` | `Ⓐ` | Mention every member in visible list |
| `.hidetag` | `[message]` | `Ⓐ` | Invisible mass mention to notify all |
| `.mute` | `none` | `Ⓐ` | Close group (only admins can message) |
| `.unmute` | `none` | `Ⓐ` | Open group (all members can message) |
| `.invite` | `none` | `Ⓐ` | Generate WhatsApp group invite link |
| `.setname` | `<new name>` | `Ⓐ` | Update group subject title |
| `.setdesc` | `<new desc>` | `Ⓐ` | Update group description text |
| `.antilink` | `on / off` | `Ⓐ` | Auto-kick members posting unauthorized links |
| `.antidelete`| `on / off` | `Ⓐ` | Intercept and forward deleted messages |
| `.antispam` | `on / off` | `Ⓐ` | Enforce message rate limiting |
| `.badword` | `on / off` | `Ⓐ` | Moderate abusive and profanity words |
| `.warn` | `@user` | `Ⓐ` | Issue warning strike (3 strikes = auto-kick) |
| `.resetwarn`| `@user` | `Ⓐ` | Reset warning counter for user |
| `.welcome` | `on / off` | `Ⓐ` | Toggle greeting message for newcomers |
| `.goodbye` | `on / off` | `Ⓐ` | Toggle farewell message when someone leaves |
| `.setwelcome`| `<text>` | `Ⓐ` | Customize welcome greeting template |
| `.setgoodbye`| `<text>` | `Ⓐ` | Customize farewell goodbye template |

---

## 8. 👑 Owner Panel (`owner`)

| Command | Arguments | Tag | Description |
| :--- | :--- | :--- | :--- |
| `.mode` | `public / private / sudo` | `Ⓞ` | Switch bot access mode |
| `.sudo` | `add / del / list` | `Ⓞ` | Manage authorized sudo operator numbers |
| `.cmention` | `set / get / del / type` | `Ⓞ` | Configure auto-mention replies |
| `.addcmentionaudio` | `<name>` | `Ⓞ` | Add audio to random mention pool |
| `.addcmentionvideo` | `<name>` | `Ⓞ` | Add video to random mention pool |
| `.listcmention` | `none` | `Ⓞ` | View all files in custom mention pool |
| `.setcmdaudio` | `<cmd>` | `Ⓞ` | Attach custom voice note to any command |
| `.delcmdaudio` | `<cmd>` | `Ⓞ` | Remove custom voice note from command |
| `.broadcast` | `<message>` | `Ⓞ` | Broadcast blast message to all participating groups |
| `.join` | `<link>` | `Ⓞ` | Join a WhatsApp group via invite link |
| `.leave` | `none` | `Ⓞ` | Leave the current group chat |
| `.block` | `@user` | `Ⓞ` | Block user on WhatsApp |
| `.unblock` | `@user` | `Ⓞ` | Unblock user on WhatsApp |
| `.blockchat` | `none` | `Ⓞ` | Mute bot responses in current chat |
| `.restart` | `none` | `Ⓞ` | Safely reboot bot process |
| `.setmenu` | `<style>` | `Ⓞ` | Switch menu visual style (9 available) |
| `.setmenumethod`| `<button/card/text>` | `Ⓞ` | Change menu delivery method |

---

## 9. 🏠 Main Commands (`main`)

| Command | Arguments | Tag | Description |
| :--- | :--- | :--- | :--- |
| `.menu` | `[style/method]` | `Ⓕ` | Display interactive feature menu |
| `.help` | `[command]` | `Ⓕ` | Detailed command instructions and syntax |
| `.alive` / `.uptime` | `none` | `Ⓕ` | Check online heartbeat, host status & uptime |
| `.ping` / `.speed` | `none` | `Ⓕ` | Check response latency speed (ms) |
| `.whois` | `@user` | `Ⓕ` | View user profile, number, and status |
| `.jid` | `none` | `Ⓕ` | Display current chat or user JID |
| `.settings` | `none` | `Ⓕ` | Show global bot configurations |
| `.owner` | `none` | `Ⓕ` | Send developer VCard & contact info |
| `.me` | `none` | `Ⓕ` | Mention bot in DM or group to test mention reply |
```

---

# ⚙️ Page 3: Configuration-&-Customization
*(Create a new page named `Configuration-&-Customization` on your GitHub Wiki and paste the content below)*

```markdown
# ⚙️ Configuration & Customization Guide

## 1. Environment Variables (`.env`)

Create a `.env` file in the root folder with the following variables:

```env
# Pairing and Connection
SESSION_ID=                     # Leave blank for terminal QR code / Pairing Code
PORT=8000                       # Web health check port

# Bot Credentials
BOT_NAME=🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊   # Display name of the bot
OWNER_NUMBER=919947121619       # Owner phone number (country code without +)
OWNER_NAME=Syam Ser             # Owner display name
PACKNAME=✪⃝⸸ꜛꪶ͢𝐒𝐘͔𝐀𝐌 𝐒𝐄𝐑͢ꫂꜜ™       # Sticker pack metadata
PREFIX=.                        # Command prefix (e.g. . or ! or #)
WORKTYPE=public                 # Access mode: public | private | sudo
SUDO=919947121619               # Comma-separated sudo numbers

# Security & Behavior
AUTO_READ_STATUS=true           # Automatically view contact status updates
ANTI_DELETE=true                # Capture deleted messages in chats
ANTI_LINK=false                 # Global anti-link default
AUTO_REACT=false                # Automatic emoji reactions
```

---

## 2. Auto-Mention Reply (`.cmention`)

XYMBOT features a clean auto-mention responder without hardcoded advertisements or fake product messages.

### How to Configure:
* **Set Text Reply**:
  ```text
  .cmention set Hello there! I am currently busy, please leave a message.
  ```
* **Set Media Reply (Voice Note, Video, Photo, Sticker, Document)**:
  1. Send or receive the media in any chat.
  2. Reply to that media message.
  3. Type `.cmention set`.
* **View Current Reply**:
  ```text
  .cmention get
  ```
* **Delete Custom Reply**:
  ```text
  .cmention del
  ```
* **Set Random Media Pool Mode**:
  ```text
  .cmention type audio   # Audio voice notes only
  .cmention type video   # Round video / videos only
  .cmention type both    # Random audio or video
  ```
* **Test Mention Function**:
  Type `.me` in any DM or group chat. The bot will tag itself and instantly trigger the configured response!

---

## 3. Dynamic Menu Customization

XYMBOT has an engine supporting **9 distinct visual aesthetics** and **3 delivery methods**:

### Visual Styles (`.setmenu <style>`):
1. `hydro` (Default aesthetic with border frames)
2. `nano` (Tech monospace style)
3. `ourin` (RPG character status layout with EXP, Level, Mana)
4. `alya` (Minimalist cute Japanese style)
5. `yori` (Multi-device clover theme)
6. `velynbot` (Crystal purple theme)
7. `queen anita` (Royal crown layout)
8. `trinity` (System tree directory navigation)
9. `maochan` (Cyber-shrine layout)

### Delivery Methods (`.setmenumethod <method>`):
* `button`: Interactive WhatsApp list menu with category buttons.
* `card`: Document card layout with official newsletter attribution and high-resolution thumbnail.
* `text`: Classic image banner with formatted markdown text and accompanying theme audio.
```

---

# 🚀 Page 4: Deployment-Guide
*(Create a new page named `Deployment-Guide` on your GitHub Wiki and paste the content below)*

```markdown
# 🚀 Deployment Guide

## 1. Local / VPS (Ubuntu, Debian, Windows)

### Prerequisites:
* **Node.js**: v20.x or higher
* **FFmpeg**: Required for audio/video converters
* **Git**

```bash
# Clone the repository
git clone https://github.com/Syam-2211/Xymbot.git
cd Xymbot

# Install dependencies
npm install

# Start the bot
npm start
```

### Running 24/7 with PM2 (Recommended):
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 2. Docker Deployment

A lightweight `Dockerfile` is included in the repository.

```bash
# Build the Docker image
docker build -t xymbot .

# Run the container in the background
docker run -d --name xymbot-app --restart always -p 8000:8000 xymbot
```

---

## 3. Cloud Deployment (Railway / Render)

### Railway:
1. Fork or push this repository to your GitHub account.
2. Link your repository in [Railway.app](https://railway.app).
3. Under **Variables**, add your environment variables (`OWNER_NUMBER`, `PREFIX`, `WORKTYPE`, etc.).
4. Railway will automatically detect `railway.json` and deploy.

### Render:
1. Connect repository in [Render.com](https://render.com) as a **Web Service**.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Set Environment Variables matching your `.env`.
```

---

# ❓ Page 5: Troubleshooting-&-FAQ
*(Create a new page named `Troubleshooting-&-FAQ` on your GitHub Wiki and paste the content below)*

```markdown
# ❓ Troubleshooting & Frequently Asked Questions

### Q1: How do I link the bot to WhatsApp?
When you start the bot with `npm start`, you can link using:
* **Terminal QR Code**: Open WhatsApp > Linked Devices > Link a Device > Scan QR.
* **Pairing Code**: Enter your phone number in the terminal prompt to receive an 8-character pairing code directly inside WhatsApp.

---

### Q2: Why are `.vv` (view-once) media failing to download?
Modern WhatsApp stubs expire quickly once viewed on mobile devices.
* Make sure you reply to the View-Once message as soon as it arrives using `.vv`.
* The bot automatically handles `viewOnceMessageV2`, `viewOnceMessageV2Extension`, ephemeral wrappers, voice notes, and text view-once.

---

### Q3: Why does `.logo` say `@napi-rs/canvas` is needed?
The logo engine uses high-performance hardware canvas rendering.
If your platform doesn't have pre-built binaries, install it:
```bash
npm install @napi-rs/canvas --save
```
*Note: If canvas is not installed, the bot will automatically fall back to an online generation API.*

---

### Q4: How does Anti-Ban Shield work?
To protect your account from WhatsApp automated rate-limit detection:
1. **Command Cooldown**: Non-owner users cannot send more than 4 commands in 10 seconds.
2. **Mention Throttling**: Auto-mention responses have an 8-second cooldown per chat.
3. **Mass Mention Protection**: `.tagall` and `.hidetag` enforce a 45-second delay between uses.
```
