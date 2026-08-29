const { cmd } = require('../command');

cmd({
    pattern: "block",
    alias: ["ban"],
    react: "🚫",
    desc: "Block a user.",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, quoted, text, reply }) => {
    try {
        if (!isOwner) return reply("⚠️ Only the bot owner can use this command!");
        
        let user;
        if (quoted) {
            user = quoted.sender || quoted.participant;
        } else if (text) {
            user = text.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
        }
        
        if (!user) return reply("⚠️ Reply to a user or mention their number to block them!");
        
        await conn.updateBlockStatus(user, "block");
        reply("🚫 *Successfully blocked user!*");
        
    } catch (e) {
        console.error(e);
        reply("❌ Failed to block user.");
    }
});
