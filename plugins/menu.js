const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');

// ═══════════════════════════════════════════════════════════════════════════
//  XYMBOT COMMAND CATALOG (Grouped by Category)
// ═══════════════════════════════════════════════════════════════════════════
const COMMAND_SECTIONS = [
    {
        key: 'download',
        name: 'Downloader',
        emoji: '📥',
        commands: [
            { cmd: 'play', args: '<song name>', desc: 'Download song MP3' },
            { cmd: 'ytmp3', args: '<link>', desc: 'YouTube to MP3 audio' },
            { cmd: 'video', args: '<link>', desc: 'YouTube MP4 video' },
            { cmd: 'ytmp4', args: '<link>', desc: 'YouTube HD video' },
            { cmd: 'spotify', args: '<link>', desc: 'Spotify track DL' },
            { cmd: 'spotifydl', args: '<link>', desc: 'Spotify song download' },
            { cmd: 'tiktok', args: '<link>', desc: 'TikTok no watermark' },
            { cmd: 'ttmp3', args: '<link>', desc: 'TikTok audio DL' },
            { cmd: 'instagram', args: '<link>', desc: 'Instagram post/reel' },
            { cmd: 'igstory', args: '<user>', desc: 'Instagram story DL' },
            { cmd: 'facebook', args: '<link>', desc: 'Facebook video DL' },
            { cmd: 'twitter', args: '<link>', desc: 'Twitter/X video DL' },
            { cmd: 'pinterest', args: '<query>', desc: 'Pinterest download' },
            { cmd: 'mediafire', args: '<link>', desc: 'MediaFire file DL' },
            { cmd: 'capcut', args: '<link>', desc: 'CapCut template DL' },
            { cmd: 'reddit', args: '<link>', desc: 'Reddit media DL' },
            { cmd: 'gitclone', args: '<link>', desc: 'Clone GitHub repo' },
            { cmd: 'dl', args: '<link>', desc: 'Universal multi-platform DL' }
        ]
    },
    {
        key: 'search',
        name: 'Search Tools',
        emoji: '🔎',
        commands: [
            { cmd: 'google', args: '<query>', desc: 'Google live search' },
            { cmd: 'wiki', args: '<topic>', desc: 'Wikipedia summary' },
            { cmd: 'weather', args: '<city>', desc: 'Live weather report' },
            { cmd: 'news', args: '<topic>', desc: 'Latest headlines' },
            { cmd: 'lyrics', args: '<song>', desc: 'Song lyrics search' },
            { cmd: 'define', args: '<word>', desc: 'Dictionary meaning' }
        ]
    },
    {
        key: 'ai',
        name: 'AI & Filters',
        emoji: '🤖',
        commands: [
            { cmd: 'ai', args: '<question>', desc: 'Gemini AI assistant' },
            { cmd: 'gpt', args: '<question>', desc: 'GPT chat model' },
            { cmd: 'aigen', args: '<prompt>', desc: 'AI image generator' },
            { cmd: 'describe', args: '(reply img)', desc: 'AI vision analyze' },
            { cmd: 'ocr', args: '(reply img)', desc: 'Extract text from photo' },
            { cmd: 'toanime', args: '(reply img)', desc: 'Convert image to anime' },
            { cmd: 'toghibli', args: '(reply img)', desc: 'Studio Ghibli style' },
            { cmd: 'tocartoon', args: '(reply img)', desc: 'Cartoon effect' },
            { cmd: 'tochibi', args: '(reply img)', desc: 'Chibi filter' },
            { cmd: 'to3d', args: '(reply img)', desc: '3D avatar render' },
            { cmd: 'tomanga', args: '(reply img)', desc: 'Manga line art' },
            { cmd: 'faceswap', args: '(reply img)', desc: 'AI face swap' },
            { cmd: 'colorize', args: '(reply img)', desc: 'Colorize B&W photo' }
        ]
    },
    {
        key: 'tools',
        name: 'Converters & Tools',
        emoji: '🛠️',
        commands: [
            { cmd: 'vv', args: '(reply viewonce)', desc: 'Recover View-Once media' },
            { cmd: 'sticker', args: '(reply img/vid)', desc: 'Create sticker' },
            { cmd: 'toimg', args: '(reply sticker)', desc: 'Sticker to image' },
            { cmd: 'tomp3', args: '(reply video)', desc: 'Video to MP3 audio' },
            { cmd: 'toblack', args: '(reply video)', desc: 'Black screen video' },
            { cmd: 'nobg', args: '(reply img)', desc: 'Remove background' },
            { cmd: 'tts', args: '<text>', desc: 'Text to voice note' },
            { cmd: 'trt', args: '<lang> <text>', desc: 'Translate text' },
            { cmd: 'short', args: '<url>', desc: 'Shorten URL' },
            { cmd: 'url', args: '(reply media)', desc: 'Upload media to URL' },
            { cmd: 'fancy', args: '<text>', desc: 'Fancy text styles' },
            { cmd: 'bass', args: '(reply audio)', desc: 'Bass boost audio' },
            { cmd: 'whois', args: '@user', desc: 'User profile info' },
            { cmd: 'jid', args: '', desc: 'Get chat/user JID' }
        ]
    },
    {
        key: 'canvas',
        name: 'Maker & Canvas',
        emoji: '🎨',
        commands: [
            { cmd: 'logo', args: '<text>', desc: 'Create custom logo' },
            { cmd: 'take', args: '<pack|author>', desc: 'Steal/rename sticker' }
        ]
    },
    {
        key: 'game',
        name: 'Games & Fun',
        emoji: '🎮',
        commands: [
            { cmd: 'truth', args: '', desc: 'Truth question' },
            { cmd: 'dare', args: '', desc: 'Dare challenge' }
        ]
    },
    {
        key: 'group',
        name: 'Group & Security',
        emoji: '👥',
        commands: [
            { cmd: 'kick', args: '@user', desc: 'Remove member' },
            { cmd: 'add', args: '<number>', desc: 'Add member' },
            { cmd: 'promote', args: '@user', desc: 'Make admin' },
            { cmd: 'demote', args: '@user', desc: 'Remove admin' },
            { cmd: 'mute', args: '', desc: 'Close group chat' },
            { cmd: 'unmute', args: '', desc: 'Open group chat' },
            { cmd: 'tagall', args: '<msg>', desc: 'Tag all members' },
            { cmd: 'hidetag', args: '<msg>', desc: 'Hidden tag all' },
            { cmd: 'warn', args: '@user', desc: 'Warn member' },
            { cmd: 'antilink', args: '<on/off>', desc: 'Anti-link guard' },
            { cmd: 'antidelete', args: '<on/off>', desc: 'Anti-delete guard' },
            { cmd: 'badword', args: '<on/off/add>', desc: 'Badword filter' },
            { cmd: 'ginfo', args: '', desc: 'Group info' },
            { cmd: 'invite', args: '', desc: 'Group invite link' }
        ]
    },
    {
        key: 'main',
        name: 'Core & Info',
        emoji: '🏠',
        commands: [
            { cmd: 'menu', args: '[category]', desc: 'Interactive category menu' },
            { cmd: 'allmenu', args: '', desc: 'Show all commands' },
            { cmd: 'alive', args: '', desc: 'Check bot status' },
            { cmd: 'ping', args: '', desc: 'Check bot speed' },
            { cmd: 'runtime', args: '', desc: 'Bot uptime' },
            { cmd: 'owner', args: '', desc: 'Bot owner contact' }
        ]
    },
    {
        key: 'owner',
        name: 'Owner & Settings',
        emoji: '👑',
        commands: [
            { cmd: 'settings', args: '', desc: 'View/edit bot settings' },
            { cmd: 'setprefix', args: '<prefix>', desc: 'Change bot prefix' },
            { cmd: 'setbotname', args: '<name>', desc: 'Change bot name' },
            { cmd: 'setownername', args: '<name>', desc: 'Change owner name' },
            { cmd: 'setowner', args: '<number>', desc: 'Change owner number' },
            { cmd: 'setfooter', args: '<text>', desc: 'Change menu footer' },
            { cmd: 'setpackname', args: '<name>', desc: 'Change sticker packname' },
            { cmd: 'setauthor', args: '<name>', desc: 'Change sticker author' },
            { cmd: 'setalive', args: '<text>', desc: 'Change alive message' },
            { cmd: 'mode', args: '<public/private>', desc: 'Switch bot mode' },
            { cmd: 'sudo', args: '<add/del>', desc: 'Manage sudo users' },
            { cmd: 'block', args: '@user', desc: 'Block user' },
            { cmd: 'unblock', args: '@user', desc: 'Unblock user' },
            { cmd: 'restart', args: '', desc: 'Restart bot' }
        ]
    }
];

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function getMeta(pushname = 'User') {
    const config = require('../config');
    const prefix = (config.getPrefix && config.getPrefix()) || global.prefix || '.';
    const botName = global.botName || 'XYMBOT';
    const ownerName = global.ownerName || 'Owner';
    const ownerNumber = Array.isArray(global.owner) && global.owner[0] ? String(global.owner[0]).replace(/\D/g, '') : '';
    const footer = global.menuFooter || global.packname || `Powered by ${botName}`;
    const mode = global.botMode || (global.isPublic === false ? 'private' : 'public');
    const up = runtime(process.uptime());
    const totalCmds = commands.length || COMMAND_SECTIONS.reduce((acc, s) => acc + s.commands.length, 0);

    return {
        pushname,
        prefix,
        botName,
        ownerName,
        ownerNumber,
        footer,
        mode,
        up,
        totalCmds
    };
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
}

function box(title, lines) {
    let text = `╭─❒ ${title}\n`;
    for (const line of lines) text += `┃ ${line}\n`;
    text += `╰────────────────`;
    return text;
}

function buildCategoryText(section, meta) {
    const lines = section.commands.map(c => `${meta.prefix}${c.cmd}${c.args ? ' ' + c.args : ''}`);
    let text = `『 ⚡ *${meta.botName}* MENU 』\n\n`;
    text += box(`${section.emoji} ${section.name.toUpperCase()} (${section.commands.length})`, lines);
    text += `\n\n💡 Type *${meta.prefix}menu* to go back or *${meta.prefix}allmenu* for all commands.\n\n> ${meta.footer}`;
    return text;
}

function buildAllMenuText(meta, isOwner) {
    let text = `『 ⚡ *${meta.botName}* ALL MENU ⚡ 』\n`;
    text += `${getGreeting()}, *${meta.pushname}*! 🌟\n\n`;
    text += box('🤖 BOT INFO', [
        `Name : ${meta.botName}`,
        `Owner : ${meta.ownerName}`,
        `Prefix : ${meta.prefix}`,
        `Mode : ${meta.mode}`,
        `Uptime : ${meta.up}`,
        `Commands : ${meta.totalCmds}`
    ]) + '\n\n';

    for (const sec of COMMAND_SECTIONS) {
        if (sec.key === 'owner' && !isOwner) continue;
        const lines = sec.commands.map(c => `${meta.prefix}${c.cmd}${c.args ? ' ' + c.args : ''}`);
        text += box(`${sec.emoji} ${sec.name.toUpperCase()} (${sec.commands.length})`, lines) + '\n\n';
    }

    text += `> ${meta.footer}`;
    return text;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN .MENU COMMAND (Single Renzona/Rimuru Style)
// ═══════════════════════════════════════════════════════════════════════════
cmd({
    pattern: 'menu',
    alias: ['start', 'help', 'list', 'commands'],
    react: '⚡',
    desc: 'Show interactive category menu or .menu <category>',
    category: 'main',
    filename: __filename
},
async (conn, mek, m, { from, pushname, args, isOwner, reply }) => {
    const rawArg = args[0] ? args.join(' ').toLowerCase().trim() : '';
    const meta = getMeta(pushname);

    // 1. Specific category: .menu download, .menu ai, .menu group, etc.
    if (rawArg) {
        const matched = COMMAND_SECTIONS.find(
            s => s.key.toLowerCase() === rawArg || s.name.toLowerCase().includes(rawArg)
        );
        if (matched) {
            if (matched.key === 'owner' && !isOwner) {
                return reply(`❌ Owner category is restricted to the bot owner.\n\n> ${meta.footer}`);
            }
            return reply(buildCategoryText(matched, meta));
        }
        return reply(`❌ Category *"${rawArg}"* not found. Type *${meta.prefix}menu* to see all categories.\n\n> ${meta.footer}`);
    }

    // 2. Main Menu Body
    const caption = `╭────────────────────────────╮
│      ⚡ *${meta.botName}* MENU      │
╰────────────────────────────╯

👤 *USER INFO*
• Name : ${meta.pushname}
• Role : ${isOwner ? '👑 Owner' : '👤 Member'}

🤖 *BOT INFO*
• Name : ${meta.botName}
• Owner : ${meta.ownerName}
• Prefix : ${meta.prefix}
• Mode : ${meta.mode}
• Uptime : ${meta.up}
• Commands : ${meta.totalCmds}

⚡ Select a category below 👇 (or type *${meta.prefix}allmenu*)`;

    const rows = COMMAND_SECTIONS
        .filter(sec => sec.key !== 'owner' || isOwner)
        .map(sec => ({
            title: `${sec.emoji} ${sec.name}`,
            description: `${sec.commands.length} commands • open ${sec.name} menu`,
            id: `${meta.prefix}menu ${sec.key}`
        }));

    const buttons = [];
    if (meta.ownerNumber) {
        buttons.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '📱 Chat Owner',
                url: `https://wa.me/${meta.ownerNumber}`
            })
        });
    }
    buttons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
            display_text: '📋 All Menu',
            id: `${meta.prefix}allmenu`
        })
    });
    buttons.push({
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
            title: '📖 Select Menu',
            sections: [{ title: `Categories • ${meta.botName}`, rows }]
        })
    });

    try {
        const interactiveMsg = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: caption },
                        footer: { text: meta.footer },
                        header: { title: `⚡ ${meta.botName}`, hasMediaAttachment: false },
                        nativeFlowMessage: { buttons }
                    }
                }
            }
        };
        await conn.relayMessage(from, interactiveMsg, {});
    } catch (err) {
        console.warn('Interactive menu fallback to text:', err.message);
        await conn.sendMessage(from, { text: buildAllMenuText(meta, isOwner) }, { quoted: mek });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//  .ALLMENU COMMAND
// ═══════════════════════════════════════════════════════════════════════════
cmd({
    pattern: 'allmenu',
    alias: ['menuall', 'fullmenu'],
    react: '📋',
    desc: 'Show all commands across every category in one message',
    category: 'main',
    filename: __filename
},
async (conn, mek, m, { from, pushname, isOwner }) => {
    const meta = getMeta(pushname);
    await conn.sendMessage(from, { text: buildAllMenuText(meta, isOwner) }, { quoted: mek });
});
