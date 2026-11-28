const { cmd } = require('../command');

if (typeof global.antiDeleteEnabled === 'undefined') global.antiDeleteEnabled = true;
if (!global.antiDeleteTarget) global.antiDeleteTarget = 'chat'; // 'chat' | 'owner' | 'sudo' | 'all'
if (typeof global.groupEventsEnabled === 'undefined') global.groupEventsEnabled = true;

cmd({
    pattern: 'antidltmsg',
    alias: ['antidltmsg', 'antideletemsg'],
    react: '🗑️',
    desc: 'Configure Anti-Delete message forwarding (on/off/owner/sudo/chat/all)',
    category: 'owner',
    use: '.andidltmsg <on|off|owner|sudo|chat|all>',
    filename: __filename
},
    async (conn, mek, m, { args, reply, isOwner }) => {
        if (!isOwner) return reply('🚫 This command is for the owner only.');

        const arg = (args[0] || '').toLowerCase();
        if (arg === 'on') {
            global.antiDeleteEnabled = true;
            return reply(`🗑️ Anti-Delete forwarding is now *ON* (Target: *${global.antiDeleteTarget.toUpperCase()}*).`);
        }
        if (arg === 'off') {
            global.antiDeleteEnabled = false;
            return reply('🗑️ Anti-Delete forwarding is now *OFF*.');
        }
        if (['owner', 'sudo', 'chat', 'all'].includes(arg)) {
            global.antiDeleteEnabled = true;
            global.antiDeleteTarget = arg;
            return reply(`🗑️ Anti-Delete target set to: *${arg.toUpperCase()}*`);
        }

        return reply(
            `🗑️ *ANTI-DELETE SETTINGS*\n\n` +
            `• *Status:* ${global.antiDeleteEnabled ? 'ON ✅' : 'OFF ❌'}\n` +
            `• *Target:* ${global.antiDeleteTarget.toUpperCase()}\n\n` +
            `*Usage:*\n` +
            `• \`.andidltmsg on\` / \`off\`\n` +
            `• \`.andidltmsg chat\` — send to deleted chat\n` +
            `• \`.andidltmsg owner\` — send to owner DM\n` +
            `• \`.andidltmsg sudo\` — send to sudo DMs\n` +
            `• \`.andidltmsg all\` — send to chat + owner + sudo`
        );
    });

cmd({
    pattern: 'events',
    alias: ['groupevents', 'promoteevents'],
    react: '📢',
    desc: 'Enable or disable group promote/demote event announcements',
    category: 'owner',
    use: '.events <on|off>',
    filename: __filename
},
    async (conn, mek, m, { args, reply, isOwner }) => {
        if (!isOwner) return reply('🚫 This command is for the owner only.');
        const arg = (args[0] || '').toLowerCase();
        if (arg === 'on') {
            global.groupEventsEnabled = true;
            return reply('📢 Group promote/demote announcements are now *ON*.');
        }
        if (arg === 'off') {
            global.groupEventsEnabled = false;
            return reply('📢 Group promote/demote announcements are now *OFF*.');
        }
        return reply(`📢 Group Events: *${global.groupEventsEnabled ? 'ON ✅' : 'OFF ❌'}*\nUsage: \`.events on\` or \`.events off\``);
    });
