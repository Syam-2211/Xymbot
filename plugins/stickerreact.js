const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

if (typeof global.stickerReactEnabled === 'undefined') {
    global.stickerReactEnabled = true;
}

const stickerDir = path.join(__dirname, '../assets/stickers');
const REACTION_EMOJIS = ['🔥', '⚡', '😎', '🦅', '✨', '👑', '💯', '🎯', '🚀', '💎'];

async function sendRandomStickerReact(conn, from, mek) {
    if (!global.stickerReactEnabled) return;
    try {
        if (fs.existsSync(stickerDir)) {
            const files = fs.readdirSync(stickerDir).filter(f => f.endsWith('.webp'));
            if (files.length > 0) {
                const pick = files[Math.floor(Math.random() * files.length)];
                const buf = fs.readFileSync(path.join(stickerDir, pick));
                await conn.sendMessage(from, { sticker: buf }, { quoted: mek });
                return;
            }
        }
        // Fallback: generate a clean emoji sticker using @napi-rs/canvas + wa-sticker-formatter
        const { createCanvas } = require('@napi-rs/canvas');
        const { Sticker, StickerTypes } = require('wa-sticker-formatter');
        const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 512, 512);
        ctx.font = '320px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 256, 270);
        const pngBuf = canvas.toBuffer('image/png');
        const sticker = new Sticker(pngBuf, {
            pack: global.packname || 'XYMBOT',
            author: global.ownerName || 'SYAM',
            type: StickerTypes.FULL,
            quality: 80
        });
        const webpBuf = await sticker.toBuffer();
        await conn.sendMessage(from, { sticker: webpBuf }, { quoted: mek });
    } catch (e) {
        console.warn('[StickerReact] Failed:', e.message);
    }
}

cmd({
    pattern: 'stickerreact',
    react: '🎭',
    desc: 'Enable or disable random sticker reactions on bot commands',
    category: 'owner',
    use: '.stickerreact <on|off>',
    filename: __filename
},
async (conn, mek, m, { args, reply, isOwner }) => {
    if (!isOwner) return reply('🚫 This command is for the owner only.');
    const arg = (args[0] || '').toLowerCase();
    if (arg === 'on') {
        global.stickerReactEnabled = true;
        return reply('🎭 Sticker reactions for bot commands are now *ON*.');
    }
    if (arg === 'off') {
        global.stickerReactEnabled = false;
        return reply('🎭 Sticker reactions for bot commands are now *OFF*.');
    }
    return reply(`🎭 Sticker reactions: *${global.stickerReactEnabled ? 'ON' : 'OFF'}*\nUsage: \`.stickerreact on\` or \`.stickerreact off\``);
});

module.exports = { sendRandomStickerReact };
