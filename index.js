let makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    Browsers,
    downloadMediaMessage,
    getAggregateVotesInPollMessage;

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
}
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
require('./config');

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
if (sessionId) {
    try {
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
        const data = sessionId.replace('XYMBOT~', '').trim();
        const jsonStr = Buffer.from(data, 'base64').toString('utf8');
        try {
            const sessionObj = JSON.parse(jsonStr);
            if (sessionObj.clientID || sessionObj.me || sessionObj.noiseKey) {
                fs.writeFileSync(path.join(sessionDir, 'creds.json'), jsonStr);
            } else {
                for (const [filename, content] of Object.entries(sessionObj)) {
                    fs.writeFileSync(path.join(sessionDir, filename), typeof content === 'string' ? content : JSON.stringify(content));
                }
            }
            console.log('✅ Session successfully generated from SESSION_ID variable!');
        } catch (e) {
            fs.writeFileSync(path.join(sessionDir, 'creds.json'), Buffer.from(data, 'base64'));
            console.log('✅ Wrote raw creds.json from SESSION_ID variable!');
        }
    } catch (e) {
        console.error('❌ Failed to decode SESSION_ID:', e.message);
    }
}


// Load blocked chats globally
global.blockedChats = [];
const blockedChatsFile = path.join(__dirname, 'database/blocked_chats.json');
if (fs.existsSync(blockedChatsFile)) {
    try {
        global.blockedChats = JSON.parse(fs.readFileSync(blockedChatsFile, 'utf8'));
    } catch (e) {
        console.error('Failed to parse blocked_chats.json:', e);
    }
}

// Ensure tmp directory exists
if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');

// ─── LOAD ALL PLUGINS ONCE AT STARTUP ─────────────────────────────────────────
const { commands } = require('./command');
const handlerPlugins = []; // handler-style plugins (module.exports = async fn)

function loadPlugins() {
    handlerPlugins.length = 0; // Reset
    commands.length = 0; // Reset cmd plugins
    const files = fs.readdirSync('./plugins').filter(f => f.endsWith('.js'));
    for (const file of files) {
        try {
            // Clear cache so fresh code loads on each bot restart
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
loadPlugins(); // Load plugins on initial startup

async function startBot() {
    // ─── LICENSE KEY VERIFICATION ──────────────────────────────────────────────
    const licenseKey = (global.LICENSE_KEY || process.env.LICENSE_KEY || '').trim();
    if (!licenseKey || licenseKey.toUpperCase() === 'XYM-BOT-PAIR') {
        console.error("❌ No valid License Key provided! Please set a generated LICENSE_KEY in config.js or environment variables.");
        console.error("ℹ️ Default keys are disabled. Generate an official lifetime key from the Telegram bot.");
        process.exit(1);
    }

    // Verify license with retry loop (allows Render free instances up to 45s to wake from sleep)
    let licenseVerified = false;
    const licenseServer = (process.env.LICENSE_SERVER_URL || 'https://xymbot-pairing.onrender.com').replace(/\/+$/, '');
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 Verifying License Key (Attempt ${attempt}/${maxRetries})...`);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(`${licenseServer}/api/verify-license?key=${encodeURIComponent(licenseKey)}`, {
                signal: controller.signal
            });
            clearTimeout(timeout);
            
            const data = await response.json();
            if (data.valid) {
                console.log("✅ License Key Verified! (Lifetime)");
                licenseVerified = true;
                break;
            } else {
                console.error(`❌ Invalid License Key: ${data.error}`);
                process.exit(1);
            }
        } catch (error) {
            console.warn(`⚠️ License server contact attempt ${attempt} failed: ${error.message}`);
            if (attempt < maxRetries) {
                console.log("⏳ Render server may be waking up from sleep. Retrying in 5 seconds...");
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }

    if (!licenseVerified) {
        console.error(`❌ Failed to reach License Server after 3 attempts. Please check internet or verify ${licenseServer} is live.`);
        process.exit(1);
    }

    await initBaileys();

    const { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('session');

    console.log(`🤖 Starting bot... WA v${version.join('.')} (isLatest: ${isLatest})`);

    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: ["Xymbot", "safari", "18.2.0"],
    });

    conn.ev.on('creds.update', saveCreds);

    if (!conn.authState.creds.registered && process.env.PAIRING_NUMBER) {
        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode(process.env.PAIRING_NUMBER.replace(/[^0-9]/g, ''));
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n=========================================`);
                console.log(`🔑 YOUR PAIRING CODE IS: ${code}`);
                console.log(`=========================================\n`);
            } catch(e) {
                console.log("Failed to request pairing code:", e);
            }
        }, 3000);
    }
    // ─── AUDIO ID3 TAG INTERCEPTOR ──────────────────────────────────────────────
    const originalSendMessage = conn.sendMessage.bind(conn);
    conn.sendMessage = async (jid, content, options) => {
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

                    // Run ffmpeg tagging
                    let taggedMp3 = await tagAudio(audioBuffer, title, artist, thumbBuf);

                    // Overwrite content payload
                    content.audio = taggedMp3;
                    content.mimetype = 'audio/mpeg';
                }
            } catch (e) {
                console.error("Failed to inject ID3 tags into outgoing audio:", e);
            }
        }
        return originalSendMessage(jid, content, options);
    };

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
        if (qr) {
            console.log('\n📸 SCAN THE QR CODE BELOW TO CONNECT:\n');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`⚠️ Connection closed (statusCode: ${statusCode}). Reason:`, lastDisconnect?.error?.message || 'Unknown');
            if (shouldReconnect) {
                console.log('🔄 Reconnecting in 3 seconds...');
                setTimeout(startBot, 3000);
            }
        } else if (connection === 'open') {
            console.log('✅ Connected! Bot is online.');

            // Automatically set logged in / paired user as owner
            const pairedUserJid = conn.user.id;
            const pairedNumber = pairedUserJid ? pairedUserJid.split(':')[0].split('@')[0] : '';
            if (!Array.isArray(global.owner)) global.owner = [];
            if (pairedNumber && !global.owner.includes(pairedNumber)) {
                global.owner.push(pairedNumber);
                console.log(`👑 Paired WhatsApp account (+${pairedNumber}) registered as Bot Owner & Admin.`);
            }

            loadPlugins(); // Load plugins fresh on connect

            // Send startup message to paired owner
            const targetNumber = pairedNumber || (global.owner && global.owner[0]);
            if (targetNumber) {
                const ownerJid = targetNumber + '@s.whatsapp.net';
                const startTime = Date.now();
                conn.sendMessage(ownerJid, { text: '🔄 *Testing connection latency...*' }).then(async (m) => {
                    const latency = Date.now() - startTime;
                    const totalCommands = commands.length + handlerPlugins.length;
                    const msg = `*🚀 BOT CONNECTED SUCCESSFULLY!*\n\n` +
                        `*🤖 Bot Name:* ${global.botName}\n` +
                        `*👨‍💻 Owner:* ${global.ownerName}\n` +
                        `*📱 Paired Number:* +${pairedNumber}\n` +
                        `*⚙️ Prefix:* .\n` +
                        `*📦 Total Commands:* ${totalCommands}\n` +
                        `*⚡ Latency:* ${latency}ms\n\n` +
                        `_System ready for operations!_`;
                    await conn.sendMessage(ownerJid, { text: msg });
                }).catch(() => console.log('Could not send startup message to owner.'));
            }
        }
    });

    conn.ev.on('group-participants.update', async (update) => {
        console.log('🔔 [EVENT] group-participants.update fired:', JSON.stringify(update));
        try {
            const groupUpdateHandler = require('./plugins/groupUpdate.js');
            const m = { chat: update.id };
            // Fetch group metadata for subject and member count
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



    const botStartTime = Math.floor(Date.now() / 1000);

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (!chatUpdate.messages || !chatUpdate.messages.length) return;

            for (const m of chatUpdate.messages) {
                if (!m || !m.message) continue;
                if (m.key.remoteJid === 'status@broadcast') continue;

                // Safely convert message timestamp (handles protobuf Long object, number, or string)
                const rawTimestamp = m.messageTimestamp;
                const msgTimestamp = typeof rawTimestamp === 'object' && rawTimestamp !== null
                    ? (rawTimestamp.low || (typeof rawTimestamp.toNumber === 'function' ? rawTimestamp.toNumber() : 0))
                    : Number(rawTimestamp) || 0;

                // Ignore startup backlog messages that were sent BEFORE this bot process booted up
                if (msgTimestamp && msgTimestamp < (botStartTime - 5)) continue;

                // Unwrap any nested message wrappers (ephemeral, view-once, document-with-caption, edited)
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

                // ── Set up core message properties ───────────────────────────────
                m.chat = m.key.remoteJid;
                m.isGroup = m.chat.endsWith('@g.us');
                m.sender = m.key.fromMe
                    ? (conn.user.id || conn.user.jid)
                    : (m.key.participant || m.key.remoteJid);
                m.senderNumber = m.sender ? m.sender.split('@')[0].split(':')[0] : '';
                m.pushName = m.pushName || 'User';

                // Set m.reply so handler-style plugins can use it
                m.reply = (text) => conn.sendMessage(m.chat, { text: String(text) }, { quoted: m });

                m.type = Object.keys(message).find(k =>
                    !['messageContextInfo', 'senderKeyDistributionMessage'].includes(k)
                ) || 'conversation';

                // Detect quoted/replied-to message
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

                // ── Parse body ────────────────────────────────────────────────────
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
                const isCmd = prefix ? body.startsWith(prefix) : true;
                const command = isCmd
                    ? (prefix ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : body.split(/ +/).shift().toLowerCase())
                    : '';
                const args = isCmd
                    ? (prefix ? body.slice(prefix.length).trim().split(/ +/).slice(1) : body.split(/ +/).slice(1))
                    : body.split(/ +/);
                const q = args.join(' ');

                // ── Determine ownership (paired account, fromMe, or global.owner) ──
                const normalizeJid = (jid) => jid ? jid.split(':')[0].split('@')[0] + '@s.whatsapp.net' : jid;
                const botJid = normalizeJid(conn.user.id);
                const botNumber = conn.user.id ? conn.user.id.split(':')[0].split('@')[0] : '';

                const isFromMe = m.key.fromMe === true;
                const isPairedUser = m.senderNumber === botNumber || normalizeJid(m.sender) === botJid;
                const isConfigOwner = Array.isArray(global.owner) && global.owner.includes(m.senderNumber);
                const isOwner = isFromMe || isPairedUser || isConfigOwner;
                const isSudo = Array.isArray(global.sudo) && global.sudo.includes(m.senderNumber);

                if (isCmd && command) {
                    console.log(`⚡ [COMMAND] '.${command}' from ${m.senderNumber} (${isOwner ? 'Owner' : 'User'}) in ${m.isGroup ? 'Group ' + m.chat : 'Private Chat'}`);
                }

                if (global.WORKTYPE === 'private' && !isOwner) {
                    if (isCmd && command) console.log(`🔒 Command '.${command}' ignored: Bot is in PRIVATE mode.`);
                    continue;
                }
                if (global.WORKTYPE === 'sudo' && !isOwner && !isSudo) {
                    if (isCmd && command) console.log(`👑 Command '.${command}' ignored: Bot is in SUDO mode.`);
                    continue;
                }

                // ── Determine group admin status (Owner is automatically Admin) ────
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

                // ── Check Blocked Chat ──────────────────────────────────────────────
                const isBlockedChat = global.blockedChats && global.blockedChats.includes(from);

                let isExactCommandMatch = false;

                // ── Run handler-style plugins ─────────────────────────────────────
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
                                usedPrefix: prefix,
                                command,
                                isOwner,
                                isAdmin: isAdmins,
                                isBotAdmin: isBotAdmins,
                                isROwner: isOwner,
                                from,
                                reply
                            });
                        }
                    } catch (e) {
                        console.error(`Plugin Error (handler):`, e.message);
                    }
                }

                // ── Run cmd-style plugins ─────────────────────────────────────────
                for (const cmd of commands) {
                    if (isBlockedChat && !isOwner) {
                        // Bypass block ONLY for the mention auto-responder
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
                                isCmd: true,
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

                            // Custom Audio logic
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
                                    const fs = require('fs');
                                    if (fs.existsSync(audioFile)) {
                                        try {
                                            m.audioPlayed = true; // Prevent playing multiple times for the same message
                                            await conn.sendMessage(from, { 
                                                audio: fs.readFileSync(audioFile), 
                                                mimetype: 'audio/ogg; codecs=opus', 
                                                ptt: true 
                                            }, { quoted: m });
                                        } catch(e) {
                                            console.error('Failed to send custom cmd audio:', e);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`CMD Plugin Error [${cmd.pattern}]:`, e.message);
                    }
                }

                // Spelling Check Logic (Command Not Found)
                if (isCmd && command && !isExactCommandMatch && global.cmdAudio && global.cmdAudio['spelling']) {
                    const fs = require('fs');
                    const audioFile = global.cmdAudio['spelling'];
                    if (fs.existsSync(audioFile)) {
                        try {
                            await conn.sendMessage(from, { 
                                audio: fs.readFileSync(audioFile), 
                                mimetype: 'audio/ogg; codecs=opus', 
                                ptt: true 
                            }, { quoted: m });
                        } catch(e) {
                            console.error('Failed to send spelling audio:', e);
                        }
                    }
                }
            }

        } catch (err) {
            console.error("Handler Error:", err.message);
        }
    });
}

startBot();
