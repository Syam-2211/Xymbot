const { cmd, commands } = require('../command');
const fs = require('fs');
let sharp;
try { sharp = require('sharp'); } catch (_) {}

cmd({
    pattern: "sticker",
    alias: ["s", "stic"],
    desc: global.LANG.sticker.STICKER_DESC,
    category: "converters",
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
            return reply(global.LANG.sticker.NEED_REPLY);
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

        // Apply authentic user watermark EXIF
        try {
            const { Image } = require('node-webpmux');
            const crypto = require('crypto');
            const img = new Image();
            await img.load(stickerBuffer);
            const json = {
                'sticker-pack-id': 'com.snowcorp.stickerly.android.stickercontentprovider b5e7275f-f1de-4137-961f-57becfad34f2',
                'sticker-pack-name': global.packname || '✪⃝⸸ꜛꪶ͢𝐒𝐘͔𝐀𝐌 𝐒𝐄𝐑͢ꫂꜜ™',
                'sticker-pack-publisher': global.author || '🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓',
                'emojis': ['❤️']
            };
            const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
            const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
            const exif = Buffer.concat([exifAttr, jsonBuff]);
            exif.writeUIntLE(jsonBuff.length, 14, 4);
            img.exif = exif;

            const tmpSticker = path.join(__dirname, '../tmp', `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
            await img.save(tmpSticker);
            stickerBuffer = fs.readFileSync(tmpSticker);
            fs.unlinkSync(tmpSticker);
        } catch (exifErr) {
            console.warn('Exif watermark injection skipped:', exifErr.message);
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
