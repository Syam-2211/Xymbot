const { cmd } = require('../command');

cmd({
    pattern: "restart",
    alias: ["reboot"],
    react: "🔄",
    desc: "Restart the bot",
    category: "owner",
    filename: __filename
},
async(conn, mek, m, { from, isOwner, reply }) => {
    try {
        if (!isOwner) return reply("⚠️ This command is only for the bot owner!");
        
        await reply("🔄 *Restarting bot...*\n\nPlease wait a moment.");
        
        // This will exit the Node process. 
        // If you are using a process manager like PM2, or a hosting service, it will automatically start back up.
        setTimeout(() => {
            process.exit(0);
        }, 1500);

    } catch (e) {
        console.log('Restart Error:', e.message);
        reply("⚠️ Failed to restart.");
    }
});
