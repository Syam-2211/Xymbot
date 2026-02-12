const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');
const yts = require('yt-search'); // This library searches YouTube

cmd({
    pattern: "play",
    alias: ["song", "music", "ytmp3"],
    react: "🎧",
    desc: "Download song from YouTube",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        if (!q) return reply("Please give me a song name! \nExample: .play Despacito");

        reply("🔎 *Searching for your song...*");

        // 1. Search YouTube for the song
        const search = await yts(q);
        const data = search.all[0]; // Take the first result
        const url = data.url;

        // 2. Create a Fancy Caption
        let caption = `
🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 *MUSIC PLAYER*

🎵 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
👁️ *Views:* ${data.views}
📅 *Uploaded:* ${data.ago}
🔗 *Link:* ${url}

👑 *Owner:* 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓
Downloading audio... Please wait! 🎧
`;

        // 3. Send the Thumbnail (Cover Art) first
        await conn.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: caption 
        }, { quoted: mek });

        // 4. Download and Send the Audio
        // We use a stable API to convert YouTube to MP3
        let down = await fetchJson(`https://widipe.com/download/ytdl?url=${url}`);
        
        if (!down.result || !down.result.mp3) return reply("❌ Error: Could not download audio. Try another song.");

        await conn.sendMessage(from, { 
            audio: { url: down.result.mp3 }, 
            mimetype: "audio/mpeg" 
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e);
    }
});

