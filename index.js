const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    downloadMediaMessage
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const http = require("http");
require('./config');

// ─── HEALTH CHECK HTTP SERVER ──────────────────────────────────────────────────
// Exposes a simple /health endpoint so the platform can verify the container is alive.
const PORT = process.env.PORT || 3000;
const healthServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        bot: global.botName || 'XYMBOT',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    }));
});
healthServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Health server running on port ${PORT}`);
});

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

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: ["Syam-Bot", "Safari", "1.0.0"]
    });

    conn.ev.on('creds.update', saveCreds);

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
            console.log('📸 Scan the QR code:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Connected! Bot is online.');
            loadPlugins(); // Load plugins fresh on connect

            // Send startup message to owner
            if (global.owner && global.owner.length > 0) {
                const ownerJid = global.owner[0] + '@s.whatsapp.net';
                const startTime = Date.now();
                conn.sendMessage(ownerJid, { text: '🔄 *Testing connection latency...*' }).then(async (m) => {
                    const latency = Date.now() - startTime;
                    const totalCommands = commands.length + handlerPlugins.length;
                    const msg = `*🚀 BOT CONNECTED SUCCESSFULLY!*\n\n` +
                                `*🤖 Bot Name:* ${global.botName}\n` +
                                `*👨‍💻 Owner:* ${global.ownerName}\n` +
                                `*⚙️ Prefix:* .\n` +
                                `*📦 Total Commands:* ${totalCommands}\n` +
                                `*⚡ Latency:* ${latency}ms\n\n` +
                                `_System ready for operations!_`;
                    await conn.sendMessage(ownerJid, { text: msg });
                }).catch(() => console.log('Could not send startup message to owner.'));
            }
        }
    });

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m || !m.message) return;
            if (m.key.remoteJid === 'status@broadcast') return;

            // ── Set up core message properties ───────────────────────────────
            m.chat = m.key.remoteJid;
            m.isGroup = m.chat.endsWith('@g.us');
            m.sender = m.key.fromMe
                ? conn.user.id
                : (m.key.participant || m.key.remoteJid);
            m.senderNumber = m.sender.split('@')[0].split(':')[0];
            m.pushName = m.pushName || 'User';

            // Set m.reply so handler-style plugins can use it
            m.reply = (text) => conn.sendMessage(m.chat, { text: String(text) }, { quoted: m });

            // Detect message type
            m.type = Object.keys(m.message).find(k =>
                !['messageContextInfo', 'senderKeyDistributionMessage'].includes(k)
            ) || 'conversation';

            // Detect quoted/replied-to message
            const ctxInfo = m.message?.extendedTextMessage?.contextInfo
                || m.message?.imageMessage?.contextInfo
                || m.message?.videoMessage?.contextInfo
                || m.message?.audioMessage?.contextInfo;

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
            const body = m.message.conversation
                || m.message.extendedTextMessage?.text
                || m.message.imageMessage?.caption
                || m.message.videoMessage?.caption
                || m.message.buttonsResponseMessage?.selectedButtonId
                || m.message.templateButtonReplyMessage?.selectedId
                || m.message.listResponseMessage?.singleSelectReply?.selectedRowId
                || '';

            const prefix = '.';
            if (!body.startsWith(prefix)) return;

            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            const q = args.join(' ');

            // ── Determine ownership ───────────────────────────────────────────
            const isOwner = !!(global.owner && global.owner.includes(m.senderNumber));

            if (global.WORKTYPE === 'private' && !isOwner) return;

            // ── Determine group admin status ──────────────────────────────────
            const from = m.chat;
            const normalizeJid = (jid) => jid ? jid.split(':')[0].split('@')[0] + '@s.whatsapp.net' : jid;
            const botNumber = normalizeJid(conn.user.id);
            let groupMetadata = null, groupName = '', participants = [],
                groupAdmins = [], isBotAdmins = false, isAdmins = false;

            if (m.isGroup) {
                try {
                    groupMetadata = await conn.groupMetadata(from);
                    groupName = groupMetadata.subject;
                    participants = groupMetadata.participants;
                    groupAdmins = participants.filter(v => v.admin === 'admin' || v.admin === 'superadmin').map(v => normalizeJid(v.id));
                    isBotAdmins = groupAdmins.includes(botNumber);
                    isAdmins = groupAdmins.includes(normalizeJid(m.sender));
                } catch (_) {}
            }

            const reply = (text) => conn.sendMessage(from, { text: String(text) }, { quoted: m });

            // ── Run handler-style plugins ─────────────────────────────────────
            for (const plugin of handlerPlugins) {
                try {
                    const match = plugin.command instanceof RegExp
                        ? plugin.command.test(command)
                        : Array.isArray(plugin.command)
                            ? plugin.command.includes(command)
                            : plugin.command === command;

                    if (match) {
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
                try {
                    const match = cmd.pattern === command
                        || (cmd.alias && cmd.alias.includes(command));

                    if (match) {
                        const sender = m.sender;
                        const senderNumber = m.senderNumber;
                        const pushname = m.pushName;
                        const isMe = botNumber === sender;
                        const isGroup = m.isGroup;

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
                    }
                } catch (e) {
                    console.error(`CMD Plugin Error [${cmd.pattern}]:`, e.message);
                }
            }

        } catch (err) {
            console.error("Handler Error:", err.message);
        }
    });
}

startBot();
