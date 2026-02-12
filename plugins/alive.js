let handler = async (m, { conn, usedPrefix }) => {
    let name = m.pushName || 'User';
    let runtime = process.uptime();
    let uptime = clockString(runtime);

    let message = `*Hello ${name}!* 👋\n\n` +
                  `🤖 *Bot Name:* 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊\n` +
                  `👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓\n` +
                  `🛡️ *Status:* Online & Protected\n` +
                  `⏳ *Uptime:* ${uptime}\n\n` +
                  `_Type ${usedPrefix}menu to see my full list of features!_`;

    await conn.sendMessage(m.chat, {
        text: message,
        contextInfo: {
            externalAdReply: {
                title: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 IS ALIVE",
                body: "Developed by 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓",
                thumbnailUrl: "https://files.catbox.moe/dphztt.jpeg", 
                sourceUrl: "https://instagram.com/_mr.fro_ud_",
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });
};

handler.help = ['alive'];
handler.tags = ['main'];
handler.command = /^(alive|runtime)$/i;

module.exports = handler;

function clockString(ms) {
    let h = Math.floor(ms / 3600);
    let m = Math.floor((ms % 3600) / 60);
    let s = Math.floor(ms % 60);
    return `${h}h ${m}m ${s}s`;
}

