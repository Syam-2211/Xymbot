const { cmd } = require('../command');
const { runtime } = require('../lib/functions');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════════════════
//  COMMAND CATALOG
// ═══════════════════════════════════════════════════════════════════════════
const COMMAND_SECTIONS = [
    {
        key: 'main',
        name: 'Main Commands',
        emoji: '🏠',
        commands: [
            { cmd: 'menu',      args: '[category]',    desc: 'Interactive category menu' },
            { cmd: 'allmenu',   args: '',               desc: 'Full command list (text)' },
            { cmd: 'help',      args: '<command>',      desc: 'Detailed command help' },
            { cmd: 'alive',     args: '',               desc: 'Check bot online heartbeat' },
            { cmd: 'ping',      args: '',               desc: 'Response latency speed' },
            { cmd: 'uptime',    args: '',               desc: 'Bot running uptime' },
            { cmd: 'whois',     args: '@user',          desc: 'Profile and number info' },
            { cmd: 'jid',       args: '',               desc: 'Show user or group JID' },
            { cmd: 'owner',     args: '',               desc: 'Developer & owner contact' },
            { cmd: 'speed',     args: '',               desc: 'System RAM & CPU speeds' },
            { cmd: 'me',        args: '',               desc: 'Mention bot in DM/group' }
        ]
    },
    {
        key: 'download',
        name: 'Downloader',
        emoji: '📥',
        commands: [
            { cmd: 'play',       args: '<song name>',  desc: 'Download song MP3' },
            { cmd: 'ytmp3',      args: '<link>',       desc: 'YouTube to MP3 audio' },
            { cmd: 'video',      args: '<link>',       desc: 'YouTube MP4 video' },
            { cmd: 'ytmp4',      args: '<link>',       desc: 'YouTube HD video' },
            { cmd: 'spotify',    args: '<link>',       desc: 'Spotify track DL' },
            { cmd: 'spotifydl',  args: '<link>',       desc: 'Spotify song download' },
            { cmd: 'tiktok',     args: '<link>',       desc: 'TikTok no watermark' },
            { cmd: 'ttmp3',      args: '<link>',       desc: 'TikTok audio DL' },
            { cmd: 'instagram',  args: '<link>',       desc: 'Instagram post/reel' },
            { cmd: 'igstory',    args: '<user>',       desc: 'Instagram story DL' },
            { cmd: 'facebook',   args: '<link>',       desc: 'Facebook video DL' },
            { cmd: 'twitter',    args: '<link>',       desc: 'Twitter/X video DL' },
            { cmd: 'pinterest',  args: '<query>',      desc: 'Pinterest download' },
            { cmd: 'mediafire',  args: '<link>',       desc: 'MediaFire file DL' },
            { cmd: 'capcut',     args: '<link>',       desc: 'CapCut template DL' },
            { cmd: 'reddit',     args: '<link>',       desc: 'Reddit media DL' },
            { cmd: 'gitclone',   args: '<link>',       desc: 'Clone GitHub repo' },
            { cmd: 'dl',         args: '<link>',       desc: 'Universal multi-platform DL' }
        ]
    },
    {
        key: 'search',
        name: 'Search Tools',
        emoji: '🔍',
        commands: [
            { cmd: 'google',   args: '<query>',   desc: 'Google live search' },
            { cmd: 'wiki',     args: '<topic>',   desc: 'Wikipedia summary' },
            { cmd: 'weather',  args: '<city>',    desc: 'Live weather report' },
            { cmd: 'news',     args: '<topic>',   desc: 'Latest headlines' },
            { cmd: 'lyrics',   args: '<song>',    desc: 'Song lyrics search' },
            { cmd: 'define',   args: '<word>',    desc: 'Dictionary meaning' }
        ]
    },
    {
        key: 'ai',
        name: 'AI & Filters',
        emoji: '🤖',
        commands: [
            { cmd: 'ai',        args: '<question>',    desc: 'Gemini AI assistant' },
            { cmd: 'gpt',       args: '<question>',    desc: 'GPT chat model' },
            { cmd: 'aigen',     args: '<prompt>',      desc: 'AI image generator' },
            { cmd: 'describe',  args: '(reply img)',   desc: 'AI vision analyze' },
            { cmd: 'ocr',       args: '(reply img)',   desc: 'Extract text from photo' },
            { cmd: 'toanime',   args: '(reply img)',   desc: 'Convert image to anime' },
            { cmd: 'toghibli',  args: '(reply img)',   desc: 'Studio Ghibli style' },
            { cmd: 'tocartoon', args: '(reply img)',   desc: 'Cartoon effect' },
            { cmd: 'tochibi',   args: '(reply img)',   desc: 'Chibi filter' },
            { cmd: 'to3d',      args: '(reply img)',   desc: '3D avatar render' },
            { cmd: 'tomanga',   args: '(reply img)',   desc: 'Manga line art' },
            { cmd: 'faceswap',  args: '(reply img)',   desc: 'AI face swap' },
            { cmd: 'colorize',  args: '(reply img)',   desc: 'Colorize B&W photo' }
        ]
    },
    {
        key: 'tools',
        name: 'Converter & Tools',
        emoji: '🪄',
        commands: [
            { cmd: 'sticker',   args: '(reply media)',    desc: 'Create WA sticker' },
            { cmd: 'toimg',     args: '(reply sticker)',  desc: 'Sticker to image' },
            { cmd: 'tomp3',     args: '(reply vid/aud)',  desc: 'Extract MP3 audio' },
            { cmd: 'tovideo',   args: '(reply stick)',    desc: 'Animated sticker to vid' },
            { cmd: 'togif',     args: '(reply sticker)',  desc: 'Sticker to GIF' },
            { cmd: 'tovn',      args: '(reply audio)',    desc: 'Convert to voice note' },
            { cmd: 'nobg',      args: '(reply img)',      desc: 'Remove photo bg' },
            { cmd: 'url',       args: '(reply media)',    desc: 'Upload to Catbox url' },
            { cmd: 'short',     args: '<url>',            desc: 'Shorten web link' },
            { cmd: 'translate', args: '<lang>',           desc: 'Translate message' },
            { cmd: 'tts',       args: '<text>',           desc: 'Text to speech audio' },
            { cmd: 'fancy',     args: '<text>',           desc: 'Stylish fancy fonts' },
            { cmd: 'vv',        args: '(reply viewonce)', desc: 'Anti-viewonce grab' },
            { cmd: 'bass',      args: '(reply audio)',    desc: 'Bass boosted audio' },
            { cmd: 'slow',      args: '(reply audio)',    desc: 'Slowed reverb audio' },
            { cmd: 'robot',     args: '(reply audio)',    desc: 'Robot voice filter' }
        ]
    },
    {
        key: 'canvas',
        name: 'Maker & Canvas',
        emoji: '🎨',
        commands: [
            { cmd: 'brat',       args: '<text>',       desc: 'Brat aesthetic sticker' },
            { cmd: 'bratvid',    args: '<text>',       desc: 'Brat animated video' },
            { cmd: 'qc',         args: '<text>',       desc: 'Quote card generator' },
            { cmd: 'storyig',    args: '<text>',       desc: 'IG story banner' },
            { cmd: 'balogo',     args: '<text|text>',  desc: 'Blue Archive logo' },
            { cmd: 'fakestory',  args: '<text>',       desc: 'Fake status generator' },
            { cmd: 'faketweet',  args: '<text>',       desc: 'Fake Twitter tweet' },
            { cmd: 'math',       args: '(reply img)',  desc: 'Math solver canvas' }
        ]
    },
    {
        key: 'game',
        name: 'Games & Fun',
        emoji: '🎯',
        commands: [
            { cmd: 'tictactoe',    args: '@user',  desc: 'Play Tic-Tac-Toe' },
            { cmd: 'werewolf',     args: '',        desc: 'Werewolf village game' },
            { cmd: 'dungeon',      args: '',        desc: 'Dungeon RPG raid' },
            { cmd: 'minecraft',    args: '',        desc: 'Text minecraft sandbox' },
            { cmd: 'fishing',      args: '',        desc: 'Fishing rod catching' },
            { cmd: 'family100',    args: '',        desc: 'Family 100 quiz show' },
            { cmd: 'tebakgambar', args: '',         desc: 'Guess the picture' },
            { cmd: 'tebakbendera',args: '',         desc: 'Guess country flag' },
            { cmd: 'riddle',       args: '',        desc: 'Mind riddle question' },
            { cmd: 'joke',         args: '',        desc: 'Funny joke' },
            { cmd: 'quote',        args: '',        desc: 'Inspiring quotes' },
            { cmd: 'meme',         args: '',        desc: 'Random comedy meme' }
        ]
    },
    {
        key: 'group',
        name: 'Group Commands',
        emoji: '👥',
        commands: [
            { cmd: 'kick',        args: '@user',      desc: 'Remove member' },
            { cmd: 'add',         args: '<number>',   desc: 'Add member to group' },
            { cmd: 'promote',     args: '@user',      desc: 'Make member admin' },
            { cmd: 'demote',      args: '@user',      desc: 'Remove admin role' },
            { cmd: 'tagall',      args: '<msg>',      desc: 'Mention all members' },
            { cmd: 'hidetag',     args: '<msg>',      desc: 'Invisible mass mention' },
            { cmd: 'mute',        args: '',           desc: 'Close group chat' },
            { cmd: 'unmute',      args: '',           desc: 'Open group chat' },
            { cmd: 'invite',      args: '',           desc: 'Get group link' },
            { cmd: 'setname',     args: '<name>',     desc: 'Change group subject' },
            { cmd: 'setdesc',     args: '<text>',     desc: 'Change group description' },
            { cmd: 'antilink',    args: 'on/off',     desc: 'Auto-kick link spammers' },
            { cmd: 'badword',     args: 'on/off',     desc: 'Filter abusive words' },
            { cmd: 'antidelete',  args: 'on/off',     desc: 'Catch deleted messages' },
            { cmd: 'antispam',    args: 'on/off',     desc: 'Rate limit spammers' },
            { cmd: 'warn',        args: '@user',      desc: 'Issue warning strike' },
            { cmd: 'resetwarn',   args: '@user',      desc: 'Clear member warnings' },
            { cmd: 'welcome',     args: 'on/off',     desc: 'New member greeting' },
            { cmd: 'goodbye',     args: 'on/off',     desc: 'Farewell goodbye message' }
        ]
    },
    {
        key: 'owner',
        name: 'Owner Panel',
        emoji: '👑',
        commands: [
            { cmd: 'setbotname',    args: '<name>',           desc: 'Change bot display name' },
            { cmd: 'setownername',  args: '<name>',           desc: 'Change owner display name' },
            { cmd: 'setprefix',     args: '<char>',           desc: 'Change command prefix' },
            { cmd: 'setowner',      args: '<number>',         desc: 'Change owner number' },
            { cmd: 'mode',          args: 'public/private',   desc: 'Switch bot access mode' },
            { cmd: 'sudo',          args: 'add/del/list',     desc: 'Manage sudo operators' },
            { cmd: 'join',          args: '<link>',           desc: 'Join group via invite' },
            { cmd: 'leave',         args: '',                 desc: 'Exit current group' },
            { cmd: 'broadcast',     args: '<msg>',            desc: 'Send blast to all chats' },
            { cmd: 'block',         args: '@user',            desc: 'Block user from bot' },
            { cmd: 'unblock',       args: '@user',            desc: 'Unblock user' },
            { cmd: 'blockchat',     args: '',                 desc: 'Mute bot in this chat' },
            { cmd: 'restart',       args: '',                 desc: 'Reboot bot process' },
            { cmd: 'setcmdaudio',   args: '<cmd>',            desc: 'Attach voice note to cmd' },
            { cmd: 'delcmdaudio',   args: '<cmd>',            desc: 'Delete cmd voice note' }
        ]
    }
];

const getTotalCommands = () =>
    COMMAND_SECTIONS.reduce((acc, sec) => acc + sec.commands.length, 0);

// ═══════════════════════════════════════════════════════════════════════════
//  BOT META
// ═══════════════════════════════════════════════════════════════════════════
const getMeta = (pushname = 'User') => {
    const botName  = global.botName   || '🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊';
    const owner    = global.ownerName || '🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓';
    const packname = global.packname  || '✪⃝⸸ꜛꪶ͢𝐒𝐘͔𝐀𝐌 𝐒𝐄𝐑͢ꫂꜜ™';
    const shortBot = 'XYMBOT';
    const signature= '𝑆𝑌𝛥𝛭.3𝐹𝛸';
    const alias    = '複| xʏᴀᴍツ';
    const uptime   = runtime(process.uptime());
    const mode     = (global.WORKTYPE || 'public').toUpperCase();
    const prefix   = global.PREFIX || '.';
    const platform = os.platform() === 'win32' ? 'Windows 🪟'
                   : os.platform() === 'linux'  ? 'Linux 🐧' : 'Mac 🍎';
    const now      = new Date();
    const timeStr  = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr  = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const total    = getTotalCommands();
    return { botName, owner, packname, shortBot, signature, alias, uptime, mode, prefix, platform, timeStr, dateStr, total, pushname };
};

// ═══════════════════════════════════════════════════════════════════════════
//  RENZONA BOX-DRAWING STYLE
// ═══════════════════════════════════════════════════════════════════════════
function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4  && h < 12) return 'Good Morning ☀️';
    if (h >= 12 && h < 17) return 'Good Afternoon 🌤️';
    if (h >= 17 && h < 21) return 'Good Evening 🌆';
    return 'Good Night 🌙';
}

function box(title, lines) {
    let text = `╭── 〔 ${title} 〕\n`;
    for (const line of lines) text += `│ ◈ ${line}\n`;
    text += `╰────────────────\n\n`;
    return text;
}

// Build full menu text (all categories)
function buildFullMenu(meta) {
    let text = `『 ⚡ *${meta.botName}* ALL MENU ⚡ 』\n`;
    text += `${getGreeting()}, *${meta.pushname}*! 🌟\n\n`;

    text += box('🤖 BOT INFO', [
        `Bot Name  : ${meta.botName}`,
        `Owner     : ${meta.owner}`,
        `Alias     : ${meta.alias}`,
        `Prefix    : [ ${meta.prefix} ]`,
        `Mode      : ${meta.mode}`,
        `Uptime    : ${meta.uptime}`,
        `Commands  : ${meta.total}`,
        `Platform  : ${meta.platform}`,
        `Time      : ${meta.timeStr} | ${meta.dateStr}`
    ]);

    text += box('🔖 ACCESS LEGEND', [
        'Ⓞ = Owner only',
        'Ⓐ = Group admin only',
        'Ⓕ = Free for all'
    ]);

    for (const sec of COMMAND_SECTIONS) {
        const lines = sec.commands.map(c =>
            `${meta.prefix}${c.cmd}${c.args ? ' ' + c.args : ''} — ${c.desc}`
        );
        text += box(`${sec.emoji} ${sec.name.toUpperCase()} (${sec.commands.length})`, lines);
    }

    text += `💡 *Tip:* Type *${meta.prefix}menu <category>* to view one section\n`;
    text += `🔧 *Customize:* ${meta.prefix}setbotname | ${meta.prefix}setprefix | ${meta.prefix}mode | ${meta.prefix}sudo\n\n`;
    text += `> © ${meta.signature} • ${meta.packname} • ${meta.alias}`;
    return text;
}

// Build single-category text
function buildCategoryMenu(catKey, meta) {
    const sec = COMMAND_SECTIONS.find(s => s.key === catKey);
    if (!sec) return `⚠️ Category not found: *${catKey}*\n\nAvailable: ${COMMAND_SECTIONS.map(s => s.key).join(', ')}`;

    let text = `『 ${sec.emoji} *${sec.name.toUpperCase()} MENU* 』\n\n`;
    const lines = sec.commands.map(c =>
        `${meta.prefix}${c.cmd}${c.args ? ' ' + c.args : ''} — ${c.desc}`
    );
    text += box(`${sec.emoji} ${sec.name.toUpperCase()} (${sec.commands.length})`, lines);
    text += `💡 Type *${meta.prefix}menu* for the full interactive menu\n`;
    text += `> © ${meta.signature} • ${meta.alias} • ${meta.botName}`;
    return text;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MENU AUDIO HELPER
// ═══════════════════════════════════════════════════════════════════════════
const sendMenuAudio = async (conn, from, mek) => {
    try {
        const audioPath = path.join(__dirname, '../assets/audio/menu.mp3');
        if (fs.existsSync(audioPath)) {
            const buf = fs.readFileSync(audioPath);
            await conn.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', ptt: false }, { quoted: mek });
        }
    } catch (_) {}
};

// ═══════════════════════════════════════════════════════════════════════════
//  INTERACTIVE CATEGORY SELECTOR (nativeFlowMessage / single_select)
// ═══════════════════════════════════════════════════════════════════════════
const sendInteractiveMenu = async (conn, from, mek, meta) => {
    const rows = COMMAND_SECTIONS.map(sec => ({
        header: `${sec.emoji} ${sec.name}`,
        title:  `${sec.emoji} ${sec.name}`,
        description: `${sec.commands.length} commands — tap to view`,
        id: `${meta.prefix}menu ${sec.key}`
    }));

    const bodyText =
        `${getGreeting()}, *${meta.pushname}*! 🌟\n\n` +
        `🤖 *${meta.botName}*\n` +
        `👑 Owner : ${meta.owner}\n` +
        `⚡ Mode  : ${meta.mode}  |  Prefix: [ ${meta.prefix} ]\n` +
        `⏱️ Uptime: ${meta.uptime}  |  ${meta.total} Commands\n\n` +
        `Select a category below 👇`;

    const footerText = `${meta.packname} • ${meta.alias}`;
    const headerTitle = `✨ ${meta.botName} ✨`;

    const interactiveMsg = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body:   { text: bodyText },
                    footer: { text: footerText },
                    header: { title: headerTitle, hasMediaAttachment: false },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: 'single_select',
                                buttonParamsJson: JSON.stringify({
                                    title: '📋 Browse Categories',
                                    sections: [{ title: '📂 All Categories', rows }]
                                })
                            }
                        ]
                    }
                }
            }
        }
    };

    try {
        await conn.relayMessage(from, interactiveMsg, {});
        await sendMenuAudio(conn, from, mek);
        return true;
    } catch (err) {
        console.warn('Interactive menu failed, falling back to text:', err.message);
        return false;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN MENU COMMAND
// ═══════════════════════════════════════════════════════════════════════════
cmd({
    pattern: 'menu',
    alias: ['start', 'help', 'list', 'commands'],
    react: '🦅',
    desc: 'Show interactive category menu. Use .menu <category> for one section',
    category: 'main',
    filename: __filename
},
async (conn, mek, m, { from, pushname, args, reply }) => {
    const rawArg = args.length ? args.join(' ').toLowerCase().trim() : '';
    const meta = getMeta(pushname);

    // If a category key was given (e.g. .menu download, .menu ai, .menu group)
    if (rawArg) {
        const matched = COMMAND_SECTIONS.find(
            s => s.key.toLowerCase() === rawArg ||
                 s.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(rawArg.replace(/[^a-z0-9]/g, ''))
        );
        if (matched) {
            const catText = buildCategoryMenu(matched.key, meta);
            return conn.sendMessage(from, { text: catText }, { quoted: mek });
        }
    }

    // Default: interactive single_select, fallback to full text
    const ok = await sendInteractiveMenu(conn, from, mek, meta);
    if (!ok) {
        const fullText = buildFullMenu(meta);
        await conn.sendMessage(from, { text: fullText }, { quoted: mek });
        await sendMenuAudio(conn, from, mek);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ALLMENU — full text dump
// ═══════════════════════════════════════════════════════════════════════════
cmd({
    pattern: 'allmenu',
    alias: ['menuall', 'fullmenu'],
    react: '📋',
    desc: 'Full command list in Renzona box style',
    category: 'main',
    filename: __filename
},
async (conn, mek, m, { from, pushname }) => {
    const meta = getMeta(pushname);
    const text = buildFullMenu(meta);
    await conn.sendMessage(from, { text }, { quoted: mek });
    await sendMenuAudio(conn, from, mek);
});

// ═══════════════════════════════════════════════════════════════════════════
//  SUB-MENUS — per-category quick-access commands
// ═══════════════════════════════════════════════════════════════════════════
const subMenusConfig = [
    { cmd: 'dlmenu',      key: 'download', desc: 'Downloader Menu',         react: '📥' },
    { cmd: 'searchmenu',  key: 'search',   desc: 'Search Tools Menu',       react: '🔍' },
    { cmd: 'aimenu',      key: 'ai',       desc: 'AI & Filters Menu',       react: '🤖' },
    { cmd: 'toolmenu',    key: 'tools',    desc: 'Converters & Tools Menu', react: '🪄' },
    { cmd: 'canvasmenu',  key: 'canvas',   desc: 'Maker & Canvas Menu',     react: '🎨' },
    { cmd: 'gamemenu',    key: 'game',     desc: 'Games & Fun Menu',        react: '🎯' },
    { cmd: 'gmenu',       key: 'group',    desc: 'Group Commands Menu',     react: '👥' },
    { cmd: 'gsmenu',      key: 'group',    desc: 'Group Settings Menu',     react: '🛡️' },
    { cmd: 'ownermenu',   key: 'owner',    desc: 'Owner Commands Menu',     react: '👑' },
    { cmd: 'mainmenu',    key: 'main',     desc: 'General Commands Menu',   react: '🏠' },
];

subMenusConfig.forEach(conf => {
    cmd({
        pattern: conf.cmd,
        react: conf.react,
        desc: conf.desc,
        category: 'main',
        filename: __filename
    },
    async (conn, mek, m, { from, pushname, isGroup, reply }) => {
        if ((conf.cmd === 'gmenu' || conf.cmd === 'gsmenu') && !isGroup) {
            return reply('⚠️ This command is for groups only!');
        }
        const meta = getMeta(pushname);
        const text = buildCategoryMenu(conf.key, meta);
        await conn.sendMessage(from, { text }, { quoted: mek });
    });
});
