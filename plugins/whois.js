const { cmd } = require('../command');

cmd({
    pattern: "whois",
    alias: ["stalk", "profile"],
    react: "🔍",
    desc: "Get information about a WhatsApp user.",
    category: "search",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, isOwner, quoted, text, reply }) => {
    try {
        let user;
        if (quoted && quoted.key) {
            user = quoted.key.participant || quoted.key.remoteJid;
        } else if (text) {
            user = text.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
        } else if (!isGroup) {
            user = from;
        }
        
        if (!user) return reply("⚠️ Reply to a user or mention their number!");

        reply("🔍 *Fetching profile info...*");

        let pp;
        try {
            pp = await conn.profilePictureUrl(user, 'image');
        } catch (e) {
            pp = null;
        }

        let statusText = 'No bio found or hidden';
        let statusSetAt = '';
        try {
            const status = await conn.fetchStatus(user);
            if (status && status.status) {
                statusText = status.status;
                if (status.setAt) {
                    statusSetAt = `\n*Set At:* ${new Date(status.setAt).toLocaleDateString()}`;
                }
            }
        } catch (e) {}

        let name = "WhatsApp User";
        try {
            name = `@${user.split('@')[0]}`;
        } catch (e) {}

        const caption = `
╭━━━〔 ✧ *USER PROFILE* ✧ 〕━━━┈
┃ 👤 *Number:* ${name}
┃ 🏷️ *Bio:* ${statusText} ${statusSetAt}
╰━━━━━━━━━━━━━━━━━━━━━━━━┈
        `.trim();

        if (pp) {
            await conn.sendMessage(from, { 
                image: { url: pp }, 
                caption: caption,
                mentions: [user] 
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, { 
                text: caption,
                mentions: [user] 
            }, { quoted: mek });
        }
        
    } catch (e) {
        console.error(e);
        reply("❌ Failed to fetch user profile. They might have privacy settings enabled.");
    }
});
