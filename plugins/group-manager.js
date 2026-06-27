let handler = async (m, { conn, args, isAdmin, isOwner, reply }) => {
    if (!(isAdmin || isOwner)) return reply('❌ This command is for the Developer or Admins only.');

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];
    let type = (args[0] || '').toLowerCase();

    if (!type || type === 'info') {
        let statusMsg = `📊 *GROUP DASHBOARD*
━━━━━━━━━━━━━━━━━━━

🛡️ *SECURITY SETTINGS*
┠─ Anti-Delete: ${chat.antidelete ? '✅ ACTIVE' : '❌ DISABLED'}
┠─ Anti-Link: ${chat.antilink ? '✅ ACTIVE' : '❌ DISABLED'}

👋 *GREETING SETTINGS*
┠─ Welcome Msg: ${chat.welcome ? '✅ ON' : '❌ OFF'}
┠─ Goodbye Msg: ${chat.goodbye ? '✅ ON' : '❌ OFF'}

📝 *CUSTOM TEXTS*
┠─ Welcome: ${chat.sWelcome || 'Default'}
┠─ Goodbye: ${chat.sGoodbye || 'Default'}

━━━━━━━━━━━━━━━━━━━
👑 *Developer:* ${global.ownerName || 'Owner'}`.trim();
        return reply(statusMsg);
    }

    if (type === 'reset') {
        chat.welcome = true;
        chat.goodbye = true;
        chat.antidelete = false;
        chat.antilink = false;
        chat.sWelcome = '';
        chat.sGoodbye = '';
        return reply('♻️ All group settings have been reset to default.');
    }
};

handler.help = ['ginfo', 'reset'];
handler.tags = ['admin'];
handler.command = /^(ginfo|settings|manager)$/i;
handler.group = true;

module.exports = handler;
