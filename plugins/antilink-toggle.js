let handler = async (m, { conn, args, isAdmin, isROwner, isOwner, reply }) => {
    if (!(isAdmin || isROwner || isOwner)) return reply('This command is only for Admins or the Owner! 🔐');
    if (!args[0]) return reply('Please use: *.antilink on* or *.antilink off*');

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];

    if (args[0] === 'on') {
        chat.antilink = true;
        reply('✅ Anti-Link has been *enabled* for this group.');
    } else if (args[0] === 'off') {
        chat.antilink = false;
        reply('❌ Anti-Link has been *disabled* for this group.');
    } else {
        reply('Invalid option. Use *.antilink on* or *.antilink off*');
    }
};

handler.help = ['antilink <on/off>'];
handler.tags = ['admin'];
handler.command = /^(antilink)$/i;
handler.group = true;

module.exports = handler;
