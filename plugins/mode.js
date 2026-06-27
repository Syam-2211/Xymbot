let handler = async (m, { conn, args, isOwner }) => {
    if (!isOwner) {
        return await conn.sendMessage(m.chat, { text: '❌ *Only the owner can use this command!*' }, { quoted: m });
    }

    if (args[0] === 'public') {
        global.WORKTYPE = 'public';
        return await conn.sendMessage(m.chat, { text: '✅ *Bot is now in PUBLIC mode!*\nEveryone can use commands.' }, { quoted: m });
    } else if (args[0] === 'private') {
        global.WORKTYPE = 'private';
        return await conn.sendMessage(m.chat, { text: '🔒 *Bot is now in PRIVATE mode!*\nOnly the owner can use commands.' }, { quoted: m });
    }

    // Current status
    const currentMode = global.WORKTYPE || 'public';

    // Send a native WhatsApp Poll
    await conn.sendMessage(m.chat, {
        poll: {
            name: `🤖 Bot Mode Settings\nCurrent: ${currentMode.toUpperCase()}`,
            values: [
                '🌍 .mode public',
                '🔒 .mode private',
                '👑 .sudo (Manage Sudo Users)'
            ],
            selectableCount: 1
        }
    }, { quoted: m });
};

handler.help = ['mode'];
handler.tags = ['owner'];
handler.command = /^(mode|botmode)$/i;

module.exports = handler;
