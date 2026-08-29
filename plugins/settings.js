const { cmd } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');

// ══════════════════════════════════════════════════════════════
// .settings — Bot Settings Dashboard (Owner Only, works anywhere)
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "settings",
    alias: ["botsettings", "botconfig"],
    react: "⚙️",
    desc: "View and manage all bot settings",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this command.');

    const setting = args[0]?.toLowerCase();
    const value = args.slice(1).join(' ');

    // No args = show dashboard
    if (!setting) {
        const prefix = config.getPrefix() || '.';
        const uptime = runtime(process.uptime());
        const sudoList = (global.sudo || []).length > 0
            ? (global.sudo || []).map(u => `  • ${u}`).join('\n')
            : '  _None_';

        const dashboard = `
╭━━━〔 ✧ *GLOBAL SETTINGS* ✧ 〕━━━┈
┃ 👤 *Requested By:* ${m.pushName || 'Owner'}
┃ ⏳ *Uptime:* ${uptime}
╰━━━━━━━━━━━━━━━━━━━━━━━━┈

┏━━━━❮ 🤖 *IDENTITY* ❯━━━━
┃ ➪ 🏷️ *Bot Name:* ${global.botName || 'Not Set'}
┃ ➪ 👑 *Owner Name:* ${global.ownerName || 'Not Set'}
┃ ➪ 📱 *Owner No.:* ${(global.owner || [])[0] || 'Not Set'}
┗━━━━━━━━━━━━━━━━━━━━━━━━

┏━━━━❮ 🔧 *CONFIGURATION* ❯━━━━
┃ ➪ ⚙️ *Prefix:* ${prefix || 'None'}
┃ ➪ 🌐 *Mode:* ${(global.WORKTYPE || 'public').toUpperCase()}
┗━━━━━━━━━━━━━━━━━━━━━━━━

┏━━━━❮ 👥 *SUDO USERS* ❯━━━━
${sudoList}
┗━━━━━━━━━━━━━━━━━━━━━━━━

*📝 EDIT COMMANDS:*
│ ${prefix}settings prefix [value]
│ ${prefix}settings botname [name]
│ ${prefix}settings ownername [name]
│ ${prefix}settings owner [number]
│ ${prefix}settings mode [public/private/sudo]
│ ${prefix}sudo add/del/list [number]
`.trim();

        return reply(dashboard);
    }

    // Handle sub-commands
    switch (setting) {
        case 'prefix':
        case 'setprefix': {
            if (!value) return reply('❌ Provide a prefix!\nExample: `.settings prefix !`\nUse `.settings prefix none` to remove prefix.');
            let newPrefix = value;
            if (newPrefix === 'none' || newPrefix === 'null') newPrefix = '';
            config.updateSettings({ prefix: newPrefix });
            return reply(`✅ Prefix updated to: *${newPrefix || 'None (No prefix)'}*`);
        }

        case 'botname':
        case 'setbotname': {
            if (!value) return reply('❌ Provide a bot name!\nExample: `.settings botname SuperBot`');
            config.updateSettings({ botName: value });
            return reply(`✅ Bot name updated to: *${value}*`);
        }

        case 'ownername':
        case 'setownername': {
            if (!value) return reply('❌ Provide an owner name!\nExample: `.settings ownername John`');
            config.updateSettings({ ownerName: value });
            return reply(`✅ Owner name updated to: *${value}*`);
        }

        case 'owner':
        case 'setowner': {
            const num = value.replace(/[^0-9]/g, '');
            if (!num) return reply('❌ Provide a valid number!\nExample: `.settings owner 919876543210`');
            config.updateSettings({ owner: [num] });
            return reply(`✅ Owner number updated to: *${num}*`);
        }

        case 'mode': {
            const validModes = ['public', 'private', 'sudo'];
            if (!value || !validModes.includes(value.toLowerCase())) {
                return reply('❌ Invalid mode!\nUse: `.settings mode public/private/sudo`');
            }
            config.updateSettings({ worktype: value.toLowerCase() });
            const modeEmoji = { public: '🌍', private: '🔒', sudo: '👑' };
            return reply(`${modeEmoji[value.toLowerCase()]} Bot mode set to: *${value.toUpperCase()}*`);
        }

        default:
            return reply(`❌ Unknown setting: *${setting}*\n\nType \`.settings\` to see all options.`);
    }
});

// ══════════════════════════════════════════════════════════════
// .setprefix — Quick shortcut (works anywhere)
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "setprefix",
    desc: "Quick shortcut to change bot prefix",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this command.');
    if (args.length === 0) return reply('Provide a new prefix! Example: `.setprefix !`');
    let newPrefix = args[0];
    if (newPrefix.toLowerCase() === 'none' || newPrefix.toLowerCase() === 'null') newPrefix = '';
    config.updateSettings({ prefix: newPrefix });
    reply(`✅ Prefix updated to: *${newPrefix || 'None'}*`);
});

// ══════════════════════════════════════════════════════════════
// .setbotname — Quick shortcut
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "setbotname",
    desc: "Quick shortcut to change bot name",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { q, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this command.');
    if (!q) return reply('Provide a new bot name!');
    config.updateSettings({ botName: q });
    reply(`✅ Bot name updated to: *${q}*`);
});

// ══════════════════════════════════════════════════════════════
// .setownername — Quick shortcut
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "setownername",
    desc: "Quick shortcut to change owner name",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { q, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this command.');
    if (!q) return reply('Provide a new owner name!');
    config.updateSettings({ ownerName: q });
    reply(`✅ Owner name updated to: *${q}*`);
});

// ══════════════════════════════════════════════════════════════
// .setowner — Quick shortcut
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "setowner",
    desc: "Quick shortcut to change owner number",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { q, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this command.');
    let num = q.replace(/[^0-9]/g, '');
    if (!num) return reply('Provide a valid phone number!');
    config.updateSettings({ owner: [num] });
    reply(`✅ Owner number updated to: *${num}*`);
});
