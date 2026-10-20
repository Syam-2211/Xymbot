const { cmd } = require('../command');
const { exec } = require('child_process');

cmd({
    pattern: "google",
    alias: ["search", "find", "gsearch"],
    react: "🔍",
    desc: "Search Google in real-time",
    category: "search",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ What do you want to search?\nExample: *.google today gold rate in kerala* or *.google latest tech news*");

        reply("🔍 *Searching Google...*");

        const botName = global.botName || "XYMBOT";
        const queryObj = JSON.stringify({ q: q.trim(), num: 5 });
        // Safe execution using JSON query flag
        const escapedQuery = JSON.stringify(queryObj);
        const command = `monid run -p litescrape -e /google/search --query ${escapedQuery} -w -j`;

        exec(command, { timeout: 25000, maxBuffer: 1024 * 1024 }, async (error, stdout, stderr) => {
            if (error) {
                console.error('[Google Search Error]:', error.message);
                return reply("❌ Failed to fetch search results. Please try again later.");
            }

            try {
                const data = JSON.parse(stdout);
                const results = data.output?.organic_results;

                if (!results || results.length === 0) {
                    return reply("❌ No search results found for: *" + q + "*");
                }

                let responseText = `🔍 *GOOGLE SEARCH RESULTS*\n*Query:* _${q}_\n\n`;

                for (let i = 0; i < Math.min(results.length, 5); i++) {
                    const item = results[i];
                    responseText += `*${i + 1}. ${item.title}*\n`;
                    if (item.snippet) responseText += `${item.snippet}\n`;
                    if (item.link) responseText += `🔗 ${item.link}\n\n`;
                }

                responseText += `⚡ _Powered by ${botName}_\n> © 𝑆𝑌𝛥𝛭.3𝐹𝛸 • 複| xʏᴀᴍツ • 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓`;

                await conn.sendMessage(from, { text: responseText.trim() }, { quoted: mek });

            } catch (parseErr) {
                console.error('[Monid JSON Parse Error]:', parseErr.message);
                reply("⚠️ Received unexpected response while parsing search data.");
            }
        });

    } catch (e) {
        console.error('Search Command Error:', e);
        reply("❌ Error processing search request.");
    }
});
