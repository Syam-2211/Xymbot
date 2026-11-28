const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

const VV_WRAPPERS = [
    "viewOnceMessage",
    "viewOnceMessageV2",
    "viewOnceMessageV2Extension",
    "documentWithCaptionMessage",
    "ephemeralMessage"
];
const MEDIA_TYPES = ["imageMessage", "videoMessage", "audioMessage", "documentMessage"];
const TEXT_TYPES = ["extendedTextMessage", "conversation"];

function unwrapViewOnce(msg) {
    if (!msg) return null;
    let curr = msg;
    while (curr && VV_WRAPPERS.some(k => curr[k])) {
        const key = VV_WRAPPERS.find(k => curr[k]);
        curr = curr[key]?.message || curr[key];
    }
    return curr;
}

cmd({
    pattern: "vv",
    alias: ["viewonce", "retrieve", "antiviewonce", "rvo"],
    react: "🔓",
    desc: "Download and recover a View Once message (image, video, audio, or text)",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!m.quoted) {
            return reply("⚠️ Please *reply* to a 'View Once' image, video, audio, or message with *.vv*");
        }

        const botName = global.botName || 'XYMBOT';
        const rawQuoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.quoted.rawMessage || m.quoted.message;
        const inner = unwrapViewOnce(rawQuoted) || m.quoted.message;

        const mediaType = Object.keys(inner || {}).find(k => MEDIA_TYPES.includes(k)) || m.quoted.type;
        const textContent = inner?.extendedTextMessage?.text || inner?.conversation || m.quoted.text;

        // If it's a text-only view once
        if (textContent && !MEDIA_TYPES.includes(mediaType)) {
            return reply(`🔓 *[VIEW ONCE RECOVERED]*\n\n${textContent}\n\n> Powered by ${botName}`);
        }

        reply("🔓 *Decrypting View Once media...*");

        let mediaPath;
        try {
            mediaPath = await m.quoted.download();
        } catch (downloadErr) {
            console.error("ViewOnce m.quoted.download failed, trying stream fallback:", downloadErr.message);
            try {
                const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                const stanzaId = mek.message?.extendedTextMessage?.contextInfo?.stanzaId;
                const cached = (stanzaId && global.messageCache && global.messageCache.has(stanzaId))
                    ? unwrapViewOnce(global.messageCache.get(stanzaId))
                    : null;
                const targetObj = (cached && cached[mediaType]) ? cached[mediaType] : inner?.[mediaType];
                if (targetObj) {
                    const streamType = mediaType.replace('Message', '');
                    const stream = await downloadContentFromMessage(targetObj, streamType);
                    const chunks = [];
                    for await (const chunk of stream) chunks.push(chunk);
                    const buf = Buffer.concat(chunks);
                    if (buf.length > 0) {
                        const ext = mediaType === 'imageMessage' ? 'jpg' : mediaType === 'videoMessage' ? 'mp4' : mediaType === 'audioMessage' ? 'ogg' : 'bin';
                        mediaPath = path.join(__dirname, `../tmp_vv_${Date.now()}.${ext}`);
                        fs.writeFileSync(mediaPath, buf);
                    }
                }
            } catch (err2) {
                console.error("ViewOnce stream fallback also failed:", err2.message);
            }
        }

        if (mediaPath && fs.existsSync(mediaPath)) {
            const buffer = fs.readFileSync(mediaPath);
            const originalCaption = inner?.[mediaType]?.caption || '';
            const caption = (originalCaption ? `${originalCaption}\n\n` : '') + `🔓 *VIEW ONCE RECOVERED*\n> Powered by ${botName}`;

            if (mediaType === 'imageMessage' || mediaPath.endsWith('.jpg') || mediaPath.endsWith('.png')) {
                await conn.sendMessage(from, {
                    image: buffer,
                    caption: caption
                }, { quoted: mek });
            } else if (mediaType === 'videoMessage' || mediaPath.endsWith('.mp4')) {
                await conn.sendMessage(from, {
                    video: buffer,
                    caption: caption
                }, { quoted: mek });
            } else if (mediaType === 'audioMessage' || mediaPath.endsWith('.ogg') || mediaPath.endsWith('.mp3')) {
                await conn.sendMessage(from, {
                    audio: buffer,
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    document: buffer,
                    mimetype: inner?.[mediaType]?.mimetype || "application/octet-stream",
                    fileName: inner?.[mediaType]?.fileName || "recovered_media",
                    caption: caption
                }, { quoted: mek });
            }

            try { fs.unlinkSync(mediaPath); } catch (_) {}
        } else {
            reply("❌ Error: Could not retrieve media. The View Once media may have already expired or been opened on WhatsApp servers.");
        }

    } catch (e) {
        console.error("ViewOnce Error:", e);
        reply("❌ Error: Could not retrieve media. Make sure you replied to the ViewOnce message properly.");
    }
});

module.exports = {
    unwrapViewOnce
};
