let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isOwner, isBotAdmin, reply }) => {
    if (!(isAdmin || isOwner)) return reply('❌ This command is for Admins/Owner only.');
    if (!isBotAdmin) return reply('❌ I need to be an Admin to schedule this.');
    if (!args[0]) return reply(`Usage: ${usedPrefix + command} 1 (for 1 hour)`);

    let time = parseInt(args[0]) * 3600000;

    if (command === 'autoclose') {
        reply(`🕒 The group will be *Closed* in ${args[0]} hour(s).`);
        setTimeout(async () => {
            await conn.groupSettingUpdate(m.chat, 'announcement');
            conn.sendMessage(m.chat, { text: '🕒 *Auto-Close:* The group is now closed.' });
        }, time);
    } else if (command === 'autopen') {
        reply(`🕒 The group will be *Opened* in ${args[0]} hour(s).`);
        setTimeout(async () => {
            await conn.groupSettingUpdate(m.chat, 'not_announcement');
            conn.sendMessage(m.chat, { text: '🕒 *Auto-Open:* The group is now open.' });
        }, time);
    }
};

handler.help = ['autoclose', 'autopen'];
handler.tags = ['admin'];
handler.command = /^(autoclose|autopen)$/i;
handler.group = true;

module.exports = handler;
