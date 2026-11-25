'use strict';

const { cmd } = require('../command');
const { getChatSettings, saveGroupSettings } = require('../lib/groupDb');

cmd({
    pattern: 'antilink',
    react: '🔗',
    desc: 'Enable/disable Anti-Link in group (.antilink on/off [delete|warn|kick])',
    category: 'group',
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isAdmins, isOwner, reply }) => {
    if (!isGroup) return reply('❌ This command only works in groups!');
    if (!isAdmins && !isOwner) return reply('❌ Only group admins or the bot owner can configure Anti-Link.');

    const chat = getChatSettings(from);
    const toggle = args[0]?.toLowerCase();
    const action = args[1]?.toLowerCase();

    if (!toggle || !['on', 'off'].includes(toggle)) {
        return reply(
            `🔗 *Anti-Link Status:* ${chat.antilink ? '✅ ON' : '❌ OFF'}\n` +
            `⚙️ *Action:* ${(chat.antilinkAction || 'warn').toUpperCase()}\n\n` +
            `Usage:\n• \`.antilink on\`\n• \`.antilink on kick\`\n• \`.antilink on delete\`\n• \`.antilink off\``
        );
    }

    chat.antilink = toggle === 'on';
    if (action && ['delete', 'warn', 'kick'].includes(action)) {
        chat.antilinkAction = action;
    }
    saveGroupSettings();

    return reply(
        `${chat.antilink ? '✅' : '❌'} Anti-Link is now *${chat.antilink ? 'ON' : 'OFF'}*` +
        (chat.antilink ? ` (Action: *${(chat.antilinkAction || 'warn').toUpperCase()}*)` : '')
    );
});

cmd({
    pattern: 'antidelete',
    react: '🗑️',
    desc: 'Enable/disable Anti-Delete in group (.antidelete on/off)',
    category: 'group',
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isAdmins, isOwner, reply }) => {
    if (!isGroup) return reply('❌ This command only works in groups!');
    if (!isAdmins && !isOwner) return reply('❌ Only group admins or the bot owner can configure Anti-Delete.');

    const chat = getChatSettings(from);
    const toggle = args[0]?.toLowerCase();

    if (!toggle || !['on', 'off'].includes(toggle)) {
        return reply(
            `🗑️ *Anti-Delete Status:* ${chat.antidelete ? '✅ ON' : '❌ OFF'}\n\n` +
            `Usage:\n• \`.antidelete on\`\n• \`.antidelete off\``
        );
    }

    chat.antidelete = toggle === 'on';
    saveGroupSettings();

    return reply(`${chat.antidelete ? '✅' : '❌'} Anti-Delete is now *${chat.antidelete ? 'ON' : 'OFF'}*`);
});
