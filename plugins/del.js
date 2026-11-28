const { cmd } = require('../command');

cmd({
    pattern: 'del',
    alias: ['dlt', 'delete'],
    react: '🗑️',
    desc: 'Force delete a replied message (from bot or group)',
    category: 'group',
    use: '.del (reply to a message)',
    filename: __filename
},
async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isOwner, reply }) => {
    if (!m.quoted) return reply('⚠️ Please *reply* to the message you want to delete.');

    const isBotMsg = m.quoted.fromMe || m.quoted.key?.fromMe;
    if (!isBotMsg && !isOwner) {
        if (!isGroup) return reply('🚫 You can only delete the bot\'s messages in DMs.');
        if (!isAdmins) return reply('🚫 Only group admins or the bot owner can delete others\' messages.');
        if (!isBotAdmins) return reply('⚠️ Make me a group admin first to delete others\' messages.');
    }

    try {
        await conn.sendMessage(from, {
            delete: {
                remoteJid: from,
                fromMe: !!isBotMsg,
                id: m.quoted.id || m.quoted.key?.id,
                participant: m.quoted.sender || m.quoted.key?.participant
            }
        });
        // Also delete the .del command message itself if possible
        await conn.sendMessage(from, { delete: mek.key }).catch(() => {});
    } catch (e) {
        console.error('[del] Error:', e);
        reply('❌ Failed to delete message.');
    }
});
