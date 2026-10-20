const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "short",
    alias: ["shorten", "tinyurl", "shortlink"],
    react: "✂️",
    desc: "Shorten a long web link",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply("⚠️ Please provide a link to shorten!\n\n*Example:* `.short https://github.com/WhiskeySockets/Baileys`");
        }

        let targetUrl = q.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }

        reply("⏳ *Shortening link...*");

        // Primary: TinyURL API
        try {
            const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetUrl)}`, { timeout: 10000 });
            if (res.data && res.data.startsWith('http')) {
                const shortUrl = res.data.trim();
                const text = `
╭━━━〔 ✂️ *LINK SHORTENER* 〕━━━┈
┃ 🌐 *Original:* ${targetUrl.length > 40 ? targetUrl.slice(0, 37) + '...' : targetUrl}
┃ 🔗 *Short Link:* ${shortUrl}
╰━━━━━━━━━━━━━━━━━━━━━━━━┈
`.trim();
                return await conn.sendMessage(from, { text }, { quoted: mek });
            }
        } catch (e) {
            console.warn('TinyURL failed, trying fallback:', e.message);
        }

        // Fallback: CleanURI API
        try {
            const res = await axios.post('https://cleanuri.com/api/v1/shorten', { url: targetUrl }, { timeout: 10000 });
            if (res.data?.result_url) {
                const shortUrl = res.data.result_url;
                const text = `
╭━━━〔 ✂️ *LINK SHORTENER* 〕━━━┈
┃ 🌐 *Original:* ${targetUrl.length > 40 ? targetUrl.slice(0, 37) + '...' : targetUrl}
┃ 🔗 *Short Link:* ${shortUrl}
╰━━━━━━━━━━━━━━━━━━━━━━━━┈
`.trim();
                return await conn.sendMessage(from, { text }, { quoted: mek });
            }
        } catch (e2) {
            console.error('CleanURI fallback failed:', e2.message);
        }

        return reply("❌ Failed to shorten the link. Please ensure the URL is valid and try again!");

    } catch (err) {
        console.error('Short Link Error:', err);
        reply("❌ An unexpected error occurred while shortening the link.");
    }
});
