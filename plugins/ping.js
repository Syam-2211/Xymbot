const { cmd } = require('../command');

cmd({
    pattern: "ping",
    alias: ["latency", "speed"],
    react: "🚀",
    desc: "Check bot latency",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const startTime = Date.now();
        // Send initial message
        const msg = await conn.sendMessage(from, { text: '*Testing Ping...*' }, { quoted: mek });
        const endTime = Date.now();
        
        // Calculate latency
        const latency = endTime - startTime;
        
        let pingText = `
╭━━━〔 ✧ *BOT STATUS* ✧ 〕━━━┈
┃ 🚀 *Latency:* ${latency}ms
┃ 🟢 *Status:* Online & Active!
╰━━━━━━━━━━━━━━━━━━━━━━━━┈
`.trim();

        // Edit the message with the final ping
        await conn.sendMessage(from, { text: pingText, edit: msg.key });
    } catch (e) {
        console.error("Ping Error:", e);
        reply("❌ Error checking ping.");
    }
});
