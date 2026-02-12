const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');

cmd({
    pattern: "menu",
    react: "🦅", 
    desc: "Main Menu",
    category: "main",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // --- EDIT YOUR DETAILS HERE ---
        const botName = "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊";     // <--- Change this
        const ownerName = "🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓";       // <--- Change this
        const version = "9.9.9";

        let menu = `
╔═══════ ✧ *${botName}* ✧ ═══════╗
║ *Owner* : ${ownerName}
║ *Version* : ${version}
╚═══════════════════════════════════╝

✨ *Hello ${pushname}!* Here are my commands:

🌟 *DOWNLOADS*
│ .tiktok
│ .facebook
│ .instagram

🌟 *GROUPS*
│ .kick
│ .add
│ .promote

🤖 *AI TOOLS*
│ .gpt
│ .gemini

Reply with a command to use it!
`;

        await conn.sendMessage(from, { 
            image: { url: "https://files.catbox.moe/nbn8w8.jpeg" }, // <--- Put your image link here
            caption: menu 
        }, { quoted: mek });

    } catch (e) {
        reply('*Error:* ' + e);
        console.log(e);
    }
});
