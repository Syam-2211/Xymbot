let handler = async (m, { conn, args, isAdmin, isOwner }) => {
    if (!(isAdmin || isOwner)) return m.reply('❌ Restricted to Admin/Owner');
    
    let chat = global.db.data.chats[m.chat];
    let command = args[0] ? args[0].toLowerCase() : '';
    let action = args[1] ? args[1].toLowerCase() : '';
    let text = args.slice(1).join(' ');

    switch (command) {
        case 'welcome':
            if (action === 'on' || action === 'off') {
                chat.welcome = action === 'on';
                m.reply(`✅ Welcome is now ${action.toUpperCase()}`);
            } else {
                chat.sWelcome = text;
                m.reply('✅ Custom Welcome message updated.');
            }
            break;
        case 'goodbye':
            if (action === 'on' || action === 'off') {
                chat.goodbye = action === 'on';
                m.reply(`✅ Goodbye is now ${action.toUpperCase()}`);
            } else {
                chat.sGoodbye = text;
                m.reply('✅ Custom Goodbye message updated.');
            }
            break;
        case 'antidelete':
            chat.antidelete = action === 'on';
            m.reply(`✅ Anti-Delete is now ${chat.antidelete ? 'ON' : 'OFF'}`);
            break;
        default:
            m.reply(`*⚙️ Group Settings*\nUsage:\n.set welcome <on/off>\n.set welcome <text>\n.set goodbye <on/off>\n.set antidelete <on/off>`);
    }
};
handler.help = ['set'];
handler.tags = ['admin'];
handler.command = /^(set|config)$/i;
handler.group = true;
module.exports = handler;

