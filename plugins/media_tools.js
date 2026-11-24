const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 1. Convert to Video (.tovideo)
cmd({
    pattern: "tovideo",
    alias: ["tovid"],
    react: "🎬",
    desc: "Convert replied sticker/gif to MP4 video",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (!m.quoted) return reply("⚠️ Please *reply* to a sticker or animation with *.tovideo*!");
    reply("⏳ *Converting to video...*");
    try {
        const mediaPath = await m.quoted.download();
        const outputPath = path.join(__dirname, `../tmp/vid_${Date.now()}.mp4`);
        if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        exec(`ffmpeg -i "${mediaPath}" -pix_fmt yuv420p -c:v libx264 -movflags +faststart "${outputPath}" -y`, async (err) => {
            try { fs.unlinkSync(mediaPath); } catch (_) {}
            if (err) {
                // If ffmpeg direct conversion fails, try sending buffer directly
                try {
                    await conn.sendMessage(from, { video: fs.readFileSync(mediaPath), mimetype: 'video/mp4' }, { quoted: mek });
                    return;
                } catch (_) {
                    return reply("❌ Failed to convert sticker to video.");
                }
            }
            await conn.sendMessage(from, { video: fs.readFileSync(outputPath), mimetype: 'video/mp4' }, { quoted: mek });
            try { fs.unlinkSync(outputPath); } catch (_) {}
        });
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 2. Convert to GIF (.togif)
cmd({
    pattern: "togif",
    react: "🎞️",
    desc: "Convert replied sticker or video to playable GIF",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (!m.quoted) return reply("⚠️ Please *reply* to a sticker or video with *.togif*!");
    reply("⏳ *Converting to GIF...*");
    try {
        const mediaPath = await m.quoted.download();
        await conn.sendMessage(from, { video: fs.readFileSync(mediaPath), gifPlayback: true }, { quoted: mek });
        try { fs.unlinkSync(mediaPath); } catch (_) {}
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});

// 3. Convert to Voice Note (.tovn)
cmd({
    pattern: "tovn",
    alias: ["toptt", "vn"],
    react: "🎙️",
    desc: "Convert replied audio or video to WhatsApp Voice Note (PTT)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (!m.quoted) return reply("⚠️ Please *reply* to an audio or video file with *.tovn*!");
    reply("🎙️ *Converting to Voice Note...*");
    try {
        const mediaPath = await m.quoted.download();
        const outputPath = path.join(__dirname, `../tmp/vn_${Date.now()}.opus`);
        if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        exec(`ffmpeg -i "${mediaPath}" -c:a libopus -b:a 48k -vbr on "${outputPath}" -y`, async (err) => {
            if (err) {
                // Send directly as ptt
                await conn.sendMessage(from, { audio: fs.readFileSync(mediaPath), mimetype: 'audio/mp4', ptt: true }, { quoted: mek });
                try { fs.unlinkSync(mediaPath); } catch (_) {}
                return;
            }
            await conn.sendMessage(from, { audio: fs.readFileSync(outputPath), mimetype: 'audio/mp4', ptt: true }, { quoted: mek });
            try { fs.unlinkSync(mediaPath); } catch (_) {}
            try { fs.unlinkSync(outputPath); } catch (_) {}
        });
    } catch (e) {
        reply(`❌ Error: ${e.message}`);
    }
});
