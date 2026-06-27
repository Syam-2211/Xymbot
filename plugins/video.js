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

        // Using Siputzx Ummy API
        let down = await fetchJson(`https://api.siputzx.my.id/api/d/ummy?url=${url}`);
        
        if (!down.data || !down.data.url) return reply("❌ Error: Could not download video. Try a shorter video.");

        // Find MP4 with audio
        let video = down.data.url.find(item => item.ext === 'mp4' && !item.no_audio);
        if (!video || !video.url) return reply("❌ Error: MP4 conversion failed.");

        await conn.sendMessage(from, { 
            video: { url: video.url }, 
            mimetype: "video/mp4",
            caption: `🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊`
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});

