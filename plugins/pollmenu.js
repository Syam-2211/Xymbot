'use strict';

const { cmd } = require('../command');

cmd({
    pattern: 'pollmenu',
    alias: ['pmenu', 'quickmenu'],
    react: '📊',
    desc: 'Send an interactive tap-to-run poll menu',
    category: 'main',
    filename: __filename
}, async (conn, mek, m, { from, isChannel, reply }) => {
    if (isChannel) {
        return reply('📊 Interactive polls are supported in DMs and Groups. Use `.menu` in channels.');
    }

    await conn.sendMessage(from, {
        poll: {
            name: '🤖 XYMBOT QUICK MENU — Tap an option to run:',
            values: [
                '⚡ Bot Status (.alive)',
                '🏓 Speed Test (.ping)',
                '📜 Full Command List (.menu)',
                '🎨 My Sticker Pack (.mypack)',
                '📊 Group Dashboard (.gpanel)',
                '⚙️ Global Settings (.settings)'
            ],
            selectableCount: 1
        }
    });
});

cmd({
    pattern: 'settingspoll',
    alias: ['spoll'],
    react: '⚙️',
    desc: 'Interactive poll to switch bot mode (Owner only)',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { from, isOwner, isChannel, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this command.');
    if (isChannel) return reply('❌ Polls are not supported in channels.');

    await conn.sendMessage(from, {
        poll: {
            name: `⚙️ BOT MODE (Current: ${(global.WORKTYPE || 'public').toUpperCase()})`,
            values: [
                '🌍 Public Mode (.settings mode public)',
                '🔒 Private Mode (.settings mode private)',
                '👑 Sudo Mode (.settings mode sudo)',
                '📋 View Settings (.settings)'
            ],
            selectableCount: 1
        }
    });
});

cmd({
    pattern: 'gpoll',
    alias: ['grouppoll'],
    react: '🛡️',
    desc: 'Interactive poll to toggle group moderation settings',
    category: 'group',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, reply }) => {
    if (!isGroup) return reply('❌ This command only works in groups!');
    if (!isAdmins && !isOwner) return reply('❌ Only admins and owner can use this!');

    await conn.sendMessage(from, {
        poll: {
            name: '🛡️ GROUP MODERATION — Tap to toggle:',
            values: [
                '🔗 Enable Anti-Link (.antilink on)',
                '🔓 Disable Anti-Link (.antilink off)',
                '🗑️ Enable Anti-Delete (.antidelete on)',
                '❌ Disable Anti-Delete (.antidelete off)',
                '📊 Group Status (.gsettings)'
            ],
            selectableCount: 1
        }
    });
});
