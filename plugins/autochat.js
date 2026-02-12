let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isOwner, isBotAdmin }) => {
    if (!(isAdmin || isOwner)) return m.reply('❌ This command is for Admins/Owner only.');
    if (!isBotAdmin) return m.reply('❌ I need to be an Admin to schedule this.');
    if (!args[0]) return m.reply(`Usage: ${usedPrefix + command} 1 (for 1 hour)`);

    let time = parseInt(args[0]) * 3600000; // Converts hours to milliseconds

    if (command === 'autoclose') {
        m.reply(`🕒 The group will be *Closed* in ${args[0]} hour(s).`);
        setTimeout(async () => {
            await conn.groupSettingUpdate(m.chat, 'announcement');
            conn.reply(m.chat, '🕒 *Auto-Close:* The group is now closed. Only admins can speak.');
        }, time);
    } else if (command === 'autopen') {
        m.reply(`🕒 The group will be *Opened* in ${args[0]} hour(s).`);
        setTimeout(async () => {
            await conn.groupSettingUpdate(m.chat, 'not_announcement');
            conn.reply(m.chat, '🕒 *Auto-Open:* The group is now open for everyone.');
        }, time);
    }
};

handler.help = ['autoclose', 'autopen'];
handler.tags = ['admin'];
handler.command = /^(autoclose|autopen)$/i;
handler.group = true;

module.exports = handler;

