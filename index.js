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
        del(k) { this._cache.delete(k); }
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

// Message retry counter cache — required for Baileys to decrypt incoming messages
const msgRetryCounterCache = new NodeCache();
// Anti-spam & burst protection caches
const userCooldowns = new Map();
const userCommandHistory = new Map();
const spellingAudioCooldowns = new Map();
// Manual message cache so Baileys can re-decrypt messages without makeInMemoryStore
const messageCache = new Map();

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
const cmdAudioFile = path.join(__dirname, 'database/cmdaudio.json');
if (fs.existsSync(cmdAudioFile)) {
    try {
        const rawAudios = JSON.parse(fs.readFileSync(cmdAudioFile, 'utf8'));
        for (const [cmdKey, relOrAbs] of Object.entries(rawAudios)) {
            const filename = path.basename(relOrAbs);
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

    // ── Check if Session Exists ───────────────────────────────────────────────
    const hasCreds = fs.existsSync(path.join(sessionDir, 'creds.json'));
    let pairingNumber = (process.env.PAIRING_NUMBER || '').replace(/[^0-9]/g, '');

    if (!hasCreds) {
        console.log('\n======================================================');
        console.log('⚡ NO SESSION DETECTED');
        console.log('======================================================');
        console.log('❌ No SESSION_ID found.');
        console.log('   → Please generate your Session ID from your pairing site.');
        console.log('   → Then set SESSION_ID in your Render environment variables and redeploy.');
        console.log('======================================================\n');
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
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

                if (jid && !jid.includes('status@broadcast')) {
                    const isAudio = content?.audio || content?.ptt;
                    const presenceType = isAudio ? 'recording' : 'composing';
                    await conn.sendPresenceUpdate(presenceType, jid).catch(() => { });

                    const humanDelay = Math.floor(Math.random() * 500) + 400;
                    await sleep(humanDelay);
                }

                const result = await originalSendMessage(jid, content, options);

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

                if (jid && !jid.includes('status@broadcast')) {
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
        const rawMsg = msgObj.message || msgObj;
        const msgType = Object.keys(rawMsg).find(k =>
            !['messageContextInfo', 'senderKeyDistributionMessage'].includes(k)
        );
        const ext = msgType === 'imageMessage' ? 'jpg'
            : msgType === 'videoMessage' ? 'mp4'
                : msgType === 'audioMessage' ? 'ogg'
                    : 'bin';

        const buffer = await downloadMediaMessage(
            { key: msgObj.key || {}, message: rawMsg },
            'buffer',
            {},
            { logger: pino({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage }
        );
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
      