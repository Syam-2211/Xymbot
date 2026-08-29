const { cmd, commands } = require('../command');

// ============================
// 📢 TAG ALL (Visible List)
// ============================
cmd({
    pattern: "tagall",
    alias: ["everyone", "all"],
    react: "📢",
    desc: global.LANG.tagall.TAGALL_DESC,
    category: "group",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // 1. Safety Checks
        if (!isGroup) return reply(global.LANG.group.GROUP_COMMAND);
        if (!isAdmins) return reply(global.LANG.group.NOT_ADMIN);

        // 2. Prepare the Message
        let text = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *GROUP TAG*

📢 *Message:* ${q ? q : "Attention Everyone!"}
══════════════════
`;
        // 3. Loop through all members and add them to text
        for (let mem of participants) {
            text += `┣ ➥ @${mem.id.split('@')[0]}\n`;
        }
        text += `══════════════════`;

        // 4. Send Message with Mentions
        await conn.sendMessage(from, { 
            text: text, 
            mentions: participants.map(a => a.id) 
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});

// ============================
// 🥷 HIDETAG (Hidden Mention)
// ============================
cmd({
    pattern: "hidetag",
    alias: ["ht", "tag"],
    react: "🥷",
    desc: "Tag everyone secretly",
    category: "group",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!isGroup) return reply(global.LANG.group.GROUP_COMMAND);
        if (!isAdmins) return reply(global.LANG.group.NOT_ADMIN);

        // If user replies to a message, use that message as the hidetag
        // If not, use the text they typed (e.g. .hidetag Hello)
        let text = q ? q : (m.quoted ? m.quoted.text : "Empty Message");
        let mime = (m.quoted && m.quoted.mimetype) ? m.quoted.mimetype : "";

        // Send the message directly, but inject the mentions list
        // This triggers the notification for everyone!
        
        if (m.quoted && (m.quoted.type !== 'conversation' && m.quoted.type !== 'extendedTextMessage')) {
             // If replying to Media (Image/Video/Sticker), re-send it with mentions
             await conn.sendMessage(from, { 
                forward: m.quoted, 
                mentions: participants.map(a => a.id) 
            }, { quoted: mek });
        } else {
            // Just text
            await conn.sendMessage(from, { 
                text: text, 
                mentions: participants.map(a => a.id) 
            }, { quoted: mek });
        }

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});

