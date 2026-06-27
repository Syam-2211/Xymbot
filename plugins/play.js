const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');
const yts = require('yt-search'); 

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

        const search = await yts(q);
        if (!search.all || search.all.length === 0) return reply("❌ Song not found!");
        
        const data = search.all[0];
        const url = data.url;

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

        await conn.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: caption 
        }, { quoted: mek });

        // Using Siputzx Ummy API
        let down = await fetchJson(`https://api.siputzx.my.id/api/d/ummy?url=${url}`);
        
        if (!down.data || !down.data.url) return reply("❌ Error: Could not download audio. Try another song.");

        let audio = down.data.url.find(item => item.ext === 'mp3');
        if (!audio || !audio.url) return reply("❌ Error: MP3 conversion failed.");

        await conn.sendMessage(from, { 
            audio: { url: audio.url }, 
            mimetype: "audio/mpeg" 
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e.message);
    }
});
