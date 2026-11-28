const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

const configDbPath = path.join(__dirname, '../database/botconfig.json');

function saveBotConfig() {
    const dir = path.dirname(configDbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = {
        PREFIX: global.PREFIX || '.',
        botName: global.botName || '',
        ownerName: global.ownerName || '',
        owner: Array.isArray(global.owner) ? global.owner : [],
        WORKTYPE: global.WORKTYPE || 'public',
        packname: global.packname || '',
        sudo: Array.isArray(global.sudo) ? global.sudo : [],
        everyCmds: Array.isArray(global.everyCmds) ? global.everyCmds : [],
        cmdAudioEnabled: global.cmdAudioEnabled !== false,
        cmdAudioDisabled: Array.isArray(global.cmdAudioDisabled) ? global.cmdAudioDisabled : [],
        updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(configDbPath, JSON.stringify(data, null, 2));
    return data;
}

cmd({
    pattern: 'up',
    alias: ['saveconfig', 'updateconfig', 'sync'],
    react: '💾',
    desc: 'Save & persist all WhatsApp bot changes (prefix, botname, owner, mode, sudo, every) across reboots',
    category: 'owner',
    use: '.up',
    filename: __filename
},
async (conn, mek, m, { reply, isOwner }) => {
    if (!isOwner) return reply('🚫 This command is for the owner only.');
    try {
        const saved = saveBotConfig();
        const summary =
            `💾 *BOT CONFIG SAVED & SYNCED*\n\n` +
            `• *Prefix:* \`${saved.PREFIX}\`\n` +
            `• *Bot Name:* ${saved.botName || 'Default'}\n` +
            `• *Owner Name:* ${saved.ownerName || 'Default'}\n` +
            `• *Owner:* ${saved.owner.join(', ') || 'Default'}\n` +
            `• *Mode:* ${saved.WORKTYPE.toUpperCase()}\n` +
            `• *Sudo:* ${saved.sudo.length} user(s)\n` +
            `• *Every (Public):* ${saved.everyCmds.length} cmd(s)\n` +
            `• *Cmd Audio:* ${saved.cmdAudioEnabled ? 'ON 🔊' : 'OFF 🔇'}\n\n` +
            `✅ All changes are persisted and will survive bot reboots!`;
        return reply(summary);
    } catch (e) {
        console.error('[up] Failed to save config:', e);
        return reply(`❌ Failed to save config: ${e.message}`);
    }
});
