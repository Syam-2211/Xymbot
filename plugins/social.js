const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');

// ============================
// 📸 INSTAGRAM DOWNLOADER
// ============================
cmd({
    pattern: "instagram",
    alias: ["insta", "ig"],
    react: "📸",
    desc: "Download Instagram reels/posts",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        if (!q) return reply("Please give me an Instagram link! \nExample: .insta https://www.instagram.com/p/...");

        reply("⬇️ *Downloading from Instagram...*");

        let data = await fetchJson(`https://api.siputzx.my.id/api/d/ig?url=${q}`);
        
        if (!data.data || data.data.length === 0) return reply("❌ Error: Could not find the post. Is account private?");

        let caption = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *INSTA DOWNLOADER*

👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
`;

        // Siputzx IG API returns an array of media objects containing .url
        let mediaUrl = data.data[0].url;

        await conn.sendMessage(from, { 
            video: { url: mediaUrl }, 
            caption: caption 
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error fetching Instagram. Try again later.");
    }
});

// ============================
// 📘 FACEBOOK DOWNLOADER
// ============================
cmd({
    pattern: "facebook",
    alias: ["fb", "fbdl"],
    react: "📘",
    desc: "Download Facebook videos",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        if (!q) return reply("Please give me a FB link! \nExample: .fb https://www.facebook.com/...");

        reply("⬇️ *Downloading from Facebook...*");

        let data = await fetchJson(`https://api.siputzx.my.id/api/d/facebook?url=${q}`);
        
        if (!data.data || !data.data.urls || data.data.urls.length === 0) return reply("❌ Error: Video not found or private.");

        let caption = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *FB DOWNLOADER*

👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
`;

        // Siputzx FB API returns .data.urls array (choose HD or SD)
        const urls = data.data.urls;
        let videoUrl = urls.find(u => u.quality === 'HD')?.url || urls[0].url;

        await conn.sendMessage(from, { 
            video: { url: videoUrl }, 
            caption: caption 
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error fetching Facebook. Try again later.");
    }
});
