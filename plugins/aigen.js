const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "aigen",
    alias: ["imagine", "generate", "dalle", "aiimg"],
    react: "🎨",
    desc: "Generate images using AI",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ What do you want me to generate?\nExample: *.aigen A futuristic cyberpunk city at sunset*");

        reply("🎨 *Generating image... Please wait!*");

        const prompt = encodeURIComponent(q.trim());
        const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

        const res = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        await conn.sendMessage(from, {
            image: Buffer.from(res.data),
            caption: `🎨 *Generated with AI*\n\n✨ *Prompt:* ${q}`
        }, { quoted: mek });

    } catch (e) {
        console.error('AIGEN Error:', e.message);
        reply("⚠️ Failed to generate image. Please try a simpler prompt or try again later!");
    }
});
