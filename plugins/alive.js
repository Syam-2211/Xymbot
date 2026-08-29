let handler = async (m, { conn, usedPrefix }) => {
    let name = m.pushName || 'User';
    let runtime = process.uptime();
    let uptime = clockString(runtime);

    let message = `
╭━━━〔 ✧ *BOT ALIVE* ✧ 〕━━━┈
┃ 👤 *Hello, ${name}!* 👋
┃ 🤖 *Bot Name:* 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊
┃ 👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
┃ 🛡️ *Status:* Online & Protected
┃ ⏳ *Uptime:* ${uptime}
╰━━━━━━━━━━━━━━━━━━━━━━━━┈

  _✨ Type ${usedPrefix}menu to see my features! ✨_`.trim();

    await conn.sendMessage(m.chat, {
        text: message,
        contextInfo: {
            externalAdReply: {
                title: "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 IS ALIVE",
                body: "Developed by 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓",
                thumbnailUrl: "https://files.catbox.moe/dphztt.jpeg",
                sourceUrl: "https://instagram.com/syam.fun",
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

