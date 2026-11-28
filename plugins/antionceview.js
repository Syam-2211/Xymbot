const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

const VV_WRAPPERS = [
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage',
    'ephemeralMessage'
];
const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];

function unwrapViewOnce(msg) {
    if (!msg) return null;
    let curr = msg;
    let guard = 0;
    while (curr && guard < 10 && VV_WRAPPERS.some(k => curr[k])) {
        const key = VV_WRAPPERS.find(k => curr[k]);
        curr = curr[key]?.message || curr[key];
        guard++;
    }
    return curr;
}

async function downloadBufferFromMessage(conn, fullMessage, inner, mediaType, mQuoted) {
    // 1. Try Baileys downloadMediaMessage with reuploadRequest
    try {
        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
        const buf = await downloadMediaMessage(
            { key: mQuoted.key, message: fullMessage },
            'buffer',
            {},
            { reuploadRequest: conn.updateMediaMessage }
        );
        if (buf && buf.length > 0) return buf;
    } catch (_) {}

    // 2. Try m.quoted.download()
    try {
        const mediaPath = await mQuoted.download();
        if (mediaPath && fs.existsSync(mediaPath)) {
            const buf = fs.readFileSync(mediaPath);
            try { fs.unlinkSync(mediaPath); } catch (_) {}
            if (buf.length > 0) return buf;
        }
    } catch (_) {}

    // 3. Try downloadContentFromMessage stream
    try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const mediaObj = inner?.[mediaType];
        if (mediaObj) {
            const streamType = mediaType.replace('Message', '');
            const stream = await downloadContentFromMessage(mediaObj, streamType);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buf = Buffer.concat(chunks);
            if (buf.length > 0) return buf;
        }
    } catch (_) {}

    return null;
}

cmd({
    pattern: 'vv',
    alias: ['viewonce', 'retrieve', 'antiviewonce', 'rvo'],
    react: '🔓',
    desc: 'Download and recover a View Once message (image, video, audio, sticker, or text)',
    category: 'tools',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        if (!m.quoted) {
            return reply("⚠️ Please *reply* to a 'View Once' image, video, audio, or message with *.vv*");
        }

        const botName = global.botName || 'XYMBOT';
        const stanzaId = mek.message?.extendedTextMessage?.contextInfo?.stanzaId || m.quoted.id;
        const cachedRaw = (stanzaId && global.messageCache && global.messageCache.has(stanzaId))
            ? global.messageCache.get(stanzaId)
            : null;

        const rawQuoted = cachedRaw
            || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage
            || m.quoted.rawMessage
            || m.quoted.message;

        const inner = unwrapViewOnce(rawQuoted) || rawQuoted;
        const mediaType = Object.keys(inner || {}).find(k => MEDIA_TYPES.includes(k));
        const textContent = inner?.extendedTextMessage?.text || inner?.conversation;

        if (!mediaType && textContent) {
            return reply(`🔓 *[VIEW ONCE RECOVERED]*\n\n${textContent}\n\n> Powered by ${botName}`);
        }

        if (!mediaType) {
            return reply('❌ Could not detect any View Once media in the replied message.');
        }

        await reply('🔓 *Decrypting View Once media...*');
        const buffer = await downloadBufferFromMessage(conn, rawQuoted, inner, mediaType, m.quoted);

        if (!buffer) {
            return reply('❌ Error: Could not retrieve media. It may have expired on WhatsApp servers.');
        }

        const originalCaption = inner?.[mediaType]?.caption || '';
        const caption = (originalCaption ? `${originalCaption}\n\n` : '') + `🔓 *VIEW ONCE RECOVERED*\n> Powered by ${botName}`;

        if (mediaType === 'imageMessage') {
            await conn.sendMessage(from, { image: buffer, caption }, { quoted: mek });
        } else if (mediaType === 'videoMessage') {
            await conn.sendMessage(from, { video: buffer, caption }, { quoted: mek });
        } else if (mediaType === 'audioMessage') {
            await conn.sendMessage(from, { audio: buffer, mimetype: inner.audioMessage?.mimetype || 'audio/mp4', ptt: !!inner.audioMessage?.ptt }, { quoted: mek });
        } else if (mediaType === 'stickerMessage') {
            await conn.sendMessage(from, { sticker: buffer }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                document: buffer,
                mimetype: inner?.[mediaType]?.mimetype || 'application/octet-stream',
                fileName: inner?.[mediaType]?.fileName || 'recovered_media',
                caption
            }, { quoted: mek });
        }
    } catch (e) {
        console.error('ViewOnce Error:', e);
        reply('❌ Error: Could not retrieve media. Make sure you replied to the ViewOnce message properly.');
    }
});
