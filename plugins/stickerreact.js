const { cmd } = require('../command');

if (typeof global.emojiReactEnabled === 'undefined') {
    global.emojiReactEnabled = true;
}

cmd({
    pattern: 'emojireact',
    alias: ['reactcmd', 'cmdreact'],
    react: '⚡',
    desc: 'Enable or disable automatic emoji reactions on bot commands (default: ON)',
    category: 'owner',
    use: '.emojireact <on|off>',
    filename: __filename
},
async (conn, mek, m, { args, reply, isOwner }) => {
    if (!isOwner) return reply('🚫 This command is for the owner only.');
    const arg = (args[0] || '').toLowerCase();
    if (arg === 'on') {
        global.emojiReactEnabled = true;
        return reply('⚡ Emoji reactions on bot commands are now *ON*.');
    }
    if (arg === 'off') {
        global.emojiReactEnabled = false;
        return reply('🔇 Emoji reactions on bot commands are now *OFF*.');
    }
    return reply(`⚡ Emoji reactions: *${global.emojiReactEnabled ? 'ON ✅' : 'OFF ❌'}*\nUsage: \`.emojireact on\` or \`.emojireact off\``);
});
