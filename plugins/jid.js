const { cmd } = require('../command');

cmd({
    pattern: "jid",
    alias: ["id"],
    react: "🆔",
    desc: "Get the JID of the current chat, sender, or quoted user.",
    category: "utilities",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply, sender }) => {
    try {
        let jid;
        if (quoted && quoted.key) {
            jid = quoted.key.participant || quoted.key.remoteJid;
            let text = `
╭━━━〔 ✧ *JID INFO* ✧ 〕━━━┈
┃ 👤 *Target:* Quoted User
┃ 🆔 *JID:* ${jid}
╰━━━━━━━━━━━━━━━━━━━━━━━━┈
            `.trim();
            reply(text);
        } else {
            let text = `
╭━━━〔 ✧ *JID INFO* ✧ 〕━━━┈
┃ 🏠 *Chat JID:* ${from}
┃ 👤 *Your JID:* ${sender}
╰━━━━━━━━━━━━━━━━━━━━━━━━┈
            `.trim();
            reply(text);
        }
    } catch (e) {
        console.error(e);
        reply("❌ Failed to get JID.");
    }
});
