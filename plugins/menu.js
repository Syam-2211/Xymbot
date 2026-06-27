const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');

cmd({
    pattern: "menu",
    alias: ["help", "list"],
    react: "🦅",
    desc: "Main Menu",
    category: "main",
    filename: __filename
},
    async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
        try {
            const botName = global.botName || "🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊";
            const ownerName = global.ownerName || "🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓";
            const uptime = runtime(process.uptime());
            const mode = global.WORKTYPE || 'public';

            let menu = `
╔══════════════════════════╗
║  ✧ *${botName}* ✧
║  👑 *Owner* : ${ownerName}
║  ⏳ *Uptime* : ${uptime}
║  🌐 *Mode* : ${mode.toUpperCase()}
╚══════════════════════════╝

✨ *Hello ${pushname}!* Here are all commands:

◈━━━━━━━━━━━━━━━━━━━━━━◈
  📥 *DOWNLOADS*
◈━━━━━━━━━━━━━━━━━━━━━━◈
│ 🎵 .tiktok / .tt / .tik
│ 📸 .instagram / .insta / .ig
│ 📘 .facebook / .fb / .fbdl
│ 🎧 .play / .song / .ytmp3
│ 📺 .video / .mp4 / .ytv

◈━━━━━━━━━━━━━━━━━━━━━━◈
  🎨 *CONVERTERS & TOOLS*
◈━━━━━━━━━━━━━━━━━━━━━━◈
│ 🖼️ .sticker / .s / .stic
│ 🎵 .tomp3 / .mp3 / .audio
│ 🔓 .vv / .viewonce

◈━━━━━━━━━━━━━━━━━━━━━━◈
  🔊 *AUDIO EFFECTS* _(reply to audio)_
◈━━━━━━━━━━━━━━━━━━━━━━◈
│ 🔊 .bass / .bassboost
│ 🌊 .underwater / .deep
│ 🐿️ .chipmunk / .high
│ 🤖 .robot / .botvoice
│ 🐢 .slow / .slowmo

◈━━━━━━━━━━━━━━━━━━━━━━◈
  🤖 *AI TOOLS*
◈━━━━━━━━━━━━━━━━━━━━━━◈
│ 🧠 .ai / .gpt / .gemini / .bot

◈━━━━━━━━━━━━━━━━━━━━━━◈
  👥 *GROUP COMMANDS* _(Admin Only)_
◈━━━━━━━━━━━━━━━━━━━━━━◈
│ 👢 .kick _[reply user]_
│ 🔼 .promote _[reply user]_
│ 🔽 .demote _[reply user]_
│ 📢 .tagall / .everyone
│ 🥷 .hidetag / .ht
│ 🔇 .mute / .close
│ 🔊 .unmute / .open
│ 🔗 .invite / .link
│ ⏰ .autoclose _[hours]_
│ ⏰ .autopen _[hours]_

◈━━━━━━━━━━━━━━━━━━━━━━◈
  ⚙️ *GROUP SETTINGS* _(Admin Only)_
◈━━━━━━━━━━━━━━━━━━━━━━◈
│ 🛡️ .antilink on/off
│ 🛡️ .antidelete on/off
│ 👋 .welcome on/off
│ 📤 .goodbye on/off
│ ✍️ .setwelcome _[text]_
│ ✍️ .setgoodbye _[text]_
│ 📊 .ginfo / .settings

◈━━━━━━━━━━━━━━━━━━━━━━◈
  👑 *OWNER COMMANDS*
◈━━━━━━━━━━━━━━━━━━━━━━◈
│ 🔐 .mode _[public/private]_
│ 👤 .sudo _[add/del/list]_
│ 💎 .owner / .creator
│ 🛍️ .catalogue
│ ☁️ .my-command

◈━━━━━━━━━━━━━━━━━━━━━━◈
  💡 *MAIN COMMANDS*
◈━━━━━━━━━━━━━━━━━━━━━━◈
│ ✅ .alive / .runtime
│ 📋 .menu / .help
│ 🧪 .test

_Reply with a command to use it!_ ✨
`;

            await conn.sendMessage(from, {
                image: { url: "https://files.catbox.moe/nbn8w8.jpeg" },
                caption: menu
            }, { quoted: mek });

        } catch (e) {
            reply('*Error:* ' + e);
            console.log(e);
        }
    });

