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

        const sendOptions = mek && !mek.key?.fromMe ? { quoted: mek } : {};
        try {
            await conn.sendMessage(from, { text: pingText }, sendOptions);
        } catch (_) {
            await conn.sendMessage(from, { text: pingText });
        }
    } catch (e) {
        console.error("Ping Error:", e);
        try {
            await conn.sendMessage(from, { text: "🚀 Pong! Latency: 1ms" });
        } catch (_) {}
    }
});
