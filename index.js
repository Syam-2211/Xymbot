// 🚀 BOOT DIAGNOSTIC LOG — If you see this in Render logs, Node.js is executing successfully!
console.log('🚀 BOOT DIAGNOSTIC: index.js is executing right now!');

let makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    Browsers,
    downloadMediaMessage,
    getAggregateVotesInPollMessage,
    makeInMemoryStore;

async function initBaileys() {
    let baileys;
    try {
        baileys = require("@whiskeysockets/baileys");
    } catch (e) {
        if (e.code === 'ERR_REQUIRE_ESM') {
            baileys = await import("@whiskeysockets/baileys");
        } else {
            throw e;
        }
    }
    makeWASocket = baileys.default || baileys.makeWASocket;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
    Browsers = baileys.Browsers;
    downloadMediaMessage = baileys.downloadMediaMessage;
    getAggregateVotesInPollMessage = baileys.getAggregateVotesInPollMessage;
    makeInMemoryStore = baileys.makeInMemoryStore;
}

const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
let NodeCache;
try {
    NodeCache = require("node-cache");
} catch (e) {
    NodeCache = class {
        constructor() { this._cache = new Map(); }
        get(k) { return this._cache.get(k); }
        set(k, v) { this._cache.set(k, v); return true; }
        del(k) { return this._cache.delete(k); }
        flushAll() { this._cache.clear(); }
    };
}

// Prevent uncaught stream errors from crashing the entire bot process
process.on('uncaughtException', (err) => {
    console.error('🛡️ [UncaughtException prevented crash]:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('🛡️ [UnhandledRejection prevented crash]:', reason?.message || reason);
});

// Optional config loader if present
try { require('./config'); } catch (e) {}

const msgRetryCounterCache = new NodeCache();
const messageCache = new Map();

// ─── CLOUD HEALTH SERVER (Required for Render Web Service) ───────────────────
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

app.get('/', (req, res) => res.send(`🤖 ${global.botName || 'Xymbot'} is running 24/7 online!`));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.listen(PORT, () => {
    console.log(`🌐 Cloud health server listening on port ${PORT}`);
});

// ─── DECODE SESSION_ID / MONGODB CUSTOM SESSION RESTORE ──────────────────────
const sessionDir = path.join(__dirname, 'session');

function isValidCreds(filePath) {
    try {
        if (!fs.existsSync(filePath)) return false;
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        return !!(data.noiseKey || data.me || data.signedIdentityKey || data.registrationId);
    } catch {
        return false;
    }
}

async function restoreSession() {
    const credsPath = path.join(sessionDir, 'creds.json');
    if (isValidCreds(credsPath)) {
        console.log('✅ Existing valid session detected in session directory.');
        return;
    } else if (fs.existsSync(credsPath)) {
        try { fs.unlinkSync(credsPath); } catch (_) {}
    }

    const sessionId = (process.env.SESSION_ID || process.env.SESSION_NAME || global.SESSION_ID || '').trim();
    if (!sessionId) return;

    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    let rawData = null;

    // 1. If MONGO_URI is set, fetch session by custom sessionName or sessionId from MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoUri) {
        try {
            console.log(`🍃 Connecting to MongoDB to fetch session: "${sessionId}"...`);
            let mongoose;
            try {
                mongoose = require('mongoose');
            } catch (e) {
                console.warn('⚠️ Mongoose module not found, skipping MongoDB session restore.');
            }

            if (mongoose) {
                if (mongoose.connection.readyState !== 1) {
                    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
                }
                const sessionSchema = new mongoose.Schema({
                    sessionId: { type: String, required: true },
                    sessionName: { type: String, unique: true, sparse: true },
                    sessionData: { type: String, required: true },
                    createdAt: { type: Date, default: Date.now }
                });
                const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

                const cleanName = sessionId.replace(/^XYMBOT~/i, '').trim();
                let doc = await Session.findOne({ sessionName: cleanName });
                if (!doc) doc = await Session.findOne({ sessionName: cleanName.toLowerCase() });
                if (!doc) doc = await Session.findOne({ sessionId: sessionId });
                if (!doc) doc = await Session.findOne({ sessionId: 'XYMBOT~' + cleanName });

                if (doc) {
                    console.log(`✅ Found custom session "${doc.sessionName || sessionId}" in MongoDB!`);
                    rawData = doc.sessionData || doc.sessionId;
                } else {
                    console.warn(`⚠️ Custom session "${sessionId}" was not found in MongoDB.`);
                }
            }
        } catch (mErr) {
            console.error('❌ MongoDB session lookup error:', mErr.message);
        }
    } else if (!sessionId.startsWith('XYMBOT~') && sessionId.length < 100) {
        console.warn('⚠️ MONGO_URI is not set! Custom session names require MONGO_URI in environment variables to load from MongoDB.');
    }

    // 2. If not found in MongoDB, check if sessionId is raw base64 or prefixed with XYMBOT~
    if (!rawData && (sessionId.startsWith('XYMBOT~') || sessionId.length >= 100)) {
        rawData = sessionId;
    }

    // 3. Decode JSON session and write to session directory
    if (rawData) {
        try {
            const raw = rawData.replace(/^XYMBOT~/i, '').trim();
            let decoded;
            try {
                decoded = Buffer.from(raw, 'base64').toString('utf8');
            } catch (e) {
                decoded = raw;
            }
            try {
                const sessionObj = JSON.parse(decoded);
                if (sessionObj.noiseKey || sessionObj.me || sessionObj.signedIdentityKey || sessionObj.registrationId) {
                    fs.writeFileSync(path.join(sessionDir, 'creds.json'), decoded);
                    console.log('✅ Session (creds.json) restored successfully!');
                } else {
                    let written = 0;
                    for (const [filename, content] of Object.entries(sessionObj)) {
                        fs.writeFileSync(
                            path.join(sessionDir, filename),
                            typeof content === 'string' ? content : JSON.stringify(content)
                        );
                        written++;
                    }
                    console.log(`✅ Session (${written} files) restored successfully!`);
                }
            } catch (e) {
                if (decoded.includes('noiseKey') || decoded.includes('registrationId')) {
                    fs.writeFileSync(path.join(sessionDir, 'creds.json'), decoded);
                    console.log('✅ Session (raw creds) restored successfully!');
                } else {
                    console.error('❌ Session string is not valid JSON credentials.');
                }
            }
        } catch (e) {
            console.error('❌ Failed to decode session data:', e.message);
        }
    }
}

if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');

// ─── START BOT ENGINE ────────────────────────────────────────────────────────
async function startBot() {
    console.log('🤖 Initializing Baileys engine...');
    await initBaileys();

    // Restore session credentials from MongoDB or SESSION_ID
    await restoreSession();

    const hasCreds = isValidCreds(path.join(sessionDir, 'creds.json'));
    let pairingNumber = (process.env.PAIRING_NUMBER || '').replace(/[^0-9]/g, '');

    if (!hasCreds) {
        console.log('\n======================================================');
        console.log('⚡ NO SESSION DETECTED');
        console.log('======================================================');
        if (!pairingNumber && !process.stdin.isTTY) {
            console.error('❌ No SESSION_ID or PAIRING_NUMBER provided in environment variables.');
            console.log('⏳ Bot is running the health server and waiting for session configuration...');
            return;
        }
    }

    let store = null;
    if (typeof makeInMemoryStore === 'function') {
        try {
            store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });
            const storeFile = path.join(sessionDir, 'baileys_store.json');
            if (fs.existsSync(storeFile)) store.readFromFile(storeFile);
            console.log('✅ Baileys in-memory store initialised.');
        } catch (e) {
            console.warn('⚠️ Could not initialise in-memory store:', e.message);
            store = null;
        }
    }

    const { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    console.log(`🤖 Starting bot connection... WA v${version.join('.')} (isLatest: ${isLatest})`);

    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: Browsers.windows('Desktop'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        msgRetryCounterCache,
        getMessage: async (key) => {
            const cached = messageCache.get(key.id);
            if (cached) return cached.message || cached;
            if (store) {
                const storeMsg = await store.loadMessage(key.remoteJid, key.id);
                if (storeMsg?.message) return storeMsg.message;
            }
            return undefined;
        }
    });

    if (store) {
        store.bind(conn.ev);
        conn.store = store;
    }

    if (!conn.authState.creds.registered && pairingNumber) {
        setTimeout(async () => {
            try {
                const code = await conn.requestPairingCode(pairingNumber);
                console.log('\n======================================================');
                console.log(`🔑 YOUR PAIRING CODE:  \x1b[32m\x1b[1m${code}\x1b[0m`);
                console.log('👉 Open WhatsApp > Linked Devices > Link with Phone Number');
                console.log('👉 Enter the 8-character code shown above');
                console.log('======================================================\n');
            } catch (err) {
                console.error('❌ Failed to request pairing code:', err.message);
            }
        }, 3000);
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && !pairingNumber) {
            console.log('\n======================================================');
            console.log('📷 SCAN QR CODE WITH WHATSAPP:');
            qrcode.generate(qr, { small: true });
            console.log('======================================================\n');
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`⚠️ Connection closed (statusCode: ${statusCode}). Reason:`, lastDisconnect?.error?.message || 'Unknown');
            if (shouldReconnect) {
                console.log('🔄 Reconnecting in 3 seconds...');
                setTimeout(startBot, 3000);
            } else {
                console.error('❌ Bot logged out. Please re-run to link your number again.');
                process.exit(1);
            }
        } else if (connection === 'open') {
            console.log('\n======================================================');
            console.log('✅ Connected! Bot is online and active.');
            console.log('======================================================\n');

            // ── Send startup greeting & vote of thanks to the paired number ──
            if (!global.startupGreetSent) {
                global.startupGreetSent = true;
                setTimeout(async () => {
                    try {
                        const botJid = conn.user?.id ? (conn.user.id.split(':')[0] + '@s.whatsapp.net') : conn.user?.jid;
                        if (botJid) {
                            const configMod = require('./config');
                            const prefix = (typeof configMod?.getPrefix === 'function' ? configMod.getPrefix() : '.') || '.';
                            const botName = global.botName || '🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊';
                            const ownerName = global.ownerName || '🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓';

                            const startMessage = `
╭━━━〔 ✧ *BOT CONNECTED* ✧ 〕
┃ 🤖 *Bot:* ${botName}
┃ 👑 *Owner:* ${ownerName}
┃ ⚡ *Prefix:* [ ${prefix} ]
┃ 🌐 *Mode:* ${global.WORKTYPE || 'public'}
┃ 🚀 *Status:* Online & Active!
╰━━━━━━━━━━━━━━━━━━━━━━━━┈

✨ *THANK YOU FOR CHOOSING ${botName}!* ✨
_Your bot has been successfully deployed and connected to WhatsApp._

📌 *Quick Start Commands:*
• *${prefix}menu* — View all bot features
• *${prefix}ping* — Check bot response latency
• *${prefix}alive* — Check bot uptime & status
• *${prefix}owner* — Contact owner

_Enjoy the service! Powered by ${ownerName}_ 🍓`.trim();

                            await conn.sendMessage(botJid, {
                                text: startMessage,
                                contextInfo: {
                                    externalAdReply: {
                                        title: `${botName} CONNECTED`,
                                        body: `Thank you for choosing ${botName}!`,
                                        thumbnailUrl: "https://files.catbox.moe/dphztt.jpeg",
                                        sourceUrl: "https://instagram.com/syam.fun",
                                        mediaType: 1,
                                        renderLargerThumbnail: true
                                    }
                                }
                            });
                            console.log('📨 Sent startup greeting & vote of thanks to paired number:', botJid);
                        }
                    } catch (err) {
                        console.error('⚠️ Could not send startup greeting to paired number:', err.message);
                    }
                }, 2000);
            }
        }
    });

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type === 'append') return;
            if (!chatUpdate.messages || !chatUpdate.messages.length) return;

            for (const m of chatUpdate.messages) {
                if (!m || !m.message) continue;
                if (m.key.remoteJid === 'status@broadcast') continue;

                m.chat = m.key.remoteJid;
                m.isGroup = m.chat.endsWith('@g.us');
                m.sender = m.key.fromMe ? (conn.user.id || conn.user.jid) : (m.key.participant || m.key.remoteJid);
                m.senderNumber = m.sender ? m.sender.split('@')[0].split(':')[0] : '';
                m.pushName = m.pushName || 'User';

                m.reply = (text) => {
                    const opts = !m.key.fromMe ? { quoted: m } : {};
                    return conn.sendMessage(m.chat, { text: String(text) }, opts);
                };

                const message = m.message;
                const body = (
                    message?.conversation
                    || message?.extendedTextMessage?.text
                    || message?.imageMessage?.caption
                    || message?.videoMessage?.caption
                    || ''
                ).trim();

                const prefix = '.';
                if (!body.startsWith(prefix)) continue;
                const command = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();

                console.log(`📩 [INCOMING] From: ${m.senderNumber} | Command: "${command}"`);

                if (command === 'ping') {
                    await m.reply('pong! 🏓 Bot is live and running smoothly on Render.');
                }
            }
        } catch (err) {
            console.error("Handler Error:", err.message);
        }
    });
}

startBot(); 
