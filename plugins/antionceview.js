const { cmd, commands } = require('../command');
const fs = require('fs');

cmd({
    pattern: "vv",
    alias: ["viewonce", "retrieve", "antiviewonce"],
    react: "🔓",
    desc: "Download/Recover a View Once message",
    category: "tools",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        // 1. Check if the user replied to a message
        if (!quoted) return reply("⚠️ Please reply to a 'View Once' image or video with *.vv*");

        // 2. Notify the user
        reply("🔓 *Decrypting View Once media...*");

        // 3. Download the media (The bot can see it even if it's hidden!)
        let media = await conn.downloadAndSaveMediaMessage(quoted);

        // 4. Send it back as NORMAL media
        // Check if it's an Image or Video to send correctly
        
        if (quoted.type === 'viewOnceMessageV2' || quoted.imageMessage || quoted.type === 'imageMessage') {
            // Send as Image
            await conn.sendMessage(from, { 
                image: { url: media }, 
                caption: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *ANTI-VIEWONCE*" 
            }, { quoted: mek });

        } else if (quoted.videoMessage || quoted.type === 'videoMessage') {
            // Send as Video
            await conn.sendMessage(from, { 
                video: { url: media }, 
                caption: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *ANTI-VIEWONCE*" 
            }, { quoted: mek });
        } else {
            // Fallback for other types
             await conn.sendMessage(from, { 
                document: { url: media }, 
                mimetype: "application/octet-stream",
                caption: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *RECOVERED*" 
            }, { quoted: mek });
        }

        // 5. Clean up
        fs.unlinkSync(media);

    } catch (e) {
        console.log(e);
        reply("❌ Error: Could not retrieve media. Make sure you replied to the ViewOnce message properly.");
    }
});

