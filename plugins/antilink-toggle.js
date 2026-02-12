let handler = async (m, { conn, args, isAdmin, isROwner }) => {
    if (!(isAdmin || isROwner)) return m.reply('This command is only for Admins or the Owner! 🔐');
    if (!args[0]) return m.reply('Please use: *.antilink on* or *.antilink off*');

    let chat = global.db.data.chats[m.chat]; // Assuming you use a database like lowdb
    
    if (args[0] === 'on') {
        chat.antilink = true;
        m.reply('✅ Anti-Link has been enabled for this group.');
    } else if (args[0] === 'off') {
        chat.antilink = false;
        m.reply('❌ Anti-Link has been disabled for this group.');
    } else {
        m.reply('Invalid option. Use *on* or *off*.');
    }
};

handler.help = ['antilink <on/off>'];
handler.tags = ['admin'];
handler.command = /^(antilink)$/i;
handler.group = true;

module.exports = handler;

