let handler = async (m, { conn, args, isOwner, isAdmin }) => {
    if (!(isAdmin || isOwner)) return m.reply('❌ This command is for the Developer or Admins only.');

    let chat = global.db.data.chats[m.chat];
    let type = (args[0] || '').toLowerCase();
    
    // Default system information and status
    if (!type || type === 'info') {
        let statusMsg = `
📊 *🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 GROUP DASHBOARD*
┕━━━━━━━━━━━━━━━━━━━

🛡️ *SECURITY SETTINGS*
┠─ Anti-Delete: ${chat.antidelete ? '✅ ACTIVE' : '❌ DISABLED'}
┠─ Anti-Link: ${chat.antilink ? '✅ ACTIVE' : '❌ DISABLED'}

👋 *GREETING SETTINGS*
┠─ Welcome Msg: ${chat.welcome ? '✅ ON' : '❌ OFF'}
┠─ Goodbye Msg: ${chat.goodbye ? '✅ ON' : '❌ OFF'}

📝 *CUSTOM TEXTS*
┠─ Welcome: ${chat.sWelcome || 'Default System Text'}
┠─ Goodbye: ${chat.sGoodbye || 'Default System Text'}

┕━━━━━━━━━━━━━━━━━━━
👑 *Developer:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
📱 *Support:* wa.me/919947121619

*Usage:* .set welcome <on/off>
.set antidelete <on/off>
.set welcome-text <your message>
`.trim();
        return m.reply(statusMsg);
    }

    // Quick action to reset everything to factory defaults
    if (type === 'reset') {
        chat.welcome = true;
        chat.goodbye = true;
        chat.antidelete = false;
        chat.antilink = false;
        chat.sWelcome = '';
        chat.sGoodbye = '';
        return m.reply('♻️ All group settings have been reset to default.');
    }
};

handler.help = ['ginfo', 'reset'];
handler.tags = ['admin'];
handler.command = /^(ginfo|settings|manager)$/i;
handler.group = true;

module.exports = handler;

