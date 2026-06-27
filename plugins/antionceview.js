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
        if (!m.quoted) return reply("⚠️ Please *reply* to a 'View Once' image or video with *.vv*");

        reply("🔓 *Decrypting View Once media...*");

        const mediaPath = await m.quoted.download();
        const quotedType = m.quoted.type;

        if (quotedType === 'imageMessage' || quotedType === 'viewOnceMessageV2') {
            await conn.sendMessage(from, {
                image: fs.readFileSync(mediaPath),
                caption: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *ANTI-VIEWONCE*"
            }, { quoted: mek });
        } else if (quotedType === 'videoMessage') {
            await conn.sendMessage(from, {
                video: fs.readFileSync(mediaPath),
                caption: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *ANTI-VIEWONCE*"
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                document: fs.readFileSync(mediaPath),
                mimetype: "application/octet-stream",
                caption: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *RECOVERED*"
            }, { quoted: mek });
        }

        fs.unlinkSync(mediaPath);

    } catch (e) {
        console.log(e);
        reply("❌ Error: Could not retrieve media. Make sure you replied to the ViewOnce message properly.");
    }
});
