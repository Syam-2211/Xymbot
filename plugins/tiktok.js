const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "tiktok",
    alias: ["tt", "tik"],
    react: "🎵",
    desc: "Download TikTok video without watermark",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        // 1. Check for Link
        if (!q) return reply("Please give me a TikTok link! \nExample: .tiktok https://vm.tiktok.com/...");
        if (!q.includes("tiktok.com")) return reply("⚠️ That is not a valid TikTok link!");

        reply("⬇️ *Downloading... Please wait!*");

        // 2. Fetch from TikWM API (Free & No Watermark)
        let data = await fetchJson(`https://www.tikwm.com/api/?url=${q}`);
        
        if (!data.data) return reply("❌ Error: Video not found. Is the profile private?");

        // 3. Create Caption with YOUR Fancy Names
        let caption = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *TIKTOK DOWNLOADER*

👤 *Author:* ${data.data.author.nickname}
📝 *Title:* ${data.data.title}
👁️ *Views:* ${data.data.play_count}

👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
`;

        // 4. Send Video (No Watermark)
        await conn.sendMessage(from, { 
            video: { url: data.data.play }, 
            caption: caption 
        }, { quoted: mek });

        // 5. Send Audio (MP3) automatically
        // (Great for ringtones!)
        await conn.sendMessage(from, { 
            audio: { url: data.data.music }, 
            mimetype: "audio/mpeg" 
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error fetching video. Please try again later.");
    }
});

