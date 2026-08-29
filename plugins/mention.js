const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

// Local Paths
const ASSETS_DIR = path.join(__dirname, '../assets/mention');
const AUDIO_DIR = path.join(ASSETS_DIR, 'audio');
const VIDEO_DIR = path.join(ASSETS_DIR, 'video');
const THUMB_FILE = path.join(ASSETS_DIR, 'thumb.jpg');

// Ensure directories exist
[ASSETS_DIR, AUDIO_DIR, VIDEO_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Create a dummy thumbnail if it doesn't exist
if (!fs.existsSync(THUMB_FILE)) {
    // 1x1 transparent JPEG/PNG buffer or just write an empty file so the user knows where to put it
    fs.writeFileSync(THUMB_FILE, '');
}

// Preview configuration
const PREVIEW_CONFIG = {
    title: '🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊',
    body: '🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓',
    description: 'HABIBBI ONLY ENTERTAINMENT ! ✨',
    thumbnailUrl: 'https://instagram.com/syam.fun',
    showAd: false,
    mediaType: 1,
    amounts: ['999999', '555555', '222222']
};

const RESPONSE_TYPES = {
    AUDIO: 'audio',
    VIDEO: 'video',
    BOTH: 'both'
};

const CONFIG_FILE = path.join(__dirname, '../database/cmention_config.json');

const DEFAULT_CONFIG = {
    responseType: 'audio',
    largeThumbnail: true
};

function loadCmentionConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        }
    } catch (error) {
        console.log('Loading default cmention config...');
    }
    return DEFAULT_CONFIG;
}

function saveCmentionConfig(cfg) {
    try {
        const dir = path.dirname(CONFIG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save cmention config:', error);
        return false;
    }
}

function getCmentionConfig() { return loadCmentionConfig(); }

function createProductQuote(thumbnail, amount) {
    return {
        key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net' },
        message: {
            productMessage: {
                product: {
                    productImage: { mimetype: 'image/jpeg', jpegThumbnail: thumbnail },
                    title: PREVIEW_CONFIG.description,
                    description: PREVIEW_CONFIG.body,
                    currencyCode: 'AED',
                    priceAmount1000: amount,
                    retailerId: 'raganork',
                    productImageCount: 1
                },
                businessOwnerJid: '0@s.whatsapp.net'
            }
        }
    };
}

// Get a random file from a directory
function getRandomFile(dirPath) {
    try {
        const files = fs.readdirSync(dirPath).filter(f => fs.statSync(path.join(dirPath, f)).isFile());
        if (files.length === 0) return null;
        const randomFile = files[Math.floor(Math.random() * files.length)];
        return path.join(dirPath, randomFile);
    } catch (e) {
        return null;
    }
}

async function sendAudioResponse(conn, jid, contextInfo, quotedMsg, originalQuote) {
    const audioFile = getRandomFile(AUDIO_DIR);
    if (!audioFile) {
        console.log('No audio files found in assets/mention/audio');
        return;
    }

    const audioBuffer = fs.readFileSync(audioFile);

    await conn.sendMessage(jid, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: contextInfo
    }, { quoted: quotedMsg || originalQuote });
}

async function sendVideoResponse(conn, jid, originalQuote) {
    const videoFile = getRandomFile(VIDEO_DIR);
    if (!videoFile) {
        console.log('No video files found in assets/mention/video');
        return;
    }

    const videoBuffer = fs.readFileSync(videoFile);

    await conn.sendMessage(jid, { video: videoBuffer, ptv: true }, { quoted: originalQuote });
}

// 1. CMention Configuration Command
cmd({
    pattern: 'cmention',
    desc: 'Configure mention auto-response settings',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can configure this.');
    const input = args.join(' ').toLowerCase();

    if (!input) {
        const currentConfig = getCmentionConfig();
        const configText = `*Current CMention Settings:*\n\n` +
            `• Response Type: ${currentConfig.responseType}\n` +
            `• Large Thumbnail: ${currentConfig.largeThumbnail}\n\n` +
            `*Usage:*\n` +
            `\.cmention type audio\` - Audio responses only\n` +
            `\.cmention type video\` - Video responses only\n` +
            `\.cmention type both\` - Random audio/video\n` +
            `\.cmention thumb true\` - Enable large thumbnails\n` +
            `\.cmention thumb false\` - Disable large thumbnails\n\n` +
            `*Note:* Place your audio files in \`assets/mention/audio\` and video files in \`assets/mention/video\`!`;
        return reply(configText);
    }

    const setting = args[0];
    const value = args[1];

    if (setting === 'type') {
        const validTypes = ['audio', 'video', 'both'];
        if (!value || !validTypes.includes(value)) return reply(`_Invalid type! Use: audio, video, or both_\n\n*Example:* \`.cmention type audio\``);
        const currentConfig = getCmentionConfig();
        currentConfig.responseType = value;
        if (saveCmentionConfig(currentConfig)) reply(`✅ _CMention response type set to:_ ${value}\n\n_Settings saved permanently!_`);
        else reply(`❌ _Failed to save settings!_`);
    } else if (setting === 'thumb') {
        if (!value || !['true', 'false'].includes(value)) return reply(`_Invalid value! Use: true or false_\n\n*Example:* \`.cmention thumb true\``);
        const currentConfig = getCmentionConfig();
        currentConfig.largeThumbnail = value === 'true';
        if (saveCmentionConfig(currentConfig)) reply(`✅ _Large thumbnails set to:_ ${value}\n\n_Settings saved permanently!_`);
        else reply(`❌ _Failed to save settings!_`);
    } else {
        reply(`_Unknown setting: '${setting}'!_\n\n*Valid settings:*\n• type - Set response type\n• thumb - Set thumbnail size`);
    }
});

const { exec } = require('child_process');

// Add CMention Audio via WhatsApp
cmd({
    pattern: 'addcmentionaudio',
    react: '🎵',
    desc: 'Add a mention audio by replying to an audio/voice note',
    category: 'owner',
    use: '.addcmentionaudio <name>',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this.');
    
    let name = args.join('_').trim().toLowerCase() || `audio_${Date.now()}`;
    name = name.replace(/[^a-z0-9_-]/g, '_');
    
    if (!m.quoted) return reply('Please reply to an audio/voice note with this command.\n\nExample: Reply to audio → `.addcmentionaudio myaudio`');
    const type = m.quoted.type;
    if (type !== 'audioMessage' && type !== 'documentMessage') {
        return reply('Please reply to an audio/voice note.');
    }
    
    try {
        reply('⏳ Saving mention audio...');
        let mediaPath = await m.quoted.download();
        const filePath = path.join(AUDIO_DIR, `${name}.ogg`);
        
        exec(`ffmpeg -i "${mediaPath}" -c:a libopus -b:a 48k -vbr on -compression_level 10 "${filePath}" -y`, (err) => {
            try { fs.unlinkSync(mediaPath); } catch (e) {}
            if (err) return reply('❌ Error converting audio. Please try again.');
            reply(`✅ Mention audio saved as: *${name}.ogg*\n\nTotal mention audios: ${fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.ogg') || f.endsWith('.mp3') || f.endsWith('.opus')).length}`);
        });
    } catch (e) {
        console.error(e);
        reply('🚫 Failed to save audio.');
    }
});

// Add CMention Video via WhatsApp
cmd({
    pattern: 'addcmentionvideo',
    react: '🎬',
    desc: 'Add a mention video by replying to a video',
    category: 'owner',
    use: '.addcmentionvideo <name>',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this.');
    
    let name = args.join('_').trim().toLowerCase() || `video_${Date.now()}`;
    name = name.replace(/[^a-z0-9_-]/g, '_');
    
    if (!m.quoted) return reply('Please reply to a video with this command.\n\nExample: Reply to video → `.addcmentionvideo myvideo`');
    const type = m.quoted.type;
    if (type !== 'videoMessage') {
        return reply('Please reply to a video message.');
    }
    
    try {
        reply('⏳ Saving mention video...');
        let mediaPath = await m.quoted.download();
        const filePath = path.join(VIDEO_DIR, `${name}.mp4`);
        fs.copyFileSync(mediaPath, filePath);
        try { fs.unlinkSync(mediaPath); } catch (e) {}
        reply(`✅ Mention video saved as: *${name}.mp4*\n\nTotal mention videos: ${fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.mp4')).length}`);
    } catch (e) {
        console.error(e);
        reply('🚫 Failed to save video.');
    }
});

// Delete CMention Audio
cmd({
    pattern: 'delcmentionaudio',
    react: '🗑️',
    desc: 'Delete a mention audio by name',
    category: 'owner',
    use: '.delcmentionaudio <name>',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this.');
    
    let name = args.join('_').trim().toLowerCase();
    if (!name) return reply('Please provide the audio name to delete.\n\nExample: `.delcmentionaudio myaudio`\n\nUse `.listcmention` to see all files.');
    
    // Try with common extensions
    const extensions = ['.ogg', '.mp3', '.opus', '.m4a', '.wav'];
    let deleted = false;
    for (const ext of extensions) {
        const filePath = path.join(AUDIO_DIR, name + ext);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deleted = true;
            reply(`✅ Deleted mention audio: *${name}${ext}*`);
            break;
        }
    }
    // Also try exact filename
    if (!deleted) {
        const filePath = path.join(AUDIO_DIR, name);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deleted = true;
            reply(`✅ Deleted mention audio: *${name}*`);
        }
    }
    if (!deleted) reply(`🚫 Audio file not found: *${name}*\n\nUse \`.listcmention\` to see all files.`);
});

// Delete CMention Video
cmd({
    pattern: 'delcmentionvideo',
    react: '🗑️',
    desc: 'Delete a mention video by name',
    category: 'owner',
    use: '.delcmentionvideo <name>',
    filename: __filename
}, async (conn, mek, m, { args, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this.');
    
    let name = args.join('_').trim().toLowerCase();
    if (!name) return reply('Please provide the video name to delete.\n\nExample: `.delcmentionvideo myvideo`\n\nUse `.listcmention` to see all files.');
    
    const extensions = ['.mp4', '.mkv', '.avi', '.webm'];
    let deleted = false;
    for (const ext of extensions) {
        const filePath = path.join(VIDEO_DIR, name + ext);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deleted = true;
            reply(`✅ Deleted mention video: *${name}${ext}*`);
            break;
        }
    }
    if (!deleted) {
        const filePath = path.join(VIDEO_DIR, name);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deleted = true;
            reply(`✅ Deleted mention video: *${name}*`);
        }
    }
    if (!deleted) reply(`🚫 Video file not found: *${name}*\n\nUse \`.listcmention\` to see all files.`);
});

// List all CMention media files
cmd({
    pattern: 'listcmention',
    react: '📋',
    desc: 'List all mention audio and video files',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { isOwner, reply }) => {
    if (!isOwner) return reply('❌ Only owner can use this.');
    
    let audioFiles = [];
    let videoFiles = [];
    try { audioFiles = fs.readdirSync(AUDIO_DIR).filter(f => fs.statSync(path.join(AUDIO_DIR, f)).isFile()); } catch (e) {}
    try { videoFiles = fs.readdirSync(VIDEO_DIR).filter(f => fs.statSync(path.join(VIDEO_DIR, f)).isFile()); } catch (e) {}
    
    let text = `📋 *CMention Media Files*\n\n`;
    text += `🎵 *Audio Files (${audioFiles.length}):*\n`;
    if (audioFiles.length > 0) {
        audioFiles.forEach((f, i) => { text += `  ${i + 1}. ${f}\n`; });
    } else {
        text += `  _No audio files_\n`;
    }
    text += `\n🎬 *Video Files (${videoFiles.length}):*\n`;
    if (videoFiles.length > 0) {
        videoFiles.forEach((f, i) => { text += `  ${i + 1}. ${f}\n`; });
    } else {
        text += `  _No video files_\n`;
    }
    text += `\n*Commands:*\n• \`.addcmentionaudio <name>\` - Reply to audio\n• \`.addcmentionvideo <name>\` - Reply to video\n• \`.delcmentionaudio <name>\` - Delete audio\n• \`.delcmentionvideo <name>\` - Delete video`;
    
    reply(text);
});

// 2. Mention Auto-Responder
cmd({
    on: 'text',
    desc: 'Auto-responds when bot or SUDO is mentioned',
    category: 'misc',
    filename: __filename
}, async (conn, mek, m, { botNumber, botLid }) => {
    try {
        // Find mentioned JIDs
        let mentionedJids = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (mentionedJids.length === 0) return;

        const sudoUsers = global.sudo || [];
        const ownerNumbers = global.owner || [];
        const botJid = botNumber + '@s.whatsapp.net';
        const botLidJid = botLid ? botLid + '@lid' : '';

        let isMentioned = false;
        for (const jid of mentionedJids) {
            const num = jid.split('@')[0];
            if (jid === botJid || jid === botLidJid || ownerNumbers.includes(num) || sudoUsers.includes(num)) {
                isMentioned = true;
                break;
            }
        }

        if (!isMentioned) return;

        const currentConfig = getCmentionConfig();
        let responseType = currentConfig.responseType;
        if (responseType === RESPONSE_TYPES.BOTH) {
            responseType = Math.random() > 0.5 ? RESPONSE_TYPES.AUDIO : RESPONSE_TYPES.VIDEO;
        }

        if (responseType === RESPONSE_TYPES.AUDIO) {
            let thumbnailBuffer = null;
            if (fs.existsSync(THUMB_FILE)) {
                try {
                    thumbnailBuffer = fs.readFileSync(THUMB_FILE);
                    if (thumbnailBuffer.length === 0) thumbnailBuffer = null;
                } catch (e) { }
            }

            let contextInfo = undefined;
            let quotedMsg = mek;

            if (thumbnailBuffer) {
                contextInfo = {
                    externalAdReply: {
                        showAdAttribution: PREVIEW_CONFIG.showAd,
                        title: PREVIEW_CONFIG.title,
                        body: PREVIEW_CONFIG.body,
                        description: PREVIEW_CONFIG.description,
                        mediaType: PREVIEW_CONFIG.mediaType,
                        thumbnail: thumbnailBuffer,
                        thumbnailUrl: PREVIEW_CONFIG.thumbnailUrl,
                        renderLargerThumbnail: currentConfig.largeThumbnail
                    }
                };
                const randomAmount = PREVIEW_CONFIG.amounts[Math.floor(Math.random() * PREVIEW_CONFIG.amounts.length)];
                quotedMsg = createProductQuote(thumbnailBuffer, randomAmount);
            }

            await sendAudioResponse(conn, m.chat, contextInfo, quotedMsg, mek);
        } else {
            await sendVideoResponse(conn, m.chat, mek);
        }
    } catch (e) {
        console.error('Mention response error:', e);
    }
});

// 3. Round Video Converter
cmd({
    pattern: 'vdo',
    desc: 'Convert replied video to round video format',
    category: 'converter',
    filename: __filename
}, async (conn, mek, m, { quoted, reply }) => {
    if (!quoted) return reply('Reply to a video message!');
    if (quoted.type !== 'videoMessage') return reply('The replied message must be a video!');

    try {
        const filePath = await quoted.download();
        const stream = fs.createReadStream(filePath);

        await conn.sendMessage(m.chat, { video: { stream: stream }, ptv: true }, { quoted: mek });
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error('Round video error:', error);
        reply('Failed to convert video!');
    }
});
