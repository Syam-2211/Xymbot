const { cmd } = require('../command');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "toimg",
    alias: ["toimage", "img"],
    react: "🖼️",
    desc: "Convert a sticker to an image.",
    category: "converters",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!quoted) return reply("⚠️ Reply to a sticker!");
        if (quoted.type !== 'stickerMessage') return reply("⚠️ Reply to a sticker!");

        reply("🖼️ *Converting...*");
        
        let mediaPath = await quoted.download();
        let outputPath = mediaPath.replace('.bin', '.jpg').replace('.webp', '.jpg');
        
        if (!outputPath.endsWith('.jpg')) outputPath += '.jpg';

        exec(`ffmpeg -i "${mediaPath}" "${outputPath}"`, async (err) => {
            if (err) {
                console.error(err);
                if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
                return reply("❌ Failed to convert sticker to image.");
            }
            
            await conn.sendMessage(from, { image: fs.readFileSync(outputPath), caption: "✅ *Converted successfully!*" }, { quoted: mek });
            
            if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });

    } catch (e) {
        console.error(e);
        reply("❌ An error occurred!");
    }
});
