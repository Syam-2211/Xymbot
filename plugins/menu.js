const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════════════════
//  GLOBAL STATE & MODES
// ═══════════════════════════════════════════════════════════════════════════
// Available styles in exact user order:
// 1. hydro (default) -> 2. nano -> 3. ourin -> 4. alya -> 5. yori -> 6. velynbot -> 7. queen anita -> 8. trinity -> 9. maochan
const STYLES_ORDER = [
    'hydro',
    'nano',
    'ourin',
    'alya',
    'yori',
    'velynbot',
    'queen anita',
    'trinity',
    'maochan'
];

// Available sending methods:
// 1. button (WhatsApp interactive list / action buttons)
// 2. card   (The other way: rich media/document card with newsletter & ad reply)
// 3. text   (Texted: image caption or pure text with audio)
const METHODS_ORDER = ['button', 'card', 'text'];

let currentStyleIndex = 0;
let currentMethodIndex = 0;

// Default modes: method rotates randomly across the 3 methods; text style rotates sequentially through the 9 styles
global.MENU_STYLE = global.MENU_STYLE || 'rotate'; // 'rotate' | 'random' | specific style
global.MENU_METHOD = global.MENU_METHOD || 'random'; // 'random' | 'rotate' | 'button' | 'card' | 'text'

// ═══════════════════════════════════════════════════════════════════════════
//  FONT CONVERSION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
const toSmallCaps = (text = '') => {
    const map = {
        a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ",
        j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
        s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ"
    };
    return String(text).toLowerCase().split('').map(c => map[c] || c).join('');
};

const spacedSmallCaps = (text = '') => {
    return toSmallCaps(text).split('').join(' ');
};

const toBoldSerif = (text = '') => {
    const chars = {
        A: "𝐀", B: "𝐁", C: "𝐂", D: "𝐃", E: "𝐄", F: "𝐅", G: "𝐆", H: "𝐇", I: "𝐈",
        J: "𝐉", K: "𝐊", L: "𝐋", M: "𝐌", N: "𝐍", O: "𝐎", P: "𝐏", Q: "𝐐", R: "𝐑",
        S: "𝐒", T: "𝐓", U: "𝐔", V: "𝐕", W: "𝐖", X: "𝐗", Y: "𝐘", Z: "𝐙",
        a: "𝐚", b: "𝐛", c: "𝐜", d: "𝐝", e: "𝐞", f: "𝐟", g: "𝐠", h: "𝐡", i: "𝐢",
        j: "𝐣", k: "𝐤", l: "𝐥", m: "𝐦", n: "𝐧", o: "𝐨", p: "𝐩", q: "𝐪", r: "𝐫",
        s: "𝐬", t: "𝐭", u: "𝐮", v: "𝐯", w: "𝐰", x: "𝐱", y: "𝐲", z: "𝐳"
    };
    return String(text).split('').map(c => chars[c] || c).join('');
};

const toBoldItalicSerif = (text = '') => {
    const chars = {
        A: "𝑨", B: "𝑩", C: "𝑪", D: "𝑫", E: "𝑬", F: "𝑭", G: "𝑮", H: "𝑯", I: "𝑰",
        J: "𝑱", K: "𝑲", L: "𝑳", M: "𝑴", N: "𝑵", O: "𝑶", P: "𝑷", Q: "𝑸", R: "𝑹",
        S: "𝑺", T: "𝑻", U: "𝑼", V: "𝑽", W: "𝑾", X: "𝑿", Y: "𝒀", Z: "𝒁",
        a: "𝒂", b: "𝒃", c: "𝒄", d: "𝒅", e: "𝒆", f: "𝒇", g: "𝒈", h: "𝒉", i: "𝒊",
        j: "𝒋", k: "𝒌", l: "𝒍", m: "𝒎", n: "𝒏", o: "𝒐", p: "𝒑", q: "𝒒", r: "𝒓",
        s: "𝒔", t: "𝒕", u: "𝒖", v: "𝒗", w: "𝒘", x: "𝒙", y: "𝒚", z: "𝒛"
    };
    return String(text).split('').map(c => chars[c] || c).join('');
};

const toBoldSans = (text = '') => {
    const chars = {
        A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜",
        J: "𝗝", K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥",
        S: "𝗦", T: "𝗧", U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
        a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶",
        j: "𝗷", k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿",
        s: "𝘀", t: "𝘁", u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇"
    };
    return String(text).split('').map(c => chars[c] || c).join('');
};

// ═══════════════════════════════════════════════════════════════════════════
//  COMPREHENSIVE COMMAND CATALOG (Stolen from OURIN + all other bots, in English/Manglish)
// ═══════════════════════════════════════════════════════════════════════════
const COMMAND_SECTIONS = [
    {
        key: 'download',
        name: 'Downloader',
        emoji: '📥',
        commands: [
            { cmd: 'play', args: '<song name>', desc: 'Download song MP3', tag: 'Ⓕ' },
            { cmd: 'ytmp3', args: '<link>', desc: 'YouTube to MP3 audio', tag: 'Ⓕ' },
            { cmd: 'video', args: '<link>', desc: 'YouTube MP4 video', tag: 'Ⓕ' },
            { cmd: 'ytmp4', args: '<link>', desc: 'YouTube HD video', tag: 'Ⓕ' },
            { cmd: 'spotify', args: '<link>', desc: 'Spotify track DL', tag: 'Ⓕ' },
            { cmd: 'spotifydl', args: '<link>', desc: 'Spotify song download', tag: 'Ⓕ' },
            { cmd: 'tiktok', args: '<link>', desc: 'TikTok no watermark', tag: 'Ⓕ' },
            { cmd: 'ttmp3', args: '<link>', desc: 'TikTok audio DL', tag: 'Ⓕ' },
            { cmd: 'instagram', args: '<link>', desc: 'Instagram post/reel', tag: 'Ⓕ' },
            { cmd: 'igstory', args: '<user>', desc: 'Instagram story DL', tag: 'Ⓕ' },
            { cmd: 'facebook', args: '<link>', desc: 'Facebook video DL', tag: 'Ⓕ' },
            { cmd: 'twitter', args: '<link>', desc: 'Twitter/X video DL', tag: 'Ⓕ' },
            { cmd: 'pinterest', args: '<query>', desc: 'Pinterest download', tag: 'Ⓕ' },
            { cmd: 'mediafire', args: '<link>', desc: 'MediaFire file DL', tag: 'Ⓕ' },
            { cmd: 'capcut', args: '<link>', desc: 'CapCut template DL', tag: 'Ⓕ' },
            { cmd: 'reddit', args: '<link>', desc: 'Reddit media DL', tag: 'Ⓕ' },
            { cmd: 'gitclone', args: '<link>', desc: 'Clone GitHub repo', tag: 'Ⓕ' }
        ]
    },
    {
        key: 'search',
        name: 'Search Tools',
        emoji: '🔍',
        commands: [
            { cmd: 'google', args: '<query>', desc: 'Google live search', tag: 'Ⓕ' },
            { cmd: 'wiki', args: '<topic>', desc: 'Wikipedia summary', tag: 'Ⓕ' },
            { cmd: 'weather', args: '<city>', desc: 'Live weather report', tag: 'Ⓕ' },
            { cmd: 'news', args: '<topic>', desc: 'Latest headlines', tag: 'Ⓕ' },
            { cmd: 'lyrics', args: '<song>', desc: 'Song lyrics search', tag: 'Ⓕ' },
            { cmd: 'define', args: '<word>', desc: 'Dictionary meaning', tag: 'Ⓕ' }
        ]
    },
    {
        key: 'ai',
        name: 'AI & Filters',
        emoji: '🤖',
        commands: [
            { cmd: 'ai', args: '<question>', desc: 'Gemini AI assistant', tag: 'Ⓕ' },
            { cmd: 'gpt', args: '<question>', desc: 'GPT chat model', tag: 'Ⓕ' },
            { cmd: 'aigen', args: '<prompt>', desc: 'AI image generator', tag: 'Ⓕ' },
            { cmd: 'describe', args: '(reply img)', desc: 'AI vision analyze', tag: 'Ⓕ' },
            { cmd: 'ocr', args: '(reply img)', desc: 'Extract text from photo', tag: 'Ⓕ' },
            { cmd: 'toanime', args: '(reply img)', desc: 'Convert image to anime', tag: 'Ⓕ' },
            { cmd: 'toghibli', args: '(reply img)', desc: 'Studio Ghibli style', tag: 'Ⓕ' },
            { cmd: 'tocartoon', args: '(reply img)', desc: 'Cartoon effect', tag: 'Ⓕ' },
            { cmd: 'tochibi', args: '(reply img)', desc: 'Chibi filter', tag: 'Ⓕ' },
            { cmd: 'to3d', args: '(reply img)', desc: '3D avatar render', tag: 'Ⓕ' },
            { cmd: 'tomanga', args: '(reply img)', desc: 'Manga line art', tag: 'Ⓕ' },
            { cmd: 'faceswap', args: '(reply img)', desc: 'AI face swap', tag: 'Ⓕ' },
            { cmd: 'colorize', args: '(reply img)', desc: 'Colorize B&W photo', tag: 'Ⓕ' }
        ]
    },
    {
        key: 'tools',
        name: 'Converter & Tools',
        emoji: '🪄',
        commands: [
            { cmd: 'sticker', args: '(reply media)', desc: 'Create WA sticker', tag: 'Ⓕ' },
            { cmd: 'toimg', args: '(reply sticker)', desc: 'Sticker to image', tag: 'Ⓕ' },
            { cmd: 'tomp3', args: '(reply vid/aud)', desc: 'Extract MP3 audio', tag: 'Ⓕ' },
            { cmd: 'tovideo', args: '(reply stick)', desc: 'Animated stick to vid', tag: 'Ⓕ' },
            { cmd: 'togif', args: '(reply sticker)', desc: 'Sticker to GIF', tag: 'Ⓕ' },
            { cmd: 'tovn', args: '(reply audio)', desc: 'Convert to voice note', tag: 'Ⓕ' },
            { cmd: 'nobg', args: '(reply img)', desc: 'Remove photo bg', tag: 'Ⓕ' },
            { cmd: 'url', args: '(reply media)', desc: 'Upload to Catbox url', tag: 'Ⓕ' },
            { cmd: 'short', args: '<url>', desc: 'Shorten web link', tag: 'Ⓕ' },
            { cmd: 'translate', args: '<lang>', desc: 'Translate message', tag: 'Ⓕ' },
            { cmd: 'tts', args: '<text>', desc: 'Text to speech audio', tag: 'Ⓕ' },
            { cmd: 'fancy', args: '<text>', desc: 'Stylish fancy fonts', tag: 'Ⓕ' },
            { cmd: 'vv', args: '(reply viewonce)', desc: 'Anti-viewonce grab', tag: 'Ⓕ' },
            { cmd: 'bass', args: '(reply audio)', desc: 'Bass boosted audio', tag: 'Ⓕ' },
            { cmd: 'slow', args: '(reply audio)', desc: 'Slowed reverb audio', tag: 'Ⓕ' },
            { cmd: 'robot', args: '(reply audio)', desc: 'Robot voice filter', tag: 'Ⓕ' }
        ]
    },
    {
        key: 'canvas',
        name: 'Maker & Canvas',
        emoji: '🎨',
        commands: [
            { cmd: 'brat', args: '<text>', desc: 'Brat aesthetic sticker', tag: 'Ⓕ' },
            { cmd: 'bratvid', args: '<text>', desc: 'Brat animated video', tag: 'Ⓕ' },
            { cmd: 'qc', args: '<text>', desc: 'Quote card generator', tag: 'Ⓕ' },
            { cmd: 'storyig', args: '<text>', desc: 'IG story banner', tag: 'Ⓕ' },
            { cmd: 'balogo', args: '<text|text>', desc: 'Blue Archive logo', tag: 'Ⓕ' },
            { cmd: 'fakestory', args: '<text>', desc: 'Fake status generator', tag: 'Ⓕ' },
            { cmd: 'faketweet', args: '<text>', desc: 'Fake Twitter tweet', tag: 'Ⓕ' },
            { cmd: 'math', args: '(reply img)', desc: 'Math solver canvas', tag: 'Ⓕ' }
        ]
    },
    {
        key: 'game',
        name: 'Games & Fun',
        emoji: '🎯',
        commands: [
            { cmd: 'tictactoe', args: '@user', desc: 'Play Tic-Tac-Toe', tag: 'Ⓕ' },
            { cmd: 'werewolf', args: '', desc: 'Werewolf village game', tag: 'Ⓕ' },
            { cmd: 'dungeon', args: '', desc: 'Dungeon RPG raid', tag: 'Ⓕ' },
            { cmd: 'minecraft', args: '', desc: 'Text minecraft sandbox', tag: 'Ⓕ' },
            { cmd: 'fishing', args: '', desc: 'Fisch rod catching', tag: 'Ⓕ' },
            { cmd: 'family100', args: '', desc: 'Family 100 quiz show', tag: 'Ⓕ' },
            { cmd: 'tebakgambar', args: '', desc: 'Guess the picture', tag: 'Ⓕ' },
            { cmd: 'tebakbendera', args: '', desc: 'Guess country flag', tag: 'Ⓕ' },
            { cmd: 'riddle', args: '', desc: 'Mind riddle question', tag: 'Ⓕ' },
            { cmd: 'joke', args: '', desc: 'Funny joke / kadi', tag: 'Ⓕ' },
            { cmd: 'quote', args: '', desc: 'Inspiring quotes', tag: 'Ⓕ' },
            { cmd: 'meme', args: '', desc: 'Random comedy meme', tag: 'Ⓕ' }
        ]
    },
    {
        key: 'group',
        name: 'Group Commands',
        emoji: '👥',
        commands: [
            { cmd: 'kick', args: '@user', desc: 'Remove member', tag: 'Ⓐ' },
            { cmd: 'add', args: '<number>', desc: 'Add member to group', tag: 'Ⓐ' },
            { cmd: 'promote', args: '@user', desc: 'Make member admin', tag: 'Ⓐ' },
            { cmd: 'demote', args: '@user', desc: 'Remove admin role', tag: 'Ⓐ' },
            { cmd: 'tagall', args: '<msg>', desc: 'Mention all members', tag: 'Ⓐ' },
            { cmd: 'hidetag', args: '<msg>', desc: 'Invisible mass mention', tag: 'Ⓐ' },
            { cmd: 'mute', args: '', desc: 'Close group chat', tag: 'Ⓐ' },
            { cmd: 'unmute', args: '', desc: 'Open group chat', tag: 'Ⓐ' },
            { cmd: 'invite', args: '', desc: 'Get group link', tag: 'Ⓐ' },
            { cmd: 'setname', args: '<name>', desc: 'Change group subject', tag: 'Ⓐ' },
            { cmd: 'setdesc', args: '<text>', desc: 'Change group description', tag: 'Ⓐ' },
            { cmd: 'antilink', args: 'on/off', desc: 'Auto-kick link spammers', tag: 'Ⓐ' },
            { cmd: 'badword', args: 'on/off', desc: 'Filter abusive words', tag: 'Ⓐ' },
            { cmd: 'antidelete', args: 'on/off', desc: 'Catch deleted messages', tag: 'Ⓐ' },
            { cmd: 'antispam', args: 'on/off', desc: 'Rate limit spammers', tag: 'Ⓐ' },
            { cmd: 'warn', args: '@user', desc: 'Issue warning strike', tag: 'Ⓐ' },
            { cmd: 'resetwarn', args: '@user', desc: 'Clear member warnings', tag: 'Ⓐ' },
            { cmd: 'welcome', args: 'on/off', desc: 'New member greeting', tag: 'Ⓐ' },
            { cmd: 'goodbye', args: 'on/off', desc: 'Farewell goodbye message', tag: 'Ⓐ' }
        ]
    },
    {
        key: 'owner',
        name: 'Owner Panel',
        emoji: '👑',
        commands: [
            { cmd: 'mode', args: 'public/private', desc: 'Switch bot access mode', tag: 'Ⓞ' },
            { cmd: 'sudo', args: 'add/del/list', desc: 'Manage sudo operators', tag: 'Ⓞ' },
            { cmd: 'join', args: '<link>', desc: 'Join group via invite', tag: 'Ⓞ' },
            { cmd: 'leave', args: '', desc: 'Exit current group', tag: 'Ⓞ' },
            { cmd: 'broadcast', args: '<msg>', desc: 'Send blast to all chats', tag: 'Ⓞ' },
            { cmd: 'block', args: '@user', desc: 'Block user from bot', tag: 'Ⓞ' },
            { cmd: 'unblock', args: '@user', desc: 'Unblock user', tag: 'Ⓞ' },
            { cmd: 'blockchat', args: '', desc: 'Mute bot in this chat', tag: 'Ⓞ' },
            { cmd: 'restart', args: '', desc: 'Reboot bot process', tag: 'Ⓞ' },
            { cmd: 'setcmdaudio', args: '<cmd>', desc: 'Attach voice note to cmd', tag: 'Ⓞ' },
            { cmd: 'delcmdaudio', args: '<cmd>', desc: 'Delete cmd voice note', tag: 'Ⓞ' },
            { cmd: 'listcmention', args: '', desc: 'Custom mention sounds', tag: 'Ⓞ' },
            { cmd: 'setmenu', args: '<style>', desc: 'Change menu style', tag: 'Ⓞ' },
            { cmd: 'setmenumethod', args: '<method>', desc: 'Change send method', tag: 'Ⓞ' }
        ]
    },
    {
        key: 'main',
        name: 'Main Commands',
        emoji: '🏠',
        commands: [
            { cmd: 'menu', args: '[style/method]', desc: 'Show dynamic menu', tag: 'Ⓕ' },
            { cmd: 'help', args: '<command>', desc: 'Detailed command help', tag: 'Ⓕ' },
            { cmd: 'alive', args: '', desc: 'Check bot online heartbeat', tag: 'Ⓕ' },
            { cmd: 'ping', args: '', desc: 'Response latency speed', tag: 'Ⓕ' },
            { cmd: 'uptime', args: '', desc: 'Bot running uptime', tag: 'Ⓕ' },
            { cmd: 'whois', args: '@user', desc: 'Profile and number info', tag: 'Ⓕ' },
            { cmd: 'jid', args: '', desc: 'Show user or group JID', tag: 'Ⓕ' },
            { cmd: 'settings', args: '', desc: 'Bot configuration menu', tag: 'Ⓕ' },
            { cmd: 'owner', args: '', desc: 'Developer & owner contact', tag: 'Ⓕ' },
            { cmd: 'speed', args: '', desc: 'System RAM & CPU speeds', tag: 'Ⓕ' }
        ]
    }
];

const getTotalCommands = () => COMMAND_SECTIONS.reduce((acc, sec) => acc + sec.commands.length, 0);

// Common dynamic context variables
const getMeta = (pushname = 'User') => {
    const botName   = global.botName   || '🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊';
    const owner     = global.ownerName || '🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓';
    const packname  = global.packname  || '✪⃝⸸ꜛꪶ͢𝐒𝐘͔𝐀𝐌 𝐒𝐄𝐑͢ꫂꜜ™';
    const shortBot  = 'XYMBOT';
    const signature = '𝑆𝑌𝛥𝛭.3𝐹𝛸';
    const alias     = '複| xʏᴀᴍツ';
    const uptime    = runtime(process.uptime());
    const mode      = (global.WORKTYPE || 'public').toUpperCase();
    const prefix    = global.PREFIX || '.';
    const platform  = os.platform() === 'win32' ? 'Windows 🪟' : os.platform() === 'linux' ? 'Linux 🐧' : 'Mac 🍎';
    const now       = new Date();
    const timeStr   = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr   = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const total     = getTotalCommands();

    return { botName, owner, packname, shortBot, signature, alias, uptime, mode, prefix, platform, timeStr, dateStr, total, pushname };
};

// ═══════════════════════════════════════════════════════════════════════════
//  THE 9 BOT VISUAL MENU GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

// 1️⃣ HYDRO STYLE (Default)
const generateHydroMenu = (meta) => {
    let out = `✨━━━〔 🏞️ *${toBoldSerif('All Menu')}* 〕━━━✨\n\n`;
    out += `╭─〔 🤖 *${toBoldSerif('Bot Info')}* 〕─╮\n`;
    out += `│ ➤ 👤 ᴜsᴇʀ : *${meta.pushname}*\n`;
    out += `│ ➤ 🤖 ʙᴏᴛ : *${meta.botName}*\n`;
    out += `│ ➤ 👑 ᴏᴡɴᴇʀ : *${meta.owner}*\n`;
    out += `│ ➤ 🏷️ ᴀʟɪᴀs : *${meta.alias}*\n`;
    out += `│ ➤ ⏱️ ᴜᴘᴛɪᴍᴇ : *${meta.uptime}*\n`;
    out += `│ ➤ 🌐 ᴍᴏᴅᴇ : *${meta.mode}*\n`;
    out += `│ ➤ ⚒️ ᴛᴏᴛᴀʟ ꜰɪᴛᴜʀ : *${meta.total} Commands*\n`;
    out += `╰────────────────────╯\n\n`;

    out += `╭─〔 🔖 *${toBoldSerif('Keterangan Akses')}* 〕─╮\n`;
    out += `│ Ⓞ = ᴏᴡɴᴇʀ ᴏɴʟʏ\n`;
    out += `│ Ⓐ = ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ ᴏɴʟʏ\n`;
    out += `│ Ⓛ = ʟɪᴍɪᴛᴇᴅ / ᴄᴏᴏʟᴅᴏᴡɴ\n`;
    out += `│ Ⓕ = ꜰʀᴇᴇ ꜰᴏʀ ᴀʟʟ\n`;
    out += `╰──────────────────────╯\n\n`;

    COMMAND_SECTIONS.forEach(sec => {
        out += `✨━━━〔 ${sec.emoji} *${toBoldSerif(sec.name + ' Menu')}* 〕━━━✨\n`;
        out += `╭─〔 📌 *${toBoldSerif(sec.name)}* 〕─╮\n`;
        sec.commands.forEach(c => {
            out += `│ ➤ *${meta.prefix}${c.cmd}* ${c.args ? c.args + ' ' : ''}${c.tag}\n`;
        });
        out += `╰──────────────────────╯\n\n`;
    });

    out += `╭─〔 💡 *${toBoldSerif('Tips')}* 〕─╮\n`;
    out += `│ Tanda < > tidak perlu diketik\n`;
    out += `│ Type ${meta.prefix}help <cmd> for full details\n`;
    out += `╰───────────────╯\n\n`;
    out += `🚀 *Powered By ${meta.botName} (${meta.shortBot}) — ${meta.alias}*\n> © ${meta.signature}`;
    return out.trim();
};

// 2️⃣ NANO BOTZ STYLE
const generateNanoMenu = (meta) => {
    let out = `✦───〔 🚀 *${toBoldSerif('ALL MENU')}* 〕───✦\n\n`;
    out += `╭──〔 🤖 *${toBoldSerif('BOT INFO')}* 〕─⬣\n`;
    out += `│ 🧠 𝐍𝐚𝐦𝐚 𝐁𝐨𝐭 : *${meta.botName}*\n`;
    out += `│ 👑 𝐎𝐰𝐧𝐞𝐫    : *${meta.owner}*\n`;
    out += `│ 👤 𝐔𝐬𝐞𝐫     : *${meta.pushname}*\n`;
    out += `│ 🌐 𝐌𝐨𝐝𝐞     : *${meta.mode}*\n`;
    out += `│ ⚙️ 𝐒𝐲𝐬𝐭𝐞𝐦   : *Modular System*\n`;
    out += `│ 📊 𝐅𝐢𝐭𝐮𝐫    : *${meta.total} Command*\n`;
    out += `│ ⚡ 𝐒𝐭𝐚𝐭𝐮𝐬   : *Active & Online*\n`;
    out += `╰──────────────⬣\n\n`;

    out += `⚠️ Gunakan fitur dengan bijak\n`;
    out += `🚫 Jangan spam / abuse sistem\n\n`;

    COMMAND_SECTIONS.forEach(sec => {
        out += `╭──〔 ◈ *${sec.name}* 〕\n`;
        sec.commands.forEach(c => {
            out += `│  • ${meta.prefix}${c.cmd} ${c.args ? c.args : ''}\n`;
        });
        out += `╰──────────────\n\n`;
    });

    out += `│ Total : *${meta.total} command*\n`;
    out += `│ Prefix: *[ ${meta.prefix} ]*\n`;
    out += `*By ${meta.packname}*\n> © ${meta.signature} • ${meta.owner}`;
    return out.trim();
};

// 3️⃣ OURIN 2.6 STYLE
const generateOurinMenu = (meta) => {
    let out = `Hai @${meta.pushname} 🪸\n`;
    out += `Aku ${meta.botName}, bot WhatsApp by ${meta.owner} (${meta.alias})\n\n`;

    out += `╭─〔 🤖 ʙᴏᴛ ɪɴꜰᴏ 〕\n`;
    out += `│ 🖐 ɴᴀᴍᴀ     : ${meta.botName}\n`;
    out += `│ 🔑 ᴠᴇʀsɪ    : v2.6.0\n`;
    out += `│ ⚙️ ᴍᴏᴅᴇ     : ${meta.mode}\n`;
    out += `│ 🧶 ᴘʀᴇꜰɪx    : [ ${meta.prefix} ]\n`;
    out += `│ ⏱ ᴜᴘᴛɪᴍᴇ   : ${meta.uptime}\n`;
    out += `│ 👥 ᴛᴏᴛᴀʟ    : 1,420 Users\n`;
    out += `│ 👑 ᴏᴡɴᴇʀ    : ${meta.owner}\n`;
    out += `│ 🏷️ ᴀʟɪᴀs    : ${meta.alias}\n`;
    out += `╰────────────────⬣\n\n`;

    out += `╭─〔 👤 ᴜsᴇʀ ɪɴꜰᴏ 〕\n`;
    out += `│ 🙋 ɴᴀᴍᴀ     : ${meta.pushname}\n`;
    out += `│ 🎭 ʀᴏʟᴇ     : 👑 Premium User\n`;
    out += `│ 🎟 ᴇɴᴇʀɢɪ   : ∞ Unlimited\n`;
    out += `│ ⚡ ʟᴇᴠᴇʟ    : 10\n`;
    out += `│ ✨ ᴇxᴘ       : 88,000\n`;
    out += `│ 💰 ᴋᴏɪɴ      : 25,000\n`;
    out += `│ ❤️ ʜᴘ        : 100/100\n`;
    out += `│ 🔮 ᴍᴀɴᴀ      : 50/50\n`;
    out += `│ 🕒 ᴡᴀᴋᴛᴜ    : ${meta.timeStr}\n`;
    out += `│ 📅 ᴛᴀɴɢɢᴀʟ  : ${meta.dateStr}\n`;
    out += `╰────────────────⬣\n\n`;

    COMMAND_SECTIONS.forEach(sec => {
        out += `${sec.emoji} *${toBoldSans(sec.name.toUpperCase())}* (${sec.commands.length} commands)\n`;
        // Render in clean grid layout
        const cmds = sec.commands.map(c => `├ ${meta.prefix}${c.cmd}`);
        for (let i = 0; i < cmds.length; i += 3) {
            out += cmds.slice(i, i + 3).join('  ') + '\n';
        }
        out += '\n';
    });

    out += `_💡 Ketik ${meta.prefix}help <cmd> untuk melihat instruksi fitur_\n> © ${meta.signature} • ${meta.shortBot}`;
    return out.trim();
};

// 4️⃣ ALYA v12 STYLE
const generateAlyaMenu = (meta) => {
    let out = `✨━━━〔 🏞️ *${toBoldSerif('All Menu')}* 〕━━━✨\n\n`;
    out += `➤ 🤖 Nᴀᴍᴀ Bᴏᴛ : *${meta.botName}*\n`;
    out += `➤ 👑 Oᴡɴᴇʀ : *${meta.owner}*\n`;
    out += `➤ 🖥️ Rᴜɴ : *${meta.platform}*\n`;
    out += `➤ 🌐 Mᴏᴅᴇ : *${meta.mode}*\n`;
    out += `➤ 📂 Tʏᴘᴇ : *Case Modular*\n`;
    out += `➤ ⚒️ Tᴏᴛᴀʟ Fɪᴛᴜʀ : *${meta.total}+ Fitur*\n\n`;

    out += `✨━━━〔 💡 *Do Not Spam* 〕━━━✨\n\n`;
    out += `_ᴊᴀɴɢᴀɴ sᴘᴀᴍ ʏᴀ ᴋᴀᴋ 🐣_\n`;
    out += `_ɢᴜɴᴀᴋᴀɴ ᴅᴇɴɢᴀɴ ʙɪᴊᴀᴋ_\n\n`;

    COMMAND_SECTIONS.forEach(sec => {
        out += `┏『 *\`乂 ${spacedSmallCaps(sec.name)} 乂\`* 』━⊱\n`;
        sec.commands.forEach(c => {
            out += `┣➤ *${meta.prefix}${c.cmd}* ${c.args ? c.args : ''}\n`;
        });
        out += `┗━━━━━━━━━━━━━━━━⊱\n\n`;
    });

    out += `✨ _Powered by ${meta.shortBot} & ${meta.owner}_ ✨\n> © ${meta.signature} • ${meta.alias}`;
    return out.trim();
};

// 5️⃣ YORI CHAN STYLE
const generateYoriMenu = (meta) => {
    let out = `☘️━━━〔 *${meta.shortBot} MULTI-DEVICE* 〕━━━☘️\n\n`;
    out += `┏━━〔 👤 USER PROFILE 〕━━┓\n`;
    out += `┃ ☘️ User   : *${meta.pushname}*\n`;
    out += `┃ ☘️ Bot    : *${meta.botName}*\n`;
    out += `┃ ☘️ Owner  : *${meta.owner}*\n`;
    out += `┃ ☘️ Uptime : *${meta.uptime}*\n`;
    out += `┃ ☘️ Mode   : *${meta.mode}*\n`;
    out += `┃ ☘️ Status : *Active (*∩_∩*)*\n`;
    out += `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

    COMMAND_SECTIONS.forEach(sec => {
        out += `┏━━〔 ${sec.emoji} ${sec.name.toUpperCase()} 〕━━┓\n`;
        sec.commands.forEach(c => {
            out += `┃ ☘️ *${meta.prefix}${c.cmd}* ${c.args ? c.args : ''}\n`;
        });
        out += `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
    });

    out += `☘️ *Thanks for using ${meta.botName}!* (*∩_∩*)\n> © ${meta.signature} • ${meta.alias} • ${meta.owner} • ${meta.packname}`;
    return out.trim();
};

// 6️⃣ VELYNBOT STYLE
const generateVelynMenu = (meta) => {
    let out = `🌸───〔 *${meta.shortBot} • ${meta.signature}* 〕───🌸\n\n`;
    out += `┌───〔 🔮 SYSTEM STATUS 〕───┐\n`;
    out += `│ 🪀 Bot     : *${meta.botName}*\n`;
    out += `│ 👑 Creator : *${meta.owner}*\n`;
    out += `│ 🌸 User    : *${meta.pushname}*\n`;
    out += `│ ⚙️ Version : *v3.0 ${meta.shortBot}*\n`;
    out += `│ ⏱ Uptime  : *${meta.uptime}*\n`;
    out += `│ 📊 Total   : *${meta.total} Features*\n`;
    out += `└────────────────────────┘\n\n`;

    COMMAND_SECTIONS.forEach(sec => {
        out += `┌───〔 ${sec.emoji} ${sec.name.toUpperCase()} 〕───┐\n`;
        sec.commands.forEach(c => {
            out += `│ ✦ *${meta.prefix}${c.cmd}* ${c.args ? c.args : ''}\n`;
        });
        out += `└───────────────────────┘\n\n`;
    });

    out += `> © ${meta.signature} • ${meta.alias} • ${meta.packname} • ${meta.owner}`;
    return out.trim();
};

// 7️⃣ QUEEN ANITA STYLE
const generateAnitaMenu = (meta) => {
    let out = `👑━━━〔 *${meta.shortBot} — ${meta.packname}* 〕━━━👑\n\n`;
    out += `  ⟢• ──────────────── •⟢\n`;
    out += `  |  • ${meta.packname} / ${meta.owner} •\n`;
    out += `  |  • BOT: ${meta.botName}\n`;
    out += `  |  • USER: ${meta.pushname}\n`;
    out += `  |  • UPTIME: ${meta.uptime}\n`;
    out += `  ⟢• ──────────────── •⟢\n\n`;

    COMMAND_SECTIONS.forEach(sec => {
        out += `╭┈──────────────────\n`;
        out += `│ ◦ *${sec.emoji} ${sec.name.toUpperCase()}*\n`;
        sec.commands.forEach(c => {
            out += `│   ◦  ${toSmallCaps(c.cmd)} ${c.args ? c.args : ''}\n`;
        });
        out += `╰┈────────────────•\n\n`;
    });

    out += `  ⟢• ──────────────── •⟢\n`;
    out += `  |  TIME: ${meta.timeStr} | ${meta.owner}\n`;
    out += `  ⟢• ──────────────── •⟢\n`;
    out += `  ✨ Powered by ${meta.shortBot} • ${meta.signature} • ${meta.owner} • ${meta.alias} ✨`;
    return out.trim();
};

// 8️⃣ TRINITY STYLE
const generateTrinityMenu = (meta) => {
    let out = `⧉ Hello, ${meta.pushname}\n`;
    out += `I am a system-based WhatsApp bot connected to modular AI service, available 24/7 for command access and data flow.\n\n`;

    out += `┏━━〔 SYSTEM INFO 〕\n`;
    out += `┃ ◦ *Bot Name* : ${meta.botName} (${meta.shortBot})\n`;
    out += `┃ ◦ *Dev*      : ${meta.owner}\n`;
    out += `┃ ◦ *Library*  : @whiskeysockets/baileys\n`;
    out += `┃ ◦ *Uptime*   : ${meta.uptime}\n`;
    out += `┃ ◦ *Modules*  : ${meta.total} commands\n`;
    out += `┗━━━━━━━━━━━━━━━\n\n`;

    out += `╭─⧉ 𝗠𝗘𝗡𝗨 𝗧𝗥𝗘𝗘\n`;
    out += `│ • ${meta.prefix}dlmenu     → Downloader Tools\n`;
    out += `│ • ${meta.prefix}searchmenu → Search Engine\n`;
    out += `│ • ${meta.prefix}aimenu     → AI & Visual Models\n`;
    out += `│ • ${meta.prefix}toolmenu   → Converters & Tools\n`;
    out += `│ • ${meta.prefix}canvasmenu → Maker & Canvas\n`;
    out += `│ • ${meta.prefix}gamemenu   → Games & Fun\n`;
    out += `│ • ${meta.prefix}gmenu      → Group Control\n`;
    out += `│ • ${meta.prefix}ownermenu  → Owner Panel\n`;
    out += `│ • ${meta.prefix}mainmenu   → Main Commands\n`;
    out += `╰─────────────────\n\n`;

    COMMAND_SECTIONS.forEach(sec => {
        out += `╭─⧉ ${sec.emoji} *${toBoldSans(sec.name.toUpperCase())}*\n`;
        sec.commands.forEach(c => {
            out += `│ • ${meta.prefix}${c.cmd} ${c.args ? c.args : ''}\n`;
        });
        out += `╰─────────────────\n\n`;
    });

    out += `『 © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${meta.shortBot} • ${meta.signature} • ${meta.alias} • ${meta.owner} 』`;
    return out.trim();
};

// 9️⃣ MAOCHAN STYLE
const generateMaochanMenu = (meta) => {
    let out = `⛩️一一〖 ${meta.shortBot} || ${meta.signature} || ${meta.alias} 〗一玄⪩  ֵ  ׄ\n`;
    out += `┃ 👤 User : *${meta.pushname}*\n`;
    out += `┃ 🤖 Bot  : *${meta.botName}*\n`;
    out += `┃ 👑 Dev  : *${meta.owner}*\n`;
    out += `┃ 🏷️ Tag  : *${meta.alias}*\n`;
    out += `┃ ⏱️ Up   : *${meta.uptime}*\n`;
    out += `┃ 📊 Total: *${meta.total} Features*\n`;
    out += `┗一一玄⪩\n\n`;

    COMMAND_SECTIONS.forEach(sec => {
        out += `┏一一〖 ${toBoldItalicSerif(sec.name)} 𝑴𝒆𝒏𝒖 〗一玄⪩  ֵ  ׄ\n`;
        sec.commands.forEach(c => {
            out += `┃ ➣ ✇ ${meta.prefix}${c.cmd} ${c.args ? c.args : ''}\n`;
        });
        out += `┗一一玄⪩\n\n`;
    });

    out += `⛩️一一〖 𝑬𝒏𝒅 𝑴𝒆𝒏𝒖 — ${meta.signature} • ${meta.owner} • ${meta.packname} • ${meta.alias} 〗一玄⪩`;
    return out.trim();
};

// Map of style name to generator
const STYLE_GENERATORS = {
    'hydro': generateHydroMenu,
    'nano': generateNanoMenu,
    'ourin': generateOurinMenu,
    'alya': generateAlyaMenu,
    'yori': generateYoriMenu,
    'velynbot': generateVelynMenu,
    'queen anita': generateAnitaMenu,
    'trinity': generateTrinityMenu,
    'maochan': generateMaochanMenu
};

// ═══════════════════════════════════════════════════════════════════════════
//  SINGLE CATEGORY SUB-MENU FORMATTER
// ═══════════════════════════════════════════════════════════════════════════
const generateCategoryMenu = (styleKey, catKey, meta) => {
    const sec = COMMAND_SECTIONS.find(s => s.key === catKey);
    if (!sec) return `⚠️ Category not found: ${catKey}`;

    let out = '';
    switch (styleKey) {
        case 'nano':
            out = `✦───〔 ${sec.emoji} *${toBoldSerif(sec.name.toUpperCase())}* 〕───✦\n\n`;
            out += `╭──〔 ◈ *Commands* 〕\n`;
            sec.commands.forEach(c => {
                out += `│  • ${meta.prefix}${c.cmd} ${c.args ? c.args : ''}\n`;
            });
            out += `╰──────────────\n\n`;
            out += `│ Total : *${sec.commands.length} Commands*\n│ By *${meta.owner}* (${meta.signature})\n> © ${meta.packname} • ${meta.alias}`;
            break;

        case 'ourin':
            out = `${sec.emoji} *${toBoldSans(sec.name.toUpperCase())}* (${sec.commands.length} commands)\n\n`;
            const cmds = sec.commands.map(c => `├ ${meta.prefix}${c.cmd}`);
            for (let i = 0; i < cmds.length; i += 3) {
                out += cmds.slice(i, i + 3).join('  ') + '\n';
            }
            out += `\n_💡 Type ${meta.prefix}help <cmd> for usage details_\n> © ${meta.signature} • ${meta.shortBot} • ${meta.alias} • ${meta.owner}`;
            break;

        case 'alya':
            out = `┏『 *\`乂 ${spacedSmallCaps(sec.name)} 乂\`* 』━⊱\n`;
            sec.commands.forEach(c => {
                out += `┣➤ *${meta.prefix}${c.cmd}* ${c.args ? c.args : ''}\n`;
            });
            out += `┗━━━━━━━━━━━━━━━━⊱\n\n`;
            out += `✨ _${meta.shortBot} Submenu Engine • ${meta.signature} • ${meta.owner}_ ✨\n> © ${meta.packname} • ${meta.alias}`;
            break;

        case 'yori':
            out = `┏━━〔 ${sec.emoji} ${sec.name.toUpperCase()} 〕━━┓\n`;
            sec.commands.forEach(c => {
                out += `┃ ☘️ *${meta.prefix}${c.cmd}* ${c.args ? c.args : ''}\n`;
            });
            out += `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
            out += `☘️ (*∩_∩*) _${meta.botName} • ${meta.signature} • ${meta.alias}_\n> © ${meta.owner} • ${meta.packname}`;
            break;

        case 'velynbot':
            out = `┌───〔 ${sec.emoji} ${sec.name.toUpperCase()} 〕───┐\n`;
            sec.commands.forEach(c => {
                out += `│ ✦ *${meta.prefix}${c.cmd}* ${c.args ? c.args : ''}\n`;
            });
            out += `└───────────────────────┘\n\n`;
            out += `> © ${meta.signature} • ${meta.packname} • ${meta.owner} • ${meta.alias}`;
            break;

        case 'queen anita':
            out = `╭┈──────────────────\n`;
            out += `│ ◦ *${sec.emoji} ${sec.name.toUpperCase()}*\n`;
            sec.commands.forEach(c => {
                out += `│   ◦  ${toSmallCaps(c.cmd)} ${c.args ? c.args : ''}\n`;
            });
            out += `╰┈────────────────•\n\n`;
            out += `  • ${meta.shortBot} SUBMENU • ${meta.signature} • ${meta.owner} •\n> © ${meta.packname} • ${meta.alias}`;
            break;

        case 'trinity':
            out = `╭─⧉ ${sec.emoji} *${toBoldSans(sec.name.toUpperCase())}*\n`;
            sec.commands.forEach(c => {
                out += `│ • ${meta.prefix}${c.cmd} ${c.args ? c.args : ''}\n`;
            });
            out += `╰─────────────────\n\n`;
            out += `『 © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${meta.shortBot} • ${meta.signature} • ${meta.alias} • ${meta.owner} 』`;
            break;

        case 'maochan':
            out = `┏一一〖 ${toBoldItalicSerif(sec.name)} 𝑴𝒆𝒏𝒖 〗一玄⪩  ֵ  ׄ\n`;
            sec.commands.forEach(c => {
                out += `┃ ➣ ✇ ${meta.prefix}${c.cmd} ${c.args ? c.args : ''}\n`;
            });
            out += `┗一一玄⪩\n\n`;
            out += `⛩️一一〖 ${meta.shortBot} • ${meta.signature} • ${meta.owner} • ${meta.alias} 〗一玄⪩`;
            break;

        case 'hydro':
        default:
            out = `✨━━━〔 ${sec.emoji} *${toBoldSerif(sec.name + ' Menu')}* 〕━━━✨\n\n`;
            out += `╭─〔 📌 *${toBoldSerif(sec.name)}* 〕─╮\n`;
            sec.commands.forEach(c => {
                out += `│ ➤ *${meta.prefix}${c.cmd}* ${c.args ? c.args + ' ' : ''}${c.tag}\n`;
            });
            out += `╰──────────────────────╯\n\n`;
            out += `🚀 *Powered By ${meta.botName} (${meta.shortBot}) — ${meta.signature} • ${meta.alias}*\n> © ${meta.owner} • ${meta.packname}`;
            break;
    }
    return out.trim();
};

// ═══════════════════════════════════════════════════════════════════════════
//  THE 3 SENDING METHODS
// ═══════════════════════════════════════════════════════════════════════════

// Audio sound effect helper
const sendMenuAudio = async (conn, from, mek) => {
    try {
        const audioPath = path.join(__dirname, '../assets/audio/menu.mp3');
        if (fs.existsSync(audioPath)) {
            const menuAudio = fs.readFileSync(audioPath);
            await conn.sendMessage(from, { audio: menuAudio, mimetype: 'audio/mpeg', ptt: false }, { quoted: mek });
        }
    } catch (err) {}
};

// 1. BUTTON METHOD (Interactive WhatsApp List Message with Action Buttons)
const sendButtonMenu = async (conn, from, mek, meta, currentStyleName) => {
    const opts = mek && !mek.key?.fromMe ? { quoted: mek } : {};

    const sections = [
        {
            title: '📂 Browse Categories',
            rows: [
                { title: '📥 Downloader',      description: `Type ${meta.prefix}dlmenu`,     id: `${meta.prefix}dlmenu` },
                { title: '🔍 Search Tools',    description: `Type ${meta.prefix}searchmenu`, id: `${meta.prefix}searchmenu` },
                { title: '🤖 AI & Filters',    description: `Type ${meta.prefix}aimenu`,     id: `${meta.prefix}aimenu` },
                { title: '🪄 Converters',      description: `Type ${meta.prefix}toolmenu`,   id: `${meta.prefix}toolmenu` },
                { title: '🎨 Maker & Canvas',  description: `Type ${meta.prefix}canvasmenu`, id: `${meta.prefix}canvasmenu` },
            ]
        },
        {
            title: '🎮 More Categories',
            rows: [
                { title: '🎯 Games & Fun',     description: `Type ${meta.prefix}gamemenu`,   id: `${meta.prefix}gamemenu` },
                { title: '👥 Group Control',   description: `Type ${meta.prefix}gmenu`,      id: `${meta.prefix}gmenu` },
                { title: '👑 Owner Panel',     description: `Type ${meta.prefix}ownermenu`,  id: `${meta.prefix}ownermenu` },
                { title: '🏠 Main Commands',   description: `Type ${meta.prefix}mainmenu`,   id: `${meta.prefix}mainmenu` },
                { title: '📜 Full Text Menu',  description: `Type ${meta.prefix}menu text`,  id: `${meta.prefix}menu text` },
            ]
        }
    ];

    const listTitle = `✨ ${meta.botName} [${currentStyleName.toUpperCase()}] ✨`;
    const listBody  = `👑 ${meta.owner}\n${meta.signature}\n\nTap the button below to browse all categories 👇`;
    const listFooter = `${meta.packname} • ${meta.alias}`;

    try {
        await conn.sendMessage(from, {
            listMessage: {
                title: listTitle,
                description: listBody,
                footerText: listFooter,
                buttonText: '📋 Browse Menu',
                listType: 0,
                sections
            }
        }, opts);
        await sendMenuAudio(conn, from, mek);
        return true;
    } catch (err) {
        console.warn('Button/List menu failed, trying without quoted:', err.message);
        try {
            await conn.sendMessage(from, {
                listMessage: {
                    title: listTitle,
                    description: listBody,
                    footerText: listFooter,
                    buttonText: '📋 Browse Menu',
                    listType: 0,
                    sections
                }
            });
            await sendMenuAudio(conn, from, mek);
            return true;
        } catch (err2) {
            console.error('Button menu error, falling back to card/text:', err2.message);
            return false;
        }
    }
};

// 2. CARD METHOD ("The Other Way" - Rich Document / Media Card with Newsletter context & External Ad Reply)
const sendCardMenu = async (conn, from, mek, text, meta, currentStyleName) => {
    const imgPath = path.join(__dirname, '../media/menu.jpg');
    const opts = mek && !mek.key?.fromMe ? { quoted: mek } : {};
    let thumbBuffer = null;
    try {
        if (fs.existsSync(imgPath)) thumbBuffer = fs.readFileSync(imgPath);
    } catch {}

    const contextInfo = {
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.channel || '12036326753395844@newsletter',
            newsletterName: meta.botName || 'XYMBOT',
            serverMessageId: 1
        },
        externalAdReply: {
            title: `${meta.botName} • [${currentStyleName.toUpperCase()}]`,
            body: `${meta.packname} • ${meta.signature} • ${meta.alias}`,
            thumbnail: thumbBuffer,
            renderLargerThumbnail: true,
            mediaType: 1,
            sourceUrl: `https://wa.me/${global.owner?.[0] || '919947121619'}`
        }
    };

    try {
        if (thumbBuffer) {
            await conn.sendMessage(from, {
                image: thumbBuffer,
                caption: text,
                contextInfo
            }, opts);
        } else {
            await conn.sendMessage(from, { text, contextInfo }, opts);
        }
        await sendMenuAudio(conn, from, mek);
        return true;
    } catch (err) {
        console.error('Card menu error, falling back to standard text:', err.message);
        return false;
    }
};

// 3. TEXTED METHOD (Image Banner + Full Formatted Text + Audio)
const sendTextMenu = async (conn, from, mek, text) => {
    const imgPath = path.join(__dirname, '../media/menu.jpg');
    const opts = mek && !mek.key?.fromMe ? { quoted: mek } : {};
    try {
        if (fs.existsSync(imgPath)) {
            await conn.sendMessage(from, { image: fs.readFileSync(imgPath), caption: text }, opts);
        } else {
            await conn.sendMessage(from, { text }, opts);
        }
        await sendMenuAudio(conn, from, mek);
        return true;
    } catch (e1) {
        try {
            if (fs.existsSync(imgPath)) {
                await conn.sendMessage(from, { image: fs.readFileSync(imgPath), caption: text });
            } else {
                await conn.sendMessage(from, { text });
            }
            await sendMenuAudio(conn, from, mek);
            return true;
        } catch (e2) {
            console.error('sendTextMenu error:', e2.message);
            return false;
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  STYLE & METHOD RESOLVERS
// ═══════════════════════════════════════════════════════════════════════════
const resolveStyle = (overrideArg) => {
    // If user typed e.g. .menu ourin or .menu nano
    if (overrideArg) {
        const clean = overrideArg.toLowerCase().trim();
        if (clean === 'anita' || clean === 'queenanita') return 'queen anita';
        if (clean === 'velyn') return 'velynbot';
        if (clean === 'chay' || clean === 'fallzx') return 'maochan';
        if (STYLES_ORDER.includes(clean)) return clean;
    }

    if (global.MENU_STYLE === 'random') {
        const idx = Math.floor(Math.random() * STYLES_ORDER.length);
        return STYLES_ORDER[idx];
    } else if (global.MENU_STYLE === 'rotate') {
        const style = STYLES_ORDER[currentStyleIndex % STYLES_ORDER.length];
        currentStyleIndex++;
        return style;
    } else if (STYLES_ORDER.includes(global.MENU_STYLE)) {
        return global.MENU_STYLE;
    }
    return 'hydro';
};

const resolveMethod = (overrideArg) => {
    if (overrideArg) {
        const clean = overrideArg.toLowerCase().trim();
        if (clean === 'button' || clean === 'list' || clean === 'action') return 'button';
        if (clean === 'card' || clean === 'doc' || clean === 'document') return 'card';
        if (clean === 'text' || clean === 'image' || clean === 'texted') return 'text';
    }

    if (global.MENU_METHOD === 'random') {
        const idx = Math.floor(Math.random() * METHODS_ORDER.length);
        return METHODS_ORDER[idx];
    } else if (global.MENU_METHOD === 'rotate') {
        const method = METHODS_ORDER[currentMethodIndex % METHODS_ORDER.length];
        currentMethodIndex++;
        return method;
    } else if (METHODS_ORDER.includes(global.MENU_METHOD)) {
        return global.MENU_METHOD;
    }
    return 'random';
};

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN MENU COMMAND
// ═══════════════════════════════════════════════════════════════════════════
cmd({
    pattern: 'menu',
    alias: ['help', 'list', 'allmenu', 'fullmenu', 'commands'],
    react: '🦅',
    desc: 'Show dynamic menu with 9 rotating bot styles & 3 sending methods',
    category: 'main',
    filename: __filename
},
async (conn, mek, m, { from, pushname, args, reply }) => {
    const rawArg = args[0] ? args.join(' ').toLowerCase().trim() : '';

    // Check if user specifically requested a method or a style
    const isMethodArg = ['button', 'list', 'action', 'card', 'text', 'doc', 'image'].includes(rawArg);
    const isStyleArg = STYLES_ORDER.includes(rawArg) || ['anita', 'queenanita', 'velyn'].includes(rawArg);

    const chosenStyle = resolveStyle(isStyleArg ? rawArg : null);
    const chosenMethod = isMethodArg ? resolveMethod(rawArg) : resolveMethod(null);

    const meta = getMeta(pushname);
    const generator = STYLE_GENERATORS[chosenStyle] || generateHydroMenu;
    const textMenu = generator(meta);

    console.log(`📋 [MENU DISPATCH] Style: ${chosenStyle} | Method: ${chosenMethod} | User: ${pushname}`);

    if (chosenMethod === 'button') {
        const success = await sendButtonMenu(conn, from, mek, meta, chosenStyle);
        if (!success) await sendCardMenu(conn, from, mek, textMenu, meta, chosenStyle).catch(() => sendTextMenu(conn, from, mek, textMenu));
    } else if (chosenMethod === 'card') {
        const success = await sendCardMenu(conn, from, mek, textMenu, meta, chosenStyle);
        if (!success) await sendTextMenu(conn, from, mek, textMenu);
    } else {
        // 'text' / 'texted' method
        await sendTextMenu(conn, from, mek, textMenu);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SUB-MENUS (Category-specific commands)
// ═══════════════════════════════════════════════════════════════════════════
const subMenusConfig = [
    { cmd: 'dlmenu',     key: 'download', desc: 'Downloader Menu',         react: '📥' },
    { cmd: 'searchmenu', key: 'search',   desc: 'Search Tools Menu',       react: '🔍' },
    { cmd: 'aimenu',     key: 'ai',       desc: 'AI & Filters Menu',       react: '🤖' },
    { cmd: 'toolmenu',   key: 'tools',    desc: 'Converters & Tools Menu', react: '🪄' },
    { cmd: 'canvasmenu', key: 'canvas',   desc: 'Maker & Canvas Menu',     react: '🎨' },
    { cmd: 'gamemenu',   key: 'game',     desc: 'Games & Fun Menu',        react: '🎯' },
    { cmd: 'gmenu',      key: 'group',    desc: 'Group Commands Menu',     react: '👥' },
    { cmd: 'gsmenu',     key: 'group',    desc: 'Group Settings Menu',     react: '🛡️' },
    { cmd: 'ownermenu',  key: 'owner',    desc: 'Owner Commands Menu',     react: '👑' },
    { cmd: 'mainmenu',   key: 'main',     desc: 'General Commands Menu',   react: '🏠' },
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
        const activeStyle = STYLES_ORDER[(currentStyleIndex > 0 ? currentStyleIndex - 1 : 0) % STYLES_ORDER.length];
        const meta = getMeta(pushname);
        const text = generateCategoryMenu(activeStyle, conf.key, meta);
        await sendTextMenu(conn, from, mek, text);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
//  STYLE & METHOD CONFIGURATION COMMANDS
// ═══════════════════════════════════════════════════════════════════════════
cmd({
    pattern: 'setmenu',
    alias: ['setmenustyle', 'menustyle'],
    desc: 'Set or view current menu visual style',
    category: 'owner',
    filename: __filename
},
async (conn, mek, m, { q, reply, isOwner }) => {
    const available = [...STYLES_ORDER, 'rotate', 'random'];
    if (!q) {
        let msg = `🎨 *XYMBOT MENU STYLES*\n\n`;
        msg += `📌 Active Style Mode: *${global.MENU_STYLE}*\n`;
        msg += `🎯 Next Rotation Style: *${STYLES_ORDER[currentStyleIndex % STYLES_ORDER.length]}*\n\n`;
        msg += `✨ *Available Styles:*\n`;
        STYLES_ORDER.forEach((s, idx) => {
            msg += `  ${idx + 1}. *${s}*\n`;
        });
        msg += `  10. *rotate* (Automatic sequence: hydro ➔ nano ➔ ourin ➔ alya ➔ yori ➔ velyn ➔ anita ➔ trinity ➔ maochan)\n`;
        msg += `  11. *random* (Pick random style on every menu)\n\n`;
        msg += `💡 *Usage:* .setmenu <style name>`;
        return reply(msg);
    }

    if (!isOwner) return reply('⚠️ Only the bot owner can change the default menu style!');

    const target = q.toLowerCase().trim();
    if (target === 'velyn') global.MENU_STYLE = 'velynbot';
    else if (target === 'anita' || target === 'queenanita') global.MENU_STYLE = 'queen anita';
    else if (available.includes(target)) global.MENU_STYLE = target;
    else return reply(`❌ Invalid style! Available:\n${available.join(', ')}`);

    return reply(`✅ Menu visual style updated to: *${global.MENU_STYLE.toUpperCase()}*`);
});

cmd({
    pattern: 'setmenumethod',
    alias: ['menumethod'],
    desc: 'Set or view sending method (button, card, text, random, rotate)',
    category: 'owner',
    filename: __filename
},
async (conn, mek, m, { q, reply, isOwner }) => {
    const available = ['button', 'card', 'text', 'random', 'rotate'];
    if (!q) {
        let msg = `📡 *XYMBOT SENDING METHODS*\n\n`;
        msg += `📌 Current Method Mode: *${global.MENU_METHOD}*\n\n`;
        msg += `✨ *Available Methods:*\n`;
        msg += `  1. *button* — Interactive WhatsApp List / Action Button category selector\n`;
        msg += `  2. *card*   — Rich Document/Media Card with ExternalAdReply & Newsletter\n`;
        msg += `  3. *text*   — Banner Image + Formatted Text + Audio\n`;
        msg += `  4. *random* — Randomly picks method on every .menu call\n`;
        msg += `  5. *rotate* — Sequentially cycles through button ➔ card ➔ text\n\n`;
        msg += `💡 *Usage:* .setmenumethod <button/card/text/random/rotate>`;
        return reply(msg);
    }

    if (!isOwner) return reply('⚠️ Only the bot owner can change the menu sending method!');

    const target = q.toLowerCase().trim();
    // allow alias mapping
    const mapped = (target === 'list' || target === 'action') ? 'button' : target;
    if (available.includes(mapped)) {
        global.MENU_METHOD = mapped;
        return reply(`✅ Menu sending method updated to: *${mapped.toUpperCase()}*`);
    } else {
        return reply(`❌ Invalid method! Available:\n${available.join(', ')}`);
    }
});

module.exports = {
    generateHydroMenu,
    generateNanoMenu,
    generateOurinMenu,
    generateAlyaMenu,
    generateYoriMenu,
    generateVelynMenu,
    generateAnitaMenu,
    generateTrinityMenu,
    generateMaochanMenu,
    STYLES_ORDER,
    METHODS_ORDER
};
