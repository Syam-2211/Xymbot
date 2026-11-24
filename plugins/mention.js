const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

// Local Paths
const ASSETS_DIR = path.join(__dirname, '../assets/mention');
const AUDIO_DIR = path.join(ASSETS_DIR, 'audio');
const VIDEO_DIR = path.join(ASSETS_DIR, 'video');
const DATA_FILE = path.join(__dirname, '../database/cmention_data.json');
const CONFIG_FILE = path.join(__dirname, '../database/cmention_config.json');

// Ensure directories exist
[ASSETS_DIR, AUDIO_DIR, VIDEO_DIR, path.dirname(DATA_FILE)].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const DEFAULT_CONFIG = {
    responseType: 'both', // 'text', 'audio', 'video', 'both'
    enabled: true
};

function loadCmentionConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        }
    } catch (e) {}
    return DEFAULT_CONFIG;
}

function saveCmentionConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

function getMentionReply() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {}
    return null;
}

function setMentionReply(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

function deleteMentionReply() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            fs.unlinkSync(DATA_FILE);
        }
        return true;
    } catch (e) {
        return false;
    }
}

// Get a random file from a directory
function getRandomFile(dirPath) {
    try {
        const files = fs.readdirSync(dirPath).filter(f => {
            const full = path.join(dirPath, f);
            return fs.statSync(full).isFile() && !f.startsWith('.');
        });
        if (files.length === 0) return null;
        const randomFile = files[Math.floor(Math.random() * files.length)];
        return path.join(dirPath, randomFile);
    } catch (e) {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CLEAN MENTION EXECUTION (WITHOUT IDENTITY / FAKE PRODUCT QUOTES)
// ═══════════════════════════════════════════════════════════════════════════
async function executeMentionResponse(conn, chatJid, quotedMsg, botNumber) {
    const config = loadCmentionConfig();
    if (!config.enabled) return;

    const savedReply = getMentionReply();
    const botName = global.botName || 'XYMBOT';

    // 1. If user set a specific custom mention reply via .cmention set
    if (savedReply) {
        switch (savedReply.type) {
            case 'text':
                if (savedReply.content) {
                    await conn.sendMessage(chatJid, {
                        text: savedReply.content
                    }, { quoted: quotedMsg });
                    return;
                }
                break;

            case 'image':
                if (savedReply.filePath && fs.existsSync(savedReply.filePath)) {
                    await conn.sendMessage(chatJid, {
                        image: fs.readFileSync(savedReply.filePath),
                        caption: savedReply.caption || ''
                    }, { quoted: quotedMsg });
                    return;
                } else if (savedReply.url) {
                    await conn.sendMessage(chatJid, {
                        image: { url: savedReply.url },
                        caption: savedReply.caption || ''
                    }, { quoted: quotedMsg });
                    return;
                }
                break;

            case 'video':
                if (savedReply.filePath && fs.existsSync(savedReply.filePath)) {
                    await conn.sendMessage(chatJid, {
                        video: fs.readFileSync(savedReply.filePath),
                        caption: savedReply.caption || ''
                    }, { quoted: quotedMsg });
                    return;
                } else if (savedReply.url) {
                    await conn.sendMessage(chatJid, {
                        video: { url: savedReply.url },
                        caption: savedReply.caption || ''
                    }, { quoted: quotedMsg });
                    return;
                }
                break;

            case 'audio':
                if (savedReply.filePath && fs.existsSync(savedReply.filePath)) {
                    await conn.sendMessage(chatJid, {
                        audio: fs.readFileSync(savedReply.filePath),
                        mimetype: 'audio/mp4',
                        ptt: true
                    }, { quoted: quotedMsg });
                    return;
                } else if (savedReply.url) {
                    await conn.sendMessage(chatJid, {
                        audio: { url: savedReply.url },
                        mimetype: 'audio/mp4',
                        ptt: true
                    }, { quoted: quotedMsg });
                    return;
                }
                break;

            case 'sticker':
                if (savedReply.filePath && fs.existsSync(savedReply.filePath)) {
                    await conn.sendMessage(chatJid, {
                        sticker: fs.readFileSync(savedReply.filePath)
                    }, { quoted: quotedMsg });
                    return;
                } else if (savedReply.url) {
                    await conn.sendMessage(chatJid, {
                        sticker: { url: savedReply.url }
                    }, { quoted: quotedMsg });
                    return;
                }
                break;

            case 'document':
                if (savedReply.filePath && fs.existsSync(savedReply.filePath)) {
                    await conn.sendMessage(chatJid, {
                        document: fs.readFileSync(savedReply.filePath),
                        mimetype: 'application/octet-stream',
                        fileName: savedReply.fileName || 'file',
                        caption: savedReply.caption || ''
                    }, { quoted: quotedMsg });
                    return;
                }
                break;
        }
    }

    // 2. Fallback to Audio / Video Media Pools (clean, no fake identities)
    let resType = config.responseType || 'both';
    if (resType === 'both') {
        resType = Math.random() > 0.5 ? 'audio' : 'video';
    }

    if (resType === 'audio') {
        const audioFile = getRandomFile(AUDIO_DIR);
        if (audioFile) {
            const buffer = fs.readFileSync(audioFile);
            await conn.sendMessage(chatJid, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: quotedMsg });
            return;
        }
    }

    if (resType === 'video' || resType === 'both') {
        const videoFile = getRandomFile(VIDEO_DIR);
        if (videoFile) {
            const buffer = fs.readFileSync(videoFile);
            await conn.sendMessage(chatJid, {
                video: buffer,
                ptv: true
            }, { quoted: quotedMsg });
            return;
        }
    }

    // 3. Clean default greeting if no files exist yet
    const ownerName = global.ownerName || 'Developer';
    await conn.sendMessage(chatJid, {
        text: `Hello! I'm *${botName}*. Someone mentioned me? 🤖\nType *.menu* to view my commands!`
    }, { quoted: quotedMsg });
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. CMENTION MANAGEMENT COMMAND (.cmention)
// ═══════════════════════════════════════════════════════════════════════════
cmd({
    pattern: 'cmention',
    alias: ['mention'],
    desc: 'Auto mention reply management (set, get, del, type, help)',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only the bot owner can configure mention replies.');

    const prefix = global.PREFIX || '.';
    const subcommand = args[0]?.toLowerCase();
    const input = args.slice(1).join(' ');

    if (!subcommand) {
        const currentData = getMentionReply();
        const currentConfig = loadCmentionConfig();

        let statusText = `*Auto Mention Reply Settings*\n\n`;
        statusText += `• Status: \`${currentConfig.enabled ? 'ENABLED' : 'DISABLED'}\`\n`;
        statusText += `• Fallback Type: \`${currentConfig.responseType.toUpperCase()}\`\n`;
        statusText += `• Custom Reply: \`${currentData ? currentData.type.toUpperCase() : 'NOT SET (Using default pool)'}\`\n\n`;

        statusText += `*Available Commands:*\n`;
        statusText += `• \`${prefix}cmention set <text>\` - Set text mention reply\n`;
        statusText += `• \`${prefix}cmention set\` (reply to media) - Set audio/video/image/sticker\n`;
        statusText += `• \`${prefix}cmention get\` - View current mention reply\n`;
        statusText += `• \`${prefix}cmention del\` - Delete custom mention reply\n`;
        statusText += `• \`${prefix}cmention type <audio/video/both>\` - Set pool response mode\n`;
        statusText += `• \`${prefix}cmention help\` - Detailed help\n`;
        statusText += `• \`${prefix}me\` - Test mention function in DM/group\n`;

        return reply(statusText);
    }

    switch (subcommand) {
        case 'del':
        case 'delete':
            if (deleteMentionReply()) {
                reply('✅ Custom mention reply deleted successfully! Bot will now use the default media pool or greeting.');
            } else {
                reply('❌ Failed to delete mention reply.');
            }
            break;

        case 'get':
        case 'show': {
            const data = getMentionReply();
            if (!data) {
                return reply(`No custom mention reply set!\n\n*Usage:*\n• Reply to any message/media and type \`${prefix}cmention set\`\n• Or type \`${prefix}cmention set <text>\``);
            }

            let resp = `*Current Mention Reply:*\n\n`;
            resp += `*Type:* \`${data.type.toUpperCase()}\`\n`;
            if (data.content) resp += `*Content:* _${data.content}_\n`;
            if (data.caption) resp += `*Caption:* _${data.caption}_\n`;
            if (data.fileName) resp += `*File:* \`${data.fileName}\`\n`;
            resp += `*Set on:* _${new Date(data.timestamp).toLocaleString()}_\n`;

            reply(resp);
            break;
        }

        case 'set': {
            // Case A: User replied to a message (audio, video, image, sticker, document, or text)
            if (m.quoted) {
                try {
                    const q = m.quoted;
                    let mediaType = 'text';

                    if (q.type === 'imageMessage') mediaType = 'image';
                    else if (q.type === 'videoMessage') mediaType = 'video';
                    else if (q.type === 'audioMessage') mediaType = 'audio';
                    else if (q.type === 'stickerMessage') mediaType = 'sticker';
                    else if (q.type === 'documentMessage') mediaType = 'document';

                    let savedData = {
                        type: mediaType,
                        content: '',
                        caption: q.text || input || '',
                        timestamp: new Date().toISOString()
                    };

                    if (mediaType !== 'text') {
                        reply('⏳ Saving replied media as mention reply...');
                        const downloaded = await q.download();
                        const ext = mediaType === 'image' ? '.jpg'
                            : mediaType === 'video' ? '.mp4'
                            : mediaType === 'audio' ? '.mp3'
                            : mediaType === 'sticker' ? '.webp'
                            : '.bin';

                        const targetPath = path.join(ASSETS_DIR, `mention_reply${ext}`);
                        fs.copyFileSync(downloaded, targetPath);
                        try { fs.unlinkSync(downloaded); } catch (_) {}

                        savedData.filePath = targetPath;
                        savedData.fileName = path.basename(targetPath);
                    } else {
                        savedData.content = q.text || input || '';
                    }

                    if (setMentionReply(savedData)) {
                        reply(`✅ Mention reply set successfully!\n\n*Type:* \`${savedData.type.toUpperCase()}\`\n*Content:* _${savedData.content || savedData.caption || 'Media file saved'}_`);
                    } else {
                        reply('❌ Failed to save mention reply.');
                    }
                    return;
                } catch (e) {
                    console.error('Error setting mention reply from quote:', e);
                    return reply('❌ Error saving replied media. Please try again.');
                }
            }

            // Case B: User gave text input
            if (input && input.trim()) {
                const savedData = {
                    type: 'text',
                    content: input.trim(),
                    caption: '',
                    timestamp: new Date().toISOString()
                };

                if (setMentionReply(savedData)) {
                    reply(`✅ Text mention reply set successfully!\n\n*Content:* _${savedData.content}_`);
                } else {
                    reply('❌ Failed to save text mention reply.');
                }
                return;
            }

            reply(`Please provide text or reply to a message!\n\n*Usage:*\n• \`${prefix}cmention set Hello there!\`\n• Reply to an audio/video/image and type \`${prefix}cmention set\``);
            break;
        }

        case 'type': {
            const valid = ['audio', 'video', 'both', 'text'];
            const val = input.toLowerCase().trim();
            if (!val || !valid.includes(val)) {
                return reply(`_Invalid type! Use: audio, video, or both_\n\n*Example:* \`${prefix}cmention type audio\``);
            }
            const cfg = loadCmentionConfig();
            cfg.responseType = val;
            if (saveCmentionConfig(cfg)) {
                reply(`✅ Response type set to: *${val.toUpperCase()}*`);
            } else {
                reply('❌ Failed to update settings.');
            }
            break;
        }

        case 'help': {
            const helpText = `*Auto Mention Reply Help* 🤖\n\n` +
                `When someone mentions @bot or SUDO users, the bot automatically responds.\n\n` +
                `*Commands:*\n` +
                `• \`${prefix}cmention set\` - Reply to any message to set it as mention response\n` +
                `• \`${prefix}cmention set <text>\` - Set text as mention response\n` +
                `• \`${prefix}cmention get\` - View current mention response\n` +
                `• \`${prefix}cmention del\` - Delete custom mention response\n` +
                `• \`${prefix}cmention type <audio/video/both>\` - Choose pool response type\n` +
                `• \`${prefix}addcmentionaudio <name>\` - Add audio to random pool\n` +
                `• \`${prefix}addcmentionvideo <name>\` - Add video to random pool\n` +
                `• \`${prefix}listcmention\` - List all media pool files\n` +
                `• \`${prefix}me\` - Mention bot to test function in DM/group\n\n` +
                `_All replies are sent cleanly without fake product cards or hardcoded identities._`;
            reply(helpText);
            break;
        }

        default:
            reply(`Unknown subcommand: \`${subcommand}\`\nUse \`${prefix}cmention help\` for commands.`);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//  2. NEW COMMAND: .me (MENTION BOT NUMBER IN DM & GROUPS TO TEST CMENTION)
// ═══════════════════════════════════════════════════════════════════════════
cmd({
    pattern: 'me',
    alias: ['botme', 'checkmention', 'testmention'],
    react: '👋',
    desc: 'Mention the bot number in DM and groups for checking the cmention function',
    category: 'main',
    filename: __filename
}, async (conn, mek, m, { from, botNumber, reply }) => {
    try {
        const cleanNumber = botNumber || (conn.user?.id ? conn.user.id.split(':')[0].split('@')[0] : '');
        const botJid = cleanNumber + '@s.whatsapp.net';

        // 1. Send the mention message containing the bot's own number
        await conn.sendMessage(from, {
            text: `👋 @${cleanNumber}`,
            mentions: [botJid]
        }, { quoted: mek });

        // 2. Trigger the cmention response immediately to demonstrate and test the function!
        await executeMentionResponse(conn, from, mek, cleanNumber);

    } catch (e) {
        console.error('Error in .me command:', e);
        reply(`❌ Error testing mention: ${e.message}`);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//  3. POOL MANAGEMENT COMMANDS (.addcmentionaudio, .addcmentionvideo, .listcmention)
// ═══════════════════════════════════════════════════════════════════════════
cmd({
    pattern: 'addcmentionaudio',
    react: '🎵',
    desc: 'Add audio to mention pool by replying to audio/voice note',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this.');
    if (!m.quoted) return reply('Please reply to an audio or voice note message!');

    let name = args.join('_').trim().toLowerCase() || `audio_${Date.now()}`;
    name = name.replace(/[^a-z0-9_-]/g, '_');

    try {
        reply('⏳ Saving mention audio...');
        const mediaPath = await m.quoted.download();
        const filePath = path.join(AUDIO_DIR, `${name}.mp3`);
        fs.copyFileSync(mediaPath, filePath);
        try { fs.unlinkSync(mediaPath); } catch (_) {}
        reply(`✅ Mention audio saved as: *${name}.mp3*\n\nTotal mention audios: ${fs.readdirSync(AUDIO_DIR).length}`);
    } catch (e) {
        reply('🚫 Failed to save audio.');
    }
});

cmd({
    pattern: 'addcmentionvideo',
    react: '🎬',
    desc: 'Add video to mention pool by replying to a video',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this.');
    if (!m.quoted) return reply('Please reply to a video message!');

    let name = args.join('_').trim().toLowerCase() || `video_${Date.now()}`;
    name = name.replace(/[^a-z0-9_-]/g, '_');

    try {
        reply('⏳ Saving mention video...');
        const mediaPath = await m.quoted.download();
        const filePath = path.join(VIDEO_DIR, `${name}.mp4`);
        fs.copyFileSync(mediaPath, filePath);
        try { fs.unlinkSync(mediaPath); } catch (_) {}
        reply(`✅ Mention video saved as: *${name}.mp4*\n\nTotal mention videos: ${fs.readdirSync(VIDEO_DIR).length}`);
    } catch (e) {
        reply('🚫 Failed to save video.');
    }
});

cmd({
    pattern: 'delcmentionaudio',
    react: '🗑️',
    desc: 'Delete a mention audio by name',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this.');
    const name = args.join('_').trim().toLowerCase();
    if (!name) return reply('Please specify the audio name to delete. Use `.listcmention` to view names.');

    const exts = ['.mp3', '.ogg', '.opus', '.m4a', ''];
    let deleted = false;
    for (const ext of exts) {
        const p = path.join(AUDIO_DIR, name + ext);
        if (fs.existsSync(p)) {
            fs.unlinkSync(p);
            deleted = true;
            reply(`✅ Deleted mention audio: *${name}${ext}*`);
            break;
        }
    }
    if (!deleted) reply(`🚫 Audio not found: *${name}*`);
});

cmd({
    pattern: 'delcmentionvideo',
    react: '🗑️',
    desc: 'Delete a mention video by name',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this.');
    const name = args.join('_').trim().toLowerCase();
    if (!name) return reply('Please specify the video name to delete. Use `.listcmention` to view names.');

    const exts = ['.mp4', '.mkv', '.avi', ''];
    let deleted = false;
    for (const ext of exts) {
        const p = path.join(VIDEO_DIR, name + ext);
        if (fs.existsSync(p)) {
            fs.unlinkSync(p);
            deleted = true;
            reply(`✅ Deleted mention video: *${name}${ext}*`);
            break;
        }
    }
    if (!deleted) reply(`🚫 Video not found: *${name}*`);
});

cmd({
    pattern: 'listcmention',
    react: '📋',
    desc: 'List all custom mention pool audio and video files',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    let audios = [];
    let videos = [];
    try { audios = fs.readdirSync(AUDIO_DIR).filter(f => !f.startsWith('.')); } catch (_) {}
    try { videos = fs.readdirSync(VIDEO_DIR).filter(f => !f.startsWith('.')); } catch (_) {}

    let text = `📋 *CMention Pool Files*\n\n`;
    text += `🎵 *Audio Pool (${audios.length}):*\n`;
    if (audios.length > 0) audios.forEach((f, i) => text += `  ${i + 1}. ${f}\n`);
    else text += `  _No audio files_\n`;

    text += `\n🎬 *Video Pool (${videos.length}):*\n`;
    if (videos.length > 0) videos.forEach((f, i) => text += `  ${i + 1}. ${f}\n`);
    else text += `  _No video files_\n`;

    const saved = getMentionReply();
    text += `\n📌 *Active Custom Reply:* ${saved ? `\`${saved.type.toUpperCase()}\`` : '_None_'}\n`;
    text += `\n*Commands:*\n• \`.cmention set <text>\` - Set text response\n• \`.cmention set\` (reply) - Set media response\n• \`.me\` - Test mention response in DM/group`;

    reply(text);
});

// ═══════════════════════════════════════════════════════════════════════════
//  4. AUTO MENTION RESPONDER (TRIGGERED ON ALL TEXT / CONVERSATION MESSAGES)
// ═══════════════════════════════════════════════════════════════════════════
const mentionCooldowns = new Map();

cmd({
    on: 'text',
    desc: 'Auto-responds when bot or SUDO is mentioned',
    category: 'misc',
    filename: __filename
}, async (conn, mek, m, { botNumber, botLid }) => {
    try {
        const mentionedJids = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!Array.isArray(mentionedJids) || mentionedJids.length === 0) return;

        const cleanBotNumber = botNumber || (conn.user?.id ? conn.user.id.split(':')[0].split('@')[0] : '');
        const botJid = cleanBotNumber + '@s.whatsapp.net';
        const botLidJid = botLid ? botLid + '@lid' : '';
        const sudoUsers = global.sudo || [];
        const ownerNumbers = global.owner || [];

        let isMentioned = false;
        for (const jid of mentionedJids) {
            const num = jid.split('@')[0];
            if (jid === botJid || (botLidJid && jid === botLidJid) || num === cleanBotNumber || ownerNumbers.includes(num) || sudoUsers.includes(num)) {
                isMentioned = true;
                break;
            }
        }

        if (!isMentioned) return;

        // Anti-Ban Cooldown: 1 mention response every 8s per chat
        const now = Date.now();
        const last = mentionCooldowns.get(m.chat) || 0;
        if (now - last < 8000) return;
        mentionCooldowns.set(m.chat, now);

        await executeMentionResponse(conn, m.chat, mek, cleanBotNumber);

    } catch (e) {
        console.error('Mention response error:', e);
    }
});

// Round Video converter (.vdo)
cmd({
    pattern: 'vdo',
    alias: ['roundvid', 'ptv'],
    desc: 'Convert replied video to round video format',
    category: 'tools',
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    if (!m.quoted) return reply('Reply to a video message!');
    if (m.quoted.type !== 'videoMessage') return reply('The replied message must be a video!');

    try {
        const filePath = await m.quoted.download();
        const buffer = fs.readFileSync(filePath);
        await conn.sendMessage(m.chat, { video: buffer, ptv: true }, { quoted: mek });
        try { fs.unlinkSync(filePath); } catch (_) {}
    } catch (error) {
        console.error('Round video error:', error);
        reply('Failed to convert video!');
    }
});

module.exports = {
    executeMentionResponse,
    getMentionReply,
    setMentionReply,
    deleteMentionReply
};
