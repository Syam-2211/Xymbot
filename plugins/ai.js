const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "ai",
    alias: ["gpt", "gemini", "bot"],
    react: "🧠",
    desc: "Chat with AI",
    category: "ai",
    filename: __filename
},
async(conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("Hey! 👋 Ask me anything!\n\nExample: *.ai What is the capital of France?*");

        reply("🤔 *Thinking...*");

        // Using a 100% Free API that doesn't require any API keys
        try {
            let data = await fetchJson(`https://api.siputzx.my.id/api/ai/gpt4?prompt=${encodeURIComponent(q)}`);
            
            if (data && data.data) {
                return reply(`🤖 *𝑆𝑌𝛥𝛭 Ai:*\n\n${data.data.trim()}`);
            }
        } catch (e) {
            console.log('Free API 1 failed:', e.message);
        }

        // Fallback to a second Free API
        try {
            let data2 = await fetchJson(`https://aemt.me/gpt4?text=${encodeURIComponent(q)}`);
            if (data2 && data2.result) {
                return reply(`🤖 *𝑆𝑌𝛥𝛭 Ai:*\n\n${data2.result.trim()}`);
            }
        } catch (e) {
            console.log('Free API 2 failed:', e.message);
        }

        return reply("⚠️ Sorry, my brain couldn't process that right now. Try again later!");

    } catch (e) {
        console.log('AI Error:', e.message);
        reply("⚠️ AI is temporarily unavailable. Try again later!");
    }
});
