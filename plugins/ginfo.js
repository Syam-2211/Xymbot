let handler = async (m, { conn, reply }) => {
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];
    let info = `📝 *Current Group Configuration*

┠─🛡 *Anti-Delete:* ${chat.antidelete ? '✅ Enabled' : '❌ Disabled'}
┠─🔗 *Anti-Link:* ${chat.antilink ? '✅ Enabled' : '❌ Disabled'}
┠─👋 *Welcome:* ${chat.welcome ? '✅' : '❌'}
┠─📥 *Custom Welcome:* ${chat.sWelcome || 'Default'}
┠─📤 *Goodbye:* ${chat.goodbye ? '✅' : '❌'}
┠─📤 *Custom Goodbye:* ${chat.sGoodbye || 'Default'}
┕━━━━━━━━━━━━━━━━━━━
_Use .gsettings for full dashboard_`.trim();

    reply(info);
};

handler.command = /^(ginfo)$/i;
handler.group = true;

module.exports = handler;
