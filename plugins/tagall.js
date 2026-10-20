const { cmd, commands } = require('../command');

// Anti-Ban: Cooldown tracker for mass mention commands (45 seconds per group)
const groupTagCooldown = new Map();
const TAG_COOLDOWN_MS = 45000;
const MAX_SAFE_MENTIONS = 100;

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
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, participants, groupAdmins, isBotAdmins, isAdmins, isOwner, reply }) => {
    try {
        // 1. Safety Checks
        if (!isGroup) return reply(global.LANG.group.GROUP_COMMAND);
        if (!isAdmins && !isOwner) return reply(global.LANG.group.NOT_ADMIN);

        // Anti-Ban Cooldown: prevent group members/admins from spamming tagall and causing mass reports
        const now = Date.now();
        const lastTag = groupTagCooldown.get(from) || 0;
        if (!isOwner && (now - lastTag < TAG_COOLDOWN_MS)) {
            const remaining = Math.ceil((TAG_COOLDOWN_MS - (now - lastTag)) / 1000);
            return reply(`⏳ *Anti-Ban Protection:* Please wait *${remaining}s* before tagging everyone again.`);
        }
        groupTagCooldown.set(from, now);

        // Safe mention list (capped to prevent WhatsApp stanza rejection & report triggers)
        const safeParticipants = participants.slice(0, MAX_SAFE_MENTIONS);

        // 2. Prepare the Message
        let text = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *GROUP TAG*

📢 *Message:* ${q ? q : "Attention Everyone!"}
══════════════════
`;
        // 3. Loop through members and add them to text
        for (let mem of safeParticipants) {
            text += `┣ ➥ @${mem.id.split('@')[0]}\n`;
        }
        if (participants.length > MAX_SAFE_MENTIONS) {
            text += `\n⚠️ _[Anti-Ban Safeguard: Tag capped at ${MAX_SAFE_MENTIONS} members]_`;
        }
        text += `\n══════════════════`;

        // 4. Send Message with Mentions
        await conn.sendMessage(from, { 
            text: text, 
            mentions: safeParticipants.map(a => a.id) 
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
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, participants, groupAdmins, isBotAdmins, isAdmins, isOwner, reply }) => {
    try {
        if (!isGroup) return reply(global.LANG.group.GROUP_COMMAND);
        if (!isAdmins && !isOwner) return reply(global.LANG.group.NOT_ADMIN);

        // Anti-Ban Cooldown: prevent spamming hidetag
        const now = Date.now();
        const lastTag = groupTagCooldown.get(from) || 0;
        if (!isOwner && (now - lastTag < TAG_COOLDOWN_MS)) {
            const remaining = Math.ceil((TAG_COOLDOWN_MS - (now - lastTag)) / 1000);
            return reply(`⏳ *Anti-Ban Protection:* Please wait *${remaining}s* before using hidetag again.`);
        }
        groupTagCooldown.set(from, now);

        const safeParticipants = participants.slice(0, MAX_SAFE_MENTIONS);
        let text = q ? q : (m.quoted ? m.quoted.text : "Empty Message");

        if (m.quoted && (m.quoted.type !== 'conversation' && m.quoted.type !== 'extendedTextMessage')) {
             await conn.sendMessage(from, { 
                forward: m.quoted, 
                mentions: safeParticipants.map(a => a.id) 
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, { 
                text: text, 
                mentions: safeParticipants.map(a => a.id) 
            }, { quoted: mek });
        }

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});

