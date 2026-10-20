const { cmd } = require('../command');

// Default initial badwords (Malayalam / English offensive words)
const DEFAULT_BADWORDS = ['myre', 'punde', 'thendi', 'oomb', 'fuck', 'bitch', 'asshole', 'bastard', 'thayoli'];

// Ensure badwords table exists in chat DB
function getBadwordsList(chatId) {
    if (!global.db.data.chats[chatId]) {
        global.db.data.chats[chatId] = {};
    }
    const chat = global.db.data.chats[chatId];
    if (!Array.isArray(chat.badwords)) {
        chat.badwords = [...DEFAULT_BADWORDS];
    }
    return chat.badwords;
}

// ── COMMAND: .badword to manage toxic word filters ──────────────────────────
cmd({
    pattern: "badword",
    alias: ["antibadword", "toxic"],
    react: "🛡️",
    desc: "Manage toxic and bad word filtering in group (Admin only)",
    category: "group",
    filename: __filename
},
async (conn, mek, m, { from, args, isGroup, isAdmins, isOwner, reply }) => {
    try {
        if (!isGroup) return reply('❌ This command only works in groups!');
        if (!isAdmins && !isOwner) return reply('❌ Only group admins can manage badwords!');

        const chat = global.db.data.chats[from] || (global.db.data.chats[from] = {});
        const subCmd = args[0]?.toLowerCase();
        const word = args.slice(1).join(' ').trim().toLowerCase();
        const currentList = getBadwordsList(from);

        if (subCmd === 'on') {
            chat.antibadword = true;
            return reply(`🛡️ *Anti-Badword Protection is now ENABLED!* 🟢\nOffensive words will be deleted with automatic warnings.`);
        } else if (subCmd === 'off') {
            chat.antibadword = false;
            return reply(`🛡️ *Anti-Badword Protection is now DISABLED!* 🔴`);
        } else if (subCmd === 'add') {
            if (!word) return reply('⚠️ Please specify the word to add!\n*Example:* `.badword add spamword`');
            if (currentList.includes(word)) return reply(`⚠️ The word *"${word}"* is already on the blacklist!`);
            currentList.push(word);
            return reply(`✅ Successfully added *"${word}"* to the badword blacklist!`);
        } else if (subCmd === 'del' || subCmd === 'remove') {
            if (!word) return reply('⚠️ Please specify the word to remove!\n*Example:* `.badword del spamword`');
            const idx = currentList.indexOf(word);
            if (idx === -1) return reply(`⚠️ The word *"${word}"* was not found in the blacklist.`);
            currentList.splice(idx, 1);
            return reply(`✅ Successfully removed *"${word}"* from the badword blacklist!`);
        } else if (subCmd === 'list') {
            const status = chat.antibadword ? '🟢 ENABLED' : '🔴 DISABLED';
            return reply(`🛡️ *ANTI-BADWORD BLACKLIST*\nStatus: ${status}\n\n*Blocked Words (${currentList.length}):*\n• ${currentList.join('\n• ')}`);
        }

        // Help menu if no matching sub-command
        const helpText = `
╭━━━〔 🛡️ *ANTI-BADWORD SYSTEM* 〕━━━┈
┃ 📊 *Status:* ${chat.antibadword ? '🟢 ON' : '🔴 OFF'}
┃ 📝 *Blacklisted Words:* ${currentList.length} words
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈

*ADMIN COMMANDS:*
│ ∘ *.badword on* — Turn ON filter
│ ∘ *.badword off* — Turn OFF filter
│ ∘ *.badword add <word>* — Add new word
│ ∘ *.badword del <word>* — Remove word
│ ∘ *.badword list* — View all blacklisted words
`.trim();
        return reply(helpText);

    } catch (e) {
        console.error('Badword plugin error:', e);
        reply('❌ Error managing badword settings.');
    }
});

// ── PASSIVE LISTENER: Checks all incoming group messages ────────────────────
const badwordHandler = async (m, { conn, isAdmin, isBotAdmin }) => {
    try {
        if (!m.isGroup) return true;

        const chat = global.db.data.chats[m.chat];
        if (!chat || !chat.antibadword) return true; // Only if enabled

        const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || "").toLowerCase();
        if (!text) return true;

        const badwords = getBadwordsList(m.chat);
        const containsBadword = badwords.some(bw => {
            const regex = new RegExp(`\\b${bw.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
            return regex.test(text);
        });

        if (containsBadword) {
            // Admins are exempt from moderation
            if (isAdmin) return true;

            // Delete the message if bot has admin rights
            if (isBotAdmin) {
                await conn.sendMessage(m.chat, { delete: m.key });
            }

            // User warning system
            if (!global.db.data.users[m.sender]) {
                global.db.data.users[m.sender] = { warn: 0 };
            }

            global.db.data.users[m.sender].warn += 1;
            const currentWarns = global.db.data.users[m.sender].warn;

            const botName = global.botName || 'XYMBOT';
            if (currentWarns < 3) {
                await conn.sendMessage(m.chat, {
                    text: `⚠️ *${botName} Moderation Alert*\n\n@${m.sender.split('@')[0]} Inappropriate language detected!\n*Warning:* ${currentWarns}/3\n_Repeated bad words will result in removal from the group._`,
                    mentions: [m.sender]
                }, { quoted: m });
            } else {
                if (isBotAdmin) {
                    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
                    global.db.data.users[m.sender].warn = 0;
                    await conn.sendMessage(m.chat, {
                        text: `🚫 *${botName} Moderation Alert*\n\n@${m.sender.split('@')[0]} was removed for exceeding maximum warnings for abusive language.`,
                        mentions: [m.sender]
                    });
                }
            }
        }
    } catch (err) {
        console.error('Badword listener error:', err.message);
    }
    return true;
};

badwordHandler.customPrefix = /.*/;
badwordHandler.command = new RegExp();
badwordHandler.group = true;

module.exports = badwordHandler;
