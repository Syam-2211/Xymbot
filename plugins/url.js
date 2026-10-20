const { cmd } = require('../command');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "url",
    alias: ["tourl", "upload", "geturl"],
    react: "🌐",
    desc: "Convert image, video, audio, sticker or document to a permanent URL",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        // Detect media from direct message or replied/quoted message
        const isQuoted = !!m.quoted;
        const msg = isQuoted ? m.quoted : m;
        const type = isQuoted ? m.quoted.type : m.type;

        const supportedTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];
        const isMedia = supportedTypes.includes(type) || ['image', 'video', 'audio', 'sticker', 'document'].includes(msg.type);

        if (!isMedia) {
            return reply(`⚠️ *Please reply to or send a media file!* (Image, Video, Audio, Sticker, Document)\n\n*Usage:* Reply to any image or video with *.url*`);
        }

        reply("⏳ *Uploading media to URL... Please wait!*");

        // Download media buffer
        let mediaPath;
        if (typeof msg.download === 'function') {
            mediaPath = await msg.download();
        } else if (typeof m.quoted?.download === 'function') {
            mediaPath = await m.quoted.download();
        }

        if (!mediaPath || !fs.existsSync(mediaPath)) {
            return reply("❌ Failed to download media from message.");
        }

        const stats = fs.statSync(mediaPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        const ext = path.extname(mediaPath) || '.bin';
        const filename = `media_${Date.now()}${ext}`;
        const fileBuffer = fs.readFileSync(mediaPath);

        let finalUrl = null;

        // 1. Primary Uploader: Catbox.moe (Direct & Permanent)
        try {
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fileBuffer, { filename });

            const catboxRes = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                timeout: 35000
            });

            if (catboxRes.data && typeof catboxRes.data === 'string' && catboxRes.data.startsWith('https://files.catbox.moe/')) {
                finalUrl = catboxRes.data.trim();
            }
        } catch (e1) {
            console.warn('[URL] Catbox upload failed, attempting fallback:', e1.message);
        }

        // 2. Fallback Uploader: tmpfiles.org
        if (!finalUrl) {
            try {
                const form2 = new FormData();
                form2.append('file', fileBuffer, { filename });

                const tmpRes = await axios.post('https://tmpfiles.org/api/v1/upload', form2, {
                    headers: form2.getHeaders(),
                    timeout: 35000
                });

                if (tmpRes.data?.data?.url) {
                    // Convert view url to direct download url: tmpfiles.org/123/name -> tmpfiles.org/dl/123/name
                    finalUrl = tmpRes.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                }
            } catch (e2) {
                console.error('[URL] tmpfiles upload failed:', e2.message);
            }
        }

        // Clean up temporary local file
        try {
            if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
        } catch (_) {}

        if (!finalUrl) {
            return reply("❌ Failed to generate URL. The file might be too large or the server is busy.");
        }

        const botName = global.botName || 'XYMBOT';
        const responseText = `
╭━━━〔 🌐 *MEDIA TO URL* 〕━━━┈
┃ 📦 *Size:* ${fileSizeMB} MB
┃ 🔗 *URL:* ${finalUrl}
╰━━━━━━━━━━━━━━━━━━━━━━━━┈
⚡ _Powered by ${botName}_
> © 𝑆𝑌𝛥𝛭.3𝐹𝛸 • 複| xʏᴀᴍツ • 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
`.trim();

        await conn.sendMessage(from, { text: responseText }, { quoted: mek });

    } catch (err) {
        console.error('URL command error:', err);
        reply("❌ An unexpected error occurred while converting media to URL.");
    }
});
