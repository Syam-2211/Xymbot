let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isOwner, isBotAdmin, reply }) => {
    if (!(isAdmin || isOwner)) return reply('❌ This command is for Admins/Owner only.');
    if (!isBotAdmin) return reply('❌ I need to be an Admin to change group settings.');

    if (command === 'mute' || command === 'close') {
        await conn.groupSettingUpdate(m.chat, 'announcement');
        reply('🔇 *Group Closed.* Only admins can send messages now.');
    } else if (command === 'unmute' || command === 'open') {
        await conn.groupSettingUpdate(m.chat, 'not_announcement');
        reply('🔊 *Group Opened.* All members can send messages now.');
    }
};

handler.help = ['mute', 'unmute'];
handler.tags = ['admin'];
handler.command = /^(mute|unmute|open|close)$/i;
handler.group = true;

module.exports = handler;
