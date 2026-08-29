const { cmd } = require('../command');
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "aigen",
    alias: ["imagine", "generate"],
    react: "🎨",
    desc: "Generate images using AI",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ What do you want me to generate?\nExample: *.aigen A futuristic city with flying cars*");

        reply("🎨 *Generating image... Please wait!*");

        const url = `https://api.siputzx.my.id/api/ai/text2img?prompt=${encodeURIComponent(q)}`;
        
        await conn.sendMessage(from, { 
            image: { url: url }, 
            caption: `✅ *Generated successfully!*\n*Prompt:* ${q}` 
        }, { quoted: mek });

    } catch (e) {
        console.error('AIGEN Error:', e.message);
        reply("⚠️ Failed to generate image. Try again later!");
    }
});
