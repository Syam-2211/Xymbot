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

// ─── DECODE SESSION_ID IF PRESENT ───────────────────────────────────────────
const sessionDir = path.join(__dirname, 'session');
const sessionId = process.env.SESSION_ID || global.SESSION_ID;

if (sessionId && sessionId.trim()) {
    try {
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
        const raw = sessionId.replace(/^XYMBOT~/i, '').trim();
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
                console.log('✅ Session (creds.json) restored from SESSION_ID!');
            } else {
                let written = 0;
                for (const [filename, content] of Object.entries(sessionObj)) {
                    fs.writeFileSync(
                        path.join(sessionDir, filename),
                        typeof content === 'string' ? content : JSON.stringify(content)
                    );
                    written++;
                }
                console.log(`✅ Session (${written} files) restored from SESSION_ID!`);
            }
        } catch (e) {
            fs.writeFileSync(path.join(sessionDir, 'creds.json'), decoded);
            console.log('✅ Session (raw creds) restored from SESSION_ID!');
        }
    } catch (e) {
        console.error('❌ Failed to decode SESSION_ID:', e.message);
    }
}

if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');

// ─── START BOT ENGINE ────────────────────────────────────────────────────────
async function startBot() {
    console.log('🤖 Initializing Baileys engine...');
    await initBaileys();

    const hasCreds = fs.existsSync(path.join(sessionDir, 'creds.json'));
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
