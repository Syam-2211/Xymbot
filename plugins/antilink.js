const handler = async (m, { conn, isAdmin, isBotAdmin }) => {
    // Regex to detect WhatsApp group links and general URLs
    const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})|(https?:\/\/[^\s]+)/i;
    const isGroupLink = linkRegex.test(m.text);

    if (isGroupLink) {
        if (!isBotAdmin) return m.reply('I need to be an admin to kick users! 🛡️');
        if (isAdmin) return m.reply('Admin detected. I will allow the link this time. ✅');

        // Delete the message
        await conn.sendMessage(m.chat, { delete: m.key });

        // Kick the user
        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
        
        return conn.reply(m.chat, `*🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 Security Alert*\n\n@${m.sender.split('@')[0]} has been removed for sending a link. 🚫`, m, { mentions: [m.sender] });
    }
    return true;
};

handler.customPrefix = /.*/; // Listens to all messages
handler.command = new RegExp();
handler.group = true; // Only works in groups

module.exports = handler;

