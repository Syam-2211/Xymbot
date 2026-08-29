const { cmd } = require('../command');

cmd({
    pattern: "join",
    alias: ["joingroup"],
    react: "✅",
    desc: "Join a group via link",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, args, reply }) => {
    try {
        if (!isOwner) return reply("⚠️ Only the bot owner can use this command!");
        if (!args[0]) return reply("⚠️ Please provide a WhatsApp group invite link!");
        
        let linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;
        let match = args[0].match(linkRegex);
        if (!match || !match[1]) return reply("❌ Invalid WhatsApp group link!");
        
        let code = match[1];
        
        await conn.groupAcceptInvite(code);
        reply("✅ Successfully joined the group!");
        
    } catch (e) {
        console.error(e);
        reply("❌ Failed to join the group! Either the link was revoked, the bot is banned, or an error occurred.");
    }
});
