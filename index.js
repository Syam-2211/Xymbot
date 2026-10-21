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
    // ─── LICENSE KEY VERIFICATION (WITH SESSION LOCK) ─────────────────────────
    const licenseKey = (global.LICENSE_KEY || process.env.LICENSE_KEY || '').trim();
    const rawSessionId = (process.env.SESSION_ID || global.SESSION_ID || '').trim();

    if (licenseKey) {
        const licenseServer = (process.env.LICENSE_SERVER_URL || 'https://xymbot-pairing.onrender.com').replace(/\/+$/, '');
        const maxRetries = 3;
        let licenseVerified = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔍 Verifying License Key (Attempt ${attempt}/${maxRetries})...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);

                // Pass session name along with key to bind 1 license to 1 bot session
                const verifyUrl = `${licenseServer}/api/verify-license?key=${encodeURIComponent(licenseKey)}&session=${encodeURIComponent(rawSessionId)}`;

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

        if (!pairingNumber && !process.stdin.isTTY) {
            console.error('❌ No SESSION_ID or PAIRING_NUMBER provided.');
            console.error('   → Visit https://xymbot-pairing.onrender.com to get your Session ID.');
            console.error('   → Then set SESSION_ID in your Render environment variables and redeploy.');
            console.log('⏳ Bot will wait for SESSION_ID to be set...');
            return;
        }

        if (!pairingNumber && process.stdin.isTTY) {
            const readline = require('readline');
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            pairingNumber = await new Promise((resolve) => {
                rl.question(
                    '📱 Enter your WhatsApp Business number with country code (e.g. 919876543210)\n👉 Press ENTER to skip: ',
                    (ans) => { rl.close(); resolve(ans.trim().replace(/[^0-9]/g, '')); }
                );
            });
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
                console.log('👉 Open WhatsApp Business > Linked Devices > Link with Phone Number');
                console.log('👉 Enter the 8-character code shown above');
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
        const { connection, lastDisconnect, qr } = update;
        if (qr && !pairingNumber) {
            console.log('\n======================================================');
            console.log('📷 SCAN QR CODE WITH WHATSAPP BUSINESS:');
            qrcode.generate(qr, { small: true });
            console.log('👉 Open WhatsApp Business > Linked Devices > Link a Device');
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

                if (m.key.fromMe && m.key.remoteJid?.endsWith('@lid')) continue;

                let message = m.message;
                while (
                    message?.ephemeralMessage?.message ||
                    message?.viewOnceMessage?.message ||
                    message?.viewOnceMessageV2?.message ||
                    message?.documentWithCaptionMessage?.message ||
                    message?.editedMessage?.message?.protocolMessage?.editedMessage
                ) {
                    message = (
                        message?.ephemeralMessage?.message ||
                        message?.viewOnceMessage?.message ||
                        message?.viewOnceMessageV2?.message ||
                        message?.documentWithCaptionMessage?.message ||
                        message?.editedMessage?.message?.protocolMessage?.editedMessage
                    );
                }

                m.chat = m.key.remoteJid;
                m.isGroup = m.chat.endsWith('@g.us');
                m.sender = m.key.fromMe
                    ? (conn.user.id || conn.user.jid)
                    : (m.key.participant || m.key.remoteJid);
                m.senderNumber = m.sender ? m.sender.split('@')[0].split(':')[0] : '';
                m.pushName = m.pushName || 'User';

                m.reply = (text) => {
                    const opts = !m.key.fromMe ? { quoted: m } : {};
                    return conn.sendMessage(m.chat, { text: String(text) }, opts);
                };

                m.type = Object.keys(message).find(k =>
                    !['messageContextInfo', 'senderKeyDistributionMessage'].includes(k)
                ) || 'conversation';

                const ctxInfo = message?.extendedTextMessage?.contextInfo
                    || message?.imageMessage?.contextInfo
                    || message?.videoMessage?.contextInfo
                    || message?.audioMessage?.contextInfo;

                if (ctxInfo?.quotedMessage) {
                    const qType = Object.keys(ctxInfo.quotedMessage)
                        .find(k => !['messageContextInfo'].includes(k));
                    m.quoted = {
                        type: qType,
                        message: ctxInfo.quotedMessage,
                        key: {
                            id: ctxInfo.stanzaId,
                            remoteJid: m.chat,
                            fromMe: false,
                            participant: ctxInfo.participant
                        }
                    };
                    m.quoted.download = () => conn.downloadAndSaveMediaMessage({
                        key: m.quoted.key,
                        message: ctxInfo.quotedMessage
                    });
                } else {
                    m.quoted = null;
                }

                const body = (
                    message?.conversation
                    || message?.extendedTextMessage?.text
                    || message?.imageMessage?.caption
                    || message?.videoMessage?.caption
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
                    continue;
                }
                const q = args.join(' ');

                if (!m.key.fromMe) {
                    conn.readMessages([m.key]).catch(() => { });
                }

                const normalizeJid = (jid) => jid ? jid.split(':')[0].split('@')[0] + '@s.whatsapp.net' : jid;
                const botJid = normalizeJid(conn.user.id);
                const botNumber = conn.user.id ? conn.user.id.split(':')[0].split('@')[0] : '';

                const isFromMe = m.key.fromMe === true;
                const isPairedUser = m.senderNumber === botNumber || normalizeJid(m.sender) === botJid;
                const isConfigOwner = Array.isArray(global.owner) && global.owner.includes(m.senderNumber);
                const isOwner = isFromMe || isPairedUser || isConfigOwner;

                const now = Date.now();
                if (!isOwner && !m.isPollVote) {
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

                if (global.WORKTYPE === 'private' && !isOwner) {
                    if (isCmd && command) console.log(`🔒 Command '${command}' ignored: Bot is in PRIVATE mode.`);
                    continue;
                }
                if (global.WORKTYPE === 'sudo' && !isOwner && !isSudo) {
                    if (isCmd && command) console.log(`👑 Command '${command}' ignored: Bot is in SUDO mode.`);
                    continue;
                }

                const from = m.chat;
                let groupMetadata = null, groupName = '', participants = [],
                    groupAdmins = [], isBotAdmins = false, isAdmins = isOwner;

                if (m.isGroup && (isCmd || isOwner)) {
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

                const reply = async (text) => {
                    const textStr = String(text);
                    const res = await conn.sendMessage(from, { text: textStr }, { quoted: m });
                    if (textStr.toLowerCase().includes('error')) {
                        try {
                            const fs = require('fs');
                            const path = require('path');
                            const errorAudio = fs.readFileSync(path.join(__dirname, 'assets/audio/error.mp3'));
                            await conn.sendMessage(from, { audio: errorAudio, mimetype: 'audio/mpeg', ptt: false, id3Tagged: true }, { quoted: m });
                        } catch (e) {
                            console.error('Failed to send error audio:', e);
                        }
                    }
                    return res;
                };

                const isBlockedChat = global.blockedChats && global.blockedChats.includes(from);
                let isExactCommandMatch = false;

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
                            console.log(`⚡ Executing cmd plugin: ${cmd.pattern}`);
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
            }

        } catch (err) {
            console.error("Handler Error:", err.message);
        }
    });
}

startBot();