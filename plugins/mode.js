const { cmd } = require('../command');

cmd({
    pattern: "mode",
    alias: ["botmode"],
    react: "⚙️",
    desc: "Change bot mode to public or private",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, isOwner, reply }) => {
    try {
        if (!isOwner) return reply('❌ *Only the owner can use this command!*');

        const config = require('../config');
        if (args[0] === 'public') {
            config.updateSettings({ worktype: 'public' });
            return await conn.sendMessage(from, { text: '✅ *Bot is now in PUBLIC mode!*\nEveryone can use commands.' }, { quoted: mek });
        } else if (args[0] === 'private') {
            config.updateSettings({ worktype: 'private' });
            return await conn.sendMessage(from, { text: '🔒 *Bot is now in PRIVATE mode!*\nOnly the owner can use commands.' }, { quoted: mek });
        } else if (args[0] === 'sudo') {
            config.updateSettings({ worktype: 'sudo' });
            return await conn.sendMessage(from, { text: '👑 *Bot is now in SUDO mode!*\nOnly the owner and sudo users can use commands.' }, { quoted: mek });
        }

        // Current status
        const currentMode = global.WORKTYPE || 'public';

        // Send a formatted text menu instead of a poll
        const menuText = `
🤖 *BOT MODE SETTINGS*
Current Mode: *${currentMode.toUpperCase()}*

To change the mode, please type one of the following commands:
🌍 *.mode public* (Everyone can use commands)
🔒 *.mode private* (Only you can use commands)
👑 *.mode sudo* (Only Owner & Sudo users)
`;
        await conn.sendMessage(from, { text: menuText }, { quoted: mek });
    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});
