const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

const everyDbPath = path.join(__dirname, '../database/every.json');

function loadEveryDb() {
    try {
        if (fs.existsSync(everyDbPath)) {
            const data = JSON.parse(fs.readFileSync(everyDbPath, 'utf8'));
            if (Array.isArray(data)) return data.map(c => String(c).toLowerCase().trim()).filter(Boolean);
        }
    } catch (_) { }
    return [];
}

function saveEveryDb(list) {
    try {
        const dir = path.dirname(everyDbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(everyDbPath, JSON.stringify([...new Set(list)], null, 2));
    } catch (e) {
        console.error('Failed to save every.json:', e);
    }
}

if (!Array.isArray(global.everyCmds)) {
    global.everyCmds = loadEveryDb();
}

cmd({
    pattern: 'every',
    react: '🌐',
    desc: 'Allow specific commands for public use even in private/sudo mode',
    category: 'owner',
    use: '.every <add|del|list|clear> [command]',
    filename: __filename
},
    async (conn, mek, m, { args, reply, isOwner }) => {
        if (!isOwner) return reply('🚫 This command is for the owner only.');

        const action = (args[0] || '').toLowerCase();
        const targets = args.slice(1).join(' ').split(/[\s,]+/).map(c => c.replace(/^\./, '').toLowerCase().trim()).filter(Boolean);

        if (!action || action === 'list') {
            if (!global.everyCmds.length) {
                return reply('🌐 *EVERY (Public Whitelist)*\n\nNo commands are currently whitelisted.\n\n*Usage:*\n• `.every add <cmd>`\n• `.every del <cmd>`\n• `.every clear`');
            }
            const listText = global.everyCmds.map((c, i) => `${i + 1}. \`.${c}\``).join('\n');
            return reply(`🌐 *EVERY (Public Whitelist)*\n_Accessible to everyone even in private/sudo mode:_\n\n${listText}`);
        }

        if (action === 'add') {
            if (!targets.length) return reply('❌ Provide at least one command name. Example: `.every add play ping`');
            let added = [];
            for (const t of targets) {
                if (!global.everyCmds.includes(t)) {
                    global.everyCmds.push(t);
                    added.push(t);
                }
            }
            saveEveryDb(global.everyCmds);
            return reply(added.length ? `✅ Added to public whitelist: *${added.join(', ')}*` : '⚠️ Already in whitelist.');
        }

        if (action === 'del' || action === 'remove') {
            if (!targets.length) return reply('❌ Provide a command name to remove. Example: `.every del play`');
            const before = global.everyCmds.length;
            global.everyCmds = global.everyCmds.filter(c => !targets.includes(c));
            saveEveryDb(global.everyCmds);
            const removed = before - global.everyCmds.length;
            return reply(removed ? `🗑️ Removed *${removed}* command(s) from public whitelist.` : '⚠️ Command not found in whitelist.');
        }

        if (action === 'clear') {
            global.everyCmds = [];
            saveEveryDb(global.everyCmds);
            return reply('🧹 Cleared all commands from public whitelist.');
        }

        return reply('❌ Invalid action. Use: `.every add <cmd>`, `.every del <cmd>`, `.every list`, or `.every clear`');
    });
