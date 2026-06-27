const { cmd, commands } = require('../command');
const fs = require('fs');
let sharp;
try { sharp = require('sharp'); } catch (_) {}

cmd({
    pattern: "sticker",
    alias: ["s", "stic"],
    desc: "Convert image or video to sticker",
    category: "converter",
    react: "🎨",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        // Case 1: User sent image WITH .s as caption
        const isDirectImage = m.type === 'imageMessage';
        const isDirectVideo = m.type === 'videoMessage';

        // Case 2: User replied to an image/video with .s
        const isQuotedImage = m.quoted && m.quoted.type === 'imageMessage';
        const isQuotedVideo = m.quoted && m.quoted.type === 'videoMessage';

        if (!isDirectImage && !isDirectVideo && !isQuotedImage && !isQuotedVideo) {
            return reply("⚠️ *Send an image with .s as the caption,*\n*or reply to an image/video with .s*");
        }

        reply("🎨 *Creating Sticker...*");

        let mediaPath;
        if (isDirectImage || isDirectVideo) {
            mediaPath = await conn.downloadAndSaveMediaMessage({ key: m.key, message: m.message });
        } else {
            mediaPath = await m.quoted.download();
        }

        if (isDirectVideo || isQuotedVideo) {
            // Send video sticker directly (animated)
            const buffer = fs.readFileSync(mediaPath);
            await conn.sendMessage(from, {
                video: buffer,
                mimetype: 'video/mp4',
                gifPlayback: false,
                ptv: false
            }, { quoted: mek });
            try { fs.unlinkSync(mediaPath); } catch(_) {}
            return reply("✅ *Note: Video stickers require WhatsApp Business or may not animate on all devices.*");
        }

        // Convert image to WebP using sharp
        let stickerBuffer;
        const inputBuffer = fs.readFileSync(mediaPath);

        if (sharp) {
            stickerBuffer = await sharp(inputBuffer)
                .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .webp({ quality: 80 })
                .toBuffer();
        } else {
            // Fallback: send raw buffer (may not work as sticker on all devices)
            stickerBuffer = inputBuffer;
        }

        await conn.sendMessage(from, {
            sticker: stickerBuffer
        }, { quoted: mek });

        try { fs.unlinkSync(mediaPath); } catch(_) {}

    } catch (e) {
        console.log(e);
        reply("❌ Error creating sticker: " + e.message);
    }
});
