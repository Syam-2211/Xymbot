let handler = async (m, { conn }) => {
    let chat = global.db.data.chats[m.chat];
    let info = `
📝 *Current Group Configuration*
🤖 *Bot:* 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊

┠─🛡 *Anti-Delete:* ${chat.antidelete ? '✅ Enabled' : '❌ Disabled'}
┠─👋 *Welcome:* ${chat.welcome ? '✅' : '❌'}
┠─📥 *Custom Welcome:* ${chat.sWelcome || 'Default'}
┠─📤 *Goodbye:* ${chat.goodbye ? '✅' : '❌'}
┠─📤 *Custom Goodbye:* ${chat.sGoodbye || 'Default'}
┕━━━━━━━━━━━━━━━━━━━
👑 *Dev:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
`.trim();

    await conn.reply(m.chat, info, m);
};
handler.command = /^(ginfo|status|settings)$/i;
handler.group = true;
module.exports = handler;

