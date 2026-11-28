let makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    Browsers,
    downloadMediaMessage,
    downloadContentFromMessage,
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
    downloadContentFromMessage = baileys.downloadContentFromMessage;
    getAggregateVotesInPollMessage = baileys.getAggregateVotesInPollMessage;
    makeInMemoryStore = baileys.makeInMemoryStore;
}
const pino = require("pino");
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

require('./config');
const { loadGroupSettings, saveGroupSettings, getChatSettings } = require('./lib/groupDb');
loadGroupSettings();

// Message retry counter cache — required for Baileys to decrypt incoming messages
const msgRetryCounterCache = new NodeCache();
// Anti-spam & burst protection caches
const userCooldowns = new Map();
const userCommandHistory = new Map();
const spellingAudioCooldowns = new Map();
// Manual message cache so Baileys can re-decrypt messages without makeInMemoryStore
const messageCache = new Map();
global.messageCache = messageCache;

// ─── PERSISTENT POLL CREATION CACHE ─────────────────────────────────────────
const pollCacheFile = path.join(__dirname, 'session/poll_cache.json');
let pollCache = {};
if (fs.existsSync(pollCacheFile)) {
    try {
        const raw = JSON.parse(fs.readFileSync(pollCacheFile, 'utf8'));
        function reviveBuffers(obj) {
            if (!obj || typeof obj !== 'object') return obj;
            if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
                return Buffer.from(obj.data);
            }
            for (const k of Object.keys(obj)) {
                obj[k] = reviveBuffers(obj[k]);
            }
            return obj;
        }
        pollCache = reviveBuffers(raw) || {};
        for (const [id, msg] of Object.entries(pollCache)) {
            messageCache.set(id, msg);
        }
        console.log(`📋 Loaded ${Object.keys(pollCache).length} cached poll creation messages.`);
    } catch (e) {
        console.warn('⚠️ Failed to load poll_cache.json:', e.message);
    }
}

function savePollCache(id, message) {
    try {
        pollCache[id] = message;
        const keys = Object.keys(pollCache);
        if (keys.length > 100) {
            delete pollCache[keys[0]];
        }
        const sessionFolder = path.join(__dirname, 'session');
        if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });
        fs.writeFileSync(pollCacheFile, JSON.stringify(pollCache));
    } catch (err) {
        console.error('Failed to save poll_cache.json:', err.message);
    }
}

// ─── CLOUD HEALTH SERVER (Required for Render free Web Service) ──────────────
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;
app.get('/', (req, res) => res.send(`🤖 ${global.botName || 'Xymbot'} is running 24/7 online!`));
app.get('/health', (req, res) => res.json({ status: 'ok', bot: global.botName, uptime: process.uptime() }));
app.listen(PORT, () => console.log(`🌐 Cloud health server listening on port ${PORT}`));

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

global.blockedChats = [];
const blockedChatsFile = path.join(__dirname, 'database/blocked_chats.json');
if (fs.existsSync(blockedChatsFile)) {
    try {
        global.blockedChats = JSON.parse(fs.readFileSync(blockedChatsFile, 'utf8'));
    } catch (e) {
        console.error('Failed to parse blocked_chats.json:', e);
    }
}

if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');

global.cmdAudio = {};
const botConfigFile = path.join(__dirname, 'database/botconfig.json');
if (fs.existsSync(botConfigFile)) {
    try {
        const savedCfg = JSON.parse(fs.readFileSync(botConfigFile, 'utf8'));
        if (savedCfg.PREFIX !== undefined) global.PREFIX = savedCfg.PREFIX;
        if (savedCfg.botName) global.botName = savedCfg.botName;
        if (savedCfg.ownerName) global.ownerName = savedCfg.ownerName;
        if (Array.isArray(savedCfg.owner) && savedCfg.owner.length) global.owner = savedCfg.owner;
        if (savedCfg.WORKTYPE) global.WORKTYPE = savedCfg.WORKTYPE;
        if (savedCfg.packname) global.packname = savedCfg.packname;
        if (Array.isArray(savedCfg.sudo)) global.sudo = savedCfg.sudo;
        if (Array.isArray(savedCfg.everyCmds)) global.everyCmds = savedCfg.everyCmds;
        if (typeof savedCfg.cmdAudioEnabled === 'boolean') global.cmdAudioEnabled = savedCfg.cmdAudioEnabled;
        if (Array.isArray(savedCfg.cmdAudioDisabled)) global.cmdAudioDisabled = savedCfg.cmdAudioDisabled;
        console.log(`💾 [BotConfig] Restored saved config (Prefix: '${global.PREFIX}', Mode: ${global.WORKTYPE})`);
    } catch (e) {
        console.error('Failed to parse botconfig.json:', e);
    }
}
const cmdAudioFile = path.join(__dirname, 'database/cmdaudio.json');
if (fs.existsSync(cmdAudioFile)) {
    try {
        const rawAudios = JSON.parse(fs.readFileSync(cmdAudioFile, 'utf8'));
        for (const [cmdKey, relOrAbs] of Object.entries(rawAudios)) {
            const filename = relOrAbs.split(/[/\\]/).pop();
            const resolvedPath = path.join(__dirname, 'database', 'cmdaudio', filename);
            if (fs.existsSync(resolvedPath)) {
                global.cmdAudio[cmdKey] = resolvedPath;
                console.log(`  🎵 [CmdAudio] '${cmdKey}' -> ${resolvedPath}`);
            } else {
                console.warn(`  ⚠️ [CmdAudio] '${cmdKey}' file NOT FOUND: ${resolvedPath}`);
            }
        }
        console.log(`🎵 Loaded ${Object.keys(global.cmdAudio).length} custom command audio effects.`);
    } catch (e) {
        console.error('Failed to parse cmdaudio.json:', e);
    }
}

// ─── LOAD ALL PLUGINS ONCE AT STARTUP ─────────────────────────────────────────
const { commands } = require('./command');
const handlerPlugins = [];

function loadPlugins() {
    handlerPlugins.length = 0;
    commands.length = 0;
    const files = fs.readdirSync('./plugins').filter(f => f.endsWith('.js'));
    for (const file of files) {
        try {
            delete require.cache[require.resolve(`./plugins/${file}`)];
            const plugin = require(`./plugins/${file}`);
            if (typeof plugin === 'function' && plugin.command) {
                handlerPlugins.push(plugin);
            }
        } catch (e) {
            console.error(`Failed to load plugin ${file}:`, e.message);
        }
    }
    console.log(`✅ Loaded ${handlerPlugins.length} handler plugins, ${commands.length} cmd plugins.`);
}
loadPlugins();

async function startBot() {
    // ─── LICENSE KEY VERIFICATION (WITH SECURE SESSION HASHING) ───────────────
    const licenseKey = (global.LICENSE_KEY || process.env.LICENSE_KEY || '').trim();
    const rawSessionId = (process.env.SESSION_ID || global.SESSION_ID || '').trim();

    const crypto = require('crypto');
    const safeSessionId = rawSessionId
        ? crypto.createHash('sha256').update(rawSessionId).digest('hex').substring(0, 32)
        : 'unbound-session';

    if (licenseKey) {
        const licenseServer = (process.env.LICENSE_SERVER_URL || 'https://xymbot-pairing.onrender.com').replace(/\/+$/, '');
        const maxRetries = 3;
        let licenseVerified = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔍 Verifying License Key (Attempt ${attempt}/${maxRetries})...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);

                const verifyUrl = `${licenseServer}/api/verify-license?key=${encodeURIComponent(licenseKey)}&session=${encodeURIComponent(safeSessionId)}`;

                const response = await fetch(verifyUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                const data = await response.json();

                if (data.valid) {
                    console.log(`✅ License Key Verified! (${data.message || 'Active'})`);
                    licenseVerified = true;
                    break;
                } else {
                    console.error(`❌ License Verification Rejected: ${data.message || data.error || 'Invalid Key'}`);
                    process.exit(1);
                }
            } catch (error) {
                console.warn(`⚠️ License server attempt ${attempt} failed: ${error.message}`);
                if (attempt < maxRetries) {
                    console.log('⏳ Retrying in 5 seconds...');
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }

        if (!licenseVerified) {
            console.warn('⚠️  Could not reach license server after all retries. Proceeding in offline-verified mode.');
            console.warn('⚠️  Please ensure LICENSE_KEY is valid — bot will restart if key is revoked on next check.');
        }
    } else {
        console.log('ℹ️ No LICENSE_KEY set. Running in open mode.');
    }

    // ── Restore Session from MongoDB or Environment Variable ─────────────────
    await restoreSession();

    // ── Check if Session Exists ───────────────────────────────────────────────
    const hasCreds = isValidCreds(path.join(sessionDir, 'creds.json'));
    let pairingNumber = (process.env.PAIRING_NUMBER || '').replace(/[^0-9]/g, '');

    if (!hasCreds) {
        console.log('\n======================================================');
        console.log('⚡ NO SESSION DETECTED');
        console.log('======================================================');
        console.log('❌ No valid session credentials found.');
        console.log('   → If using a custom session name, verify MONGO_URI in your environment.');
        console.log('   → Or provide SESSION_ID in your Render environment variables and redeploy.');
        console.log('======================================================\n');
        if (!pairingNumber && !process.stdin.isTTY) {
            console.error('❌ Waiting for session configuration on Render health server...');
            return;
        }
    }

    await initBaileys();
    let store = null;
    if (typeof makeInMemoryStore === 'function') {
        try {
            store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });
            store.readFromFile('./session/baileys_store.json');
            console.log('✅ Baileys in-memory store initialised.');
        } catch (e) {
            console.warn('⚠️ Could not initialise in-memory store:', e.message);
            store = null;
        }
    } else {
        console.warn('⚠️ makeInMemoryStore not available in this Baileys version — skipping store.');
    }

    const { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('session');

    console.log(`🤖 Starting bot... WA v${version.join('.')} (isLatest: ${isLatest})`);

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
            const cached = messageCache.get(key.id) || pollCache[key.id];
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
                console.log('======================================================\n');
            } catch (err) {
                console.error('❌ Failed to request pairing code:', err.message);
            }
        }, 3000);
    }

    conn.ev.on('creds.update', saveCreds);

    // ─── ANTI-BAN SAFE OUTGOING QUEUE & HUMAN EMULATION ─────────────────────────
    const sendQueue = [];
    let isProcessingQueue = false;
    const botSentIds = new Set();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function trackBotSentId(id) {
        if (!id) return;
        botSentIds.add(id);
        if (botSentIds.size > 1000) {
            const firstId = botSentIds.values().next().value;
            botSentIds.delete(firstId);
        }
    }

    if (typeof conn.relayMessage === 'function') {
        const originalRelayMessage = conn.relayMessage.bind(conn);
        conn.relayMessage = async (jid, message, options = {}) => {
            if (options?.messageId) trackBotSentId(options.messageId);
            const res = await originalRelayMessage(jid, message, options);
            if (typeof res === 'string') trackBotSentId(res);
            return res;
        };
    }

    const originalSendMessage = conn.sendMessage.bind(conn);
    conn.sendMessage = async (jid, content, options = {}) => {
        if (content && content.audio && !content.ptt && !content.id3Tagged) {
            try {
                const { tagAudio } = require('./plugins/audioUtil.js');
                let audioBuffer = content.audio;

                if (typeof audioBuffer === 'string' && fs.existsSync(audioBuffer)) {
                    audioBuffer = fs.readFileSync(audioBuffer);
                } else if (typeof audioBuffer === 'object' && audioBuffer.url && fs.existsSync(audioBuffer.url)) {
                    audioBuffer = fs.readFileSync(audioBuffer.url);
                }

                if (Buffer.isBuffer(audioBuffer)) {
                    let title = global.botName;
                    let artist = global.ownerName;
                    let thumbPath = path.join(__dirname, './assets/mention/thumb.jpg');
                    let thumbBuf = fs.existsSync(thumbPath) ? fs.readFileSync(thumbPath) : Buffer.alloc(0);

                    let taggedMp3 = await tagAudio(audioBuffer, title, artist, thumbBuf);

                    content.audio = taggedMp3;
                    content.mimetype = 'audio/mpeg';
                }
            } catch (e) {
                console.error("Failed to inject ID3 tags into outgoing audio:", e);
            }
        }

        return new Promise((resolve, reject) => {
            sendQueue.push({ jid, content, options, resolve, reject });
            processSendQueue();
        });
    };

    async function processSendQueue() {
        if (isProcessingQueue || sendQueue.length === 0) return;
        isProcessingQueue = true;

        while (sendQueue.length > 0) {
            const item = sendQueue.shift();
            try {
                const { jid, content, options, resolve } = item;

                if (jid && !jid.includes('status@broadcast') && !jid.endsWith('@newsletter')) {
                    const isAudio = content?.audio || content?.ptt;
                    const presenceType = isAudio ? 'recording' : 'composing';
                    await conn.sendPresenceUpdate(presenceType, jid).catch(() => { });

                    const humanDelay = Math.floor(Math.random() * 500) + 400;
                    await sleep(humanDelay);
                }

                const result = await originalSendMessage(jid, content, options);

                if (result?.key?.id) {
                    trackBotSentId(result.key.id);
                }

                if (result?.key?.id && result?.message) {
                    messageCache.set(result.key.id, result.message);
                    const hasPoll = result.message.pollCreationMessage || result.message.pollCreationMessageV2 || result.message.pollCreationMessageV3 || content?.poll;
                    if (hasPoll) {
                        savePollCache(result.key.id, result.message);
                    }
                    if (messageCache.size > 500) {
                        const firstKey = messageCache.keys().next().value;
                        messageCache.delete(firstKey);
                    }
                }

                if (jid && !jid.includes('status@broadcast') && !jid.endsWith('@newsletter')) {
                    conn.sendPresenceUpdate('paused', jid).catch(() => { });
                }

                await sleep(500);
                resolve(result);
            } catch (err) {
                item.reject(err);
            }
        }

        isProcessingQueue = false;
    }

    // ─── MEDIA DOWNLOAD HELPER ─────────────────────────────────────────────────
    conn.downloadAndSaveMediaMessage = async (msgObj) => {
        let rawMsg = msgObj.message || msgObj;
        // Unwrap ViewOnce, Ephemeral, DocumentWithCaption wrappers
        while (
            rawMsg?.ephemeralMessage ||
            rawMsg?.viewOnceMessage ||
            rawMsg?.viewOnceMessageV2 ||
            rawMsg?.viewOnceMessageV2Extension ||
            rawMsg?.documentWithCaptionMessage
        ) {
            rawMsg = rawMsg.ephemeralMessage?.message
                || rawMsg.viewOnceMessage?.message
                || rawMsg.viewOnceMessageV2?.message
                || rawMsg.viewOnceMessageV2Extension?.message
                || rawMsg.documentWithCaptionMessage?.message
                || rawMsg;
        }

        const msgType = Object.keys(rawMsg).find(k =>
            ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(k)
        );
        if (!msgType) {
            throw new Error(`Unsupported or missing media in message: ${Object.keys(rawMsg).join(', ')}`);
        }

        const mimetype = (rawMsg[msgType]?.mimetype || '').toLowerCase();
        const fileName = rawMsg[msgType]?.fileName || '';
        const mimeExtMap = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
            'video/mp4': 'mp4',
            'video/webm': 'webm',
            'video/quicktime': 'mov',
            'video/x-matroska': 'mkv',
            'audio/ogg': 'ogg',
            'audio/opus': 'opus',
            'audio/mpeg': 'mp3',
            'audio/mp3': 'mp3',
            'audio/mp4': 'm4a',
            'audio/aac': 'aac',
            'audio/wav': 'wav',
            'audio/x-wav': 'wav',
            'audio/flac': 'flac'
        };
        const mimeBase = mimetype.split(';')[0].trim();
        const fileExt = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
        const ext = mimeExtMap[mimeBase]
            || fileExt
            || (msgType === 'imageMessage' ? 'jpg'
                : msgType === 'videoMessage' ? 'mp4'
                    : msgType === 'audioMessage' ? 'ogg'
                        : msgType === 'stickerMessage' ? 'webp'
                            : 'bin');

        let buffer;
        try {
            buffer = await downloadMediaMessage(
                { key: msgObj.key || {}, message: rawMsg },
                'buffer',
                {},
                { logger: pino({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage }
            );
        } catch (downloadErr) {
            // Fallback: try downloadContentFromMessage directly on the media node
            if (typeof downloadContentFromMessage === 'function' && rawMsg[msgType]) {
                const streamType = msgType.replace('Message', '');
                const stream = await downloadContentFromMessage(rawMsg[msgType], streamType);
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                buffer = Buffer.concat(chunks);
            } else {
                throw downloadErr;
            }
        }
        if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true });
        const filePath = `./tmp/${Date.now()}.${ext}`;
        fs.writeFileSync(filePath, buffer);
        return filePath;
    };

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`⚠️ Connection closed (statusCode: ${statusCode}). Reason:`, lastDisconnect?.error?.message || 'Unknown');
            if (shouldReconnect) {
                console.log('🔄 Reconnecting in 3 seconds...');
                setTimeout(startBot, 3000);
            } else {
                console.error('❌ Bot logged out. Please provide a new session ID from your pairing site.');
                process.exit(1);
            }
        } else if (connection === 'open') {
            console.log('\n======================================================');
            console.log('✅ Connected! Bot is online.');
            console.log('🛡️ Anti-Ban Safeguards & Private Mode are ACTIVE.');
            console.log('======================================================\n');

            const pairedUserJid = conn.user?.id || '';
            const pairedNumber = pairedUserJid ? pairedUserJid.split(':')[0].split('@')[0] : '';
            console.log(`📱 Connected WhatsApp Account: +${pairedNumber} (JID: ${pairedUserJid})`);
            if (!Array.isArray(global.owner)) global.owner = [];
            if (pairedNumber && !global.owner.includes(pairedNumber)) {
                global.owner.push(pairedNumber);
                console.log(`👑 Paired WhatsApp account (+${pairedNumber}) registered as Bot Owner & Admin.`);
            }

            // ── Send startup greeting & vote of thanks to the paired number ──
            if (!global.startupGreetSent) {
                global.startupGreetSent = true;
                setTimeout(async () => {
                    try {
                        const botJid = conn.user?.id ? (conn.user.id.split(':')[0] + '@s.whatsapp.net') : conn.user?.jid;
                        if (botJid) {
                            const configMod = require('./config');
const { loadGroupSettings, saveGroupSettings, getChatSettings } = require('./lib/groupDb');
loadGroupSettings();
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

conn.ev.on('group-participants.update', async (update) => {
    console.log('🔔 [EVENT] group-participants.update fired:', JSON.stringify(update));
    try {
        const groupUpdateHandler = require('./plugins/groupUpdate.js');
        const m = { chat: update.id };
        try {
            m.metadata = await conn.groupMetadata(update.id);
        } catch (e) {
            console.error('Failed to fetch groupMetadata:', e);
            m.metadata = { subject: 'the group', participants: [] };
        }
        await groupUpdateHandler(m, { conn, participants: update.participants, action: update.action });
    } catch (e) {
        console.error('Group Update Error:', e);
    }
});

// ─── POLL UPDATES / VOTING HANDLER (messages.update) ──────────────────────
const processedPollVoteIds = new Set();

conn.ev.on('messages.update', async (chatUpdates) => {
    try {
        if (!Array.isArray(chatUpdates)) return;

        for (const { key, update } of chatUpdates) {
            if (!update || !update.pollUpdates || !Array.isArray(update.pollUpdates) || !update.pollUpdates.length) {
                continue;
            }

            const pollCreation = messageCache.get(key.id) || pollCache[key.id] || (store ? await store.loadMessage(key.remoteJid, key.id)?.message : null);
            if (!pollCreation) {
                console.log(`⚠️ [Poll Vote] Original poll message ${key.id} not found in cache.`);
                continue;
            }

            const rawPollMessage = pollCreation.message || pollCreation;
            let pollVotes = [];
            try {
                pollVotes = await getAggregateVotesInPollMessage({
                    message: rawPollMessage,
                    pollUpdates: update.pollUpdates
                }, conn.user?.id);
            } catch (e) {
                console.error('❌ Failed to aggregate poll votes:', e.message);
                continue;
            }

            for (const pollUpdate of update.pollUpdates) {
                if (pollUpdate.pollUpdateMessageKey?.fromMe) continue;

                const voteMsgId = pollUpdate.pollUpdateMessageKey?.id;
                if (voteMsgId && processedPollVoteIds.has(voteMsgId)) {
                    continue;
                }
                if (voteMsgId) {
                    processedPollVoteIds.add(voteMsgId);
                    if (processedPollVoteIds.size > 500) {
                        const first = processedPollVoteIds.values().next().value;
                        processedPollVoteIds.delete(first);
                    }
                }

                const voterJid = pollUpdate.pollUpdateMessageKey?.participant
                    || pollUpdate.pollUpdateMessageKey?.remoteJid
                    || key.participant
                    || key.remoteJid;
                const voterNumber = voterJid ? voterJid.split('@')[0].split(':')[0] : '';
                const chatJid = key.remoteJid || pollUpdate.pollUpdateMessageKey?.remoteJid;

                const normalizeJid = (j) => j ? j.split(':')[0].split('@')[0] + '@s.whatsapp.net' : '';
                const normVoter = normalizeJid(voterJid);

                const selectedOption = pollVotes.find(opt =>
                    Array.isArray(opt.voters) && opt.voters.some(v => normalizeJid(v) === normVoter)
                );

                if (!selectedOption || !selectedOption.name) {
                    console.log(`ℹ️ [Poll Vote] Voter ${voterNumber} unselected option or no votes found.`);
                    continue;
                }

                console.log(`🗳️ [Poll Vote] Voter: ${voterNumber} | Chat: ${chatJid} | Selected: "${selectedOption.name}"`);

                const prefix = (require('./config').getPrefix() || '.').trim();
                let commandToRun = '';

                const parenMatch = selectedOption.name.match(/\((.+?)\)/);
                if (parenMatch) {
                    commandToRun = parenMatch[1].trim();
                } else {
                    commandToRun = selectedOption.name.trim();
                }

                if (prefix && prefix !== 'none' && prefix !== 'null') {
                    if (!commandToRun.startsWith(prefix)) {
                        commandToRun = prefix + commandToRun;
                    }
                }

                const voterPushName = conn.store?.contacts?.[voterJid]?.notify
                    || conn.store?.contacts?.[voterJid]?.name
                    || voterNumber
                    || 'User';

                const fakeMsg = {
                    key: {
                        remoteJid: chatJid,
                        fromMe: false,
                        id: voteMsgId || ('POLL_' + Date.now()),
                        participant: voterJid
                    },
                    message: {
                        extendedTextMessage: {
                            text: commandToRun,
                            contextInfo: {
                                stanzaId: key.id,
                                participant: key.participant || (key.fromMe ? conn.user.id : undefined),
                                quotedMessage: rawPollMessage
                            }
                        }
                    },
                    pushName: voterPushName,
                    isPollVote: true
                };

                conn.ev.emit('messages.upsert', {
                    type: 'notify',
                    messages: [fakeMsg]
                });
            }
        }
    } catch (err) {
        console.error('❌ [messages.update] Error handling poll update:', err);
    }
});

conn.ev.on('messages.upsert', async (chatUpdate) => {
    try {
        for (const msg of chatUpdate.messages || []) {
            if (msg?.key?.id && msg.message) {
                messageCache.set(msg.key.id, msg.message);
                if (messageCache.size > 500) {
                    const firstKey = messageCache.keys().next().value;
                    messageCache.delete(firstKey);
                }
            }
        }

        if (chatUpdate.type === 'append') return;
        if (!chatUpdate.messages || !chatUpdate.messages.length) return;

        for (const m of chatUpdate.messages) {
            if (!m || !m.message) continue;
            if (m.key.remoteJid === 'status@broadcast') continue;

            // Ignore messages sent by the bot itself to prevent self-reply loops,
            // while allowing the paired user to run commands in DMs, @lid chats, groups, and channels.
            if (m.key.id && botSentIds.has(m.key.id)) continue;

            // ─── ANTI-DELETE (ALL CHATS & ALL MEDIA) ─────────────────────────────
            const protoMsg = m.message?.protocolMessage;
            if (protoMsg && protoMsg.type === 0 && protoMsg.key?.id) {
                const isGroupChat = m.key.remoteJid?.endsWith('@g.us');
                const groupChat = isGroupChat ? getChatSettings(m.key.remoteJid) : null;
                const enabled = global.antiDeleteEnabled !== false && (!isGroupChat || groupChat?.antidelete || global.antiDeleteTarget !== 'chat');
                if (enabled && !botSentIds.has(protoMsg.key.id)) {
                    const cached = messageCache.get(protoMsg.key.id);
                    if (cached) {
                        const deleter = m.key.participant || m.key.remoteJid;
                        const deleterNum = deleter.split('@')[0].split(':')[0];
                        const targetMode = global.antiDeleteTarget || 'chat';
                        const targets = new Set();
                        if (targetMode === 'chat' || targetMode === 'all') targets.add(m.key.remoteJid);
                        if (targetMode === 'owner' || targetMode === 'all') {
                            (global.owner || []).forEach(n => targets.add(`${String(n).replace(/[^0-9]/g, '')}@s.whatsapp.net`));
                        }
                        if (targetMode === 'sudo' || targetMode === 'all') {
                            (global.sudo || []).forEach(n => targets.add(`${String(n).replace(/[^0-9]/g, '')}@s.whatsapp.net`));
                        }

                        const mediaKey = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].find(k => cached[k]);
                        const deletedText = cached.conversation
                            || cached.extendedTextMessage?.text
                            || cached.imageMessage?.caption
                            || cached.videoMessage?.caption
                            || cached.documentMessage?.caption
                            || '';

                        let mediaBuf = null;
                        if (mediaKey) {
                            try {
                                mediaBuf = await downloadMediaMessage({ key: protoMsg.key, message: cached }, 'buffer', {}, { reuploadRequest: conn.updateMediaMessage });
                            } catch (_) {
                                try {
                                    const stream = await downloadContentFromMessage(cached[mediaKey], mediaKey.replace('Message', ''));
                                    const chunks = [];
                                    for await (const c of stream) chunks.push(c);
                                    mediaBuf = Buffer.concat(chunks);
                                } catch (_) {}
                            }
                        }

                        const header = `🗑️ *ANTI-DELETE RECOVERED*\n👤 *Deleted by:* @${deleterNum}`;
                        for (const tJid of targets) {
                            if (mediaBuf && mediaBuf.length > 0) {
                                const cap = deletedText ? `${header}\n💬 *Caption:* ${deletedText}` : header;
                                if (mediaKey === 'imageMessage') await conn.sendMessage(tJid, { image: mediaBuf, caption: cap, mentions: [deleter] }).catch(() => {});
                                else if (mediaKey === 'videoMessage') await conn.sendMessage(tJid, { video: mediaBuf, caption: cap, mentions: [deleter] }).catch(() => {});
                                else if (mediaKey === 'audioMessage') await conn.sendMessage(tJid, { audio: mediaBuf, mimetype: cached.audioMessage?.mimetype || 'audio/mp4', ptt: !!cached.audioMessage?.ptt }).catch(() => {});
                                else if (mediaKey === 'stickerMessage') await conn.sendMessage(tJid, { sticker: mediaBuf }).catch(() => {});
                                else await conn.sendMessage(tJid, { document: mediaBuf, mimetype: cached.documentMessage?.mimetype || 'application/octet-stream', fileName: cached.documentMessage?.fileName || 'deleted_file', caption: cap, mentions: [deleter] }).catch(() => {});
                            } else if (deletedText) {
                                await conn.sendMessage(tJid, { text: `${header}\n💬 *Message:* ${deletedText}`, mentions: [deleter] }).catch(() => {});
                            } else {
                                await conn.sendMessage(tJid, { text: `${header}\n📦 *(Deleted media/message)*`, mentions: [deleter] }).catch(() => {});
                            }
                        }
                    }
                }
                continue;
            }

            let message = m.message;
            while (
                message?.ephemeralMessage?.message ||
                message?.viewOnceMessage?.message ||
                message?.viewOnceMessageV2?.message ||
                message?.documentWithCaptionMessage?.message ||
                message?.audioStickerMessage?.message ||
                message?.lottieStickerMessage?.message ||
                message?.editedMessage?.message?.protocolMessage?.editedMessage
            ) {
                message = (
                    message?.ephemeralMessage?.message ||
                    message?.viewOnceMessage?.message ||
                    message?.viewOnceMessageV2?.message ||
                    message?.documentWithCaptionMessage?.message ||
                    message?.audioStickerMessage?.message ||
                    message?.lottieStickerMessage?.message ||
                    message?.editedMessage?.message?.protocolMessage?.editedMessage
                );
            }

            m.chat = m.key.remoteJid;
            m.isGroup = m.chat.endsWith('@g.us');
            m.isChannel = m.chat.endsWith('@newsletter');
            m.isDM = !m.isGroup && !m.isChannel;
            m.sender = m.key.fromMe
                ? (conn.user.id || conn.user.jid)
                : (m.key.participant || m.key.remoteJid);
            m.senderNumber = m.sender ? m.sender.split('@')[0].split(':')[0] : '';
            m.pushName = m.pushName || 'User';

            m.reply = (text) => {
                const opts = (!m.key.fromMe && !m.isChannel) ? { quoted: m } : {};
                return conn.sendMessage(m.chat, { text: String(text) }, opts);
            };

            m.type = Object.keys(message).find(k =>
                !['messageContextInfo', 'senderKeyDistributionMessage'].includes(k)
            ) || 'conversation';

            const ctxInfo = message?.extendedTextMessage?.contextInfo
                || message?.imageMessage?.contextInfo
                || message?.videoMessage?.contextInfo
                || message?.audioMessage?.contextInfo
                || message?.documentMessage?.contextInfo
                || message?.stickerMessage?.contextInfo;

            if (ctxInfo?.quotedMessage) {
                let quotedRaw = ctxInfo.quotedMessage;
                const isViewOnce = Boolean(
                    quotedRaw.viewOnceMessage ||
                    quotedRaw.viewOnceMessageV2 ||
                    quotedRaw.viewOnceMessageV2Extension
                );

                // Unwrap any wrappers (viewOnce, ephemeral, etc.) to get the actual media message
                while (
                    quotedRaw?.ephemeralMessage ||
                    quotedRaw?.viewOnceMessage ||
                    quotedRaw?.viewOnceMessageV2 ||
                    quotedRaw?.viewOnceMessageV2Extension ||
                    quotedRaw?.documentWithCaptionMessage
                ) {
                    quotedRaw = quotedRaw.ephemeralMessage?.message
                        || quotedRaw.viewOnceMessage?.message
                        || quotedRaw.viewOnceMessageV2?.message
                        || quotedRaw.viewOnceMessageV2Extension?.message
                        || quotedRaw.documentWithCaptionMessage?.message
                        || quotedRaw;
                }

                const qType = Object.keys(quotedRaw)
                    .find(k => !['messageContextInfo', 'senderKeyDistributionMessage'].includes(k)) || Object.keys(ctxInfo.quotedMessage)[0];

                const qText = quotedRaw?.extendedTextMessage?.text
                    || quotedRaw?.conversation
                    || quotedRaw[qType]?.caption
                    || '';

                m.quoted = {
                    type: qType,
                    message: quotedRaw,
                    rawMessage: ctxInfo.quotedMessage,
                    isViewOnce: isViewOnce || Boolean(quotedRaw[qType]?.viewOnce),
                    text: qText,
                    key: {
                        id: ctxInfo.stanzaId,
                        remoteJid: m.chat,
                        fromMe: false,
                        participant: ctxInfo.participant
                    }
                };
                m.quoted.download = () => {
                    const originalMsg = messageCache.get(ctxInfo.stanzaId);
                    return conn.downloadAndSaveMediaMessage({
                        key: m.quoted.key,
                        message: originalMsg || quotedRaw
                    });
                };
            } else {
                m.quoted = null;
            }

            const body = (
                message?.conversation
                || message?.extendedTextMessage?.text
                || message?.imageMessage?.caption
                || message?.videoMessage?.caption
                || message?.documentMessage?.caption
                || message?.buttonsResponseMessage?.selectedButtonId
                || message?.templateButtonReplyMessage?.selectedId
                || message?.listResponseMessage?.singleSelectReply?.selectedRowId
                || message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
                || ''
            ).trim();

            const prefix = (require('./config').getPrefix() || '.').trim();
            let isCmd = false;
            let command = '';
            let args = [];

            if (prefix && body.startsWith(prefix)) {
                isCmd = true;
                command = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();
                args = body.slice(prefix.length).trim().split(/ +/).slice(1);
            } else if (!prefix || prefix === 'none' || prefix === 'null') {
                isCmd = true;
                command = body.split(/ +/).shift().toLowerCase();
                args = body.split(/ +/).slice(1);
            } else {
                isCmd = false;
                command = '';
                args = body ? body.split(/ +/) : [];
            }
            const q = args.join(' ');

            const normalizeJid = (jid) => jid ? jid.split(':')[0].split('@')[0] + '@s.whatsapp.net' : jid;
            const botJid = normalizeJid(conn.user.id);
            const botNumber = conn.user.id ? conn.user.id.split(':')[0].split('@')[0] : '';
            const botLidNumber = conn.user?.lid ? conn.user.lid.split(':')[0].split('@')[0] : '';

            const isFromMe = m.key.fromMe === true;
            const isPairedUser = m.senderNumber === botNumber
                || (botLidNumber && m.senderNumber === botLidNumber)
                || normalizeJid(m.sender) === botJid;
            const isConfigOwner = Array.isArray(global.owner) && global.owner.includes(m.senderNumber);
            const isOwner = isFromMe || isPairedUser || isConfigOwner;

            const now = Date.now();
            if (!isOwner && !m.isPollVote && isCmd) {
                const last = userCooldowns.get(m.sender) || 0;
                if (now - last < 2000) {
                    console.log(`⏱️ Anti-Spam: ignoring command from ${m.sender}`);
                    continue;
                }
                userCooldowns.set(m.sender, now);

                let history = userCommandHistory.get(m.sender) || [];
                history = history.filter(ts => now - ts < 10000);
                if (history.length >= 4) {
                    console.log(`🛡️ Anti-Ban Shield: User ${m.sender} exceeded burst limit (4 cmds/10s). Ignoring.`);
                    continue;
                }
                history.push(now);
                userCommandHistory.set(m.sender, history);
            }
            const isSudo = Array.isArray(global.sudo) && global.sudo.includes(m.senderNumber);

            console.log(`📩 [INCOMING] From: ${m.senderNumber || m.chat} | Text: "${body}" | isCmd: ${isCmd} | command: "${command}" | isOwner: ${isOwner}`);

            const isEveryPublic = Array.isArray(global.everyCmds) && global.everyCmds.includes((command || '').toLowerCase());

            if (global.WORKTYPE === 'private' && !isOwner && !isEveryPublic && isCmd) {
                if (isCmd && command) console.log(`🔒 Command '${command}' ignored: Bot is in PRIVATE mode.`);
                continue;
            }
            if (global.WORKTYPE === 'sudo' && !isOwner && !isSudo && !isEveryPublic && isCmd) {
                if (isCmd && command) console.log(`👑 Command '${command}' ignored: Bot is in SUDO mode.`);
                continue;
            }

            const from = m.chat;
            let groupMetadata = null, groupName = '', participants = [],
                groupAdmins = [], isBotAdmins = false, isAdmins = isOwner;

            if (m.isGroup && (isCmd || isOwner || getChatSettings(from).antilink)) {
                try {
                    groupMetadata = await conn.groupMetadata(from);
                    groupName = groupMetadata?.subject || '';
                    participants = groupMetadata?.participants || [];
                    const botLidStr = conn.user.lid ? conn.user.lid.split(':')[0].split('@')[0] : '';
                    groupAdmins = participants.filter(v => v.admin === 'admin' || v.admin === 'superadmin').map(v => normalizeJid(v.id));
                    isBotAdmins = groupAdmins.some(adminJid => adminJid.startsWith(botNumber) || (botLidStr && adminJid.startsWith(botLidStr)));
                    isAdmins = isOwner || groupAdmins.includes(normalizeJid(m.sender));
                } catch (_) {
                    if (isOwner) isAdmins = true;
                }
            }

            // ─── ANTI-LINK ENFORCEMENT (GROUP) ──────────────────────────────────
            if (m.isGroup && !isAdmins && !isOwner && !m.key.fromMe && body) {
                const groupChat = getChatSettings(from);
                if (groupChat.antilink) {
                    const linkRegex = /(https?:\/\/[^\s]+|chat\.whatsapp\.com\/[A-Za-z0-9]+|wa\.me\/[^\s]+)/i;
                    if (linkRegex.test(body)) {
                        if (isBotAdmins) {
                            await conn.sendMessage(from, { delete: m.key }).catch(() => { });
                        }
                        const action = groupChat.antilinkAction || 'warn';
                        if (action === 'kick' && isBotAdmins) {
                            await conn.sendMessage(from, {
                                text: `🚫 *Anti-Link:* @${m.senderNumber} removed for sending links.`,
                                mentions: [m.sender]
                            }).catch(() => { });
                            await conn.groupParticipantsUpdate(from, [m.sender], 'remove').catch(() => { });
                        } else if (action === 'warn') {
                            if (!groupChat.warns) groupChat.warns = {};
                            groupChat.warns[m.senderNumber] = (groupChat.warns[m.senderNumber] || 0) + 1;
                            const count = groupChat.warns[m.senderNumber];
                            saveGroupSettings();
                            if (count >= 3 && isBotAdmins) {
                                groupChat.warns[m.senderNumber] = 0;
                                saveGroupSettings();
                                await conn.sendMessage(from, {
                                    text: `🚫 *Anti-Link (3/3):* @${m.senderNumber} kicked for repeated links.`,
                                    mentions: [m.sender]
                                }).catch(() => { });
                                await conn.groupParticipantsUpdate(from, [m.sender], 'remove').catch(() => { });
                            } else {
                                await conn.sendMessage(from, {
                                    text: `⚠️ *Anti-Link Warning (${count}/3):* @${m.senderNumber}, links are not allowed here.`,
                                    mentions: [m.sender]
                                }).catch(() => { });
                            }
                        } else {
                            await conn.sendMessage(from, {
                                text: `🔗 *Anti-Link:* @${m.senderNumber}, links are not allowed here.`,
                                mentions: [m.sender]
                            }).catch(() => { });
                        }
                        continue;
                    }
                }
            }

            const reply = async (text) => {
                const textStr = String(text);
                const replyOpts = !m.isChannel ? { quoted: m } : {};
                const res = await conn.sendMessage(from, { text: textStr }, replyOpts);
                if (textStr.toLowerCase().includes('error')) {
                    try {
                        const fs = require('fs');
                        const path = require('path');
                        const errorAudio = fs.readFileSync(path.join(__dirname, 'assets/audio/error.mp3'));
                        await conn.sendMessage(from, { audio: errorAudio, mimetype: 'audio/mpeg', ptt: false, id3Tagged: true }, replyOpts);
                    } catch (e) {
                        console.error('Failed to send error audio:', e);
                    }
                }
                return res;
            };

            const isBlockedChat = global.blockedChats && global.blockedChats.includes(from);
            let isExactCommandMatch = false;

            if (isCmd && command) {
                for (const plugin of handlerPlugins) {
                    if (isBlockedChat && !isOwner) continue;

                    try {
                        const match = plugin.command instanceof RegExp
                            ? plugin.command.test(command)
                            : Array.isArray(plugin.command)
                                ? plugin.command.includes(command)
                                : plugin.command === command;

                        if (match) {
                            isExactCommandMatch = true;
                            console.log(`⚡ Executing handler plugin for: ${command}`);
                            await plugin(m, {
                                conn,
                                args,
                                q,
                                body,
                                isCmd,
                                usedPrefix: prefix,
                                command,
                                isOwner,
                                isAdmin: isAdmins,
                                isBotAdmin: isBotAdmins,
                                isROwner: isOwner,
                                isGroup: m.isGroup,
                                isChannel: m.isChannel,
                                isDM: m.isDM,
                                from,
                                reply
                            });

                            if (isCmd && global.cmdAudio && !m.audioPlayed) {
                                if (global.cmdAudio[command]) {
                                    const audioFile = global.cmdAudio[command];
                                    const absAudioFile = path.isAbsolute(audioFile)
                                        ? audioFile
                                        : path.join(__dirname, audioFile);
                                    if (fs.existsSync(absAudioFile)) {
                                        try {
                                            m.audioPlayed = true;
                                            console.log(`🎵 [Audio] Playing '${command}' audio: ${absAudioFile}`);
                                            await conn.sendMessage(from, {
                                                audio: fs.readFileSync(absAudioFile),
                                                mimetype: 'audio/ogg; codecs=opus',
                                                ptt: true
                                            }, { quoted: m });
                                        } catch (err) {
                                            console.error('Failed to send handler custom audio:', err);
                                        }
                                    } else {
                                        console.warn(`⚠️ [Audio] Handler: File not found for '${command}': ${absAudioFile}`);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`Plugin Error (handler):`, e.message);
                    }
                }
            }

            for (const cmd of commands) {
                if (isBlockedChat && !isOwner) {
                    if (cmd.desc !== 'Auto-responds when bot or SUDO is mentioned') {
                        continue;
                    }
                }

                try {
                    let match = false;
                    if (isCmd && (cmd.pattern === command || (cmd.alias && cmd.alias.includes(command)))) {
                        match = true;
                        isExactCommandMatch = true;
                    } else if (cmd.on === 'text') {
                        match = true;
                    }

                    if (match) {
                        if (cmd.pattern) {
                            console.log(`⚡ Executing cmd plugin: ${cmd.pattern}`);
                            if (global.emojiReactEnabled !== false && isCmd) {
                                const reactEmoji = cmd.react || '⚡';
                                conn.sendMessage(from, { react: { text: reactEmoji, key: m.key } }).catch(() => {});
                            }
                        }
                        const sender = m.sender;
                        const senderNumber = m.senderNumber;
                        const pushname = m.pushName;
                        const isMe = isOwner || botJid === normalizeJid(sender);
                        const isGroup = m.isGroup;
                        const botLid = conn.user.lid ? conn.user.lid.split(':')[0] : '';

                        await cmd.function(conn, m, m, {
                            from,
                            quoted: m.quoted,
                            body,
                            isCmd,
                            command,
                            args,
                            q,
                            isGroup,
                            isChannel: m.isChannel,
                            isDM: m.isDM,
                            sender,
                            senderNumber,
                            botNumber2: botNumber,
                            botNumber,
                            botLid,
                            pushname,
                            isMe,
                            isOwner,
                            groupMetadata,
                            groupName,
                            participants,
                            groupAdmins,
                            isBotAdmins,
                            isAdmins,
                            reply
                        });

                        if (isCmd && global.cmdAudio && !m.audioPlayed) {
                            let matchedCmd = null;
                            if (global.cmdAudio[command]) matchedCmd = command;
                            else if (cmd.alias) {
                                for (let alias of cmd.alias) {
                                    if (global.cmdAudio[alias]) {
                                        matchedCmd = alias;
                                        break;
                                    }
                                }
                            }
                            if (!matchedCmd && typeof cmd.pattern === 'string' && global.cmdAudio[cmd.pattern]) {
                                matchedCmd = cmd.pattern;
                            }

                            if (matchedCmd) {
                                const audioFile = global.cmdAudio[matchedCmd];
                                const absAudioFile = path.isAbsolute(audioFile)
                                    ? audioFile
                                    : path.join(__dirname, audioFile);
                                if (fs.existsSync(absAudioFile)) {
                                    try {
                                        m.audioPlayed = true;
                                        console.log(`🎵 [Audio] Playing '${matchedCmd}' audio: ${absAudioFile}`);
                                        await conn.sendMessage(from, {
                                            audio: fs.readFileSync(absAudioFile),
                                            mimetype: 'audio/ogg; codecs=opus',
                                            ptt: true
                                        }, { quoted: m });
                                    } catch (e) {
                                        console.error('Failed to send custom cmd audio:', e);
                                    }
                                } else {
                                    console.warn(`⚠️ [Audio] Cmd: File not found for '${matchedCmd}': ${absAudioFile}`);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error(`CMD Plugin Error [${cmd.pattern}]:`, e.message);
                }
            }

            if (!m.key.fromMe && isCmd && isExactCommandMatch) {
                conn.readMessages([m.key]).catch(() => { });
            }
        }

    } catch (err) {
        console.error("Handler Error:", err.message);
    }
});
}

startBot();
