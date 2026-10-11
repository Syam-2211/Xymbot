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
        const latency = Date.now() - startTime;
        
        let pingText = `
╭━━━〔 ✧ *BOT STATUS* ✧ 〕━━━┈
┃ 🚀 *Latency:* ${latency}ms
┃ 🟢 *Status:* Online & Active!
╰━━━━━━━━━━━━━━━━━━━━━━━━┈
`.trim();

        await conn.sendMessage(from, { text: pingText }, { quoted: mek });
    } catch (e) {
        console.error("Ping Error:", e);
        reply("❌ Error checking ping: " + e.message);
    }
});
