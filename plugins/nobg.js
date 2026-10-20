const { cmd } = require('../command');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

cmd({
    pattern: "nobg",
    alias: ["removebg", "transparent", "rmbg"],
    react: "✂️",
    desc: "Remove the background of any photo or sticker",
    category: "converters",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const isQuoted = !!m.quoted;
        const msg = isQuoted ? m.quoted : m;
        const type = isQuoted ? m.quoted.type : m.type;

        const isImage = type === 'imageMessage' || msg.type === 'image' || type === 'stickerMessage' || msg.type === 'sticker';
        if (!isImage) {
            return reply("⚠️ *Please reply to or send a photo with `.nobg`!*");
        }

        const asSticker = args[0] === 'sticker' || args[0] === 's';

        reply("✂️ *Removing background... Please wait!*");

        // Download media file
        let mediaPath;
        if (typeof msg.download === 'function') {
            mediaPath = await msg.download();
        } else if (typeof m.quoted?.download === 'function') {
            mediaPath = await m.quoted.download();
        }

        if (!mediaPath || !fs.existsSync(mediaPath)) {
            return reply("❌ Failed to download the image.");
        }

        const fileBuffer = fs.readFileSync(mediaPath);

        // Check if user set REMOVEBG_KEY in config or env
        const apiKey = process.env.REMOVEBG_KEY || global.REMOVEBG_KEY;

        if (apiKey && apiKey !== 'your_removebg_key_here') {
            try {
                const form = new FormData();
                form.append('image_file', fileBuffer, { filename: 'image.png' });
                form.append('size', 'auto');

                const res = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
                    headers: {
                        ...form.getHeaders(),
                        'X-Api-Key': apiKey
                    },
                    responseType: 'arraybuffer',
                    timeout: 25000
                });

                if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);

                const transparentBuf = Buffer.from(res.data);

                if (asSticker) {
                    return await conn.sendMessage(from, { sticker: transparentBuf }, { quoted: mek });
                } else {
                    return await conn.sendMessage(from, {
                        image: transparentBuf,
                        caption: `✅ *Background removed successfully!*`
                    }, { quoted: mek });
                }
            } catch (err) {
                console.error('[Remove.bg API Error]:', err.response?.data ? err.response.data.toString() : err.message);
            }
        }

        // Clean up temporary local download file
        if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);

        return reply("⚠️ *RemoveBG API key required!*\n\nPlease add a free API key from https://www.remove.bg/api into `config.js` (`global.REMOVEBG_KEY = '...'`). Free accounts get 50 free removals!");

    } catch (e) {
        console.error('NoBg Command Error:', e);
        reply("❌ An unexpected error occurred while processing the image.");
    }
});
