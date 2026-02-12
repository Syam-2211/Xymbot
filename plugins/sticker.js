const { cmd, commands } = require('../command');
const fs = require('fs');

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
        // 1. Check if the user sent/replied to media
        const isQuotedImage = m.quoted ? m.quoted.type === 'imageMessage' : false;
        const isQuotedVideo = m.quoted ? m.quoted.type === 'videoMessage' : false;
        const isImage = m.type === 'imageMessage';
        const isVideo = m.type === 'videoMessage';

        if (!isImage && !isQuotedImage && !isVideo && !isQuotedVideo) {
            return reply("⚠️ Please reply to an image or video with *.sticker*");
        }

        // 2. Notify User
        reply("🎨 *Creating Sticker...*");

        // 3. Download the Media
        // This function saves the file temporarily on your server/phone
        let media = await conn.downloadAndSaveMediaMessage(quoted ? quoted : m);

        // 4. Define Metadata (Your Fancy Names!)
        let packname = "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊";
        let author = "🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓";

        // 5. Send the Sticker
        await conn.sendMessage(from, { 
            sticker: { url: media }, // The bot automatically converts it!
            package: packname, 
            packname: packname, 
            author: author 
        }, { quoted: mek });

        // 6. Clean up (Delete the temp file)
        fs.unlinkSync(media);

    } catch (e) {
        console.log(e);
        reply("❌ Error: Failed to create sticker. Make sure the video is less than 10 seconds.");
    }
});

