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

        // Using a stable Free API
        let data = await fetchJson(`https://widipe.com/instagram?url=${q}`);
        
        if (!data.result) return reply("❌ Error: Could not find the post. Is account private?");

        // Caption with your Fancy Names
        let caption = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *INSTA DOWNLOADER*

👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
`;

        // Send the media (Video or Image)
        await conn.sendMessage(from, { 
            video: { url: data.result[0].url }, 
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

        // Using a stable Free API
        let data = await fetchJson(`https://widipe.com/facebook?url=${q}`);
        
        if (!data.result) return reply("❌ Error: Video not found or private.");

        let caption = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *FB DOWNLOADER*

📝 *Title:* ${data.result.title || "Facebook Video"}
👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
`;

        // Send the HD Video if available, otherwise SD
        let videoUrl = data.result.hd || data.result.sd;

        await conn.sendMessage(from, { 
            video: { url: videoUrl }, 
            caption: caption 
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error fetching Facebook. Try again later.");
    }
});

