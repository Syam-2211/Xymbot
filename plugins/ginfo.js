let handler = async (m, { conn, args, isAdmin, isOwner, reply }) => {
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];
    let info = `📝 *Current Group Configuration*

┠─🛡 *Anti-Delete:* ${chat.antidelete ? '✅ Enabled' : '❌ Disabled'}
┠─👋 *Welcome:* ${chat.welcome ? '✅' : '❌'}
┠─📥 *Custom Welcome:* ${chat.sWelcome || 'Default'}
┠─📤 *Goodbye:* ${chat.goodbye ? '✅' : '❌'}
┠─📤 *Custom Goodbye:* ${chat.sGoodbye || 'Default'}
┕━━━━━━━━━━━━━━━━━━━
👑 *Dev:* ${global.ownerName || 'Owner'}`.trim();

    reply(info);
};

handler.command = /^(ginfo|status|settings)$/i;
handler.group = true;

module.exports = handler;
