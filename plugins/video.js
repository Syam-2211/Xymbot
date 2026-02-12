const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');
const yts = require('yt-search'); // Uses the same search library as .play

cmd({
    pattern: "video",
    alias: ["mp4", "v", "ytv"],
    react: "📺",
    desc: "Download video from YouTube",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        if (!q) return reply("Please give me a video name or link! \nExample: .video Despacito");

        reply("🔎 *Searching YouTube...*");

        // 1. Search YouTube
        const search = await yts(q);
        const data = search.all[0];
        const url = data.url;

        // 2. Create Fancy Caption
        let caption = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *VIDEO PLAYER*

🎬 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
👁️ *Views:* ${data.views}
📅 *Uploaded:* ${data.ago}
🔗 *Link:* ${url}

👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
Downloading video... Please wait! 📺
`;

        // 3. Send Thumbnail Message
        await conn.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: caption 
        }, { quoted: mek });

        // 4. Download and Send the Video (MP4)
        // Using a reliable API for MP4 downloads
        let down = await fetchJson(`https://widipe.com/download/ytdl?url=${url}`);
        
        if (!down.result || !down.result.mp4) return reply("❌ Error: Could not download video. Try a shorter video.");

        await conn.sendMessage(from, { 
            video: { url: down.result.mp4 }, 
            mimetype: "video/mp4",
            caption: `🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊`
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});

