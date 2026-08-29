const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sendMenuAudio = async (conn, from, mek) => {
    try {
        const menuAudio = fs.readFileSync(path.join(__dirname, '../assets/audio/menu.mp3'));
        await conn.sendMessage(from, { audio: menuAudio, mimetype: 'audio/mpeg', ptt: false, id3Tagged: true }, { quoted: mek });
    } catch (err) {
        console.error('Failed to send menu audio', err);
    }
};

const sendMenuText = async (conn, from, mek, menuText) => {
    try {
        const menuImage = fs.readFileSync(path.join(__dirname, '../media/menu.jpg'));
        
        await conn.sendMessage(from, {
            image: menuImage,
            caption: menuText
        }, { quoted: mek });
        
        await sendMenuAudio(conn, from, mek);
    } catch (e) {
        console.log(e);
        conn.sendMessage(from, { text: '*Error:* ' + e }, { quoted: mek });
    }
};

const getHeader = (pushname) => {
    const botName = global.botName || "XYMBOT";
    const ownerName = global.ownerName || "Sneha";
    const uptime = runtime(process.uptime());
    const mode = global.WORKTYPE || 'public';
    const prefix = global.PREFIX || '.';
    const platform = os.platform() === 'win32' ? 'Windows' : os.platform() === 'linux' ? 'Linux' : 'Mac';

    return `
╭━━━〔 *${botName}* 〕━━━┈
┃ ❖ ᴏᴡɴᴇʀ : ${ownerName}
┃ ❖ ᴜsᴇʀ : ${pushname}
┃ ❖ ᴍᴏᴅᴇ : ${mode.charAt(0).toUpperCase() + mode.slice(1)}
┃ ❖ ᴘʟᴀᴛꜰᴏʀᴍ : ${platform}
┃ ❖ ᴜᴘᴛɪᴍᴇ : ${uptime}
┃ ❖ ᴘʀᴇꜰɪx : ${prefix}
╰━━━━━━━━━━━━━━━┈
`.trim();
};

const MENUS = {
    dlmenu: `
╭───『 ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 』
│ ∘ .tiktok / .tt
│ ∘ .instagram / .ig
│ ∘ .igdlstory _[link]_
│ ∘ .igdlmanual _[link]_
│ ∘ .facebook / .fb
│ ∘ .play / .ytmp3
│ ∘ .video / .ytv
╰───────────────┈
`.trim(),

    toolmenu: `
╭───『 ᴄᴏɴᴠᴇʀᴛᴇʀꜱ 』
│ ∘ .sticker / .s
│ ∘ .toimg / .img
│ ∘ .tomp3 / .audio
│ ∘ .tts / .say
│ ∘ .vv / .viewonce
│ ∘ .fancy / .font
│ ∘ .trt / .translate
╰───────────────┈
`.trim(),

    audiomenu: `
╭───『 ᴀᴜᴅɪᴏ ᴇꜰꜰᴇᴄᴛꜱ 』
│ _(Reply to an audio file)_
│ ∘ .bass / .bassboost
│ ∘ .underwater / .deep
│ ∘ .chipmunk / .high
│ ∘ .robot / .botvoice
│ ∘ .slow / .slowmo
╰───────────────┈
`.trim(),

    aimenu: `
╭───『 ᴀɪ ᴛᴏᴏʟꜱ 』
│ ∘ .ai / .gpt / .bot
│ ∘ .aigen / .imagine
╰───────────────┈
`.trim(),

    gmenu: `
╭───『 ɢʀᴏᴜᴘ ᴄᴏᴍᴍᴀɴᴅꜱ 』
│ _(Admin Only)_
│ ∘ .kick _[user]_
│ ∘ .promote _[user]_
│ ∘ .demote _[user]_
│ ∘ .tagall / .everyone
│ ∘ .hidetag / .ht
│ ∘ .mute / .close
│ ∘ .unmute / .open
│ ∘ .invite / .link
│ ∘ .autoclose _[hours]_
│ ∘ .autopen _[hours]_
╰───────────────┈
`.trim(),

    gsmenu: `
╭───『 ɢʀᴏᴜᴘ ꜱᴇᴛᴛɪɴɢꜱ 』
│ _(Admin Only)_
│ ∘ .antilink on/off
│ ∘ .antidelete on/off
│ ∘ .welcome on/off
│ ∘ .goodbye on/off
│ ∘ .setwelcome _[text]_
│ ∘ .setgoodbye _[text]_
│ ∘ .gsettings
╰───────────────┈
`.trim(),

    ownermenu: `
╭───『 ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅꜱ 』
│ ∘ .mode _[public/private]_
│ ∘ .sudo _[add/del/list]_
│ ∘ .block / .ban
│ ∘ .blockchat
│ ∘ .join / .joingroup
│ ∘ .owner / .creator
│ ∘ .catalogue
│
│ ── 『 ᴄᴜꜱᴛᴏᴍ ᴍᴇᴅɪᴀ 』 ──
│ ∘ .setcmdaudio _[cmd]_
│ ∘ .delcmdaudio _[cmd]_
│ ∘ .cmention _[type]_
│ ∘ .addcmentionaudio
│ ∘ .addcmentionvideo
│ ∘ .listcmention
╰───────────────┈
`.trim(),

    mainmenu: `
╭───『 ᴍᴀɪɴ ᴄᴏᴍᴍᴀɴᴅꜱ 』
│ ∘ .alive / .runtime
│ ∘ .menu / .help
│ ∘ .whois / .profile
│ ∘ .jid / .id
│ ∘ .settings
│ ∘ .test
╰───────────────┈
`.trim()
};

// ── MAIN MENU (FULL LIST) ──────────────────────────────────────────────────
cmd({
    pattern: "menu",
    alias: ["help", "list", "fullmenu", "allmenu"],
    react: "🦅",
    desc: "Main Menu List",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, pushname }) => {
    let text = `${getHeader(pushname)}\n\n`;
    for (const key in MENUS) {
        text += MENUS[key] + '\n\n';
    }
    text += `  _✨ Reply with a command! ✨_`;
    await sendMenuText(conn, from, mek, text);
});

// ── SUB-MENUS ───────────────────────────────────────────────────────────────
const subMenusConfig = [
    { cmd: "dlmenu", key: "dlmenu", desc: "Downloads Menu" },
    { cmd: "toolmenu", key: "toolmenu", desc: "Converters Menu" },
    { cmd: "audiomenu", key: "audiomenu", desc: "Audio Effects Menu" },
    { cmd: "aimenu", key: "aimenu", desc: "AI Tools Menu" },
    { cmd: "gmenu", key: "gmenu", desc: "Group Commands Menu" },
    { cmd: "gsmenu", key: "gsmenu", desc: "Group Settings Menu" },
    { cmd: "ownermenu", key: "ownermenu", desc: "Owner Commands Menu" },
    { cmd: "mainmenu", key: "mainmenu", desc: "Main Commands Menu" }
];

subMenusConfig.forEach(conf => {
    cmd({
        pattern: conf.cmd,
        react: "📜",
        desc: conf.desc,
        category: "main",
        filename: __filename
    },
    async (conn, mek, m, { from, pushname, isGroup, reply }) => {
        if ((conf.cmd === 'gmenu' || conf.cmd === 'gsmenu') && !isGroup) {
            return reply("⚠️ This command can only be used in groups!");
        }
        let text = `${getHeader(pushname)}\n\n${MENUS[conf.key]}\n\n_✨ Reply with a command! ✨_`;
        await sendMenuText(conn, from, mek, text);
    });
});
