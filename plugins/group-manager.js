const { cmd } = require('../command');

// ══════════════════════════════════════════════════════════════
// .gsettings — Group Settings Dashboard (Group Only, Admin/Owner)
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "gsettings",
    alias: ["gdashboard", "gpanel"],
    react: "📊",
    desc: "View and manage group settings (group only)",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isAdmins, isOwner, reply }) => {
    if (!isGroup) return reply('❌ This command only works in groups!');
    if (!isAdmins && !isOwner) return reply('❌ Only admins and owner can use this!');

    if (!global.db.data.chats[from]) global.db.data.chats[from] = {};
    let chat = global.db.data.chats[from];

    const setting = args[0]?.toLowerCase();
    const value = args[1]?.toLowerCase();

    // No args = show group dashboard
    if (!setting) {
        const prefix = require('../config').getPrefix() || '.';

        const dashboard = `
╭━━━〔 ✧ *GROUP DASHBOARD* ✧ 〕━━━┈
┃ 👤 *Requested By:* ${m.pushName || 'Admin'}
╰━━━━━━━━━━━━━━━━━━━━━━━━┈

┏━━━━❮ 🛡️ *SECURITY* ❯━━━━
┃ ➪ 🔗 *Anti-Link:* ${chat.antilink ? '✅ ACTIVE' : '❌ OFF'}
┃ ➪ 🗑️ *Anti-Delete:* ${chat.antidelete ? '✅ ACTIVE' : '❌ OFF'}
┗━━━━━━━━━━━━━━━━━━━━━━━━

┏━━━━❮ 👋 *GREETINGS* ❯━━━━
┃ ➪ 🚪 *Welcome:* ${chat.welcome ? '✅ ON' : '❌ OFF'}
┃ ➪ 🚶 *Goodbye:* ${chat.goodbye ? '✅ ON' : '❌ OFF'}
┃ ➪ 📝 *Welcome Msg:* ${chat.sWelcome || '_Default_'}
┃ ➪ 📝 *Goodbye Msg:* ${chat.sGoodbye || '_Default_'}
┗━━━━━━━━━━━━━━━━━━━━━━━━

┏━━━━❮ 🤖 *AUTOMATION* ❯━━━━
┃ ➪ 👑 *Auto-Admin:* ${chat.autoadmin ? '✅ ON' : '❌ OFF'}
┃ ➪ 💬 *Auto-Chat:* ${chat.autochat ? '✅ ON' : '❌ OFF'}
┗━━━━━━━━━━━━━━━━━━━━━━━━

*📝 EDIT COMMANDS:*
│ ${prefix}gsettings antilink on/off
│ ${prefix}gsettings antidelete on/off
│ ${prefix}gsettings welcome on/off
│ ${prefix}gsettings goodbye on/off
│ ${prefix}gsettings setwelcome [text]
│ ${prefix}gsettings setgoodbye [text]
│ ${prefix}gsettings autoadmin on/off
│ ${prefix}gsettings autochat on/off
│ ${prefix}gsettings reset
`.trim();

        return reply(dashboard);
    }

    // Handle sub-commands
    switch (setting) {
        case 'antilink': {
            if (!value || !['on', 'off'].includes(value)) return reply('❌ Use: `.gsettings antilink on/off`');
            chat.antilink = value === 'on';
            return reply(`${value === 'on' ? '✅' : '❌'} Anti-Link is now *${value.toUpperCase()}*`);
        }

        case 'antidelete': {
            if (!value || !['on', 'off'].includes(value)) return reply('❌ Use: `.gsettings antidelete on/off`');
            chat.antidelete = value === 'on';
            return reply(`${value === 'on' ? '✅' : '❌'} Anti-Delete is now *${value.toUpperCase()}*`);
        }

        case 'welcome': {
            if (!value || !['on', 'off'].includes(value)) return reply('❌ Use: `.gsettings welcome on/off`');
            chat.welcome = value === 'on';
            return reply(`${value === 'on' ? '✅' : '❌'} Welcome is now *${value.toUpperCase()}*`);
        }

        case 'goodbye': {
            if (!value || !['on', 'off'].includes(value)) return reply('❌ Use: `.gsettings goodbye on/off`');
            chat.goodbye = value === 'on';
            return reply(`${value === 'on' ? '✅' : '❌'} Goodbye is now *${value.toUpperCase()}*`);
        }

        case 'setwelcome': {
            const text = args.slice(1).join(' ');
            if (!text) return reply('❌ Provide welcome text!\nExample: `.gsettings setwelcome Welcome {user}!`');
            chat.sWelcome = text;
            return reply(`✅ Welcome message updated to:\n${text}`);
        }

        case 'setgoodbye': {
            const text = args.slice(1).join(' ');
            if (!text) return reply('❌ Provide goodbye text!\nExample: `.gsettings setgoodbye Bye {user}!`');
            chat.sGoodbye = text;
            return reply(`✅ Goodbye message updated to:\n${text}`);
        }

        case 'autoadmin': {
            if (!value || !['on', 'off'].includes(value)) return reply('❌ Use: `.gsettings autoadmin on/off`');
            chat.autoadmin = value === 'on';
            return reply(`${value === 'on' ? '✅' : '❌'} Auto-Admin is now *${value.toUpperCase()}*`);
        }

        case 'autochat': {
            if (!value || !['on', 'off'].includes(value)) return reply('❌ Use: `.gsettings autochat on/off`');
            chat.autochat = value === 'on';
            return reply(`${value === 'on' ? '✅' : '❌'} Auto-Chat is now *${value.toUpperCase()}*`);
        }

        case 'reset': {
            chat.welcome = true;
            chat.goodbye = true;
            chat.antidelete = false;
            chat.antilink = false;
            chat.autoadmin = false;
            chat.autochat = false;
            chat.sWelcome = '';
            chat.sGoodbye = '';
            return reply('♻️ All group settings have been reset to defaults!');
        }

        default:
            return reply(`❌ Unknown setting: *${setting}*\n\nType \`.gsettings\` to see all options.`);
    }
});
