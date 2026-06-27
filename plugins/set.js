let handler = async (m, { conn, args, isAdmin, isOwner, reply }) => {
    if (!(isAdmin || isOwner)) return reply('❌ Restricted to Admin/Owner');

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];
    let command = args[0] ? args[0].toLowerCase() : '';
    let action = args[1] ? args[1].toLowerCase() : '';
    let text = args.slice(1).join(' ');

    switch (command) {
        case 'welcome':
            if (action === 'on' || action === 'off') {
                chat.welcome = action === 'on';
                reply(`✅ Welcome is now ${action.toUpperCase()}`);
            } else {
                chat.sWelcome = text;
                reply('✅ Custom Welcome message updated.');
            }
            break;
        case 'goodbye':
            if (action === 'on' || action === 'off') {
                chat.goodbye = action === 'on';
                reply(`✅ Goodbye is now ${action.toUpperCase()}`);
            } else {
                chat.sGoodbye = text;
                reply('✅ Custom Goodbye message updated.');
            }
            break;
        case 'antidelete':
            chat.antidelete = action === 'on';
            reply(`✅ Anti-Delete is now ${chat.antidelete ? 'ON' : 'OFF'}`);
            break;
        default:
            reply(`*⚙️ Group Settings*\nUsage:\n.set welcome <on/off>\n.set welcome <text>\n.set goodbye <on/off>\n.set antidelete <on/off>`);
    }
};

handler.help = ['set'];
handler.tags = ['admin'];
handler.command = /^(set|config)$/i;
handler.group = true;

module.exports = handler;
