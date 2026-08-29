const { cmd } = require('../command');

cmd({
    pattern: "owner",
    alias: ["creator", "donate"],
    react: "👑",
    desc: "Get owner details",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        // Fetch from global config so it stays updated
        const ownerNumber = (global.owner && global.owner[0]) ? global.owner[0] : '919947121619'; 
        const ownerName = global.ownerName || '🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓'; 
        
        // VCard Details
        const vcard = 'BEGIN:VCARD\n' +
                    'VERSION:3.0\n' +
                    `FN:${ownerName}\n` +
                    `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n` +
                    'END:VCARD';

        // Send the VCard contact first
        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: mek });
        
        // Send the info text separately (Baileys cannot reliably send contacts + text + adReply in one block)
        let ownerMsg = `
👑 *OWNER & DEVELOPER* 👑
┠─👤 *Name:* ${ownerName}
┠─🤖 *Bot:* ${global.botName || '🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊'}
┕━━━━━━━━━━━━━━━━━━━

✨ *DONATE / SUPPORT* ✨
If you'd like to support the project, please reach out or follow me here:
┠─📸 *Instagram:* instagram.com/_mr.fro_ud_
┠─🐙 *GitHub:* github.com/143syam
┠─💬 *WhatsApp:* wa.me/${ownerNumber}
┕━━━━━━━━━━━━━━━━━━━

_Thank you for using my bot!_ ❤️
`.trim();

        await conn.sendMessage(from, { 
            text: ownerMsg,
            contextInfo: {
                externalAdReply: {
                    title: `Contact & Support: ${ownerName}`,
                    body: `${global.botName} Official Developer`,
                    thumbnailUrl: 'https://files.catbox.moe/nbn8w8.jpeg',
                    sourceUrl: `https://wa.me/${ownerNumber}`,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            }
        }, { quoted: mek });
    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});
