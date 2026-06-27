const handler = async (m, { conn, isAdmin, isBotAdmin }) => {
    // Regex to detect WhatsApp group links and general URLs
    const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})|(https?:\/\/[^\s]+)/i;
    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
    const isGroupLink = linkRegex.test(text);

    if (isGroupLink) {
        if (!isBotAdmin) return m.reply('I need to be an admin to kick users! 🛡️');
        if (isAdmin) return m.reply('Admin detected. I will allow the link this time. ✅');

        // Delete the message
        await conn.sendMessage(m.chat, { delete: m.key });

        // Kick the user
        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
        
        return conn.sendMessage(m.chat, { text: `*🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 Security Alert*\n\n@${m.sender.split('@')[0]} has been removed for sending a link. 🚫`, mentions: [m.sender] }, { quoted: m });
    }
    return true;
};

handler.customPrefix = /.*/; // Listens to all messages
handler.command = new RegExp();
handler.group = true; // Only works in groups

module.exports = handler;

