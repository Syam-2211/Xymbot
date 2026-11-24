let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isBotAdmin, isOwner, reply }) => {
    if (!m.isGroup) return reply('This command only works in groups!');
    if (!isAdmin && !isOwner) return reply('❌ This is for Admins/Owner only.');

    let user = m.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[@\s]/g, '') + '@s.whatsapp.net' : null);

    if (!user) return reply(`❌ Reply to or mention a user to ${command}!`);

    if (!global.db.data.users) global.db.data.users = {};
    if (!global.db.data.users[user]) {
        global.db.data.users[user] = { warn: 0 };
    }

    if (command === 'resetwarn' || command === 'unwarn') {
        global.db.data.users[user].warn = 0;
        return reply(`✅ Warnings reset for @${user.split('@')[0]}!`, { mentions: [user] });
    }

    if (!isBotAdmin) return reply('❌ I need Admin privileges to kick users on reaching max warnings!');

    global.db.data.users[user].warn += 1;
    let warnings = global.db.data.users[user].warn;

    if (warnings < 3) {
        await conn.sendMessage(m.chat, { 
            text: `⚠️ *WARNING ${warnings}/3*\n\n@${user.split('@')[0]}, you have been warned by an admin.\nIf you reach 3 warnings, you will be kicked!`, 
            mentions: [user] 
        }, { quoted: m });
    } else {
        // Kick the user
        await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
        
        // Reset warnings
        global.db.data.users[user].warn = 0;
        
        await conn.sendMessage(m.chat, { 
            text: `🚫 *FINAL WARNING REACHED*\n\n@${user.split('@')[0]} has been removed from the group for receiving 3 warnings.`, 
            mentions: [user] 
        }, { quoted: m });
    }
};

handler.help = ['warn @user', 'resetwarn @user'];
handler.tags = ['admin'];
handler.command = /^(warn|resetwarn|unwarn)$/i;
handler.group = true;

module.exports = handler;
