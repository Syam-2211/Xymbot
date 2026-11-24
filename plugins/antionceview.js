const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

const VV_WRAPPERS = [
    "viewOnceMessage",
    "viewOnceMessageV2",
    "viewOnceMessageV2Extension",
];
const MEDIA_TYPES = ["imageMessage", "videoMessage", "audioMessage"];
const TEXT_TYPES = ["extendedTextMessage", "conversation"];

// returns a clean (non view once) copy of a view once message, or null. covers the wrapped
function extractViewOnce(message) {
    if (!message) return null;
    const root = message.ephemeralMessage?.message || message;
    const wrapperKey = VV_WRAPPERS.find((key) => root && root[key]);
    const inner = wrapperKey ? root[wrapperKey].message : root;
    if (!inner) return null;

    const type = [...MEDIA_TYPES, ...TEXT_TYPES].find((t) => inner[t]);
    if (!type) return null;
    if (typeof inner[type] === "string") {
        return wrapperKey ? { type, isText: true, text: inner[type], message: { [type]: inner[type] } } : null;
    }
    if (!wrapperKey && !inner[type]?.viewOnce) return null;

    const node = { ...inner[type] };
    delete node.viewOnce;
    const isText = TEXT_TYPES.includes(type);
    return { type, isText, text: isText ? node.text || "" : undefined, message: { ...inner, [type]: node } };
}

// whether the copy is usable: text present, or media that can still be downloaded
function hasViewOnceContent(vv) {
    if (!vv) return false;
    if (vv.isText) return Boolean(vv.text);
    const node = vv.message?.[vv.type];
    return Boolean(node && (node.mediaKey || node.url || node.directPath));
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
        const rawQuoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const extracted = extractViewOnce(rawQuoted);

        // If it's a text-only view once
        if (extracted && extracted.isText) {
            return reply(`🔓 *[VIEW ONCE RECOVERED]*\n\n${extracted.text}`);
        }

        // Reply status
        reply("🔓 *Decrypting View Once media...*");

        let mediaPath;
        try {
            mediaPath = await m.quoted.download();
        } catch (downloadErr) {
            console.error("ViewOnce direct download failed, trying raw download:", downloadErr.message);
        }

        const quotedType = extracted?.type || m.quoted.type;

        if (mediaPath && fs.existsSync(mediaPath)) {
            const buffer = fs.readFileSync(mediaPath);
            const caption = `🔓 *VIEW ONCE RECOVERED*\n> Powered by ${botName}`;

            if (quotedType === 'imageMessage' || quotedType === 'viewOnceMessageV2') {
                await conn.sendMessage(from, {
                    image: buffer,
                    caption: caption
                }, { quoted: mek });
            } else if (quotedType === 'videoMessage') {
                await conn.sendMessage(from, {
                    video: buffer,
                    caption: caption
                }, { quoted: mek });
            } else if (quotedType === 'audioMessage') {
                await conn.sendMessage(from, {
                    audio: buffer,
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    document: buffer,
                    mimetype: "application/octet-stream",
                    fileName: "recovered_media",
                    caption: caption
                }, { quoted: mek });
            }

            try { fs.unlinkSync(mediaPath); } catch (_) {}
        } else {
            // If download failed or already opened
            reply("❌ Error: Could not retrieve media. The View Once media might have already expired or been opened on WhatsApp servers.");
        }

    } catch (e) {
        console.error("ViewOnce Error:", e);
        reply("❌ Error: Could not retrieve media. Make sure you replied to the ViewOnce message properly.");
    }
});

module.exports = {
    extractViewOnce,
    hasViewOnceContent
};
